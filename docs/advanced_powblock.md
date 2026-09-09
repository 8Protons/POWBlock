# Advanced POWBlock
*Excerpted from the TECHNICAL_README*

---

**System and Security Considerations**

POWBlock blindly trusts the various X-* control headers because they are expected to be provided only by the trusted proxy.  The proxy's logic *MUST* include an early function that strips these headers away if the client tries to provide them (spoofing), or else the client will have complete control over the POWBlock process.  Most often this is as simple as adding a header unset or NULL line for each of the control headers near the top of your proxy's configuration file.  Please see your proxy's documentation, or if using Varnish you can examine the sample VCL controller in this document.

POWBlock was designed foremost for simplicity and reliability. Single-threaded EPOLL architecture means no locks, no threads to manage, no process state shared, no memory shared, and no mutex-wakeup thrashing which is the Achilles heel of most other PoW systems like Anubis.  The bottlenecks are purely CPU and network I/O and these are predictable.  The kernel handles our processing and connection queues for us, and designing the engine around SO_REUSEADDR/SO_REUSEPORT made linear scaling trivial.  

The overall operation cycle of [Accept-Process-Respond-Disconnect-Repeat] puts the onus on the client to complete the necessary connections, and thereby eliminates nearly all vulnerabilities related to keepalives, multiplexing, and smuggling.  Once the core of the program was established we squeezed as much speed and client capacity out of it as our skills would allow, often iterating under fire as our own websites were attacked.  POWBlock is so simple that it might be mistaken for a toy, but we remind the reader that few tools are more simple or more effective than a good quality sledgehammer.

POWBlock has two simple, adjustable rate limiters that allow 100 global requests/client/120s, and 12 PoW submissions/client/300s.  These default limits are fairly high to accommodate users on shared IP addresses and to permit browser prefetch activity, but an ideal client should only require 2 requests (challenge GET + 302) and 1 submission GET per token.  Its other internal protections are thoughtful design that prevents common exhaustion vectors and memory/input overflows, good sanitization of data and client requests, a "safety first" fail-closed-on-client-error policy, an optional auth key to prevent unauthorized outside access, throttled logging to prevent CPU spin from log spamming, and a simple header/connection timeout/trickle tracker with a timed sweep that makes it resistant to Slowloris attacks.  For everything else it relies on the reverse proxy and server firewall.  

It is critical that you isolate POWBlock from the open Internet, whether by IPTables or a simple firewall like UFW.  Clients must never be able to reach it directly, only via the reverse proxy.  Additionally using the proxy to rate limit clients both connecting to POWBlock (simple limit like 30requests/10 seconds to account for browser prefetching) and a much tighter limit on submissions (if url ~ ?powblock limit 2-4 per IP per minute) are solid security measures to prevent POWBlock from becoming a weak link in your website stack.

Each single-threaded POWBlock can handle 8192+ concurrent simultaneous connections, and past benchmarks on version 1.8.1 showed that it can process 9000+ requests per second depending on your hardware, bandwidth, proxy capacity, and the types of requests coming in.  

Submissions are the hot path as they invoke the URL checker/parser, the complex HMAC signature operator, and the encoding/decoding functions that use the most CPU.  Each POWBlock can process 2000+ valid submissions per second before pegging a typical CPU core at 100%.  A sanity checker tries to detect invalid submissions early and dumps hostile clients without invoking the hot path, while the variable solve times inherent to PoW client operations introduces a natural jitter that mitigates the thundering herd. 

While we haven't benchmarked the newer 1.8.x series releases in the same way, our production stack has used a single POWBlock in combination with Haproxy to tank DDoS attacks as large as 250,000 requests per second with a budget 4-core VPS.

POWBlock offers little defense against huge, volumetric DDoS attacks that rely on sapping your bandwidth to zero (pipe flood) to take you down, or those that are powerful and sudden enough to crash your proxy with pure traffic overload before POWBlock can come into play.  Only a proper CDN that can distribute the attack load over many network links is capable of absorbing these, so POWBlock doesn't replace the Cloudflares and Basedflares of the world in that respect.  

