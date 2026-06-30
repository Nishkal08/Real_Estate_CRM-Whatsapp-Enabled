const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateTokens, verifyRefresh } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

const SALT_ROUNDS = 10;

/**
 * Register a new business + owner account
 */
async function register({ name, email, password, businessName }) {
  const existing = await prisma.business.findUnique({ where: { ownerEmail: email } });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const business = await prisma.business.create({
    data: {
      name: businessName || name,
      ownerEmail: email,
      passwordHash,
    },
  });

  const tokens = generateTokens(business.id, business.id);

  return {
    user: {
      id:             business.id,
      name:           business.name,
      email:          business.ownerEmail,
      role:           'admin',
      avatarInitials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      businessId:     business.id,
      business: {
        id:   business.id,
        name: business.name,
        plan: business.plan,
      },
    },
    ...tokens,
  };
}

/**
 * Login with email + password
 */
async function login({ email, password }) {
  const business = await prisma.business.findUnique({ where: { ownerEmail: email } });
  if (!business) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, business.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const tokens = generateTokens(business.id, business.id);

  return {
    user: {
      id:             business.id,
      name:           business.name,
      email:          business.ownerEmail,
      role:           'admin',
      avatarInitials: business.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      businessId:     business.id,
      business: {
        id:   business.id,
        name: business.name,
        plan: business.plan,
      },
    },
    ...tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
async function refreshToken(token) {
  try {
    const payload = verifyRefresh(token);
    const tokens = generateTokens(payload.userId, payload.businessId);
    return tokens;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

/**
 * Get current user profile
 */
async function getProfile(businessId) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      _count: { select: { leads: true, campaigns: true } },
    },
  });

  if (!business) throw ApiError.notFound('Business not found');

  return {
    id:             business.id,
    name:           business.name,
    email:          business.ownerEmail,
    role:           'admin',
    avatarInitials: business.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    businessId:     business.id,
    business: {
      id:         business.id,
      name:       business.name,
      plan:       business.plan,
      waNumber:   business.waNumber,
      leadCount:  business._count.leads,
      campaignCount: business._count.campaigns,
    },
  };
}

/**
 * Update current user profile
 */
async function updateProfile(businessId, updates) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw ApiError.notFound('Business not found');

  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) {
    // Check if email already exists on a different business
    const existing = await prisma.business.findFirst({
      where: { ownerEmail: updates.email, id: { not: businessId } }
    });
    if (existing) throw ApiError.conflict('Email already in use');
    updateData.ownerEmail = updates.email;
  }

  const updatedBusiness = await prisma.business.update({
    where: { id: businessId },
    data: updateData,
    include: {
      _count: { select: { leads: true, campaigns: true } },
    },
  });

  return {
    id:             updatedBusiness.id,
    name:           updatedBusiness.name,
    email:          updatedBusiness.ownerEmail,
    role:           'admin',
    avatarInitials: updatedBusiness.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    businessId:     updatedBusiness.id,
    business: {
      id:         updatedBusiness.id,
      name:       updatedBusiness.name,
      plan:       updatedBusiness.plan,
      waNumber:   updatedBusiness.waNumber,
      leadCount:  updatedBusiness._count.leads,
      campaignCount: updatedBusiness._count.campaigns,
    },
  };
}

async function resetDemoData(businessId) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw ApiError.notFound('Business not found');
  if (business.ownerEmail !== 'demo@solarbright.in') {
    throw ApiError.forbidden('Only the demo user can reset demo data');
  }

  // 1. Gather and delete all dependecies
  const leads = await prisma.lead.findMany({ where: { businessId }, select: { id: true } });
  const leadIds = leads.map(l => l.id);

  if (leadIds.length > 0) {
    await prisma.followUp.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.message.deleteMany({ where: { conversation: { leadId: { in: leadIds } } } });
    await prisma.conversation.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }

  await prisma.appointment.deleteMany({ where: { businessId } });
  await prisma.kbDocument.deleteMany({ where: { kb: { businessId } } });
  await prisma.knowledgeBase.deleteMany({ where: { businessId } });
  await prisma.campaignAnalytics.deleteMany({ where: { campaign: { businessId } } });
  await prisma.campaign.deleteMany({ where: { businessId } });

  // 2. Re-seed default settings
  await prisma.business.update({
    where: { id: businessId },
    data: {
      name: 'SolarBright',
      plan: 'pro',
      availability: JSON.stringify({
        Monday: { start: '09:00', end: '18:00' },
        Tuesday: { start: '09:00', end: '18:00' },
        Wednesday: { start: '09:00', end: '18:00' },
        Thursday: { start: '09:00', end: '18:00' },
        Friday: { start: '09:00', end: '18:00' },
        Saturday: { start: '10:00', end: '16:00' },
        Sunday: null
      })
    }
  });

  // 3. Create default KB
  const kb = await prisma.knowledgeBase.create({
    data: {
      businessId,
      name: 'SolarBright Product KB'
    }
  });

  // 4. Create default Campaign
  const campaign = await prisma.campaign.create({
    data: {
      businessId,
      kbId: kb.id,
      name: 'SolarBright Campaign',
      status: 'draft',
      agentTone: 'friendly',
      language: 'en'
    }
  });

  // 5. Create default Leads
  await prisma.lead.create({
    data: {
      businessId,
      campaignId: campaign.id,
      name: 'Ramesh Patel',
      phone: '+918000334811',
      email: 'ramesh@patel.com',
      status: 'pending'
    }
  });

  await prisma.lead.create({
    data: {
      businessId,
      campaignId: campaign.id,
      name: 'Priya Sharma',
      phone: '+917041232198',
      email: 'priya@sharma.com',
      status: 'pending'
    }
  });

  return { reset: true };
}

module.exports = { register, login, refreshToken, getProfile, updateProfile, resetDemoData };

