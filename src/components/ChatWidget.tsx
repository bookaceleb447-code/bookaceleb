import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, limit, setDoc, doc 
} from 'firebase/firestore';
import { MessageSquare, Send, X, Image as ImageIcon, MinusCircle, Maximize2 } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { triggerAutoReply } from '../lib/autoReply';

export const ChatWidget = ({ targetId, targetName }: { targetId: string, targetName: string }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [targetTyping, setTargetTyping] = useState(false);
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, targetTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user) return;

    const text = newMessage;
    setNewMessage('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    triggerTyping(false);
    
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      senderId: user.uid,
      text: text,
      timestamp: serverTimestamp(),
      seen: false
    });
    
    // Update chat meta
    await setDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
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
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-primary text-black rounded-full shadow-2xl flex items-center justify-center shadow-primary/20 hover:scale-110 active:scale-95 transition-all group"
          >
            <MessageSquare className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full ring-4 ring-[#020617] animate-pulse" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className={`glass w-[90vw] md:w-[400px] rounded-t-[2.5rem] rounded-b-[2rem] overflow-hidden shadow-2xl flex flex-col border-2 border-primary/10 ${isMinimized ? 'h-20' : 'h-[600px]'}`}
          >
            {/* Header */}
            <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center shrink-0 border-b border-white/5">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{targetName?.[0] || '?'}</div>
                  <div>
                    <p className="font-bold tracking-tight text-sm uppercase">{targetName || 'Member'}</p>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">Direct Channel</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    {isMinimized ? <Maximize2 size={16} /> : <MinusCircle size={16} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <X size={16} />
                  </button>
               </div>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                        msg.senderId === user.uid 
                          ? 'bg-primary text-black rounded-tr-none' 
                          : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                      }`}>
                        {msg.text && <p className="leading-relaxed break-words">{msg.text}</p>}
                        {msg.mediaUrl && <img src={msg.mediaUrl} className="mt-2 rounded-lg max-h-40 w-full object-cover" referrerPolicy="no-referrer" />}
                        <div className={`text-[8px] mt-1.5 uppercase font-black tracking-widest opacity-60 flex items-center gap-1 ${msg.senderId === user.uid ? 'text-black' : 'text-white'}`}>
                           <span>{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                           {msg.senderId === user.uid && (
                             <span className="font-extrabold text-[7.5px] tracking-widest uppercase">
                               {msg.seen ? '• Read' : '• Sent'}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
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

                <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-white/5 flex gap-2 items-center">
                  <label className="p-3 bg-white/5 text-white/40 rounded-xl cursor-pointer hover:bg-white/10 transition-all shrink-0 border border-white/5 flex items-center justify-center">
                    <ImageIcon size={20} />
                    <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={handleImageUpload} />
                  </label>
                  <input 
                    value={newMessage}
                    onChange={e => handleInputChange(e.target.value)}
                    placeholder="Encrypt message..." 
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
