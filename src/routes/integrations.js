const router = require("express").Router();
const axios = require("axios");
const OpenAI = require("openai");
const { authenticate, allow } = require("../middleware");
const { getConfig } = require("../config");

router.post("/ai/product-description", authenticate, allow("STAFF", "ADMIN"), async (req, res, next) => { try { const cfg = getConfig(); if (!cfg.OPENAI_API_KEY) return res.status(503).json({ error: "OPENAI_API_KEY is not configured" }); const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY }); const result = await openai.responses.create({ model: cfg.OPENAI_MODEL, input: `Write one concise professional product description (maximum 70 words) for official university merchandise. Product: ${req.body.name}. Features: ${req.body.features || "not supplied"}. Do not invent discounts or certifications.` }); res.json({ description: result.output_text }); } catch (e) { next(e); } });
router.get("/peer/student/:studentId/verify", authenticate, async (req, res, next) => { try { const cfg = getConfig(); if (!cfg.PARTNER_API_BASE_URL || !cfg.PARTNER_API_KEY) return res.status(503).json({ error: "Partner API is not configured" }); const response = await axios.get(`${cfg.PARTNER_API_BASE_URL}/api/student/verify/${encodeURIComponent(req.params.studentId)}`, { headers: { "x-api-key": cfg.PARTNER_API_KEY }, timeout: 5000 }); res.json(response.data); } catch (e) { next(e); } });
module.exports = router;
