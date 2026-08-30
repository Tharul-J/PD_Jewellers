import { Layers } from 'lucide-react';
import { useOverlayGuard } from '../lib/pollGuard';

interface Props {
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DuplicateInquiryWarning({ itemName, onCancel, onConfirm }: Props) {
  useOverlayGuard(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 rounded-full p-3">
            <Layers className="text-amber-600 w-8 h-8" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Already in Your Inquiry
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This exact <span className="font-medium text-gray-700">{itemName}</span> configuration is already in your inquiry list. Add it again?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-amber-800 hover:bg-amber-900 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
