require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const { getConfig } = require("./config");
const auth = require("./routes/auth");
const catalog = require("./routes/catalog");
const cart = require("./routes/cart");
const orders = require("./routes/orders");
const integrations = require("./routes/integrations");
const admin = require("./routes/admin");
const openapi = require("./openapi");

function createApp() {
  const cfg = getConfig(); const app = express(); app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false })); app.use(cors({ origin: cfg.NODE_ENV === "development" ? true : cfg.CORS_ORIGIN.split(",").map(x => x.trim()) })); app.use(express.json({ limit: "100kb" })); app.use(morgan(cfg.NODE_ENV === "test" ? "tiny" : "combined"));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
  const api = express.Router();
  api.get("/health", (_req, res) => res.json({ status: "ok", service: "university-store-api", timestamp: new Date().toISOString() }));
  api.get("/openapi.json", (_req, res) => res.json(openapi));
  api.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  api.use("/auth", auth); api.use(catalog); api.use("/cart", cart); api.use("/orders", orders); api.use("/integrations", integrations); api.use("/admin", admin);
  app.use(`${cfg.BASE_PATH}/api`, api);
  app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
  app.use((err, _req, res, _next) => { console.error(err); if (err.name === "ZodError") return res.status(400).json({ error: "Validation failed", details: err.errors }); if (err.code === "P2002") return res.status(409).json({ error: "Duplicate value" }); res.status(500).json({ error: cfg.NODE_ENV === "production" ? "Internal server error" : err.message }); });
  return app;
}
module.exports = { createApp };
