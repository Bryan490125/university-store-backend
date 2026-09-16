require("dotenv").config();
process.env.NODE_ENV = "test";
process.env.DEV_LOGIN_ENABLED = "true";
process.env.ROLE_LOGIN_ENABLED = "true";
process.env.DATABASE_URL = process.env.DATABASE_URL || "mysql://store_user:store_password@localhost:3306/university_store";
process.env.JWT_SECRET = process.env.JWT_SECRET || "uortIejaqfwWZYWtmXgmHIMPHMNw4xBSF4O6v/fJLYTvuUSuqgUtELGfIi7+DLBn";
process.env.EXPOSED_PEER_API_KEY = process.env.EXPOSED_PEER_API_KEY || "0c0bf00270a2bea199aac7c205c0567f6a4a307f0cb6d934ec7690319e9443df";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const prisma = require("../src/db");

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET;
const PEER_KEY = process.env.EXPOSED_PEER_API_KEY;

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h", algorithm: "HS256" });
}

test("1. Authentication - dev-login and invalid credential rejection", async () => {
  // Invalid login
  const badLogin = await request(app)
    .post("/store/api/auth/dev-login")
    .send({ email: "student@university.edu", password: "WrongPassword!" });
  assert.equal(badLogin.status, 401);

  // Valid student login
  const studentLogin = await request(app)
    .post("/store/api/auth/dev-login")
    .send({ email: "student@university.edu", password: "Demo123!" });
  assert.equal(studentLogin.status, 200);
  assert.ok(studentLogin.body.token);
  assert.equal(studentLogin.body.user.role, "STUDENT");

  // Valid staff login
  const staffLogin = await request(app)
    .post("/store/api/auth/dev-login")
    .send({ email: "staff@university.edu", password: "Demo123!" });
  assert.equal(staffLogin.status, 200);
  assert.equal(staffLogin.body.user.role, "STAFF");

  // Valid admin login
  const adminLogin = await request(app)
    .post("/store/api/auth/dev-login")
    .send({ email: "admin@university.edu", password: "Demo123!" });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, "ADMIN");
});

test("1b. Authentication - role login returns the selected role", async () => {
  const roleLogin = await request(app)
    .post("/store/api/auth/role-login")
    .send({ role: "STAFF" });
  assert.equal(roleLogin.status, 200);
  assert.ok(roleLogin.body.token);
  assert.equal(roleLogin.body.user.role, "STAFF");
});

test("2. RBAC - missing and invalid token rejection", async () => {
  // Missing token
  const noToken = await request(app).get("/store/api/cart");
  assert.equal(noToken.status, 401);

  // Invalid token
  const badToken = await request(app)
    .get("/store/api/cart")
    .set("Authorization", "Bearer invalid-junk-token");
  assert.equal(badToken.status, 401);
});

test("3. Catalog & Search - public browsing, keyword and category filters", async () => {
  // Public product list
  const res = await request(app).get("/store/api/products");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));

  // Product search with query
  const search = await request(app).get("/store/api/products?q=Hoodie");
  assert.equal(search.status, 200);
  assert.ok(search.body.some(p => p.name.includes("Hoodie")));

  // Product search with non-existent query
  const emptySearch = await request(app).get("/store/api/products?q=NonExistent12345");
  assert.equal(emptySearch.status, 200);
  assert.equal(emptySearch.body.length, 0);

  // Category list
  const catRes = await request(app).get("/store/api/categories");
  assert.equal(catRes.status, 200);
  assert.ok(catRes.body.length > 0);
});

test("4. Role Authorization - Category and Product management", async () => {
  const studentToken = makeToken({ sub: "1", email: "student@university.edu", role: "STUDENT" });
  const staffToken = makeToken({ sub: "2", email: "staff@university.edu", role: "STAFF" });
  const adminToken = makeToken({ sub: "3", email: "admin@university.edu", role: "ADMIN" });

  // Student cannot create category (403)
  const studentCat = await request(app)
    .post("/store/api/categories")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "Student forbidden category" });
  assert.equal(studentCat.status, 403);

  // Admin creates category (201)
  const categoryName = `Stationery-${Date.now()}`;
  const adminCat = await request(app)
    .post("/store/api/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: categoryName });
  assert.equal(adminCat.status, 201);
  const newCatId = adminCat.body.id;

  // Student cannot create product (403)
  const studentProd = await request(app)
    .post("/store/api/products")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "Student Pen", price: 25, stock: 100, categoryId: newCatId });
  assert.equal(studentProd.status, 403);

  // Staff creates product (201)
  const staffProd = await request(app)
    .post("/store/api/products")
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ name: "University Notebook", description: "Lined 200-page notebook", price: 150, stock: 20, categoryId: newCatId });
  assert.equal(staffProd.status, 201);
  assert.equal(staffProd.body.stock, 20);
  const prodId = staffProd.body.id;

  // Staff updates product stock (200)
  const staffUpdate = await request(app)
    .put(`/store/api/products/${prodId}`)
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ stock: 25 });
  assert.equal(staffUpdate.status, 200);
  assert.equal(staffUpdate.body.stock, 25);
});

