# Setting Up Your POWBlock Controller

The most important step in integrating POWBlock is **writing your basic controller**. This guide walks you through the core concepts and a working implementation so you can understand how POWBlock logic works and integrates with your web stack.

For much more detailed information, consult the technical readme.

## Part 1: Understanding the Flow

1. The client visits your site.
2. Your proxy takes the client's IP address, hashes it with your secret key, and calls this hash the **Expected Token**.
3. The proxy checks for a cookie named `POW_TOKEN` and compares its value to the Expected Token:
   - **Valid** → Client has the correct cookie.
   - **Invalid** → No cookie or value does not match.

If the client is **Valid**, the proxy forwards them to your main website origin.  
If the client is **Invalid**, the proxy routes them to POWBlock and forwards the following custom HTTP headers:

- `X-PoW-Expected` — The hash the client *should* have in their cookie.
- `X-Client-IP` — The client's canonical IP address.
- `X-PoW-Secret` — Your secret key.
- `X-Original-URL` — The original URL the client requested.

POWBlock uses these headers to generate a unique Proof of Work challenge for the client. It serves the challenge page (`powchallenge.html`), which contains the HTML + JavaScript needed for the browser to solve the PoW.

Once the client finishes computing the solution, the challenge page submits it. POWBlock performs sanity checks and full validation (challenge signature, IP match, time window, correct difficulty, etc.).  

If the solution is valid, POWBlock:
- Sets a `POW_TOKEN` cookie with the value of `X-PoW-Expected`
- Redirects the client to `X-Original-URL`

The proxy then sees the correct cookie on the next request and forwards the client to your main origin.

---

## Part 2: A "Hello World!" POWBlock Controller

You need to implement the following logic in your proxy/server:

1. **Unset** any control headers (prevent client spoofing — critical).
2. Set `X-PoW-Secret` to your secret key.
3. Set `X-Client-IP` to the real client IP.
4. Set `X-Original-URL` to the requested URL.
5. Compute `X-PoW-Expected` = `HASH(X-Client-IP + X-PoW-Secret)`.
6. Check the client's `POW_TOKEN` cookie.
7. If the token is missing or doesn't match then route to POWBlock.  
   If it matches then route to your main origin.

### Varnish VCL Example

```vcl
# =============================================
# POWBlock Controller - Varnish VCL
# =============================================

# Prevent clients from spoofing control headers (CRITICAL)
unset req.http.X-PoW-Secret;
unset req.http.X-PoW-Expected;
unset req.http.X-PoW-Token;
unset req.http.X-Client-IP;

# === Your secret key (CHANGE THIS) ===
set req.http.X-PoW-Secret = "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000";

# Set real client IP
set req.http.X-Client-IP = client.ip;

# Expected token = SHA256(client.ip + secret)
set req.http.X-PoW-Expected = digest.hash_sha256(req.http.X-Client-IP + req.http.X-PoW-Secret);

# Read POW_TOKEN cookie
cookie.parse(req.http.Cookie);
set req.http.X-PoW-Token = cookie.get("POW_TOKEN");

# If no token or token doesn't match → send to POWBlock
if (!req.http.X-PoW-Token || req.http.X-PoW-Token != req.http.X-PoW-Expected) {
    set req.backend_hint = powblock;
    set req.http.X-Original-URL = req.url;   # Where to redirect after success
    return (pass);   # Never cache POWBlock requests
}

# Valid token → clean up headers and proceed to origin
unset req.http.X-PoW-Secret;
unset req.http.X-PoW-Expected;
unset req.http.X-PoW-Token;
unset req.http.X-Client-IP;
