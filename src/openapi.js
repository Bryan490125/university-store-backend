const spec = {
  openapi: "3.0.3",
  info: { title: "University Merchandise Store API", version: "1.0.0", description: "REST API for products, carts, orders, RBAC, AI, and peer integration." },
  servers: [{ url: "/store/api" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }, peerApiKey: { type: "apiKey", in: "header", name: "x-api-key" } } },
  paths: {
    "/health": { get: { summary: "Health check", responses: { 200: { description: "Service healthy" } } } },
    "/auth/dev-login": { post: { summary: "Development-only login", responses: { 200: { description: "JWT issued" }, 401: { description: "Invalid credentials" } } } },
    "/auth/me": { get: { summary: "Current user", security: [{ bearerAuth: [] }], responses: { 200: { description: "User profile" } } } },
    "/products": { get: { summary: "List/search products", responses: { 200: { description: "Product list" } } }, post: { summary: "Create product (staff/admin)", security: [{ bearerAuth: [] }], responses: { 201: { description: "Created" } } } },
    "/products/{id}": { get: { summary: "Get product", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { 200: { description: "Product" } } }, put: { summary: "Update product", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } }, delete: { summary: "Deactivate product", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deactivated" } } } },
    "/categories": { get: { summary: "List categories", responses: { 200: { description: "Category list" } } }, post: { summary: "Create category (admin)", security: [{ bearerAuth: [] }], responses: { 201: { description: "Created" } } } },
    "/cart": { get: { summary: "Get student cart", security: [{ bearerAuth: [] }], responses: { 200: { description: "Cart" } } } },
    "/cart/items": { post: { summary: "Add or update cart item", security: [{ bearerAuth: [] }], responses: { 201: { description: "Cart updated" } } } },
    "/orders/checkout": { post: { summary: "Checkout atomically", security: [{ bearerAuth: [] }], responses: { 201: { description: "Order created" } } } },
    "/orders/mine": { get: { summary: "Student order history", security: [{ bearerAuth: [] }], responses: { 200: { description: "Orders" } } } },
    "/orders/{id}/status": { get: { summary: "Peer order status", security: [{ peerApiKey: [] }], responses: { 200: { description: "Order status" } } }, patch: { summary: "Update status (admin)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } } },
    "/admin/users": { get: { summary: "List users (admin)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Users" } } } },
    "/admin/reports/summary": { get: { summary: "Dashboard report (admin)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Summary" } } } },
    "/integrations/catalog-usd": { get: { summary: "Active product prices in THB and approximate USD using a live external exchange rate", responses: { 200: { description: "Converted catalog" }, 502: { description: "Exchange rate unavailable" } } } },
    "/integrations/ai/product-description": { post: { summary: "Generate description (staff/admin)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Generated text" } } } }
  }
};
module.exports = spec;
