# POWBlock for Windows and BSD
**(The "Ardjet" Series Releases)**

Starting with the 1.8.10 release, we began keeping the Linux EPOLL master as the **Jehuty** series, and we started shipping separate portability builds under the **Ardjet** codename. 

Ardjet shares the exact same POWBlock logic and header-driven contract, but it is rebuilt so operators can run it on Windows and BSD without us having to maintain four radically different codebases by hand.

---

## 🔌 POLL on the Ports

Linux POWBlock uses `EPOLL` because it is the fastest and most natural fit for the single-threaded client loop used since version 1.2. 
* **The Reference Standard:** The `EPOLL` engine is the master reference build where new features and bugfixes go first. 
* **Performance:** It supports incredibly high speed and concurrency, giving Linux POWBlock the ability to punch far above its weight under heavy client and attack loads.

Windows and the BSD family operating systems do not natively provide `EPOLL` (offering `WEPOLL` and `KQUEUE` instead). To avoid massive, high-maintenance code rewrites, the **Ardjet ports switch the POWBlock event path to `POLL`**.

### Why POLL?
* **Least Common Denominator:** `POLL` serves as a universal async connection syscall across every target OS.
* **Workload-Appropriate:** While less performant under extreme concurrency, POWBlock's connection loop is based on the HTTP/1.0 spec (even though it speaks HTTP/1.1). Clients connect, process, receive a response, and disconnect within milliseconds.
* **Real-World Ready:** Under actual workloads, `POLL` is more than sufficient to run POWBlock even under moderate attack while keeping the ports easy to develop.

> 💡 **Rule of Thumb:** If you are on Linux, run **Jehuty**. If you are on BSD or Windows, run **Ardjet**.

---

## 🚀 Cosmo C and APE

Ardjet builds are produced using **Cosmopolitan Libc** and the **APE (Actually Portable Executable)** binary format designed by Justine Tunney. 

This compiler system envelops specially formatted C code in a compatibility wrapper with a built-in syscall translation and polyfill layer:
* **OS Portability:** To Linux or BSD, an APE looks and runs like a native binary. To Windows 7 (64-bit and newer), it executes exactly like an `.exe` file.
* **Architecture Agnostic:** APEs configured for the same OS are portable between **AMD64** and **ARM64** architectures.
* **Ultra-Lightweight:** The wrapper is incredibly tiny. The raw code loses barely any resources regardless of the host system.

### Core Architecture Highlights
* Same challenge page rules, same control headers, and same cookie contract.
* Same fixed buffers, rate tables, submission checks, security, and accounting.
* **Zero Dependencies:** No OpenSSL or large runtimes required, keeping with the core POWBlock design philosophy.
* Not theorycraft - Ardjet was production tested under our full network load prior to public release.

---

## 📊 Jehuty (Linux) vs. Ardjet (Windows / BSD)

| Feature | Jehuty (Linux) | Ardjet (Windows / BSD) |
| :--- | :--- | :--- |
| **Event Loop** | `EPOLL` with `ONESHOT` rearming | `POLL`-based loop with `ONESHOT` emulation |
| **Typical Artifact** | Static Linux ELF | APE configured as a port-specific binary |
| **Max Connections** | Unlimited / High | **BSD:** Capped at `1000`<br>**Windows:** Capped at `63` |
| **Limiter Hash Table** | Full Size | **BSD:** Half-sized (`262144` slots) for NetBSD |

### Ardjet-Specific Defaults & Optimizations
* **Windows Connection Constraints:** `MAXCONNS` is capped at 63 due to Windows kernel socket limitations (1 FD tracking 63 clients = the kernel's cap of 64).
* **BSD Connection Constraints:** `MAXCONNS` is capped at 1000 to accommodate `POLL` and default BSD file descriptor limits.
* **FreeBSD Scaling:** Uses OS detection to enable kernel load-balanced sockets (`SO_REUSEPORT_LB`) for Linux-style linear scaling (FreeBSD 12+ only).
* **Idle Mitigation:** The Windows build forces a `sleep(1)` when the socket is idle to prevent bugs in `WSAPOLL` from spinning the CPU.
* **Tightened Slowloris Protection:** Features faster timeouts/sweeps (15s) and tighter trickle detection to protect against attackers exploiting lower connection caps.
* **Failguards:** Features additional error logging and client side errors (`HTTP 503`) to warn if the system is nearing overload capacity.
* **Dual-Stack Listen:** Dual-stack is enabled (`AF_INET6 + IPV6_V6ONLY=0`) so IPv4 works out of the box on BSD defaults.

---

## 🛠️ Configuration & Service Management

### Paths and `-cpage`
On Windows, pass an explicit `-cpage` path if Windows Defender complains about access permissions. Remember to configure the **"Start in:"** directory if launching via Task Scheduler.

### Signals & Process Supervisors
* **Windows:** Typically run as a console process or wrapped inside an OS service wrapper. 
* **BSD:** Integrates seamlessly into `rc` or your preferred supervisor system.
* **Logs:** `Fail2ban` style `DROP` log lines remain on `stderr` where the host OS supports it.

### The `--assimilate` Flag
Your service manager (Task Scheduler, rc, etc.) will likely require a shell invocation in the execution command to start the program. To bypass this, you can execute the binary once with the `--assimilate` flag:

```bash
./powblock1810 --assimilate
```

⚠️ **Important Note:** This locks the binary specifically to your local OS and CPU type. It will **lose all portability benefits**, but it will run completely natively without needing shell workarounds. This may trip antivirus warnings on execution because the binary modifies its own code.

---

## 🔄 Core Matrix Comparison

### What Stays Identical
* Header controlled challenge and verification
* `POW_TOKEN` / `POW_ID` cookie contract
* All internal system and security logic
* Challenge page specifications
* Firewall and proxy trust model (**POWBlock must never be exposed publicly**)

### What Is Not Identical
* Event notification API (`EPOLL` vs `POLL`)
* Binary formatting and process initialization steps
* OS path conventions, defaults, and maximum concurrent connections
* Service management examples (e.g., `systemd` templates remain Linux-only)
* Logging pipelines (logging must be manually redirected, especially on Windows)

---

## 📖 Operational Guidance

* **Production Linux:** Use the **Jehuty** static binary with `EPOLL` via `systemd`. Firewall to localhost or your proxy only.
* **Windows or BSD:** Use the **Ardjet** build with `POLL`. Confirm your `-cpage` and listen ports, and keep POWBlock off the public network.
* **Performance Expectations:** Do not expect Ardjet to match every Linux benchmark. It provides the same security model and controller logic with solid, platform-appropriate performance.
* **Scaling on Windows:** Windows native port reuse is weak. To scale, you must run multiple POWBlock instances on **different ports** and put them behind a load balancer.
* **Scaling on BSD:** FreeBSD 12+ scales via `SO_REUSEPORT_LB` (ensure you tune your kernel's global `maxfiles` limit). Other BSDs must scale manually using a load balancer on different ports.

### Recommended Windows Logging Setup
To capture useful logs on Windows, explicitly redirect `stderr` to a file. Here is an example execution string tailored for **Windows Task Scheduler**:

```cmd
cmd.exe /c ""C:\Program Files\Powblock\powblock1810-WIN64.exe" -auth Fooauthkeybar123 -license 1234567 -debug > "C:\Program Files\Powblock\log.txt" 2>&1"
```

***

*A fun quirk of APE is that the Windows build is technically a true universal binary. Linux/BSD/Windows on AMD or ARM—just drop it down and run it in your console for a quick test drive!*
