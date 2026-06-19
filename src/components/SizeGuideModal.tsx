import { X, Ruler } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RING_SIZES = [
  { us: 4, uk: 'H', innerDiameter: 14.9, innerCircumference: 46.8 },
  { us: 4.5, uk: 'I', innerDiameter: 15.3, innerCircumference: 48.0 },
  { us: 5, uk: 'J 1/2', innerDiameter: 15.7, innerCircumference: 49.3 },
  { us: 5.5, uk: 'K 1/2', innerDiameter: 16.1, innerCircumference: 50.6 },
  { us: 6, uk: 'L 1/2', innerDiameter: 16.5, innerCircumference: 51.9 },
  { us: 6.5, uk: 'M 1/2', innerDiameter: 16.9, innerCircumference: 53.1 },
  { us: 7, uk: 'N 1/2', innerDiameter: 17.3, innerCircumference: 54.4 },
  { us: 7.5, uk: 'O 1/2', innerDiameter: 17.7, innerCircumference: 55.7 },
  { us: 8, uk: 'P 1/2', innerDiameter: 18.1, innerCircumference: 57.0 },
  { us: 8.5, uk: 'Q 1/2', innerDiameter: 18.5, innerCircumference: 58.3 },
  { us: 9, uk: 'R 1/2', innerDiameter: 18.9, innerCircumference: 59.5 },
  { us: 9.5, uk: 'S 1/2', innerDiameter: 19.4, innerCircumference: 60.8 },
  { us: 10, uk: 'T 1/2', innerDiameter: 19.8, innerCircumference: 62.1 },
  { us: 10.5, uk: 'U 1/2', innerDiameter: 20.2, innerCircumference: 63.4 },
  { us: 11, uk: 'V 1/2', innerDiameter: 20.6, innerCircumference: 64.6 },
  { us: 11.5, uk: 'W 1/2', innerDiameter: 21.0, innerCircumference: 65.9 },
  { us: 12, uk: 'Y', innerDiameter: 21.4, innerCircumference: 67.2 },
];

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="font-serif text-2xl text-[var(--color-ink)] flex items-center gap-2">
                <Ruler className="w-6 h-6 text-[var(--color-gold)]" />
                Ring Size Guide
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-10 flex-1 bg-[var(--color-paper)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* Method 1: Measure an existing ring */}
                <div className="space-y-6">
                  <div className="bg-white p-8 border border-black/5 shadow-sm">
                    <h3 className="font-bold uppercase tracking-widest text-sm mb-4 border-b border-gray-100 pb-2">Method 1: Measure an existing ring</h3>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      Select a ring that properly fits the intended finger. Measure the <strong className="text-black">inside diameter</strong> of the ring in millimeters.
                    </p>
                    <div className="relative w-40 h-40 mx-auto bg-gray-50 rounded-full flex items-center justify-center border-4 border-gray-200">
                       <div className="w-32 h-32 rounded-full border-2 border-dashed border-[var(--color-gold)] flex items-center justify-center">
                         <div className="w-full h-[2px] bg-gray-300 relative">
                           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-[var(--color-ink)] uppercase tracking-wider bg-gray-50 px-1">Diameter</span>
                           <div className="absolute left-0 -top-1 w-[2px] h-3 bg-gray-500"></div>
                           <div className="absolute right-0 -top-1 w-[2px] h-3 bg-gray-500"></div>
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Method 2: Measure your finger */}
                  <div className="bg-white p-8 border border-black/5 shadow-sm">
                    <h3 className="font-bold uppercase tracking-widest text-sm mb-4 border-b border-gray-100 pb-2">Method 2: Measure your finger</h3>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      Wrap a strip of paper or string around your finger. Mark where the ends meet and measure the distance with a ruler (<strong className="text-black">inside circumference</strong>).
                    </p>
                    <ul className="text-sm text-gray-500 space-y-2 list-disc list-inside">
                      <li>Measure when your fingers are warm.</li>
                      <li>If your knuckle is much larger than the base of your finger, measure both and choose a size in between.</li>
                    </ul>
                  </div>
                </div>

                {/* Sizing Chart */}
                <div className="bg-white border border-black/5 shadow-sm">
                  <h3 className="font-bold uppercase tracking-widest text-sm m-6 mb-2 border-b border-gray-100 pb-2">International Ring Size Chart</h3>
                  <div className="overflow-x-auto p-6 pt-0 max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase bg-gray-50 text-gray-600 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-3 font-semibold tracking-wider">US Size</th>
                          <th className="px-4 py-3 font-semibold tracking-wider">UK/AU Size</th>
                          <th className="px-4 py-3 font-semibold tracking-wider">Diameter (mm)</th>
                          <th className="px-4 py-3 font-semibold tracking-wider">Circumference (mm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 relative">
                        {RING_SIZES.map((size) => (
                          <tr key={size.us} className="hover:bg-[var(--color-gold)] hover:bg-opacity-5 transition-colors">
                            <td className="px-4 py-3 font-bold text-[var(--color-gold)]">{size.us}</td>
                            <td className="px-4 py-3 text-gray-600 font-semibold">{size.uk}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono">{size.innerDiameter}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono">{size.innerCircumference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="bg-gray-50 p-6 text-center border-t border-gray-200">
              <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                Need further assistance? <a href="#" className="text-[var(--color-gold)] underline hover:text-yellow-600 transition-colors">Contact our experts</a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
