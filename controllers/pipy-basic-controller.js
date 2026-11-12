// POWBlock Controller - Pipy.js 1.0


// Pipy might not be compiled with OpenSSL so we do SHA manually for this basic example
function pureJsSha256(str) {
  function rotateRight(n, x) { return (x >>> n) | (x << (32 - n)); }
  var ch = function(x, y, z) { return (x & y) ^ (~x & z); };
  var maj = function(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); };
  var sigma0 = function(x) { return rotateRight(2, x) ^ rotateRight(13, x) ^ rotateRight(22, x); };
  var sigma1 = function(x) { return rotateRight(6, x) ^ rotateRight(11, x) ^ rotateRight(25, x); };
  var gamma0 = function(x) { return rotateRight(7, x) ^ rotateRight(18, x) ^ (x >>> 3); };
  var gamma1 = function(x) { return rotateRight(17, x) ^ rotateRight(19, x) ^ (x >>> 10); };

  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  
  var words = [];
  for (var i = 0; i < str.length; i++) {
    words[i >> 2] |= (str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  
  var bitLength = str.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  for (var i = 0; i < words.length; i += 16) {
    var w = new Array(64);
    for (var j = 0; j < 16; j++) w[j] = words[i + j] || 0;
    for (var j = 16; j < 64; j++) w[j] = (gamma1(w[j - 2]) + w[j - 7] + gamma0(w[j - 15]) + w[j - 16]) | 0;

    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (var j = 0; j < 64; j++) {
      var t1 = (h + sigma1(e) + ch(e, f, g) + k[j] + w[j]) | 0;
      var t2 = (sigma0(a) + maj(a, b, c)) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  var finalHash = [h0, h1, h2, h3, h4, h5, h6, h7];
  var hex = '';
  for (var i = 0; i < 8; i++) {
    var v = finalHash[i] >>> 0;
    var s = v.toString(16);
    hex += ('00000000' + s).slice(-8);
  }
  return hex;
}

// Request-isolated context state tracker
pipy({
  _egressTarget: '',
  _clientIP: '',
  _expectedToken: '',
  _secretKey: ''
})

.listen(8080, { transparent: true })

.demuxHTTP('request')

.pipeline('request')
  .handleMessageStart(
    function(msg) {
      (

        // 1. Grab the connecting client IP directly from the native inbound socket
        _clientIP = (__inbound && __inbound.remoteAddress) || '127.0.0.1',

        // SECRET KEY - rotate this occasionally
        _secretKey = 'TeStFOOBAR12345AAABBBCCCXXXYYYZZZ',

        // 2. Compute the  expected token value hash
        _expectedToken = pureJsSha256(_clientIP + _secretKey),

        // 3. Directly check TOKEN inside the Cookie header string
        (msg.head.headers['cookie'] || '').indexOf('POW_TOKEN=' + _expectedToken) !== -1 ? (
          // IF VALID MATCH: Route user to Origin website backend and pass XFF
          // We use 9010 for testing, set up your real origin here:
          msg.head.headers['x-forwarded-for'] = _clientIP,
          _egressTarget = '127.0.0.1:9010'
        ) : (
          // IF NO COOKIE / MISMATCH: Set routing headers and send to POWBlock
          // These should clobber any client-spoofed values
          msg.head.headers['x-client-ip'] = _clientIP,
          msg.head.headers['x-pow-secret'] = _secretKey,
          msg.head.headers['x-pow-expected'] = _expectedToken,
          msg.head.headers['x-original-url'] = msg.head.path || '/',
          _egressTarget = '127.0.0.1:9001'
        )
      )
    }
  )
  .muxHTTP(function() { return _egressTarget; }).to('egress-pool')

.pipeline('egress-pool')
  .connect(function() { return _egressTarget; })

