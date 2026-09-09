const router = require("express").Router();
const { z } = require("zod");
const prisma = require("../db");
const { authenticate, allow } = require("../middleware");

router.use(authenticate, allow("ADMIN"));

router.get("/users", async (_req, res, next) => {
  try { res.json(await prisma.user.findMany({ select: { id: true, azureId: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" } })); }
  catch (e) { next(e); }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const role = z.enum(["STUDENT", "STAFF", "ADMIN"]).parse(req.body.role);
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role }, select: { id: true, name: true, email: true, role: true } });
    res.json(user);
  } catch (e) { next(e); }
});

router.get("/reports/summary", async (_req, res, next) => {
  try {
    const [users, products, orders, revenue, lowStock] = await Promise.all([
      prisma.user.count(), prisma.product.count({ where: { isActive: true } }), prisma.order.count(),
      prisma.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
      prisma.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, orderBy: { stock: "asc" } })
    ]);
    res.json({ users, activeProducts: products, orders, revenue: Number(revenue._sum.totalAmount || 0), lowStock });
  } catch (e) { next(e); }
});

module.exports = router;
