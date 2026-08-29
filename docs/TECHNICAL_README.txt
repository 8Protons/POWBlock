==============================

README

Introduction:

What is POWBlock:  POWBlock is a simple, high performance proof-of-work gateway that sits behind any reverse proxy. Written in about 2500 lines of pure C with EPOLL, and including a separate challenge page with HTML and inline javascript, it is a self-contained program that provides high-speed, high-volume proof-of-work defense as a microservice.  You point your proxy at it, it serves a tiny JavaScript challenge page that forces the client to burn CPU cycles mining a SHA-256 or SHA-512 hash with enough leading zeros, and if they succeed it hands back a cookie (POW_TOKEN) that lets them through to your main site and then redirects them where they wanted to go. No fancy UI, no bloated framework, no massive dependency list - just a single ~1MB binary with zero dependencies that runs on basically anything and scales linearly if you spin up multiple instances.  POWBlock is controlled by http headers injected by your proxy or server and does not require any integration with your website code to work - No embeds, no widgets, no Wordpress plugins needed.  

Why POWBlock exists: All existing PoW defense tools try to own your stack or else come with a ton of integration requirements, moving parts, and system bloat/overhead. POWBlock is 100% system agnostic.  It doesn't care what your backend is, what language your site uses, or whether your proxy is running Varnish, Nginx, Caddy, Traefik, Apache, or a homebrew server built with BASH, Netcat, and duct tape.  It doesn't care if its standing alone on your network edge or if you're using Cloudflare in front of it.  It doesn't care if you're running one instance on the local machine or 20 instances on a remote machine.  It doesn't care if its running on clearnet or TOR.  It doesn't even need to start as root.  It's built on the classic UNIX philosophy to do exactly one job, and do it well.  It does this while using absolutely minimal system resources and presenting an absolutely minimal attack surface, and is especially designed to operate under the control of your existing stack. It is proof-of-work defense *as a primitive* and is the first of its kind.

Why we made it:  The world of the present day is awash with scraper bots and small-time DDoS for hire goons all feeding off the "AI revolution" and proliferation of massive global networks of micro-bots based on compromised IoT devices.  Independent sites are being corralled onto huge platforms like Cloudflare to get even basic protections, and the very few self-hosted solutions out there are fat, clunky, domineering of your tech stack, incompatible or inefficient with many website setups, and often quite weak in spite of their complexity. We started with the notion of making a very strong PoW gate for use with Varnish Cache, but it turned out that in making it Varnish compatible it was already so close to being system agnostic that we decided to lean into the concept.

Who we are:  Blue Rogues Development is a voluntary association of professional programmers, ex-hackers and tech nerds from the world of classical forums and anonymous imageboards. We've existed in some form since the year 2000, and we adapted our name and logo from the heroic pirate faction of a certain popular videogame from that era. Our membership has waxed and waned over the years and we never sought the limelight, so little of our activity is public.  We are as oldschool as it gets.  We're not "coders" who "vibe code" "apps" - we're programmers and we write programs to do new and useful things based on our own experience in running web infrastructure.  Most of us don't bother with IDEs and some of us don't even use repositories (POWBlock was hand-coded entirely in Xed).  In the present day our half-dozen members have a focus on website resilience, private network engineering, anti-censorship activism, and fighting against automated spam and abuse.