Smaller DDoS attacks (common request floods, LOIC barrages, small to medium botnets) get bottlenecked by a good POWBlock configuration.  Because all requests, regardless of URL or client IP, have to pass through the controller's challenge logic, if you put a rate limiter right before the backend handoff it become impossible for attackers to avoid it. You can also use the POW_TOKEN cookie as a powerful trust signal, and shed unauthenticated clients at the edge when your stack is under severe attack.

POWBlock is particularly good at stopping automated spam if your proxy is configured for it.  Use your proxy's logic to require a valid POW_TOKEN on all POST and PUT requests, and every python bot and script kiddie spamming blind posts at your API will be instantly blocked until they learn how to do proof-of-work.  Facilitating this was one of the reasons why POWBlock was designed to submit PoW solutions via GET with query params - a method normally considered archaic in 2024.

Because POWBlock is a primitive, it can be incorporated into a server stack in a massive variety of ways.  Functionally no two mature websites using it will likely have exactly the same software stacks, security checks, issuance logic, or validation logic.  This means that there is no standardized attack surface for hostile clients to research and tune against.  Every website running it presents a unique challenge to every attacker. Just remember that POWBlock is extremely powerful but relies on (you) being smart about how you use it.  There are no training wheels.

POWBlock is tiny and boring on purpose. It is a single-threaded EPOLL server with no dynamic memory growth after startup, no keepalive, no complex parsers, no upstream libraries or supply-chain dependencies, and fixed-size buffers that fit in a CPU core’s hot path. Every allocation is hard-capped, every input is length-checked and rejected early, and the only cryptographic operations are standard HMAC-256 and SHA-256/512 for a straightforward leading-zero proof-of-work. 

This all means that the attack surface is measured in a few thousand lines of straightforward C99+GNU rather than a web framework or a multi-threaded runtime. There is very little uncontrolled code that could ever hide a surprise. Our background goal was to create it in such a way that it would look perfectly normal sitting alongside netcat, telnet, or any of the thousand other boring-but-performant network primitives.

---

## Advanced POWBlock: Distributed Networks

If your website uses a number of frontends (for example, multiple reverse proxies on round-robin DNS all serving a single origin) POWBlock can accommodate this easily.  

Since POWBlock is completely stateless there is no concern with shared state across multiple frontend servers.  The only thing required is that each server uses an identical configuration for the POW issuance/validation logic and an identical X-PoW-Secret key.  Then it doesn't matter which server a client accesses - the tokens and validation will always be the same, and a client passing POWBlock on any connection is instantly recognized by all the other frontends. POWBlock uses the same shared secret for client hashing and the internal HMAC signature on every instance, and this shared secret is what makes scaling and network distribution trivial.

---

## Advanced POWBlock: Scaling

POWBlock is designed to scale linearly via systemd, using the @.service template.  By creating an @.service file in /etc/systemd/system (Debian) or its equivalent you can then activate and run multiple simultaneous instances of POWBlock on the same machine ("sudo systemctl start powblock@1 powblock@2" etc), using the same port and same config.  The Linux kernel will automatically distribute client load across these multiple instances.  

It is recommended to not run more than [server number of CPU cores] minus one.  So a 4 core machine does best with 1-3 POWBlocks, leaving at least one core as a failover for other software in case of heavy attack load.  Up to [cores] POWBlock instances can be ran on a large, dedicated server, but more than 25 begins to see diminishing returns due to kernel overhead.  A 16 core, 128GB Enterprise server with 15 POWBlocks should comfortably handle 150,000+ requests per second from scores of thousands of IPs, and clustering such servers via round-robin is also fully supported.

**Example systemd template name:** `powblock@.service`

