const { Router } = require('express');
const multer    = require('multer');
const kbService = require('../services/kbService');
const auth      = require('../middleware/auth');
const validate  = require('../middleware/validate');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/kb/create
router.post('/create', auth, validate(['name']), async (req, res, next) => {
  try {
    const kb = await kbService.createKB(req.user.businessId, req.body.name);
    res.status(201).json({ success: true, data: kb });
  } catch (err) { next(err); }
});

// POST /api/kb/:id/upload — multipart file upload
router.post('/:id/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const description = req.body.description || '';
    const doc = await kbService.uploadDocument(req.params.id, req.user.businessId, req.file, description);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// POST /api/kb/:id/url — URL scrape & embed
router.post('/:id/url', auth, validate(['url']), async (req, res, next) => {
  try {
    const doc = await kbService.ingestURL(req.params.id, req.user.businessId, req.body.url);
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// GET /api/kb
router.get('/', auth, async (req, res, next) => {
  try {
    const kbs = await kbService.listKBs(req.user.businessId);
    res.json({ success: true, data: kbs });
  } catch (err) { next(err); }
});

// GET /api/kb/:id/documents
router.get('/:id/documents', auth, async (req, res, next) => {
  try {
    const docs = await kbService.getDocuments(req.params.id, req.user.businessId);
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
});

// DELETE /api/kb/:id/document/:docId
router.delete('/:id/document/:docId', auth, async (req, res, next) => {
  try {
    const result = await kbService.deleteDocument(req.params.id, req.params.docId, req.user.businessId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
