![cpage](https://github.com/8Protons/POWBlock/blob/main/docs/challengepage.png)

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
6. Check the client's `POW_TOKEN` cookie and compare to `X-PoW-Expected`.
7. If the token is missing or doesn't match then route to POWBlock.  
   If it matches then route to your main origin.

### Varnish VCL Example

```vcl
# =============================================
# POWBlock Controller - Varnish VCL (goes at the top of sub vcl_recv)
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

# Expected token = SHA256(client.ip + secret) using libvmod-digest
set req.http.X-PoW-Expected = digest.hash_sha256(req.http.X-Client-IP + req.http.X-PoW-Secret);

# Read POW_TOKEN cookie using import cookie from the Standard vmod
cookie.parse(req.http.Cookie);
set req.http.X-PoW-Token = cookie.get("POW_TOKEN");

# If no token or token doesn't match → send to POWBlock
if (!req.http.X-PoW-Token || req.http.X-PoW-Token != req.http.X-PoW-Expected) {
    set req.backend_hint = powblock;   # Don't forget to set up the backend in default.vcl!
    set req.http.X-Original-URL = req.url;   # Where to redirect after success
    return (pass);   # Never cache POWBlock requests
}

# Valid token → clean up headers and proceed to origin
unset req.http.X-PoW-Secret;
unset req.http.X-PoW-Expected;
unset req.http.X-PoW-Token;
unset req.http.X-Client-IP;
```

## Part 3: The POWBlock Service

**Looking for advice on Windows or BSD versions?** [Click here!](https://github.com/8Protons/POWBlock/blob/main/docs/windows-bsd-ardjet.md)

POWBlock has an old-school design. You set its parameters at startup time using run flags. While we prefer to use `systemd` for easy scaling, you can run it with any init system you want.

### Installation & User Setup
The binary can run from anywhere, though we prefer `/usr/local/sbin/`. It does not require its own user or root access unless you want to run it on restricted ports. 

We recommend creating a minimal user just to handle the process:

```bash
sudo useradd -r -M -s /sbin/nologin powblock
sudo runuser
passwd powblock # Give it a long random password
```

### Challenge Page Requirement
The challenge page `powchallenge.html` should be kept in the same directory as the binary or else symlinked there. 

* **Systemd Note:** If you run the binary on defaults from a location other than `/usr/local/sbin/`, ensure you edit the `WorkingDirectory=/usr/local/sbin/` line in the default systemd template accordingly. Otherwise, launching the program will fail because it cannot find the HTML page.
* **Alternative:** You can simply run it with the `-cpage` argument and specify the absolute file path.

---

### Quick Start Template
Need a quick start and less reading? Save this easy, sane systemd template as `/etc/systemd/system/powblock@.service` and run it with `systemctl start powblock@1`:

```ini
[Unit]
Description=POWBlock (instance %i)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/powblock1811J-static -port 9001 -diff 17 -ctime 80 -loose
WorkingDirectory=/usr/local/sbin/
Restart=always
RestartSec=5
User=powblock
KillMode=process
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

If you want to go custom, read on below.

---
![startup](https://github.com/8Protons/POWBlock/blob/main/docs/startbanner.png)
### Basic Run Commands

#### Run Standalone with Defaults
This uses a POW difficulty of 20, listens on port 9001, sets a 13-hour token cookie expiry, 420s challenge time, requires no auth, uses SHA256 POW hash, and loads `powchallenge.html` from the working directory:
```bash
./powblock1811J-static
```

#### Run with Flags
Missing flags will automatically revert to default settings. Flag order does not matter:
```bash
./powblock1811J-static -port [port] -diff [difficulty] -ctime [ctime] -auth [authkey] -hash [hashvalue] -cpage [/path/to/yourchallenge.html] -debug -loose -silent -license [key] -help
```

**Example Custom Execution:**
```bash
./powblock1811J-static -port 9001 -diff 20 -ctime 420 -auth foobar123 -hash 512 -cpage /usr/local/sbin/foobar.html -randfast 1100-1600 -loose -solvelogs -inject "server A instance 3" -dump /home/user/powblock.log -license 123456789
```

**Get Help:**
```bash
./powblock1811J-static -h
# OR
./powblock1811J-static --h
# OR
./powblock1811J-static -help
# OR
./powblock1811J-static --help
```

---

### Run Flags Reference
| Flag | Description |
| :--- | :--- |
| `-help` / `--help` / `-h` / `--h` | Displays a compact manual summarizing key points from the documentation. |
| `-port` | The local port you want POWBlock to run on. **Default: `9001`** |
| `-diff` | The number of leading 0 bits required for a proof of work to validate. 17 is low, 22 is very hard, min/max is 12/32. **Default: `20`** |
| `-ctime` | The time in seconds that client connections can last and how much time each client gets to solve the proof of work. **Default: `420`** |
| `-auth` | Your secret string that powblock checks to make sure traffic is coming from an authorized proxy. Proxy must send this key via the `X-PoW-ClientAuth` header per request. 8 chars minimum. *(Licensed POWBlock only)* |
| `-hash` | Specify `256` or `512` to select SHA256 or SHA512 proof of work. **Default: `256`** |
| `-cpage` | Takes an absolute path to a challenge page html file. **Default: looks for `powchallenge.html` in the active working directory** |
| `-maxconns` | Max simultaneous global connections. **Default: `8192`** |
| `-rlimit` | General request rate-limit count. **Default: `100`** |
| `-rwindow` | General request rate-limit window in seconds. **Default: `120`** |
| `-slimit` | Submission rate-limit count. **Default: `12`** |
| `-swindow` | Submission rate-limit window in seconds. **Default: `300`** |
| `-maxcli` | Max concurrent connections per client IP. **Default: `20`** |
| `-tsize` | Tiny-read threshold in bytes. **Default: `17`** |
| `-tmax` | Max consecutive tiny reads before drop. **Default: `60`** |
| `-log` | Minimum delay in seconds (0-5) between attack log prints. **Default: `2`** |
| `-debug` | Enables very verbose debug logging to the console/syslog. |
| `-fast` | Rejects clients that solve faster than `[milliseconds]` and logs a DROP. **Default: off** |
| `-loose` | Disables base64 format validation in the sanity checker and ignores the last IP octet when validating the IP bind between challenge and submission. *(Convenient for oddball browsers, private VPNs, TOR, etc.)* |
| `-silent` | Disables all client-side error messages (429, 400, etc.) and forces silent drops on errors. |
| `-secure` | Sets the Secure flag on the POW_TOKEN and POW_ID cookies. **Default: off** |
| `-proxyv1` | Enables parsing of PROXY v1 protocol data to populate peer_ip when operating behind TLS. **Default: off** |
| `-dump` | Takes an absolute path to your dedicated POWBlock log file. **Default: off + logs to syslog/journal** |
| `-mslog` | Millisecond log throttle used for -solvelogs. **Default: 500** |
| `-useprints` | Safely parses the X-PoW-Print control header, allowing POWBlock to log proxy-supplied client UA/fingerprints up to 500 chars long. **Default: off + header ignored** |
| `-inject` | Takes a "quoted" text string up to 128 chars and safely adds that string to the cpage footer, 400 client errors, and select logs. **Default: off** |
| `-randfast` | Takes a range in milliseconds, e.g. 1100-1550, and sets a random max solve speed from the range on each submission. **Default: off** |
| `-solvelogs` | Logs the IP, proxy, URL, inject, print, difficulty, and solve time of every client. **Default: off** |
| `-license` | Accepts a valid 16-digit POWBlock license key that enables optional control headers. |
---

## Part 4: Licensed versus Free

POWBlock is shareware. The **free version** gives you everything you need to protect your website against scrapers, bots, spam, and some DDoS attacks. 

Buying a **license** gives an advanced user a lot more power and granularity:
* **Override Headers:** Unlocks a suite of headers passed from your proxy to fine-tune POWBlock on-the-fly (e.g., give clients on phones easier PoW than clients on PC).
* **Network Scaling:** Run 20 POWBlocks on a big server to service your entire network using the `X-PoW-ClientAuth` header to secure all the proxy connections.
* **Subdomains and Cross-domain Cookies:** You can enable POWBlock tokens to work across complex websites that load assets from subdomains, or use a single POWBlock server to handle PoW gate duty for multiple websites at once. These require the X-PoW-HostDomain override header.

A license makes nearly all of POWBlock's settings customizable from client to client, or even from request to request. You are not gimped without them, but the overrides are a great quality-of-life upgrade for a small "lifetime, unlimited copies" shareware fee. 

To read more, check out the details in the big technical readme.

## Part 5: Statistics & Monitoring

POWBlock features a useful statistics readout that displays real-time performance data and historical counts tracked since system startup.

### Monitored Metrics

#### System & Performance
* **Uptime:** Seconds since startup (`uptime_seconds`).
* **Current Active Connections:** Connections open right now (`active_connections`).
* **Total Requests Processed:** Requests that entered the handler (`total_requests`). Health checks are not counted. Stats scrapes are.
* **Average Requests Per Second:** `total_requests` divided by uptime (`avg_requests_per_second`). This is the lifetime figure and it stays last in the output. It is not the same number as the windows below.

#### Recent rate
Challenges are pages actually issued. Submissions are any request line containing `powblock=`, including rejects. If the process is younger than the window, the rate is divided by uptime instead of by 60 or 300, so a fresh start does not look idle.
* **Challenge RPS, last 60 seconds** (`challenge_rps_60s`).
* **Challenge RPS, last 5 minutes** (`challenge_rps_5m`).
* **Submission RPS, last 60 seconds** (`submission_rps_60s`).
* **Submission RPS, last 5 minutes** (`submission_rps_5m`).
* **Peak Challenge RPS:** Busiest single second of challenges since startup (`peak_challenge_rps`).
* **Peak Submission RPS:** Busiest single second of submission attempts since startup (`peak_submission_rps`).

#### Proof of Work (PoW) Details
* **Valid POW Tokens Issued:** Successful solves (`tokens_issued`).
* **Average POW Solve Time:** Mean solve time in milliseconds across those tokens (`avg_solve_time_ms`).
* **Failed Challenges:** Answers under the required difficulty, plus solves rejected by `-ctime`, `-fast` or `-randfast` (`challenge_failed`). Malformed/insane submissions are dropped and logged, but they are not added to this counter.

#### Network Mitigation & Drops
* **Client IP Hash Table:** Occupied slots out of the fixed table (`rate_table_occupied`). 524288 slots on the Linux build.
* **Rate Limit Hits:** General per-IP request limit (`rate_limit_hits`).
* **Submission Limit Hits:** Per-IP cap on PoW answers (`submission_limit_hits`).
* **IP Mismatches:** Solved token was issued to a different IP than the one submitting it (`ip_mismatch`).
* **Invalid HMAC Fails:** Signature check failed. Forged or corrupted tokens only (`hmac_invalid`).
* **Slowloris Drops:** Header phase went quiet longer than the header timeout, 30 seconds on the Linux build (`slowloris_drops`).
* **Timeout Drops:** Connection still open after `ctime` (`lifetime_timeout_drops`). Slowloris only covers clients that never finished sending headers.
* **Trickle Drops:** Too many sequential tiny reads (`trickle_drops`).
* **Max Connection Drops:** One IP tried to open more simultaneous challenges than `-maxcli` (default 20) (`per_ip_conn_drops`).

---
![stats](https://github.com/8Protons/POWBlock/blob/main/docs/statspage.png)

### Accessing the Readout

You can retrieve these statistics by making a local request to the `/POWBlockStats` endpoint using `curl`.  Text stats are `GET /POWBlockStats`. The same fields are returned as JSON with `GET /POWBlockStats?format=json`.


#### Basic Local Request
```bash
curl localhost:9001/POWBlockStats
```

#### Request with Authentication
If you have configured authentication keys, include them via the custom request header:
```bash
curl -H "X-PoW-ClientAuth:fooauthkeybar123" localhost:9001/POWBlockStats
```

#### Live Monitoring
You can turn this output into a live, auto-refreshing feed using the Linux `watch` command (e.g., updating every 5 seconds):
```bash
watch -n 5 'curl localhost:9001/POWBlockStats'
```

> [!NOTE]
> **Multi-Instance Environments:** Executing this command on a host running multiple POWBlock instances will poll a single instance at random due to kernel load-balancing. To estimate overall cluster performance, multiply the visible stats by the total number of running POWBlock instances.

---

### Important Security Consideration

The `/POWBlockStats` page is technically accessible from the public web unless you block the path at your proxy layer. 

Because incoming clients requiring a challenge are routed to the POWBlock port by the proxy, an external user sending a request with an `X-Original-URL` header set to `/POWBlockStats` will bypass the challenge page and see your system metrics. This was left in the code because it can be a handy quirk for the admin during setup, but be aware of it and block the URL once you no longer need it.

### Health Checks

POWBlock since v1.8.11 has a simple health check endpoint at `/POWBlockHealth` that can be accessed by your proxy, load balancer or network administration dashboard.  When accessed it returns a plain `200 ok` HTTP response if POWBlock is operating normally.  Like the stats page, the health page is exposed to the public web by default, so secure it with your proxy.


## Part 6: Security & Configuration Basics

### 1. Firewall Isolation

Configure your firewall to ensure that POWBlock is isolated and can only be reached by your reverse proxies. 

If you are running POWBlock on a local machine using UFW (Uncomplicated Firewall), you can lock down access with the following commands:

```bash
# Allow administrative access
sudo ufw allow ssh

# Set default incoming policy to drop traffic
sudo ufw default deny incoming

# Restrict POWBlock port access exclusively to localhost
sudo ufw allow from 127.0.0.1 to any port 9001 proto tcp

# Enable the firewall configuration
sudo ufw enable
```

> [!TIP]
> If this is your first time setting up the host firewall, remember to explicitly open the ports for your external services (such as port `443` for your public-facing reverse proxy or web application):
> ```bash
> sudo ufw allow 443/tcp
> ```

---

### 2. Secret Key Rotation

Regularly rotate your `X-PoW-Secret` key as part of your standard infrastructure maintenance. It is highly recommended to force an immediate rotation of this key if you detect or suspect that your system is actively under a targeted attack.

---

### 3. IP Normalization

We strongly suggest using your reverse proxy layer to normalize and flatten the incoming client IP addresses before passing them to POWBlock via the `X-Client-IP` header. 

Cleaning up addresses at the proxy prevents processing errors caused by:
* Multiple proxy layers stacking up addresses inside `X-Forwarded-For` headers.
* Mixed or concatenated IPv4/IPv6 strings sent by certain downstream ISPs.

While POWBlock contains internal logic to handle malformed IP addresses gracefully, sanitizing and flattening the data at your perimeter proxy ensures predictable and consistent rate-limiting behavior.

## Part 7: Integrating Fail2ban for Automated Jailing

It can be very advantageous to incorporate Fail2ban into your POWBlock stack. By analyzing system logs, Fail2ban can place timed firewall bans on hostile IPs that repeatedly trigger connection drops or fail challenges.

### 1. Create the Custom Filter
Create a filter file to define the regular expression that matches POWBlock drop events. 

Save this file as `/etc/fail2ban/filter.d/powblock.conf`:

```ini
[Definition]
# Catches all drop types (rate-limits, max connections, trickle, slowloris, etc.)
failregex = ^.*?\[POWBLOCK\] DROP .*? from <HOST>$

ignoreregex =
```

---

### 2. Configure the Jail
Create a jail configuration to define the ban criteria, log source, and firewall actions. 

Save this file as `/etc/fail2ban/jail.d/powblock.local`:

```ini
[powblock]
enabled   = true
port      = http,https
filter    = powblock
backend   = systemd

# Automatically matches any systemd instance (powblock@1, powblock@2, etc.)
journalmatch = _SYSTEMD_UNIT=powblock@*.service

# Ban policy
maxretry  = 8
findtime  = 3600
bantime   = 7200
ignoreip  = 127.0.0.1/8 ::1
action    = %(action_)s
```

> [!NOTE]
> **Running inside Systemd Nspawn Containers:** If POWBlock runs inside a container but Fail2ban runs on the host server, you must isolate the container's log stream using its machine ID. 
> 1. Run this command on the host to find the container's ID:
>    ```bash
>    sudo journalctl -M CONTAINERNAME -u 'powblock@*.service' -n 5 -o json-pretty
>    ```
> 2. Replace the `journalmatch` line in your jail configuration with the resulting `_MACHINE_ID`:
>    ```ini
>    journalmatch = _MACHINE_ID=016c82e452b12902a713b39c83985654 + _SYSTEMD_UNIT=powblock@*.service
>    ```

---

### 3. Monitoring Bans

Once configured and restarted, you can check the status of your active IP bans directly from the host terminal:

```bash
sudo fail2ban-client status powblock
```

