/*
#############################################################################################
# This is the required nginx.conf file for use with the POWBlock NJS module.
# Spread out the functions and install into your own nginx config as-needed.
#############################################################################################

load_module modules/ngx_http_js_module.so;

user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    js_import pow_gate from njs/pow.js;

    # Bind NGINX variables straight to individual NJS export targets
    js_set $pow_status   pow_gate.validate;
    js_set $pow_expected pow_gate.getExpected;
    js_set $pow_secret   pow_gate.getSecret;
    js_set $pow_backend  pow_gate.getBackend;

    # Set this up for your real website origin
    upstream origin_backend {
        server 127.0.0.1:9010;
    }

    upstream powblock_backend {
        server 127.0.0.1:9001;
    }

    server {
        listen 8080;
        server_name edge.ingress;

        # -------------------------------------------------------------------------
        # PREVENT SPOOFING: Clean client headers right away
        # -------------------------------------------------------------------------
        proxy_set_header X-PoW-Expected "";
        proxy_set_header X-PoW-Token "";
        proxy_set_header X-Original-URL "";
        proxy_set_header X-Client-IP "";
        proxy_set_header X-PoW-Secret "";
        proxy_set_header X-Forwarded-Proto https;

        # -------------------------------------------------------------------------
        # SINGLE PASS TRAFFIC ROUTING
        # -------------------------------------------------------------------------
        location / {
            # Map tracking headers directly. NGINX resolves these on demand.
            proxy_set_header X-Original-URL  $scheme://$http_host$request_uri;
            proxy_set_header X-Client-IP     $remote_addr;
            proxy_set_header X-PoW-Expected  $pow_expected;
            proxy_set_header X-PoW-Secret    $pow_secret;

            # NGINX evaluates $pow_backend, running your JS logic exactly once,
            # and passes the traffic directly to the right backend.
            proxy_pass http://$pow_backend;
        }
    }
}

*/

/*#####################################################
Save the JS code below as pow.js in /etc/nginx/njs (you'll probly have to mkdir /njs)
and use it together with the nginx config provided in the comment block above. This
requires installing the nginx-module-njs plugin, available in most repos. In some Debians
its listed as libnginx-mod-http-js
#####################################################*/

import crypto from 'crypto';

//THE MAGIC KEY - ROTATE THIS STRING OCCASIONALLY
const POW_SECRET = "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000";

// Global cache object to hold variables within the lifecycle of a single request
let cache = { expected: '', ip: '', backend: 'powblock_backend' };

function validate(r) {
    const clientIp = r.remoteAddress;
    
    // Grab the raw cookie header string safely
    const rawCookieHeader = r.headersIn['Cookie'] || '';
    const clientToken = parseCookie(rawCookieHeader, 'POW_TOKEN');

    const rawPayload = clientIp + POW_SECRET;
    const expectedHash = crypto.createHash('sha256').update(rawPayload).digest('hex').toLowerCase();

    // Cache the variables in memory
    cache.expected = expectedHash;
    cache.ip = clientIp;

    // Strict validation check
    if (clientToken && clientToken === expectedHash) {
        cache.backend = 'origin_backend';
        return "VALID";
    }

    cache.backend = 'powblock_backend';
    return "INVALID";
}

function getExpected(r) { return cache.expected; }
function getSecret(r)    { return POW_SECRET; }

function getBackend(r)   { 
    validate(r); // Force evaluation pass instantly to populate the cache
    return cache.backend; 
}

// String-split parser to cleanly isolate cookies without breaking on spaces (compatibility)
function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return '';
    const cookies = cookieHeader.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return '';
}

export default { validate, getExpected, getSecret, getBackend };
