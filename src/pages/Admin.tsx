import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePricing, IMetalEntry, IStoneEntry, IUpgradeEntry } from '../context/PricingContext';
import { motion } from 'motion/react';
import { Users, Package, ShoppingCart, Activity, DollarSign, LayoutList, Pencil, Trash2, BookOpen, LogOut, Tag, ChevronDown, ChevronRight, Shield, Banknote, Star, Search, X, Mail, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NotificationBadge } from '../components/NotificationBadge';
import { useNotifications } from '../hooks/useNotifications';
import { formatExact } from '../lib/price';
import InquiryMessages from '../components/InquiryMessages';
import { mergeById, shouldPausePolling, useOverlayGuard, useResumeOnOverlayClose } from '../lib/pollGuard';

const DEFAULT_PRODUCT_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal'];
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Extend this list to add new 3D model categories without other code changes
const MODEL_CATEGORIES_DEFAULT = ['ring', 'pendant'];

// The inquiry pipeline is one-directional; each status offers only the actions
// that move it forward. Mirrors ALLOWED_TRANSITIONS on the server, which is the
// actual enforcement — this list just decides what the admin is offered.
interface StatusAction {
  status: string;
  label: string;
  intent: 'forward' | 'decline';
}

const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  pending: [
    { status: 'availability_confirmed', label: '✓ Confirm Availability', intent: 'forward' },
    { status: 'declined', label: '✗ Decline', intent: 'decline' },
  ],
  availability_confirmed: [],
  ordered: [{ status: 'crafting', label: '▶ Start Crafting', intent: 'forward' }],
  crafting: [{ status: 'ready', label: '✓ Mark Ready', intent: 'forward' }],
  ready: [{ status: 'completed', label: '✓ Complete', intent: 'forward' }],
  completed: [],
  declined: [],
};

interface StatusChangeModalProps {
  action: StatusAction;
  targetLabel: string;
  saving: boolean;
  error: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

/**
 * Module-level and named, so its identity never changes between renders.
 *
 * The note lives here rather than in the page: typing must not re-render the
 * inquiry table behind the modal. The component is mounted fresh each time the
 * modal opens, so the note starts empty without the caller resetting anything.
 */
function StatusChangeModal({ action, targetLabel, saving, error, onConfirm, onCancel }: StatusChangeModalProps) {
  const [note, setNote] = useState('');

  // Escape is handled on the document, so nothing here has to hold focus —
  // an element that grabs focus on render would fight the textarea.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [saving, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onCancel(); }}
      role="presentation"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" role="dialog" aria-modal="true">
        <h3 className="text-base font-semibold text-[var(--color-ink)] mb-1">
          Confirm: {action.label.replace(/^[✓✗▶]\s*/, '')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          This moves the inquiry to <span className="font-semibold">{targetLabel}</span> and notifies the customer.
        </p>

        <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
          Add a note for the customer (optional)
        </label>
        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. Your ring is polished and ready for collection."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400"
        />

        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={saving}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-40 ${
              action.intent === 'decline' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            id="confirm-status-change"
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One label/value line in the profile modal. Renders nothing for empty values. */
function ProfileRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-bold w-28 shrink-0 pt-0.5">
        {icon}{label}
      </span>
      <span className="text-sm text-[var(--color-ink)] break-words min-w-0 flex-1">{value}</span>
    </div>
  );
}

/**
 * A customer's name in any admin table, linked to their profile card.
 * Falls back to plain text when the row has no user reference (deleted account).
 */
function UserNameLink({ user: stub, onOpen }: { user?: any; onOpen: (stub: any) => void }) {
  const name = stub?.name || 'Unknown';
  if (!stub?._id) return <span className="text-gray-500">{name}</span>;
  return (
    <button
      type="button"
      // The inquiry row itself toggles expansion — a name click must not do both.
      onClick={e => { e.stopPropagation(); onOpen(stub); }}
      className="text-amber-700 hover:text-amber-900 hover:underline font-medium text-left transition-colors"
      title={`View ${name}'s profile`}
    >
      {name}
    </button>
  );
}

/**
 * Read-only profile card for a customer, opened from any admin table.
 * Mounted only while a user is selected, so the overlay guard is unconditional.
 */
function UserProfileModal({ usr, inquiryCount, onClose, onMessage }: { usr: any; inquiryCount: number; onClose: () => void; onMessage?: () => void }) {
  useOverlayGuard(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isAdmin = usr.role === 'administrator';
  const addr = usr.address || {};
  // The model splits the address across five optional sub-fields; join whatever is filled in.
  const streetLine = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
  const regionLine = [addr.zip, addr.country].filter(Boolean).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">User Profile</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col items-center gap-2 mb-5">
            {usr.profilePicture ? (
              <img
                src={usr.profilePicture}
                alt={usr.name}
                className="w-16 h-16 rounded-full object-cover border border-gray-100"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-gradient-to-br from-blue-500 to-blue-400'}`}>
                {usr.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <h4 className="text-lg font-serif text-[var(--color-ink)]">{usr.name || 'Unknown'}</h4>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {isAdmin ? <Shield size={10} /> : <Users size={10} />}{usr.role}
            </span>
          </div>

          <div className="space-y-0">
            <ProfileRow icon={<Mail size={11} />} label="Email" value={usr.email} />
            <ProfileRow icon={<Phone size={11} />} label="Phone" value={usr.phone} />
            <ProfileRow icon={<MapPin size={11} />} label="Address" value={streetLine} />
            <ProfileRow label="Region" value={regionLine} />
            <ProfileRow
              icon={<Calendar size={11} />}
              label="Joined"
              value={usr.createdAt ? new Date(usr.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
            />
            <ProfileRow icon={<MessageSquare size={11} />} label="Inquiries" value={String(inquiryCount)} />
            <ProfileRow label="Wishlist" value={Array.isArray(usr.wishlist) ? `${usr.wishlist.length} item${usr.wishlist.length === 1 ? '' : 's'}` : undefined} />
            <ProfileRow label="Saved Designs" value={Array.isArray(usr.savedConfigurations) ? String(usr.savedConfigurations.length) : undefined} />
          </div>

          {onMessage && (
            <button
              type="button"
              onClick={onMessage}
              className="w-full mt-5 px-4 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              <Mail size={14} />
              Send Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComposePayload {
  subject: string;
  body: string;
  type: 'individual' | 'announcement';
  recipientIds: string[];
}

/**
 * Compose form for admin → customer messages.
 *
 * Module-level and named so its identity is stable, and it owns its own draft
 * state: typing a message must not re-render the message table behind it.
 */
function ComposeMessageModal({
  users, initialMode, initialRecipients, onSend, onClose,
}: {
  users: any[];
  initialMode: 'individual' | 'announcement';
  initialRecipients: string[];
  onSend: (payload: ComposePayload) => Promise<string | null>;
  onClose: () => void;
}) {
  useOverlayGuard(true);

  const [mode, setMode] = useState<'individual' | 'announcement'>(initialMode);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selected, setSelected] = useState<string[]>(initialRecipients);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sending, onClose]);

  const query = search.trim().toLowerCase();
  const matches = users.filter(u =>
    !query || u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)
  );

  const selectedUsers = selected
    .map(id => users.find(u => u._id === id))
    .filter(Boolean);

  const allShownSelected = matches.length > 0 && matches.every(u => selected.includes(u._id));

  const toggle = (id: string) => {
    // Individual mode is single-recipient: picking one replaces the selection.
    if (mode === 'individual') {
      setSelected(prev => (prev[0] === id ? [] : [id]));
      return;
    }
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const switchMode = (next: 'individual' | 'announcement') => {
    setMode(next);
    // Narrowing to individual can't keep a multi-selection; widening keeps it.
    if (next === 'individual') setSelected(prev => prev.slice(0, 1));
  };

  const canSend = subject.trim() && body.trim() && selected.length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const err = await onSend({ subject: subject.trim(), body: body.trim(), type: mode, recipientIds: selected });
    if (err) {
      setError(err);
      setSending(false);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget && !sending) onClose(); }}
      role="presentation"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">Compose Message</h3>
          <button onClick={onClose} disabled={sending} className="p-1 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {/* Mode */}
          <div className="flex gap-2">
            {(['individual', 'announcement'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  mode === m ? 'bg-[var(--color-gold)] text-[var(--color-ink)]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {m === 'individual' ? 'Individual' : 'Announcement'}
              </button>
            ))}
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
              To {mode === 'announcement' && <span className="text-gray-400 normal-case tracking-normal font-medium">— {selected.length} user{selected.length === 1 ? '' : 's'} selected</span>}
            </label>

            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full h-9 pl-9 pr-8 border border-gray-200 text-sm bg-white rounded-lg focus:outline-none focus:border-amber-400 text-gray-600"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" title="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            {mode === 'announcement' && matches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const shownIds = matches.map(u => u._id);
                  setSelected(prev => allShownSelected
                    ? prev.filter(id => !shownIds.includes(id))
                    : [...new Set([...prev, ...shownIds])]);
                }}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold mb-2"
              >
                {allShownSelected ? 'Clear' : 'Select All'}{query ? ` (${matches.length} matching)` : ''}
              </button>
            )}

            <div className="border border-gray-100 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
              {matches.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-4 text-center">
                  {users.length === 0 ? 'No customers to message.' : `No users match "${search}"`}
                </p>
              ) : matches.map(u => {
                const isSelected = selected.includes(u._id);
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => toggle(u._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`w-4 h-4 shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${mode === 'individual' ? 'rounded-full' : 'rounded'} ${isSelected ? 'bg-amber-500' : 'border border-gray-300'}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-[var(--color-ink)] truncate">{u.name}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{u.email}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedUsers.map((u: any) => (
                  <span key={u._id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] text-amber-800">
                    {u.name}
                    <button type="button" onClick={() => setSelected(prev => prev.filter(id => id !== u._id))} className="p-0.5 hover:text-amber-950" title="Remove">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={140}
              placeholder="e.g. Your ring is ready for collection"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Write your message…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            {sending ? 'Sending…' : `Send Message${selected.length > 1 ? ` (${selected.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sent message with its per-recipient delivery/read stats. */
function MessageDetailModal({ detail, loading, onClose }: { detail: any; loading: boolean; onClose: () => void }) {
  useOverlayGuard(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">Message Details</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" title="Close">
            <X size={16} />
          </button>
        </div>

        {loading || !detail ? (
          <div className="py-16 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
        ) : (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold ${
                detail.type === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {detail.type}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(detail.createdAt).toLocaleString()}
              </span>
            </div>

            <h4 className="text-lg font-serif text-[var(--color-ink)] mb-1">{detail.subject}</h4>
            <p className="text-xs text-gray-400 mb-4">From {detail.sender?.name || 'Unknown'}</p>

            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 mb-5">{detail.body}</p>

            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Recipients</p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-emerald-600">{detail.readCount}</span> of {detail.recipientCount} read
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
              {(detail.recipients ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-4 text-center">No recipients remain — the accounts may have been deleted.</p>
              ) : detail.recipients.map((r: any) => (
                <div key={r._id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--color-ink)] truncate">{r.name}</span>
                    <span className="block text-[11px] text-gray-400 truncate">{r.email}</span>
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                    r.read ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    {r.read ? 'Read' : 'Unread'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inquiries the shop has to act on, versus ones waiting on the customer or done
const NEEDS_ACTION = ['pending', 'ordered', 'crafting', 'ready'];

const INQUIRY_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'New' },
  { key: 'availability_confirmed', label: 'Awaiting Payment' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'crafting', label: 'Crafting' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
  { key: 'declined', label: 'Declined' },
];


type AdminTab = 'dashboard' | 'users' | 'products' | 'catalog' | 'categories' | 'orders' | 'sold' | 'reviews' | 'messages' | 'pricing' | 'blog';

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pricing, updatePricing } = usePricing();
  const { unreadByType, markReadByType } = useNotifications();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const tab = searchParams.get('tab');
    const validTabs: AdminTab[] = ['dashboard', 'users', 'products', 'catalog', 'categories', 'orders', 'sold', 'reviews', 'pricing', 'blog'];
    return (validTabs as string[]).includes(tab || '') ? (tab as AdminTab) : 'dashboard';
  });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [inquiryFilter, setInquiryFilter] = useState('all');
  const [soldList, setSoldList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingPricing, setSavingPricing] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', category: 'ring', basePrice: 1000 });
  const [file, setFile] = useState<File | null>(null);

  // Blog CRUD state
  const [blogList, setBlogList] = useState<any[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [deleteBlogId, setDeleteBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
  const [savingBlog, setSavingBlog] = useState(false);

  // Catalog CRUD state
  const [productsList, setProductsList] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: '', category: 'Rings', description: '', price: '', image: '', karatage: '', metalWeight: '', hasStones: false });
  const [productFile, setProductFile] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Categories state
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pd_product_categories');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const merged = [...DEFAULT_PRODUCT_CATEGORIES];
        parsed.forEach(c => { if (!merged.some(m => normalize(m) === normalize(c))) merged.push(c); });
        return merged;
      }
    } catch {}
    return DEFAULT_PRODUCT_CATEGORIES;
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  // 3D Model edit/delete state
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [showModelEditForm, setShowModelEditForm] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', category: 'ring', basePrice: 1000, glbUrl: '' });
  const [savingModel, setSavingModel] = useState(false);
  const [modelCategoryFilter, setModelCategoryFilter] = useState<string>('all');
  const [modelCategories, setModelCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pd_3dmodel_categories');
      return stored ? JSON.parse(stored) : MODEL_CATEGORIES_DEFAULT;
    } catch { return MODEL_CATEGORIES_DEFAULT; }
  });
  const [addingCatUpload, setAddingCatUpload] = useState(false);
  const [newCatInputUpload, setNewCatInputUpload] = useState('');
  const [addingCatEdit, setAddingCatEdit] = useState(false);
  const [newCatInputEdit, setNewCatInputEdit] = useState('');

  // Configurator kill switch state
  const [configuratorEnabled, setConfiguratorEnabled] = useState<boolean>(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Pricing save feedback
  const [pricingSaveStatus, setPricingSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inquiry expand + delete state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // User CRUD state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Messages state
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMode, setComposeMode] = useState<'individual' | 'announcement'>('individual');
  const [composePreselected, setComposePreselected] = useState<string[]>([]);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<any | null>(null);
  const [messageDetailLoading, setMessageDetailLoading] = useState(false);
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);

  // Pricing CRUD state
  const [metalsList,          setMetalsList]          = useState<IMetalEntry[]>([]);
  const [stonesList,          setStonesList]          = useState<IStoneEntry[]>([]);
  const [upgradesList,        setUpgradesList]        = useState<IUpgradeEntry[]>([]);
  const [newMetal,            setNewMetal]            = useState({ displayName: '', multiplier: 1 });
  const [newStone,            setNewStone]            = useState({ displayName: '', price: 0, color: '#cccccc' });
  const [showAddMetal,        setShowAddMetal]        = useState(false);
  const [showAddStone,        setShowAddStone]        = useState(false);

  useEffect(() => {
    if (pricing) {
      setMetalsList([...(pricing.metals ?? [])]);
      setStonesList([...(pricing.stones ?? [])]);
      setUpgradesList(
        (pricing.upgrades ?? []).length > 0
          ? [...pricing.upgrades]
          : [{ key: 'engraving', name: 'Engraving', price: pricing.engravingPrice ?? 5000 }]
      );
    }
  }, [pricing]);

  const genKey = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'administrator') {
      navigate('/profile');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'administrator') {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [usersRes, ordersRes, modelsRes, productsRes, soldRes] = await Promise.all([
            fetch('/api/users', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/orders', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/models'),
            fetch('/api/products', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/purchases', { headers: { Authorization: `Bearer ${user.token}` } }),
          ]);
          if (usersRes.ok) setUsersList(await usersRes.json());
          if (ordersRes.ok) setOrdersList(await ordersRes.json());
          if (modelsRes.ok) setModelsList(await modelsRes.json());
          if (productsRes.ok) setProductsList(await productsRes.json());
          if (soldRes.ok) setSoldList(await soldRes.json());
        } catch (error) {
          console.error('Error fetching admin data', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  // The inquiry list is fetched once with everything else, so a message sent
  // after the page loaded would never appear. Refresh it while the tab is open.
  const refreshOrders = useCallback(async () => {
    if (user?.role !== 'administrator') return;
    try {
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${user.token}` } });
      if (!res.ok) return;
      const fresh = await res.json();
      // Merge rather than replace: an expanded row being read, or a half-typed
      // reply in its thread, must survive a background refresh.
      setOrdersList(prev => mergeById(prev, fresh));
    } catch {
      // transient — the next tick tries again
    }
  }, [user]);

