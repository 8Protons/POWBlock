/**
 * POWBlock - basic njs controller (Nginx)
 * =========================================
 * Mirrors the minimal Varnish VCL controller:
 *   - Strip/ignore client-supplied PoW headers (never trust them)
 *   - X-Client-IP, X-PoW-Secret, X-PoW-Expected, X-Original-URL
 *   - SHA256(client_ip + secret) vs POW_TOKEN cookie
 *   - Invalid = powblock upstream; valid = origin
 *   - POST without valid token = 403
 *
 * Requires: nginx compiled/loaded with njs (nginx-module-njs)
 *
 * ---- Required nginx config (paste into a server block) ----
 *
 * js_import pow from /etc/nginx/njs/powblock.js;
 *
 * js_set $pow_ok        pow.ok;
 * js_set $pow_expected  pow.expected;
 * js_set $pow_client_ip pow.client_ip;
 *
 * upstream origin {
 *     server 127.0.0.1:8080;   # your app
 * }
 *
 * upstream powblock {
 *     server 127.0.0.1:9001;   # POWBlock listen port
 * }
 *
 * map $pow_ok $pow_backend {
 *     1       http://origin;
 *     default http://powblock;
 * }
 *
 * # Only send control headers to POWBlock; blank toward origin
 * map $pow_ok $pow_secret_hdr {
 *     1       "";
 *     default "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000";
 * }
 *
 * map $pow_ok $pow_expected_hdr {
 *     1       "";
 *     default $pow_expected;
 * }
 *
 * map $pow_ok $pow_orig_url_hdr {
 *     1       "";
 *     default $request_uri;
 * }
 *
 * map $pow_ok$request_method $pow_deny_post {
 *     default 0;
 *     0POST   1;
 * }
 *
 * server {
 *     listen 443 ssl;
 *     # ssl_certificate     /path/to/fullchain.pem;
 *     # ssl_certificate_key /path/to/privkey.pem;
 *
 *     location / {
 *         if ($pow_deny_post = 1) {
 *             return 403;
 *         }
 *
 *         proxy_set_header Host              $host;
 *         proxy_set_header X-Forwarded-For   $pow_client_ip;
 *         proxy_set_header X-Client-IP       $pow_client_ip;
 *         proxy_set_header X-PoW-Secret      $pow_secret_hdr;
 *         proxy_set_header X-PoW-Expected    $pow_expected_hdr;
 *         proxy_set_header X-Original-URL    $pow_orig_url_hdr;
 *
 *         # Do not pass through any client-supplied PoW headers
 *         proxy_set_header X-PoW-Token       "";
 *         proxy_set_header X-PoW-Difficulty  "";
 *         proxy_set_header X-PoW-CTime       "";
 *         proxy_set_header X-PoW-ClientAuth  "";
 *
 *         proxy_pass $pow_backend;
 *     }
 * }
 *
 * IMPORTANT:
 *   - SECRET below MUST match the default value in map $pow_secret_hdr
 *   - Change both before production
 *   - Firewall POWBlock so only nginx can reach it
 *   - Challenge page needs HTTPS (crypto.subtle)
 */

import crypto from 'crypto';

// === Your secret key (CHANGE THIS - must match nginx map default, and rotate them occasionally) ===
const SECRET =
    'xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000';

function client_ip(r) {
    // Basic controller: direct peer address (same spirit as VCL client.ip).
    // Behind a trusted CDN, replace with the appropriate header.
    return r.remoteAddress || '0.0.0.0';
}

function expected_token(r) {
    const data = client_ip(r) + SECRET;
    return crypto.createHash('sha256').update(data).digest('hex');
}

function get_cookie(r, name) {
    const raw = r.headersIn['cookie'];
    if (!raw) {
        return '';
    }
    const parts = raw.split(';');
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        const eq = p.indexOf('=');
        if (eq === -1) {
            continue;
        }
        const k = p.substring(0, eq);
        if (k === name) {
            return p.substring(eq + 1);
        }
    }
    return '';
}

function token_valid(r) {
    const token = get_cookie(r, 'POW_TOKEN');
    if (!token) {
        return false;
    }
    return token === expected_token(r);
}

/** js_set: "1" = valid token to origin; "0" = send to POWBlock */
function ok(r) {
    return token_valid(r) ? '1' : '0';
}

/** js_set: value for X-PoW-Expected */
function expected(r) {
    return expected_token(r);
}

/** js_set: value for X-Client-IP */
function client_ip_var(r) {
    return client_ip(r);
}

export default {
    ok: ok,
    expected: expected,
    client_ip: client_ip_var
};
