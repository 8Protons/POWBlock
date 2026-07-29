# This minimaist controller goes at the very top of vcl_recv and requires Varnish 6LTS or newer (7.5 recommended) with
# the Standard vmod and libvmod-digest installed and imported:
#=============================================
  # Block spoofing of control headers by clients - THIS IS CRITICAL
    unset req.http.X-PoW-Secret;
    unset req.http.X-PoW-Expected;
    unset req.http.X-PoW-Token;
    unset req.http.X-Client-IP;
	
    # Your secret key  - CHANGE THIS to a long, random string of letters and numbers!
    set req.http.X-PoW-Secret = "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000";
	
    # Set their true IP
    set req.http.X-Client-IP = client.ip;

    # Expected token = SHA256(client.ip + secret) using import digest from libvmod-digest
    set req.http.X-PoW-Expected = digest.hash_sha256(req.http.X-Client-IP + req.http.X-PoW-Secret);

    # Get the client's POW_TOKEN cookie using import cookie from vmod-standard
    cookie.parse(req.http.Cookie);
    set req.http.X-PoW-Token = cookie.get("POW_TOKEN");

    # If no token or token value doesn't match expected value then give them the challenge
    if (!req.http.X-PoW-Token || req.http.X-PoW-Token != req.http.X-PoW-Expected) {

        # Rate limit new users hitting the POWBlock with import vsthrottle from vmod-standard
        if (vsthrottle.is_denied("powblock-challenge:" + client.ip, 10, 10s, 60s)) {
            return (synth(429, "Too Many Requests"));
        }

        # Send them to POWBlock with the custom headers included. Don't forget to actually set up powblock as a backend in default.vcl!
        set req.backend_hint = powblock;
        # X-PoW-Expected was already calculated and will be passed!
        set req.http.X-Original-URL = req.url;    # Where to redirect after success
        return (pass);		# Never cache POWBlock, but don't use return(pipe) because the headers may not get sent
    }

  # Valid token?  Then clean up and continue to origin
  unset req.http.X-PoW-Secret;
  unset req.http.X-PoW-Expected;
  unset req.http.X-PoW-Token;
  unset req.http.X-Client-IP;

#=============================================
