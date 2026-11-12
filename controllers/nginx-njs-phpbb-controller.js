/*
#############################################################################################
# This is the required nginx.conf file for use with the POWBlock NJS module.
# Spread out the functions and install into your own nginx config as-needed.
# This controller is specialized for PHPBB forum software running on Nginx.
#
# The forum and POWBlock are both picked by proxy_pass http://$pow_backend.
# $pow_backend is the upstream block NAME ("origin_backend"), and nginx's
# default Host header is that name ($proxy_host). phpBB copies HTTP_HOST into
# the 302 after a POST, so the browser is sent to http://origin_backend/...
# A variable proxy_pass also disables "proxy_redirect default", so nginx will
# not repair that Location unless you say so explicitly.
#
# Every proxy_set_header for this hop has to live in the same location as
# proxy_pass. A location that defines its own proxy_set_header ignores the
# ones on the server block, including the implicit Host default.
#
# We used port 9010 for testing purposes. Change it to the port your PHPBB service is on.

#If you haven't already, you may also need to set PHPBB cookie secure, https://, and add:

if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
    $_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_X_REAL_IP'];
}
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}

or similar to the top of config.php, to make sure PHPBB is getting correct client IPs and ports.
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

        # 8080 is for testing. Comment it out and uncomment 'listen 443' for use
        listen 8080;
        # listen 443 ssl;

        # Set your real server name here:
        server_name edge.ingress;

        # -------------------------------------------------------------------------
        # SINGLE PASS TRAFFIC ROUTING
        # -------------------------------------------------------------------------
        location / {
            # Who the browser actually asked for. Do not leave Host as the
            # upstream name, or phpBB's post-reply 302 becomes
            # http://origin_backend/viewtopic.php
            proxy_set_header Host               $http_host;
            proxy_set_header X-Real-IP          $remote_addr;
            proxy_set_header X-Forwarded-For    $remote_addr;
            proxy_set_header X-Forwarded-Host   $http_host;
            proxy_set_header X-Forwarded-Proto  $scheme;

            # Drop anything the client tried to spoof, then set the real values.
            # These replacements only count inside this location.
            proxy_set_header X-PoW-Token        "";
            proxy_set_header X-Original-URL     $scheme://$http_host$request_uri;
            proxy_set_header X-Client-IP        $remote_addr;
            proxy_set_header X-PoW-Expected     $pow_expected;
            proxy_set_header X-PoW-Secret       $pow_secret;

            # Defining proxy_set_header drops the implicit "Connection: close".
            proxy_set_header Connection         close;

            # NGINX evaluates $pow_backend, running the JS logic exactly once
            # per use, and passes the traffic to that upstream.
            proxy_pass http://$pow_backend;

            # Variable proxy_pass will not rewrite Location on its own.
            # Turn an internal host back into a relative URL so the browser
            # stays on https://forum.example/... etc
            proxy_redirect http://origin_backend/       /;
            proxy_redirect https://origin_backend/      /;

            # Set this up for your real website origin (phpbb port)
            proxy_redirect http://origin_backend:9010/  /;
            proxy_redirect http://127.0.0.1:9010/       /;
        }
    }
}

*/

/*#####################################################
Save the JS code below as pow.js in /etc/nginx/njs (you'll probly have to mkdir /njs)
and use it together with the nginx config provided in the comment block above. This
requires installing the nginx-module-njs plugin, available in most repos. In some Debians
its listed as libnginx-mod-http-js

phpBB will still emit http:// if Cookie secure is off, because the hop to
port 9010 is plain HTTP and phpBB does not read X-Forwarded-Proto.
In ACP > Server settings set the real hostname, https://, and cookie secure.
#####################################################*/

import crypto from 'crypto';

//THE MAGIC KEY - ROTATE THIS STRING OCCASIONALLY
const POW_SECRET = "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000";

function expectedFor(r) {
    const rawPayload = r.remoteAddress + POW_SECRET;
    return crypto.createHash('sha256').update(rawPayload).digest('hex').toLowerCase();
}

function validate(r) {
    const rawCookieHeader = r.headersIn['Cookie'] || '';
    const clientToken = parseCookie(rawCookieHeader, 'POW_TOKEN');
    const expectedHash = expectedFor(r);

    if (clientToken && clientToken === expectedHash) {
        return "VALID";
    }
    return "INVALID";
}

function getExpected(r) { return expectedFor(r); }
function getSecret(r)   { return POW_SECRET; }

function getBackend(r) {
    return validate(r) === "VALID" ? "origin_backend" : "powblock_backend";
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
