import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/translateService';
import { ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LanguageSelector = () => {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectLanguage = async (code: string) => {
    await setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef} id="global-language-selector-wrapper">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg"
      >
        <Globe size={14} className="text-primary animate-pulse" />
        <span className="flex items-center gap-1.5">
          <span>{selected.flag}</span>
          <span className="hidden sm:inline-block font-sans text-[10px] tracking-widest">{selected.name}</span>
        </span>
        <ChevronDown size={12} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl p-2.5 shadow-2xl z-[150] overflow-hidden"
          >
            <div className="text-[9px] text-white/30 uppercase font-black tracking-widest px-3 py-1.5 border-b border-white/5 mb-1.5 flex items-center justify-between">
              <span>Select Language</span>
              <span>10 Locales</span>
            </div>
            
            <div className="grid grid-cols-1 gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    onClick={() => selectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold leading-none rounded-xl transition-all cursor-pointer text-left ${
                      isActive 
                        ? 'bg-primary text-black' 
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm shrink-0">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </div>
                    {isActive && (
                      <span className="text-[8px] font-black uppercase tracking-wider bg-black/15 px-1.5 py-0.5 rounded-md text-black/70">
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
