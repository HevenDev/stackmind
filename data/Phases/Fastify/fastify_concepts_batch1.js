const concepts = [
  {
    id: 1,
    title: "Fastify vs Express Philosophy",
    tag: "WHY FASTIFY EXISTS AND WHAT IT DOES DIFFERENTLY",
    color: "#1E3A5F",
    tldr: `Fastify is a schema-first, plugin-based Node.js web framework that achieves ~75,000 requests/second versus Express's ~15,000 by combining automatic JSON schema validation (AJV), optimized JSON serialization (fast-json-stringify), and a trie-based router. The core philosophy difference: Express is permissive and unopinionated (add validation yourself, serialize yourself), while Fastify enforces a schema contract upfront and rewards you with speed, type safety, and automatic documentation.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Why should I switch from Express? It works fine for my app."
  → Express works. But at scale: JSON.stringify on every response, no schema validation,
    middleware chain with no optimization = measurable latency per request.
  → Fastify's fast-json-stringify compiles a serializer from your response schema.
    At 10K req/s: this difference is hundreds of milliseconds of saved CPU per second.

"What does 'schema-first' actually mean in practice?"
  → In Express: you write a handler, then maybe add a validation library, maybe document it.
  → In Fastify: you define the JSON Schema for the route FIRST — what the request looks like,
    what the response looks like — then write the handler. The schema drives validation,
    serialization, and (with plugins like fastify-swagger) auto-generated OpenAPI docs.

"Why is Fastify ~5× faster than Express? They're both Node.js..."
  → Three reasons:
    1. Router: Fastify uses find-my-way (radix trie). Express uses path-to-regexp (linear scan).
       At 100 routes: find-my-way finds the route in O(log n), Express scans O(n).
    2. Serialization: Fastify compiles fast-json-stringify from your response schema.
       custom serializer = 2-3× faster than JSON.stringify on typical response shapes.
    3. Validation: AJV (JIT-compiled validators) runs before the handler — invalid requests
       rejected before any DB query. Express: you validate yourself (or not at all).

"Does switching to Fastify require rewriting everything?"
  → Express compatibility: many Express middlewares work via @fastify/express or
    middie (Express-style middleware adapter).
  → Gradual migration: run Express and Fastify in parallel, migrate routes one by one.
  → Mindset shift: schema-first requires upfront thinking about API contracts.
    This is a feature, not a burden. Forces better API design.

"Fastify has TypeScript support — what does that mean practically?"
  → Fastify's core is written in TypeScript. Generics flow through routes:
    fastify.get<{ Params: { id: string }; Reply: { user: User } }>('/users/:id', ...)
  → Type of request.params.id is inferred. Return type is checked.
  → Express: TypeScript support is bolted on (DefinitelyTyped) and loose.
    You can return anything from an Express handler — no compile-time check.
    `,
    analogy: `
THE RESTAURANT KITCHEN ANALOGY:
---------------------------------
EXPRESS = OPEN KITCHEN WITH NO PREP STATIONS:
  Every order that comes in gets handled by whoever is free.
  No one checked if the order was valid before it reached the kitchen.
  The chef receives: "I want a 'something'" — no specification.
  Chef has to figure out: is this a real dish? What format should the output be?
  Output: "whatever I have in the fridge" — could be anything.
  Speed: limited by the chef having to figure everything out at execution time.

FASTIFY = MICHELIN-STAR KITCHEN WITH PREP AND STANDARDS:
  BEFORE any cooking starts:
    - The menu (schema) is defined: every dish has exact ingredients + presentation.
    - When an order arrives: maître d' (AJV validator) checks if the order matches the menu.
      Invalid order → rejected at the door before reaching the kitchen.
    - Kitchen prep (fast-json-stringify): compiled ahead of time for every dish's presentation.
      Output format known in advance → plating is instant.
  
  Result:
    - No unknown orders reach the kitchen (validation at door).
    - No improvised plating (serialization pre-compiled).
    - No scanning the entire menu to find a dish (trie router).
    - Everything moves FAST because decisions are made upfront.

THE RADIX TRIE ROUTER = THE WELL-ORGANIZED FILING CABINET:
  Express router: list of routes checked in order.
    GET /users/:id → check route 1, no... route 2, no... route 47, yes! Handler found.
    At 100 routes: 47 comparisons on average. Slow under load.
  
  Fastify router (find-my-way): tree structure.
    GET /users/:id → follow path 'u' → 's' → 'e' → 'r' → 's' → ':id'. Done. 6 steps max.
    At 100 routes: same 6 steps. O(path length), not O(number of routes).

FAST-JSON-STRINGIFY = THE PRE-PRINTED FORM:
  JSON.stringify: "I have an object. Let me discover its shape at runtime. Iterate keys.
    Handle nested objects. Handle arrays. Build a string character by character."
    Like writing a form from scratch for every customer.
  
  fast-json-stringify: "I have a schema that says this response has exactly:
    { id: integer, name: string, amount: number, items: array<{sku:string,qty:number}> }
    Let me compile a function that outputs this exact structure at maximum speed."
    Like using a pre-printed form — just fill in the blanks.
    2-3× faster. More predictable. Strips unknown fields (security bonus).
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — FASTIFY INTERNALS:
---------------------------------------------

FIND-MY-WAY RADIX TRIE ROUTER:
  Fastify uses find-my-way under the hood. Routes stored in a radix trie.
  
  Trie construction for routes: GET /users, GET /users/:id, GET /users/:id/orders
        [root]
         └─ users
              ├─ (exact) → GET /users handler
              └─ :id
                   ├─ (exact) → GET /users/:id handler
                   └─ /orders → GET /users/:id/orders handler
  
  Lookup: "GET /users/42/orders"
    → Match 'users' (1 node)
    → Match ':id' captures '42' (1 node)
    → Match 'orders' (1 node)
    → Found. Total: 3 node traversals regardless of how many other routes exist.
  
  Static routes: even faster (no param capture needed).
  Wildcard routes: /* matches anything after prefix.
  Method constraint: HTTP method stored alongside route in trie.

AJV (ANOTHER JSON VALIDATOR):
  Fastify uses AJV 8 (latest) with JIT compilation.
  AJV compiles JSON Schema to optimized JavaScript functions:
    Schema: { type: 'object', properties: { age: { type: 'integer', minimum: 0 } }, required: ['age'] }
    Compiles to: function validate(data) { if (typeof data.age !== 'number') return false; ... }
    The generated function runs without interpreting the schema at validation time.
  
  Performance: AJV is 10-100× faster than alternatives (Joi, Yup) for the same schema.
  
  Coercion (important for querystring):
    Query params arrive as strings. ?page=1 → page = '1' (string).
    With coercion enabled (Fastify default for querystring): '1' → 1 (number).
    Schema: { querystring: { type: 'object', properties: { page: { type: 'integer' } } } }
    Fastify coerces '1' → 1 before the handler. Handler sees page as number, not string.
    Without coercion: must do parseInt(request.query.page) manually.

FAST-JSON-STRINGIFY:
  When a response schema is defined, Fastify compiles a serializer:
  
  Schema: { 200: { type: 'object', properties: { id: {type:'integer'}, name: {type:'string'} } } }
  Compiled: function serialize(obj) { return '{"id":' + obj.id + ',"name":"' + obj.name + '"}'; }
  (Simplified — actual implementation handles escaping, nesting, arrays properly)
  
  Benefits:
    1. Speed: 2-3× vs JSON.stringify for typical responses.
    2. Security: fields NOT in schema are STRIPPED. No accidental password/token leakage.
    3. Predictability: malformed objects get default values or are rejected.
  
  Critical: if you define no response schema, Fastify falls back to JSON.stringify.
    Define response schemas for your hot paths!

TYPESCRIPT GENERICS SYSTEM:
  Fastify route generic structure:
  RouteGenericInterface {
    Body?: unknown;           // request.body type
    Querystring?: unknown;    // request.query type
    Params?: unknown;         // request.params type
    Headers?: unknown;        // request.headers type
    Reply?: unknown;          // reply.send() type constraint
  }
  
  fastify.get<{
    Params: { id: string };
    Reply: { id: string; name: string; balance: number };
  }>('/users/:id', async (request, reply) => {
    const { id } = request.params; // TypeScript: string ✓
    reply.send({ id, name: 'Priya', balance: 5000 });
    // TypeScript checks: does { id, name, balance } match Reply type? ✓
  });

FASTIFY LIFECYCLE (OVERVIEW):
  1. Server startup: plugins registered, schemas compiled, routes added.
  2. Request arrives: TCP → Node http server → Fastify parser.
  3. onRequest hook: before anything else. Good for logging, rate limiting.
  4. Body parsing: JSON, form, multipart depending on Content-Type.
  5. Schema validation: AJV validates body/querystring/params/headers.
    If invalid: immediate 400 response. Handler never called.
  6. Handler executes: async function, returns value or calls reply.send().
  7. Schema serialization: fast-json-stringify applied to response.
  8. Response sent: TCP → client.
    `,
    code: `
// ===== FASTIFY VS EXPRESS PHILOSOPHY — EXAMPLES =====

// EXAMPLE 1: Express style vs Fastify style — same route, different philosophy

// EXPRESS style (no schema, manual everything):
// app.get('/users/:id', async (req, res) => {
//   const id = parseInt(req.params.id); // Manual parsing
//   if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' }); // Manual validation
//   const user = await db.findUser(id);
//   if (!user) return res.status(404).json({ error: 'Not found' });
//   // Manual: strip sensitive fields before sending
//   const { passwordHash, internalNotes, ...safeUser } = user;
//   res.json(safeUser); // JSON.stringify called at runtime — no optimization
// });

// FASTIFY style (schema-first, automatic everything):
// const fastify = require('fastify')({ logger: true });

const getUserSchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'integer' } }, // 'integer' → coerces '42' → 42 automatically
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' },
        balance: { type: 'number' }
        // passwordHash NOT in schema → automatically stripped from response (security!)
      }
    },
    404: {
      type: 'object',
      properties: { error: { type: 'string' } }
    }
  }
};

// fastify.get('/users/:id', { schema: getUserSchema }, async (request, reply) => {
//   const { id } = request.params; // Already an integer — schema coerced it
//   const user = await db.findUser(id);
//   if (!user) return reply.status(404).send({ error: 'User not found' });
//   return user; // fast-json-stringify applies — passwordHash stripped automatically
// });

// EXAMPLE 2: Fastify initialization with options

// const fastify = Fastify({
//   logger: {
//     level: 'info',
//     transport: process.env.NODE_ENV !== 'production'
//       ? { target: 'pino-pretty', options: { colorize: true } }
//       : undefined
//   },
//   ajv: {
//     customOptions: {
//       removeAdditional: true,  // Strip unknown fields from body too
//       useDefaults: true,       // Apply schema defaults to missing fields
//       coerceTypes: true,       // String → number for querystring
//       allErrors: true          // Report all validation errors, not just first
//     }
//   },
//   trustProxy: true,  // Behind nginx/load balancer: trust X-Forwarded-For
//   bodyLimit: 1048576 // Max body size: 1MB (default: 1MB)
// });

// EXAMPLE 3: TypeScript route with full type inference

// interface GetProductParams { id: string }
// interface GetProductQuery { include?: string }
// interface Product {
//   id: number; name: string; price: number; stock: number;
//   category: string; sellerId: number;
// }

// fastify.get<{
//   Params: GetProductParams;
//   Querystring: GetProductQuery;
//   Reply: Product | { error: string };
// }>(
//   '/products/:id',
//   {
//     schema: {
//       params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
//       querystring: {
//         type: 'object',
//         properties: { include: { type: 'string', enum: ['seller', 'reviews'] } }
//       }
//     }
//   },
//   async (request, reply) => {
//     const { id } = request.params;    // TypeScript: string ✓
//     const { include } = request.query; // TypeScript: string | undefined ✓
//     const product = await db.getProduct(parseInt(id));
//     if (!product) return reply.status(404).send({ error: 'Product not found' });
//     return product; // TypeScript checks this matches Product type
//   }
// );

// EXAMPLE 4: Performance-aware schema definition

// Define ALL response schemas — every defined schema = compiled serializer (fast!)
// No response schema = JSON.stringify (slow!)

const orderResponseSchema = {
  200: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      customerId: { type: 'integer' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'integer' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            unitPrice: { type: 'number' }
            // internalCost NOT in schema → stripped (competitive pricing protected!)
          }
        }
      },
      total: { type: 'number' },
      status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered'] }
    }
  }
};

// EXAMPLE 5: Shared schemas via addSchema — define once, reference everywhere

// fastify.addSchema({
//   \$id: 'Address',
//   type: 'object',
//   properties: {
//     street: { type: 'string' },
//     city: { type: 'string' },
//     state: { type: 'string' },
//     pincode: { type: 'string', pattern: '^[1-9][0-9]{5}\$' }
//   },
//   required: ['street', 'city', 'pincode']
// });

// fastify.addSchema({
//   \$id: 'UserProfile',
//   type: 'object',
//   properties: {
//     id: { type: 'integer' },
//     name: { type: 'string' },
//     email: { type: 'string', format: 'email' },
//     address: { \$ref: 'Address#' }  // Reference shared schema!
//   }
// });

// // Route uses the shared schema:
// fastify.post('/users', {
//   schema: {
//     body: { \$ref: 'UserProfile#' },    // Validates body against UserProfile
//     response: { 201: { \$ref: 'UserProfile#' } }
//   }
// }, async (request, reply) => {
//   const user = await db.createUser(request.body);
//   reply.status(201).send(user);
// });

// EXAMPLE 6: Express middleware migration to Fastify

// Express CORS middleware:
// app.use(cors({ origin: 'https://myapp.com' }));

// Fastify equivalent:
// fastify.register(require('@fastify/cors'), {
//   origin: 'https://myapp.com',
//   methods: ['GET', 'POST', 'PUT', 'DELETE']
// });

// Express rate limiting:
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Fastify equivalent:
// fastify.register(require('@fastify/rate-limit'), {
//   max: 100,
//   timeWindow: '15 minutes'
// });

// EXAMPLE 7: Benchmarking the difference — observing fast-json-stringify effect

// Without response schema (JSON.stringify path):
// fastify.get('/slow', async () => {
//   return { id: 1, name: 'Priya', passwordHash: 'secret', amount: 5000.50 };
//   // JSON.stringify called at runtime. passwordHash included in response!
// });

// With response schema (fast-json-stringify path):
// fastify.get('/fast', {
//   schema: {
//     response: {
//       200: {
//         type: 'object',
//         properties: { id: { type: 'integer' }, name: { type: 'string' }, amount: { type: 'number' } }
//         // passwordHash not listed → automatically excluded from response
//       }
//     }
//   }
// }, async () => {
//   return { id: 1, name: 'Priya', passwordHash: 'secret', amount: 5000.50 };
//   // fast-json-stringify called. passwordHash NOT in output. 2-3x faster.
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM FASTIFY/EXPRESS PHILOSOPHY MISUNDERSTANDING:
----------------------------------------------------------------------

BUG 1: No response schema — sensitive data leaked to clients
  Scenario: Developer returned a user object from the handler:
    return user; // User object from database
    User object had: { id, name, email, passwordHash, internalNotes, adminFlag }
    No response schema defined. Fastify falls back to JSON.stringify.
    JSON.stringify includes ALL fields. passwordHash and adminFlag sent to client.
    Security audit failed. Passwords exposed in API response.
  Root cause: Without a response schema, Fastify sends everything JSON.stringify returns.
    fast-json-stringify only strips unknown fields when a schema is defined.
  Fix: Always define response schemas for every route:
    response: { 200: { type: 'object', properties: { id, name, email } } }
    Fields not in schema are stripped. Security by default.

BUG 2: Forgetting coercion — parseInt() called when schema already coerced
  Scenario: Developer wrote:
    const page = parseInt(request.query.page); // Manual parsing
    const offset = (page - 1) * 20;
    With schema: { querystring: { properties: { page: { type: 'integer' } } } }
    Fastify already coerced '1' → 1. parseInt(1) = 1. Seemed fine.
    But: parseInt(undefined) = NaN. When page not provided: offset = (NaN - 1) * 20 = NaN.
    Database query: LIMIT 20 OFFSET NaN → PostgreSQL error in production.
  Root cause: Double conversion not the real bug — missing default was.
    Schema should have: default: 1 for page. Then page is always a number, never undefined.
  Fix:
    querystring: { properties: { page: { type: 'integer', minimum: 1, default: 1 } } }
    With useDefaults: true in AJV options: page is always at least 1. No NaN possible.

BUG 3: addSchema \$id collision — wrong schema applied to route
  Scenario: Two plugins both called fastify.addSchema({ \$id: 'Error', ... }) with different shapes.
    Second registration silently succeeded (or failed depending on AJV version).
    Routes using { \$ref: 'Error#' } got one or the other randomly depending on registration order.
    Some error responses had wrong fields. Debugging took hours.
  Root cause: Schema IDs are global within a Fastify instance.
    Plugins that define schemas with common names ('Error', 'User', 'Response') will collide.
  Fix: Use namespaced schema IDs:
    \$id: 'auth/Error', \$id: 'orders/Error', \$id: 'payments/Error'
    Never use generic names without namespace.
    Use fastify-plugin to ensure schemas are registered in the right scope.

BUG 4: Returning undefined from handler — empty 200 response
  Scenario: Handler:
    fastify.get('/check', async (request, reply) => {
      const exists = await db.checkUser(request.query.email);
      if (!exists) reply.status(404); // Forgot .send()!
      // Falls through. No return. Fastify sees: undefined returned.
      // reply.status(404) was called but reply was never sent!
    });
    Result: client hangs (no response) or gets empty 200 with status 404.
    Behavior depends on Fastify version and whether onSend hooks are registered.
  Root cause: reply.status() sets the status code but does NOT send the response.
    Must call reply.status(404).send({ error: '...' }) or return with a value.
  Fix:
    if (!exists) return reply.status(404).send({ error: 'User not found' });
    // OR: use return with object (Fastify will call reply.send() automatically):
    if (!exists) { reply.status(404); return { error: 'User not found' }; }

BUG 5: Migrating Express middleware that mutates req — doesn't work in Fastify
  Scenario: Custom Express middleware: req.userId = token.sub; (attaches userId to request).
    Migrated to Fastify via @fastify/express adapter.
    Handler tries: request.userId → undefined!
    Express middleware ran but TypeScript/Fastify doesn't know about request.userId.
  Root cause: Fastify request object has a fixed shape. Adding arbitrary properties
    doesn't work without decorateRequest(). Express allows any property on req.
  Fix:
    fastify.decorateRequest('userId', null);
    fastify.addHook('preHandler', async (request) => {
      const token = verifyToken(request.headers.authorization);
      request.userId = token.sub; // Now recognized by Fastify and TypeScript
    });
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Given this Fastify route:

  fastify.get('/product/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            price: { type: 'number' }
          }
        }
      }
    }
  }, async (request) => {
    return {
      id: request.params.id,
      name: 'Samsung TV',
      price: 45999.00,
      internalCost: 32000.00,
      supplierCode: 'SAMS-TV-55'
    };
  });

  a) GET /product/42 → what is the response body? What is the type of id in the handler?
  b) GET /product/abc → what happens? What status code? Why?
  c) What fields are in the response? What fields are stripped and why?
  d) If the response schema is removed entirely, what changes about the response?
  e) If AJV option removeAdditional: false is set, what changes?

CHALLENGE 2 — FIX THE SCHEMA BUG:
  This product creation route has 3 bugs. Find and fix each.

  fastify.post('/products', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'integer' },
          category: { type: 'string' }
        }
        // Bug 1: No required fields — what happens if price is missing?
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },  // Bug 2: id is generated as integer, not string
            name: { type: 'string' },
            price: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const product = await db.createProduct(request.body);
    reply.send(product); // Bug 3: what status code is sent? What should it be?
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete Fastify server for a food delivery API (like Zomato).
  
  Routes to implement:
  1. GET /restaurants?city=Mumbai&cuisine=Indian&page=1&limit=10
     - Querystring schema: city (required string), cuisine (optional string), 
       page (integer, default 1), limit (integer, default 10, max 50)
     - Response: array of { id, name, rating, deliveryTime, minOrder }
  
  2. POST /orders
     - Body schema: { restaurantId (integer, required), items (array of {productId, qty}),
       deliveryAddress (object with street, city, pincode) }
     - Response 201: { orderId, estimatedDelivery, totalAmount }
     - Response 400: { error, details }
  
  3. GET /orders/:orderId/track
     - Params schema: orderId (string)
     - Response: { orderId, status (enum), riderName, riderPhone, eta }
  
  Requirements:
  - Use addSchema to define a reusable Address schema
  - Use TypeScript generics for all routes
  - Configure AJV with removeAdditional: true and useDefaults: true
  - All response schemas must strip internal fields (cost, margin, etc.)
    `,
    summary: `Fastify's performance advantage over Express comes from three architectural decisions made upfront: a radix trie router, AJV-compiled validators, and fast-json-stringify serializers — all powered by the schema you define before writing the handler. Schema-first design is not optional boilerplate: it IS the performance, the security (field stripping), and the documentation of your API in one declaration.`
  },

  {
    id: 2,
    title: "Request Lifecycle & Hooks",
    tag: "EVERY STEP A REQUEST TAKES THROUGH YOUR SERVER",
    color: "#065F46",
    tldr: `Every Fastify request passes through a defined sequence of lifecycle hooks — from onRequest (first touch) through preParsing, preValidation, preHandler, handler, preSerialization, onSend, to onResponse (last touch). Understanding this pipeline tells you exactly where to place authentication, logging, rate limiting, response transformation, and error handling to maximize efficiency and avoid common bugs.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Where should I put authentication — before or after body parsing?"
  → Before body parsing (preValidation or preParsing). Why? Parsing the body takes CPU.
    Don't waste cycles parsing a 1MB body for an unauthenticated request.
  → onRequest: even before parsing. Perfect for: IP blocking, rate limiting, basic token check.
  → preHandler: after validation, before the actual handler. Perfect for: permission checks
    that need access to validated request params/body.

"My global error hook doesn't catch errors from onRequest — why?"
  → onError catches errors from handler and hooks. But: errors thrown in onRequest
    are sent directly as responses (before much of the lifecycle runs).
  → Each lifecycle stage has specific error behavior. onRequest errors → 500 without onError.
  → Add error handling directly in hooks, or use setErrorHandler() for global handling.

"I added an addHook in a plugin but it's affecting routes outside the plugin — why?"
  → addHook() scope: hooks register in the current scope AND all child scopes.
  → If you register a hook at root level: it applies to ALL routes.
  → If you register inside a plugin without fastify-plugin: it applies only to routes in that plugin.
  → Common bug: auth hook registered at wrong level → some routes unprotected.

"reply.send() vs returning from async handler — which should I use?"
  → Both work. Returning is preferred for async handlers (cleaner, less error-prone).
  → reply.send(): sends the response immediately. Useful for streaming or early returns.
  → Gotcha: calling reply.send() AND returning a value → double-send error.
  → Rule: in async handlers, use return. Reserve reply.send() for synchronous handlers or streams.

"My onSend hook needs to modify the response body — how do I do that?"
  → onSend receives: (request, reply, payload, done). payload is the serialized string.
  → To modify: return the modified payload (async) or call done(null, newPayload).
  → Important: at onSend time, payload is ALREADY serialized (string/Buffer/Stream).
    Parsing and re-stringifying is expensive — better to shape the data before preSerialization.
    `,
    analogy: `
THE AIRPORT SECURITY ANALOGY:
-------------------------------
A request = a passenger flying from client to handler (the destination).

THE FULL JOURNEY:
  1. ONREQUEST = ARRIVAL AT AIRPORT:
     Passenger arrives. Ticket check (does this IP have permission?).
     Before they touch any luggage conveyor. Fast check — reject early if invalid.
     Rate limiting, IP blocking, basic token presence check.
  
  2. PREPARSING = CHECK-IN COUNTER:
     Passenger hands over bags. Check-in begins (body parsing starts).
     Before the bag contents are inspected (body not yet parsed).
     Can modify the stream if needed (e.g., decompress gzip body).
  
  3. PREVALIDATION = SECURITY SCREENING:
     Bags open, contents inspected against the allowed-items list (schema).
     Invalid items (schema violations) → rejected before entering secure area.
     This is where AJV runs. Handler never sees an invalid request.
  
  4. PREHANDLER = BOARDING GATE:
     Final checks before the flight (handler). Passenger verified, bags clear.
     Permission checks ("are you in business class?"), data enrichment.
     Access to validated, parsed request data.
  
  5. HANDLER = THE FLIGHT:
     Actual work happens. Passenger flies to destination (DB queries, business logic).
  
  6. PRESERIALIZATION = BAGGAGE CLAIM PREP:
     Flight arrived. Before bags are put on the belt: wrap/label them.
     Payload exists as a JavaScript object. Can be transformed before serialization.
  
  7. ONSEND = CUSTOMS CHECK ON ARRIVAL:
     Serialized payload (string) about to leave. Final inspection.
     Can add headers, modify serialized payload, compress response.
  
  8. ONRESPONSE = EXIT FROM AIRPORT:
     Passenger has left. Analytics: log total journey time, response code.
     The client has received their response. Cleanup, monitoring.
  
  ONERROR = INCIDENT MANAGEMENT:
     Something went wrong at any security stage. Error handling team notified.
     Can: send custom error response, log the incident, attempt recovery.

ADD_HOOK SCOPE = WHICH SECURITY CHECKPOINTS APPLY TO WHICH GATES:
  Root-level hook: applies at ALL gates in the airport.
  Plugin-scoped hook (without fastify-plugin): applies only to the domestic terminal.
  Route-specific hook: applies only to the gate for one specific flight.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — LIFECYCLE HOOKS INTERNALS:
-----------------------------------------------------

COMPLETE LIFECYCLE ORDER:
  1. onRequest(request, reply)          → very first hook
  2. preParsing(request, reply, payload) → before body parsed; payload is the stream
  3. preValidation(request, reply)      → after parsing, before AJV runs
  4. preHandler(request, reply)         → after validation, before handler
  5. HANDLER(request, reply)            → your route handler function
  6. preSerialization(request, reply, payload) → after handler returns, before serialization
     payload is the JavaScript object returned by handler
  7. onSend(request, reply, payload)    → after serialization; payload is string/Buffer/Stream
  8. onResponse(request, reply)         → after response fully sent to client
  9. onError(request, reply, error)     → called when an error occurs in any hook or handler
  10. onTimeout(request, reply)         → called when connectionTimeout elapses

HOOK REGISTRATION:
  fastify.addHook('hookName', async (request, reply) => { ... });
  
  Multiple hooks of same type registered in order → all run in registration order.
  If one hook throws: remaining hooks of same type are skipped, onError is called.
  
  Early reply in hook:
    If you call reply.send() in a hook: lifecycle stops. Handler not called.
    Use case: auth check in preHandler → if invalid, reply.status(401).send() → done.

ERROR HANDLING FLOW:
  When a hook throws or handler throws:
    1. Fastify calls the setErrorHandler (if registered).
    2. setErrorHandler receives: (error, request, reply).
    3. If no setErrorHandler: Fastify's default handler sends:
       { statusCode: 500, error: 'Internal Server Error', message: error.message }
  
  fastify.setErrorHandler(async (error, request, reply) => {
    if (error.validation) {
      // AJV validation error
      return reply.status(400).send({ error: 'Validation failed', details: error.validation });
    }
    request.log.error(error);
    reply.status(500).send({ error: 'Internal server error' });
  });
  
  Error scoping: setErrorHandler follows the same scope rules as addHook.
    Plugin-scoped setErrorHandler: catches errors only within that plugin.
    Root-level setErrorHandler: global fallback.

HOOK SCOPE RULES:
  Fastify uses an encapsulated scope tree.
  Hooks registered in a scope apply to: that scope + all child scopes.
  
  fastify instance (root scope)
    ├── addHook('onRequest', authHook) ← applies to EVERYTHING below
    ├── /public routes (no auth needed)
    │   └── fastify.register(publicPlugin)
    │        └── addHook('onRequest', openHook) ← applies to publicPlugin routes only
    └── /private routes
        └── fastify.register(privatePlugin)
             └── routes here get BOTH authHook (from root) + any plugin hooks

ASYNC vs CALLBACK STYLE:
  Async (preferred):
    fastify.addHook('onRequest', async (request, reply) => {
      // Throw to reject, return normally to continue
      if (!request.headers.authorization) throw new Error('Unauthorized');
    });
  
  Callback style (legacy):
    fastify.addHook('onRequest', (request, reply, done) => {
      if (!request.headers.authorization) {
        done(new Error('Unauthorized')); // done(error) to reject
      } else {
        done(); // done() to continue
      }
    });
  
  Mixing: never mix async and done() in the same hook function.
  Using done() in an async function: Fastify ignores it (returns promise anyway).

REPLY.SEND() vs RETURN:
  Both send the response. Differences:
  
  reply.send(data):
    - Works in both sync and async handlers
    - Can be called from within nested callbacks
    - Calling it multiple times: throws "Reply already sent" error
    - After reply.send(): code continues executing (not like return)!
      Common bug: code after reply.send() still runs.
    
  return data:
    - Only for async handlers
    - Cleaner syntax
    - After return: function exits (normal JavaScript behavior)
    - Fastify calls reply.send() on the returned value automatically
  
  Rule: use return in async handlers. Use reply.send() only when sending from callbacks
  or when you need to explicitly end the handler at a non-final code path.

PRESERIALIZATION vs ONSEND:
  preSerialization: payload is a JavaScript OBJECT. Best place to modify response data.
    Add metadata, wrap response: { data: payload, timestamp: Date.now() }
  
  onSend: payload is a STRING (or Buffer or Stream). Serialization already done.
    Best for: adding headers (reply.header('X-Request-Id', id)), compression, caching.
    Modifying payload here: must parse + re-stringify = expensive. Avoid for JSON.
    Use for: streaming responses, binary data modification.
    `,
    code: `
// ===== REQUEST LIFECYCLE & HOOKS — EXAMPLES =====

// EXAMPLE 1: Complete hook demonstration — all lifecycle stages

// const fastify = Fastify({ logger: true });

// Stage 1: First touch — before any parsing
// fastify.addHook('onRequest', async (request, reply) => {
//   request.startTime = Date.now();
//   request.log.info({ url: request.url, method: request.method }, 'Request received');
//   // Perfect for: rate limiting, IP blocking, request ID generation
// });

// Stage 2: Before body parsing (stream level)
// fastify.addHook('preParsing', async (request, reply, payload) => {
//   // payload is the raw readable stream
//   // Use case: handle compressed bodies, validate content-type early
//   // Most APIs don't need this hook
//   return payload; // Must return payload (possibly modified stream)
// });

// Stage 3: After parsing, before AJV validation
// fastify.addHook('preValidation', async (request, reply) => {
//   // request.body is now parsed but NOT yet schema-validated
//   // Use case: custom decryption, transform before validation
//   if (request.body?.encryptedData) {
//     request.body = decrypt(request.body.encryptedData);
//   }
// });

// Stage 4: After validation, before handler — perfect for auth
// fastify.addHook('preHandler', async (request, reply) => {
//   // request.body/params/query are validated and safe
//   // This is where you check permissions based on validated data
//   const userId = request.userId; // Set earlier by auth hook
//   const resourceId = request.params.id; // Already validated as integer
//   const canAccess = await permissions.check(userId, resourceId);
//   if (!canAccess) throw fastify.httpErrors.forbidden('Access denied');
// });

// Stage 5: After handler returns, before serialization
// fastify.addHook('preSerialization', async (request, reply, payload) => {
//   // payload is the JavaScript object returned by handler
//   // Wrap response with metadata:
//   return {
//     data: payload,
//     meta: {
//       requestId: request.id,
//       timestamp: new Date().toISOString(),
//       version: 'v1'
//     }
//   };
// });

// Stage 6: After serialization — payload is now a string
// fastify.addHook('onSend', async (request, reply, payload) => {
//   // Add response headers (doesn't require modifying payload)
//   reply.header('X-Request-Id', request.id);
//   reply.header('X-Response-Time', Date.now() - request.startTime + 'ms');
//   return payload; // Must return payload (unchanged or modified string)
// });

// Stage 7: After response fully sent — cleanup and logging
// fastify.addHook('onResponse', async (request, reply) => {
//   const duration = Date.now() - request.startTime;
//   request.log.info({
//     url: request.url,
//     method: request.method,
//     statusCode: reply.statusCode,
//     duration
//   }, 'Request completed');
//   // Perfect for: metrics, analytics, connection cleanup
// });

// EXAMPLE 2: Authentication hook — the most common preHandler use case

// fastify.decorateRequest('user', null); // Register the decoration first

// fastify.addHook('preHandler', async (request, reply) => {
//   const authHeader = request.headers.authorization;
//   if (!authHeader?.startsWith('Bearer ')) {
//     throw fastify.httpErrors.unauthorized('Bearer token required');
//   }
//   const token = authHeader.slice(7);
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     request.user = decoded; // Available in all route handlers
//   } catch (err) {
//     throw fastify.httpErrors.unauthorized('Invalid or expired token');
//   }
// });

// EXAMPLE 3: Scope-aware hooks — auth only for private routes

// fastify.register(async function publicRoutes(fastify) {
//   // No auth hook here — public routes
//   fastify.get('/health', async () => ({ status: 'ok' }));
//   fastify.post('/auth/login', { schema: loginSchema }, loginHandler);
// });

// fastify.register(async function privateRoutes(fastify) {
//   // Auth hook scoped to this plugin only
//   fastify.addHook('preHandler', async (request, reply) => {
//     await verifyAuth(request, reply); // Throws if unauthorized
//   });

//   fastify.get('/profile', profileHandler);   // Protected
//   fastify.put('/settings', settingsHandler); // Protected
//   fastify.get('/orders', ordersHandler);     // Protected
// }, { prefix: '/api' });

// EXAMPLE 4: Error handler with typed errors

// fastify.setErrorHandler(async (error, request, reply) => {
//   const { statusCode = 500, validation, message } = error;

//   // Validation errors from AJV:
//   if (validation) {
//     return reply.status(400).send({
//       error: 'Validation Error',
//       message: 'Request validation failed',
//       details: validation.map(v => ({
//         field: v.instancePath,
//         message: v.message,
//         params: v.params
//       }))
//     });
//   }

//   // Known HTTP errors (from @fastify/sensible or http-errors):
//   if (statusCode >= 400 && statusCode < 500) {
//     return reply.status(statusCode).send({ error: message });
//   }

//   // Unknown 500 errors — log but don't expose details:
//   request.log.error({ err: error }, 'Unhandled error');
//   return reply.status(500).send({ error: 'Internal server error' });
// });

// EXAMPLE 5: onSend for response time header and caching

// fastify.addHook('onSend', async (request, reply, payload) => {
//   const responseTime = Date.now() - request.startTime;
//   reply.header('X-Response-Time', \`\${responseTime}ms\`);
//   reply.header('X-Request-Id', request.id);

//   // Add caching headers for GET requests:
//   if (request.method === 'GET' && reply.statusCode === 200) {
//     reply.header('Cache-Control', 'public, max-age=60');
//     reply.header('ETag', \`"\${Buffer.from(payload).length}-\${Date.now()}"\`);
//   }

//   return payload; // Always return payload unchanged (or modified)
// });

// EXAMPLE 6: Per-route hooks (overriding global hooks)

// fastify.get('/admin/reports', {
//   // Route-specific preHandler in addition to global preHandler:
//   preHandler: [
//     async (request, reply) => {
//       // First: global auth hook already ran (from register scope)
//       // Now: additional admin-only check:
//       if (!request.user?.isAdmin) {
//         throw fastify.httpErrors.forbidden('Admin access required');
//       }
//     }
//   ],
//   schema: {
//     response: { 200: { type: 'array', items: { type: 'object' } } }
//   }
// }, async (request) => {
//   return db.getAdminReports();
// });

// EXAMPLE 7: preSerialization to wrap all responses

// fastify.addHook('preSerialization', async (request, reply, payload) => {
//   // Wrap ALL successful responses in a standard envelope:
//   if (reply.statusCode >= 200 && reply.statusCode < 300) {
//     return {
//       success: true,
//       data: payload,
//       requestId: request.id,
//       timestamp: new Date().toISOString()
//     };
//   }
//   return payload; // Don't wrap error responses
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM LIFECYCLE HOOK MISUNDERSTANDING:
----------------------------------------------------------

BUG 1: Auth hook registered at wrong scope — unprotected routes
  Scenario: Developer registered auth in a plugin:
    fastify.register(async function routes(fastify) {
      fastify.addHook('preHandler', authHook);  // Inside the plugin
      fastify.get('/orders', ordersHandler);    // Protected ✓
    });
    fastify.get('/admin/users', adminHandler);  // Outside plugin — NO auth!
    
    Admin route was added later outside the plugin. No auth hook applied.
    Authentication bypass: GET /admin/users worked without any token.
  Root cause: addHook in a plugin applies only to that plugin's routes.
    Routes outside the plugin: unprotected.
  Fix: Register global auth hook at root level BEFORE any plugins:
    fastify.addHook('preHandler', globalAuthHook); // Root level = applies everywhere
    Then: public routes explicitly opt out using their own hooks or skip logic:
    fastify.addHook('preHandler', (req, reply, done) => {
      if (publicPaths.includes(req.url)) return done();
      return authHook(req, reply, done);
    });

BUG 2: reply.send() called then code continues — double processing
  Scenario:
    fastify.get('/payment', async (request, reply) => {
      const order = await db.getOrder(request.query.orderId);
      if (order.isPaid) {
        reply.send({ status: 'already_paid' }); // SENDS response here
        // Developer thought this was like return. IT'S NOT.
      }
      // Code CONTINUES here even after reply.send() above!
      await processPayment(order); // Called even for already-paid orders!
      reply.send({ status: 'payment_processed' }); // ERROR: reply already sent!
    });
    Result: double payment processing, then "Reply already sent" error crash.
  Root cause: reply.send() sends but doesn't stop execution. Not like return.
  Fix: Always use return with reply.send():
    if (order.isPaid) {
      return reply.send({ status: 'already_paid' }); // return + send = stop execution
    }
    // Or better: just return the value (async handler):
    if (order.isPaid) return { status: 'already_paid' };

BUG 3: Missing return in preSerialization/onSend hooks — undefined payload sent
  Scenario:
    fastify.addHook('preSerialization', async (request, reply, payload) => {
      const wrapped = { data: payload, meta: { version: 'v1' } };
      // BUG: forgot to return!
      // wrapped is created but not returned.
    });
    Result: payload becomes undefined. Responses are empty.
    No error thrown — Fastify serializes undefined as null or empty.
    All API responses were {} or null in production for hours.
  Root cause: preSerialization and onSend hooks MUST return the (possibly modified) payload.
    Not returning: Fastify uses undefined → serializes to null or empty string.
  Fix:
    fastify.addHook('preSerialization', async (request, reply, payload) => {
      return { data: payload, meta: { version: 'v1' } }; // MUST return!
    });

BUG 4: Async hook with done() parameter — done() ignored
  Scenario:
    fastify.addHook('preHandler', async (request, reply, done) => {
      // Async function WITH done parameter (mistake)
      const user = await verifyToken(request.headers.authorization);
      if (!user) {
        done(new Error('Unauthorized')); // This does NOTHING in async hook!
        return; // async function returns resolved promise — Fastify sees: success
      }
      request.user = user;
      done(); // Also does nothing
    });
    Result: Unauthorized requests passed through! done() is ignored in async functions.
    Auth bypass in production.
  Root cause: In async hooks, Fastify uses the returned promise.
    Calling done() has no effect — Fastify doesn't check it in async mode.
  Fix: Use throw for errors, return normally for success:
    fastify.addHook('preHandler', async (request, reply) => {
      const user = await verifyToken(request.headers.authorization);
      if (!user) throw fastify.httpErrors.unauthorized('Invalid token'); // Throw, don't done()
      request.user = user;
      // No done() needed — async function returning = success
    });

BUG 5: onResponse hook reading reply.statusCode incorrectly after streaming
  Scenario: Logging hook read reply.statusCode for metrics:
    fastify.addHook('onResponse', async (request, reply) => {
      metrics.record(request.url, reply.statusCode, Date.now() - request.startTime);
    });
    For streaming responses: statusCode was 200 even for partial errors.
    Metrics showed 100% success rate for streaming endpoints that were failing 30% of the time.
  Root cause: onResponse fires after headers are sent. For streams: status code
    is set when headers are sent, before stream errors occur.
    Stream errors after header sent → client gets error, server sees statusCode 200.
  Fix: Use reply.raw.statusCode for post-stream accuracy, or track stream errors separately:
    fastify.addHook('onResponse', async (request, reply) => {
      const code = reply.raw.statusCode ?? reply.statusCode;
      metrics.record(request.url, code, Date.now() - request.startTime);
    });
    For streams: attach error handlers to the stream and track separately.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE LIFECYCLE:
  For each request, trace which hooks fire and in what order.
  
  Server setup:
  fastify.addHook('onRequest', hook_A);           // Root level
  fastify.addHook('preHandler', hook_B);          // Root level
  
  fastify.register(async function plugin(fastify) {
    fastify.addHook('preHandler', hook_C);        // Plugin level
    fastify.get('/items', { preHandler: [hook_D] }, handlerFn); // Route level
    fastify.get('/other', otherHandlerFn);
  });
  
  fastify.get('/health', healthHandlerFn);        // Root level route

  For each request:
  a) GET /health → which hooks fire in order?
  b) GET /items → which hooks fire in order? (Note: route has its own preHandler)
  c) GET /other → which hooks fire in order?
  d) If hook_B throws an error on GET /items → which remaining hooks fire?
  e) If hook_D throws after hook_B and hook_C succeed → what happens?

CHALLENGE 2 — FIX THE HOOKS:
  This server has 3 hook-related bugs. Find and fix each.

  fastify.addHook('onRequest', async (request, reply) => {
    // Bug 1: rate limiting check but no early return on rejection
    const allowed = await rateLimiter.check(request.ip);
    if (!allowed) {
      reply.status(429).send({ error: 'Too many requests' });
      // What's missing? Code continues after this!
    }
    request.startTime = Date.now();
  });

  fastify.addHook('preSerialization', async (request, reply, payload) => {
    // Bug 2: transformation without return
    const wrapped = { data: payload, timestamp: new Date().toISOString() };
    // missing: return wrapped;
  });

  fastify.addHook('preHandler', async (request, reply, done) => {
    // Bug 3: async hook using done()
    const isValid = await checkApiKey(request.headers['x-api-key']);
    if (!isValid) done(new Error('Invalid API key'));
    done();
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete request lifecycle setup for a fintech API with these requirements:
  
  1. onRequest: generate a unique requestId (UUID), attach to request,
     set as response header 'X-Request-Id'
  
  2. onRequest (second): rate limiting — 100 req/min per IP.
     If exceeded: return 429 with Retry-After header
  
  3. preHandler (global): JWT authentication.
     - Skip for routes with { config: { public: true } }
     - Attach decoded user to request.user
     - Throw 401 for missing/invalid tokens
  
  4. preHandler (scoped to /admin): check request.user.role === 'admin'
     Throw 403 for non-admin users
  
  5. preSerialization: wrap all 2xx responses:
     { success: true, data: payload, requestId, timestamp }
  
  6. onSend: add X-Response-Time header
  
  7. onResponse: log structured entry with method, url, statusCode, duration, userId
  
  8. setErrorHandler: handle validation errors (400), auth errors (401/403),
     and unknown errors (500 with sanitized message, no stack traces)
    `,
    summary: `The Fastify lifecycle is a pipeline where each hook has a specific purpose: onRequest for early rejection (rate limiting, IP blocking), preHandler for authentication and authorization, preSerialization for response shaping, onSend for headers and compression, and onResponse for logging and metrics. Placing a hook at the wrong lifecycle stage or wrong scope is the most common source of security vulnerabilities (unprotected routes) and data bugs (wrong response shape) in Fastify applications.`
  },

  {
    id: 3,
    title: "Schema Validation & Serialization",
    tag: "AJV, FAST-JSON-STRINGIFY, AND WHY YOUR API IS BOTH SAFE AND FAST",
    color: "#7C3AED",
    tldr: `Fastify's validation layer (AJV) and serialization layer (fast-json-stringify) are both powered by the same JSON Schema you define on a route. AJV compiles validators at startup so each request is validated against a pre-compiled function — no schema interpretation at request time. fast-json-stringify similarly compiles a dedicated serializer from the response schema, achieving 2-3× the speed of JSON.stringify while automatically stripping fields not in the schema.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Query params always come in as strings — how do I get integers without parseInt?"
  → Schema coercion: define param as { type: 'integer' } → AJV converts '42' → 42 automatically.
  → This happens in preValidation BEFORE the handler. Handler always gets the right type.
  → Without coercion: every handler needs manual type conversion. Error-prone. Repetitive.

"My response schema broke — Fastify returned null for a field that had a value"
  → Schema type mismatch: field is a number but schema says string (or vice versa).
    fast-json-stringify uses the schema type to serialize. Wrong type → null or empty string.
  → Example: amount is a Decimal from Prisma (returns as string). Schema says: type: 'number'.
    fast-json-stringify tries to serialize a string as a number → null.
  → Fix: match schema types exactly to what your handler returns.

"I need to validate nested objects and arrays — can JSON Schema handle that?"
  → Yes: JSON Schema is fully recursive. Nested objects, arrays of objects, oneOf, anyOf.
  → items property for arrays, properties for objects, all nestable.
  → $ref for referencing shared schemas: define once, use many times.

"AJV is rejecting a valid request — how do I debug schema validation failures?"
  → Fastify returns 400 with validation details when schema validation fails.
  → The error object in setErrorHandler has error.validation: array of AJV errors.
  → Each error: { instancePath: '/body/price', message: 'must be >= 0', params: { limit: 0 } }
  → Use allErrors: true in AJV config to get ALL errors, not just the first.

"Can I add custom validation logic beyond what JSON Schema supports?"
  → Yes: custom AJV keywords, or preValidation hook for imperative validation.
  → Custom keyword example: isValidUPI keyword that validates UPI ID format.
  → preValidation: perfect for cross-field validation (startDate < endDate) that JSON Schema can't express.
    `,
    analogy: `
THE CUSTOMS AND PASSPORT CONTROL ANALOGY:
-------------------------------------------
Every incoming request = a traveler with a passport (request body/params/headers).
Every outgoing response = a package being exported with a customs declaration.

AJV VALIDATION = PASSPORT CONTROL:
  Before the traveler enters the country (handler), they must pass passport control.
  
  The passport requirements (JSON Schema) are defined upfront:
    "Passport must have: name (string), nationality (string), age (integer, ≥ 0)"
    "Visa required if purpose = 'business'"
  
  Officer (AJV, JIT-compiled) checks:
    - Is the passport the right shape? (schema validation)
    - Is age provided and is it a valid integer? (type + constraint validation)
    - Coercion: traveler says "age is '28'" (string) → officer converts to 28 (integer)
  
  Pre-compiled officer: AJV compiles the schema once at server startup.
    Every traveler: the same compiled function runs. No re-reading the rulebook.
    1000 travelers/second: same compiled function, same speed.
  
  Rejected traveler: goes home with a 400 response (stamp: validation failed).
    Never enters the country (handler never called). DB never queried.

FAST-JSON-STRINGIFY = AUTOMATED EXPORT PACKAGING:
  Package (response object) needs to be shipped to the client.
  
  Without schema (JSON.stringify): inspector looks at every item in the package.
    "What's this? An integer. What's this? An array? Let me figure out how to wrap it..."
    Every package: manual inspection. Unknown contents. Must discover structure at runtime.
  
  With schema (fast-json-stringify): automated packaging machine.
    Machine is configured ONCE for this package type: "Box 1: integer, Box 2: string, Box 3: array"
    Every package: conveyor belt → slot 1 fills integer → slot 2 fills string → done. Fast!
    
    Security bonus: machine ONLY has slots for what's in the schema.
    Extra items (passwordHash, internalCost) fall through the floor. Not in the package.
    Thief can't steal what's never packed.

JSON SCHEMA NESTING = RUSSIAN DOLLS:
  Schema can describe any depth:
    { type: 'object',  ← outer doll
      properties: {
        user: { type: 'object',  ← middle doll
          properties: {
            address: { type: 'object',  ← inner doll
              properties: { city: { type: 'string' } }
            }
          }
        }
      }
    }
  AJV handles all depths. fast-json-stringify handles all depths.
  Define once. Validated and serialized automatically at every level.

\$REF = THE MASTER TEMPLATE:
  Instead of writing the address schema in 20 places:
    Define once: fastify.addSchema({ \$id: 'Address', type: 'object', ... })
    Reference: { \$ref: 'Address#' }
  Like having a stamp of the address format. Apply it anywhere.
  Change the master template → all uses updated automatically.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — AJV AND FAST-JSON-STRINGIFY INTERNALS:
-----------------------------------------------------------------

AJV COMPILATION PROCESS:
  At server startup (route registration time):
    1. Fastify passes each route's schema to AJV.
    2. AJV compiles the schema into a JavaScript validation function.
    3. Function is cached by route.
  
  At request time:
    Compiled function called with request data. Returns true/false + error list.
    No schema interpretation. No JSON parsing of schema. Pure function call.
  
  Generated function (simplified example for { type: 'object', properties: { age: { type: 'integer', minimum: 18 } }, required: ['age'] }):
  
  function validate(data) {
    if (typeof data !== 'object' || data === null) return false;
    if (!('age' in data)) return false;
    if (typeof data.age !== 'number' || data.age % 1 !== 0) return false;
    if (data.age < 18) return false;
    return true;
  }
  // Actual compiled code is more sophisticated but this is the concept

AJV CONFIGURATION IN FASTIFY:
  Fastify passes AJV options via ajv.customOptions:
  
  {
    removeAdditional: 'all',  // Strip unknown fields from body/querystring
      // Options: true (strip from objects with additionalProperties:false),
      //          'all' (strip from all objects), 'failing' (strip and continue)
    useDefaults: true,        // Apply 'default' from schema to missing fields
    coerceTypes: true,        // String → number for querystring/params
      // true: basic coercion, 'array': also coerce to array
    allErrors: true,          // Report all errors, not just first
    strict: false,            // Fastify uses some non-standard keywords (\$id, etc.)
  }
  
  Important: removeAdditional applies to REQUEST body when set.
    Incoming { name: 'Priya', internalNote: 'vip' } with schema only having 'name':
    → { name: 'Priya' } after removeAdditional. internalNote stripped from request too!
    This prevents accidentally using extra fields in handlers.

FAST-JSON-STRINGIFY COMPILATION:
  Given response schema:
  { type: 'object', properties: { id: {type:'integer'}, name: {type:'string'}, items: {type:'array', items:{type:'string'}} } }
  
  Compiled serializer (conceptual):
  function serialize(obj) {
    let str = '{';
    str += '"id":' + (obj.id|0);  // integer: bitwise OR for fast int conversion
    str += ',"name":"' + escapeString(obj.name) + '"';
    str += ',"items":[';
    for (let i = 0; i < obj.items.length; i++) {
      if (i > 0) str += ',';
      str += '"' + escapeString(obj.items[i]) + '"';
    }
    str += ']}';
    return str;
  }
  
  Why faster than JSON.stringify:
    1. No type discovery at runtime — types are known from schema.
    2. Integers: uses bitwise OR (much faster than generic number handling).
    3. Strings: dedicated fast escape function.
    4. Objects: no key iteration — only known keys accessed directly.
    5. Unknown fields: never accessed (compiler doesn't generate code for them).

SCHEMA KEYWORDS REFERENCE:
  string: { type: 'string', minLength: 1, maxLength: 255, pattern: '^[A-Z]', format: 'email' }
  number: { type: 'number', minimum: 0, maximum: 100, multipleOf: 0.01 }
  integer: { type: 'integer', minimum: 1, exclusiveMaximum: 100 }
  boolean: { type: 'boolean' }
  array: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10, uniqueItems: true }
  object: { type: 'object', properties: {...}, required: ['field1'], additionalProperties: false }
  null: { type: 'null' }
  enum: { enum: ['pending', 'active', 'deleted'] }
  anyOf: { anyOf: [{ type: 'string' }, { type: 'null' }] }  // nullable field
  oneOf: { oneOf: [schema1, schema2] }  // exactly one must match
  const: { const: 'fixed_value' }

RESPONSE SCHEMA BY STATUS CODE:
  response: {
    200: { type: 'object', ... },   // Only for 200 responses
    201: { type: 'object', ... },   // Only for 201 responses
    '4xx': { type: 'object', properties: { error: { type: 'string' } } },  // ALL 4xx
    '5xx': { type: 'object', ... }, // ALL 5xx
    default: { type: 'object', ... } // All status codes not explicitly listed
  }
  
  If a response is sent with a status code that has a schema: fast-json-stringify.
  If no matching schema: JSON.stringify fallback.

CUSTOM VALIDATORS:
  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    // Return a custom validation function
    return ajv.compile(schema); // Use your own AJV instance
  });
  
  Custom AJV keywords:
  ajv.addKeyword({
    keyword: 'isValidPhone',
    type: 'string',
    validate: (schema, data) => /^[6-9]\\d{9}\$/.test(data),
    errors: false
  });
  // Schema: { type: 'string', isValidPhone: true }
    `,
    code: `
// ===== SCHEMA VALIDATION & SERIALIZATION — EXAMPLES =====

// EXAMPLE 1: Complete request validation — all four parts

const createProductSchema = {
  // Body validation:
  body: {
    type: 'object',
    required: ['name', 'price', 'stock', 'categoryId'],
    additionalProperties: false,  // Strip unknown fields from body
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 200 },
      description: { type: 'string', maxLength: 5000 },
      price: { type: 'number', minimum: 0, exclusiveMinimum: 0 }, // > 0, not >= 0
      stock: { type: 'integer', minimum: 0 },
      categoryId: { type: 'integer', minimum: 1 },
      tags: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        maxItems: 10,
        uniqueItems: true
      },
      weight: { type: 'number', minimum: 0 }
    }
  },
  // Querystring validation:
  querystring: {
    type: 'object',
    properties: {
      draftMode: { type: 'boolean' },    // Coerced: 'true' → true
      catalogVersion: { type: 'integer', default: 1 } // Coerced: '2' → 2; missing → 1
    }
  },
  // Headers validation:
  headers: {
    type: 'object',
    required: ['x-tenant-id'],
    properties: {
      'x-tenant-id': { type: 'string', pattern: '^[A-Z]{3,5}\$' }
    }
  },
  // Response schemas by status:
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'integer' },
        createdAt: { type: 'string', format: 'date-time' }
        // internalCost, margin, supplierId — NOT in schema → stripped
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        details: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};

// fastify.post('/products', { schema: createProductSchema }, async (request, reply) => {
//   const { name, price, stock, categoryId, tags = [], weight } = request.body;
//   // All types guaranteed by schema — no parseInt, no parseFloat needed
//   const product = await db.createProduct({ name, price, stock, categoryId, tags, weight });
//   return reply.status(201).send(product);
// });

// EXAMPLE 2: Reusable schema components with addSchema

// fastify.addSchema({
//   \$id: 'Pagination',
//   type: 'object',
//   properties: {
//     page: { type: 'integer', minimum: 1, default: 1 },
//     limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
//   }
// });

// fastify.addSchema({
//   \$id: 'Address',
//   type: 'object',
//   required: ['street', 'city', 'pincode'],
//   properties: {
//     street: { type: 'string', minLength: 5 },
//     city: { type: 'string', minLength: 2 },
//     state: { type: 'string' },
//     pincode: { type: 'string', pattern: '^[1-9][0-9]{5}\$' },
//     landmark: { type: 'string' }
//   }
// });

// Route using referenced schemas:
const listOrdersSchema = {
  querystring: { \$ref: 'Pagination#' },  // Reuse pagination schema
  response: {
    200: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered'] },
              shippingAddress: { \$ref: 'Address#' }  // Reuse address schema in response
            }
          }
        },
        total: { type: 'integer' },
        page: { type: 'integer' },
        totalPages: { type: 'integer' }
      }
    }
  }
};

// EXAMPLE 3: Nullable fields and anyOf

const updateUserSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      bio: {
        anyOf: [
          { type: 'string', maxLength: 500 },
          { type: 'null' }   // Nullable — allow clearing the bio
        ]
      },
      website: {
        anyOf: [
          { type: 'string', format: 'uri' },
          { type: 'null' }
        ]
      },
      // Enum field:
      role: { enum: ['user', 'seller', 'admin'] },
      // Nested object:
      preferences: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['en', 'hi', 'ta', 'te', 'bn'] },
          currency: { type: 'string', default: 'INR' },
          notifications: { type: 'boolean', default: true }
        }
      }
    },
    minProperties: 1  // At least one field must be provided for PATCH
  }
};

// EXAMPLE 4: Custom AJV keyword for domain-specific validation

// Register a custom keyword for Indian phone numbers:
// fastify.ajv.addKeyword({
//   keyword: 'isIndianPhone',
//   type: 'string',
//   schemaType: 'boolean',
//   validate: (schema, data) => {
//     if (!schema) return true; // isIndianPhone: false means don't validate
//     return /^[6-9]\\d{9}\$/.test(data);
//   },
//   error: { message: 'must be a valid 10-digit Indian mobile number' },
//   errors: false
// });

// Usage in schema:
const contactSchema = {
  body: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: {
        type: 'string',
        isIndianPhone: true  // Custom keyword
      },
      alternatePhone: {
        anyOf: [
          { type: 'string', isIndianPhone: true },
          { type: 'null' }
        ]
      }
    }
  }
};

// EXAMPLE 5: Cross-field validation in preValidation hook

// JSON Schema can't validate "endDate > startDate" — use preValidation hook:
// fastify.post('/events', {
//   schema: {
//     body: {
//       type: 'object',
//       required: ['title', 'startDate', 'endDate'],
//       properties: {
//         title: { type: 'string' },
//         startDate: { type: 'string', format: 'date-time' },
//         endDate: { type: 'string', format: 'date-time' },
//         maxAttendees: { type: 'integer', minimum: 1 }
//       }
//     }
//   },
//   preValidation: async (request, reply) => {
//     // JSON Schema validation already ran (format validation).
//     // Now do cross-field validation:
//     const { startDate, endDate } = request.body;
//     if (new Date(endDate) <= new Date(startDate)) {
//       return reply.status(400).send({
//         error: 'endDate must be after startDate'
//       });
//     }
//   }
// }, async (request, reply) => {
//   const event = await db.createEvent(request.body);
//   return reply.status(201).send(event);
// });

// EXAMPLE 6: Serializer for streaming/special cases

// Custom serializer for CSV download:
// fastify.get('/reports/export', {
//   schema: {
//     response: {
//       200: { type: 'string' }  // Just mark it as string — actual content is CSV
//     }
//   },
//   config: { rawBody: true }
// }, async (request, reply) => {
//   const data = await db.getReportData();
//   const csv = data.map(row => Object.values(row).join(',')).join('\\n');
//   reply.type('text/csv');
//   reply.header('Content-Disposition', 'attachment; filename=report.csv');
//   return csv;
// });

// EXAMPLE 7: Schema for paginated list response — common pattern

const paginatedListSchema = (itemSchema) => ({
  200: {
    type: 'object',
    properties: {
      data: { type: 'array', items: itemSchema },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        }
      }
    }
  }
});

const userItem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    email: { type: 'string' },
    createdAt: { type: 'string' }
    // passwordHash, internalId, etc. — not here → stripped
  }
};

// fastify.get('/users', {
//   schema: {
//     querystring: { \$ref: 'Pagination#' },
//     response: paginatedListSchema(userItem)
//   }
// }, async (request) => {
//   const { page, limit } = request.query;
//   const [users, total] = await Promise.all([
//     db.getUsers(page, limit),
//     db.getUserCount()
//   ]);
//   return {
//     data: users,
//     pagination: {
//       total, page, limit,
//       totalPages: Math.ceil(total / limit),
//       hasNext: page * limit < total,
//       hasPrev: page > 1
//     }
//   };
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM SCHEMA VALIDATION AND SERIALIZATION:
--------------------------------------------------------------

BUG 1: Decimal/numeric type mismatch — null in serialized response
  Scenario: Database returns price as Decimal (Prisma/Drizzle returns string '2499.99').
    Response schema: { price: { type: 'number' } }
    fast-json-stringify: expects a JavaScript number. Receives string '2499.99'.
    Result: price field serialized as null in response!
    All product prices showed null. Frontend crashed. Customers saw ₹null.
  Root cause: Type mismatch between schema (number) and actual data (string).
    fast-json-stringify is strict about types when serializing.
  Fix options:
    1. Change schema to { type: 'string' } if price is always a string from DB.
    2. Convert in handler: return { ...product, price: parseFloat(product.price) }.
    3. Use preSerialization hook to convert all Decimal fields.
    4. Store prices as integers (paise): 249999 paise = ₹2499.99. No Decimal issues.

BUG 2: Missing required in schema — invalid data reaches handler silently
  Scenario: Order creation schema:
    body: { type: 'object', properties: { amount: { type: 'number' }, userId: { type: 'integer' } } }
    Missing: required: ['amount', 'userId']
    
    POST /orders {} → no validation error! Empty body passes.
    Handler: db.createOrder({ amount: undefined, userId: undefined })
    Database: NULL values in NOT NULL columns → constraint violation error.
    Error cascade reached users. Support tickets: "Can't place orders."
  Root cause: JSON Schema doesn't require fields by default.
    Only explicitly listed fields in 'required' are required.
  Fix: Always list required fields:
    body: { type: 'object', required: ['amount', 'userId'], properties: { ... } }
    Rule: for POST/PUT bodies: default to requiring all important fields.

BUG 3: Coercion of boolean query param — truthy string behavior
  Scenario: API: GET /users?isAdmin=false
    Schema: { querystring: { properties: { isAdmin: { type: 'boolean' } } } }
    AJV coercion: 'false' (string) → false (boolean)? Actually: depends on AJV version.
    AJV 8: coerceTypes for string → boolean: only 'true' → true, everything else → false.
    So 'false' → false ✓. BUT: 'no' → false, 'yes' → false too.
    Developer: GET /users?isAdmin=yes → isAdmin = false (not true!)
    The endpoint worked for 'true'/'false' but gave unexpected results for other strings.
  Root cause: AJV coerces any string to boolean for boolean type.
    Should use: { enum: ['true', 'false'] } with manual conversion, or document expected values.
  Fix:
    isAdmin: { type: 'string', enum: ['true', 'false'] }
    // Then in handler: const isAdmin = request.query.isAdmin === 'true';
    // More explicit than relying on coercion behavior.

BUG 4: removeAdditional stripping required fields from body
  Scenario: AJV configured with removeAdditional: 'all'.
    Route schema: body with additionalProperties: false and some fields.
    Request body: { name: 'Rohan', age: 25, 'X-Internal-Id': 'abc' }
    Expected: X-Internal-Id stripped, name and age remain.
    
    But developer had nested object without explicit properties definition:
    metadata: { type: 'object' } // No properties defined!
    
    AJV removeAdditional with 'all': any object without explicit properties listed → ALL fields stripped!
    metadata: {} in the handler! All metadata fields gone.
  Root cause: removeAdditional removes ALL fields from objects that don't have properties defined.
    An empty { type: 'object' } schema means: remove all unknown properties = remove everything.
  Fix:
    metadata: { type: 'object', additionalProperties: true } // Explicitly allow additional props
    // OR: don't use removeAdditional for schemas with open-ended objects.
    // OR: use { type: 'object', additionalProperties: { type: 'string' } } to allow string values.

BUG 5: Response schema missing for error codes — error details exposed
  Scenario: Route had response schema only for 200:
    response: { 200: { type: 'object', properties: { id: ..., name: ... } } }
    No schema for 4xx or 5xx.
    
    When validation failed: Fastify default error handler ran.
    Error object contained: { statusCode: 400, error: '...', message: '...', validation: [...] }
    Without response schema for 400: JSON.stringify runs. ALL fields included.
    
    The validation array exposed: internal schema structure, field names, AJV error codes.
    Security audit: schema information disclosure in error responses.
  Fix: Define response schemas for error codes too:
    response: {
      200: { ... },
      '4xx': { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
      '5xx': { type: 'object', properties: { error: { type: 'string' } } }
    }
    Or: setErrorHandler that sends a sanitized error response (safest approach).
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE VALIDATION BEHAVIOR:
  AJV configured with: coerceTypes: true, removeAdditional: 'all', useDefaults: true

  Schema:
  body: {
    type: 'object',
    required: ['name', 'price'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 2 },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'integer', default: 0 },
      category: { type: 'string', enum: ['food', 'electronics', 'clothing'] },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 5 }
    }
  }

  For each request body, state: (a) does validation pass or fail? (b) what does request.body look like in the handler? (c) why?

  1. { "name": "Samsung TV", "price": "45999", "stock": "5", "discount": 10 }
  2. { "name": "A", "price": -100 }
  3. { "name": "Shirt", "price": 599 }
  4. { "name": "Phone", "price": 0, "category": "gadgets" }
  5. { "name": "Chips", "price": 20, "tags": ["snack", "salty", "baked", "puffed", "crispy", "spicy"] }

CHALLENGE 2 — FIX THE SCHEMA BUGS:
  This user registration schema has 4 bugs. Find and fix each.

  const registerSchema = {
    body: {
      type: 'object',
      // Bug 1: No required fields defined
      properties: {
        email: { type: 'string' },     // Bug 2: No format: 'email' or pattern validation
        password: { type: 'string' },  // Bug 3: No minLength (accepts empty password)
        age: { type: 'integer' },
        phone: { type: 'number' }      // Bug 4: phone should be string (has leading zeros, +91 prefix)
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          passwordHash: { type: 'string' }  // Bug 5: exposing hashed password in response
        }
      }
    }
  };

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete JSON Schema definition for an e-commerce checkout API.

  POST /checkout endpoint accepts:
  {
    customerId: integer (required, > 0),
    items: array (required, min 1 item) of {
      productId: integer (required, > 0),
      quantity: integer (required, 1-10),
      variantId: optional integer
    },
    shippingAddress: object (required) with:
      - recipientName: string (required, 2-100 chars)
      - phone: string (required, valid Indian mobile: 10 digits, starts 6-9)
      - street: string (required, 5-200 chars)
      - city: string (required)
      - state: string (required)
      - pincode: string (required, exactly 6 digits, no leading 0)
    paymentMethod: enum (required): 'upi', 'card', 'cod', 'wallet'
    couponCode: optional string, 5-15 uppercase alphanumeric characters
    useWalletBalance: optional boolean (default: false)
  }

  Response 200:
    orderId (string), estimatedDelivery (date-time string), totalAmount (number),
    discountApplied (number), paymentStatus (enum: 'pending', 'processing', 'success')

  Requirements:
  - Use addSchema to define Address and OrderItem as reusable schemas
  - Use \$ref for both in the checkout schema
  - Use a custom AJV keyword 'isIndianPhone' for phone validation
  - Configure removeAdditional and useDefaults appropriately
    `,
    summary: `Schema validation and serialization in Fastify are two sides of the same coin — the JSON Schema you write on a route becomes both the AJV-compiled validator that protects your handler from bad input AND the fast-json-stringify-compiled serializer that protects your response from leaking data. The habit to build: write the schema before writing the handler, match types exactly to what your database returns (especially Decimal/numeric types), and always define response schemas for error status codes to prevent internal schema information disclosure.`
  },

  {
    id: 4,
    title: "Plugin System & Encapsulation",
    tag: "THE MODULE SYSTEM THAT MAKES FASTIFY COMPOSABLE",
    color: "#B45309",
    tldr: `Fastify's plugin system is its most powerful architectural feature: every plugin runs in its own encapsulated scope, meaning decorators, hooks, and schemas added inside a plugin are invisible outside it by default. The fastify-plugin (fp) wrapper breaks encapsulation — sharing a plugin's additions with the parent scope. This design enables building modular, testable, dependency-aware plugin libraries where auth, database, config, and caching are independently composable.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I added fastify.decorate('db', dbClient) in a plugin but it's undefined outside"
  → Plugin encapsulation: decorators added inside a plugin stay inside that plugin's scope.
  → Without fastify-plugin: the decorator is scoped to the plugin and its children only.
  → With fastify-plugin (fp): decorator propagates UP to parent scope.
  → Use fp for plugins that should be shared globally (db, auth, config).
  → Don't use fp for plugins that should stay isolated (specific route groups).

"Why do I need fastify.decorate() instead of just module-level variables?"
  → Module-level variables: not scope-aware, not testable (global state), not declarative.
  → fastify.decorate(): adds the property to the Fastify instance following the scope tree.
    Plugins that depend on it can declare dependencies.
    Tests can mock the decorator for the test instance.
  → Also: decorateRequest/decorateReply for per-request state (not shared across requests).

"I'm getting 'FST_ERR_DEC_ALREADY_PRESENT' — what does this mean?"
  → fastify.decorate() throws if you try to register the same decorator name twice.
  → Common in: development with hot reload, or two plugins both decorating with the same name.
  → Fix: check first: fastify.hasDecorator('name') before decorating.
    Or: use fastify-plugin with dependency declaration to ensure single registration.

"How do I declare that my plugin depends on another plugin (like db plugin)?"
  → Use fastify-plugin's dependencies option:
    fp(async function myPlugin(fastify) { ... }, { dependencies: ['@my/db-plugin'] })
  → When myPlugin loads: Fastify checks that @my/db-plugin was already loaded.
  → If not: throws clear error "Plugin '@my/db-plugin' is not registered" rather than
    a cryptic undefined error when trying to access fastify.db.

"What's the correct pattern for a reusable plugin library?"
  → Every shared utility (db, redis, auth, config): fp-wrapped (breaks encapsulation).
  → Route groups: NOT fp-wrapped (isolated scope, own hooks, own error handlers).
  → The db plugin registers fastify.db. Auth plugin registers fastify.jwt and auth hooks.
  → Route plugins depend on these via fastify.db, fastify.jwt already existing.
    `,
    analogy: `
THE COMPANY DEPARTMENTS ANALOGY:
----------------------------------
Fastify server = a company headquarters.
Plugins = departments within the company.
Decorators = tools and resources given to departments.

WITHOUT FASTIFY-PLUGIN (ISOLATED DEPARTMENT):
  The Engineering department gets a 3D printer (decorator).
  Only Engineering can use it — it's inside their lab.
  HR walks in: "Where's the 3D printer?" → doesn't exist for them.
  This is good for department-specific tools: "the Engineering test suite."
  
  Code: fastify.register(async function engineeringPlugin(fastify) {
    fastify.decorate('printer3D', new Printer()); // Only Engineering has this
    fastify.get('/engineering/prototypes', handler); // Works ✓
  });
  fastify.get('/hr/assets', handler); // fastify.printer3D → undefined ✗

WITH FASTIFY-PLUGIN (SHARED COMPANY RESOURCE):
  The Facilities team installs a coffee machine (decorator) available to ALL.
  They use fp() to "donate" it to the company, not keep it in their room.
  Every department: fastify.coffeeMachine is available.
  
  Code: fp(async function facilitiesPlugin(fastify) {
    fastify.decorate('coffeeMachine', new CoffeeMachine());
  })
  // Now available everywhere in the company (root scope).

DECORATEREQUEST = PERSONAL EMPLOYEE BADGE:
  Decorators added to the Fastify instance: company-wide resources.
  decorateRequest: every employee (request) gets their own badge slot.
  
  fastify.decorateRequest('userId', null); // Pre-allocate the slot
  // In auth hook: request.userId = decodedToken.sub; // Fill the slot for this request
  
  Each request has its own isolated badge. Request A's userId doesn't affect Request B's.
  V8 optimization: pre-declaring the shape of request objects enables hidden class optimization.

PLUGIN DEPENDENCY = THE ONBOARDING CHECKLIST:
  New employee (plugin) starts: "Before I can work, I need a desk (db plugin) and
  a laptop (config plugin)."
  
  If the facilities team hasn't set up the desk: error during onboarding.
  Better to fail at startup with "Plugin 'db' not found" than fail at 3pm in production
  with "fastify.db is not a function."
  
  fp(myPlugin, { dependencies: ['my-db-plugin', 'my-config-plugin'] })
  → Fastify checks these are registered before myPlugin runs. Fail fast, fail clearly.

PLUGIN SCOPE TREE = THE ORG CHART:
  Root scope (CEO)
    ├── db plugin (fp) → shared with ALL below
    ├── auth plugin (fp) → shared with ALL below
    ├── Public API plugin (isolated)
    │     ├── own hooks (only apply here)
    │     └── /public/* routes
    └── Private API plugin (isolated)
          ├── own auth hook (uses root's auth plugin)
          └── /private/* routes
  
  Change in Public API plugin: doesn't affect Private API plugin (sibling isolation).
  db plugin changes: affects everything (fp propagated to root).
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — PLUGIN SYSTEM INTERNALS:
---------------------------------------------------

AVVIO (FASTIFY'S PLUGIN LOADER):
  Fastify uses avvio for async plugin loading. avvio guarantees:
  1. Plugins load in registration order.
  2. Each plugin fully initializes (its async function resolves) before the next loads.
  3. fastify.listen() waits for ALL plugins to load before accepting connections.
  
  This means: if your db plugin fails to connect at startup → server doesn't start.
  Much better than: server starts, first request fails because db isn't connected.

ENCAPSULATION IMPLEMENTATION:
  Each plugin receives a "child" Fastify instance — a new scope.
  Child inherits from parent: shared schemas, parent decorators.
  But: child scope additions are NOT reflected in parent.
  
  Under the hood: Fastify creates a prototype chain.
    parent.db = dbClient (via fp)
    child.__proto__ = parent → child.db = dbClient (inherited) ✓
    child.localTool = something → parent.localTool = undefined (child-only)
  
  Without fp: plugin's decorators stay on the child scope only.
  With fp: fastify-plugin sets the decorator on the PARENT scope instead of child.
    Effect: all children of the parent can see it (siblings too).

FASTIFY.DECORATE() vs MODULE VARIABLES:
  Module variable: const db = new DBClient(); exported and imported.
    Problem: tight coupling. Plugin A and Plugin B both import db directly.
    Testing: must mock the module. Complex.
    Scope: completely global. No isolation possible.
  
  fastify.decorate('db', dbClient):
    The db is attached to the Fastify instance.
    Test: create a new Fastify instance with a mock db decorator.
    Scope: follows plugin scope tree. Can be isolated or shared via fp.
    TypeScript: declare module 'fastify' { interface FastifyInstance { db: DBClient } }

DECORATEREQUEST AND HIDDEN CLASS OPTIMIZATION:
  V8 (Node.js JavaScript engine) optimizes objects with consistent shapes.
  "Hidden class": an internal V8 representation of an object's shape.
  
  fastify.decorateRequest('userId', null): pre-declares the property on every request.
    V8: all request objects have the same hidden class (same shape).
    → Optimized property access: O(1) direct slot access.
  
  Without decorateRequest, adding request.userId = value in a hook:
    V8: request object gets a new hidden class (shape changed at runtime).
    → Property transitions: slower, deoptimized access pattern.
    → At 10K req/s: measurable performance difference.
  
  Rule: ALWAYS use decorateRequest for any property you add to request objects.
    Even if it's just: fastify.decorateRequest('user', null)
    Before the hook sets: request.user = decodedToken.

PLUGIN REGISTRATION PATTERNS:
  Pattern 1 — Async function plugin:
    fastify.register(async function myPlugin(fastify, opts) {
      fastify.decorate('myTool', ...);
      fastify.addHook('preHandler', ...);
      fastify.get('/my-route', handler);
    }, { prefix: '/api', timeout: 5000 });
  
  Pattern 2 — Exported module plugin:
    // auth.js:
    async function authPlugin(fastify, opts) {
      const jwt = require('@fastify/jwt');
      await fastify.register(jwt, { secret: opts.jwtSecret });
      fastify.decorate('authenticate', authenticate);
    }
    // module.exports = fp(authPlugin, { name: 'my-auth', dependencies: ['my-config'] })
    
    // server.js:
    fastify.register(require('./plugins/auth'), { jwtSecret: process.env.JWT_SECRET });
  
  Pattern 3 — File-based plugin loading with @fastify/autoload:
    fastify.register(require('@fastify/autoload'), {
      dir: path.join(__dirname, 'plugins'),  // Loads all files in /plugins as fp plugins
      options: { ...configOptions }
    });
    fastify.register(require('@fastify/autoload'), {
      dir: path.join(__dirname, 'routes'),   // Loads all route files
    });

PLUGIN DEPENDENCIES AND ORDERING:
  avvio guarantees registration order.
  Dependencies must be registered BEFORE the dependent plugin.
  
  // Correct order:
  fastify.register(configPlugin);              // 1st: config
  fastify.register(dbPlugin);                 // 2nd: needs config
  fastify.register(authPlugin);               // 3rd: needs config + db
  fastify.register(userRoutes);               // 4th: needs auth + db
  
  // Wrong order:
  fastify.register(userRoutes);               // Error: fastify.db is undefined
  fastify.register(dbPlugin);                 // Too late!
  
  With fp dependencies: Fastify throws clear error at startup if order is wrong.
  Without dependencies: you get cryptic "fastify.db is not a function" at request time.
    `,
    code: `
// ===== PLUGIN SYSTEM & ENCAPSULATION — EXAMPLES =====

// EXAMPLE 1: Basic plugin encapsulation — with and without fp

// WITHOUT fastify-plugin (isolated scope):
// fastify.register(async function databasePlugin(fastify, opts) {
//   const db = new DatabaseClient(opts.connectionString);
//   await db.connect();
//   fastify.decorate('db', db);
//   // fastify.db available only within THIS plugin and its children
// });

// fastify.get('/health', async (request, reply) => {
//   return fastify.db.ping(); // ERROR! fastify.db is undefined here (outside plugin)
// });

// WITH fastify-plugin (shared with parent):
// const fp = require('fastify-plugin');
//
// const databasePlugin = fp(async function(fastify, opts) {
//   const db = new DatabaseClient(opts.connectionString);
//   await db.connect();
//   fastify.decorate('db', db);
//   // fastify.db now available in the PARENT scope and all siblings
// }, {
//   name: 'my-database',     // Plugin identifier (for error messages)
//   fastify: '>=4.0.0'       // Fastify version compatibility
// });
//
// fastify.register(databasePlugin, { connectionString: process.env.DATABASE_URL });
//
// fastify.get('/health', async () => {
//   return fastify.db.ping(); // Works! fp propagated db to root scope ✓
// });

// EXAMPLE 2: Complete plugin library — config, db, auth

// plugins/config.js:
// const fp = require('fastify-plugin');
// module.exports = fp(async function configPlugin(fastify) {
//   fastify.decorate('config', {
//     jwtSecret: process.env.JWT_SECRET,
//     dbUrl: process.env.DATABASE_URL,
//     redisUrl: process.env.REDIS_URL,
//     port: parseInt(process.env.PORT || '3000'),
//     env: process.env.NODE_ENV || 'development'
//   });
// }, { name: 'config' });

// plugins/database.js:
// const fp = require('fastify-plugin');
// const { drizzle } = require('drizzle-orm/node-postgres');
// const { Pool } = require('pg');
// module.exports = fp(async function dbPlugin(fastify) {
//   const pool = new Pool({ connectionString: fastify.config.dbUrl });
//   const db = drizzle(pool, { schema });
//   fastify.decorate('db', db);
//   fastify.addHook('onClose', async () => pool.end()); // Cleanup on server close
// }, {
//   name: 'database',
//   dependencies: ['config']  // Requires config plugin to be registered first
// });

// plugins/auth.js:
// const fp = require('fastify-plugin');
// module.exports = fp(async function authPlugin(fastify) {
//   await fastify.register(require('@fastify/jwt'), {
//     secret: fastify.config.jwtSecret
//   });
//   fastify.decorate('authenticate', async function(request, reply) {
//     try {
//       await request.jwtVerify();
//     } catch (err) {
//       reply.status(401).send({ error: 'Unauthorized' });
//     }
//   });
// }, {
//   name: 'auth',
//   dependencies: ['config']
// });

// EXAMPLE 3: Route plugin (NOT fp-wrapped — isolated scope)

// routes/orders.js:
// module.exports = async function orderRoutes(fastify, opts) {
//   // This route group's hooks don't affect other routes
//   fastify.addHook('preHandler', fastify.authenticate); // Uses auth from root scope

//   fastify.get('/', {
//     schema: {
//       querystring: { type: 'object', properties: { page: { type: 'integer', default: 1 } } }
//     }
//   }, async (request) => {
//     const orders = await fastify.db.query.orders.findMany({ // Uses db from root scope
//       where: eq(orders.customerId, request.user.id),
//       limit: 20, offset: (request.query.page - 1) * 20
//     });
//     return orders;
//   });

//   fastify.post('/', {
//     schema: { body: createOrderSchema }
//   }, async (request, reply) => {
//     const order = await fastify.db.insert(orders).values(request.body).returning();
//     return reply.status(201).send(order[0]);
//   });
// };

// server.js — registration order matters!
// fastify.register(require('./plugins/config'));   // 1: no deps
// fastify.register(require('./plugins/database')); // 2: needs config
// fastify.register(require('./plugins/auth'));      // 3: needs config
// fastify.register(require('./routes/orders'), { prefix: '/api/orders' }); // 4: needs db + auth

// EXAMPLE 4: decorateRequest — proper request-scoped state

// WRONG — no pre-declaration (V8 hidden class deoptimization):
// fastify.addHook('preHandler', async (request) => {
//   request.userId = decodedToken.sub; // Adding new property at runtime — BAD
// });

// CORRECT — pre-declare shape, then fill:
// fastify.decorateRequest('user', null);         // Pre-declare
// fastify.decorateRequest('tenantId', null);     // Pre-declare

// fastify.addHook('preHandler', async (request) => {
//   const token = await request.jwtVerify();
//   request.user = token;            // Fill pre-declared slot
//   request.tenantId = token.tenantId; // Fill pre-declared slot
// });

// TypeScript: extend the interface
// declare module 'fastify' {
//   interface FastifyRequest {
//     user: { id: number; email: string; role: string };
//     tenantId: number;
//   }
// }

// EXAMPLE 5: Conditional plugin registration

// const fastify = Fastify({ logger: true });
//
// fastify.register(require('./plugins/config'));
//
// if (process.env.NODE_ENV !== 'test') {
//   // Don't connect to real DB in tests:
//   fastify.register(require('./plugins/database'));
//   fastify.register(require('./plugins/redis'));
// } else {
//   // Register mock decorators for tests:
//   fastify.register(fp(async function mockDb(fastify) {
//     fastify.decorate('db', createMockDb());
//   }), { name: 'database' });
// }
//
// fastify.register(require('./plugins/auth'));

// EXAMPLE 6: Plugin with options

// const myPlugin = fp(async function(fastify, opts) {
//   const {
//     prefix = '/api',
//     cacheTimeout = 300,
//     maxConnections = 10,
//     required = []    // Required option validation
//   } = opts;

//   for (const field of required) {
//     if (!opts[field]) throw new Error(\`Plugin requires option: \${field}\`);
//   }

//   fastify.decorate('cache', createCache({ timeout: cacheTimeout }));
// }, { name: 'my-plugin' });

// fastify.register(myPlugin, {
//   cacheTimeout: 600,
//   maxConnections: 20,
//   required: ['apiKey'],
//   apiKey: process.env.EXTERNAL_API_KEY
// });

// EXAMPLE 7: onClose hook for cleanup

// const fp = require('fastify-plugin');
// module.exports = fp(async function redisPlugin(fastify, opts) {
//   const redis = createRedisClient({ url: fastify.config.redisUrl });
//   await redis.connect();

//   fastify.decorate('redis', redis);

//   // Cleanup when server closes (graceful shutdown):
//   fastify.addHook('onClose', async (instance) => {
//     await instance.redis.disconnect();
//     fastify.log.info('Redis disconnected');
//   });
// }, { name: 'redis', dependencies: ['config'] });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM PLUGIN SYSTEM MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: Missing fp() — decorator undefined outside plugin
  Scenario: Database plugin registered without fp():
    fastify.register(async function dbPlugin(fastify) {
      fastify.decorate('db', new DatabaseClient());
    });
    Routes registered AFTER but as siblings (not children) couldn't access fastify.db.
    Error at startup: "fastify.db is not a function" for the first request.
    Took hours to debug because it worked locally (different registration pattern).
  Root cause: Without fp(), decorator scoped to plugin scope. Sibling routes = different scope.
  Fix: Wrap the plugin with fp():
    module.exports = fp(async function dbPlugin(fastify) {
      fastify.decorate('db', new DatabaseClient());
    });
    Now fastify.db available in parent scope and all children.

BUG 2: decorateRequest missing — V8 deoptimization at scale
  Scenario: Auth hook added request properties without decoration:
    fastify.addHook('preHandler', async (request) => {
      request.userId = token.sub;
      request.orgId = token.orgId;
      request.permissions = token.permissions;
    });
    At 5K req/s in development: fine. At 50K req/s in production: CPU usage 40% higher than expected.
    V8 profiling showed: request object property access was deoptimized (megamorphic).
  Root cause: Adding new properties to request objects without pre-declaring them.
    V8 can't maintain a stable hidden class → slow dictionary-mode property access.
  Fix:
    fastify.decorateRequest('userId', null);
    fastify.decorateRequest('orgId', null);
    fastify.decorateRequest('permissions', null);
    // Then in hook: fill the pre-declared slots
    CPU usage dropped back to expected levels.

BUG 3: Plugin loading order — db not available when auth plugin tries to use it
  Scenario: Auth plugin needed to query the database for user permissions:
    fastify.register(authPlugin); // 1st — but tries to use fastify.db!
    fastify.register(dbPlugin);   // 2nd — too late!
    
    At startup: authPlugin ran, tried to access fastify.db, got undefined.
    Error: "Cannot read property 'query' of undefined" during startup.
  Root cause: avvio loads plugins in registration order. authPlugin loaded before dbPlugin.
    By the time authPlugin ran, dbPlugin hadn't decorated the instance yet.
  Fix: Register in dependency order:
    fastify.register(configPlugin);    // No dependencies
    fastify.register(dbPlugin);        // Depends on: config
    fastify.register(authPlugin);      // Depends on: config, db
    + Add dependencies declaration: fp(authPlugin, { dependencies: ['database'] })

BUG 4: Reusing decorator name across plugins — FST_ERR_DEC_ALREADY_PRESENT
  Scenario: Two developer teams independently built plugins for the same project.
    Team A: fp(plugin, { name: 'storage' }) that decorates fastify with fastify.storage.
    Team B: fp(plugin, { name: 'files' }) that also decorates fastify with fastify.storage.
    Both registered in the server. Second registration: Fastify throws FST_ERR_DEC_ALREADY_PRESENT.
    Server fails to start. Production deployment failed.
  Root cause: Decorator names are unique per scope. Two fp-wrapped plugins adding same name = error.
  Fix options:
    1. Rename: Team B uses fastify.fileStorage instead of fastify.storage.
    2. Merge: combine both into one storage plugin.
    3. Check first: if (!fastify.hasDecorator('storage')) fastify.decorate('storage', ...)
       But: hasDecorator should be the exception, not the pattern.
  Prevention: maintain a registry of decorator names in your codebase's docs.

BUG 5: Route plugin wrapped with fp() — hooks leak to other routes
  Scenario: Admin routes plugin wrapped with fp() "to make it available everywhere":
    module.exports = fp(async function adminRoutes(fastify) {
      fastify.addHook('preHandler', adminOnlyCheck); // Added with fp scope
      fastify.get('/admin/users', adminHandler);
    });
    
    The fp() made the hook propagate to the parent scope.
    adminOnlyCheck now runs on EVERY route in the application!
    Regular users got 403 Forbidden on /products, /orders, etc.
  Root cause: fp() propagates everything to parent — including hooks.
    Route plugins should NEVER be wrapped with fp().
    fp() is only for utility plugins (db, auth, cache) that provide shared decorators.
  Fix: Remove fp() from route plugins:
    module.exports = async function adminRoutes(fastify) {  // No fp()!
      fastify.addHook('preHandler', adminOnlyCheck); // Scoped to this plugin only
      fastify.get('/admin/users', adminHandler);
    };
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE SCOPE:
  Given this server setup, which routes can access which decorators?

  fastify.register(fp(async function pluginA(f) { f.decorate('toolA', 'A'); }));

  fastify.register(async function pluginB(f) {
    f.decorate('toolB', 'B');  // No fp

    f.register(async function pluginC(f) {
      f.decorate('toolC', 'C');  // No fp
      f.get('/c', async () => ({ a: f.toolA, b: f.toolB, c: f.toolC })); // Route in C
    });

    f.get('/b', async () => ({ a: f.toolA, b: f.toolB, c: f.toolC })); // Route in B
  });

  fastify.get('/root', async () => ({ a: fastify.toolA, b: fastify.toolB, c: fastify.toolC }));

  For each route:
  a) GET /root → which of toolA, toolB, toolC are defined? What are the values?
  b) GET /b → which tools are defined?
  c) GET /c → which tools are defined?
  d) If pluginA had NO fp(), what changes for all routes?
  e) If pluginB HAD fp(), what changes?

CHALLENGE 2 — FIX THE PLUGIN BUGS:
  This server has 3 plugin-related bugs. Find and fix each.

  // Bug 1: Missing fp on shared utility plugin
  fastify.register(async function cachePlugin(fastify) {
    fastify.decorate('cache', new RedisCache());
  });
  fastify.get('/products', async () => fastify.cache.get('products')); // cache is undefined!

  // Bug 2: Wrong order — routes before dependencies
  fastify.register(userRoutes);    // Uses fastify.db and fastify.authenticate
  fastify.register(dbPlugin);      // Should be first!
  fastify.register(authPlugin);    // Should be second!

  // Bug 3: Adding request property without decorateRequest
  fastify.addHook('preHandler', async (request) => {
    request.startTime = Date.now();
    request.requestId = generateUUID();
  });
  // What's wrong? How does this affect V8 performance?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete plugin architecture for a multi-tenant SaaS API.

  Required plugins (all fp-wrapped):
  1. config plugin: loads from environment, validates required vars, decorates fastify.config
  2. database plugin: Drizzle connection, graceful shutdown, decorates fastify.db
     - Depends on: config
  3. redis plugin: cache + pub/sub, graceful shutdown, decorates fastify.redis
     - Depends on: config
  4. auth plugin: JWT verification, decorates fastify.authenticate (async function)
     and fastify.optionalAuthenticate (doesn't throw if no token)
     - Depends on: config, database (to look up users)
  5. tenant plugin: extracts tenant from JWT, validates tenant exists, decorates fastify.getTenant()
     - Depends on: auth, database

  Required route plugins (NOT fp-wrapped):
  6. publicRoutes: /health, /auth/login, /auth/register (no auth needed)
  7. userRoutes: /users/*, requires auth + tenant context
  8. adminRoutes: /admin/*, requires auth + admin role check

  Show: server.js with correct registration order, TypeScript interface declarations
  for all decorators, decorateRequest declarations for request.user and request.tenant.
    `,
    summary: `Fastify's plugin system provides surgical control over what code has access to what — fp() plugins share decorators globally while non-fp route plugins remain isolated, enabling the "plugin per concern" architecture where database, auth, and cache are registered once and reused everywhere while route groups remain independently testable. The two rules that prevent the most production bugs: always use fp() for utility plugins and never use fp() for route plugins, and always pre-declare request properties with decorateRequest() before setting them in hooks.`
  },

  {
    id: 5,
    title: "Route Patterns & Versioning",
    tag: "ORGANIZING, CONSTRAINING, AND VERSIONING YOUR API ENDPOINTS",
    color: "#BE123C",
    tldr: `Fastify routes support rich definition patterns — shorthand methods (fastify.get/post/put/delete/patch), full route objects, route-level schema and hooks, prefix-based grouping with register(), URL versioning via Accept-Version headers, and constraint-based routing (host-based routing for multi-tenant APIs). Understanding route registration patterns enables building maintainable, versioned APIs that can evolve without breaking existing clients.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I group related routes under a common prefix like /api/v1?"
  → fastify.register(routes, { prefix: '/api/v1' }): all routes inside get the prefix automatically.
  → No need to manually prepend prefix to every route URL.
  → Nested prefixes work: register with /api/v1 inside already has /api prefix → /api/api/v1.
    Watch for accidental double-prefixing.

"How do I version my API so v1 and v2 can coexist for clients?"
  → Two approaches: URL versioning (/v1/users, /v2/users) or header versioning.
  → Fastify header versioning: { constraints: { version: '1.0.0' } } + client sends Accept-Version: 1.x.x.
  → URL versioning: simpler, more common. Just register route groups under different prefixes.
  → Header versioning: more RESTful, supported natively by Fastify's constraint system.

"I have the same route path registered twice — which one runs?"
  → Same method + same path: the FIRST registered one wins (Fastify uses trie — first match).
  → BUT: with version constraints or host constraints, they can coexist as they match different requests.
  → Without constraints: registering duplicate path/method is an error in strict mode.

"What's the difference between shorthand and full route definition?"
  → Shorthand: fastify.get('/path', handler) — quick, no schema, no hooks.
  → Full: fastify.route({ method: 'GET', url: '/path', schema: {...}, preHandler: [...], handler })
  → Shorthand with options: fastify.get('/path', { schema: {...} }, handler) — most common pattern.
  → Full route: useful when building routes dynamically or when many options needed.

"Can I add hooks to just one specific route without affecting others?"
  → Yes: route-level hooks in the options object.
  → fastify.get('/route', { preHandler: [specificHook] }, handler)
  → Route-level hooks run AFTER scope-level hooks of the same type.
  → Multiple hooks: provide an array: preHandler: [hook1, hook2, hook3].
    `,
    analogy: `
THE BUILDING DIRECTORY ANALOGY:
---------------------------------
API routes = offices in a building.
fastify.register with prefix = a floor of the building.
Versioning = renovated floors (old floor kept for existing tenants, new floor for new ones).

PREFIX REGISTRATION = NUMBERING FLOORS:
  Without prefix:
    Office at room 101, 102, 103 — scattered, hard to navigate.
    fastify.get('/users', ...), fastify.get('/products', ...) — all at root.
  
  With prefix:
    fastify.register(userRoutes, { prefix: '/api/v1/users' })
    → All rooms on the "users floor": 
      /api/v1/users/ (lobby), /api/v1/users/:id (specific office), etc.
    Consistent. Easy to navigate. Each floor (plugin) manages its own rooms.

NESTED PREFIXES = SUBFLOORS:
  fastify.register(async function api(f) {
    f.register(userRoutes, { prefix: '/users' });  // Subfloor within /api
    f.register(orderRoutes, { prefix: '/orders' }); // Another subfloor
  }, { prefix: '/api/v1' }); // The floor itself
  
  Result: /api/v1/users, /api/v1/orders — nested automatically.

VERSIONING = KEEPING OLD AND NEW FLOORS SIMULTANEOUSLY:
  Building renovated from floor 1 to floor 2 (API v1 to v2).
  Old tenants (legacy clients): still live on floor 1 (v1).
  New tenants (new clients): move to floor 2 (v2, improved layout).
  Same elevator (same URL), but: "Which floor please?"
  Client: sends "Accept-Version: 1.x.x" → elevator goes to floor 1 (old version).
  New client: sends "Accept-Version: 2.x.x" → elevator goes to floor 2 (new version).
  
  Both versions coexist. Old clients not broken. New clients get improvements.

ROUTE CONSTRAINTS = DOOR POLICIES:
  Some offices have additional entry requirements beyond just the floor:
  Host constraint: "This office only serves visitors from myapp.com domain."
    fastify.get('/settings', { constraints: { host: 'admin.myapp.com' } }, adminHandler)
    fastify.get('/settings', { constraints: { host: 'app.myapp.com' } }, userHandler)
    Same path, different door policy, different room.
  
  Version constraint: "This office serves clients with version badge 1.x."
    fastify.get('/users', { constraints: { version: '1.0.0' } }, v1Handler)
    fastify.get('/users', { constraints: { version: '2.0.0' } }, v2Handler)
    Same address. Different version badge. Different room.

SHORTHAND vs FULL ROUTE = EXPRESS CHECKOUT vs FULL SERVICE:
  Shorthand: "I'll take the usual" — fastify.get('/health', handler). No schema, no hooks.
    Great for: simple endpoints, health checks, prototyping.
  Full route: "I need the full specification" — fastify.route({ method, url, schema, hooks, handler }).
    Great for: production routes, when schema + multiple hooks + options needed.
  Shorthand with options: "The usual with extra sauce" — fastify.get('/products', { schema, preHandler }, handler).
    The most common pattern: shorthand syntax + options object.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ROUTE INTERNALS AND VERSIONING:
---------------------------------------------------------

ROUTE REGISTRATION INTERNALS:
  When you register a route, Fastify:
  1. Adds the route to find-my-way trie with method + URL + constraints.
  2. Compiles the schema (if provided) via AJV and fast-json-stringify.
  3. Builds a handler chain: [lifecycle hooks] + [route hooks] + [handler].
  4. Associates everything with the current scope.
  
  Trie storage per route: { method, handler, hooks, schema, constraints }
  Route matching: method check → trie path match → constraint check → handler invoked.

FASTIFY.ROUTE() OPTIONS:
  fastify.route({
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | string[],
    url: '/path/:param',
    schema: { body, querystring, params, headers, response },
    attachValidation: false,    // If true: validation errors attached to request instead of throwing
    validatorCompiler: fn,      // Override AJV for this route
    serializerCompiler: fn,     // Override fast-json-stringify for this route
    bodyLimit: 1048576,         // Per-route body size limit
    logLevel: 'debug',          // Per-route log level
    config: { custom: 'data' }, // Accessible via request.routeConfig
    version: '1.0.0',           // Shorthand for constraints.version
    constraints: {
      version: '1.0.0',         // Semver constraint for Accept-Version header
      host: 'api.myapp.com'     // Host constraint
    },
    // Lifecycle hooks (all accept single function or array):
    onRequest: fn | fn[],
    preParsing: fn | fn[],
    preValidation: fn | fn[],
    preHandler: fn | fn[],
    preSerialization: fn | fn[],
    onSend: fn | fn[],
    onResponse: fn | fn[],
    onError: fn,
    handler: async (request, reply) => {}
  });

URL VERSIONING (SEMVER WITH ACCEPT-VERSION):
  Fastify uses semver-compatible matching for version constraints.
  
  Client sends: Accept-Version: 1.x.x or Accept-Version: 1.5.0 or Accept-Version: ^1.0.0
  Server registered: constraints: { version: '1.5.0' }
  
  Matching: Accept-Version: 1.x.x matches version '1.5.0' (any 1.x patch is fine)
  
  Multiple versions coexisting:
    fastify.get('/users/:id', { constraints: { version: '1.0.0' } }, v1GetUser)
    fastify.get('/users/:id', { constraints: { version: '2.0.0' } }, v2GetUser)
    
    GET /users/42 with Accept-Version: 1.x.x → v1GetUser
    GET /users/42 with Accept-Version: 2.x.x → v2GetUser
    GET /users/42 with no Accept-Version → 404 (no default match when versions defined)
    
    To add a default: register without version constraint as fallback
    OR: use URL versioning instead.

HOST-BASED ROUTING (MULTI-TENANT):
  fastify.get('/dashboard', { constraints: { host: 'tenant1.myapp.com' } }, tenant1Handler)
  fastify.get('/dashboard', { constraints: { host: 'tenant2.myapp.com' } }, tenant2Handler)
  
  Use case: single Fastify server handling multiple subdomains.
  Combined with route params: host matching + tenant ID extraction.
  
  Configuration: make sure Fastify has trustProxy: true if behind a load balancer,
  and that the Host header is correctly forwarded.

CUSTOM CONSTRAINTS:
  Beyond version and host, you can define custom constraints:
  
  fastify.addConstraintStrategy({
    name: 'accept',
    storage: function() {
      const handlers = {};
      return {
        get: (type) => handlers[type] || null,
        set: (type, store) => { handlers[type] = store; }
      };
    },
    deriveConstraint: (req, ctx, done) => done(null, req.headers['accept'])
  });
  
  // Route matches only when Accept: application/json
  fastify.get('/data', { constraints: { accept: 'application/json' } }, jsonHandler)
  fastify.get('/data', { constraints: { accept: 'text/xml' } }, xmlHandler)

ROUTE CONFIG AND REQUEST.ROUTECONFIG:
  Routes can carry custom metadata via config:
    fastify.get('/public/posts', { config: { public: true } }, handler)
    fastify.get('/private/orders', { config: { public: false, requiredRole: 'user' } }, handler)
  
  Access in hooks:
    fastify.addHook('preHandler', async (request, reply) => {
      if (request.routeConfig.public) return; // Skip auth for public routes
      await authenticateRequest(request, reply);
    });
  
  This pattern: skip auth for public routes without registering separate plugins.
  More flexible than scope-based isolation for mixed public/private route groups.

ATTACH VALIDATION (CUSTOM VALIDATION HANDLING):
  By default: validation failure → Fastify auto-sends 400 + error details.
  With attachValidation: true: validation failure stored in request.validationError.
  Handler decides what to do:
  
  fastify.post('/flexible', {
    schema: { body: { type: 'object', properties: { name: { type: 'string' } } } },
    attachValidation: true
  }, async (request, reply) => {
    if (request.validationError) {
      // Custom handling:
      return reply.status(400).send({ error: 'Please provide a valid name', hint: '...' });
    }
    return doSomething(request.body);
  });
    `,
    code: `
// ===== ROUTE PATTERNS & VERSIONING — EXAMPLES =====

// EXAMPLE 1: Shorthand vs full route definition comparison

// Shorthand (most common):
// fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
// fastify.post('/users', { schema: createUserSchema }, createUserHandler);
// fastify.put('/users/:id', { schema: updateUserSchema, preHandler: [authenticate] }, updateUserHandler);
// fastify.delete('/users/:id', { preHandler: [authenticate, adminOnly] }, deleteUserHandler);
// fastify.patch('/users/:id/status', { schema: statusSchema }, updateStatusHandler);

// Full route definition (for complex cases):
// fastify.route({
//   method: ['GET', 'HEAD'],  // Multiple methods on same route
//   url: '/users/:id',
//   schema: {
//     params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
//     response: { 200: { \$ref: 'User#' }, 404: { \$ref: 'Error#' } }
//   },
//   preHandler: [authenticate, checkUserExists],
//   config: { cacheTime: 60 },   // Custom metadata accessible in hooks
//   handler: async (request, reply) => {
//     const user = await fastify.db.getUser(request.params.id);
//     return user;
//   }
// });

// EXAMPLE 2: Prefix-based route grouping with register

// User routes file: routes/users.js
// module.exports = async function userRoutes(fastify, opts) {
//   fastify.get('/', async (request) => {
//     // GET /api/v1/users
//     const { page = 1, limit = 20 } = request.query;
//     return fastify.db.getUsers(page, limit);
//   });

//   fastify.get('/:id', {
//     schema: {
//       params: { type: 'object', properties: { id: { type: 'integer' } } }
//     }
//   }, async (request) => {
//     // GET /api/v1/users/:id
//     return fastify.db.getUser(request.params.id);
//   });

//   fastify.post('/', {
//     schema: { body: createUserSchema }
//   }, async (request, reply) => {
//     // POST /api/v1/users
//     const user = await fastify.db.createUser(request.body);
//     return reply.status(201).send(user);
//   });
// };

// server.js:
// fastify.register(require('./routes/users'), { prefix: '/api/v1/users' });
// fastify.register(require('./routes/products'), { prefix: '/api/v1/products' });
// fastify.register(require('./routes/orders'), { prefix: '/api/v1/orders' });

// EXAMPLE 3: Nested prefixes for versioned API

// fastify.register(async function v1Api(fastify) {
//   fastify.register(require('./routes/v1/users'), { prefix: '/users' });
//   fastify.register(require('./routes/v1/products'), { prefix: '/products' });
//   // All routes get: /v1/users/*, /v1/products/*
// }, { prefix: '/v1' });

// fastify.register(async function v2Api(fastify) {
//   fastify.register(require('./routes/v2/users'), { prefix: '/users' });   // Redesigned
//   fastify.register(require('./routes/v1/products'), { prefix: '/products' }); // Same as v1!
//   // All routes get: /v2/users/*, /v2/products/*
// }, { prefix: '/v2' });

// EXAMPLE 4: Accept-Version header versioning

// V1 API — returns basic user info:
// fastify.get('/users/:id', {
//   constraints: { version: '1.0.0' }
// }, async (request) => {
//   const user = await fastify.db.getUser(request.params.id);
//   return { id: user.id, name: user.name, email: user.email };
// });

// V2 API — returns extended user info with nested data:
// fastify.get('/users/:id', {
//   constraints: { version: '2.0.0' }
// }, async (request) => {
//   const user = await fastify.db.getUserWithProfile(request.params.id);
//   return {
//     id: user.id, name: user.name, email: user.email,
//     profile: user.profile,       // New in v2
//     orderCount: user.orderCount, // New in v2
//     createdAt: user.createdAt    // New in v2
//   };
// });

// Client usage:
// fetch('/users/42', { headers: { 'Accept-Version': '1.x.x' } }) → v1 response
// fetch('/users/42', { headers: { 'Accept-Version': '2.x.x' } }) → v2 response

// EXAMPLE 5: Host-based routing for multi-tenant API

// Tenant routing based on subdomain:
// fastify.addHook('onRequest', async (request, reply) => {
//   const host = request.hostname;    // e.g., 'flipkart.myapp.com'
//   const tenantSlug = host.split('.')[0]; // 'flipkart'
//   request.tenantSlug = tenantSlug;
// });

// fastify.get('/dashboard', {
//   constraints: { host: 'admin.myapp.com' }
// }, adminDashboardHandler);

// fastify.get('/dashboard', {
//   constraints: { host: /.*\\.myapp\\.com\$/ }  // Regex host match
// }, tenantDashboardHandler);

// EXAMPLE 6: Route config for conditional hooks

const routes = [
  { path: '/health', config: { public: true } },
  { path: '/auth/login', config: { public: true } },
  { path: '/users', config: { public: false, roles: ['admin'] } },
  { path: '/orders', config: { public: false, roles: ['user', 'admin'] } }
];

// fastify.addHook('onRequest', async (request, reply) => {
//   if (request.routeConfig?.public) return; // Skip auth entirely for public routes
//   const token = await verifyToken(request.headers.authorization);
//   if (!token) throw fastify.httpErrors.unauthorized();
//   request.user = token;
// });

// fastify.addHook('preHandler', async (request, reply) => {
//   const requiredRoles = request.routeConfig?.roles;
//   if (!requiredRoles?.length) return; // No role requirement
//   if (!requiredRoles.includes(request.user?.role)) {
//     throw fastify.httpErrors.forbidden(\`Requires one of: \${requiredRoles.join(', ')}\`);
//   }
// });

// EXAMPLE 7: Dynamic route registration and attachValidation

// Dynamic route generation from config:
// const resources = ['users', 'products', 'orders', 'categories'];
//
// for (const resource of resources) {
//   fastify.register(async function resourceRoutes(fastify) {
//     fastify.get('/', async (req) => db.list(resource, req.query));
//     fastify.get('/:id', async (req) => db.get(resource, req.params.id));
//     fastify.post('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
//       const item = await db.create(resource, req.body);
//       return reply.status(201).send(item);
//     });
//   }, { prefix: \`/\${resource}\` });
// }

// attachValidation for graceful fallback:
// fastify.post('/import', {
//   schema: {
//     body: {
//       type: 'object',
//       required: ['data'],
//       properties: { data: { type: 'array' }, format: { type: 'string' } }
//     }
//   },
//   attachValidation: true  // Don't auto-reject — let handler decide
// }, async (request, reply) => {
//   if (request.validationError) {
//     // Attempt to auto-fix common issues:
//     if (typeof request.body?.data === 'string') {
//       try {
//         request.body.data = JSON.parse(request.body.data); // Auto-parse stringified JSON
//       } catch {
//         return reply.status(400).send({ error: 'Invalid data format' });
//       }
//     } else {
//       return reply.status(400).send({ error: request.validationError.message });
//     }
//   }
//   return processImport(request.body);
// });
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ROUTE PATTERN MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: Double prefix from nested register — /api/api/v1/users
  Scenario: Developer organized routes:
    fastify.register(apiPlugin, { prefix: '/api' });
    // Inside apiPlugin:
    fastify.register(userRoutes, { prefix: '/api/v1/users' }); // WRONG: includes /api again!
    
    Resulting route: /api/api/v1/users — double prefix.
    GET /api/v1/users → 404 (correct path not registered).
    Support ticket: "All user APIs returning 404."
  Root cause: Prefix is APPENDED to the current scope's prefix.
    If parent already has /api, child should use relative prefix: '/v1/users'.
  Fix:
    // Inside apiPlugin, use relative paths:
    fastify.register(userRoutes, { prefix: '/v1/users' }); // → /api/v1/users ✓
    // OR: no prefix in parent, full prefix in child register call from root.

BUG 2: Version constraint with no default — clients without Accept-Version get 404
  Scenario: API migrated to version constraints:
    fastify.get('/products', { constraints: { version: '2.0.0' } }, v2Handler);
    // Old v1 handler removed. No default route.
    
    Legacy mobile app that doesn't send Accept-Version: hit 404.
    5% of users on old app version: all product pages broke.
  Root cause: When version constraints are used, Fastify requires the header.
    No matching version → 404 (not a fallback to latest).
  Fix options:
    1. Add a default (no constraint) handler as fallback:
       fastify.get('/products', v2Handler); // Default for clients without version header
       fastify.get('/products', { constraints: { version: '1.0.0' } }, v1Handler);
    2. Use URL versioning instead: /v1/products, /v2/products.
       Old app uses /v1/products, new app uses /v2/products. No header needed.
    3. Add an onRequest hook to inject default Accept-Version for headerless requests.

BUG 3: Route-level preHandler replacing scope preHandler instead of adding
  Scenario: Global auth preHandler registered at root scope.
    Route added with preHandler option for additional check:
    fastify.post('/admin/action', {
      preHandler: [adminCheck]  // Developer thought: "add adminCheck AFTER auth"
    }, handler);
    
    But in older Fastify versions (or misunderstanding):
    The scope's preHandler (auth) was REPLACED by [adminCheck].
    Route handler ran without authentication!
  Root cause: In some Fastify versions, route-level preHandler ADDS to scope hooks (correct behavior).
    But if scope hooks and route hooks have naming confusion, or wrong scope, order can be unexpected.
  Investigation: always verify hook execution order with logging.
  Prevention:
    fastify.log.debug(request.routeOptions, 'Route options'); // Log to see all hooks
    Write integration tests that verify auth runs before route handler.
    Test: unauthenticated request to admin route → must return 401.

BUG 4: Dynamic route registration in a loop — closure over loop variable
  Scenario: Dynamic routes generated from array:
    const methods = ['GET', 'POST', 'PUT'];
    for (let i = 0; i < methods.length; i++) {
      fastify.route({
        method: methods[i],
        url: '/data',
        handler: async () => ({ method: methods[i] }) // Closure over i!
      });
    }
    All three routes returned { method: undefined } because methods[3] = undefined
    (loop ended at i=3 but closure captured the variable i, not the value).
  Root cause: Classic JavaScript closure bug with var/let in loops.
  Fix: Use destructuring to capture the value, not the variable:
    for (const method of methods) {
      fastify.route({
        method,
        url: '/data',
        handler: async () => ({ method }) // Captures 'method' value at time of creation
      });
    }

BUG 5: Conflicting route registration with different params — wrong handler called
  Scenario: Two routes registered:
    fastify.get('/orders/pending', pendingOrdersHandler);
    fastify.get('/orders/:id', getOrderByIdHandler);
    
    GET /orders/pending → developer expected pendingOrdersHandler.
    But: /orders/:id registered FIRST in the file due to module load order.
    find-my-way matched /orders/:id with params: { id: 'pending' }.
    getOrderByIdHandler received id = 'pending', tried db.getOrder('pending') → error!
  Root cause: Registration order matters for overlapping routes.
    Static routes (/orders/pending) must be registered BEFORE parameterized routes (/orders/:id).
    find-my-way actually handles this correctly (static takes precedence over params)
    BUT only when both are registered. If parameterized registered first AND static not yet registered:
    no conflict — but the static route doesn't exist at match time.
  Fix: Register specific/static routes before generic/parameterized ones.
    Or: use explicit ordering in route files.
    Fastify's find-my-way does prefer static over params correctly when both registered,
    so this is mainly a "make sure static routes are registered" issue.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE ROUTE MATCHING:
  Server setup:
  fastify.register(async function api(f) {
    f.register(async function v1(f) {
      f.get('/users', usersListHandler);
      f.get('/users/:id', userByIdHandler);
      f.get('/users/me', currentUserHandler);  // registered AFTER :id!
    }, { prefix: '/v1' });
  }, { prefix: '/api' });

  fastify.get('/health', healthHandler);

  For each request, which handler is called? And what are the params?
  a) GET /api/v1/users → handler: ___, params: ___
  b) GET /api/v1/users/42 → handler: ___, params: ___
  c) GET /api/v1/users/me → handler: ___, params: ___
     (Trick question! What's the issue with this registration order?)
  d) GET /health → handler: ___, registered with which prefix?
  e) GET /v1/users → handler: ___ (does this match anything?)
  f) What fix makes /users/me work as intended?

CHALLENGE 2 — FIX THE ROUTE BUGS:
  This versioned API setup has 3 bugs. Find and fix each.

  // Bug 1: Double prefix
  fastify.register(async function apiRoutes(fastify) {
    fastify.register(productRoutes, { prefix: '/api/v1/products' }); // Wrong
  }, { prefix: '/api' });

  // Bug 2: Version constraint with no default
  fastify.get('/orders', { constraints: { version: '2.0.0' } }, v2OrdersHandler);
  // Old clients (no Accept-Version header) get 404. Fix: add default handler

  // Bug 3: Route-specific preHandler not combining with scope preHandler
  fastify.register(async function privateRoutes(fastify) {
    fastify.addHook('preHandler', authHook);  // Scope auth

    fastify.get('/admin', {
      preHandler: [adminCheck]  // Intended: auth + adminCheck
    }, adminHandler);
    // Q: Does authHook run before adminCheck, or is authHook skipped?
    // Explain the actual behavior and how to verify it.
  });

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a complete versioned API server for a ride-sharing app (like Ola).

  Structure:
  - v1 API: /api/v1/* (original version, still supported)
  - v2 API: /api/v2/* (new version with additional fields)
  - Admin API: separate subdomain routing admin.ola-api.com

  V1 Routes:
  - GET /api/v1/rides?status=active&page=1 → { rides: [{ id, driver, pickup, destination, fare }] }
  - POST /api/v1/rides → book a ride (body: { pickupLat, pickupLng, destLat, destLng })
  - GET /api/v1/rides/:id → single ride details
  - PATCH /api/v1/rides/:id/cancel → cancel a ride

  V2 Routes (same paths, extended responses):
  - GET /api/v2/rides/:id → adds: { driver.rating, driver.totalRides, estimatedArrival, surgeMultiplier }
  - POST /api/v2/rides → adds: { preferredCarType, scheduledTime, paymentMethod }

  Admin Routes (host constraint: admin.ola-api.com):
  - GET /rides → all rides with internal fields
  - PATCH /rides/:id/override → force-update ride status

  Requirements:
  - Use register() with prefix for route grouping
  - Use route config: { public: true/false, version: 'v1'/'v2' } for hook behavior
  - V2 routes reuse V1 handlers where logic is the same (don't duplicate)
  - Admin routes use host constraint
  - All routes have appropriate schemas with TypeScript generics
    `,
    summary: `Route organization in Fastify is about leveraging register() with prefix for grouping, constraints for versioning, and route-level config for per-route metadata that drives hook behavior. The two patterns that save the most maintenance pain: use prefix-based URL versioning (/v1, /v2) over header versioning for simpler client compatibility, and use request.routeConfig.public rather than separate plugins for mixing public and private routes in the same module.`
  }
];
