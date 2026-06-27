import { Check, CheckCheck, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

function MessageStatus({ status }) {
  if (!status) return null;
  
  if (status === 'read') {
    return <CheckCheck size={13} className="text-[#34B7F1] flex-shrink-0" title="Read" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} title="Delivered" />;
  }
  if (status === 'failed') {
    return <AlertCircle size={13} className="flex-shrink-0" style={{ color: 'var(--danger)' }} title="Failed to deliver" />;
  }
  // queued, sent, sending
  return <Check size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} title="Sent" />;
}

/**
 * Chat bubble — 3 variants: agent / lead / human
 */
export function ChatBubble({ message }) {
  const { role, content, timestamp, waStatus } = message;

  if (role === 'agent') {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[80%] self-end">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Agent</span>
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-semibold"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            AI
          </div>
        </div>
        <div className="bubble-agent whitespace-pre-wrap">{content}</div>
        <div className="flex items-center gap-1 mt-0.5 pr-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatDateTime(timestamp)}
          </span>
          <MessageStatus status={waStatus} />
        </div>
      </div>
    );
  }

  if (role === 'human') {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[80%] self-end">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>You</span>
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Y
          </div>
        </div>
        <div className="bubble-human whitespace-pre-wrap">{content}</div>
        <div className="flex items-center gap-1 mt-0.5 pr-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatDateTime(timestamp)}
          </span>
          <MessageStatus status={waStatus} />
        </div>
      </div>
    );
  }

  // role === 'lead'
  return (
    <div className="flex flex-col items-start gap-1 max-w-[80%] self-start">
      <div className="bubble-lead whitespace-pre-wrap">{content}</div>
      <span className="text-[10px] pl-1" style={{ color: 'var(--text-muted)' }}>
        {formatDateTime(timestamp)}
      </span>
    </div>
  );
}

