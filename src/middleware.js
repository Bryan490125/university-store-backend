const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { getConfig } = require("./config");
const prisma = require("./db");

function tokenFrom(req) { const h = req.headers.authorization || ""; return h.startsWith("Bearer ") ? h.slice(7) : null; }

async function verifyEntra(token, cfg) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded?.header?.kid || !cfg.AZURE_TENANT_ID) throw new Error("Invalid Entra token");
  const client = jwksClient({ jwksUri: `https://login.microsoftonline.com/${cfg.AZURE_TENANT_ID}/discovery/v2.0/keys`, cache: true, rateLimit: true });
  const key = await client.getSigningKey(decoded.header.kid);
  const claims = jwt.verify(token, key.getPublicKey(), {
    algorithms: ["RS256"], audience: cfg.AZURE_AUDIENCE || cfg.AZURE_CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${cfg.AZURE_TENANT_ID}/v2.0`
  });
  if (!claims.scp?.split(" ").includes("access_as_user")) throw new Error("API access scope required");
  return claims;
}

async function authenticate(req, res, next) {
  try {
    const cfg = getConfig(); const token = tokenFrom(req);
    if (!token) return res.status(401).json({ error: "Bearer token required" });
    let claims;
    try { claims = jwt.verify(token, cfg.JWT_SECRET, { algorithms: ["HS256"] }); }
    catch { claims = await verifyEntra(token, cfg); }
    if (!claims.role && cfg.NODE_ENV !== "test") {
      const user = claims.oid ? await prisma.user.findUnique({ where: { azureId: claims.oid } }) : null;
      if (user) claims.role = user.role;
    }
    req.auth = claims; next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
}

function allow(...roles) { return (req, res, next) => roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: "Insufficient permission" }); }
function peerKey(req, res, next) { const cfg = getConfig(); return req.headers["x-api-key"] === cfg.EXPOSED_PEER_API_KEY ? next() : res.status(401).json({ error: "Invalid API key" }); }
module.exports = { authenticate, allow, peerKey };