test("5. Shopping Cart, Checkout & Stock Reduction", async () => {
  // Login student
  const studentLogin = await request(app)
    .post("/store/api/auth/dev-login")
    .send({ email: "student@university.edu", password: "Demo123!" });
  const studentToken = studentLogin.body.token;
  const staffToken = makeToken({ sub: "2", email: "staff@university.edu", role: "STAFF" });

  // Staff cannot access cart (403)
  const staffCart = await request(app)
    .get("/store/api/cart")
    .set("Authorization", `Bearer ${staffToken}`);
  assert.equal(staffCart.status, 403);

  // Check product initial stock
  const prod = await prisma.product.findUnique({ where: { id: 1 } });
  const initialStock = prod.stock;

  // Student adds item to cart
  const addCart = await request(app)
    .post("/store/api/cart/items")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ productId: 1, quantity: 2 });
  assert.equal(addCart.status, 201);

  // Invalid quantity rejection
  const badQty = await request(app)
    .post("/store/api/cart/items")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ productId: 1, quantity: -5 });
  assert.equal(badQty.status, 400);

  // Student checks out
  const checkout = await request(app)
    .post("/store/api/orders/checkout")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.status, "PENDING");
  const orderId = checkout.body.id;

  // Verify stock reduction
  const updatedProd = await prisma.product.findUnique({ where: { id: 1 } });
  assert.equal(updatedProd.stock, initialStock - 2);

  // Student views order history
  const history = await request(app)
    .get("/store/api/orders/mine")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(history.status, 200);
  assert.ok(history.body.some(o => o.id === orderId));

  // Empty cart checkout rejection (cart is now empty)
  const emptyCheckout = await request(app)
    .post("/store/api/orders/checkout")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(emptyCheckout.status, 400);
});

test("6. Admin Order Management & Role-Based Access Control", async () => {
  const studentToken = makeToken({ sub: "1", email: "student@university.edu", role: "STUDENT" });
  const adminToken = makeToken({ sub: "3", email: "admin@university.edu", role: "ADMIN" });

  // Student cannot view all orders (403)
  const studentOrders = await request(app)
    .get("/store/api/orders")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(studentOrders.status, 403);

  // Admin views all orders (200)
  const adminOrders = await request(app)
    .get("/store/api/orders")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminOrders.status, 200);
  assert.ok(adminOrders.body.length > 0);
  const targetOrderId = adminOrders.body[0].id;

  // Student cannot update order status (403)
  const studentUpdateStatus = await request(app)
    .patch(`/store/api/orders/${targetOrderId}/status`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ status: "CONFIRMED" });
  assert.equal(studentUpdateStatus.status, 403);

  // Admin updates order status (200)
  const adminUpdateStatus = await request(app)
    .patch(`/store/api/orders/${targetOrderId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "CONFIRMED" });
  assert.equal(adminUpdateStatus.status, 200);
  assert.equal(adminUpdateStatus.body.status, "CONFIRMED");
});

test("7. Admin Management - User Roles and Summary Dashboard Report", async () => {
  const studentToken = makeToken({ sub: "1", email: "student@university.edu", role: "STUDENT" });
  const adminToken = makeToken({ sub: "3", email: "admin@university.edu", role: "ADMIN" });

  // Student cannot access user management (403)
  const studentUsers = await request(app)
    .get("/store/api/admin/users")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(studentUsers.status, 403);

  // Admin views user list (200)
  const adminUsers = await request(app)
    .get("/store/api/admin/users")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminUsers.status, 200);
  assert.ok(adminUsers.body.length >= 3);

  // Admin summary report (200)
  const summary = await request(app)
    .get("/store/api/admin/reports/summary")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(summary.status, 200);
  assert.ok(typeof summary.body.users === "number");
  assert.ok(typeof summary.body.activeProducts === "number");
  assert.ok(typeof summary.body.orders === "number");
  assert.ok(typeof summary.body.revenue === "number");
  assert.ok(Array.isArray(summary.body.lowStock));
});

test("8. Peer API Integration - Inbound Order Status Authentication", async () => {
  const order = await prisma.order.findFirst();
  assert.ok(order, "An order should exist");

  // Inbound request with invalid x-api-key (401)
  const badKey = await request(app)
    .get(`/store/api/orders/${order.id}/status`)
    .set("x-api-key", "wrong-peer-key");
  assert.equal(badKey.status, 401);
  assert.equal(badKey.body.error, "Invalid API key");

  // Inbound request with valid x-api-key (200)
  const goodKey = await request(app)
    .get(`/store/api/orders/${order.id}/status`)
    .set("x-api-key", PEER_KEY);
  assert.equal(goodKey.status, 200);
  assert.equal(goodKey.body.orderId, order.id);
  assert.ok(goodKey.body.status);
  assert.ok(goodKey.body.orderDate);
});

test("9. AI Integration Endpoint - RBAC Protection", async () => {
  const studentToken = makeToken({ sub: "1", email: "student@university.edu", role: "STUDENT" });
  const staffToken = makeToken({ sub: "2", email: "staff@university.edu", role: "STAFF" });

  // Student cannot invoke AI description (403)
  const studentAI = await request(app)
    .post("/store/api/integrations/ai/product-description")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "University Hoodie" });
  assert.equal(studentAI.status, 403);

  // Staff invokes AI endpoint: if key not configured, returns 503
  const staffAI = await request(app)
    .post("/store/api/integrations/ai/product-description")
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ name: "University Hoodie" });
  // If OPENAI_API_KEY is not configured, it properly returns 503; if configured, 200
  assert.ok([200, 503].includes(staffAI.status));
});
