const prisma = require('../config/db');
const ApiError = require('../utils/apiError');
const sseService = require('./sseService');
const twilioService = require('./twilioService');

/**
 * List conversations for a business
 */
async function listConversations(businessId, { page = 1, limit = 50 } = {}) {
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { businessId },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true, qualificationScore: true, intentSignals: true } },
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    }),
    prisma.conversation.count({ where: { businessId } }),
  ]);

  return {
    conversations: conversations.map(c => ({
      ...c,
      lastMessage: c.messages[0] || null,
      messages: undefined,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get messages for a conversation
 */
async function getMessages(conversationId, businessId) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    include: {
      lead: { select: { id: true, name: true, phone: true, status: true, qualificationScore: true, intentSignals: true } },
    },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'asc' },
  });

  return { conversation, messages };
}

/**
 * Human takeover — pause AI agent for this conversation
 */
async function takeoverConversation(conversationId, businessId) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isHumanActive: true, humanTookOverAt: new Date() },
  });

  sseService.push(businessId, 'human_takeover', { conversationId, leadId: conversation.leadId });
  return { takenOver: true };
}

/**
 * Release conversation back to AI agent
 */
async function releaseConversation(conversationId, businessId) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isHumanActive: false, humanTookOverAt: null },
  });

  sseService.push(businessId, 'human_released', { conversationId, leadId: conversation.leadId });
  return { released: true };
}

/**
 * Send a human message in a conversation
 */
async function sendHumanMessage(conversationId, businessId, content) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    include: { lead: true },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: 'human',
      content,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  sseService.push(businessId, 'message_sent', {
    conversationId,
    leadId:  conversation.leadId,
    message: content,
    role:    'human',
    leadName: conversation.lead.name,
  });

  // Send via Twilio
  const twilioResult = await twilioService.sendMessage(conversation.lead.phone, content);

  if (twilioResult && twilioResult.sid) {
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        waMessageId: twilioResult.sid,
        waStatus: twilioResult.status || 'sent',
      },
    });
    return updatedMessage;
  }

  return message;
}

module.exports = { listConversations, getMessages, takeoverConversation, releaseConversation, sendHumanMessage };
