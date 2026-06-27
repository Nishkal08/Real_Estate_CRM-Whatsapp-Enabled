const prisma = require('../config/db');
const ApiError = require('../utils/apiError');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Create a new knowledge base
 */
async function createKB(businessId, name) {
  return prisma.knowledgeBase.create({
    data: { businessId, name },
  });
}

/**
 * List knowledge bases for a business
 */
async function listKBs(businessId) {
  return prisma.knowledgeBase.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { documents: true } },
      documents: { select: { id: true, fileName: true, sourceType: true, chunkCount: true, embeddedAt: true } },
    },
  });
}

/**
 * Upload a document to KB — saves metadata + calls AI service for embedding
 */
async function uploadDocument(kbId, businessId, file, description = '') {
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, businessId } });
  if (!kb) throw ApiError.notFound('Knowledge base not found');

  // Save document metadata
  const doc = await prisma.kbDocument.create({
    data: {
      kbId,
      fileName:   file.originalname,
      sourceType: getSourceType(file.originalname),
      fileUrl:    null,
    },
  });

  // Call AI service to embed (async, don't block)
  embedDocument(kbId, doc.id, file.buffer, file.originalname, description).catch(err => {
    console.error(`[KB] Failed to embed ${doc.id}:`, err.message);
  });

  return doc;
}

/**
 * Ingest a URL into KB
 */
async function ingestURL(kbId, businessId, url) {
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, businessId } });
  if (!kb) throw ApiError.notFound('Knowledge base not found');

  // Save document metadata
  const doc = await prisma.kbDocument.create({
    data: {
      kbId,
      fileName:   url,
      sourceType: 'url',
      fileUrl:    url,
    },
  });

  // Call AI service to embed
  try {
    const res = await fetch(`${AI_SERVICE_URL}/kb/ingest/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kb_id: kbId, url }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      const result = await res.json();
      await prisma.kbDocument.update({
        where: { id: doc.id },
        data: { chunkCount: result.chunk_count || 0, embeddedAt: new Date() },
      });
    }
  } catch (err) {
    console.warn('[KB] URL embedding failed:', err.message);
  }

  return doc;
}

/**
 * Get documents for a KB
 */
async function getDocuments(kbId, businessId) {
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, businessId } });
  if (!kb) throw ApiError.notFound('Knowledge base not found');

  return prisma.kbDocument.findMany({
    where: { kbId },
    orderBy: { embeddedAt: 'desc' },
  });
}

/**
 * Delete a document from KB
 */
async function deleteDocument(kbId, docId, businessId) {
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, businessId } });
  if (!kb) throw ApiError.notFound('Knowledge base not found');

  const doc = await prisma.kbDocument.findFirst({ where: { id: docId, kbId } });
  if (!doc) throw ApiError.notFound('Document not found');

  // Call AI service to remove from vector store
  try {
    const source = doc.sourceType === 'url' ? doc.fileUrl : doc.fileName;
    await fetch(`${AI_SERVICE_URL}/kb/${kbId}/document?source=${encodeURIComponent(source)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.warn('[KB] AI service unavailable for doc deletion:', err.message);
  }

  await prisma.kbDocument.delete({ where: { id: docId } });
  return { deleted: true };
}

// ── Helpers ─────────────────────────────────────────────

async function embedDocument(kbId, docId, buffer, fileName, description = '') {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), fileName);
    formData.append('kb_id', kbId);
    formData.append('source_label', fileName);
    if (description) {
      formData.append('description', description);
    }

    const res = await fetch(`${AI_SERVICE_URL}/kb/ingest/pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (res.ok) {
      const result = await res.json();
      await prisma.kbDocument.update({
        where: { id: docId },
        data: { chunkCount: result.chunk_count || 0, embeddedAt: new Date() },
      });
    }
  } catch (err) {
    console.warn('[KB] Embedding unavailable:', err.message);
  }
}

function getSourceType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['txt', 'md'].includes(ext)) return 'text';
  return 'other';
}

module.exports = { createKB, listKBs, uploadDocument, ingestURL, getDocuments, deleteDocument };

