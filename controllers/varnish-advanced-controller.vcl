# =========================
# POWBlock hybrid PoW gate controller
# =========================
# Include at TOP of vcl_recv
# Compatible with POWBlock 1.2.2+ (licensed only)
# This is a stripped down, simplified version of one of Blue Rogues' own production controllers
# Our real deal is over 500 lines, but this gives you an idea of what is possible.
# Requires: import std; import cookie; import digest; import vsthrottle;
# Backend: powblock
# Also define vcl_synth handlers for 200 (ping), 429, 440 (revoke)

# -------------------------
# Spoofing protection
# -------------------------
unset req.http.X-PoW-Secret;
unset req.http.X-PoW-Salt;
unset req.http.X-PoW-Expected;
unset req.http.X-PoW-ExpectedID;
unset req.http.X-PoW-Token;
unset req.http.X-PoW-ID;
unset req.http.X-PoW-Valid;
unset req.http.X-PoW-ClientData;
unset req.http.X-PoW-Fingerprint;
unset req.http.X-Is-Mobile;
unset req.http.X-PoW-Difficulty;
unset req.http.X-PoW-Bucket;
unset req.http.X-PoW-TokenExpires;
unset req.http.X-PoW-IDExpires;
unset req.http.X-Client-IP;
unset req.http.X-Pow-ClientAuth;
unset req.http.X-PoW-CTime;
unset req.http.X-PoW-Revoked;
#=========================

# =========================
# Control Panel
# =========================

# Centralized secret - THE MAGIC KEY - rotate this occasionally
set req.http.X-PoW-Secret = "FOOBARBAZ123456789AAABBBCCC";

# POWBlock Auth Key
set req.http.X-PoW-ClientAuth = "Fooauthkeybar123";

# Optional salt (multi-use potential)
set req.http.X-PoW-Salt = "BAZBARFOO";


# POWBlock override headers
# =========================
# Token cookie expiry
set req.http.X-PoW-TokenExpires = 172800; #48 hours

# ID cookie expiry
set req.http.X-PoW-IDExpires = 172800; #48 hours

# Time bucket for token self-destruct: (28800 seconds = 8 hours)
set req.http.X-PoW-Bucket = "" + (std.time2integer(now, 0) / 28800);

# Initialize difficulty early (dummy value or default)
set req.http.X-PoW-Difficulty = 20;

# Initialize challenge solve time early (dummy value or default)
set req.http.X-PoW-CTime = 420;


# Utilities
# =========================

# Capture real client IP for use with CDNs (adjust this to use whatever CDN header you're getting, if applicable)

# Toggle the comment on this unset line to change behavior:
#unset req.http.CF-Connecting-IP;
if (req.http.CF-Connecting-IP) {
    set req.http.X-Client-IP = req.http.CF-Connecting-IP;
    unset req.http.X-Forwarded-For;
    set req.http.X-Forwarded-For = req.http.CF-Connecting-IP;

} else {
    # Fallback if not on a CDN, and normalize XFF
    set req.http.X-Client-IP = client.ip;
    unset req.http.X-Forwarded-For;
    set req.http.X-Forwarded-For = client.ip;
}

# Normalize IPv6 to first /64 prefix (Optional- REGEX may break)
if (req.http.X-Client-IP ~ ":") {  # Detect IPV6
    if (std.ip(req.http.X-Client-IP, "::") != "::") {  # Validate it

        set req.http.X-Client-IP = regsub(
            req.http.X-Client-IP,
            "^([0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){0,3})?(?::.*)?$",
            "\1::"
        );
    }
}


# Capture original requested URL once, very early
# This survives everything unless explicitly overwritten
if (!req.http.X-Original-URL) {
    set req.http.X-Original-URL = req.url;
}

# Parse client cookies so we can work with their tokens
cookie.parse(req.http.Cookie);
set req.http.X-PoW-Token = cookie.get("POW_TOKEN");
set req.http.X-PoW-ID    = cookie.get("POW_ID");

# =========================
# Special Purpose Throttles
# =========================


