import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/translateService';
import { Globe, ToggleLeft, ToggleRight, Check, Languages } from 'lucide-react';
import { motion } from 'motion/react';

interface TranslationSettingsProps {
  isCelebrity?: boolean;
}

export const TranslationSettings = ({ isCelebrity = false }: TranslationSettingsProps) => {
  const {
    currentLanguage,
    setLanguage,
    autoTranslateIncoming,
    setAutoTranslateIncoming,
    autoTranslateOutgoing,
    setAutoTranslateOutgoing,
    t
  } = useLanguage();

  return (
    <div className="glass p-6 md:p-8 rounded-[2rem] border border-white/10 flex flex-col gap-6 relative overflow-hidden text-white" id="translation-settings-panel">
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none rounded-full" />
      
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/20 text-primary rounded-2xl">
          <Languages size={20} className="animate-pulse" />
        </div>
        <div>
          <h3 className="font-extrabold text-[15px] tracking-wider uppercase font-sans">{t('translation_settings')}</h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Configure Backstage translator</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Language selector dropdown */}
        <div className="space-y-2">
          <label className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t('pref_lang')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`py-3 px-3 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-black border-primary shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white hover:border-white/10'
                  }`}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span className="text-[10px] truncate max-w-full">{lang.name}</span>
                  {isActive && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-black text-primary rounded-full flex items-center justify-center p-0.5">
                      <Check size={8} strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Auto Translate Triggers */}
        <div className="pt-2 border-t border-white/5 space-y-4">
          {/* Incoming Messages Trigger */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
            <div className="text-left max-w-[75%]">
              <p className="text-xs font-black uppercase tracking-wide">{t('auto_translate_incoming')}</p>
              <p className="text-[10px] text-white/40 font-medium leading-relaxed mt-1">
                Translate foreign chats to {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.name || 'English'} natively as they arrive.
              </p>
            </div>
            <button
              onClick={() => setAutoTranslateIncoming(!autoTranslateIncoming)}
              className="text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {autoTranslateIncoming ? (
                <ToggleRight size={44} className="text-primary" strokeWidth={1.5} />
              ) : (
                <ToggleLeft size={44} className="text-white/20" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Outgoing Messages Trigger (Only if Celebrity) */}
          {isCelebrity && (
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
              <div className="text-left max-w-[75%]">
                <p className="text-xs font-black uppercase tracking-wide">{t('auto_translate_outgoing')}</p>
                <p className="text-[10px] text-white/40 font-medium leading-relaxed mt-1">
                  Draft outgoing text in the fan's estimated native writing system automatically prior to dispatching.
                </p>
              </div>
              <button
                onClick={() => setAutoTranslateOutgoing(!autoTranslateOutgoing)}
                className="text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {autoTranslateOutgoing ? (
                  <ToggleRight size={44} className="text-primary" strokeWidth={1.5} />
                ) : (
                  <ToggleLeft size={44} className="text-white/20" strokeWidth={1.5} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TranslationSettings;
