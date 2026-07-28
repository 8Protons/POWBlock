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
