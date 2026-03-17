const concepts = [
  {
    id: 1,
    title: "Layered Architecture",
    tag: "CONTROLLERS → SERVICES → REPOSITORIES",
    color: "#E74C3C",
    tldr: "Layered architecture splits your backend into three clear tiers: Controllers handle HTTP, Services hold business logic, Repositories handle data access. Each layer only talks to the layer below it, making every part independently testable, swappable, and understandable.",
    problem: `The most common beginner backend pattern looks like this: one fat route handler that parses the request, validates the data, runs the business logic, queries the database, and sends the response — all in 80 lines. It works. Until it doesn't.

When requirements change (they always do), you have to untangle every concern from every other concern. When you want to test the business logic, you can't — it's welded to the HTTP layer and the database. When you want to swap PostgreSQL for MongoDB, you have to touch business logic files. When a second endpoint needs the same logic, you copy-paste it and now the bug lives in two places.

The concrete pain points:
- Can't unit test business logic without spinning up a real HTTP server and database
- Adding a new endpoint that needs the same logic requires duplication
- A database change (add a column, rename a field) ripples through route handlers
- A junior dev adds business logic into a controller "just quickly" — now it's permanent
- Impossible to mock the database in tests — tests are slow and flaky

Layered architecture is the minimum structure needed to avoid this. It's not about following rules for their own sake — it's about making your codebase changeable and testable without fear.`,
    analogy: `Think of a restaurant. Three distinct roles, three distinct concerns.

The waiter (Controller) takes your order, handles the customer interaction, translates what you said into kitchen language, and brings the food back. The waiter doesn't know how to cook. They don't care if the kitchen uses a gas stove or electric. Their job is purely the interface between customer and kitchen.

The chef (Service) knows the recipes. They understand the business: which items can be substituted, what the specials are today, what the dietary rules are. The chef doesn't interact with customers directly. They also don't know whether the ingredients came from supplier A or B.

The storeroom manager (Repository) knows exactly where everything is kept and handles all supplier interactions. If you switch from one vegetable supplier to another, only the storeroom manager needs to know. The chef keeps using the same interface: "give me 200g of tomatoes."

This separation means you can retrain your waiter staff without retraining the chefs. You can change vegetable suppliers without touching the recipes. You can test your recipes in isolation with mock ingredients.`,
    deep: `THE DEPENDENCY DIRECTION RULE
─────────────────────────────
Controllers import/depend on Services. Services import/depend on Repositories.
Nothing in a lower layer should import from a higher layer.

\`\`\`
HTTP Request
    ↓
Controller (parses req, validates input shape, calls service, sends res)
    ↓
Service (business logic, orchestration, domain rules)
    ↓
Repository (SQL/NoSQL queries, ORM calls, raw DB access)
    ↓
Database
\`\`\`

WHAT BELONGS IN EACH LAYER
───────────────────────────
Controller:
- Parse req.body, req.params, req.query
- Input validation (shape validation — is email a string?)
- Call one or more service methods
- Map service result to HTTP response (status codes, response shape)
- Error handling: catch errors from service, map to HTTP status codes
- NEVER: business rules, database queries, direct DB imports

Service:
- Business rules ("a user can only have 3 active orders")
- Orchestration ("to place an order: validate stock, charge payment, send email")
- Domain logic ("₹ amount must be in paise, apply GST at 18%")
- Transaction boundaries (start/commit/rollback)
- NEVER: req/res objects, HTTP status codes, raw SQL

Repository:
- SQL queries, ORM calls (Prisma, TypeORM, Sequelize)
- MongoDB queries
- Caching read-through (optional — or in a dedicated cache layer)
- Data mapping (DB row → domain object)
- NEVER: business logic, HTTP concerns

TESTING EACH LAYER
───────────────────
Controller tests: use supertest, mock the service layer, test HTTP behavior
Service tests: unit tests, mock the repository, test business logic in isolation
Repository tests: integration tests against a real (test) database

REAL-WORLD ADDITIONS
─────────────────────
Beyond the three layers, production apps often add:
- DTO layer (Data Transfer Objects): typed shapes for what enters/exits each layer
- Domain layer: rich domain objects with behavior (DDD)
- Cache layer: between Service and Repository
- Event layer: services emit domain events, other services subscribe`,
    code: `// ─── FILE STRUCTURE ──────────────────────────────────────────────────────
// src/
//   controllers/order.controller.ts
//   services/order.service.ts
//   repositories/order.repository.ts
//   routes/order.routes.ts

// ─── REPOSITORY LAYER ────────────────────────────────────────────────────
// repositories/order.repository.ts

// interface IOrderRepository — the contract
interface IOrderRepository {
  findById(id: string): Promise<Order | null>
  findByCustomerId(customerId: string): Promise<Order[]>
  create(data: CreateOrderData): Promise<Order>
  updateStatus(id: string, status: OrderStatus): Promise<Order>
}

class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true }
    })
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    })
  }

  async create(data: CreateOrderData): Promise<Order> {
    return this.prisma.order.create({
      data: {
        customerId: data.customerId,
        items: { create: data.items },
        totalAmount: data.totalAmount,
        status: "PENDING"
      },
      include: { items: true }
    })
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    })
  }
}

// ─── SERVICE LAYER ────────────────────────────────────────────────────────
// services/order.service.ts

class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly paymentService: IPaymentService,
    private readonly inventoryService: IInventoryService,
    private readonly emailService: IEmailService
  ) {}

  async placeOrder(customerId: string, items: OrderItemInput[]): Promise<Order> {
    // Business rule 1: validate stock availability
    for (const item of items) {
      const inStock = await this.inventoryService.checkStock(item.productId, item.qty)
      if (!inStock) {
        throw new InsufficientStockError(\`Product \${item.productId} is out of stock\`)
      }
    }

    // Business rule 2: calculate total with 18% GST
    const subtotal = items.reduce((sum, i) => sum + (i.pricePerUnit * i.qty), 0)
    const gst = Math.round(subtotal * 0.18)
    const totalAmount = subtotal + gst  // in paise

    // Business rule 3: reserve inventory
    await this.inventoryService.reserveItems(items)

    // Create order record
    const order = await this.orderRepository.create({
      customerId,
      items,
      totalAmount
    })

    // Send confirmation email (non-blocking)
    this.emailService.sendOrderConfirmation(order).catch(err => {
      console.error("Email failed — order still placed:", err)
    })

    return order
  }

  async cancelOrder(orderId: string, requesterId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId)
    if (!order) throw new NotFoundError(\`Order \${orderId} not found\`)

    // Business rule: only owner can cancel
    if (order.customerId !== requesterId) {
      throw new ForbiddenError("You can only cancel your own orders")
    }

    // Business rule: can't cancel delivered/shipped orders
    if (["SHIPPED", "DELIVERED"].includes(order.status)) {
      throw new BusinessRuleError(\`Cannot cancel order in status: \${order.status}\`)
    }

    await this.inventoryService.releaseItems(order.items)
    return this.orderRepository.updateStatus(orderId, "CANCELLED")
  }
}

// ─── CONTROLLER LAYER ────────────────────────────────────────────────────
// controllers/order.controller.ts

class OrderController {
  constructor(private readonly orderService: OrderService) {}

  async placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Controller concern: parse and validate input SHAPE
      const { items } = req.body
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "items must be a non-empty array" })
        return
      }

      const customerId = req.user!.id  // set by auth middleware

      // Delegate to service — controller doesn't know HOW an order is placed
      const order = await this.orderService.placeOrder(customerId, items)

      // Controller concern: map result to HTTP response
      res.status(201).json({
        success: true,
        data: order
      })
    } catch (error) {
      // Controller concern: map domain errors to HTTP status codes
      if (error instanceof InsufficientStockError) {
        res.status(409).json({ error: error.message })
        return
      }
      next(error)  // pass unexpected errors to global error handler
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params
      const order = await this.orderService.cancelOrder(orderId, req.user!.id)
      res.json({ success: true, data: order })
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message })
        return
      }
      if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message })
        return
      }
      if (error instanceof BusinessRuleError) {
        res.status(422).json({ error: error.message })
        return
      }
      next(error)
    }
  }
}

// ─── ROUTES WIRING ────────────────────────────────────────────────────────
// routes/order.routes.ts

function createOrderRouter(orderController: OrderController): Router {
  const router = Router()
  router.post("/", authMiddleware, orderController.placeOrder.bind(orderController))
  router.delete("/:orderId", authMiddleware, orderController.cancelOrder.bind(orderController))
  return router
}

// ─── UNIT TEST — SERVICE LAYER ────────────────────────────────────────────
// tests/order.service.test.ts

describe("OrderService.placeOrder", () => {
  let orderService: OrderService
  let mockOrderRepo: jest.Mocked<IOrderRepository>
  let mockInventoryService: jest.Mocked<IInventoryService>

  beforeEach(() => {
    // Mock ONLY the dependencies — test pure business logic
    mockOrderRepo = {
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn()
    }
    mockInventoryService = {
      checkStock: jest.fn().mockResolvedValue(true),
      reserveItems: jest.fn().mockResolvedValue(undefined),
      releaseItems: jest.fn().mockResolvedValue(undefined)
    }
    const mockEmailService = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) }
    const mockPaymentService = {}

    orderService = new OrderService(
      mockOrderRepo,
      mockPaymentService as any,
      mockInventoryService,
      mockEmailService as any
    )
  })

  it("throws InsufficientStockError when item is out of stock", async () => {
    mockInventoryService.checkStock.mockResolvedValue(false)
    await expect(
      orderService.placeOrder("customer-1", [{ productId: "P1", qty: 2, pricePerUnit: 50000 }])
    ).rejects.toThrow(InsufficientStockError)
    expect(mockOrderRepo.create).not.toHaveBeenCalled()
  })

  it("calculates GST correctly — 18% added to subtotal", async () => {
    const items = [{ productId: "P1", qty: 1, pricePerUnit: 100000 }]  // ₹1000 in paise
    mockOrderRepo.create.mockResolvedValue({ id: "O1", totalAmount: 118000 } as any)

    await orderService.placeOrder("customer-1", items)

    expect(mockOrderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 118000 })  // 100000 + 18000 GST
    )
  })
})`,
    bugs: `BUG 1 — Business logic leaking into the controller
───────────────────────────────────────────────────
// WRONG — GST calculation in the controller
app.post("/orders", async (req, res) => {
  const { items } = req.body
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const total = subtotal + (subtotal * 0.18)  // GST hardcoded in controller!
  await db.query("INSERT INTO orders (total) VALUES ($1)", [total])
  res.json({ total })
})

// Six months later: GST rate changes for specific product categories.
// You have to hunt through controllers to find all the places GST is calculated.
// Some get updated, some don't. Silent incorrect invoices are generated.

Fix: All business rules (GST, discount logic, eligibility checks) live in the Service layer.
Controller only calls service and maps the result.

BUG 2 — Repository doing business logic
────────────────────────────────────────
class OrderRepository {
  async createOrder(customerId: string, items: any[]) {
    // WRONG — stock check in repository
    for (const item of items) {
      const stock = await this.db.query("SELECT qty FROM stock WHERE id = $1", [item.id])
      if (stock.rows[0].qty < item.qty) throw new Error("Out of stock")
    }
    // ... insert order
  }
}
// Repository now knows about stock validation — a business rule.
// Testing this requires a real database.
// You can't test the business rule without the database.

Fix: Stock validation belongs in OrderService. Repository only does: "save this data."

BUG 3 — Controller directly importing from repository (skipping service)
────────────────────────────────────────────────────────────────────────
// WRONG
class OrderController {
  constructor(private orderRepo: OrderRepository) {}  // imports repo directly!
  
  async getOrder(req, res) {
    const order = await this.orderRepo.findById(req.params.id)
    // No authorization check — anyone can see any order!
    res.json(order)
  }
}
// Business rule (only owner can view their order) is bypassed entirely.
// Service layer's authorization logic is skipped.
// This is how authorization bugs happen in production.

Fix: Controllers must ALWAYS go through the Service layer.
The service enforces business rules like ownership checks.

BUG 4 — Returning raw DB rows from repository (exposing internal schema)
───────────────────────────────────────────────────────────────────────────
// Repository returns Prisma's auto-generated type directly to controller
async findOrder(id: string) {
  return this.prisma.order.findUnique({ where: { id } })
  // Returns: { id, customer_id, total_amount_paise, created_at, ... }
}
// Now your API response exposes: customer_id (snake_case), total_amount_paise
// Frontend has to know your DB schema column names.
// If you rename the column, your API breaks.

Fix: Repository maps DB rows to domain objects:
async findOrder(id: string): Promise<Order | null> {
  const row = await this.prisma.order.findUnique({ where: { id } })
  if (!row) return null
  return {
    id: row.id,
    customerId: row.customer_id,
    totalAmountInPaise: row.total_amount_paise,
    createdAt: row.created_at
  }
}

BUG 5 — Service layer tightly coupled to HTTP context
──────────────────────────────────────────────────────
class OrderService {
  async placeOrder(req: Request) {  // WRONG — req is an HTTP concept!
    const customerId = req.user.id
    const items = req.body.items
    // ...
  }
}
// Now OrderService can't be called from:
// - A CLI script ("process pending orders")
// - A cron job
// - A message queue consumer
// - A unit test (must mock the entire req object)

Fix: Services accept plain data, never Express req/res objects:
async placeOrder(customerId: string, items: OrderItemInput[]): Promise<Order>`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
Consider this layered structure:

class UserRepository {
  async findByEmail(email: string) {
    return { id: "U1", email, passwordHash: "abc123", role: "admin" }
  }
}

class UserService {
  constructor(private repo: UserRepository) {}
  async getProfile(email: string) {
    const user = await this.repo.findByEmail(email)
    return user
  }
}

class UserController {
  constructor(private service: UserService) {}
  async getProfile(req: Request, res: Response) {
    const user = await this.service.getProfile(req.params.email)
    res.json(user)
  }
}

Q: What critical security bug exists in this layered structure?
   In which layer should it be fixed, and how?
   Why is this bug WORSE than if you had everything in one route handler?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This OrderService has 4 architectural violations. Identify each one.

class OrderService {
  async placeOrder(req: Request, res: Response) {
    const { items, couponCode } = req.body

    // Validate input
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No items" })
    }

    // Calculate price
    const total = items.reduce((s: number, i: any) => s + i.price, 0)

    // Apply coupon
    const conn = await pool.getConnection()
    const [coupon] = await conn.query("SELECT * FROM coupons WHERE code = ?", [couponCode])
    const finalTotal = coupon ? total * (1 - coupon.discount) : total

    // Save order  
    const [result] = await conn.query("INSERT INTO orders (total) VALUES (?)", [finalTotal])
    
    return res.status(201).json({ orderId: result.insertId })
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design and implement a complete layered architecture for a "Wallet" feature:
1. WalletRepository: findByUserId, getBalance, debit, credit (all typed)
2. WalletService: addMoney, withdraw (with balance check), transfer (atomic), getStatement
   - addMoney: max ₹1,00,000 per day (check daily limit)
   - withdraw: must have sufficient balance, min ₹1 withdrawal
   - transfer: debit from, credit to — must be atomic (both or neither)
3. WalletController: maps to HTTP, handles errors, sends correct status codes
4. Write unit tests for WalletService with mocked repository
5. Define all error types (InsufficientBalanceError, DailyLimitExceededError, etc.)`,
    summary: "Layered architecture is the minimum structure a maintainable backend needs — Controllers own HTTP, Services own business logic, Repositories own data access. Keep each layer ignorant of layers above it, and every part of your system becomes independently testable, replaceable, and understandable."
  },

  {
    id: 2,
    title: "SOLID Principles",
    tag: "THE FIVE LAWS OF MAINTAINABLE CODE",
    color: "#2980B9",
    tldr: "SOLID is five principles that make backend code maintainable as it grows: each class has one job, new features extend rather than modify, substitutes are truly substitutable, interfaces stay focused, and you depend on contracts not implementations. Applied to real Node/Express backends, they prevent the most common architectural decay patterns.",
    problem: `SOLID principles are often taught with toy examples — animals that quack, shapes that draw themselves. Nobody builds those systems. Real backend engineers deal with:

- A UserService that grew to 800 lines handling auth, profile updates, email sending, subscription billing, and admin operations — and nobody wants to touch it
- A payment module where adding Stripe required rewriting the UPI code that was already working
- Tests that require a real database because the code creates its own dependencies internally
- A notification system where adding push notifications broke email because they "shared" an interface
- New engineers afraid to refactor because a "small change" broke three unrelated features

SOLID addresses each of these failure modes directly. These aren't academic principles — they're the patterns that prevent the most common forms of backend rot.

The key insight: each principle solves a specific failure mode that WILL happen as codebases grow. You don't need all five on day one. You start recognizing which principle you need when you feel a specific kind of pain.`,
    analogy: `Imagine a hospital. Five organizational principles keep it from descending into chaos:

S — Single Responsibility: Each department (cardiology, radiology, pharmacy) has ONE domain. Cardiologists don't dispense medication. When the pharmacy rules change, only the pharmacy is affected.

O — Open/Closed: The hospital can add new wings (ICU, oncology) without knocking down existing walls. The building's core structure is closed to modification, open to extension.

L — Liskov Substitution: Any qualified doctor can substitute for another doctor with the same specialty. The system doesn't break if Dr. Mehta covers for Dr. Singh — they share the same interface.

I — Interface Segregation: Patients don't interact with the full hospital staff roster. They interact with their care team only. Forcing everyone to attend every meeting would be absurd.

D — Dependency Inversion: The hospital depends on "a licensed pharmacist," not specifically on one person named Rohit. If Rohit leaves, any licensed pharmacist can fill the role. The hospital depends on the qualification (interface), not the individual (concrete class).`,
    deep: `S — SINGLE RESPONSIBILITY PRINCIPLE
──────────────────────────────────────
"A class should have only one reason to change."

The test: if you can describe a class's job with "and" — it's doing too much.
"UserService handles authentication AND profile updates AND email sending" — three reasons to change.

Signs of SRP violation: 500-line service files, imports of bcrypt AND nodemailer AND stripe in the same file, tests that set up email mocks to test authentication logic.

O — OPEN/CLOSED PRINCIPLE
──────────────────────────
"Open for extension, closed for modification."

Key technique: program to an interface. Instead of:
\`\`\`
if (provider === "upi") { ... }
else if (provider === "card") { ... }
\`\`\`
Use polymorphism: each provider implements IPaymentProvider. Adding PhonePe never touches UpiProvider or CardProvider.

L — LISKOV SUBSTITUTION PRINCIPLE
───────────────────────────────────
"Objects of a subclass should be substitutable for objects of the base class."

In backend: MockUserRepository must be a perfect substitute for PrismaUserRepository in tests. If your mock throws where the real one returns null, your tests lie to you.

Critical for testing: if your test doubles (mocks, stubs) don't honor the same contract as the real implementations, your tests prove nothing about production behavior.

I — INTERFACE SEGREGATION PRINCIPLE
─────────────────────────────────────
"Clients should not be forced to depend on interfaces they don't use."

Split fat interfaces. A ReadService shouldn't need to implement \`createUser\` and \`deleteUser\`. An admin-only interface shouldn't be implemented by the public API layer.

D — DEPENDENCY INVERSION PRINCIPLE
────────────────────────────────────
"High-level modules should not depend on low-level modules. Both should depend on abstractions."

OrderService should not import PrismaOrderRepository directly. It should depend on IOrderRepository. This single change makes unit testing trivial — inject any object that satisfies the interface.

PRACTICAL RULE: If you find yourself writing \`new SomeConcreteThing()\` inside a service, that's a DIP violation. The concrete thing should be injected.`,
    code: `// ─── S: SINGLE RESPONSIBILITY ────────────────────────────────────────────
// BEFORE: UserService does everything
class UserService_BAD {
  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 12)             // auth concern
    const user = await this.db.insert({ email, hash })      // data concern
    await this.mailer.send(email, "Welcome!")                // email concern
    await this.stripe.createCustomer(email)                 // billing concern
    return user
  }
}
// 4 reasons to change, 4 things that can break independently

// AFTER: each service has ONE job
class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}

class UserService {
  constructor(
    private userRepo: IUserRepository,
    private authService: AuthService
  ) {}

  async register(email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email)
    if (existing) throw new ConflictError("Email already registered")

    const passwordHash = await this.authService.hashPassword(password)
    return this.userRepo.create({ email, passwordHash })
  }
}

class EmailService {
  async sendWelcome(user: User): Promise<void> {
    await this.mailer.send(user.email, "Welcome to the platform!")
  }
}

// ─── O: OPEN/CLOSED ───────────────────────────────────────────────────────
// BEFORE: adding PhonePe requires modifying PaymentService
class PaymentService_BAD {
  async processPayment(amount: number, provider: string) {
    if (provider === "razorpay") {
      return razorpayClient.charge(amount)
    } else if (provider === "paytm") {
      return paytmClient.debit({ amount })
    }
    // Adding PhonePe: modify this method — risk of breaking existing providers
  }
}

// AFTER: each provider is isolated, adding new one = new class only
interface IPaymentProvider {
  charge(amountInPaise: number, metadata: PaymentMetadata): Promise<PaymentResult>
  refund(transactionId: string, amountInPaise: number): Promise<RefundResult>
}

class RazorpayProvider implements IPaymentProvider {
  async charge(amountInPaise: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    const result = await razorpayClient.orders.create({ amount: amountInPaise, currency: "INR" })
    return { transactionId: result.id, status: "pending" }
  }
  async refund(transactionId: string, amountInPaise: number): Promise<RefundResult> {
    return razorpayClient.payments.refund(transactionId, { amount: amountInPaise })
  }
}

class PhonePeProvider implements IPaymentProvider {
  async charge(amountInPaise: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    // PhonePe-specific implementation — RazorpayProvider untouched
    const result = await phonePeClient.initiatePayment({ amount: amountInPaise })
    return { transactionId: result.merchantTransactionId, status: "pending" }
  }
  async refund(transactionId: string, amountInPaise: number): Promise<RefundResult> {
    return phonePeClient.refund({ transactionId, amount: amountInPaise })
  }
}

class PaymentService {
  constructor(private provider: IPaymentProvider) {}

  async processPayment(amountInPaise: number, meta: PaymentMetadata): Promise<PaymentResult> {
    if (amountInPaise <= 0) throw new ValidationError("Amount must be positive")
    return this.provider.charge(amountInPaise, meta)
  }
}

// ─── L: LISKOV SUBSTITUTION ───────────────────────────────────────────────
// Both implementations honor the same contract — tests can use either
interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: CreateUserData): Promise<User>
  update(id: string, data: Partial<User>): Promise<User>
}

class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }
  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data })
  }
  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data })
  }
}

// In-memory implementation for tests — SAME interface, same behavior contract
class InMemoryUserRepository implements IUserRepository {
  private store = new Map<string, User>()
  private emailIndex = new Map<string, string>()  // email → id

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null
  }
  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email)
    return id ? (this.store.get(id) ?? null) : null
  }
  async create(data: CreateUserData): Promise<User> {
    const user: User = { id: crypto.randomUUID(), ...data, createdAt: new Date() }
    this.store.set(user.id, user)
    this.emailIndex.set(user.email, user.id)
    return user
  }
  async update(id: string, data: Partial<User>): Promise<User> {
    const existing = this.store.get(id)
    if (!existing) throw new NotFoundError("User not found")
    const updated = { ...existing, ...data }
    this.store.set(id, updated)
    return updated
  }
}

// ─── I: INTERFACE SEGREGATION ─────────────────────────────────────────────
// BEFORE: fat interface forces all implementers to provide everything
interface IUserService_BAD {
  getProfile(id: string): Promise<User>
  updateProfile(id: string, data: any): Promise<User>
  deleteUser(id: string): Promise<void>
  banUser(id: string, reason: string): Promise<void>     // admin only
  exportAllUsers(): Promise<User[]>                       // admin only
  resetAllPasswords(): Promise<void>                      // admin only
}

// AFTER: split by consumer
interface IUserProfileService {
  getProfile(id: string): Promise<User>
  updateProfile(id: string, data: UpdateProfileData): Promise<User>
}

interface IAdminUserService {
  deleteUser(id: string): Promise<void>
  banUser(id: string, reason: string): Promise<void>
  exportAllUsers(): Promise<User[]>
}

// Regular users only get IUserProfileService injected
// Admin controllers only get IAdminUserService injected

// ─── D: DEPENDENCY INVERSION ──────────────────────────────────────────────
// BEFORE: high-level module (OrderService) depends on concrete low-level module
class OrderService_BAD {
  private repo = new PrismaOrderRepository()  // tightly coupled — untestable!
  private mailer = new SendGridMailer()       // can't test without sending real emails
}

// AFTER: depend on abstractions, inject concrete implementations
class OrderService {
  constructor(
    private readonly orderRepo: IOrderRepository,  // interface — not concrete class
    private readonly emailService: IEmailService   // interface — not concrete class
  ) {}

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepo.findById(id)
    if (!order) throw new NotFoundError(\`Order \${id} not found\`)
    return order
  }
}

// Test: inject in-memory mock — no database needed
const testOrderService = new OrderService(
  new InMemoryOrderRepository(),
  new MockEmailService()
)`,
    bugs: `BUG 1 — God class: OrderService with 700 lines and 15 dependencies
───────────────────────────────────────────────────────────────────
class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private userRepo: UserRepository,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushNotificationService,
    private analyticsService: AnalyticsService,
    private couponService: CouponService,
    private loyaltyService: LoyaltyPointsService,
    private auditService: AuditLogService,
    private warehouseService: WarehouseService,
    private shippingService: ShippingService
  ) {}
}
// This class has 13 reasons to change. Any change to any dependency
// potentially requires modifying this class.

Fix (SRP): Split into PlaceOrderUseCase, OrderFulfillmentService, OrderNotificationService.
Each has 3-4 dependencies at most. Coordinate them from an OrderOrchestrator.

BUG 2 — OCP violation: switch statement that grows forever
───────────────────────────────────────────────────────────
// Every new payment provider requires modifying this method
async function getPaymentProcessor(type: string) {
  switch (type) {
    case "razorpay": return new RazorpayProcessor()
    case "paytm": return new PaytmProcessor()
    case "upi": return new UpiProcessor()
    // Risk: modifying this switch while another transaction is in progress
  }
}
// Production incident: adding a new case introduced a syntax error
// that took down the entire payment service

Fix: Registry pattern — providers register themselves
const providers = new Map<string, IPaymentProvider>()
providers.set("razorpay", new RazorpayProcessor())
// Adding new provider: add one line, no modification of existing code

BUG 3 — LSP violation: mock that doesn't honor the real contract
──────────────────────────────────────────────────────────────────
// Real repository returns null for not-found
class PrismaUserRepo {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } }) // returns null if not found
  }
}

// Mock throws instead of returning null — violates the contract!
class MockUserRepo {
  async findById(id: string): Promise<User | null> {
    throw new Error("User not found")  // DIFFERENT behavior!
  }
}

// UserService code:
const user = await this.repo.findById(id)
if (!user) throw new NotFoundError(...)  // This code path never tested!
// Tests using MockUserRepo pass, but production code hits the null-handling
// logic which was never exercised.

Fix: Honor the exact same contract: return null for not-found, throw only for real errors.

BUG 4 — DIP violation: new inside service class
────────────────────────────────────────────────
class NotificationService {
  private emailClient = new SendGridClient(process.env.SENDGRID_KEY!)
  private smsClient = new TwilioClient(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!)

  async notifyUser(userId: string, message: string) {
    await this.emailClient.send(...)
    await this.smsClient.send(...)
  }
}
// Unit testing this requires real API keys, real network calls.
// Switching to a different SMS provider requires modifying this class.
// The class creates its own dependencies — can't inject alternatives.

Fix: Accept IEmailClient and ISmsClient in constructor.
Test with mock implementations that record calls without hitting external APIs.

BUG 5 — ISP violation: implementing unused interface methods
─────────────────────────────────────────────────────────────
interface IStorageService {
  upload(file: Buffer, path: string): Promise<string>
  download(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  list(prefix: string): Promise<string[]>
  move(from: string, to: string): Promise<void>
  createSignedUrl(path: string, expiresIn: number): Promise<string>
}

// ProfilePictureService only needs upload and createSignedUrl
class ProfilePictureService implements IStorageService {
  async upload(file: Buffer, path: string): Promise<string> { /* real impl */ }
  async createSignedUrl(path: string, expiresIn: number): Promise<string> { /* real impl */ }
  async download(path: string): Promise<Buffer> { throw new Error("Not implemented") }
  async delete(path: string): Promise<void> { throw new Error("Not implemented") }
  async list(prefix: string): Promise<string[]> { throw new Error("Not implemented") }
  async move(from: string, to: string): Promise<void> { throw new Error("Not implemented") }
}
// "Not implemented" throws are LSP violations waiting to happen

Fix: Split into IUploadService, IDownloadService, IAdminStorageService`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
interface INotifier {
  send(userId: string, message: string): Promise<void>
  sendBulk(userIds: string[], message: string): Promise<void>
  getDeliveryStatus(notificationId: string): Promise<string>
}

class EmailNotifier implements INotifier {
  async send(userId: string, message: string): Promise<void> { /* sends email */ }
  async sendBulk(userIds: string[], message: string): Promise<void> {
    await Promise.all(userIds.map(id => this.send(id, message)))
  }
  async getDeliveryStatus(notificationId: string): Promise<string> {
    throw new Error("Email delivery tracking not supported")
  }
}

class OrderService {
  constructor(private notifier: INotifier) {}
  async confirmOrder(orderId: string, userId: string) {
    await this.notifier.send(userId, \`Order \${orderId} confirmed\`)
    const status = await this.notifier.getDeliveryStatus(orderId)
    return status
  }
}

Q: Which SOLID principle is violated and how?
   What happens at runtime when confirmOrder is called with EmailNotifier?
   How would you fix this without modifying EmailNotifier?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This code violates 3 SOLID principles. Identify each violation and fix it.

class ReportService {
  private db: mysql.Connection

  constructor() {
    this.db = mysql.createConnection({  // Violation 1
      host: "localhost",
      user: "root",
      password: "password"
    })
  }

  async generateSalesReport(startDate: Date, endDate: Date) {
    const [rows] = await this.db.query(
      "SELECT * FROM orders WHERE created_at BETWEEN ? AND ?",
      [startDate, endDate]
    )

    // Violation 2: report generation + export + email in one method
    const csv = rows.map((r: any) => Object.values(r).join(",")).join("\\n")
    await fs.writeFile("/tmp/report.csv", csv)
    await nodemailer.sendMail({
      to: "finance@company.com",
      subject: "Sales Report",
      attachments: [{ path: "/tmp/report.csv" }]
    })

    return rows  // Violation 3: returns raw DB rows to caller
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design a notification system following all 5 SOLID principles:
1. Define a clean INotificationChannel interface (only what ALL channels share)
2. Implement EmailChannel, SmsChannel, PushChannel — each isolated, each testable
3. Define separate INotificationLogger interface (not on the channel)
4. Build NotificationService that depends on INotificationChannel[] and INotificationLogger
5. Write a ChannelRegistry (OCP) so new channels can be added without modifying NotificationService
6. Prove LSP: write an in-memory InMemoryChannel for tests that perfectly substitutes real channels
7. Write unit tests for NotificationService using only in-memory implementations`,
    summary: "SOLID principles are not rules to follow blindly — they're diagnostics for specific pains. Single Responsibility prevents god classes, Open/Closed prevents fragile if-chains, Liskov makes tests trustworthy, Interface Segregation prevents forced dependencies, and Dependency Inversion makes everything testable. Apply them when you feel the pain they solve."
  },

  {
    id: 3,
    title: "Dependency Injection & IoC",
    tag: "INVERTING WHO CREATES WHAT",
    color: "#27AE60",
    tldr: "Dependency Injection means a class receives its dependencies from outside rather than creating them internally. Inversion of Control means the control of object creation is handed to a container or composition root, not scattered across your codebase. Together, they make testing trivial and large systems manageable.",
    problem: `Every time you write \`new SomeService()\` inside another class, you've created a tight coupling that you'll pay for later. The class now:
- Controls which implementation it gets (can't be substituted in tests)
- Controls the configuration of that implementation (can't change env-based behavior)
- Is responsible for the lifecycle of that dependency (creation, teardown)
- Is harder to test because you can't inject alternatives

The classic production consequence: a service that creates its own database connection in the constructor. In tests, every instantiation opens a real database connection. Tests are slow, flaky, and can't run in parallel. In production, if you want connection pooling, you have to refactor every class that creates connections.

The subtler problem: service locator anti-pattern. Instead of injecting dependencies, services call a global registry: \`ServiceLocator.get("UserService")\`. This looks like DI but isn't — dependencies are still hidden inside the class, just fetched from a global instead of created with \`new\`. Unit testing is impossible without mocking the global registry, and the class's dependencies aren't visible from its signature.

True DI: a class declares its dependencies in its constructor signature. Everything a class needs is visible from the outside. Nothing is hidden. Substitution is trivial.`,
    analogy: `Think of running a restaurant kitchen again. Two models:

WITHOUT DI: Every chef personally goes to the market each morning to buy their own ingredients. You hire Chef Rahul and he shows up with his own specific brands of tomatoes, oils, and spices. You can't substitute ingredients without convincing Rahul to change his shopping habits. You can't test if a recipe works with different tomatoes without Rahul actually going to buy different tomatoes.

WITH DI: The kitchen manager sources ingredients and hands them to chefs. Chef Rahul walks in and is handed a box of ingredients. The box can contain different brands depending on context — premium ingredients for Friday service, budget ingredients during training. For a recipe test, the manager provides a "test box" with controlled, consistent ingredients.

The IoC Container is like a professional kitchen manager who knows all the recipes (dependencies), sources everything, and hands each chef exactly what they need. The head chef (composition root) just specifies: "Rahul needs onions, tomatoes, and oil — medium grade." The kitchen manager handles sourcing and delivery.

Constructor injection (the recommended type) is the chef's way of saying: "I need these specific tools before I can start cooking." You can see exactly what they need before they start — no surprises.`,
    deep: `THREE TYPES OF DEPENDENCY INJECTION
──────────────────────────────────────
1. Constructor Injection (PREFERRED)
\`\`\`
class OrderService {
  constructor(
    private orderRepo: IOrderRepository,  // visible, required, immutable
    private emailService: IEmailService
  ) {}
}
\`\`\`
Pros: dependencies visible in constructor, can be readonly (immutable), class unusable without required dependencies. This is the default.

2. Property Injection (RARE — use for optional dependencies)
\`\`\`
class OrderService {
  logger: ILogger = new NullLogger()  // optional, has default
}
\`\`\`
Use only for optional dependencies with sensible defaults (like a logger).

3. Method Injection (USE WHEN dependency varies per call)
\`\`\`
class ReportService {
  generate(data: ReportData, formatter: IFormatter): string {
    return formatter.format(data)  // different formatter per call
  }
}
\`\`\`

THE IoC CONTAINER
──────────────────
A container is a registry that knows how to build objects and their dependency trees.
Given: \`container.get(OrderService)\`
The container: 1) sees OrderService needs IOrderRepository and IEmailService
              2) builds IOrderRepository (which needs PrismaClient)
              3) builds PrismaClient (which needs connection string from config)
              4) builds IEmailService (which needs SMTP credentials from config)
              5) assembles everything and returns a ready OrderService

COMPOSITION ROOT
─────────────────
ALL dependency wiring should happen in ONE place: the composition root (usually main.ts or app.ts).
This is where you write:
\`\`\`
const prisma = new PrismaClient()
const orderRepo = new PrismaOrderRepository(prisma)
const emailService = new SendGridEmailService(config.sendgridKey)
const orderService = new OrderService(orderRepo, emailService)
const orderController = new OrderController(orderService)
\`\`\`

Everything after this is pure function calls with no \`new\` anywhere.

SERVICE LOCATOR ANTI-PATTERN
──────────────────────────────
\`\`\`
class OrderService {
  async placeOrder(items: any[]) {
    const emailService = ServiceLocator.get("EmailService")  // ANTI-PATTERN
    // Dependencies hidden inside methods — not visible from constructor
    // Testing requires mocking the global ServiceLocator
    // Impossible to know what OrderService needs without reading every method
  }
}
\`\`\``,
    code: `// ─── MANUAL DI — no framework ───────────────────────────────────────────
// Interfaces define contracts
interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: CreateUserData): Promise<User>
}

interface IEmailService {
  sendWelcomeEmail(user: User): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
}

interface IHashService {
  hash(plain: string): Promise<string>
  compare(plain: string, hashed: string): Promise<boolean>
}

// Concrete implementations
class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}
  async findById(id: string) { return this.prisma.user.findUnique({ where: { id } }) }
  async findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email } }) }
  async create(data: CreateUserData) { return this.prisma.user.create({ data }) }
}

class BcryptHashService implements IHashService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12)
  }
  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed)
  }
}

// Service receives everything via constructor — zero internal \`new\` calls
class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private hashService: IHashService,
    private emailService: IEmailService
  ) {}

  async register(email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email)
    if (existing) throw new ConflictError("Email already registered")

    const passwordHash = await this.hashService.hash(password)
    const user = await this.userRepo.create({ email, passwordHash })
    await this.emailService.sendWelcomeEmail(user)
    return user
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new UnauthorizedError("Invalid credentials")

    const valid = await this.hashService.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedError("Invalid credentials")

    return generateJWT({ userId: user.id, email: user.email })
  }
}

// ─── COMPOSITION ROOT (main.ts / app.ts) ─────────────────────────────────
function buildApp(): Express {
  const app = express()

  // Infrastructure: built once, shared
  const prisma = new PrismaClient()

  // Repositories
  const userRepo = new PrismaUserRepository(prisma)

  // Services (external)
  const hashService = new BcryptHashService()
  const emailService = new SendGridEmailService(process.env.SENDGRID_KEY!)

  // Domain services (inject their dependencies)
  const authService = new AuthService(userRepo, hashService, emailService)

  // Controllers (inject services)
  const authController = new AuthController(authService)

  // Routes
  app.post("/auth/register", authController.register.bind(authController))
  app.post("/auth/login", authController.login.bind(authController))

  return app
}

// ─── UNIT TEST — completely decoupled from real dependencies ──────────────
describe("AuthService", () => {
  // In-memory stubs — no database, no email, no bcrypt
  const mockUserRepo: IUserRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),  // no existing user by default
    create: jest.fn().mockImplementation((data) => ({ id: "U1", ...data }))
  }

  const mockHashService: IHashService = {
    hash: jest.fn().mockResolvedValue("hashed_password"),
    compare: jest.fn().mockResolvedValue(true)
  }

  const mockEmailService: IEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined)
  }

  const authService = new AuthService(mockUserRepo, mockHashService, mockEmailService)

  it("registers a new user and sends welcome email", async () => {
    const user = await authService.register("priya@example.com", "secure123")

    expect(mockHashService.hash).toHaveBeenCalledWith("secure123")
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "priya@example.com" })
    )
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "U1" })
    )
  })

  it("throws ConflictError if email already registered", async () => {
    (mockUserRepo.findByEmail as jest.Mock).mockResolvedValueOnce({ id: "U1" })
    await expect(authService.register("priya@example.com", "secure123"))
      .rejects.toThrow(ConflictError)
  })
})

// ─── MANUAL DI CONTAINER (simple implementation) ─────────────────────────
class Container {
  private registry = new Map<string, () => unknown>()
  private singletons = new Map<string, unknown>()

  register<T>(token: string, factory: () => T, singleton = true): void {
    this.registry.set(token, factory)
    if (!singleton) this.singletons.delete(token)
  }

  resolve<T>(token: string): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T
    }
    const factory = this.registry.get(token)
    if (!factory) throw new Error(\`No registration found for token: \${token}\`)
    const instance = factory() as T
    this.singletons.set(token, instance)
    return instance
  }
}

// Setup
const container = new Container()
container.register("PrismaClient", () => new PrismaClient())
container.register("IUserRepository", () =>
  new PrismaUserRepository(container.resolve("PrismaClient"))
)
container.register("IHashService", () => new BcryptHashService())
container.register("IEmailService", () =>
  new SendGridEmailService(process.env.SENDGRID_KEY!)
)
container.register("AuthService", () =>
  new AuthService(
    container.resolve("IUserRepository"),
    container.resolve("IHashService"),
    container.resolve("IEmailService")
  )
)

// Usage
const authSvc = container.resolve<AuthService>("AuthService")

// ─── tsyringe DECORATOR-BASED DI ─────────────────────────────────────────
// // import { injectable, inject, container } from "tsyringe"

// @injectable()
class TsyringeOrderService {
  constructor(
    // @inject("IOrderRepository")
    private orderRepo: IOrderRepository,
    // @inject("IEmailService")
    private emailService: IEmailService
  ) {}
}

// Registration in bootstrap
// container.register("IOrderRepository", { useClass: PrismaOrderRepository })
// container.register("IEmailService", { useClass: SendGridEmailService })
// const service = container.resolve(TsyringeOrderService)`,
    bugs: `BUG 1 — Service locator hides dependencies
───────────────────────────────────────────
class OrderService {
  async placeOrder(items: any[]) {
    // Hidden dependency — not visible in constructor
    const inventory = ServiceLocator.get<InventoryService>("inventory")
    const payment = ServiceLocator.get<PaymentService>("payment")
    
    await inventory.reserve(items)
    await payment.charge(total)
  }
}

// Tests require mocking a global registry — messy and brittle
// You can't tell what OrderService needs without reading all its methods
// Changing a dependency name string breaks things silently at runtime

Fix: Move all dependencies to the constructor:
class OrderService {
  constructor(
    private inventory: IInventoryService,
    private payment: IPaymentService
  ) {}
}

BUG 2 — Singleton created inside a class that should be shared
────────────────────────────────────────────────────────────────
class UserService {
  private db = new PrismaClient()  // NEW connection for every UserService instance!
}

class OrderService {
  private db = new PrismaClient()  // ANOTHER new connection!
}
// PrismaClient maintains a connection pool internally.
// Multiple instances = multiple pools = you exceed max_connections fast.
// This can take down your database under production load.

Fix: Create PrismaClient once in composition root, inject into all repositories.

BUG 3 — Circular dependency
─────────────────────────────
class UserService {
  constructor(private orderService: OrderService) {}
  async deleteUser(id: string) {
    await this.orderService.cancelAllOrders(id)  // needs OrderService
  }
}

class OrderService {
  constructor(private userService: UserService) {}
  async placeOrder(userId: string, items: any[]) {
    await this.userService.validateUser(userId)  // needs UserService
  }
}
// Circular dependency: UserService → OrderService → UserService
// IoC containers will throw a "circular dependency detected" error
// Some containers create infinite recursion and crash

Fix: Extract the shared concern into a third service:
class UserValidationService — used by OrderService for validation
class OrderCancellationService — used by UserService for user deletion
No circular dependency.

BUG 4 — Injecting concrete class instead of interface
──────────────────────────────────────────────────────
class OrderService {
  constructor(private repo: PrismaOrderRepository) {}  // concrete — not interface!
}
// Tests must use PrismaOrderRepository — requires real database
// Swapping to a different ORM means changing OrderService's constructor
// Defeats the purpose of injection

Fix: constructor(private repo: IOrderRepository)
Now any class implementing IOrderRepository can be injected.

BUG 5 — Late binding — dependency created in method, not constructor
─────────────────────────────────────────────────────────────────────
class ReportService {
  async generateReport(type: string) {
    // Created inside method — can't inject alternative for testing
    const formatter = type === "csv"
      ? new CsvFormatter()
      : new PdfFormatter()
    return formatter.format(await this.fetchData())
  }
}
// Tests must trigger real formatter logic even when testing just the data fetching

Fix (if formatter is fixed): inject in constructor as IFormatter
Fix (if formatter varies per call): method injection — pass formatter as parameter
async generateReport(data: ReportData, formatter: IFormatter): Promise<string>`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
class Container {
  private registry: Map<string, any> = new Map()
  
  register(token: string, value: any) {
    this.registry.set(token, value)
  }
  
  resolve(token: string) {
    const val = this.registry.get(token)
    if (typeof val === "function") return val()
    return val
  }
}

const c = new Container()
let count = 0
c.register("counter", () => ++count)

console.log(c.resolve("counter"))  // Line A
console.log(c.resolve("counter"))  // Line B
console.log(c.resolve("counter"))  // Line C

c.register("fixed", 42)
console.log(c.resolve("fixed"))    // Line D

Q: What does each line output?
   What does this tell you about the difference between factory registration and value registration?
   How would you modify the Container to make "counter" return the same instance every time (singleton)?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This code has 4 DI problems. Identify and fix each.

class NotificationService {
  private emailClient: SendGridClient
  private smsClient: TwilioClient
  private logger: WinstonLogger

  constructor() {
    // Problem 1: creates own dependencies
    this.emailClient = new SendGridClient(process.env.SENDGRID_KEY!)
    this.smsClient = new TwilioClient(process.env.TWILIO_SID!)
    this.logger = new WinstonLogger({ level: "info" })
  }

  async notify(userId: string, message: string, channel: string) {
    // Problem 2: service locator
    const userService = ServiceLocator.get<UserService>("UserService")
    const user = await userService.findById(userId)

    if (channel === "email") {
      await this.emailClient.send(user.email, message)
    } else if (channel === "sms") {
      // Problem 3: hard-coded channel logic — OCP violation
      await this.smsClient.send(user.phone, message)
    }

    // Problem 4: logger is a concrete class, not interface
    this.logger.info(\`Notified \${userId} via \${channel}\`)
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a mini IoC container from scratch:
1. Container supports: register(token, factory, options: { singleton: boolean })
2. Container supports: registerValue(token, value) — for config, constants
3. resolve(token) builds the dependency tree lazily (only when first resolved)
4. Singleton instances are cached after first resolution
5. Container detects circular dependencies and throws a clear error
6. Write a complete app bootstrap using only the container:
   - PrismaClient (singleton, value)
   - UserRepository (singleton, factory)
   - AuthService (singleton, factory — depends on UserRepository)
   - AuthController (transient — new instance per request)
7. Write tests that verify: singleton returns same instance, transient returns new instance, circular dependency throws`,
    summary: "Dependency Injection is the discipline of making all class dependencies explicit, external, and substitutable. The IoC container automates the wiring. The payoff is immediate in tests and compounding as your system grows — every service becomes independently testable and every dependency becomes swappable."
  },

  {
    id: 4,
    title: "Database Design & Indexing",
    tag: "MAKING YOUR QUERIES FAST BEFORE THEY'RE SLOW",
    color: "#8E44AD",
    tldr: "Good database design means choosing the right schema structure and indexing strategy before your data grows. Indexes make reads fast by building sorted data structures, but they slow writes and cost storage. The N+1 problem silently kills performance at scale, and understanding query plans with EXPLAIN ANALYZE is how you find and fix slow queries.",
    problem: `Your application works fine in development with 100 rows. In production with 2 million rows, a simple listing page takes 8 seconds. The query runs a full sequential scan on every request. No index was ever added. Now you need to add one with millions of rows in production — which requires a full table lock and takes 20 minutes of downtime.

This is the most common database scaling problem: design decisions that are invisible at small scale become catastrophic at production scale.

The second most common problem: N+1 queries. You fetch 50 orders. For each order, you make a separate query to get the customer name. That's 51 queries instead of 1. In development, it's imperceptible. In production, it's the #1 cause of "the page takes 6 seconds to load."

The third problem: nobody reads query execution plans until something is on fire. EXPLAIN ANALYZE is the tool that tells you exactly what the database is doing and why. A "Seq Scan" on a million-row table is almost always a bug that could have been a 10ms index lookup.

The fourth problem: connection pooling. Your Node.js app spawns 20 processes. Each process opens 10 database connections. PostgreSQL default max_connections is 100. Under load, connections are exhausted and requests queue up waiting. PgBouncer or application-level pooling is not optional at any real scale.`,
    analogy: `Imagine a massive library with 2 million books (rows in your table).

WITHOUT AN INDEX: To find all books by author "Vikram Seth," a librarian walks every single aisle, reads every spine, and pulls the matching books. That's a sequential scan. Fine for 100 books. Catastrophic for 2 million.

WITH AN INDEX: There's a card catalog (B-tree index) sorted by author name. The librarian walks directly to "Seth" in seconds, gets the exact shelf locations, goes straight there. The index is a sorted data structure that trades storage and write speed for dramatically faster reads.

A COMPOSITE INDEX is like a card catalog sorted first by genre, then by author within each genre. If you're looking for "Science Fiction by Vikram Seth," you go to Science Fiction first, then find Seth in that section. But if you're looking for all books by Vikram Seth across ALL genres — the catalog is useless. You'd have to check every genre section. This is the left-prefix rule: the index is only useful if you search by the leftmost columns first.

THE N+1 PROBLEM: Imagine the librarian needs to fetch 50 books AND the author's biography for each. Instead of requesting all 50 biographies in one trip to the biography section, they make 50 separate trips — one for each book. That's the N+1 problem: N queries for N related records, plus 1 for the main query.`,
    deep: `POSTGRESQL INDEX TYPES
───────────────────────
1. B-tree (default): equality and range queries on most types
   \`CREATE INDEX idx_orders_customer ON orders(customer_id);\`
   Good for: =, <, >, BETWEEN, LIKE 'prefix%' queries

2. GIN (Generalized Inverted Index): arrays, JSONB, full-text search
   \`CREATE INDEX idx_product_tags ON products USING GIN(tags);\`
   Good for: @>, <@, ?| operators on JSONB/arrays
   
3. Hash: equality only, faster than B-tree for pure = queries
   \`CREATE INDEX idx_sessions_token ON sessions USING HASH(token);\`
   
4. Partial index: index only a subset of rows
   \`CREATE INDEX idx_active_orders ON orders(customer_id) WHERE status = 'ACTIVE';\`
   Smaller index, faster for the specific query pattern

COMPOSITE INDEX — LEFT-PREFIX RULE
────────────────────────────────────
Index on (customer_id, status, created_at):
- ✅ WHERE customer_id = $1
- ✅ WHERE customer_id = $1 AND status = $2
- ✅ WHERE customer_id = $1 AND status = $2 AND created_at > $3
- ❌ WHERE status = $2 (no customer_id — can't use index)
- ❌ WHERE created_at > $3 (skipped customer_id and status)

EXPLAIN ANALYZE READING
────────────────────────
\`\`\`sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 'C123' AND status = 'PENDING';
\`\`\`
Output key terms:
- Seq Scan: reading every row — usually a bug if table is large
- Index Scan: using an index to find rows — usually what you want
- Index Only Scan: all data in the index itself — fastest
- rows=... actual=...: estimate vs actual. Large gap = stale statistics (run ANALYZE)
- cost=startup..total: arbitrary units — compare relative costs between plans
- Nested Loop / Hash Join / Merge Join: how tables are joined

N+1 QUERY PATTERN
──────────────────
\`\`\`
// N+1: 1 query for orders + N queries for each customer
const orders = await db.query("SELECT * FROM orders WHERE status = 'PENDING'")  // 1 query
for (const order of orders) {
  order.customer = await db.query("SELECT * FROM users WHERE id = $1", [order.customerId])  // N queries!
}
\`\`\`

Fix with JOIN:
\`\`\`sql
SELECT o.*, u.name, u.email
FROM orders o
JOIN users u ON o.customer_id = u.id
WHERE o.status = 'PENDING'
\`\`\`

CONNECTION POOLING
───────────────────
PostgreSQL can handle ~100-200 connections before performance degrades.
Each connection consumes ~5-10MB of RAM on the server.
Node.js + 4 CPUs × 10 workers = 40 processes × 10 connections = 400 connections.
Solution: pg-pool (pg library), Prisma's built-in pool, or PgBouncer as proxy.`,
    code: `// ─── INDEX DESIGN ────────────────────────────────────────────────────────
-- Schema: orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
  total_amount_paise INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for: "fetch all orders for a customer"
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Composite index for: "fetch PENDING orders for a customer, sorted by date"
-- Column order matters: customer_id first (highest cardinality, most selective)
CREATE INDEX idx_orders_customer_status_date ON orders(customer_id, status, created_at DESC);

-- Partial index for: "find all PENDING orders" (admin dashboard)
-- Only indexes PENDING rows — much smaller, faster
CREATE INDEX idx_orders_pending ON orders(created_at DESC) WHERE status = 'PENDING';

-- GIN index for JSONB metadata field
ALTER TABLE orders ADD COLUMN metadata JSONB;
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Enables: WHERE metadata @> '{"channel": "app"}'::jsonb

// ─── N+1 PROBLEM AND FIX ────────────────────────────────────────────────
// BAD: N+1 with Prisma ORM
async function getOrdersWithCustomers_BAD(): Promise<OrderWithCustomer[]> {
  const orders = await prisma.order.findMany({
    where: { status: "PENDING" }
  })
  // N separate queries for N orders!
  const enriched = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      customer: await prisma.user.findUnique({ where: { id: order.customerId } })
    }))
  )
  return enriched
}
// 51 queries for 50 orders — each waits 1-2ms = 100ms just in query overhead

// GOOD: eager loading with include (single JOIN)
async function getOrdersWithCustomers_GOOD(): Promise<OrderWithCustomer[]> {
  return prisma.order.findMany({
    where: { status: "PENDING" },
    include: { customer: true }   // Prisma generates a JOIN — 1 query
  })
}

// GOOD: raw SQL JOIN for complex queries
async function getOrderSummary(customerId: string) {
  const result = await prisma.$queryRaw\`
    SELECT
      o.id,
      o.status,
      o.total_amount_paise,
      o.created_at,
      u.name AS customer_name,
      u.email AS customer_email,
      COUNT(oi.id) AS item_count
    FROM orders o
    JOIN users u ON o.customer_id = u.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = \${customerId}
    GROUP BY o.id, u.name, u.email
    ORDER BY o.created_at DESC
    LIMIT 20
  \`
  return result
}

// ─── EXPLAIN ANALYZE ──────────────────────────────────────────────────────
-- Run this to see query plan:
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.status, u.name
FROM orders o
JOIN users u ON o.customer_id = u.id
WHERE o.customer_id = 'C123' AND o.status = 'PENDING'
ORDER BY o.created_at DESC
LIMIT 10;

-- Sample output interpretation:
-- Index Scan using idx_orders_customer_status_date on orders
--   Index Cond: ((customer_id = 'C123') AND (status = 'PENDING'))
--   rows=8 (actual rows=7, loops=1)  ← estimate close to actual — good
--   Planning Time: 0.3 ms
--   Execution Time: 0.8 ms  ← excellent

-- RED FLAGS in EXPLAIN output:
-- "Seq Scan" on large table — add an index
-- "rows=1" actual "rows=50000" — stale statistics, run ANALYZE
-- "Sort" without index support — add index on sort column
-- "Hash" with huge "Batches > 1" — work_mem too low

// ─── CONNECTION POOLING WITH pg ───────────────────────────────────────────
// db/pool.ts
// const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // max connections in pool (tune based on DB capacity)
  idleTimeoutMillis: 30000,    // close idle connections after 30s
  connectionTimeoutMillis: 5000,  // fail fast if can't get connection in 5s
  allowExitOnIdle: true
})

// Graceful shutdown — don't leave connections open
process.on("SIGTERM", async () => {
  await pool.end()
  console.log("DB pool closed")
})

// Usage — always release back to pool
async function queryWithPool<T>(sql: string, params: any[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows
  } finally {
    client.release()  // ALWAYS release, even on error
  }
}

// ─── PRISMA CONNECTION POOL ────────────────────────────────────────────────
// Prisma manages its own pool — configure via DATABASE_URL
// postgresql://user:pass@host/db?connection_limit=20&pool_timeout=10

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === "development"
    ? ["query", "slow_query", "warn", "error"]
    : ["error"]
})

// ─── QUERY OPTIMIZATION PATTERNS ──────────────────────────────────────────
// Pattern 1: cursor-based pagination (better than OFFSET for large tables)
async function getOrdersPage(cursor?: string, limit = 20) {
  return prisma.order.findMany({
    take: limit + 1,  // fetch one extra to determine hasNextPage
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    select: {          // select only needed columns — never SELECT *
      id: true,
      status: true,
      totalAmountPaise: true,
      createdAt: true,
      customer: { select: { name: true, email: true } }
    }
  })
}

// Pattern 2: count + data in one trip using $transaction
async function getPaginatedOrders(page: number, limit: number) {
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.count()
  ])
  return { orders, total, pages: Math.ceil(total / limit) }
}`,
    bugs: `BUG 1 — Missing index on foreign key causes full table scan
──────────────────────────────────────────────────────────
-- orders table has 2 million rows
-- customer_id is a foreign key but has NO index
-- Common query: "get all orders for customer"

SELECT * FROM orders WHERE customer_id = $1;
-- Plan: Seq Scan on orders (cost=0..180000 rows=2000000)
-- Execution time: 800ms per query, called on every page load
-- This is the most common cause of "our app slowed down as we grew"

Fix: CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders(customer_id);
-- CONCURRENTLY builds without locking the table in production

BUG 2 — N+1 in a nested include chain
────────────────────────────────────────
// Fetching orders with items, and for each item fetching the product
const orders = await prisma.order.findMany({ where: { status: "PENDING" } })
for (const order of orders) {
  order.items = await prisma.orderItem.findMany({ where: { orderId: order.id } })
  for (const item of order.items) {
    item.product = await prisma.product.findUnique({ where: { id: item.productId } })
  }
}
// 50 orders × 5 items each = 250 item queries + 250 product queries = 551 total
// In production: 5+ seconds for a simple list

Fix:
const orders = await prisma.order.findMany({
  where: { status: "PENDING" },
  include: { items: { include: { product: true } } }
})  // 1 query with nested JOINs

BUG 3 — Wrong composite index column order
───────────────────────────────────────────
-- Index: (status, customer_id, created_at)
-- Query: WHERE customer_id = $1 AND status = $2

-- PostgreSQL cannot use this index for the query!
-- The query doesn't provide status first (leftmost column)
-- Falls back to Seq Scan on 2M rows

-- EXPLAIN shows: Seq Scan on orders
-- Index exists but is useless for this access pattern

Fix: Index should match your query access pattern
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status, created_at DESC);
-- Now WHERE customer_id = $1 AND status = $2 ORDER BY created_at DESC is fully indexed

BUG 4 — Forgetting to release db connections (connection leak)
──────────────────────────────────────────────────────────────
async function getUser(id: string) {
  const client = await pool.connect()
  // MISSING try/finally!
  const result = await client.query("SELECT * FROM users WHERE id = $1", [id])
  // If this throws, client.release() is never called
  client.release()
  return result.rows[0]
}

// After a few thousand requests, the pool is exhausted.
// New requests hang waiting for a connection.
// App appears "frozen" — no errors, just timeout.

Fix: ALWAYS use try/finally:
const client = await pool.connect()
try {
  return (await client.query(sql, params)).rows[0]
} finally {
  client.release()  // guaranteed even if query throws
}

BUG 5 — Using OFFSET pagination on large tables
────────────────────────────────────────────────
-- Page 1: OFFSET 0 LIMIT 20  → reads 20 rows
-- Page 5: OFFSET 80 LIMIT 20 → reads 100 rows, discards first 80
-- Page 100: OFFSET 1980 LIMIT 20 → reads 2000 rows, discards 1980!

-- EXPLAIN: "Seq Scan -> Sort -> Limit" — cost scales with page number
-- Deep pagination is catastrophically slow on large tables

Fix: Cursor-based pagination
SELECT * FROM orders
WHERE (created_at, id) < ($lastDate, $lastId)  -- cursor from previous page
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- Always reads exactly 20 rows regardless of how deep you go`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
-- Table: products (500,000 rows)
-- Indexes: 
--   idx_products_category ON products(category)
--   idx_products_cat_price ON products(category, price DESC)
--   idx_products_active ON products(created_at) WHERE is_active = true

-- Query A:
SELECT * FROM products WHERE category = 'electronics' AND price < 50000;

-- Query B:
SELECT * FROM products WHERE price < 50000;

-- Query C:
SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT 20;

-- Query D:
SELECT * FROM products WHERE category = 'electronics' ORDER BY price DESC LIMIT 10;

Q: For each query, which index (if any) will PostgreSQL use?
   Which query will be slowest and why?
   For Query B, what index would you add to make it fast?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This Prisma service has 3 database performance issues. Identify and fix each.

async function getAdminDashboard() {
  // Issue 1: fetching all orders ever created
  const orders = await prisma.order.findMany({
    include: { customer: true, items: true }
  })

  // Issue 2: N+1 for computing stats
  const stats = await Promise.all(
    orders.map(async (order) => ({
      orderId: order.id,
      customerName: order.customer.name,
      itemCount: order.items.length,
      // separate query per order!
      paymentStatus: await prisma.payment.findFirst({ where: { orderId: order.id } })
    }))
  )

  // Issue 3: counting separately after already fetching all records
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmountPaise, 0)
  const orderCount = orders.length

  return { stats, totalRevenue, orderCount }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Design the complete database schema and indexing strategy for a food delivery app:
Tables: users, restaurants, menu_items, orders, order_items, delivery_drivers, deliveries

Requirements:
1. Users can search restaurants by city and cuisine_type — design the index
2. Orders need to be fetched by user AND by restaurant AND by status — design composite indexes
3. Real-time driver location is updated every 10 seconds — should this be in PostgreSQL?
4. Menu search by name (full text) — what index type?
5. Show the EXPLAIN ANALYZE plan shape you'd expect for the restaurant search query
6. Identify where N+1 problems would occur in a typical "show order details" page
7. Design connection pool settings for: 4 Node processes, each needing max 10 connections, PostgreSQL max_connections = 100`,
    summary: "Database performance is designed, not discovered. Choose indexes based on your query patterns before data grows, eliminate N+1 queries with JOINs and eager loading, read query plans with EXPLAIN ANALYZE to verify your assumptions, and size your connection pool to match your database's capacity."
  },

  {
    id: 5,
    title: "Caching with Redis",
    tag: "TRADING STALENESS FOR SPEED",
    color: "#E67E22",
    tldr: "Redis is an in-memory data store used to cache expensive computations, database queries, and session data. The key challenges aren't storing data — they're deciding what to cache, when it expires, how to invalidate it when source data changes, and preventing the thundering herd when the cache is empty.",
    problem: `The most common mistake with caching: adding Redis to a slow system and not getting faster. The query you cached is still slow. The items are cached individually but you're doing 100 cache lookups instead of 1 database query. Or the cache gets invalidated on every write and the hit rate is 2%.

The second most common mistake: cache stampede. Your most popular endpoint caches a result for 60 seconds. At exactly second 61, the cache expires. 1,000 concurrent requests all miss the cache simultaneously, all hit the database at the same time, all compute the same expensive result, all try to write back to the cache. Your database gets a 1,000x spike in load for the duration of the recompute. This is called the thundering herd.

The third problem: cache invalidation. "There are only two hard things in computer science: cache invalidation and naming things." When you update a user's profile, which cache keys need to be invalidated? The individual user cache. The "list all users" cache. The "admin dashboard users count" cache. The "team members" cache for every team they're in. Miss one and users see stale data. Over-invalidate and your cache is useless.

Redis solves these problems — but you need to understand its data structures, TTL strategies, distributed locking, and tag-based invalidation to use it effectively.`,
    analogy: `Think of Redis as a very fast whiteboard in your office kitchen. Everyone in the office (all your server processes) can see the same whiteboard.

CACHE-ASIDE is like this: before doing expensive work (going to the filing room), you check the whiteboard first. If the answer is there, read it. If not, go to the filing room, get the answer, write it on the whiteboard for next time, return the answer.

WRITE-THROUGH is like the filing clerk also updating the whiteboard every time they file something. Every write goes to both the files (database) and the whiteboard (cache). The whiteboard is always current but every write is slightly slower.

WRITE-BEHIND is like the clerk making changes on the whiteboard instantly and batching the filing room updates for later. Very fast writes, but if the office burns down before the batch runs, you've lost data.

CACHE STAMPEDE is what happens when the whiteboard is erased at shift change. 50 people walk in at exactly the same time, all need the same frequently-requested info, none of it is on the whiteboard, all 50 head to the filing room simultaneously. The filing room grinds to a halt.

THE MUTEX LOCK FIX: The first person to notice the whiteboard is empty puts a sticky note: "I'm going to the filing room, please wait." Everyone else waits instead of going themselves. One filing room trip instead of 50.`,
    deep: `CACHE STRATEGIES IN DEPTH
──────────────────────────
1. Cache-Aside (Lazy Loading)
- Application reads cache → if miss, reads DB → writes to cache → returns data
- Pro: only caches what's actually requested, cache failure doesn't break the app
- Con: first request always goes to DB (cold start), data can be stale until TTL

2. Write-Through
- Application writes to cache AND DB on every write
- Pro: cache always consistent with DB
- Con: every write has cache penalty, cache fills with data that may never be read

3. Write-Behind (Write-Back)
- Application writes to cache only; async job flushes to DB
- Pro: extremely fast writes
- Con: data loss risk if Redis crashes before flush; complex recovery

REDIS DATA STRUCTURES FOR REAL USE CASES
──────────────────────────────────────────
String: simple key-value, counters, JSON blobs, session tokens
Hash: user session data { userId, role, lastSeen } — field-level access
Sorted Set: leaderboards, rate limiting, scheduled tasks (score = timestamp)
Set: unique items, tags, user permissions, follower lists
List: queues, activity feeds (push/pop from ends)
Stream: event sourcing, audit logs, message queues

TTL STRATEGY
─────────────
- Short TTL (10-60s): frequently changing data (dashboard stats, feed)
- Medium TTL (5-30min): user profile data, product listings
- Long TTL (1-24hr): rarely changing data (config, reference data)
- No TTL (permanent): session tokens (deleted explicitly on logout), locks

DISTRIBUTED LOCK PATTERN
──────────────────────────
\`\`\`
SET lock:key uniqueValue NX EX 30
\`\`\`
NX = only set if NOT EXISTS (atomic — no race condition)
EX 30 = expire after 30 seconds (auto-release if holder crashes)
uniqueValue = must match to delete (prevent releasing another process's lock)

TAG-BASED INVALIDATION
───────────────────────
Problem: user:U1 data is cached in 10 different keys. How to invalidate all on update?
Solution: maintain a set of cache keys per tag
\`\`\`
SADD tag:user:U1 "user:U1:profile" "user:U1:orders" "feed:U1" "team:T1:members"
\`\`\`
On update: get all keys from the tag set, delete them all, delete the tag set.`,
    code: `// ─── REDIS CLIENT SETUP ──────────────────────────────────────────────────
// lib/redis.ts
// const Redis = require("ioredis")

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    if (times > 3) return null  // stop retrying after 3 attempts
    return Math.min(times * 200, 2000)  // exponential backoff
  },
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
})

redis.on("error", (err: Error) => {
  console.error("Redis error:", err.message)
  // Don't crash the app — degrade gracefully
})

// ─── CACHE-ASIDE PATTERN ──────────────────────────────────────────────────
class CacheService {
  constructor(private redis: Redis) {}

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.redis.get(key)
    if (cached) {
      return JSON.parse(cached) as T
    }

    // Cache miss — fetch from source
    const fresh = await fetcher()

    // Store in cache with TTL
    await this.redis.setex(key, ttlSeconds, JSON.stringify(fresh))

    return fresh
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys)
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) await this.redis.del(...keys)
  }
}

// ─── USAGE IN SERVICE ─────────────────────────────────────────────────────
class ProductService {
  constructor(
    private productRepo: IProductRepository,
    private cache: CacheService
  ) {}

  async getProduct(id: string): Promise<Product> {
    return this.cache.getOrSet(
      \`product:\${id}\`,
      () => this.productRepo.findById(id),
      300  // 5 minutes TTL
    )
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.cache.getOrSet(
      \`products:category:\${category}\`,
      () => this.productRepo.findByCategory(category),
      120  // 2 minutes — categories change more frequently
    )
  }

  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const updated = await this.productRepo.update(id, data)
    // Invalidate all related cache entries
    await this.cache.invalidate(
      \`product:\${id}\`,
      \`products:category:\${updated.category}\`
    )
    return updated
  }
}

// ─── CACHE STAMPEDE FIX — MUTEX LOCK ────────────────────────────────────
class StampedeResistantCache {
  constructor(private redis: Redis) {}

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await this.redis.get(key)
    if (cached) return JSON.parse(cached) as T

    // Acquire a distributed lock — only ONE process fetches
    const lockKey = \`lock:\${key}\`
    const lockValue = \`\${process.pid}:\${Date.now()}\`
    const acquired = await this.redis.set(lockKey, lockValue, "NX", "EX", 30)

    if (!acquired) {
      // Another process is fetching — wait and retry
      await new Promise(resolve => setTimeout(resolve, 100))
      const retried = await this.redis.get(key)
      if (retried) return JSON.parse(retried) as T
      // If still not cached (fetcher took > 100ms), fall through to DB
      return fetcher()
    }

    try {
      const fresh = await fetcher()
      await this.redis.setex(key, ttlSeconds, JSON.stringify(fresh))
      return fresh
    } finally {
      // Only release if we still own the lock (prevent releasing another's lock)
      const currentLock = await this.redis.get(lockKey)
      if (currentLock === lockValue) {
        await this.redis.del(lockKey)
      }
    }
  }
}

// ─── TAG-BASED INVALIDATION ───────────────────────────────────────────────
class TaggedCache {
  constructor(private redis: Redis) {}

  async set<T>(key: string, value: T, ttlSeconds: number, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline()
    pipeline.setex(key, ttlSeconds, JSON.stringify(value))

    // Register this key under each tag
    for (const tag of tags) {
      pipeline.sadd(\`tag:\${tag}\`, key)
      pipeline.expire(\`tag:\${tag}\`, ttlSeconds + 60)  // tag slightly longer than data
    }
    await pipeline.exec()
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = \`tag:\${tag}\`
    const keys = await this.redis.smembers(tagKey)
    if (keys.length > 0) {
      const pipeline = this.redis.pipeline()
      keys.forEach(k => pipeline.del(k))
      pipeline.del(tagKey)
      await pipeline.exec()
    }
  }
}

// Usage: cache user data tagged so it can all be invalidated at once
async function cacheUserData(userId: string, data: UserData): Promise<void> {
  await taggedCache.set(
    \`user:\${userId}:profile\`,
    data,
    300,
    [\`user:\${userId}\`]  // tag with user's id
  )
  await taggedCache.set(
    \`user:\${userId}:orders\`,
    data.orders,
    120,
    [\`user:\${userId}\`, "orders"]  // tagged with both user and "orders"
  )
}
// When user updates: await taggedCache.invalidateByTag(\`user:\${userId}\`)
// Invalidates all keys tagged with that user in one operation

// ─── REDIS DATA STRUCTURES ─────────────────────────────────────────────────
// Rate limiting with sorted set (sliding window)
async function checkRateLimit(userId: string, limitPerMinute: number): Promise<boolean> {
  const key = \`ratelimit:\${userId}\`
  const now = Date.now()
  const windowStart = now - 60_000  // 1 minute window

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)  // remove old requests
  pipeline.zadd(key, now, \`\${now}\`)               // add current request
  pipeline.zcard(key)                              // count requests in window
  pipeline.expire(key, 60)

  const results = await pipeline.exec()
  const count = results![2][1] as number
  return count <= limitPerMinute  // true = allowed
}

// Session storage with hash
async function saveSession(sessionId: string, userId: string, role: string): Promise<void> {
  const key = \`session:\${sessionId}\`
  await redis.hset(key, {
    userId,
    role,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  })
  await redis.expire(key, 86400)  // 24hr session
}

async function getSession(sessionId: string): Promise<Session | null> {
  const data = await redis.hgetall(\`session:\${sessionId}\`)
  if (!data || !data.userId) return null
  return data as unknown as Session
}`,
    bugs: `BUG 1 — Caching without TTL (memory leak)
──────────────────────────────────────────
async function cacheProduct(id: string, product: Product) {
  await redis.set(\`product:\${id}\`, JSON.stringify(product))  // NO TTL!
}
// Cache grows forever. Redis evicts keys when memory is full using LRU policy.
// But stale product data (old prices, discontinued items) is served indefinitely.
// In production: Redis memory hit 8GB — all keys evicted suddenly — cache stampede.

Fix: ALWAYS use setex or set with EX option:
await redis.setex(\`product:\${id}\`, 300, JSON.stringify(product))

BUG 2 — Cache stampede under load
────────────────────────────────────
// Popular product page, cache TTL = 60s
// At second 61: 500 concurrent users hit the page
// 500 cache misses → 500 DB queries for the same product → DB spike

// Log shows: product:P1 cache miss × 500 within 100ms
// DB connection pool exhausted: "Error: Connection timed out"

Fix: Distributed lock as shown in StampedeResistantCache above.
Alternative: Probabilistic early expiration — refresh cache slightly BEFORE it expires
using a random early recompute as TTL approaches 0.

BUG 3 — Not invalidating all related cache keys on update
───────────────────────────────────────────────────────────
async function updateUserProfile(userId: string, data: UpdateData) {
  await userRepo.update(userId, data)
  await redis.del(\`user:\${userId}\`)  // Only invalidates the profile key!
}
// Missed: user:\${userId}:orders, user:\${userId}:teams, feed:home:\${userId}
// User sees updated profile but stale order history showing old name
// Team members see the user's old name for hours

Fix: Tag-based invalidation as shown above.
Maintain a registry of all keys that belong to each tag.
On update: invalidate the entire tag.

BUG 4 — Storing entire objects when only one field is needed
─────────────────────────────────────────────────────────────
// Caching entire user objects (5KB each) just to check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  const cached = await redis.get(\`user:\${userId}\`)
  if (cached) return JSON.parse(cached).role === "admin"
  const user = await userRepo.findById(userId)
  await redis.setex(\`user:\${userId}\`, 300, JSON.stringify(user))
  return user?.role === "admin"
}
// Fetching 5KB + JSON.parse for every authorization check
// Use Redis HASH to store only needed fields:

async function isAdmin(userId: string): Promise<boolean> {
  const role = await redis.hget(\`user:\${userId}:session\`, "role")
  if (role) return role === "admin"
  const user = await userRepo.findById(userId)
  await redis.hset(\`user:\${userId}:session\`, { role: user.role })
  await redis.expire(\`user:\${userId}:session\`, 300)
  return user.role === "admin"
}

BUG 5 — Using KEYS command in production
─────────────────────────────────────────
// Trying to invalidate all product cache entries
async function invalidateAllProducts() {
  const keys = await redis.keys("product:*")  // NEVER in production!
  await redis.del(...keys)
}
// KEYS blocks Redis — it's O(N) on all keys in the database
// In production Redis with 500,000 keys: KEYS blocks for 300ms+
// Redis is single-threaded — all other commands queue during this block
// Entire application appears frozen for 300ms under load

Fix: Use SCAN for iterative, non-blocking key enumeration
async function invalidateAllProducts() {
  let cursor = "0"
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "product:*", "COUNT", 100)
    if (keys.length > 0) await redis.del(...keys)
    cursor = nextCursor
  } while (cursor !== "0")
}`,
    challenge: `CHALLENGE 1 — Predict the output
──────────────────────────────────
const redis = new Redis()

// At time 0:
await redis.setex("counter", 5, "10")  // expires in 5 seconds
await redis.set("permanent", "hello")   // no TTL

// At time 2s:
await redis.incr("counter")

// At time 4s:
const val1 = await redis.get("counter")
console.log("val1:", val1)

// At time 6s (after TTL expired):
await redis.incr("counter")
const val2 = await redis.get("counter")
console.log("val2:", val2)

// At time 7s:
const val3 = await redis.get("permanent")
console.log("val3:", val3)

Q: What does each console.log output?
   At time 6s, what happens when incr is called on an expired key?
   What is val2?

CHALLENGE 2 — Fix the bugs
────────────────────────────
// This caching implementation has 4 bugs. Identify and fix each.

class UserCacheService {
  // Bug 1: no TTL
  async cacheUser(user: User): Promise<void> {
    await redis.set(\`user:\${user.id}\`, JSON.stringify(user))
  }

  // Bug 2: no invalidation on update
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const updated = await userRepo.update(id, data)
    return updated  // cache not invalidated!
  }

  // Bug 3: race condition — multiple processes can fetch simultaneously
  async getUser(id: string): Promise<User | null> {
    const cached = await redis.get(\`user:\${id}\`)
    if (cached) return JSON.parse(cached)
    const user = await userRepo.findById(id)
    if (user) await redis.set(\`user:\${id}\`, JSON.stringify(user))
    return user
  }

  // Bug 4: blocking KEYS call
  async invalidateAllUsers(): Promise<void> {
    const keys = await redis.keys("user:*")
    if (keys.length > 0) await redis.del(...keys)
  }
}

CHALLENGE 3 — Build from scratch
──────────────────────────────────
Build a complete caching layer for a product catalog:
1. CacheService class with: get, set (with TTL), del, invalidateByTag
2. Cache product by ID (TTL: 5 min), tagged with product ID and category
3. Cache product list by category (TTL: 2 min), tagged with category
4. Cache-aside implementation with stampede protection using distributed lock
5. On product update: invalidate product ID tag (removes product + its category list)
6. Rate limiter using Redis sorted set: 100 requests per minute per IP
7. Session store: save, get, refresh (extend TTL), destroy session
8. Write tests that verify: cache hit returns cached data, cache miss fetches from DB and caches, tag invalidation removes all tagged keys`,
    summary: "Redis is not magic speed — it's a tool for trading staleness for speed, with careful management of TTLs, invalidation, and stampede protection. Master cache-aside with proper TTLs, tag-based invalidation, distributed locking for stampede prevention, and the SCAN-not-KEYS rule, and caching becomes a reliable performance multiplier."
  }
];
