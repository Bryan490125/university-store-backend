require("dotenv").config();
const { loadKeyVaultSecrets } = require("./keyVault");

async function main() {
  const vault = await loadKeyVaultSecrets();
  if (vault.loaded) console.log(`Azure Key Vault loaded ${vault.count} missing secret(s)`);
  const { createApp } = require("./app");
  const { getConfig } = require("./config");
  const prisma = require("./db");
  const cfg = getConfig();
  const server = createApp().listen(cfg.PORT, () => console.log(`University Store API listening on port ${cfg.PORT}${cfg.BASE_PATH}/api`));
  async function shutdown(signal) { console.log(`${signal}: shutting down`); server.close(async () => { await prisma.$disconnect(); process.exit(0); }); }
  process.on("SIGTERM", () => shutdown("SIGTERM")); process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(error => { console.error("Startup failed:", error.message); process.exit(1); });
