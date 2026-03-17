const concepts = [
  {
    id: 1,
    title: "Why TypeScript Exists",
    tag: "THE ENGINE UNDER THE HOOD",
    color: "#E84B2E",
    tldr: "JavaScript lets you write anything and only tells you it's wrong at runtime — when real users hit the bug. TypeScript adds a compile-time layer that catches type mismatches before your code ever runs. It's not a new language; it's JavaScript with a safety net.",
    problem: `You've shipped a feature. Everything looks fine in testing. Then at 2am your phone rings — production is down because someone passed a string where a number was expected, and \`undefined.split(',')\` blew up for 40,000 users.

That's the core JavaScript problem: types only matter at runtime. JS will happily let you do \`[] + {}\` or call \`.toUpperCase()\` on \`null\`. No warning. No error. Just silent chaos.

The second problem is scale. When you're solo on a 500-line script, you remember what everything is. When you're on a team of 10 writing 200,000 lines across 3 years, you have zero memory of what \`processOrder(order, opts)\` actually expects. The function signature tells you nothing.

TypeScript solves both: it makes the shape of your data explicit, checks it at compile time, and becomes living documentation that never goes stale.`,
    analogy: `Imagine you're a contractor building houses. JavaScript is building without blueprints — you just start hammering. Sometimes it works out. Sometimes you get to the third floor and realise the staircase doesn't connect to anything.

TypeScript is having an architect draw blueprints first. The blueprint review catches the staircase problem on paper, before any concrete is poured. The building still gets built the same way — but the costly mistakes get caught at the design stage.

The blueprint is not the building. TypeScript types are not JavaScript runtime values. They exist only during design/compile time and are completely erased before the code runs. You're still shipping plain JavaScript — just JavaScript that was checked against a blueprint first.`,
    deep: `TypeScript is a STRUCTURAL type system, not nominal. In nominal systems (Java, C#), two types are the same only if they share the same name/declaration. In structural systems, two types are compatible if they have the same SHAPE — the same properties and methods.

\`\`\`
// Nominal (Java): This would FAIL — different class names
// Structural (TypeScript): This WORKS — same shape
type Point2D = { x: number; y: number }
type Coordinate = { x: number; y: number }
const p: Point2D = { x: 1, y: 2 }
const c: Coordinate = p  // ✅ TypeScript is fine with this
\`\`\`

TypeScript is INTENTIONALLY unsound in some places:
1. \`any\` — completely opts out of type checking. A necessary escape hatch, but dangerous.
2. Type assertions (\`as\`) — you override the compiler. You might be wrong.
3. \`as unknown as T\` — the double assertion, a lie to the compiler.
4. Function parameter bivariance in older settings — allows unsafe assignments.

The tsconfig.json knobs that matter most:
- \`"strict": true\` — enables ALL strict checks. Always use this on new projects.
- \`"noImplicitAny": true\` — disallows parameters/variables typed as \`any\` by inference.
- \`"strictNullChecks": true\` — \`null\` and \`undefined\` are NOT assignable to other types.
- \`"noUncheckedIndexedAccess": true\` — array[i] returns \`T | undefined\`, not just \`T\`.
- \`"exactOptionalPropertyTypes": true\` — distinguishes missing property from \`undefined\` value.

TypeScript's compilation cost is real: large monorepos can take minutes to type-check. Solutions: \`ts-project-references\`, \`isolatedModules\`, incremental compilation, or using \`tsc --noEmit\` only for CI checks while using esbuild/swc for fast dev builds (they strip types without checking).

Types as documentation: a function signature \`function transferFunds(from: AccountId, to: AccountId, amount: Rupees): Promise<TransactionResult>\` tells a new engineer everything they need to know — what goes in, what comes out, what units — without reading the implementation.`,
    code: `// ─── EXAMPLE 1: The classic JS runtime bug ───────────────────────────────
// JavaScript — no error until runtime
function getDiscount(price) {
  return price * 0.9
}
getDiscount("500")  // Returns "5000000000" (string repetition) — silent bug!

// ─── EXAMPLE 2: TypeScript catches it at compile time ────────────────────
function getDiscount(price: number): number {
  return price * 0.9
}
getDiscount("500")  
// TS Error: Argument of type 'string' is not assignable to parameter of type 'number'
// Caught BEFORE running. No users harmed.

// ─── EXAMPLE 3: Structural typing in action ──────────────────────────────
type Customer = { name: string; email: string }
type NewsletterSubscriber = { name: string; email: string; optedIn: boolean }

function sendEmail(to: Customer) {
  console.log(\`Sending to \${to.email}\`)
}

const subscriber: NewsletterSubscriber = {
  name: "Priya Sharma",
  email: "priya@example.com",
  optedIn: true
}

sendEmail(subscriber)  // ✅ Works — NewsletterSubscriber has all of Customer's shape

// ─── EXAMPLE 4: any vs unknown — the safe escape hatch ──────────────────
// BAD: any turns off all checks
function parseConfig(raw: any) {
  return raw.settings.theme  // No error even if raw is null — will blow up at runtime
}

// GOOD: unknown forces you to check before using
function parseConfig(raw: unknown) {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "settings" in raw
  ) {
    return (raw as { settings: { theme: string } }).settings.theme
  }
  throw new Error("Invalid config shape")
}

// ─── EXAMPLE 5: tsconfig strictness levels ──────────────────────────────
// With strictNullChecks: false (dangerous default in old projects)
function getUserName(id: number): string {
  // Could return null, but TS doesn't know — you get a runtime crash
  return db.find(id).name
}

// With "strict": true
function getUserName(id: number): string | null {
  const user = db.find(id)  // Returns User | null
  return user ? user.name : null  // Forced to handle the null case
}

// ─── EXAMPLE 6: Types as living documentation ────────────────────────────
// Bad — no types. What is opts? What does it return?
function placeOrder(items, opts) { ... }

// Good — types ARE the spec. No need to read the body.
type OrderItem = { productId: string; qty: number; pricePerUnit: Rupees }
type OrderOptions = { couponCode?: string; addressId: string; payOnDelivery: boolean }
type OrderResult = { orderId: string; estimatedDelivery: Date; totalCharged: Rupees }

function placeOrder(items: OrderItem[], opts: OrderOptions): Promise<OrderResult> { ... }`,
    bugs: `BUG 1 — The any escape hatch that swallowed the project
─────────────────────────────────────────────────────
A team migrated a JS project to TS and typed everything as \`any\` to "fix the errors quickly."
Six months later, a refactor renamed \`user.emailId\` to \`user.email\`. 
TypeScript didn't catch any of the 80 call sites — all were \`any\`. 
Prod broke. The whole migration was useless.

Fix: Use \`unknown\` instead of \`any\` for external data. Run \`eslint @typescript-eslint/no-explicit-any\`.

BUG 2 — Missing strictNullChecks
─────────────────────────────────
Without \`strictNullChecks\`, this compiles fine:
  const user: User = getUser(id)  // getUser can return null
  console.log(user.name)           // Runtime: Cannot read properties of null

Fix: Add \`"strict": true\` to tsconfig. All nullable returns must be \`User | null\`.

BUG 3 — Type assertion (as) lying to the compiler
──────────────────────────────────────────────────
const apiResponse = await fetch('/api/order').then(r => r.json()) as OrderResult
// The API changed and now returns { error: string } on failure
// The assertion silenced TS. Runtime: undefined.orderId crash.

Fix: Use a runtime validator (zod, io-ts) to actually verify the shape:
  const result = OrderResultSchema.parse(apiResponse)  // throws if shape is wrong

BUG 4 — Structural typing surprise: extra properties in object literals
────────────────────────────────────────────────────────────────────────
type Config = { timeout: number }
const cfg: Config = { timeout: 3000, retries: 3 }  // TS ERROR — excess property check

// But this works (structural typing — assigned via variable):
const opts = { timeout: 3000, retries: 3 }
const cfg: Config = opts  // ✅ No error — structural compatibility

This trips up beginners who don't understand that excess property checks 
only happen on fresh object literals, not on variables.

BUG 5 — Thinking TypeScript protects you at runtime
────────────────────────────────────────────────────
Types are ERASED before the code runs. This is valid TS and still crashes:
  function double(n: number) { return n * 2 }
  const raw = JSON.parse('{"amount":"500"}')  // typeof raw.amount is string at runtime
  double(raw.amount)  // TS says fine (it's typed as any from JSON.parse). Runtime: NaN.

Fix: Validate external data at the boundary with runtime checks or schema parsers.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
type A = { x: number }
type B = { x: number; y: string }
const b: B = { x: 1, y: "hello" }
const a: A = b
console.log(a)

Q: Does this compile? What does \`a\` contain at runtime? Why does TypeScript allow this?
Answer: Yes, it compiles. \`a\` contains \`{ x: 1, y: "hello" }\` — structural typing means B satisfies A's shape. The extra property is there at runtime even though the type says it shouldn't be.

CHALLENGE 2 — Fix the bug
──────────────────────────
// This code has 3 TypeScript issues. Find and fix them.
// tsconfig has strict: true

function calculateGST(amount, gstRate) {
  const tax = amount * gstRate
  return { amount, tax, total: amount + tax }
}

const invoice = calculateGST("1000", 0.18)
console.log(invoice.total.toFixed(2))

// Hints: parameter types, return type annotation, calling with wrong type

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Create a strictly typed \`config loader\` that:
1. Reads an \`unknown\` value (simulating JSON.parse output)
2. Validates it has \`{ apiUrl: string; timeout: number; retries?: number }\`
3. Returns a typed \`AppConfig\` object or throws a descriptive error
4. Has a tsconfig with strict, noImplicitAny, strictNullChecks all true
Bonus: add a \`readonly\` modifier so the config can't be mutated after loading`,
    summary: "TypeScript exists to move type errors from your users' browsers to your editor — and to make the shape of your data the first-class citizen it should always have been. The types are the documentation, the tests, and the contract all in one."
  },

  {
    id: 2,
    title: "Type vs Interface",
    tag: "SHAPES AND CONTRACTS",
    color: "#2E86E8",
    tldr: "Both `type` and `interface` describe object shapes, but they're not identical. Interfaces are designed for defining and extending object contracts — they support declaration merging. Type aliases are more flexible — they can describe unions, primitives, tuples, and mapped types. Use interface for things you extend; type for everything else.",
    problem: `Every TypeScript developer hits this question early: should I use \`type\` or \`interface\`? The wrong choice isn't catastrophic, but misunderstanding the difference causes real friction.

The most surprising difference: interfaces support DECLARATION MERGING — you can define the same interface twice and TypeScript merges the definitions. Type aliases don't do this. If you accidentally redeclare a type alias, it's a compile error.

The second pain point: extends vs intersections (&) behave differently for conflicting property types. With \`extends\`, conflicting properties are a compile error. With \`&\`, they get intersected — which can produce \`never\` silently.

The practical impact: if you're augmenting a library's types (adding properties to Express's \`Request\`, for example), you MUST use interface — because declaration merging is the only mechanism that allows it. Type aliases won't work here.`,
    analogy: `Think of an \`interface\` as an official contract template at a law firm. The firm can issue addendums — new pages that add clauses to the original contract without replacing it. That's declaration merging. Multiple departments can add their own clauses to the same base contract.

A \`type\` alias is like a named sticky note. It's a label you put on a specific description. You can name complex descriptions — "this OR that OR the other" — which a contract template can't easily do. But you can't issue addendums to a sticky note; it is what it is.

Use the formal contract template (interface) when you're building something others will extend. Use the sticky note (type) when you need to name something complex — a union, a mapped type, a conditional — where a formal template would be overkill.`,
    deep: `DECLARATION MERGING — The killer feature of interfaces
─────────────────────────────────────────────────────
When you define an interface twice with the same name, TypeScript merges them into one. This is how you augment third-party library types:

\`\`\`typescript
// In express.d.ts (the library's types):
interface Request { ... }

// In your app's types/express/index.d.ts:
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser  // Adds your property to Express's Request
    }
  }
}
\`\`\`

This is impossible with type aliases — you'd get "Duplicate identifier" error.

EXTENDS vs INTERSECTION (&) — The subtle difference
─────────────────────────────────────────────────────
interface A { x: string }
interface B extends A { x: number }  // ERROR: Types of property 'x' are incompatible

type A = { x: string }
type B = A & { x: number }  // Compiles. But B.x is \`string & number\` = \`never\`
// You can declare a variable of type B but can never satisfy it — silent impossibility

READONLY AND OPTIONAL — Both work identically
─────────────────────────────────────────────
Both type and interface support:
- Optional properties: \`name?: string\` (property may be absent)
- Readonly: \`readonly id: string\` (can't be reassigned after creation)
- Index signatures: \`[key: string]: number\` (any string key maps to number)

INDEX SIGNATURES — The footgun
───────────────────────────────
interface StringMap {
  [key: string]: string
  name: string   // OK — assignable to string
  count: number  // ERROR — number is not assignable to string
}
// All named properties must be assignable to the index signature value type

WHEN TO USE WHICH — Practical rules:
- Public API / library types → interface (allows consumers to augment)
- Union types: \`type Result = Success | Failure\` → must use type
- Tuple types: \`type Point = [number, number]\` → must use type
- Mapped types: \`type Nullable<T> = { [K in keyof T]: T[K] | null }\` → must use type
- Function types: both work, but type reads more naturally
- Everything else → interface by convention (many style guides prefer this)`,
    code: `// ─── EXAMPLE 1: Basic interface vs type ─────────────────────────────────
interface UserInterface {
  id: string
  name: string
  email: string
}

type UserType = {
  id: string
  name: string
  email: string
}

// For simple objects like this — they're identical in usage
const u1: UserInterface = { id: "1", name: "Arjun", email: "a@x.com" }
const u2: UserType = { id: "1", name: "Arjun", email: "a@x.com" }

// ─── EXAMPLE 2: What ONLY type aliases can do ────────────────────────────
// Union type — can't do this with interface
type PaymentStatus = "pending" | "success" | "failed" | "refunded"

// Tuple type — can't do this with interface
type LatLng = [number, number]
const mumbai: LatLng = [19.076, 72.877]

// Primitive alias — can't do this with interface
type Rupees = number
type UserId = string

// Mapped type — can't do this with interface
type AllOptional<T> = { [K in keyof T]?: T[K] }

// ─── EXAMPLE 3: What ONLY interface can do — declaration merging ──────────
interface Product {
  id: string
  name: string
}

// Same interface, defined again — TypeScript MERGES these
interface Product {
  price: number
  category: string
}

// Result: Product now has id, name, price, category
const item: Product = {
  id: "P001",
  name: "Basmati Rice 5kg",
  price: 450,
  category: "Groceries"
}

// ─── EXAMPLE 4: extends vs intersection — spot the difference ────────────
interface Vehicle {
  speed: number
}
interface Car extends Vehicle {
  brand: string
}
// Car = { speed: number; brand: string }
// Clean, readable, and errors immediately if types conflict

type Engine = { horsepower: number }
type ElectricCar = Engine & { batteryKwh: number }
// ElectricCar = { horsepower: number; batteryKwh: number }
// Intersections work great when there's no conflict

// ─── EXAMPLE 5: Readonly and optional ────────────────────────────────────
interface OrderLine {
  readonly orderId: string    // Can't be changed after creation
  productName: string
  qty: number
  discount?: number           // Optional — may not be present
}

const line: OrderLine = {
  orderId: "ORD-2024-001",
  productName: "Laptop",
  qty: 1
}
// line.orderId = "other"  // ERROR: Cannot assign to 'orderId' — it's readonly

// ─── EXAMPLE 6: Index signatures ─────────────────────────────────────────
interface PincodeMap {
  [pincode: string]: string   // Any string key → string value
}
const cities: PincodeMap = {
  "400001": "Mumbai",
  "110001": "New Delhi",
  "560001": "Bengaluru"
}

// ─── EXAMPLE 7: Extending for API layers ─────────────────────────────────
interface BaseEntity {
  readonly id: string
  createdAt: Date
  updatedAt: Date
}

interface Customer extends BaseEntity {
  name: string
  phone: string
  tier: "silver" | "gold" | "platinum"
}

interface Order extends BaseEntity {
  customerId: string
  items: OrderLine[]
  totalAmount: Rupees
}`,
    bugs: `BUG 1 — Accidentally creating a \`never\` type with intersection
──────────────────────────────────────────────────────────────
type Old = { status: string }
type New = Old & { status: number }
// New.status is \`string & number\` = never
// You can declare the type but can never create a valid value
// No compile error until you try to assign status — confusing!

Fix: Use interface extends to catch the conflict immediately as an error.

BUG 2 — Using type alias when library augmentation is needed
─────────────────────────────────────────────────────────────
// Someone adds JWT user to Express Request using a type alias:
type Request = ExpressRequest & { user: JWTPayload }
// This doesn't augment Express — it creates a new local type
// All existing Express middleware still sees the original Request without user
// req.user is undefined at runtime, TypeScript says it exists

Fix: Use interface declaration merging in a .d.ts file inside the global Express namespace.

BUG 3 — Declaration merging surprise in tests
──────────────────────────────────────────────
// file: types.ts
interface Config { debug: boolean }

// file: test-utils.ts  (imported in tests)
interface Config { mockMode: boolean }  // Merges! Now Config requires BOTH fields

// All existing Config objects in production code now have a type error
// because mockMode is required. Confusing — the merge happened invisibly.

Fix: Use module augmentation carefully. Scope test-only additions to test files.
     Or use type aliases for types that should NEVER be merged.

BUG 4 — Optional vs missing vs undefined
────────────────────────────────────────
interface Settings {
  darkMode?: boolean
}
const s: Settings = {}

// With exactOptionalPropertyTypes: true in tsconfig:
s.darkMode = undefined  // ERROR — optional means absent, not set to undefined
s.darkMode = true       // OK

// Without exactOptionalPropertyTypes (default), both are fine
// This causes bugs when you check \`if (s.darkMode !== undefined)\` 
// and miss the \`false\` case

Fix: Enable exactOptionalPropertyTypes in tsconfig for strictest correctness.

BUG 5 — Readonly doesn't protect nested objects
────────────────────────────────────────────────
interface Config {
  readonly db: { host: string; port: number }
}
const cfg: Config = { db: { host: "localhost", port: 5432 } }

cfg.db = { host: "other", port: 3306 }  // ERROR ✅ caught
cfg.db.port = 9999                       // No error ⚠️ — readonly is shallow!

Fix: Use \`Readonly<T>\` recursively or deep-freeze at runtime for true immutability.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
interface Animal { name: string }
interface Animal { sound: string }
type Pet = Animal

const dog: Pet = { name: "Bruno" }

Q: Does this compile? What does Animal look like? What error do you get and why?

Answer: Does NOT compile. Animal (after merging) requires both \`name\` and \`sound\`.
The object literal is missing \`sound\`. This demonstrates that declaration merging
affects ALL references to the interface, including the Pet type alias.

CHALLENGE 2 — Fix the bugs
────────────────────────────
// There are 3 issues with this code. Find and fix them.

type ApiResponse = {
  data: unknown
  status: number
}

type ApiResponse = ApiResponse & {
  cached: boolean
}

interface PaginatedResponse extends ApiResponse {
  page: number
  total: number
  status: "ok" | "error"  // override status to string union
}

const res: PaginatedResponse = {
  data: [],
  status: "ok",
  cached: false,
  page: 1,
  total: 100
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Model a multi-tier e-commerce product system:
1. A base \`BaseProduct\` interface with id, name, price (Rupees), createdAt
2. A \`PhysicalProduct\` that extends it with weight (grams), dimensions, shippingClass
3. A \`DigitalProduct\` that extends it with downloadUrl, licenseType, maxDownloads?
4. A \`ProductVariant\` type that is a union of the two
5. A \`ProductCatalog\` as a Record mapping product IDs to ProductVariant
6. Make all base fields readonly. Make name and price required, everything else optional where it makes sense.`,
    summary: "Use interface when you're defining object shapes that others will extend or augment — it's built for that. Use type when you need unions, tuples, mapped types, or anything that isn't a plain extensible object shape. The rule isn't arbitrary: it follows the structural purpose each construct was designed for."
  },

  {
    id: 3,
    title: "Generics",
    tag: "WRITE ONCE, TYPE FOR ALL",
    color: "#27AE60",
    tldr: "Generics let you write a function or class once and have it work correctly with many different types — without losing type safety. Instead of using `any` (which erases all type info), generics preserve and thread the type through. Think of them as type-level variables.",
    problem: `Without generics, you face an impossible choice: write the same function 10 times for 10 different types, or use \`any\` and lose all type safety.

The classic example: \`Array.prototype.map\`. It needs to work on arrays of numbers, arrays of strings, arrays of User objects, arrays of anything. Without generics, you'd need \`mapNumbers\`, \`mapStrings\`, \`mapUsers\`... or just \`any[]\` everywhere, which defeats the entire purpose of TypeScript.

The second problem generics solve is type THREADING — passing a type through multiple layers. If you have a typed \`fetch\` wrapper that returns \`Promise<ApiResponse<T>>\`, the \`T\` threads from your call site all the way through to the resolved value. Without generics, every \`fetch\` call returns \`any\` and you're back to guessing.

Real-world pain: typed repositories, typed event emitters, typed React state, typed form handlers — all of these need generics to be both reusable AND type-safe.`,
    analogy: `Think of generics like a stamping machine at a factory. The machine is built once and can stamp any material — metal, plastic, rubber. You feed it the material and it produces a stamped output of the SAME material. You don't need a separate machine for each material.

The generic parameter \`T\` is the "slot" where you put the material type. \`function wrap<T>(value: T): Box<T>\` — the machine takes any value, wraps it in a box, and the box is the same type as what you put in. Put in a number, get a Box<number>. Put in a User, get a Box<User>.

Constraints (\`T extends Something\`) are the safety guards on the machine — "this slot only accepts materials that are at least 3mm thick." You still have flexibility, but you've guaranteed a minimum requirement.`,
    deep: `TYPE INFERENCE — When you don't need to annotate
──────────────────────────────────────────────────
TypeScript infers generic parameters from arguments most of the time:
\`\`\`
function identity<T>(x: T): T { return x }
identity(42)         // T inferred as number
identity("Namaste")  // T inferred as string
identity([1,2,3])    // T inferred as number[]
\`\`\`
You only need to explicitly provide T when inference would be too broad or ambiguous.

GENERIC CONSTRAINTS
───────────────────
\`T extends object\` — T must be a non-primitive
\`T extends keyof U\` — T must be a key of U (string literal union of U's keys)
\`T extends { id: string }\` — T must have at least an id: string property
Multiple constraints: \`T extends A & B\`

THE KEYOF + GENERICS PATTERN — Used everywhere in real code
─────────────────────────────────────────────────────────────
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
// T[K] is the type OF the value at key K in T
// This is how lodash.get, form libraries, and ORM field selectors work

DEFAULT GENERIC PARAMETERS
───────────────────────────
type ApiResponse<T = unknown> = { data: T; status: number }
// T defaults to unknown if not specified
const res: ApiResponse = { data: null, status: 200 }  // T is unknown
const typed: ApiResponse<User[]> = { data: users, status: 200 }

CONDITIONAL TYPES — Advanced
──────────────────────────────
type IsArray<T> = T extends any[] ? "yes" : "no"
type A = IsArray<string[]>  // "yes"
type B = IsArray<string>    // "no"

INFER keyword — extracting types
──────────────────────────────────
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type A = UnwrapPromise<Promise<string>>  // string
type B = UnwrapPromise<number>           // number (not a promise, returns as-is)`,
    code: `// ─── EXAMPLE 1: The problem generics solve ──────────────────────────────
// Without generics — you lose type info
function wrapInArray_unsafe(item: any): any[] {
  return [item]
}
const nums = wrapInArray_unsafe(42)   // any[] — lost the number type!

// With generics — type is preserved
function wrapInArray<T>(item: T): T[] {
  return [item]
}
const nums2 = wrapInArray(42)         // number[] ✅
const strs = wrapInArray("Namaste")   // string[] ✅

// ─── EXAMPLE 2: Generic function with inference ──────────────────────────
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}
const firstUser = first([{ name: "Rahul" }, { name: "Neha" }])
// firstUser is { name: string } | undefined — fully typed, no annotation needed

// ─── EXAMPLE 3: Generic constraints ─────────────────────────────────────
interface HasId {
  id: string
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id)
}

type Order = { id: string; amount: number; customerId: string }
const orders: Order[] = [
  { id: "ORD001", amount: 1500, customerId: "C1" },
  { id: "ORD002", amount: 4200, customerId: "C2" }
]

const found = findById(orders, "ORD001")
// found is Order | undefined — full type info preserved

// ─── EXAMPLE 4: keyof + generics — safe property accessor ───────────────
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key])
}

type Product = { id: string; name: string; price: number }
const products: Product[] = [
  { id: "P1", name: "Rice", price: 120 },
  { id: "P2", name: "Dal", price: 95 }
]

const names = pluck(products, "name")    // string[] ✅
const prices = pluck(products, "price")  // number[] ✅
// pluck(products, "weight")             // ERROR — "weight" not in Product ✅

// ─── EXAMPLE 5: Generic class — typed repository ─────────────────────────
class Repository<T extends HasId> {
  private store: Map<string, T> = new Map()

  save(entity: T): void {
    this.store.set(entity.id, entity)
  }

  findById(id: string): T | undefined {
    return this.store.get(id)
  }

  findAll(): T[] {
    return Array.from(this.store.values())
  }

  delete(id: string): boolean {
    return this.store.delete(id)
  }
}

type Customer = HasId & { name: string; phone: string }
const customerRepo = new Repository<Customer>()
customerRepo.save({ id: "C1", name: "Anjali Verma", phone: "9876543210" })
const anjali = customerRepo.findById("C1")  // Customer | undefined ✅

// ─── EXAMPLE 6: Typed fetch wrapper ──────────────────────────────────────
async function typedFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json() as Promise<T>
}

type Invoice = { invoiceId: string; amount: number; dueDate: string }
// Note: runtime validation (zod) should be added for production use
const invoice = await typedFetch<Invoice>('/api/invoices/INV-001')
// invoice is Invoice — fully typed ✅

// ─── EXAMPLE 7: Generic Stack with default parameter ─────────────────────
class Stack<T = unknown> {
  private items: T[] = []

  push(item: T): this {
    this.items.push(item)
    return this
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1]
  }

  get size(): number {
    return this.items.length
  }
}

const numStack = new Stack<number>()
numStack.push(10).push(20).push(30)
const top = numStack.pop()  // number | undefined ✅`,
    bugs: `BUG 1 — Using any[] instead of T[] and losing types downstream
──────────────────────────────────────────────────────────────
function sortByDate(items: any[]): any[] {
  return items.sort((a, b) => a.date - b.date)
}
const sorted = sortByDate(orders)
// sorted is any[] — all type info for Order is gone
// sorted[0].amount is any — no autocomplete, no error checking

Fix:
function sortByDate<T extends { date: Date }>(items: T[]): T[] {
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

BUG 2 — Overconstrained generic (T extends object when any type would work)
────────────────────────────────────────────────────────────────────────────
function log<T extends object>(value: T): void {
  console.log(JSON.stringify(value))
}
log(42)      // ERROR — number is not an object
log("hello") // ERROR — string is not an object

Fix: Remove unnecessary constraint. Use \`T\` if you don't actually need object properties.

BUG 3 — Generic class with shared state (static + generics)
─────────────────────────────────────────────────────────────
class Cache<T> {
  private static data: Map<string, any> = new Map()  // BAD: static + any
  set(key: string, val: T) { Cache.data.set(key, val) }
  get(key: string): T | undefined { return Cache.data.get(key) }
}

const userCache = new Cache<User>()
const orderCache = new Cache<Order>()
userCache.set("k1", { name: "Ravi" } as User)
const oops = orderCache.get("k1")  // Returns User but typed as Order | undefined!
// Static storage is SHARED across all Cache<T> instances — type lie!

Fix: Use instance-level Map (private data = new Map<string, T>()) not static.

BUG 4 — Type widening in generic inference
───────────────────────────────────────────
function makeArray<T>(...items: T[]): T[] {
  return items
}
const arr = makeArray(1, 2, "three")  // T inferred as string | number
// This compiles! But you probably wanted makeArray<number> to fail on "three"

Fix: Explicitly annotate: makeArray<number>(1, 2, "three") — now TS errors on "three".

BUG 5 — Forgetting that generics don't survive JSON serialization
──────────────────────────────────────────────────────────────────
class TypedStorage<T> {
  save(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value))
  }
  load(key: string): T {
    return JSON.parse(localStorage.getItem(key) || "null")
  }
}
// load() returns T — but it's actually whatever JSON.parse produces
// Dates become strings, class instances become plain objects
// The generic is a TYPE LIE for load()

Fix: Add a parser/reviver parameter: load(key: string, parse: (raw: unknown) => T): T`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
function merge<T, U>(a: T, b: U): T & U {
  return { ...a, ...b } as T & U
}

const result = merge({ name: "Pooja" }, { score: 95, name: "Aisha" })
console.log(result.name)

Q: What is the TypeScript type of result? What is the runtime value of result.name?
   Why might the type be misleading here?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// 3 issues. Identify and fix.

class EventEmitter<Events> {
  private handlers: { [K in keyof Events]: Function[] } = {}

  on(event: keyof Events, handler: Function): void {
    if (!this.handlers[event]) this.handlers[event] = []
    this.handlers[event].push(handler)
  }

  emit(event: keyof Events, payload: any): void {
    this.handlers[event]?.forEach(h => h(payload))
  }
}

type AppEvents = {
  userLogin: { userId: string }
  orderPlaced: { orderId: string; amount: number }
}

const emitter = new EventEmitter<AppEvents>()
emitter.on("userLogin", (e) => console.log(e.userId))
emitter.emit("userLogin", { userId: "U1" })

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a fully typed \`Result<T, E>\` type (like Rust's Result):
1. \`Result<T, E>\` is either \`Ok<T>\` (success with value) or \`Err<E>\` (failure with error)
2. Write \`ok<T>(value: T): Ok<T>\` and \`err<E>(error: E): Err<E>\` constructors
3. Write a generic \`map<T, U, E>(result: Result<T, E>, fn: (val: T) => U): Result<U, E>\`
4. Write a generic \`unwrapOr<T, E>(result: Result<T, E>, fallback: T): T\`
5. Test it: wrap a division function that returns \`Err\` if divisor is 0, \`Ok\` otherwise`,
    summary: "Generics are the mechanism that makes TypeScript's type system actually scale — write a piece of logic once, and the type system ensures it's correct for every type you feed it. The moment you reach for `any` because 'it needs to work for multiple types,' that's the moment you need a generic instead."
  },

  {
    id: 4,
    title: "Union & Intersection Types",
    tag: "THIS OR THAT, THIS AND THAT",
    color: "#8E44AD",
    tldr: "Union types (`A | B`) mean a value can be one of several types — you must narrow before using type-specific properties. Intersection types (`A & B`) mean a value must satisfy ALL combined types simultaneously. Discriminated unions with exhaustive checking are one of TypeScript's most powerful patterns for modeling real-world state.",
    problem: `Real data isn't one clean type. An API response is either a success payload OR an error. A payment can be UPI, card, or cash on delivery. A form field is either filled or empty. Trying to model this with a single flat type leads to tons of optional properties — and no guarantee that the right ones are present together.

The classic mistake: making everything optional and hoping the combinations make sense.
\`\`\`
type Order = {
  status: string
  deliveredAt?: Date      // only makes sense when status = "delivered"  
  failureReason?: string  // only makes sense when status = "failed"
  trackingId?: string     // only makes sense when status = "shipped"
}
\`\`\`
TypeScript can't help you here. You can access \`deliveredAt\` on a "failed" order and TS won't complain.

Discriminated unions fix this: each variant has a shared discriminant field that uniquely identifies it, and TypeScript NARROWS the type based on that field.

The second pain point: narrowing. Union types require you to check which variant you're dealing with before accessing variant-specific properties. Forgetting to narrow, or narrowing incorrectly, is a common source of bugs.`,
    analogy: `Union types are like a package delivery that can arrive by bike, car, or drone. Before you interact with it, you check which vehicle delivered it — because bike deliveries have saddlebags, car deliveries have a trunk, drones have a payload bay. You can't just assume "trunk" without checking it's a car first. That check is narrowing.

Intersection types are like a job requirement: "Must have a CS degree AND 3+ years experience AND TypeScript expertise." The candidate must satisfy ALL conditions — not just one. An intersection type value has ALL the properties of all the constituent types.

Discriminated unions are like a hospital triage system: every patient gets a wristband with their status (emergency/routine/observation). Depending on the wristband color, the staff knows exactly which properties are guaranteed to be present on the chart.`,
    deep: `NARROWING — How TypeScript figures out which variant you have
─────────────────────────────────────────────────────────────
1. typeof: \`if (typeof x === "string")\` — narrows to string
2. instanceof: \`if (x instanceof Date)\` — narrows to Date
3. in operator: \`if ("name" in x)\` — narrows to types that have name
4. Discriminant property: \`if (x.type === "card")\` — narrows to the card variant
5. Custom type guards: \`function isUser(x: unknown): x is User { ... }\`

EXHAUSTIVE CHECKING WITH never
───────────────────────────────
The pattern of using \`never\` to verify you've handled all union cases at compile time:

\`\`\`
function assertNever(x: never): never {
  throw new Error(\`Unhandled case: \${JSON.stringify(x)}\`)
}

function processPayment(payment: Payment) {
  switch (payment.type) {
    case "upi": return handleUPI(payment)
    case "card": return handleCard(payment)
    case "cod": return handleCOD(payment)
    default: return assertNever(payment)  // ERROR if you add a new Payment type and forget this
  }
}
\`\`\`

When you add a new payment type later, the \`default: assertNever(payment)\` becomes a compile error — TypeScript tells you "you haven't handled 'wallet' case." This is exhaustive checking.

OPTIONAL CHAINING + UNION TYPES
────────────────────────────────
type User = { address?: { city: string; pincode: string } }
const city = user.address?.city  // string | undefined — safe even if address is undefined

NULLABLE TYPES AND strictNullChecks
─────────────────────────────────────
With strictNullChecks on, \`null\` and \`undefined\` are distinct types.
\`T | null\` — value or null (database nullable field)
\`T | undefined\` — value or not yet set (uninitialized state)
\`T | null | undefined\` — either (form input before submission)

The non-null assertion operator \`!\` tells TS "I know this isn't null/undefined" — use sparingly, it can crash at runtime if you're wrong.`,
    code: `// ─── EXAMPLE 1: Basic union — narrowing required ────────────────────────
function formatAmount(amount: number | string): string {
  if (typeof amount === "number") {
    return \`₹\${amount.toFixed(2)}\`   // amount is number here
  }
  return \`₹\${parseFloat(amount).toFixed(2)}\`  // amount is string here
}

console.log(formatAmount(1500))       // "₹1500.00"
console.log(formatAmount("2750.50"))  // "₹2750.50"

// ─── EXAMPLE 2: Discriminated union — the real power ─────────────────────
type UpiPayment = {
  type: "upi"
  vpa: string           // e.g. "rahul@paytm"
  amount: number
}

type CardPayment = {
  type: "card"
  last4: string
  network: "visa" | "mastercard" | "rupay"
  amount: number
}

type CashOnDelivery = {
  type: "cod"
  amount: number
  collectAt: "door" | "otp"
}

type Payment = UpiPayment | CardPayment | CashOnDelivery

function describePayment(payment: Payment): string {
  switch (payment.type) {
    case "upi":
      return \`UPI to \${payment.vpa} for ₹\${payment.amount}\`
      // payment.vpa is available here ✅, payment.last4 is not ✅
    case "card":
      return \`\${payment.network.toUpperCase()} card ****\${payment.last4} for ₹\${payment.amount}\`
    case "cod":
      return \`Cash ₹\${payment.amount} collected \${payment.collectAt === "otp" ? "via OTP" : "at door"}\`
  }
}

// ─── EXAMPLE 3: Exhaustive checking with never ───────────────────────────
function assertNever(x: never): never {
  throw new Error(\`Unhandled payment type: \${JSON.stringify(x)}\`)
}

function processPayment(payment: Payment): void {
  switch (payment.type) {
    case "upi": return processUPI(payment)
    case "card": return processCard(payment)
    case "cod": return processCOD(payment)
    default: return assertNever(payment)
    // If you add \`type WalletPayment\` to Payment union, this line becomes a compile ERROR
    // forcing you to handle the new case — zero runtime surprises
  }
}

// ─── EXAMPLE 4: Intersection type — combining shapes ─────────────────────
type Auditable = {
  createdBy: string
  createdAt: Date
  updatedBy: string
  updatedAt: Date
}

type SoftDeletable = {
  deletedAt: Date | null
  deletedBy: string | null
}

type BaseProduct = {
  id: string
  name: string
  price: number
}

// A production Product has ALL of these
type ProductRecord = BaseProduct & Auditable & SoftDeletable

// Now any function receiving ProductRecord gets all fields guaranteed
function archiveProduct(product: ProductRecord): ProductRecord {
  return {
    ...product,
    deletedAt: new Date(),
    deletedBy: "system",
    updatedAt: new Date(),
    updatedBy: "system"
  }
}

// ─── EXAMPLE 5: Type guards ──────────────────────────────────────────────
type ApiSuccess<T> = { ok: true; data: T }
type ApiError = { ok: false; error: string; code: number }
type ApiResult<T> = ApiSuccess<T> | ApiError

function isSuccess<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.ok === true
}

async function fetchUser(id: string): Promise<ApiResult<Customer>> {
  // ... implementation
}

const result = await fetchUser("C1")
if (isSuccess(result)) {
  console.log(result.data.name)   // Customer — fully typed ✅
} else {
  console.error(\`Error \${result.code}: \${result.error}\`)
}

// ─── EXAMPLE 6: Nullable types in practice ──────────────────────────────
interface CartItem {
  productId: string
  qty: number
  appliedCoupon: string | null  // null = no coupon, not "missing"
}

function getDiscount(item: CartItem): number {
  if (item.appliedCoupon === null) return 0
  // item.appliedCoupon is string here — narrowed away from null
  return lookupCouponDiscount(item.appliedCoupon)
}`,
    bugs: `BUG 1 — Accessing union property without narrowing
──────────────────────────────────────────────────
type Response = { status: "ok"; data: User[] } | { status: "error"; message: string }

function handle(res: Response) {
  console.log(res.data)  // ERROR: Property 'data' does not exist on type Response
  // TS correctly refuses — data only exists on the "ok" variant
}

Fix: Narrow first with \`if (res.status === "ok") { console.log(res.data) }\`

BUG 2 — The "string" discriminant that isn't discriminating
────────────────────────────────────────────────────────────
type Event = 
  | { type: string; payload: UserEvent }   // type is string — too broad!
  | { type: string; payload: OrderEvent }  // type is string — same!
  
// TypeScript can't narrow this — both variants have type: string
// switch(event.type) { case "user": ... } — TS doesn't know which payload type

Fix: Use LITERAL types as discriminants: \`type: "user"\` not \`type: string\`

BUG 3 — Intersection creates an impossible type
─────────────────────────────────────────────────
type A = { id: string }
type B = { id: number }
type C = A & B  // id is string & number = never
// Any property access on id is never — you can declare C but can never assign a real value

Fix: Rename conflicting properties before intersecting, or use interface extends (which errors immediately).

BUG 4 — Missing the null check with strictNullChecks
──────────────────────────────────────────────────────
function getCity(user: { address: { city: string } | null }): string {
  return user.address.city  // ERROR with strictNullChecks — address could be null
}

// Runtime crash when address is null in production
// But compiles fine without strictNullChecks — dangerous legacy code

Fix: \`return user.address?.city ?? "Unknown"\`

BUG 5 — Non-exhaustive union handling (the new variant bug)
─────────────────────────────────────────────────────────────
// 6 months ago you wrote this — worked fine with 2 payment types
function getPaymentIcon(type: "upi" | "card") {
  if (type === "upi") return "📱"
  return "💳"
}

// Today someone added "cod" to the Payment type union
// This function still compiles — it just returns "💳" for cod silently
// The COD orders show a credit card icon — wrong but not crashing

Fix: Use exhaustive switch with assertNever, or use an object map:
const icons: Record<Payment["type"], string> = { upi: "📱", card: "💳", cod: "📦" }
// Adding a new type to Payment now requires adding to this Record — compile error if missing`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
type A = { kind: "a"; val: number }
type B = { kind: "b"; val: string }
type C = A | B

function process(x: C) {
  if (x.kind === "a") {
    console.log(x.val * 2)
  } else {
    console.log(x.val.toUpperCase())
  }
}

process({ kind: "a", val: 21 })
process({ kind: "b", val: "namaste" })

Q: What are the outputs? What would happen if you removed the \`kind\` check and accessed \`x.val\` directly? Why does TypeScript allow \`x.val\` before narrowing in some cases?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This state machine has 3 TypeScript issues. Find and fix them.

type LoadingState = { status: "loading" }
type SuccessState = { status: "success", data: User[], total: number }
type ErrorState = { status: "error", message: string, retryable: boolean }
type State = LoadingState | SuccessState | ErrorState

function renderState(state: State): string {
  if (state.status === "loading") {
    return "Loading..."
  }
  if (state.status === "success") {
    return \`\${state.data.length} of \${state.total} users\`
  }
  // Missing error case — falls off the function without a return
  // No compile error by default — should use exhaustive check
}

const s: State = { status: "error", message: "Network error", retryable: true }
console.log(renderState(s).toUpperCase())  // Runtime crash!

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Model an order management system with these states:
- Pending: { orderId, customerId, items, createdAt }
- Confirmed: { orderId, customerId, items, confirmedAt, estimatedDelivery }
- Shipped: { orderId, customerId, items, confirmedAt, shippedAt, trackingId, carrier }
- Delivered: { orderId, customerId, items, confirmedAt, shippedAt, deliveredAt }
- Cancelled: { orderId, customerId, items, cancelledAt, reason, refundAmount }

Requirements:
1. Use discriminated unions with a \`status\` discriminant
2. Write a \`transitionOrder\` function that takes an order and moves it to the next state
3. Make invalid transitions (e.g. Delivered → Shipped) impossible at TYPE level
4. Add exhaustive checking so adding a new state forces you to handle it`,
    summary: "Union types model the reality that values have multiple valid shapes — and force you to check which shape you have before using it. Discriminated unions with exhaustive checking turn runtime bugs into compile-time errors, making impossible states actually impossible to represent."
  },

  {
    id: 5,
    title: "Utility Types",
    tag: "TYPESCRIPT'S BUILT-IN SUPERPOWERS",
    color: "#E67E22",
    tldr: "TypeScript ships with a library of generic utility types that transform existing types into new ones — making all properties optional, picking a subset, omitting sensitive fields, extracting return types from functions. These eliminate the need to manually redeclare modified versions of your types and keep your codebase DRY at the type level.",
    problem: `You've defined a \`User\` type with 12 fields. Now you need:
- An "update user" payload where all fields are optional
- A "public user" response that excludes password and internalNotes  
- A "user form" that only includes name, email, and phone
- A "user preview" that's readonly to prevent mutation

Without utility types, you redeclare four versions of User manually. When User changes, you update it in five places. Someone forgets to update the public type and password leaks into an API response.

Utility types solve this: derive all variants from the single source-of-truth User type. When User changes, all derived types automatically update — and TypeScript enforces it.

The second problem is working with functions generically: knowing the return type of a function you don't control, extracting parameter types for testing, unwrapping Promise types — all of this requires the function-introspection utility types (ReturnType, Parameters, Awaited).`,
    analogy: `Think of your base type as a master template at a print shop. Utility types are the transformations you can apply: crop it (Pick), cut parts out (Omit), make everything pencil-sketch/optional (Partial), ink it in fully/required (Required), laminate it for protection/readonly (Readonly).

You don't redraw the template for each variant — you start from the master and apply the transformation. The master changes once, and all variants update automatically.

The function introspection utilities (ReturnType, Parameters) are like reverse-engineering tools: "I have this machine (function), tell me what it produces (ReturnType) or what inputs it needs (Parameters)." You didn't build the machine, but you can still work with it safely.`,
    deep: `HOW UTILITY TYPES ARE IMPLEMENTED — Under the hood
───────────────────────────────────────────────────────
Most utility types are implemented using mapped types and conditional types:

\`\`\`typescript
// Partial<T> source code in lib.d.ts:
type Partial<T> = {
    [P in keyof T]?: T[P]
}

// Required<T>:
type Required<T> = {
    [P in keyof T]-?: T[P]   // -? removes the optional modifier
}

// Readonly<T>:
type Readonly<T> = {
    readonly [P in keyof T]: T[P]
}

// Pick<T, K>:
type Pick<T, K extends keyof T> = {
    [P in K]: T[P]
}

// Record<K, V>:
type Record<K extends keyof any, T> = {
    [P in K]: T
}

// Omit<T, K> (implemented via Pick + Exclude):
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
\`\`\`

Understanding these implementations is important for building your OWN utility types.

DEEP READONLY — Utility types are shallow by default
─────────────────────────────────────────────────────
Readonly<T> only makes top-level properties readonly. Nested objects can still be mutated.
To go deep:
\`\`\`
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
\`\`\`

AWAITED<T> — The chain unwrapper
──────────────────────────────────
Awaited<T> recursively unwraps Promise chains:
\`\`\`
type A = Awaited<Promise<string>>                  // string
type B = Awaited<Promise<Promise<number>>>         // number (recursive!)
type C = Awaited<string>                           // string (not a promise, passthrough)
\`\`\`

TEMPLATE LITERAL TYPES + UTILITY TYPES
────────────────────────────────────────
type EventNames<T extends string> = \`on\${Capitalize<T>}\`
type UserEvents = EventNames<"click" | "hover" | "focus">
// "onClick" | "onHover" | "onFocus"`,
    code: `// ─── EXAMPLE 1: Partial — for update/patch payloads ─────────────────────
interface User {
  id: string
  name: string
  email: string
  phone: string
  address: string
  tier: "free" | "premium"
  createdAt: Date
}

// Update payload: everything optional except id
type UpdateUserPayload = Partial<Omit<User, "id" | "createdAt">>

async function updateUser(id: string, changes: UpdateUserPayload): Promise<User> {
  // changes might have just { phone: "9876543210" } — perfectly valid
  return api.patch(\`/users/\${id}\`, changes)
}

// ─── EXAMPLE 2: Required — for validated/complete objects ────────────────
interface DraftOrder {
  customerId?: string
  items?: OrderItem[]
  shippingAddress?: string
  coupon?: string
}

// After validation, all required fields must be present
type ValidatedOrder = Required<Pick<DraftOrder, "customerId" | "items" | "shippingAddress">>
// coupon remains optional since it's not picked

// ─── EXAMPLE 3: Pick — for focused subsets ───────────────────────────────
interface Product {
  id: string
  name: string
  description: string
  price: number
  costPrice: number        // internal — should NOT go to frontend
  supplierId: string       // internal
  stockCount: number
  category: string
}

// Only send safe fields to the client
type ProductPreview = Pick<Product, "id" | "name" | "description" | "price" | "category">

function getProductListings(products: Product[]): ProductPreview[] {
  return products.map(({ id, name, description, price, category }) => ({
    id, name, description, price, category
  }))
}

// ─── EXAMPLE 4: Omit — exclude specific fields ───────────────────────────
interface AdminUser extends User {
  passwordHash: string
  internalNotes: string
  loginHistory: Date[]
}

// Safe to send in API response — no sensitive fields
type PublicUser = Omit<AdminUser, "passwordHash" | "internalNotes" | "loginHistory">

// ─── EXAMPLE 5: Record — typed dictionaries ──────────────────────────────
type StateCode = "MH" | "DL" | "KA" | "TN" | "UP" | "GJ"
type GSTRate = number  // percentage

const gstByState: Record<StateCode, GSTRate> = {
  MH: 18,
  DL: 18,
  KA: 18,
  TN: 12,
  UP: 18,
  GJ: 28
  // Missing any StateCode key = compile error ✅
}

// Record for dynamic content — permission maps
type Permission = "read" | "write" | "delete" | "admin"
type UserRole = "viewer" | "editor" | "owner"
const rolePermissions: Record<UserRole, Permission[]> = {
  viewer: ["read"],
  editor: ["read", "write"],
  owner: ["read", "write", "delete", "admin"]
}

// ─── EXAMPLE 6: ReturnType, Parameters, Awaited ──────────────────────────
async function fetchOrders(
  customerId: string,
  filters: { status?: string; limit?: number }
): Promise<Order[]> {
  return api.get(\`/orders\`, { customerId, ...filters })
}

// Extract types without re-declaring them
type FetchOrdersParams = Parameters<typeof fetchOrders>
// [customerId: string, filters: { status?: string; limit?: number }]

type FetchOrdersReturn = Awaited<ReturnType<typeof fetchOrders>>
// Order[]  — Awaited unwraps the Promise

// Useful in tests — call the function type-safely without knowing its signature
function mockFetchOrders(...args: FetchOrdersParams): FetchOrdersReturn {
  return Promise.resolve([])
}

// ─── EXAMPLE 7: Readonly — prevent mutation ──────────────────────────────
type AppConfig = Readonly<{
  apiBaseUrl: string
  timeout: number
  featureFlags: Record<string, boolean>
}>

const config: AppConfig = {
  apiBaseUrl: "https://api.myapp.in",
  timeout: 5000,
  featureFlags: { newCheckout: true, darkMode: false }
}

// config.timeout = 3000        // ERROR: Cannot assign to 'timeout' ✅
// config.featureFlags = {}     // ERROR ✅
// config.featureFlags.darkMode = true  // Allowed — Readonly is shallow!`,
    bugs: `BUG 1 — Using Partial everywhere instead of modeling the domain correctly
────────────────────────────────────────────────────────────────────────
// Team made every DTO Partial<T> for "flexibility"
type CreateOrderPayload = Partial<Order>
// Now you can call createOrder({}) — missing customerId, items, etc.
// Runtime crash deep in the order processing logic
// TypeScript gave no warning because everything was optional

Fix: Only use Partial for PATCH/update payloads where partial updates are intentional.
Use the full type (or Required) for creation payloads.

BUG 2 — Omit doesn't remove from nested types
──────────────────────────────────────────────
type UserWithOrders = {
  id: string
  name: string
  orders: Array<Order & { internalCost: number }>
}

type PublicUserWithOrders = Omit<UserWithOrders, "internalCost">
// internalCost is on the nested Order type, not on UserWithOrders directly
// Omit does nothing here — internalCost is still in the type!

Fix: Explicitly retype the nested field:
type PublicUserWithOrders = Omit<UserWithOrders, "orders"> & {
  orders: Omit<UserWithOrders["orders"][number], "internalCost">[]
}

BUG 3 — Record with string key is too permissive
─────────────────────────────────────────────────
const cache: Record<string, User> = {}
cache["any-key-at-all"] = { id: "1", name: "Test", ... }
const user = cache["nonexistent-key"]  // Type is User — but value is undefined at runtime!

Fix: Use \`Record<string, User | undefined>\` or enable noUncheckedIndexedAccess in tsconfig.

BUG 4 — ReturnType on overloaded functions
─────────────────────────────────────────────
function createElement(tag: "div"): HTMLDivElement
function createElement(tag: "span"): HTMLSpanElement
function createElement(tag: string): HTMLElement { ... }

type CreatedElement = ReturnType<typeof createElement>
// Returns the LAST overload signature's return type: HTMLElement
// Not the specific subtype — might be more general than you expected

Fix: Know that ReturnType uses the last signature for overloads. Use generics instead of overloads when you need the specific return type.

BUG 5 — Partial<T> vs { [K in keyof T]?: T[K] } — they're not always identical
──────────────────────────────────────────────────────────────────────────────────
// Partial makes properties optional but still excludes undefined from value type in
// some strict configs. The mapped type equivalent with exactOptionalPropertyTypes
// behaves differently.

type A = Partial<{ x: number }>         // { x?: number }  — x can be absent
type B = { x?: number | undefined }     // x can be absent OR explicitly undefined

// With exactOptionalPropertyTypes: true, these are different!
// This matters when differentiating "not provided" from "explicitly set to undefined"

Fix: Be explicit about your intent. If you want "property may be set to undefined",
use \`{ [K in keyof T]?: T[K] | undefined }\`. If you want "property may be absent", use Partial.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

type A = Partial<Pick<User, "name" | "email">>
type B = Required<A>
type C = Readonly<B>

declare const c: C
c.name = "New Name"

Q: What is the type of C? Does the last line compile? What error do you get?
   What would A, B, and C look like if written out explicitly without utility types?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// 3 issues in this API layer code

interface BlogPost {
  id: string
  title: string
  content: string
  authorId: string
  publishedAt: Date | null
  tags: string[]
  internalReviewNotes: string
}

// For creating a post — id and publishedAt are set by the server
type CreatePostPayload = Omit<BlogPost, "publishedAt">

// For updating — all fields optional, but id is required to identify the post  
type UpdatePostPayload = Partial<BlogPost>

// For the public API — no internal notes, no authorId
type PublicPost = Omit<BlogPost, "authorId">

function createPost(payload: CreatePostPayload): Promise<BlogPost> {
  return api.post('/posts', payload)
}

const post = await createPost({
  id: "P1",  // id should NOT be required here
  title: "My First Post",
  content: "Hello world",
  authorId: "A1",
  tags: ["typescript"],
  internalReviewNotes: ""
})

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a typed API client factory using utility types:

1. Start with a \`FullProduct\` interface that has: id, name, price, costPrice, supplierId, stockCount, category, description, createdAt, updatedAt, deletedAt

2. Create these derived types using ONLY utility types (no manual redeclaration):
   - \`ProductListItem\`: only id, name, price, category, stockCount
   - \`CreateProductPayload\`: no id, createdAt, updatedAt, deletedAt — all required
   - \`UpdateProductPayload\`: same as Create but all optional, except id required
   - \`PublicProduct\`: no costPrice, supplierId, deletedAt — readonly
   - \`AdminProduct\`: full type but readonly

3. Write a generic \`ApiClient<T>\` class with:
   - \`list(): Promise<Array<Pick<T, "id" | any>>>\` (use a generic constraint)
   - \`getById(id: string): Promise<T>\`
   - \`create(payload: Omit<T, "id">): Promise<T>\`
   - \`update(id: string, payload: Partial<Omit<T, "id">>): Promise<T>\`
   - \`delete(id: string): Promise<void>\``,
    summary: "Utility types are how TypeScript keeps your type system DRY — define your domain type once and derive all variants from it. When the source changes, every derived type updates automatically, and TypeScript enforces consistency across your entire codebase."
  }
];
