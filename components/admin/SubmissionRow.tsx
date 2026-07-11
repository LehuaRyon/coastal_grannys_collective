'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

interface Message {
  id: string;
  direction: string;
  body: string;
  createdAt: string;
}

interface SubmissionData {
  id: string;
  data: Record<string, string>;
  senderName: string | null;
  senderEmail: string;
  read: boolean;
  messages: Message[];
  createdAt: string;
}

export function SubmissionRow({ submission }: { submission: SubmissionData }) {
  const [expanded, setExpanded] = useState(false);
  const [read, setRead] = useState(submission.read);
  const [messages, setMessages] = useState(submission.messages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !read) {
      setRead(true);
      fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }).catch(() => {});
    }
  }

  async function handleReply() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/submissions/${submission.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft }),
      });
      if (!res.ok) throw new Error();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), direction: 'OUTBOUND', body: draft, createdAt: new Date().toISOString() },
      ]);
      setDraft('');
      showToast(`Reply sent to ${submission.senderEmail}`);
    } catch {
      showToast('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  const fieldEntries = Object.entries(submission.data).filter(([k]) => k !== 'email');
  const hasReply = messages.some((m) => m.direction === 'OUTBOUND');
  const hasNewInboundReply = !read && messages.some((m) => m.direction === 'INBOUND');

  return (
    <div className="px-6 py-4">
      <button onClick={toggleExpand} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          {!read && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
          <div>
            <p className="font-medium text-stone-900 text-sm">{submission.senderName || submission.senderEmail}</p>
            <p className="text-xs text-stone-400">{submission.senderEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          {hasNewInboundReply && <span className="text-amber-600 font-medium">New reply</span>}
          {hasReply && <span className="text-green-600 font-medium">Replied</span>}
          <span>
            {new Date(submission.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-stone-300">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pl-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-stone-50 rounded-lg p-4">
            {fieldEntries.map(([key, value]) => (
              <div key={key}>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{key}</p>
                <p className="text-stone-700 whitespace-pre-wrap">{String(value) || '—'}</p>
              </div>
            ))}
          </div>

          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-4 border ${
                    m.direction === 'INBOUND' ? 'bg-stone-50 border-stone-100' : 'bg-green-50 border-green-100'
                  }`}
                >
                  <p
                    className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                      m.direction === 'INBOUND' ? 'text-stone-500' : 'text-green-700'
                    }`}
                  >
                    {m.direction === 'INBOUND' ? submission.senderEmail : 'You'} ·{' '}
                    {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className={`text-sm whitespace-pre-wrap ${m.direction === 'INBOUND' ? 'text-stone-700' : 'text-green-800'}`}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Reply to ${submission.senderEmail}…`}
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
            <button
              onClick={handleReply}
              disabled={sending || !draft.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
