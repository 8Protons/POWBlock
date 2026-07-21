Introduction:

What is POWBlock:  
POWBlock is a simple, high performance proof-of-work gateway that sits behind any reverse proxy or server. Written in pure C with EPOLL, and including a separate challenge page with HTML and inline javascript, it is a self-contained program that provides high-speed, high-volume, hardware optimized proof-of-work defense as a microservice.  You point your proxy at it, it serves a tiny JavaScript challenge page that forces the client to burn CPU cycles mining a SHA-256 or SHA-512 hash with enough leading zeros, and if they succeed it hands back a cookie (POW_TOKEN) that lets them through to your main site and then redirects them where they wanted to go. No fancy UI, no bloated framework, no massive dependency list - just a single ~1MB binary with zero dependencies that runs on basically anything and scales linearly if you spin up multiple instances.  POWBlock can be controlled by http headers injected by your proxy or server and does not require any integration with your website code to work - No embeds, no widgets, no Wordpress plugins needed.  

Why POWBlock exists: 
All existing PoW defense tools try to own your stack or else come with a ton of integration requirements, moving parts, and system bloat/overhead. POWBlock is 100% system agnostic.  It doesn't care what your backend is, what language your site uses, or whether your proxy is running Varnish, Nginx, Caddy, Traefik, Apache, or a homebrew server built with BASH, Netcat, and duct tape.  It doesn't care if its standing alone on your network edge or if you're using Cloudflare in front of it.  It doesn't care if you're running one instance on the local machine or 20 instances on a remote machine.  It doesn't care if its running on clearnet or TOR.  It doesn't even need to start as root.  It's built on the classic UNIX philosophy to do exactly one job, and to do it well.  It does this while using absolutely minimal system resources and presenting an absolutely minimal attack surface, and is especially designed to operate under the control of your existing stack. It is proof-of-work defense *as a primitive* and is the first of its kind.

Why we made it:  
The world of the present day is awash with scraper bots and small-time DDoS for hire goons all feeding off the "AI revolution" and proliferation of massive global networks of micro-bots based on compromised IoT devices.  Independent sites are being corralled onto huge platforms like Cloudflare to get even basic protections, and the very few self-hosted solutions out there are fat, clunky, domineering of your tech stack, incompatible or inefficient with many website setups, and often quite weak in spite of their complexity. We started with the notion of making a very strong PoW gate for use with Varnish Cache, but it turned out that in making it Varnish compatible it was already so close to being system agnostic that we decided to lean into the concept.

Who we are:  
Blue Rogues Development is a voluntary association of professional programmers, ex-hackers and tech nerds from the world of classical forums and anonymous imageboards. We've existed in some form since the year 2000, and we adapted our name and logo from the heroic pirate faction of a certain popular videogame from that era. Our membership has waxed and waned over the years and we never sought the limelight, so little of our activity is public.  We are not "coders" who "vibe code apps" - we're programmers and we write programs the old fashioned way.  In the present day our half-dozen members have a focus on website resilience, private network engineering, anti-censorship causes, and fighting against automated spam and abuse.  POWBlock was written almost entirely by hand using Xed.

Use POWBlock if you want ultralight, powerful, system-agnostic bot protection and DDoS defense without selling your soul (or your client's data) to outside companies or big tech. It's perfect for self-hosters, site networks of any size, and anyone who's tired of rate-limiting and "be nice" FOSS software defenses not cutting it against AI scrapers and other malicious clients. Plug it into your proxy, crank it up, and watch the noise plummet.


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

COMMERCIAL/SHAREWARE Line:  
1.8.0J "Jehuty" - Eliminated OpenSSL dependency via portable SHA-256/512 libs, full refactor for static binary compile  
1.8.1J - Added -silent mode and -license key system, finished and debugged 1.8.0 refactor according to C code and EPOLL best practices  
1.8.2J - Performed edge-case security auditing and hardening, added X-PB-License status headers, developed Pipy Controller 1.0  
1.8.3J - Fixed an edge-case UAF crash and added high-precision Time tracking to the GPU Buster and HMAC subsystems  
1.8.3T "Asuka" - ASAN/gdb testbed deployed against ongoing large (~250kRPS) DDoS attacks for data gathering and debugging  
1.8.4J - Fixed several small memory and return value issues revealed by DDoS load  
1.8.5J - Upgraded EPOLL accept loop for atomicity, removed old send_response wrapper, hardened write cycle, and normalized all function returns  
1.8.6J - Further hardened submission parsing logic to prevent attacks by req body corruption  
