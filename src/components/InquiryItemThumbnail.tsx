import { useState } from 'react';
import { Gem, ImageOff } from 'lucide-react';

interface InquiryItemThumbnailProps {
  image?: string;
  name: string;
  isCustomDesign?: boolean;
  className?: string;
}

// Configurator pieces have no catalog photo, and any stored URL (past orders,
// stale product records) can go dead — both used to render as raw alt text.
export function InquiryItemThumbnail({ image, name, isCustomDesign, className = 'w-16 h-16' }: InquiryItemThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (isCustomDesign) {
    return (
      <div className={`${className} bg-amber-50 border border-amber-100 rounded-lg flex-shrink-0 flex flex-col items-center justify-center text-center px-1`}>
        <Gem size={16} className="text-amber-400 mb-0.5" strokeWidth={1.5} />
        <span className="text-amber-700 text-[7px] uppercase tracking-wide font-bold leading-tight">Custom Design</span>
      </div>
    );
  }

  if (!image || failed) {
    return (
      <div className={`${className} bg-stone-50 border border-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center`}>
        <ImageOff size={18} className="text-stone-300" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`${className} bg-white border border-stone-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center`}>
      <img
        src={image}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover mix-blend-multiply"
      />
    </div>
  );
}
