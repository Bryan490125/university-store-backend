const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  BASE_PATH: z.string().default("/store"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  DEV_LOGIN_ENABLED: z.string().default("false").transform(v => v === "true"),
  AZURE_TENANT_ID: z.string().optional(), AZURE_CLIENT_ID: z.string().optional(), AZURE_AUDIENCE: z.string().optional(),
  KEY_VAULT_URL: z.string().optional(),
  KEY_VAULT_DATABASE_SECRET: z.string().default("database-url"), KEY_VAULT_JWT_SECRET: z.string().default("jwt-secret"),
  KEY_VAULT_OPENAI_SECRET: z.string().default("openai-api-key"), KEY_VAULT_PARTNER_SECRET: z.string().default("partner-api-key"),
  KEY_VAULT_EXPOSED_PEER_SECRET: z.string().default("exposed-peer-api-key"),
  OPENAI_API_KEY: z.string().optional(), OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  PARTNER_API_BASE_URL: z.string().optional(), PARTNER_API_KEY: z.string().optional(), EXPOSED_PEER_API_KEY: z.string().min(16)
});

function getConfig() { return schema.parse(process.env); }
module.exports = { getConfig };
