const router = require("express").Router();
const prisma = require("../db");
const { authenticate, allow, peerKey } = require("../middleware");
const { z } = require("zod");

router.post("/checkout", authenticate, allow("STUDENT"), async (req, res, next) => {
  try {
    const userId = Number(req.auth.sub); const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: true } } } });
    if (!cart?.items.length) return res.status(400).json({ error: "Cart is empty" });
    const order = await prisma.$transaction(async tx => {
      for (const i of cart.items) { const changed = await tx.product.updateMany({ where: { id: i.productId, stock: { gte: i.quantity }, isActive: true }, data: { stock: { decrement: i.quantity } } }); if (!changed.count) throw new Error(`Insufficient stock for ${i.product.name}`); }
      const totalAmount = cart.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
      const created = await tx.order.create({ data: { userId, totalAmount, items: { create: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.product.price })) } }, include: { items: { include: { product: true } } } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } }); return created;
    }); res.status(201).json(order);
  } catch (e) { next(e); }
});
router.get("/mine", authenticate, allow("STUDENT"), async (req, res, next) => { try { res.json(await prisma.order.findMany({ where: { userId: Number(req.auth.sub) }, include: { items: true }, orderBy: { orderDate: "desc" } })); } catch (e) { next(e); } });
router.get("/", authenticate, allow("ADMIN"), async (_req, res, next) => { try { res.json(await prisma.order.findMany({ include: { user: true, items: true }, orderBy: { orderDate: "desc" } })); } catch (e) { next(e); } });
router.patch("/:id/status", authenticate, allow("ADMIN"), async (req, res, next) => { try { const status = z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).parse(req.body.status); res.json(await prisma.order.update({ where: { id: Number(req.params.id) }, data: { status } })); } catch (e) { next(e); } });
router.get("/:id/status", peerKey, async (req, res, next) => { try { const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, select: { id: true, status: true, orderDate: true } }); order ? res.json({ orderId: order.id, status: order.status, orderDate: order.orderDate }) : res.status(404).json({ error: "Order not found" }); } catch (e) { next(e); } });
module.exports = router;
