import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

export const LanguageSelector: React.FC = () => {
  const { lang, setLanguage, isLoaded } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div 
      className="fixed left-6 bottom-6 z-50" 
      ref={dropdownRef}
      id="floating-language-selector"
    >
      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 left-0 mb-2 w-52 rounded-2xl bg-slate-950/95 border border-white/10 p-2 shadow-2xl backdrop-blur-3xl overflow-hidden max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-2 text-[10px] font-black tracking-widest text-white/40 uppercase mb-1">
                {lang === 'ar' ? 'اختر اللغة' : 'Select Language'}
              </div>
              <div className="space-y-1">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-start transition-all ${
                      lang === option.code 
                        ? 'bg-primary/20 text-primary font-bold' 
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base leading-none">{option.flag}</span>
                      <span>{option.name}</span>
                    </div>
                    {lang === option.code && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-950/80 border border-white/10 text-white hover:border-primary/40 hover:bg-slate-900 transition-all duration-300 shadow-xl backdrop-blur-md"
        >
          <Globe size={16} className={`text-primary ${!isLoaded ? 'animate-spin' : ''}`} />
          <span className="text-base leading-none">{currentLangObj.flag}</span>
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">{currentLangObj.name}</span>
          {isOpen ? <ChevronDown size={14} className="text-white/50" /> : <ChevronUp size={14} className="text-white/50" />}
        </button>
      </div>
    </div>
  );
};
