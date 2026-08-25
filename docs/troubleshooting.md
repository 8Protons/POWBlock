# POWBlock Troubleshooting

Common failure modes, symptoms, and fixes when integrating or operating POWBlock.

This document expands on the Troubleshooting section of the Technical README.

---

## POWBlock doesn't appear at all

**Symptoms**
- Challenge page never loads
- Proxy returns backend errors / 502 / 503
- Browser hangs connecting to the site

**Check**
1. Is the POWBlock process running?
2. Is it bound to the expected port? (`ss -lptn | grep <port>` or equivalent)
3. Can the reverse proxy reach that port? (firewall / UFW / iptables / security groups)
4. If using `-auth`, is the proxy sending a matching `X-PoW-ClientAuth` header?
5. Did bind fail because the port is privileged (<1024) and the process is not root?
6. If POWBlock failed silently, the port might be in use by another program.

**Notes**
- Restricted ports require root or capabilities; prefer a high port (default 9001).
- If the port and firewall look correct, the proxy is probably not routing traffic to the POWBlock backend. Inspect backend definition and controller logic.

---

## Challenge page loads but spins forever / never completes

Several distinct causes share this symptom.

### 1. Browser looks like a bot
Privacy extensions, Brave shields, or strict anti-fingerprint settings can trigger the headless / bot checks in the default challenge page. The page issues the challenge, then effectively abandons the solve.

**Fix:** Disable shields/plugins for the site and retry. Test in a clean browser profile.

### 2. Missing or bad `X-Original-URL`
POWBlock needs this header to build the post-solve 302. If it is absent or malformed, the client can loop on the challenge page.

**Fix:** Ensure the controller always sets `X-Original-URL` to the original request URL before sending the client to POWBlock.

### 3. Difficulty too high or device too slow
There is a hard time limit (`-ctime`, default 420s). If the client cannot finish before that, the attempt dies.

**Fix:** Lower `-diff` and/or raise `-ctime`. Test on a slow phone if that is a target audience. Some real-world known-good diff/ctime values are 15/45, 16/60, 18/180.

### 4. Submission mangled by the browser or middlebox
Some clients percent-encode parts of `pbchal`, alter query order, or inject extra bytes. The sanity checker then rejects the answer.

**Fix:** Test another browser. For diagnosis, try `-loose` (relaxes base64 and last-octet IP checks). Do not leave `-loose` on in production without understanding the trade-off.

### 5. Client IP changed between challenge and submit
PoW challenges are IP-bound between issuance and submission. Carrier-grade NAT, mobile handoffs, or some VPNs can change the visible IP mid-solve → `ip_mismatch` drop.

**Fix:** Try `-loose` for diagnosis (ignores the last IP octet changing) and consult your VPN rules and privacy software, or consult your network administrator. Most often this is a rare occurrence of bad luck, as most IPs are stable enough for the duration of the challenge window. Trying again by refreshing will very likely go through.

### 6. Not on HTTPS
The default challenge page uses `crypto.subtle.digest`, which browsers only expose in secure contexts.

**Fix:** Terminate TLS at the proxy. Plain HTTP will not work with the stock challenge page.

---

## Users get challenged too often

POWBlock does **not** decide when a challenge is required. The proxy does, by comparing the client’s `POW_TOKEN` cookie to `X-PoW-Expected`.

**Typical causes**
- Token bound to client IP, and the user’s IP changes often (mobile carriers, some CGNATs)
- Proxy recomputes `X-PoW-Expected` differently on later requests (secret mismatch, different IP source, clock/bucket logic if used)
- Cookie not being stored or sent back (SameSite / Secure / Domain / path issues)
- Cookie domain wrong when using `X-PoW-HostDomain`

**Fingerprint alternative**
Instead of hashing IP + secret, hash a device/TLS fingerprint + secret. JA3N / JA4-style prints are common choices.