```ini
[Unit]
Description=POWBlock (instance %i)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/powblock188J-static -port 9001 -diff 17 -ctime 80 -loose
WorkingDirectory=/usr/local/sbin/
Restart=always
RestartSec=5
User=powblock
KillMode=process
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

---

## Advanced POWBlock: Remote POW

POWBlock binds on all interfaces (0.0.0.0) and supports networking by default, making it accessible both internally to a local reverse proxy and also to remote proxies.  An advanced user may wish to run POWBlock on its own server, or to stack up instances on a single dedicated machine (a "powbox") to serve as a powerful network gate that all of their reverse proxies can dial into remotely.  

POWBlock does not require any configuration to do this - it is enabled by default, though it is critical that such users secure the POWBlock machine with a firewall that only accepts connections from the trusted reverse proxies.  In such cases the remote proxy auth key should be enabled and authorized proxies should be configured to submit the X-PoW-ClientAuth header containing the key with every request.  

POWBlock supports being ran behind a simple TLS proxy like Hitch or Haproxy, and when configured with certs this can secure traffic between the remote proxy and the powbox server via ordinary HTTPS (just set the HTTPS domain, instead of the IP address of the powbox, as your proxy backend and configure your proxy for TLS when using it, or use Stunnel if your proxy doesn't support backend TLS).  Remember that POWBlock *is a backend* and must be treated as such, with traffic being passed to it transparently.

**Example minimalist Stunnel config:**

```ini
[goingtopowblock]
client = yes
accept = 127.0.0.1:9002  ; local port your proxy connects to (plain HTTP)
connect = powblock.com:443    ; remote HTTPS endpoint
verify = 2               ; validate cert chain (2 = verify with CA)
CAfile = /etc/ssl/certs/ca-certificates.crt  ; system CA bundle (includes Let's Encrypt)
checkHost = powblock.com      ; verify hostname matches cert
```

---

## Advanced POWBlock:  Cloudflare and Other CDNs

POWBlock is completely ignorant of CDN logic because it is designed to run as a backend.  This means that your reverse proxy or server is *already connected to the CDN* and that TLS termination, origin certs, and caching/security settings are already in place where they belong.  POWBlock does not need to interact with any of that logic.  All that is required is to make sure that you are taking the client's canonical IP address from the CDN (e.g. from the CF-Connecting-IP header if using Cloudflare) and passing it along in POWBlock's X-Client-IP header.  

POWBlock's own anti-caching headers ensure that its responses should not be cached by a CDN, and POWBlock is also designed to stack neatly with typical CDN DDoS checks and bot guards, including other proof-of-work systems like Cloudflare Turnstile or Basedflare Bot Check.  Generally speaking, once you make sure the correct, normalized client IP is being passed to it, POWBlock will support almost any CDN transparently and without further adjustments.  Because such CDNs often rely on weak "heuristics" and reputational checks that don't issue hard challenges, they tend to allow a large number of stealthier bots right through to your website, and so we recommend running POWBlock in addition to using your CDN so you can clean up these leftover bots as well.

---

## Advanced POWBlock: TOR Onion POW

POWBlock is fully compatible with Tor traffic provided your hidden service and proxy are configured properly.  By adding the setting:

```
HiddenServiceExportCircuitID haproxy
```

to your torrc file, the Tor service will automatically generate a pseudo-IPV6 (dead:beef) containing an encoded string that uniquely identifies the specific Tor circuit of a connecting client, and transmits it to your onion via the haproxy-type PROXY V1 data.  The last 2 octets of this IP represent the specific Tor relays that the user is connecting through, and serves as a "pretty unique" identifier.  Its not perfect, but collisions where users are coming in on the exact same circuit are rare enough for this pseudo-IP to tell them apart in most cases.  Once Tor is configured, your proxy needs to sit between the TOR service and your hidden service webserver and must also be able to parse PROXY V1 data.  

Varnish can do this by running it with the PROXY arg, and doing so will automatically have it populate its client.ip data with the pseudo IP.  From there you can copy it into X-Client-IP and send it along to POWBlock just like an ordinary IPV6 address and it will serve the same purpose.  For other proxies please see their documentation but the logic remains the same.

Alternatively you can use your proxy to give a signed, unique session cookie to clients who connect, and then validate that cookie value and use it as your client data.  Something like timestamp|hash(timestamp+salt) can work well over Tor.
