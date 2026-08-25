# POWBlock Tips, Tricks, Quirks, and Notes

- You can make your POW cookies "self destruct" after a time by having your proxy compute a Unix Epoch and add it's window to the expected hash.
- You can instantly invalidate all existing POW TOKENs and force mass re-challenge by changing your X-PoW-Secret key.
- You can use the POW_ID cookie to hold and validate a TLS or device fingerprint to make replay attacks even harder.
- You can also use POW_ID to hold an API or bypass key for certain clients that need to skip POWBlock.
- The active_conns, rate_limit_hits, slowloris drops, and max_concurrent drops are the main stats to watch to detect probing and attacks.
- You can pick up the X-PoWBlock-Status response headers with your own server or proxy and use them to trigger things.
- You can set up Javascript on your own site to run POWBlock in a background iframe so it doesn't interrupt users mid-browse if their token expires.
- If running on TOR, have your clients set MaxCircuitDirtiness 3600 in their torrc file so they only get POW'd once per hour (TOR default = 10 mins).
- Use your proxy to normalize incoming IP addresses before setting X-Client-IP. This can prevent a lot of IPV4/+IPV6 weirdness.
- Use your proxy to require a valid POW-TOKEN on POST requests and watch all that automated forum/login spam stop.
- Rotate your secret key monthly or so to prevent it from being sussed out by crackers.
- If your site is media heavy, a user browsing when their token expires will see all the content break. Its good UX to have broken media redirect to a tiny, rate-limited placeholder image so users know to refresh for POW.
- Set up an abuse throttle in your proxy that overwrites a client's POW_TOKEN value to garbage via a set-cookie response if they exceed your limits once inside - this will block their abuse and kick them out on their next navigation. You can even have it set a value that serves as an abuse signal, and then have the proxy pick up on it to give that client an extra hard challenge if they try to reconnect.
- If your site has very odd URL structures that mangle redirects from POWBlock, you can intercept the 302 and rewrite it with your proxy.
- If you'd like a dedicated POWBlock logfile instead of logging to the system journal, you can add:

      StandardError=append:/path/to/log/dir/powblock.log
  to the systemd template right below EXECSTART.

- POWBlock intentionally separates the client's cookie values from anything going on inside its own process, and leaves them up to the proxy. This gives the admin the freedom to use *anything* as the token value, while leaving POWBlock free to cleanly sign, verify, IP bind and time limit challenges and submissions. Hash(clientIP+Secret) is just our recommended practice for the POW_TOKEN. You can use any kind of deterministic client value or hash you want as long as you keep X-PoW-Expected to <64 chars. Hack away.

- POWBlock doesn't have or need a configuration file like most programs do, because with a paid license the proxy can configure it on the fly. Your proxy configuration becomes POWBlock's config file, and all the basic configs are handled via startup args in the free version.

- The proxy logic can be as simple as the example in this document, or as atrociously complicated as the 500+ line VCL controller that the authors use on our production servers. A really good controller is just as much of a technical marvel as POWBlock itself, especially with a license that unlocks all of the granular control headers.
