import { useEffect, useRef, useState } from 'react';
import { FileDown, FileText, FileSpreadsheet } from 'lucide-react';

interface ExportDashboardButtonProps {
  onExportPdf: () => void | Promise<void>;
  onExportCsv: () => void;
}

export function ExportDashboardButton({ onExportPdf, onExportCsv }: ExportDashboardButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePdf = async () => {
    setOpen(false);
    setExporting(true);
    try {
      await onExportPdf();
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    setOpen(false);
    onExportCsv();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={exporting}
        className="flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        <FileDown size={14} />
        {exporting ? 'Exporting…' : 'Export'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-100 shadow-lg overflow-hidden z-20">
          <button
            type="button"
            onClick={handlePdf}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
          >
            <FileText size={14} /> Export as PDF
          </button>
          <button
            type="button"
            onClick={handleCsv}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left border-t border-gray-100"
          >
            <FileSpreadsheet size={14} /> Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
