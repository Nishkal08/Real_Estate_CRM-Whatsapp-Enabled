const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const XLSX = require('xlsx');
const { normalizePhone, isValidIndianPhone } = require('../utils/phoneValidator');

/**
 * Upload leads from Excel buffer
 */
async function uploadLeads(fileBuffer, mapping, campaignId, businessId) {
  // Verify campaign belongs to business
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
  });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) throw ApiError.badRequest('Excel file is empty or has no data rows');

  console.log("MAPPING:", mapping);
  console.log("FIRST ROW RAW:", rows[0]);
  
  const leads = rows
    .map(row => {
      const rawPhone = row[mapping.phone];
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        console.log("FAILED NORMALIZE:", rawPhone, "Cleaned:", String(rawPhone).replace(/[\s\-().]/g, ''));
        return null;
      }

      return {
        name:         String(row[mapping.name] || 'Unknown'),
        phone,
        email:        mapping.email != null ? String(row[mapping.email] || '') : null,
        customFields: JSON.stringify(
          (mapping.custom || []).reduce((acc, { field, col }) => {
            acc[field] = row[col];
            return acc;
          }, {})
        ),
        campaignId,
        businessId,
        status: 'pending',
      };
    })
    .filter(Boolean);
  
  console.log(`Parsed ${leads.length} leads out of ${rows.length} rows`);

  // Deduplicate against existing
  const existing = await prisma.lead.findMany({
    where: { businessId, phone: { in: leads.map(l => l.phone) } },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map(l => l.phone));
  const newLeads = leads.filter(l => !existingPhones.has(l.phone));

  if (newLeads.length > 0) {
    await prisma.lead.createMany({ data: newLeads });
  }

  // Trigger one-time sandbox demo outreach asynchronously
  try {
    const { initiateSandboxDemoOutreach } = require('./campaignService');
    initiateSandboxDemoOutreach(campaignId, businessId).catch(err => {
      console.error('[Demo Outreach] Failed to execute sandbox demo outreach:', err.message);
    });
  } catch (err) {
    console.error('[Demo Outreach] Failed to load campaignService:', err);
  }

  return {
    total:      rows.length,
    valid:      leads.length,
    inserted:   newLeads.length,
    duplicates: leads.length - newLeads.length,
    invalid:    rows.length - leads.length,
  };
}

/**
 * List leads with filters + pagination
 */
async function listLeads(businessId, { campaignId, status, sort, page = 1, limit = 50 }) {
  const where = { businessId };
  if (campaignId) where.campaignId = campaignId;
  if (status)     where.status     = status;

  const orderBy = sort === 'score'
    ? { qualificationScore: 'desc' }
    : sort === 'name'
      ? { name: 'asc' }
      : { createdAt: 'desc' };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        campaign: { select: { id: true, name: true } },
        conversation: { select: { id: true, stage: true, isHumanActive: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const mappedLeads = leads.map(l => ({
    ...l,
    campaignName: l.campaign?.name || 'N/A',
  }));

  return { leads: mappedLeads, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get single lead by ID
 */
async function getLeadById(id, businessId) {
  const lead = await prisma.lead.findFirst({
    where: { id, businessId },
    include: {
      campaign: { select: { id: true, name: true } },
      conversation: { select: { id: true, stage: true, isHumanActive: true } },
    },
  });
  if (!lead) throw ApiError.notFound('Lead not found');
  
  return {
    ...lead,
    campaignName: lead.campaign?.name || 'N/A',
  };
}

/**
 * Update lead status
 */
async function updateLeadStatus(id, businessId, status) {
  const lead = await prisma.lead.findFirst({ where: { id, businessId } });
  if (!lead) throw ApiError.notFound('Lead not found');

  return prisma.lead.update({
    where: { id },
    data: { status },
  });
}

async function clearLeads(businessId) {
  const leads = await prisma.lead.findMany({
    where: { businessId },
    select: { id: true }
  });
  const leadIds = leads.map(l => l.id);

  if (leadIds.length > 0) {
    // 1. Delete FollowUps
    await prisma.followUp.deleteMany({
      where: { leadId: { in: leadIds } }
    });

    // 2. Delete Messages
    await prisma.message.deleteMany({
      where: { conversation: { leadId: { in: leadIds } } }
    });

    // 3. Delete Conversations
    await prisma.conversation.deleteMany({
      where: { leadId: { in: leadIds } }
    });

    // 4. Delete Leads
    await prisma.lead.deleteMany({
      where: { id: { in: leadIds } }
    });
  }

  // 5. Delete Appointments
  await prisma.appointment.deleteMany({
    where: { businessId }
  });

  return { cleared: true, count: leadIds.length };
}

module.exports = { uploadLeads, listLeads, getLeadById, updateLeadStatus, clearLeads };

