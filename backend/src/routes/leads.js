const { Router } = require('express');
const multer = require('multer');
const leadService = require('../services/leadService');
const auth = require('../middleware/auth');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/leads/upload — Excel file upload
router.post('/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const mapping = JSON.parse(req.body.mapping || '{}');
    let campaignId = req.body.campaignId;
    
    if (!campaignId || campaignId === 'undefined') {
      const prisma = require('../config/db');
      let firstCampaign = await prisma.campaign.findFirst({
        where: { businessId: req.user.businessId }
      });
      if (!firstCampaign) {
        firstCampaign = await prisma.campaign.create({
          data: {
            businessId: req.user.businessId,
            name: 'Default Campaign',
            status: 'draft',
            agentTone: 'friendly'
          }
        });
      }
      campaignId = firstCampaign.id;
    }

    const result = await leadService.uploadLeads(
      req.file.buffer, mapping, campaignId, req.user.businessId
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/leads
router.get('/', auth, async (req, res, next) => {
  try {
    const result = await leadService.listLeads(req.user.businessId, {
      campaignId: req.query.campaignId,
      status:     req.query.status,
      sort:       req.query.sort,
      page:       parseInt(req.query.page) || 1,
      limit:      parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/leads/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user.businessId);
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
});

// PUT /api/leads/:id/status
router.put('/:id/status', auth, async (req, res, next) => {
  try {
    const lead = await leadService.updateLeadStatus(
      req.params.id, req.user.businessId, req.body.status
    );
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
});

// DELETE /api/leads/clear
router.delete('/clear', auth, async (req, res, next) => {
  try {
    const result = await leadService.clearLeads(req.user.businessId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
