const concepts = [
  {
    id: 1,
    title: "Big-O & Complexity Analysis",
    tag: "HOW FAST IS YOUR CODE, REALLY?",
    color: "#6D28D9",
    tldr: `Big-O notation describes how an algorithm's runtime or memory usage grows as the input size grows — not the exact time, but the growth rate. It lets you compare algorithms independent of hardware or language. Mastering it means you can look at any loop, recursion, or data structure and instantly know whether your code will handle 10 million records or melt under 10,000.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"My code works fine on my laptop — why is it timing out in production?"
  → Works on 1,000 rows (dev data). Production has 2,000,000 rows.
    O(n²) algorithm: 1k² = 1M ops (fast). 2M² = 4 TRILLION ops (💀).

"I optimized by removing one loop — why is it still slow?"
  → You removed an O(n) from an O(n²) algorithm: O(n² + n) → O(n²). No change.
    Big-O drops non-dominant terms. Only the fastest-growing term matters.

"My function is O(n log n) but my colleague's is O(n) — his is always faster, right?"
  → Not for small n. Constants matter in practice: 5n log n vs 1000n.
    At n=100, 5×100×7 = 3500 vs 1000×100 = 100000. O(n log n) wins!
    Big-O is about large-n asymptotic behavior, not small-n real-world performance.

"Why is ArrayList.add() O(1) if it sometimes copies the whole array?"
  → AMORTIZED analysis: average cost over a sequence of operations.
    Copying is rare, and each copy doubles capacity → each element causes O(1) copies on average.
    Total cost of n inserts = O(n), so amortized per-insert = O(1).

Hidden O(n²) patterns that kill production:
  - String concatenation in a loop: "str" + char each iteration copies the whole string
  - .includes() inside a for loop: O(n) search × O(n) outer = O(n²)
  - Nested API calls: for each user, fetch their orders → n users × n orders = O(n²) DB queries
  - Sorting inside a loop
  - Array.indexOf() inside a loop
    `,
    analogy: `
THE RESTAURANT ANALOGY:
------------------------
You're opening a restaurant. As you hire more staff (n increases), how does work grow?

O(1) — CONSTANT: Looking up today's special on a menu board.
  Doesn't matter if you have 1 customer or 1 million — same lookup time.
  Examples: hash map lookup, array index access, push/pop from stack.

O(log n) — LOGARITHMIC: Finding a name in a phonebook (binary search).
  Phonebook doubles in size → you need just ONE more step (open to middle again).
  At 1 billion names: only 30 steps! 
  Examples: binary search, balanced BST lookup, finding floor/ceil.

O(n) — LINEAR: Reading every review before deciding a restaurant's rating.
  10 reviews → 10 reads. 1 million reviews → 1 million reads. Grows with input.
  Examples: linear search, single loop, summing an array.

O(n log n) — LINEARITHMIC: Sorting all receipts by date using merge sort.
  The sweet spot for comparison-based sorting. Unavoidable lower bound.
  Examples: merge sort, heap sort, most efficient sorting algorithms.

O(n²) — QUADRATIC: Every waiter personally greets every customer.
  10 customers × 10 waiters = 100 greetings. 1000 × 1000 = 1,000,000 greetings.
  Examples: bubble sort, selection sort, nested loops, comparing all pairs.

O(2ⁿ) — EXPONENTIAL: Generating every possible combination of menu items.
  Each new item doubles the total combinations. At 30 items: 1 BILLION combinations.
  Examples: recursive fibonacci (naive), power sets, brute-force traveling salesman.

AMORTIZED COST — THE DINNER PARTY ANALOGY:
  You host dinner parties. Most nights: clean 5 dishes (fast).
  Every 100th night: clean ALL 500 accumulated dishes (slow).
  Average per night: (99×5 + 500) / 100 = ~10 dishes. O(1) amortized.
  That's exactly how dynamic arrays work: rare O(n) resize → O(1) amortized insert.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — COMPLEXITY ANALYSIS:
-------------------------------------------------

THE FORMAL DEFINITION:
  f(n) is O(g(n)) if there exist constants c > 0 and n₀ > 0 such that:
  f(n) ≤ c × g(n) for all n ≥ n₀
  
  Translation: beyond some input size n₀, g(n) scaled by constant c always upper-bounds f(n).
  This is why we drop constants: O(3n) = O(n) because c=3 is absorbed into the definition.

THREE TYPES OF ANALYSIS:
  Worst case (O):  Maximum operations for any input of size n.
                   Most commonly used. QuickSort worst case = O(n²) on sorted input.
  Best case (Ω):   Minimum operations. Already-sorted array + insertion sort = Ω(n).
  Average case (Θ): Expected over random inputs. QuickSort average = Θ(n log n).

RULES FOR CALCULATING BIG-O:
  1. DROP CONSTANTS:  O(2n) → O(n), O(100) → O(1), O(3n² + 7n) → O(n²)
  2. DROP NON-DOMINANTS: O(n² + n) → O(n²), O(n³ + n²) → O(n³)
  3. SEQUENTIAL STEPS ADD:
       doA(); // O(a)
       doB(); // O(b)
       Total: O(a + b) → if same input: O(2n) → O(n)
  4. NESTED LOOPS MULTIPLY:
       for i in n:       // O(n)
         for j in n:     // × O(n)
       Total: O(n²)
  5. DIFFERENT INPUTS = DIFFERENT VARIABLES:
       function f(arrA, arrB):      // NOT O(n²) — O(a × b) where a=len(A), b=len(B)
         for a in arrA:
           for b in arrB:

RECURSION COMPLEXITY — THE MASTER THEOREM:
  For T(n) = aT(n/b) + O(nᵈ):
    a = number of recursive calls
    b = how much we divide the problem
    d = exponent of work done outside recursion
  
  Cases:
    If a < bᵈ: O(nᵈ) — work outside dominates
    If a = bᵈ: O(nᵈ log n) — equal — merge sort fits here: a=2, b=2, d=1 → O(n log n)
    If a > bᵈ: O(n^(log_b a)) — recursion dominates
  
  Binary search: T(n) = T(n/2) + O(1) → a=1, b=2, d=0 → a=bᵈ=1 → O(log n) ✓
  Merge sort:    T(n) = 2T(n/2) + O(n) → a=2, b=2, d=1 → a=bᵈ=2 → O(n log n) ✓
  Naive fib:     T(n) = 2T(n-1) + O(1) → NOT master theorem (subtract, not divide) → O(2ⁿ)

AMORTIZED ANALYSIS — DYNAMIC ARRAY DEEP DIVE:
  Dynamic array (JavaScript Array, Python list, Java ArrayList):
  - Starts with capacity c (e.g., 4 slots)
  - When full: allocate 2c slots, copy all elements, insert new
  
  Cost analysis for n insertions:
    Insert 1: O(1)
    Insert 2: O(1)
    Insert 3: O(1)
    Insert 4: O(1)
    Insert 5: Copy 4 elements + insert = O(4) + O(1)
    Insert 6: O(1)
    Insert 7: O(1)
    Insert 8: O(1)
    Insert 9: Copy 8 elements + insert = O(8) + O(1)
    ...
    Copies happen at: 1, 2, 4, 8, 16, ... n
    Total copy work: 1 + 2 + 4 + ... + n = 2n (geometric series) = O(n)
    n insertions, O(n) total copy work → O(1) amortized per insertion ✓

SPACE COMPLEXITY:
  O(1): constant extra space (two pointers, a few variables)
  O(n): proportional to input (copying array, storing results)
  O(log n): recursion depth for divide-and-conquer (binary search call stack)
  O(n): recursion depth for linear recursion (DFS on list, naive fib)
  
  Stack overflow: O(n) recursion on n=100,000 → 100,000 stack frames → crash.
  Solution: convert to iterative (O(1) stack space) or use tail recursion (if language supports).

HIDDEN O(n²) PATTERNS IN JAVASCRIPT:
  1. String concatenation in loop:
       let s = '';
       for i in n: s += chars[i]; // Each += creates NEW string of growing length!
       Total: 1 + 2 + 3 + ... + n = O(n²)
       Fix: arr.push(chars[i]); return arr.join(''); // O(n)
  
  2. Array.includes() / indexOf() in loop:
       for i in n: if arr.includes(target) // O(n) × O(n) = O(n²)
       Fix: const set = new Set(arr); for i in n: if set.has(target) // O(n) × O(1) = O(n)
  
  3. Array.splice() / unshift() in loop:
       for i in n: arr.unshift(val); // unshift shifts ALL elements: O(n) × O(n) = O(n²)
       Fix: push to end, reverse once: O(n) + O(n) = O(n)
  
  4. Sorting inside loop:
       for i in n: arr.sort(); // O(n log n) × O(n) = O(n² log n)
       Fix: sort once outside the loop.
    `,
    code: `
// ===== BIG-O & COMPLEXITY ANALYSIS — CODE EXAMPLES =====

// EXAMPLE 1: Identifying complexity by loop structure
// O(1) — constant
function getFirst(arr) {
  return arr[0]; // One operation regardless of array size
}

// O(n) — single loop
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) { // Runs n times
    sum += arr[i];
  }
  return sum;
}

// O(n²) — nested loops on same input
function findDuplicates_SLOW(arr) {
  const dupes = [];
  for (let i = 0; i < arr.length; i++) {       // O(n)
    for (let j = i + 1; j < arr.length; j++) { // O(n)
      if (arr[i] === arr[j]) dupes.push(arr[i]); // O(n²) total
    }
  }
  return dupes;
}

// O(n) — same problem, hash set approach
function findDuplicates_FAST(arr) {
  const seen = new Set();  // O(1) lookups
  const dupes = new Set();
  for (const val of arr) {      // O(n) single loop
    if (seen.has(val)) dupes.add(val); // O(1) per iteration
    else seen.add(val);
  }
  return [...dupes];
}

// EXAMPLE 2: The hidden O(n²) string concatenation bug
// Scenario: Building a transaction summary report for Razorpay dashboard

// BAD: O(n²) — each += copies the entire string
function buildReport_SLOW(transactions) {
  let report = '';
  for (const txn of transactions) {
    // Each iteration: creates NEW string of length (prev_length + new_chunk)
    // Total work: 0 + 1 + 2 + ... + n ≈ n²/2 = O(n²)
    report += \`Txn \${txn.id}: ₹\${txn.amount} — \${txn.status}\\n\`;
  }
  return report;
}

// GOOD: O(n) — collect then join
function buildReport_FAST(transactions) {
  const parts = [];
  for (const txn of transactions) {
    parts.push(\`Txn \${txn.id}: ₹\${txn.amount} — \${txn.status}\`); // O(1) push
  }
  return parts.join('\\n'); // O(n) single pass to join
}

// Test data:
const transactions = Array.from({ length: 100000 }, (_, i) => ({
  id: \`TXN\${i}\`, amount: Math.floor(Math.random() * 10000), status: 'completed'
}));

console.time('slow'); buildReport_SLOW(transactions); console.timeEnd('slow');
// slow: ~800ms

console.time('fast'); buildReport_FAST(transactions); console.timeEnd('fast');
// fast: ~12ms   — 65× faster!

// EXAMPLE 3: Different inputs = different variables (common mistake)
// NOT O(n²) — it's O(a × b)
function commonElements(usersA, usersB) {
  // usersA and usersB are different sizes!
  // n is meaningless here — use a and b
  const result = [];
  for (const u of usersA) {          // O(a)
    for (const v of usersB) {        // O(b)
      if (u.id === v.id) result.push(u);
    }
  }
  return result; // O(a × b) — could be O(1) if b=1, or O(n²) if a=b=n
}

// OPTIMIZED: O(a + b) using Set
function commonElements_FAST(usersA, usersB) {
  const setB = new Set(usersB.map(u => u.id)); // O(b) to build
  return usersA.filter(u => setB.has(u.id));   // O(a) to filter
  // Total: O(a + b)
}

// EXAMPLE 4: Amortized analysis — dynamic array simulation
class DynamicArray {
  constructor() {
    this.data = new Array(1); // Internal fixed array
    this.size = 0;
    this.capacity = 1;
    this.totalCopyOps = 0; // Track for amortized demonstration
  }
  
  push(val) {
    if (this.size === this.capacity) {
      // Double the capacity — O(n) resize, but happens rarely
      const newData = new Array(this.capacity * 2);
      for (let i = 0; i < this.size; i++) {
        newData[i] = this.data[i];
        this.totalCopyOps++; // Count the copy work
      }
      this.data = newData;
      this.capacity *= 2;
      console.log(\`Resized to \${this.capacity}. Total copies so far: \${this.totalCopyOps}\`);
    }
    this.data[this.size++] = val;
  }
  
  get(i) { return this.data[i]; }
}

const da = new DynamicArray();
for (let i = 0; i < 16; i++) da.push(i);
// Resized at: 1, 2, 4, 8 → copies: 1+2+4+8 = 15 for 16 inserts
// Amortized: 15/16 < 1 copy per insert → O(1) amortized ✓
console.log(\`16 inserts, \${da.totalCopyOps} total copy ops = \${(da.totalCopyOps/16).toFixed(2)} amortized\`);

// EXAMPLE 5: Recursion complexity — Fibonacci comparison
// O(2ⁿ) — exponential, naive recursion
function fib_SLOW(n) {
  if (n <= 1) return n;
  return fib_SLOW(n - 1) + fib_SLOW(n - 2); // 2 calls each level → 2ⁿ total calls
}
// fib_SLOW(50) → crashes/hangs (2^50 ≈ 1 quadrillion operations)

// O(n) — memoized (top-down DP)
function fib_FAST(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n); // O(1) cache hit
  const result = fib_FAST(n - 1, memo) + fib_FAST(n - 2, memo);
  memo.set(n, result);
  return result; // Each n computed once → O(n) time, O(n) space
}

// O(1) space — matrix exponentiation or closed form
function fib_O1SPACE(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a; // O(n) time, O(1) space
}

console.log(fib_FAST(100)); // Fast, no stack overflow
console.log(fib_O1SPACE(100)); // Same answer, O(1) space

// EXAMPLE 6: Complexity of common JavaScript operations
/*
  Operation                    | Time Complexity
  -----------------------------|----------------
  arr[i]                       | O(1)
  arr.push(x)                  | O(1) amortized
  arr.pop()                    | O(1)
  arr.shift()                  | O(n) — shifts all elements!
  arr.unshift(x)               | O(n) — shifts all elements!
  arr.splice(i, 1)             | O(n) — shifts elements after i
  arr.indexOf(x)               | O(n) — linear scan
  arr.includes(x)              | O(n) — linear scan
  arr.slice(i, j)              | O(j - i) — copies slice
  arr.sort()                   | O(n log n)
  arr.concat(arr2)             | O(n + m)
  
  map.get(key)                 | O(1) average, O(n) worst (hash collision)
  map.set(key, val)            | O(1) average
  map.has(key)                 | O(1) average
  map.delete(key)              | O(1) average
  
  set.has(val)                 | O(1) average
  set.add(val)                 | O(1) average
  
  str.indexOf(sub)             | O(n × m) naive, O(n) with KMP
  str + str2                   | O(n + m) — creates new string
*/

// EXAMPLE 7: Real interview — O(n log n) vs O(n²) sorting
// Find if any two numbers in array sum to target (Two Sum)
// Approach 1: O(n²) — check all pairs
function twoSum_SLOW(nums, target) {
  for (let i = 0; i < nums.length; i++) {         // O(n)
    for (let j = i + 1; j < nums.length; j++) {   // O(n)
      if (nums[i] + nums[j] === target) return [i, j];
    }
  } // O(n²)
}

// Approach 2: O(n log n) — sort + two pointers
function twoSum_MEDIUM(nums, target) {
  const sorted = [...nums].sort((a, b) => a - b); // O(n log n)
  let left = 0, right = sorted.length - 1;
  while (left < right) {                            // O(n)
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [sorted[left], sorted[right]];
    if (sum < target) left++;
    else right--;
  }
  return null;
}

// Approach 3: O(n) — hash map
function twoSum_FAST(nums, target) {
  const seen = new Map(); // value → index
  for (let i = 0; i < nums.length; i++) {  // O(n)
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i]; // O(1)
    seen.set(nums[i], i);
  }
  return null;
}

// For nums with 1M elements:
// O(n²):      1 trillion ops → ~1000 seconds
// O(n log n): 20 million ops → ~0.02 seconds
// O(n):       1 million ops  → ~0.001 seconds
    `,
    bugs: `
REAL PRODUCTION BUGS FROM COMPLEXITY MISUNDERSTANDING:
-------------------------------------------------------

BUG 1: O(n²) nested API calls — "N+1 query problem" killing database
  Scenario: Priya's e-commerce app loaded a list of 500 orders, then for each order,
    made a separate DB query to fetch the customer name. 500 orders = 501 DB queries.
    In production with 10,000 orders: 10,001 queries. DB CPU: 100%. Timeout for all users.
  Wrong code:
    const orders = await db.query('SELECT * FROM orders LIMIT 500'); // 1 query
    for (const order of orders) {
      order.customer = await db.query('SELECT * FROM users WHERE id = ?', [order.userId]); // n queries!
    }
  Fix: JOIN in SQL, or batch fetch with WHERE id IN (...):
    const orders = await db.query(\`
      SELECT o.*, u.name as customerName 
      FROM orders o JOIN users u ON o.userId = u.id LIMIT 500
    \`); // 1 query, no loop

BUG 2: Array.prototype.includes() inside loop — O(n²) on large dataset
  Scenario: Filtering 100,000 product IDs against a blocklist of 50,000 banned IDs.
    Took 45 seconds. Users thought the app crashed.
  Wrong code:
    const blocked = await getBlockedIds(); // Array of 50,000 IDs
    const filtered = products.filter(p => !blocked.includes(p.id)); // O(n × m) = O(5B)!
  Fix:
    const blockedSet = new Set(blocked); // O(m) to build
    const filtered = products.filter(p => !blockedSet.has(p.id)); // O(n × 1) = O(n)
  Result: 45 seconds → 80ms.

BUG 3: String concatenation in report generation — O(n²) memory explosion
  Scenario: Monthly invoice generation for 200,000 line items.
    Process ran fine for <10,000 items. At 200,000: process killed (OOM — out of memory).
  Root cause: let html = ''; for (item of items) html += renderItem(item);
    At 200,000 items, each += copies a growing string. Total memory allocated: O(n²).
    200,000² / 2 = 20 billion characters → 20GB of allocations → OOM.
  Fix: const parts = []; ... parts.join(''); // O(n) total allocations.
  Lesson: String concatenation in a loop is never O(n). Always use array + join.

BUG 4: Sorting inside a filter — O(n² log n) unintentionally
  Scenario: Real-time search results where each keystroke triggered a re-sort.
    Typing fast caused the UI to freeze.
  Wrong code:
    function search(query, products) {
      return products
        .filter(p => p.name.includes(query))
        .sort((a, b) => a.price - b.price); // Sort runs inside filter on every keystroke!
    }
    // Called on every keydown event → O(n) filter × O(n log n) sort × every keystroke
  Fix: Sort products ONCE on load. Filter the pre-sorted array on keystroke → O(n) per keystroke.
    const sortedProducts = products.sort((a, b) => a.price - b.price); // Once
    function search(query) { return sortedProducts.filter(p => p.name.includes(query)); } // O(n)

BUG 5: Misidentifying recursion depth as O(log n) when it's O(n)
  Scenario: Recursive comment tree renderer crashed with "Maximum call stack size exceeded"
    on a thread with 10,000 nested replies (deeply nested, not branched).
  Wrong assumption: "It's a tree traversal, must be O(log n) depth"
  Reality: A linear chain of nodes IS a tree. Depth = n, not log n.
    Recursion depth = O(n) → stack overflow at ~10,000 frames in V8.
  Fix: Convert to iterative using explicit stack:
    function renderComments(root) {
      const stack = [root];
      const output = [];
      while (stack.length) {
        const node = stack.pop(); // Explicit stack, not call stack
        output.push(renderNode(node));
        for (const child of node.children.reverse()) stack.push(child);
      }
      return output;
    }
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE COMPLEXITY:
  For each function, determine the time complexity. Justify your answer.
  
  a) function mystery(n) {
       let count = 0;
       for (let i = n; i > 0; i = Math.floor(i / 2)) count++;
       return count;
     }
     // Complexity: _____ (hint: how many times can you halve n before reaching 1?)
  
  b) function pairs(arr) {
       let count = 0;
       for (let i = 0; i < arr.length; i++)
         for (let j = 0; j < arr.length; j++)
           if (arr[i] !== arr[j]) count++;
       return count;
     }
     // Complexity: _____ (hint: nested loops on same array)
  
  c) function recurse(n) {
       if (n <= 0) return 0;
       return recurse(n - 1) + recurse(n - 1);
     }
     // Complexity: _____ (hint: draw the recursion tree)
  
  d) function process(arr) {
       arr.sort((a, b) => a - b);           // Sort
       const set = new Set(arr);            // Build set
       return arr.filter(x => set.has(x)); // Filter
     }
     // Total complexity: _____
  
  e) function buildString(n) {
       let s = '';
       for (let i = 0; i < n; i++) s += 'a';
       return s;
     }
     // Complexity: _____ (not O(n)! Why?)

CHALLENGE 2 — FIX THE PERFORMANCE BUG:
  This function finds all students who enrolled in courses in BOTH lists.
  It currently times out for large inputs (50,000 students each list).
  
  function commonStudents(listA, listB) {
    return listA.filter(student => 
      listB.some(s => s.id === student.id) // Bug: O(n) search inside O(n) filter
    );
  }
  
  Tasks:
  a) Calculate the exact complexity of the buggy version.
  b) Rewrite it to be O(n + m) where n = listA.length, m = listB.length.
  c) What is the space complexity trade-off of your solution?
  d) If listA and listB are already sorted by ID, write an O(n + m) solution
     that uses O(1) extra space (no Set or Map allowed — two pointers!).

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement a ComplexityTimer utility class that:
  
  1. Runs a function on exponentially growing inputs: [100, 1000, 10000, 100000]
  2. Measures actual runtime for each input size
  3. Computes the "empirical complexity" by checking the ratio between consecutive runs:
     - If time ratio ≈ 2 when input doubles → O(n) (linear)
     - If time ratio ≈ 4 when input doubles → O(n²) (quadratic)
     - If time ratio ≈ 1 when input doubles → O(log n) or O(1)
  4. Outputs a table: input size | time | ratio | predicted complexity
  
  Use it to verify: sumArray is O(n), findDuplicates_SLOW is O(n²),
  and binary search is O(log n).
  
  Bonus: Plot the timings using ASCII art bar chart.
    `,
    summary: `Big-O is your code's crystal ball — it tells you whether your solution scales to production data sizes before you run a single test. The two most dangerous patterns in interviews and production are O(n²) nested loops (fixable with hash maps/sets) and O(n²) string concatenation (fixable with array+join). Always analyze complexity before writing code, not after.`
  },

  {
    id: 2,
    title: "Arrays & Strings — Two Pointers and Sliding Window",
    tag: "TWO EYES ARE BETTER THAN ONE",
    color: "#0F766E",
    tldr: `Arrays are the most fundamental data structure — contiguous memory, O(1) random access, O(n) insert/delete. The two-pointer technique solves a huge family of array/string problems in O(n) that would otherwise be O(n²). Sliding window (fixed and variable size) handles all substring/subarray optimization problems. Together, these three patterns cover roughly 30% of all coding interview problems.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I solved it with two nested loops — is there a better way?"
  → Almost always yes. Two pointers or sliding window converts O(n²) → O(n).

"Two pointers — do they always start at both ends? Or both at start?"
  → THREE distinct patterns:
    1. Opposite ends: left=0, right=n-1 (sorted arrays, palindromes)
    2. Same direction (fast/slow): j runs ahead of i (remove duplicates, partition)
    3. Same direction (sliding window): maintain a window between left and right

"Sliding window — fixed vs variable — when do I use which?"
  → Fixed: window size given in problem ("find max sum of k consecutive elements")
  → Variable: optimal window size itself is the answer ("longest substring without repeat")

"How do I know when to shrink the window?"
  → Window becomes invalid (character count exceeds k, sum exceeds target, etc.)
  → Shrink from left until valid again. RIGHT pointer only moves forward (never back).
  → Left and right together traverse the array at most 2n times → O(n) total.

"Prefix sums — when and why?"
  → Any problem asking "sum of subarray [i,j]" repeatedly.
  → Precompute prefix[i] = sum of arr[0..i-1].
  → Sum of [i,j] = prefix[j+1] - prefix[i]. O(1) query after O(n) precomputation.
    `,
    analogy: `
THE TWO-POINTER ANALOGIES:
---------------------------

PATTERN 1 — OPPOSITE ENDS (Two Detectives Walking Toward Each Other):
  Suspect lineup sorted by height. You need to find two suspects whose heights sum to 6ft.
  Left detective starts at shortest (left end).
  Right detective starts at tallest (right end).
  
  If current_sum < target: left detective steps right (increase sum)
  If current_sum > target: right detective steps left (decrease sum)
  If current_sum = target: FOUND!
  
  Each step eliminates one possibility. At most n steps total → O(n).
  Works ONLY on sorted arrays — sorting is the key insight.

PATTERN 2 — FAST/SLOW (Hare and Tortoise Reading a Book):
  Two readers reading the same book at different speeds.
  Slow reader: reads every word carefully.
  Fast reader: jumps ahead looking for interesting sections.
  
  Used for: removing duplicates in-place, partitioning arrays.
  Slow pointer: WHERE to write next valid element.
  Fast pointer: WHERE we're reading from (scans all elements).

PATTERN 3 — SLIDING WINDOW (A Train Window Moving Through Scenery):
  You're on a train with a fixed-size window (k seats wide).
  As the train moves, the window slides: new scenery enters from right, old scenery leaves from left.
  You want to track: maximum sum of elements currently visible in the window.
  
  Fixed window: train window stays k seats wide always.
  Variable window: window can grow and shrink depending on what you see.
    "Expand right until window is invalid, shrink left until valid again."

PREFIX SUMS = THE RUNNING BANK BALANCE:
  Your bank statement has 1 million transactions.
  Question: "What was the net change between January 15th and March 22nd?"
  Naive: sum all transactions in that range every time: O(n) per query.
  Prefix sum: precompute balance at every date: O(n) once.
  Any range query: balance[march22] - balance[jan14]: O(1) per query.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — ARRAYS, TWO POINTERS, SLIDING WINDOW:
------------------------------------------------------------------

ARRAY MEMORY LAYOUT:
  Array = contiguous block of memory. Element i is at: base_address + i × element_size.
  This is WHY arr[i] is O(1) — it's a simple arithmetic calculation, no traversal needed.
  
  Cache locality: accessing arr[i], arr[i+1], arr[i+2] in sequence = cache-friendly.
  They're all in the same cache line (64 bytes typically = 8 int64s or 16 int32s).
  This is why array traversal is much faster than linked list traversal in practice.
  
  Insert/delete at arbitrary position: O(n) — must shift elements.
  Delete arr[i]: move arr[i+1], arr[i+2], ... arr[n-1] each left by one position.

TWO-POINTER PATTERN 1: OPPOSITE ENDS
  Template:
    left = 0, right = n - 1
    while left < right:
      if condition(arr[left], arr[right]): process, left++, right-- (or move one)
      elif too_small: left++
      else: right--
  
  When to use: 
    - Sorted array, find pairs with property (sum=target, difference=k)
    - Palindrome check
    - Container with most water
    - Trapping rain water (with this pattern or DP)
  
  Why O(n): left only moves right, right only moves left. Total moves ≤ n. Each move is O(1).

TWO-POINTER PATTERN 2: SAME DIRECTION (Fast/Slow Write Pointer)
  Template:
    write = 0  // slow pointer: next position to write
    for read in range(n):   // fast pointer: reads everything
      if arr[read] should be kept:
        arr[write] = arr[read]
        write++
    return write  // new length
  
  When to use:
    - Remove duplicates from sorted array in-place
    - Remove specific value in-place
    - Move zeros to end
    - Partition array (Dutch National Flag — 3-way partition)
  
  Why O(n): Both pointers together traverse at most 2n positions. O(1) space (in-place).

SLIDING WINDOW — FIXED SIZE:
  Template:
    // Build first window:
    window_sum = sum(arr[0..k-1])
    best = window_sum
    
    // Slide the window:
    for i from k to n-1:
      window_sum += arr[i]       // Add incoming element
      window_sum -= arr[i - k]   // Remove outgoing element
      best = max(best, window_sum)
    return best
  
  O(n) — each element added and removed exactly once.

SLIDING WINDOW — VARIABLE SIZE:
  Template:
    left = 0
    state = initial_state()  // (e.g., char count map, current sum)
    best = initial_best
    
    for right from 0 to n-1:
      state.add(arr[right])          // Expand window to include arr[right]
      
      while window_is_invalid(state):  // Shrink until valid
        state.remove(arr[left])
        left++
      
      best = update(best, right - left + 1)  // Window [left..right] is valid
    
    return best
  
  O(n) — right pointer moves n times. Left pointer TOTAL moves ≤ n (never goes backward).
  Together: at most 2n operations → O(n).

PREFIX SUMS:
  prefix[0] = 0
  prefix[i] = arr[0] + arr[1] + ... + arr[i-1]
  
  Sum of arr[i..j] = prefix[j+1] - prefix[i]
  
  SUBARRAY SUM EQUALS K (using prefix + hashmap):
  For each j, find all i such that prefix[j+1] - prefix[i] = k
  → prefix[i] = prefix[j+1] - k
  → Precompute prefix, use hashmap to count how many times each prefix sum appeared.
  → O(n) time, O(n) space.
  
  2D PREFIX SUMS (for matrix range queries):
  prefix[i][j] = sum of rectangle from (0,0) to (i-1, j-1)
  Sum of rectangle (r1,c1) to (r2,c2):
    prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]
  (Inclusion-exclusion principle)

STRING AS ARRAY:
  In JavaScript, strings are immutable — s[i] is O(1) read but you can't write s[i].
  Split to char array for in-place modification: const chars = s.split('');
  Reverse: two-pointer on chars array.
  Palindrome check: two-pointer on string directly (no need to copy).
  
  Sliding window on strings: maintain a frequency map (Map or 26-element array for lowercase).
  Update map in O(1) as window slides — total O(n).
    `,
    code: `
// ===== ARRAYS & STRINGS — CODE EXAMPLES =====

// EXAMPLE 1: Two Pointer — Opposite Ends
// Problem: Find if a sorted array has a pair that sums to target
// Real scenario: Finding two transactions in Paytm history that together equal ₹5000

function twoSumSorted(amounts, target) {
  let left = 0;
  let right = amounts.length - 1;
  
  while (left < right) {
    const sum = amounts[left] + amounts[right];
    if (sum === target) {
      return [amounts[left], amounts[right]]; // Found!
    } else if (sum < target) {
      left++;  // Need larger sum — move left pointer right
    } else {
      right--; // Need smaller sum — move right pointer left
    }
  }
  return null; // No pair found
}

// Example: transactions sorted ascending
const amounts = [100, 500, 1200, 1800, 2000, 3000, 3200];
console.log(twoSumSorted(amounts, 3200)); // [1200, 2000]
console.log(twoSumSorted(amounts, 5000)); // [2000, 3000]
// O(n) time, O(1) space

// Variant: Check if string is palindrome
function isPalindrome(s) {
  // Normalize: lowercase, remove non-alphanumeric
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}
console.log(isPalindrome("A man, a plan, a canal: Panama")); // true

// EXAMPLE 2: Two Pointer — Same Direction (Write Pointer)
// Remove duplicates from sorted array in-place
// Real scenario: deduplicate sorted list of customer IDs

function removeDuplicates(arr) {
  if (arr.length === 0) return 0;
  
  let write = 1; // Next position to write (first element always kept)
  
  for (let read = 1; read < arr.length; read++) { // read scans everything
    if (arr[read] !== arr[read - 1]) { // Found a new unique element
      arr[write] = arr[read]; // Write it to next available position
      write++;
    }
    // If duplicate: skip (write pointer doesn't move, read advances)
  }
  
  return write; // New length
}

const ids = [1, 1, 2, 3, 3, 3, 4, 5, 5];
const newLen = removeDuplicates(ids);
console.log(ids.slice(0, newLen)); // [1, 2, 3, 4, 5] — in-place, O(1) extra space

// Move zeros to end (same pattern, different condition)
function moveZeros(arr) {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    if (arr[read] !== 0) {
      arr[write++] = arr[read]; // Write non-zeros
    }
  }
  while (write < arr.length) arr[write++] = 0; // Fill rest with zeros
}

const arr = [0, 1, 0, 3, 12];
moveZeros(arr);
console.log(arr); // [1, 3, 12, 0, 0]

// EXAMPLE 3: Sliding Window — Fixed Size
// Find max sum of k consecutive transactions

function maxSumWindow(amounts, k) {
  if (amounts.length < k) return null;
  
  // Build first window
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += amounts[i];
  let maxSum = windowSum;
  
  // Slide the window: add right, remove left
  for (let i = k; i < amounts.length; i++) {
    windowSum += amounts[i];       // New element enters window from right
    windowSum -= amounts[i - k];  // Old element leaves window from left
    maxSum = Math.max(maxSum, windowSum);
  }
  
  return maxSum;
}

// Scenario: Find the best 3-day window for Swiggy daily orders (₹ revenue)
const dailyRevenue = [120, 450, 300, 800, 650, 400, 900, 200];
console.log(maxSumWindow(dailyRevenue, 3)); // 1950 (800 + 650 + 500? → 800+650+400=1850, 650+400+900=1950)

// EXAMPLE 4: Sliding Window — Variable Size
// Longest substring without repeating characters
// Real scenario: Password validation — longest run of unique characters

function lengthOfLongestSubstring(s) {
  const charIndex = new Map(); // char → last seen index
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    
    // If char was seen WITHIN current window [left, right): shrink from left
    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1; // Jump left past the previous occurrence
    }
    
    charIndex.set(char, right); // Update last seen position
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb")); // 3 ("abc")
console.log(lengthOfLongestSubstring("Priya123!")); // 9 (all unique)

// Variable window: Minimum window substring — classic hard problem
// Find shortest window in s that contains all chars of t
function minWindow(s, t) {
  if (!t.length) return '';
  
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  
  let have = 0, required = need.size; // 'have': how many chars fully satisfied
  let left = 0;
  let minLen = Infinity, minLeft = 0;
  const window = new Map();
  
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    
    // Did adding c[right] satisfy a required character?
    if (need.has(c) && window.get(c) === need.get(c)) have++;
    
    // Shrink while window is valid (all required chars present)
    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minLeft = left;
      }
      const leftChar = s[left];
      window.set(leftChar, window.get(leftChar) - 1);
      if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) have--;
      left++;
    }
  }
  
  return minLen === Infinity ? '' : s.slice(minLeft, minLeft + minLen);
}

console.log(minWindow("ADOBECODEBANC", "ABC")); // "BANC"

// EXAMPLE 5: Prefix Sums
// Subarray sum equals k — count all subarrays with given sum
// Real scenario: Find all spending windows where Rohan spent exactly ₹1000

function subarraySum(nums, k) {
  const prefixCount = new Map([[0, 1]]); // prefix_sum → count of occurrences
  let count = 0;
  let prefixSum = 0;
  
  for (const num of nums) {
    prefixSum += num;
    // If prefix[i] - k exists, those subarrays ending at current position sum to k
    if (prefixCount.has(prefixSum - k)) {
      count += prefixCount.get(prefixSum - k);
    }
    prefixCount.set(prefixSum, (prefixCount.get(prefixSum) || 0) + 1);
  }
  
  return count;
}

const spending = [100, 200, 300, 400, 100, 600]; // Daily expenses in ₹
console.log(subarraySum(spending, 1000)); // Count of consecutive-day windows summing to ₹1000
// [100+200+300+400=1000 ✓], [400+100+600=1100 ✗], ... etc.

// EXAMPLE 6: Three Pointers — Dutch National Flag (sort 0s, 1s, 2s)
// Partition array into three groups in O(n) time, O(1) space
function sortColors(nums) {
  let low = 0;               // Boundary: everything < low is 0
  let mid = 0;               // Current element under examination
  let high = nums.length - 1; // Boundary: everything > high is 2
  
  while (mid <= high) {
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]]; // Swap to front
      low++; mid++;
    } else if (nums[mid] === 1) {
      mid++; // Already in right place
    } else { // nums[mid] === 2
      [nums[mid], nums[high]] = [nums[high], nums[mid]]; // Swap to back
      high--; // Don't increment mid! Swapped element not yet examined
    }
  }
}

const colors = [2, 0, 2, 1, 1, 0];
sortColors(colors);
console.log(colors); // [0, 0, 1, 1, 2, 2]

// EXAMPLE 7: Container With Most Water — Classic Two Pointer
// Find two lines that together with x-axis form a container with most water
// Real scenario: Maximize water storage given building heights

function maxWater(heights) {
  let left = 0, right = heights.length - 1;
  let maxArea = 0;
  
  while (left < right) {
    const width = right - left;
    const area = Math.min(heights[left], heights[right]) * width;
    maxArea = Math.max(maxArea, area);
    
    // Move the shorter wall — moving taller wall can only decrease or maintain area
    // (width decreases by 1, height bounded by shorter wall regardless)
    if (heights[left] < heights[right]) left++;
    else right--;
  }
  
  return maxArea;
}

console.log(maxWater([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49 (between index 1 and 8: min(8,7)×7=49)
    `,
    bugs: `
REAL PRODUCTION BUGS FROM ARRAY/STRING MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: Off-by-one in sliding window — missing last window or counting incorrectly
  Scenario: Analytics pipeline calculating 7-day rolling average of user signups.
    Last 6 days of data were missing from the report (right pointer stopped 1 early).
  Wrong code:
    for (let i = k; i < arr.length - 1; i++) // Bug: -1 misses last valid window
  Fix:
    for (let i = k; i < arr.length; i++) // Remove -1
  Lesson: Sliding window right pointer should go up to arr.length, not arr.length - 1.
    The window covers indices [i-k, i-1], both valid at i = arr.length - 1.

BUG 2: Not handling the "seen in current window" check correctly in variable sliding window
  Scenario: Character uniqueness validator for username generation was allowing repeats.
  Wrong code:
    if (charIndex.has(char)) left = charIndex.get(char) + 1;
    // Bug: if char was seen BEFORE the current window (left > charIndex.get(char)),
    // we incorrectly move left backward (or set it past where it should be)!
    // Wait — left only moves forward, but charIndex may point to old position.
  Fix:
    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1; // Only move if the old occurrence is IN current window
    }

BUG 3: Two-pointer on unsorted array — gives wrong results silently
  Scenario: Payment reconciliation finding two amounts that sum to target.
    Two-pointer returned wrong pair (or null) because input wasn't sorted.
    Data came from an API that sometimes returned sorted, sometimes not.
  Root cause: Opposite-ends two-pointer REQUIRES sorted input.
    On unsorted input, skipping elements may skip the valid pair.
  Fix:
    function twoSumUnsorted(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) return [seen.get(complement), i];
        seen.set(nums[i], i);
      }
      return null;
    } // O(n) with hash map — works on any input

BUG 4: Prefix sum integer overflow (large cumulative sums)
  Scenario: Financial system computing prefix sums of transaction amounts.
    Worked for small datasets. Crashed/gave wrong results for large datasets
    where cumulative sum exceeded Number.MAX_SAFE_INTEGER (2^53 - 1).
  Root cause: JavaScript numbers are 64-bit floats. Large integers lose precision.
    9007199254740993 + 1 = 9007199254740992 (wrong!)
  Fix: Use BigInt for financial calculations:
    let prefixSum = 0n; // BigInt
    for (const amount of amounts) prefixSum += BigInt(amount);
    // Or use a library like decimal.js for financial precision

BUG 5: In-place array modification while iterating — skipping elements
  Scenario: Removing all "inactive" users from an array using a write pointer.
    Some inactive users weren't removed when consecutive inactive users appeared.
  Wrong code:
    for (let i = 0; i < users.length; i++) {
      if (users[i].status === 'inactive') {
        users.splice(i, 1); // BUG: splice removes element AND shifts array
        // Now i points to what was i+1 — the next element is SKIPPED!
      }
    }
  Fix (Option A): Iterate backwards:
    for (let i = users.length - 1; i >= 0; i--) {
      if (users[i].status === 'inactive') users.splice(i, 1);
    }
  Fix (Option B): Use write pointer (O(n), no O(n²) splice shifting):
    let write = 0;
    for (let read = 0; read < users.length; read++) {
      if (users[read].status === 'active') users[write++] = users[read];
    }
    users.length = write; // Truncate
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  Trace through these algorithms step by step.
  
  a) twoSumSorted([1, 2, 3, 4, 5, 6], 9):
     Step through: left=0,right=5 → ... → answer?
     At each step, show: left, right, sum, action taken.
  
  b) lengthOfLongestSubstring("pwwkew"):
     Trace the sliding window. At each step show:
     right index, char, left, window content, maxLen.
     What is the final answer?
  
  c) Prefix sum problem: arr = [3, -1, 2, -3, 4, -2, 1], k = 3
     Build the prefix sum array.
     Then identify all subarrays that sum to 3.
     Use the prefix sum + hashmap method.

CHALLENGE 2 — FIX THE BUGS:
  This sliding window for "longest substring with at most k distinct characters"
  has 2 bugs. Identify and fix them.
  
  function longestKDistinct(s, k) {
    const freq = new Map();
    let left = 0, maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
      const c = s[right];
      freq.set(c, (freq.get(c) || 0) + 1);
      
      // Bug 1: wrong condition — should shrink when > k distinct, not >= k
      while (freq.size >= k) {
        const lc = s[left];
        freq.set(lc, freq.get(lc) - 1);
        // Bug 2: never deletes key when count reaches 0, so freq.size never decreases
        left++;
      }
      
      maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
  }
  
  Verify your fix: longestKDistinct("eceba", 2) should return 3 ("ece").

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement the following problems using the patterns learned:
  
  Problem A (Two Pointer — Sort): 
  Given array of intervals sorted by start time, merge all overlapping intervals.
  Input: [[1,3],[2,6],[8,10],[15,18]]
  Output: [[1,6],[8,10],[15,18]]
  Constraint: O(n log n) time (sorting), O(1) extra space.
  
  Problem B (Sliding Window): 
  Find the smallest subarray whose sum is >= target. Return its length.
  Input: nums=[2,3,1,2,4,3], target=7
  Output: 2 (the subarray [4,3])
  Constraint: O(n) time.
  
  Problem C (Prefix Sum + Two Pointer): 
  Count the number of subarrays with product < k.
  Input: nums=[10,5,2,6], k=100
  Output: 8
  Hint: Use two pointers (not prefix sums). When does right - left + 1 count subarrays?
    `,
    summary: `Two pointers and sliding window are force-multipliers: they convert "for every pair, check everything" (O(n²)) into "each element is visited at most twice" (O(n)). Memorize the three two-pointer templates (opposite ends, same direction write pointer, sliding window) and prefix sums — these patterns appear in ~30% of array/string interview problems and are essential for writing production code that doesn't melt on real data.`
  },

  {
    id: 3,
    title: "Hash Maps & Sets — The O(1) Superpower",
    tag: "TRADING MEMORY FOR SPEED",
    color: "#B45309",
    tldr: `Hash maps and sets provide average O(1) insert, delete, and lookup by converting keys into array indices via a hash function. They're the most frequently used data structure in coding interviews because they instantly eliminate repeated O(n) searches. Understanding their internals — hash functions, collision handling, load factor, and resizing — explains when they degrade to O(n) and how to prevent it. The LRU Cache is the canonical hash map + doubly-linked list combination problem.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How can O(1) lookup possibly work? Don't you need to search?"
  → No search needed. Hash function converts key to array index directly.
    arr[hash("username")] = userData. Get: arr[hash("username")]. One step.

"If O(1) is average, when does it become O(n)?"
  → Hash collisions: two keys hash to same index.
  → If load factor too high (too many keys per bucket), chains grow → O(n) worst case.
  → Poor hash function: all keys hash to same bucket (hash("a") = hash("b") = hash("c") = 0).

"When should I use Map vs plain object {} in JavaScript?"
  → Object: string/symbol keys only. Prototype chain pollution risk. JSON-serializable.
  → Map: any key type (objects, functions, numbers). Guaranteed insertion order. .size property.
    Map is preferable for algorithm use — never accidentally access prototype properties.

"What's the difference between Map and Set?"
  → Map: key → value pairs.
  → Set: unique values only (a Map where value = true).
    Use Set for: deduplication, membership testing, tracking visited states.

"Why does the LRU Cache need a doubly linked list AND a hash map?"
  → Hash map: O(1) access to any cache entry by key.
  → Doubly linked list: O(1) move any node to front (mark as recently used).
    Without doubly linked list: updating "recently used" would be O(n) traversal.
    Without hash map: finding a node would be O(n) traversal.
    Together: O(1) get and put.
    `,
    analogy: `
THE LIBRARY LOCKER ANALOGY:
----------------------------
Imagine a library with 1000 numbered lockers. Members store their books.

HASH FUNCTION = THE LOCKER ASSIGNMENT FORMULA:
  Formula: locker_number = sum_of_ascii_values(name) % 1000
  "Priya" → (P=80, r=114, i=105, y=121, a=97) = 517 % 1000 = 517
  Priya always gets locker 517. No searching needed — direct access!

COLLISION = TWO PEOPLE ASSIGNED SAME LOCKER:
  What if "Arjun" also hashes to 517?
  Chaining solution: Locker 517 has a chain of names attached: [Priya's book, Arjun's book]
    Finding Priya's book: go to locker 517, scan the (hopefully short) chain.
  Open addressing: "517 is taken, try 518, 519..." until empty slot found.

LOAD FACTOR = HOW FULL THE LOCKER ROOM IS:
  load_factor = number_of_items / number_of_lockers
  If 900 of 1000 lockers are full (load factor = 0.9):
    Most keys hash to a taken locker → long chains → searches get slow.
  Optimal load factor: ~0.7. When exceeded: build a bigger locker room (resize).
  Resize: double the lockers (2000), re-assign every item to new locker numbers (rehash).
  This is why hash maps are AMORTIZED O(1) — rare O(n) resize.

LRU CACHE = MAGICAL LIBRARY WITH LIMITED SHELF SPACE:
  You have a shelf that holds only 5 books (capacity = 5).
  Rule: the book you used MOST RECENTLY stays. Least recently used gets removed when full.
  
  Hash map: "Where is 'Harry Potter' on the shelf?" → immediately point to its position.
  Doubly linked list: "Move 'Harry Potter' to the front" → O(1) by changing pointers.
    (Single linked list: "Move to front" needs to find the PREVIOUS node → O(n).)
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — HASH MAP INTERNALS:
-----------------------------------------------

HASH FUNCTION REQUIREMENTS:
  1. Deterministic: same key always produces same hash.
  2. Uniform distribution: keys spread evenly across bucket array.
  3. Fast: O(1) to compute (constant time regardless of key length — in practice).
  4. Avalanche effect: small change in key → large change in hash (prevents clustering).
  
  Simple hash for strings (djb2 algorithm):
    hash = 5381
    for each char c in key:
      hash = ((hash << 5) + hash) + char_code(c)  // hash * 33 + c
      hash = hash & 0xFFFFFFFF  // Keep 32-bit
    return Math.abs(hash) % table_size

COLLISION RESOLUTION:
  
  METHOD 1: SEPARATE CHAINING
    Each bucket holds a linked list (or array) of entries.
    Insert: hash → bucket → append to list. O(1) average.
    Lookup: hash → bucket → scan list for key. O(1) if chains are short.
    Worst case: all keys hash to bucket 0 → linked list of n items → O(n) lookup.
    Java HashMap, Python dict (historically), most textbook implementations use this.
  
  METHOD 2: OPEN ADDRESSING (Linear Probing)
    No linked lists. All entries stored in the array itself.
    Insert: hash → if occupied, try (hash+1) % size, then (hash+2) % size, etc.
    Lookup: hash → if key matches, done. If different key, probe forward until found or empty.
    Deletion: TRICKY — can't just remove (breaks probe chains). Use "tombstone" markers.
    Better cache performance than chaining (no pointer chasing).
    Python dict (since 3.6) uses this.
  
  METHOD 3: DOUBLE HASHING
    On collision, use a second hash function to compute step size.
    Reduces clustering compared to linear probing.

LOAD FACTOR AND RESIZE:
  load_factor = entries / buckets
  
  At load factor > 0.75 (Java's default):
    Allocate new array of size 2 × old_size
    Re-hash every key into new array (O(n) one-time cost)
    This is why individual operations are O(1) AMORTIZED.
  
  JavaScript Object properties:
    V8 uses "hidden classes" and stores properties in object slots.
    For integer-keyed access: V8 often uses actual arrays (elements array).
    For string keys: hash table with open addressing.
  
  JavaScript Map:
    Guaranteed O(1) operations by spec.
    V8 implements as a hash table with chaining.
    Maintains insertion order (unlike Object in pre-ES2015).

KEY TYPES AND EQUALITY:
  JavaScript Map uses SameValueZero equality for keys:
    NaN === NaN → false normally, but Map treats NaN as equal to NaN (same bucket)!
    -0 and +0 are treated as equal keys.
    Objects: equality by reference (same object pointer), not value.
    
  This means:
    const m = new Map();
    const key1 = {id: 1};
    const key2 = {id: 1};
    m.set(key1, 'a');
    m.get(key2); // undefined! Different object references, even if same content.
    m.get(key1); // 'a' ✓

WHEN TO USE WHAT:
  Set: membership testing, deduplication
  Map: key-value store with non-string keys, ordered iteration needed, size needed
  Object: JSON-compatible data, string keys, config objects
  Array (as hash): integer keys 0..n, frequency counting (array of 26 for lowercase letters)
  
  Frequency counting optimization:
    const freq = new Array(26).fill(0);
    for (const c of s) freq[c.charCodeAt(0) - 97]++;
    // Faster than Map for lowercase letter frequency (no hash function, direct array index)

LRU CACHE IMPLEMENTATION DETAILS:
  Data structures needed:
    HashMap<key, Node>: O(1) key → node lookup
    DoublyLinkedList: most-recent at head (left), least-recent at tail (right)
  
  get(key):
    If key not in map: return -1
    Node = map[key]
    Move node to head (O(1) via doubly-linked list)
    Return node.value
  
  put(key, value):
    If key in map:
      Update node.value
      Move node to head
    Else:
      Create new node
      Add to head
      Add to map
      If size > capacity:
        Remove tail node from list (LRU)
        Remove its key from map
  
  Why doubly-linked (not singly)?
    Removing a node requires updating PREVIOUS node's next pointer.
    Singly linked: finding previous node = O(n) traversal.
    Doubly linked: node.prev is stored → O(1) removal.
  
  Sentinel nodes (dummy head and tail):
    Avoids null checks when inserting/removing at boundaries.
    head.next = first real node, tail.prev = last real node.
    Always valid, never null.
    `,
    code: `
// ===== HASH MAPS & SETS — CODE EXAMPLES =====

// EXAMPLE 1: Map vs Set vs Object — when to use each
// Frequency counter for characters (anagram check)
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  
  // Array as hash (fastest for lowercase letters):
  const count = new Array(26).fill(0);
  for (const c of s) count[c.charCodeAt(0) - 97]++;  // Increment
  for (const c of t) count[c.charCodeAt(0) - 97]--;  // Decrement
  return count.every(x => x === 0); // All zeros = anagram
}

// Group anagrams together
function groupAnagrams(words) {
  const map = new Map(); // sorted_word → [original words]
  
  for (const word of words) {
    const key = word.split('').sort().join(''); // Canonical form
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(word);
  }
  
  return [...map.values()];
}

const words = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
console.log(groupAnagrams(words));
// [['eat','tea','ate'], ['tan','nat'], ['bat']]

// EXAMPLE 2: Set for deduplication and cycle detection
// Find all duplicate elements in array
function findAllDuplicates(nums) {
  const seen = new Set();
  const duplicates = new Set(); // Use Set to avoid duplicate duplicates!
  
  for (const n of nums) {
    if (seen.has(n)) duplicates.add(n);
    else seen.add(n);
  }
  
  return [...duplicates];
}

// Intersection of two arrays (Indian students in both Math and Science clubs)
function intersection(mathClub, scienceClub) {
  const scienceSet = new Set(scienceClub);
  return [...new Set(mathClub.filter(student => scienceSet.has(student)))];
}

const math = ['Aarav', 'Priya', 'Rohan', 'Meera', 'Kiran'];
const science = ['Priya', 'Kiran', 'Ananya', 'Rohan'];
console.log(intersection(math, science)); // ['Priya', 'Rohan', 'Kiran']

// EXAMPLE 3: HashMap for frequency and "first unique" problems
// First non-repeating character in a stream
function firstUnique(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (const c of s) {
    if (freq.get(c) === 1) return c;
  }
  return null;
}

console.log(firstUnique("leetcode")); // 'l'
console.log(firstUnique("aabb"));     // null

// Longest consecutive sequence (requires sorting OR hash set)
function longestConsecutive(nums) {
  const numSet = new Set(nums); // O(n) build
  let maxLen = 0;
  
  for (const num of numSet) {
    // Only start counting if num-1 is NOT in set (start of a sequence)
    if (!numSet.has(num - 1)) {
      let current = num;
      let length = 1;
      
      while (numSet.has(current + 1)) { // Extend sequence
        current++;
        length++;
      }
      
      maxLen = Math.max(maxLen, length);
    }
  }
  
  return maxLen; // O(n) total — each num visited at most twice
}

console.log(longestConsecutive([100, 4, 200, 1, 3, 2])); // 4 (1,2,3,4)

// EXAMPLE 4: LRU Cache — the canonical hash map + doubly linked list problem
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → node reference
    
    // Sentinel (dummy) nodes — avoid null checks at boundaries
    this.head = { key: null, val: null, prev: null, next: null }; // Most recent
    this.tail = { key: null, val: null, prev: null, next: null }; // Least recent
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  
  // Add node right after head (mark as most recently used)
  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }
  
  // Remove a node from its current position (O(1) — doubly linked!)
  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);      // Detach from current position
    this._addToFront(node);  // Move to most-recently-used position
    return node.val;
  }
  
  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = value;
      this._remove(node);
      this._addToFront(node);
    } else {
      if (this.map.size === this.capacity) {
        // Evict least recently used (node before tail sentinel)
        const lru = this.tail.prev;
        this._remove(lru);
        this.map.delete(lru.key);
      }
      const newNode = { key, val: value, prev: null, next: null };
      this._addToFront(newNode);
      this.map.set(key, newNode);
    }
  }
}

// Test LRU Cache (capacity = 2):
const cache = new LRUCache(2);
cache.put('user:priya', { name: 'Priya', role: 'admin' });
cache.put('user:arjun', { name: 'Arjun', role: 'viewer' });
console.log(cache.get('user:priya'));  // Returns priya's data, marks as most recent
cache.put('user:rohan', { name: 'Rohan', role: 'editor' }); // Evicts arjun (LRU)
console.log(cache.get('user:arjun'));  // -1 (was evicted)
console.log(cache.get('user:rohan')); // Returns rohan's data

// EXAMPLE 5: Hash map for graph problems — valid path detection
// Check if path exists: given adjacency list, start, end
function hasPath(graph, start, end, visited = new Set()) {
  if (start === end) return true;
  if (visited.has(start)) return false; // Cycle detection via Set!
  
  visited.add(start);
  for (const neighbor of (graph[start] || [])) {
    if (hasPath(graph, neighbor, end, visited)) return true;
  }
  return false;
}

const graph = {
  'Delhi': ['Mumbai', 'Bangalore'],
  'Mumbai': ['Pune', 'Hyderabad'],
  'Bangalore': ['Chennai'],
  'Pune': [],
  'Hyderabad': ['Chennai'],
  'Chennai': []
};

console.log(hasPath(graph, 'Delhi', 'Chennai')); // true
console.log(hasPath(graph, 'Pune', 'Delhi'));    // false

// EXAMPLE 6: Custom hash key for 2D problems
// Count islands (visited tracking with Set of "row,col" strings)
function numIslands(grid) {
  const visited = new Set();
  let count = 0;
  
  function dfs(r, c) {
    const key = \`\${r},\${c}\`;
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length ||
        grid[r][c] === '0' || visited.has(key)) return;
    
    visited.add(key);
    dfs(r + 1, c); dfs(r - 1, c);
    dfs(r, c + 1); dfs(r, c - 1);
  }
  
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1' && !visited.has(\`\${r},\${c}\`)) {
        dfs(r, c);
        count++;
      }
    }
  }
  return count;
}

// EXAMPLE 7: Hashing edge cases — object keys and NaN
const map = new Map();
const obj1 = { id: 1 };
const obj2 = { id: 1 }; // Same content, different reference!

map.set(obj1, 'first');
map.set(obj2, 'second');
console.log(map.size);     // 2 — obj1 and obj2 are DIFFERENT keys (reference equality)
console.log(map.get(obj1)); // 'first'
console.log(map.get(obj2)); // 'second'

// NaN as key:
map.set(NaN, 'not-a-number');
console.log(map.get(NaN)); // 'not-a-number' — Map handles NaN correctly!
console.log(NaN === NaN);  // false — but Map treats NaN === NaN for keying

// Practical: Use JSON.stringify for object keys (if you need value equality):
const posMap = new Map();
const pos = {row: 1, col: 2};
posMap.set(JSON.stringify(pos), 'treasure'); // "{\\"row\\":1,\\"col\\":2}"
console.log(posMap.get(JSON.stringify({row: 1, col: 2}))); // 'treasure' — works!
    `,
    bugs: `
REAL PRODUCTION BUGS FROM HASH MAP MISUNDERSTANDING:
-----------------------------------------------------

BUG 1: Using object as Map key causing memory leak and wrong behavior
  Scenario: Request deduplication cache using request objects as keys in a plain object.
    Cache never hit (every request was "new"), memory grew unbounded.
  Wrong code:
    const cache = {};
    const requestKey = { userId: 123, endpoint: '/api/data' };
    cache[requestKey] = response; // JavaScript converts key to string: "[object Object]"!
    // Every key becomes "[object Object]" — overwriting each other!
  Fix:
    const cache = new Map();
    cache.set(JSON.stringify(requestKey), response); // Proper string key
    // Or use a real key: \`\${userId}:\${endpoint}\`

BUG 2: Prototype property collision with plain object used as map
  Scenario: User input "constructor" as their username crashed the auth system.
  Wrong code:
    const userMap = {}; // Plain object
    userMap[username] = user; // If username = "constructor", "hasOwnProperty", etc.
    // Overwrites built-in Object prototype properties!
    // Later: if (userMap['constructor']) → truthy even for invalid users!
  Fix:
    const userMap = Object.create(null); // Null-prototype — no inherited properties
    // Or use Map: const userMap = new Map(); // Safest option

BUG 3: Hash map degrading to O(n) due to poor hash function with repeated keys
  Scenario: Custom hash table implementation for a caching layer.
    Performance fine in testing. Production slowdown with user IDs all ending in "000".
  Root cause: Hash function used only last 3 digits → all IDs hashed to same bucket.
    hash("user123000") = 123000 % 100 = 0
    hash("user456000") = 456000 % 100 = 0
    100,000 users in bucket 0 → O(n) lookups!
  Fix: Use a better hash function (djb2, MurmurHash) that considers all bytes of the key.
    Or use a prime number as the modulus (reduces clustering).
    Production: just use the built-in Map (hash function is battle-tested).

BUG 4: LRU cache implemented with array instead of doubly linked list — O(n) per operation
  Scenario: "LRU Cache" feature added to API gateway. Performance degraded dramatically
    under load (thousands of requests/sec instead of expected millions).
  Root cause:
    const lru = [];
    function get(key) {
      const idx = lru.findIndex(item => item.key === key); // O(n)!
      if (idx === -1) return -1;
      const item = lru.splice(idx, 1)[0]; // O(n) splice!
      lru.unshift(item); // O(n) unshift!
      return item.val;
    }
    Three O(n) operations per get → O(n) cache that should be O(1).
  Fix: Use the Map + DoublyLinkedList pattern (see Example 4 above).
    JavaScript Map maintains insertion order — can also use Map alone as a clever O(1) LRU:
    function get(key) {
      if (!this.map.has(key)) return -1;
      const val = this.map.get(key);
      this.map.delete(key);  // Remove from current position
      this.map.set(key, val); // Re-insert at end (most recent in Map order)
      return val;
    }

BUG 5: Set equality bug — comparing sets by reference instead of value
  Scenario: Feature flag system checking if user's permission set equals required permissions.
  Wrong code:
    const userPerms = new Set(['read', 'write']);
    const requiredPerms = new Set(['read', 'write']);
    if (userPerms === requiredPerms) grantAccess(); // BUG: reference comparison!
    // userPerms === requiredPerms → false (different objects)
    // User never gets access even with correct permissions!
  Fix:
    function setsEqual(setA, setB) {
      if (setA.size !== setB.size) return false;
      for (const item of setA) {
        if (!setB.has(item)) return false;
      }
      return true;
    }
    if (setsEqual(userPerms, requiredPerms)) grantAccess();
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — PREDICT THE OUTPUT:
  What does each snippet print? Explain why.
  
  a) const m = new Map();
     m.set(1, 'one');
     m.set('1', 'string one');
     m.set(true, 'bool one');
     console.log(m.size);       // ___
     console.log(m.get(1));     // ___
     console.log(m.get('1'));   // ___
     console.log(m.get(true));  // ___
  
  b) const s = new Set([1, 1, 2, '2', true, 1, NaN, NaN]);
     console.log(s.size); // ___
     console.log([...s]); // ___
  
  c) const cache = {};
     const keys = ['toString', 'hasOwnProperty', '__proto__', 'normal'];
     keys.forEach(k => { cache[k] = 'value'; });
     console.log(Object.keys(cache).length); // ___  (hint: some keys are special!)
     console.log(cache['normal']);            // ___
     console.log(cache['toString']);          // ___ (is it 'value'?)

CHALLENGE 2 — FIX THE LRU IMPLEMENTATION:
  This LRU Cache uses Map (clever approach) but has 2 bugs:
  
  class LRUCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.map = new Map();
    }
    
    get(key) {
      if (!this.map.has(key)) return -1;
      const val = this.map.get(key);
      this.map.delete(key);
      this.map.set(key, val);
      return val;
    }
    
    put(key, value) {
      if (this.map.has(key)) this.map.delete(key);
      // Bug 1: eviction check is after insertion — can exceed capacity by 1
      this.map.set(key, value);
      if (this.map.size > this.capacity) {
        // Bug 2: deletes the LAST key (most recent!) instead of first (least recent)
        const lastKey = [...this.map.keys()].pop();
        this.map.delete(lastKey);
      }
    }
  }

CHALLENGE 3 — BUILD FROM SCRATCH:
  Build a TimeMap (time-based key-value store):
  
  Interface:
  - set(key, value, timestamp): Store key with value at the given timestamp.
  - get(key, timestamp): Return the value with the largest timestamp <= given timestamp.
    Return '' if no such value exists.
  
  Example:
    tm.set("foo", "bar", 1)
    tm.get("foo", 1)   → "bar"
    tm.get("foo", 3)   → "bar" (largest timestamp <= 3 is 1)
    tm.set("foo", "bar2", 4)
    tm.get("foo", 4)   → "bar2"
    tm.get("foo", 5)   → "bar2"
  
  Constraints:
  - All timestamps are strictly increasing for the same key.
  - O(1) set, O(log n) get (binary search on timestamps).
  - Follow-up: What if timestamps are NOT guaranteed to be increasing?
    How would you handle concurrent writes from different servers?
    `,
    summary: `Hash maps and sets are the most powerful algorithmic tool in the interview toolkit — they instantly convert O(n) searches into O(1) lookups at the cost of O(n) space. Master the LRU cache pattern (Map + DoublyLinkedList) as it demonstrates how two data structures combine for capabilities neither has alone. In production, always use Map over plain objects for dynamic key-value storage to avoid prototype pollution and object-key coercion bugs.`
  },

  {
    id: 4,
    title: "Linked Lists — Pointers, Cycles & Reversal",
    tag: "THE CHAIN THAT TEACHES POINTERS",
    color: "#0369A1",
    tldr: `A linked list is a sequence of nodes where each node contains data and a pointer to the next node. Unlike arrays, insertion and deletion are O(1) if you have the node reference — no element shifting needed. The key algorithmic techniques are slow/fast pointers (Floyd's cycle detection), in-place reversal, and merge operations. These patterns teach pointer manipulation that transfers to trees, graphs, and memory management.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I reversed the list but now I've lost the rest of it — why?"
  → Classic pointer mistake: you overwrote next before saving it.
  → Template: save → redirect → advance. Always save next before modifying current.next.

"My cycle detection loop runs forever — what's wrong?"
  → Forgot the null check: slow and fast start at head, not head.next.
  → Or: forgot that fast must check both fast AND fast.next before advancing fast.next.next.

"Where exactly does fast meet slow in Floyd's algorithm? I can't prove it mathematically."
  → Proven below. The key insight: after meeting, if slow resets to head while fast stays,
    they meet again EXACTLY at the cycle start.

"Why use linked list at all if arrays have O(1) access?"
  → O(1) insert/delete at arbitrary position IF you have the node reference.
  → Arrays: O(n) insertion (shifting). Useful for: queues, caches, undo history.
  → Real-world: Operating system memory allocators, browser history, undo/redo.

"Why does merging two sorted linked lists teach you something important?"
  → Dummy head technique: eliminates edge cases for empty/single lists.
  → This pattern scales to merge k sorted lists (heap), external merge sort.
    `,
    analogy: `
THE TREASURE HUNT ANALOGY:
---------------------------
Each treasure chest (node) contains:
  - Some gold (data/value)
  - A MAP to the next chest (next pointer)
  
You have the FIRST map (head pointer). To find chest #5, you must follow:
  chest1 → chest2 → chest3 → chest4 → chest5
  Can't skip directly! This is why access is O(n) — you must traverse.

INSERTION = ADDING A CHEST WITHOUT MOVING OTHERS:
  Traditional: to add chest between #3 and #4, dig up chests 4,5,6... and shift them over.
  Linked list: just update chest#3's map to point to new chest. New chest's map points to old #4.
  Two pointer updates → O(1). No movement of other chests.

SLOW/FAST POINTER = TWO RUNNERS ON A CIRCULAR TRACK:
  Slow runner: takes 1 step each turn.
  Fast runner: takes 2 steps each turn.
  
  If the track is LINEAR (no cycle): fast runner hits the end (null).
  If the track is CIRCULAR (cycle): fast runner eventually laps the slow runner!
  They MUST meet inside the cycle — fast runner gains 1 step each turn → catches up.
  
  How to find WHERE the cycle starts (Floyd's proof):
    Let: F = distance from head to cycle start
          C = cycle length
          k = steps inside cycle when they meet
    
    When they meet: slow has traveled F + k steps.
                    fast has traveled 2(F + k) steps.
    Fast traveled extra = one full cycle (minimum): 2(F+k) - (F+k) = F+k = C
    Therefore: F + k = C → F = C - k
    
    After meeting: reset slow to head.
    Now both advance 1 step at a time.
    Slow travels F steps to reach cycle start.
    Fast travels C - k more steps around the cycle... = F steps!
    They meet exactly at the cycle start! 🎯

REVERSAL = REVERSING A CHAIN OF ARROWS:
  Original: A → B → C → D → null
  Reversed: null ← A ← B ← C ← D (read as: D → C → B → A → null)
  
  You need 3 variables:
    prev = the node you just redirected (starts as null)
    curr = the node you're currently redirecting
    next = the next node (save BEFORE you redirect curr, or you lose the chain!)
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — LINKED LIST INTERNALS:
--------------------------------------------------

NODE STRUCTURE:
  class ListNode {
    constructor(val, next = null) {
      this.val = val;
      this.next = next; // null for last node
    }
  }
  
  Doubly linked list node:
  class DListNode {
    constructor(val) {
      this.val = val;
      this.next = null;
      this.prev = null; // Extra pointer enables O(1) backward traversal and deletion
    }
  }

TIME/SPACE COMPLEXITY:
  Access by index:     O(n) — must traverse from head
  Search by value:     O(n) — must traverse
  Insert at head:      O(1) — update head pointer
  Insert at tail:      O(1) if tail pointer maintained, O(n) otherwise
  Insert at position:  O(n) — must find position first
  Delete with pointer: O(1) — just update pointers (doubly linked) or O(n) to find prev (singly)
  Delete by value:     O(n) — must find node first
  Space:               O(n) — one pointer per node (overhead vs arrays)

DUMMY/SENTINEL HEAD TECHNIQUE:
  Problem: Head node needs special handling (prev is null, it's the "list start").
  Solution: Create a dummy node that always exists before the real head.
    const dummy = new ListNode(-1);
    dummy.next = head;
    // ... operate on list ...
    return dummy.next; // New head (dummy never moved)
  
  Benefits:
  - Uniform handling: every real node has a predecessor (prev = dummy if at head)
  - No null checks for "is this the head?" special case
  - Cleaner code for: merge, insert before, delete node

REVERSAL TEMPLATE (crucial to memorize):
  function reverse(head) {
    let prev = null;
    let curr = head;
    while (curr) {
      const next = curr.next; // SAVE before overwriting
      curr.next = prev;       // REDIRECT current node backward
      prev = curr;            // ADVANCE prev to current position
      curr = next;            // ADVANCE curr to next node
    }
    return prev; // prev is now the new head (last node of original)
  }
  
  Trace on [1→2→3→null]:
  Iteration 1: next=2, 1.next=null, prev=1, curr=2
  Iteration 2: next=3, 2.next=1, prev=2, curr=3
  Iteration 3: next=null, 3.next=2, prev=3, curr=null
  Return prev=3: [3→2→1→null] ✓

FLOYD'S CYCLE DETECTION — EDGE CASES:
  1. Empty list (head = null): return false (no fast.next.next possible)
  2. Single node, no cycle (head.next = null): fast immediately null → false
  3. Single node, self-loop (head.next = head): fast=head, slow=head, check before move
  
  Proper template:
  function hasCycle(head) {
    let slow = head, fast = head;
    while (fast !== null && fast.next !== null) {
      slow = slow.next;
      fast = fast.next.next;
      if (slow === fast) return true; // Met inside cycle
    }
    return false; // fast reached null → no cycle
  }
  
  Find cycle start (after detecting cycle):
  function cycleStart(head) {
    let slow = head, fast = head;
    while (fast && fast.next) {
      slow = slow.next;
      fast = fast.next.next;
      if (slow === fast) {
        slow = head; // Reset slow to head
        while (slow !== fast) { // Both advance 1 step
          slow = slow.next;
          fast = fast.next;
        }
        return slow; // Cycle start node
      }
    }
    return null;
  }

FINDING MIDDLE OF LINKED LIST:
  Slow/fast pointer: when fast reaches end, slow is at middle.
  function findMiddle(head) {
    let slow = head, fast = head;
    while (fast && fast.next) {
      slow = slow.next;
      fast = fast.next.next;
    }
    return slow; // Middle (for even length: returns second middle)
  }
  
  This is the key step in merge sort on linked lists!

MERGE SORT ON LINKED LIST:
  Most efficient sorting for linked lists: O(n log n) time, O(log n) space (recursion).
  (QuickSort on linked list is O(n²) average in some implementations — worse than arrays)
  
  Steps:
  1. Find middle (slow/fast pointer)
  2. Split into two halves
  3. Recursively sort each half
  4. Merge two sorted halves (dummy head technique)

REVERSE BETWEEN POSITIONS i AND j:
  Technique: reach node at position i-1, reverse the sublist from i to j, reconnect.
  Requires careful pointer management — classic interview problem.
    `,
    code: `
// ===== LINKED LISTS — CODE EXAMPLES =====

// Helper: Build linked list from array
class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function buildList(arr) {
  const dummy = new ListNode(0);
  let curr = dummy;
  for (const val of arr) { curr.next = new ListNode(val); curr = curr.next; }
  return dummy.next;
}

function listToArray(head) {
  const arr = [];
  while (head) { arr.push(head.val); head = head.next; }
  return arr;
}

// EXAMPLE 1: Reversal — the fundamental pointer manipulation
function reverseList(head) {
  let prev = null;
  let curr = head;
  
  while (curr) {
    const next = curr.next; // CRITICAL: save before overwriting!
    curr.next = prev;       // Redirect arrow
    prev = curr;            // Advance prev
    curr = next;            // Advance curr (to saved next)
  }
  
  return prev; // New head
}

const list = buildList([1, 2, 3, 4, 5]);
console.log(listToArray(reverseList(list))); // [5, 4, 3, 2, 1]

// Reverse between positions left and right (1-indexed)
function reverseBetween(head, left, right) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  
  // Step 1: Move prev to node before position 'left'
  for (let i = 0; i < left - 1; i++) prev = prev.next;
  
  // Step 2: Reverse the sublist [left, right]
  let curr = prev.next;
  for (let i = 0; i < right - left; i++) {
    const next = curr.next;
    curr.next = next.next;   // Detach next from chain
    next.next = prev.next;   // Insert next at front of reversed portion
    prev.next = next;        // Update prev to point to newly inserted node
  }
  
  return dummy.next;
}

const list2 = buildList([1, 2, 3, 4, 5]);
console.log(listToArray(reverseBetween(list2, 2, 4))); // [1, 4, 3, 2, 5]

// EXAMPLE 2: Floyd's Cycle Detection
function hasCycle(head) {
  let slow = head, fast = head;
  
  while (fast !== null && fast.next !== null) {
    slow = slow.next;        // 1 step
    fast = fast.next.next;   // 2 steps
    if (slow === fast) return true; // They met — cycle exists!
  }
  
  return false; // fast reached null — no cycle
}

function detectCycleStart(head) {
  let slow = head, fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    
    if (slow === fast) {
      // Phase 2: Find cycle start using Floyd's proof (F = C - k)
      slow = head; // Reset slow to head
      while (slow !== fast) {
        slow = slow.next; // Both move 1 step
        fast = fast.next;
      }
      return slow; // Both reach cycle start simultaneously
    }
  }
  return null; // No cycle
}

// Create cycle for testing: [3→2→0→-4→(back to 2)]
const cycleHead = buildList([3, 2, 0, -4]);
const cycleStart = cycleHead.next; // Node with value 2
cycleHead.next.next.next.next = cycleStart; // -4.next → 2 (creates cycle)
console.log(hasCycle(cycleHead));             // true
console.log(detectCycleStart(cycleHead).val); // 2

// EXAMPLE 3: Find Middle (for Merge Sort / Palindrome Check)
function findMiddle(head) {
  let slow = head, fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  
  return slow; // At middle (second middle for even length)
}

// Linked list is palindrome:
function isPalindromeList(head) {
  if (!head || !head.next) return true;
  
  // Find middle
  let mid = findMiddle(head);
  
  // Reverse second half
  let secondHalf = reverseList(mid);
  let firstHalf = head;
  const secondHalfCopy = secondHalf; // Save for re-reversal
  
  // Compare both halves
  let isPalin = true;
  while (secondHalf) {
    if (firstHalf.val !== secondHalf.val) { isPalin = false; break; }
    firstHalf = firstHalf.next;
    secondHalf = secondHalf.next;
  }
  
  reverseList(secondHalfCopy); // Restore list (good practice)
  return isPalin;
}

console.log(isPalindromeList(buildList([1, 2, 2, 1]))); // true
console.log(isPalindromeList(buildList([1, 2, 3]))); // false

// EXAMPLE 4: Merge Two Sorted Lists (dummy head technique)
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0); // Sentinel — no special head case!
  let curr = dummy;
  
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      curr.next = l1;
      l1 = l1.next;
    } else {
      curr.next = l2;
      l2 = l2.next;
    }
    curr = curr.next;
  }
  
  curr.next = l1 || l2; // Attach remaining list (one of them will be null)
  return dummy.next;
}

const A = buildList([1, 3, 5, 7]);
const B = buildList([2, 4, 6, 8]);
console.log(listToArray(mergeTwoLists(A, B))); // [1,2,3,4,5,6,7,8]

// Merge k sorted lists using min-heap concept (priority queue)
function mergeKLists(lists) {
  // Min-heap simulation using sorted array (for clarity)
  // In production: use a proper min-heap / priority queue
  function mergePair(l1, l2) { return mergeTwoLists(l1, l2); }
  
  // Divide and conquer — merge pairs of lists
  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      merged.push(mergePair(lists[i], lists[i + 1] || null));
    }
    lists = merged;
  }
  
  return lists[0] || null; // O(n log k) — log k merge rounds, each O(n) total
}

// EXAMPLE 5: Remove nth node from end (single pass with two pointers!)
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy, slow = dummy;
  
  // Move fast n+1 steps ahead
  for (let i = 0; i <= n; i++) fast = fast.next;
  
  // Move both until fast is null
  while (fast) {
    slow = slow.next;
    fast = fast.next;
  }
  
  // slow.next is the node to remove
  slow.next = slow.next.next;
  return dummy.next;
}

const list3 = buildList([1, 2, 3, 4, 5]);
console.log(listToArray(removeNthFromEnd(list3, 2))); // [1, 2, 3, 5]

// EXAMPLE 6: Add Two Numbers (linked list representation of digits)
// Scenario: Big number addition where each digit is a node (least significant first)
// 342 + 465 = 807 represented as 2→4→3 and 5→6→4 → result: 7→0→8
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let curr = dummy;
  let carry = 0;
  
  while (l1 || l2 || carry) {
    const sum = (l1?.val || 0) + (l2?.val || 0) + carry;
    carry = Math.floor(sum / 10);
    curr.next = new ListNode(sum % 10);
    curr = curr.next;
    l1 = l1?.next;
    l2 = l2?.next;
  }
  
  return dummy.next;
}

const num1 = buildList([2, 4, 3]); // 342
const num2 = buildList([5, 6, 4]); // 465
console.log(listToArray(addTwoNumbers(num1, num2))); // [7, 0, 8] → 807

// EXAMPLE 7: Intersection of Two Linked Lists
// Find the node where two lists merge (same reference, not same value)
function getIntersectionNode(headA, headB) {
  let a = headA, b = headB;
  
  // When a reaches end, redirect to headB. When b reaches end, redirect to headA.
  // If they intersect: both travel equal total distance → meet at intersection.
  // If no intersection: both reach null simultaneously (after traveling lenA + lenB).
  while (a !== b) {
    a = a === null ? headB : a.next;
    b = b === null ? headA : b.next;
  }
  
  return a; // null if no intersection, intersection node if exists
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM LINKED LIST MISUNDERSTANDING:
--------------------------------------------------------

BUG 1: Losing the rest of the list during reversal — the "orphaned chain" bug
  Scenario: In-place reversal of a linked list for a custom stack implementation.
    After reversal: first element correct, rest of list was null.
  Wrong code:
    while (curr) {
      curr.next = prev; // OVERWRITES curr.next BEFORE saving it!
      prev = curr;
      curr = curr.next; // curr.next is now prev (wrong!) — you're going backward!
    }
  Fix: Save next BEFORE redirecting:
    while (curr) {
      const next = curr.next; // Save first!
      curr.next = prev;
      prev = curr;
      curr = next; // Use saved next
    }
  Lesson: In any pointer reassignment, draw the diagram and save what you'll lose.

BUG 2: Null pointer exception in fast pointer — fast.next.next before checking fast.next
  Scenario: Cycle detection code crashed with "Cannot read property 'next' of null"
    on odd-length lists.
  Wrong code:
    while (fast.next.next !== null) { // Crashes if fast.next is null!
      fast = fast.next.next;
  Fix: Check both fast AND fast.next:
    while (fast !== null && fast.next !== null) { // Both must be non-null
      fast = fast.next.next;
    }

BUG 3: Modifying list during iteration — forgetting to update curr reference
  Scenario: Removing all nodes with value < threshold from a payment list.
    First few nodes removed correctly, then some remaining nodes also removed incorrectly.
  Wrong code:
    while (curr && curr.next) {
      if (curr.next.val < threshold) {
        curr.next = curr.next.next; // Correctly skips a node
        // BUG: curr doesn't advance — next iteration re-checks same curr
        // But we also don't advance when NOT removing — so we skip every other node!
      }
      curr = curr.next; // This runs even when we removed — now curr might skip valid node
    }
  Fix: Only advance curr when NOT removing:
    while (curr && curr.next) {
      if (curr.next.val < threshold) {
        curr.next = curr.next.next; // Remove — don't advance curr
      } else {
        curr = curr.next; // Keep — advance curr
      }
    }

BUG 4: Memory leak — keeping references to "removed" nodes in LRU cache
  Scenario: LRU cache eviction appeared to work, but memory kept growing.
  Root cause: When evicting a node, old code did: node.next = null but NOT node.prev = null.
    The evicted node still held a reference to the adjacent list node.
    JavaScript's garbage collector couldn't collect evicted nodes (still referenced).
  Fix: When removing a node, null out both pointers:
    node.prev.next = node.next;
    node.next.prev = node.prev;
    node.prev = null; // Help GC — break reference to list
    node.next = null;
    map.delete(node.key);

BUG 5: Wrong tail update when appending to doubly linked list
  Scenario: Custom queue implementation with doubly linked list. Dequeue worked.
    Enqueue worked for first N items, then dequeue started returning wrong order.
  Root cause: Enqueue forgot to update this.tail when list was empty:
    enqueue(val) {
      const node = new DListNode(val);
      if (!this.head) {
        this.head = node;
        // BUG: forgot this.tail = node! tail still points to null/old node
      } else {
        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;
      }
    }
  Fix: Always update both head and tail when list was empty:
    if (!this.head) {
      this.head = node;
      this.tail = node; // Both head and tail point to the only node
    }
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE ALGORITHM:
  Given the linked list: 1 → 2 → 3 → 4 → 5 → null
  
  a) Trace reverseList step by step. Show the state of (prev, curr, next) 
     after each iteration. What does the list look like at the end?
  
  b) Trace findMiddle(head). What does slow point to when fast reaches null?
     What about for list: 1 → 2 → 3 → 4 → null (even length)?
  
  c) Create a cycle: 1 → 2 → 3 → 4 → 5 → (back to 3)
     F (head to cycle start) = ___
     C (cycle length) = ___
     k (steps inside cycle when they meet) = ___
     Verify Floyd's formula: F = C - k → ___

CHALLENGE 2 — FIX THE MERGE BUG:
  This merge function has a subtle bug. Find it and fix it.
  
  function mergeSorted(l1, l2) {
    if (!l1) return l2;
    if (!l2) return l1;
    
    let head, curr;
    
    if (l1.val <= l2.val) {
      head = l1; curr = l1; l1 = l1.next;
    } else {
      head = l2; curr = l2; l2 = l2.next;
    }
    
    while (l1 && l2) {
      if (l1.val <= l2.val) {
        curr.next = l1;
        l1 = l1.next;
      } else {
        curr.next = l2;
        l2 = l2.next;
      }
      curr = curr.next;
    }
    
    // Bug: what happens here? What's missing?
    return head;
  }
  
  Test case that reveals the bug: mergeSorted([1,3], [2,4])
  Expected: [1,2,3,4]. What does this function return?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement a deep clone of a linked list where each node has, in addition to
  a 'next' pointer, a 'random' pointer that can point to ANY node in the list
  (or null). This is a classic hard problem.
  
  Approach 1 (O(n) space): Use a Map<original_node → cloned_node>
    First pass: create all cloned nodes, store in map.
    Second pass: set next and random pointers using map.
  
  Approach 2 (O(1) space): Interleave clones into original list
    Step 1: Insert cloned node after each original: A→A'→B→B'→C→C'
    Step 2: Set random pointers: A'.random = A.random.next (clever!)
    Step 3: Separate the two lists
  
  Implement both approaches. What is the time and space complexity of each?
  Test with: nodes [{val:7,random:null},{val:13,random:0},{val:11,random:4}]
  (random index refers to position in original list)
    `,
    summary: `Linked lists teach the most important skill in DSA: careful pointer manipulation. The three patterns to master are: reversal (prev/curr/next dance), slow/fast pointers (cycle detection, finding middle, nth from end), and the dummy head technique (clean merge and delete operations). Floyd's cycle detection is mathematical elegance — the meeting point formula is provable and produces the canonical O(1) space cycle detection algorithm.`
  },

  {
    id: 5,
    title: "Trees & Binary Search — Traversals, BST & Search Space",
    tag: "DIVIDE AND CONQUER IN TREE FORM",
    color: "#047857",
    tldr: `A binary tree branches into at most two children per node, enabling divide-and-conquer algorithms. The four traversals (inorder, preorder, postorder, level-order) each reveal different structural information. Binary Search Trees (BSTs) maintain a sorted invariant enabling O(log n) search. Binary search on answer space extends this to problems where you don't have an explicit sorted array — instead, you search for the smallest/largest value satisfying a condition.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"When do I use which tree traversal?"
  → Inorder: BST in sorted order, validate BST structure
  → Preorder: serialize/copy tree, build tree from structure
  → Postorder: delete tree, evaluate expression trees (process children before parent)
  → Level-order (BFS): shortest path in unweighted graph, level-by-level processing

"How do I convert recursive traversal to iterative?"
  → Use an explicit stack (mimics call stack).
  → Inorder iterative has a "push left, pop, push right" pattern worth memorizing.

"My BST validation just checks parent < node < sibling — why does it fail?"
  → You need to pass a RANGE [min, max] down through recursion.
  → A node in the right subtree of the root must be > root (not just > its immediate parent).
  → Classic bug: validates locally correct but globally wrong BSTs.

"Lowest Common Ancestor — I get the recursive logic but can't code it"
  → Base cases: if root is null, or root IS p or q → return root.
  → If both subtrees return non-null → root is the LCA.
  → If only one subtree returns non-null → that result IS the LCA.

"Binary search on answer space — what does that even mean?"
  → For problems like "minimum X such that condition holds": the answer space [lo, hi] is sorted.
  → You can binary search for the answer even without an explicit array.
  → Template: check if mid satisfies condition → shrink search space → repeat.
    `,
    analogy: `
THE COMPANY HIERARCHY ANALOGY:
--------------------------------
A company is a tree. CEO at the top (root). Managers are internal nodes. Employees are leaves.

INORDER TRAVERSAL (Left → Root → Right):
  Visit all left-department employees, then manager, then right-department employees.
  For BST: this visits everyone in ALPHABETICAL/SORTED order!
  Use it to: print all employees sorted by ID, validate BST (check sorted order).

PREORDER TRAVERSAL (Root → Left → Right):
  Manager introduces themselves FIRST, then introduces left team, then right team.
  Use it to: copy the org chart (you need to know the boss before the subordinates).
  
POSTORDER TRAVERSAL (Left → Right → Root):
  Both teams finish their work, THEN the manager submits the department report.
  Use it to: calculate total department headcount (must know all subordinates' counts first).
  Process children before parent — file system: delete contents before directory.

LEVEL-ORDER (BFS):
  Process all VPs first, then all directors, then all managers, then all employees.
  Level by level, floor by floor. Uses a QUEUE (not stack).

BST INVARIANT = COMPANY RULE:
  Left subtree IDs < current node ID < right subtree IDs.
  Searching for employee #42:
    At CEO (#50): 42 < 50 → go left department.
    At VP (#25): 42 > 25 → go right sub-department.
    At Director (#40): 42 > 40 → go right.
    At Manager (#42): Found! Only 3 decisions instead of scanning all employees.

BINARY SEARCH ON ANSWER SPACE = GUESSING GAME WITH A BUDGET:
  "I'm thinking of a minimum number X. I'll tell you 'possible' or 'not possible'."
  Guess too high: always possible. Guess too low: not possible.
  Binary search the boundary: highest X where "not possible" switches to "possible".
  This works for: Koko eating bananas, minimum capacity to ship packages, painters partition.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — TREES & BINARY SEARCH:
--------------------------------------------------

TREE PROPERTIES:
  Height of node: longest path from node to a leaf below.
  Depth of node: distance from root to node.
  Height of tree: height of root = O(log n) for balanced, O(n) for skewed.
  
  Perfect binary tree: all leaves at same level, all internal nodes have 2 children.
    Nodes at level k: 2^k. Total nodes for height h: 2^(h+1) - 1.
  Complete binary tree: all levels full except possibly last, last level filled left to right.
    Used in: heaps (stored as array).
  Balanced binary tree: |height(left) - height(right)| ≤ 1 for every node.
    Guarantees O(log n) operations.

RECURSIVE TREE ALGORITHMS — THE TEMPLATE:
  Most tree problems follow this pattern:
    function solve(node):
      if node is null: return base_case
      left_result = solve(node.left)
      right_result = solve(node.right)
      return combine(node, left_result, right_result)
  
  This is postorder structure — process children first, then current node.
  Preorder: process node BEFORE recursing.

FOUR TRAVERSALS — RECURSIVE AND ITERATIVE:
  
  INORDER — Recursive:
    inorder(node, result):
      if null: return
      inorder(node.left, result)
      result.push(node.val)
      inorder(node.right, result)
  
  INORDER — Iterative (stack):
    stack = [], curr = root
    while curr OR stack not empty:
      while curr:              // Push all left nodes
        stack.push(curr)
        curr = curr.left
      curr = stack.pop()       // Process current
      result.push(curr.val)
      curr = curr.right        // Move to right subtree
  
  PREORDER — Iterative (stack):
    stack = [root]
    while stack not empty:
      node = stack.pop()
      result.push(node.val)    // Process BEFORE children
      if node.right: stack.push(node.right)  // Right first (LIFO: left processed first)
      if node.left: stack.push(node.left)
  
  POSTORDER — Iterative (two stacks or reverse of modified preorder):
    stack1 = [root], stack2 = []
    while stack1 not empty:
      node = stack1.pop()
      stack2.push(node)       // Collect in reverse
      if node.left: stack1.push(node.left)
      if node.right: stack1.push(node.right)
    return stack2 reversed  // postorder result
  
  LEVEL-ORDER (BFS with queue):
    queue = [root]
    while queue not empty:
      level_size = queue.length
      for i in range(level_size):   // Process exactly one level
        node = queue.shift()
        result.push(node.val)
        if node.left: queue.push(node.left)
        if node.right: queue.push(node.right)

BST VALIDATION — THE RANGE APPROACH:
  Common wrong approach: check node.left.val < node.val < node.right.val
  Fails for:        10
                   /  \\
                  5    15
                 / \\
                3    8  ← 8 < 10, but this checks only against parent (5), not grandparent (10)
                Wait, 8 < 10 so this IS valid. But:
                        10
                       /
                      5
                     / \\
                    3   12  ← 12 > 5 (local check passes) but 12 > 10 (root) → INVALID BST!
  
  Correct approach: pass [min, max] range down:
    validate(node, min = -∞, max = +∞):
      if null: return true
      if node.val <= min OR node.val >= max: return false
      return validate(node.left, min, node.val) AND  // Left: max becomes parent's val
             validate(node.right, node.val, max)     // Right: min becomes parent's val

LOWEST COMMON ANCESTOR (LCA):
  For general binary tree:
  lca(root, p, q):
    if root is null: return null         // Base: nothing here
    if root is p OR root is q: return root  // Base: found one of them
    
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    
    if left AND right: return root       // p in left subtree, q in right → root is LCA
    return left OR right                 // One subtree has both, or neither
  
  For BST (more efficient — use BST property):
  lca_bst(root, p, q):
    if p.val < root.val AND q.val < root.val: return lca_bst(root.left, p, q)  // Both in left
    if p.val > root.val AND q.val > root.val: return lca_bst(root.right, p, q) // Both in right
    return root  // Split point — root is LCA

BINARY SEARCH — CANONICAL TEMPLATE (avoids off-by-one errors):
  // Find leftmost position where condition(mid) is true
  lo = 0, hi = n - 1
  while lo < hi:
    mid = lo + Math.floor((hi - lo) / 2)  // Avoid integer overflow
    if condition(mid):
      hi = mid     // mid might be the answer, don't exclude it
    else:
      lo = mid + 1 // mid definitely not the answer
  return lo  // lo === hi: the answer

  // Find rightmost position where condition(mid) is true
  lo = 0, hi = n - 1
  while lo < hi:
    mid = lo + Math.ceil((hi - lo) / 2)  // Round up to avoid infinite loop
    if condition(mid):
      lo = mid     // mid might be the answer
    else:
      hi = mid - 1
  return lo

BINARY SEARCH ON ANSWER SPACE:
  For problems of the form: "Find minimum X such that f(X) is possible"
  The answer space [lo, hi] satisfies: f(lo) = false, f(hi) = true, monotone.
  
  Template:
    lo = minimum_possible_answer
    hi = maximum_possible_answer
    while lo < hi:
      mid = lo + Math.floor((hi - lo) / 2)
      if canAchieve(mid):  // Is mid sufficient?
        hi = mid           // Try smaller
      else:
        lo = mid + 1       // Need larger
    return lo  // Minimum value that works
    `,
    code: `
// ===== TREES & BINARY SEARCH — CODE EXAMPLES =====

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

// Helper: Build tree from level-order array (null = missing node)
function buildTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (i < arr.length) {
    const node = queue.shift();
    if (arr[i] !== null && arr[i] !== undefined) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// EXAMPLE 1: All Four Traversals — Recursive and Iterative
// Tree: [1, 2, 3, 4, 5, null, 7]
const tree = buildTree([1, 2, 3, 4, 5, null, 7]);

// Inorder (Left → Root → Right): produces sorted order for BST
function inorder(root) {
  const result = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    result.push(node.val);
    dfs(node.right);
  }
  dfs(root);
  return result;
}

// Inorder — ITERATIVE (stack)
function inorderIterative(root) {
  const result = [], stack = [];
  let curr = root;
  
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; } // Push all lefts
    curr = stack.pop();          // Process leftmost unprocessed
    result.push(curr.val);
    curr = curr.right;           // Move to right subtree
  }
  return result;
}

console.log(inorder(tree));           // [4, 2, 5, 1, 3, 7]
console.log(inorderIterative(tree));  // [4, 2, 5, 1, 3, 7] — same!

// Level-order BFS (returns array of levels)
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  
  while (queue.length) {
    const levelSize = queue.length; // Snapshot: process only THIS level
    const level = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

console.log(levelOrder(tree)); // [[1], [2,3], [4,5,7]]

// EXAMPLE 2: BST Validation with Range Passing
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false; // Out of range
  
  return isValidBST(root.left, min, root.val) &&   // Left: max = current val
         isValidBST(root.right, root.val, max);    // Right: min = current val
}

const validBST = buildTree([5, 3, 7, 1, 4, 6, 8]);
const invalidBST = buildTree([5, 3, 7, 1, 6]);  // 6 is in left subtree of 7, but > 5 (root)
console.log(isValidBST(validBST));   // true
console.log(isValidBST(invalidBST)); // false (6 > 5 root, shouldn't be in left subtree)

// EXAMPLE 3: Lowest Common Ancestor
// General binary tree LCA
function lowestCommonAncestor(root, p, q) {
  if (!root) return null;
  if (root.val === p || root.val === q) return root;
  
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  
  if (left && right) return root; // p and q in different subtrees → root is LCA
  return left || right;           // Both in same subtree (or one not found)
}

const lcaTree = buildTree([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]);
console.log(lowestCommonAncestor(lcaTree, 5, 1)?.val); // 3 (root)
console.log(lowestCommonAncestor(lcaTree, 5, 4)?.val); // 5

// BST LCA (more efficient — use BST property)
function lcaBST(root, p, q) {
  while (root) {
    if (p < root.val && q < root.val) root = root.left;   // Both in left
    else if (p > root.val && q > root.val) root = root.right; // Both in right
    else return root; // Split point — LCA found
  }
  return null;
}

// EXAMPLE 4: Tree DP — Maximum Path Sum
// Find the path (any node to any node) with maximum sum
function maxPathSum(root) {
  let globalMax = -Infinity;
  
  function maxGain(node) {
    if (!node) return 0;
    
    // Max gain from left and right (ignore negative paths with Math.max(0, ...))
    const leftGain = Math.max(0, maxGain(node.left));
    const rightGain = Math.max(0, maxGain(node.right));
    
    // Path through this node (connecting left + node + right)
    const pathThroughNode = node.val + leftGain + rightGain;
    globalMax = Math.max(globalMax, pathThroughNode);
    
    // Return: max gain if we CONTINUE upward (can only go one direction)
    return node.val + Math.max(leftGain, rightGain);
  }
  
  maxGain(root);
  return globalMax;
}

console.log(maxPathSum(buildTree([-10, 9, 20, null, null, 15, 7]))); // 42 (15+20+7)

// EXAMPLE 5: Classic Binary Search — Find exact target
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;
  
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // Avoids integer overflow
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  
  return -1; // Not found
}

// Find first and last position (binary search on boundaries)
function searchRange(nums, target) {
  function findLeft() {
    let lo = 0, hi = nums.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (nums[mid] < target) lo = mid + 1;
      else hi = mid; // nums[mid] >= target: hi shrinks, but mid could be the answer
    }
    return lo; // First position where nums[lo] >= target
  }
  
  function findRight() {
    let lo = 0, hi = nums.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (nums[mid] <= target) lo = mid + 1; // target is to the right
      else hi = mid;
    }
    return lo - 1; // Last position where nums[lo-1] === target
  }
  
  const left = findLeft();
  if (left === nums.length || nums[left] !== target) return [-1, -1];
  return [left, findRight()];
}

console.log(searchRange([5, 7, 7, 8, 8, 10], 8)); // [3, 4]
console.log(searchRange([5, 7, 7, 8, 8, 10], 6)); // [-1, -1]

// EXAMPLE 6: Binary Search on Answer Space
// Koko eating bananas: find minimum eating speed to finish all piles in H hours
// Scenario: Priya needs to process all customer batches within the deadline

function minEatingSpeed(piles, h) {
  // Answer space: [1, max(piles)]
  // At speed = max(piles): eat each pile in 1 hour → min hours = piles.length ≤ h
  // At speed = 1: need sum(piles) hours (might exceed h)
  
  function canFinish(speed) {
    // With this speed, can Koko finish in ≤ h hours?
    let hoursNeeded = 0;
    for (const pile of piles) {
      hoursNeeded += Math.ceil(pile / speed); // Hours to eat this pile
    }
    return hoursNeeded <= h;
  }
  
  let lo = 1;
  let hi = Math.max(...piles);
  
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canFinish(mid)) hi = mid;   // Speed mid works, try smaller
    else lo = mid + 1;              // Speed mid too slow, need faster
  }
  
  return lo; // Minimum speed that works
}

console.log(minEatingSpeed([3, 6, 7, 11], 8)); // 4

// Minimum capacity to ship packages within D days
function shipWithinDays(weights, days) {
  function canShip(capacity) {
    let daysNeeded = 1, currentLoad = 0;
    for (const w of weights) {
      if (currentLoad + w > capacity) { daysNeeded++; currentLoad = 0; }
      currentLoad += w;
    }
    return daysNeeded <= days;
  }
  
  let lo = Math.max(...weights); // Minimum: must fit heaviest package
  let hi = weights.reduce((a, b) => a + b, 0); // Maximum: ship all in one day
  
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canShip(mid)) hi = mid;
    else lo = mid + 1;
  }
  
  return lo;
}

console.log(shipWithinDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)); // 15

// EXAMPLE 7: Diameter of Binary Tree (postorder DP)
function diameterOfBinaryTree(root) {
  let maxDiameter = 0;
  
  function height(node) {
    if (!node) return 0;
    const leftH = height(node.left);
    const rightH = height(node.right);
    maxDiameter = Math.max(maxDiameter, leftH + rightH); // Diameter through this node
    return 1 + Math.max(leftH, rightH); // Height contribution to parent
  }
  
  height(root);
  return maxDiameter;
}

console.log(diameterOfBinaryTree(buildTree([1, 2, 3, 4, 5]))); // 3 (path: 4-2-1-3 or 5-2-1-3)
    `,
    bugs: `
REAL PRODUCTION BUGS FROM TREE/BINARY SEARCH MISUNDERSTANDING:
---------------------------------------------------------------

BUG 1: BST insertion not maintaining invariant — accepting values on wrong side
  Scenario: Custom BST for an in-memory index. Range queries returned wrong results.
  Wrong code:
    function insert(node, val) {
      if (!node) return new TreeNode(val);
      if (val < node.val) node.right = insert(node.right, val); // BUG: should be left!
      else node.left = insert(node.left, val);                  // BUG: should be right!
      return node;
    }
  Result: Tree inverted — inorder traversal returns descending instead of ascending.
  Fix: if (val < node.val) node.left = insert(node.left, val)

BUG 2: Integer overflow in binary search midpoint calculation
  Scenario: Binary search on a dataset with indices up to 2 billion (large file system).
    Produced negative midpoints and infinite loops in C++/Java. In JavaScript (float64): 
    precision loss for very large numbers, unpredictable behavior.
  Wrong code: const mid = Math.floor((lo + hi) / 2);
    // lo = 2_000_000_000, hi = 2_000_000_001
    // lo + hi = 4_000_000_001 — exceeds 32-bit integer max in C/Java (wraps to negative!)
  Fix: const mid = lo + Math.floor((hi - lo) / 2);
    // (hi - lo) is small → no overflow. lo + small_number is safe.

BUG 3: Level-order BFS using array.shift() — O(n²) instead of O(n)
  Scenario: Building a report of all nodes by level for a tree with 100,000 nodes.
    Ran in ~30 seconds instead of expected milliseconds.
  Root cause: queue.shift() on a JavaScript array is O(n) — shifts all elements left.
    Total: O(n) nodes × O(n) shift per node = O(n²).
  Fix: Use a proper queue with head pointer, or two-array approach:
    let currentLevel = [root];
    while (currentLevel.length) {
      const nextLevel = [];
      for (const node of currentLevel) {  // for...of is O(n) for the level — safe
        result.push(node.val);
        if (node.left) nextLevel.push(node.left);
        if (node.right) nextLevel.push(node.right);
      }
      currentLevel = nextLevel; // No shift() needed!
    }

BUG 4: Binary search returning wrong boundary — off-by-one in lo/hi update
  Scenario: "Find first bad version" binary search in CI/CD system returning version AFTER
    the first bad version (reporting the problem started one version later than it actually did).
  Wrong code:
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (isBad(mid)) lo = mid;  // BUG: should be hi = mid (inclusive — mid could be answer)
      else lo = mid + 1;
    }
    // Infinite loop when lo = mid (lo never advances past first bad version)!
  Fix: if (isBad(mid)) hi = mid; // Keep mid as candidate answer, shrink from right

BUG 5: LCA returning null when one of the target nodes IS the ancestor
  Scenario: Employee hierarchy LCA feature — finding manager of two team members.
    When searching for LCA(p, q) where p is an ancestor of q, returned null.
  Root cause: Code checked node value against p and q, but the actual TreeNode objects 
    were used for comparison. After deserializing from database, node.val matched but 
    the objects were different instances — used === on objects instead of .val comparison.
  Wrong code:
    if (root === p || root === q) return root; // === compares references!
    // If p is a new TreeNode(5) but tree's node is also TreeNode(5) — different objects!
  Fix: if (root.val === p.val || root.val === q.val) return root;
    // Or ensure you pass the ACTUAL node references from the tree, not reconstructed ones.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE TRAVERSALS:
  Given this tree:
           4
          / \\
         2   6
        / \\ / \\
       1  3 5  7
  
  a) Write the output of inorder, preorder, postorder traversals.
  b) What data structure does inorder traversal of a BST produce?
  c) Level-order output? (list by level)
  d) If I tell you the preorder is [4,2,1,3,6,5,7] and inorder is [1,2,3,4,5,6,7],
     can you reconstruct the tree? Write the algorithm.

CHALLENGE 2 — FIX THE BINARY SEARCH:
  This binary search for square root (floor) has a subtle off-by-one bug.
  It works for most inputs but fails for perfect squares.
  
  function mySqrt(x) {
    let lo = 0, hi = x;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (mid * mid <= x) lo = mid;    // Bug: when mid² === x, lo = mid but never terminates!
      else hi = mid - 1;               // Infinite loop when lo === mid
    }
    return lo;
  }
  
  Test: mySqrt(4) should return 2. What does this return?
  Fix the off-by-one. Hint: think about when to use Math.ceil in the mid calculation,
  or restructure the condition.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Part A: Serialize and Deserialize a Binary Tree
  Design an algorithm that converts a tree to a string (serialize) and
  reconstructs the original tree from that string (deserialize).
  Must work for any binary tree (not just BST).
  Constraint: O(n) time for both operations.
  Hint: Preorder traversal with null markers works cleanly.
  
  Part B: Binary Search on Answer Space
  Given a sorted matrix (each row sorted, first element of each row > last element of previous row),
  find the position of a target value.
  
  Input: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
  Output: true (found at row 0, col 1)
  
  Key insight: treat the m×n matrix as a sorted array of length m×n.
  Virtual index i maps to: row = floor(i / n), col = i % n.
  Binary search on this virtual array.
  
  Implement with O(log(m×n)) time, O(1) space.
    `,
    summary: `Trees are the gateway to understanding recursion, divide-and-conquer, and graph algorithms — every tree problem is solved by deciding what to return up the recursion stack and how to combine left and right results. Binary search is not just for sorted arrays: whenever you can define a monotone condition function over an answer space, you can binary search for the optimal answer in O(log n) instead of O(n) brute force. Master the four traversals, BST validation with range passing, LCA, and the binary search template to unlock the majority of tree and search problems.`
  }
];
