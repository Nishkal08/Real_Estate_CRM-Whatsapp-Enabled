import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { BookOpen, Upload, Trash2, Globe, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatFileSize, formatDate } from '@/utils/formatters';
import { toast } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import api from '@/services/api';

const DOC_ICONS = {
  pdf:  'PDF',
  docx: 'DOC',
  doc:  'DOC',
  txt:  'TXT',
  url:  'URL',
  jpg:  'IMG',
  jpeg: 'IMG',
  png:  'IMG',
  webp: 'IMG',
};

function UploadZone({ onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const onDrop = useCallback(async (files) => {
    if (!files.length) return;
    const file = files[0];
    setUploading(true);
    setStatusMsg('Uploading file…');

    const messages = [
      'Extracting content…',
      'Analyzing images with AI…',
      'Chunking document…',
      'Generating embeddings…',
      'Storing in knowledge base…',
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setStatusMsg(messages[msgIndex]);
    }, 3000);

    try {
      await onUpload(file);
      setStatusMsg('Done!');
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg('Upload failed.');
    } finally {
      clearInterval(msgInterval);
      setTimeout(() => {
        setUploading(false);
        setStatusMsg('');
      }, 800);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
        isDragActive && 'scale-[1.01]',
        uploading && 'pointer-events-none'
      )}
      style={{
        borderColor: isDragActive ? 'var(--accent)' : 'var(--border-subtle)',
        background: isDragActive ? 'var(--accent-light)' : 'var(--bg-surface)',
      }}
    >
      <input {...getInputProps()} />

      <div
        className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4', isDragActive && 'animate-drag-float')}
        style={{ background: 'var(--accent-light)' }}
      >
        {uploading ? (
          <RefreshCw size={20} style={{ color: 'var(--accent)', animation: 'spin 1.2s linear infinite' }} />
        ) : (
          <Upload size={20} style={{ color: 'var(--accent)' }} />
        )}
      </div>

      {uploading ? (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{statusMsg}</p>
          <div style={{ width: '12rem', height: '4px', borderRadius: '4px', background: 'var(--border-subtle)', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{
              width: '40%', height: '100%', borderRadius: '4px', background: 'var(--accent)',
              animation: 'kb-indeterminate 1.4s ease-in-out infinite',
            }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This may take a minute for large files…</p>
        </div>
      ) : isDragActive ? (
        <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Drop it here!</p>
      ) : (
        <>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Drop a PDF, Word doc, or Image
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            or click to browse · PDF, DOC, JPG, PNG, WEBP
          </p>
        </>
      )}

      <style>{`
        @keyframes kb-indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(250%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [kbId, setKbId] = useState(null);
  const [descriptionModalConfig, setDescriptionModalConfig] = useState(null);
  const [uploadDescription, setUploadDescription] = useState('');

  const fetchDocs = async (currentKbId) => {
    try {
      setLoading(true);
      const res = await api.get(`/kb/${currentKbId}/documents`);
      if (res.data.success) {
        const mapped = (res.data.data || []).map(doc => ({
          id:         doc.id,
          name:       doc.fileName,
          type:       doc.sourceType,
          chunks:     doc.chunkCount || 0,
          size:       0,
          uploadedAt: doc.embeddedAt,
        }));
        setDocs(mapped);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initKB = async () => {
      try {
        let kbsRes = await api.get('/kb');
        let kbs = kbsRes.data.success ? kbsRes.data.data : [];
        let mainKb = kbs[0];
        
        if (!mainKb) {
          const createRes = await api.post('/kb/create', { name: 'Main Knowledge Base' });
          if (createRes.data.success) mainKb = createRes.data.data;
        }

        if (mainKb) {
          setKbId(mainKb.id);
          fetchDocs(mainKb.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize KB", err);
        setLoading(false);
      }
    };
    initKB();
  }, []);

  const handleUpload = (file) => {
    return new Promise((resolve, reject) => {
      setDescriptionModalConfig({ file, resolve, reject });
    });
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setAddingUrl(true);
    try {
      const res = await api.post(`/kb/${kbId}/url`, { url: urlInput });
      if (res.data.success) {
        toast.success('URL scraped and embedded!');
        fetchDocs(kbId);
      }
    } catch (err) {
      toast.error('Failed to embed URL');
    } finally {
      setUrlInput('');
      setAddingUrl(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (kbId) {
        const res = await api.delete(`/kb/${kbId}/document/${id}`);
        if (res.data.success) {
          toast.success('Document removed from knowledge base');
          fetchDocs(kbId);
        }
      }
    } catch (err) {
      toast.error('Failed to remove document');
    } finally {
      setDeleteTarget(null);
    }
  };

  const totalChunks = docs.reduce((sum, d) => sum + d.chunks, 0);

  return (
    <PageWrapper>
      <div className="page-header">
        <div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {docs.length} documents · {totalChunks} embedded chunks · All AI agents read from here
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Upload */}
        <div className="space-y-4">
          <UploadZone onUpload={handleUpload} />

          {/* URL input */}
          <div className="card-no-hover space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Globe size={14} style={{ color: 'var(--accent)' }} />
              Add from URL
            </h3>
            <Input
              placeholder="https://yoursite.com/faq"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={addingUrl}
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
            >
              Scrape & Embed
            </Button>
          </div>

          {/* Stats */}
          <div className="card-no-hover space-y-3">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Embedding Stats</h3>
            {[
              { label: 'Documents', val: docs.length },
              { label: 'Total chunks', val: totalChunks },
              { label: 'Model', val: 'Mistral Embed' },
              { label: 'Storage', val: 'ChromaDB' },
            ].map(s => (
              <div key={s.label} className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Document list */}
        <div className="lg:col-span-2">
          <div className="card-no-hover !p-0 overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-md" style={{ color: 'var(--text-primary)' }}>Documents</h3>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-48 rounded" />
                      <div className="skeleton h-2.5 w-32 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : docs.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={20} />}
                title="No documents yet"
                description="Upload PDFs, Word docs, or add a URL to build your knowledge base."
              />
            ) : (
              <div>
                {docs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all group"
                    style={{
                      borderBottom: idx < docs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-light)' }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>
                        {DOC_ICONS[doc.type] || 'FILE'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {doc.chunks} chunks · {doc.type !== 'url' ? formatFileSize(doc.size) : 'URL'} · {formatDate(doc.uploadedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                      >
                        Ready
                      </span>
                      <button
                        className="btn-icon text-[var(--danger)]"
                        onClick={() => setDeleteTarget(doc)}
                        aria-label="Delete document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
        description={`Are you sure you want to remove "${deleteTarget?.name}" from the knowledge base? This will delete all embedded chunks.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteTarget?.id)}>Delete</Button>
          </>
        }
      />

      {/* Description Modal */}
      <Modal
        isOpen={!!descriptionModalConfig}
        onClose={() => {
          if (descriptionModalConfig) {
            descriptionModalConfig.reject(new Error("Cancelled"));
            setDescriptionModalConfig(null);
            setUploadDescription('');
          }
        }}
        title="Add Document Description"
        description={`Please provide a brief description of what this file ("${descriptionModalConfig?.file?.name}") tells about or contains to help the AI locate and share it.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              if (descriptionModalConfig) {
                descriptionModalConfig.reject(new Error("Cancelled"));
                setDescriptionModalConfig(null);
                setUploadDescription('');
              }
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={async () => {
              if (descriptionModalConfig) {
                const { file, resolve, reject } = descriptionModalConfig;
                const desc = uploadDescription;
                
                // Disappear immediately
                setDescriptionModalConfig(null);
                setUploadDescription('');
                
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('kb_id', kbId);
                  formData.append('description', desc);
                  const res = await api.post(`/kb/${kbId}/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  if (res.data.success) {
                    toast.success(`${file.name} uploaded successfully!`);
                    fetchDocs(kbId);
                    resolve();
                  } else {
                    reject(new Error("Failed"));
                  }
                } catch (err) {
                  toast.error('Failed to upload document');
                  reject(err);
                }
              }
            }}>
              Upload
            </Button>
          </>
        }
      >
        <div className="py-2">
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Description
          </label>
          <textarea
            placeholder="e.g. Levvel 7 bedroom interior design view showing master bed and balcony configurations."
            value={uploadDescription}
            onChange={e => setUploadDescription(e.target.value)}
            className="w-full rounded-lg p-2.5 text-sm outline-none transition-all resize-none h-24 border"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </Modal>
    </PageWrapper>
  );
}
