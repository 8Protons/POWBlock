Proxy Configuration Basics:

POWBlock is designed to run behind your existing reverse proxy as an alternate backend. Your proxy needs to be able to do just a few things to make use of it:  

1:  Read client cookies and extract their values  
2:  Compare strings, and direct traffic to different backends based on string matching  
3:  SHA-256 digest, MD5 crypto, or an equivalent basic hashing operation  
4:  Set and strip custom http headers  

Basically every reverse proxy can do these things, though you might need to install the appropriate plugins like libvmod-digest and vmod-standard for Varnish or use a small Lua script with Haproxy for example.

The proxy server also needs to have a firewall like UFW that can restrict outsider access to POWBlock.  Direct access is an apocalyptic attack surface so secure it carefully in all cases.  Clients MUST reach POWBlock ONLY via the reverse proxy software.

The proxy must also serve traffic via HTTPS, because browsers cannot run the subtle.digest crypto operation over plain HTTP.  POWBlock doesn't care about this, but your clients sure will!

The logic is straightforward.  The proxy (or webserver, but we prefer to use reverse proxies) creates the expected value of a user's token by hashing their IP address (or fingerprint, or some other deterministic client value you like) with a hardcoded secret key.
It reads their POW TOKEN cookie to see if the value matches this hash.  If they don't match, then the proxy sends them to POWBlock as the backend and passes that expected hash to POWBlock in the X-PoW-Expected header.
POWBlock serves them the challenge, and when they pass, it then takes that expected value and puts it in their POW TOKEN cookie before giving them a 302 redirect back to your website using the url stored in the X-Original-URL header.
The proxy compares their cookie again on the 302 request, only this time it matches the expected value, and so the proxy sends them to your website origin instead of POWBlock.

On top of this you can control clients with whatever kinds of logic and rules your proxy allows you to set.  Rate limits, custom redirects, bypasses for certain files, revoke their token cookie for abuse,
the sky is the limit.  With a paid license you can also use the proxy to inject control headers to change POWBlock's settings on-the-fly.  Passing X-PoW-Difficulty = 19 will tell POWBlock to use a difficulty of 19 bits on
that request instead of the default or whatever was set in the run flag.  Passing X-PoW-TokenExpires and/or X-PoW-IDExpires = numberSeconds changes the MAX-AGE on the POW TOKEN and POW ID cookies to the header's value instead
of the default 13 hours.  So on and so forth.  The supported custom headers are:

REQUIRED (free):

X-Client-IP:  The canonical true IP of a connecting client. This must be set from your proxy and passed to POWBlock.  If it is absent, POWBlock falls back to using a GetPeerName() function that returns the bare connection IP.  This fallback is only for local testing without a proxy - on a production server the IP returned would always be localhost.

X-PoW-Secret:  The master key used for POWBlock's HMAC signature that allows the program to know whether a submitted challenge actually came from us. Critical to prevent hostile clients from spamming "technically valid" pre-computed POW answers to get around our defenses. This must he hardcoded into, and supplied by the proxy. If it is absent POWBlock falls back to using a memory-stored backup key that it generates at startup using GetRandom(), but this fallback completely breaks scalability and is meant to be used for testing purposes only.

X-PoW-Expected:  Contains the expected POW_TOKEN value (hash of client data or IP + misc + secret etc) that the proxy computes and passes to POWBlock; POWBlock sets this in the POW_TOKEN cookie on successful solve.  This must be calculated, hashed, and set by your proxy.  If it is absent the POW_TOKEN cookie will be set but blank.

X-Original-URL:  The original requested URL (before the challenge); POWBlock uses it to 302-redirect the client back to the correct page after solving the challenge. This must be set by your proxy.  If it is absent or malformed the 302 URL defaults to "/".  



OPTIONAL (gated behind license):

X-PoW-ID:  An optional, versatile POW_ID cookie value passed by the proxy to POWBlock so it can set the POW_ID cookie on successful solve. Can be used for recording a device fingerprint, an API key, or other purposes, or omitted entirely.

X-PoW-Difficulty:  Overrides the default difficulty level for this specific challenge (e.g. 17 for mobile, 19 for desktop if you have device detection in your proxy); allows the proxy to request easier/harder PoW per client, based on client type or other metrics.

X-PoW-CTime: Overrides the length of time in seconds that this client can both hold a connection to POWBlock open and solve their challenge.

X-PoW-ClientAuth: The optional auth key that POWBlock checks to make sure an authorized proxy is passing the requests (key set via startup arg, 8 chars minimum).

X-PoW-TokenExpires:  Overrides the default Max-Age for the POW_TOKEN cookie (in seconds); lets the proxy set custom expiry times per request or client class.

X-PoW-IDExpires:  Overrides the default Max-Age for the POW_ID cookie (in seconds); allows separate expiry control for the ID cookie.

X-PoW-HostDomain:  Optional override applied to the set-cookies. Scopes TOKEN and ID to the specified domain (for shared remote PoW on multiple websites).

The most basic configuration is to simply run POWBlock on defaults and set it as a transparent alternate backend that lives at 127.0.0.1:9001, get their real IP and set X-Client-IP,
code the secret key into your proxy config as X-PoW-Secret, set X-PoW-Expected as hash(X-Client-IP + X-PoW-Secret), set a read on the client's POW TOKEN cookie, and set their backend to POWBlock if the match 
fails or the cookie doesn't exist.  Capture their original requested URL and set it as the value of X-Original-URL so they can be redirected after POWBlock. 
Then make sure you strip any client-submitted headers that could spoof the Key, POW difficulty, IP, and other essential values, set your firewall to only allow 
9001 to be reached by localhost, and you're done.
