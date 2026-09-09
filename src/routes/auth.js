const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { getConfig } = require("../config");
const { authenticate } = require("../middleware");

router.post("/dev-login", async (req, res, next) => {
  try {
    const cfg = getConfig();
    if (!cfg.DEV_LOGIN_ENABLED || cfg.NODE_ENV === "production") return res.status(404).json({ error: "Not found" });
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user?.passwordHash || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: String(user.id), email: user.email, name: user.name, role: user.role }, cfg.JWT_SECRET, { expiresIn: "2h", algorithm: "HS256" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    let user = await prisma.user.findFirst({ where: { OR: [{ id: Number(req.auth.sub) || -1 }, { azureId: req.auth.oid || "none" }, { email: req.auth.email || req.auth.preferred_username || "none" }] } });
    if (!user && req.auth.oid) user = await prisma.user.create({ data: { azureId: req.auth.oid, email: req.auth.preferred_username, name: req.auth.name || "University User" } });
    if (!user) return res.status(404).json({ error: "User not registered" });
    res.json(user);
  } catch (e) { next(e); }
});
module.exports = router;