  // Background ticks stand down while a modal is open or a field has focus.
  const pollOrders = useCallback(() => {
    if (shouldPausePolling()) return;
    refreshOrders();
  }, [refreshOrders]);

  const resumeOrders = useCallback(() => {
    if (activeTab === 'orders') refreshOrders();
  }, [activeTab, refreshOrders]);
  useResumeOnOverlayClose(resumeOrders);

  useEffect(() => {
    if (activeTab !== 'orders' || user?.role !== 'administrator') return;

    refreshOrders(); // switching to the tab is an explicit request, never deferred
    let timer = setInterval(pollOrders, 15000);
    const onVisibility = () => {
      clearInterval(timer);
      if (!document.hidden) {
        pollOrders();
        timer = setInterval(pollOrders, 15000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeTab, user, refreshOrders, pollOrders]);

  // Notification deep links: /admin?tab=orders&id=<inquiryId>. The component
  // stays mounted between clicks, so this reacts to the params rather than
  // reading them once at mount.
  const deepLinkTab = searchParams.get('tab');
  const deepLinkId = searchParams.get('id');

  useEffect(() => {
    if (deepLinkTab) {
      const valid: AdminTab[] = ['dashboard', 'users', 'products', 'catalog', 'categories', 'orders', 'sold', 'reviews', 'messages', 'pricing', 'blog'];
      if (valid.includes(deepLinkTab as AdminTab)) setActiveTab(deepLinkTab as AdminTab);
    }
    if (deepLinkId) setExpandedOrderId(deepLinkId);
  }, [deepLinkTab, deepLinkId]);

  // Scroll to the linked row once it has actually rendered.
  useEffect(() => {
    if (!deepLinkId || activeTab !== 'orders' || ordersList.length === 0) return;
    const el = document.getElementById(`inquiry-row-${deepLinkId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void markInquiryRead(deepLinkId);
  }, [deepLinkId, activeTab, ordersList.length]);

  const inquiryNotifCount = unreadByType['new_inquiry'] ?? 0;
  const orderNotifCount = unreadByType['new_order'] ?? 0;
  const userNotifCount = unreadByType['new_user'] ?? 0;
  const reviewNotifCount = unreadByType['new_review'] ?? 0;

  useEffect(() => {
    if (activeTab === 'orders' && inquiryNotifCount > 0) markReadByType('new_inquiry');
    if (activeTab === 'sold' && orderNotifCount > 0) markReadByType('new_order');
    if (activeTab === 'users' && userNotifCount > 0) markReadByType('new_user');
    if (activeTab === 'reviews' && reviewNotifCount > 0) markReadByType('new_review');
  }, [activeTab]);

  useEffect(() => {
    fetch('/api/config/configurator-status')
      .then(r => r.json())
      .then(data => setConfiguratorEnabled(data.configuratorEnabled ?? true))
      .catch(() => {}); // silent — non-critical
  }, []);

  const handleConfiguratorToggle = async () => {
    if (!user) return;
    setToggleLoading(true);
    try {
      const res = await fetch('/api/config/configurator-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ enabled: !configuratorEnabled }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setConfiguratorEnabled(data.configuratorEnabled);
    } catch (err) {
      console.error('[admin] toggle error:', err);
      alert('Failed to update configurator status. Please try again.');
    } finally {
      setToggleLoading(false);
    }
  };

  // Status changes go through a confirmation modal so the admin can attach an
  // optional note, which reaches the customer in both the thread and the email.
  // The note itself lives inside StatusChangeModal — keeping it here would
  // re-render the whole inquiry table on every keystroke.
  const [statusPrompt, setStatusPrompt] = useState<{ orderId: string; action: StatusAction } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');

  // While the confirm modal is up, nothing in the background may refresh.
  useOverlayGuard(!!statusPrompt);

  const openStatusPrompt = (orderId: string, action: StatusAction) => {
    setStatusPrompt({ orderId, action });
    setStatusError('');
  };

  const handleConfirmStatusChange = async (note: string) => {
    if (!statusPrompt) return;
    setStatusSaving(true);
    setStatusError('');
    try {
      const res = await fetch(`/api/orders/${statusPrompt.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ status: statusPrompt.action.status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not update status');
      setOrdersList(prev => prev.map(o => (o._id === statusPrompt.orderId ? { ...o, ...data } : o)));
      setStatusPrompt(null);
    } catch (err: any) {
      setStatusError(err.message || 'Could not update status');
    } finally {
      setStatusSaving(false);
    }
  };

  // Opening an inquiry is what marks the customer's messages read for all admins.
  const markInquiryRead = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/messages/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrdersList(prev => prev.map(o => (o._id === orderId ? { ...o, ...data } : o)));
    } catch {
      // a failed read-receipt is not worth surfacing
    }
  };

  const handleToggleOrderExpanded = (orderId: string, isExpanded: boolean) => {
    setExpandedOrderId(isExpanded ? null : orderId);
    if (!isExpanded) void markInquiryRead(orderId);
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setOrdersList(prev => prev.filter(o => o._id !== id));
        setDeleteOrderId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch { alert('Delete failed'); }
  };

  const handleApproveReview = async (id: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        setReviewsList(prev => prev.map(r => r._id === id ? { ...r, approved } : r));
      }
    } catch { console.error('Error updating review'); }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setReviewsList(prev => prev.filter(r => r._id !== id));
        setDeleteReviewId(null);
      } else {
        alert('Delete failed');
      }
    } catch { alert('Delete failed'); }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u._id !== id));
        setDeleteUserId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch { alert('Delete failed'); }
  };

  const handleToggleUserRole = async (usr: any) => {
    const newRole = usr.role === 'administrator' ? 'customer' : 'administrator';
    setTogglingUserId(usr._id);
    try {
      const res = await fetch(`/api/users/${usr._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u._id === usr._id ? { ...u, role: newRole } : u));
      } else {
        const err = await res.json();
        alert(err.message || 'Update failed');
      }
    } catch { alert('Update failed'); }
    finally { setTogglingUserId(null); }
  };

  const commitNewCategory = (raw: string): string | null => {
    const cat = raw.trim().toLowerCase();
    if (!cat) return null;
    if (!modelCategories.some(c => c.toLowerCase() === cat)) {
      const updated = [...modelCategories, cat];
      setModelCategories(updated);
      localStorage.setItem('pd_3dmodel_categories', JSON.stringify(updated));
    }
    return cat;
  };

  const handleAddCatUpload = () => {
    const cat = commitNewCategory(newCatInputUpload);
    if (!cat) return;
    setNewModel(m => ({ ...m, category: cat }));
    setNewCatInputUpload('');
    setAddingCatUpload(false);
  };

  const handleAddCatEdit = () => {
    const cat = commitNewCategory(newCatInputEdit);
    if (!cat) return;
    setModelForm(f => ({ ...f, category: cat }));
    setNewCatInputEdit('');
    setAddingCatEdit(false);
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');
    setUploading(true);
    setUploadProgress(0);
    try {
      // Step 1: Upload file to Cloudinary via XHR so we can track progress.
      const uploadData = await new Promise<{ url: string }>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', ev => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Invalid server response')); }
          } else {
            try { const err = JSON.parse(xhr.responseText); reject(new Error(err.message || 'File upload to Cloudinary failed')); }
            catch { reject(new Error('File upload to Cloudinary failed')); }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('File upload failed — check your connection')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      // Step 2: Save model record to MongoDB (uploadProgress stays at 100 — button shows "Finalizing…").
      const modelRes = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ ...newModel, glbUrl: uploadData.url }),
      });
      const createdModel = await modelRes.json();
      if (!modelRes.ok) throw new Error(createdModel.message || 'Failed to save model record');

      setModelsList(prev => [...prev, createdModel]);
      setNewModel({ name: '', category: 'ring', basePrice: 1000 });
      setFile(null);
      alert('Model uploaded successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      alert(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setModelsList(prev => prev.filter(m => m._id !== id));
        setDeleteModelId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditModel = (model: any) => {
    setEditingModel(model);
    setModelForm({ name: model.name, category: model.category, basePrice: model.basePrice, glbUrl: model.glbUrl || '' });
    setShowModelEditForm(true);
    setDeleteModelId(null);
  };

  const handleCancelModelForm = () => {
    setEditingModel(null);
    setModelForm({ name: '', category: 'ring', basePrice: 1000, glbUrl: '' });
    setShowModelEditForm(false);
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !user) return;
    setSavingModel(true);
    try {
      const res = await fetch(`/api/models/${editingModel._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(modelForm),
      });
      if (!res.ok) {
        let message = `Server error (${res.status})`;
        try { const err = await res.json(); message = err.message || message; } catch {}
        throw new Error(message);
      }
      const updated = await res.json();
      setModelsList(prev => prev.map(m => m._id === editingModel._id ? updated : m));
      handleCancelModelForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingModel(false);
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/products', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setProductsList(await res.json());
    } catch {
      console.error('Failed to fetch catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch('/api/reviews', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setReviewsList((await res.json()).reviews ?? []);
    } catch {
      console.error('Failed to fetch reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setMessagesList((await res.json()).messages ?? []);
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  /** Resolves to an error string for the modal to show, or null on success. */
  const handleSendMessage = async (payload: ComposePayload): Promise<string | null> => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.message || 'Failed to send the message.';
      }
      setComposePreselected([]);
      await fetchMessages();
      return null;
    } catch {
      return 'Network error — the message was not sent.';
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) setMessagesList(prev => prev.filter(m => m._id !== id));
    } catch {
      console.error('Failed to delete message');
    } finally {
      setDeleteMessageId(null);
    }
  };

  const openMessageDetail = async (id: string) => {
    setViewingMessageId(id);
    setMessageDetail(null);
    setMessageDetailLoading(true);
    try {
      const res = await fetch(`/api/messages/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setMessageDetail(await res.json());
    } catch {
      console.error('Failed to fetch message detail');
    } finally {
      setMessageDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog' && user?.role === 'administrator') fetchCatalog();
    if (activeTab === 'blog' && user?.role === 'administrator') fetchBlog();
    if (activeTab === 'reviews' && user?.role === 'administrator') fetchReviews();
    if (activeTab === 'messages' && user?.role === 'administrator') fetchMessages();
  }, [activeTab]);

  const fetchBlog = async () => {
    setBlogLoading(true);
    try {
      const res = await fetch('/api/blog', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setBlogList(await res.json());
    } catch {
      console.error('Failed to fetch blog posts');
    } finally {
      setBlogLoading(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingBlog(true);
    try {
      const images = blogForm.imagesRaw.split('\n').map(u => u.trim()).filter(Boolean);
      const body = { ...blogForm, images, coverImage: blogForm.coverImage || images[0] || '' };
      const url = editingBlog ? `/api/blog/${editingBlog._id}` : '/api/blog';
      const method = editingBlog ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Server error (${res.status})`);
      }
      await fetchBlog();
      setShowBlogForm(false);
      setEditingBlog(null);
      setBlogForm({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setBlogList(prev => prev.filter(p => p._id !== id));
        setDeleteBlogId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditBlog = (post: any) => {
    setEditingBlog(post);
    setBlogForm({
      title: post.title,
      category: post.category || 'General',
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      imagesRaw: (post.images || []).join('\n'),
      content: post.content || '',
      author: post.author || 'PD Jewellers',
    });
    setShowBlogForm(true);
    setDeleteBlogId(null);
  };

  const handleCancelBlogForm = () => {
    setEditingBlog(null);
    setBlogForm({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
    setShowBlogForm(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProduct(true);
    try {
      let imageUrl = productForm.image;
      if (productFile) {
        const fd = new FormData();
        fd.append('file', productFile);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error('Image upload failed');
        const upData = await upRes.json();
        imageUrl = upData.url;
      }
      const body = { ...productForm, price: Number(productForm.price), image: imageUrl };
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let message = `Server error (${res.status})`;
        try { const err = await res.json(); message = err.message || message; } catch {}
        throw new Error(message);
      }
      await fetchCatalog();
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: '', category: 'Rings', description: '', price: '', image: '', karatage: '', metalWeight: '', hasStones: false });
      setProductFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setProductsList(prev => prev.filter(p => p._id !== id));
        setDeleteConfirmId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: String(product.price),
      image: product.image || '',
      karatage: product.karatage || '',
      metalWeight: product.metalWeight || '',
      hasStones: !!product.hasStones,
    });
    setProductFile(null);
    setShowProductForm(true);
    setDeleteConfirmId(null);
  };

  const handleCancelProductForm = () => {
    setEditingProduct(null);
    setProductForm({ name: '', category: 'Rings', description: '', price: '', image: '', karatage: '', metalWeight: '', hasStones: false });
    setProductFile(null);
    setShowProductForm(false);
  };

  // Category management
  const saveCategories = (cats: string[]) => {
    setAvailableCategories(cats);
    localStorage.setItem('pd_product_categories', JSON.stringify(cats));
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (availableCategories.some(c => normalize(c) === normalize(capitalized))) return;
    saveCategories([...availableCategories, capitalized]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (cat: string) => {
    if (DEFAULT_PRODUCT_CATEGORIES.includes(cat)) return;
    saveCategories(availableCategories.filter(c => c !== cat));
  };

  // Dashboard computed values
  const customerCount = usersList.filter(u => u.role !== 'administrator').length;

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending Review',
    availability_confirmed: 'Confirmed',
    ordered: 'Ordered',
    crafting: 'Crafting',
    ready: 'Ready',
    completed: 'Completed',
    declined: 'Declined',
  };

  // Counts come from the full list so every tab stays accurate while one is active.
  const inquiryTabCounts = INQUIRY_TABS.map(tab => ({
    ...tab,
    count: tab.key === 'all' ? ordersList.length : ordersList.filter(o => o.status === tab.key).length,
  }));

  const filteredOrders = inquiryFilter === 'all'
    ? ordersList
    : ordersList.filter(o => o.status === inquiryFilter);

  const statusBreakdown = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    key,
    label,
    count: ordersList.filter(o => o.status === key).length,
  }));

  const categoryCounts = availableCategories
    .map(cat => ({ name: cat, count: productsList.filter(p => p.category === cat).length }))
    .filter(c => c.count > 0);

  const recentInquiries = [...ordersList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentModels = [...modelsList]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);

  // Users filtered list
  const userSearchQuery = userSearch.trim().toLowerCase();
  const filteredUsers = usersList.filter(u =>
    !userSearchQuery ||
    u.name?.toLowerCase().includes(userSearchQuery) ||
    u.email?.toLowerCase().includes(userSearchQuery)
  );

  // Admins message customers, never each other — and never themselves.
  const messageableUsers = usersList.filter(u => u.role !== 'administrator');

  // Rows in other tabs carry only a populated {_id, name, email} stub, so the
  // full record is looked up from the users list fetched on mount.
  const openUserProfile = (stub: any) => {
    if (!stub) return;
    const full = usersList.find(u => u._id === (stub._id ?? stub));
    setViewingUser(full ?? (typeof stub === 'object' ? stub : null));
  };

  const inquiryCountFor = (userId?: string) =>
    userId ? ordersList.filter(o => (o.user?._id ?? o.user) === userId).length : 0;

  // Catalog filtered list
  const catalogSearchQuery = catalogSearch.trim().toLowerCase();
  const filteredProducts = productsList
    .filter(p => catalogFilter === 'all' || p.category === catalogFilter)
    .filter(p => !catalogSearchQuery ||
      p.name?.toLowerCase().includes(catalogSearchQuery) ||
      p.id?.toLowerCase().includes(catalogSearchQuery)
    );

  if (!user || user.role !== 'administrator') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 fixed top-[112px] md:top-[128px] left-0 h-[calc(100vh-112px)] md:h-[calc(100vh-128px)] hidden md:flex flex-col z-10">
        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
          <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6 px-4">Admin Panel</h2>
          <nav className="space-y-1 flex-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity, badge: 0 },
              { id: 'users', label: 'Users', icon: Users, badge: userNotifCount },
              { id: 'catalog', label: 'Catalog', icon: LayoutList, badge: 0 },
              { id: 'categories', label: 'Categories', icon: Tag, badge: 0 },
              { id: 'products', label: '3D Models', icon: Package, badge: 0 },
              { id: 'orders', label: 'Inquiries', icon: ShoppingCart, badge: inquiryNotifCount },
              { id: 'sold', label: 'Sold Items', icon: Banknote, badge: orderNotifCount },
              { id: 'reviews', label: 'Reviews', icon: Star, badge: reviewNotifCount },
              { id: 'messages', label: 'Messages', icon: Mail, badge: 0 },
              { id: 'pricing', label: 'Pricing', icon: DollarSign, badge: 0 },
              { id: 'blog', label: 'Blog', icon: BookOpen, badge: 0 },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'btn-richbrown text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--color-ink)]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
                <NotificationBadge count={item.badge} />
              </button>
            ))}
          </nav>
        </div>
        {/* Pinned sign-out */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-4">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 max-w-7xl mx-auto px-4 md:px-8 w-full pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif text-[var(--color-ink)] tracking-tight capitalize">
                {activeTab === 'orders' ? 'Inquiries'
                  : activeTab === 'sold' ? 'Sold Items'
                  : activeTab === 'reviews' ? 'Reviews'
                  : activeTab === 'products' ? '3D Models'
                  : activeTab === 'catalog' ? 'Catalog Products'
                  : activeTab === 'blog' ? 'Blog Posts'
                  : activeTab === 'categories' ? 'Product Categories'
                  : activeTab}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Manage your platform's {activeTab === 'orders' ? 'inquiries'
                  : activeTab === 'sold' ? 'sold items and crafting progress'
                  : activeTab === 'reviews' ? 'customer reviews'
                  : activeTab === 'products' ? '3D models'
                  : activeTab === 'catalog' ? 'product catalog'
                  : activeTab === 'blog' ? 'blog posts and articles'
                  : activeTab === 'categories' ? 'product categories'
                  : activeTab === 'messages' ? 'messages to customers'
                  : activeTab}.
              </p>
            </div>
            <div className="md:hidden relative">
              <select
                value={activeTab}
                onChange={e => setActiveTab(e.target.value as any)}
                className="appearance-none p-2 pr-9 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:border-[var(--color-gold)] cursor-pointer"
              >
                <option value="dashboard">Dashboard</option>
                <option value="users">Users</option>
                <option value="catalog">Catalog</option>
                <option value="categories">Categories</option>
                <option value="products">3D Models</option>
                <option value="orders">Inquiries</option>
                <option value="sold">Sold Items</option>
                <option value="reviews">Reviews</option>
                <option value="messages">Messages</option>
                <option value="pricing">Pricing</option>
                <option value="blog">Blog</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stat Cards — gold theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                  // Gradients sit in a deliberately narrow luminance band so the row
                  // scans as one family — distinct, but no card jumping out.
                  { label: 'Catalog Products', value: productsList.length, icon: LayoutList, sub: 'In collection', gradient: 'from-amber-600 via-yellow-500 to-amber-500', shadow: 'shadow-amber-400/50' },
                  { label: 'Customers', value: customerCount, icon: Users, sub: 'Registered', gradient: 'from-amber-800 via-yellow-700 to-amber-600', shadow: 'shadow-amber-700/30' },
                  { label: 'Inquiries', value: ordersList.length, icon: ShoppingCart, sub: 'Total received', gradient: 'from-amber-700 via-amber-600 to-amber-500', shadow: 'shadow-amber-400/50' },
                  { label: '3D Models', value: modelsList.length, icon: Package, sub: 'Uploaded', gradient: 'from-yellow-600 via-amber-500 to-yellow-500', shadow: 'shadow-yellow-400/50' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                    whileHover={{ y: -6, scale: 1.025 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow} hover:shadow-2xl transition-shadow duration-300`}
                  >
                    {/* Cursor-follow spotlight */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.35), transparent 60%)' }}
                    />
                    {/* Decorative rings */}
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125" />
                    <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-110" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-5">
                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/30">
                          <stat.icon size={20} className="text-white" />
                        </div>
                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest text-right leading-tight">{stat.sub}</span>
                      </div>
                      <h3 className="text-5xl font-serif font-bold text-white mb-1">
                        {loading ? <span className="text-white/50">—</span> : stat.value}
                      </h3>
                      <p className="text-white/75 text-xs font-semibold uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Inquiry Status Breakdown */}
                <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Inquiries by Status</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">{ordersList.length} total</span>
                  </div>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : ordersList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No inquiries yet</p>
                  ) : (
                    <div className="space-y-3.5">
                      {statusBreakdown.map(({ key, label, count }) => {
                        const pct = ordersList.length > 0 ? Math.round((count / ordersList.length) * 100) : 0;
                        const style: Record<string, { bar: string; badge: string; text: string }> = {
                          pending: { bar: 'from-orange-400 to-orange-300', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-600' },
                          availability_confirmed: { bar: 'from-blue-500 to-blue-400', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
                          crafting: { bar: 'from-amber-500 to-yellow-400', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
                          completed: { bar: 'from-green-500 to-emerald-400', badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
                          declined: { bar: 'from-red-500 to-rose-400', badge: 'bg-red-100 text-red-700', text: 'text-red-600' },
                          ordered: { bar: 'from-amber-600 to-amber-400', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
                        };
                        const s = style[key] || style.pending;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${s.bar} flex-shrink-0`} />
                                <span className="text-xs text-gray-600 font-medium">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{count}</span>
                                <span className="text-[10px] text-gray-400 font-mono w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Products by Category */}
                <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Products by Category</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">{productsList.length} total</span>
                  </div>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : categoryCounts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No products yet</p>
                  ) : (
                    <div className="space-y-3.5">
                      {categoryCounts.map(({ name, count }, idx) => {
                        const maxCount = Math.max(...categoryCounts.map(c => c.count), 1);
                        const pct = Math.round((count / maxCount) * 100);
                        const bars = ['from-amber-500 to-yellow-400','from-yellow-600 to-amber-400','from-amber-400 to-yellow-300','from-orange-400 to-amber-300'];
                        const bar = bars[idx % bars.length];
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-600 font-medium">{name}</span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">{count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Recent Inquiries */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Recent Inquiries</h2>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">View all →</button>
                  </div>
                  {loading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : recentInquiries.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">No inquiries yet</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentInquiries.map(order => (
                        <div key={order._id} className="px-6 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-mono font-bold text-amber-700">{order.inquiryRef || '—'}</p>
                            <p className="text-sm font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                            order.status === 'pending' ? 'bg-orange-100 text-orange-700'
                              : order.status === 'availability_confirmed' ? 'bg-blue-100 text-blue-700'
                              : order.status === 'crafting' ? 'bg-amber-100 text-amber-700'
                              : order.status === 'completed' ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3D Models list */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">3D Models</h2>
                    <button onClick={() => setActiveTab('products')} className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">Manage →</button>
                  </div>
                  {loading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : recentModels.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">No models uploaded yet</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentModels.map(model => (
                        <div key={model._id} className="px-6 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-purple-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--color-ink)]">{model.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{model.category}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">{formatExact(model.basePrice)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-serif text-[var(--color-ink)]">
                  All Users <span className="text-sm text-gray-500 font-sans font-medium ml-1">({filteredUsers.length}{userSearchQuery ? ` of ${usersList.length}` : ''})</span>
                </h2>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="h-9 pl-9 pr-8 border border-gray-200 text-sm bg-white rounded-lg focus:outline-none focus:border-amber-400 text-gray-600 w-64"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Name</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Email</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Role</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Joined</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {filteredUsers.map(usr => {
                        const isSelf = usr._id === user?._id;
                        const isAdmin = usr.role === 'administrator';
                        return (
                          <tr key={usr._id} className={`transition-colors ${deleteUserId === usr._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setViewingUser(usr)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-gradient-to-br from-blue-500 to-blue-400'}`}
                                  title={`View ${usr.name}'s profile`}
                                >
                                  {usr.name?.charAt(0).toUpperCase() || '?'}
                                </button>
                                <div>
                                  <UserNameLink user={usr} onOpen={setViewingUser} />
                                  {isSelf && <span className="block text-[9px] text-amber-600 font-bold uppercase tracking-wider">You</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-600 text-xs">{usr.email}</td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => !isSelf && handleToggleUserRole(usr)}
                                disabled={isSelf || togglingUserId === usr._id}
                                title={isSelf ? 'Cannot change your own role' : `Click to make ${isAdmin ? 'Customer' : 'Admin'}`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold transition-all ${
                                  isAdmin
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} disabled:opacity-50`}
                              >
                                {isAdmin ? <Shield size={10} /> : <Users size={10} />}
                                {togglingUserId === usr._id ? '…' : usr.role}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-gray-500 text-xs">{new Date(usr.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-6 text-right">
                              {deleteUserId === usr._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                                  <button onClick={() => handleDeleteUser(usr._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteUserId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => !isSelf && setDeleteUserId(usr._id)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                                  className={`p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      {userSearchQuery ? `No users match "${userSearch}"` : 'No users found.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 3D MODELS ── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Configurator Status Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">3D Configurator</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {configuratorEnabled
                      ? 'Visible to customers — custom designs are live'
                      : 'Hidden from customers — showing maintenance message'}
                  </p>
                </div>
                <button
                  onClick={handleConfiguratorToggle}
                  disabled={toggleLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    configuratorEnabled ? 'bg-amber-600' : 'bg-gray-300'
                  }`}
                  title={configuratorEnabled ? 'Click to disable configurator' : 'Click to enable configurator'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      configuratorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Edit Form */}
              {showModelEditForm && editingModel && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">Edit 3D Model</h2>
                    <button onClick={handleCancelModelForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateModel}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                        <input
                          type="text" required
                          value={modelForm.name}
                          onChange={e => setModelForm({ ...modelForm, name: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                        {addingCatEdit ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={newCatInputEdit}
                              onChange={e => setNewCatInputEdit(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); handleAddCatEdit(); }
                                if (e.key === 'Escape') { setAddingCatEdit(false); setNewCatInputEdit(''); }
                              }}
                              className="flex-1 p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                              placeholder="New category name"
                            />
                            <button type="button" onClick={handleAddCatEdit} className="px-3 py-1 btn-richbrown text-white text-xs rounded-sm">Add</button>
                            <button type="button" onClick={() => { setAddingCatEdit(false); setNewCatInputEdit(''); }} className="px-2 py-1 text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={modelForm.category}
                              onChange={e => e.target.value === '__new__' ? setAddingCatEdit(true) : setModelForm({ ...modelForm, category: e.target.value })}
                              className="w-full appearance-none p-2.5 pr-9 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              {modelCategories.map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                              ))}
                              <option value="__new__">+ Add New Category</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Base Price (LKR)</label>
                        <input
                          type="number" required min="0"
                          value={modelForm.basePrice}
                          onChange={e => setModelForm({ ...modelForm, basePrice: Number(e.target.value) })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">GLB File URL (optional override)</label>
                        <input
                          type="text"
                          value={modelForm.glbUrl}
                          onChange={e => setModelForm({ ...modelForm, glbUrl: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="Leave blank to keep existing file"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelModelForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingModel}
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {savingModel ? 'Saving…' : 'Update Model'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Upload Form */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-gray-100 pb-4 gap-3">
                  <h2 className="text-lg font-serif text-[var(--color-ink)]">3D Models & Inventory</h2>
                  <div className="flex gap-1">
                    {(['all', ...modelCategories]).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setModelCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs rounded capitalize font-semibold transition-colors ${modelCategoryFilter === cat ? 'bg-[var(--color-ink)] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {cat === 'all' ? 'All' : cat + 's'}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleUploadModel} className="mb-12 bg-gray-50 p-6 border border-gray-200 rounded-lg">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Upload New 3D Model</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                      <input
                        type="text" required
                        value={newModel.name}
                        onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                        className="w-full p-2 border border-gray-200 text-sm"
                        placeholder="e.g. Classic Wedding Band"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Category</label>
                      {addingCatUpload ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={newCatInputUpload}
                            onChange={e => setNewCatInputUpload(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddCatUpload(); }
                              if (e.key === 'Escape') { setAddingCatUpload(false); setNewCatInputUpload(''); }
                            }}
                            className="flex-1 p-2 border border-gray-200 text-sm"
                            placeholder="New category name"
                          />
                          <button type="button" onClick={handleAddCatUpload} className="px-3 py-1 btn-richbrown text-white text-xs rounded-sm">Add</button>
                          <button type="button" onClick={() => { setAddingCatUpload(false); setNewCatInputUpload(''); }} className="px-2 py-1 text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={newModel.category}
                            onChange={e => e.target.value === '__new__' ? setAddingCatUpload(true) : setNewModel({ ...newModel, category: e.target.value })}
                            className="w-full appearance-none p-2 pr-9 border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-amber-400"
                          >
                            {modelCategories.map(cat => (
                              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                            <option value="__new__">+ Add New Category</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Base Price (LKR)</label>
                      <input
                        type="number" required min="0"
                        value={newModel.basePrice}
                        onChange={e => setNewModel({ ...newModel, basePrice: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">GLB / GLTF File</label>
                      <input
                        type="file" accept=".glb,.gltf"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:btn-richbrown file:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                  {uploading && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Finalizing…'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="submit" disabled={uploading}
                    className="px-6 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50"
                  >
                    {uploading ? (uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Finalizing…') : 'Upload Model'}
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Model Name</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Category</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Base Price</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">GLB Link</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {modelsList.filter(m => modelCategoryFilter === 'all' || m.category === modelCategoryFilter).map(model => (
                        <tr key={model._id} className={`transition-colors ${deleteModelId === model._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          <td className="py-4 px-4 font-medium text-[var(--color-ink)]">{model.name}</td>
                          <td className="py-4 px-4 text-gray-600 capitalize">{model.category}</td>
                          <td className="py-4 px-4 text-gray-600">{formatExact(model.basePrice)}</td>
                          <td className="py-4 px-4 text-blue-500">
                            <a href={model.glbUrl} target="_blank" rel="noreferrer" className="hover:underline">View File</a>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {deleteModelId === model._id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                <button onClick={() => handleDeleteModel(model._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                <button onClick={() => setDeleteModelId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditModel(model)}
                                  className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => { setDeleteModelId(model._id); setShowModelEditForm(false); setEditingModel(null); }}
                                  className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {modelsList.filter(m => modelCategoryFilter === 'all' || m.category === modelCategoryFilter).length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No {modelCategoryFilter === 'all' ? '' : modelCategoryFilter + ' '}models found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CATALOG ── */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {showProductForm && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                    <button onClick={handleCancelProductForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleSaveProduct}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Product Name *</label>
                        <input
                          type="text" required
                          value={productForm.name}
                          onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 22K Classic Gold Ring"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Category *</label>
                        <div className="relative">
                          <select
                            value={productForm.category}
                            onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                            className="w-full appearance-none p-2.5 pr-9 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            {availableCategories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Price (LKR) *</label>
                        <input
                          type="number" required min="0"
                          value={productForm.price}
                          onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 155000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Product Image</label>
                        <input
                          type="file" accept=".jpg,.jpeg,.png,.webp"
                          onChange={e => {
                            setProductFile(e.target.files ? e.target.files[0] : null);
                            if (e.target.files?.[0]) setProductForm(f => ({ ...f, image: '' }));
                          }}
                          className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:btn-richbrown file:text-white cursor-pointer"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">or paste URL</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <input
                          type="url"
                          value={productForm.image}
                          onChange={e => {
                            setProductForm({ ...productForm, image: e.target.value });
                            if (e.target.value) setProductFile(null);
                          }}
                          className="w-full mt-2 p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="https://example.com/image.jpg"
                        />
                        {productForm.image && !productFile && (
                          <img src={productForm.image} alt="preview" className="mt-2 h-16 w-16 object-cover rounded border border-gray-100" onError={e => (e.currentTarget.style.display = 'none')} />
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Karatage / Metal</label>
                        <input
                          type="text"
                          value={productForm.karatage}
                          onChange={e => setProductForm({ ...productForm, karatage: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 22K Yellow Gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Metal Weight</label>
                        <input
                          type="text"
                          value={productForm.metalWeight}
                          onChange={e => setProductForm({ ...productForm, metalWeight: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 7.03g or Bespoke (4.50g - 14.50g average)"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none pb-1">
                          <input
                            type="checkbox"
                            checked={productForm.hasStones}
                            onChange={e => setProductForm({ ...productForm, hasStones: e.target.checked })}
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Set with gemstones</span>
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={productForm.description}
                          onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-none"
                          placeholder="Brief product description..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelProductForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingProduct}
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {savingProduct ? 'Saving…' : editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Products <span className="text-sm text-gray-500 font-sans font-medium ml-1">({filteredProducts.length}{(catalogFilter !== 'all' || catalogSearchQuery) ? ` of ${productsList.length}` : ''})</span>
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        placeholder="Search by name or SKU..."
                        className="h-9 pl-9 pr-8 border border-gray-200 text-sm bg-white rounded-lg focus:outline-none focus:border-amber-400 text-gray-600 w-52"
                      />
                      {catalogSearch && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Category filter — appearance-none so it matches the search
                        input rather than rendering the OS dropdown chrome. */}
                    <div className="relative">
                      <select
                        value={catalogFilter}
                        onChange={e => setCatalogFilter(e.target.value)}
                        className="h-9 appearance-none pl-3 pr-9 border border-gray-200 text-sm bg-white rounded-lg focus:outline-none focus:border-amber-400 text-gray-600 cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {availableCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </div>
                    {!showProductForm && (
                      <button
                        onClick={() => { handleCancelProductForm(); setShowProductForm(true); }}
                        className="h-9 px-4 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded-lg transition-colors"
                      >
                        + Add Product
                      </button>
                    )}
                  </div>
                </div>
                {catalogLoading ? (
                  <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 w-16">Image</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Name</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Category</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">SKU</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Price</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {filteredProducts.map(product => (
                          <tr key={product._id} className={`transition-colors ${deleteConfirmId === product._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 px-4">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded border border-gray-100" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-[var(--color-ink)] max-w-[180px] truncate">{product.name}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{product.category}</td>
                            <td className="py-3 px-4 font-mono text-[10px] text-gray-400">{product.id}</td>
                            <td className="py-3 px-4 font-semibold text-gray-700">{formatExact(product.price)}</td>
                            <td className="py-3 px-4 text-right">
                              {deleteConfirmId === product._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                  <button onClick={() => handleDeleteProduct(product._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditProduct(product)}
                                    className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => { setDeleteConfirmId(product._id); setShowProductForm(false); setEditingProduct(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProducts.length === 0 && !catalogLoading && (
                      <div className="text-center py-12 text-gray-500 text-sm">
                        {catalogSearchQuery
                          ? `No products match "${catalogSearch}"${catalogFilter !== 'all' ? ` in "${catalogFilter}"` : ''}`
                          : catalogFilter !== 'all' ? `No products in "${catalogFilter}"` : 'No products found.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-serif text-[var(--color-ink)] mb-1">Add New Category</h2>
                <p className="text-xs text-gray-400 mb-4">New categories appear in the Catalog product form immediately.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    placeholder="e.g. Anklets"
                    className="flex-1 p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-5 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Categories <span className="text-sm text-gray-400 font-sans font-normal ml-1">({availableCategories.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {availableCategories.map(cat => {
                    const isDefault = DEFAULT_PRODUCT_CATEGORIES.includes(cat);
                    const count = productsList.filter(p => p.category === cat).length;
                    return (
                      <div key={cat} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Tag size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-[var(--color-ink)]">{cat}</span>
                          {isDefault && (
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Default</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400">{count} product{count !== 1 ? 's' : ''}</span>
                          {!isDefault && (
                            <button
                              onClick={() => handleRemoveCategory(cat)}
                              className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Remove category"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── INQUIRIES ── */}
          {activeTab === 'orders' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              {/* Status filter tabs */}
              <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
                {inquiryTabCounts.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setInquiryFilter(tab.key); setExpandedOrderId(null); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                      inquiryFilter === tab.key
                        ? 'bg-[var(--color-gold)] text-[var(--color-ink)]'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                    id={`inquiry-tab-${tab.key}`}
                  >
                    {tab.label} <span className="font-normal">({tab.count})</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 w-8"></th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Inquiry Code</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Est. Price</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Date</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Status</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredOrders.map(order => {
                        const isExpanded = expandedOrderId === order._id;
                        const isPendingDelete = deleteOrderId === order._id;
                        const items: any[] = order.orderItems || [];
                        const statusStyle: Record<string, { pill: string }> = {
                          pending: { pill: 'bg-orange-100 text-orange-700 border border-orange-200' },
                          availability_confirmed: { pill: 'bg-blue-100 text-blue-700 border border-blue-200' },
                          ordered: { pill: 'bg-amber-100 text-amber-700 border border-amber-200' },
                          crafting: { pill: 'bg-amber-100 text-amber-700 border border-amber-200' },
                          ready: { pill: 'bg-teal-100 text-teal-700 border border-teal-200' },
                          completed: { pill: 'bg-green-100 text-green-700 border border-green-200' },
                          declined: { pill: 'bg-red-100 text-red-700 border border-red-200' },
                        };
                        const ss = statusStyle[order.status] || statusStyle.pending;
                        const actions = STATUS_ACTIONS[order.status] ?? [];
                        const unread = order.unreadCount ?? 0;
                        const needsAction = NEEDS_ACTION.includes(order.status);

                        // Row emphasis: gold left border where the shop owes an
                        // action, warm tint for brand-new inquiries.
                        const rowAccent = [
                          needsAction ? 'border-l-2 border-l-[var(--color-gold)]' : 'border-l-2 border-l-transparent',
                          order.status === 'pending' && !isPendingDelete && !isExpanded ? 'bg-amber-50/30' : '',
                        ].join(' ');

                        return (
                          // The key belongs on the element returned from map().
                          // On the inner <tr> it does nothing for reconciliation,
                          // so a reordered list would re-associate rows by index
                          // and destroy the expanded row's message draft.
                          <Fragment key={order._id}>
                            <tr
                              id={`inquiry-row-${order._id}`}
                              className={`transition-colors cursor-pointer ${isPendingDelete ? 'bg-red-50' : isExpanded ? 'bg-amber-50/40' : `${rowAccent} hover:bg-gray-50`} border-b border-gray-100`}
                              onClick={() => !isPendingDelete && handleToggleOrderExpanded(order._id, isExpanded)}
                            >
                              <td className="py-4 px-4 text-gray-400">
                                {isExpanded
                                  ? <ChevronDown size={14} className="text-amber-600" />
                                  : <ChevronRight size={14} />}
                              </td>
                              <td className="py-4 px-4 font-mono text-xs font-bold text-amber-700">
                                <span className="inline-flex items-center gap-2">
                                  {order.inquiryRef || 'INQ-PENDING'}
                                  {unread > 0 && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold)] shrink-0"
                                      title={`${unread} unread message${unread === 1 ? '' : 's'} from the customer`}
                                    />
                                  )}
                                </span>
                              </td>
                              <td className="py-4 px-4"><UserNameLink user={order.user} onOpen={openUserProfile} /></td>
                              <td className="py-4 px-4 font-semibold text-gray-700">{formatExact(order.totalPrice)}</td>
                              <td className="py-4 px-4 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                                {/* Buttons keep their text on one line; when the cell
                                    narrows they stack instead of wrapping mid-label. */}
                                <div className="flex items-start gap-2 flex-wrap max-[1200px]:flex-col">
                                  <span className={`inline-flex px-3 py-1.5 rounded-full text-[11px] font-bold ${ss.pill}`}>
                                    {STATUS_LABELS[order.status] ?? order.status}
                                  </span>

                                  {actions.map(action => (
                                    <button
                                      key={action.status}
                                      onClick={() => openStatusPrompt(order._id, action)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                                        action.intent === 'forward'
                                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                          : 'bg-transparent text-red-600 border-red-200 hover:bg-red-50'
                                      }`}
                                      id={`status-action-${order._id}-${action.status}`}
                                    >
                                      {action.label}
                                    </button>
                                  ))}

                                  {order.status === 'availability_confirmed' && (
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                      Awaiting Customer Payment
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                                {isPendingDelete ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                                    <button onClick={() => handleDeleteOrder(order._id)} className="px-2.5 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                    <button onClick={() => setDeleteOrderId(null)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setDeleteOrderId(order._id); setExpandedOrderId(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete inquiry"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-amber-50/20 border-b border-gray-100">
                                <td colSpan={7} className="px-8 py-4">
                                  {items.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No item details available.</p>
                                  ) : (
                                    <div className="mb-6">
                                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Requested Items</p>
                                      <div className="space-y-2">
                                        {items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex items-start gap-3 bg-white rounded border border-gray-100 p-3">
                                            {item.image && (
                                              <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded border border-gray-100 flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-[var(--color-ink)] truncate">{item.name}</p>
                                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                {item.quantity && <span className="text-xs text-gray-500">Qty: <span className="font-medium">{item.quantity}</span></span>}
                                                {item.options?.material && <span className="text-xs text-gray-500">Metal: <span className="font-medium">{item.options.material}</span></span>}
                                                {item.options?.gemstone && <span className="text-xs text-gray-500">Stone: <span className="font-medium">{item.options.gemstone}</span></span>}
                                                {item.options?.size && <span className="text-xs text-gray-500">Size: <span className="font-medium">{item.options.size}</span></span>}
                                                {item.options?.engraving && <span className="text-xs text-gray-500">Engraving: <span className="font-medium">"{item.options.engraving}"</span></span>}
                                                {item.options?.font && <span className="text-xs text-gray-500">Font: <span className="font-medium">{item.options.font}</span></span>}
                                                {item.category && <span className="text-xs text-gray-400 ml-auto">{item.category}</span>}
                                              </div>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 flex-shrink-0">{formatExact(item.price)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <InquiryMessages
                                    inquiryId={order._id}
                                    messages={order.messages || []}
                                    viewerRole="administrator"
                                    customerName={order.user?.name}
                                    token={user?.token}
                                    onUpdated={updated =>
                                      setOrdersList(prev => prev.map(o => (o._id === order._id ? { ...o, ...updated } : o)))
                                    }
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      {ordersList.length === 0 ? 'No inquiries found.' : 'No inquiries with this status.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SOLD ITEMS ── */}
          {activeTab === 'sold' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Order Date</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Inq. Ref</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Total</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Paid At</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {soldList.map(purchase => {
                        const items: any[] = purchase.items || [];
                        return (
                          <tr key={purchase._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-gray-500 text-xs">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-4"><UserNameLink user={purchase.user} onOpen={openUserProfile} /></td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => { setActiveTab('orders'); setExpandedOrderId(purchase.order); }}
                                className="text-amber-600 hover:underline text-xs font-mono font-bold"
                                title="View inquiry"
                              >
                                {purchase.inquiryRef}
                              </button>
                            </td>
                            <td className="py-4 px-4 font-semibold text-gray-700">
                              {formatExact(purchase.totalAmount)}
                              <p className="text-[10px] text-gray-400 font-normal mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                            </td>
                            <td className="py-4 px-4 text-gray-500 text-xs">{purchase.payment?.paidAt ? new Date(purchase.payment.paidAt).toLocaleDateString() : '—'}</td>
                            <td className="py-4 px-4">
                              <span className="px-3 py-1 text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 rounded-full">
                                Paid
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {soldList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No sold items yet.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── REVIEWS ── */}
          {activeTab === 'reviews' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              {reviewsLoading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Rating</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Review</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Date</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Status</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {reviewsList.map(review => {
                        const isPendingDelete = deleteReviewId === review._id;
                        return (
                          <tr key={review._id} className={`transition-colors border-b border-gray-100 ${isPendingDelete ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-4 px-4"><UserNameLink user={review.user} onOpen={openUserProfile} /></td>
                            <td className="py-4 px-4">
                              <div className="flex gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={13} fill={s <= review.rating ? 'currentColor' : 'none'} className={s <= review.rating ? '' : 'text-gray-300'} />
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-600 max-w-sm">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-gold-dark)] mb-0.5">
                                {review.product?.name || 'Shop Review'}
                              </p>
                              {review.title && <p className="font-medium text-[var(--color-ink)]">{review.title}</p>}
                              <p className="line-clamp-2">{review.text}</p>
                            </td>
                            <td className="py-4 px-4 text-gray-500 text-xs">{new Date(review.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${review.approved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {review.approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {isPendingDelete ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                                  <button onClick={() => handleDeleteReview(review._id)} className="px-2.5 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteReviewId(null)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  {review.approved ? (
                                    <button onClick={() => handleApproveReview(review._id, false)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">Reject</button>
                                  ) : (
                                    <button onClick={() => handleApproveReview(review._id, true)} className="px-2.5 py-1 text-xs bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors">Approve</button>
                                  )}
                                  <button
                                    onClick={() => setDeleteReviewId(review._id)}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete review"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {reviewsList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No reviews yet.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === 'messages' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-serif text-[var(--color-ink)]">
                  Sent Messages <span className="text-sm text-gray-500 font-sans font-medium ml-1">({messagesList.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => { setComposeMode('individual'); setComposePreselected([]); setShowComposeModal(true); }}
                  className="px-4 py-2 btn-richbrown text-white text-xs uppercase tracking-widest rounded-sm transition-colors flex items-center gap-2"
                >
                  <Mail size={14} />
                  Compose New Message
                </button>
              </div>

              {messagesLoading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Type</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Subject</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Recipients</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Read</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Sent</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {messagesList.map(msg => {
                        const isPendingDelete = deleteMessageId === msg._id;
                        const readPct = msg.recipientCount > 0
                          ? Math.round((msg.readCount / msg.recipientCount) * 100)
                          : 0;
                        return (
                          <tr
                            key={msg._id}
                            className={`border-b border-gray-100 transition-colors ${isPendingDelete ? 'bg-red-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                            onClick={() => !isPendingDelete && openMessageDetail(msg._id)}
                          >
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold ${
                                msg.type === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {msg.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 max-w-xs">
                              <p className="font-medium text-[var(--color-ink)] truncate">{msg.subject}</p>
                              <p className="text-xs text-gray-400 truncate">{msg.body}</p>
                            </td>
                            <td className="py-4 px-4 text-gray-600 text-xs">
                              {msg.recipientCount} user{msg.recipientCount === 1 ? '' : 's'}
                            </td>
                            <td className="py-4 px-4 text-xs">
                              <span className={`font-semibold ${readPct === 100 ? 'text-green-600' : 'text-gray-600'}`}>
                                {msg.readCount}/{msg.recipientCount}
                              </span>
                              <span className="text-gray-400 ml-1">({readPct}%)</span>
                            </td>
                            <td className="py-4 px-4 text-gray-500 text-xs">{new Date(msg.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                              {isPendingDelete ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                                  <button onClick={() => handleDeleteMessage(msg._id)} className="px-2.5 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteMessageId(null)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteMessageId(msg._id)}
                                  className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete message"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {messagesList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No messages sent yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PRICING ── */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">

              {/* Metal Multipliers card */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-2 h-5 bg-amber-400 rounded-full" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Metal Multipliers</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Applied as: Base Price × Multiplier</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {metalsList.map((m, i) => (
                    <div key={m.key} className="flex items-center gap-3 bg-gray-50 rounded-md px-3 py-2">
                      <span className="flex-1 text-sm text-gray-700 font-medium truncate min-w-0">{m.displayName}</span>
                      <span className="text-xs text-gray-400 shrink-0">×</span>
                      <input
                        type="number" step="0.01" min="0"
                        value={m.multiplier}
                        onChange={e => {
                          const updated = [...metalsList];
                          updated[i] = { ...m, multiplier: Number(e.target.value) };
                          setMetalsList(updated);
                        }}
                        className="w-20 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${m.displayName}"? This will remove it from pricing.`)) {
                            setMetalsList(metalsList.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Delete metal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {showAddMetal ? (
                  <div className="flex items-center gap-2 bg-amber-50 rounded-md p-3 border border-amber-200 flex-wrap">
                    <input
                      type="text" placeholder="Display name (e.g. 24K Pure Gold)"
                      value={newMetal.displayName}
                      onChange={e => setNewMetal({ ...newMetal, displayName: e.target.value })}
                      className="flex-1 min-w-[160px] p-2 border border-amber-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-gray-400 shrink-0">×</span>
                    <input
                      type="number" step="0.01" min="0" placeholder="Multiplier"
                      value={newMetal.multiplier || ''}
                      onChange={e => setNewMetal({ ...newMetal, multiplier: Number(e.target.value) })}
                      className="w-24 p-2 border border-amber-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMetal.displayName.trim()) return;
                        setMetalsList([...metalsList, { key: genKey(newMetal.displayName), displayName: newMetal.displayName.trim(), multiplier: newMetal.multiplier || 1 }]);
                        setNewMetal({ displayName: '', multiplier: 1 });
                        setShowAddMetal(false);
                      }}
                      className="px-3 py-2 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors shrink-0"
                    >Add</button>
                    <button type="button" onClick={() => { setShowAddMetal(false); setNewMetal({ displayName: '', multiplier: 1 }); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded text-sm">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddMetal(true)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 mt-1">
                    + Add New Metal
                  </button>
                )}
              </div>

              {/* Center Stone Prices card */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-2 h-5 bg-blue-400 rounded-full" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Center Stone Prices</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Price per stone in LKR — added on top of metal cost</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {stonesList.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
                      <input
                        type="color"
                        value={s.color || '#cccccc'}
                        onChange={e => {
                          const updated = [...stonesList];
                          updated[i] = { ...s, color: e.target.value };
                          setStonesList(updated);
                        }}
                        className="w-7 h-7 rounded cursor-pointer border border-gray-200 bg-white p-0.5 shrink-0"
                        title={`Stone colour — ${s.displayName}`}
                      />
                      <span className="flex-1 text-xs text-gray-700 font-medium truncate min-w-0">{s.displayName}</span>
                      <span className="text-xs text-gray-400 shrink-0">LKR</span>
                      <input
                        type="number" min="0"
                        value={s.price}
                        onChange={e => {
                          const updated = [...stonesList];
                          updated[i] = { ...s, price: Number(e.target.value) };
                          setStonesList(updated);
                        }}
                        className="w-24 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${s.displayName}"? This will remove it from pricing.`)) {
                            setStonesList(stonesList.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Delete stone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {showAddStone ? (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-md p-3 border border-blue-200 flex-wrap">
                    <input
                      type="color"
                      value={newStone.color}
                      onChange={e => setNewStone({ ...newStone, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-blue-200 bg-white p-0.5 shrink-0"
                      title="Stone colour"
                    />
                    <input
                      type="text" placeholder="Display name (e.g. Pink Ceylon Sapphire)"
                      value={newStone.displayName}
                      onChange={e => setNewStone({ ...newStone, displayName: e.target.value })}
                      className="flex-1 min-w-[160px] p-2 border border-blue-200 text-sm rounded bg-white focus:outline-none focus:border-blue-300"
                    />
                    <span className="text-xs text-gray-400 shrink-0">LKR</span>
                    <input
                      type="number" min="0" placeholder="Price"
                      value={newStone.price || ''}
                      onChange={e => setNewStone({ ...newStone, price: Number(e.target.value) })}
                      className="w-28 p-2 border border-blue-200 text-sm rounded bg-white focus:outline-none focus:border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStone.displayName.trim()) return;
                        setStonesList([...stonesList, { key: genKey(newStone.displayName), displayName: newStone.displayName.trim(), price: newStone.price || 0, color: newStone.color }]);
                        setNewStone({ displayName: '', price: 0, color: '#cccccc' });
                        setShowAddStone(false);
                      }}
                      className="px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors shrink-0"
                    >Add</button>
                    <button type="button" onClick={() => { setShowAddStone(false); setNewStone({ displayName: '', price: 0, color: '#cccccc' }); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded text-sm">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddStone(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-1">
                    + Add New Stone
                  </button>
                )}
              </div>

              {/* Other Upgrades card */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-2 h-5 bg-green-400 rounded-full" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Other Upgrades</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Optional add-ons in LKR — added on top of the piece price</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {upgradesList.map((u, i) => (
                    <div key={u.key || i} className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
                      <input
                        type="text" placeholder="Upgrade name"
                        value={u.name}
                        onChange={e => {
                          const updated = [...upgradesList];
                          updated[i] = { ...u, name: e.target.value };
                          setUpgradesList(updated);
                        }}
                        className="flex-1 min-w-0 p-2 border border-gray-200 text-xs rounded bg-white focus:outline-none focus:border-green-400"
                      />
                      <span className="text-xs text-gray-400 shrink-0">LKR</span>
                      <input
                        type="number" min="0"
                        value={u.price}
                        onChange={e => {
                          const updated = [...upgradesList];
                          updated[i] = { ...u, price: Number(e.target.value) };
                          setUpgradesList(updated);
                        }}
                        className="w-24 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-green-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${u.name || 'this upgrade'}"? This will remove it from pricing.`)) {
                            setUpgradesList(upgradesList.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Delete upgrade"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setUpgradesList([...upgradesList, { key: `upgrade_${Date.now()}_${upgradesList.length}`, name: '', price: 0 }])}
                  className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 mt-1"
                >
                  + Add New Upgrade
                </button>
              </div>

              {/* Save bar */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg px-6 py-4 flex items-center justify-between">
                {pricingSaveStatus === 'success' && (
                  <span className="text-xs text-green-600 font-semibold">Pricing saved successfully.</span>
                )}
                {pricingSaveStatus === 'error' && (
                  <span className="text-xs text-red-600 font-semibold">Failed to save — please try again.</span>
                )}
                {pricingSaveStatus === 'idle' && <span />}
                <button
                  type="button"
                  disabled={savingPricing}
                  onClick={async () => {
                    if (!user) return;
                    setSavingPricing(true);
                    setPricingSaveStatus('idle');
                    // Drop blank rows, and keep the flat engravingPrice (used by the
                    // configurator) in step with the Engraving upgrade.
                    const cleanUpgrades = upgradesList
                      .filter(u => u.name.trim())
                      .map(u => ({ ...u, name: u.name.trim() }));
                    const engraving = cleanUpgrades.find(
                      u => u.key === 'engraving' || /engrav/i.test(u.name)
                    );

                    const success = await updatePricing(
                      {
                        metals: metalsList,
                        stones: stonesList,
                        upgrades: cleanUpgrades,
                        engravingPrice: engraving?.price ?? pricing?.engravingPrice ?? 5000,
                      },
                      user.token
                    );
                    setPricingSaveStatus(success ? 'success' : 'error');
                    setSavingPricing(false);
                    if (success) setTimeout(() => setPricingSaveStatus('idle'), 3000);
                  }}
                  className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50"
                >
                  {savingPricing ? 'Saving...' : 'Save Pricing'}
                </button>
              </div>
            </div>
          )}

          {/* ── BLOG ── */}
          {activeTab === 'blog' && (
            <div className="space-y-6">
              {showBlogForm && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">{editingBlog ? 'Edit Article' : 'New Article'}</h2>
                    <button onClick={handleCancelBlogForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleSaveBlog}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Title *</label>
                        <input
                          type="text" required
                          value={blogForm.title}
                          onChange={e => setBlogForm({ ...blogForm, title: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. The Art of Gold Purity in Sri Lanka"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Category</label>
                        <div className="relative">
                          <select
                            value={blogForm.category}
                            onChange={e => setBlogForm({ ...blogForm, category: e.target.value })}
                            className="w-full appearance-none p-2.5 pr-9 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            {['General', 'Styling Tips', 'Engagement', 'Craftsmanship', 'Gold Guide', 'Gemstones', 'Bridal', 'Mens'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Author</label>
                        <input
                          type="text"
                          value={blogForm.author}
                          onChange={e => setBlogForm({ ...blogForm, author: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="PD Jewellers"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Excerpt</label>
                        <input
                          type="text"
                          value={blogForm.excerpt}
                          onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="One-line article summary shown on the blog card"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                          Images (one URL per line — first image becomes the cover)
                        </label>
                        <textarea
                          rows={3}
                          value={blogForm.imagesRaw}
                          onChange={e => setBlogForm({ ...blogForm, imagesRaw: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-none font-mono"
                          placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Content</label>
                        <p className="text-[10px] text-gray-400 mb-1">Use <strong>## Heading</strong> for sections, <strong>• Item</strong> for bullet points. Blank lines separate paragraphs.</p>
                        <textarea
                          rows={12}
                          value={blogForm.content}
                          onChange={e => setBlogForm({ ...blogForm, content: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-y font-mono"
                          placeholder={'Intro paragraph...\n\n## Section Heading\n\nBody text...\n\n• Bullet point 1\n• Bullet point 2'}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelBlogForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingBlog}
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {savingBlog ? 'Saving…' : editingBlog ? 'Update Article' : 'Publish Article'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Articles <span className="text-sm text-gray-400 font-sans font-normal ml-1">({blogList.length})</span>
                  </h2>
                  {!showBlogForm && (
                    <button
                      onClick={() => { handleCancelBlogForm(); setShowBlogForm(true); }}
                      className="px-4 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest font-bold rounded transition-colors"
                    >
                      + New Article
                    </button>
                  )}
                </div>
                {blogLoading ? (
                  <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 w-16">Cover</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Title</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Category</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Published</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {blogList.map(post => (
                          <tr key={post._id} className={`transition-colors ${deleteBlogId === post._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 px-4">
                              {post.coverImage ? (
                                <img src={post.coverImage} alt={post.title} className="w-12 h-12 object-cover rounded border border-gray-100" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-[var(--color-ink)] max-w-[220px] truncate">{post.title}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{post.category}</td>
                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {deleteBlogId === post._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                  <button onClick={() => handleDeleteBlog(post._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteBlogId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditBlog(post)}
                                    className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => { setDeleteBlogId(post._id); setShowBlogForm(false); setEditingBlog(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {blogList.length === 0 && !blogLoading && (
                      <div className="text-center py-12 text-gray-500 text-sm">No blog posts found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </main>

      {/* One page-level modal instance, driven by statusPrompt — never one per row. */}
      {statusPrompt && (
        <StatusChangeModal
          action={statusPrompt.action}
          targetLabel={STATUS_LABELS[statusPrompt.action.status] ?? statusPrompt.action.status}
          saving={statusSaving}
          error={statusError}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setStatusPrompt(null)}
        />
      )}

      {/* Opened from any tab that shows a customer name. */}
      {viewingUser && (
        <UserProfileModal
          usr={viewingUser}
          inquiryCount={inquiryCountFor(viewingUser._id)}
          onClose={() => setViewingUser(null)}
          onMessage={
            // Admins are not messageable recipients, so they get no button.
            viewingUser.role === 'administrator' ? undefined : () => {
              const id = viewingUser._id;
              setViewingUser(null);
              setComposeMode('individual');
              setComposePreselected([id]);
              setShowComposeModal(true);
            }
          }
        />
      )}

      {showComposeModal && (
        <ComposeMessageModal
          users={messageableUsers}
          initialMode={composeMode}
          initialRecipients={composePreselected}
          onSend={handleSendMessage}
          onClose={() => { setShowComposeModal(false); setComposePreselected([]); }}
        />
      )}

      {viewingMessageId && (
        <MessageDetailModal
          detail={messageDetail}
          loading={messageDetailLoading}
          onClose={() => { setViewingMessageId(null); setMessageDetail(null); }}
        />
      )}
    </div>
  );
}
