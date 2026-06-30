const prisma = require('../config/db');
const ApiError = require('../utils/apiError');

/**
 * Create a new campaign
 */
async function createCampaign(businessId, data) {
  return prisma.campaign.create({
    data: {
      businessId,
      name: data.name,
      kbId: data.kbId || null,
      agentTone: data.agentTone || 'friendly',
      openingTemplate: data.openingTemplate || null,
      followupSchedule: JSON.stringify(data.followupSchedule || { day1: true, day3: true, day7: false }),
      sendWindowStart: data.sendWindowStart || '10:00',
      sendWindowEnd: data.sendWindowEnd || '19:00',
      language: data.language || 'en',
      status: 'draft',
    },
  });
}

/**
 * List campaigns for a business
 */
async function listCampaigns(businessId) {
  const campaigns = await prisma.campaign.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: {
      kb: { select: { id: true, name: true } },
    },
  });

  const campaignsWithStats = await Promise.all(campaigns.map(async c => {
    const [
      totalLeads,
      messagesSent,
      repliedLeads,
      qualified,
      converted
    ] = await Promise.all([
      prisma.lead.count({ where: { campaignId: c.id } }),
      prisma.message.count({ where: { role: 'agent', conversation: { lead: { campaignId: c.id } } } }),
      prisma.lead.count({
        where: {
          campaignId: c.id,
          conversation: {
            messages: {
              some: { role: 'lead' }
            }
          }
        }
      }),
      prisma.lead.count({ where: { campaignId: c.id, qualificationScore: { gte: 3 } } }),
      prisma.lead.count({ where: { campaignId: c.id, status: 'converted' } }),
    ]);

    const replyRate = totalLeads > 0 ? Math.round((repliedLeads / totalLeads) * 100) : 0;

    return {
      ...c,
      totalLeads,
      messagesSent,
      replyRate,
      qualified,
      converted,
      followupSchedule: safeParseJSON(c.followupSchedule),
    };
  }));

  return campaignsWithStats;
}

/**
 * Get single campaign with stats
 */
async function getCampaignById(id, businessId) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, businessId },
    include: {
      _count: { select: { leads: true } },
      kb: { select: { id: true, name: true } },
    },
  });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const [
    messagesSent,
    repliedLeads,
    qualified,
    converted,
    statusCounts
  ] = await Promise.all([
    prisma.message.count({ where: { role: 'agent', conversation: { lead: { campaignId: id } } } }),
    prisma.lead.count({
      where: {
        campaignId: id,
        conversation: {
          messages: {
            some: { role: 'lead' }
          }
        }
      }
    }),
    prisma.lead.count({ where: { campaignId: id, qualificationScore: { gte: 3 } } }),
    prisma.lead.count({ where: { campaignId: id, status: 'converted' } }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    }),
  ]);

  const totalLeads = campaign._count.leads;
  const replyRate = totalLeads > 0 ? Math.round((repliedLeads / totalLeads) * 100) : 0;

  return {
    ...campaign,
    totalLeads,
    messagesSent,
    replyRate,
    qualified,
    converted,
    followupSchedule: safeParseJSON(campaign.followupSchedule),
    statusBreakdown: statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {}),
    _count: undefined,
  };
}

/**
 * Update campaign
 */
async function updateCampaign(id, businessId, data) {
  const campaign = await prisma.campaign.findFirst({ where: { id, businessId } });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.kbId !== undefined) updateData.kbId = data.kbId;
  if (data.agentTone !== undefined) updateData.agentTone = data.agentTone;
  if (data.openingTemplate !== undefined) updateData.openingTemplate = data.openingTemplate;
  if (data.followupSchedule !== undefined) updateData.followupSchedule = JSON.stringify(data.followupSchedule);
  if (data.sendWindowStart !== undefined) updateData.sendWindowStart = data.sendWindowStart;
  if (data.sendWindowEnd !== undefined) updateData.sendWindowEnd = data.sendWindowEnd;
  if (data.language !== undefined) updateData.language = data.language;

  return prisma.campaign.update({ where: { id }, data: updateData });
}

/**
 * Launch campaign — set status to active, create conversations for pending leads
 */
async function launchCampaign(id, businessId) {
  const campaign = await prisma.campaign.findFirst({ where: { id, businessId } });
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (campaign.status === 'active') throw ApiError.badRequest('Campaign is already active');

  // Get pending leads without conversations
  const leads = await prisma.lead.findMany({
    where: { campaignId: id, status: 'pending', conversation: null },
  });

  // Create conversations for each lead
  for (const lead of leads) {
    await prisma.conversation.create({
      data: {
        leadId: lead.id,
        businessId,
        langraphThreadId: lead.phone,
        stage: 'opener',
      },
    });
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: 'active' },
  });

  return { launched: true, leadsQueued: leads.length };
}

/**
 * Pause campaign
 */
async function pauseCampaign(id, businessId) {
  const campaign = await prisma.campaign.findFirst({ where: { id, businessId } });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  await prisma.campaign.update({
    where: { id },
    data: { status: 'paused' },
  });

  return { paused: true };
}

