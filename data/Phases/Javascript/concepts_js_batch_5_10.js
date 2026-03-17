const concepts = [
  {
    id: 6,
    title: "'this' — All 4 Binding Rules",
    tag: "WHO AM I RIGHT NOW?",
    color: "#0EA5E9",
    tldr: `'this' in JavaScript is not fixed at write-time — it's determined at call-time by HOW a function is invoked, not where it's defined. There are exactly 4 binding rules with a clear priority order: new > explicit (.call/.bind/.apply) > implicit (object.method()) > default (global/undefined). Arrow functions are the single exception — they ignore all 4 rules and inherit 'this' from their enclosing lexical scope.`,
    problem: `Why does 'this' suddenly become undefined or the global object?
  const user = {
    name: "Priya",
    greet() { console.log(this.name); }
  };
  const fn = user.greet;
  fn(); // undefined — why? We just copied the method!

Why does a callback lose 'this'?
  class Timer {
    constructor() { this.count = 0; }
    start() {
      setInterval(function() {
        this.count++; // TypeError: Cannot set property 'count' of undefined
      }, 1000);
    }
  }

Why does .bind() not work on arrow functions?
  const obj = { x: 10 };
  const arrow = () => console.log(this.x);
  arrow.call(obj); // still logs undefined — .call is ignored!

Why does an arrow function in an object literal not refer to the object?
  const cart = {
    items: [],
    add: (item) => cart.items.push(item) // 'this' here is NOT cart
  };

If you can't predict 'this', every callback, every class method, every event handler
is a potential bug waiting to happen.`,
    analogy: `Think of 'this' as a name badge that gets attached to a function when it's CALLED, not when it's written.

Rule 1 — DEFAULT: If nobody puts a badge on you, you either wear the building's badge (global object, sloppy mode) or no badge at all (undefined, strict mode).

Rule 2 — IMPLICIT: If you're called as "building.room.function()", the badge says whatever is directly to the LEFT of the last dot — not the building, not the room from two levels up. Just the immediate caller.

Rule 3 — EXPLICIT: .call() and .apply() let you HAND someone a specific badge before they perform. .bind() creates a clone of the function with a badge permanently STAPLED ON — can't be changed, even by another .call().

Rule 4 — new: The 'new' keyword creates a BRAND NEW blank badge, staples it on the function, and when the function finishes, that badge becomes the return value.

PRIORITY ORDER: new (stapled fresh) > explicit (handed to them) > implicit (left of the dot) > default (building's badge or nothing)

ARROW EXCEPTION: Arrow functions are like contractors who refuse to wear any badge other than the one from the company they work for (the outer scope). You cannot give them a different badge — .call(), .bind(), new all bounce off.`,
    deep: `THE 4 BINDING RULES — COMPLETE SPECIFICATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1: DEFAULT BINDING (lowest priority)
  - Applies when: function called as plain function, no dot, no .call, no new
  - Sloppy mode: this = global object (window in browser, global in Node)
  - Strict mode: this = undefined
  - "use strict" anywhere in the call chain affects this

  function show() { console.log(this); }
  show();               // window (sloppy) | undefined (strict)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2: IMPLICIT BINDING
  - Applies when: function called as a method via dot notation
  - this = the object immediately to the LEFT of the dot at call time

  const obj = { name: "Ankit", greet() { return this.name; } };
  obj.greet(); // this = obj → "Ankit"

  IMPLICIT LOSS — the #1 source of 'this' bugs:
  const fn = obj.greet;   // fn is now just the raw function — no object context
  fn();                   // this = undefined (strict) — implicit binding LOST

  Other loss scenarios:
  setTimeout(obj.greet, 100);          // callback — lost
  [obj.greet].forEach(f => f());       // array iteration — lost
  const { greet } = obj; greet();      // destructuring — lost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 3: EXPLICIT BINDING
  - .call(thisArg, arg1, arg2): invoke immediately, args spread
  - .apply(thisArg, [args]):    invoke immediately, args as array
  - .bind(thisArg, ...args):    returns NEW function with this permanently bound

  Difference: call/apply invoke; bind returns without invoking
  .bind() creates a HARD BINDING — subsequent .call()/.bind() cannot override it

  const bound = fn.bind(obj);
  bound.call(anotherObj); // this is STILL obj — bind wins over call

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 4: new BINDING (highest priority over explicit/implicit)
  - 4 steps the 'new' operator performs:
  1. Creates a brand new empty object: {}
  2. Sets its [[Prototype]] to Constructor.prototype
  3. Calls Constructor with 'this' = the new object
  4. Returns the new object (unless constructor explicitly returns another object)

  function User(name) { this.name = name; }
  const u = new User("Rahul");
  // Step 1: obj = {}
  // Step 2: obj.__proto__ = User.prototype
  // Step 3: User.call(obj, "Rahul") → obj.name = "Rahul"
  // Step 4: return obj → u = obj

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARROW FUNCTIONS — LEXICAL 'this':
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Arrow functions have NO OWN 'this'. Period.
  They capture 'this' from the ENCLOSING LEXICAL CONTEXT at definition time.
  .call(), .apply(), .bind() all silently have no effect on 'this' in arrow functions.
  'new' on an arrow function: TypeError — arrow functions cannot be constructors.

  GOTCHA — arrow in object literal:
  const obj = {
    name: "Sita",
    greet: () => console.log(this.name) // 'this' is NOT obj!
  };
  // Object literals do NOT create a new 'this' scope.
  // The arrow captures 'this' from where the object literal was WRITTEN.
  // In module scope (strict): this = undefined → this.name throws or logs undefined
  // At top level (browser, sloppy): this = window → window.name (probably "")

  CORRECT: Use regular method shorthand for object methods
  const obj2 = {
    name: "Sita",
    greet() { console.log(this.name); } // method shorthand — has own 'this'
  };

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THREE FIXES FOR LOST 'this' IN CLASSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fix 1: .bind() in constructor
  constructor() { this.handleClick = this.handleClick.bind(this); }

Fix 2: Arrow class field (V8 creates bound method per instance)
  handleClick = () => { console.log(this); }; // lexical this = instance

Fix 3: Arrow at call site (inline)
  <button onClick={() => this.handleClick()}>

TRADEOFF: Fix 2 creates a new function per instance (vs prototype method once).
Fix 1 also creates per instance but keeps method on prototype conceptually cleaner.`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: All 4 rules demonstrated
// ─────────────────────────────────────────────
function identify() {
  return this?.name ?? "no name / undefined this";
}

// Rule 1: Default binding
identify(); // "no name / undefined this" (strict) or window.name (sloppy)

// Rule 2: Implicit binding
const employee = { name: "Karan", identify };
employee.identify(); // "Karan" — this = employee (left of dot)

// Rule 3: Explicit binding
const manager = { name: "Sunita" };
identify.call(manager);      // "Sunita"
identify.apply(manager);     // "Sunita"
const boundFn = identify.bind(manager);
boundFn();                   // "Sunita"

// Rule 4: new binding
function Person(name) { this.name = name; }
const p = new Person("Deepa");
p.identify = identify;
p.identify(); // "Deepa"

// ─────────────────────────────────────────────
// EXAMPLE 2: Implicit loss — the most common real-world bug
// ─────────────────────────────────────────────
class OrderService {
  constructor() {
    this.orders = [];
    this.serviceName = "OrderService";
  }
  fetchOrders() {
    console.log(\`Fetching from \${this.serviceName}\`);
    return this.orders;
  }
}

const service = new OrderService();

// Direct call — works ✓
service.fetchOrders(); // "Fetching from OrderService"

// Detached — LOSES 'this'
const detached = service.fetchOrders;
// detached(); // TypeError: Cannot read properties of undefined (strict mode)

// Inside callback — LOSES 'this'
const actions = [service.fetchOrders];
// actions[0](); // TypeError — 'this' is not OrderService

// FIX 1: bind at extraction
const safeFetch = service.fetchOrders.bind(service);
safeFetch(); // works ✓

// FIX 2: wrap in arrow
setTimeout(() => service.fetchOrders(), 100); // arrow preserves the call site ✓

// ─────────────────────────────────────────────
// EXAMPLE 3: .call() vs .apply() vs .bind() — real use cases
// ─────────────────────────────────────────────
function formatCurrency(currency, symbol, amount) {
  return \`\${this.name}: \${symbol}\${amount} \${currency}\`;
}

const inrContext = { name: "India Price" };
const usdContext = { name: "US Price" };

// .call — spread args
formatCurrency.call(inrContext, "INR", "₹", 5000); // "India Price: ₹5000 INR"

// .apply — array of args (useful when args are already in array)
const args = ["USD", "$", 60];
formatCurrency.apply(usdContext, args);             // "US Price: $60 USD"

// .bind — create specialized function
const formatINR = formatCurrency.bind(inrContext, "INR", "₹");
formatINR(10000); // "India Price: ₹10000 INR"
formatINR(25000); // "India Price: ₹25000 INR"

// Real use: borrowing Array methods for array-like objects
function sumArgs() {
  // arguments is array-like but has no .reduce()
  return Array.prototype.reduce.call(arguments, (sum, n) => sum + n, 0);
}
console.log(sumArgs(100, 200, 300)); // 600

// ─────────────────────────────────────────────
// EXAMPLE 4: Arrow function — lexical 'this' in class context
// ─────────────────────────────────────────────
class PaymentProcessor {
  constructor(gatewayName) {
    this.gateway = gatewayName;
    this.retries = 0;
  }

  // Arrow class field: 'this' is ALWAYS the instance — even as a callback
  processPayment = (amount) => {
    this.retries++;
    console.log(\`Processing ₹\${amount} via \${this.gateway} (attempt \${this.retries})\`);
    return fetch(\`/api/pay?amount=\${amount}&gateway=\${this.gateway}\`);
  };

  setupEventListeners() {
    // Safe to pass as callback — arrow method preserves 'this'
    document.getElementById("payBtn").addEventListener("click", () => {
      this.processPayment(500); // 'this' = PaymentProcessor instance ✓
    });
    // Also safe — processPayment is already an arrow bound to instance
    [100, 200, 300].forEach(this.processPayment); // ✓ — each call has correct 'this'
  }
}

// ─────────────────────────────────────────────
// EXAMPLE 5: Arrow gotcha — object literal 'this' trap
// ─────────────────────────────────────────────
const cart = {
  storeName: "Myntra",
  items: [],

  // WRONG: arrow captures outer 'this' (module/global), NOT cart
  addItemWrong: (item) => {
    // this.items is undefined or window.items — NOT cart.items
    console.log(this); // outer scope 'this'
  },

  // CORRECT: regular method — 'this' bound at call time to cart
  addItem(item) {
    this.items.push(item);
    console.log(\`Added \${item} to \${this.storeName} cart\`);
  },

  // CORRECT for nested: arrow INSIDE a regular method captures the method's 'this'
  addMultiple(items) {
    items.forEach(item => {
      this.items.push(item); // 'this' = cart — arrow captures addMultiple's 'this' ✓
    });
  }
};

cart.addItem("Kurta");     // "Added Kurta to Myntra cart" ✓
cart.addMultiple(["Saree", "Dupatta"]); // ✓

// ─────────────────────────────────────────────
// EXAMPLE 6: new binding — constructor return object override
// ─────────────────────────────────────────────
function NormalConstructor(name) {
  this.name = name;
  // implicitly returns 'this' — the new object
}

function OverrideConstructor(name) {
  this.name = name;
  return { name: "OVERRIDE", note: "returned object wins" }; // object return overrides
}

function PrimitiveReturn(name) {
  this.name = name;
  return 42; // primitive return is IGNORED — 'this' still returned
}

const n1 = new NormalConstructor("Ravi");      // { name: "Ravi" }
const n2 = new OverrideConstructor("Ravi");    // { name: "OVERRIDE", note: "..." }
const n3 = new PrimitiveReturn("Ravi");        // { name: "Ravi" } — 42 ignored

// ─────────────────────────────────────────────
// EXAMPLE 7: Three class fixes compared
// ─────────────────────────────────────────────
// Fix 1: bind in constructor (one function on prototype, bound per instance)
class CounterV1 {
  constructor() {
    this.count = 0;
    this.increment = this.increment.bind(this); // bound copy per instance
  }
  increment() { this.count++; console.log(this.count); }
}

// Fix 2: Arrow class field (new function per instance, but cleanest syntax)
class CounterV2 {
  count = 0;
  increment = () => { this.count++; console.log(this.count); }; // always safe
}

// Fix 3: arrow at call site (prototype method preserved, arrow wraps it)
class CounterV3 {
  count = 0;
  increment() { this.count++; console.log(this.count); }
}
const c3 = new CounterV3();
document.getElementById("btn")?.addEventListener("click", () => c3.increment()); // ✓

const c1 = new CounterV1();
const c2 = new CounterV2();
[c1.increment, c2.increment].forEach(fn => fn()); // Both work — this not lost`,
    bugs: `BUG 1: setTimeout callback loses 'this' — classic React/class bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
class Poller {
  constructor(url) {
    this.url = url;
    this.data = null;
  }
  start() {
    setInterval(function() {
      fetch(this.url) // TypeError: Cannot read properties of undefined (reading 'url')
        .then(r => r.json())
        .then(d => { this.data = d; }); // also broken
    }, 5000);
  }
}
// Regular function in setInterval — 'this' defaults to global/undefined (strict)

// FIX: Use arrow function to preserve enclosing 'this'
start() {
  setInterval(() => {         // arrow captures 'this' = Poller instance
    fetch(this.url)           // ✓
      .then(r => r.json())
      .then(d => { this.data = d; }); // ✓
  }, 5000);
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Event listener loses 'this' when method passed as reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
class SearchBar {
  constructor() {
    this.query = "";
    document.getElementById("searchInput")
      .addEventListener("input", this.handleInput); // 'this' will be the DOM element!
  }
  handleInput(e) {
    this.query = e.target.value; // TypeError or sets property on DOM element!
    console.log(\`Searching: \${this.query}\`);
  }
}
// addEventListener calls the function with 'this' = the event target element

// FIX: Bind in constructor
constructor() {
  this.query = "";
  this.handleInput = this.handleInput.bind(this); // bound to instance
  document.getElementById("searchInput").addEventListener("input", this.handleInput);
}
// Now: removeEventListener(this.handleInput) also works (same reference) ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Chained methods — intermediate 'this' loss
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const api = {
  baseUrl: "https://api.swiggy.com",
  getOrders() {
    return fetch(this.baseUrl + "/orders"); // 'this' = api ✓ here
  },
  getRestaurants() {
    return fetch(this.baseUrl + "/restaurants");
  }
};

const { getOrders, getRestaurants } = api;
// getOrders(); // TypeError — 'this' lost via destructuring

// FIX: Bind methods if you need to destructure
const { getOrders: fetchOrders } = {
  getOrders: api.getOrders.bind(api)
};
fetchOrders(); // ✓

// BETTER FIX: Use a class with arrow fields, or don't destructure methods

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Arrow function in object literal — 'this' is outer scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const wallet = {
  balance: 10000,
  owner: "Amit",
  // Dev uses arrow thinking it's cleaner syntax — but 'this' is wrong
  getBalance: () => {
    return \`\${this.owner}'s balance: ₹\${this.balance}\`; // this is outer scope!
  }
};
console.log(wallet.getBalance()); // "undefined's balance: ₹undefined"

// FIX: Use method shorthand (or regular function expression)
const walletFixed = {
  balance: 10000,
  owner: "Amit",
  getBalance() {   // method shorthand — 'this' bound at call time to walletFixed
    return \`\${this.owner}'s balance: ₹\${this.balance}\`; // ✓
  }
};

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: .bind() called on an already-bound or arrow function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Developer thinks .bind() overrides previous .bind()
function greet() { return this?.name; }
const boundToRavi  = greet.bind({ name: "Ravi" });
const boundToSuresh = boundToRavi.bind({ name: "Suresh" }); // has NO effect!
console.log(boundToSuresh()); // "Ravi" — first .bind() wins permanently

// Also buggy: trying to rebind an arrow function
const arrowGreet = () => "hello from " + this?.name;
const attempted = arrowGreet.bind({ name: "anyone" });
console.log(attempted()); // "hello from undefined" — .bind() ignored on arrow

// FIX: If you need rebindable 'this', use regular functions only.
// Design APIs so you don't need to rebind already-bound functions.`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const obj = {
  value: 42,
  regular: function() { return this?.value; },
  arrow: () => this?.value,
  nested: {
    value: 100,
    regular: function() { return this?.value; },
    arrow: () => this?.value
  }
};

console.log(obj.regular());         // (A)
console.log(obj.arrow());           // (B)
console.log(obj.nested.regular());  // (C)
console.log(obj.nested.arrow());    // (D)

const fn = obj.regular;
console.log(fn());                  // (E) — strict mode assumed

// Answers:
// A = 42    (implicit: obj is left of dot)
// B = undefined (arrow: outer scope 'this' — module scope strict = undefined)
// C = 100   (implicit: obj.nested is left of dot)
// D = undefined (arrow: outer scope, same as B — object literals don't create scope)
// E = undefined (strict) or window.value (sloppy) — implicit binding lost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fix all 'this' binding issues in this class:
class ShoppingCart {
  constructor(storeName) {
    this.storeName = storeName;
    this.items = [];
    this.total = 0;
  }

  addItem(item) {
    this.items.push(item);
    this.total += item.price;
  }

  startAutoSave() {
    setInterval(function() {
      console.log(\`Auto-saving \${this.storeName} cart...\`); // BUG 1
      this.items.forEach(function(item) {
        console.log(\`  - \${item.name}: ₹\${item.price}\`);  // BUG 2
      });
    }, 3000);
  }

  getSummary() {
    return \`\${this.storeName}: \${this.items.length} items, ₹\${this.total}\`;
  }
}
// Fix startAutoSave() to correctly reference 'this' in both places

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement your own .bind() function (myBind) that:
1. Returns a new function with 'this' permanently set
2. Supports partial application (pre-bound args)
3. Works correctly when the bound function is used with 'new'
   (new should ignore the bound 'this' and use the newly created object)

Function.prototype.myBind = function(context, ...preArgs) {
  // Your implementation here
};

// Test:
function Product(name, price) {
  this.name = name;
  this.price = price;
}
const BoundProduct = Product.myBind({ ignore: true }, "Laptop");
const p = new BoundProduct(75000);
console.log(p instanceof Product); // true — new ignores bound context
console.log(p.name);   // "Laptop"
console.log(p.price);  // 75000`,
    summary: `'this' is determined entirely by HOW a function is called, with a strict priority: new > explicit (.call/.bind/.apply) > implicit (object.method()) > default (global or undefined). Arrow functions permanently capture the outer lexical 'this' at definition time and are immune to all four rules — use them inside methods to preserve context, but never as object-literal methods themselves.`
  },

  {
    id: 7,
    title: "Higher Order Functions — map, filter, reduce & Beyond",
    tag: "FUNCTIONS AS FIRST-CLASS CITIZENS",
    color: "#7C2D92",
    tldr: `A higher-order function either takes a function as an argument, returns a function, or both. reduce is the foundational HOF that can implement every other array transformation. Currying and partial application enable point-free, composable code. compose() and pipe() chain transformations elegantly — understanding them makes you dangerous with functional programming.`,
    problem: `Why do senior engineers write code like this?
  const getActiveUserNames = pipe(
    filterBy("active"),
    pluck("name"),
    sortBy("asc")
  );

Why is reduce more powerful than it looks?
  // Most devs use it only for sum — it can do EVERYTHING:
  // map, filter, groupBy, flatten, count, index, unique — all reducible

Why does this curried function feel weird but turn out useful?
  const add = a => b => a + b;
  const add5 = add(5); // What is add5?
  add5(3);             // 8
  add5(10);            // 15

Why does this popular pattern cause a performance problem at scale?
  data
    .filter(x => x.active)
    .map(x => x.name)
    .filter(x => x.startsWith("A"));
  // Three separate passes through the array — transducers solve this

If you can't compose functions, you write deeply nested imperative code.
HOFs are the foundation of React hooks, Redux middleware, RxJS, lodash — all of it.`,
    analogy: `Think of data as water flowing through a pipeline of PIPE SECTIONS (functions).
Each section does one job: filter debris, transform shape, combine streams.

map = a pipe section that changes the SHAPE of every water molecule (transforms each item)
filter = a pipe section with holes — only certain molecules pass through (keeps matching items)
reduce = a collection tank at the end — accumulates everything into one final result

CURRYING = a pipe section factory. Instead of giving you a pre-made section,
it asks for your specifications ONE AT A TIME.
"What size holes do you want?" → you say "5mm" → factory hands you a configured section.
"filterBy5mm" is now a reusable section you can plug anywhere.

COMPOSE = connecting pipe sections right-to-left: water enters the last section first.
PIPE = connecting sections left-to-right: water flows naturally from first to last.

TRANSDUCER = an ultra-efficient pipe that processes every molecule ONCE
through ALL sections simultaneously, instead of separate passes.
Like processing 1 million rows once vs 3 million operations across 3 passes.`,
    deep: `WHAT MAKES A FUNCTION HIGHER-ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A function is higher-order if it:
  1. Accepts a function as a parameter (map, filter, reduce, forEach, sort, find...)
  2. Returns a function (factory functions, currying, memoize, debounce...)
  3. Both (compose, pipe, curry, memoize with config...)

JavaScript treats functions as first-class values:
  - Assignable to variables
  - Passable as arguments
  - Returnable from functions
  - Storable in arrays and objects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDUCE AS THE UNIVERSAL TRANSFORMER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
reduce(accumulator, currentValue, index, array) → singleValue

The accumulator can be ANY type: number, string, array, object, Map, Set.
This is what makes reduce the Swiss Army knife:
  - acc = 0         → sum, count, multiply
  - acc = []        → map, filter, flat, flatMap, unique, chunk
  - acc = {}        → groupBy, indexBy, frequency count
  - acc = fn        → compose, pipe
  - acc = Promise   → sequential async processing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRYING vs PARTIAL APPLICATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRYING: Transform f(a, b, c) → f(a)(b)(c)
  - Each call takes EXACTLY ONE argument
  - Returns a new function until all args are supplied
  - Enables point-free programming

PARTIAL APPLICATION: Fix some arguments now, supply the rest later
  - Can fix any number of arguments in one call (not necessarily one at a time)
  - .bind() is partial application: fn.bind(ctx, arg1, arg2) fixes arg1 and arg2
  - Not the same as currying, but related

AUTO-CURRYING: A curry() implementation that works with multi-arg calls too
  const add = curry((a, b, c) => a + b + c);
  add(1)(2)(3)   // 6 — fully curried
  add(1, 2)(3)   // 6 — partial
  add(1)(2, 3)   // 6 — partial
  add(1, 2, 3)   // 6 — fully applied

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSE vs PIPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
compose(f, g, h)(x) = f(g(h(x)))  — right to left (mathematical notation)
pipe(f, g, h)(x)    = h(g(f(x)))  — left to right (readable as pipeline)

Both return a FUNCTION, not a value — they're function combinators.
The returned function takes the initial value and threads it through all fns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRANSDUCER PATTERN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Problem: chaining .filter().map().filter() creates N intermediate arrays.
For large datasets, this is memory and time wasteful.

Transducers are COMPOSABLE REDUCER TRANSFORMERS.
A transducer takes a reducing function and returns a modified reducing function.
You compose them first (no data), then pass the composed transducer to ONE reduce call.
Result: single pass, zero intermediate arrays, composable transformations.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LRU-BOUNDED MEMOIZE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Naive memoize grows the cache forever — memory leak for large input spaces.
LRU (Least Recently Used) bounded memoize:
  - Maintains a Map (insertion-order preserved)
  - When cache exceeds max size, delete the FIRST entry (least recently used)
  - Map.keys().next().value gives the oldest key (O(1) due to Map internals)`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: reduce implements map, filter, groupBy
// ─────────────────────────────────────────────
const orders = [
  { id: 1, customer: "Priya",  amount: 2500, status: "delivered" },
  { id: 2, customer: "Rahul",  amount: 800,  status: "pending"   },
  { id: 3, customer: "Anjali", amount: 4200, status: "delivered" },
  { id: 4, customer: "Kiran",  amount: 150,  status: "cancelled" },
  { id: 5, customer: "Priya",  amount: 3100, status: "pending"   },
];

// Implement map using reduce
const myMap = (arr, fn) =>
  arr.reduce((acc, item, i) => { acc.push(fn(item, i, arr)); return acc; }, []);

// Implement filter using reduce
const myFilter = (arr, fn) =>
  arr.reduce((acc, item, i) => { if (fn(item, i, arr)) acc.push(item); return acc; }, []);

// groupBy — the real power of reduce
const groupBy = (arr, keyFn) =>
  arr.reduce((acc, item) => {
    const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});

const byStatus = groupBy(orders, "status");
// { delivered: [...], pending: [...], cancelled: [...] }

const totalByCustomer = orders.reduce((acc, { customer, amount }) => {
  acc[customer] = (acc[customer] || 0) + amount;
  return acc;
}, {});
// { Priya: 5600, Rahul: 800, Anjali: 4200, Kiran: 150 }

// ─────────────────────────────────────────────
// EXAMPLE 2: curry — manual and auto-curry
// ─────────────────────────────────────────────
// Manual curry (one arg at a time)
const add = a => b => a + b;
const multiply = a => b => a * b;

const add10 = add(10);
const double = multiply(2);

console.log(add10(5));   // 15
console.log(double(21)); // 42

// Auto-curry (works with any call pattern)
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args); // enough args — invoke
    }
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs)); // wait for more
    };
  };
}

const applyDiscount = curry((rate, minAmount, amount) =>
  amount >= minAmount ? amount * (1 - rate) : amount
);

const apply10pct = applyDiscount(0.10);          // rate fixed
const apply10pctOver500 = apply10pct(500);        // rate + minAmount fixed
console.log(apply10pctOver500(1000));             // 900 (10% off)
console.log(apply10pctOver500(300));              // 300 (no discount)

// Curried filter factory:
const filterBy = curry((key, value, arr) => arr.filter(item => item[key] === value));
const getDelivered = filterBy("status", "delivered");
console.log(getDelivered(orders)); // [order1, order3]

// ─────────────────────────────────────────────
// EXAMPLE 3: compose and pipe
// ─────────────────────────────────────────────
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe    = (...fns) => x => fns.reduce((v, f) => f(v), x);

const trim       = str => str.trim();
const toLowerCase = str => str.toLowerCase();
const removeSpaces = str => str.replace(/\s+/g, "-");
const addPrefix  = str => \`product-\${str}\`;

// pipe: left to right — reads like a recipe
const toSlug = pipe(trim, toLowerCase, removeSpaces, addPrefix);
console.log(toSlug("  Laptop Stand  ")); // "product-laptop-stand"

// Real pipeline for order processing:
const processOrders = pipe(
  orders => orders.filter(o => o.status === "delivered"),
  orders => orders.map(o => ({ ...o, amount: o.amount * 0.9 })), // 10% loyalty
  orders => orders.sort((a, b) => b.amount - a.amount),
  orders => orders.slice(0, 3) // top 3
);
console.log(processOrders(orders));

// ─────────────────────────────────────────────
// EXAMPLE 4: flatMap — map + flat in one pass
// ─────────────────────────────────────────────
const restaurants = [
  { name: "Paradise Biryani", cuisines: ["Biryani", "Mughlai", "Kebab"] },
  { name: "Saravana Bhavan",  cuisines: ["South Indian", "Tiffin"]      },
  { name: "Barbeque Nation",  cuisines: ["BBQ", "Kebab", "Grill"]       },
];

// Without flatMap: map then flat(1)
const allCuisines1 = restaurants.map(r => r.cuisines).flat();

// With flatMap: single pass, more efficient
const allCuisines2 = restaurants.flatMap(r => r.cuisines);
// ["Biryani", "Mughlai", "Kebab", "South Indian", "Tiffin", "BBQ", "Kebab", "Grill"]

// Unique cuisines:
const uniqueCuisines = [...new Set(allCuisines2)];

// Real use: expand each order into line items
const invoiceLines = orders.flatMap(order =>
  order.status === "delivered"
    ? [{ ...order, type: "charge" }, { ...order, amount: order.amount * 0.05, type: "gst" }]
    : [] // flatMap with empty array = filter + map in one
);

// ─────────────────────────────────────────────
// EXAMPLE 5: Transducer pattern — single pass pipeline
// ─────────────────────────────────────────────
// Normal chain: 3 passes, 2 intermediate arrays
const result1 = orders
  .filter(o => o.amount > 500)          // pass 1 → intermediate array
  .map(o => o.amount * 1.18)            // pass 2 → intermediate array
  .filter(o => o > 2000);              // pass 3 → final

// Transducer: compose transformations, then single reduce
const mapping  = fn => reducer => (acc, item) => reducer(acc, fn(item));
const filtering = pred => reducer => (acc, item) => pred(item) ? reducer(acc, item) : acc;
const appending = (acc, item) => { acc.push(item); return acc; };

const xform = compose(
  filtering(o => o.amount > 500),
  mapping(o => o.amount * 1.18),
  filtering(o => o > 2000)
);

const result2 = orders.reduce(xform(appending), []); // ONE PASS ✓

// ─────────────────────────────────────────────
// EXAMPLE 6: LRU-bounded memoize
// ─────────────────────────────────────────────
function memoizeLRU(fn, maxSize = 100) {
  const cache = new Map(); // Map preserves insertion order

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      // Move to end (most recently used) — delete then re-set
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }

    const result = fn.apply(this, args);

    if (cache.size >= maxSize) {
      // Evict LRU: first key in Map is oldest (least recently used)
      cache.delete(cache.keys().next().value);
    }

    cache.set(key, result);
    return result;
  };
}

const fetchProductDetails = memoizeLRU(async (productId) => {
  const res = await fetch(\`/api/products/\${productId}\`);
  return res.json();
}, 50); // cache up to 50 products

// ─────────────────────────────────────────────
// EXAMPLE 7: Partial application — real use cases
// ─────────────────────────────────────────────
function partial(fn, ...presetArgs) {
  return function(...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

// API caller factory
function apiCall(baseUrl, method, endpoint, data) {
  return fetch(\`\${baseUrl}\${endpoint}\`, {
    method,
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  });
}

const swiggyAPI = partial(apiCall, "https://api.swiggy.com");
const swiggyGET = partial(swiggyAPI, "GET");
const swiggyPOST = partial(swiggyAPI, "POST");

swiggyGET("/restaurants");           // GET https://api.swiggy.com/restaurants
swiggyPOST("/orders", { item: 123 }); // POST https://api.swiggy.com/orders`,
    bugs: `BUG 1: reduce without initial value crashes on empty array
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function sumPrices(items) {
  return items.reduce((sum, item) => sum + item.price); // no initial value!
}
sumPrices([]);       // TypeError: Reduce of empty array with no initial value
sumPrices([{price: 100}]); // returns the ITEM itself, not 100 (first element used as acc)

// FIX: Always provide initial value — especially for empty-array safety
function sumPricesSafe(items) {
  return items.reduce((sum, item) => sum + item.price, 0); // initial value = 0
}
sumPricesSafe([]); // 0 ✓
sumPricesSafe([{price: 100}]); // 100 ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: map returning undefined — forgetting to return in callback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const enriched = orders.map(order => {
  const gst = order.amount * 0.18;
  order.gst = gst;
  order.total = order.amount + gst;
  // Missing return! map expects the callback to return the new value
});
console.log(enriched); // [undefined, undefined, undefined, undefined, undefined]

// FIX 1: Add return statement
const enrichedFixed = orders.map(order => {
  const gst = order.amount * 0.18;
  return { ...order, gst, total: order.amount + gst }; // ✓
});

// FIX 2: Use concise arrow if single expression
const enrichedConcise = orders.map(o => ({ ...o, gst: o.amount * 0.18, total: o.amount * 1.18 }));

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Mutating original array inside map/filter — side effects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: map should be pure — don't mutate the original items
const processed = orders.map(order => {
  order.processed = true; // MUTATES original order objects!
  return order;
});
// Both 'orders' and 'processed' now have processed=true on the same objects
// Original array polluted — causes unpredictable bugs downstream

// FIX: Return NEW object (spread creates shallow copy)
const processedFixed = orders.map(order => ({
  ...order,          // shallow copy
  processed: true    // new property on copy, original untouched ✓
}));

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Curried function called with too many args at once
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Using manually curried function with arr.map()
const addTax = rate => amount => amount * (1 + rate);

// This works:
[100, 200, 300].map(addTax(0.18)); // [118, 236, 354] ✓

// This breaks:
[100, 200, 300].map(addTax); // [function, function, function] — forgot to call addTax!

// This also breaks in a subtle way:
const amounts = [100, 200, 300];
amounts.map((amount, index, arr) => addTax(amount)); 
// addTax(100) returns a FUNCTION, not a number — index and arr ignored, but amount used as rate!

// FIX: Make sure you call the curry with the config argument before passing to map
const applyGST = addTax(0.18); // a function: amount => amount * 1.18
[100, 200, 300].map(applyGST); // [118, 236, 354] ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: compose/pipe argument order confusion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Mixing up compose (right-to-left) vs pipe (left-to-right)
const toUpperCase = str => str.toUpperCase();
const addBang = str => str + "!";
const trim = str => str.trim();

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const pipe    = (...fns) => x => fns.reduce((v, f) => f(v), x);

// compose: last function runs FIRST
compose(addBang, toUpperCase, trim)("  hello  "); // "HELLO!" ✓ (trim→upper→bang)

// Developer thinks compose runs left-to-right:
compose(trim, toUpperCase, addBang)("  hello  "); // "  HELLO  !" ✗ (bang→upper→trim)
// addBang runs first (rightmost), then toUpperCase, then trim — trim kills the "!"

// FIX: Use pipe for left-to-right (more intuitive reading order)
pipe(trim, toUpperCase, addBang)("  hello  "); // "HELLO!" ✓ — reads in execution order`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const nums = [1, 2, 3, 4, 5];

const result = nums
  .map(x => x * 2)        // [2, 4, 6, 8, 10]
  .filter(x => x > 5)     // [6, 8, 10]
  .reduce((acc, x) => acc + x, 0); // 24

console.log(result); // (A) What is result?

const tricky = [1, [2, 3], [4, [5, 6]]].flatMap(x => x);
console.log(tricky); // (B) What does this produce?

const composed = [x => x + 1, x => x * 2, x => x - 3]
  .reduce((f, g) => x => g(f(x)));
console.log(composed(10)); // (C) What does this produce?

// Answers:
// A = 24
// B = [1, 2, 3, 4, [5, 6]] — flatMap only flattens ONE level
// C = (10+1)*2-3 = 19 — reduce builds a pipeline of composed functions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This function is supposed to return unique orders by customer name,
// keeping the highest-value order per customer. Fix the bug.
function getTopOrderPerCustomer(orders) {
  return orders.reduce((acc, order) => {
    acc[order.customer] = order; // BUG: always overwrites — doesn't keep highest
    return acc;
  }, {});
}
// Expected: { Priya: {amount: 3100...}, Rahul: {amount: 800...}, ... }
// Actual: { Priya: {amount: 3100 if last...} — depends on array order, not on value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement these 4 utilities using ONLY reduce (no map, filter, flat, forEach):
  1. chunk(arr, size) → splits array into chunks of 'size'
     chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
  2. uniqueBy(arr, keyFn) → unique items by a key function
     uniqueBy(orders, o => o.customer) → one order per customer (first seen)
  3. zipWith(fn, arr1, arr2) → combines arrays element-wise with fn
     zipWith((a,b) => a+b, [1,2,3], [4,5,6]) → [5,7,9]
  4. countBy(arr, keyFn) → frequency count by key
     countBy(orders, o => o.status) → { delivered: 2, pending: 2, cancelled: 1 }`,
    summary: `Higher-order functions treat functions as data — they can be passed in, returned out, and composed together. reduce is the universal array transformer. Curry enables point-free reusable functions. compose and pipe turn complex transformations into readable pipelines. These patterns eliminate entire categories of imperative boilerplate code.`
  },

  {
    id: 8,
    title: "Async JS — Callbacks → Promises → Async/Await",
    tag: "TAMING THE ASYNCHRONOUS BEAST",
    color: "#B45309",
    tldr: `JavaScript handles async operations by delegating to Web APIs/Node APIs, then processing callbacks through the event loop. Callbacks lead to deeply nested, error-prone code. Promises represent a future value and chain cleanly. Async/await is syntactic sugar over Promises that makes async code read like synchronous code while preserving all Promise semantics.`,
    problem: `Why is this code a nightmare to maintain?
  getUser(id, function(err, user) {
    if (err) handleError(err);
    else getOrders(user.id, function(err, orders) {
      if (err) handleError(err);
      else getProducts(orders[0].id, function(err, product) {
        if (err) handleError(err);
        else renderPage(user, orders, product);
      });
    });
  });
  // The "Pyramid of Doom" — callback hell

Why does forEach not work for async operations?
  const results = [];
  orderIds.forEach(async (id) => {
    const order = await fetchOrder(id); // await inside forEach is ignored!
    results.push(order);
  });
  console.log(results); // [] — empty! async callbacks run later

What's the difference between these and when do you use each?
  Promise.all vs Promise.allSettled vs Promise.any vs Promise.race

Why does this retry logic not actually retry?
  async function fetchWithRetry(url) {
    try { return await fetch(url); }
    catch(e) { fetchWithRetry(url); } // forgot return + await — fire and forget!
  }

Async bugs are the hardest to debug because they fail silently, run out of order,
and produce race conditions that only appear under load.`,
    analogy: `Think of async operations as ordering food at a restaurant.

CALLBACKS: The old way. You tell the waiter "when my food is ready, call this phone number, and when THAT call finishes, call this other number..." — deeply nested instructions, hard to track, error prone.

PROMISES: A ticket system. Waiter gives you a numbered ticket (Promise). You go sit down. The Promise is in one of 3 states:
  - PENDING: your food is being prepared
  - FULFILLED: food arrived — you can pick up your order (.then())
  - REJECTED: kitchen ran out of ingredients — something went wrong (.catch())
Once fulfilled or rejected, the state NEVER changes (immutable).

ASYNC/AWAIT: Same ticket system, but now you can write:
  "const food = await getFood();"
  ...and it READS like you're waiting at the counter (synchronous),
  but you're actually sitting down and the thread is doing other work.
  The 'await' just registers "resume here when the Promise settles."

PROMISE.ALL: "Don't call me until ALL my orders are ready."
PROMISE.RACE: "Call me the moment ANY order is ready — I'll take the first one."
PROMISE.ALLSETTLED: "Call me when EVERYONE has a result, success or failure."
PROMISE.ANY: "Give me the first SUCCESS — ignore failures unless all fail."`,
    deep: `PROMISE INTERNALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A Promise is an object with:
  - [[PromiseState]]: "pending" | "fulfilled" | "rejected"
  - [[PromiseResult]]: undefined | value | reason
  - [[PromiseFulfillReactions]]: array of .then() callbacks waiting
  - [[PromiseRejectReactions]]:  array of .catch() callbacks waiting

State transitions:
  pending → fulfilled (resolve called) — IRREVERSIBLE
  pending → rejected  (reject called)  — IRREVERSIBLE
  fulfilled/rejected → ??? — IMPOSSIBLE

Once a Promise settles, calling resolve/reject again has NO effect.
This is why Promises are reliable — they commit to one value forever.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.then() CHAINING MECHANICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: Every .then() call returns a BRAND NEW Promise.
  const p1 = Promise.resolve(1);
  const p2 = p1.then(x => x + 1);  // p2 is a NEW Promise
  const p3 = p2.then(x => x * 10); // p3 is another NEW Promise
  // p1, p2, p3 are three separate Promise objects

What determines p2's value:
  - If the .then() callback returns a plain value → p2 fulfills with that value
  - If the callback returns a Promise → p2 adopts that Promise's state/value (flattened)
  - If the callback throws → p2 rejects with the thrown error
  - If no callback provided → p2 fulfills with p1's value (pass-through)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASYNC/AWAIT — COMPLETE DESUGARING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async function fetchUser(id) {
    const user = await getUser(id);
    const orders = await getOrders(user.id);
    return { user, orders };
  }

Desugars to:
  function fetchUser(id) {
    return getUser(id).then(user => {
      return getOrders(user.id).then(orders => {
        return { user, orders };
      });
    });
  }

An async function ALWAYS returns a Promise (wraps non-Promise returns in Promise.resolve).
'await' suspends the async function (schedules the rest as a microtask), but DOES NOT block the thread.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMISE COMBINATORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Promise.all(promises)
  - Resolves when ALL resolve → array of values (same order as input)
  - Rejects IMMEDIATELY when ANY rejects (short-circuit)
  - Use: parallel independent requests where ALL results are needed

Promise.allSettled(promises)
  - Always resolves (never rejects) when ALL settle
  - Returns array of {status: "fulfilled", value} or {status: "rejected", reason}
  - Use: parallel requests where you want ALL results even if some fail (dashboard)

Promise.any(promises)
  - Resolves when FIRST one resolves
  - Rejects only when ALL reject (AggregateError)
  - Use: try multiple mirrors/CDNs, take whoever responds first successfully

Promise.race(promises)
  - Resolves/rejects when FIRST one settles (either way)
  - Use: timeout patterns — race a fetch against a timeout Promise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE forEach TRAP — CRITICAL BUG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
forEach does NOT await async callbacks. It fires them all, ignores the Promises, and returns undefined.
  - Use for...of + await for sequential async iteration
  - Use Promise.all + .map() for parallel async iteration
  Never use forEach for async operations.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASYNC GENERATORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async function* paginate(url) {
    let cursor = null;
    do {
      const res = await fetch(url + (cursor ? \`?cursor=\${cursor}\` : ""));
      const { data, nextCursor } = await res.json();
      yield data; // pause until consumer calls .next()
      cursor = nextCursor;
    } while (cursor);
  }

  // Consumer:
  for await (const page of paginate("/api/orders")) {
    processBatch(page); // each iteration awaits the next page
  }`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Callback hell → Promise chain → async/await
// ─────────────────────────────────────────────
// CALLBACK HELL (don't do this):
function loadPageCallback(userId) {
  getUser(userId, (err, user) => {
    if (err) return handleError(err);
    getOrders(user.id, (err, orders) => {
      if (err) return handleError(err);
      getProductDetails(orders[0].productId, (err, product) => {
        if (err) return handleError(err);
        renderPage({ user, orders, product });
      });
    });
  });
}

// PROMISE CHAIN (better — flat, chainable):
function loadPagePromise(userId) {
  return getUser(userId)
    .then(user => Promise.all([user, getOrders(user.id)]))
    .then(([user, orders]) => Promise.all([user, orders, getProductDetails(orders[0].productId)]))
    .then(([user, orders, product]) => renderPage({ user, orders, product }))
    .catch(handleError);
}

// ASYNC/AWAIT (best — reads like synchronous code):
async function loadPage(userId) {
  try {
    const user    = await getUser(userId);
    const orders  = await getOrders(user.id);
    const product = await getProductDetails(orders[0].productId);
    renderPage({ user, orders, product });
  } catch (error) {
    handleError(error);
  }
}

// ─────────────────────────────────────────────
// EXAMPLE 2: Promise combinators — real scenarios
// ─────────────────────────────────────────────
async function loadDashboard(userId) {
  // All independent — run in PARALLEL with Promise.all
  const [user, notifications, settings] = await Promise.all([
    fetchUser(userId),
    fetchNotifications(userId),
    fetchUserSettings(userId)
  ]);
  return { user, notifications, settings };
}

async function loadWidgets(userId) {
  // Non-critical widgets — use allSettled so one failure doesn't break all
  const results = await Promise.allSettled([
    fetchRecentOrders(userId),   // might fail
    fetchRecommendations(userId), // might fail
    fetchWallet(userId)          // might fail
  ]);

  return results.map((result, i) => {
    const widgetNames = ["orders", "recommendations", "wallet"];
    if (result.status === "fulfilled") return { name: widgetNames[i], data: result.value };
    else return { name: widgetNames[i], error: result.reason.message, data: null };
  });
}

// Timeout pattern using Promise.race
function fetchWithTimeout(url, ms = 5000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(\`Request timed out after \${ms}ms\`)), ms)
  );
  return Promise.race([fetch(url), timeout]);
}

// Fastest CDN using Promise.any
function fetchFromFastestMirror(path) {
  const mirrors = [
    "https://cdn1.example.com",
    "https://cdn2.example.com",
    "https://cdn3.example.com"
  ];
  return Promise.any(mirrors.map(base => fetch(\`\${base}\${path}\`)));
}

// ─────────────────────────────────────────────
// EXAMPLE 3: forEach trap — async iteration patterns
// ─────────────────────────────────────────────
const orderIds = ["ORD001", "ORD002", "ORD003"];

// WRONG: forEach ignores async callbacks
async function processOrdersWrong() {
  const results = [];
  orderIds.forEach(async (id) => {
    const order = await fetchOrder(id); // await is ignored by forEach
    results.push(order);
  });
  console.log(results.length); // 0! forEach didn't wait
}

// CORRECT: Sequential — for...of
async function processOrdersSequential() {
  const results = [];
  for (const id of orderIds) {
    const order = await fetchOrder(id); // truly awaited, one at a time
    results.push(order);
  }
  return results; // all 3 fetched sequentially
}

// CORRECT: Parallel — Promise.all + map
async function processOrdersParallel() {
  const results = await Promise.all(
    orderIds.map(id => fetchOrder(id)) // all 3 start simultaneously
  );
  return results; // all 3 fetched concurrently ✓
}

// ─────────────────────────────────────────────
// EXAMPLE 4: Error handling patterns
// ─────────────────────────────────────────────
// Typed errors for better error handling:
class NetworkError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

async function placeOrder(orderData) {
  if (!orderData.items?.length) {
    throw new ValidationError("Cart is empty", "items");
  }

  let response;
  try {
    response = await fetchWithTimeout("/api/orders", 10000);
  } catch (error) {
    if (error.message.includes("timed out")) {
      throw new NetworkError("Order service is slow — try again", 504);
    }
    throw error; // re-throw unknown errors
  }

  if (!response.ok) {
    throw new NetworkError(\`Order failed: \${response.statusText}\`, response.status);
  }
  return response.json();
}

// Caller handles typed errors differently:
async function handleOrderSubmit(orderData) {
  try {
    const order = await placeOrder(orderData);
    showSuccess(\`Order \${order.id} placed!\`);
  } catch (error) {
    if (error instanceof ValidationError) {
      highlightField(error.field, error.message); // show inline validation
    } else if (error instanceof NetworkError) {
      showBanner(\`Server error (\${error.statusCode}): \${error.message}\`);
    } else {
      showBanner("Unexpected error. Our team has been notified.");
      reportToSentry(error); // unknown errors always get reported
    }
  }
}

// ─────────────────────────────────────────────
// EXAMPLE 5: Retry with exponential backoff
// ─────────────────────────────────────────────
async function fetchWithRetry(fn, maxRetries = 3, baseDelay = 300) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error; // out of retries — rethrow
      if (error instanceof ValidationError) throw error; // don't retry validation errors

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100; // jitter
      console.log(\`Attempt \${attempt + 1} failed. Retrying in \${Math.round(delay)}ms...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage:
const order = await fetchWithRetry(
  () => fetch("/api/orders/ORD001").then(r => r.json()),
  3, // max 3 retries
  500 // 500ms base delay → 500, 1000, 2000ms
);

// ─────────────────────────────────────────────
// EXAMPLE 6: Async generator for pagination
// ─────────────────────────────────────────────
async function* fetchAllOrders(customerId, pageSize = 20) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      \`/api/orders?customerId=\${customerId}&page=\${page}&size=\${pageSize}\`
    );
    const { orders, totalPages } = await response.json();

    yield orders; // pause — consumer processes this batch

    hasMore = page < totalPages;
    page++;
  }
}

// Consumer — processes each page lazily:
async function exportAllOrders(customerId) {
  let totalExported = 0;
  for await (const batch of fetchAllOrders(customerId)) {
    await writeToExcel(batch);
    totalExported += batch.length;
    updateProgressBar(totalExported);
  }
  console.log(\`Exported \${totalExported} orders\`);
}`,
    bugs: `BUG 1: forEach with async — silent data loss
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function sendInvoices(orders) {
  orders.forEach(async (order) => {
    await sendEmail(order.customer, generateInvoice(order));
    console.log(\`Sent to \${order.customer}\`); // logs AFTER function returns
  });
  console.log("All invoices sent"); // prints BEFORE any emails sent!
}
// forEach fires all async callbacks and returns immediately
// "All invoices sent" prints before any email is actually sent

// FIX:
async function sendInvoicesFixed(orders) {
  for (const order of orders) {                // sequential (safer for rate limits)
    await sendEmail(order.customer, generateInvoice(order));
    console.log(\`Sent to \${order.customer}\`); // prints after each send ✓
  }
  console.log("All invoices sent"); // prints after ALL are sent ✓
}
// Or parallel:
// await Promise.all(orders.map(async order => { ... }));

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Unhandled Promise rejection — fire and forget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function saveOrder(orderData) {
  validateOrder(orderData);
  db.save(orderData); // returns a Promise — not awaited! Rejection silently ignored
  return { success: true }; // returns before db.save completes
}

async function processPayment(orderId) {
  const order = await getOrder(orderId);
  sendConfirmationEmail(order.customer); // not awaited — failure silently dropped
  return chargeCard(order);
}

// FIX: Either await all Promises or explicitly handle non-critical ones
async function saveOrderFixed(orderData) {
  validateOrder(orderData);
  await db.save(orderData); // awaited — any rejection propagates ✓
  return { success: true };
}

async function processPaymentFixed(orderId) {
  const order = await getOrder(orderId);
  // Non-critical: don't await but DO handle the rejection
  sendConfirmationEmail(order.customer).catch(err =>
    console.error("Email failed (non-critical):", err)
  );
  return chargeCard(order); // critical — caller should await this
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Sequential awaits instead of parallel — performance killer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: 3 × 1 second = 3 seconds total
async function getCheckoutData(userId, cartId) {
  const user    = await fetchUser(userId);      // 1s
  const cart    = await fetchCart(cartId);      // 1s — waits for user unnecessarily
  const coupons = await fetchCoupons(userId);   // 1s — waits for cart unnecessarily
  return { user, cart, coupons };
}

// FIX: All 3 are independent — run in parallel (1 second total)
async function getCheckoutDataFast(userId, cartId) {
  const [user, cart, coupons] = await Promise.all([
    fetchUser(userId),
    fetchCart(cartId),
    fetchCoupons(userId)
  ]);
  return { user, cart, coupons };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Error swallowing — catch that re-throws nothing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: catch swallows the error — caller thinks everything succeeded
async function deleteAccount(userId) {
  try {
    await db.deleteUser(userId);
    await db.deleteOrders(userId);
    await storage.deleteFiles(userId);
  } catch (error) {
    console.log("Error:", error); // logged but swallowed!
    // No re-throw, no return value indicating failure
    // Caller receives 'undefined' and thinks deletion succeeded!
  }
}

// FIX: Handle, log, AND either re-throw or return error indicator
async function deleteAccountFixed(userId) {
  try {
    await db.deleteUser(userId);
    await db.deleteOrders(userId);
    await storage.deleteFiles(userId);
    return { success: true };
  } catch (error) {
    console.error("Account deletion failed:", error);
    throw new Error(\`Failed to delete account \${userId}: \${error.message}\`); // re-throw ✓
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Promise constructor anti-pattern (deferred promise)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Wrapping an existing Promise in new Promise (unnecessary + hides errors)
function fetchUserData(id) {
  return new Promise((resolve, reject) => {
    fetch(\`/api/users/\${id}\`)           // fetch already returns a Promise!
      .then(res => res.json())
      .then(data => resolve(data))      // double-wrapping serves no purpose
      .catch(err => reject(err));       // errors from .then() might not reach here
  });
}

// FIX: Return the Promise directly
function fetchUserDataFixed(id) {
  return fetch(\`/api/users/\${id}\`).then(res => res.json()); // ✓
}
// Or with async/await:
async function fetchUserDataAsync(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("start");

async function run() {
  console.log("async start");
  const result = await Promise.resolve("resolved");
  console.log("after await:", result);
  return "done";
}

const p = run();
p.then(val => console.log("then:", val));
console.log("end");

// Answer (in order):
// "start"
// "async start"      ← sync part of async function runs immediately
// "end"              ← sync code after run() call
// "after await: resolved"  ← microtask (await resumes)
// "then: done"       ← microtask (p.then callback)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This retry function has 3 bugs. Find and fix all of them.
async function fetchWithRetryBuggy(url, retries = 3) {
  try {
    const res = await fetch(url);
    return res.json;        // BUG 1: not calling json()
  } catch (e) {
    if (retries > 0) {
      fetchWithRetryBuggy(url, retries - 1); // BUG 2: not awaited, not returned
    }
    // BUG 3: if retries === 0, silently returns undefined instead of throwing
  }
}

// Fixes:
// 1. return res.json() — call the method
// 2. return await fetchWithRetryBuggy(url, retries - 1) — await + return
// 3. else throw e — propagate error when retries exhausted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a concurrentLimit(tasks, limit) function that:
  - Runs an array of async tasks with at most 'limit' running simultaneously
  - Returns results in the SAME ORDER as input (not arrival order)
  - If any task fails, still completes all others (allSettled semantics)

  const tasks = [
    () => fetchOrder("ORD001"),
    () => fetchOrder("ORD002"),
    () => fetchOrder("ORD003"),
    () => fetchOrder("ORD004"),
    () => fetchOrder("ORD005"),
  ];
  const results = await concurrentLimit(tasks, 2);
  // At most 2 running at a time, all 5 results in order

Hint: Use a pool pattern — maintain a running count, and as each task finishes, start the next queued one.`,
    summary: `Async JavaScript evolved from callback hell to Promises (immutable, chainable future values) to async/await (synchronous-looking sugar over Promises). The critical skills are: choosing the right combinator (all/allSettled/any/race), avoiding the forEach async trap, always handling rejections, and running independent operations in parallel with Promise.all instead of sequential awaits.`
  },

  {
    id: 9,
    title: "Destructuring, Spread & Rest",
    tag: "UNPACK, COPY, COLLECT",
    color: "#0D9488",
    tldr: `Destructuring lets you pull values out of objects and arrays into named variables — including nested values, renamed variables, and defaults. Spread (...) copies/merges iterables and objects. Rest (...) collects remaining items into an array or object. Together these three features eliminate most manual property access, argument handling, and object-cloning boilerplate.`,
    problem: `Why does this create bugs when you think you're copying an object?
  const original = { user: { name: "Priya" } };
  const copy = { ...original };
  copy.user.name = "Rahul";
  console.log(original.user.name); // "Rahul" — the original changed! Why?

Why does this function throw when called without arguments?
  function initApp({ theme, language }) {
    console.log(theme, language);
  }
  initApp(); // TypeError: Cannot destructure property 'theme' of 'undefined'

Why doesn't this rest parameter work?
  function save(id, ...data, callback) {} // SyntaxError — rest must be last!

What's wrong with this object merge?
  const defaults = { timeout: 3000, retries: 3, debug: false };
  const userConfig = { timeout: 5000, debug: true };
  const config = { ...userConfig, ...defaults }; // Wrong order! defaults overwrite user config

If you don't master spread/rest, you'll write verbose property-copying code,
accidentally mutate shared objects, and produce hard-to-find bugs in config merges.`,
    analogy: `DESTRUCTURING is like unpacking a suitcase.
Instead of: const name = suitcase.clothes.shirt.color;
You can write: const { clothes: { shirt: { color: shirtColor } } } = suitcase;
You're just telling JavaScript EXACTLY which compartment to reach into and what to call it.

SPREAD (...) in expressions is like using a photocopier — it makes a SHALLOW COPY.
  - Spreading an object: copies only the top-level properties
  - If a property holds an object (like a nested address), the REFERENCE is copied, not the nested object
  - Both original and copy share the SAME nested object — this is the shallow copy trap

REST (...) in function parameters or destructuring is like a "everything else" bag.
  const [first, second, ...theRest] = [1, 2, 3, 4, 5];
  // first=1, second=2, theRest=[3,4,5] — everything left goes into the bag

STRUCTUREDCLONE is like a proper deep-cloning machine — it doesn't just copy the reference to a nested object, it physically duplicates every nested object recursively. But it has limits: no functions, no Dates (partially), no custom class instances.`,
    deep: `OBJECT DESTRUCTURING — COMPLETE SYNTAX:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const obj = { a: 1, b: 2, c: { d: 3 } };

  // Basic
  const { a, b } = obj;                  // a=1, b=2

  // Rename (colon = rename, NOT type)
  const { a: myA, b: myB } = obj;        // myA=1, myB=2

  // Default (used only when value is undefined, not null)
  const { a = 10, z = 99 } = obj;        // a=1 (exists), z=99 (missing)

  // Nested
  const { c: { d } } = obj;             // d=3

  // Nested with rename + default
  const { c: { d: myD = 0 } } = obj;   // myD=3

  // Computed keys
  const key = "a";
  const { [key]: val } = obj;           // val=1

  // Rest in object (collects remaining own enumerable properties)
  const { a: first, ...rest } = obj;    // first=1, rest={b:2, c:{d:3}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARRAY DESTRUCTURING — COMPLETE SYNTAX:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const arr = [1, 2, 3, 4, 5];

  const [x, y] = arr;                   // x=1, y=2
  const [, second] = arr;               // skip first, second=2
  const [a, , c] = arr;                 // a=1, skip 2, c=3
  const [head, ...tail] = arr;          // head=1, tail=[2,3,4,5]
  const [p = 10, q = 20] = [1];         // p=1, q=20 (default)

  // Swap trick — no temp variable needed
  let m = 5, n = 10;
  [m, n] = [n, m];                      // m=10, n=5 ✓

  // From iterables (any iterable works, not just arrays)
  const [firstChar, ...restChars] = "hello"; // firstChar="h", restChars=["e","l","l","o"]
  const [key, value] = new Map([["name", "Priya"]]).entries().next().value;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPREAD — SHALLOW COPY MECHANICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Spread copies REFERENCES for object/array values, PRIMITIVES by value.

  const a = { x: 1, nested: { y: 2 } };
  const b = { ...a };

  b.x = 99;          // safe — x is a primitive, b gets its own copy
  b.nested.y = 99;   // MUTATES a.nested too — same reference!

  // Immutable update pattern (safe shallow operations):
  const updated = { ...a, x: 99 };       // new x, shared nested — OK if nested unchanged
  const updatedNested = { ...a, nested: { ...a.nested, y: 99 } }; // full copy at each level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEEP CLONE OPTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. JSON.parse(JSON.stringify(obj))
   - Works for: plain objects, arrays, primitives
   - Fails for: functions (dropped), undefined (dropped), Date (becomes string),
     Map/Set (become {}), circular references (throws), Infinity/NaN (become null)

2. structuredClone(obj)  — ES2022, available Node 17+, all modern browsers
   - Works for: most things including Date, Map, Set, ArrayBuffer, RegExp
   - Fails for: functions, DOM nodes, class instances (prototype lost)
   - Handles circular references ✓
   - PREFERRED for most use cases

3. Recursive deep clone (for custom class instances)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FUNCTION PARAMETER DESTRUCTURING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Without guard — crashes if called without argument
  function render({ title, body }) { ... }
  render(); // TypeError: Cannot destructure property 'title' of 'undefined'

  // With = {} guard — safe default to empty object
  function render({ title = "Untitled", body = "" } = {}) { ... }
  render(); // OK — uses all defaults ✓

  // Deeply destructured with guards
  function processOrder({ user: { name = "Guest" } = {}, items = [] } = {}) { ... }
  processOrder(); // safe ✓
  processOrder({ items: [{id: 1}] }); // safe — user uses default {} ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REST RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - Rest in function params: must be LAST parameter — SyntaxError otherwise
  - Rest in array destructuring: must be LAST — SyntaxError otherwise
  - Rest in object destructuring: must be LAST — SyntaxError otherwise
  - Rest parameter collects into a TRUE ARRAY (unlike 'arguments' which is array-like)
  - Only ONE rest element allowed per destructuring/param list`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Nested object destructuring with rename + default
// ─────────────────────────────────────────────
const apiResponse = {
  status: 200,
  data: {
    user: {
      id: "USR001",
      profile: {
        name: "Anjali Sharma",
        avatar: null,
        preferences: { theme: "dark", notifications: true }
      }
    },
    meta: { requestId: "REQ123", timestamp: 1717000000 }
  }
};

// Nested destructuring — 3 levels deep with renames and defaults
const {
  status,
  data: {
    user: {
      id: userId,
      profile: {
        name: userName,
        avatar: userAvatar = "https://default-avatar.com/user.png", // default for null
        preferences: { theme = "light", notifications = false }     // nested defaults
      }
    },
    meta: { requestId }
  }
} = apiResponse;

console.log(userId);      // "USR001"
console.log(userName);    // "Anjali Sharma"
console.log(userAvatar);  // "https://default-avatar.com/user.png" (was null, so default used)
// Note: default only applies to undefined, NOT null — be careful!

// ─────────────────────────────────────────────
// EXAMPLE 2: Array destructuring patterns
// ─────────────────────────────────────────────
// Skip elements, swap, rest
const coordinates = [28.6139, 77.2090, 0, 216]; // lat, lng, altitude, accuracy

const [lat, lng, , accuracy] = coordinates; // skip altitude
console.log(\`Location: \${lat}°N, \${lng}°E (accuracy: \${accuracy}m)\`);

// Swap without temp variable
let minPrice = 5000, maxPrice = 500; // accidentally swapped
[minPrice, maxPrice] = [maxPrice, minPrice]; // swap trick ✓
console.log(minPrice, maxPrice); // 500, 5000

// Useful with function return values
function getMinMax(arr) {
  return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = getMinMax([34, 12, 87, 45, 23]);
// Much cleaner than: const result = getMinMax(...); result[0]; result[1]

// Iterating with destructuring
const products = [["Laptop", 75000], ["Phone", 25000], ["Tablet", 35000]];
for (const [name, price] of products) {
  console.log(\`\${name}: ₹\${price}\`);
}

// ─────────────────────────────────────────────
// EXAMPLE 3: Function parameter destructuring with = {} guard
// ─────────────────────────────────────────────
// Safe component props with defaults
function ProductCard({
  name,
  price,
  discount = 0,
  currency = "₹",
  inStock = true,
  images = [],
  onAddToCart = () => {}
} = {}) {
  const finalPrice = price * (1 - discount);
  console.log(\`\${name}: \${currency}\${finalPrice} \${inStock ? "✓ In Stock" : "✗ Out of Stock"}\`);
  return { name, finalPrice, images, onAddToCart };
}

ProductCard({ name: "Laptop", price: 75000, discount: 0.1 });
ProductCard(); // safe — uses all defaults ✓

// API endpoint handler with destructured params
function createOrder({
  customerId,
  items,
  address: {
    street,
    city,
    pincode,
    state = "Maharashtra"  // default for missing state
  } = {},
  paymentMethod = "upi"
} = {}) {
  if (!customerId || !items?.length) throw new Error("Missing required fields");
  return { customerId, items, delivery: { street, city, pincode, state }, paymentMethod };
}

// ─────────────────────────────────────────────
// EXAMPLE 4: Spread — shallow copy trap and immutable update pattern
// ─────────────────────────────────────────────
const user = {
  id: "USR001",
  name: "Rahul",
  address: { city: "Mumbai", pincode: "400001" },
  orders: [{ id: "ORD001" }]
};

// Shallow copy — address and orders still shared!
const shallowCopy = { ...user };
shallowCopy.name = "Suresh";          // safe — primitive
shallowCopy.address.city = "Delhi";   // MUTATES user.address too!
console.log(user.address.city);        // "Delhi" — original changed!

// Immutable update — spread at each nested level you're changing
const updatedUser = {
  ...user,
  name: "Suresh",               // safe new value
  address: {
    ...user.address,            // copy address first
    city: "Delhi"               // then override just city
  }
  // orders unchanged — shared reference OK since we didn't modify it
};

// Removing a property with rest spread
const { address, ...userWithoutAddress } = user;
// userWithoutAddress = { id, name, orders } — address excluded ✓

// Merging configs (correct order: defaults first, user config last)
const defaults = { timeout: 3000, retries: 3, debug: false, baseUrl: "/api" };
const userConfig = { timeout: 5000, debug: true };
const config = { ...defaults, ...userConfig }; // userConfig wins ✓
// { timeout: 5000, retries: 3, debug: true, baseUrl: "/api" }

// ─────────────────────────────────────────────
// EXAMPLE 5: structuredClone vs JSON.parse for deep clone
// ─────────────────────────────────────────────
const complexObj = {
  name: "Order",
  createdAt: new Date("2024-01-15"),
  tags: new Set(["express", "priority"]),
  metadata: new Map([["source", "mobile"]]),
  nested: { items: [{ id: 1, name: "Laptop" }] }
};

// JSON.parse approach — loses types
const jsonClone = JSON.parse(JSON.stringify(complexObj));
console.log(jsonClone.createdAt);  // "2024-01-15T00:00:00.000Z" — string, not Date!
console.log(jsonClone.tags);       // {} — Set lost!
console.log(jsonClone.metadata);   // {} — Map lost!

// structuredClone — preserves most types
const structClone = structuredClone(complexObj);
console.log(structClone.createdAt instanceof Date); // true ✓
console.log(structClone.tags instanceof Set);        // true ✓
console.log(structClone.metadata instanceof Map);    // true ✓
// Prove it's deep:
structClone.nested.items[0].name = "Phone";
console.log(complexObj.nested.items[0].name); // "Laptop" — original safe ✓

// ─────────────────────────────────────────────
// EXAMPLE 6: Rest — collecting args and object remainder
// ─────────────────────────────────────────────
// Rest in function params
function logEvent(eventName, ...metadata) {
  console.log(\`Event: \${eventName}\`, metadata);
  // metadata is a true Array — has all Array methods
  metadata.forEach(m => sendToAnalytics(eventName, m));
}
logEvent("purchase", { orderId: "ORD001" }, { amount: 5000 }, { userId: "USR001" });

// Rest vs arguments object
function legacyFn() {
  const args = Array.from(arguments); // array-like → array conversion needed
  return args.reduce((s, n) => s + n, 0);
}
function modernFn(...args) {
  return args.reduce((s, n) => s + n, 0); // args is already a real Array ✓
}

// Destructure and forward remaining props (common React pattern)
function Button({ label, variant = "primary", size = "md", onClick, ...htmlProps }) {
  // htmlProps contains any extra props (className, disabled, aria-*, data-*, etc.)
  return \`<button class="\${variant} \${size}" ...htmlProps>\${label}</button>\`;
}

// ─────────────────────────────────────────────
// EXAMPLE 7: Computed keys + destructuring in real code
// ─────────────────────────────────────────────
// Dynamic key extraction
function getField(obj, fieldName) {
  const { [fieldName]: value } = obj;
  return value;
}
const product = { id: "P001", name: "MacBook", price: 150000 };
console.log(getField(product, "name"));  // "MacBook"
console.log(getField(product, "price")); // 150000

// Building a form state updater
function updateFormField(state, fieldName, value) {
  return { ...state, [fieldName]: value }; // computed key in spread ✓
}
let form = { name: "", email: "", phone: "" };
form = updateFormField(form, "name", "Pooja");
form = updateFormField(form, "email", "pooja@example.com");
console.log(form); // { name: "Pooja", email: "pooja@example.com", phone: "" }`,
    bugs: `BUG 1: Shallow copy mutates original — the spread trap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Redux-style reducer that mutates state
function cartReducer(state, action) {
  const newState = { ...state }; // shallow copy!
  if (action.type === "UPDATE_ITEM") {
    newState.items[0].quantity = action.quantity; // MUTATES state.items[0] too!
    // state.items and newState.items point to the SAME array and same item objects
  }
  return newState;
}
// React/Redux detects state change by reference equality
// state.items[0] === newState.items[0] → true — React might not re-render!

// FIX: Spread at every level you're modifying
function cartReducerFixed(state, action) {
  if (action.type === "UPDATE_ITEM") {
    return {
      ...state,
      items: state.items.map(item =>
        item.id === action.id
          ? { ...item, quantity: action.quantity } // new object for modified item ✓
          : item
      )
    };
  }
  return state;
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Default in destructuring is undefined-only (not null)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const config = { timeout: null }; // API explicitly returns null for "use system default"
const { timeout = 5000 } = config;
console.log(timeout); // null — NOT 5000!
// Default only applies when value is UNDEFINED, not null

// This is a subtle bug: if backend returns null meaning "not set",
// destructuring default won't kick in — you'll use null downstream

// FIX: Use nullish coalescing if you need null to trigger default
const timeout2 = config.timeout ?? 5000; // null ?? 5000 = 5000 ✓

// Or handle in destructuring:
const { timeout: rawTimeout = undefined } = config;
const timeout3 = rawTimeout ?? 5000; // ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Object spread order — later keys overwrite earlier ones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: User config silently overwritten by defaults
function initializeApp(userConfig) {
  const config = {
    ...userConfig,     // user's { theme: "dark", timeout: 10000 }
    ...getDefaults()   // defaults AFTER user → overwrites user config!
  };
  // config.theme = "light" (default), not "dark" (user choice)
}

// FIX: Put defaults BEFORE user config (user config wins)
function initializeAppFixed(userConfig) {
  const config = {
    ...getDefaults(),  // defaults first
    ...userConfig,     // user config last → overrides defaults ✓
  };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Destructuring undefined nested property — crashes without guard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function renderUserProfile(response) {
  const { data: { user: { name, avatar } } } = response;
  // If response.data is undefined or response.data.user is undefined → TypeError
}

renderUserProfile({ error: "Not found" }); // TypeError: Cannot destructure 'user' of undefined

// FIX: Add = {} guards at each nullable level
function renderUserProfileFixed(response) {
  const { data: { user: { name = "Guest", avatar = null } = {} } = {} } = response;
  // Each level gets a = {} default — safely handles missing structure ✓
}
renderUserProfileFixed({ error: "Not found" }); // name="Guest", avatar=null ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: JSON.stringify deep clone drops functions and special types
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Using JSON for deep clone in a class with methods or Dates
class UserSession {
  constructor(userId, expiresAt) {
    this.userId = userId;
    this.expiresAt = expiresAt; // Date object
    this.permissions = new Set(["read", "write"]);
  }
  isExpired() { return Date.now() > this.expiresAt.getTime(); }
}

const session = new UserSession("USR001", new Date("2025-12-31"));
const badClone = JSON.parse(JSON.stringify(session));
// badClone.expiresAt is a STRING — not a Date
// badClone.permissions is {} — Set lost
// badClone.isExpired is undefined — method lost (not own enumerable property)
badClone.isExpired(); // TypeError: badClone.isExpired is not a function

// FIX: Use structuredClone for data (no class methods needed)
const goodClone = structuredClone({ userId: session.userId, expiresAt: session.expiresAt, permissions: session.permissions });
// goodClone.expiresAt is a Date ✓, permissions is a Set ✓`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
const { a, b, ...rest } = obj;
const copy = { ...obj };

copy.a = 99;
copy.b.c = 99;
copy.d.push(99);

console.log(obj.a);   // (A)
console.log(obj.b.c); // (B)
console.log(obj.d);   // (C)
console.log(rest);    // (D)

// Answers:
// A = 1    (a is primitive — copy gets its own)
// B = 99   (b is object reference — shallow copy, same object mutated)
// C = [3, 4, 99] (d is array reference — shallow copy, same array mutated)
// D = { b: { c: 99 }, d: [3,4,99] } — rest captures b and d (same references)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This function tries to merge user preferences with defaults.
// It has 2 bugs. Find and fix them.
function getUserConfig(userPrefs) {
  const defaults = {
    theme: "light",
    language: "en",
    notifications: { email: true, sms: false, push: true }
  };

  const merged = { ...userPrefs, ...defaults }; // BUG 1: wrong order

  // BUG 2: merging notifications shallowly — userPrefs.notifications gets overwritten entirely
  return merged;
}

getUserConfig({ theme: "dark", notifications: { sms: true } });
// Expected: theme="dark", notifications: { email: true, sms: true, push: true }
// Actual with bugs: theme="light" (BUG1), notifications: { email:true, sms:false, push:true } (BUG2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a deepMerge(target, source) function that:
1. Recursively merges nested objects (not just top-level)
2. Arrays from source REPLACE arrays in target (don't concat)
3. Non-object values from source override target
4. Does NOT mutate either target or source

  const target = { a: 1, b: { x: 1, y: 2 }, c: [1, 2] };
  const source = { b: { y: 99, z: 3 }, c: [3, 4], d: 5 };
  const result = deepMerge(target, source);
  // { a: 1, b: { x: 1, y: 99, z: 3 }, c: [3, 4], d: 5 }
  // target and source unchanged ✓`,
    summary: `Destructuring elegantly unpacks values from nested structures — always add = {} guards on function parameters to prevent TypeError on missing arguments. Spread creates shallow copies (not deep), so always spread at every nested level you intend to modify. Use structuredClone for true deep cloning of complex data structures without losing types.`
  },

  {
    id: 10,
    title: "Error Handling & Custom Errors",
    tag: "FAIL GRACEFULLY, DEBUG FAST",
    color: "#BE123C",
    tldr: `JavaScript errors carry a message, name, stack trace, and (ES2022) a cause chain. Custom error classes that properly extend Error enable instanceof checking and structured error handling by type. The Result pattern — returning {ok, value} or {ok: false, error} instead of throwing — is an increasingly popular alternative for expected failure cases.`,
    problem: `Why doesn't instanceof work on custom errors in some environments?
  class MyError extends Error {}
  const err = new MyError("test");
  err instanceof MyError; // false in transpiled (Babel) code — why?

Why does finally run even when there's a return in try?
  function getData() {
    try { return "data"; }
    finally { console.log("finally runs!"); } // when does this run?
  }

How do you properly chain errors to preserve the original cause?
  try {
    connectToDatabase();
  } catch (err) {
    throw new Error("Server unavailable"); // original error is LOST
  }
  // Stack trace shows new error — original db error is gone

Why does catching all errors generically make debugging a nightmare?
  try { ... }
  catch (e) {
    console.log("Error occurred"); // what error? which type? lost forever
  }

How do you handle async errors globally so they don't silently disappear?
  fetchUser(id).then(doSomething); // what if doSomething throws? Unhandled rejection!

In production, unstructured error handling = debugging by guesswork.`,
    analogy: `Think of errors like airplane incident reports.

A RAW ERROR is like saying "plane crashed" — technically true but useless.
A STRUCTURED ERROR includes: what failed (message), which system (name), when and where (stack trace), and crucially — what caused it (cause chain).

The ERROR HIERARCHY is like departments:
  AppError (general IT department)
    ├── NetworkError (connectivity team)
    ├── ValidationError (input checking team)
    └── DatabaseError (data storage team)

When something goes wrong, you file a report with the RIGHT department.
The catch handler looks at the report type and routes it to the right team.
Generic "catch everything" = throwing all reports in one pile — nobody knows who should fix it.

THE RESULT PATTERN is like a delivery service that ALWAYS delivers:
  - Success: { ok: true, value: yourPackage }
  - Failure: { ok: false, error: "package lost in transit" }
Instead of "exception — delivery failed, building closed, no callback", you always get a box back. You open it, check if ok=true, and handle accordingly. No try/catch needed at the caller.

FINALLY is like the cleanup crew. No matter what happened during the event (success, failure, early exit), the cleanup crew ALWAYS sweeps the floor before the next event starts.`,
    deep: `THE ERROR OBJECT — ALL PROPERTIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new Error("something went wrong")

  .message   — human-readable description (string)
  .name      — error type (default: "Error", subclasses should override)
  .stack     — stack trace as a string (V8: formatted, shows call chain)
  .cause     — (ES2022) the original error that caused this one
               new Error("wrapper", { cause: originalError })
  .code      — (Node.js) OS-level error code e.g. "ENOENT", "ECONNREFUSED"

Built-in error types:
  Error          — base
  SyntaxError    — invalid JavaScript syntax (parse time)
  ReferenceError — accessing undeclared variable
  TypeError      — wrong type (null.prop, not a function, etc.)
  RangeError     — value out of valid range (new Array(-1), recursion depth)
  URIError       — malformed URI
  EvalError      — eval() related (rare)
  AggregateError — multiple errors (Promise.any rejection, ES2021)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOM ERROR CLASS — FIXING instanceof IN BABEL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  class AppError extends Error {
    constructor(message, options) {
      super(message, options);   // passes cause to Error
      this.name = this.constructor.name; // CRITICAL: set name to class name

      // Fix for Babel/TypeScript transpilation (es5 targets):
      // When transpiled, class extends Error doesn't properly set prototype
      Object.setPrototypeOf(this, new.target.prototype); // CRITICAL for instanceof
    }
  }

WHY instanceof BREAKS in transpiled code:
  Babel compiles 'class extends Error' to ES5 with Object.create and call().
  The prototype chain gets broken — new.target is not set correctly.
  Object.setPrototypeOf(this, new.target.prototype) manually fixes it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
try/catch/finally MECHANICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - finally ALWAYS executes: after try (success or throw) and after catch
  - If try has 'return' — finally still runs BEFORE the return value is sent
  - If finally also has 'return' — it OVERRIDES the try/catch return value!
  - If finally throws — overrides the original error (danger!)

  function example() {
    try {
      return "from try";
    } finally {
      return "from finally"; // OVERRIDES "from try"! Usually a bug.
    }
  }
  example(); // "from finally"

WHEN TO CATCH vs PROPAGATE:
  - Catch: when you can RECOVER and provide a fallback
  - Catch: when you need to TRANSFORM the error (add context, wrap with cause)
  - Catch: when you need to LOG and then re-throw
  - Propagate: when a caller needs to know about the failure
  - Never: catch an error and silently swallow it (without logging)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL ERROR HANDLERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Browser:
  window.onerror(message, source, lineno, colno, error) — sync errors
  window.addEventListener("unhandledrejection", event => { event.promise; event.reason })
  window.addEventListener("rejectionhandled", event => ...) — rejection handled late

Node.js:
  process.on("uncaughtException", (err, origin) => ...) — sync errors
  process.on("unhandledRejection", (reason, promise) => ...) — async errors
  // Best practice: log and EXIT — state may be corrupted after uncaughtException

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT PATTERN (Go/Rust style):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instead of throwing, return a discriminated union:
  type Result<T> = { ok: true; value: T } | { ok: false; error: Error }

Advantages:
  - Makes failure explicit in the function signature
  - Forces callers to handle both cases
  - Easier to compose with map/flatMap
  - No try/catch needed at call site for EXPECTED failures
  - Try/catch still for UNEXPECTED errors (programming bugs)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR SERIALIZATION FOR STRUCTURED LOGGING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON.stringify(new Error("test")) → "{}" — Error properties are non-enumerable!
You must manually serialize errors for logging to services like Sentry, Datadog, CloudWatch.`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Error hierarchy with proper instanceof fix
// ─────────────────────────────────────────────
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause }); // ES2022 cause
    this.name = this.constructor.name;         // "AppError", "NetworkError", etc.
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    Object.setPrototypeOf(this, new.target.prototype); // fix for Babel/TS transpilation
  }
}

class NetworkError extends AppError {
  constructor(message, options = {}) {
    super(message, options);
    this.statusCode = options.statusCode ?? 503;
  }
}

class ValidationError extends AppError {
  constructor(message, field, options = {}) {
    super(message, options);
    this.field = field;
    this.statusCode = 400;
  }
}

class DatabaseError extends AppError {
  constructor(message, query, options = {}) {
    super(message, options);
    this.query = query;
    this.statusCode = 500;
  }
}

class AuthError extends AppError {
  constructor(message, options = {}) {
    super(message, options);
    this.statusCode = 401;
  }
}

// Usage:
try {
  throw new ValidationError("Email is required", "email");
} catch (err) {
  console.log(err instanceof ValidationError); // true ✓
  console.log(err instanceof AppError);        // true ✓ (inheritance)
  console.log(err instanceof Error);           // true ✓
  console.log(err.name);                       // "ValidationError"
  console.log(err.field);                      // "email"
  console.log(err.statusCode);                 // 400
}

// ─────────────────────────────────────────────
// EXAMPLE 2: Error cause chain — preserving original context
// ─────────────────────────────────────────────
async function getUserFromDB(userId) {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (!result.rows.length) throw new Error(\`User \${userId} not found\`);
    return result.rows[0];
  } catch (dbError) {
    // Wrap with context — preserve original via cause
    throw new DatabaseError(
      \`Failed to fetch user \${userId}\`,
      "SELECT * FROM users",
      { cause: dbError, code: "DB_USER_FETCH_FAILED" }
    );
  }
}

async function getOrderHistory(userId) {
  try {
    const user = await getUserFromDB(userId);
    return await fetchOrders(user.id);
  } catch (err) {
    if (err instanceof DatabaseError) {
      throw new AppError(
        "Could not load order history",
        { cause: err, statusCode: 503, code: "ORDER_HISTORY_UNAVAILABLE" }
      );
    }
    throw err; // re-throw unknown errors
  }
}

// Logging full cause chain:
function logErrorChain(err, depth = 0) {
  const indent = "  ".repeat(depth);
  console.error(\`\${indent}\${err.name}: \${err.message}\`);
  if (err.stack) console.error(\`\${indent}  at: \${err.stack.split("\\n")[1]?.trim()}\`);
  if (err.cause) logErrorChain(err.cause, depth + 1);
}

// ─────────────────────────────────────────────
// EXAMPLE 3: try/catch/finally — real patterns
// ─────────────────────────────────────────────
async function processPaymentWithCleanup(paymentData) {
  let paymentIntent = null;
  let dbTransaction = null;

  try {
    // Start resources
    paymentIntent = await stripe.createPaymentIntent(paymentData.amount);
    dbTransaction = await db.beginTransaction();

    // Business logic
    await db.createOrder(paymentData, dbTransaction);
    await stripe.confirmPayment(paymentIntent.id);
    await db.commitTransaction(dbTransaction);

    return { success: true, paymentId: paymentIntent.id };

  } catch (error) {
    // Rollback on any failure
    if (dbTransaction) await db.rollbackTransaction(dbTransaction).catch(() => {});
    if (paymentIntent) await stripe.cancelPaymentIntent(paymentIntent.id).catch(() => {});

    if (error instanceof ValidationError) {
      return { success: false, userMessage: error.message }; // recoverable
    }
    throw error; // re-throw system errors — let caller decide

  } finally {
    // ALWAYS release resources — even on success, error, or early return
    if (dbTransaction?.isOpen) await db.releaseTransaction(dbTransaction).catch(() => {});
    console.log("Payment processing completed (finally block)");
    // Note: don't return from finally — it overrides try/catch return values!
  }
}

// ─────────────────────────────────────────────
// EXAMPLE 4: Result pattern — explicit failure handling
// ─────────────────────────────────────────────
// Helper constructors
const ok = (value) => ({ ok: true, value });
const err = (error) => ({ ok: false, error });

// Function that returns Result instead of throwing
async function validateAndSaveUser(userData) {
  if (!userData.email) return err(new ValidationError("Email required", "email"));
  if (!userData.email.includes("@")) return err(new ValidationError("Invalid email", "email"));
  if (!userData.name) return err(new ValidationError("Name required", "name"));

  try {
    const user = await db.users.create(userData);
    return ok(user);
  } catch (dbError) {
    return err(new DatabaseError("Save failed", "INSERT users", { cause: dbError }));
  }
}

// Caller — explicit, no try/catch needed for expected failures
async function handleRegistration(formData) {
  const result = await validateAndSaveUser(formData);

  if (!result.ok) {
    const { error } = result;
    if (error instanceof ValidationError) {
      return { redirect: null, flash: { type: "error", field: error.field, message: error.message } };
    }
    // Unexpected: log and show generic message
    reportToSentry(error);
    return { redirect: null, flash: { type: "error", message: "Registration failed. Try again." } };
  }

  return { redirect: "/dashboard", flash: { type: "success", message: \`Welcome, \${result.value.name}!\` } };
}

// ─────────────────────────────────────────────
// EXAMPLE 5: Global error handlers
// ─────────────────────────────────────────────
// Browser: catch all unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault(); // suppress default console.error
  const { reason } = event;

  console.error("[Unhandled Rejection]", {
    message: reason?.message,
    name: reason?.name,
    stack: reason?.stack
  });

  // Send to error tracking
  reportToSentry(reason, { context: "unhandledrejection" });

  // Show user-friendly message for network errors
  if (reason instanceof NetworkError) {
    showToast("Connection issue. Please check your network.");
  }
});

window.onerror = (message, source, lineno, colno, error) => {
  reportToSentry(error ?? new Error(message), { source, lineno, colno });
  return true; // suppress default browser error display
};

// Node.js: global handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection:", reason);
  reportToSentry(reason);
  // Don't exit here — Node 15+ exits automatically
});

process.on("uncaughtException", (err, origin) => {
  console.error("Uncaught Exception:", err, "Origin:", origin);
  reportToSentry(err);
  // MUST exit — process state is unpredictable after uncaughtException
  process.exit(1);
});

// ─────────────────────────────────────────────
// EXAMPLE 6: Error serialization for structured logging
// ─────────────────────────────────────────────
function serializeError(err) {
  if (!(err instanceof Error)) return { message: String(err), type: "unknown" };

  const serialized = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err.code && { code: err.code }),
    ...(err.statusCode && { statusCode: err.statusCode }),
    ...(err.field && { field: err.field }), // ValidationError
  };

  if (err.cause) {
    serialized.cause = serializeError(err.cause); // recursive chain
  }

  return serialized;
}

// Structured log entry
function createLogEntry(level, message, err, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    error: err ? serializeError(err) : undefined,
    context: {
      service: "payment-service",
      version: process.env.APP_VERSION,
      ...context
    }
  };
}

// Usage — JSON.stringify now works on error!
const logEntry = createLogEntry("error", "Payment failed", paymentError, { orderId: "ORD001" });
console.log(JSON.stringify(logEntry)); // full structured log ✓

// ─────────────────────────────────────────────
// EXAMPLE 7: Type-safe error handler middleware (Express-style)
// ─────────────────────────────────────────────
function createErrorMiddleware(logger, sentryClient) {
  return function errorHandler(err, req, res, next) {
    // Log full chain
    logger.error("Request error", createLogEntry("error", err.message, err, {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    }));

    // Route to correct response by error type
    if (err instanceof ValidationError) {
      return res.status(400).json({
        error: "Validation failed",
        field: err.field,
        message: err.message
      });
    }

    if (err instanceof AuthError) {
      return res.status(401).json({ error: "Unauthorized", message: err.message });
    }

    if (err instanceof NetworkError) {
      return res.status(err.statusCode).json({
        error: "Service unavailable",
        message: "A downstream service is unavailable. Please retry."
      });
    }

    // Unknown error — report and respond generically
    sentryClient?.captureException(err);
    return res.status(500).json({
      error: "Internal server error",
      message: "Something went wrong. Our team has been notified."
    });
  };
}`,
    bugs: `BUG 1: Silent error swallowing — catch that logs but never re-throws or returns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function transferFunds(from, to, amount) {
  try {
    await debitAccount(from, amount);
    await creditAccount(to, amount);
    return true;
  } catch (err) {
    console.log("Transfer failed:", err.message); // logged but...
    // Returns undefined — caller thinks transfer succeeded!
  }
}

const success = await transferFunds("ACC001", "ACC002", 10000);
if (success) notifyUser("Transfer complete!"); // ← notified even on failure!

// FIX: Re-throw or return explicit failure
async function transferFundsFixed(from, to, amount) {
  try {
    await debitAccount(from, amount);
    await creditAccount(to, amount);
    return { ok: true };
  } catch (err) {
    console.error("Transfer failed:", err);
    return { ok: false, error: err.message }; // explicit failure ✓
    // OR: throw new AppError("Transfer failed", { cause: err });
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: finally with return overrides try return — insidious bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function fetchConfig(url) {
  try {
    const config = await fetchURL(url);
    return config; // ← intends to return config
  } catch (err) {
    return null;   // ← intends to return null on error
  } finally {
    return "cleaned up"; // ← OVERRIDES both! Always returns "cleaned up"!
  }
}
// Every caller gets "cleaned up" as config — completely broken

// FIX: Never return from finally — use it only for cleanup side effects
async function fetchConfigFixed(url) {
  let connection = null;
  try {
    connection = await openConnection(url);
    return await connection.getConfig(); // ✓ return value preserved
  } catch (err) {
    return null;
  } finally {
    connection?.close(); // cleanup only — no return ✓
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Catching and discarding error context — losing the cause chain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function loadUserDashboard(userId) {
  try {
    return await getUserData(userId);
  } catch (err) {
    throw new Error("Failed to load dashboard"); // original err is GONE
    // Stack trace shows this line only — where in getUserData? Unknown.
  }
}

// FIX: Preserve cause chain for full trace
async function loadUserDashboardFixed(userId) {
  try {
    return await getUserData(userId);
  } catch (err) {
    throw new AppError("Failed to load dashboard", {
      cause: err, // original error preserved in chain ✓
      code: "DASHBOARD_LOAD_FAILED",
      statusCode: 503
    });
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: instanceof broken after JSON.parse/postMessage/iframe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Receiving error from Web Worker / across realms
worker.onmessage = ({ data }) => {
  if (data.error instanceof ValidationError) { // always false!
    showValidationUI(data.error);
  }
  // data.error was serialized (JSON) and deserialized — it's a plain object now
  // instanceof checks prototype — plain object has no prototype chain
};

// FIX: Use error code/name for cross-realm type checking
worker.onmessage = ({ data }) => {
  if (data.error?.name === "ValidationError" || data.error?.code === "VALIDATION_ERROR") {
    showValidationUI(data.error); // check name, not instanceof ✓
  }
};

// In the worker, serialize before posting:
self.postMessage({ error: serializeError(err) }); // use serializeError from Example 6

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Unhandled rejection from async IIFE or fire-and-forget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: App startup with async IIFE — rejections silently dropped in older Node
(async () => {
  await connectDatabase();    // if this rejects...
  await seedInitialData();    // ...this never runs, and error may be swallowed
  startServer();
})(); // no .catch(), no try/catch around it

// Also buggy: non-awaited async call in synchronous code
app.listen(3000, () => {
  warmupCache(); // async function — rejection not caught by Express error handler
});

// FIX: Explicit .catch() on async IIFEs and non-awaited calls
(async () => {
  await connectDatabase();
  await seedInitialData();
  startServer();
})().catch(err => {
  console.error("Server startup failed:", err);
  process.exit(1); // ✓ fail loudly
});

app.listen(3000, () => {
  warmupCache().catch(err => {
    console.error("Cache warmup failed (non-critical):", err);
    // Continue — cache miss is acceptable
  });
});`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function test() {
  try {
    console.log("A");
    throw new Error("oops");
    console.log("B");       // (never reached)
  } catch (err) {
    console.log("C:", err.message);
    return "from catch";
  } finally {
    console.log("D");
    // No return here
  }
  console.log("E");         // does this run?
}

const result = test();
console.log("Result:", result);

// Output:
// A
// C: oops
// D
// Result: from catch
// (B and E never run — B because of throw, E because catch returned first)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This error hierarchy has 3 bugs. Find and fix them.
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    // BUG 1: this.name not set — err.name shows "Error" not "ApiError"
    this.statusCode = statusCode;
    // BUG 2: missing Object.setPrototypeOf — instanceof broken in TS/Babel
  }
}

class RateLimitError extends ApiError {
  constructor(retryAfter) {
    // BUG 3: wrong argument order + no message
    super(429);
    this.retryAfter = retryAfter;
  }
}

const err = new RateLimitError(60);
console.log(err instanceof RateLimitError); // may be false (BUG 2)
console.log(err.name);      // "Error" not "RateLimitError" (BUG 1)
console.log(err.message);   // "429" not "Rate limit exceeded" (BUG 3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a tryCatch(fn) utility that:
1. Wraps any sync or async function call
2. Always returns { ok, value } | { ok: false, error } (Result pattern)
3. Never throws — all errors are caught and returned as { ok: false, error }

  // Sync usage:
  const result = tryCatch(() => JSON.parse(invalidJSON));
  if (!result.ok) console.log("Parse failed:", result.error.message);

  // Async usage:
  const result2 = await tryCatch(() => fetch("/api/users"));
  if (result2.ok) console.log(result2.value);

Then build a chainResult(result, fn) that:
  - If result.ok, applies fn to result.value and returns a new Result
  - If result.ok is false, passes the error through unchanged (like flatMap for Result)

  const userResult = await tryCatch(() => fetchUser(id));
  const nameResult = chainResult(userResult, user => user.profile.name);
  // If fetchUser failed, nameResult = { ok: false, error: ... } (propagated)
  // If fetchUser succeeded, nameResult = { ok: true, value: "Anjali" }`,
    summary: `Proper error handling means using typed custom errors (with instanceof fix), preserving error causes in chains, never silently swallowing errors, and always cleaning up in finally. The Result pattern makes failure handling explicit and composable — use it for expected failures, and exceptions for unexpected programming errors. Always set up global handlers so unhandled rejections never disappear silently.`
  }
];
