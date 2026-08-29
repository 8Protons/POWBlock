--[[
POWBlock — basic HAProxy + Lua controller
=========================================
Same contract as the minimal Varnish / njs controllers:
  - Do not trust client-supplied X-PoW-* / X-Client-IP
  - Set X-Client-IP, X-PoW-Secret, X-PoW-Expected, X-Original-URL
  - Expected = sha256(client_ip .. secret) as lowercase hex (lua-sha2)
  - Compare to cookie POW_TOKEN
  - Invalid = backend powblock; valid = backend origin
  - Unsafe methods (POST/PUT/PATCH/DELETE) without valid token = 403

Requires:
  - HAProxy built with Lua
  - lua-sha2 (require "sha2") on the Lua path
    e.g. https://github.com/Egor-Skriptunoff/pure_lua_SHA  (sha2.lua)
    or a distro/luarocks package that provides require("sha2").sha256

---- Required HAProxy config (example) ----

global
    lua-load /etc/haproxy/powblock.lua
    # Optional: lua-prepend-path /usr/share/haproxy/?/?.lua

defaults
    mode http
    timeout connect 5s
    timeout client  60s
    timeout server  60s

frontend fe_https
    bind :443 ssl crt /path/to/cert.pem

    http-request lua.powblock_gate

    # Invalid token = POWBlock; valid = origin
    use_backend be_powblock if { var(txn.pow_ok) -m int eq 0 }
    default_backend be_origin

backend be_origin
    server origin 127.0.0.1:8080

backend be_powblock
    server powblock 127.0.0.1:9001

IMPORTANT:
  - Change SECRET below before production
  - Firewall POWBlock so only HAProxy can reach it
  - Challenge page needs HTTPS (crypto.subtle)
  - Place sha2.lua where require("sha2") resolves
]]

local sha2 = require("sha2")

-- === Your secret key (CHANGE THIS) ===
local SECRET =
  "xxxyyyzzz123123aaaaaaaaaaaaabbbbbbbbbbbbbbbbb0000000000000000"

local function hash_sha256(str)
  -- lua-sha2: returns lowercase hex string
  return sha2.sha256(str)
end

local function get_header(txn, name)
  local h = txn.http:req_get_headers()
  if not h then
    return nil
  end
  local v = h[name]
  if not v then
    return nil
  end
  if type(v) == "table" then
    return v[0] or v[1] or nil
  end
  return v
end

local function client_ip(txn)
  -- Basic: TCP peer (same idea as VCL client.ip).
  -- Behind a trusted CDN, only then use a CDN header.
  local ip = txn.f:src()
  if ip and ip ~= "" then
    return ip
  end
  return "0.0.0.0"
end

local function expected_token(txn)
  return hash_sha256(client_ip(txn) .. SECRET)
end

local function get_cookie(txn, name)
  local cookie = get_header(txn, "cookie")
  if not cookie or cookie == "" then
    return ""
  end
  for part in string.gmatch(cookie, "[^;]+") do
    part = part:match("^%s*(.-)%s*$") or part
    local k, v = part:match("^([^=]+)=(.*)$")
    if k == name then
      return v or ""
    end
  end
  return ""
end

local function token_valid(txn)
  local token = get_cookie(txn, "POW_TOKEN")
  if token == "" then
    return false
  end
  return token == expected_token(txn)
end

local function is_unsafe_method(txn)
  local m = txn.f:method()
  if not m then
    return false
  end
  m = string.upper(m)
  return m == "POST" or m == "PUT" or m == "PATCH" or m == "DELETE"
end

core.register_action("powblock_gate", { "http-req" }, function(txn)
  local ip = client_ip(txn)
  local exp = expected_token(txn)
  local ok = token_valid(txn)

  txn:set_var("txn.pow_ok", ok and 1 or 0)

  if not ok and is_unsafe_method(txn) then
    -- HAProxy version variance: if done() shape differs, use instead:
    --   http-request deny deny_status 403 if { var(txn.pow_ok) -m int eq 0 } { method POST }
    txn:done({ status = 403, reason = "Proof of Work required" })
    return
  end

  if not ok then
    local path = txn.sf:path() or "/"
    local query = txn.sf:query()
    local original = path
    if query and query ~= "" then
      original = path .. "?" .. query
    end

    txn.http:req_set_header("X-Client-IP", ip)
    txn.http:req_set_header("X-PoW-Secret", SECRET)
    txn.http:req_set_header("X-PoW-Expected", exp)
    txn.http:req_set_header("X-Original-URL", original)
  else
    txn.http:req_del_header("X-PoW-Secret")
    txn.http:req_del_header("X-PoW-Expected")
    txn.http:req_del_header("X-PoW-Token")
    txn.http:req_del_header("X-Client-IP")
    txn.http:req_set_header("X-Forwarded-For", ip)
  end
end)
