const concepts = [
  {
    id: 11,
    title: "Modules — ESM vs CommonJS",
    tag: "THE IMPORT/EXPORT BATTLEFIELD",
    color: "#0EA5E9",
    tldr: `JavaScript has two module systems: CommonJS (Node.js's original, synchronous require/module.exports) and ESM (the modern standard, static import/export). ESM enables tree-shaking, live bindings, and async loading — CommonJS cannot. Understanding the difference is critical for writing code that bundles correctly, loads fast, and doesn't silently break with circular dependencies.`,
    problem: `Why does this break in a browser but work in Node?
  const fs = require("fs"); // ReferenceError in browser — no require!

Why does my bundled app include code I never call?
  // Named exports enable tree-shaking; default exports from barrels often don't

Why does circular dependency give undefined instead of the value?
  // a.js: const b = require("./b"); exports.x = 10;
  // b.js: const a = require("./a"); console.log(a.x); // undefined!

Why does dynamic import() return a Promise?
  const module = await import("./heavy-chart.js"); // loads lazily on demand

Why does my Vite build ship 500KB when I only use one function from lodash?
  // Side-effect imports, no tree-shaking, CommonJS interop issues

These questions span every modern JavaScript project.
Getting modules wrong means shipping bloated bundles, broken production deploys,
and circular-dependency nightmares that are nearly impossible to debug.`,
    analogy: `CommonJS is like ordering food via phone call (synchronous):
  You call the restaurant (require), wait on the line while they prepare (blocks execution),
  and receive the complete meal before you hang up (fully loaded module object).
  Works great at home (Node.js server), but terrible at a busy street food stall
  where you'd block everyone behind you.

ESM is like placing a pre-order via an app (static + async):
  At app startup, the system reads ALL your pre-orders (static analysis at parse time).
  It knows EXACTLY what every module needs before executing anything.
  Heavy items (dynamic import()) are flagged for delivery later — you keep moving.
  The menu is LIVE — if a restaurant updates a dish (live binding),
  you see the updated version automatically.

Tree-shaking:
  Imagine you order from a buffet. CommonJS = you take the ENTIRE buffet home.
  ESM = you tell the chef exactly which dishes you want; unused dishes stay in the kitchen.

Circular dependencies:
  A calls B. B needs A. But A isn't done cooking yet.
  B gets A's half-prepared plate (undefined values).
  Both systems "handle" it by giving you the partial plate — silently.`,
    deep: `COMMONJS (CJS) — HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  require() is a SYNCHRONOUS function call.
  Node.js wraps each .js file in a function:
    (function(exports, require, module, __filename, __dirname) {
      // your module code here
    });
  module.exports starts as an empty object {}.
  When you assign module.exports = something, you replace it.
  Exporting: module.exports = fn or exports.name = value
  module.exports and exports start as the SAME reference.
  If you do exports = something, you break that reference — module.exports unchanged!

  Caching: require() caches modules by resolved filename.
  Second require() of same file → returns cached module.exports, no re-execution.
  This is why circular deps give you partial values — cached before complete.

ESM — HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Static analysis: the engine reads import declarations at PARSE TIME, before execution.
  This means:
    - imports cannot be inside if-blocks or functions (unlike require)
    - bundlers know the full dependency graph before running any code
    - tree-shaking is possible (unused exports provably never used)

  LIVE BINDINGS: ESM exports are live bindings, not copies.
    // counter.js
    export let count = 0;
    export function increment() { count++; }

    // main.js
    import { count, increment } from "./counter.js";
    console.log(count); // 0
    increment();
    console.log(count); // 1 — live binding! CJS would still show 0 (copied value)

  Top-level await (ES2022): ESM modules can use await at the top level.
    const data = await fetch("/api/config").then(r => r.json());
    export const config = data; // works in ESM, impossible in CJS

  Strict mode: ESM is ALWAYS in strict mode. No opt-in needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAMED vs DEFAULT EXPORTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Named:   export const add = (a,b) => a+b;   → import { add } from "./math"
  Default: export default function() {}        → import anything from "./math"

  Why default exports are debated:
  - Can be imported with ANY name → inconsistent naming across codebase
  - Harder to search/refactor (grep for "UserCard" finds named; default could be "UC")
  - No IDE autocompletion for the import name
  - Many style guides (Airbnb, Google) now prefer named exports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CIRCULAR DEPENDENCY — ROOT CAUSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CJS: When A requires B, and B requires A mid-execution:
    - A's module.exports is returned AS-IS (partial, whatever was exported so far)
    - B sees A's incomplete exports — likely {} or missing functions
    - No error thrown — silent undefined bugs

  ESM: Handles circular deps via live bindings.
    - Links exist before execution
    - BUT: if you read the value before it's initialized, you get ReferenceError (TDZ)
    - "Circular imports detected" warnings in bundlers help catch this

  Prevention:
    - Introduce a third module that both import from (dependency inversion)
    - Restructure so dependencies flow in one direction
    - Use dynamic import() to break the static cycle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DYNAMIC IMPORT():
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  import() returns a Promise<Module>
  Can be called anywhere: inside functions, conditionals, event handlers
  Used for:
    - Route-based code splitting (React.lazy, Vue async components)
    - Feature-flag gated code (don't ship heavy library unless feature enabled)
    - Polyfills loaded only when needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUNDLERS — TREE-SHAKING & CHUNKING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tree-shaking: static analysis of import/export to eliminate dead code.
    - Works ONLY with ESM (static structure known at build time)
    - CJS: bundler can't know which exports are used (dynamic require possible)
    - Side effects: if a module has side effects (CSS import, global polyfill),
      mark it in package.json "sideEffects": false to allow aggressive tree-shaking

  Chunking: bundler splits output into multiple files
    - Initial chunk: critical path code
    - Async chunks: created per dynamic import()
    - Vendor chunk: node_modules (long-term cacheable)

  Import maps: browser-native way to map bare specifiers to URLs
    <script type="importmap">
      {"imports": {"lodash": "/vendor/lodash.js"}}
    </script>`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: CommonJS — module.exports patterns
// ─────────────────────────────────────────────
// math.js (CJS)
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
const PI = 3.14159;

// Pattern 1: export multiple named values
module.exports = { add, subtract, PI };

// Pattern 2: export single function/class
// module.exports = add;

// main.js (CJS)
const { add, subtract, PI } = require("./math");
console.log(add(10, 5));      // 15
console.log(subtract(10, 5)); // 5

// Gotcha: exports vs module.exports
// exports.add = add;         // ✓ works — same reference as module.exports
// exports = { add };         // ✗ breaks reference — module.exports still {}

// ─────────────────────────────────────────────
// EXAMPLE 2: ESM — named and default exports
// ─────────────────────────────────────────────
// taxUtils.js (ESM)
// Named exports — preferred for utilities
export const GST_RATE = 0.18;
export const IGST_RATE = 0.12;

export function calculateGST(amount) {
  return amount * GST_RATE;
}

export function applyDiscount(amount, discountPct) {
  return amount * (1 - discountPct / 100);
}

// Default export — one per module, for the "main" export
export default class Invoice {
  constructor(items) { this.items = items; }
  total() { return this.items.reduce((s, i) => s + i.price, 0); }
  withGST() { return this.total() * (1 + GST_RATE); }
}

// main.js (ESM)
// import Invoice from "./taxUtils.js";                 // default
// import { GST_RATE, calculateGST } from "./taxUtils.js"; // named
// import Invoice, { GST_RATE } from "./taxUtils.js";   // both

// Renaming named imports:
// import { calculateGST as calcTax } from "./taxUtils.js";

// ─────────────────────────────────────────────
// EXAMPLE 3: Live bindings vs CJS copy
// ─────────────────────────────────────────────
// store.js (ESM)
export let balance = 10000;
export function deposit(amount) { balance += amount; }
export function withdraw(amount) { balance -= amount; }

// main.js
// import { balance, deposit } from "./store.js";
// console.log(balance); // 10000
// deposit(5000);
// console.log(balance); // 15000 — live binding reflects the change!

// In CJS, balance would be copied at require() time → always 10000
// const { balance, deposit } = require("./store");
// deposit(5000);
// console.log(balance); // 10000 — stale copy, not updated!

// ─────────────────────────────────────────────
// EXAMPLE 4: Dynamic import — lazy loading
// ─────────────────────────────────────────────
// Load heavy chart library only when user opens the reports tab
async function loadReportsDashboard() {
  const reportBtn = document.getElementById("reports-tab");
  reportBtn.addEventListener("click", async () => {
    // Shows instantly — charting library loaded on demand
    reportBtn.textContent = "Loading...";
    const { Chart } = await import("./heavyChartLib.js");
    const { renderSalesChart } = await import("./salesCharts.js");
    reportBtn.textContent = "Reports";
    renderSalesChart(new Chart("canvas"), await fetchSalesData());
  });
}

// Conditional polyfill loading
async function setupIntersectionObserver() {
  if (!("IntersectionObserver" in window)) {
    await import("./intersection-observer-polyfill.js");
  }
  // Now safe to use IntersectionObserver
  return new IntersectionObserver(handleIntersect);
}

// ─────────────────────────────────────────────
// EXAMPLE 5: Circular dependency — the silent bug and fix
// ─────────────────────────────────────────────
// BUGGY CIRCULAR: a.js requires b.js which requires a.js

// a.js (CJS)
// const { getUser } = require("./b.js");
// exports.getRole = function(id) { return "admin"; };
// console.log(getUser(1));

// b.js (CJS)
// const { getRole } = require("./a.js"); // circular — a.js not done yet!
// exports.getUser = function(id) {
//   return { id, role: getRole(id) }; // getRole is undefined here!
// };

// FIX: Extract shared logic to a third module
// shared.js — no dependencies on a or b
// exports.ROLES = { admin: "admin", viewer: "viewer" };

// a.js — imports only from shared
// const { ROLES } = require("./shared");
// exports.getRole = (id) => ROLES.admin;

// b.js — imports only from shared
// const { ROLES } = require("./shared");
// exports.getUser = (id) => ({ id, role: ROLES.admin });

// ─────────────────────────────────────────────
// EXAMPLE 6: Barrel files and tree-shaking trap
// ─────────────────────────────────────────────
// components/index.js (barrel file — re-exports everything)
// export { Button } from "./Button";
// export { Modal } from "./Modal";
// export { DataTable } from "./DataTable"; // 200KB heavy component
// export { Tooltip } from "./Tooltip";

// main.js — only wants Button
// import { Button } from "./components"; // Tree-shaker must analyze entire barrel
// If DataTable has side effects or CJS internals → entire 200KB ships!

// FIX 1: Direct imports (best for libraries)
// import { Button } from "./components/Button";

// FIX 2: Mark package side-effect-free in package.json:
// { "sideEffects": false }  — tells bundler to aggressively tree-shake

// FIX 3: Use explicit named re-exports (modern bundlers handle these better)

// ─────────────────────────────────────────────
// EXAMPLE 7: Top-level await (ESM only)
// ─────────────────────────────────────────────
// config.js (ESM — top-level await loads remote config before module resolves)
// const response = await fetch("https://api.myapp.com/config");
// export const config = await response.json();
// export const { apiKey, region, featureFlags } = config;

// Any module that imports config.js will wait for the fetch before executing.
// This is impossible in CJS — require() is synchronous.

// Usage in app entry:
// import { apiKey, featureFlags } from "./config.js";
// console.log(apiKey); // guaranteed to be loaded`,
    bugs: `BUG 1: exports = {} breaking the CJS reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
// utils.js
exports = {              // reassigns the local 'exports' variable
  formatRupees: (n) => \`₹\${n.toLocaleString("en-IN")}\`,
  formatDate: (d) => new Date(d).toLocaleDateString("en-IN")
};
// module.exports is still {} — exports now points to a different object
// require("./utils") returns {} — empty! Silent fail.

// FIX: Always assign to module.exports, or add properties to exports
module.exports = {        // replace module.exports directly ✓
  formatRupees: (n) => \`₹\${n.toLocaleString("en-IN")}\`,
  formatDate: (d) => new Date(d).toLocaleDateString("en-IN")
};
// OR: exports.formatRupees = ...; exports.formatDate = ...;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Default import name mismatch — impossible to grep/refactor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Three files, three names for the same component
// file-a.js: import UserProfile from "./UserProfile";
// file-b.js: import Profile from "./UserProfile";
// file-c.js: import UP from "./UserProfile";
// Searching codebase for "UserProfile" usage misses 2 out of 3

// FIX: Use named exports — the name is always the same
// UserProfile.js: export function UserProfile() { ... }  // named
// file-a.js: import { UserProfile } from "./UserProfile"; // always "UserProfile"
// file-b.js: import { UserProfile } from "./UserProfile"; // always "UserProfile"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Circular dependency gives undefined functions at call time
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: orderService.js and userService.js mutually require each other
// orderService.js
// const userService = require("./userService"); // starts loading userService
// exports.createOrder = (userId, items) => {
//   const user = userService.getUser(userId); // userService.getUser may be undefined!
//   return { user, items, total: items.reduce((s,i) => s+i.price, 0) };
// };

// userService.js
// const orderService = require("./orderService"); // circular → gets partial exports
// exports.getUser = (id) => ({ id, name: "Priya" });
// exports.getUserOrders = (id) => orderService.getOrdersForUser(id); // may be undefined

// FIX: Restructure — extract shared types/utils, or use lazy require inside functions
// exports.getUserOrders = (id) => {
//   const orderService = require("./orderService"); // lazy require — avoids circular
//   return orderService.getOrdersForUser(id);
// };

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Dynamic import() not awaited — using module before it loads
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function renderChart(data) {
  const chartModule = import("./chartLib.js"); // returns PROMISE, not module!
  chartModule.Chart.render(data);  // TypeError: chartModule.Chart is undefined
}

// FIX: await the import
async function renderChart(data) {
  const { Chart } = await import("./chartLib.js"); // ✓ awaited
  Chart.render(data);
}

// OR with .then():
function renderChart(data) {
  import("./chartLib.js").then(({ Chart }) => {
    Chart.render(data);
  });
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Importing CJS module as ESM default — named exports missing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: lodash is CJS. Trying to tree-shake named imports doesn't work:
// import { debounce } from "lodash"; // works in bundler but imports ALL of lodash
// The entire lodash CJS bundle is included — no tree-shaking possible

// FIX 1: Use lodash-es (ESM version of lodash)
// import { debounce } from "lodash-es"; // true ESM — tree-shakeable ✓

// FIX 2: Deep import (CJS subpath)
// import debounce from "lodash/debounce"; // only imports debounce module ✓

// FIX 3: Use native alternatives (no dependency)
// const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// counter.mjs
export let count = 0;
export const increment = () => { count += 10; };

// main.mjs
// import { count, increment } from "./counter.mjs";
// console.log(count);   // (A)
// increment();
// console.log(count);   // (B)
// const snapshot = count;
// increment();
// console.log(snapshot); // (C)
// console.log(count);    // (D)

// Answers: A=0, B=10, C=10 (snapshot is a copy of the primitive), D=20
// Explanation: live bindings update 'count' in place (B=10, D=20)
// but snapshot = count copies the current NUMBER value (primitives copy by value)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This module has a circular dependency that causes a runtime crash.
// Restructure it so both modules work correctly.

// validation.js
// const { getUserById } = require("./users");
// exports.validateUser = (id) => {
//   const user = getUserById(id);
//   return user && user.active;
// };

// users.js
// const { validateUser } = require("./validation");
// const DB = [{ id: 1, name: "Priya", active: true }];
// exports.getUserById = (id) => DB.find(u => u.id === id);
// exports.getActiveUsers = () => DB.filter(u => validateUser(u.id));

// Fix: extract shared data to db.js, have both modules import from db.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a simple module loader (CJS-like) from scratch:
  function createModuleSystem() {
    // Returns: { define, require }
    // define(name, factory) registers a module
    // require(name) executes factory once, caches result, returns exports
    // factory receives a require function so modules can depend on each other
  }
  const { define, require: load } = createModuleSystem();
  define("math", (req) => { return { add: (a,b) => a+b }; });
  define("app",  (req) => { const m = req("math"); return { run: () => m.add(2,3) }; });
  console.log(load("app").run()); // 5`,
    summary: `ESM's static structure enables tree-shaking, live bindings, and top-level await — making it the right choice for modern JavaScript. CommonJS remains dominant in Node.js legacy code but cannot be tree-shaken. The most expensive module mistakes are silent: circular dependencies giving undefined, and barrel files shipping dead code.`
  },

  {
    id: 12,
    title: "Generators & Iterators",
    tag: "LAZY SEQUENCES & PAUSABLE FUNCTIONS",
    color: "#8B5CF6",
    tldr: `Iterators define a protocol for consuming sequences one value at a time. Generator functions (function*) implement this protocol automatically, pausing at each yield and resuming on demand. This enables lazy evaluation — computing only what you actually consume — which is essential for infinite sequences, streaming data, and elegant async control flow.`,
    problem: `How do you generate an infinite Fibonacci sequence without running out of memory?
  // Array-based: must pre-compute, crashes on "infinite"
  // Generator: compute on demand, stop when you want

How do you paginate an API without loading all pages?
  // for await...of with async generator fetches only needed pages

How does Redux-Saga work? How does Koa.js middleware work?
  // Both are built on generators — understanding them unlocks these frameworks

Why does for...of work on arrays but not on plain objects?
  // Objects don't implement Symbol.iterator — but you can add it

How do you stream large CSV/JSON files without loading them all in memory?
  // Async generators + for await...of process one chunk at a time

If you skip generators, you won't understand how half of the most powerful
JavaScript patterns work — lazy evaluation, coroutines, cooperative multitasking.`,
    analogy: `A generator function is like a TICKET DISPENSER at a government office.
  - The machine (generator function) knows how to produce ticket numbers
  - It doesn't print all tickets upfront — it WAITS until someone presses the button
  - Each press of the button (calling .next()) produces exactly ONE ticket (yielded value)
  - The machine PAUSES between presses — it doesn't forget where it was
  - When tickets run out or you close the machine, it signals DONE

Two-way communication:
  The dispenser also has a slot where you can INSERT a form (pass a value into .next(form)).
  The machine reads the form and uses it to decide the NEXT ticket number.
  yield both gives you a ticket AND receives your form.

Lazy evaluation:
  Instead of a dispenser that pre-prints a million tickets at startup,
  generators are the dispenser that prints ONLY WHEN ASKED.
  For an infinite sequence (like all prime numbers), this is the ONLY viable approach.

Async generator:
  Like the ticket dispenser but it has to call a remote server to get each number.
  for await...of presses the button, waits for the server, gets the number, repeats.`,
    deep: `THE ITERATOR PROTOCOL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
An "iterable" is any object with a [Symbol.iterator]() method that returns an "iterator".
An "iterator" is any object with a next() method that returns { value, done }.

  { value: any, done: false }  — next item in sequence
  { value: undefined, done: true } — sequence exhausted (or { value: returnValue, done: true })

Built-in iterables: Array, String, Map, Set, arguments, NodeList, TypedArray
NOT iterable by default: plain Object {} (by design — no guaranteed key order historically)

for...of, spread [...], destructuring [a,b] = iter, Array.from() all use this protocol.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATOR FUNCTION INTERNALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function* gen() { ... }  // creates a GeneratorFunction
gen()                    // returns a Generator object (both iterator AND iterable)
                         // does NOT execute any code yet

Generator object methods:
  .next(value)   — resume execution until next yield; value is the result of the yield expression
  .return(value) — force-terminate the generator; runs finally blocks
  .throw(error)  — inject an error at the current yield point; runs catch blocks

STATE MACHINE:
  Generators have 4 internal states:
  "suspended start" → first next() → "executing" → yield → "suspended yield"
  → next next() → "executing" → return or end → "completed"
  Once "completed", all further .next() calls return { value: undefined, done: true }

TWO-WAY COMMUNICATION:
  const value = yield expression;
  - "expression" is what .next() receives as its value
  - "value" is what the CALLER passes into the NEXT .next(value) call
  First .next() call cannot pass a value (generator hasn't reached a yield yet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YIELD* — DELEGATING TO ANOTHER GENERATOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  yield* iterates another iterable exhaustively, forwarding all values.
  function* combined() {
    yield* [1, 2, 3];       // delegates to array iterator
    yield* anotherGen();    // delegates to another generator
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASYNC GENERATORS (async function*):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Combines generators with Promises.
  Can use both await (pause for async) and yield (pause for consumer).
  Returns an AsyncIterator — consumed with for await...of.

  async function* paginatedFetch(url) {
    let page = 1, hasMore = true;
    while (hasMore) {
      const data = await fetch(\`\${url}?page=\${page}\`).then(r => r.json());
      yield data.items;
      hasMore = data.hasNextPage;
      page++;
    }
  }
  // Consumer controls the pace — only fetches next page when consumer asks for it

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRACTICAL APPLICATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Infinite sequences without memory issues
  2. Pagination — fetch only when needed
  3. State machines — yield represents each state transition
  4. Middleware chains (Koa) — yield next passes control to next middleware
  5. Redux-Saga — take(), put(), call() are yield-based effects
  6. Streaming data processing — pipe transforms lazily
  7. Cooperative multitasking — yield gives other tasks a chance to run`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Iterator protocol from scratch
// ─────────────────────────────────────────────
// Making a custom range object iterable
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {         // required: return an iterator
    let current = this.from;
    const last = this.to;
    return {
      next() {                  // required: return {value, done}
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};

for (const n of range) {
  console.log(n); // 1, 2, 3, 4, 5
}
console.log([...range]); // [1, 2, 3, 4, 5] — spread uses iterator too

// ─────────────────────────────────────────────
// EXAMPLE 2: Basic generator — infinite ID sequence
// ─────────────────────────────────────────────
function* idGenerator(prefix = "TXN") {
  let id = 1;
  while (true) {                // infinite loop — safe because of yield
    yield \`\${prefix}-\${String(id++).padStart(6, "0")}\`;
  }
}

const txnId = idGenerator("PAY");
console.log(txnId.next().value); // "PAY-000001"
console.log(txnId.next().value); // "PAY-000002"
console.log(txnId.next().value); // "PAY-000003"
// Never runs out of memory — generates on demand

// ─────────────────────────────────────────────
// EXAMPLE 3: Fibonacci — lazy infinite sequence
// ─────────────────────────────────────────────
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

function take(gen, n) {         // utility: take first n values from any generator
  const result = [];
  for (const value of gen) {
    result.push(value);
    if (result.length === n) break; // stop consuming — generator pauses here
  }
  return result;
}

console.log(take(fibonacci(), 10)); // [0,1,1,2,3,5,8,13,21,34]
// Generator state is preserved between take calls — could resume anytime

// ─────────────────────────────────────────────
// EXAMPLE 4: Two-way communication — calculator
// ─────────────────────────────────────────────
function* accumulator() {
  let total = 0;
  while (true) {
    const input = yield total;     // yield current total, receive next input
    if (input === null) break;     // sentinel value to exit
    total += input;
  }
  return total;                    // final return value on done
}

const calc = accumulator();
calc.next();          // start the generator (no value to send on first call)
console.log(calc.next(100).value);  // 100 — sent 100, got running total
console.log(calc.next(250).value);  // 350
console.log(calc.next(75).value);   // 425
const final = calc.next(null);      // send null to exit
console.log(final.value);           // 425, final.done = true

// ─────────────────────────────────────────────
// EXAMPLE 5: yield* delegation and tree traversal
// ─────────────────────────────────────────────
// Flatten a nested category tree lazily
function* flattenTree(node) {
  yield node.name;
  if (node.children) {
    for (const child of node.children) {
      yield* flattenTree(child); // delegate recursively — elegant, no stack of arrays
    }
  }
}

const categoryTree = {
  name: "Electronics",
  children: [
    { name: "Phones", children: [
      { name: "Samsung" }, { name: "Apple" }, { name: "OnePlus" }
    ]},
    { name: "Laptops", children: [
      { name: "Dell" }, { name: "HP" }
    ]}
  ]
};

console.log([...flattenTree(categoryTree)]);
// ["Electronics", "Phones", "Samsung", "Apple", "OnePlus", "Laptops", "Dell", "HP"]

// ─────────────────────────────────────────────
// EXAMPLE 6: Async generator — paginated API
// ─────────────────────────────────────────────
async function* fetchAllOrders(customerId) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // Fetches one page at a time — pauses between fetches until consumer asks
    const response = await fetch(\`/api/orders?customer=\${customerId}&page=\${page}&limit=20\`);
    const { orders, totalPages } = await response.json();

    for (const order of orders) {
      yield order;               // yield individual orders, not entire pages
    }

    hasMore = page < totalPages;
    page++;
  }
}

async function processCustomerOrders(customerId) {
  let totalSpend = 0;
  let orderCount = 0;

  for await (const order of fetchAllOrders(customerId)) {
    totalSpend += order.amount;
    orderCount++;
    if (orderCount % 20 === 0) {
      console.log(\`Processed \${orderCount} orders, total: ₹\${totalSpend}\`);
    }
    if (totalSpend > 100000) {
      console.log("High-value customer detected — stopping early");
      break; // break is safe — generator cleanup runs via .return()
    }
  }
}

// ─────────────────────────────────────────────
// EXAMPLE 7: State machine with generators
// ─────────────────────────────────────────────
function* orderStateMachine() {
  console.log("Order created — waiting for payment");
  const paymentResult = yield "AWAITING_PAYMENT";

  if (paymentResult === "failed") {
    yield "PAYMENT_FAILED";
    return;
  }

  console.log("Payment confirmed — processing");
  yield "PROCESSING";

  const dispatchResult = yield "DISPATCHED";

  if (dispatchResult === "returned") {
    yield "RETURN_INITIATED";
    yield "REFUNDED";
    return;
  }

  yield "DELIVERED";
}

const order = orderStateMachine();
console.log(order.next().value);           // "AWAITING_PAYMENT"
console.log(order.next("success").value);  // "PROCESSING"
console.log(order.next().value);           // "DISPATCHED"
console.log(order.next("delivered").value);// "DELIVERED"`,
    bugs: `BUG 1: Calling next() before generator is started — lost first value
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function* producer() {
  const x = yield "ready"; // yield both sends "ready" AND receives input
  yield x * 2;
}

const gen = producer();
console.log(gen.next(42).value);   // "ready" — the 42 is IGNORED (first call)
console.log(gen.next(10).value);   // 20 — used 10, not 42

// WHY: The first .next() call runs until the FIRST yield.
// There's no yield to "receive" the value passed to first .next() — it's discarded.
// The value passed to .next() becomes the RESULT of the PREVIOUS yield expression.
// First .next() has no previous yield — value is discarded.

// FIX: Never pass meaningful values to first .next()
// OR: Use a "priming" approach — first next() is always empty
const gen2 = producer();
gen2.next();              // prime the generator (runs to first yield)
console.log(gen2.next(42).value); // 84 — 42 is now correctly received ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Not cleaning up generator on early break — resource leaks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function* openFileStream(filename) {
  const handle = openFile(filename); // acquire resource
  try {
    const chunks = readChunks(handle);
    for (const chunk of chunks) yield chunk;
  } finally {
    closeFile(handle); // cleanup
  }
}

// Breaking out of for...of DOES call gen.return() which runs finally ✓
for (const chunk of openFileStream("data.csv")) {
  if (chunk.includes("ERROR")) break; // safe — finally runs
}

// BUT: manually iterating without finally:
const gen = openFileStream("data.csv");
const first = gen.next();
// Never calling gen.return() — finally block NEVER runs — file handle leaks!

// FIX: Always use for...of when possible (handles cleanup automatically)
// Or explicitly call gen.return() in finally:
// try { ... } finally { gen.return(); }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Spreading an infinite generator — freezes the process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function* naturals() { let n = 1; while(true) yield n++; }
const all = [...naturals()]; // infinite loop — never completes, OOM crash!

// FIX: Use take() utility or for...of with break
function take(gen, n) {
  const result = [];
  for (const v of gen) { result.push(v); if (result.length >= n) break; }
  return result;
}
console.log(take(naturals(), 5)); // [1,2,3,4,5] ✓

// Also buggy with destructuring:
// const [a, b, c, ...rest] = naturals(); // rest tries to consume the rest — infinite!
// FIX: const [a, b, c] = naturals();     // only take 3 ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: async generator not handling errors from fetch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Error in one page crashes entire iteration
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const data = await fetch(\`\${url}?page=\${page++}\`).then(r => r.json());
    // If fetch throws (network error, 500), the generator crashes
    // for await...of propagates the error — no partial results
    if (!data.items.length) return;
    yield data.items;
  }
}

// FIX: Wrap in try-catch, yield error info or skip bad pages
async function* fetchPagesSafe(url) {
  let page = 1;
  while (true) {
    try {
      const data = await fetch(\`\${url}?page=\${page++}\`).then(r => {
        if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
        return r.json();
      });
      if (!data.items.length) return;
      yield { ok: true, items: data.items };
    } catch (err) {
      yield { ok: false, error: err.message, page: page - 1 };
      return; // or continue to skip bad page
    }
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Using generator for parallel work — they are sequential
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY misconception: thinking async generator parallelizes fetches
async function* parallelFetch(ids) {
  for (const id of ids) {
    const data = await fetch(\`/api/item/\${id}\`).then(r => r.json());
    yield data; // fetches are SEQUENTIAL — each waits for previous
  }
}
// Fetching 100 items: 100 sequential requests, slow!

// FIX: Use Promise.all for parallel, then yield results
async function* parallelFetchFixed(ids, batchSize = 10) {
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(id => fetch(\`/api/item/\${id}\`).then(r => r.json()))
    ); // parallel within batch
    for (const result of results) yield result; // yield one by one
  }
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function* gen() {
  console.log("start");
  const x = yield 1;
  console.log("x =", x);
  const y = yield x + 10;
  console.log("y =", y);
  return x + y;
}

const g = gen();
console.log(g.next().value);    // (A) — what logs, what returns?
console.log(g.next(5).value);   // (B) — what logs, what returns?
console.log(g.next(3));         // (C) — what logs, what is the object?

// Answer:
// A: logs "start", returns 1
// B: logs "x = 5", returns 15 (x=5, yield x+10 = 15)
// C: logs "y = 3", returns { value: 8, done: true } (x+y = 5+3 = 8)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This generator should produce running totals from an input stream,
// but it always produces NaN. Find and fix the issue.

function* runningTotal() {
  let sum = 0;
  while (true) {
    sum += yield sum; // BUG: first next() discards its argument
  }
}

const rt = runningTotal();
console.log(rt.next(100).value); // Expected: 100, Actual: NaN? or 0?
console.log(rt.next(50).value);  // Expected: 150

// Hint: The first .next() value is always discarded.
// Fix: prime the generator with rt.next() before sending values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a lazy pipeline utility using generators:
  function* map(iterable, fn) { ... }
  function* filter(iterable, fn) { ... }
  function* take(iterable, n) { ... }

  // Must work:
  const result = [...take(
    filter(
      map(naturals(), x => x * x),    // squares: 1, 4, 9, 16, 25...
      x => x % 2 !== 0                // odd squares only: 1, 9, 25...
    ),
    4                                 // take first 4: [1, 9, 25, 49]
  )];
  console.log(result); // [1, 9, 25, 49]
  // Key: NO intermediate arrays created — fully lazy pipeline`,
    summary: `Generators implement the iterator protocol via function* and yield, enabling lazy sequences that compute values only when consumed. Combined with async/await in async generators, they elegantly solve pagination, streaming, and state machine problems that would otherwise require complex manual state tracking.`
  },

  {
    id: 13,
    title: "WeakMap, WeakSet, Map & Set",
    tag: "THE RIGHT COLLECTION FOR THE JOB",
    color: "#0D9488",
    tldr: `Map and Set are proper collection types that fix the limitations of plain objects and arrays. WeakMap and WeakSet hold "weak" references that don't prevent garbage collection — critical for caching and private data patterns. Choosing the right collection can mean the difference between a memory leak and a correct, efficient program.`,
    problem: `Why does this object-as-cache have bugs?
  const cache = {};
  cache[{id: 1}] = "data"; // cache["[object Object]"] = "data" — key coerced to string!
  cache[{id: 2}] = "data"; // overwrites! both become same key

Why does my cache grow without bound?
  const cache = new Map();
  cache.set(domNode, computedData); // holds domNode reference — even after node removed from DOM
  // GC cannot collect the DOM node — memory leak!

Why doesn't Set preserve insertion order? (It does — unlike plain objects in some engines)
Why can't I use an object as a Set key if all I want is uniqueness?
  const seen = new Set();
  seen.add({ id: 1 }); // adds
  seen.add({ id: 1 }); // adds AGAIN — different object reference, not same!
  seen.size; // 2 — not deduplicated!

What's the right way to store private data per-instance?
  // WeakMap keyed on 'this' — GC-friendly, truly private

Getting these wrong means subtle key collisions, memory leaks in SPAs,
and choosing O(n) arrays where O(1) Sets would do.`,
    analogy: `Map is like a PROFESSIONAL FILING CABINET:
  - Labels (keys) can be ANYTHING — full folders, photos, even other filing cabinets
  - Items stay in the order you put them in
  - Has a built-in counter (size) and organized retrieval
  - Knows the difference between "room 101" and "room 102" (no key coercion)

Plain Object is like a WHITEBOARD:
  - You can only write STRING labels (everything else gets converted to a string)
  - "101" and 101 look the same on the whiteboard — key collision!
  - No built-in count — you have to count yourself

Set is like a GUEST LIST with bouncers:
  - Tries to add a name? Bouncer checks if they're already in — O(1) lookup
  - Duplicates turned away automatically — membership is exclusive
  - Order preserved — people enter in order they were added

WeakMap is a filing cabinet with STICKY NOTES instead of permanent labels:
  - When the labeled item (key object) is thrown away (GC'd), the sticky note falls off too
  - You cannot read the contents of the sticky notes without having the original item
  - Cannot count how many sticky notes exist (no .size, no iteration)
  - Perfect for: "attach extra private info to objects you don't own"`,
    deep: `MAP vs PLAIN OBJECT — THE TECHNICAL DIFFERENCES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Feature              │ Map                    │ Object
  ─────────────────────┼────────────────────────┼────────────────────
  Key types            │ ANY value              │ string or Symbol only
  Key coercion         │ none (strict equality) │ toString() called
  Insertion order      │ guaranteed             │ mostly (ES2015+)
  Size                 │ .size (O(1))           │ Object.keys().length (O(n))
  Prototype pollution  │ none (clean)           │ inherits Object.prototype keys
  Performance (many)   │ O(1) add/delete        │ slower on frequent add/delete
  Serializable (JSON)  │ no (need Array.from)   │ yes (JSON.stringify)
  for...of             │ yes (entries)          │ no (use Object.entries)

  When to use Map:
  - Keys are not strings (objects, functions, DOM nodes)
  - Frequent add/delete operations
  - Need guaranteed insertion order AND size
  - Avoiding prototype pollution risk

  When to use Object:
  - JSON serialization/deserialization
  - Static records (shape rarely changes)
  - Working with APIs/libraries expecting plain objects

SET INTERNALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Set uses "SameValueZero" equality (like === but NaN === NaN):
  new Set([1, 1, NaN, NaN, "1", 1]) → {1, NaN, "1"}
  Note: {} !== {} (object reference equality — two objects are different keys)

  Set operations (ES2024+, natively available):
  setA.union(setB)          → new set with all elements
  setA.intersection(setB)   → only elements in both
  setA.difference(setB)     → elements in A but not B
  setA.isSubsetOf(setB)     → true if all of A is in B

WEAKMAP — THE MEMORY-SAFE CACHE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WeakMap only accepts OBJECT keys (not primitives).
  The reference is "weak": the GC can collect the key object if nothing else holds it.
  When the key is collected, the WeakMap entry disappears automatically.

  Limitations (necessary for GC to work):
  - No iteration (for...of, forEach) — can't enumerate entries (would require strong refs)
  - No .size property
  - No .clear() method (in old spec)
  - Keys must be objects (or non-registered Symbols in ES2023+)

  PRIMARY USE CASE: Private data per object without memory leaks
    const _private = new WeakMap();
    class BankAccount {
      constructor(owner, balance) {
        _private.set(this, { owner, balance, pin: null }); // truly private
      }
      getBalance() { return _private.get(this).balance; }
    }
    // When BankAccount instance is discarded, _private entry is collected too ✓

WEAKREF + FINALIZATIONREGISTRY (ES2021):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WeakRef: hold a weak reference to an object; check if still alive via .deref()
  FinalizationRegistry: run a callback when an object is collected by GC

  const registry = new FinalizationRegistry((heldValue) => {
    console.log(\`\${heldValue} was garbage collected\`);
    cache.delete(heldValue); // clean up cache entry
  });

  function createCachedResource(key) {
    const resource = createHeavyResource();
    registry.register(resource, key); // notify when resource is collected
    return new WeakRef(resource);
  }

  WARNING: GC timing is non-deterministic. Never write logic that REQUIRES
  GC to run at a specific time. FinalizationRegistry is for cleanup only.

PERFORMANCE — MAP vs OBJECT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  For READ-HEAVY, STATIC data: plain object is faster (V8 shape optimization)
  For WRITE-HEAVY, DYNAMIC data (frequent add/delete): Map is faster
  Map avoid V8 "dictionary mode" degradation that objects fall into after many deletions`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Map — object keys without coercion bug
// ─────────────────────────────────────────────
// BAD: using plain object as cache with object keys
const badCache = {};
const user1 = { id: 1, name: "Priya" };
const user2 = { id: 2, name: "Rahul" };
badCache[user1] = "Priya's data";  // key becomes "[object Object]"
badCache[user2] = "Rahul's data";  // OVERWRITES — same key!
console.log(Object.keys(badCache)); // ["[object Object]"] — only one entry!

// GOOD: Map preserves object key identity
const goodCache = new Map();
goodCache.set(user1, "Priya's data");
goodCache.set(user2, "Rahul's data");
console.log(goodCache.size);           // 2 ✓
console.log(goodCache.get(user1));     // "Priya's data" ✓
console.log(goodCache.get(user2));     // "Rahul's data" ✓
console.log(goodCache.has(user1));     // true
goodCache.delete(user1);
console.log(goodCache.size);           // 1

// Iterating Map:
for (const [key, value] of goodCache) {
  console.log(key.name, "→", value);
}
// Convert to array of entries:
const entries = [...goodCache.entries()];
const keys    = [...goodCache.keys()];
const values  = [...goodCache.values()];

// ─────────────────────────────────────────────
// EXAMPLE 2: Set — deduplication and membership
// ─────────────────────────────────────────────
// Deduplicate product IDs
const viewedProducts = new Set();
viewedProducts.add("PROD-001");
viewedProducts.add("PROD-002");
viewedProducts.add("PROD-001"); // duplicate — ignored
viewedProducts.add("PROD-003");
console.log(viewedProducts.size);          // 3 (not 4)
console.log(viewedProducts.has("PROD-002")); // true — O(1) lookup
viewedProducts.delete("PROD-002");
console.log([...viewedProducts]);          // ["PROD-001", "PROD-003"]

// Deduplicate array the clean way:
const rawTags = ["sale", "new", "sale", "featured", "new"];
const uniqueTags = [...new Set(rawTags)];
console.log(uniqueTags); // ["sale", "new", "featured"]

// Set operations (manual, pre-ES2024):
function union(setA, setB) { return new Set([...setA, ...setB]); }
function intersection(setA, setB) { return new Set([...setA].filter(x => setB.has(x))); }
function difference(setA, setB) { return new Set([...setA].filter(x => !setB.has(x))); }

const premiumUsers = new Set([101, 102, 103, 104]);
const mobileUsers  = new Set([102, 103, 105, 106]);
console.log([...intersection(premiumUsers, mobileUsers)]); // [102, 103]
console.log([...difference(premiumUsers, mobileUsers)]);   // [101, 104]

// ─────────────────────────────────────────────
// EXAMPLE 3: WeakMap — private class data
// ─────────────────────────────────────────────
const _private = new WeakMap(); // module-level, not exported

class BankAccount {
  constructor(owner, initialBalance, pin) {
    // Private data stored in WeakMap keyed on 'this'
    _private.set(this, {
      owner,
      balance: initialBalance,
      pin,
      transactions: []
    });
  }

  deposit(amount) {
    const data = _private.get(this);
    data.balance += amount;
    data.transactions.push({ type: "credit", amount, date: new Date() });
    return this; // chainable
  }

  withdraw(amount, pin) {
    const data = _private.get(this);
    if (pin !== data.pin) throw new Error("Invalid PIN");
    if (amount > data.balance) throw new Error("Insufficient funds");
    data.balance -= amount;
    data.transactions.push({ type: "debit", amount, date: new Date() });
    return this;
  }

  get balance() { return _private.get(this).balance; }
  get owner()   { return _private.get(this).owner; }
  getStatement() { return [..._private.get(this).transactions]; }
}

const acc = new BankAccount("Deepa", 10000, "1234");
acc.deposit(5000).deposit(3000);
acc.withdraw(2000, "1234");
console.log(acc.balance);       // 16000
console.log(acc.pin);           // undefined — truly private! ✓
// console.log(_private.get(acc)); // works only inside module
// When acc is GC'd, _private entry is automatically removed ✓

// ─────────────────────────────────────────────
// EXAMPLE 4: WeakSet — tracking without preventing GC
// ─────────────────────────────────────────────
const processedRequests = new WeakSet();

function handleRequest(requestObj) {
  if (processedRequests.has(requestObj)) {
    console.log("Duplicate request — ignoring");
    return;
  }
  processedRequests.add(requestObj);
  // process request...
  console.log(\`Processing: \${requestObj.id}\`);
  // When requestObj is GC'd, WeakSet entry disappears automatically
  // No memory leak even if millions of requests processed
}

// ─────────────────────────────────────────────
// EXAMPLE 5: Map for frequency counting (event analytics)
// ─────────────────────────────────────────────
function analyzePageViews(events) {
  const pageCount = new Map();
  const userSessions = new Map();

  for (const event of events) {
    // Count page views
    pageCount.set(event.page, (pageCount.get(event.page) ?? 0) + 1);

    // Track sessions per user
    if (!userSessions.has(event.userId)) {
      userSessions.set(event.userId, new Set());
    }
    userSessions.get(event.userId).add(event.sessionId);
  }

  // Sort by view count (Map iteration respects insertion order)
  const sorted = [...pageCount.entries()]
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return {
    topPages: sorted,
    uniqueUserCount: userSessions.size,
    avgSessionsPerUser: [...userSessions.values()]
      .reduce((sum, s) => sum + s.size, 0) / userSessions.size
  };
}

// ─────────────────────────────────────────────
// EXAMPLE 6: WeakRef + FinalizationRegistry cache
// ─────────────────────────────────────────────
class SmartCache {
  #cache = new Map(); // key → WeakRef(value)
  #registry = new FinalizationRegistry((key) => {
    // Called when cached value is GC'd — clean up stale Map entry
    console.log(\`Cache entry for "\${key}" was collected by GC\`);
    this.#cache.delete(key);
  });

  set(key, value) {
    this.#cache.set(key, new WeakRef(value));
    this.#registry.register(value, key); // watch for GC
  }

  get(key) {
    const ref = this.#cache.get(key);
    if (!ref) return null;
    const value = ref.deref(); // null if GC'd
    if (!value) {
      this.#cache.delete(key); // clean up stale entry
      return null;
    }
    return value;
  }

  get size() { return this.#cache.size; }
}

const cache = new SmartCache();
let bigData = { payload: new Array(10000).fill("📦") };
cache.set("report-2024", bigData);
console.log(cache.get("report-2024") !== null); // true
bigData = null; // remove strong reference — eligible for GC
// After GC runs: cache.get("report-2024") returns null, Map entry cleaned up`,
    bugs: `BUG 1: Object key coercion — all keys become "[object Object]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: DOM node as cache key in plain object
const elementCache = {};
const btn1 = document.getElementById("btn1");
const btn2 = document.getElementById("btn2");
elementCache[btn1] = { clicks: 0 }; // key = "[object HTMLButtonElement]"
elementCache[btn2] = { clicks: 0 }; // OVERWRITES btn1's entry!
elementCache[btn1].clicks++;
console.log(elementCache[btn2].clicks); // 1 — btn2 sees btn1's clicks!

// FIX: Use Map — objects are valid keys with identity equality
const elementMap = new Map();
elementMap.set(btn1, { clicks: 0 });
elementMap.set(btn2, { clicks: 0 });
elementMap.get(btn1).clicks++;
console.log(elementMap.get(btn2).clicks); // 0 ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Regular Map holding DOM nodes — memory leak in SPA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: caching computed styles for DOM nodes
const styleCache = new Map();
function getComputedStyle(node) {
  if (!styleCache.has(node)) {
    styleCache.set(node, expensiveCompute(node));
  }
  return styleCache.get(node);
}
// When nodes are removed from DOM, styleCache still holds strong references
// 1000 route navigations = 1000 stale DOM trees held in memory!

// FIX: Use WeakMap — entries GC'd when nodes are removed from DOM
const weakStyleCache = new WeakMap();
function getComputedStyleSafe(node) {
  if (!weakStyleCache.has(node)) {
    weakStyleCache.set(node, expensiveCompute(node));
  }
  return weakStyleCache.get(node); // automatically cleaned up when node is GC'd ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Set not deduplicating objects (reference equality)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Expecting Set to deduplicate by value
const cartItems = new Set();
cartItems.add({ id: "P001", name: "Saree", qty: 1 });
cartItems.add({ id: "P001", name: "Saree", qty: 1 }); // different reference!
console.log(cartItems.size); // 2 — NOT deduplicated!
// Set uses reference equality for objects — two separate {} are never equal

// FIX: Use Map keyed on a unique property for deduplication
const cartMap = new Map();
cartMap.set("P001", { id: "P001", name: "Saree", qty: 1 });
cartMap.set("P001", { id: "P001", name: "Saree", qty: 1 }); // overwrites, not duplicated
console.log(cartMap.size); // 1 ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Checking Map with undefined vs missing key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const scores = new Map([["Priya", 95], ["Rahul", undefined]]);
if (scores.get("Rahul")) {        // undefined — falsy!
  console.log("Rahul has a score");
}
if (scores.get("Kiran")) {        // also undefined (missing key) — same result!
  console.log("Kiran has a score");
}
// Cannot distinguish "key with undefined value" from "missing key" using get()

// FIX: Always use .has() to check existence, .get() only to read value
if (scores.has("Rahul")) {
  console.log("Rahul has a score:", scores.get("Rahul")); // undefined — but key exists ✓
}
if (!scores.has("Kiran")) {
  console.log("Kiran has no score entry"); ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Prototype pollution via plain object — security issue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: User-supplied key can overwrite Object.prototype
function buildConfig(userParams) {
  const config = {};
  for (const [key, value] of Object.entries(userParams)) {
    config[key] = value; // DANGEROUS if key is "__proto__", "constructor", "toString"
  }
  return config;
}
// Attacker sends: { "__proto__": { "isAdmin": true } }
// Pollutes Object.prototype — ALL objects in the app now have isAdmin: true!

// FIX 1: Use Map — no prototype chain to pollute
function buildConfigSafe(userParams) {
  return new Map(Object.entries(userParams));
}

// FIX 2: Use Object.create(null) — no prototype
function buildConfigSafe2(userParams) {
  const config = Object.create(null); // no __proto__, no toString, truly clean
  Object.assign(config, userParams);
  return config;
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const m = new Map();
const key1 = {};
const key2 = {};
m.set(key1, "A");
m.set(key2, "B");
m.set(key1, "C"); // same reference as key1

console.log(m.size);       // (A)
console.log(m.get(key1));  // (B)
console.log(m.get({}));    // (C) — NEW object, different reference

const s = new Set([1, 1, "1", true, NaN, NaN, undefined, undefined]);
console.log(s.size);        // (D)

// Answers: A=2, B="C" (updated), C=undefined (different ref), D=6
// Set: 1 (number), "1" (string), true, NaN (NaN===NaN in Set), undefined = 6 unique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This event listener tracker should prevent registering the same
// callback twice for the same event. But it registers duplicates.
const listeners = {};
function addListener(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  if (!listeners[event].includes(callback)) {
    listeners[event].push(callback);
  }
}
// Problem: includes() is O(n), and more importantly:
// What if event name is "__proto__" or "constructor"? Prototype pollution!
// Also: listeners["__proto__"] could crash the app

// Fix: Use Map<string, Set<Function>> — correct data structure
// Map avoids prototype pollution, Set gives O(1) dedup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a LRU (Least Recently Used) cache using Map:
  class LRUCache {
    constructor(capacity) { ... }
    get(key) { ... }   // returns value, moves to "recently used", or -1 if missing
    put(key, value) { ... } // adds/updates, evicts least recently used if over capacity
  }
  const cache = new LRUCache(3);
  cache.put("a", 1); cache.put("b", 2); cache.put("c", 3);
  cache.get("a");     // 1 — "a" is now most recent
  cache.put("d", 4); // evicts "b" (least recently used after "a" was accessed)
  console.log(cache.get("b")); // -1 (evicted)
  console.log(cache.get("c")); // 3
  Hint: Map preserves insertion order — use delete+re-set to move to "end" (most recent)`,
    summary: `Use Map over plain objects when keys aren't strings or when you need reliable size and iteration. Use Set for O(1) membership checks and deduplication. Choose WeakMap/WeakSet when your cache keys are objects that should be eligible for garbage collection — this is the key difference between a bounded cache and a memory leak.`
  },

  {
    id: 14,
    title: "Symbols & Well-Known Symbols",
    tag: "UNIQUE KEYS & PROTOCOL HOOKS",
    color: "#BE185D",
    tldr: `Symbol creates guaranteed-unique primitive values, immune to string coercion and safe for use as non-enumerable object keys. Well-known Symbols (Symbol.iterator, Symbol.toPrimitive, etc.) are hooks that let you customize how JavaScript's built-in language features interact with your objects — from making something iterable to controlling how it converts to a number.`,
    problem: `Why does this library accidentally overwrite my property?
  // Library adds "id" property to user objects — collides with your own "id"
  user.id = lib.generateId(); // overwrites your user.id!
  // Fix: lib uses Symbol() key — impossible to collide

Why doesn't my object work with for...of?
  const queue = { items: [], push(x) { this.items.push(x); } };
  for (const item of queue) { ... } // TypeError: queue is not iterable
  // Fix: implement Symbol.iterator

Why does my class show "[object Object]" instead of a useful name?
  console.log(\`\${myPaymentObject}\`); // "[object Object]" — not helpful
  // Fix: Symbol.toPrimitive or Symbol.toStringTag

Why can this object sometimes be compared like a number?
  const price = { amount: 299, valueOf() { return 299; } };
  price + 100; // 399 — but how to control this cleanly?
  // Symbol.toPrimitive gives full control

Symbols are the "power user" feature of JavaScript — you'll see them
in library internals, framework source code, and Node.js core.
Missing them means you can't read or write at that level.`,
    analogy: `A regular string key is like a NAME TAG at a conference:
  Anyone can have the same name. Two people named "id" cause confusion.
  If two libraries both add an "id" property to your object, one overwrites the other.

A Symbol is like a FINGERPRINT:
  Even if you create two symbols with the same description "id",
  they are physically distinct — like two people with the same name but different fingerprints.
  No collision is possible, ever, by definition.

Symbol.for() is the GLOBAL ID REGISTRY:
  Like a government-issued national ID. "SSN-12345" is the same person globally.
  Symbol.for("app.userId") always returns the SAME symbol, across files and modules.

Well-Known Symbols are SECRET HANDSHAKES with the JavaScript engine:
  - Symbol.iterator is the handshake for "I can produce a sequence — try me with for...of"
  - Symbol.toPrimitive is the handshake for "Here's how I convert to a number/string/default"
  - Symbol.hasInstance is the handshake for "Here's how instanceof checks should work for me"
  - Symbol.toStringTag is the handshake for "This is my display name in Object.prototype.toString"

  These slots existed inside the JS engine forever.
  ES2015 just exposed them publicly so YOU can customize those behaviors.`,
    deep: `SYMBOL FUNDAMENTALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Symbol()          — creates new unique symbol (local)
  Symbol("desc")    — same, but with a description (for debugging only)
  Symbol.for("key") — returns SAME symbol from global registry for that key
  Symbol.keyFor(sym)— returns key string for a Symbol.for() symbol, undefined for local

  Symbol !== string: typeof Symbol() === "symbol" (primitive, not object)
  Symbols are NOT auto-coerced to string:
    const s = Symbol("id");
    "Key: " + s  // TypeError: Cannot convert a Symbol value to a string
    \`Key: \${s}\` // TypeError: same
    String(s)    // "Symbol(id)" — must be explicit

  NON-ENUMERABLE: Symbol keys don't appear in:
    - for...in loops
    - Object.keys()
    - JSON.stringify()
    - Object.assign() DOES copy symbols
    - Object.getOwnPropertySymbols() retrieves them
    - Reflect.ownKeys() retrieves ALL: strings + symbols

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WELL-KNOWN SYMBOLS — THE PROTOCOL HOOKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbol.iterator
  obj[Symbol.iterator]() → iterator
  Used by: for...of, [...spread], destructuring, Array.from()
  Implement to make ANY object iterable

Symbol.asyncIterator
  obj[Symbol.asyncIterator]() → async iterator
  Used by: for await...of
  Implement to make ANY object async-iterable

Symbol.toPrimitive(hint)
  hint = "number" | "string" | "default"
  Controls type coercion: obj + 1, \`\${obj}\`, obj > 5
  Takes priority over valueOf() and toString()

Symbol.toStringTag
  String-valued property that customizes Object.prototype.toString output:
  class MyCollection {
    get [Symbol.toStringTag]() { return "MyCollection"; }
  }
  Object.prototype.toString.call(new MyCollection()); // "[object MyCollection]"

Symbol.hasInstance
  Static method that controls instanceof behavior:
  class EvenNumber {
    static [Symbol.hasInstance](n) { return typeof n === "number" && n % 2 === 0; }
  }
  2 instanceof EvenNumber  // true
  3 instanceof EvenNumber  // false

Symbol.species
  Specifies the constructor to use when creating derived objects (Array.prototype.map, etc.)
  class ImmutableArray extends Array {
    static get [Symbol.species]() { return Array; } // map() returns plain Array, not ImmutableArray
  }

Symbol.isConcatSpreadable
  When false, prevents array spreading in Array.prototype.concat:
  const notSpreadable = Object.defineProperty([1,2,3], Symbol.isConcatSpreadable, { value: false });
  [0].concat(notSpreadable); // [0, [1,2,3]] instead of [0,1,2,3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRACTICAL METADATA PATTERN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Use Symbol keys to attach metadata to objects without polluting their API:
  const VALIDATION_RULES = Symbol("validationRules");
  const ENTITY_TYPE      = Symbol("entityType");

  user[VALIDATION_RULES] = { name: /^[A-Z]/, age: n => n >= 18 };
  user[ENTITY_TYPE] = "User";
  JSON.stringify(user); // these keys are invisible to JSON ✓
  Object.keys(user);    // these keys are invisible to enumeration ✓`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Symbol uniqueness — collision-proof keys
// ─────────────────────────────────────────────
const ID = Symbol("id");           // unique key
const TYPE = Symbol("type");

const user = {
  name: "Priya",
  id: "USER-001",                  // string key — visible, enumerable
  [ID]: "INTERNAL-UUID-7a8b9c",    // Symbol key — hidden, collision-proof
  [TYPE]: "premium"
};

console.log(user.name);            // "Priya"
console.log(user[ID]);             // "INTERNAL-UUID-7a8b9c"
console.log(Object.keys(user));    // ["name", "id"] — Symbols invisible
console.log(JSON.stringify(user)); // {"name":"Priya","id":"USER-001"} — Symbols excluded
console.log(Object.getOwnPropertySymbols(user)); // [Symbol(id), Symbol(type)]

// Two symbols with same description are NOT equal:
const s1 = Symbol("id");
const s2 = Symbol("id");
console.log(s1 === s2); // false — always unique

// ─────────────────────────────────────────────
// EXAMPLE 2: Symbol.for() — global registry
// ─────────────────────────────────────────────
// File A (loaded first):
const AUTH_USER = Symbol.for("app.auth.user"); // registered globally

// File B (different module):
const AUTH_USER_B = Symbol.for("app.auth.user"); // retrieves SAME symbol
console.log(AUTH_USER === AUTH_USER_B); // true ✓

// Retrieve key from symbol:
console.log(Symbol.keyFor(AUTH_USER)); // "app.auth.user"
console.log(Symbol.keyFor(Symbol("local"))); // undefined — local symbol

// Using global symbol as cross-module shared key:
const REQUEST_CONTEXT = Symbol.for("app.requestContext");
function setContext(obj, ctx) { obj[REQUEST_CONTEXT] = ctx; }
function getContext(obj) { return obj[REQUEST_CONTEXT]; }

// ─────────────────────────────────────────────
// EXAMPLE 3: Symbol.iterator — making custom class iterable
// ─────────────────────────────────────────────
class OrderQueue {
  #items = [];

  enqueue(order) { this.#items.push(order); return this; }
  dequeue() { return this.#items.shift(); }
  get size() { return this.#items.length; }

  // Make OrderQueue work with for...of, spread, destructuring
  [Symbol.iterator]() {
    let index = 0;
    const items = this.#items;
    return {
      next() {
        return index < items.length
          ? { value: items[index++], done: false }
          : { value: undefined, done: true };
      }
    };
  }
}

const queue = new OrderQueue();
queue.enqueue({ id: "ORD-1", amount: 1200 })
     .enqueue({ id: "ORD-2", amount: 3500 })
     .enqueue({ id: "ORD-3", amount: 800 });

for (const order of queue) {
  console.log(\`Processing: \${order.id} — ₹\${order.amount}\`);
}

const [first, second] = queue;  // destructuring uses Symbol.iterator ✓
console.log([...queue].map(o => o.id)); // ["ORD-1", "ORD-2", "ORD-3"] ✓

// ─────────────────────────────────────────────
// EXAMPLE 4: Symbol.toPrimitive — full coercion control
// ─────────────────────────────────────────────
class Money {
  constructor(amount, currency = "INR") {
    this.amount = amount;
    this.currency = currency;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "number")  return this.amount;          // price + 100
    if (hint === "string")  return \`₹\${this.amount.toLocaleString("en-IN")} \${this.currency}\`;
    if (hint === "default") return this.amount;          // price == 500 (loose comparison)
  }

  add(other) {
    const otherAmount = other instanceof Money ? other.amount : other;
    return new Money(this.amount + otherAmount, this.currency);
  }
}

const price = new Money(1299);
console.log(+price);              // 1299 (number hint)
console.log(\`Price: \${price}\`);  // "Price: ₹1,299 INR" (string hint)
console.log(price + 500);         // 1799 (default hint → number)
console.log(price > 1000);        // true (number comparison)
console.log(String(price));       // "₹1,299 INR"

// ─────────────────────────────────────────────
// EXAMPLE 5: Symbol.toStringTag — custom type display
// ─────────────────────────────────────────────
class HttpResponse {
  constructor(status, body) {
    this.status = status;
    this.body = body;
  }

  get [Symbol.toStringTag]() { return "HttpResponse"; }
}

const res = new HttpResponse(200, { data: "ok" });
console.log(Object.prototype.toString.call(res)); // "[object HttpResponse]"
console.log(res.toString()); // "[object HttpResponse]" (inherits Object.prototype.toString)

// Useful for type-checking in generic code:
function getType(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}
console.log(getType([]));             // "Array"
console.log(getType(new Map()));      // "Map"
console.log(getType(res));            // "HttpResponse" ✓
console.log(getType(new Promise(() => {}))); // "Promise"

// ─────────────────────────────────────────────
// EXAMPLE 6: Symbol.hasInstance — custom instanceof
// ─────────────────────────────────────────────
class Positive {
  static [Symbol.hasInstance](value) {
    return typeof value === "number" && value > 0;
  }
}
class ValidEmail {
  static [Symbol.hasInstance](value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

console.log(42 instanceof Positive);              // true
console.log(-5 instanceof Positive);              // false
console.log("priya@tcs.com" instanceof ValidEmail); // true
console.log("notanemail" instanceof ValidEmail);    // false

// ─────────────────────────────────────────────
// EXAMPLE 7: Symbol metadata — invisible annotations
// ─────────────────────────────────────────────
// Define module-level Symbol keys (not exported — private to module)
const SCHEMA = Symbol("schema");
const DIRTY  = Symbol("dirty");
const CREATED_AT = Symbol("createdAt");

function createEntity(data, schema) {
  const entity = { ...data };
  entity[SCHEMA] = schema;
  entity[DIRTY] = false;
  entity[CREATED_AT] = new Date();
  return entity;
}

function markDirty(entity) { entity[DIRTY] = true; }
function isDirty(entity) { return entity[DIRTY]; }
function getSchema(entity) { return entity[SCHEMA]; }

const userEntity = createEntity(
  { name: "Rahul", email: "rahul@example.com" },
  { name: "string", email: "email" }
);

console.log(JSON.stringify(userEntity));    // {"name":"Rahul","email":"rahul@example.com"}
console.log(Object.keys(userEntity));       // ["name", "email"] — metadata hidden
markDirty(userEntity);
console.log(isDirty(userEntity));           // true ✓`,
    bugs: `BUG 1: Trying to use Symbol in template literal — TypeError
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const id = Symbol("userId");
console.log(\`User ID: \${id}\`);    // TypeError: Cannot convert Symbol to string
console.log("User ID: " + id);    // TypeError: same
console.log(id + "");             // TypeError: same

// WHY: Symbols intentionally resist automatic string coercion
// to prevent accidentally exposing symbol keys as strings (which could leak info)

// FIX: Be explicit about conversion
console.log(\`User ID: \${id.toString()}\`);   // "User ID: Symbol(userId)" ✓
console.log(\`User ID: \${String(id)}\`);       // same ✓
console.log(id.description);               // "userId" — just the description ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Symbol.for() vs Symbol() — thinking they're the same
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
// module-a.js:
const KEY_A = Symbol("shared");
// module-b.js:
const KEY_B = Symbol("shared");
// main.js:
const obj = {};
obj[KEY_A] = "from A";
console.log(obj[KEY_B]); // undefined — KEY_A !== KEY_B even with same description!

// Fix: Use Symbol.for() for symbols that need to be shared across modules
// module-a.js: const KEY = Symbol.for("myapp.shared");
// module-b.js: const KEY = Symbol.for("myapp.shared"); // same symbol ✓

// WARNING: Symbol.for() keys are GLOBAL (including across iframes, workers)
// Use namespaced keys to avoid accidental collisions: "myapp.featureName.propertyName"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Symbol.iterator returning wrong shape — breaks for...of
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
class NumberRange {
  constructor(start, end) { this.start = start; this.end = end; }

  [Symbol.iterator]() {
    let current = this.start;
    return {
      next: () => current <= this.end
        ? { val: current++, finished: false } // WRONG property names!
        : { val: undefined, finished: true }  // Must be 'value' and 'done'
    };
  }
}

for (const n of new NumberRange(1, 3)) {
  console.log(n); // undefined, undefined, undefined — wrong shape!
}

// FIX: Iterator must return { value, done } (exact property names required by protocol)
[Symbol.iterator]() {
  let current = this.start;
  return {
    next: () => current <= this.end
      ? { value: current++, done: false }   // ✓
      : { value: undefined, done: true }    // ✓
  };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: JSON.stringify losing Symbol-keyed data silently
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: storing important data under Symbol key then serializing
const METADATA = Symbol("meta");
const product = {
  id: "P001",
  name: "Laptop",
  [METADATA]: { source: "scraped", confidence: 0.95 } // important!
};

const serialized = JSON.stringify(product);
// {"id":"P001","name":"Laptop"} — METADATA silently dropped!
const deserialized = JSON.parse(serialized);
console.log(deserialized[METADATA]); // undefined — data lost!

// FIX: If data needs to survive serialization, use string keys
// Use Symbol keys ONLY for truly ephemeral or internal metadata
const product2 = {
  id: "P001",
  name: "Laptop",
  _metadata: { source: "scraped", confidence: 0.95 } // survives serialization
};

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Symbol.toPrimitive not handling all three hints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
class Weight {
  constructor(kg) { this.kg = kg; }
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.kg;
    // missing "string" and "default" handling — returns undefined!
  }
}

const w = new Weight(75);
console.log(\`Weight: \${w}\`); // "Weight: undefined" — string hint returns undefined!
console.log(w == 75);        // false — default hint returns undefined!

// FIX: Handle all three hints
[Symbol.toPrimitive](hint) {
  if (hint === "number")  return this.kg;
  if (hint === "string")  return \`\${this.kg}kg\`;
  return this.kg; // default — return number for comparisons
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const s1 = Symbol("foo");
const s2 = Symbol("foo");
const s3 = Symbol.for("bar");
const s4 = Symbol.for("bar");

console.log(s1 === s2);         // (A)
console.log(s3 === s4);         // (B)
console.log(Symbol.keyFor(s1)); // (C)
console.log(Symbol.keyFor(s3)); // (D)

const obj = { [s1]: 1, name: "test" };
console.log(Object.keys(obj));               // (E)
console.log(Object.getOwnPropertySymbols(obj).length); // (F)

// Answers: A=false, B=true, C=undefined, D="bar", E=["name"], F=1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This class tries to be iterable but for...of gives TypeError.
// Find the two bugs and fix them.
class Countdown {
  constructor(from) { this.from = from; }

  [Symbol.iterator] = function() {    // BUG 1: arrow function needed OR regular function — but this is an assignment, not a method
    let n = this.from;
    return {
      next() {
        if (n >= 0) return { value: n--, isDone: false }; // BUG 2: isDone should be 'done'
        return { value: undefined, isDone: true };
      }
    };
  }
}
// Fix both bugs so: [...new Countdown(3)] === [3, 2, 1, 0]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a Currency class with full Symbol support:
  // Must support:
  const price = new Currency(1299, "INR");
  console.log(+price);           // 1299 (number coercion)
  console.log(\`\${price}\`);       // "₹1,299"
  console.log(price > 1000);     // true
  console.log([...price]);       // [1, 2, 9, 9] — iterable over digits
  console.log(Object.prototype.toString.call(price)); // "[object Currency]"
  console.log(price instanceof Currency); // true (trivially)
  // Bonus: add a Symbol-keyed metadata field for exchange rate
  //        that doesn't appear in JSON.stringify`,
    summary: `Symbols are the only way to create truly collision-proof object keys and are invisible to JSON/enumeration — perfect for library metadata and private internal state. Well-known Symbols are the hooks JavaScript exposes for customizing core language behavior: make anything iterable with Symbol.iterator, control type coercion with Symbol.toPrimitive, and customize type tags with Symbol.toStringTag.`
  },

  {
    id: 15,
    title: "Memory Management, Garbage Collection & Performance",
    tag: "V8 INTERNALS & THE COST OF ALLOCATION",
    color: "#DC2626",
    tldr: `V8 uses a generational garbage collector that automatically frees unreachable objects, but closures, event listeners, and timers can accidentally keep objects alive forever. Understanding what "alive" means to the GC, the 5 most common memory leak patterns, and how V8's hidden classes affect property access speed is what separates code that scales from code that slows to a crawl.`,
    problem: `Why does my React SPA eat 2GB of memory after 30 minutes?
  // Event listeners not removed on unmount — each navigation adds more

Why does my Node.js API server slow down over hours and require daily restarts?
  // Closures capturing request objects — old requests never collected

Why is accessing obj.x slower after doing delete obj.y?
  // V8's hidden class (Shape) is invalidated — object falls to "dictionary mode"

Why does creating objects in a hot loop cause GC pauses and jank?
  // Allocation pressure → young gen fills up → minor GC runs → 1-2ms freeze

How do I prove there's a memory leak without just watching Task Manager?
  // Chrome DevTools heap snapshots: take 3, compare retained objects

These questions matter at production scale.
A memory leak that's invisible during development becomes a Kubernetes OOM kill
in production. A polymorphic hot path that seems fine in tests creates
100ms spikes that tanks your Core Web Vitals.`,
    analogy: `V8's memory is like a CITY OF APARTMENTS:

YOUNG GENERATION (Nursery) — cheap apartments:
  New objects are born here. Rent is cheap (fast allocation — just bump a pointer).
  The building is small, so it fills up fast. When full, the "landlord" (minor GC)
  evicts anything that has no tenant (unreachable) — very fast, runs often (~every few ms).
  Long-term tenants (survived 2+ evictions) get PROMOTED to the old district.

OLD GENERATION — permanent residences:
  Objects that survived nursery rounds live here. More space, but harder to clean.
  The "city inspector" (major GC) does full sweeps — slow but thorough.
  These inspections are expensive — that's what causes GC pauses.

MEMORY LEAK = a zombie tenant that never leaves:
  Something keeps the tenant's name on a lease (a reference),
  so the landlord can't evict them — even though they're "really" gone.
  Common lease-keepers: event listeners, closures, global variables, timers.

HIDDEN CLASSES = apartment floor plans (Shapes):
  V8 optimizes objects that share the same layout (hidden class).
  All { name, age, email } objects share a shape → V8 can look up properties by fixed offset.
  Delete a property → shape changes → V8 must use a slower "dictionary" lookup.
  Adding properties in different orders → different shapes → can't optimize together.`,
    deep: `V8 GARBAGE COLLECTION — THE FULL PICTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATIONAL HYPOTHESIS: Most objects die young.
  V8 exploits this by having two generations:

YOUNG GENERATION (nursery, ~1-8 MB):
  - Allocation: "bump pointer" — O(1), just move a pointer. Fastest possible.
  - Minor GC (Scavenger): Cheney algorithm — copies live objects to "to-space",
    rest is freed. Runs when young gen is full.
  - Frequency: ~every 1-5ms during heavy allocation
  - Duration: ~0.5-1ms (mostly paused, though V8 does parallel scavenging)

OLD GENERATION (1MB - several GB):
  - Allocation: free-list based, slightly slower
  - Major GC (Mark-Sweep-Compact):
      1. Mark: traverse all live objects from GC roots (global, stack, registers)
      2. Sweep: add unmarked objects to free lists
      3. Compact: optionally defragment memory
  - V8 uses INCREMENTAL MARKING: spreads marking work across many small steps
    interspersed with JavaScript execution → avoids long stop-the-world pauses
  - Concurrent sweeping: runs on separate thread while JS runs

GC ROOTS — what keeps objects alive:
  - Global variables (window, global)
  - Currently executing functions (call stack frames)
  - Active event listeners
  - Active timers (setInterval IDs)
  - DOM nodes (even detached ones if referenced by JS)
  - Module-level variables
  - Closures (anything captured by a live function)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE 5 MOST COMMON MEMORY LEAK PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Forgotten event listeners (most common in SPAs)
2. Closures capturing large objects unnecessarily
3. Global variable accumulation (caches without eviction)
4. setInterval without clearInterval (timer holds closure → closure holds data)
5. Detached DOM trees held in JavaScript references

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
V8 HIDDEN CLASSES (SHAPES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every object in V8 has an associated "Shape" (hidden class) that describes
its properties' layout. When two objects have the same shape, V8 can use
"inline cache" optimizations — it knows property X is always at offset 24.

Shape transitions happen when:
  - Adding a new property (new shape created for each transition)
  - Deleting a property (V8 may deoptimize to "dictionary mode")

MONOMORPHIC: one shape seen → fastest (inline cache hits every time)
POLYMORPHIC: 2-4 shapes seen → slower (small inline cache)
MEGAMORPHIC: 5+ shapes seen → slowest (no inline cache, falls to generic)

Rules for shape stability:
  1. Always add properties in the SAME ORDER in constructors
  2. Avoid delete (use null/undefined assignment instead)
  3. Don't mix property additions dynamically — set all properties in constructor
  4. Avoid very large objects in hot paths (>10-20 properties per object)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBJECT POOLING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Instead of creating and discarding objects in a tight loop (GC pressure),
  maintain a pool of pre-allocated objects. "Borrow" from pool, "return" when done.
  Common in: game engines, high-frequency trading, real-time audio processing.

━━━━━━━━━────────────────────────────────
PERFORMANCE API:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  performance.mark("start-compute")
  performance.mark("end-compute")
  performance.measure("compute-duration", "start-compute", "end-compute")
  performance.getEntriesByName("compute-duration")[0].duration // ms
  
  More accurate than Date.now() — uses high-resolution timestamps.
  Marks appear in Chrome DevTools Performance tab.`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Memory leak — event listener not cleaned up
// ─────────────────────────────────────────────
// BUGGY REACT-LIKE COMPONENT:
class Dashboard {
  constructor() {
    this.data = new Array(50000).fill({ value: Math.random() }); // 50K items
    this.handleResize = this.handleResize.bind(this); // bound function holds 'this'
    window.addEventListener("resize", this.handleResize); // LEAK if never removed!
  }

  handleResize() {
    // 'this' is Dashboard instance → keeps entire instance alive
    this.render();
  }

  render() { console.log("Rendering with", this.data.length, "items"); }

  destroy() {
    window.removeEventListener("resize", this.handleResize); // MUST clean up
    this.data = null; // release data reference
  }
}

// In React: return cleanup from useEffect
// useEffect(() => {
//   const handler = () => setWidth(window.innerWidth);
//   window.addEventListener("resize", handler);
//   return () => window.removeEventListener("resize", handler); // cleanup ✓
// }, []);

// ─────────────────────────────────────────────
// EXAMPLE 2: setInterval leak — timer keeps closure alive
// ─────────────────────────────────────────────
// BUGGY: interval holds reference to bigData forever
function startPolling() {
  const reportData = fetchInitialReport(); // 10MB of data

  const intervalId = setInterval(() => {
    // This closure captures 'reportData' — even if we only use a small part
    const latest = reportData.items.slice(-10);
    updateUI(latest);
  }, 5000);

  // If clearInterval is never called (component unmounts, page navigates),
  // reportData stays alive in memory indefinitely
  return intervalId; // caller MUST call clearInterval(id) when done!
}

// GOOD: return cleanup function
function startPollingFixed() {
  const reportData = fetchInitialReport();
  const intervalId = setInterval(() => {
    updateUI(reportData.items.slice(-10));
  }, 5000);
  return () => {
    clearInterval(intervalId); // cleanup — closure + reportData can now be GC'd
  };
}
const stopPolling = startPollingFixed();
// later: stopPolling();

// ─────────────────────────────────────────────
// EXAMPLE 3: V8 Hidden Classes — shape stability
// ─────────────────────────────────────────────
// BAD: Different initialization order → different shapes → polymorphic
function createUserBad(type) {
  const user = {};
  user.name = "Priya";
  if (type === "admin") {
    user.role = "admin";   // shape A: {name, role}
    user.level = 5;
  } else {
    user.level = 1;        // shape B: {name, level} — different order!
    user.role = "viewer";  // shape C: {name, level, role}
  }
  return user;
}
// user objects have 2-3 different shapes → polymorphic access → slower

// GOOD: Same shape for all instances — monomorphic
function createUserGood(type = "viewer") {
  return {           // All created with SAME shape: {name, role, level}
    name: "Priya",
    role: type === "admin" ? "admin" : "viewer",
    level: type === "admin" ? 5 : 1
  };
}

// ─────────────────────────────────────────────
// EXAMPLE 4: Object pooling — reduce GC pressure in tight loops
// ─────────────────────────────────────────────
class Vector2Pool {
  #pool = [];
  #stats = { created: 0, reused: 0 };

  acquire(x = 0, y = 0) {
    if (this.#pool.length > 0) {
      const v = this.#pool.pop();
      v.x = x; v.y = y;  // reset to new values
      this.#stats.reused++;
      return v;
    }
    this.#stats.created++;
    return { x, y };      // new allocation — only when pool empty
  }

  release(v) {
    v.x = 0; v.y = 0;    // zero out for safety
    this.#pool.push(v);   // return to pool
  }

  get stats() { return { ...this.#stats, poolSize: this.#pool.length }; }
}

const pool = new Vector2Pool();

// Simulate physics update — 60fps, thousands of vectors per frame
function physicsUpdate(particles) {
  const tempVelocity = pool.acquire(0, 0); // reuse instead of new {}
  for (const p of particles) {
    tempVelocity.x = p.vx * 0.016;
    tempVelocity.y = p.vy * 0.016;
    p.x += tempVelocity.x;
    p.y += tempVelocity.y;
  }
  pool.release(tempVelocity); // return to pool — no GC needed
}
// Without pool: 1000 particles × 60fps = 60,000 objects/sec → constant GC pressure
// With pool: 1 object reused → near-zero GC pressure

// ─────────────────────────────────────────────
// EXAMPLE 5: Performance API — accurate profiling
// ─────────────────────────────────────────────
function profileOperation(name, fn) {
  const markStart = \`\${name}-start\`;
  const markEnd = \`\${name}-end\`;
  const measure = \`\${name}-duration\`;

  performance.mark(markStart);
  const result = fn();
  performance.mark(markEnd);
  performance.measure(measure, markStart, markEnd);

  const entry = performance.getEntriesByName(measure)[0];
  console.log(\`\${name}: \${entry.duration.toFixed(3)}ms\`);

  // Cleanup marks to avoid accumulation
  performance.clearMarks(markStart);
  performance.clearMarks(markEnd);
  performance.clearMeasures(measure);

  return result;
}

// Usage:
const sorted = profileOperation("sort-1M-items", () => {
  const arr = Array.from({ length: 1_000_000 }, () => Math.random());
  return arr.sort((a, b) => a - b);
});
// "sort-1M-items: 312.847ms"

// ─────────────────────────────────────────────
// EXAMPLE 6: Closure memory leak — fix with null-ing
// ─────────────────────────────────────────────
// BUGGY: originalRequest stays alive for the lifetime of every retry closure
function retryWithBackoff(request, maxRetries = 3) {
  const originalRequest = request; // might be large — request body, headers, etc.
  let attempts = 0;

  return function retry() {
    attempts++;
    return fetch(originalRequest.url, originalRequest.options)
      .catch(err => {
        if (attempts < maxRetries) {
          return new Promise(resolve =>
            setTimeout(() => resolve(retry()), 1000 * attempts)
          );
        }
        throw err; // originalRequest stays captured even after max retries
      });
  };
}

// BETTER: Extract only what's needed — don't capture the whole request object
function retryWithBackoffFixed(url, options, maxRetries = 3) {
  let attempts = 0;
  // Only url and options captured — not a large request object
  return function retry() {
    attempts++;
    return fetch(url, options)
      .catch(err => {
        if (attempts < maxRetries) {
          return new Promise(r => setTimeout(() => r(retry()), 1000 * attempts));
        }
        throw err;
      });
  };
}

// ─────────────────────────────────────────────
// EXAMPLE 7: Detecting memory leaks via allocation tracking
// ─────────────────────────────────────────────
// Pattern for catching common leaks in Node.js:
// (pseudo-code — uses v8 module in Node.js)

// const v8 = require("v8");

// function checkHeap(label) {
//   const stats = v8.getHeapStatistics();
//   console.log(\`[\${label}] heap used: \${(stats.used_heap_size / 1024 / 1024).toFixed(1)}MB\`);
// }

// async function simulateLeak() {
//   const listeners = [];
//   checkHeap("before");
//   for (let i = 0; i < 1000; i++) {
//     const largeData = new Array(1000).fill(\`data-\${i}\`);
//     const handler = () => console.log(largeData[0]); // captures largeData
//     process.on("uncaughtException", handler); // never removed!
//     listeners.push(handler);
//   }
//   if (global.gc) global.gc(); // force GC (run with --expose-gc flag)
//   checkHeap("after"); // significantly higher — leak confirmed
// }
// simulateLeak();`,
    bugs: `BUG 1: Forgotten event listener accumulates on every route navigation (SPA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Every time the "Dashboard" component mounts, it adds a listener.
// Every time it unmounts (route change), the listener stays.
// After 50 navigations: 50 active listeners, each holding a React fiber reference.
class DashboardComponent {
  mounted() {
    document.addEventListener("visibilitychange", this.handleVisibility);
    // NEVER removed in destroyed/unmounted lifecycle!
  }
  handleVisibility() { /* uses 'this' — keeps entire component alive */ }
}

// FIX: Always pair addEventListener with removeEventListener
class DashboardFixed {
  mounted() {
    this._visHandler = this.handleVisibility.bind(this);
    document.addEventListener("visibilitychange", this._visHandler);
  }
  destroyed() {
    document.removeEventListener("visibilitychange", this._visHandler); ✓
    this._visHandler = null; // release bound function reference
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: delete vs null — unintended hidden class demotion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Deleting a property in a hot path causes hidden class change
function processTransaction(tx) {
  const normalized = { ...tx };
  if (!normalized.discount) {
    delete normalized.discount; // forces hidden class change to "dictionary mode"
  }
  return computeTotal(normalized); // now slower — polymorphic/dictionary access
}
// After thousands of calls: V8 can't optimize computeTotal anymore

// FIX: Set to null/undefined instead of delete — preserves shape
function processTransactionFixed(tx) {
  const normalized = { ...tx };
  if (!normalized.discount) {
    normalized.discount = 0; // shape preserved — monomorphic ✓
  }
  return computeTotal(normalized);
}

// OR: Always include all properties in initial object creation:
function createTransaction(data) {
  return {
    id: data.id ?? null,
    amount: data.amount ?? 0,
    discount: data.discount ?? 0,   // always present — stable shape
    tax: data.tax ?? 0,
    customer: data.customer ?? null
  };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Global cache growing unbounded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Cache with no eviction policy — grows forever
const apiCache = {};
async function fetchWithCache(url) {
  if (apiCache[url]) return apiCache[url];
  const data = await fetch(url).then(r => r.json());
  apiCache[url] = data;     // never evicted — unbounded growth
  return data;
}
// 10,000 unique URLs = 10,000 cached responses in memory forever

// FIX: LRU cache with max size, or TTL-based expiry
const ttlCache = new Map();
async function fetchWithTTL(url, ttlMs = 60000) {
  const cached = ttlCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }
  const data = await fetch(url).then(r => r.json());
  ttlCache.set(url, { data, timestamp: Date.now() });
  // Simple eviction: clear old entries periodically
  if (ttlCache.size > 500) {
    const oldestKey = ttlCache.keys().next().value; // Map preserves insertion order
    ttlCache.delete(oldestKey);
  }
  return data;
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Closure capturing large outer scope unnecessarily
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: getConfig() closes over ALL of config — even though only apiKey needed
function setupClient(config) {
  // config = { apiKey, secret, largeMetadata: 50MB of data, ... }
  return {
    get(endpoint) {
      // Only needs config.apiKey — but captures ENTIRE config object
      return fetch(endpoint, { headers: { "X-API-Key": config.apiKey } });
    }
  };
}
// As long as the client exists, all 50MB of config stays in memory

// FIX: Extract only what's needed — minimize closure scope
function setupClientFixed(config) {
  const { apiKey } = config; // only capture what's needed
  config = null;             // release reference to large config (optional)
  return {
    get(endpoint) {
      return fetch(endpoint, { headers: { "X-API-Key": apiKey } });
    }
  };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Object creation in tight loop — GC pressure and jank
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Creates a new object every frame for every particle
function animateParticles(particles) {
  function frame() {
    for (const p of particles) {
      const velocity = { x: p.vx * 0.016, y: p.vy * 0.016 }; // new object every frame!
      p.x += velocity.x;  // velocity immediately discarded → GC fodder
      p.y += velocity.y;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
// 1000 particles × 60fps = 60,000 objects/second → minor GC every ~100ms → jank

// FIX 1: Use scalar variables — no object allocation
function animateParticlesFixed(particles) {
  function frame() {
    for (const p of particles) {
      const dvx = p.vx * 0.016; // just a number — stack allocated
      const dvy = p.vy * 0.016; // just a number — stack allocated
      p.x += dvx;
      p.y += dvy;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// FIX 2: Use TypedArrays (Float32Array) for particle data — no GC at all
// TypedArray data is outside the V8 heap — immune to GC pressure
const particleData = new Float32Array(particles.length * 4); // [x, y, vx, vy, ...]`,
    challenge: `CHALLENGE 1 — Predict the Memory Behavior:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function createLeak() {
  const bigArray = new Array(100000).fill({ x: 1, y: 2 });

  function inner() {
    return bigArray.length; // captures bigArray
  }

  window.leaked = inner; // attaches to global — never GC'd
  return inner;
}

createLeak();
createLeak(); // called again — second bigArray also leaked
createLeak(); // third

// Questions:
// (A) How many bigArray instances are alive after 3 calls? → 3 (each window.leaked overwrites reference, but closures are new each time... actually: 1 — window.leaked is overwritten twice. Only the LAST closure keeps its bigArray. The first two bigArrays are eligible for GC)
// (B) What keeps the last bigArray alive? → window.leaked (global reference) → inner function closure → bigArray
// (C) How do you fix this? → delete window.leaked; or window.leaked = null;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Find the Hidden Class Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This payment processor is mysteriously slower than expected.
// Identify why V8 can't optimize it and fix it.
function processPayment(payment) {
  const tx = {};
  tx.id = generateId();
  tx.amount = payment.amount;

  if (payment.type === "upi") {
    tx.upiId = payment.upiId;    // shape: {id, amount, upiId}
    tx.bank = payment.bank;       // shape: {id, amount, upiId, bank}
  } else if (payment.type === "card") {
    tx.cardLast4 = payment.last4; // shape: {id, amount, cardLast4}
    tx.network = payment.network; // shape: {id, amount, cardLast4, network}
  } else {
    tx.walletId = payment.walletId; // shape: {id, amount, walletId}
  }
  return saveTransaction(tx); // saveTransaction sees 3 different shapes!
}

// Fix: create all possible properties upfront (stable shape)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a memory-efficient object pool with monitoring:
  class ObjectPool {
    constructor(factory, resetFn, maxSize = 100) { ... }
    acquire(...args)  // get object from pool or create new one
    release(obj)      // return to pool (calls resetFn)
    get stats()       // { poolSize, created, acquired, released, hitRate }
    drain()           // clear pool (for cleanup/testing)
  }
  const pointPool = new ObjectPool(
    () => ({ x: 0, y: 0 }),     // factory
    (p) => { p.x = 0; p.y = 0; } // reset function
  );
  // Must track: how many were created vs reused (hit rate)
  // Must respect maxSize — don't hold more than maxSize objects in pool`,
    summary: `V8's generational GC is automatic but not infallible — closures, event listeners, timers, and global caches can silently keep objects alive forever. Stable hidden classes (by initializing all properties in the constructor and avoiding delete) unlock V8's inline cache optimizations. Profile first with Chrome DevTools heap snapshots, then fix — never optimize memory without evidence.`
  }
];
