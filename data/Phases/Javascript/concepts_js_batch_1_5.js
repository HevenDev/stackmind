const concepts = [
  {
    id: 1,
    title: "Execution Context & Call Stack",
    tag: "THE ENGINE UNDER THE HOOD",
    color: "#E84393",
    tldr: `Every time JavaScript runs code, it creates an Execution Context — a container that holds variables, scope, and the value of 'this'. Code runs in two phases: a creation phase (hoisting) and an execution phase. The Call Stack tracks which context is currently running using a Last-In-First-Out structure.`,
    problem: `Why does this print 'undefined' instead of 10?
  console.log(x); // undefined — not ReferenceError, not 10
  var x = 10;

Why does calling a function before its declaration work sometimes but not others?
  greet(); // works fine
  function greet() { console.log("Namaste"); }

  hello(); // TypeError: hello is not a function
  var hello = function() { console.log("Namaste"); };

Why does 'this' behave differently in seemingly identical functions?
  const arjun = {
    name: "Arjun",
    sayHi: function() { console.log(this.name); }, // "Arjun"
    sayHiArrow: () => { console.log(this.name); }  // undefined
  };

These bugs ALL come from not understanding how JavaScript sets up and runs execution contexts.
If you don't know the two phases, hoisting will confuse you forever.
If you don't know scope chain mechanics, you'll misread closures and 'this'.`,
    analogy: `Imagine a film director preparing to shoot a scene (Creation Phase).
Before the cameras roll, the director walks through the set and NOTES every prop and actor.
  - Props (var) get a placeholder label: "this spot reserved — value: UNDEFINED"
  - Function declarations are like actors placed in their EXACT positions, fully ready
  - let/const props are roped off with a "DO NOT TOUCH" sign (TDZ) until the scene reaches them

Then the cameras start rolling (Execution Phase).
The director goes line by line, filling placeholders with real values and calling actors to perform.

The Call Stack is like a stack of script pages on a director's desk.
When scene A calls scene B, you place scene B's page ON TOP of scene A.
You cannot return to scene A until scene B's page is fully finished and removed.
Stack overflow = you keep stacking pages (recursive calls) until the desk collapses.

Scope Chain = the director checks their own script first,
then walks to the OUTER SET (not the set currently active — the one where this scene was WRITTEN),
and keeps walking outward until reaching the global studio.`,
    deep: `EXECUTION CONTEXT — 3 Internal Components:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Variable Environment (VE)
   - Stores: var declarations, function declarations
   - var → hoisted, initialized to undefined immediately
   - function declarations → hoisted FULLY (name + entire body)

2. Lexical Environment (LE)
   - Stores: let, const, the outer reference
   - let/const → hoisted but placed in TDZ (inaccessible until declaration line)
   - Outer Reference → points to the environment where this function was DEFINED
     (this is what creates the scope chain — lexical, not dynamic)

3. This Binding
   - Determined at creation time based on how function was called
   - Global context: 'this' = window (browser) or global (Node) or undefined (strict)
   - Method call: 'this' = the object before the dot
   - Arrow functions: 'this' inherited from ENCLOSING lexical context (no own binding)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — CREATION PHASE (before any line executes):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 1: Create the Variable Environment record
  Step 2: Scan for var → register name → set value = undefined
  Step 3: Scan for function declarations → register name → set value = full function object
  Step 4: Scan for let/const → register name → set value = <TDZ> (uninitialized binding)
  Step 5: Set outer environment reference (lexical scope chain)
  Step 6: Determine and bind 'this'

  IMPORTANT: function declarations OVERWRITE var if same name exists.
  var foo = "hi";
  function foo() {} // foo is now the function during creation phase
  // During execution, var assignment then overwrites back to "hi"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — EXECUTION PHASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - Runs top to bottom
  - Assignments happen (var variables get their real values)
  - let/const bindings leave TDZ once their line is reached
  - Function calls trigger new Execution Context creation (push new frame to stack)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE CALL STACK — Internal Mechanics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - LIFO: Last In, First Out
  - Each function call → PUSH a new execution context (stack frame)
  - Each function return → POP the frame
  - V8's default stack limit: ~10,000–15,000 frames (varies by engine + memory)
  - Stack frame contains: local variables, arguments object, return address
  - Synchronous by nature: only ONE frame executes at a time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCOPE CHAIN — Lexical, Not Dynamic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "Where a function is DEFINED determines its scope chain,
   NOT where it is called from."

  const x = "global";
  function outer() {
    const x = "outer";
    function inner() {
      console.log(x); // "outer" — lexical parent, not call site
    }
    return inner;
  }
  const fn = outer();
  fn(); // "outer" — scope chain was fixed at definition time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STACK OVERFLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Occurs when the call stack exceeds its maximum size.
  Most common cause: infinite recursion with no base case.
  Fix options:
  1. Add a base case
  2. Use iteration instead of recursion
  3. Trampolining (return a function instead of calling it, run in a loop)
  4. Use setTimeout to break recursion into async chunks (event loop trick)`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Creation Phase — var hoisting
// ─────────────────────────────────────────────
console.log(priceBeforeTax); // undefined (NOT ReferenceError)
var priceBeforeTax = 500;    // assignment happens here in execution phase
console.log(priceBeforeTax); // 500

// Behind the scenes (creation phase):
//   priceBeforeTax = undefined  ← registered first
// Behind the scenes (execution phase):
//   line 1: reads priceBeforeTax → undefined
//   line 2: priceBeforeTax = 500
//   line 3: reads priceBeforeTax → 500

// ─────────────────────────────────────────────
// EXAMPLE 2: Function declaration vs expression hoisting
// ─────────────────────────────────────────────
calculateGST(1000); // Works! Function declaration fully hoisted

function calculateGST(amount) {
  return amount * 0.18;
}

applyDiscount(500); // TypeError: applyDiscount is not a function
// var applyDiscount is hoisted as undefined, not as a function
var applyDiscount = function(amount) {
  return amount * 0.9;
};

// ─────────────────────────────────────────────
// EXAMPLE 3: let/const TDZ (Temporal Dead Zone)
// ─────────────────────────────────────────────
// console.log(gstRate); // ReferenceError: Cannot access 'gstRate' before initialization
// The variable EXISTS in the environment (hoisted) but is in TDZ
let gstRate = 0.18;
console.log(gstRate); // 0.18 — TDZ ends at the let declaration line

// ─────────────────────────────────────────────
// EXAMPLE 4: Scope chain — lexical lookup
// ─────────────────────────────────────────────
const companyName = "Infosys"; // global scope

function getEmployee() {
  const dept = "Engineering"; // getEmployee scope
  function getDetails() {
    // dept found in PARENT scope (lexical chain)
    // companyName found in GLOBAL scope
    console.log(\`\${companyName} — \${dept}\`); // "Infosys — Engineering"
  }
  getDetails();
}
getEmployee();

// ─────────────────────────────────────────────
// EXAMPLE 5: Call Stack visualization
// ─────────────────────────────────────────────
function a() { b(); }
function b() { c(); }
function c() { console.trace("Stack at c"); }
// Stack at point of console.trace:
//   c  ← top (currently executing)
//   b
//   a
//   (anonymous) ← global / module level

a(); // triggers the chain

// ─────────────────────────────────────────────
// EXAMPLE 6: Stack Overflow — infinite recursion
// ─────────────────────────────────────────────
// BAD: No base case
function factorial(n) {
  return n * factorial(n - 1); // RangeError: Maximum call stack size exceeded
}

// GOOD: Base case stops recursion
function factorialSafe(n) {
  if (n <= 1) return 1; // base case — stack starts unwinding
  return n * factorialSafe(n - 1);
}
console.log(factorialSafe(10)); // 3628800

// ADVANCED: Trampoline to handle very deep recursion without stack overflow
function trampoline(fn) {
  return function(...args) {
    let result = fn(...args);
    while (typeof result === "function") {
      result = result(); // call the thunk — never grows the stack
    }
    return result;
  };
}

function factorialTrampoline(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorialTrampoline(n - 1, n * acc); // return thunk, don't recurse
}

const safeFactorial = trampoline(factorialTrampoline);
console.log(safeFactorial(50000)); // Works without stack overflow`,
    bugs: `BUG 1: Using var in loops — shared binding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: All callbacks print 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 5 5 5 5 5 — because var i is in function scope,
// all closures share the SAME i, which is 5 when callbacks run

// FIX: Use let (block-scoped, new binding per iteration)
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0 1 2 3 4 ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Accessing let/const before declaration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function getPrice() {
  console.log(basePrice); // ReferenceError — TDZ!
  let basePrice = 299;
}
// Devs think "it's hoisted, should be undefined like var"
// But let/const hoisting puts it in TDZ, not undefined

// FIX: Always declare before use
function getPriceSafe() {
  let basePrice = 299;
  console.log(basePrice); // 299 ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Assuming scope chain is dynamic (call-site based)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY mental model:
const tax = 0.05;
function applyTax(amount) {
  return amount + (amount * tax); // Which 'tax'?
}
function regional() {
  const tax = 0.12; // Dev thinks applyTax will use THIS tax
  return applyTax(1000);
}
console.log(regional()); // 1050, not 1120 — uses DEFINITION-SITE tax (0.05)

// JS uses LEXICAL scope. applyTax was defined where tax=0.05 is visible.
// FIX: Pass tax as parameter if you need dynamic behavior
function applyTaxDynamic(amount, taxRate) {
  return amount + (amount * taxRate);
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: var declaration inside if-block leaking to function scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function processOrder(isPremium) {
  if (isPremium) {
    var discount = 0.2; // var is FUNCTION scoped, not block scoped
  }
  console.log(discount); // undefined if isPremium=false (not ReferenceError!)
  // This causes silent logic errors
}
processOrder(false); // undefined — confusing!

// FIX: Use let or const
function processOrderFixed(isPremium) {
  let discount = 0;
  if (isPremium) {
    discount = 0.2;
  }
  console.log(discount); // 0 ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Stack overflow from accidental infinite recursion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Event handler re-triggers itself
document.getElementById("btn").addEventListener("click", function handler(e) {
  // doing some work...
  document.getElementById("btn").click(); // calls itself → stack overflow!
});

// FIX: Remove recursive trigger or add a guard flag
let isProcessing = false;
document.getElementById("btn").addEventListener("click", function handler(e) {
  if (isProcessing) return;
  isProcessing = true;
  // do work
  isProcessing = false;
});`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var x = 1;
function outer() {
  var x = 2;
  function inner() {
    console.log(x);     // What prints here? (A)
    var x = 3;
    console.log(x);     // What prints here? (B)
  }
  inner();
  console.log(x);       // What prints here? (C)
}
outer();
console.log(x);         // What prints here? (D)

// Answer: A=undefined, B=3, C=2, D=1
// Explanation: inner() has its own var x, hoisted to undefined at (A),
// then assigned 3 at (B). outer's x=2 is unaffected (C). Global x=1 (D).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This code throws ReferenceError. Fix it without changing the console.log line.
function calculateTotal(items) {
  if (items.length > 0) {
    let total = items.reduce((sum, item) => sum + item.price, 0);
  }
  console.log(\`Total: ₹\${total}\`); // ReferenceError: total is not defined
}
// Hint: let is block-scoped. Move the declaration outside the if block.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a callStackTracer utility that:
1. Wraps any function and logs when it's entered (PUSH) and exited (POP)
2. Shows the current "depth" of calls with indentation
3. Works recursively (so factorial(3) shows depth 1→2→3→2→1→0)

function callStackTracer(fn, name) {
  // Your implementation here
  // When fn is called, log: "→ PUSH [depth] name(args)"
  // When fn returns, log: "← POP  [depth] name = returnValue"
}

const tracedFactorial = callStackTracer(function factorial(n) {
  if (n <= 1) return 1;
  return n * tracedFactorial(n - 1);
}, "factorial");

tracedFactorial(4);`,
    summary: `Every JavaScript program runs through Creation Phase first (hoisting) then Execution Phase — understanding this two-step process eliminates 80% of hoisting bugs. The Call Stack enforces synchronous, LIFO execution, and the Scope Chain is always lexical (where code is written), never dynamic (where code is called).`
  },

  {
    id: 2,
    title: "Closures",
    tag: "FUNCTIONS THAT REMEMBER",
    color: "#7C3AED",
    tldr: `A closure is a function that retains access to its outer (lexical) scope even after that outer function has returned. V8 stores these captured variables on the heap, not the stack. Closures power some of JavaScript's most powerful patterns: modules, React state, debounce, memoization, and more.`,
    problem: `Why does this counter not reset between calls?
  function makeCounter() {
    let count = 0;
    return function() { return ++count; };
  }
  const counter = makeCounter();
  counter(); // 1
  counter(); // 2 — how does it still know count?

Why do all these buttons alert the same number?
  for (var i = 0; i < 3; i++) {
    document.querySelector(\`#btn\${i}\`).onclick = function() { alert(i); };
  }
  // All buttons alert "3" — the classic closure-over-var bug

Why does my app run out of memory after adding event listeners?
  // Large array captured in a closure, listener never removed
  // Memory leak — GC cannot collect the closure or the data inside it

If you don't understand closures, you'll misread React hooks, write memory leaks,
and get every interview question about loops wrong.`,
    analogy: `Imagine a chef (function) who leaves a restaurant (outer function returns).
Before leaving, the chef packs a BACKPACK with all the ingredients they were using
(the variables from the outer scope). The restaurant no longer exists — it's been cleaned up.
But the chef still has the backpack.

Crucially: the backpack contains REFERENCES to ingredient containers, not copies of the food.
If someone updates the sugar container in the backpack, the chef sees the updated amount.
This is why all loop closures over 'var' share the SAME 'i' container.

V8 Memory Reality:
- Normal local variables live on the STACK (fast, auto-cleaned when frame pops)
- When V8 detects a variable is captured by a closure, it moves that variable to the HEAP
- The heap-allocated object is called a "ClosureContext" or "Context" in V8 internals
- The closure function holds a pointer to this ClosureContext
- GC will NOT collect the ClosureContext as long as the closure function is alive
- This is both the power and the danger of closures`,
    deep: `V8 INTERNALS — What Actually Happens:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When V8 compiles a function, it performs "escape analysis":
  - Does any variable in this scope get referenced by an inner function?
  - If YES → allocate that variable on the HEAP in a "Context" object
  - If NO → keep it on the stack (faster allocation + automatic cleanup)

The closure function object (JSFunction in V8) has a field called [context]
that points to the heap-allocated Context containing captured variables.

Multiple closures from the same outer function SHARE the same Context object:
  function outer() {
    let x = 0;
    const inc = () => ++x;
    const dec = () => --x;
    const get = () => x;
    return { inc, dec, get };
  }
  // inc, dec, get all point to the SAME Context { x: 0 }
  // This is why they share state — it's one heap object, three references

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE CLASSIC LOOP BUG — Deep Explanation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3

WHY:
- var i is function-scoped (or global-scoped here)
- All 3 arrow functions close over the SAME i variable in the SAME Context
- Loop runs synchronously to completion: i becomes 3
- setTimeout callbacks run later — all read i = 3

FIX 1: Use let (creates new binding per iteration — 3 separate Contexts)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2 ✓
}

FIX 2: IIFE (creates new scope per iteration, captures i by value)
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 0); // 0, 1, 2 ✓
  })(i); // i is passed as argument j — new variable, new Context
}

FIX 3: .bind() (binds i's current value as first argument)
for (var i = 0; i < 3; i++) {
  setTimeout(console.log.bind(null, i), 0); // 0, 1, 2 ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE PATTERN — Closures as Encapsulation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Revealing Module Pattern uses closures to create private state.
IIFE returns only what should be public — private variables stay trapped in closure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REACT useState IS A CLOSURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
React hooks internally use closures to associate state with function components.
Each call to useState captures the current state slot index via a closure over
the React dispatcher's internal state array and cursor.

Simplified internal model:
  const _state = [];
  let _cursor = 0;
  function useState(initialValue) {
    const slot = _cursor; // captured in closure
    if (_state[slot] === undefined) _state[slot] = initialValue;
    const setState = (newValue) => { // this is a closure
      _state[slot] = newValue;       // slot is remembered via closure
      rerender();
    };
    _cursor++;
    return [_state[slot], setState];
  }
// setState closes over 'slot' — that's why it always updates the right state variable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMORY LEAKS FROM CLOSURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A closure prevents GC from collecting ANYTHING in its Context chain.
If you capture a large array and the closure lives forever (event listener),
the large array lives forever too — even if you never read it again.

Classic leak pattern:
  function setup() {
    const hugeData = new Array(1000000).fill("📦");
    document.addEventListener("click", function handler() {
      // handler closes over hugeData — even if hugeData never used!
      console.log("clicked");
    });
    // handler is never removed → hugeData stays in memory forever
  }`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Basic closure — counter factory
// ─────────────────────────────────────────────
function makeCounter(start = 0) {
  let count = start; // captured in closure → moved to heap by V8

  return {
    increment: () => ++count,
    decrement: () => --count,
    reset: () => { count = start; },
    value: () => count
  };
}

const cart = makeCounter(0);
cart.increment(); // 1
cart.increment(); // 2
cart.decrement(); // 1
console.log(cart.value()); // 1 — count persists across calls

// ─────────────────────────────────────────────
// EXAMPLE 2: Module pattern (revealing module)
// ─────────────────────────────────────────────
const WalletModule = (function() {
  let balance = 0; // private — not accessible outside
  const transactions = []; // private

  function deposit(amount) {
    balance += amount;
    transactions.push({ type: "credit", amount, balance });
  }

  function withdraw(amount) {
    if (amount > balance) throw new Error("Insufficient funds");
    balance -= amount;
    transactions.push({ type: "debit", amount, balance });
  }

  function getStatement() {
    return transactions.map(t =>
      \`\${t.type}: ₹\${t.amount} | Balance: ₹\${t.balance}\`
    );
  }

  return { deposit, withdraw, getStatement }; // public API
})();

WalletModule.deposit(5000);
WalletModule.withdraw(1200);
console.log(WalletModule.getStatement());
// console.log(WalletModule.balance); // undefined — private! ✓

// ─────────────────────────────────────────────
// EXAMPLE 3: Debounce — a real closure in production
// ─────────────────────────────────────────────
function debounce(fn, delay) {
  let timer = null; // captured in closure — shared across all calls

  return function(...args) {
    clearTimeout(timer); // cancel previous scheduled call
    timer = setTimeout(() => {
      fn.apply(this, args); // 'this' and args preserved
    }, delay);
  };
}

const handleSearch = debounce(function(query) {
  console.log(\`Searching Flipkart for: \${query}\`);
}, 300);

// Called rapidly (e.g., on keypress):
handleSearch("lap");
handleSearch("lapt");
handleSearch("laptop"); // only this one fires after 300ms

// ─────────────────────────────────────────────
// EXAMPLE 4: Memoize — closure caches results
// ─────────────────────────────────────────────
function memoize(fn) {
  const cache = new Map(); // captured in closure — persists across calls

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log("Cache hit!");
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize(function(n) {
  // Simulate heavy computation
  return n * n * Math.sqrt(n);
});

console.log(expensiveCalc(100)); // computed
console.log(expensiveCalc(100)); // Cache hit! — returns immediately

// ─────────────────────────────────────────────
// EXAMPLE 5: once() — function that runs only once
// ─────────────────────────────────────────────
function once(fn) {
  let called = false;
  let result;

  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result; // always returns first result after that
  };
}

const initializeDB = once(function() {
  console.log("DB initialized — this runs ONCE");
  return { connected: true };
});

initializeDB(); // "DB initialized"
initializeDB(); // nothing logged — returns cached result
initializeDB(); // nothing logged

// ─────────────────────────────────────────────
// EXAMPLE 6: partial application — closure prebinds args
// ─────────────────────────────────────────────
function partial(fn, ...presetArgs) {
  return function(...laterArgs) {
    return fn(...presetArgs, ...laterArgs); // presetArgs in closure
  };
}

function applyTax(taxRate, amount) {
  return amount + (amount * taxRate);
}

const applyGST18 = partial(applyTax, 0.18);
const applyGST5  = partial(applyTax, 0.05);

console.log(applyGST18(1000)); // 1180
console.log(applyGST5(1000));  // 1050

// ─────────────────────────────────────────────
// EXAMPLE 7: Memory leak & fix
// ─────────────────────────────────────────────
// BAD — hugeData never released
function badSetup() {
  const hugeData = new Array(100000).fill("data");
  window.addEventListener("resize", function() {
    // closes over hugeData — even though it's not used
    console.log("resized");
  });
}

// GOOD — use AbortController or store reference to remove listener
function goodSetup() {
  const controller = new AbortController();
  window.addEventListener("resize", function() {
    console.log("resized");
  }, { signal: controller.signal });

  return () => controller.abort(); // cleanup function — call when done
}
const cleanup = goodSetup();
// later: cleanup(); // removes listener, allows GC`,
    bugs: `BUG 1: Classic var loop — all closures share same variable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
const buttons = document.querySelectorAll(".product-btn");
for (var i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function() {
    console.log(\`Clicked product \${i}\`); // Always prints buttons.length
  });
}
// All callbacks close over the SAME var i
// By the time any click fires, i = buttons.length (loop finished)

// FIX: Use let
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", function() {
    console.log(\`Clicked product \${i}\`); // ✓ correct index
  });
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Memory leak — closure retains large DOM/data reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function loadDashboard() {
  const reportData = fetchHugeReport(); // 50MB of data
  document.getElementById("exportBtn").addEventListener("click", function() {
    exportToExcel(reportData); // closure keeps reportData alive FOREVER
  });
  // Even after dashboard unmounts, reportData stays in memory
}

// FIX: Remove event listener when component unmounts
function loadDashboard() {
  const reportData = fetchHugeReport();
  function handleExport() {
    exportToExcel(reportData);
  }
  const btn = document.getElementById("exportBtn");
  btn.addEventListener("click", handleExport);
  return () => btn.removeEventListener("click", handleExport); // cleanup
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Stale closure in React — reading old state
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY (React):
function Timer() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // count is STALE — closure captures initial value 0
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps — closure freezes count=0 forever → always sets to 1
}

// FIX: Use functional updater form (reads current state, not closure)
React.useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // reads CURRENT state, no stale closure
  }, 1000);
  return () => clearInterval(id);
}, []);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Overusing closures — unintended shared state
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Developer thinks each call gets fresh state
const createUser = (function() {
  let id = 0; // shared across ALL calls — probably not intended
  return function(name) {
    return { id: ++id, name };
  };
})();

const priya = createUser("Priya"); // { id: 1, name: "Priya" }
const rahul = createUser("Rahul"); // { id: 2, name: "Rahul" } — id is shared!
// This is actually intentional for auto-increment IDs,
// but if you wanted separate counters per user type, this breaks.

// FIX: If you need isolated state, call a factory function, not an IIFE
function createIdGenerator() {
  let id = 0;
  return (name) => ({ id: ++id, name });
}
const createCustomer = createIdGenerator(); // own closure
const createAdmin = createIdGenerator();    // separate closure
console.log(createCustomer("Priya")); // { id: 1 }
console.log(createAdmin("Suresh"));   // { id: 1 } — independent counter ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Throttle vs Debounce confusion causes UX bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Used debounce for scroll handler — fires ONLY after scrolling stops
window.addEventListener("scroll", debounce(updateProgressBar, 300));
// Progress bar only updates 300ms AFTER user stops scrolling — laggy UX

// FIX: Use throttle for continuous events (fires at most every N ms)
function throttle(fn, limit) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
window.addEventListener("scroll", throttle(updateProgressBar, 100)); // smooth ✓`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function multiplier(factor) {
  return function(number) {
    return number * factor;
  };
}
const double = multiplier(2);
const triple = multiplier(3);

console.log(double(5));       // (A)
console.log(triple(5));       // (B)
console.log(double(triple(2))); // (C)

// Answers: A=10, B=15, C=12
// Each call to multiplier() creates a NEW closure with its own 'factor'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This memoize function has a bug. Identify and fix it.
function memoize(fn) {
  const cache = {};
  return function(n) {
    if (cache[n]) return cache[n]; // BUG: what if fn(n) returns 0 or false?
    return cache[n] = fn(n);
  };
}
// memoize(x => x * 2)(0) always recomputes — cache[0] is 0 which is falsy

// FIX: Use hasOwnProperty or Map
function memoizeFixed(fn) {
  const cache = new Map();
  return function(n) {
    if (cache.has(n)) return cache.get(n); // Map.has() checks existence, not truthiness
    const result = fn(n);
    cache.set(n, result);
    return result;
  };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build a createEventEmitter() using closures only (no classes):
  const emitter = createEventEmitter();
  emitter.on("payment", handler1);
  emitter.on("payment", handler2);
  emitter.emit("payment", { amount: 500 }); // calls handler1 and handler2
  emitter.off("payment", handler1);
  emitter.emit("payment", { amount: 200 }); // calls only handler2

Requirements:
- Use a closure to store event→handlers map (private)
- Support multiple handlers per event
- off() removes only the specified handler
- All state must be private (not accessible on the returned object)`,
    summary: `Closures are functions that carry a reference to the scope where they were born — V8 moves captured variables to the heap so they outlive their parent functions. Master closures and you understand modules, React hooks, debounce, memoize, and every interview loop question.`
  },

  {
    id: 3,
    title: "Prototypes & Prototype Chain",
    tag: "THE INHERITANCE BLUEPRINT",
    color: "#059669",
    tldr: `JavaScript inheritance works through a chain of objects linked via an internal [[Prototype]] slot. Every object looks up properties by walking this chain until it finds the property or hits null. The 'class' keyword is syntactic sugar — under the hood it still uses prototype chains and constructor functions.`,
    problem: `Why do all arrays have .map() and .filter() without you defining them?
  [1,2,3].map(x => x * 2); // works — but where does .map come from?

What's the difference between these? (Most common JS interview confusion):
  obj.__proto__
  Constructor.prototype
  Object.getPrototypeOf(obj)

Why does instanceof give unexpected results?
  [] instanceof Array  // true
  [] instanceof Object // also true — how?

Why is this bad for memory?
  function Person(name) {
    this.name = name;
    this.greet = function() { return \`Hi, I'm \${this.name}\`; }; // BUG
  }
  // Each new Person() creates a brand new copy of greet in memory
  // 1000 Person instances = 1000 separate greet functions = memory waste

Understanding prototypes means you can debug inheritance, optimize memory,
and understand what 'class' actually compiles to.`,
    analogy: `Imagine a new employee (instance) at a company (constructor).
The employee doesn't have a personal copy of every company policy document.
Instead, they have a REFERENCE to the company's policy binder (prototype).

When someone asks "What's the vacation policy?":
  1. Check employee's personal notes (own properties) — not found
  2. Walk to department binder (Constructor.prototype) — found! Use it.
  3. If not there, walk to company-wide policies (Object.prototype) — check there
  4. If still not found, hit null — "property doesn't exist"

This chain is the PROTOTYPE CHAIN.

__proto__ = the employee's reference to THEIR SPECIFIC policy binder
Constructor.prototype = the template binder printed when the company was set up

When you use 'class':
  - class Body = the HR department that creates employees
  - class Body's 'methods' section = what goes into Constructor.prototype (shared binder)
  - constructor() = the onboarding checklist that sets personal properties per employee`,
    deep: `THE CRITICAL DISTINCTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
obj.__proto__           = the [[Prototype]] of obj (the parent object in chain)
Constructor.prototype   = the object that BECOMES __proto__ of instances

  function Person(name) { this.name = name; }
  const rahul = new Person("Rahul");

  rahul.__proto__ === Person.prototype          // true ✓
  Person.prototype.__proto__ === Object.prototype // true ✓
  Object.prototype.__proto__ === null           // true ✓ — end of chain

  Person.__proto__ === Function.prototype       // true (Person is a function object too)
  Function.prototype.__proto__ === Object.prototype // true — everything connects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW 'new' WORKS INTERNALLY (4 steps):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new Person("Rahul") does:
  Step 1: Create empty object: const obj = {};
  Step 2: Set prototype: Object.setPrototypeOf(obj, Person.prototype);
  Step 3: Run constructor with 'this' = obj: Person.call(obj, "Rahul");
  Step 4: Return obj (unless constructor returns another object)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASS SYNTAX — FULLY DESUGARED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  class Animal {
    constructor(name) { this.name = name; }
    speak() { return \`\${this.name} makes a sound\`; }
    static create(name) { return new Animal(name); }
  }
  class Dog extends Animal {
    speak() { return \`\${this.name} barks\`; }
  }

  // Desugared equivalent:
  function Animal(name) { this.name = name; }
  Animal.prototype.speak = function() { return \`\${this.name} makes a sound\`; };
  Animal.create = function(name) { return new Animal(name); };

  function Dog(name) { Animal.call(this, name); } // super(name)
  Object.setPrototypeOf(Dog.prototype, Animal.prototype); // extends
  Dog.prototype.speak = function() { return \`\${this.name} barks\`; };

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY LOOKUP ALGORITHM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Check obj's own properties (Object.hasOwn(obj, key))
  2. Walk to obj.__proto__
  3. Check that object's own properties
  4. Walk to __proto__.__proto__
  5. Repeat until null
  6. Return undefined

Performance note: deep chains = slower lookups. 
V8 uses "hidden classes" (Shapes) to cache property locations — 
always add properties in the same order to keep the hidden class stable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
instanceof ALGORITHM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  obj instanceof Constructor
  = walks obj's PROTOTYPE CHAIN looking for Constructor.prototype
  = true if Constructor.prototype is anywhere in the chain

  [] instanceof Array   // true — Array.prototype is in []'s chain
  [] instanceof Object  // true — Object.prototype is also in []'s chain (further up)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
hasOwnProperty vs 'in' operator:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  obj.hasOwnProperty('key')  // only own properties
  Object.hasOwn(obj, 'key')  // modern version (safer)
  'key' in obj               // own + ALL prototype chain

  const dog = new Dog("Bruno");
  dog.hasOwnProperty('name')   // true — set in constructor
  dog.hasOwnProperty('speak')  // false — on Dog.prototype
  'speak' in dog               // true — found in prototype chain`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Prototype vs __proto__ — the key distinction
// ─────────────────────────────────────────────
function Employee(name, dept) {
  this.name = name;  // own property
  this.dept = dept;  // own property
}

// Add to prototype — SHARED by all instances (one copy in memory)
Employee.prototype.introduce = function() {
  return \`Hi, I'm \${this.name} from \${this.dept}\`;
};
Employee.prototype.company = "TCS";

const priya = new Employee("Priya", "Engineering");
const arjun = new Employee("Arjun", "Finance");

console.log(priya.introduce());  // "Hi, I'm Priya from Engineering"
console.log(arjun.company);      // "TCS" — from prototype, not own property

// Chain verification:
console.log(priya.__proto__ === Employee.prototype); // true
console.log(priya.__proto__.__proto__ === Object.prototype); // true
console.log(priya.__proto__.__proto__.__proto__);    // null — chain ends

// ─────────────────────────────────────────────
// EXAMPLE 2: Methods on prototype vs inside constructor (memory)
// ─────────────────────────────────────────────
// BAD: greet created 1000 times for 1000 instances
function PersonBad(name) {
  this.name = name;
  this.greet = function() { return \`Hi, I'm \${this.name}\`; }; // new fn per instance!
}

// GOOD: greet created ONCE, shared by all instances
function PersonGood(name) {
  this.name = name;
}
PersonGood.prototype.greet = function() {
  return \`Hi, I'm \${this.name}\`;
};

const p1 = new PersonBad("Ravi");
const p2 = new PersonBad("Sita");
console.log(p1.greet === p2.greet); // false — two separate functions (wasteful)

const p3 = new PersonGood("Ravi");
const p4 = new PersonGood("Sita");
console.log(p3.greet === p4.greet); // true — same function reference (efficient) ✓

// ─────────────────────────────────────────────
// EXAMPLE 3: Object.create() for direct prototype control
// ─────────────────────────────────────────────
const vehicleProto = {
  start() { return \`\${this.brand} engine started\`; },
  stop()  { return \`\${this.brand} engine stopped\`; }
};

// Create object with vehicleProto as its [[Prototype]]
const myCar = Object.create(vehicleProto);
myCar.brand = "Maruti";
myCar.model = "Swift";

console.log(myCar.start()); // "Maruti engine started" — from proto
console.log(Object.getPrototypeOf(myCar) === vehicleProto); // true

// Object.create(null) — creates object with NO prototype (pure hash map)
const config = Object.create(null);
config.apiUrl = "https://api.example.com";
// config.hasOwnProperty — this would throw! No Object.prototype methods.

// ─────────────────────────────────────────────
// EXAMPLE 4: class syntax — full inheritance
// ─────────────────────────────────────────────
class Account {
  #balance = 0; // private field (ES2022)

  constructor(owner, initialBalance = 0) {
    this.owner = owner;
    this.#balance = initialBalance;
  }

  deposit(amount) {
    this.#balance += amount;
    return this;
  }

  get balance() { return this.#balance; }

  toString() {
    return \`\${this.owner}: ₹\${this.#balance}\`;
  }
}

class SavingsAccount extends Account {
  #interestRate;

  constructor(owner, initialBalance, rate = 0.04) {
    super(owner, initialBalance); // calls Account constructor
    this.#interestRate = rate;
  }

  applyInterest() {
    const interest = this.balance * this.#interestRate;
    this.deposit(interest);
    return this;
  }
}

const acc = new SavingsAccount("Deepa", 10000, 0.06);
acc.deposit(5000).applyInterest();
console.log(acc.toString()); // Deepa: ₹15900

// ─────────────────────────────────────────────
// EXAMPLE 5: Mixin pattern — multiple "inheritance"
// ─────────────────────────────────────────────
const Serializable = {
  serialize() { return JSON.stringify(this); },
  deserialize(str) { return Object.assign(Object.create(Object.getPrototypeOf(this)), JSON.parse(str)); }
};

const Validatable = {
  validate() {
    return Object.keys(this).every(key => this[key] !== null && this[key] !== undefined);
  }
};

class Order {
  constructor(id, amount, customer) {
    this.id = id;
    this.amount = amount;
    this.customer = customer;
  }
}

// Mix in behaviors
Object.assign(Order.prototype, Serializable, Validatable);

const order = new Order("ORD001", 2500, "Kiran");
console.log(order.validate());    // true
console.log(order.serialize());   // '{"id":"ORD001","amount":2500,"customer":"Kiran"}'

// ─────────────────────────────────────────────
// EXAMPLE 6: hasOwnProperty vs in — real difference
// ─────────────────────────────────────────────
function Product(name, price) {
  this.name = name;
  this.price = price;
}
Product.prototype.currency = "INR";

const laptop = new Product("Dell Laptop", 75000);

console.log(Object.hasOwn(laptop, "name"));     // true — own property
console.log(Object.hasOwn(laptop, "currency")); // false — on prototype
console.log("currency" in laptop);              // true — found in chain
console.log("toString" in laptop);             // true — Object.prototype.toString

// Iterating only own props:
for (const key in laptop) {
  if (Object.hasOwn(laptop, key)) {
    console.log(\`Own: \${key} = \${laptop[key]}\`); // name, price only
  }
}`,
    bugs: `BUG 1: Putting methods in constructor — memory explosion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: In a real app with 10,000 users:
function UserCard(name, avatar) {
  this.name = name;
  this.avatar = avatar;
  this.render = function() { /* 50 line function */ }; // copied 10,000 times!
  this.onClick = function() { /* handler */ };         // copied 10,000 times!
}
// ~20 function objects × 10,000 instances = 200,000 extra objects in heap

// FIX: Put methods on prototype — one copy, shared by all
function UserCard(name, avatar) {
  this.name = name;
  this.avatar = avatar;
}
UserCard.prototype.render = function() { /* 50 line function */ };
UserCard.prototype.onClick = function() { /* handler */ };
// Now: 2 function objects total, regardless of instance count ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Mutating prototype array/object — shared state bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function ShoppingCart() {}
ShoppingCart.prototype.items = []; // shared reference on prototype!

const cart1 = new ShoppingCart();
const cart2 = new ShoppingCart();
cart1.items.push("Laptop"); // mutates the SHARED prototype array
console.log(cart2.items);   // ["Laptop"] — cart2 sees it too! Bug!

// FIX: Mutable state must be initialized in the constructor
function ShoppingCart() {
  this.items = []; // each instance gets its OWN array ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: instanceof broken across iframes / module boundaries
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY (cross-iframe):
const arr = iframe.contentWindow.Array.of(1,2,3);
console.log(arr instanceof Array); // false!
// The Array in the iframe has a DIFFERENT prototype than the parent window's Array

// FIX: Use Array.isArray() — checks internal [[Class]], not prototype chain
console.log(Array.isArray(arr)); // true ✓

// Similarly, use Object.prototype.toString for reliable type checking:
Object.prototype.toString.call(arr); // "[object Array]" ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Accidentally shadowing prototype property
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function Config() {}
Config.prototype.timeout = 3000;

const cfg = new Config();
cfg.timeout = cfg.timeout + 1000; // creates OWN property, shadows prototype
// Now all changes to Config.prototype.timeout won't affect cfg

console.log(cfg.hasOwnProperty("timeout")); // true — own now, prototype shadowed
// Other instances still use prototype value, cfg uses its own — inconsistent

// FIX: Decide if this is per-instance config (put in constructor) or shared default
function Config(timeout) {
  this.timeout = timeout || 3000; // always own — explicit per-instance
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Forgetting super() in derived class constructor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
class Animal { constructor(name) { this.name = name; } }
class Dog extends Animal {
  constructor(name, breed) {
    // Missing super(name)!
    this.breed = breed; // ReferenceError: Must call super before accessing 'this'
  }
}
// In derived classes, 'this' doesn't exist until super() creates the base object

// FIX: Always call super() before any 'this' access in derived constructors
class DogFixed extends Animal {
  constructor(name, breed) {
    super(name);       // creates 'this' = Animal's contribution
    this.breed = breed; // now safe to use 'this' ✓
  }
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Vehicle(type) { this.type = type; }
Vehicle.prototype.describe = function() { return \`I am a \${this.type}\`; };

function Car(brand) {
  Vehicle.call(this, "car");
  this.brand = brand;
}
Car.prototype = Object.create(Vehicle.prototype);
Car.prototype.constructor = Car;
Car.prototype.honk = function() { return "Beep!"; };

const swift = new Car("Maruti");
console.log(swift.describe()); // (A)
console.log(swift.honk());     // (B)
console.log(swift instanceof Car);     // (C)
console.log(swift instanceof Vehicle); // (D)
console.log(swift.constructor === Car); // (E)

// Answers: A="I am a car", B="Beep!", C=true, D=true, E=true
// Note: if we hadn't reset Car.prototype.constructor, (E) would be false

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Why does this log "Felix" instead of "Buddy"? Fix it.
function Animal(name) { this.name = name; }
Animal.prototype.getName = function() { return this.name; };

function Pet(name, owner) {
  this.owner = owner;
  // Missing: call to Animal constructor!
}
Pet.prototype = Object.create(Animal.prototype);

const cat = new Pet("Buddy", "Priya");
console.log(cat.getName()); // undefined — name was never set
// Fix: add Animal.call(this, name) inside Pet constructor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a basic class system WITHOUT using the 'class' keyword:
  // Create: Shape (base), Circle extends Shape, Rectangle extends Shape
  // Shape has: area() → throws "Not implemented", toString()
  // Circle has: area() = πr², toString() = "Circle(r=5)"
  // Rectangle has: area() = w*h, toString() = "Rectangle(4×6)"

  // Must work:
  const c = new Circle(5);
  const r = new Rectangle(4, 6);
  console.log(c.area());          // 78.54
  console.log(r.toString());      // "Rectangle(4×6)"
  console.log(c instanceof Shape); // true`,
    summary: `The prototype chain is JavaScript's inheritance mechanism — objects delegate property lookups up a chain of linked objects until null is reached. The 'class' keyword is pure syntax sugar over constructor functions and prototype assignment; understanding the desugared form makes you immune to the most common JavaScript interview mistakes.`
  },

  {
    id: 4,
    title: "Event Loop, Microtasks & Macrotasks",
    tag: "THE CONCURRENCY ILLUSION",
    color: "#D97706",
    tldr: `JavaScript is single-threaded but non-blocking: Web APIs handle async work in the background, then callbacks are queued. The Event Loop continuously checks if the Call Stack is empty, then processes ALL microtasks (Promises) before picking one macrotask (setTimeout). Understanding this order is what separates confusing async bugs from clean code.`,
    problem: `Why does setTimeout(..., 0) not run immediately?
  console.log("A");
  setTimeout(() => console.log("B"), 0);
  Promise.resolve().then(() => console.log("C"));
  console.log("D");
  // Output: A, D, C, B — not A, B, C, D

Why does a huge for loop "freeze" my UI?
  for (let i = 0; i < 1_000_000_000; i++) {} // blocks everything

Why does my Promise chain prevent other things from running?
  function loop() { return Promise.resolve().then(loop); }
  loop(); // freezes the tab — infinite microtask starvation

Why does Node.js process.nextTick run before Promise.then?
  process.nextTick(() => console.log("nextTick"));
  Promise.resolve().then(() => console.log("Promise"));
  // nextTick runs first — why?

These questions all have one answer: understanding the event loop algorithm.`,
    analogy: `Imagine a single barista (JavaScript's one thread) at a very busy coffee shop.
The barista can only make ONE drink at a time (single call stack).

When a customer orders an espresso (sync task), the barista makes it immediately.
When a customer orders a complex cold brew (async task — setTimeout, fetch),
the barista hands it to the back kitchen (Web API / libuv) and continues serving.

There are TWO pickup counters:
1. URGENT counter — Microtasks (Promises, queueMicrotask): 
   "Ready immediately, process ALL of these before anything else"
2. REGULAR counter — Macrotasks (setTimeout, I/O, setInterval):
   "Pick ONE item from here, then check the urgent counter again"

EVENT LOOP ALGORITHM:
  1. Barista finishes current drink (call stack empties)
  2. Check URGENT counter — serve ALL items (drain microtask queue completely)
  3. Check URGENT counter again — still empty?
  4. Pick ONE item from REGULAR counter and serve it
  5. Go back to step 2

If a customer keeps adding to the URGENT counter (infinite Promise chain),
the barista never reaches the REGULAR counter → other customers starve.`,
    deep: `THE EVENT LOOP — Formal Algorithm:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Execute all synchronous code (fill + drain call stack)
2. Drain the MICROTASK QUEUE completely:
   a. Run all queueMicrotask() callbacks
   b. Run all Promise .then/.catch/.finally callbacks
   c. Run all MutationObserver callbacks (browser)
   d. After each microtask, check if queue is empty — if not, continue
3. If microtask queue is empty → render if needed (browser only)
4. Pick ONE macrotask from MACROTASK QUEUE (a.k.a. task queue):
   a. setTimeout / setInterval callbacks
   b. I/O callbacks (Node.js fs, http)
   c. MessageChannel, postMessage
5. Return to step 2

KEY INSIGHT: Steps 2–4 repeat in a loop. EACH macrotask is followed by
FULL microtask queue drain before the NEXT macrotask runs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MICROTASK QUEUE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Promise.then / .catch / .finally
- async/await (which is syntax sugar for Promise chains)
- queueMicrotask()
- MutationObserver callbacks
- Node.js: process.nextTick (runs BEFORE other microtasks in Node!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MACROTASK QUEUE (a.k.a. Task Queue):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- setTimeout (minimum delay, not exact — can be longer)
- setInterval
- setImmediate (Node.js — runs after I/O in check phase)
- I/O completion callbacks
- MessageChannel
- requestAnimationFrame (browser — special, tied to screen refresh)
- requestIdleCallback (browser — lowest priority, runs when idle)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE.JS libuv EVENT LOOP PHASES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Node has a more complex loop with distinct phases (libuv):

  ┌─────────────────────────────────┐
  │           timers                │ ← setTimeout, setInterval callbacks
  │─────────────────────────────────│
  │       pending callbacks         │ ← I/O errors from prev iteration
  │─────────────────────────────────│
  │       idle, prepare             │ ← internal use
  │─────────────────────────────────│
  │           poll                  │ ← retrieve new I/O events (blocks here if empty)
  │─────────────────────────────────│
  │           check                 │ ← setImmediate callbacks
  │─────────────────────────────────│
  │       close callbacks           │ ← socket.on('close', ...)
  └─────────────────────────────────┘

BETWEEN EACH PHASE: process.nextTick queue is drained FIRST,
then the Promise microtask queue. This is why process.nextTick beats Promises.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCKING THE EVENT LOOP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Any synchronous computation > ~16ms blocks the event loop:
- UI freezes (no renders, no input handling)
- Node.js HTTP server stops responding to ALL clients
- setTimeout callbacks pile up, fire late

Fixes:
1. Web Workers (browser) — true separate thread for CPU work
2. Worker Threads (Node) — same
3. Break into chunks with setTimeout/setImmediate (yield to loop)
4. Use async iterators for large data sets
5. Move to streaming patterns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MICROTASK STARVATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you schedule a microtask that schedules another microtask infinitely:
  function badLoop() {
    Promise.resolve().then(badLoop);
  }
  badLoop();
  // Microtask queue never empties → macrotasks never run → UI frozen

This is different from an infinite sync loop (which blocks the thread)
but has the same practical effect: nothing else can run.`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: The fundamental ordering — memorize this
// ─────────────────────────────────────────────
console.log("1 — sync");

setTimeout(() => console.log("2 — macrotask"), 0);

Promise.resolve()
  .then(() => console.log("3 — microtask 1"))
  .then(() => console.log("4 — microtask 2"));

queueMicrotask(() => console.log("5 — queueMicrotask"));

console.log("6 — sync");

// Output order:
// 1 — sync          (sync, runs immediately)
// 6 — sync          (sync, runs immediately)
// 3 — microtask 1   (microtask, drains before macrotask)
// 5 — queueMicrotask (microtask)
// 4 — microtask 2   (microtask chained from 3)
// 2 — macrotask     (macrotask, runs last)

// ─────────────────────────────────────────────
// EXAMPLE 2: async/await desugared — it's all Promises
// ─────────────────────────────────────────────
async function fetchOrderStatus(orderId) {
  console.log(\`Fetching order \${orderId}...\`); // sync part of async fn
  const data = await fetch(\`/api/orders/\${orderId}\`); // suspends here
  console.log("Data received"); // runs as microtask after fetch resolves
  return data.json();
}

// Equivalent Promise chain:
function fetchOrderStatusPromise(orderId) {
  console.log(\`Fetching order \${orderId}...\`);
  return fetch(\`/api/orders/\${orderId}\`)
    .then(data => {
      console.log("Data received"); // microtask
      return data.json();
    });
}

// ─────────────────────────────────────────────
// EXAMPLE 3: Multiple Promise.then chains — microtask scheduling
// ─────────────────────────────────────────────
const p = Promise.resolve("Payment");

p.then(v => {
  console.log("Handler 1:", v);      // runs first
  return "₹500 confirmed";
}).then(v => {
  console.log("Handler 2:", v);      // runs after handler 1's microtask
});

p.then(v => {
  console.log("Handler 3:", v);      // runs after handler 1 (same promise, different chain)
});

// Output:
// Handler 1: Payment
// Handler 3: Payment    ← both .then on 'p' are scheduled together
// Handler 2: ₹500 confirmed ← chained microtask runs after

// ─────────────────────────────────────────────
// EXAMPLE 4: Blocking the event loop — and the fix
// ─────────────────────────────────────────────
// BAD: Synchronous heavy computation blocks everything
function processMillion() {
  const results = [];
  for (let i = 0; i < 1_000_000; i++) {
    results.push(Math.sqrt(i) * Math.PI);
  }
  return results;
}
// During this, no user input, no renders, no setTimeout callbacks fire

// GOOD: Chunk it with setTimeout to yield to the event loop
function processMillionAsync(onComplete) {
  const results = [];
  const CHUNK = 10000;
  let i = 0;

  function processChunk() {
    const end = Math.min(i + CHUNK, 1_000_000);
    for (; i < end; i++) {
      results.push(Math.sqrt(i) * Math.PI);
    }
    if (i < 1_000_000) {
      setTimeout(processChunk, 0); // yield to event loop, then continue
    } else {
      onComplete(results);
    }
  }
  processChunk();
}

// BEST (modern): Use Web Worker for true parallelism
// const worker = new Worker("heavy-computation.js");

// ─────────────────────────────────────────────
// EXAMPLE 5: Node.js — process.nextTick vs Promise.then order
// ─────────────────────────────────────────────
// In Node.js:
setImmediate(() => console.log("setImmediate (check phase)"));
setTimeout(() => console.log("setTimeout (timers phase)"), 0);
Promise.resolve().then(() => console.log("Promise.then (microtask)"));
process.nextTick(() => console.log("nextTick (runs before microtasks)"));

// Output in Node.js:
// nextTick              ← process.nextTick drains BEFORE Promise microtasks
// Promise.then          ← microtask queue
// setTimeout            ← timers phase (macrotask) — order vs setImmediate varies
// setImmediate          ← check phase (macrotask)

// ─────────────────────────────────────────────
// EXAMPLE 6: requestAnimationFrame — tied to screen refresh
// ─────────────────────────────────────────────
// Browser renders at ~60fps = 16.67ms per frame
// rAF fires BEFORE the next paint — perfect for smooth animations

let start = null;
const box = document.getElementById("animBox");

function animate(timestamp) {
  if (!start) start = timestamp;
  const progress = timestamp - start;
  const x = Math.min(progress / 5, 200); // move right up to 200px
  box.style.transform = \`translateX(\${x}px)\`;
  if (x < 200) {
    requestAnimationFrame(animate); // schedule next frame
  }
}
requestAnimationFrame(animate); // starts animation loop

// ─────────────────────────────────────────────
// EXAMPLE 7: Promise.all, race, allSettled — concurrent microtasks
// ─────────────────────────────────────────────
const fetchPrice = (product) =>
  new Promise(resolve => setTimeout(() => resolve({ product, price: Math.random() * 1000 }), 100));

async function getPrices() {
  // All 3 fetches START simultaneously (don't await one by one)
  const [laptop, phone, tablet] = await Promise.all([
    fetchPrice("Laptop"),   // 100ms
    fetchPrice("Phone"),    // 100ms — runs in parallel with Laptop
    fetchPrice("Tablet")    // 100ms — runs in parallel
    // Total: ~100ms, not 300ms
  ]);
  console.log(laptop, phone, tablet);
}

// Promise.allSettled — doesn't reject even if one fails (useful for dashboards)
async function getDashboard() {
  const results = await Promise.allSettled([
    fetchPrice("Laptop"),
    Promise.reject("API timeout"), // one failure
    fetchPrice("Phone")
  ]);
  results.forEach(r => {
    if (r.status === "fulfilled") console.log("Got:", r.value);
    else console.log("Failed:", r.reason);
  });
}`,
    bugs: `BUG 1: Assuming setTimeout(fn, 0) runs immediately next
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Dev expects "Loading..." appears before heavy computation
function showData() {
  updateUI("Loading...");      // sync DOM update
  setTimeout(loadHeavyData, 0); // expects this runs next
  for (let i = 0; i < 10_000_000; i++) {} // this BLOCKS first
  updateUI("Processing done");
}
// "Loading..." doesn't paint until the sync loop FINISHES
// Browser can't render mid-synchronous execution

// FIX: Let the render happen before heavy computation
async function showDataFixed() {
  updateUI("Loading...");
  await new Promise(r => setTimeout(r, 0)); // yield to event loop → browser renders
  await loadHeavyDataAsync(); // now run heavy work
  updateUI("Processing done");
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: Sequential awaits when parallel is possible
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: 3 seconds total (1 + 1 + 1) — sequential
async function loadDashboard() {
  const user    = await fetchUser();    // 1 second
  const orders  = await fetchOrders(); // 1 second — waits for user!
  const balance = await fetchBalance();// 1 second — waits for orders!
  render(user, orders, balance);
}

// FIX: 1 second total — all run in parallel
async function loadDashboardFast() {
  const [user, orders, balance] = await Promise.all([
    fetchUser(),    // starts simultaneously
    fetchOrders(),  // starts simultaneously
    fetchBalance()  // starts simultaneously
  ]); // resolves when ALL three finish (~1 second total)
  render(user, orders, balance);
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: Unhandled Promise rejection silently swallows errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
async function processPayment(amount) {
  const result = await chargeCard(amount); // what if this throws?
  // No try-catch → unhandled rejection → logged as warning, execution stops
  updateOrderStatus("paid"); // never runs if chargeCard fails
}

// FIX: Always handle rejections
async function processPaymentSafe(amount) {
  try {
    const result = await chargeCard(amount);
    updateOrderStatus("paid");
  } catch (error) {
    console.error("Payment failed:", error);
    updateOrderStatus("failed");
    notifyUser("Payment could not be processed. Please retry.");
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: Microtask starvation — infinite Promise loop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: This freezes everything
function processQueue(queue) {
  if (queue.length === 0) return;
  return Promise.resolve(queue.shift())
    .then(item => process(item))
    .then(() => processQueue(queue)); // recursive microtask — never yields!
}

// If queue is large or infinite, macrotasks (user events, renders) NEVER run

// FIX: Use setImmediate (Node) or setTimeout to yield between batches
async function processQueueSafe(queue) {
  for (const item of queue) {
    await process(item);
    await new Promise(r => setImmediate(r)); // yield to event loop after each item
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: Race condition — shared state mutated by concurrent async operations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Two concurrent withdrawals can both see balance=1000
let balance = 1000;

async function withdraw(amount) {
  if (balance >= amount) {          // both goroutines pass this check with balance=1000
    await processBank(amount);      // async gap — balance not yet updated
    balance -= amount;              // both deduct → balance goes negative!
  }
}
// Called concurrently: withdraw(700) && withdraw(600)  → balance = -300

// FIX: Use optimistic locking or a queue
async function withdrawSafe(amount) {
  const currentBalance = balance;
  if (currentBalance < amount) throw new Error("Insufficient funds");
  await processBank(amount);
  if (balance !== currentBalance) throw new Error("Concurrent modification, retry");
  balance -= amount;
}`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function first() {
  console.log("A");
  await Promise.resolve();
  console.log("B");
}

async function second() {
  console.log("C");
  await Promise.resolve();
  console.log("D");
}

console.log("E");
first();
second();
console.log("F");

// Answer: E, A, C, F, B, D
// Explanation:
//   E → sync
//   first() called: logs A, hits await → suspends (schedules microtask for B)
//   second() called: logs C, hits await → suspends (schedules microtask for D)
//   F → sync (call stack clears)
//   Microtask queue drains: B then D

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This search component re-fetches on every keystroke including slow requests.
// Old results can arrive AFTER new results, showing stale data.
async function handleSearch(query) {
  const results = await searchAPI(query);
  displayResults(results); // may show results from OLD query if old response arrives late!
}
input.addEventListener("input", (e) => handleSearch(e.target.value));

// Fix using AbortController to cancel previous in-flight request:
// Implement the fixed version that:
// 1. Cancels the previous fetch when a new keystroke arrives
// 2. Ignores results from cancelled requests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a simple task scheduler with priority queues:
  const scheduler = createScheduler();
  scheduler.addMicrotask(() => console.log("micro 1"));
  scheduler.addMacrotask(() => console.log("macro 1"));
  scheduler.addMicrotask(() => console.log("micro 2"));
  scheduler.run();
  // Should output: micro 1, micro 2, macro 1 (microtasks drain first)

Requirements:
- Separate micro and macro queues (use arrays)
- run() drains ALL microtasks before each macrotask
- Support adding new microtasks from within a microtask callback (they run in current drain)`,
    summary: `The Event Loop creates JavaScript's concurrency model: one thread, non-blocking I/O via Web APIs, and strict ordering where all microtasks (Promises) drain completely before any macrotask (setTimeout) runs. Master this algorithm and async bugs become predictable and fixable.`
  },

  {
    id: 5,
    title: "var vs let vs const",
    tag: "SCOPE, HOISTING & THE TDZ",
    color: "#DC2626",
    tldr: `var is function-scoped and hoisted to undefined. let and const are block-scoped and hoisted into the Temporal Dead Zone (TDZ), where accessing them throws a ReferenceError. const prevents reassignment but not mutation of objects. These differences explain 90% of the classic JS interview loop and hoisting bugs.`,
    problem: `Why does var leak out of if-blocks?
  if (true) { var leaked = "I'm out!"; }
  console.log(leaked); // "I'm out!" — should this work?

Why does this for-loop capture the wrong value?
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
  }
  // Prints 3, 3, 3 — not 0, 1, 2

Why can you use a function before declaring it but not let/const?
  greet(); // works
  function greet() {}

  hello(); // ReferenceError
  let hello = () => {};

Why doesn't const prevent this mutation?
  const user = { name: "Priya" };
  user.name = "Rahul"; // No error! Why?
  user = {};           // TypeError — what's the difference?

These are the most tested JS questions in interviews at Flipkart, Amazon, Swiggy.
Understanding exactly when TDZ starts and ends, and what 'scope' means,
is the difference between guessing and knowing.`,
    analogy: `Think of scope as a BUILDING:
  - var gets a FLOOR PASS: it can roam the entire floor (function) it was created on,
    ignoring room (block) boundaries. Even if you write it inside a closet (if-block),
    it's already registered at the floor reception (hoisted).

  - let and const get a ROOM KEY: they only exist in the specific room (block {}) they were written in.
    They're registered at the room entrance but kept LOCKED in a glass case (TDZ)
    until you actually reach their declaration line. Trying to read the locked case throws an error.

  - const is like a key card assigned to a SPECIFIC LOCKER (reference is fixed).
    You can't point the card to a different locker (no reassignment).
    But you CAN change what's INSIDE the locker (object mutation is allowed).

  - Object.freeze() is like putting a PADLOCK on the locker contents too — nothing inside changes.
    But it's SHALLOW: if there's a box inside the locker, the box's contents can still change
    (nested objects are not frozen unless you deepFreeze recursively).`,
    deep: `SCOPE COMPARISON TABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Feature              │ var           │ let           │ const
  ─────────────────────┼───────────────┼───────────────┼──────────────
  Scope                │ function      │ block         │ block
  Hoisting             │ yes→undefined │ yes→TDZ       │ yes→TDZ
  Re-declaration       │ allowed       │ SyntaxError   │ SyntaxError
  Reassignment         │ allowed       │ allowed       │ TypeError
  Initialization req   │ no            │ no            │ YES (required)
  Loop binding         │ shared        │ new per iter  │ N/A (can't reassign)
  Global object prop   │ yes (window)  │ no            │ no

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOISTING — THE FULL PICTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All three declarations are hoisted (the engine scans for them in Creation Phase).
The DIFFERENCE is what the engine does with them:

  var x = 5;
  // Creation Phase: register x, set x = undefined
  // Execution Phase: set x = 5

  let y = 5;
  // Creation Phase: register y in TDZ (uninitialized)
  // Execution Phase: once line is reached → set y = 5, TDZ ends

  const z = 5;
  // Same as let, but also: engine marks z as non-reassignable
  // const MUST be initialized at declaration — const z; is a SyntaxError

FUNCTION HOISTING:
  function greet() {}    // fully hoisted (name + body) — callable before declaration
  var fn = function() {} // var hoisted as undefined — calling before declaration: TypeError
  const fn2 = () => {}   // TDZ — calling before declaration: ReferenceError
  let fn3 = function() {}// TDZ — calling before declaration: ReferenceError

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TDZ — TEMPORAL DEAD ZONE (precise definition):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  The TDZ for a variable starts at the BEGINNING OF ITS CONTAINING SCOPE
  (not at the start of the file — at the start of the nearest enclosing block)
  and ends at the LINE where the let/const declaration appears.

  {                     // TDZ for 'price' BEGINS here
    console.log(price); // ReferenceError: Cannot access 'price' before initialization
    let price = 299;    // TDZ ENDS here
    console.log(price); // 299 ✓
  }

  The variable EXISTS in the environment from the block start (hoisted),
  but any access before the declaration line throws ReferenceError.
  This error message is what distinguishes TDZ from "not declared":
    TDZ error:      "Cannot access 'x' before initialization"
    Not declared:   "x is not defined"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONST + OBJECTS — The Crucial Distinction:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const binds the VARIABLE (the memory address the variable holds) — not the value.

  const user = { name: "Priya", balance: 5000 };
  user.name = "Rahul";    // OK — mutating the object the address points to
  user.balance += 1000;   // OK — mutation
  user = { name: "New" }; // TypeError: Assignment to constant variable
                          // Trying to change the address stored in 'user'

  const arr = [1, 2, 3];
  arr.push(4);  // OK — mutating the array
  arr = [];     // TypeError — trying to reassign

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Object.freeze() — SHALLOW IMMUTABILITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Object.freeze(obj) makes the top-level properties non-writable and non-configurable.
BUT nested objects are NOT frozen — it's shallow.

  const config = Object.freeze({
    apiUrl: "https://api.example.com",
    db: { host: "localhost", port: 5432 }
  });
  config.apiUrl = "changed"; // silently fails (or throws in strict mode)
  config.db.port = 9999;     // WORKS! db is not frozen, only config's properties are

Deep freeze requires recursive application:
  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(name => {
      const value = obj[name];
      if (value && typeof value === "object") deepFreeze(value);
    });
    return Object.freeze(obj);
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOOP VARIABLE CAPTURE — THE INTERVIEW CLASSIC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
With var: ONE variable shared across all iterations (function-scoped)
With let: NEW binding created per iteration (engine creates new block scope each time)

Why does let create a new binding per iteration?
The spec says: for-loop with let creates a new scope per iteration and
COPIES the current value of the loop variable into the new scope.
This is a special rule for for-loops specifically — not just "let is block-scoped".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RE-DECLARATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var x = 1; var x = 2; // OK — x is 2 (silent overwrite)
  let y = 1; let y = 2; // SyntaxError: Identifier 'y' has already been declared
                        // (detected at PARSE time, before execution)
  const z = 1; const z = 2; // SyntaxError (same)

  // Mixing var and let with same name in same scope:
  var a = 1; let a = 2; // SyntaxError ← important edge case`,
    code: `// ─────────────────────────────────────────────
// EXAMPLE 1: Scope — var leaks, let/const stays put
// ─────────────────────────────────────────────
function checkDiscount(isMember) {
  if (isMember) {
    var discount = 0.2;      // function-scoped — available outside the if block
    let memberBonus = 0.05;  // block-scoped — stays inside this if block
    const maxDiscount = 0.3; // block-scoped — same
  }
  console.log(discount);     // 0.2 or undefined (if isMember=false) — leaks out!
  // console.log(memberBonus); // ReferenceError: memberBonus is not defined ✓
  // console.log(maxDiscount); // ReferenceError: maxDiscount is not defined ✓
}
checkDiscount(true);

// ─────────────────────────────────────────────
// EXAMPLE 2: Hoisting phases — all three
// ─────────────────────────────────────────────
console.log(typeof varHoisted);    // "undefined" — hoisted, initialized to undefined
// console.log(typeof letHoisted); // ReferenceError — in TDZ
// console.log(typeof constHoisted); // ReferenceError — in TDZ
console.log(typeof undeclaredVar); // "undefined" — typeof is safe even for undeclared!

var varHoisted = "var value";
let letHoisted = "let value";
const constHoisted = "const value";

// Function declarations — fully hoisted
greet(); // "Namaste!" — works before declaration
function greet() { console.log("Namaste!"); }

// Function expression with var — var hoisted as undefined
// sayBye(); // TypeError: sayBye is not a function
var sayBye = function() { console.log("Bye!"); };

// ─────────────────────────────────────────────
// EXAMPLE 3: TDZ — exact boundaries
// ─────────────────────────────────────────────
let x = "outer";

{
  // TDZ for inner 'x' STARTS here (block begins)
  // Even though outer x="outer" exists, inner let x is in TDZ and shadows it
  // console.log(x); // ReferenceError — inner x shadows outer x but is in TDZ

  let x = "inner"; // TDZ ENDS here
  console.log(x);  // "inner"
}
console.log(x); // "outer" — back to outer scope

// ─────────────────────────────────────────────
// EXAMPLE 4: const with objects and arrays
// ─────────────────────────────────────────────
const order = {
  id: "ORD001",
  customer: "Anjali",
  items: ["Saree", "Kurta"],
  total: 4500
};

// All of these are ALLOWED — mutating the object
order.total = 5000;
order.status = "shipped"; // adding new property
order.items.push("Dupatta");
delete order.id;

console.log(order); // { customer: "Anjali", items: [...], total: 5000, status: "shipped" }

// This is NOT allowed — reassigning the variable
// order = { id: "ORD002" }; // TypeError: Assignment to constant variable

// ─────────────────────────────────────────────
// EXAMPLE 5: Object.freeze (shallow) vs deepFreeze
// ─────────────────────────────────────────────
const appConfig = Object.freeze({
  env: "production",
  api: {
    baseUrl: "https://api.myapp.com",
    timeout: 5000
  }
});

appConfig.env = "development";        // silent fail (strict: TypeError)
console.log(appConfig.env);           // "production" — unchanged ✓
appConfig.api.timeout = 99999;        // WORKS! nested object not frozen
console.log(appConfig.api.timeout);   // 99999 — changed! shallow freeze gotcha

// Deep freeze solution:
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  Object.getOwnPropertyNames(obj).forEach(name => {
    deepFreeze(obj[name]); // recursively freeze nested objects
  });
  return Object.freeze(obj);
}

const secureConfig = deepFreeze({
  db: { host: "localhost", port: 5432, credentials: { user: "admin" } }
});
secureConfig.db.port = 9999;             // fails silently (or throws in strict mode)
secureConfig.db.credentials.user = "hacker"; // also fails — deeply frozen ✓

// ─────────────────────────────────────────────
// EXAMPLE 6: Loop variable capture — the full comparison
// ─────────────────────────────────────────────
// var — all share the same i (classic bug)
const varFunctions = [];
for (var i = 0; i < 3; i++) {
  varFunctions.push(() => i);
}
console.log(varFunctions.map(f => f())); // [3, 3, 3] — all see final i

// let — new binding per iteration (engine's special for-loop rule)
const letFunctions = [];
for (let j = 0; j < 3; j++) {
  letFunctions.push(() => j);
}
console.log(letFunctions.map(f => f())); // [0, 1, 2] ✓

// IIFE workaround for var (pre-ES6 pattern)
const iifeFunctions = [];
for (var k = 0; k < 3; k++) {
  iifeFunctions.push((function(captured) {
    return () => captured;
  })(k)); // k passed as argument — creates new binding per iteration
}
console.log(iifeFunctions.map(f => f())); // [0, 1, 2] ✓

// ─────────────────────────────────────────────
// EXAMPLE 7: Re-declaration behavior
// ─────────────────────────────────────────────
var productName = "Laptop";
var productName = "Phone"; // OK — var silently overwrites
console.log(productName);  // "Phone"

// let productName = "Tablet"; // SyntaxError — can't mix var and let for same name

// In different blocks — fine! Different scopes
{
  let price = 1000;
  console.log(price); // 1000
}
{
  let price = 2000; // Different block scope — totally fine
  console.log(price); // 2000
}`,
    bugs: `BUG 1: var leaking out of for loop — classic production bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY:
function processOrders(orders) {
  for (var i = 0; i < orders.length; i++) {
    var currentOrder = orders[i]; // var — function scoped!
    processOrder(currentOrder);
  }
  console.log(currentOrder); // Last order object — var leaked out of loop!
  // Subtle: you might accidentally USE this stale value elsewhere
}

// FIX: Use let — block-scoped, doesn't exist outside for loop
function processOrdersFixed(orders) {
  for (let i = 0; i < orders.length; i++) {
    let currentOrder = orders[i]; // let — block scoped
    processOrder(currentOrder);
  }
  // console.log(currentOrder); // ReferenceError — correctly not accessible ✓
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 2: const giving false confidence about immutability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Developer thinks const makes user immutable
const user = { name: "Priya", role: "viewer" };

function grantAdmin(u) {
  u.role = "admin"; // mutates the object — const doesn't prevent this!
}

grantAdmin(user);
console.log(user.role); // "admin" — const did NOT protect this!

// FIX: Use Object.freeze() for true immutability
const frozenUser = Object.freeze({ name: "Priya", role: "viewer" });
grantAdmin(frozenUser); // silently fails (strict: throws TypeError)
console.log(frozenUser.role); // "viewer" ✓

// OR: Return new object (immutable update pattern)
function grantAdminImmutable(u) {
  return { ...u, role: "admin" }; // new object, original untouched
}
const adminUser = grantAdminImmutable(user);

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 3: TDZ in class field initializers — tricky edge case
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Accessing this.x in field initializer before it's set
class Config {
  multiplier = 2;
  basePrice = 100;
  finalPrice = this.basePrice * this.multiplier; // OK — above fields set first

  // But this breaks:
  // doubled = this.value * 2;  // undefined * 2 = NaN
  // value = 10;                // 'value' not yet defined when doubled runs
}
// Class field initializers run top to bottom
// Referencing a field before it's defined gives undefined (not TDZ error,
// because class fields are more like assignments than let/const)

// FIX: Define fields before using them, or use constructor:
class ConfigFixed {
  constructor() {
    this.basePrice = 100;
    this.multiplier = 2;
    this.finalPrice = this.basePrice * this.multiplier; // 200 ✓
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 4: var re-declaration silently hiding bugs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUGGY: Large file, var re-declared far from original
var apiEndpoint = "https://api.v1.example.com";
// ... 200 lines of code ...
var apiEndpoint = "https://api.v2.example.com"; // silently overwrites
// All code ABOVE this line still ran with v1, but now it's v2
// No error, no warning — just wrong behavior in production

// FIX: Use let/const — re-declaration is a SyntaxError, caught before runtime
const apiEndpointFixed = "https://api.v1.example.com";
// const apiEndpointFixed = "https://api.v2.example.com"; // SyntaxError — caught! ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUG 5: typeof TDZ variable — the one case typeof is NOT safe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Safe: typeof on undeclared variable
console.log(typeof undeclaredVar); // "undefined" — no error

// BUGGY: typeof on TDZ variable — NOT safe!
console.log(typeof myVar); // ReferenceError: Cannot access 'myVar' before initialization
let myVar = 5;
// typeof does NOT protect you from TDZ — only from completely undeclared vars

// Practical impact: feature detection code using typeof for let/const can fail
// FIX: Always declare before typeof check, or use try-catch if truly uncertain`,
    challenge: `CHALLENGE 1 — Predict the Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let x = "global";

function test() {
  console.log(x);  // (A)
  let x = "local"; // (B)
  console.log(x);  // (C)
}

test();

// Answer: A = ReferenceError (TDZ!), B + C never reached
// Explanation: Inside test(), let x is hoisted to TDZ from function start.
// x at line A shadows the global x but is in TDZ — ReferenceError thrown.
// Many devs expect "global" because they think TDZ only starts at line B.
// TDZ starts at the BLOCK START — before console.log(x).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 2 — Fix the Bug:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This button click handler has a scoping bug.
// Fix it so each button alerts its own correct index.
function setupButtons() {
  const buttons = document.querySelectorAll(".action-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function() {
      alert(\`You clicked button \${i}\`); // Always shows buttons.length
    });
  }
}
// Provide 3 different fixes:
// Fix 1: Change var to let
// Fix 2: IIFE wrapping
// Fix 3: Use buttons[i].dataset or bind the index differently

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHALLENGE 3 — Build From Scratch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implement a createImmutableConfig(obj) function that:
1. Deep freezes the object (all nested levels)
2. Returns the frozen object
3. Includes a isDeeplyFrozen(obj) checker that returns true
   only if the object AND all its nested objects are frozen
4. Test it with:
   const config = createImmutableConfig({
     db: { host: "localhost", port: 5432 },
     api: { key: "secret123", retries: 3 }
   });
   console.log(isDeeplyFrozen(config));       // true
   console.log(isDeeplyFrozen(config.db));    // true
   config.db.port = 9999;                     // silently fails
   console.log(config.db.port);              // still 5432`,
    summary: `var is function-scoped and forgives everything (silent hoisting, silent re-declaration, loop leakage). let and const are block-scoped, TDZ-protected, and strict about re-declaration. Use const by default, let when reassignment is needed, and relegate var to legacy code only — this single habit prevents the majority of hoisting and scoping bugs in production JavaScript.`
  }
];