# Unauthed client throttle (mitigates swarms to reduce Varnish CPU)
# =========================
if (req.http.Cookie !~ "POW_TOKEN") {
    if (vsthrottle.is_denied("Unauthed:" + req.http.X-Client-IP, 25, 1s, 62s)) {
        return (synth(429, "Access Denied"));
    }
}


# Token revoker (post-POW abuse limit)
# =========================
if (req.http.Cookie ~ "POW_TOKEN") {
	if (vsthrottle.is_denied("pow-revoke:" + req.http.X-Client-IP, 1200, 4s, 120s)) {
	    set req.http.X-PoW-Revoked = "1";
	    # Pick this header up on a 440 in vcl_synth and give them a set-cookie with a null or garbage POW_TOKEN to kick them out!

	    return (synth(440, "Rude client - reload required"));
	}
}

# =========================
# FAST PATHS: These bypass POW so throttle them hard
# =========================

# FAST PATH: favicon
# =========================
if (req.method == "GET" && req.url == "/favicon.ico") {

    # Rate limit abuse attempts on favicon
    if (vsthrottle.is_denied("favicon:" + req.http.X-Client-IP, 3, 5s, 90s)) {
        return (synth(429, "Favicon protected"));
    }

    # Let normal cache logic handle it
    return (hash);
}



# FAST PATH: PoW ALERT IMAGE
# =========================
if (req.method == "GET" &&
    req.url == "/media/static/tiny-pow-alert-image.png") {

    # Prevent abuse of the placeholder image
    if (vsthrottle.is_denied("pow-alert:" + req.http.X-Client-IP, 10, 6s, 125s)) {
        return (synth(429, "Too Many Requests"));
    }

    # Don't cache it since we want it to reload after POW
    return (pass);
}


# =========================
# Client classification (mobile/desktop)
# =========================
set req.http.X-Is-Mobile = "0";
if (
    req.http.Sec-CH-UA-Mobile == "?1" &&
    req.http.User-Agent ~ "(?i)android|iphone|ipad|ipod|mobile"
) {
    set req.http.X-Is-Mobile = "1";
}

# =========================
# Simple Device Header Fingerprint (We use TLS prints in our stack but these can do work)
# =========================
# Fallbacks for missing headers (avoids null/empty in hash)
if (!req.http.Sec-CH-UA-Mobile)    { set req.http.Sec-CH-UA-Mobile    = "unknownUAMobile"; }
if (!req.http.Sec-CH-UA-Platform)  { set req.http.Sec-CH-UA-Platform  = "unknownUAPlatform"; }
if (!req.http.Accept-Language)     { set req.http.Accept-Language     = "unknownAcceptLanguage"; }

if (req.http.X-Is-Mobile == "1") {
    set req.http.X-PoW-Fingerprint =
        req.http.User-Agent +
        req.http.Accept-Language +
        req.http.Sec-CH-UA-Mobile +
        req.http.Sec-CH-UA-Platform;

} else {

    # Desktop
    set req.http.X-PoW-Fingerprint =
        req.http.User-Agent +
        req.http.Accept-Language +
        req.http.Sec-CH-UA-Platform;
}


# =========================
# Client Data
# =========================
if (req.http.X-Is-Mobile == "1") {
    # Mobile: trust fingerprint more (less stable IPs)
    set req.http.X-PoW-ClientData = req.http.X-PoW-Fingerprint;

} else {

    # Desktop: include IP + salt (classic anti-proxy/spoof)
    set req.http.X-PoW-ClientData = 
        req.http.X-Client-IP + 
        req.http.X-PoW-Salt;

    # Optional: include full fingerprint too for extra binding:
    # req.http.X-Client-IP + req.http.X-PoW-Salt + req.http.X-PoW-Fingerprint;
}


# =========================
# POW token & POW_ID validation 
# =========================
set req.http.X-PoW-ExpectedID = digest.hash_sha256(req.http.X-PoW-ClientData);

# Expected token (uses ClientData which may include fingerprint or not)
set req.http.X-PoW-Expected = digest.hash_sha256(
    req.http.X-PoW-ClientData + "|" + req.http.X-PoW-Bucket + "|" + req.http.X-PoW-Secret
);

