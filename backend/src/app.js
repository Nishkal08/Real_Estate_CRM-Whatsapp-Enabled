const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const errorHandler     = require('./middleware/errorHandler');
const { apiLimiter }   = require('./middleware/rateLimiter');

// Route modules
const authRoutes         = require('./routes/auth');
const campaignRoutes     = require('./routes/campaigns');
const leadRoutes         = require('./routes/leads');
const conversationRoutes = require('./routes/conversations');
const kbRoutes           = require('./routes/kb');
const analyticsRoutes    = require('./routes/analytics');
const bookingRoutes      = require('./routes/booking');
const eventsRoute        = require('./routes/events');
const contentRoutes      = require('./routes/content');
const whatsappWebhook    = require('./webhooks/whatsapp');

const app = express();

// Trust proxy header (X-Forwarded-For) in production (Render, Heroku, etc.)
app.set('trust proxy', 1);

// ─── Global middleware ───────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — read from ALLOWED_ORIGINS env var (comma-separated list of allowed origins).
// Default: localhost dev. In production, set ALLOWED_ORIGINS=https://your-frontend.com
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ───────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health') || req.path === '/events') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// ─── API routes ──────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/campaigns',     campaignRoutes);
app.use('/api/leads',         leadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/kb',            kbRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/booking',       bookingRoutes);
app.use('/api/events',        eventsRoute);
app.use('/api/content',       contentRoutes);

// ─── Webhooks (no auth, no rate limit) ───────────────────
app.use('/webhook/whatsapp',  whatsappWebhook);

// ─── Health check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/health/twilio — Validate Twilio credentials without sending a message
app.get('/api/health/twilio', async (req, res, next) => {
  try {
    if (!process.env.TWILIO_SSID || !process.env.TWILIO_AUTH) {
      return res.json({ success: true, status: 'unconfigured', message: 'Twilio credentials not set' });
    }
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SSID, process.env.TWILIO_AUTH);

    // Fetch account info — read-only, no message sent
    const account = await client.api.accounts(process.env.TWILIO_SSID).fetch();

    // Get last 3 messages to check error codes
    const recentMsgs = await client.messages.list({ limit: 3 });
    const lastMsg = recentMsgs[0] || null;
    const dailyLimitExceeded = recentMsgs.some(m => m.errorCode === 63038);

    // Verified numbers (sandbox enrolled)
    const callerIds = await client.outgoingCallerIds.list({ limit: 20 });
    const verifiedNumbers = callerIds.map(c => c.phoneNumber);

    res.json({
      success: true,
      status: account.status,           // 'active' | 'suspended' | 'closed'
      accountType: account.type,        // 'Trial' | 'Full'
      friendlyName: account.friendlyName,
      dailyLimitExceeded,
      dailyLimitError: dailyLimitExceeded
        ? 'Error 63038: Trial account daily limit (50 msgs/24h) exceeded. Wait or upgrade account.'
        : null,
      sandboxNumber: process.env.TWILIO_NUMBER || '+14155238886',
      verifiedNumbers,
      lastMessage: lastMsg ? {
        to: lastMsg.to,
        status: lastMsg.status,
        errorCode: lastMsg.errorCode,
        dateSent: lastMsg.dateSent,
      } : null,
    });
  } catch (err) {
    res.json({ success: false, status: 'error', message: err.message });
  }
});

// ─── 404 catch-all ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// ─── Global error handler ────────────────────────────────
app.use(errorHandler);

module.exports = app;