Use POWBlock if you want lightweight, system-agnostic bot protection and DDoS defense without selling your soul (or your client's data) to outside companies or big tech. It's perfect for self-hosters, site networks of any size, and anyone who's tired of rate-limiting and "be nice" FOSS software defenses not cutting it against AI scrapers and other malicious clients. Plug it into your proxy, crank it up, and watch the noise plummet.


POWBlock Development History in Brief:

CONCEPT BRANCH (2024):
0.1 alpha - LUA script proof of concept - FAIL
0.2 alpha - BASH script proof of concept - FAIL
0.3-0.9 alpha - C proof of concept - Partial Success
1.0 - Single-thread C server - SUCCESS - limited live alpha testing (50-100 users)
1.1 - Experimental prototype using EPOLL, adding features and attack hardening - FAIL
1.1.2 - EPOLL rewrite, bugfixes and some features/hardening refactored from 1.1 - Partial Success - tested in prod (1-2000 users)
1.2 Stable - Refactor from 1.1.2, debugged EPOLL, significant attack hardening - SUCCESS - First version deployed on a real website (50,000+ users)
1.2.1 - Experimental upgrades/refactors/UX, rand() POW challenge and developer QoL tweaks - FAIL
1.2.2 - Bugfixes from 1.2.1, added POW_ID, rand() challenges, X-PoWBlock-Status headers, @service instance support - SUCCESS - Deployed to prod

DATABASE VARIANT BRANCH (2025, defunct):
2.0 - Experimental variant fork testing flat database as token registry - SUCCESS
2.1R - Experimental variant testing blocking Redis database - Partial Success
2.1.1-2.1.4 - Experimental variants testing Asynchronous Redis database - FAIL (all)
2.2 - Massive refactor of 2.1 codebase to integrate Async Redis - Partial Success
2.2RA - Bugfixes and significant hardening applied to 2.2 codebase - ABANDONED (fundamental lib conflicts within state machine)

STATELESS DEV BRANCH (2025):
1.2.3 - Experimental prototype of improved 1.2.2 (signed challenges, challenge timestamps, client validations) - Partial Success
1.3H - Comprehensive bugfixes, hardening and improved DoS defense applied to 1.2.3 - SUCCESS - deployed to prod 
1.4H - 1.3H adding improved IPV6 handling, client browser UX, internal fallback rate limiter, token self-destruct and pollable stats - SUCCESS
1.5E - 1.4H core adding remote server auth keys and arg-adjustible challenge lifetimes - SUCCESS - First Enterprise candidate
1.6E - 1.5E with significant refactoring of CPU and memory-expensive functions to further reduce resource - Partial Success
1.6.1E - Bugfixes applied to 1.6E, added challenge page HTML as separate file for easy editing/customization - SUCCESS
1.6.2E - 1.6.1E with added proxy-variable challenge expiry times and client connection lifetimes - SUCCESS - deployed to prod
1.6.3E - 1.6.2E with added per-client connection limit and expanded stats polling - SUCCESS - deployed to prod
1.6.4E - 1.6.3E with added header override for challenge expiry time (CTime) - SUCCESS - deployed to prod
1.6.4ES - 1.6.4E with added HostDomain override support for multi-client cookie setting and optional SHA512 POW hash - SUCCESS

STABLE/LTS LINE (2026)- (the software is considered complete and proven as of 1.7 - incremental upgrades follow):
1.7.0SE - Cleanup and minor refactor of 1.6.4ES adding better arg parsing and automatic challenge page adjustment
1.7.1SE - Refactored logging to improve Fail2ban compatibility
1.7.2SE - Minor bugfixes applied to 1.7.1SE, graceful close logic ported in from abandoned 2.xx line
1.7.3SE - More aggressive memory cleanup and additional stats
1.7.4SE - Added -cpage arg for challenge testing, JS redirect support for URL #fragments, and simplified POW_ID
1.7.5SE - 1.7.4SE modified with extra debug prints for fuzzing purposes
1.7.6SE - EPOLL connection handler improved to eliminate a vulnerability found by fuzzing
1.7.7SE - Private testbed for security upgrades and more fuzzing
1.7.8SE - Added internal rate limiter on PoW submissions and throttled logging
1.7.9SE - Full refactor + function extraction for maintainability
1.7.10SE - Private debugging testbed for experimental features
1.7.11SE - Added upgraded sanity checker, 302 URL sanitizer, and minor bugfixes to issues found in 1.7.10
1.7.12SE - Added -debug startup arg that enables all previous debug logging from 1.7.5, 1.7.7, 1.7.10 and more
1.7.13SE - Replaced old strstr header parsing loop with a modern local data cache bound to the client struct
1.7.14SE - Undid regressions from pre-1.7.9, made minor CPU/RAM optimizations, and patched a potential request smuggling vulnerability
1.7.15SE - Redesigned the client IP tracking tables to use modern probes and tombstones, added -loose arg for convenience
1.7.16SE - Added -help menu, refactored parsing bounds and scan order, added experimental -fast block vs GPU solvers

COMMERCIAL/SHAREWARE Line
1.8.0J "Jehuty" - Eliminated OpenSSL dependency via portable SHA-256/512 libs, full refactor for static binary compile
1.8.1J - Added -silent mode and -license key system, finished and debugged 1.8.0 refactor according to C code and EPOLL best practices
1.8.2J - Performed edge-case security auditing and hardening, added X-PB-License status headers, developed Pipy Controller 1.0
1.8.3J - Fixed an edge-case UAF crash and added high-precision Time tracking to the GPU Buster and HMAC subsystems
1.8.3T "Asuka" - ASAN/gdb testbed deployed against ongoing large (~250kRPS) DDoS attacks for data gathering and debugging
1.8.4J - Fixed several small memory and return value issues revealed by DDoS load
1.8.5J - Upgraded EPOLL accept loop for atomicity, removed old send_response wrapper, hardened write cycle, and normalized all function returns
1.8.6J - Further hardened submission parsing logic to prevent attacks by req body corruption
1.8.7J - Added arg-tunable limiter settings, fixed a flaw in the URL sanitizer, refactored the base64 payload parser for additional memory safety

-----------------------------
Installation (assumes Debian-based, requires glibc 2.31+ and Linux Kernel 2.6.28+):

Precompiled Binary:

- Build environ was Debian 11 (AMD64) using only the stock kernel and repos, compiled clean via
gcc -O3 -Wall -Wextra -Wpedantic -fstack-protector-strong -D_FORTIFY_SOURCE=2 -static

- The binary should be ready to run on any modern AMD64 Linux including Debian/Rocky/Alma/Ubuntu/Mint

----------
The binary can run from anywhere, though we prefer /usr/local/sbin/.  It does not require its own user or even root access unless you want to run it on restricted ports.  It may be handy to create a minimal user just to handle it, and we recommend:

sudo useradd -r -M -s /sbin/nologin powblock
sudo runuser
passwd powblock (give it a long random password)

The challenge page "powchallenge.html" should be kept in the same directory as the binary or else symlinked there.  If you run the binary on defaults from a location other than /usr/local/sbin/ make sure you edit the "WorkingDirectory=/usr/local/sbin/" line in the systemd template (further down this document) accordingly before using systemd to manage the service, or launching the program will fail because it can't find the HTML page.  Otherwise you can simply run it with the -cpage arg and specify the file path.

-----------------------------
Basic run commands:

Run standalone with defaults (POW difficulty 20, listens on port 9001, 13 hour token cookie expiry, 420s challenge time, no auth required, SHA256 POW hash, loads powchallenge.html from same working directory - this is enough in ~80% of cases):
./powblock187J-static

Run with flags (missing flag = default setting, flag order doesn't matter):
./powblock187J -port [port] -diff [difficulty] -ctime [ctime] -auth [authkey] -hash [hashvalue] -cpage [/path/to/yourchallenge.html] -debug -fast [milliseconds] -loose -silent -license [key] -help

e.g. ./powblock187J-static -port 9001 -diff 20 -ctime 420 -auth foobar123 -hash 512 -cpage /usr/local/sbin/foobar.html -debug -fast 1100 -loose -license 123456789

or ./powblock187J-static -h / --h / -help

help:  Displays a compact manual summarizing key points from the documentation. Also triggered by -h/--h

port:  The local port you want POWBlock to run on. Default is 9001

difficulty:  The number of leading 0 bits required for a proof of work to validate. 20 is default, 17 is low, 22 is very hard, min/max is 12/32

ctime:  The time in seconds that client connections can last and how much time each client gets to solve the proof of work (default 420)

authkey:  Your secret string that powblock checks to make sure traffic is coming from an authorized proxy (proxy must send this key via the X-PoW-ClientAuth header per request, 8 chars minimum, licensed POWBlock only)

hashvalue:  Specify "256" or "512" minus the quotation marks to select SHA256 or SHA512 proof of work. Default is 256

cpage:  Takes an absolute path to a challenge page html file. Default is to look for "powchallenge.html" in the same working directory

debug:  Enables very verbose debug logging to the console/syslog

fast:  Sets a speed limit (milliseconds) that rejects a client if they solve too fast, perhaps from using a GPU/ASIC cracker. Default is OFF

loose: Disables the base64 format validation in the sanity checker, and ignores the last IP octet when validating the IP bind between challenge and submission.  (Convenient for some oddball browsers/apps, private VPNs, TOR, etc that might mangle valid token encoding or hop the last octet per-request)

silent:  Disables all client side error messages (429, 400, etc) and forces silent drops on errors

license:  Accepts a 16+ char POWBlock license key that enables the optional control headers

Additionally, starting in version 1.8.7J, the system limiters became fully tunable via new startup args, with the old hardcoded values kept as defaults:

-maxconns   [N]          Max simultaneous global connections (default 8192)

-rlimit     [N]          General request rate limit count (default 100)
-rwindow    [secs]       General request rate limit window (default 120)

-slimit     [N]          Submission rate limit count (default 12)
-swindow    [secs]       Submission rate limit window (default 300)

-maxcli     [N]          Max concurrent connections per client IP (default 20)

-tsize      [N]          Tiny-read threshold in bytes (default 17)
-tmax       [N]          Max consecutive tiny reads before drop (default 60)

Headache notes:
- Your powchallenge.html javascript has to be correct for the type of hash. Either 256 and <32 or 512 and <64. If using the default challenge page, POWBlock will set the crypto params there automatically.
- Not all legit clients can do SHA512 POW.  Most can, but you *will* see the rare case where a user just can't get in.
- SHA512 resists GPU cracking and dedicated CPU farms but is harder/slower on browsers too. We suggest lowering difficulty by 1-2 points when using it.
- Debug mode does not throttle log prints and has highly verbose output, meaning it burns a ton of CPU. Do not use it under heavy load.
- Fast mode will also affect real clients who get lucky and have a fast solve. Be conservative when setting it (<3000), or increase difficulty slightly.
- Loose mode relaxes the client IP bind and pre-computation sanity checking, and this *will* allow some hostile bots through. Handle with care.

-----------------------------
Proxy Configuration Basics:

POWBlock is designed to run behind your existing reverse proxy as an alternate backend. Your proxy needs to be able to do just a few things to make use of it:
1:  Read client cookies and extract their values
2:  Compare strings, and direct traffic to different backends based on string matching
3:  SHA-256 digest, MD5 crypto, or an equivalent basic hashing operation
4:  Set and strip custom http headers
Basically every reverse proxy can do these things, though you might need to install the appropriate plugins like nginx-module-njs for Nginx, libvmod-digest and vmod-standard for Varnish or use a small Lua script with Haproxy for example.

The proxy server also needs to have a firewall like UFW that can restrict outsider access to POWBlock.  Direct access is an apocalyptic attack surface so secure it carefully in all cases.  Clients MUST reach POWBlock ONLY via the reverse proxy software.

The proxy must also serve traffic via HTTPS, because browsers cannot run the subtle.digest crypto operation over plain HTTP.  POWBlock doesn't care about this, but your clients sure will!

The logic is straightforward.  The proxy (or webserver, but we prefer to use reverse proxies) creates the expected value of a user's token by hashing their IP address (or fingerprint, or some other deterministic client value you like) with a hardcoded secret key. It reads their POW TOKEN cookie to see if the value matches this hash.  If they don't match, then the proxy sends them to POWBlock as the backend and passes that expected hash to POWBlock in the X-PoW-Expected header.  POWBlock serves them the challenge, and when they pass, it then takes that expected value and puts it in their POW TOKEN cookie before giving them a 302 redirect back to your website using the url stored in the X-Original-URL header.  The proxy compares their cookie again on the 302 request, only this time it matches the expected value, and so the proxy sends them to your website origin instead of POWBlock.  On top of this you can control clients with whatever kinds of logic and rules your proxy allows you to set.  Rate limits, custom redirects, bypasses for certain files, revoke their token cookie for abuse, the sky is the limit.  With a paid license you can also use the proxy to inject control headers to change POWBlock's settings on-the-fly.  Passing X-PoW-Difficulty = 19 will tell POWBlock to use a difficulty of 19 bits on that request instead of the default or whatever was set in the run flag.  Passing X-PoW-TokenExpires and/or X-PoW-IDExpires = numberSeconds changes the MAX-AGE on the POW TOKEN and POW ID cookies to the header's value instead of the default 13 hours.  So on and so forth.  The supported custom headers are:

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

The most basic configuration is to simply run POWBlock on defaults and set it as a transparent alternate backend that lives at 127.0.0.1:9001, code the secret key into your proxy config, set X-PoW-Expected as hash(client IP + secret key), get their real IP and set X-Client-IP, set a read on the client's POW TOKEN cookie, and set their backend to POWBlock if the match fails or the cookie doesn't exist.  Capture their original requested URL and set it as the value of X-Original-URL so they can be redirected after POWBlock. Then make sure you strip any client-submitted headers that could spoof the Key, POW difficulty, IP, and other essential values, set your firewall to only allow 9001 to be reached by localhost, and you're done.

Example config files are included in the documentation.  Since our primary use case was Varnish Cache, here is a minimalist sample VCL controller.  This goes at the very top of vcl_recv and requires Varnish 6LTS or newer (7.5 recommended) with the Standard vmod and libvmod-digest installed and imported:
#=============================================
	# Block spoofing of control headers by clients - THIS IS CRITICAL
    unset req.http.X-PoW-Secret;
    unset req.http.X-PoW-Expected;
    unset req.http.X-PoW-Token;
	unset req.http.X-Client-IP;
	unset req.http.X-PoW-Difficulty;
	unset req.http.X-PoW-CTime;
	unset req.http.X-PoW-HostDomain;
	
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
        set req.http.X-Original-URL = req.url;     # Where to redirect after success
        return (pass);						# Never cache POWBlock, but don't use return(pipe) because the headers may not get sent
    }

    # Valid token?  Then clean up and continue to origin
    unset req.http.X-PoW-Secret;
    unset req.http.X-PoW-Expected;
    unset req.http.X-PoW-Token;
	unset req.http.X-Client-IP;
	unset req.http.X-PoW-Difficulty;
	unset req.http.X-PoW-CTime;
	unset req.http.X-PoW-HostDomain;

#=============================================

-----------------------------
POWBlock Stats Polling:

POWBlock has a plaintext stats readout that shows the following data (counts are since startup):
- Uptime in seconds
- Current active connections right now
- Total requests processed
- Client IP hash table in use (table can track around 100k IPs for the rate limiters and conn counts)
- Failed challenges (insane/malformed answers, answers with leading 0 bits < difficulty, and speed limit rejections when -fast is enabled)
- Valid POW tokens issued
- Average POW solve time across all users
- Rate limit hits (global requests for 1 IP)
- Submission limit hits (POW answers submitted for 1 IP)
- Client fails for IP mismatches (answer came from different IP than challenge was sent to)
- Client fails for invalid HMAC (client exceeded CTime or else the challenge was reused/forged/tampered)
- Slowloris drops (no client data submitted for 30+ seconds)
- Timeout drops (client took longer than CTime to complete a connection - this is rare since Slowloris drops catch these first)
- Trickle drops (too many sequential tiny packets were sent by the client)
- Client max simultaneous connection drops (client tried to open >20 POW challenges at once)
- Average requests per second since startup

To access this readout, use curl from the local machine that POWBlock is running on to access the POWBlock port and request the /POWBlockStats page.  If using auth keys include them via the curl -H arg:

curl -H X-PoW-ClientAuth:fooauthkeybar123 localhost:9001/POWBlockStats

Executing this command on a machine that has multiple POWBlock instances running will poll one of them at random, but due to the kernel's own load balancing this will still give a good idea of what the average system stats look like. The grand total will be approximately [visible stats] multiplied times [POWBlock instances running].

Stat polling is scriptable, and can be turned into a live feed with the Linux "watch" command:

watch -n 5 'curl localhost:9001/POWBlockStats'

Note:  The /POWBlockStats page is technically accessible from the web unless you block the /POWBlockStats URL via your proxy. This happens because a client connecting who needs POW gets sent to the POWBlock port via the proxy, and if X-Original-URL was /POWBlockStats then it will show the stats display rather than the challenge page. This was left in the code because it can be a handy quirk for the admin, but be aware of it.  The stats page is subject to the normal rate limiter, but calling it is a bit expensive since the rate table stat check walks the entire table each time.

-----------------------------
System and Security Considerations:

POWBlock blindly trusts the various X-* control headers because they are expected to be provided only by the trusted proxy.  The proxy's logic *MUST* include an early function that strips these headers away if the client tries to provide them (spoofing), or else the client will have complete control over the POWBlock process.  Most often this is as simple as adding a header unset or NULL line for each of the control headers near the top of your proxy's configuration file.  Please see your proxy's documentation, or if using Varnish you can examine the sample VCL controller in this document.

POWBlock was designed foremost for simplicity and reliability. Single-threaded EPOLL architecture means no locks, no threads to manage, no process state shared, no memory shared, and no mutex-wakeup thrashing which is the Achilles heel of most other PoW systems like Anubis.  The bottlenecks are purely CPU and network I/O and these are predictable.  The kernel handles our processing and connection queues for us, and designing the engine around SO_REUSEADDR/SO_REUSEPORT made linear scaling trivial.  The overall operation cycle of [Accept-Process-Respond-Disconnect-Repeat] puts the onus on the client to complete the necessary connections, and thereby eliminates nearly all vulnerabilities related to keepalives, multiplexing, and smuggling.  Once the core of the program was established we squeezed as much speed and client capacity out of it as our skills would allow, often iterating under fire as our own websites were attacked.  POWBlock is so simple that it might be mistaken for a toy, but we remind the reader that few tools are more simple or more effective than a good quality sledgehammer.

POWBlock has two simple built-in rate limiters that allow 100 global requests/client/120s, and 12 PoW submissions/client/300s.  These limits are fairly high to accomodate users on shared IP addresses and to permit browser prefetch activity, but an ideal client should only require 2 requests (challenge GET + 302) and 1 submission GET per token.  Its other internal protections are thoughtful design that prevents common exhaustion vectors and memory/input overflows, good sanitization of data and client requests, a "safety first" fail-closed-on-client-error policy, an optional auth key to prevent unauthorized outside access, throttled logging to prevent CPU spin from log spamming, and a simple header/connection timeout/trickle tracker with a timed sweep that makes it resistant to Slowloris attacks.  For everything else it relies on the reverse proxy and server firewall.  It is critical that you isolate POWBlock from the open Internet, whether by IPTables or a simple firewall like UFW.  Clients must never be able to reach it directly, only via the reverse proxy.  Additionally using the proxy to rate limit clients both connecting to POWBlock (simple limit like 30requests/10 seconds to account for browser prefetching) and a much tighter limit on submissions (if url ~ ?powblock limit 2-4 per IP per minute) are solid security measures to prevent POWBlock from becoming a weak link in your website stack.

Each single-threaded POWBlock can handle 8192+ concurrent simultaneous connections, and past benchmarks on version 1.8.1 showed that it can process 9000+ requests per second depending on your hardware, bandwidth, proxy capacity, and the types of requests coming in.  Submissions are the hot path as they invoke the URL checker/parser, the complex HMAC signature operator, and the encoding/decoding functions that use the most CPU.  Each POWBlock can process 2000+ valid submissions per second before pegging a typical CPU core at 100%.  A sanity checker tries to detect invalid submissions early and dumps hostile clients without invoking the hot path, while the variable solve times inherent to PoW client operations introduces a natural jitter that mitigates the thundering herd. While we haven't benchmarked the newer 1.8.x series releases in the same way, our production stack has used a single POWBlock in combination with Haproxy to tank DDoS attacks as large as 250,000 requests per second with a budget 4-core VPS.

POWBlock offers little defense against huge, volumetric DDoS attacks that rely on sapping your bandwidth to zero (pipe flood) to take you down, or those that are powerful and sudden enough to crash your proxy with pure traffic overload before POWBlock can come into play.  Only a proper CDN that can distribute the attack load over many network links is capable of absorbing these, so POWBlock doesn't replace the Cloudflares and Basedflares of the world in that respect.  Smaller DDoS attacks (common request floods, LOIC barrages, small to medium botnets) get bottlenecked by a good POWBlock configuration.  Because all requests, regardless of URL or client IP, have to pass through the controller's challenge logic, if you put a rate limiter right before the backend handoff it become impossible for attackers to avoid it. You can also use the POW_TOKEN cookie as a powerful trust signal, and shed unauthenticated clients at the edge when your stack is under severe attack.

POWBlock is particularly good at stopping automated spam if your proxy is configured for it.  Use your proxy's logic to require a valid POW_TOKEN on all POST and PUT requests, and every python bot and script kiddie spamming blind posts at your API will be instantly blocked until they learn how to do proof-of-work.  Facilitating this was one of the reasons why POWBlock was designed to submit PoW solutions via GET with query params - a method normally considered archaic in 2024.

Because POWBlock is a primitive, it can be incorporated into a server stack in a massive variety of ways.  Functionally no two mature websites using it will likely have exactly the same software stacks, security checks, issuance logic, or validation logic.  This means that there is no standardized attack surface for hostile clients to research and tune against.  Every website running it presents a unique challenge to every attacker. Just remember that POWBlock is extremely powerful but relies on (you) being smart about how you use it.  There are no training wheels.

Lastly, POWBlock is tiny and boring on purpose. It is a single-threaded EPOLL server with no dynamic memory growth after startup, no keepalive, no complex parsers, no upstream libraries or supply-chain dependencies, and fixed-size buffers that fit in a CPU core’s hot path. Every allocation is hard-capped, every input is length-checked and rejected early, and the only cryptographic operations are standard HMAC-256 and SHA-256/512 for a straightforward leading-zero proof-of-work. The attack surface is measured in a few thousand lines of straightforward C99+GNU rather than a web framework or a multi-threaded runtime. There is very little uncontrolled code that could ever hide a surprise. Our background goal was to create it in such a way that it would look perfectly normal sitting alongside netcat, telnet, or any of the thousand other boring-but-performant network primitives.

-----------------------------
Advanced POWBlock:  Banning

It can be very advantageous to incorporate Fail2ban in your POWBlock stack to place timed bans on hostile IPs that repeatedly fail challenges.  This is done by using Fail2ban's own system log parser and by configuring a custom filter + jail for POWBlock clients.  Basic examples follow:

Example Filter (/etc/fail2ban/filter.d/powblock.conf):
[Definition]
#failregex = \[POWBLOCK\] DROP .* from <HOST>
failregex = ^.*?\[POWBLOCK\] DROP .*? from <HOST>$

ignoreregex =

# Explanation:
# <ADDR> is Fail2ban's built-in pattern for IPv4/IPv6 addresses
# This one regex catches ALL drop types (rate-limit, per-ip-conns, trickle, slowloris, etc.)


Example Jail (/etc/fail2ban/jail.d/powblock.local):
[powblock]
enabled   = true
port      = http,https
filter    = powblock
backend   = systemd

# This matches ANY instance (powblock@1, powblock@2, etc.)
journalmatch = _SYSTEMD_UNIT=powblock@*.service

# If using POWBlock inside a systemd nspawn container run fail2ban on the host server and do
# sudo journalctl -M CONTAINERNAME -u 'powblock@*.service' -n 5 -o json-pretty
# to get the MACHINE ID from the output and then use your MACHINE ID like this:
# journalmatch = _MACHINE_ID=016c82e2120b4c02a713b39c83985654 + _SYSTEMD_UNIT=powblock@*.service

# Ban criteria:  DROPs in WINDOW triggers ban for TIME ignoring SELF and bans perform DEFAULT ACTION (usually IPtables ban)
maxretry  = 8
findtime  = 3600
bantime   = 7200
ignoreip  = 127.0.0.1/8 ::1
action = %(action_)s

# Check active bans from the host server with:
# sudo fail2ban-client status powblock

-----------------------------
Advanced POWBlock:  Distributed Networks

If your website uses a number of frontends (for example, multiple reverse proxies on round-robin DNS all serving a single origin) POWBlock can accommodate this easily.  Since POWBlock is completely stateless there is no concern with shared state across multiple frontend servers.  The only thing required is that each server uses an identical configuration for the POW issuance/validation logic and an identical X-PoW-Secret key.  Then it doesn't matter which server a client accesses - the tokens and validation will always be the same, and a client passing POWBlock on any connection is instantly recognized by all the other frontends. POWBlock uses the same shared secret for client hashing and the internal HMAC signature on every instance, and so the shared secret makes network distribution trivial.

-----------------------------
Advanced POWBlock:  Scaling

POWBlock is designed to scale linearly via systemd, using the @.service template.  By creating an @.service file in /etc/systemd/system (Debian) or its equivalent you can then activate and run multiple simultaneous instances of POWBlock on the same machine ("sudo systemctl start powblock@1 powblock@2" etc), using the same port and same config.  The Linux kernel will automatically distribute client load across these multiple instances in a round-robin manner.  It is recommended to not run more than [server number of CPU cores] minus one.  So a 4 core machine does best with 1-3 POWBlocks, leaving at least one core as a failover for other software in case of heavy attack load.  Up to [cores] POWBlock instances can be ran on a large, dedicated server, but more than 25 begins to see diminishing returns due to kernel overhead.  A 16 core, 128GB Enterprise server with 15 POWBlocks should comfortably handle 150,000+ requests per second from scores of thousands of IPs, and clustering such servers via round-robin is also fully supported.  

Example systemd template name:  powblock@.service

[Unit]
Description=POWBlock (instance %i)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/powblock187J-static -port 9001 -diff 17 -ctime 80 -loose
WorkingDirectory=/usr/local/sbin/
Restart=always
RestartSec=5
User=powblock
KillMode=process
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target

-----------------------------
Advanced POWBlock:  Remote POW

POWBlock binds on all interfaces (0.0.0.0) and supports networking by default, making it accessible both internally to a local reverse proxy and also to remote proxies.  An advanced user may wish to run POWBlock on its own server, or to stack up instances on a single dedicated machine (a "powbox") to serve as a powerful network gate that all of their reverse proxies can dial into remotely.  POWBlock does not require any configuration to do this - it is enabled by default, though it is critical that such users secure the POWBlock machine with a firewall that only accepts connections from the trusted reverse proxies.  In such cases the remote proxy auth key should be enabled and authorized proxies should be configured to submit the X-PoW-ClientAuth header containing the key with every request.  POWBlock supports being ran behind a simple TLS proxy like Hitch or Haproxy, and when configured with certs this can secure traffic between the remote proxy and the powbox server via ordinary HTTPS (just set the HTTPS domain, instead of the IP address of the powbox, as your proxy backend and configure your proxy for TLS when using it, or use Stunnel if your proxy doesn't support backend TLS).  Remember that POWBlock *is a backend* and must be treated as such, with traffic being passed to it transparently.

Example minimalist Stunnel config:

[goingtopowblock]
client = yes
accept = 127.0.0.1:9002  ; local port your proxy connects to (plain HTTP)
connect = powblock.com:443    ; remote HTTPS endpoint
verify = 2               ; validate cert chain (2 = verify with CA)
CAfile = /etc/ssl/certs/ca-certificates.crt  ; system CA bundle (includes Let's Encrypt)
checkHost = powblock.com      ; verify hostname matches cert

-----------------------------
Advanced POWBlock:  TOR Onion POW

POWBlock is fully compatible with Tor traffic provided your hidden service and proxy are configured properly.  By adding the setting:

HiddenServiceExportCircuitID haproxy

to your torrc file, the Tor service will automatically generate a pseudo-IPV6 (dead:beef) containing an encoded string that uniquely identifies the specific Tor circuit of a connecting client, and transmits it to your onion via the haproxy-type PROXY V1 data.  The last 2 octets of this IP represent the specific Tor relays that the user is connecting through, and serves as a "pretty unique" identifier.  Its not perfect, but collisions where users are coming in on the exact same circuit are rare enough for this pseudo-IP to tell them apart in most cases.  Once Tor is configured, your proxy needs to sit between the TOR service and your hidden service webserver and must also be able to parse PROXY V1 data.  Varnish can do this by running it with the PROXY arg, and doing so will automatically have it populate its client.ip data with the pseudo IP.  From there you can copy it into X-Client-IP and send it along to POWBlock just like an ordinary IPV6 address and it will serve the same purpose.  For other proxies please see their documentation but the logic remains the same.

Alternatively you can use your proxy to give a signed, unique session cookie to clients who connect, and then validate that cookie value and use it as your client data.

-----------------------------
Tips, Tricks, Quirks, and Notes:

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
- Set up an abuse throttle in your proxy that overwrites a client's POW_TOKEN value to garbage via a set-cookie response if they exceed your limits once inside - this will block their abuse and kick them out on their next navigation.
- If your site has very odd URL structures that mangle redirects from POWBlock, you can intercept the 302 and rewrite it with your proxy.
- If you'd like a dedicated POWBlock logfile instead of logging to the system journal, you can add:
StandardError=append:/path/to/log/dir/powblock.log
to the systemd template right below EXECSTART.
- If you can't pay for a license but *really* need dynamic difficulty, just run another POWBlock with a separate startup config and use it as an "easy mode" backend.

-POWBlock intentionally separates the client's cookie values from anything going on inside its own process, and leaves them up to the proxy. This gives the admin the freedom to use *anything* as the token value, while leaving POWBlock free to cleanly IP bind and time limit challenges and submissions. Hash(clientIP+Secret) is just our recommended practice for the POW_TOKEN. You can use any kind of deterministic client value or hash you want as long as you keep X-PoW-Expected to <64 printable bytes. Hack away.

-POWBlock doesn't have or need a configuration file like most programs do, because with a paid license the proxy can configure it on the fly.  Your proxy configuration becomes POWBlock's config file, and all the basic configs are handled via startup args in the free version.

-The proxy logic can be as simple as the example in this document, or as atrociously complicated as the 500+ line VCL controller that the authors use on our production servers. A really good controller is just as much of a technical marvel as POWBlock itself, especially with a license that unlocks all of the granular control headers.

- POWBlock gets much of its performance and security from the KISS principle. No threads, no keepalive, no dynamic growth. Small fixed buffers and a structural size deliberately chosen to sit in the hot path of a modern CPU core and run as fast as the hardware will allow. We almost never touch the heap - and in the two places we do, the allocations are hard-capped, short lived, and surrounded by safety checks.

-----------------------------
Troubleshooting:

POWBlock doesn't appear at all - check your firewall and auth keys and make sure it can still be accessed by the reverse proxy, make sure POWBlock itself is running and doublecheck your port. If it failed to bind you're likely using a restricted port, so switch to a higher port or run as root (not suggested). If you're sure the port and firewall are correct, double check your proxy config and make sure its actually sending traffic there.

POWBlock appears but spins forever and never completes - A few things can cause this.  1:  You look like a bot.  Some browser plugins can guard your privacy so strictly they fool the JS detector code in the default powchallenge.html page into thinking you're a bot, and so it passes you the challenge and then silently hangs up on you.  Disable your plugins / Brave shields etc and try again.  2:  The X-Original-URL header is not being passed by your proxy.  POWBlock requires its value to complete the 302+set-cookie cycle, and if its missing or malformed then the challenge page may keep reloading back to itself, leaving you stuck.  If none of these apply, consider that the difficulty might be set too high or else the device is very slow at crunching proof-of-work, like an older phone.  Consider lowering the difficulty and/or increasing the CTime and testing again.  There is a hard cap (CTime) on how long a user can attempt to solve a challenge, and if they're taking longer than that it will never complete.  3:  Your browser is mangling the POW submission, such as by %encoding characters in the pbchal string, or padding the request with extra bytes that are being injected into the parser.  Try a different browser or try running POWBlock in -loose mode to test.  4:  Some factor is causing your IP address to change between requesting the challenge and submitting the POW answer.  Try a different browser or try running POWBlock in -loose mode to test, or consult your network administrator.  5:  The client isn't connecting over HTTPS.  The default powchallenge.html page relies on subtle.digest crypto, which browsers cannot run over plain HTTP.

POWBlock seems to work fine but users get too many challenges - This is caused by whatever logic you implemented in your proxy to determine token validity.  POWBlock itself doesn't decide when valid challenges happen.  Inspect your proxy config. In the classical setup the tokens are bound to the client IP address, so users whose IPs change very often (some mobile carriers) will hit POWBlock much more frequently.  For such cases you may wish to use your proxy to pass device fingerprints in a header and hash that with the secret instead of their IP. If you take this approach we suggest using the vanilla JA4 or JA3N TLS fingerprints, but be aware that if your web stack supports HTTP/3 then TLS fingerprints become non-deterministic since the same client will have different prints depending on whether the HTTP/3 or HTTP/2 connection completes first, and this can change from request to request.  If you find yourself in this boat we suggest locking your proxy to only HTTP/2 traffic via ALPN, or even HTTP1.1 if you don't need the fancy features.  Other factors related to your stack or the client's browser behaviour may also cause fingerprints to change, so be aware.

The domain set by X-PoW-HostDomain isn't working correctly - POWBlock validates the domain to RFC2965 for maximum compatibility. It begins with a leading dot:
Valid:  .example.com (scopes example.com and all subdomains of it including www)	.subdomain.example.com (scopes only to this subdomain)
Invalid:  example.com	subdomain.example.com
Alternatively you might have your remote, HTTPS protected POW server *not* set as a *transparent* backend. The client should never see the HTTPS domain of the POWBlock server in their browser - only your origin website's domain.

POWBlock 1.8.x Series "Jehuty" Limits
================================================================

- Maximum concurrent connections : 8192
- Max connections per single IP  : 20
- Request rate limit             : 100/120s total, 12/300s submissions (per IP, sliding window)
- Slowloris / header timeout     : 30 seconds
- Default connection lifetime    : 420 seconds (-ctime flag)
- Connection sweep runs every    : 20 seconds (zombie & timeout cleanup)
- Trickle protection             : drops after 60 reads < 17 bytes

SOME LIMITS CAN BE ADJUSTED SINCE 1.8.7J - SEE THE STARTUP ARG SECTION
================================================================

-----------------------------
Design Notes for Admins:

POWBlock is intentionally minimalist and opinionated with a ruthless design spec. These are the more obscure technical decisions and invariants sysadmins should know when integrating or troubleshooting at a deeper level.

Authority in the Stack:

- POWBlock is a primitive and is designed to be just one discreet part of a POW gate system.
- The server firewall owns access to POWBlock itself, with the POWBlock auth key as a second layer defense.
- The proxy (or server) owns HTTPS, general rate limiting, token validation, issuance requirements, and traffic control.
- POWBlock owns the POW challenge and generates it for each client.
- The POWBlock-specific proxy configuration, called the "POWBlock Controller" is the glue that links POWBlock, the proxy, and your website together.
- Fail2ban owns banning hostile clients based on POWBlock's journal log output.
- Clients own state via holding the POW cookies.
- In each case communication forms a clean one-way loop:  {(Client > Proxy) > |POWBlock/Fail2ban|} > [Client > Proxy > Origin]
- where () is Issuance logic, {} is Challenge logic, || is Ban logic, and [] is Validation/Access logic.
- Each piece is committed to doing only what it does best. No blob or spaghetti interactions.
- This allows each piece to be updated, monitored, debugged, and rebuilt or replaced independently of the others, as needed.

Challenge Page Invariants:

- The challenge page HTML is loaded and held in active memory at startup via classic fopen() and SEEK_END.
- The challenge page, cookies, and full response data (302 URL, token+nonce submission query strings, etc) must all fit inside the 16kB response buffer.
- This limits your practical challenge page size. Keep your page under ~10kB. Minification of the HTML/JS can help with this.
- The default powchallenge.html page is around 6kB and takes 3 args from POWBlock:
- <pre id=c  %s  This takes the challenge token that POWBlock provided.
- <pre id=d  %s  This sets the POW difficulty (required leading 0 bits).
- <pre id=h  %d  This sets the hash algo (SHA-256 or 512).
- If you wish to custom craft a challenge page, examine powchallenge.html for the implementation of these variables.

POWBlock Connection Dropping:

- POWBlock uses simple logic for self protection:  If it is under attack, overwhelmed, or fed garbage, it hangs up on the offending client.
- This behavior minimizes attacker knowledge, CPU use, RAM use, and bandwidth use and is intentional.
- When -silent mode is active, no client response will be sent in the event of *any* error.
- Under attack this can cause false 503s from your controlling proxy or server because the proxy or server might interpret the high number of "conn close" events without graceful response headers as a down or unhealthy backend. This can cause inadvertent DoS to legitimate clients.
- Mitigate this by configuring your proxy to ignore the dropped connections for the POWBlock backend, to ping the /POWBlockStats page as a reliable health check, or else see Advanced POWBlock: Banning for direct mitigation.

Redirection logic invariants:

- POWBlock generates a standard 302 to X-Original-URL that includes the set-cookie responses.
- Chrome based browsers don't like executing a 302 when a set-cookie happens, and will often take the cookies but fail to redirect.
- The default powchallenge.html includes a fallback redirect in the JS that fires after several milliseconds, to get Chrome moving.
- POWBlock has a builtin URL sanitizer that strips the token and nonce from the URL of the final redirect, allowing clean navigation.
- Likewise the default challenge page stores the clean original URL and the fallback redirect will send the client there.

POWBlock status headers:

` When POWBlock responds with an HTTP 200 on first connection, it automatically sends a header "X-PoWBlock-Status: required".
- This is an alert that can be picked up by app developers and others who may need a particular signal that POWBlock has been reached by the client.
- Similarly when a client has completed POWBlock and the 302 redirect fires, POWBlock adds a header "X-PoWBlock-Status: completed" to signal passage.

POW_TOKEN and POW_ID format:

- POW_TOKEN and POW_ID are blind tokens.
- POWBlock will set the cookie value as whatever string the proxy sends in the X-PoW-Expected or X-PoW-ID header, up to the copiable limit of 63 chars + null.
- If the X-PoW-Expected header is absent the POW_TOKEN cookie will be set with a blank value.
- If the X-PoW-ID header is absent, the POW_ID cookie will not be set at all.

Challenge token generation:

- Each challenge uses 32 random bytes from C GetRandom() = 64 hex chars.
- Fallback RNG - if GetRandom() fails for any reason (rare), POWBlock will attempt to read from /dev/urandom as a backup.
- If both fail, the challenge will be unsolvable and the error will be logged.
- Challenge lifetime default is 420 seconds via internal timestamp. This is configurable by the ctime startup arg and the X-PoW-CTime header.

Submission handling:

- The Nonce is informed by the query param "powblock=nonce" and the signed challenge by "pbchal=challengetoken."
- Nonce is parsed as unsigned long long via strtoull() - supports very large values (up to ~10^8).
- Trailing garbage after nonce is allowed (?pow=12345abc = nonce=12345) - intentional to tolerate sloppy clients or sites with unusual URL configs.
- A sanity checker runs immediately after query parsing and rejects impossible nonces and non-base64 tokens, sparing the crypto operations.
- Submissions are accepted preferentially from X-Original-URL and then from the request URL as a fallback - the rest of the client's buffer data is ignored.
- If an otherwise valid submission somehow informs more than one nonce or challenge, the parser takes only the rightmost (most recent) of each and ignores the rest.

Header parsing invariants:

- All headers are copied before use with whitespace trimming and CRLF replaced with '_'.
- Maximum copied length per header: 4095 chars for X-Original-URL (4000 read), 63 chars for tokens/IDs, 15 chars for difficulty.
- If a header value exceeds its buffer, it's silently truncated - proxy should keep values sufficiently short.
- Folded headers cannot be read from the proxy, the parsing grabs the first line only.
- Headers are parsed once at client connect time and held in the struct cache for that connection, read via pointers, sanitized, and finally the clean values stored back in the struct for use.

HMAC signature invariants:

- The HMAC uses SHA256 and is not affected by the hash arg even if you set the POW to use 512.
- The payload consists of client IP (from X-Client-IP), random challenge token, timestamp, and the key from X-PoW-Secret which is reused for signing.
- The final challenge is encoded and parsed by a custom Base64 encoder/decoder function that does not call an external lib and that uses manual padding.
- The HMAC is checked on challenge issuance and again on answer submission, ensuring the same client solved the same token within the CTime window.
- If HMAC verification fails it means the challenge was tampered with or failed to solve within CTime, and these events are logged.
- CTime timestamp grants a forward grace of 15s to account for clock skew into the future.
- There is a GetPeerName() fallback that will populate the client IP when accessed directly, as well as a fallback randomly generated secret key.
- THESE TWO FALLBACKS ARE *ONLY* FOR LOCALHOST TESTING WHERE NO PROXY IS AVAILABLE. DO NOT USE THEM IN PROD. YOU HAVE BEEN WARNED.

Cookie setting behavior:

- POW_TOKEN and POW_ID are always HttpOnly + SameSite=Lax.
- Secure flag is never set by POWBlock - TLS termination and Secure cookies must be handled by the proxy.
- Max-Age is taken from header if provided (X-PoW-TokenExpires / X-PoW-IDExpires), else defaults to 46800s (~13 hours).
- Path=/ - fixed (cannot be overridden).
- Domain= is optional and set by the X-PoW-HostDomain header when available (default is the current domain from the browser request if POWBlock is running locally)

Performance & DoS resistance invariants:

- Max concurrent connections default-capped at 8192 per instance.
- Clients are rate limited to 100 requests per 120s per IP and 12 PoW submissions per 300s per IP, as tracked in a 524288 block hash table with linear probing.
- Probe depth is 256 and expired entries are tombstoned for reuse.
- Max connections from a single client IP are default-capped at 20 and tracked in the rate limiting hash table. Extras are dropped and logged.
- A "trickle detector" counts data flows from clients that are <17 bytes and increments a counter. After 60 sequential trickles the connection is dropped.
- Protection against slow clients relies on HEADER_TIMEOUT (30s inactivity on headers) + per-connection lifetime timeout (CTime).
- Accept loop drains the listen queue until EAGAIN (no artificial per-cycle limit).
- Header read loop drains until EAGAIN, headers complete, or buffer full (no fixed read-attempt limit).
- Active_conns are swept every 20s via walking a linked list, with connections older than ctime being closed and freed regardless of status.
- A memory probe sweeps the hash table every 5 minutes and clears any entries that are older than 1 hour, preventing table exhaustion.
- Attack log prints are throttled to prevent CPU pegging attacks by log spamming.
- The rate limiters, max connections, and trickle detection are adjustable via startup args since 1.8.7J.

Logging invariants:

- All logs use fprintf(stderr) and DROP logs are individually throttled to print no more than once every 2 seconds.
- Attack-relevant logs all follow the pattern "[POWBLOCK] DROP ... from IP ..." to facilitate easy Fail2ban parsing.
- Log entries and messages are the following list (some require -debug mode):

POWBlock Standard Log Messages Reference
================================
Startup / Info Logs:
=== POWBlock v1.8.7 'Jehuty' Started ===
Port               : %d
Difficulty         : %d bits
Connection Timeout : %d seconds (CTime)
Hash Algorithm     : SHA-%d
Challenge Page     : %s (%zu bytes)
=== DEBUG MODE ENABLED ===
=== LICENSE VALID ===
=== INVALID LICENSE KEY ===
=== LOOSE MODE ENABLED === Warning: Reduced security...
=== SILENT MODE ENABLED ===
=== GPU BUSTER ENABLED === Fast solve threshold: %d ms
Loaded challenge template from %s (%zu bytes)
Failed to open challenge page '%s': %s
Challenge page '%s' is empty
Failed to allocate %ld bytes for template
Short read on challenge page '%s'
Failed to generate fallback HMAC secret

DROP/Security Logs:
[POWBLOCK] DROP RateLimit from %s
[POWBLOCK] DROP SubmissionLimit from %s
[POWBLOCK] DROP MaxIPConns from %s
[POWBLOCK] DROP Trickling from %s
[POWBLOCK] DROP LifetimeSweep from %s
[POWBLOCK] DROP SlowlorisSweep from %s
[POWBLOCK] DROP BadHMAC from %s
[POWBLOCK] DROP WeakPOW %d vs %d bits from %s
[POWBLOCK] DROP InsaneSubmission from %s
[POWBLOCK] DROP LifetimeOut from %s
[POWBLOCK] DROP Slowloris from %s
[POWBLOCK] DROP BogeyFastMover %ld ms vs %d from %s
[POWBLOCK] DROP MismatchIP token %s vs current %s%s from %s
[POWBLOCK] DROP ChallengeExpired ts %ld vs now %ld timeout %d from %s

Other Operational Logs:
[POWBLOCK] Cleared %d stale IP rate-limit entries
[POWBLOCK] WARNING: Rate table high collision pressure from %s (probes=%d)
[POWBLOCK] Shutting down...

Logs that require -debug:
[POWBLOCK] rearm_for_read failed for %s (fd=%d): %s
[POWBLOCK] rearm_for_write failed for %s (fd=%d): %s
[POWBLOCK] DEBUG: No powblock= found from %s
[POWBLOCK] DEBUG: No pbchal= found from %s
[POWBLOCK] DEBUG: base64 decoded len=%zu from %s
[POWBLOCK] DEBUG: Bad payload length %zu from %s
[POWBLOCK] DEBUG: Payload starts with: %.100s from %s
[POWBLOCK] DEBUG: Payload parse failed (fields=%d) from %s
[POWBLOCK] DEBUG: Client request line: %.1000s...
[POWBLOCK] DEBUG: Extracted pbchal token len=%zu from %s
[POWBLOCK] DEBUG: No challenge template loaded - cannot serve challenge
[POWBLOCK] DEBUG: Entropy failure in challenge from %s
[POWBLOCK] getrandom failed, using /dev/urandom fallback
[POWBLOCK] All entropy sources failed for %zu bytes

Dumps raw and normalized headers (comparison/parser debugging)


================================

Error / fallback behavior:

- On any internal failure (snprintf overflow, total entropy failure, etc) = safe fallback (empty response, restart challenge, or close the connection).
- On any client-side failure (slow headers, garbage injection, targeted overflow, etc) = safe fallback (truncate safely, free and restart, or close the connection)
- No panics, no aborts - always attempts a graceful close.
- POWBlock relies on the system kernel to clean up orphaned sockets and file descriptors instead of trying to do it by itself.

These choices prioritize simplicity, predictability, and safety under attack over configuration fiddling on POWBlock itself. If something breaks in an unexpected way, it's almost always in the proxy configuration (hashing, headers, cookie parsing, rate limiting, etc) rather than POWBlock.

=====================================
POWBlock 1.8x Series - API Specification

Version: 1.8.7J "Jehuty"
Type:   Header-driven Proof-of-Work Microservice
Date:   April 2026

Overview
--------
POWBlock is a lightweight, stateless HTTP backend that provides
Proof-of-Work challenges. It lacks traditional REST endpoints and
relies on a custom HTTP request/response protocol that is driven by
a proxy or server running in front of it.

Base URL
--------
http://127.0.0.1:9001/   (or the port configured with -port)

Endpoints
---------
GET /          Main challenge endpoint (default route)
GET /POWBlockStats     Statistics page (plain text)

Request Headers (sent by controlling proxy)
--------------------------------------------
(Universal)
X-Client-IP           : Canonical client IP (required)
X-PoW-Expected        : Expected POW_TOKEN value (required)
X-Original-URL        : Original URL to redirect to after success (required)
X-PoW-Secret          : Set primary HMAC key for this request

(Licensed Copy)
X-PoW-ID              : Optional value for POW_ID cookie
X-PoW-Difficulty      : Override difficulty (12-32)
X-PoW-CTime           : Override max solve time / connection lifetime (seconds)
X-PoW-TokenExpires    : Override Max-Age for POW_TOKEN cookie
X-PoW-IDExpires       : Override Max-Age for POW_ID cookie
X-PoW-HostDomain      : Set Domain= attribute on cookies
X-PoW-ClientAuth      : Authentication key (if enabled at startup)


Response Headers (returned by POWBlock)
----------------------------------------
X-PoWBlock-Status: required     Client must solve challenge
X-PoWBlock-Status: completed    Challenge solved successfully
X-PB-License: BOOL              Reveals licensed/unlicensed status
Set-Cookie: POW_TOKEN=          Contains the value from X-PoW-Expected
Set-Cookie: POW_ID=             (if provided)
Location:                       (on successful 302 redirect)
Cache-control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, private

HTTP Status Codes
-----------------
200  - Challenge page served
302  - Successful solve + redirect
400 -  Bad submission
429  - Rate limited
403  - Auth key missing or invalid (if enabled)
Connection closed - End of request cycle, any drop condition (slowloris, trickle, limit exceeded, etc.)

Cookie Contract
---------------
POW_TOKEN   : Main proof token. Must match X-PoW-Expected value.
POW_ID      : Optional secondary identifier/fingerprint/bypass key.
Both are HttpOnly + SameSite=Lax + Path=/

Security Requirements (Mandatory)
---------------------------------
- Reverse proxy MUST strip all X-* headers from external clients.
- POWBlock must never be directly reachable from the public internet.
- Use X-PoW-ClientAuth when exposing to remote proxies.
================================================================
This specification is valid for POWBlock 1.8.7J "Jehuty" and newer.