if (req.http.X-PoW-Token &&
    req.http.X-PoW-Token == req.http.X-PoW-Expected &&
    req.http.X-PoW-ID && 
    req.http.X-PoW-ID == req.http.X-PoW-ExpectedID) {
    set req.http.X-PoW-Valid = "1";
}

# Broken media fallback (redirect to placeholder or block if POW invalid)
# =========================
if (req.method == "GET" && req.url ~ "^/media/static/") {
    if (!req.http.X-PoW-Valid) {
        set req.url = "/media/static/tiny-pow-alert-image.png";
        unset req.http.Cookie;
        return (hash);

    }
}

# Pseudo endpoint to trigger origin site JS for background POW
# JS has clients ping this occasionally and opens POWBlock in an 
# invisible iframe if their tokens are bad
# =========================
if (req.method == "GET" && req.url ~ "/.NULL/POWBLOCK") {
    if (req.http.X-PoW-Valid) {
        return (synth(200, "POW OK"));
    }
}

# =========================
# Difficulty assignment
# =========================
if (!req.http.X-PoW-Valid) {
    if (req.http.X-Is-Mobile == "1") {
        set req.http.X-PoW-Difficulty = "17";
    } else {
        set req.http.X-PoW-Difficulty = "19";
    }
}

# You can put special rules for specific clients right below the Difficulty Assignment. 
# The diff and ctime values you set for them will overwrite the defaults or whatever was set above.

# =========================
# Challenge gate - send invalid clients to POWBlock
# =========================
if ((req.method == "GET" || req.method == "HEAD") && !req.http.X-PoW-Valid) {

    # Global gate throttle
    if (vsthrottle.is_denied("pow-challenge:" + req.http.X-Client-IP, 100, 5s, 120s)) {
        return (synth(429, "POWBlock limit reached"));
    }

    # Split rate limiting for issuances vs submissions
    if (req.url ~ "\?powblock=") {
        # Stricter for submissions
        if (vsthrottle.is_denied("pow-submit:" + req.http.X-Client-IP, 5, 60s, 120s)) {
            return (synth(429, "Too Many Submissions - Slow Down"));
        }
    } else {
        # More lenient for challenge issuances
        if (vsthrottle.is_denied("pow-issue:" + req.http.X-Client-IP, 50, 5s, 20s)) {
            return (synth(429, "Too Many Challenges - Slow Down"));
        }
    }
    # The above throttles apply to ALL client requests hitting the gate, regardless of the URL
    # or client IP. This is a hard bottleneck against request flood DDoS. They can't avoid it.

    set req.backend_hint = powblock;

    # Note: X-PoW-Expected and the diff/ctime headers are already computed up above and will be passed automatically
      
    # Forward the POW-ID
    set req.http.X-PoW-ID = req.http.X-PoW-ExpectedID;

    # Make sure we preserve original URL for 302 redirect
    if (!req.http.X-Original-URL) {
        set req.http.X-Original-URL = req.url;
    }

    return (pass);
}

# =========================
# POST enforcement (stops spambots)
# =========================
if (req.method == "POST" && !req.http.X-PoW-Valid) {
    return (synth(403, "Proof of Work required"));
}

# =========================
# Clients who fall all the way through to this point proceed to the rest of your VCL, and then on to your origin.
# =========================
if (req.backend_hint != powblock) {
    unset req.http.X-PoW-Secret;
    unset req.http.X-PoW-Salt;
    unset req.http.X-PoW-Expected;
    unset req.http.X-PoW-ExpectedID;
    unset req.http.X-PoW-Token;
    unset req.http.X-PoW-ID;
    unset req.http.X-PoW-Valid;
    unset req.http.X-PoW-ClientData;
    unset req.http.X-PoW-Fingerprint;
    unset req.http.X-Is-Mobile;
    unset req.http.X-PoW-Difficulty;
    unset req.http.X-PoW-Bucket;
    unset req.http.X-PoW-TokenExpires;
    unset req.http.X-PoW-IDExpires;
    unset req.http.X-Client-IP;
    unset req.http.X-Pow-ClientAuth;
    unset req.http.X-PoW-CTime;
    unset req.http.X-PoW-Revoked;
}
