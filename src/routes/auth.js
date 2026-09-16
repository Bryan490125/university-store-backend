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
    let user;
    if (req.auth.oid) {
      user = await prisma.user.findUnique({ where: { azureId: req.auth.oid } });
      if (!user) {
        const email = (req.auth.preferred_username || req.auth.email || "").trim().toLowerCase();
        if (!email) return res.status(400).json({ error: "University account has no email address" });
        user = await prisma.user.create({ data: {
          azureId: req.auth.oid, email,
          name: req.auth.name || "University User"
        } });
      }
    } else {
      const id = Number(req.auth.sub);
      if (Number.isInteger(id) && id > 0) user = await prisma.user.findUnique({ where: { id } });
    }
    if (!user) return res.status(404).json({ error: "User not registered" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { next(e); }
});
module.exports = router;
