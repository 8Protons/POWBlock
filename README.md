![Introduction](https://github.com/8Protons/POWBlock/blob/main/docs/powblocklogo.png)

**What is POWBlock:**

POWBlock is a simple, high performance proof-of-work gateway that sits behind any reverse proxy or server. Written in pure C with EPOLL, and including a separate challenge page with HTML and inline javascript, it is a self-contained program that provides high-speed, high-volume, hardware optimized proof-of-work defense as a microservice.  You point your proxy at it, it serves a tiny JavaScript challenge page that forces the client to burn CPU cycles mining a SHA-256 or SHA-512 hash with enough leading zeros, and if they succeed it hands back a cookie (POW_TOKEN) that lets them through to your main site and then redirects them where they wanted to go. 

No fancy UI, no bloated framework, no exotic runtime, no massive dependency list - just a single ~1MB drop-in binary with zero dependencies that runs on basically anything and scales linearly if you spin up multiple instances.  POWBlock can be controlled by HTTP headers injected by your proxy or server and does not require any integration with your website code to work - No embeds, no widgets, no Wordpress plugins needed.  It's built on the classic UNIX philosophy to do exactly one job, and to do it well.  It does this while using absolutely minimal system resources and presenting an absolutely minimal attack surface, and is especially designed to operate under the control of your existing stack. It is proof-of-work defense *as a composable primitive* and is the first of its kind. The version provided here is compiled for AMD64 Linux systems, preferably Debian based.

> [!TIP]
> ### 🚀 Getting Started
> Ready to deploy? Skip straight to our deployment guide:
> **[Read the Quick Start Guide →](https://github.com/8Protons/POWBlock/blob/main/docs/quickstart.md)**


**How it Works:**

You put it on your server, guard it with your firewall, and run it with the options you want like POW difficulty, solve time limits, etc.  Then you add a POWBlock Controller to your reverse proxy or webserver config so that it can be used.  The controller is just some config code that makes your proxy collect the client data that POWBlock needs, generate a hash that identifies that client, compare that hash to the client's cookie, and then pass the client and their data to POWBlock if the cookie is invalid.  POWBlock does the rest.  The controller is also where you can define your custom challenge logic, whitelists and blacklists, client trust factors, URL bypasses, rate limits and so forth that are all unique to your website.

![POWBlock Flowchart](https://github.com/8Protons/POWBlock/blob/main/docs/powblock_flow.png)

**F.A.Q:**

**Q:**  *"What proxies/servers does this work best with?":*

To be usable with POWBlock a proxy/server needs to be able to do four things:  Set and unset HTTP headers, read client cookie values, direct to different backends based on a string match, and perform some kind of deterministic hash or string obfuscation operation.  When you consider all the little plugins, mods, addons and hacks out there, this pretty much means "every server can use POWBlock, some just do it better/easier than others."  The more power and control logic your proxy/server gives you, the better because you can use this logic to make any custom rules that you might want for your website. **Varnish Cache** is ideal, but **Openresty** and **Haproxy+Lua** are very strong contenders as well.  **Pipy** is an excellent choice for a small stack and we plan to offer it as a bundle eventually.  **Nginx** works well when using the nginx-module-njs plugin available in most repos, and Apache can use it but has natural limitations in terms of connection capacity that make it less than ideal for a PoW gate.

**Q:**  *"What browsers does this work best with?":*

Pretty much any browser newer than ~2014.  The default 'powchallenge.html' included with the program was developed for wide compatibility by making sure that **Pale Moon**, **Tor Browser** (on defaults) and **Cromite** were fully supported in addition to the usual **Chrome/Firefox/Brave/Opera/Safari** browser package.  Additionally, if you're using something really strange, the POWBlock server has a **-loose** mode that relaxes compatibility even more, at the cost of a small degree of security.  

**Q:**  *"Proof-of-Work isn't even hard, why bother with this?":*

PoW isn't hard in concept but neither is sending an email or editing some text.  The devil is in the details - implementation, security, performance, modularity, separations of concerns and ease of use.  Using POWBlock takes all of the guesswork and "site-specific toy" aspects out of the PoW concept entirely.  Its a tiny, torture-tested, composable daemon that does all of the heavy lifting for you while still letting you own the stack.  Instead of writing/testing/debugging a hand-rolled PoW scheme in your stack's custom lang that takes resources from your backend, only works on your website, and breaks with every other update, you can use one tiny program that works anywhere without fuss and have it take the bullet for your backend if you come under attack.

**Q:**  *"Why not just throw Anubis/etc out front instead?":*

POWBlock is ~1/60th the size of Anubis, has ~7x higher performance on an 8-core benchmark machine, gives you full customization (including challenge logic, logos, challenge page text, etc) in the free version, composes with ordinary Linux admin tools that you already have, can use any kind of logic you can put in your existing server, handles thousands of requests per second with single-digit CPU use, resists nearly all typical anti-PoW bypass methods, and keeps you in complete control of your traffic.  POWBlock scales without a load balancer, is immune to mutex thrashing, works locally or remotely, with or without a CDN, solo or clustered, bare metal or containerized, and works with roundrobin DNS and even over Tor *all right out of the box, for free.*  Anubis and tools like it are low performance, monolithic blobs that have to middleman your whole stack and have way too many concerns to be performant or truly secure.  POWBlock does its one job as needed and otherwise stays out of your way.

**Q:**  *"Is this all just theory and hype or has this thing seen real use?"*

Our largest production server has used a POWBlock stack since early 2025.  Haproxy sits out front handling TLS termination and edge rate limiting, FOSS Varnish Cache sits behind Haproxy doing our caching/routing and running a POWBlock controller written in VCL.  A single POWBlock runs behind Varnish.  Three of these stacks are the forward nodes of a roundrobin DNS network serving a single origin that gets ~1.1 million visitors and over 1 billion requests per month.  POWBlock has stopped more than 99% of all automated spam and has successfully held off request-flood DDoS attacks as large as 250,000 RPS without needing to scale.  It has been targeted with tuned traffic, hack attacks, buffer overflows, ASIC PoW cracker bots, and worse.  And it lowered our bandwidth use by nearly 35% due to blocking so many scraper bots.  We're only doing a public release *because* it has proven itself so well and development will continue as any new issues are discovered.

**Q:**  *"Is this vibe coded slopware?"*

POWBlock was written by hand, using Xed, by a single programmer over a period of two and a half years.  A half-dozen other developers assisted with the early concept, bug testing, red-teaming, feature feedback, and browser UX/performance work.  Some AI was used since 2025 in the various "4am coredump analysis" sessions and general debugging work (and on making these github pages because easy markdowns), but POWBlock is 100% a human creation.

**Q:**  *"Then where's the source code?"*

POWBlock is shareware. *Good* shareware we hope, because we only gate the optional "enterprise-level" super-nerd stuff behind a paid license and give 100% of the main features for free.  But for that reason the source code is closed and private. That being said, we're not scared of code reviews. If you're a bona fide security researcher willing to sign an NDA and publicly vouch for what you find, we can let you look at it.

**Q:**  *"How do I buy a license or just contribute to the awesome free version?"*

Reach out to us and/or drop some crypto. A license key is a flat 50 US dollars. If you buy as an individual operator, the key is valid for your lifetime for as many copies as you want, any where you want, just as long as you are the sole owner/renter of the physical servers you deploy on. Corporate/government entities need 1 license key for each US State and/or non-US country they plan to deploy it in, but can do unlimited deployments in any such place that they have a license.

Send us an email containing the following:  

Coin type used (BTC/ETH/XMR)  
Transaction Number/ID  
Your official Email address  
The website URL you're deploying for  
Whether this is a Personal or Corporate License  
If Corporate, provide the US State/Foreign Country  

and we'll check it out and send your license key right to your Email.  

| Coin | Wallet Address |
| :--- | :--- |
| **Bitcoin** | `1P1k9QcTMJ2qC4rNzy27v6J93vpWQYWHuK` |
| **Ethereum** | `0x87f7Be68863d95BA62d6408DE95506714d3Df5b0` |
| **Monero** |  `48oy9aA1Uv6em1sSA3yyCE4PN9knPSY3pj4SzkMgqQVcY6zDPwLQmng2K8GQGNKeQJC3nsKesK2RSZKQjeE6DgbMRDKDTzz` |
