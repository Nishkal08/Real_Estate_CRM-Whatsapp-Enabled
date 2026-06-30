const { Router } = require('express');
const authService = require('../services/authService');
const auth        = require('../middleware/auth');
const validate    = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

// POST /api/auth/register
router.post('/register', authLimiter, validate(['name', 'email', 'password']), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(['email', 'password']), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', validate(['refreshToken']), async (req, res, next) => {
  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.businessId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/auth/me
router.put('/me', auth, async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.businessId, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-demo
router.post('/reset-demo', auth, async (req, res, next) => {
  try {
    const result = await authService.resetDemoData(req.user.businessId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
