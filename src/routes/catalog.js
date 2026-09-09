const router = require("express").Router();
const prisma = require("../db");
const { authenticate, allow } = require("../middleware");
const { z } = require("zod");
const productSchema = z.object({ name: z.string().min(2), description: z.string().default(""), price: z.coerce.number().positive(), stock: z.coerce.number().int().nonnegative(), categoryId: z.coerce.number().int().positive(), imageUrl: z.string().url().optional().nullable() });

router.get("/categories", async (_req, res, next) => { try { res.json(await prisma.category.findMany({ orderBy: { name: "asc" } })); } catch (e) { next(e); } });
router.post("/categories", authenticate, allow("ADMIN"), async (req, res, next) => { try { const name = z.string().min(2).parse(req.body.name); res.status(201).json(await prisma.category.create({ data: { name } })); } catch (e) { next(e); } });
router.put("/categories/:id", authenticate, allow("ADMIN"), async (req, res, next) => { try { const name = z.string().min(2).parse(req.body.name); res.json(await prisma.category.update({ where: { id: Number(req.params.id) }, data: { name } })); } catch (e) { next(e); } });
router.delete("/categories/:id", authenticate, allow("ADMIN"), async (req, res, next) => { try { const used = await prisma.product.count({ where: { categoryId: Number(req.params.id) } }); if (used) return res.status(409).json({ error: "Cannot delete a category that contains products" }); await prisma.category.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); } catch (e) { next(e); } });
router.get("/products", async (req, res, next) => { try { const q = String(req.query.q || ""); const categoryId = Number(req.query.categoryId); res.json(await prisma.product.findMany({ where: { isActive: true, ...(q && { name: { contains: q } }), ...(categoryId && { categoryId }) }, include: { category: true }, orderBy: { createdAt: "desc" } })); } catch (e) { next(e); } });
router.get("/products/:id", async (req, res, next) => { try { const item = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: { category: true } }); item ? res.json(item) : res.status(404).json({ error: "Product not found" }); } catch (e) { next(e); } });
router.post("/products", authenticate, allow("STAFF", "ADMIN"), async (req, res, next) => { try { res.status(201).json(await prisma.product.create({ data: productSchema.parse(req.body) })); } catch (e) { next(e); } });
router.put("/products/:id", authenticate, allow("STAFF", "ADMIN"), async (req, res, next) => { try { res.json(await prisma.product.update({ where: { id: Number(req.params.id) }, data: productSchema.partial().parse(req.body) })); } catch (e) { next(e); } });
router.delete("/products/:id", authenticate, allow("STAFF", "ADMIN"), async (req, res, next) => { try { res.json(await prisma.product.update({ where: { id: Number(req.params.id) }, data: { isActive: false } })); } catch (e) { next(e); } });
module.exports = router;
