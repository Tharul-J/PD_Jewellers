import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StyleQuizProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

const TOTAL_STEPS = 5;

const STEPS = [
  {
    key: 'category',
    label: `Step 1 of ${TOTAL_STEPS}`,
    question: 'What are you looking for?',
    options: ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Surprise Me!'],
  },
  {
    key: 'occasion',
    label: `Step 2 of ${TOTAL_STEPS}`,
    question: "What's the occasion?",
    options: ['Daily Wear', 'Wedding & Bridal', 'Gift for Someone', 'Special Occasion', 'Just Browsing'],
  },
  {
    key: 'karatage',
    label: `Step 3 of ${TOTAL_STEPS}`,
    question: 'Which karatage do you prefer?',
    options: ['18K', '22K', 'Any'],
  },
  {
    key: 'stones',
    label: `Step 4 of ${TOTAL_STEPS}`,
    question: 'Gemstones — yes or no?',
    options: ['With Stones', 'Without Stones', 'Any'],
  },
  {
    key: 'price',
    label: `Step 5 of ${TOTAL_STEPS}`,
    question: 'What is your comfort range?',
    options: ['Under Rs. 150K', 'Rs. 150K – 600K', 'Over Rs. 600K'],
  },
];

const CATEGORY_MAP: Record<string, string> = {
  'Rings': 'rings',
  'Necklaces': 'necklaces',
  'Earrings': 'earrings',
  'Bracelets': 'bracelets',
  'Pendants': 'pendants',
};

export function StyleQuiz({ isOpen, onClose, position = 'top' }: StyleQuizProps) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const positionClass = position === 'bottom'
    ? 'fixed bottom-24 right-4 md:right-6 z-50'
    : 'fixed top-24 right-4 md:right-6 lg:right-8 z-50';

  const handleAnswer = (value: string) => {
    const key = STEPS[step].key;
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Build URL params
      const params = new URLSearchParams();
      const cat = newAnswers.category;
      if (cat && cat !== 'Surprise Me!' && CATEGORY_MAP[cat]) {
        params.set('category', CATEGORY_MAP[cat]);
      }
      if (newAnswers.karatage && newAnswers.karatage !== 'Any') params.set('karatage', newAnswers.karatage);
      if (newAnswers.stones && newAnswers.stones !== 'Any') params.set('stones', newAnswers.stones);
      if (newAnswers.price) params.set('price', newAnswers.price);

      setDone(true);
      setTimeout(() => {
        navigate(`/collections?${params.toString()}`);
        onClose();
        setTimeout(() => { setStep(0); setAnswers({}); setDone(false); }, 400);
      }, 900);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setStep(0); setAnswers({}); setDone(false); }, 400);
  };

  const progress = ((step) / TOTAL_STEPS) * 100;

  return (
    <div className={positionClass}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="quiz-panel"
            initial={{ y: position === 'bottom' ? 20 : -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: position === 'bottom' ? 20 : -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-gray-100 w-[320px] overflow-hidden"
          >
            {/* Header */}
            <div className="btn-richbrown text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[var(--color-gold)]" />
                <span className="font-serif tracking-wide text-[17px]">Find Your Style</span>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1">
                <X size={17} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-gray-100">
              <motion.div
                className="h-full bg-[var(--color-gold)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>

            {/* Content */}
            <div className="p-5 bg-[var(--color-paper)] min-h-[200px]">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center mb-4">
                      <Check size={24} className="text-[var(--color-gold)]" />
                    </div>
                    <h4 className="font-serif text-lg text-[var(--color-ink)] mb-1">Perfect match found!</h4>
                    <p className="text-xs text-gray-400">Taking you to your curated collection…</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`step-${step}`}
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -24, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    {step > 0 && (
                      <button
                        onClick={() => setStep(step - 1)}
                        className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-400 hover:text-[var(--color-ink)] mb-3 transition-colors"
                      >
                        <ArrowLeft size={11} /> Back
                      </button>
                    )}
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] font-bold mb-1.5 block">
                      {STEPS[step].label}
                    </span>
                    <h4 className="font-serif text-[18px] mb-4 text-[var(--color-ink)] leading-snug">
                      {STEPS[step].question}
                    </h4>
                    <div className="space-y-2">
                      {STEPS[step].options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleAnswer(opt)}
                          className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-[var(--color-gold)] hover:shadow-sm transition-all text-gray-700 flex justify-between items-center group"
                        >
                          {opt}
                          <ArrowRight
                            size={13}
                            className="text-[var(--color-gold)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step dots */}
            {!done && (
              <div className="flex justify-center gap-1.5 py-3 bg-[var(--color-paper)] border-t border-gray-100">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < step ? 'w-4 h-1.5 bg-[var(--color-gold)]' :
                      i === step ? 'w-4 h-1.5 bg-[var(--color-gold)]' :
                      'w-1.5 h-1.5 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
