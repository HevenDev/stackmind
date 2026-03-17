const concepts = [
  {
    id: 6,
    title: "Type Guards & Narrowing",
    tag: "TEACHING TYPESCRIPT WHAT YOU ALREADY KNOW",
    color: "#1ABC9C",
    tldr: "TypeScript starts with a wide type and narrows it down as you give it more information. Type guards are the checks — typeof, instanceof, in, custom functions — that tell the compiler which specific variant you're working with inside a code branch. Without narrowing, you can't safely access type-specific properties.",
    problem: `You have a value typed as \`string | number | null\`. You want to call \`.toUpperCase()\` on it. TypeScript refuses — because what if it's a number or null? You need to PROVE to the compiler that it's a string first.

That proof is a type guard. Without it, you're either casting with \`as\` (lying to the compiler) or getting a wall of red underlines.

The harder problem: custom domain types. You have \`type Shape = Circle | Rectangle | Triangle\`. Before you can access \`shape.radius\`, you have to prove it's a Circle. TypeScript can't figure this out from a random boolean check — you need to tell it explicitly with a custom type guard function.

The subtler problem: nullish narrowing. \`if (x)\` and \`if (x != null)\` look similar but behave differently. \`if (x)\` is falsy-check — it narrows away null, undefined, 0, "", false. \`if (x != null)\` uses the abstract equality operator — it narrows away null AND undefined, but keeps 0, "" and false. Mixing them up causes real bugs with numeric or boolean data.`,
    analogy: `TypeScript is like a detective who starts every case with "I don't know who did it." Type guards are the clues that let the detective commit to a conclusion.

When you write \`if (typeof x === "string")\`, you're handing the detective a fingerprint — now they KNOW it's the string suspect in this block of code. Inside the if-block, the detective operates with that certainty.

Custom type guards (\`x is Circle\`) are like a specialist witness: "I've examined this, and I'm certifying that it is a Circle." The detective trusts your expertise and treats it as a Circle going forward.

The \`satisfies\` operator is like a quality control check at a factory: "This product must meet the Circle spec before it leaves the line" — but it ships as its original specific type, not downgraded to a generic "shape" label.`,
    deep: `HOW NARROWING WORKS INTERNALLY
────────────────────────────────
TypeScript maintains a "type at this point in control flow" — called control flow analysis (CFA). When you write a type guard, TypeScript forks the type: inside the branch where the guard is true, the type is narrowed; in the else branch, the type is narrowed to the remaining possibilities.

\`\`\`
type T = string | number | null
// At this point: T = string | number | null

if (typeof x === "string") {
  // T is narrowed to: string
} else {
  // T is narrowed to: number | null  (string was eliminated)
  if (x !== null) {
    // T is narrowed to: number
  }
}
\`\`\`

ASSERTION FUNCTIONS — The rarer cousin of type guards
──────────────────────────────────────────────────────
\`\`\`typescript
function assertDefined<T>(val: T | null | undefined, name: string): asserts val is T {
  if (val == null) throw new Error(\`\${name} must not be null/undefined\`)
}

const user = getUser(id)  // User | null
assertDefined(user, "user")
// From here on, user is User — the assertion function narrowed it
// If getUser returned null, the assertion threw before this line
\`\`\`

THE satisfies OPERATOR (TypeScript 4.9)
────────────────────────────────────────
The problem with direct annotation: \`const config: Record<string, string> = { ... }\` widens the type — you lose the specific string literal keys.
The problem with no annotation: TypeScript infers narrowly but won't validate against a shape.
\`satisfies\` gives you both: validates against a type without widening the inferred type.

\`\`\`typescript
type RouteConfig = Record<string, { method: string; auth: boolean }>

const routes = {
  "/users": { method: "GET", auth: false },
  "/orders": { method: "POST", auth: true }
} satisfies RouteConfig
// routes["/users"].method is "GET" (literal), not string (widened)
// If you add { method: 123 }, satisfies catches it
\`\`\`

IN OPERATOR NARROWING
──────────────────────
\`\`\`
type Cat = { meow(): void }
type Dog = { bark(): void }
type Animal = Cat | Dog

function speak(animal: Animal) {
  if ("meow" in animal) {
    animal.meow()  // narrowed to Cat
  } else {
    animal.bark()  // narrowed to Dog
  }
}
\`\`\`

NULLISH NARROWING SUBTLETY
───────────────────────────
\`x != null\` is the ONLY check that narrows away BOTH null AND undefined simultaneously using abstract equality.
\`x !== null\` only narrows away null — undefined survives.
\`x !== undefined\` only narrows away undefined — null survives.
\`if (x)\` narrows away null, undefined, 0, "", false, NaN — too aggressive for numbers and booleans.`,
    code: `// ─── EXAMPLE 1: typeof narrowing — basic ────────────────────────────────
type FormValue = string | number | boolean | null

function formatFormValue(val: FormValue): string {
  if (val === null) return "—"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "number") return \`₹\${val.toLocaleString("en-IN")}\`
  return val.trim()  // narrowed to string here
}

console.log(formatFormValue(null))          // "—"
console.log(formatFormValue(true))          // "Yes"
console.log(formatFormValue(149900))        // "₹1,49,900"
console.log(formatFormValue("  Namaste  ")) // "Namaste"

// ─── EXAMPLE 2: instanceof narrowing ────────────────────────────────────
class NetworkError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = "NetworkError"
  }
}

class ValidationError extends Error {
  constructor(public fields: string[], message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

function handleError(error: unknown): string {
  if (error instanceof NetworkError) {
    return \`Network \${error.statusCode}: \${error.message}\`
    // error is NetworkError — statusCode is available ✅
  }
  if (error instanceof ValidationError) {
    return \`Validation failed on: \${error.fields.join(", ")}\`
    // error is ValidationError — fields is available ✅
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown error"
}

// ─── EXAMPLE 3: Custom type guard function ───────────────────────────────
type Circle    = { kind: "circle"; radius: number }
type Rectangle = { kind: "rect"; width: number; height: number }
type Triangle  = { kind: "triangle"; base: number; height: number }
type Shape = Circle | Rectangle | Triangle

// The return type annotation "shape is Circle" is the type guard
function isCircle(shape: Shape): shape is Circle {
  return shape.kind === "circle"
}

function getArea(shape: Shape): number {
  if (isCircle(shape)) {
    return Math.PI * shape.radius ** 2    // shape is Circle here ✅
  }
  if (shape.kind === "rect") {
    return shape.width * shape.height     // shape is Rectangle here ✅
  }
  return 0.5 * shape.base * shape.height // shape is Triangle here ✅
}

// ─── EXAMPLE 4: in operator narrowing ───────────────────────────────────
type ApiSuccessResponse = { data: unknown; requestId: string }
type ApiErrorResponse   = { error: string; code: number; requestId: string }
type ApiResponse = ApiSuccessResponse | ApiErrorResponse

function processResponse(res: ApiResponse) {
  console.log(\`Request: \${res.requestId}\`)  // common field — no narrowing needed

  if ("data" in res) {
    console.log("Success:", res.data)            // narrowed to ApiSuccessResponse ✅
  } else {
    console.error(\`Error \${res.code}: \${res.error}\`)  // narrowed to ApiErrorResponse ✅
  }
}

// ─── EXAMPLE 5: satisfies operator — validate without widening ───────────
type PaletteColor = "primary" | "secondary" | "danger" | "success"
type ColorMap = Record<PaletteColor, string>

// BAD: annotation widens — colors.primary is "string", not "#0052CC"
const colorsWidened: ColorMap = {
  primary:   "#0052CC",
  secondary: "#6B778C",
  danger:    "#DE350B",
  success:   "#00875A"
}
// colorsWidened.primary is type string — no literal precision

// GOOD: satisfies validates shape but keeps literal types
const colors = {
  primary:   "#0052CC",
  secondary: "#6B778C",
  danger:    "#DE350B",
  success:   "#00875A"
} satisfies ColorMap
// colors.primary is type "#0052CC" (literal) ✅
// Adding an invalid key or wrong value type → compile error ✅

// ─── EXAMPLE 6: Assertion functions ─────────────────────────────────────
function assertIsString(val: unknown, fieldName: string): asserts val is string {
  if (typeof val !== "string") {
    throw new TypeError(\`\${fieldName} must be a string, got \${typeof val}\`)
  }
}

function assertDefined<T>(val: T | null | undefined, name: string): asserts val is T {
  if (val == null) {
    throw new Error(\`Expected \${name} to be defined, but got \${val}\`)
  }
}

function processOrderRequest(body: unknown) {
  assertIsString((body as any)?.customerId, "customerId")
  assertIsString((body as any)?.productId, "productId")
  // From here: TypeScript knows both are strings ✅
}

// ─── EXAMPLE 7: Nullish narrowing — the right tool for the job ───────────
type UserProfile = {
  name: string
  bio: string | null | undefined
  age: number | null
  isPremium: boolean
}

function describeUser(profile: UserProfile) {
  // CORRECT for "is it set?": != null catches both null and undefined
  if (profile.bio != null) {
    console.log(\`Bio: \${profile.bio}\`)  // bio is string here ✅
  }

  // WRONG for numbers: if (profile.age) misses age = 0
  // CORRECT:
  if (profile.age != null) {
    console.log(\`Age: \${profile.age}\`)  // age is number ✅
  }
}`,
    bugs: `BUG 1 — Custom type guard returns wrong type, silently accepting bad values
──────────────────────────────────────────────────────────────────────────
function isUser(obj: unknown): obj is User {
  return typeof obj === "object"  // Too loose! null is also "object"!
}

const bad = isUser(null)   // returns true — but null is not a User
const user = null as unknown
if (isUser(user)) {
  console.log(user.name)   // Runtime crash: Cannot read properties of null
}

Fix: Always check \`obj !== null\` in type guards for objects:
function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj && "name" in obj
}

BUG 2 — Using if(x) to narrow numbers — misses zero
────────────────────────────────────────────────────
function applyDiscount(discount: number | null): string {
  if (discount) {  // WRONG — discount = 0 is falsy!
    return \`Discount: \${discount}%\`
  }
  return "No discount"
}

applyDiscount(0)    // Returns "No discount" — wrong! 0% is a valid value
applyDiscount(null) // Returns "No discount" — correct

Fix: if (discount !== null) — only eliminates null, keeps 0

BUG 3 — satisfies misused as a replacement for Readonly
────────────────────────────────────────────────────────
// satisfies validates shape at declaration but does NOT prevent mutation
const config = {
  timeout: 5000,
  retries: 3
} satisfies { timeout: number; retries: number }

// config is still mutable — satisfies only validates, not freezes
// Use Readonly<> or Object.freeze() for immutability

BUG 4 — instanceof fails across iframes and module contexts
─────────────────────────────────────────────────────────────
// In web apps with iframes, each frame has its own JavaScript context
// An Error from iframe A is NOT instanceof Error in frame B
function handleError(e: unknown) {
  if (e instanceof Error) {
    // This may be FALSE for errors thrown across iframe/worker contexts!
    return e.message
  }
  return String(e)
}

Fix: Use duck typing for cross-context checks:
function isErrorLike(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e
}

BUG 5 — Narrowing inside callbacks — TypeScript forgets the guard
──────────────────────────────────────────────────────────────────
function processUsers(users: (User | null)[]) {
  // filter doesn't narrow — result is still (User | null)[]
  const valid = users.filter(u => u !== null)
  valid.forEach(u => console.log(u.name))  // ERROR: u could be null

  // Closure bug — value could change before callback fires
  let value: string | null = "hello"
  if (value !== null) {
    setTimeout(() => {
      console.log(value.toUpperCase())  // ERROR in strict mode
    }, 1000)
  }
}

Fix for filter: users.filter((u): u is User => u !== null)
Fix for closure: const captured = value; setTimeout(() => captured!.toUpperCase(), 1000)`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
function check(x: string | number | null | undefined): string {
  if (x == null) return "nullish"
  if (!x) return "falsy"
  if (typeof x === "number") return "number"
  return "string"
}

console.log(check(null))
console.log(check(undefined))
console.log(check(0))
console.log(check(""))
console.log(check(42))
console.log(check("hello"))

Q: What does each call return and why? Pay close attention to the order of checks.
Answer: "nullish", "nullish", "falsy", "falsy", "number", "string"
Note: 0 and "" pass the \`x == null\` check (they're not null/undefined) but fail \`!x\`.

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This code has 4 narrowing bugs. Find and fix them all.

type Order = { id: string; amount: number; status: "pending" | "paid" | "cancelled" }
type GuestOrder = { id: string; amount: number }
type AnyOrder = Order | GuestOrder

function processAnyOrder(order: AnyOrder) {
  // Bug 1: wrong property checked for narrowing
  if ("status" in order === false) {
    console.log("Guest order:", order.id)
  } else {
    console.log("Order status:", order.status)  // Bug 2: TypeScript can't narrow here — why?
  }
}

function filterPaidOrders(orders: (Order | null)[]): Order[] {
  // Bug 3: filter doesn't narrow the return type
  return orders.filter(o => o !== null && o.status === "paid")
}

function getAmount(val: number | null): number {
  // Bug 4: falsy check loses 0
  if (!val) return 0
  return val
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a typed runtime validator system:
1. Write a generic \`createGuard<T>(check: (val: unknown) => boolean): (val: unknown) => val is T\`
2. Create guards for: isString, isNumber, isBoolean, isNonNullObject
3. Write \`isShape<T extends object>(schema: { [K in keyof T]: (v: unknown) => v is T[K] })\` — a factory that takes an object of validators and returns a type guard for the whole shape
4. Use it to create an \`isUser\` guard that validates \`{ id: string; name: string; age: number }\`
5. Test with valid and invalid inputs, showing TypeScript narrows correctly after the guard`,
    summary: "Type guards are the bridge between TypeScript's compile-time types and JavaScript's runtime reality — they let you prove to the compiler what you already know about a value, so it can give you accurate type information in every branch of your code."
  },

  {
    id: 7,
    title: "keyof, typeof & Mapped Types",
    tag: "TYPES THAT WRITE THEMSELVES",
    color: "#D35400",
    tldr: "`keyof T` gives you the union of all property names of T. `typeof value` infers a type from a runtime value. Mapped types let you transform every property of a type systematically — they're the engine behind Partial, Readonly, Record, and every DRY type transformation in TypeScript.",
    problem: `The problem mapped types solve is type duplication. You have a \`User\` interface. You need an \`UpdateUser\` where everything is optional. A \`ReadonlyUser\` where nothing can change. A \`UserErrors\` where every field maps to a string error message. A \`UserForm\` where every field is a form control.

Without mapped types, you write each variant by hand. They drift out of sync. Someone adds a field to User and forgets to update UserErrors. A bug is born.

With mapped types, you derive them all from the source of truth. Add a field once, and all mapped variants automatically include it.

The second problem: you have a JavaScript object at runtime and want TypeScript to know its shape without rewriting it as a type. \`typeof myObject\` captures the inferred type of any value — perfect for configuration objects, lookup tables, and const objects.

The third problem: working with object keys safely. \`Object.keys(obj)\` returns \`string[]\`, which is too wide. Using \`keyof typeof obj\` gives you the actual literal union of keys — enabling safe dynamic property access.`,
    analogy: `Think of a mapped type as a photocopier with a filter. You put in the original document (your base type T), set a transformation rule (make all properties optional, or change all value types to string), and get out a new document where every property has been transformed.

\`keyof T\` is like asking "what are all the section headings in this document?" — it gives you a union of all property names.

\`typeof value\` is the reverse: instead of starting with a type and asking about its shape, you start with an actual object and ask TypeScript to figure out its type. You're capturing the shape of something that already exists.

Template literal types in mapped types are like a find-and-replace that's type-aware: "for every key in this type, add 'set' at the beginning and make it camelCase." The transformation applies consistently to all properties, with full type safety.`,
    deep: `KEYOF DEEP DIVE
───────────────
\`\`\`typescript
type User = { id: string; name: string; age: number; email: string }
type UserKeys = keyof User  // "id" | "name" | "age" | "email"

// keyof on index signature types:
type StringMap = { [key: string]: number }
type K = keyof StringMap  // string | number  (JS coerces numeric keys to strings)

// keyof on arrays:
type ArrayKeys = keyof string[]  // number | "length" | "push" | "pop" | ...
\`\`\`

TYPEOF ON CONST OBJECTS — The pattern for config-driven types
──────────────────────────────────────────────────────────────
\`\`\`typescript
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
} as const  // as const makes all values literal (200, not number)

type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
// 200 | 201 | 400 | 401 | 404 | 500

type StatusKey = keyof typeof HTTP_STATUS
// "OK" | "CREATED" | "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "SERVER_ERROR"
\`\`\`

MAPPED TYPE MODIFIERS
──────────────────────
\`\`\`typescript
// Adding modifiers:
type Readonly<T> = { readonly [K in keyof T]: T[K] }
type Partial<T>  = { [K in keyof T]?: T[K] }

// REMOVING modifiers (the - prefix):
type Mutable<T>  = { -readonly [K in keyof T]: T[K] }  // removes readonly
type Required<T> = { [K in keyof T]-?: T[K] }           // removes optional (?)
\`\`\`

KEY REMAPPING with as clause (TypeScript 4.1+)
───────────────────────────────────────────────
\`\`\`typescript
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K]
}
type UserGetters = Getters<{ name: string; age: number }>
// { getName: () => string; getAge: () => number }

// Filter properties using never:
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}
type StringUser = OnlyStrings<{ id: string; name: string; age: number; active: boolean }>
// { id: string; name: string }
\`\`\`

TEMPLATE LITERAL TYPES IN MAPPED TYPES
──────────────────────────────────────
\`\`\`typescript
type EventName = "click" | "focus" | "blur" | "change"
type HandlerMap = {
  [E in EventName as \`on\${Capitalize<E>}\`]: (event: Event) => void
}
// { onClick: ...; onFocus: ...; onBlur: ...; onChange: ... }
\`\`\``,
    code: `// ─── EXAMPLE 1: keyof for safe property access ───────────────────────────
type Product = {
  id: string
  name: string
  price: number
  stockCount: number
  category: string
}

function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const p: Product = { id: "P1", name: "Dal", price: 95, stockCount: 500, category: "Grocery" }
const price = getField(p, "price")      // type: number ✅
const name  = getField(p, "name")       // type: string ✅
// getField(p, "weight")                // ERROR — "weight" not in Product ✅

// ─── EXAMPLE 2: typeof on const config ──────────────────────────────────
const PAYMENT_METHODS = {
  upi:  { label: "UPI",  icon: "📱", minAmount: 1 },
  card: { label: "Card", icon: "💳", minAmount: 1 },
  cod:  { label: "Cash on Delivery", icon: "📦", minAmount: 99 },
  emi:  { label: "EMI",  icon: "📅", minAmount: 3000 }
} as const

type PaymentMethodKey = keyof typeof PAYMENT_METHODS
// "upi" | "card" | "cod" | "emi"

function getPaymentLabel(method: PaymentMethodKey): string {
  return PAYMENT_METHODS[method].label  // fully typed ✅
}

// ─── EXAMPLE 3: Basic mapped type ───────────────────────────────────────
type User = { id: string; name: string; email: string; age: number }

// Map every field to its validation error (or null if valid)
type UserValidationErrors = {
  [K in keyof User]: string | null
}
// { id: string | null; name: string | null; email: string | null; age: string | null }

const errors: UserValidationErrors = {
  id: null,
  name: null,
  email: "Invalid email format",
  age: "Must be 18 or older"
}

// ─── EXAMPLE 4: Mutable and Required — removing modifiers ────────────────
type Config = {
  readonly apiUrl: string
  readonly timeout?: number
  readonly retries?: number
}

type MutableConfig = { -readonly [K in keyof Config]: Config[K] }
type StrictConfig  = { [K in keyof Config]-?: Config[K] }

const testConfig: MutableConfig = { apiUrl: "http://localhost:3000", timeout: 100, retries: 1 }
testConfig.apiUrl = "http://test.example.com"  // ✅ no longer readonly

// ─── EXAMPLE 5: Key remapping — Getters pattern ──────────────────────────
type CartItem = { productId: string; qty: number; price: number }

type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K]
}

type CartItemGetters = Getters<CartItem>
// { getProductId: () => string; getQty: () => number; getPrice: () => number }

// ─── EXAMPLE 6: Filtering properties with never ──────────────────────────
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

type Order = {
  id: string
  customerId: string
  amount: number
  isPaid: boolean
  itemCount: number
  notes: string | null
}

type NumberFields  = PickByValue<Order, number>   // { amount: number; itemCount: number }
type StringFields  = PickByValue<Order, string>   // { id: string; customerId: string }
type BooleanFields = PickByValue<Order, boolean>  // { isPaid: boolean }

// ─── EXAMPLE 7: Snake_case to camelCase type transform ───────────────────
type SnakeToCamel<S extends string> =
  S extends \`\${infer Head}_\${infer Tail}\`
    ? \`\${Head}\${Capitalize<SnakeToCamel<Tail>>}\`
    : S

type CamelKeys<T> = {
  [K in keyof T as SnakeToCamel<string & K>]: T[K]
}

type ApiUserResponse = {
  user_id: string
  first_name: string
  last_name: string
  email_address: string
  created_at: string
}

type FrontendUser = CamelKeys<ApiUserResponse>
// { userId: string; firstName: string; lastName: string; emailAddress: string; createdAt: string }`,
    bugs: `BUG 1 — Object.keys() returns string[], not keyof T
────────────────────────────────────────────────────
const user = { id: "U1", name: "Ravi", age: 28 }

Object.keys(user).forEach(key => {
  console.log(user[key])  // ERROR: key is string, not keyof typeof user
})

Fix:
(Object.keys(user) as (keyof typeof user)[]).forEach(key => {
  console.log(user[key])  // ✅ key is "id" | "name" | "age"
})

BUG 2 — keyof on interface with optional properties
─────────────────────────────────────────────────────
interface Settings {
  theme?: "light" | "dark"
  fontSize?: number
}

type SettingKey = keyof Settings  // "theme" | "fontSize" — optional keys ARE included

function getSetting<K extends keyof Settings>(s: Settings, key: K): Settings[K] {
  return s[key]  // Settings[K] includes undefined for optional fields
}

const val = getSetting({}, "theme")  // "light" | "dark" | undefined — val.toUpperCase() is an ERROR ✅

BUG 3 — typeof captures the wrong type when variable is mutable
───────────────────────────────────────────────────────────────
let status = "pending"
type Status = typeof status  // string — NOT "pending" (literal)!

// typeof on mutable variables infers the base type, not the literal
// Fix: use as const or a literal type annotation:
const STATUS = "pending" as const
type Status2 = typeof STATUS  // "pending" — literal ✅

BUG 4 — Mapped type loses JSDoc metadata
─────────────────────────────────────────
interface ApiClient {
  /** @deprecated use getUser2 instead */
  getUser(id: string): Promise<User>
}

type MockClient = { [K in keyof ApiClient]: jest.Mock }
// The @deprecated JSDoc comment is NOT preserved in the mapped type
// IDE won't warn about getUser being deprecated on the mock

Fix: Known TypeScript limitation — declare a separate interface for mocks
that extends the original and overrides with Mock types.

BUG 5 — keyof on a union type — only gets SHARED keys
───────────────────────────────────────────────────────
type Cat = { name: string; meow(): void }
type Dog = { name: string; bark(): void }
type Pet = Cat | Dog

type PetKeys = keyof Pet  // "name" ONLY — not meow or bark!
// keyof (A | B) = (keyof A) & (keyof B) — only keys in ALL union members

// To get ALL keys from any member:
type AllPetKeys = keyof Cat | keyof Dog  // "name" | "meow" | "bark"`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const ROUTES = {
  home: "/",
  about: "/about",
  users: "/users",
  userDetail: "/users/:id"
} as const

type RouteKey  = keyof typeof ROUTES
type RoutePath = typeof ROUTES[RouteKey]

declare function navigate(to: RoutePath): void

navigate("/users")       // Line A
navigate("/users/:id")   // Line B
navigate("/dashboard")   // Line C
navigate(ROUTES.home)    // Line D

Q: Which lines compile and which error? What is the exact type of RoutePath?
   Why does line B compile but line C doesn't, even though both are strings?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// 3 bugs in this mapped type. Find and fix each.

type FormState<T> = {
  [K in keyof T]: {
    value: T[K]
    error: string
    touched: boolean
  }
}

// Bug 1: Want a reset() method on the form itself — but adding it to FormState<T>
// puts it as a field on every property object instead of on the form root.

// Bug 2: FormState should make all field values optional for initial empty state
// but currently the value field is required.

// Bug 3: This function errors — why?
function getFieldError<T, K extends keyof T>(form: FormState<T>, field: K): string {
  return form[field].error  // TypeScript complains about this access
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a fully typed observable store using mapped types:
1. Given a state type S, create a Store<S> type with:
   - get<K extends keyof S>(key: K): S[K]
   - set<K extends keyof S>(key: K, value: S[K]): void
   - subscribe<K extends keyof S>(key: K, cb: (newVal: S[K], oldVal: S[K]) => void): () => void
   - getState(): Readonly<S>
2. Create a Setters<S> mapped type producing setter methods from state shape
3. Implement createStore<S>(initial: S): Store<S> & Setters<S>
4. Test with: type AppState = { user: User | null; cart: CartItem[]; theme: "light" | "dark" }`,
    summary: "`keyof`, `typeof`, and mapped types form the core of TypeScript's type-level programming — they let you derive types from types, transform shapes systematically, and keep your entire type system in sync from a single source of truth."
  },

  {
    id: 8,
    title: "Conditional Types",
    tag: "IF-ELSE FOR YOUR TYPE SYSTEM",
    color: "#2C3E50",
    tldr: "Conditional types let you express type-level logic: `T extends U ? X : Y` — if T is assignable to U, the type is X, otherwise Y. Combined with `infer`, they let you extract types from inside other types. They're the foundation for TypeScript's most powerful built-in utilities and enable truly DRY, derived type systems.",
    problem: `Sometimes you need a type that depends on another type. A function that returns \`string\` when given a \`string\`, \`number\` when given a \`number\`. A type that unwraps a \`Promise<T>\` to just \`T\`, but leaves non-Promise types alone. A deep version of \`Partial\` that makes nested objects optional too, not just top-level properties.

These are impossible to express with simple generics alone. You'd need to write multiple overloads, or fall back to \`any\`, or just accept the imprecision.

Conditional types solve this: they let you write type-level branching logic. \`T extends Promise<infer U> ? U : T\` is readable type logic that says "if T is a Promise, give me what's inside; otherwise give me T itself."

The trickier problem is DISTRIBUTIVE conditional types. When T is a naked type parameter (not wrapped), \`T extends U ? X : Y\` applies the condition to each member of the union separately, then unions the results. This is powerful but deeply surprising if you don't know about it — it can give you results that look totally wrong until you understand distribution.`,
    analogy: `Think of conditional types like a sorting machine at a post office. Every package (type) comes in and gets checked: "Does this match the criteria?" Heavy packages go one way, light ones another. The machine checks EVERY package and sorts it into the right bin.

That's distributive conditional types: when you feed a union (a batch of packages) into the machine, it checks each one individually and sorts them. The output is a new union — some in bin X, some in bin Y.

The \`infer\` keyword is like X-ray vision on the sorting machine. "I need to know what's INSIDE this package before I can sort it." \`T extends Promise<infer U>\` is saying: "If this package is a Promise-shaped box, use X-ray to find out what type U is inside the box, and give me that."

Recursive conditional types are like nested Russian dolls — to know the type of the outermost doll, you first have to open it and check what's inside, repeating until you hit the innermost one.`,
    deep: `THE EXTENDS CHECK
──────────────────
\`T extends U ? X : Y\` reads as "is T assignable to U?" If yes, resolve to X. If no, resolve to Y.
This is assignability, not equality. \`string extends string | number\` is true. \`string | number extends string\` is false.

THE INFER KEYWORD
──────────────────
\`infer\` creates a type variable inside a conditional type's extends clause. It captures whatever type fills that position.

\`\`\`typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
// If T is a function, R captures the return type. Otherwise: never.

type ElementOf<T> = T extends (infer E)[] ? E : never
// ElementOf<string[]> = string
// ElementOf<number> = never
\`\`\`

DISTRIBUTIVE CONDITIONAL TYPES
────────────────────────────────
When T is a naked type parameter, conditional types distribute over unions:
\`\`\`typescript
type IsString<T> = T extends string ? "yes" : "no"
type A = IsString<string | number | boolean>
// Distributes: IsString<string> | IsString<number> | IsString<boolean>
// = "yes" | "no" | "no" = "yes" | "no"

// To PREVENT distribution, wrap T in a tuple:
type IsStringNonDistributive<T> = [T] extends [string] ? "yes" : "no"
type B = IsStringNonDistributive<string | number>  // "no" — string|number is not assignable to string
\`\`\`

BUILT-IN UTILITIES DESUGARED
──────────────────────────────
\`\`\`typescript
// NonNullable<T>:
type NonNullable<T> = T extends null | undefined ? never : T

// Extract<T, U>:
type Extract<T, U> = T extends U ? T : never

// Exclude<T, U>:
type Exclude<T, U> = T extends U ? never : T
\`\`\`

RECURSIVE CONDITIONAL TYPES
────────────────────────────
\`\`\`typescript
type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T
\`\`\``,
    code: `// ─── EXAMPLE 1: Basic conditional type ──────────────────────────────────
type IsString<T> = T extends string ? true : false

type A = IsString<string>           // true
type B = IsString<"literal">        // true — literals extend string
type C = IsString<number>           // false
type D = IsString<string | number>  // boolean (true | false — distributes!)

// ─── EXAMPLE 2: infer — extracting types ─────────────────────────────────
type ElementOf<T> = T extends (infer E)[] ? E : never

type StrEl  = ElementOf<string[]>           // string
type NumEl  = ElementOf<number[]>           // number
type ObjEl  = ElementOf<{ id: string }[]>  // { id: string }
type NotArr = ElementOf<string>             // never

// Extract return type from function
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never

async function fetchOrders(userId: string): Promise<Order[]> { return [] }
type FetchResult   = MyReturnType<typeof fetchOrders>  // Promise<Order[]>
type ResolvedResult = Awaited<FetchResult>              // Order[]

// ─── EXAMPLE 3: Distributive conditional types ───────────────────────────
type PaymentMethod = "upi" | "card" | "cod" | "emi"
type DigitalMethod = "upi" | "card" | "emi"

// Extracts only digital methods — distributes over each union member
type OnlyDigital<T> = T extends DigitalMethod ? T : never
type DigitalPayments = OnlyDigital<PaymentMethod>
// "upi" | "card" | "emi" ✅  ("cod" → never, removed)

// Same as the built-in Extract:
type DigitalPayments2 = Extract<PaymentMethod, DigitalMethod>

// ─── EXAMPLE 4: NonNullable and Exclude in action ────────────────────────
type MaybeUser       = User | null | undefined
type DefiniteUser    = NonNullable<MaybeUser>          // User

type AllStatuses     = "pending" | "active" | "suspended" | "deleted"
type VisibleStatuses = Exclude<AllStatuses, "deleted" | "suspended">
// "pending" | "active"

type OnlyAdmin = Extract<"admin" | "user" | "moderator" | "guest", "admin" | "moderator">
// "admin" | "moderator"

// ─── EXAMPLE 5: Conditional return type ──────────────────────────────────
function wrap<T extends string | number>(val: T): T extends string ? string : number
function wrap(val: string | number): string | number {
  if (typeof val === "string") return \`[\${val}]\`
  return val
}

const wrapped1 = wrap("hello")  // string ✅
const wrapped2 = wrap(42)       // number ✅

// ─── EXAMPLE 6: DeepPartial — recursive conditional type ─────────────────
type DeepPartial<T> = T extends (infer E)[]
  ? DeepPartial<E>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

type FullUser = {
  id: string
  name: string
  address: {
    street: string
    city: string
    geo: { lat: number; lng: number }
  }
  orders: { id: string; amount: number }[]
}

type PartialUser = DeepPartial<FullUser>
// Every nested property — including address.geo.lat — is now optional ✅

// ─── EXAMPLE 7: Filtering a union with conditional types ──────────────────
type AllEvents =
  | { type: "USER_LOGIN"; userId: string }
  | { type: "USER_LOGOUT"; userId: string }
  | { type: "ORDER_PLACED"; orderId: string; amount: number }
  | { type: "PAYMENT_SUCCESS"; orderId: string; transactionId: string }
  | { type: "PAYMENT_FAILED"; orderId: string; reason: string }

// Extract only order and payment events
type OrderEvent = Extract<AllEvents, { type: \`ORDER_\${string}\` | \`PAYMENT_\${string}\` }>
// ORDER_PLACED | PAYMENT_SUCCESS | PAYMENT_FAILED

// Extract events that have an orderId
type EventsWithOrder = Extract<AllEvents, { orderId: string }>
// ORDER_PLACED | PAYMENT_SUCCESS | PAYMENT_FAILED`,
    bugs: `BUG 1 — Surprised by distributive behavior
────────────────────────────────────────────
type Wrap<T> = T extends string ? { value: T } : T

type A = Wrap<string | number>
// Expected: { value: string | number }
// Actual:   { value: string } | number  — distributed over each member!

Fix: To prevent distribution, wrap in a tuple:
type WrapNonDistributive<T> = [T] extends [string] ? { value: T } : T

BUG 2 — infer in the wrong position gives a syntax error
──────────────────────────────────────────────────────────
// WRONG — infer must be in the extends clause, not the result:
type BadUnwrap<T> = T extends Promise<any> ? infer U : T  // ERROR

// CORRECT:
type GoodUnwrap<T> = T extends Promise<infer U> ? U : T
type A = GoodUnwrap<Promise<string>>  // string ✅

BUG 3 — Recursive conditional type hits depth limit
─────────────────────────────────────────────────────
type Circular = { self: Circular }
type ReadonlyCircular = DeepReadonly<Circular>
// "Type instantiation is excessively deep and possibly infinite"

Fix: Add a depth counter using tuple tricks:
type DeepReadonly<T, Depth extends never[] = []> =
  Depth["length"] extends 5
    ? T
    : { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K], [never, ...Depth]> : T[K] }

BUG 4 — Conditional type not narrowing inside function body
────────────────────────────────────────────────────────────
function process<T extends string | number>(val: T): T extends string ? string[] : number[] {
  if (typeof val === "string") {
    return val.split(",")  // ERROR: Type 'string[]' not assignable to 'T extends string ? string[] : number[]'
  }
  return [val as number]
}

// TypeScript can't verify conditional types inside function bodies.
Fix: Use function overloads or type assertions in the implementation:
function process<T extends string | number>(val: T): T extends string ? string[] : number[]
function process(val: string | number): string[] | number[] {
  if (typeof val === "string") return val.split(",")
  return [val]
}

BUG 5 — Extract with values not in T silently drops them
──────────────────────────────────────────────────────────
type Status = "pending" | "paid" | "failed"
type Result = Extract<Status, "pending" | "paid" | "completed">
// "pending" | "paid"  — "completed" is silently dropped!
// Extract keeps members of T that extend U — not members of U that extend T

Fix: Understand that Extract is a FILTER on T, not a merge of T and U.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
type Test<T> = T extends string | number ? "primitive" : "other"

type A = Test<string>
type B = Test<number>
type C = Test<boolean>
type D = Test<string | boolean>
type E = Test<string | number>
type F = Test<never>

Q: What is each type A through F? Why is F surprising?
Answer: A="primitive", B="primitive", C="other", D="primitive"|"other",
E="primitive", F=never (conditional over never = never — empty union distributes to nothing)

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This DeepPartial implementation has 3 issues. Find and fix them.

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

// Bug 1: Arrays are objects — DeepPartial<string[]> incorrectly recurses into
// array prototype methods and turns .push, .pop, .length all optional.

// Bug 2: Date, Map, Set are objects too but shouldn't be recursed into —
// DeepPartial<{ createdAt: Date }> will turn Date's internal methods partial.

// Bug 3: T[K] = { name: string } | null — doesn't extend object (because of null),
// so the nested object won't be made partial. How do you fix this?

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build an advanced type-safe event system using conditional types:
1. Define EventMap: { login: { userId: string }; logout: { userId: string }; purchase: { orderId: string; amount: number } }
2. Write EventPayload<Map, E extends keyof Map> — extracts the payload type for event E
3. Write EventsWithField<Map, F extends string> — returns union of event names whose payloads contain field F
4. Write PayloadOf<Map, E> using infer to extract payload without indexing
5. Write StrictEmitter<Map> — a class type where emit(event, payload) enforces payload type from event name
6. Bonus: Write MergeEventMaps<A, B> — merges two event maps, B overrides A on conflicts`,
    summary: "Conditional types are TypeScript's type-level programming language — they let you write logic about types, not just describe them. Master `T extends U ? X : Y` and `infer`, and you can derive any type from any other type, making your type system as expressive as your runtime logic."
  },

  {
    id: 9,
    title: "Template Literal Types",
    tag: "STRINGS AS TYPE-LEVEL PROGRAMS",
    color: "#8E44AD",
    tldr: "Template literal types let you construct new string types by combining existing ones — just like template literals in JavaScript, but at the type level. They're how TypeScript can know that `'onClick'` is valid but `'onclicked'` isn't, or that `'/users/:id'` means the parameter is named `id`.",
    problem: `String types in TypeScript used to be blunt instruments. Either a specific literal (\`"GET"\`) or the universe (\`string\`). There was nothing in between — no way to say "any string that starts with 'on'" or "any string that follows the pattern '/users/something'".

This meant typed event systems were either over-constrained (hardcode every event name) or unsafe (accept any string). HTTP routing libraries couldn't give you the param names from a route string. CSS property names couldn't be derived systematically.

Template literal types fill this gap. They let you express patterns: \`\`on\${string}\`\` is the type of any string starting with "on". \`\`set\${Capitalize<K>}\`\` transforms a type like "name" into "setName". You can combine string literal unions to get all their permutations.

Combined with mapped types and conditional types, template literals enable typed APIs that would have seemed magical just a few years ago: a routing function that knows the parameter names from the URL pattern, an event emitter where event names are derived automatically from the state shape.`,
    analogy: `Template literal types are like a postal addressing system. You don't have to know every address in advance. You know the PATTERN: "{HouseNumber} {StreetName}, {City} - {Pincode}". Any string that fits this pattern is a valid address. Strings that don't fit the pattern get rejected.

The \`Capitalize<T>\`, \`Uppercase<T>\`, \`Lowercase<T>\` intrinsics are like formatting rules at the post office: "all city names must be in uppercase on envelopes." TypeScript enforces the formatting at compile time.

Combining string unions with template literals is like a postal worker who handles multiple zones: "valid routes are any combination of {north|south|east|west}-{zone1|zone2|zone3}." TypeScript generates all valid combinations automatically — you didn't have to list them all.`,
    deep: `STRING LITERAL UNION MULTIPLICATION
─────────────────────────────────────
When you combine union types in a template literal, TypeScript generates the cartesian product:
\`\`\`typescript
type Side  = "top" | "right" | "bottom" | "left"
type State = "hover" | "focus" | "active"
type ClassNames = \`\${State}:\${Side}\`
// "hover:top" | "hover:right" | ... | "active:left" — 12 combinations
\`\`\`

INTRINSIC STRING MANIPULATION TYPES
─────────────────────────────────────
Built into TypeScript (implemented in the compiler):
- \`Uppercase<S>\`    — "hello" → "HELLO"
- \`Lowercase<S>\`    — "HELLO" → "hello"
- \`Capitalize<S>\`   — "hello" → "Hello"
- \`Uncapitalize<S>\` — "Hello" → "hello"

These distribute over union members automatically.

PARSING STRINGS WITH infer
───────────────────────────
\`\`\`typescript
type ExtractParam<S extends string> =
  S extends \`:\${infer Param}\` ? Param : never

type P = ExtractParam<":id">     // "id"
type Q = ExtractParam<":userId"> // "userId"
type R = ExtractParam<"users">   // never

// Extract ALL params from a full route path (recursive):
type ExtractRouteParams<Path extends string> =
  Path extends \`\${infer _Start}:\${infer Param}/\${infer Rest}\`
    ? Param | ExtractRouteParams<\`/\${Rest}\`>
    : Path extends \`\${infer _Start}:\${infer Param}\`
      ? Param
      : never

type Params = ExtractRouteParams<"/users/:userId/orders/:orderId">
// "userId" | "orderId"
\`\`\`

COMBINING WITH MAPPED TYPES
─────────────────────────────
\`\`\`typescript
type Setters<State> = {
  [K in keyof State as \`set\${Capitalize<string & K>}\`]: (value: State[K]) => void
}

type AppState = { count: number; name: string; loading: boolean }
type AppSetters = Setters<AppState>
// { setCount: (value: number) => void; setName: (value: string) => void; setLoading: (value: boolean) => void }
\`\`\``,
    code: `// ─── EXAMPLE 1: Basic template literal types ─────────────────────────────
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
type ApiVersion = "v1" | "v2"
type Resource   = "users" | "orders" | "products"

type ApiEndpoint = \`/api/\${ApiVersion}/\${Resource}\`
// 6 valid endpoints: "/api/v1/users" | "/api/v1/orders" | ... | "/api/v2/products"

function callApi(endpoint: ApiEndpoint, method: HttpMethod) {
  return fetch(endpoint, { method })
}

callApi("/api/v1/users", "GET")      // ✅
callApi("/api/v2/orders", "POST")    // ✅
callApi("/api/v3/users", "GET")      // ERROR — v3 not in ApiVersion ✅
callApi("/users", "GET")             // ERROR — missing /api/version prefix ✅

// ─── EXAMPLE 2: Event handler names from event types ────────────────────
type DOMEvent = "click" | "focus" | "blur" | "change" | "submit" | "keydown"

type ElementProps = {
  [E in DOMEvent as \`on\${Capitalize<E>}\`]?: (event: Event) => void
}
// { onClick?: ...; onFocus?: ...; onBlur?: ...; onChange?: ...; onSubmit?: ...; onKeydown?: ... }

// ─── EXAMPLE 3: Route parameter extraction ───────────────────────────────
type ExtractRouteParams<Path extends string> =
  Path extends \`\${infer _Before}:\${infer Param}/\${infer Rest}\`
    ? Param | ExtractRouteParams<Rest>
    : Path extends \`\${infer _Before}:\${infer Param}\`
      ? Param
      : never

type Params1 = ExtractRouteParams<"/users/:userId">
// "userId"

type Params2 = ExtractRouteParams<"/users/:userId/orders/:orderId/items/:itemId">
// "userId" | "orderId" | "itemId"

type RouteHandler<Path extends string> = (
  params: { [K in ExtractRouteParams<Path>]: string },
  req: Request,
  res: Response
) => void

const handler: RouteHandler<"/users/:userId/orders/:orderId"> = (params) => {
  console.log(params.userId)   // string ✅
  console.log(params.orderId)  // string ✅
  console.log(params.unknown)  // ERROR ✅
}

// ─── EXAMPLE 4: Auto-generating setter types ─────────────────────────────
type OrderState = {
  orderId: string
  status: "pending" | "confirmed" | "shipped" | "delivered"
  amount: number
  customerId: string
}

type StateSetter<T> = {
  [K in keyof T as \`set\${Capitalize<string & K>}\`]: (value: T[K]) => void
}

type OrderSetters = StateSetter<OrderState>
// {
//   setOrderId: (value: string) => void
//   setStatus: (value: "pending" | "confirmed" | "shipped" | "delivered") => void
//   setAmount: (value: number) => void
//   setCustomerId: (value: string) => void
// }

// ─── EXAMPLE 5: CSS directional property types ───────────────────────────
type CSSProperty  = "margin" | "padding" | "border"
type CSSDirection = "top" | "right" | "bottom" | "left"
type CSSDirectionalProperty = \`\${CSSProperty}-\${CSSDirection}\`
// "margin-top" | "margin-right" | ... | "border-left" — 12 combinations

type DirectionalStyles = Partial<Record<CSSDirectionalProperty, string | number>>

const styles: DirectionalStyles = {
  "margin-top":    16,
  "padding-left":  "1rem",
  "border-bottom": "1px solid #eee"
}
// "margin-diagonal": 8  // ERROR ✅

// ─── EXAMPLE 6: Intrinsic string utilities in type transforms ─────────────
type ApiField = "user_id" | "first_name" | "last_name" | "created_at"

type ConstantCase<S extends string> = Uppercase<S>
type ConstantFields = ConstantCase<ApiField>
// "USER_ID" | "FIRST_NAME" | "LAST_NAME" | "CREATED_AT"

type GetterName<S extends string> = \`get\${Capitalize<S>}\`
type Getters2 = GetterName<"userId" | "firstName" | "lastName">
// "getUserId" | "getFirstName" | "getLastName"

// ─── EXAMPLE 7: Typed SQL-style column filter builder ────────────────────
type Column = "name" | "email" | "age" | "status"
type Operator = "eq" | "gt" | "lt" | "like" | "in"
type FilterKey = \`\${Column}__\${Operator}\`
// "name__eq" | "name__gt" | ... | "status__in" — 20 combinations

type FilterParams = Partial<Record<FilterKey, string | number | string[]>>

function buildQuery(filters: FilterParams): string {
  return Object.entries(filters)
    .map(([key, val]) => \`\${key}=\${val}\`)
    .join("&")
}

const query = buildQuery({
  "name__like": "Sharma",
  "age__gt": 18,
  "status__eq": "active"
})  // ✅ all keys validated at compile time`,
    bugs: `BUG 1 — Template literal union explosion
─────────────────────────────────────────
type Color     = "red"|"green"|"blue"|"yellow"|"purple"|"orange"|"pink"|"white"|"black"|"grey"
type Size      = "xs"|"sm"|"md"|"lg"|"xl"|"2xl"|"3xl"|"4xl"
type Variant   = "solid"|"outline"|"ghost"|"link"|"soft"
type Intensity = "100"|"200"|"300"|"400"|"500"|"600"|"700"|"800"|"900"

type ButtonClass = \`\${Color}-\${Size}-\${Variant}-\${Intensity}\`
// 10 × 8 × 5 × 9 = 3,600 combinations — TypeScript warns "union too complex"
// IDE becomes extremely slow or crashes during autocomplete

Fix: Split into separate smaller unions. For utility-class systems (like Tailwind),
use string rather than trying to type all combinations.

BUG 2 — Capitalize only affects the FIRST character
──────────────────────────────────────────────────────
type Key  = "firstName"
type Good = \`get\${Capitalize<Key>}\`  // "getFirstName" ✅

type Key2 = "first_name"
type Bad  = \`get\${Capitalize<Key2>}\`  // "getFirst_name" ❌ — not camelCase!
// Capitalize only touches the first character of the full string

Fix: Write a SnakeToCamel recursive type before applying Capitalize (see Concept 7).

BUG 3 — numbers in template literals become strings
─────────────────────────────────────────────────────
type Version = 1 | 2 | 3
type VersionStr = \`v\${Version}\`  // "v1" | "v2" | "v3" ✅ — intended

// But the reverse direction is lost:
type PxValue = \`\${number}px\`
const a: PxValue = \`\${16}px\`    // ✅
const b: PxValue = "16px"      // ✅
const c: PxValue = 16          // ERROR — number is not PxValue ✅ correctly caught

// Important: \`\${number}px\` matches any stringified JS number followed by "px"

BUG 4 — Recursive template type doesn't terminate on deep inputs
──────────────────────────────────────────────────────────────────
type Join<T extends string[], D extends string> =
  T extends [infer F extends string, ...infer R extends string[]]
    ? R["length"] extends 0
      ? F
      : \`\${F}\${D}\${Join<R, D>}\`
    : never

// On tuples with 20+ elements, TypeScript may produce "string" instead of
// the specific concatenated literal — it hits an internal recursion limit.

Fix: Keep recursive template literal types shallow (< 10 levels).

BUG 5 — infer in template literals takes the shortest (non-greedy) first match
─────────────────────────────────────────────────────────────────────────────────
type ExtractFirst<S extends string> = S extends \`\${infer First}-\${string}\` ? First : never

type A = ExtractFirst<"border-top-left">
// "border" — TypeScript stops at the FIRST "-"
// This surprises people expecting greedy matching

type ExtractLast<S extends string> = S extends \`\${string}-\${infer Last}\` ? Last : never
type B = ExtractLast<"border-top-left">
// "left" — TypeScript greedily captures the LAST segment

Fix: Know that first-position infer is non-greedy, last-position infer is greedy.
Structure patterns accordingly.`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
type A = \`\${"a" | "b"}\${"1" | "2"}\`
type B = \`prefix_\${Uppercase<"hello" | "world">}\`
type C = \`\${Capitalize<"firstName" | "lastName">}\`

type ExtractAfterColon<S extends string> = S extends \`\${string}:\${infer After}\` ? After : never
type D = ExtractAfterColon<"method:GET">
type E = ExtractAfterColon<"a:b:c">
type F = ExtractAfterColon<"nocolon">

Q: What are the exact types of A, B, C, D, E, and F?
   For E — which part does TypeScript capture as "After"? Why?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This typed event system has 3 issues. Find and fix them.

type Events = {
  userCreated: { userId: string; name: string }
  orderPlaced: { orderId: string; amount: number }
  paymentProcessed: { orderId: string; success: boolean }
}

type EventName = keyof Events

// Bug 1: handler type uses Events instead of Events[E]
type HandlerMap = {
  [E in EventName as \`on\${Capitalize<E>}\`]: (payload: Events) => void
}

// Bug 2: extracting event name from handler name
// "onUserCreated" → should give "userCreated", but gives "UserCreated" instead
type ExtractEventName<H extends string> = H extends \`on\${infer E}\` ? E : never

// Bug 3: This emit call should error for missing amount but doesn't — why?
declare function emit<E extends EventName>(event: E, payload: Events[E]): void
emit("orderPlaced", { orderId: "O1" })  // should error — amount is missing

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a fully typed URL builder for a REST API:
1. Define route templates: "/users", "/users/:id", "/users/:id/orders", "/users/:id/orders/:orderId"
2. Write ExtractParams<Route> — extracts parameter names from a route template
3. Write RouteParams<Route> — maps extracted param names to { [K]: string }; resolves to {} if no params
4. Write buildUrl<Route extends string>(route: Route, params: RouteParams<Route>): string — replaces :param segments with values, type-safe
5. Test: buildUrl("/users/:id", { id: "U123" }) → "/users/U123"
6. Test: buildUrl("/users", {}) → "/users"
7. Test: buildUrl("/users/:id", {}) → TypeScript error — id is required`,
    summary: "Template literal types turn string manipulation into a compile-time operation — patterns that used to require runtime validation or unsafe `string` types can now be expressed, checked, and autocompleted by TypeScript, making string-based APIs as safe as any structured type."
  },

  {
    id: 10,
    title: "Declaration Files & Module Augmentation",
    tag: "TEACHING TYPESCRIPT ABOUT THE OUTSIDE WORLD",
    color: "#16A085",
    tldr: "Declaration files (`.d.ts`) are type-only files that tell TypeScript the shape of JavaScript code it can't see — third-party libraries, global variables, platform APIs. Module augmentation lets you extend existing type declarations without modifying them, the proper way to add `user` to Express's `Request` or custom properties to the global `Window`.",
    problem: `You install a JavaScript library. TypeScript has no idea what it exports, what functions it has, what they accept or return. Without declaration files, every import from that library is \`any\`. You lose all type safety, all autocomplete, all error detection.

The first problem is consuming untyped libraries: how do you add types to a package that doesn't ship them?

The second problem is augmenting existing types: you've set up a JWT middleware that attaches \`user\` to every Express \`Request\`. TypeScript doesn't know this. Every time you write \`req.user\`, it errors. The wrong fix is \`(req as any).user\` — that's a lie. The right fix is module augmentation.

The third problem is global types: your app sets up a \`window.analytics\` object, or a \`__APP_CONFIG__\` global, or you're writing a browser extension. How do you type things that exist globally but aren't defined in any importable module?

Declaration files and module augmentation are the complete answer to all three.`,
    analogy: `Think of declaration files as the customs manifest for a shipping container. The container (JavaScript library) has arrived at the port. TypeScript is the customs inspector who needs to know what's inside before allowing it into your code. The manifest (\`.d.ts\` file) lists every item — its name, type, and description — without being the item itself.

The DefinitelyTyped ecosystem (\`@types/*\`) is like a warehouse of pre-filled manifests maintained by the community. Need types for \`lodash\`? Someone's already written the manifest — just pull it from the warehouse.

Module augmentation is like an amendment to an existing legal contract. You don't rewrite the whole contract (the library's types). You file an addendum: "In addition to the original terms, Request now also has a \`user\` property of type \`AuthUser\`." The amendment is separate, legally binding, and doesn't require touching the original.

Ambient declarations (\`declare const\`, \`declare function\`) are like a credit note in accounting — acknowledging the existence of something without creating it. "This exists, trust me." TypeScript notes it and moves on.`,
    deep: `HOW TYPESCRIPT FINDS DECLARATION FILES
────────────────────────────────────────
1. For npm packages: TypeScript looks for a \`types\` or \`typings\` field in \`package.json\`, then falls back to \`index.d.ts\` in the package root.
2. For \`@types/package\`: TypeScript automatically includes \`node_modules/@types/package/index.d.ts\`.
3. For project-local declarations: any \`.d.ts\` file in your tsconfig \`include\` paths is automatically included.
4. Triple-slash references: \`/// <reference types="..." />\` and \`/// <reference path="..." />\` explicitly pull in declaration files.

MODULE vs SCRIPT DECLARATION FILES
──────────────────────────────────────
A \`.d.ts\` file is a MODULE if it contains any \`import\` or \`export\`. Otherwise it's a SCRIPT — its declarations become global.

\`\`\`typescript
// ambient.d.ts — NO import/export — SCRIPT — declarations are global
declare const __APP_VERSION__: string
declare function trackEvent(name: string, data?: object): void

// module.d.ts — HAS export — MODULE — declarations are scoped
export declare function fetchUser(id: string): Promise<User>
\`\`\`

MODULE AUGMENTATION MECHANICS
───────────────────────────────
\`\`\`typescript
// types/express/index.d.ts
// import "express"  // make this a module file

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser
    requestId: string
  }
}
\`\`\`

GLOBAL AUGMENTATION (from module file)
────────────────────────────────────────
\`\`\`typescript
export {}  // CRITICAL — makes this a module

declare global {
  interface Window {
    analytics: AnalyticsInstance
  }
  const __DEV__: boolean
}
\`\`\`

WRITING DECLARATIONS FOR PLAIN JS LIBRARIES
──────────────────────────────────────────────
\`\`\`typescript
declare module "my-utils" {
  export function formatCurrency(amount: number, locale?: string): string
  export function parseDate(str: string): Date | null
  export const VERSION: string
}
\`\`\``,
    code: `// ─── EXAMPLE 1: Basic .d.ts — declaring a JS library ────────────────────
// File: types/razorpay.d.ts
// Simplified type declaration for Razorpay's browser SDK

declare module "razorpay-browser" {
  interface RazorpayOptions {
    key: string
    amount: number      // in paise (₹1 = 100 paise)
    currency: string
    name: string
    description?: string
    orderId: string
    prefill?: {
      name?: string
      email?: string
      contact?: string
    }
    theme?: { color?: string }
    handler: (response: RazorpayResponse) => void
  }

  interface RazorpayResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }

  class Razorpay {
    constructor(options: RazorpayOptions)
    open(): void
    close(): void
  }

  export = Razorpay
}

// Now in your app:
// const rzp = new Razorpay({ key: "rzp_live_xxx", ... })  // fully typed ✅

// ─── EXAMPLE 2: Augmenting Express Request ───────────────────────────────
// File: types/express/index.d.ts

// import "express"  // CRITICAL — makes this a module for augmentation

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string
      email: string
      role: "admin" | "user" | "moderator"
    }
    requestId: string
    startTime: number
  }
}

// Now in any route handler:
// app.get("/profile", (req, res) => {
//   req.user?.email  // string | undefined ✅ — no more casting to any
//   req.requestId    // string ✅
// })

// ─── EXAMPLE 3: Global window augmentation ───────────────────────────────
// File: types/global.d.ts

export {}  // CRITICAL — makes this a module, enabling declare global

declare global {
  interface Window {
    analytics: {
      track(event: string, properties?: Record<string, unknown>): void
      identify(userId: string, traits?: Record<string, unknown>): void
      page(name?: string, properties?: Record<string, unknown>): void
    }
    __APP_CONFIG__: {
      apiBaseUrl: string
      featureFlags: Record<string, boolean>
      version: string
    }
  }

  const __DEV__: boolean
  const __PROD__: boolean
}

// Usage anywhere in app:
// window.analytics.track("order_placed", { amount: 1499, orderId: "O123" })  ✅
// if (__DEV__) console.log("Debug mode")  ✅

// ─── EXAMPLE 4: Vite env variables ───────────────────────────────────────
// File: src/env.d.ts  (script mode — no import/export)

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_RAZORPAY_KEY: string
  readonly VITE_ENVIRONMENT: "development" | "staging" | "production"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Usage:
// const url = import.meta.env.VITE_API_BASE_URL    // string ✅
// const bad = import.meta.env.VITE_UNDEFINED_KEY   // ERROR ✅

// ─── EXAMPLE 5: Triple-slash references ──────────────────────────────────
// File: src/main.ts

/// <reference types="vite/client" />
/// <reference path="../types/global.d.ts" />

// These pull in type definitions explicitly
// Usually not needed with modern tsconfig include settings
// Still useful for: library entry points, isolated compilation

// ─── EXAMPLE 6: UMD library loaded via CDN script tag ────────────────────
// File: types/chart-cdn.d.ts

declare namespace ChartLibrary {
  interface ChartOptions {
    type: "line" | "bar" | "pie" | "donut"
    data: number[]
    labels: string[]
    colors?: string[]
  }

  class Chart {
    constructor(container: HTMLElement, options: ChartOptions)
    update(data: number[]): void
    destroy(): void
  }
}

// Exposed as window global by CDN script:
declare const ChartLib: typeof ChartLibrary.Chart

// Usage:
// const chart = new ChartLib(document.getElementById("chart")!, {
//   type: "bar",
//   data: [120, 340, 210, 480],
//   labels: ["Q1", "Q2", "Q3", "Q4"],
// })  // ✅

// ─── EXAMPLE 7: Augmenting a styled-components theme ─────────────────────
// File: types/styled-components.d.ts

// import "styled-components"  // CRITICAL — module augmentation requires import

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      primary: string
      secondary: string
      danger: string
      success: string
      text: { primary: string; secondary: string; muted: string }
    }
    spacing: { xs: string; sm: string; md: string; lg: string; xl: string }
    borderRadius: { sm: string; md: string; full: string }
  }
}

// Now in styled components:
// const Button = styled.button\`
//   background: \${({ theme }) => theme.colors.primary};  // ✅ fully typed
//   padding: \${({ theme }) => theme.spacing.md};         // ✅
// \``,
    bugs: `BUG 1 — Module augmentation in a script file (missing import/export)
────────────────────────────────────────────────────────────────────
// File: types/express.d.ts — NO import/export — this is a SCRIPT file
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser
  }
}
// Without a module context, augmentation may silently fail.
// req.user is still typed as 'any'.

Fix: Add \`import "express"\` or \`export {}\` at the top to make it a module file.

BUG 2 — Declaration files not included in tsconfig
───────────────────────────────────────────────────
// tsconfig.json:
// { "include": ["src/**/*"] }
// types/ folder is OUTSIDE src/ — none of your .d.ts files are loaded!
// TypeScript silently falls back to any for everything those files declared.

Fix: Add the types path to tsconfig include:
// { "include": ["src/**/*", "types/**/*"] }

BUG 3 — Duplicate global augmentation causes intersection
──────────────────────────────────────────────────────────
// File A:
declare global { interface Window { user: AdminUser } }

// File B (different developer):
declare global { interface Window { user: PublicUser } }

// Result: window.user is AdminUser & PublicUser — an impossible intersection!
// Declaration merging combines BOTH, and runtime only provides one type.

Fix: Designate ONE authoritative global.d.ts. Prevent duplicate augmentation
through code review or TypeScript project references.

BUG 4 — @types package version mismatch
─────────────────────────────────────────
// Installed: express@4.18.2 and @types/express@4.17.0
// Minor version gap causes missing methods, wrong signatures.
// TypeScript says a method doesn't exist, but it's there at runtime.

// Installed: @types/node@18 but running on Node 20
// fetch() and newer stream methods aren't in the Node 18 types.
// You get runtime success but compile-time errors.

Fix: Keep @types packages in lockstep with their runtime counterparts.
Pin versions and check the @types README for which runtime version it targets.

BUG 5 — declare module wildcard catching more than intended
────────────────────────────────────────────────────────────
declare module "*.svg" {
  const content: string
  export default content
}

// This says ALL .svg imports return string.
// But with @svgr/webpack configured, .svg imports return React components.
// TypeScript says string — runtime returns a function.
// Calling the "string" as JSX blows up at runtime.

Fix: Match your declaration to your actual bundler behavior:
// For SVGR:
declare module "*.svg" {
  // import type React from "react"  // in actual .d.ts
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  export default ReactComponent
}`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
// File A: global.d.ts (NO import/export — SCRIPT)
declare const APP_NAME: string
interface Window { version: string }

// File B: module.d.ts (HAS export — MODULE)
export {}
declare global {
  const APP_ENV: "dev" | "prod"
  interface Window { analytics: { track(e: string): void } }
}

// File C: augment.d.ts (HAS import)
import "express"
declare module "express-serve-static-core" {
  interface Request { userId: string }
}

Q: Which declarations become global and which are module-scoped?
   Can File A also do declare module "express" { ... } augmentation? Why or why not?
   What's the difference between Window in File A vs File B?
   Why does File C need import "express" at the top?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This project has 4 declaration-related bugs. Identify and fix each.

// tsconfig.json: { "include": ["src/**/*"] }

// src/types.d.ts:
declare module "analytics-sdk" {
  function track(event: string): void
  function identify(userId: string): void
}

// src/augment.d.ts:
declare module "express" {
  interface Request { user: { id: string; role: string } }
}

// src/global.d.ts:
declare const process: {
  env: { NODE_ENV: string; API_KEY: string }
}

// src/app.ts:
// import express from "express"
// import { track } from "analytics-sdk"

// Bug 1: analytics-sdk module declaration — wrong style for CommonJS module.exports
// Bug 2: express Request augmentation isn't working — which module should be augmented?
// Bug 3: process redeclaration conflicts with @types/node — causes missing properties
// Bug 4: global.d.ts has no import/export — what side effects does this have on module augmentation in other files?

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Write a complete type declaration setup for a fictional payment library "rupay-sdk":
1. The library uses CommonJS: const RupaySdk = require("rupay-sdk")
2. Declare: createPayment(opts), verifyPayment(id, sig), getPaymentStatus(id)
3. Interfaces: PaymentOptions (amount in paise, currency, description, customerEmail, customerPhone), Payment (id, status, createdAt, amount, currency), PaymentStatus union type
4. Augment Express Request to include payment?: Payment from this library
5. Add a global __RUPAY_ENV__: "test" | "live" ambient constant
6. Show the correct directory structure and tsconfig include paths for all these declarations`,
    summary: "Declaration files are TypeScript's passport system for the JavaScript ecosystem — they let typed and untyped worlds coexist safely. Module augmentation is the proper, non-destructive way to extend third-party types, keeping your additions in a separate file while making them globally available throughout your project."
  }
];
