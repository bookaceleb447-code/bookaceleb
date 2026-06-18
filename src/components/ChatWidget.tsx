import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, limit, setDoc, doc 
} from 'firebase/firestore';
import { 
  MessageSquare, Send, X, Image as ImageIcon, MinusCircle, Maximize2, 
  Languages, Copy, Globe, Eye, EyeOff, Loader2, Landmark 
} from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { triggerAutoReply } from '../lib/autoReply';
import { useLanguage } from '../context/LanguageContext';
import { translateText, detectLanguage, SUPPORTED_LANGUAGES, getLanguageFlag, getLanguageName } from '../lib/translateService';

export const ChatWidget = ({ targetId, targetName }: { targetId: string, targetName: string }) => {
  const { user } = useAuth();
  const { currentLanguage, autoTranslateIncoming, autoTranslateOutgoing, t } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [targetTyping, setTargetTyping] = useState(false);
  
  // Translation-specific states
  const [translationLoading, setTranslationLoading] = useState<Record<string, boolean>>({});
  const [localTranslationErrors, setLocalTranslationErrors] = useState<Record<string, string>>({});
  const [sendLanguage, setSendLanguage] = useState<string>('original');
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);
  const [showTranslatedState, setShowTranslatedState] = useState<Record<string, boolean>>({});
  const [isSendLangDropdownOpen, setIsSendLangDropdownOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const chatId = user ? [user.uid, targetId].sort().join('_') : '';

  // Trigger typing metadata updates in db
  const triggerTyping = async (isTyping: boolean) => {
    if (!chatId || !user) return;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        typing: {
          [user.uid]: isTyping
        }
      }, { merge: true });
    } catch (e) {
      console.warn('Typing sync ignored', e);
    }
  };

  useEffect(() => {
    if (!chatId || !isOpen) return;

    // 1. Listen to messages path
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      
      // Auto seen synchronization: If incoming message checks as unseen
      snap.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== user.uid && !data.seen) {
          try {
            await setDoc(docSnap.ref, { seen: true }, { merge: true });
          } catch (error) {
            console.warn('Seen state save caught', error);
          }
        }
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `chats/${chatId}/messages`);
    });

    // 2. Listen to typing metadata path
    const unsubMeta = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTargetTyping(!!data?.typing?.[targetId]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
    });

    return () => {
      unsub();
      unsubMeta();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, isOpen, targetId, user?.uid]);

  // Automated incoming translator
  useEffect(() => {
    if (!autoTranslateIncoming || !messages.length) return;
    messages.forEach(async (msg) => {
      if (msg.senderId !== user?.uid && msg.text && !msg.mediaUrl) {
        const hasTranslation = msg.translations?.[currentLanguage];
        const isError = localTranslationErrors[msg.id];
        const isLoading = translationLoading[msg.id];
        if (!hasTranslation && !isError && !isLoading) {
          await handleTranslateMessage(msg.id, msg.text, currentLanguage);
        }
      }
    });
  }, [messages, autoTranslateIncoming, currentLanguage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, targetTyping]);

  const handleTranslateMessage = async (msgId: string, text: string, targetLang: string) => {
    if (translationLoading[msgId]) return;
    try {
      setTranslationLoading(prev => ({ ...prev, [msgId]: true }));
      setLocalTranslationErrors(prev => ({ ...prev, [msgId]: '' }));
      
      // Call LibreTranslate API service
      const res = await translateText(text, targetLang);
      
      // Save translation in FireStore message document as cache
      await setDoc(doc(db, 'chats', chatId, 'messages', msgId), {
        translations: {
          [targetLang]: res.translatedText
        },
        sourceLanguage: res.sourceLanguage
      }, { merge: true });
      
      // Auto enable viewing translation
      setShowTranslatedState(prev => ({ ...prev, [msgId]: true }));
    } catch (e: any) {
      console.warn('Translation process reported issue:', e);
      setLocalTranslationErrors(prev => ({ ...prev, [msgId]: 'Translation unavailable. Please try again later.' }));
    } finally {
      setTranslationLoading(prev => ({ ...prev, [msgId]: false }));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user) return;

    const typedText = newMessage;
    setNewMessage('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    triggerTyping(false);

    let textToSend = typedText;
    let sourceLanguage = currentLanguage;
    let targetLanguage = sendLanguage;
    let translations: Record<string, string> = {};

    try {
      if (sendLanguage !== 'original' && sendLanguage !== currentLanguage) {
        // Translate message to selected send language first!
        const res = await translateText(typedText, sendLanguage);
        textToSend = res.translatedText;
        sourceLanguage = res.sourceLanguage;
        translations[sendLanguage] = textToSend;
        translations[currentLanguage] = typedText;
      } else {
        // Detect native text layout source system
        sourceLanguage = await detectLanguage(typedText);
      }
    } catch (error) {
      console.warn("Pre-send translator warning:", error);
    }

    await addDoc(collection(db, `chats/${chatId}/messages`), {
      senderId: user.uid,
      text: textToSend,
      originalText: typedText,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      translations: translations,
      timestamp: serverTimestamp(),
      seen: false
    });
    
    // Update chat meta
    await setDoc(doc(db, 'chats', chatId), {
      lastMessage: textToSend,
      lastTimestamp: serverTimestamp(),
      participants: [user.uid, targetId]
    }, { merge: true });

    // Trigger auto reply
    triggerAutoReply(targetId, user.uid, chatId).catch(err => {
      console.warn("Auto-reply trigger error:", err);
    });
  };

  const handleInputChange = (val: string) => {
    setNewMessage(val);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    triggerTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      triggerTyping(false);
    }, 2000);
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: user.uid,
        mediaUrl: url,
        timestamp: serverTimestamp(),
        seen: false
      });

      // Update chat meta
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: "Sent an image",
        lastTimestamp: serverTimestamp(),
        participants: [user.uid, targetId]
      }, { merge: true });

      // Trigger auto reply
      triggerAutoReply(targetId, user.uid, chatId).catch(err => {
        console.warn("Auto-reply trigger error:", err);
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user || !targetId) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]" id={`chat-wrapper-${chatId}`}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="relative w-16 h-16 bg-primary text-black rounded-full shadow-2xl flex items-center justify-center shadow-primary/20 hover:scale-110 active:scale-95 transition-all group"
            id="chat-toggle-btn"
          >
            <MessageSquare className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-540 rounded-full ring-4 ring-[#020617] animate-pulse" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className={`glass w-[90vw] md:w-[420px] rounded-t-[2.5rem] rounded-b-[2rem] overflow-hidden shadow-2xl flex flex-col border-2 border-primary/10 ${isMinimized ? 'h-20' : 'h-[620px]'}`}
            id="chat-window-viewport"
          >
            {/* Header */}
            <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center shrink-0 border-b border-white/5 relative">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/15">{targetName?.[0] || '?'}</div>
                  <div className="text-left">
                    <p className="font-extrabold tracking-tight text-sm uppercase">{targetName || 'Member'}</p>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <span>●</span> Direct Channel
                    </p>
                  </div>
               </div>
               <div className="flex gap-1.5">
                  <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white/60 hover:text-white" title="Minimize">
                    {isMinimized ? <Maximize2 size={15} /> : <MinusCircle size={15} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white/60 hover:text-white" title="Close">
                    <X size={15} />
                  </button>
               </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Loop */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-900/50 custom-scrollbar text-white relative">
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === user.uid;
                    const originalStr = msg.originalText || msg.text || '';
                    const translatedStr = msg.translations?.[currentLanguage] || '';
                    
                    // Decides if we show translation or original:
                    // If showTranslatedState[msg.id] is explicitly toggled, use that.
                    // Otherwise, autoTranslateIncoming fallback is active.
                    const isShowingTranslation = showTranslatedState[msg.id] !== undefined 
                      ? showTranslatedState[msg.id] 
                      : (autoTranslateIncoming && !!translatedStr);

                    return (
                      <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Interactive Message Bubble */}
                        <div 
                          onDoubleClick={() => setActiveMsgMenuId(msg.id)}
                          className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-md relative transition-all group/msg ${
                            isMe 
                              ? 'bg-primary text-black rounded-tr-none' 
                              : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                          }`}
                          title="Double tap for options"
                        >
                          {/* Main Text Content */}
                          {msg.text && (
                            <div className="leading-relaxed break-words text-left">
                              {isShowingTranslation && translatedStr ? (
                                <p className="italic">{translatedStr}</p>
                              ) : (
                                <p>{originalStr}</p>
                              )}
                            </div>
                          )}

                          {msg.mediaUrl && <img src={msg.mediaUrl} className="mt-2 rounded-lg max-h-40 w-full object-cover" referrerPolicy="no-referrer" />}
                          
                          {/* Status and Flags footer inside bubble */}
                          <div className={`text-[8px] mt-2 uppercase font-black tracking-widest flex items-center justify-between gap-3 ${isMe ? 'text-black/60 font-medium' : 'text-white/40'}`}>
                            <div className="flex items-center gap-1.5 font-sans">
                              <span>{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                              {isMe && (
                                <span className="font-extrabold text-[7px] tracking-widest uppercase">
                                  {msg.seen ? '• Read' : '• Sent'}
                                </span>
                              )}
                            </div>

                            {/* Languages & Translation Flags */}
                            {!msg.mediaUrl && (
                              <div className="flex items-center gap-1">
                                {msg.sourceLanguage && (
                                  <span title={`Language: ${getLanguageName(msg.sourceLanguage)}`}>
                                    {getLanguageFlag(msg.sourceLanguage)} {msg.sourceLanguage.toUpperCase()}
                                  </span>
                                )}
                                {isShowingTranslation && translatedStr && (
                                  <span className="flex items-center gap-0.5 text-[7.5px] text-emerald-400 font-extrabold uppercase">
                                    ➜ {getLanguageFlag(currentLanguage)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick manual translation buttons for non-me bubbles */}
                          {!isMe && msg.text && !msg.mediaUrl && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-all flex gap-1 bg-slate-900/80 p-1 rounded-lg backdrop-blur-sm border border-white/15">
                              <button
                                onClick={() => setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id)}
                                className="p-1 text-primary hover:text-white hover:scale-105 transition-all cursor-pointer"
                                title="Menu"
                              >
                                <Languages size={11} />
                              </button>
                            </div>
                          )}

                          {/* Popup Message Actions Dropdown (Glassmorphism) */}
                          <AnimatePresence>
                            {activeMsgMenuId === msg.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute bottom-full right-0 z-[110] mb-2 min-w-[170px] bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1 text-left"
                              >
                                {/* Toggle layout translate */}
                                {msg.text && (
                                  <button 
                                    onClick={() => {
                                      if (translatedStr) {
                                        setShowTranslatedState(prev => ({ ...prev, [msg.id]: !isShowingTranslation }));
                                      } else {
                                        handleTranslateMessage(msg.id, originalStr, currentLanguage);
                                      }
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-white/10 rounded-xl text-[9px] uppercase font-bold text-white transition-all cursor-pointer"
                                  >
                                    <Languages size={13} className="text-primary" />
                                    <span>{isShowingTranslation ? 'Original' : `Translate to ${getLanguageName(currentLanguage)}`}</span>
                                  </button>
                                )}

                                {/* Copy string clip */}
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(isShowingTranslation && translatedStr ? translatedStr : originalStr);
                                    setActiveMsgMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-white/10 rounded-xl text-[9px] uppercase font-bold text-white transition-all cursor-pointer"
                                >
                                  <Copy size={13} className="text-primary" />
                                  <span>Copy Text</span>
                                </button>
                                
                                <button 
                                  onClick={() => setActiveMsgMenuId(null)}
                                  className="flex items-center gap-2 w-full px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] uppercase font-bold text-white/50 hover:text-white transition-all cursor-pointer mt-1"
                                >
                                  <X size={12} />
                                  <span>Dismiss</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Translation status inline loaders/errors */}
                        {translationLoading[msg.id] && (
                          <span className="text-[8px] text-primary font-bold uppercase tracking-widest mt-1 ml-4 flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Translating...
                          </span>
                        )}
                        {localTranslationErrors[msg.id] && (
                          <span className="text-[8px] text-red-400 font-bold uppercase tracking-widest mt-1 ml-4 leading-normal">
                             ⚠️ {localTranslationErrors[msg.id]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  
                  {targetTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/5 border border-white/5 text-primary text-[10px] font-black uppercase tracking-wider py-2.5 px-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-150" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-300" />
                        <span>{targetName || 'Idol'} is typing</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={scrollRef} />
                </div>

                {/* Footer Inputs & Outgoing Settings */}
                <div className="p-4 bg-slate-900 border-t border-white/5 flex flex-col gap-2 relative">
                  
                  {/* Selector Bar for sendLanguage */}
                  {isSendLangDropdownOpen && (
                    <div className="absolute bottom-full left-4 right-4 z-[90] mb-2 p-3 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[160px] overflow-y-auto gap-1 text-left custom-scrollbar">
                      <p className="text-[8px] font-black uppercase tracking-wider text-white/40 mb-1 px-2.5">Send / Translate Message As:</p>
                      <button
                        onClick={() => {
                          setSendLanguage('original');
                          setIsSendLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                          sendLanguage === 'original' ? 'bg-primary text-black' : 'text-white hover:bg-white/5'
                        }`}
                      >
                        <span>🌐 Original Text (Auto Detect)</span>
                      </button>
                      
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSendLanguage(lang.code);
                            setIsSendLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                            sendLanguage === lang.code ? 'bg-primary text-black' : 'text-white hover:bg-white/5'
                          }`}
                        >
                          <span>{lang.flag} {lang.name}</span>
                          {sendLanguage === lang.code && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input controls form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    {/* Media icon upload */}
                    <label className="p-3 bg-white/5 text-white/40 rounded-xl cursor-pointer hover:bg-white/10 transition-all shrink-0 border border-white/5 flex items-center justify-center">
                      <ImageIcon size={20} />
                      <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={handleImageUpload} />
                    </label>

                    {/* Language send switcher trigger */}
                    <button
                      type="button"
                      onClick={() => setIsSendLangDropdownOpen(!isSendLangDropdownOpen)}
                      className={`p-3 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0 border flex items-center justify-center ${
                        sendLanguage !== 'original' 
                          ? 'bg-primary/20 text-primary border-primary/25' 
                          : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                      }`}
                      title="Send as another language"
                    >
                      {sendLanguage === 'original' ? (
                        <Globe size={18} />
                      ) : (
                        <span className="text-[15px] leading-none font-bold font-sans">
                          {getLanguageFlag(sendLanguage)}
                        </span>
                      )}
                    </button>

                    <input 
                      value={newMessage}
                      onChange={e => handleInputChange(e.target.value)}
                      placeholder={
                        sendLanguage === 'original' 
                          ? "Encrypt message..." 
                          : `Will translate to ${getLanguageName(sendLanguage)}...`
                      }
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:border-primary/50 outline-none"
                    />

                    <button 
                      type="submit" 
                      id="floating-chat-send-btn"
                      disabled={uploading} 
                      className="py-3 px-5 bg-primary text-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-55 flex items-center gap-2 shrink-0 font-sans font-black uppercase text-[10px] tracking-widest cursor-pointer h-[46px]"
                    >
                      <span>Send</span>
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ChatWidget;
