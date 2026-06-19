import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StyleQuiz({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({
    occasion: '',
    material: '',
    price: ''
  });

  const handleAnswer = (key: string, value: string) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Navigate to collections with filters
      let category = 'All';
      if (newAnswers.occasion === 'Bridal & Wedding') category = 'Bridal Sets';
      else if (newAnswers.occasion === 'Everyday Wear') category = 'Rings';
      else if (newAnswers.occasion === 'Special Occasion') category = 'Necklaces';

      const searchParams = new URLSearchParams();
      if (category !== 'All') searchParams.set('category', category);
      searchParams.set('material', newAnswers.material);
      searchParams.set('price', newAnswers.price);

      navigate(`/collections?${searchParams.toString()}`);
      onClose();
      setTimeout(() => setStep(0), 300); // Reset after close animation
    }
  };

  return (
    <div className="fixed top-24 right-4 md:right-6 lg:right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="modal"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 w-[320px] overflow-hidden flex flex-col"
          >
             {/* Header */}
             <div className="bg-[var(--color-ink)] text-white px-5 py-4 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                     <Sparkles size={16} className="text-[var(--color-gold)]" />
                     <span className="font-serif tracking-wide text-lg">Find Your Style</span>
                 </div>
                 <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                     <X size={18} />
                 </button>
             </div>

             {/* Content */}
             <div className="p-6 bg-[var(--color-paper)]">
                {step === 0 && (
                   <motion.div key="s0" initial={{x:20, opacity:0}} animate={{x:0, opacity:1}}>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] font-bold mb-2 block">Step 1 of 3</span>
                      <h4 className="font-serif text-xl mb-5 text-[var(--color-ink)]">What are you shopping for today?</h4>
                      <div className="space-y-2">
                         {['Everyday Wear', 'Special Occasion', 'Bridal & Wedding'].map(opt => (
                            <button key={opt} onClick={() => handleAnswer('occasion', opt)} className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm hover:border-[var(--color-gold)] hover:shadow-sm transition-all text-gray-700">
                               {opt}
                            </button>
                         ))}
                      </div>
                   </motion.div>
                )}
                {step === 1 && (
                   <motion.div key="s1" initial={{x:20, opacity:0}} animate={{x:0, opacity:1}}>
                      <button onClick={() => setStep(0)} className="text-gray-400 mb-3 flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-ink)]"><ArrowLeft size={12}/> Back</button>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] font-bold mb-2 block">Step 2 of 3</span>
                      <h4 className="font-serif text-xl mb-5 text-[var(--color-ink)]">Which material matters most?</h4>
                      <div className="space-y-2">
                         {['Classic Gold (18K/22K)', 'White Gold / Platinum', 'Diamond Focused'].map(opt => (
                            <button key={opt} onClick={() => handleAnswer('material', opt)} className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm hover:border-[var(--color-gold)] hover:shadow-sm transition-all text-gray-700">
                               {opt}
                            </button>
                         ))}
                      </div>
                   </motion.div>
                )}
                {step === 2 && (
                   <motion.div key="s2" initial={{x:20, opacity:0}} animate={{x:0, opacity:1}}>
                      <button onClick={() => setStep(1)} className="text-gray-400 mb-3 flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-ink)]"><ArrowLeft size={12}/> Back</button>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] font-bold mb-2 block">Step 3 of 3</span>
                      <h4 className="font-serif text-xl mb-5 text-[var(--color-ink)]">What is your comfort range?</h4>
                      <div className="space-y-2">
                         {['Under LKR 150K', 'LKR 150K - 600K', 'Over LKR 600K'].map(opt => (
                            <button key={opt} onClick={() => handleAnswer('price', opt)} className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm hover:border-[var(--color-gold)] hover:shadow-sm transition-all flex justify-between items-center group text-gray-700">
                               {opt}
                               <ArrowRight size={14} className="text-[var(--color-gold)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </button>
                         ))}
                      </div>
                   </motion.div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