/**
 * Delete campaign (soft — sets status to deleted)
 */
async function deleteCampaign(id, businessId) {
  const campaign = await prisma.campaign.findFirst({ where: { id, businessId } });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  await prisma.campaign.update({
    where: { id },
    data: { status: 'deleted' },
  });

  return { deleted: true };
}

async function initiateSandboxDemoOutreach(campaignId, businessId) {
  const twilioService = require('./twilioService');
  const redirectNumbersStr = process.env.SANDBOX_REDIRECT_NUMBERS || '';
  const redirectWhitelist = redirectNumbersStr
    .split(',')
    .map(num => num.trim())
    .filter(num => num.length > 0)
    .map(num => num.startsWith('+') ? num : '+' + num);

  if (redirectWhitelist.length === 0) {
    console.log('[Demo Outreach] No whitelist numbers configured. Skipping demo outreach.');
    return;
  }

  console.log(`[Demo Outreach] Starting outbound demo outreach to ${redirectWhitelist.length} numbers for campaign: ${campaignId}`);

  // Fetch campaign config
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
    include: { kb: true }
  });
  if (!campaign) {
    console.error('[Demo Outreach] Campaign not found');
    return;
  }

  const agentName = 'Pranjal';
  const agentTone = campaign.agentTone || 'friendly';
  const language = campaign.language || 'en';

  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  for (const phone of redirectWhitelist) {
    try {
      // 1. Check if Lead already exists for this phone in this campaign
      let lead = await prisma.lead.findFirst({
        where: { campaignId, businessId, phone }
      });

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            name: phone === '+918000334811' ? 'Nishkal Developer' : 'Tester Second',
            phone,
            email: phone === '+918000334811' ? 'developer@horizon.com' : 'second@tester.com',
            campaignId,
            businessId,
            status: 'nurturing',
            qualificationScore: 0,
            intentSignals: '[]'
          }
        });
        console.log(`[Demo Outreach] Created lead record for sandbox number: ${phone}`);
      }

      // 2. Check if a Conversation with this phone (langraphThreadId) already exists anywhere in the DB
      // Since langraphThreadId must be unique, we delete any conflicting conversation before starting a new campaign run.
      const conflictingConv = await prisma.conversation.findFirst({
        where: { langraphThreadId: phone }
      });
      if (conflictingConv) {
        console.log(`[Demo Outreach] Resolving constraint conflict. Deleting old conversation ${conflictingConv.id} for phone ${phone}`);
        // Delete messages
        await prisma.message.deleteMany({
          where: { conversationId: conflictingConv.id }
        });
        // Delete conversation
        await prisma.conversation.delete({
          where: { id: conflictingConv.id }
        });
        // Delete the old lead if it's not the newly matched one
        if (conflictingConv.leadId !== lead.id) {
          try {
            await prisma.lead.delete({
              where: { id: conflictingConv.leadId }
            });
          } catch (err) {
            console.warn(`[Demo Outreach] Could not delete old lead ${conflictingConv.leadId}:`, err.message);
          }
        }
      }

      // Check if Conversation exists for this lead
      let conversation = await prisma.conversation.findFirst({
        where: { leadId: lead.id, businessId }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            businessId,
            langraphThreadId: phone,
            stage: 'opener',
            isHumanActive: false
          }
        });
        console.log(`[Demo Outreach] Created conversation record for: ${lead.name}`);
      }

      // 3. Call AI Service to generate personalized opener
      const instruction = `Greet the lead ${lead.name} warmly on WhatsApp to initiate contact. Introduce yourself as Pranjal, senior sales consultant for Horizon Group. Inquire if they are looking for commercial or residential property. Keep it structured with emojis.`;

      const response = await fetch(`${AI_SERVICE_URL}/agent/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: phone,
          business_id: businessId,
          lead_id: lead.id,
          lead_name: lead.name,
          message: instruction,
          kb_id: campaign?.kbId || campaign?.kb?.id || 'main-kb',
          campaign_id: campaignId,
          campaign_config: { agent_name: agentName, agent_tone: agentTone, language }
        })
      });

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      const reply = result.reply;

      // 4. Send via Twilio Service
      const msgResult = await twilioService.sendMessage(phone, reply);

      // 5. Save message to database
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'agent',
          content: reply,
          waMessageId: msgResult.sid || 'demo_' + Date.now(),
          waStatus: 'sent',
          timestamp: new Date()
        }
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          stage: result.stage || 'nurturing'
        }
      });

      console.log(`[Demo Outreach] Sent outbound message to ${lead.name} (${phone})`);
    } catch (err) {
      console.error(`[Demo Outreach] Error sending to ${phone}:`, err.message);
    }
  }
}

function safeParseJSON(str) {
  try { return JSON.parse(str); } catch { return str; }
}

module.exports = {
  createCampaign, listCampaigns, getCampaignById,
  updateCampaign, launchCampaign, pauseCampaign, deleteCampaign,
  initiateSandboxDemoOutreach
};
