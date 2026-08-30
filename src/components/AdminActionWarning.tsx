import { ShieldAlert } from 'lucide-react';
import { useOverlayGuard } from '../lib/pollGuard';

interface Props {
  onClose: () => void;
}

export default function AdminActionWarning({ onClose }: Props) {
  // Rendered only while it should be visible, so it is always an open overlay.
  useOverlayGuard(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 rounded-full p-3">
            <ShieldAlert className="text-amber-600 w-8 h-8" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Admin Account Detected
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This action is only available to customer accounts. Please sign in
          with a customer account to add items, submit inquiries, or make
          purchases.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