**HTTP/3 caveat**
With HTTP/3 enabled, TLS fingerprints can be non-deterministic (HTTP/2 vs HTTP/3 path). If fingerprints flap, lock the edge to HTTP/2 (ALPN) or HTTP/1.1 for consistency.

---

## `X-PoW-HostDomain` does not scope cookies correctly

POWBlock validates the domain per RFC 2965-style rules and expects a **leading dot**:

| Value | Result |
|-------|--------|
| `.example.com` | Valid — site + subdomains |
| `.subdomain.example.com` | Valid — that subdomain only |
| `example.com` | Invalid |
| `subdomain.example.com` | Invalid |

POWBlock must be a **transparent backend**; the browser should only ever talk to your site’s domain.

---

## Chrome gets the cookie but does not follow the 302

Known browser quirk: some Chrome versions accept `Set-Cookie` on a 302 but fail to navigate.

The stock challenge page includes a delayed JS fallback redirect (~7s) so the client still moves after the cookie is stored. The delay is long enough for Tor and high-latency links so the fallback does not race ahead of the real 302.

If you customize the challenge page, keep an equivalent fallback.

---

## Stats endpoint surprises

`GET /POWBlockStats` is reachable through the same path clients use for challenges if `X-Original-URL` is `/POWBlockStats`.

**Recommendation:** Block or restrict `/POWBlockStats` in the proxy. It is intended for local/admin use (`curl` from the host, optionally with `X-PoW-ClientAuth`).

Polling walks the rate table and is relatively expensive; do not hit it at high frequency under load.

---

## Rate limits and drops you might see in logs

| Log / counter | Meaning |
|---------------|---------|
| Rate limit hits | Per-IP general request limit exceeded |
| Submission limit hits | Per-IP PoW answer rate exceeded |
| IP mismatch | Submit IP ≠ challenge IP |
| HMAC invalid | Bad/expired/forged challenge token |
| Slowloris drops | No complete headers within timeout |
| Lifetime timeout | Connection exceeded `-ctime` |
| Trickle drops | Too many tiny reads (slow drip) |
| Per-IP conn drops | Too many concurrent conns from one IP |
| Bogey / fast mover | Solved faster than `-fast` allows |

Tune with: `-rlimit`, `-rwindow`, `-slimit`, `-swindow`, `-maxcli`, `-tsize`, `-tmax`, `-ctime`, `-fast`.

---

## Quick diagnostic checklist

1. Process up and listening on the expected port?
2. Firewall allows **only** the proxy to that port?
3. Controller strips all `X-PoW-*` / `X-Client-IP` headers from clients before setting them?
4. Required headers present on challenge traffic: `X-Client-IP`, `X-PoW-Secret`, `X-PoW-Expected`, `X-Original-URL`?
5. Site is HTTPS end-to-end from the browser’s point of view?
6. Cookie actually set and returned? (devtools → Application / Storage)
7. Test with `-debug` on a **quiet** instance (debug logging is expensive).
8. Compare behaviour with `-loose` only as a temporary diagnosis.

---

## Default limits (1.8.x “Jehuty”)

| Limit | Default |
|-------|---------|
| Max concurrent connections | 8192 |
| Max connections per IP | 20 |
| General rate limit | 100 / 120s per IP |
| Submission rate limit | 12 / 300s per IP |
| Header / slowloris timeout | 30s |
| Connection lifetime (`-ctime`) | 420s |
| Active connection sweep | every 20s |
| Trickle protection | drop after 60 reads ≤ 17 bytes |

Many of these are tunable via startup flags in 1.8.7+.

---

## Still stuck?

- Run a single instance with `-debug` and reproduce with one client.
- Confirm the proxy is sending the headers you think it is (temporary log or debug backend).
- Check Fail2ban / journal for repeated DROP lines for the test IP.
- Verify the challenge page was not customized in a way that breaks token submission or the fallback redirect.
