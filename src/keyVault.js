const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

async function loadKeyVaultSecrets() {
  const url = process.env.KEY_VAULT_URL;
  if (!url) return { loaded: false, count: 0 };

  const client = new SecretClient(url, new DefaultAzureCredential());
  const mappings = [
    ["DATABASE_URL", process.env.KEY_VAULT_DATABASE_SECRET || "database-url"],
    ["JWT_SECRET", process.env.KEY_VAULT_JWT_SECRET || "jwt-secret"],
    ["OPENAI_API_KEY", process.env.KEY_VAULT_OPENAI_SECRET || "openai-api-key"],
    ["PARTNER_API_KEY", process.env.KEY_VAULT_PARTNER_SECRET || "partner-api-key"],
    ["EXPOSED_PEER_API_KEY", process.env.KEY_VAULT_EXPOSED_PEER_SECRET || "exposed-peer-api-key"]
  ];

  let count = 0;
  for (const [envName, secretName] of mappings) {
    if (process.env[envName]) continue;
    try {
      const secret = await client.getSecret(secretName);
      if (secret.value) { process.env[envName] = secret.value; count += 1; }
    } catch (err) {
      console.warn(`Key Vault notice: secret "${secretName}" not loaded (${err.message})`);
    }
  }
  return { loaded: true, count };
}

module.exports = { loadKeyVaultSecrets };
