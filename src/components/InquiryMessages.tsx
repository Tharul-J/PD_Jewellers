import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';

export interface InquiryMessage {
  _id?: string;
  sender?: string;
  senderRole: 'customer' | 'administrator';
  text: string;
  type?: 'message' | 'status_change';
  read?: boolean;
  createdAt?: string;
}

interface InquiryMessagesProps {
  inquiryId: string;
  messages: InquiryMessage[];
  /**
   * Whose screen this is. Controls which side is "mine" (right) — each person
   * sees their own messages on the right — and which side counts as unread.
   */
  viewerRole: 'customer' | 'administrator';
  /** The customer's name, used for their bubbles' avatar and label on both views. */
  customerName?: string;
  token?: string;
  /** Receives the updated order returned by the API. */
  onUpdated: (order: any) => void;
}

const SHOP_NAME = 'PD Jewellers';
const GOLD = '#B8860B';

const timestamp = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

/**
 * Status messages are stored as `Status changed to X` with an optional
 * `: note` suffix. Split on the first colon so the note can sit on its own
 * line — status labels themselves never contain one.
 */
const splitStatusText = (text: string): { headline: string; note: string } => {
  const idx = text.indexOf(': ');
  if (idx === -1) return { headline: text, note: '' };
  return { headline: text.slice(0, idx), note: text.slice(idx + 2) };
};

type StatusTone = 'positive' | 'negative' | 'progress' | 'muted';

/**
 * Keywords matched against the status label inside the headline. Checked in
 * order, so put the decisive words first — the server's labels are longer than
 * these fragments ("Ready for Collection", "Completed / Collection"), which is
 * why this matches on `includes` rather than equality.
 */
const TONE_KEYWORDS: { tone: StatusTone; keywords: string[] }[] = [
  { tone: 'negative', keywords: ['declined', 'slot full', 'cancelled', 'canceled'] },
  { tone: 'positive', keywords: ['availability confirmed', 'confirmed', 'completed', 'collection', 'ready'] },
  { tone: 'progress', keywords: ['ordered', 'order placed', 'crafting'] },
];

const TONE_STYLES: Record<StatusTone, { box: string; headline: string; note: string; icon: string; Icon: LucideIcon }> = {
  positive: {
    box: 'bg-emerald-50 border-emerald-200',
    headline: 'text-emerald-900',
    note: 'text-emerald-800',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  negative: {
    box: 'bg-rose-50 border-rose-200',
    headline: 'text-rose-900',
    note: 'text-rose-800',
    icon: 'text-rose-600',
    Icon: XCircle,
  },
  progress: {
    box: 'bg-amber-50 border-amber-200',
    headline: 'text-amber-900',
    note: 'text-amber-800',
    icon: 'text-amber-600',
    Icon: Clock,
  },
  muted: {
    box: 'bg-gray-50 border-gray-200',
    headline: 'text-gray-700',
    note: 'text-gray-600',
    icon: 'text-gray-400',
    Icon: Info,
  },
};

/**
 * Picks the pill's tone from the status label in `Status changed to X`.
 * Anything unrecognised (e.g. "Pending Review") stays neutral grey.
 */
const statusTone = (headline: string): StatusTone => {
  const label = headline.replace(/^status changed to\s*/i, '').toLowerCase();
  for (const { tone, keywords } of TONE_KEYWORDS) {
    if (keywords.some(k => label.includes(k))) return tone;
  }
  return 'muted';
};

export default function InquiryMessages({
  inquiryId,
  messages,
  viewerRole,
  customerName,
  token,
  onUpdated,
}: InquiryMessagesProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const otherRole = viewerRole === 'administrator' ? 'customer' : 'administrator';

  // A conversation reads from the bottom, so open on the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const displayName = (m: InquiryMessage) =>
    m.senderRole === 'administrator' ? SHOP_NAME : customerName || 'Customer';

  const roleLabel = (m: InquiryMessage) => {
    if (m.senderRole === viewerRole) return 'You';
    return m.senderRole === 'administrator' ? 'Admin' : 'Customer';
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${inquiryId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not send message');
      setText('');
      onUpdated(data);
    } catch (err: any) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Messages</p>

      <div ref={scrollRef} className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <MessageSquare size={28} strokeWidth={1} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No messages yet.</p>
            <p className="text-xs text-gray-400 mt-0.5">Start a conversation about this inquiry.</p>
          </div>
        )}

        {messages.map((m, idx) => {
          // A status change is the system speaking — centred, never a bubble.
          if (m.type === 'status_change') {
            const { headline, note } = splitStatusText(m.text);
            const tone = TONE_STYLES[statusTone(headline)];
            const ToneIcon = tone.Icon;
            return (
              <div key={m._id || idx} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <div className={`max-w-[80%] text-center border rounded-xl px-4 py-2.5 ${tone.box}`}>
                  <p className={`text-sm font-medium flex items-center justify-center gap-1.5 ${tone.headline}`}>
                    <ToneIcon size={14} className={`shrink-0 ${tone.icon}`} />
                    <span>{headline}</span>
                  </p>
                  {note && (
                    <p className={`text-sm mt-1 whitespace-pre-line break-words ${tone.note}`}>“{note}”</p>
                  )}
                  {m.createdAt && (
                    <p className={`text-xs mt-1 opacity-70 ${tone.note}`}>{timestamp(m.createdAt)}</p>
                  )}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            );
          }

          const isMine = m.senderRole === viewerRole;
          const isUnread = m.senderRole === otherRole && !m.read;
          const isAdminMessage = m.senderRole === 'administrator';
          const avatarName = isAdminMessage ? SHOP_NAME : customerName || 'Customer';

          return (
            <div
              key={m._id || idx}
              className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              {!isMine && <InitialsAvatar name={avatarName} size={28} color={isAdminMessage ? GOLD : undefined} />}

              <div
                // Asymmetric corner on the sender's side gives the bubble a tail,
                // so a chat message never reads as the centred status pill.
                className={`max-w-[70%] px-4 py-2.5 border shadow-sm rounded-2xl ${
                  isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
                }`}
                style={
                  isAdminMessage
                    ? { backgroundColor: 'rgba(184, 134, 11, 0.18)', borderColor: 'rgba(184, 134, 11, 0.40)' }
                    : { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }
                }
              >
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span
                    className="text-xs font-bold"
                    style={{ color: isAdminMessage ? GOLD : 'var(--color-ink)' }}
                  >
                    {displayName(m)}
                  </span>
                  <span className="text-[11px] text-gray-500">{roleLabel(m)}</span>
                  {isUnread && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: GOLD }}
                      title="Unread"
                    />
                  )}
                </div>

                <p className="text-base text-gray-800 whitespace-pre-line break-words leading-relaxed">
                  {m.text}
                </p>

                <p className="text-xs text-gray-500 mt-1 text-right">{timestamp(m.createdAt)}</p>
              </div>

              {isMine && <InitialsAvatar name={avatarName} size={28} color={isAdminMessage ? GOLD : undefined} />}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

      <div className="flex gap-2 items-start">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder="Write a message..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{ backgroundColor: GOLD }}
          className="shrink-0 text-white px-5 py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
        >
          <Send size={13} /> {sending ? 'Sending' : 'Send'}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        {text.length}/1000 · Enter to send, Shift+Enter for a new line
      </p>
    </div>
  );
}
