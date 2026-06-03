import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  doc, getDoc, updateDoc, collection, query, where, onSnapshot,
  orderBy, limit, addDoc, serverTimestamp, setDoc, deleteDoc
} from 'firebase/firestore';
import { 
  Lock, LayoutDashboard, UserCircle, DollarSign, Settings, 
  CheckCircle2, AlertCircle, Copy, Share2, LogOut,
  Menu, X, ExternalLink, MessageSquare, Heart, Calendar, CreditCard,
  Briefcase, Globe, Landmark, Coins, Gift, Compass, Sparkles, Send, Award, ChevronRight, PhoneCall,
  PlayCircle
} from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { BUILT_IN_TEMPLATES } from '../../lib/autoReply';
import { checkAndExpireAiPremium } from '../../lib/premiumCheck';
import { ChatWidget } from '../../components/ChatWidget';
import { Toast } from '../../components/Toast';
import { UploadCloud, Zap } from 'lucide-react';

export const CelebrityDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [celebData, setCelebData] = useState<any>(null);
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('celeb_active_tab') || 'dashboard';
  });
  const setActiveTab = (tab: string) => {
    localStorage.setItem('celeb_active_tab', tab);
    setActiveTabState(tab);
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebLoaded, setCelebLoaded] = useState(false);
  const [aiUsageLoaded, setAiUsageLoaded] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [chatTarget, setChatTarget] = useState<any>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [isLoadingTutorials, setIsLoadingTutorials] = useState(true);

  const handleUploadFanCardImage = async (membershipId: string, file: File | undefined) => {
    if (!file) return;
    setUploadingCardId(membershipId);
    try {
      const url = await uploadToCloudinary(file);
      await updateDoc(doc(db, 'memberships', membershipId), { 
        fanCardImage: url,
        status: 'approved'
      });
      triggerToast('Bespoke Fan Card image attached successfully!');
    } catch (e: any) {
      alert('Error uploading fan card image: ' + e.message);
    } finally {
      setUploadingCardId(null);
    }
  };

  // States for sub-data
  const [bookings, setBookings] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [userAiUsage, setUserAiUsage] = useState<any>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Real-time cooldown countdown ticker
  useEffect(() => {
    if (!userAiUsage?.cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      let cdTime = 0;
      const cd = userAiUsage.cooldownUntil;
      if (typeof cd.toDate === 'function') {
        cdTime = cd.toDate().getTime();
      } else if (cd instanceof Date) {
        cdTime = cd.getTime();
      } else if (cd.seconds) {
        cdTime = cd.seconds * 1000;
      } else if (typeof cd === 'number') {
        cdTime = cd;
      } else {
        cdTime = new Date(cd).getTime();
      }

      const now = Date.now();
      if (cdTime > now) {
        setCooldownRemaining(Math.ceil((cdTime - now) / 1000));
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userAiUsage?.cooldownUntil]);

  // Reset suggestions and steps when active chat target switches
  useEffect(() => {
    setAiSuggestions([]);
    setAiStep('confirm');
    setAiError(null);
  }, [chatTarget?.id]);

  // Chat subsystem states
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [activeNewMessage, setActiveNewMessage] = useState('');
  const [activeTargetTyping, setActiveTargetTyping] = useState(false);
  const [activeUploading, setActiveUploading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('live');
  const [isFallbackActivated, setIsFallbackActivated] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStep, setAiStep] = useState<'confirm' | 'suggestions' | 'cooldown'>('confirm');

  // Automatic Reply System States
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplySelectedFans, setAutoReplySelectedFans] = useState<string[]>([]);
  const [autoReplySelectedTemplate, setAutoReplySelectedTemplate] = useState("built-in-0");
  const [autoReplyCustomTemplate, setAutoReplyCustomTemplate] = useState("");
  const [autoReplyApplyToAll, setAutoReplyApplyToAll] = useState(true);
  
  const [customReplies, setCustomReplies] = useState<any[]>([]);
  const [showCustomReplyForm, setShowCustomReplyForm] = useState(false);
  const [editingCustomReplyId, setEditingCustomReplyId] = useState<string | null>(null);
  const [customReplyNameInput, setCustomReplyNameInput] = useState("");
  const [customReplyMessageInput, setCustomReplyMessageInput] = useState("");
  const [savingAutoReplyConfig, setSavingAutoReplyConfig] = useState(false);

  // Load Automatic Reply options from Firestore in real-time
  useEffect(() => {
    if (!user) return;

    // Load main settings
    const unsubConfig = onSnapshot(doc(db, 'automaticReplies', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAutoReplyEnabled(data.enabled ?? false);
        setAutoReplySelectedFans(data.selectedFans ?? []);
        setAutoReplySelectedTemplate(data.selectedTemplate ?? "built-in-0");
        setAutoReplyCustomTemplate(data.customTemplate ?? "");
        setAutoReplyApplyToAll(data.applyToAll ?? true);
      }
    }, (err) => {
      console.warn("AutoReply config load error ignored", err);
    });

    // Load custom replies list
    const unsubCustom = onSnapshot(collection(db, 'automaticReplies', user.uid, 'customReplies'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomReplies(items);
    }, (err) => {
      console.warn("Custom replies load error ignored", err);
    });

    return () => {
      unsubConfig();
      unsubCustom();
    };
  }, [user]);

  const handleSaveAutoReplySettings = async () => {
    if (!user) return;
    setSavingAutoReplyConfig(true);
    try {
      await setDoc(doc(db, 'automaticReplies', user.uid), {
        enabled: autoReplyEnabled,
        selectedFans: autoReplySelectedFans,
        selectedTemplate: autoReplySelectedTemplate,
        customTemplate: autoReplyCustomTemplate || BUILT_IN_TEMPLATES[0],
        applyToAll: autoReplyApplyToAll,
        updatedAt: serverTimestamp()
      }, { merge: true });
      triggerToast('Automatic Reply Configuration Saved Successfully!');
    } catch (e: any) {
      alert('Error saving auto-reply parameters: ' + e.message);
    } finally {
      setSavingAutoReplyConfig(false);
    }
  };

  const handleSaveCustomReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customReplyNameInput.trim() || !customReplyMessageInput.trim()) return;

    try {
      const replyData = {
        name: customReplyNameInput.trim(),
        message: customReplyMessageInput.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingCustomReplyId) {
        // Edit existing
        await setDoc(doc(db, 'automaticReplies', user.uid, 'customReplies', editingCustomReplyId), replyData, { merge: true });
        triggerToast('Custom response updated successfully');
      } else {
        // Create new
        const newDocRef = doc(collection(db, 'automaticReplies', user.uid, 'customReplies'));
        await setDoc(newDocRef, replyData);
        triggerToast('Custom response created successfully');
      }

      // Reset form states
      setShowCustomReplyForm(false);
      setEditingCustomReplyId(null);
      setCustomReplyNameInput("");
      setCustomReplyMessageInput("");
    } catch (err: any) {
      alert("Error saving custom template: " + err.message);
    }
  };

  const handleDeleteCustomReply = async (id: string) => {
    if (!user || !id) return;
    if (!confirm('Are you sure you want to delete this custom template?')) return;
    try {
      await deleteDoc(doc(db, 'automaticReplies', user.uid, 'customReplies', id));
      triggerToast('Custom response deleted successfully');
      
      // If the template we just deleted was selected, reset selection
      if (autoReplySelectedTemplate === id) {
        setAutoReplySelectedTemplate("built-in-0");
        setAutoReplyCustomTemplate("");
      }
    } catch (err: any) {
      alert("Error deleting template: " + err.message);
    }
  };

  // Chat list real-time listener
  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'chats') {
      // Keep loading false or reset
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);

    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubChats = onSnapshot(qChats, async (snap) => {
      try {
        const chatsList = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const chatData = docSnap.data();
            const participants = chatData.participants || [];
            const fanId = Array.isArray(participants) ? participants.find((p: string) => p !== user.uid) : null;
            
            let fanName = 'Anonymous Fan';
            let fanPic = '';
            if (fanId) {
              try {
                const userSnap = await getDoc(doc(db, 'users', fanId));
                if (userSnap.exists()) {
                  const data = userSnap.data();
                  fanName = data?.displayName || data?.celebName || 'VIP Fan';
                  fanPic = data?.profilePic || '';
                }
              } catch (userErr) {
                console.warn('Could not read user profile details inside chat stream:', fanId, userErr);
              }
            }
            
            return {
              id: docSnap.id,
              fanId,
              fanName,
              fanPic,
              ...chatData
            };
          })
        );
        
        setConversations(chatsList.sort((a: any, b: any) => {
          const tA = a.lastTimestamp?.seconds || 0;
          const tB = b.lastTimestamp?.seconds || 0;
          return tB - tA;
        }));
      } catch (err) {
        console.error('Error occurred sorting and loading conversations list inside snapshot:', err);
      } finally {
        setConversationsLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats (celeb)');
      setConversationsLoading(false);
    });

    return () => unsubChats();
  }, [user, activeTab]);

  // Chat message thread & typing listener
  useEffect(() => {
    setAiSuggestions([]);
    if (!chatTarget?.id || !user) return;

    const qMsg = query(
      collection(db, `chats/${chatTarget.id}/messages`),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubMsg = onSnapshot(qMsg, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveMessages(msgs);
      
      // Mark as read
      snap.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== user.uid && !data.seen) {
          try {
            await updateDoc(docSnap.ref, { seen: true });
          } catch (e) {
            console.warn('seen status sync caught', e);
          }
        }
      });
    }, (err) => {
      console.error('Realtime messages thread listener error:', err);
    });

    // Listen to typing status
    const unsubTyping = onSnapshot(doc(db, 'chats', chatTarget.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveTargetTyping(!!data?.typing?.[chatTarget.fanId]);
      }
    }, (err) => {
      console.error('Realtime message typing listener error:', err);
    });

    return () => {
      unsubMsg();
      unsubTyping();
    };
  }, [chatTarget?.id, chatTarget?.fanId, user]);

  // Membership plan states
  const [editingPlanIdx, setEditingPlanIdx] = useState<number | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planBenefits, setPlanBenefits] = useState('');
  const [planBadge, setPlanBadge] = useState('');

  // Toast notifications states
  const [toastShow, setToastShow] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastShow(true);
  };

  const getDynamicReferralLink = (link: string | undefined): string => {
    if (!link) return '';
    const urlParts = link.split('/ref/');
    if (urlParts.length > 1) {
      return `${window.location.origin}/ref/${urlParts[1]}`;
    }
    return link;
  };

  useEffect(() => {
    if (!user) return;

    let unsubAiUsage: (() => void) | null = null;
    let isAiUsageSubscribed = false;

    // Listen for celebrity details
    const unsubCeleb = onSnapshot(doc(db, 'celebrityProfiles', user.uid), async (docSnap) => {
      let currentCeleb: any = null;
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check for AI Premium expiration (35 days plan)
        const expired = await checkAndExpireAiPremium(db, user.uid, data);
        if (expired) {
          data.isAiSubscribed = false;
          data.aiPremium = false;
          data.aiPremiumActivatedAt = null;
          data.aiPremiumExpiresAt = null;
          triggerToast('AI Premium subscription expired. Reverted to standard Free Plan.');
        }

        // Correct check/generation for short-referrals if missing
        if (!data.referralLink || data.referralLink.includes('undefined') || !data.slug) {
          const ab = Math.random().toString(36).substring(2, 4);
          const slug = data.slug || (data.celebName || 'star').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const shortUrl = `${window.location.origin}/ref/${ab}/${slug}`;
          await setDoc(doc(db, 'celebrityProfiles', user.uid), { referralLink: shortUrl, slug: slug }, { merge: true });
          data.referralLink = shortUrl;
          data.slug = slug;
        }
        currentCeleb = data;
        setCelebData(data);
      } else {
        // Document does not exist yet. Initialize it!
        const initialProfile = {
          celebId: user.uid,
          celebName: user.displayName || 'Unnamed Star',
          profilePic: user.photoURL || '',
          isHidden: false,
          isLocked: true, // by default locked until verification pledge deposit
          membershipPlans: [],
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'celebrityProfiles', user.uid), initialProfile);
          currentCeleb = initialProfile;
          setCelebData(initialProfile);
        } catch (e) {
          console.error("Auto profile initialize error:", e);
        }
      }
      setCelebLoaded(true);

      // Now subscribe to aiUsage, using the exact loaded celebrity details to prevent default-plan/free race conditions!
      if (!isAiUsageSubscribed) {
        isAiUsageSubscribed = true;
        
        unsubAiUsage = onSnapshot(doc(db, 'aiUsage', user.uid), async (aiSnap) => {
          if (aiSnap.exists()) {
            const uData = aiSnap.data();
            let count = uData.requestCountToday !== undefined ? uData.requestCountToday : (uData.dailyRequests ?? 0);
            
            // Check if lastRequestDate is today (UTC date check to align with server)
            let isSameDay = false;
            if (uData.lastRequestDate) {
              const lastReqDateVal = uData.lastRequestDate;
              let dateObj: Date;
              if (typeof lastReqDateVal.toDate === 'function') {
                dateObj = lastReqDateVal.toDate();
              } else if (lastReqDateVal instanceof Date) {
                dateObj = lastReqDateVal;
              } else if (lastReqDateVal.seconds) {
                dateObj = new Date(lastReqDateVal.seconds * 1000);
              } else {
                dateObj = new Date(lastReqDateVal);
              }
              const lastReqDateStr = dateObj.toISOString().split('T')[0];
              const todayStr = new Date().toISOString().split('T')[0];
              isSameDay = (lastReqDateStr === todayStr);
            }
            
            if (!isSameDay && uData.lastRequestDate) {
              count = 0;
            }

            const activeProv = uData.activeProvider || "live";
            setAiProvider(activeProv);
            setIsFallbackActivated(activeProv === "demo" || uData.fallbackActivated === true);

            setAiUsageCount(count);
            setUserAiUsage({
              ...uData,
              requestCountToday: count,
              remainingRequests: uData.remainingRequests !== undefined ? uData.remainingRequests : Math.max(0, (uData.maxDailyRequests ?? uData.dailyLimit ?? 5) - count),
              totalLifetimeRequests: uData.totalLifetimeRequests ?? uData.totalRequests ?? 0,
              activeProvider: activeProv,
              cooldownUntil: uData.cooldownUntil || null,
              geminiQuotaExceeded: uData.geminiQuotaExceeded || false
            });
            setAiUsageLoaded(true);
          } else {
            // Strictly NO client-side automatic creation or overwriting on load/refresh (satisfies Rule 5 and Rule 1)
            // Just display defaults locally so the UI can mount nicely without blocking.
            const plan = (currentCeleb?.isAiSubscribed === true || currentCeleb?.aiPremium === true) ? "ai_subscribed" : "free";
            const limit = plan === "ai_subscribed" ? 50 : 5;
            setAiUsageCount(0);
            setUserAiUsage({
              userId: user.uid,
              requestCountToday: 0,
              remainingRequests: limit,
              totalLifetimeRequests: 0,
              aiPremium: plan === "ai_subscribed",
              maxDailyRequests: limit,
              lastRequestDate: null,
              cooldownUntil: null,
              activeProvider: "live",
              geminiQuotaExceeded: false
            });
            setAiUsageLoaded(true);
          }
        }, (err) => {
          console.warn("⚠️ aiUsage snapshot load issue:", err);
          setAiUsageLoaded(true); // fall back to prevent stuck spinner
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `celebrityProfiles/${user.uid}`);
      setCelebLoaded(true);
      setAiUsageLoaded(true); // prevent locked loading if celeb profile fails
    });

    // Fetch master config
    getDoc(doc(db, 'siteSettings', 'global')).then(d => {
      if (d.exists()) setSiteSettings(d.data());
    });

    // Real-time bookings log
    const q = query(collection(db, 'bookings'), where('celebId', '==', user.uid));
    const unsubBookings = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bookings (celeb)');
    });

    // Real-time memberships log
    const qM = query(collection(db, 'memberships'), where('celebId', '==', user.uid));
    const unsubMemberships = onSnapshot(qM, (snap) => {
      setMemberships(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'memberships (celeb)');
    });

    // Real-time donations log
    const qD = query(collection(db, 'donations'), where('celebId', '==', user.uid));
    const unsubDonations = onSnapshot(qD, (snap) => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'donations (celeb)');
    });

    // Real-time referrals signups log
    const qRef = query(collection(db, 'users'), where('referredBy', '==', user.uid));
    const unsubReferrals = onSnapshot(qRef, (snap) => {
      setReferredUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users (referrals)');
    });

    // Real-time tutorials sync
    setIsLoadingTutorials(true);
    const unsubTutorials = onSnapshot(collection(db, 'tutorials'), (snap) => {
      setTutorials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoadingTutorials(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'tutorials');
      setIsLoadingTutorials(false);
    });

    // Real-time daily AI logs sync (Rule 12 count tracker)
    const todayStr = new Date().toISOString().split('T')[0];
    const qAiLogs = query(
      collection(db, 'aiUsageLogs'),
      where('celebrityId', '==', user.uid),
      where('date', '==', todayStr)
    );
    let logsCount = 0;
    const unsubAiLogs = onSnapshot(qAiLogs, (snap) => {
      logsCount = snap.size;
    }, (err) => {
      console.warn("⚠️ AI daily logs count snapshot load issue:", err);
    });

    return () => {
      unsubCeleb();
      unsubBookings();
      unsubMemberships();
      unsubDonations();
      unsubReferrals();
      unsubTutorials();
      unsubAiLogs();
      if (unsubAiUsage) (unsubAiUsage as () => void)();
    };
  }, [user]);

  if (authLoading || !celebLoaded || !aiUsageLoaded) return (
    <div className="h-screen flex items-center justify-center bg-[#020617]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );

  const isLocked = celebData?.isLocked;
  const currencySym = '$';

  // Navigation Items
  const fullNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'tutorials', label: 'Watch Tutorials', icon: <PlayCircle size={18} /> },
    { id: 'profile', label: 'Profile Details', icon: <UserCircle size={18} />, reqUnlock: true },
    { id: 'pricing', label: 'Pricing Settings', icon: <DollarSign size={18} />, reqUnlock: true },
    { id: 'payment', label: 'Payment Integration', icon: <Coins size={18} />, reqUnlock: true },
    { id: 'bookings', label: 'Booking Management', icon: <Calendar size={18} />, reqUnlock: true },
    { id: 'fan-cards', label: 'Fan Card Management', icon: <CreditCard size={18} />, reqUnlock: true },
    { id: 'donations', label: 'Donation Management', icon: <Heart size={18} />, reqUnlock: true },
    { id: 'referrals', label: 'Referral System', icon: <Share2 size={18} />, reqUnlock: true },
    { id: 'chats', label: 'Chats / Messages', icon: <MessageSquare size={18} />, reqUnlock: true },
    { id: 'socials', label: 'Social Link configuration', icon: <Globe size={18} />, reqUnlock: true },
    { id: 'ai-premium', label: 'AI Premium Assist', icon: <Sparkles size={18} /> },
    { id: 'settings', label: 'Global Settings', icon: <Settings size={18} />, reqUnlock: true },
  ];
 
  const visibleNavItems = fullNavItems;

  const currentActiveTab = fullNavItems.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-primary selection:text-black">
      {/* Educational Purpose Warning Bar for non-VIP accounts */}
      {isLocked && (
        <div className="mx-4 mt-4 sm:mx-6 sm:mt-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 py-3 px-6 overflow-hidden rounded-2xl border border-amber-400/50 shadow-[0_8px_30px_rgba(245,158,11,0.35)] relative z-[99] shrink-0">
          <style>{`
            @keyframes warningMarquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-33.3333%); }
            }
            .warning-marquee-container {
              display: flex;
              width: max-content;
              animation: warningMarquee 28s linear infinite;
            }
          `}</style>
          <div className="warning-marquee-container flex items-center whitespace-nowrap gap-16 text-xs font-bold tracking-widest uppercase">
            <span className="flex items-center gap-2">⚠️ This tools is for educational purposes only. Any fraudulent activity found would be banned 🚫 immediately. Btech Cares ✅</span>
            <span className="flex items-center gap-2">⚠️ This tools is for educational purposes only. Any fraudulent activity found would be banned 🚫 immediately. Btech Cares ✅</span>
            <span className="flex items-center gap-2">⚠️ This tools is for educational purposes only. Any fraudulent activity found would be banned 🚫 immediately. Btech Cares ✅</span>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full">
      
      {/* Mobile AppBar / Header Toggle */}
      <header className="md:hidden glass-dark border-b border-white/5 px-6 py-5 flex justify-between items-center sticky top-0 z-40 bg-slate-950/95 overflow-hidden isolation-isolate contain-paint">
        <div className="text-xl font-display font-black tracking-tighter uppercase italic flex items-center gap-2">
          VIP PORTAL <span className="text-primary italic">COMMAND</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-2.5 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 focus:outline-none"
        >
          {isMenuOpen ? <X size={20} className="text-primary" /> : <Menu size={20} />}
        </button>
      </header>

      {/* Responsive Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[65px] bottom-0 z-30 bg-slate-950/98 backdrop-blur-3xl p-6 sm:p-8 flex flex-col justify-start gap-8 overflow-y-auto md:hidden pb-12 isolation-isolate contain-paint"
          >
            <div className="space-y-6 shrink-0">
              <div className="text-center pb-6 border-b border-white/5">
                <h4 className="font-display font-black text-white italic">{celebData?.celebName}</h4>
                <p className="text-[9px] uppercase font-black text-primary tracking-widest mt-1">
                  {isLocked ? 'Identity Lock Activated' : 'Active Elite Member'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {visibleNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                      activeTab === item.id 
                        ? 'bg-primary text-black font-black' 
                        : 'text-white/45 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className={activeTab === item.id ? 'text-black' : 'text-primary'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 pb-4 border-t border-white/5 space-y-2 shrink-0">
              <p className="text-[9px] uppercase font-black text-white/30 tracking-widest text-left">Help & Escrow Support</p>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={siteSettings?.whatsappLink || 'https://wa.me/23400000000'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="py-3 bg-white/[0.03] hover:bg-[#25D366]/20 hover:text-[#25D366] border border-white/5 hover:border-[#25D366]/30 text-white/70 rounded-2xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                >
                  <PhoneCall size={12} className="text-[#25D366]" /> WhatsApp
                </a>
                <a 
                  href={siteSettings?.telegramLink || 'https://t.me/bookacelebsupport'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="py-3 bg-white/[0.03] hover:bg-[#0088cc]/20 hover:text-[#0088cc] border border-white/5 hover:border-[#0088cc]/30 text-white/70 rounded-2xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shrink-0"
                >
                  <Send size={12} className="text-[#0088cc]" /> Telegram
                </a>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0"
            >
              Exit Portal System
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop permanente left-rail */}
      <aside className="hidden md:flex w-80 shrink-0 flex-col bg-slate-950/40 backdrop-blur-3xl p-6 border-r border-white/5 overflow-y-auto min-h-screen justify-between sticky top-0">
        <div className="space-y-10">
          <div className="px-2">
            <h1 className="text-lg font-display font-black tracking-tighter uppercase italic">VIP PORTAL <span className="text-primary italic uppercase underline decoration-primary/40 leading-none">Command</span></h1>
            <p className="text-[10px] uppercase font-black tracking-[0.25em] text-white/40 mt-1">Management Cluster</p>
          </div>

          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary text-black font-black shadow-xl shadow-primary/10' 
                    : 'text-white/45 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={activeTab === item.id ? 'text-black' : 'text-primary'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/20 shrink-0">
               {celebData?.profilePic ? (
                 <img src={celebData.profilePic} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-primary font-bold uppercase">{celebData?.celebName?.[0]}</div>
               )}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-black text-white truncate">{celebData?.celebName}</p>
              <p className="text-[9px] text-white/40 font-mono italic uppercase tracking-wider mt-0.5">
                {isLocked ? 'Pending Unlock' : 'Elite Creator'}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-2.5">
            <p className="text-[9px] uppercase font-black text-white/30 tracking-[0.1em] text-left">Concierge Helpdesk</p>
            <div className="grid grid-cols-2 gap-2">
              <a 
                href={siteSettings?.whatsappLink || 'https://wa.me/23400000000'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="py-2.5 bg-[#25D366]/5 hover:bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-xl flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
              >
                <PhoneCall size={10} /> WhatsApp
              </a>
              <a 
                href={siteSettings?.telegramLink || 'https://t.me/bookacelebsupport'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="py-2.5 bg-[#0088cc]/5 hover:bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20 rounded-xl flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
              >
                <Send size={10} /> Telegram
              </a>
            </div>
          </div>

          <button 
            onClick={() => window.location.href = '/'} 
            className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Exit System
          </button>
        </div>
      </aside>

      {/* Main Panel Content Hub */}
      <main className="flex-1 min-w-0 p-6 md:p-14 overflow-y-auto relative">
        
        {/* Active Module Header */}
        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[9px] uppercase font-black text-primary tracking-widest uppercase font-mono">CREATOR PANEL</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white uppercase italic tracking-tighter">{currentActiveTab?.label}</h2>
            </div>
        </div>

        {/* Locked alert screen inside dashboard tab */}
        {isLocked && (
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-10 bg-primary/5 border border-primary/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-white/5"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 group-hover:rotate-12 transition-transform duration-1000">
              <Lock size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-sans">
              <div className="max-w-lg text-left">
                <div className="inline-flex items-center gap-1.5 text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-4 bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/15">
                  <AlertCircle size={12} /> Verification Required
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2 leading-tight">Unlock All Creator Features</h2>
                <p className="text-white/50 text-sm font-medium leading-relaxed">To customize your profile, set custom prices, receive supporter donations, and access your referral program link, please activate your profile features.</p>
              </div>
              
              {celebData?.upgradePending ? (
                <div className="px-8 py-5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-2xl text-xs font-black uppercase tracking-wider text-center flex items-center gap-2">
                  <Sparkles size={16} className="animate-spin" /> ACCOUNT ACTIVATION IN REVIEW
                </div>
              ) : (
                <button 
                  onClick={() => setActiveTab('upgrade')} 
                  className="px-10 py-5 bg-primary text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/10 text-xs"
                >
                  Activate Account
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Render Active Tabs */}
        <div className="space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              
              {/* If the tab requires unlock and the celebrity is locked, render a magnificent custom lock screen */}
              {isLocked && fullNavItems.find(t => t.id === activeTab)?.reqUnlock === true && (
                <div className="glass-dark rounded-[2.5rem] p-10 sm:p-12 border border-amber-500/20 text-center space-y-8 max-w-2xl mx-auto my-12 shadow-2xl shadow-amber-500/5 animate-fade-in">
                  <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center border border-amber-500/20 mx-auto animate-pulse">
                    <AlertCircle className="text-amber-400" size={36} />
                  </div>
                  
                  <div className="space-y-3 text-center">
                    <h3 className="text-xl sm:text-2xl font-display font-black uppercase tracking-widest text-white italic">
                      Identity Verification Pending
                    </h3>
                    <p className="text-xs text-amber-500 uppercase font-bold tracking-widest">
                      🔒 Module Safe Locked
                    </p>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed text-center font-medium">
                    This manager segment ({currentActiveTab?.label}) is temporarily locked while your profile undergoes identity and security checks. To instantly unlock live chat channels, customized fan cards, support donations, payout wiring, and other elite portal tools:
                  </p>

                  <div className="p-6 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-2 text-center">
                    <p className="text-[10px] text-white/45 uppercase tracking-widest font-black">Next Action Required</p>
                    <p className="text-xs text-white font-bold">👉 Submit the VIP Career Verification Pledge Deposit on your main Dashboard tab.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-8 py-4 bg-primary text-black rounded-xl font-black uppercase tracking-wider text-[10px] hover:scale-102 transition-all active:scale-98 shadow-lg shadow-primary/10 cursor-pointer"
                    >
                      ← Return to Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab('ai-premium')}
                      className="px-8 py-4 bg-white/5 border border-white/5 text-white rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-white/10 transition-all active:scale-98 cursor-pointer"
                    >
                      Review AI Premium Assist →
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div className="space-y-10">
                  {/* Notice Banners */}
                  {isLocked && (
                    <div className="mb-4">
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          boxShadow: [
                            "0 0 4px rgba(245, 158, 11, 0.05)",
                            "0 0 12px rgba(245, 158, 11, 0.16)",
                            "0 0 4px rgba(245, 158, 11, 0.05)"
                          ]
                        }}
                        transition={{
                          boxShadow: {
                            repeat: Infinity,
                            duration: 4,
                            ease: "easeInOut"
                          },
                          duration: 0.4
                        }}
                        className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sans text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <AlertCircle size={20} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-widest text-amber-500 italic">
                              FOR EDUCATIONAL PURPOSES ONLY
                            </h4>
                            <p className="text-[10px] sm:text-xs text-white/50 font-medium mt-0.5">
                              Platform access is currently limited until VIP activation approval.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard icon={<Calendar className="text-blue-500"/>} label="Complete Bookings" value={(bookings || []).length} />
                    <StatCard icon={<MessageSquare className="text-purple-500"/>} label="Conversations" value={0} />
                    <StatCard icon={<Heart className="text-red-500"/>} label="Supporter Contributions" value={0} />
                    <StatCard icon={<CreditCard className="text-orange-500"/>} label="Elite Fan Members" value={0} />
                    <StatCard 
                      icon={<Sparkles className="text-amber-400"/>} 
                      label={`AI Remaining (${userAiUsage?.activeProvider === 'demo' ? 'DEMO' : userAiUsage?.activeProvider === 'groq' ? 'LIVE' : 'LIVE PRO'})`} 
                      value={`${Math.max(0, (celebData?.isAiSubscribed === true || celebData?.aiPremium === true ? 50 : 5) - aiUsageCount)} / ${celebData?.isAiSubscribed === true || celebData?.aiPremium === true ? 50 : 5}`} 
                    />
                  </div>

                  <div className="glass-dark rounded-[2.5rem] p-10 border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-display font-bold uppercase tracking-tighter text-white">Creator Referral Link</h3>
                      {isLocked ? (
                        <div className="bg-red-500/15 px-4 py-2 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">LOCKED</div>
                      ) : (
                        <div className="bg-primary/15 px-4 py-2 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">Active</div>
                      )}
                    </div>
                    
                    {isLocked ? (
                      <div className="p-6 bg-red-500/5 rounded-3xl border border-dashed border-red-500/10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-left font-sans">
                          <h4 className="font-bold text-white text-md uppercase tracking-wide">Referral Program Locked</h4>
                          <p className="text-xs text-white/50 leading-relaxed mt-1">Unlock your referral link to invite your fans and earn commissions by activating your account.</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('upgrade')}
                          className="px-6 py-3 bg-primary text-black font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer shadow-md shrink-0 w-full md:w-auto"
                        >
                          Activate Account
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6 bg-black/40 rounded-3xl border border-dashed border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sans overflow-hidden w-full">
                        <div className="flex-1 min-w-0 text-left w-full md:w-auto overflow-hidden">
                          <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Permanent Short Referral URL</p>
                          <p className="text-[10px] sm:text-xs md:text-sm font-mono font-medium break-all text-primary/85 whitespace-normal select-all overflow-hidden text-ellipsis block w-full">
                            {getDynamicReferralLink(celebData?.referralLink)}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(getDynamicReferralLink(celebData?.referralLink));
                            triggerToast('Referral URL committed to clipboard!');
                          }}
                          className="px-5 py-3 w-full md:w-auto bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Copy size={13} /> Copy link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recents bookings list */}
                  <div className="glass-dark rounded-[2.5rem] p-4 sm:p-6 md:p-10 border border-white/5">
                    <h3 className="text-xl font-display font-bold uppercase tracking-tighter mb-8 italic text-white flex items-center gap-2"><Briefcase size={18} className="text-primary"/> Active Fan Consultations</h3>
                    <div className="space-y-4">
                      {bookings.length > 0 ? bookings.map(b => (
                        <div key={b.id} className="p-4 sm:p-6 bg-black/45 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-6 min-w-0">
                          <div className="flex items-center gap-4 min-w-0 max-w-full">
                            <div className="w-12 h-12 bg-primary/10 border border-primary/10 rounded-2xl flex items-center justify-center text-primary font-black uppercase shrink-0">{b.fullName?.[0] || 'F'}</div>
                            <div className="text-left font-sans min-w-0 max-w-full">
                              <h4 className="font-extrabold text-white text-md tracking-tight uppercase truncate" title={b.fullName || 'Anonymous Fan'}>{b.fullName || 'Anonymous Fan'}</h4>
                              <p className="text-xs text-white/40 font-semibold break-words overflow-wrap-anywhere flex flex-wrap gap-x-1.5 items-center">
                                <span className="break-all font-mono">{b.email}</span>
                                <span className="text-white/20">•</span>
                                <span className="italic">{b.location || 'Zoom Call'}</span>
                                <span className="text-white/20">•</span>
                                <span className="whitespace-nowrap font-mono">{b.dateTime ? new Date(b.dateTime).toLocaleDateString() : 'Pending Date'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto font-sans">
                            <div className="text-left md:text-right">
                              <p className="text-lg font-black text-primary uppercase">{currencySym}{b.totalPrice || '0'}</p>
                              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-white">{b.hours || '1'} Hour Session</p>
                            </div>
                            <div className="flex gap-2">
                              {b.status === 'pending' && (
                                <button 
                                  onClick={async () => {
                                    await updateDoc(doc(db, 'bookings', b.id), { status: 'approved' });
                                    alert('Appointment approved successfully!');
                                  }}
                                  className="p-3 bg-primary text-black rounded-xl hover:scale-105 transition-all shadow-md"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}
                              <button 
                                onClick={() => setChatTarget({ id: b.fanId, name: b.fullName || 'Fan' })}
                                className="p-3 bg-slate-900 border border-white/5 hover:bg-white/5 text-white rounded-xl transition-all shadow-md"
                              >
                                <MessageSquare size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                          <p className="text-white/25 font-bold uppercase tracking-widest text-xs">No active fan appointments found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Profile Details Tab */}
              {activeTab === 'profile' && !isLocked && (
                <div className="space-y-8 font-sans">
                  <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-white/5 rounded-3xl">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-white italic">Curate Stage Brand</h3>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'celebrityProfiles', user!.uid), {
                            celebName: celebData.celebName,
                            country: celebData.country || '',
                            yearsActive: Number(celebData.yearsActive || 0),
                            bookingTitle: celebData.bookingTitle || '',
                            bookingDescription: celebData.bookingDescription || '',
                            profilePic: celebData.profilePic || '',
                            updatedAt: new Date().toISOString()
                          }, { merge: true });
                          triggerToast('Profile Updated Successfully');
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="px-8 py-3.5 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest"
                    >
                      Save Stage Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                      <div>
                        <label className="block text-[10px] uppercase font-black tracking-widest mb-2.5 opacity-40 text-slate-300">Public Stage Title</label>
                        <input 
                          type="text"
                          value={celebData?.celebName || ''}
                          onChange={e => setCelebData({...celebData, celebName: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white focus:border-primary/50 outline-none" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest mb-2.5 opacity-40 text-slate-300">Representing Country</label>
                          <input 
                            type="text"
                            value={celebData?.country || ''}
                            onChange={e => setCelebData({...celebData, country: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white focus:border-primary/50 outline-none" 
                            placeholder="e.g. Nigeria"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest mb-2.5 opacity-40 text-slate-300">Years Active</label>
                          <input 
                            type="number"
                            value={celebData?.yearsActive || ''}
                            onChange={e => setCelebData({...celebData, yearsActive: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white focus:border-primary/50 outline-none" 
                            placeholder="e.g. 10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest mb-2.5 opacity-40 text-slate-300">Booking Session Subject</label>
                          <input 
                            type="text"
                            value={celebData?.bookingTitle || ''}
                            onChange={e => setCelebData({...celebData, bookingTitle: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white focus:border-primary/50 outline-none" 
                            placeholder="e.g. Premium live video concert session"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black tracking-widest mb-2.5 opacity-40 text-slate-300">Session Package Summary</label>
                          <textarea 
                            value={celebData?.bookingDescription || ''}
                            onChange={e => setCelebData({...celebData, bookingDescription: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none h-28" 
                            placeholder="Describe what fans get during active session duration..."
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] space-y-4">
                        <label className="block text-[10px] uppercase font-black tracking-widest opacity-40 text-slate-300">Identity Visual Assets</label>
                        <div className="flex gap-4 items-center">
                          <label className="w-full border-2 border-dashed border-white/10 hover:border-primary rounded-2xl h-32 flex flex-col items-center justify-center text-center p-4 cursor-pointer relative overflow-hidden transition-all bg-black/40">
                            {celebData?.profilePic ? (
                              <img src={celebData.profilePic} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] uppercase font-black text-white/40">Drop Profile Avatar</span>
                            )}
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                !f ? null : null;
                                if (!f) return;
                                try {
                                  const url = await uploadToCloudinary(f);
                                  setCelebData({...celebData, profilePic: url});
                                  alert('Profile Pic uploaded!');
                                } catch (err: any) { alert(err.message); }
                              }} 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Pricing Settings Tab */}
              {activeTab === 'pricing' && !isLocked && (
                <div className="space-y-8 font-sans text-left">
                  <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-white/5 rounded-3xl">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-white italic">Monetization Modules</h3>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'celebrityProfiles', user!.uid), {
                            bookingPrice: Number(celebData.bookingPrice || 0),
                            baseSupportAmount: Number(celebData.baseSupportAmount || 0),
                            updatedAt: new Date().toISOString()
                          }, { merge: true });
                          triggerToast('Pricing Settings Saved Successfully');
                        } catch (err: any) { alert(err.message); }
                      }}
                      className="px-8 py-3.5 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest"
                    >
                      Save Pricing
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 p-10 border border-white/5 rounded-[2rem]">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6"><Calendar size={20} /></div>
                      <h4 className="font-black text-white uppercase text-sm tracking-widest">Appointment Hourly Rate</h4>
                      <p className="text-[10px] text-white/45 font-bold uppercase tracking-widest mt-1 mb-6">Price evaluated per live video consult hour</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{currencySym}</span>
                        <input 
                          type="number"
                          value={celebData?.bookingPrice || 0}
                          onChange={e => setCelebData({...celebData, bookingPrice: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-10 text-xl font-bold text-white focus:border-primary/50 outline-none" 
                        />
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-10 border border-white/5 rounded-[2rem]">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6"><Heart size={20} /></div>
                      <h4 className="font-black text-white uppercase text-sm tracking-widest">Suggested Donation Base</h4>
                      <p className="text-[10px] text-white/45 font-bold uppercase tracking-widest mt-1 mb-6">Suggested foundation charity rate pledge</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{currencySym}</span>
                        <input 
                          type="number"
                          value={celebData?.baseSupportAmount || 0}
                          onChange={e => setCelebData({...celebData, baseSupportAmount: Number(e.target.value)})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-10 text-xl font-bold text-white focus:border-primary/50 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Payment Settings Tab */}
              {activeTab === 'payment' && !isLocked && (
                <PaymentSettingsModule celebData={celebData} setCelebData={setCelebData} currencySym={currencySym} triggerToast={triggerToast} />
              )}

              {/* 5. Booking Management Tab */}
              {activeTab === 'bookings' && !isLocked && (
                <div className="space-y-6">
                  <h3 className="text-xl font-display font-bold uppercase tracking-tighter text-left mb-6">Appointments Registry Log</h3>
                  <div className="bg-slate-900/40 p-4 sm:p-6 md:p-8 border border-white/5 rounded-[2.5rem] space-y-4">
                    {bookings.length > 0 ? bookings.map(b => (
                      <div key={b.id} className="p-4 sm:p-5 bg-black/30 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-w-0">
                        <div className="flex items-center gap-4 text-left min-w-0 max-w-full">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold uppercase shrink-0">{b.fullName?.[0]}</div>
                          <div className="font-sans min-w-0 max-w-full">
                            <h4 className="font-bold text-white text-md tracking-tight uppercase truncate" title={b.fullName || 'Member Fan'}>{b.fullName || 'Member Fan'}</h4>
                            <p className="text-[10px] text-white/40 font-mono italic mt-0.5 break-words overflow-wrap-anywhere flex flex-wrap gap-x-1.5 items-center">
                              <span className="break-all">{b.email}</span>
                              <span className="text-white/20">•</span>
                              <span>{b.location}</span>
                              <span className="text-white/20">•</span>
                              <span className="whitespace-nowrap">{new Date(b.dateTime).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto font-sans">
                          <div className="text-left md:text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              b.status === 'approved' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          {b.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                await updateDoc(doc(db, 'bookings', b.id), { status: 'approved' });
                                alert('Appointment cleared!');
                              }}
                              className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                        <p className="text-white/25 font-bold uppercase tracking-widest text-xs">No active fan consultations booked.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. Fan Cards Management Tab */}
              {activeTab === 'fan-cards' && !isLocked && (
                <div className="space-y-8 text-left font-sans">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950/20 p-6 border border-white/5 rounded-3xl gap-4">
                    <div>
                      <h3 className="text-xl font-display font-bold uppercase tracking-widest text-white italic">Elite Fan Membership Plans</h3>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Configure bespoke subscription tiers and perks for your community ($ USD)</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingPlanIdx(-1);
                        setPlanTitle('');
                        setPlanPrice('');
                        setPlanBenefits('');
                        setPlanBadge('');
                      }}
                      className="px-6 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest self-start"
                    >
                      + Create Plan
                    </button>
                  </div>

                  {/* Plan Creator / Editor Form */}
                  {editingPlanIdx !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-emerald-500/20 rounded-[2rem] p-8 space-y-6 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    >
                      <h4 className="text-md font-bold uppercase text-white italic">
                        {editingPlanIdx === -1 ? 'Configure Bespoke Fan Card Plan' : 'Modify Existing Membership Rate'}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/60">
                        <div>
                          <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Plan Name / Tier</label>
                          <input 
                            type="text" 
                            value={planTitle} 
                            onChange={e => setPlanTitle(e.target.value)}
                            placeholder="e.g. Silver Plan, Platinum Access" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Annual Rate ($ USD)</label>
                          <input 
                            type="number" 
                            value={planPrice} 
                            onChange={e => setPlanPrice(e.target.value)}
                            placeholder="e.g. 99, 399" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Special Badge / Tag (Optional)</label>
                          <input 
                            type="text" 
                            value={planBadge} 
                            onChange={e => setPlanBadge(e.target.value)}
                            placeholder="e.g. Popular, Recommended, VIP" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Plan Perks & Benefits (One benefit per line)</label>
                          <textarea 
                            rows={4}
                            value={planBenefits} 
                            onChange={e => setPlanBenefits(e.target.value)}
                            placeholder="- Priority consultation booking&#10;- Private chat message privileges&#10;- Direct annual video greetings" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={async () => {
                            if (!planTitle || !planPrice) {
                              alert('Plan Name and Price are required.');
                              return;
                            }
                            
                            try {
                              const currentPlans = celebData?.membershipPlans ? [...celebData.membershipPlans] : [];
                              const perksArray = planBenefits.split('\n').map(p => p.trim()).filter(Boolean);
                              
                              const newPlan = {
                                id: editingPlanIdx === -1 ? 'plan-' + Math.random().toString(36).substring(2, 6) : (currentPlans[editingPlanIdx]?.id || 'plan-' + Math.random().toString(36).substring(2, 6)),
                                title: planTitle,
                                price: Number(planPrice),
                                perks: perksArray,
                                badge: planBadge || null,
                                recommended: planBadge?.toLowerCase() === 'recommended' || planBadge?.toLowerCase() === 'popular'
                              };

                              if (editingPlanIdx === -1) {
                                currentPlans.push(newPlan);
                              } else {
                                currentPlans[editingPlanIdx] = newPlan;
                              }

                              await setDoc(doc(db, 'celebrityProfiles', user!.uid), {
                                membershipPlans: currentPlans
                              }, { merge: true });
                              
                              setCelebData({ ...celebData, membershipPlans: currentPlans });
                              triggerToast('Membership Plan Saved Successfully');
                              setEditingPlanIdx(null);
                            } catch (err: any) {
                              alert('Error saving plan: ' + err.message);
                            }
                          }}
                          className="px-6 py-3 bg-primary text-black rounded-lg text-xs font-black uppercase tracking-widest hover:scale-[1.01] transition-all"
                        >
                          Commit Plan
                        </button>
                        <button 
                          onClick={() => setEditingPlanIdx(null)}
                          className="px-6 py-3 bg-slate-900 border border-white/10 text-white/60 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {celebData?.membershipPlans && celebData.membershipPlans.length > 0 ? (
                      celebData.membershipPlans.map((plan: any, idx: number) => (
                        <div 
                          key={plan.id || idx}
                          className="relative p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                        >
                          {plan.badge && (
                            <div className="absolute top-4 right-4 bg-primary/20 border border-primary/30 text-primary text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-[0.15em]">
                              {plan.badge}
                            </div>
                          )}
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] uppercase font-mono tracking-widest text-white/30">Membership Level</p>
                              <h4 className="text-lg font-black uppercase text-white tracking-tight mt-0.5">{plan.title}</h4>
                            </div>
                            
                            <div className="flex items-baseline gap-1 py-1.5 border-y border-white/5">
                              <span className="text-2xl font-display font-black text-white">${plan.price}</span>
                              <span className="text-[9px] font-bold text-white/30">/YR</span>
                            </div>

                            <ul className="space-y-2.5 pt-1">
                              {plan.perks?.map((perk: string, pIdx: number) => (
                                <li key={pIdx} className="flex items-start gap-2 text-[10px] font-semibold text-white/70 tracking-wide uppercase">
                                  <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />
                                  <span>{perk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex gap-2.5 border-t border-white/5 mt-6 pt-4">
                            <button 
                              onClick={() => {
                                setEditingPlanIdx(idx);
                                setPlanTitle(plan.title);
                                setPlanPrice(plan.price.toString());
                                setPlanBadge(plan.badge || '');
                                setPlanBenefits((plan.perks || []).join('\n'));
                              }}
                              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#F8FAFC] border border-white/5"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={async () => {
                                if (!confirm(`Delete ${plan.title}?`)) return;
                                try {
                                  const currentPlans = celebData.membershipPlans.filter((_: any, pI: number) => pI !== idx);
                                  await setDoc(doc(db, 'celebrityProfiles', user!.uid), {
                                    membershipPlans: currentPlans
                                  }, { merge: true });
                                  setCelebData({ ...celebData, membershipPlans: currentPlans });
                                  triggerToast('Membership Plan Deleted Successfully');
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="py-2 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-3 py-16 text-center border border-dashed border-white/5 rounded-3xl text-sans">
                        <CreditCard className="mx-auto mb-3 text-white/15" size={32} />
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs mb-1">bespoke tiers empty</p>
                        <p className="text-white/20 text-[10px]">Utilize the "+ Create Plan" layout to populate bespoke membership options.</p>
                      </div>
                    )}
                  </div>

                  {/* Approved Fan Cards Directory */}
                  <div className="mt-12 space-y-6">
                    <h3 className="text-xl font-display font-bold uppercase tracking-widest text-white italic">Approved Members Directory</h3>
                    <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-4">
                      {memberships.filter((m: any) => m.status === 'approved').length > 0 ? (
                        memberships.filter((m: any) => m.status === 'approved').map((m: any) => (
                          <div key={m.id} className="p-4 sm:p-5 bg-black/30 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-sans min-w-0 w-full">
                            <div className="flex items-center gap-4 text-left min-w-0 flex-1 w-full md:w-auto">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 font-mono text-xs font-black uppercase shrink-0">
                                ✓
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-white text-sm sm:text-md tracking-tight uppercase flex flex-wrap items-center gap-x-2 gap-y-1 break-all overflow-wrap-anywhere">
                                  <span>{m.fanName || 'Verified Elite Fan'}</span>
                                  <span className="text-[9px] bg-primary/15 text-primary tracking-widest px-2 py-0.5 rounded border border-primary/20 shrink-0">{m.tierTitle || 'Custom Plan'}</span>
                                </h4>
                                <p className="text-[10px] text-white/40 font-mono italic mt-1 font-bold flex flex-wrap gap-x-1.5 items-center">
                                  <span>Price: ${m.price}</span>
                                  <span>•</span>
                                  <span>Method: {m.paymentMethod?.toUpperCase()}</span>
                                  <span>•</span>
                                  <span>Date: {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Active'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
                              {/* Show thumbnail of the uploaded fan card if exists */}
                              {m.fanCardImage && (
                                <a 
                                  href={m.fanCardImage} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="w-12 h-12 bg-white/5 border border-white/15 rounded-xl overflow-hidden block shrink-0 cursor-pointer flex items-center justify-center text-sans text-[8px] font-black uppercase text-center"
                                >
                                  {m.fanCardImage.toLowerCase().endsWith('.pdf') ? (
                                    <span className="text-red-400 font-black px-1">PDF ↗</span>
                                  ) : (
                                    <img src={m.fanCardImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  )}
                                </a>
                              )}

                              <label className="px-4 py-2.5 border border-dashed border-white/10 hover:border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all w-full sm:w-auto text-center justify-center shrink-0 cursor-pointer">
                                <UploadCloud size={12} />
                                <span>{uploadingCardId === m.id ? 'Attaching Doc...' : m.fanCardImage ? 'Update Fan Card File' : 'Send Fan Card File'}</span>
                                <input 
                                  type="file" 
                                  accept="image/*,application/pdf" 
                                  className="hidden" 
                                  disabled={uploadingCardId !== null}
                                  onChange={(e) => handleUploadFanCardImage(m.id, e.target.files?.[0])} 
                                />
                              </label>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-black/10">
                          <p className="text-white/25 text-xs font-bold uppercase tracking-widest">No active fan cards issued in directory database yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pending Fan-Card Approvals list */}
                  <div className="mt-12 space-y-6">
                    <h3 className="text-xl font-display font-bold uppercase tracking-widest text-white italic">Pending Fan Card Approvals</h3>
                    <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-4">
                      {memberships.filter((m: any) => m.status === 'pending').length > 0 ? (
                        memberships.filter((m: any) => m.status === 'pending').map((m: any) => (
                          <div key={m.id} className="p-4 sm:p-5 bg-black/30 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-w-0 w-full">
                            <div className="flex items-center gap-4 text-left min-w-0 flex-1 w-full md:w-auto">
                              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-mono text-xs font-black uppercase shrink-0 animate-pulse">
                                VIP
                              </div>
                              <div className="font-sans min-w-0 flex-1">
                                <h4 className="font-bold text-white text-sm sm:text-md tracking-tight uppercase flex flex-wrap items-center gap-x-2 gap-y-1 break-all overflow-wrap-anywhere">
                                  <span>{m.fanName || 'Elite Fan Account'}</span>
                                  <span className="text-[9px] bg-primary/15 text-primary tracking-widest px-2 py-0.5 rounded border border-primary/20 shrink-0">{m.tierTitle || 'Custom Plan'}</span>
                                </h4>
                                <p className="text-[10px] text-white/40 font-mono italic mt-1 font-bold flex flex-wrap gap-x-1.5 items-center">
                                  <span>Price: ${m.price}</span>
                                  <span>•</span>
                                  <span>Method: {m.paymentMethod?.toUpperCase()}</span>
                                  <span>•</span>
                                  <span>Date: {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Awaiting sync'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto font-sans justify-end">
                              {m.paymentProof && (
                                <a 
                                  href={m.paymentProof} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 border border-white/10 hover:border-primary/40 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1 shrink-0"
                                >
                                  👁 Receipt Proof
                                </a>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="px-3 py-2 border border-dashed border-white/10 hover:border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all">
                                  <UploadCloud size={11} />
                                  <span>{uploadingCardId === m.id ? 'Attaching...' : 'Upload & Approve'}</span>
                                  <input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    className="hidden" 
                                    disabled={uploadingCardId !== null}
                                    onChange={(e) => handleUploadFanCardImage(m.id, e.target.files?.[0])} 
                                  />
                                </label>

                                <button 
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'memberships', m.id), { status: 'approved' });
                                      triggerToast('Fan Card Membership Approved');
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Approve Only
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (!confirm('Reject this membership proof?')) return;
                                    try {
                                      await updateDoc(doc(db, 'memberships', m.id), { status: 'rejected' });
                                      triggerToast('Membership proof rejected');
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 font-extrabold rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-black/10">
                          <p className="text-white/25 text-xs font-bold uppercase tracking-widest">No pending fan card approvals in verification queue</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Donations Management Tab */}
              {activeTab === 'donations' && !isLocked && (
                <div className="space-y-6 text-left">
                  <h3 className="text-xl font-display font-bold uppercase tracking-tighter italic">Charity Ledger</h3>
                  <div className="bg-slate-900/40 p-4 sm:p-6 md:p-8 border border-white/5 rounded-[2.5rem] space-y-4">
                    {donations.length > 0 ? donations.map(d => (
                      <div key={d.id} className="p-4 sm:p-5 bg-black/30 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-w-0 w-full">
                        <div className="flex items-start gap-4 text-left min-w-0 flex-1 w-full md:w-auto">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold uppercase shrink-0">
                            <Heart size={18} />
                          </div>
                          <div className="font-sans min-w-0 flex-1 text-left">
                            <h4 className="font-bold text-white text-md tracking-tight uppercase truncate" title={d.fanName || 'Anonymous Fan'}>
                              {d.fanName || 'Anonymous Fan'}
                            </h4>
                            <p className="text-[10px] text-white/40 font-mono italic mt-0.5 break-all max-w-full flex flex-wrap gap-x-1 gap-y-0.5">
                              <span className="break-all">{d.fanEmail}</span>
                              <span>•</span>
                              <span>{d.paymentMethod?.toUpperCase()}</span>
                              <span>•</span>
                              <span>{d.charityType === 'edu' ? "Education" : d.charityType === 'env' ? "Environment" : "Healthcare"}</span>
                            </p>
                            {d.paymentProof && (
                              <div className="mt-2">
                                <a 
                                  href={d.paymentProof} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline font-extrabold uppercase tracking-wider flex items-center gap-1"
                                >
                                  <span>View Verification Proof Snapshot</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto font-sans justify-between md:justify-end shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-mono font-black text-white">${d.amount}</p>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              d.status === 'approved' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {d.status}
                            </span>
                          </div>
                          {d.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                await updateDoc(doc(db, 'donations', d.id), { status: 'approved' });
                                alert('Donation verification approved!');
                              }}
                              className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                        <Heart className="mx-auto mb-3 text-white/10 animate-pulse" size={32} />
                        <p className="text-white/25 font-bold uppercase tracking-widest text-xs">No active fan charity pledges found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. Referral System Tab */}
              {activeTab === 'referrals' && (
                isLocked ? (
                  <div className="space-y-6 text-left font-sans">
                    <h3 className="text-xl font-display font-bold uppercase tracking-tighter italic">Referral Distribution Center</h3>
                    <div className="bg-slate-900/40 p-10 border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center py-16">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
                        <Lock size={24} />
                      </div>
                      <h4 className="text-lg sm:text-xl font-display font-bold text-white uppercase tracking-tight mb-2">Referral System Locked</h4>
                      <p className="max-w-md text-white/50 text-xs sm:text-sm leading-relaxed mb-8">
                        Your permanent smart referral code generation is currently disabled. To activate automated referral tracking and obtain your public access invite URL, you must submit a verification pledge deposit to unlock full VIP privileges.
                      </p>
                      <button 
                        onClick={() => setActiveTab('upgrade')} 
                        className="px-8 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer shadow-lg shadow-primary/10 animate-pulse"
                      >
                        Unlock Referrals Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 text-left font-sans">
                    <h3 className="text-xl font-display font-bold uppercase tracking-tighter italic">Referral Distribution Center</h3>
                    <div className="bg-slate-900/40 p-10 border border-white/5 rounded-[2.5rem] space-y-6">
                      <div>
                        <h4 className="font-extrabold text-white text-md uppercase tracking-wider">Your Permanent Referral Vector</h4>
                        <p className="text-[10px] text-white/40 font-bold uppercase mt-1 leading-relaxed">Earn automatic reward shares of every registered user booking with your system code.</p>
                      </div>
                      
                      <div className="p-4 sm:p-6 bg-black/40 rounded-3xl border border-dashed border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 w-full overflow-hidden">
                        <div className="w-full min-w-0 overflow-hidden text-center sm:text-left">
                          <p className="text-xs sm:text-sm font-mono text-primary/80 truncate break-all select-all block leading-relaxed">
                            {getDynamicReferralLink(celebData?.referralLink)}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(getDynamicReferralLink(celebData?.referralLink));
                            alert('Referral committed to clipboard!');
                          }}
                          className="w-full sm:w-auto shrink-0 py-3 px-6 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform"
                        >
                          Copy link
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                          <p className="text-[10px] uppercase font-black text-white/30 tracking-wider">Total Sign Ups (Realtime)</p>
                          <p className="text-3xl font-display font-black text-white mt-1.5">{referredUsers.length}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/20 mt-1">Users registered with your code</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                          <p className="text-[10px] uppercase font-black text-white/30 tracking-wider">Active VIP Referrals (Realtime)</p>
                          <p className="text-3xl font-display font-black text-emerald-400 mt-1.5">
                            {referredUsers.filter(u => {
                              const uid = u.uid || u.id;
                              const hasBooking = bookings.some(b => b.fanId === uid);
                              const hasMembership = memberships.some(m => m.fanId === uid);
                              const hasDonation = donations.some(d => d.fanId === uid);
                              return hasBooking || hasMembership || hasDonation;
                            }).length}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/20 mt-1">Users who booked, donated, or joined plans</p>
                        </div>
                      </div>

                      {/* Roster of referred users */}
                      <div className="pt-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 text-left">Referred Signups Directory</h4>
                        {referredUsers.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {referredUsers.map((ru, idx) => {
                              const uid = ru.uid || ru.id;
                              const isVip = 
                                bookings.some(b => b.fanId === uid) ||
                                memberships.some(m => m.fanId === uid) ||
                                donations.some(d => d.fanId === uid);
                              return (
                                <div key={uid || idx} className="p-3 bg-black/20 border border-white/5 rounded-xl flex justify-between items-center text-xs min-w-0">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center font-bold text-[9px] text-white/60 shrink-0">
                                      {(ru.fullName || ru.email || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="text-left min-w-0">
                                      <p className="font-bold text-white/80 truncate" title={ru.fullName || 'Anonymous Fan'}>{ru.fullName || 'Anonymous Fan'}</p>
                                      <p className="text-[10px] text-white/30 font-mono truncate break-all" title={ru.email || ''}>{ru.email || 'hidden'}</p>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                    isVip ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/40'
                                  }`}>
                                    {isVip ? 'Activated' : 'Pending Action'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/20 uppercase font-black tracking-wider py-4 mt-2">No referred signups in system directories yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* 9. Chats / Messages Tab */}
              {activeTab === 'chats' && !isLocked && (() => {
                const handleChatSendMessage = async (e?: React.FormEvent) => {
                  if (!activeNewMessage.trim() || !user || !chatTarget) return;
                  e?.preventDefault();
                  
                  const text = activeNewMessage;
                  setActiveNewMessage('');
                  setAiSuggestions([]);
                  setAiStep('confirm');
                  
                  try {
                    // Set typing status to false
                    await setDoc(doc(db, 'chats', chatTarget.id), {
                      typing: { [user.uid]: false }
                    }, { merge: true });

                    await addDoc(collection(db, `chats/${chatTarget.id}/messages`), {
                      senderId: user.uid,
                      text: text,
                      timestamp: serverTimestamp(),
                      seen: false
                    });

                    await setDoc(doc(db, 'chats', chatTarget.id), {
                      lastMessage: text,
                      lastTimestamp: serverTimestamp()
                    }, { merge: true });
                  } catch (err) {
                    console.error('Send error:', err);
                  }
                };

                const handleChatInputChange = (val: string) => {
                  setActiveNewMessage(val);
                  if (!chatTarget?.id || !user) return;
                  
                  setDoc(doc(db, 'chats', chatTarget.id), {
                    typing: { [user.uid]: true }
                  }, { merge: true });

                  if ((window as any).celebTypingTimeout) clearTimeout((window as any).celebTypingTimeout);
                  (window as any).celebTypingTimeout = setTimeout(() => {
                    if (chatTarget?.id) {
                      setDoc(doc(db, 'chats', chatTarget.id), {
                        typing: { [user.uid]: false }
                      }, { merge: true });
                    }
                  }, 2000);
                };

                const handleChatImageUpload = async (e: any) => {
                  const file = e.target.files[0];
                  if (!file || !user || !chatTarget) return;
                  setActiveUploading(true);
                  try {
                    const url = await uploadToCloudinary(file);
                    await addDoc(collection(db, `chats/${chatTarget.id}/messages`), {
                      senderId: user.uid,
                      mediaUrl: url,
                      timestamp: serverTimestamp(),
                      seen: false
                    });
                  } catch (err: any) {
                    alert('Image upload failed: ' + err.message);
                  } finally {
                    setActiveUploading(false);
                  }
                };

                const handleOpenAiAssistant = () => {
                  if (celebData?.isLocked !== false) {
                    triggerToast("AI Smart Reply is only available to VIP verified users.");
                    return;
                  }

                  const isPremium = celebData?.isAiSubscribed === true || celebData?.aiPremium === true;
                  const limit = isPremium ? 50 : 5;
                  if (aiUsageCount >= limit) {
                    triggerToast(`Daily AI limit reached (${aiUsageCount}/${limit}). Upgrade to Premium AI for 50 daily requests.`);
                    return;
                  }

                  if (activeMessages.length < 1) {
                    triggerToast("Not enough conversation data to analyze.");
                    return;
                  }

                  if (aiSuggestions.length > 0) {
                    setAiError(null);
                    setAiStep('suggestions');
                    setShowAiModal(true);
                    return;
                  }

                  setAiSuggestions([]);
                  setAiError(null);
                  setAiStep('confirm');
                  setShowAiModal(true);
                };

                const handleFetchSmartReplies = async (isRegen: boolean = false) => {
                  if (!user || !chatTarget?.id) return;
                  
                  if (cooldownRemaining > 0) {
                    const cdMsg = `Cooldown active. Please wait ${cooldownRemaining} seconds before requesting suggestions again.`;
                    triggerToast(cdMsg);
                    setAiStep('cooldown');
                    return;
                  }

                  const isPremium = celebData?.isAiSubscribed === true || celebData?.aiPremium === true;
                  const limit = isPremium ? 50 : 5;
                  
                  if (isRegen) {
                    const remaining = limit - aiUsageCount;
                    if (remaining < 2) {
                      const errMsg = `At least 2 quota points are required to regenerate suggestions. You only have ${remaining} left.`;
                      setAiError(errMsg);
                      triggerToast(errMsg);
                      return;
                    }
                  } else {
                    if (aiUsageCount >= limit) {
                      const errMsg = `Daily AI limit reached (${aiUsageCount}/${limit}). Upgrade to Premium AI for 50 daily requests.`;
                      setAiError(errMsg);
                      triggerToast(errMsg);
                      return;
                    }
                  }

                  setAiLoading(true);
                  setAiError(null);
                  setAiStep('suggestions');

                  // Create AbortController to implement a strict 8-second request timeout failsafe
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => {
                    controller.abort();
                  }, 8000);

                  try {
                    const token = await user.getIdToken();
                    const baseUrl = import.meta.env.VITE_API_URL || "";
                    const response = await fetch(`${baseUrl}/api/gemini/suggest-replies`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        chatId: chatTarget.id,
                        messages: activeMessages,
                        celebId: user.uid,
                        isRegenerate: isRegen,
                        previousSuggestions: aiSuggestions
                      }),
                      signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);

                    // Robustly detect common routing situations on static hosting platforms like Vercel
                    const contentType = response.headers.get("content-type") || "";
                    if (!response.ok || contentType.includes("text/html")) {
                      throw new Error(`Invalid response content format from active router (status: ${response.status}). Expected application/json.`);
                    }
                    
                    const data = await response.json();
                    console.log("Client API raw response:", data);
                    
                    const list = data?.replies || data?.suggestions;
                    if (Array.isArray(list) && list.length > 0) {
                      setAiSuggestions(list);
                      const resolvedProvider = data.provider === "demo" ? "demo" : (data.provider === "pre-live" ? "pre-live" : (data.provider || "live"));
                      setAiProvider(resolvedProvider);
                      setIsFallbackActivated(resolvedProvider === "demo" || !!data.fallback);
                      
                      const maxLimit = isPremium ? 50 : 5;
                      let serverCount = data.requestCountToday !== undefined ? data.requestCountToday : aiUsageCount;
                      const serverLimit = data.maxDailyRequests !== undefined ? data.maxDailyRequests : maxLimit;

                      if (resolvedProvider === "pre-live") {
                        setAiUsageCount(serverCount);
                        setUserAiUsage((curr: any) => ({
                          ...curr,
                          requestCountToday: serverCount,
                          maxDailyRequests: serverLimit,
                          remainingRequests: Math.max(0, serverLimit - serverCount),
                          activeProvider: "pre-live"
                        }));
                        triggerToast("Cached AI Suggestions loaded (No quota deducted).");
                      } else {
                        if (data.requestCountToday === undefined) {
                          serverCount = isRegen ? (aiUsageCount + 2) : (aiUsageCount + 1);
                        }
                        setAiUsageCount(serverCount);
                        setUserAiUsage((curr: any) => ({
                          ...curr,
                          requestCountToday: serverCount,
                          maxDailyRequests: serverLimit,
                          remainingRequests: Math.max(0, serverLimit - serverCount),
                          activeProvider: resolvedProvider
                        }));
                        if (isRegen) {
                          triggerToast("AI Suggestions regenerated. 2 AI quotas deducted.");
                        } else {
                          triggerToast("Live AI Suggestions loaded. 1 AI quota deducted.");
                        }
                      }
                    } else {
                      const errMsg = data?.error || "AI replies temporarily unavailable. Try again.";
                      throw new Error(errMsg);
                    }
                  } catch (err: any) {
                    clearTimeout(timeoutId);
                    console.warn("⚠️ Fetch smart replies had issue or timed out, executing native fallback rule mechanics:", err);
                    
                    // Native client-side dynamic fallback generator prevents infinite loader situations on Vercel
                    const lastMsg = activeMessages && activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null;
                    const textToAnalyze = (lastMsg?.text || lastMsg?.content || lastMsg?.mediaUrl || "").toLowerCase();
                    
                    let fallbackRepo: string[] = [];
                    if (textToAnalyze.includes("hello") || textToAnalyze.includes("hi") || textToAnalyze.includes("hey") || textToAnalyze.includes("good morning") || textToAnalyze.includes("good evening")) {
                      fallbackRepo = [
                        "Hello! It is so incredible to hear from you today. How can I make your day special?",
                        "Hi support! Thank you so much for reaching out on my official link. What would you love to talk about today?",
                        "Hey! So glad you connected on my official private line. Sending you warm thoughts and wishes!",
                        "Hi there! It's an honor to have you with me on my personal platform. How are you doing today?",
                        "Hello! Thank you so much for booking/interacting with me here. What can I do to put a smile on your face?"
                      ];
                    } else if (textToAnalyze.includes("price") || textToAnalyze.includes("how much") || textToAnalyze.includes("cost") || textToAnalyze.includes("book") || textToAnalyze.includes("rate") || textToAnalyze.includes("video") || textToAnalyze.includes("meeting")) {
                      fallbackRepo = [
                        "I would be absolutely thrilled to jump on a direct video session with you! Feel free to review my booking options on the Booking tab.",
                        "We can set up an authentic video link on my calendar. Check out my hourly rate and open slots right inside the Booking section.",
                        "Scheduling rates are visible under the Book tab here. Choose a time that works best and we will chat face-to-face!",
                        "I'd love to lock in our private video call! You can see the booking options and open hours on your dashboard.",
                        "My pricing and details are fully customizable under the Book Session tab. Can't wait for us to interact!"
                      ];
                    } else if (textToAnalyze.includes("card") || textToAnalyze.includes("member") || textToAnalyze.includes("tier") || textToAnalyze.includes("join") || textToAnalyze.includes("gold") || textToAnalyze.includes("silver") || textToAnalyze.includes("platinum")) {
                      fallbackRepo = [
                        "Staying connected with my best fans means the world to me. Take a look at the custom Fan Cards on your dashboard!",
                        "Unlocking an official Fan Card grants you exclusive access and direct messages with me. Check out the fan card tiers!",
                        "My active Fan Cards are fully configured right here on the dashboard. Choose a tier that fits you best!",
                        "Choosing a premium fan membership allows us to text directly and share behind-the-scenes content securely.",
                        "You can support my creative journey and unlock elite messages through the Fan Cards section. Looking forward to it!"
                      ];
                    } else if (textToAnalyze.includes("payout") || textToAnalyze.includes("pay") || textToAnalyze.includes("payment") || textToAnalyze.includes("transfer") || textToAnalyze.includes("bank") || textToAnalyze.includes("account") || textToAnalyze.includes("dollar") || textToAnalyze.includes("naira") || textToAnalyze.includes("ngn")) {
                      fallbackRepo = [
                        "For standard profiles, you can complete escrow deposit transfers securely using OPAY or configured bank accounts.",
                        "The billing page accepts bank wire transfers, crypto wallets, and gift card uploads. Check active escrow payment methods.",
                        "All account activation fees and subscriber dues are handled securely by administrative escrow verification.",
                        "Simply complete your transaction using the accounts, and upload a screenshot of your payment slip right here.",
                        "Our backend team verifies bank deposit receipts instantly, so your access will pop up premium tools immediately!"
                      ];
                    } else if (textToAnalyze.includes("love") || textToAnalyze.includes("fan") || textToAnalyze.includes("big fan") || textToAnalyze.includes("idol") || textToAnalyze.includes("admire") || textToAnalyze.includes("support")) {
                      fallbackRepo = [
                        "Your beautiful words and endless support warm my heart! Thank you for being such an extraordinary fan.",
                        "Honestly, supporters like you are the entire reason I do what I do! Sending you my ultimate love and appreciation.",
                        "Thank you for standing by me through thick and thin! You are a true trooper, and I'm deeply grateful to have you here.",
                        "I am incredibly blessed to have someone so kind and positive supporting my journey. Wishing you the absolute best!",
                        "I see your messages and support, and they mean the world to me. Stay creative and stay safe!"
                      ];
                    } else {
                      fallbackRepo = [
                        "Thank you so much for your amazing support! It keeps me going every single day.",
                        "I'm currently busy with production and creative sessions, but my team and I review these lines carefully. Let's schedule a call!",
                        "Warmest regards from my desk! You are a true supporter, and I am highly blessed to have you here.",
                        "I'm super thrilled to receive your message. Hope your week is off to a miraculous, wonderful start!",
                        "Let's make sure we schedule some direct calendar time face-to-face. Checking out standard booking rates is a great start!"
                      ];
                    }

                    // Slice the fallback suggestion list to desired size
                    const fallbackSize = isPremium ? 5 : 3;
                    const finalSugs = fallbackRepo.slice(0, fallbackSize);
                    
                    setAiSuggestions(finalSugs);
                    setAiProvider("demo");
                    setIsFallbackActivated(true);
                    
                    // Show helpful educational message
                    triggerToast("Using local Smart Reply fallback (Backend offline/unreachable).");
                  } finally {
                    setAiLoading(false);
                  }
                };

                const handleSelectSuggestion = (reply: string) => {
                  if (!user) return;
                  setActiveNewMessage(reply);
                  setAiSuggestions([]);
                  setAiStep('confirm');
                  setShowAiModal(false);
                  triggerToast("AI Suggestion applied.");
                };

                return (
                  <div className="space-y-6 text-left">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-display font-bold uppercase tracking-tighter italic">Vapor Messaging Core</h3>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time Encrypted Fan Link Ingress</p>
                      </div>
                      {chatTarget && (
                        <button
                          onClick={() => setChatTarget(null)}
                          className="md:hidden px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-white"
                        >
                          ← Core List
                        </button>
                      )}
                    </div>

                    {conversationsLoading ? (
                      <div className="bg-slate-900/40 p-20 border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-white/40 mt-4">Synchronizing direct lines...</span>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem]">
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl text-sans">
                          <MessageSquare className="mx-auto mb-3 text-white/10" size={32} />
                          <p className="text-white/30 font-bold uppercase tracking-widest text-xs animate-pulse">Waiting for fresh connections</p>
                          <p className="text-white/20 text-[10px] uppercase tracking-wider font-semibold mt-1">Accept fan card enrollments or checkups to begin stream feeds.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px] relative">
                        {/* Conversation List segment */}
                        <div className={`md:col-span-1 bg-slate-950/40 border border-white/5 rounded-[2rem] p-4 flex flex-col gap-3 overflow-y-auto ${chatTarget ? 'hidden md:flex' : 'flex'}`}>
                          <p className="text-[9px] uppercase font-black text-white/30 tracking-widest px-2 mb-1">Fan Ingress Ports</p>
                          {conversations.map((conv) => {
                            const isSelected = chatTarget?.id === conv.id;
                            return (
                              <button
                                key={conv.id}
                                onClick={() => setChatTarget(conv)}
                                className={`w-full p-4 rounded-xl text-left border flex items-center gap-3 transition-all ${
                                  isSelected
                                    ? 'bg-primary border-primary text-black'
                                    : 'bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/10'
                                }`}
                              >
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border uppercase ${
                                  isSelected ? 'bg-black text-primary border-black' : 'bg-primary/20 text-primary border-primary/10'
                                }`}>
                                  {conv.fanName?.[0] || 'V'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs uppercase truncate leading-snug">{conv.fanName}</p>
                                  <p className={`text-[10px] truncate mt-1 leading-none ${isSelected ? 'text-black/60 font-semibold' : 'text-white/40'}`}>
                                    {conv.lastMessage || 'Direct line connected.'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Direct Messenger interface */}
                        <div className={`md:col-span-2 flex flex-col justify-between border border-white/5 bg-slate-950/40 rounded-[2rem] overflow-hidden ${!chatTarget ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                          {chatTarget ? (
                            <>
                              {/* Header */}
                              <div className="bg-white/[0.02] border-b border-white/5 p-4 flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shrink-0 uppercase">
                                    {chatTarget.fanName?.[0] || 'V'}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-wider text-white">{chatTarget.fanName}</p>
                                    <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-0.5">DIRECT ENCRYPTED TIE</p>
                                  </div>
                                </div>

                                {/* Floating AI Smart Reply Button */}
                                <div className="flex items-center gap-2">
                                  <div className="font-mono text-[9px] bg-black/40 border border-white/5 py-1.5 px-3 rounded-lg text-white/60">
                                    {(() => {
                                      const isPremium = celebData?.isAiSubscribed === true || celebData?.aiPremium === true;
                                      const limit = isPremium ? 50 : 5;
                                      const remaining = Math.max(0, limit - aiUsageCount);
                                      return `Requests Remaining: ${remaining} / ${limit}`;
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleOpenAiAssistant}
                                    title="AI Assistant Smart Reply"
                                    disabled={aiUsageCount >= (celebData?.isAiSubscribed === true || celebData?.aiPremium === true ? 50 : 5)}
                                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 group relative border cursor-pointer ${
                                      aiUsageCount >= (celebData?.isAiSubscribed === true || celebData?.aiPremium === true ? 50 : 5)
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/15 cursor-not-allowed opacity-55'
                                        : 'bg-primary/15 border-primary/30 text-primary hover:text-white hover:bg-primary/25 shadow-[0_0_15px_rgba(0,255,163,0.15)] hover:shadow-[0_0_25px_rgba(0,255,163,0.35)]'
                                    }`}
                                  >
                                    <Zap size={14} className={`${aiUsageCount >= (celebData?.isAiSubscribed === true || celebData?.aiPremium === true ? 50 : 5) ? 'text-red-500' : 'fill-primary text-primary'} transition-transform duration-300 group-hover:scale-115 group-hover:rotate-[15deg] group-hover:text-white`} />
                                    <span className="absolute right-0 bottom-full mb-2 hidden group-hover:inline-block bg-black/90 border border-white/10 text-[9px] font-black uppercase tracking-wider text-primary px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-20">
                                      AI Assist Smart Reply
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Conversations Stream */}
                              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/10">
                                {activeMessages.map((msg, i) => {
                                  const isMe = msg.senderId === user.uid;
                                  return (
                                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] p-4 rounded-xl text-xs font-semibold leading-relaxed shadow-sm text-left ${
                                        isMe
                                          ? 'bg-primary text-black rounded-tr-none'
                                          : 'bg-white/5 text-white rounded-tl-none border border-white/5'
                                      }`}>
                                        {msg.text && <p className="break-words font-medium">{msg.text}</p>}
                                        {msg.mediaUrl && <img src={msg.mediaUrl} className="mt-2 rounded-lg max-h-40 w-full object-cover" referrerPolicy="no-referrer" />}
                                        <div className={`text-[7.5px] mt-1.5 uppercase font-black tracking-widest opacity-60 flex items-center gap-1 ${isMe ? 'text-black' : 'text-white'}`}>
                                          <span>{msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                          {isMe && (
                                            <span className="font-extrabold uppercase text-[7px] tracking-widest">
                                              {msg.seen ? '• Read' : '• Sent'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {activeTargetTyping && (
                                  <div className="flex justify-start">
                                    <div className="bg-white/5 border border-white/5 text-primary text-[9px] font-black uppercase tracking-wider py-2 px-3.5 rounded-xl rounded-tl-none flex items-center gap-1.5">
                                      <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                                      <span className="h-1 w-1 rounded-full bg-primary animate-bounce delay-150" />
                                      <span className="h-1 w-1 rounded-full bg-primary animate-bounce delay-300" />
                                      <span>Fan typing</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Inputs segment */}
                              <form onSubmit={handleChatSendMessage} className="bg-white/[0.01] border-t border-white/5 p-4 flex gap-2 items-center">
                                <label className="h-11 w-11 bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center cursor-pointer shrink-0 transition-all">
                                  <Send size={15} className="rotate-[-45deg] scale-x-[-1]" />
                                  <input type="file" className="hidden" accept="image/*" disabled={activeUploading} onChange={handleChatImageUpload} />
                                </label>
                                <input
                                  type="text"
                                  value={activeNewMessage}
                                  onChange={e => handleChatInputChange(e.target.value)}
                                  placeholder="Type verified response..."
                                  className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-none focus:border-primary/50"
                                />
                                <button
                                  type="submit"
                                  disabled={activeUploading}
                                  className="h-11 px-3 sm:px-5 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10 hover:shadow-primary/20 disabled:opacity-55 shrink-0"
                                >
                                  <span className="hidden sm:inline">Send</span> <Send size={12} />
                                </button>
                              </form>
                            </>
                          ) : (
                            <div className="py-20 text-center text-sans space-y-3 m-auto">
                              <MessageSquare className="mx-auto text-white/10 animate-pulse" size={40} />
                              <p className="text-white/45 text-[11px] font-black uppercase tracking-[0.25em]">Inbox Interrogation Ready</p>
                              <p className="text-white/20 text-[9px] uppercase tracking-[0.1em] max-w-xs leading-relaxed">Select an active fan dossier from the port listings column to inspect message histories and dispatch real-time responses.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {showAiModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-sans">
                          {/* Backdrop overlay */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                              if (!aiLoading) setShowAiModal(false);
                            }}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                          />
                          
                          {/* Modal Container */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-[0_0_50px_rgba(0,255,163,0.1)] overflow-hidden z-10"
                          >
                            {/* Premium Top Border Accent */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                            <div className="flex flex-col gap-6 text-left">
                              {/* Header Row */}
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                                    <Zap size={18} className="fill-primary text-primary animate-pulse" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-display font-black uppercase tracking-tight text-white leading-none">AI Assistant</h3>
                                    <p className="text-[9px] text-primary font-black uppercase tracking-wider mt-1.5">Direct Line Co-Pilot</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!aiLoading) setShowAiModal(false);
                                  }}
                                  className="p-1.5 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                                  disabled={aiLoading}
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              {aiStep === 'cooldown' ? (
                                <div className="py-6 text-center space-y-4 animate-fadeIn">
                                  <div className="flex justify-center">
                                    <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 animate-pulse">
                                      <Zap size={24} className="fill-red-500 text-red-500" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-red-400 font-extrabold uppercase text-sm tracking-widest">Wait until cooldown ends.</h4>
                                    <p className="text-[10px] text-white/40 uppercase font-black tracking-wider">Anti-Abuse protection is active</p>
                                  </div>
                                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
                                    {cooldownRemaining > 0 ? (
                                      <p className="text-2xl font-mono font-black text-rose-450 animate-pulse">
                                        {Math.floor(cooldownRemaining / 60)}m {cooldownRemaining % 60}s
                                      </p>
                                    ) : (
                                      <p className="text-2xl font-mono font-black text-teal-400 animate-pulse">
                                        Ready!
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex justify-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (aiSuggestions.length > 0) {
                                          setAiStep('suggestions');
                                        } else {
                                          setAiStep('confirm');
                                        }
                                      }}
                                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                      ← Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowAiModal(false)}
                                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                      Close Co-Pilot
                                    </button>
                                  </div>
                                </div>
                              ) : aiStep === 'confirm' ? (
                                <>
                                  <div className="space-y-3">
                                    <p className="text-xs text-white/80 leading-relaxed font-semibold">
                                      AI will analyze the last 3 conversation messages and generate {(celebData?.isAiSubscribed === true || celebData?.aiPremium === true) ? '5' : '3'} smart reply suggestions.
                                    </p>
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                      <p className="text-[10px] text-white/40 leading-relaxed font-semibold">
                                        <span className="text-primary font-black uppercase tracking-wider mr-1">Privacy Notice:</span>
                                        Conversation data will temporarily be processed for AI suggestions. No data is stored or logged. Your dialogue integrity remains secure.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-3 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAiModal(false)}
                                      className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 text-white/80 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFetchSmartReplies()}
                                      className="px-6 py-3 bg-primary text-black hover:scale-[1.02] active:scale-[0.98] rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all cursor-pointer"
                                    >
                                      Continue
                                    </button>
                                  </div>
                                </>
                              ) : aiStep === 'suggestions' ? (
                                <div className="space-y-4">
                                  {aiLoading ? (
                                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
                                      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                      <div>
                                        <p className="text-xs text-white font-bold uppercase tracking-widest">Analyzing conversation...</p>
                                        <p className="text-[9px] text-white/45 uppercase tracking-wider font-semibold mt-1">Consulting Bookaceleb AI Assistant...</p>
                                      </div>
                                    </div>
                                  ) : aiError ? (
                                    <div className="py-6 text-center space-y-4">
                                      <p className="text-xs text-red-400 font-bold uppercase tracking-wider">{aiError}</p>
                                      <button
                                        type="button"
                                        onClick={() => setAiStep('confirm')}
                                        className="px-4 py-2 bg-white/5 border border-white/5 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10"
                                      >
                                        ← Go Back
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] text-primary font-black uppercase tracking-wider">Generated Suggestions</p>
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            aiProvider === 'demo'
                                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                              : aiProvider === 'pre-live'
                                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-pulse font-extrabold'
                                          }`}>
                                            Engine: {
                                              aiProvider === 'demo'
                                                ? 'DEMO-PREVIEW'
                                                : aiProvider === 'pre-live'
                                                ? 'PRE-LIVE'
                                                : 'LIVE'
                                            }
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Click to insert directly into response input bar</p>
                                          <p className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                            aiProvider === 'pre-live' || aiProvider === 'demo'
                                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-black'
                                          }`}>
                                            {aiProvider === 'pre-live' || aiProvider === 'demo' ? 'No quota deducted (cached)' : 'Quota deducted (live request)'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1.5 custom-scrollbar font-sans">
                                        {aiSuggestions.length === 0 ? (
                                          <div className="py-8 px-4 text-center bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                            <p className="text-xs text-white/60 font-medium">No AI suggestions available right now.</p>
                                          </div>
                                        ) : (
                                          aiSuggestions.map((reply, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => handleSelectSuggestion(reply)}
                                              className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 rounded-2xl text-left text-xs font-semibold leading-relaxed text-white hover:text-primary transition-all active:scale-[0.98] flex items-start gap-3 group/item cursor-pointer"
                                            >
                                              <span className="h-5 w-5 rounded-md bg-white/5 border border-white/5 text-[9px] font-extrabold uppercase shrink-0 flex items-center justify-center text-white/50 group-hover/item:bg-primary group-hover/item:text-black group-hover/item:border-primary transition-all">
                                                {idx + 1}
                                              </span>
                                              <span className="flex-1 font-medium select-none">{reply}</span>
                                            </button>
                                          ))
                                        )}
                                      </div>

                                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAiStep('confirm');
                                          }}
                                          className="text-[9px] text-white/40 hover:text-white uppercase font-black tracking-wider transition-all underline decoration-white/20 hover:decoration-white"
                                        >
                                          ← Privacy Notice
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFetchSmartReplies(true)}
                                          className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary text-[9px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all active:scale-95"
                                        >
                                          Regenerate
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : null}

                              {/* Standalone background loading layout when clicked continue */}
                              {aiStep === 'confirm' && aiLoading && (
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center">
                                  <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                  <div>
                                    <p className="text-xs text-white font-bold uppercase tracking-widest animate-pulse">Analyzing conversation...</p>
                                    <p className="text-[9px] text-white/45 uppercase tracking-wider font-semibold mt-1">Consulting Bookaceleb AI Assistant...</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Automatic Reply Manager Card Section */}
                    {!chatTarget && (
                      <div className="bg-slate-950/40 border border-white/5 rounded-[2rem] p-8 space-y-8 mt-10 text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                          <div>
                            <h4 className="text-lg font-display font-black uppercase tracking-tighter text-white italic flex items-center gap-2">
                              <span>🤖 Automatic Reply Manager</span>
                              <span className="text-[10px] bg-primary/10 text-primary font-mono px-2 py-0.5 rounded border border-primary/20 tracking-widest uppercase">Active</span>
                            </h4>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                              Acknowledge fans instantly when you or your team are offline
                            </p>
                          </div>
                          
                          {/* Toggle */}
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] uppercase font-mono font-black tracking-widest transition-colors ${autoReplyEnabled ? 'text-primary' : 'text-white/40'}`}>
                              {autoReplyEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                              className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 relative focus:outline-none ${
                                autoReplyEnabled ? 'bg-primary' : 'bg-white/15'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-black shadow-md transform transition-transform duration-300 ${
                                autoReplyEnabled ? 'translate-x-7' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs font-bold text-white/70">
                          
                          {/* Left Side: Fan Selection & General Switch */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] uppercase font-black text-white/50 tracking-wider mb-3">1. Fan Filter Coverage</h4>
                              
                              <div className="space-y-4 bg-black/30 p-5 rounded-2xl border border-white/10">
                                {/* Apply to All Toggle */}
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={autoReplyApplyToAll}
                                    onChange={(e) => {
                                      setAutoReplyApplyToAll(e.target.checked);
                                    }}
                                    className="h-4 w-4 mt-0.5 rounded border-white/10 bg-black text-primary focus:ring-primary focus:ring-offset-0 focus:outline-none"
                                  />
                                  <div>
                                    <span className="text-white text-xs font-bold uppercase tracking-wider">Select All Fans</span>
                                    <p className="text-[9px] text-white/45 uppercase font-mono font-black tracking-widest mt-0.5 leading-relaxed">
                                      Send automatic answers to any incoming fan message
                                    </p>
                                  </div>
                                </label>

                                {/* Individual Fan Checklist */}
                                {!autoReplyApplyToAll && (
                                  <div className="pt-4 border-t border-white/5 space-y-3">
                                    <p className="text-[9px] uppercase tracking-wider text-white/45 font-black">Specify Target Fans</p>
                                    {conversations.length === 0 ? (
                                      <p className="text-[10px] text-white/30 italic font-medium">No fans currently loaded in ingress channels.</p>
                                    ) : (
                                      <div className="max-h-44 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                                        {conversations.map((conv) => {
                                          const fanId = conv.participants?.find((p: string) => p !== user?.uid) || conv.id;
                                          const isChecked = autoReplySelectedFans.includes(fanId);
                                          return (
                                            <label key={conv.id} className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/10 hover:bg-white/5 rounded-xl cursor-pointer transition-all select-none">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (isChecked) {
                                                    setAutoReplySelectedFans(autoReplySelectedFans.filter(id => id !== fanId));
                                                  } else {
                                                    setAutoReplySelectedFans([...autoReplySelectedFans, fanId]);
                                                  }
                                                }}
                                                className="h-4 w-4 rounded border-white/10 bg-black text-primary focus:ring-primary focus:ring-offset-0 focus:outline-none"
                                              />
                                              <span className="text-white font-medium text-xs font-mono">{conv.fanName || 'Backstage supporter'}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Cooldown Info Label */}
                            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl">
                              <span className="text-[9px] uppercase font-black text-amber-400 tracking-widest flex items-center gap-1.5">
                                ⚠️ Anti-Spam Control Active
                              </span>
                              <p className="text-[10px] text-white/60 font-semibold tracking-wide leading-relaxed mt-2 uppercase">
                                The system enforces a <strong className="text-amber-400">30-minute cooldown per fan conversation</strong>. 
                                Subsequent fan inputs within 30 minutes will not trigger duplicate spam responses, while different fans receive their replies independently.
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Reply Template Selection */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] uppercase font-black text-white/50 tracking-wider mb-3">2. Reply Action Content</h4>
                              
                              <div className="space-y-4 bg-black/30 p-5 rounded-2xl border border-white/10">
                                {/* Built in Selection List */}
                                <div className="space-y-2">
                                  <label className="block text-[9px] uppercase font-black text-white/40 tracking-wider mb-1">Choose Pre-configured Template</label>
                                  <select
                                    value={autoReplySelectedTemplate}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAutoReplySelectedTemplate(val);
                                      if (val.startsWith("built-in-")) {
                                        const index = parseInt(val.replace("built-in-", ""), 10);
                                        setAutoReplyCustomTemplate(BUILT_IN_TEMPLATES[index]);
                                      } else {
                                        const customMatch = customReplies.find(r => r.id === val);
                                        if (customMatch) {
                                          setAutoReplyCustomTemplate(customMatch.message);
                                        } else {
                                          setAutoReplyCustomTemplate("");
                                        }
                                      }
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white font-medium text-xs font-mono"
                                  >
                                    <optgroup label="Core System Templates" className="bg-slate-900 text-white">
                                      <option value="built-in-0">Template 1: Offline Backstage</option>
                                      <option value="built-in-1">Template 2: Assisted Queue</option>
                                      <option value="built-in-2">Template 3: Management Acknowledgement</option>
                                      <option value="built-in-3">Template 4: Extended Standby</option>
                                      <option value="built-in-4">Template 5: High Volume Traffic</option>
                                    </optgroup>
                                    {customReplies.length > 0 && (
                                      <optgroup label="Custom Generated Templates" className="bg-slate-950 text-white text-xs">
                                        {customReplies.map(reply => (
                                          <option key={reply.id} value={reply.id}>Custom: {reply.name}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* Chosen template preview block */}
                                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                                  <span className="text-[8px] uppercase font-black text-white/30 tracking-widest block mb-2">Live Response Output Preview</span>
                                  <p className="text-white text-xs font-medium italic leading-relaxed">
                                    "{autoReplyCustomTemplate || BUILT_IN_TEMPLATES[0]}"
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Custom Replier Creator Section */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-[10px] uppercase font-black text-white/50 tracking-wider">3. Custom Template Pool</h4>
                                {!showCustomReplyForm && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCustomReplyId(null);
                                      setCustomReplyNameInput("");
                                      setCustomReplyMessageInput("");
                                      setShowCustomReplyForm(true);
                                    }}
                                    className="px-2.5 py-1 bg-primary text-black rounded text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all cursor-pointer"
                                  >
                                    + Create Custom
                                  </button>
                                )}
                              </div>

                              {/* List of Custom Replies */}
                              {customReplies.length > 0 && !showCustomReplyForm && (
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                  {customReplies.map((reply) => (
                                    <div key={reply.id} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                                      <div className="max-w-[70%] text-left">
                                        <p className="text-white font-mono font-bold text-xs truncate">{reply.name}</p>
                                        <p className="text-white/40 text-[9px] line-clamp-1 mt-0.5 font-medium leading-normal">{reply.message}</p>
                                      </div>
                                      <div className="flex gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCustomReplyId(reply.id);
                                            setCustomReplyNameInput(reply.name);
                                            setCustomReplyMessageInput(reply.message);
                                            setShowCustomReplyForm(true);
                                          }}
                                          className="text-[9px] font-extrabold uppercase text-primary/85 hover:text-primary transition-colors cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCustomReply(reply.id)}
                                          className="text-[9px] font-extrabold uppercase text-red-400 hover:text-red-550 transition-colors cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Form for Creating/Editing Custom Reply */}
                              {showCustomReplyForm && (
                                <form onSubmit={handleSaveCustomReply} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-primary/20 animate-fade-in text-left">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-primary block text-left">
                                    {editingCustomReplyId ? '🛠️ Edit Custom Template' : '✨ Generate Custom Template'}
                                  </span>
                                  
                                  <div className="space-y-1 text-left">
                                    <label className="text-[8px] uppercase tracking-wider text-white/40 font-black">Reply Name / Title</label>
                                    <input
                                      type="text"
                                      required
                                      value={customReplyNameInput}
                                      onChange={e => setCustomReplyNameInput(e.target.value)}
                                      placeholder="e.g. Backstage Auto Message"
                                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white font-mono text-xs"
                                    />
                                  </div>

                                  <div className="space-y-1 text-left">
                                    <label className="text-[8px] uppercase tracking-wider text-white/40 font-black">Reply Message Content</label>
                                    <textarea
                                      required
                                      rows={3}
                                      value={customReplyMessageInput}
                                      onChange={e => setCustomReplyMessageInput(e.target.value)}
                                      placeholder="Thank you for reaching out..."
                                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white text-xs leading-relaxed"
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowCustomReplyForm(false);
                                        setEditingCustomReplyId(null);
                                        setCustomReplyNameInput("");
                                        setCustomReplyMessageInput("");
                                      }}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 bg-primary text-black rounded text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all cursor-pointer"
                                    >
                                      Save Record
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Footer Actions: Save Configurations */}
                        <div className="flex justify-end pt-6 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleSaveAutoReplySettings}
                            disabled={savingAutoReplyConfig}
                            className="px-8 py-4 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer font-sans text-left"
                          >
                            {savingAutoReplyConfig ? (
                              <>
                                <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Saving Parameters...</span>
                              </>
                            ) : (
                              <span>💾 Save Configuration</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 10. Social Links Tab */}
              {activeTab === 'socials' && !isLocked && (
                <div className="max-w-xl bg-slate-900/40 p-10 border border-white/5 rounded-[2.5rem] text-sans text-left space-y-6">
                  <h3 className="text-xl font-bold uppercase tracking-widest text-white italic">Active Social Network Ties</h3>
                  
                  <div className="space-y-4 text-xs font-bold text-white/60">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-2">WhatsApp Contact Handle</label>
                      <input 
                        type="text"
                        value={celebData?.waLink || ''}
                        onChange={e => setCelebData({...celebData, waLink: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white font-mono" 
                        placeholder="e.g. https://wa.me/234..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-2">Telegram Username Handler</label>
                      <input 
                        type="text"
                        value={celebData?.tgLink || ''}
                        onChange={e => setCelebData({...celebData, tgLink: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white font-mono" 
                        placeholder="e.g. t.me/username"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-2">Instagram Profile link</label>
                      <input 
                        type="text"
                        value={celebData?.instaLink || ''}
                        onChange={e => setCelebData({...celebData, instaLink: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white" 
                        placeholder="e.g. instagram.com/name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-2">TikTok Handler</label>
                      <input 
                        type="text"
                        value={celebData?.tiktokLink || ''}
                        onChange={e => setCelebData({...celebData, tiktokLink: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:border-primary/50 text-white" 
                        placeholder="e.g. tiktok.com/@name"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'celebrityProfiles', user!.uid), {
                            waLink: celebData.waLink || '',
                            tgLink: celebData.tgLink || '',
                            instaLink: celebData.instaLink || '',
                            tiktokLink: celebData.tiktokLink || '',
                            updatedAt: new Date().toISOString()
                          }, { merge: true });
                          triggerToast('Social Links Saved Successfully');
                        } catch (err: any) { alert(err.message); }
                      }}
                      className="py-4 px-8 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      Commit Social Network Ties
                    </button>
                  </div>
                </div>
              )}

              {/* 11. Settings Tab */}
              {activeTab === 'settings' && !isLocked && (
                <div className="max-w-xl bg-slate-900/40 p-10 border border-white/5 rounded-[2.5rem] text-left text-sans space-y-6">
                  <h3 className="text-xl font-bold uppercase tracking-widest text-white italic">Management Protocol</h3>
                  <p className="text-xs text-white/45 leading-relaxed">Modify general display choices or toggle accessibility profiles here. All data flows securely inside state directories.</p>
                  
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">Hide Stage Profile temporarily</p>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">Locks you out of search grids temporarily</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const nextHide = !celebData.isHidden;
                        await setDoc(doc(db, 'celebrityProfiles', user!.uid), { isHidden: nextHide }, { merge: true });
                        setCelebData({...celebData, isHidden: nextHide});
                        triggerToast('Profile Visibility Updated Successfully');
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        celebData?.isHidden ? 'bg-red-540 bg-opacity-90 text-white font-black' : 'bg-primary text-black font-black'
                      }`}
                    >
                      {celebData?.isHidden ? '★ Currently Hidden' : '☆ Currently Visible'}
                    </button>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">Grant AI Profile Access</p>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5 leading-relaxed">Allows the smart reply AI assistant to securely read your booking profile, bio, membership rates, and payment methods to write highly personalized customer support replies.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const nextAi = !celebData?.aiProfileAccess;
                        await setDoc(doc(db, 'celebrityProfiles', user!.uid), { aiProfileAccess: nextAi }, { merge: true });
                        setCelebData({...celebData, aiProfileAccess: nextAi});
                        triggerToast('AI Profile Access Settings Updated Successfully');
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        celebData?.aiProfileAccess ? 'bg-emerald-500 text-black font-black' : 'bg-slate-800 text-white/40'
                      }`}
                    >
                      {celebData?.aiProfileAccess ? '★ Access Enabled' : '☆ Access Disabled'}
                    </button>
                  </div>
                </div>
              )}

              {/* 11b. AI Premium Assist Tab */}
              {activeTab === 'ai-premium' && (
                <AiPremiumScreen 
                  celebData={celebData}
                  setCelebData={setCelebData}
                  user={user}
                  aiUsageCount={aiUsageCount}
                  userAiUsage={userAiUsage}
                  siteSettings={siteSettings}
                />
              )}

              {/* Tutorials Tab */}
              {activeTab === 'tutorials' && (
                <div className="space-y-8 font-sans text-left">
                  <div>
                    <h3 className="text-2xl font-display font-bold uppercase tracking-widest text-white italic mb-2">Video Tutorial Manuals</h3>
                    <p className="text-xs text-white/45 leading-relaxed">Step-by-step masterclasses to configure payout logic, promote elite memberships, and setup bookings.</p>
                  </div>

                  {isLoadingTutorials ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map(n => (
                        <div key={n} className="bg-slate-900/40 border border-white/5 rounded-3xl p-4 space-y-4 animate-pulse">
                          <div className="h-44 bg-white/5 rounded-2xl" />
                          <div className="h-4 bg-white/10 rounded-lg w-3/4" />
                          <div className="h-3 bg-white/5 rounded-lg w-5/6" />
                        </div>
                      ))}
                    </div>
                  ) : tutorials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tutorials.map((tut: any) => (
                        <div key={tut.id} className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col justify-between min-w-0 w-full group hover:border-white/10 transition-all">
                          <div className="p-4 space-y-4">
                            <div className="h-44 bg-black rounded-2xl overflow-hidden relative border border-white/5">
                              <video 
                                src={tut.videoUrl} 
                                controls 
                                preload="metadata"
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="min-w-0 px-1 text-left scrollbar-thin">
                              <h4 className="font-bold text-white text-md tracking-tight truncate break-all" title={tut.title}>{tut.title}</h4>
                              <p className="text-xs text-white/45 font-medium leading-relaxed mt-2 line-clamp-4 break-all">{tut.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-16 text-center bg-slate-900/20 border border-white/5 border-dashed rounded-[2.5rem] space-y-3">
                      <PlayCircle size={44} className="text-white/10 mx-auto animate-pulse" />
                      <p className="text-white/30 text-xs font-black uppercase tracking-widest">No tutorials uploaded yet</p>
                      <p className="text-[10px] text-white/20 leading-relaxed font-semibold max-w-xs mx-auto">Our super administrative support team has not published any custom tutorials yet. Please check back soon.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 12. Upgrade Screen */}
              {activeTab === 'upgrade' && (
                <UpgradeScreen siteSettings={siteSettings} celebId={user?.uid} setActiveTab={setActiveTab} />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {chatTarget && activeTab !== 'chats' && <ChatWidget targetId={chatTarget.id} targetName={chatTarget.fanName} />}
      </main>
      <Toast show={toastShow} message={toastMessage} onClose={() => setToastShow(false)} />

      {/* Floating Support Hub - Mobile & Desktop visible - hidden on chat tab to avoid blocking inputs or when mobile menu is open */}
      {activeTab !== 'chats' && !isMenuOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 text-sans font-sans">
          <span className="text-[8px] uppercase font-black text-white/35 tracking-widest bg-slate-950/90 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">Support Hub</span>
          <div className="flex gap-2.5">
            <a
              href={siteSettings?.whatsappLink || 'https://wa.me/23400000000'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full border border-white/10 hover:border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 flex items-center justify-center shadow-lg hover:scale-115 active:scale-95 transition-all duration-300 group backdrop-blur-md"
              title="WhatsApp Support"
            >
              <PhoneCall size={18} className="group-hover:rotate-12 transition-transform duration-300" />
            </a>
            <a
              href={siteSettings?.telegramLink || 'https://t.me/bookacelebsupport'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full border border-white/10 hover:border-[#0088cc]/30 bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 flex items-center justify-center shadow-lg hover:scale-115 active:scale-95 transition-all duration-300 group backdrop-blur-md"
              title="Telegram Support"
            >
              <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </a>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Extracted Sub-modules
const StatCard = ({ icon, label, value }: any) => (
  <div className="glass shadow-xl rounded-[2rem] p-8 border border-white/5">
    <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/10 rounded-xl text-primary">{icon}</div>
    </div>
    <p className="text-3xl font-display font-medium tracking-tighter mb-1 text-white">{value}</p>
    <p className="text-[10px] uppercase font-black tracking-widest text-white/30 font-sans">{label}</p>
  </div>
);

// Payment Integration Form
const PaymentSettingsModule = ({ celebData, setCelebData, currencySym, triggerToast }: any) => {
  const [payTab, setPayTab] = useState('bank');
  const [loading, setLoading] = useState(false);

  // Bank Form States
  const [bankName, setBankName] = useState(celebData?.payoutBankName || '');
  const [accNo, setAccNo] = useState(celebData?.payoutAccountNo || '');
  const [accName, setAccName] = useState(celebData?.payoutAccountName || '');
  const [routingNo, setRoutingNo] = useState(celebData?.payoutRoutingNo || '');
  const [swiftCode, setSwiftCode] = useState(celebData?.payoutSwiftCode || '');
  const [bankAddress, setBankAddress] = useState(celebData?.payoutBankAddress || '');

  // Crypto States
  const [cryptoType, setCryptoType] = useState(celebData?.cryptoTokenName || 'USDT TRC20');
  const [cryptoAddress, setCryptoAddress] = useState(celebData?.cryptoWalletAddress || '');
  const [cryptoQR, setCryptoQR] = useState(celebData?.cryptoWalletQR || '');
  const [uploadingQR, setUploadingQR] = useState(false);

  // Gift Card States
  const [giftCardName, setGiftCardName] = useState(celebData?.payoutGiftCardName || 'Apple Store Gift Card');
  const [allowGiftCards, setAllowGiftCards] = useState(celebData?.allowGiftCards || false);

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQR(true);
    try {
      const url = await uploadToCloudinary(file);
      setCryptoQR(url);
    } catch (err: any) {
      alert('Error uploading QR code image: ' + err.message);
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSavePayment = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'celebrityProfiles', celebData.celebId), {
        payoutBankName: bankName,
        payoutAccountNo: accNo,
        payoutAccountName: accName,
        payoutRoutingNo: routingNo,
        payoutSwiftCode: swiftCode,
        payoutBankAddress: bankAddress,
        cryptoTokenName: cryptoType,
        cryptoWalletAddress: cryptoAddress,
        cryptoWalletQR: cryptoQR,
        payoutGiftCardName: giftCardName,
        allowGiftCards,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      triggerToast('Payment Settings Saved Successfully');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left font-sans">
      <div className="flex justify-between items-center bg-slate-950/25 p-4 border border-white/5 rounded-3xl">
        <h3 className="text-lg font-bold uppercase tracking-widest text-white italic">Payment Settings</h3>
        <button 
          onClick={handleSavePayment} 
          disabled={loading}
          className="px-8 py-3.5 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest"
        >
          {loading ? 'Securing...' : 'Save Gateways'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Payment Type Selection Panel */}
        <div className="bg-slate-900/40 p-6 border border-white/5 rounded-[2rem] flex flex-col gap-2 h-fit">
          <button 
            type="button"
            onClick={() => setPayTab('bank')}
            className={`w-full flex items-center justify-between p-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              payTab === 'bank' ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <Landmark size={14} /> <span>Bank Account Direct</span>
            </div>
            <ChevronRight size={14} />
          </button>

          <button 
            type="button"
            onClick={() => setPayTab('crypto')}
            className={`w-full flex items-center justify-between p-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              payTab === 'crypto' ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coins size={14} /> <span>Crypto Gateway</span>
            </div>
            <ChevronRight size={14} />
          </button>

          <button 
            type="button"
            onClick={() => setPayTab('giftcard')}
            className={`w-full flex items-center justify-between p-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              payTab === 'giftcard' ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift size={14} /> <span>Gift Card Proofs</span>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Dynamic Panel Input Fields */}
        <div className="lg:col-span-2 bg-slate-900/40 p-8 border border-white/5 rounded-[2rem] text-xs font-bold text-white/60 space-y-6">
          
          {payTab === 'bank' && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Configure Bank Transfer</h4>
              <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Accept USA & International bank deposits ($ USD)</p>
              
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Payout Bank Name</label>
                  <input 
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium" 
                    placeholder="e.g. JPMorgan Chase Bank"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Account Name Reference</label>
                  <input 
                    type="text"
                    value={accName}
                    onChange={e => setAccName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium" 
                    placeholder="e.g. David Smith"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Account Number</label>
                  <input 
                    type="text"
                    value={accNo}
                    onChange={e => setAccNo(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-mono" 
                    placeholder="Bank account number"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Routing Number (9 Digits)</label>
                  <input 
                    type="text"
                    value={routingNo}
                    onChange={e => setRoutingNo(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-mono" 
                    placeholder="Routing number"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">SWIFT / BIC Code</label>
                  <input 
                    type="text"
                    value={swiftCode}
                    onChange={e => setSwiftCode(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-mono" 
                    placeholder="SWIFT code"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Bank Address (Optional)</label>
                  <input 
                    type="text"
                    value={bankAddress}
                    onChange={e => setBankAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium" 
                    placeholder="e.g. 123 Wall Street, NY, USA"
                  />
                </div>
              </div>
            </div>
          )}

          {payTab === 'crypto' && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Configure Crypto Wallets</h4>
              <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Receive booking payments globally using stable coins</p>
              
              <div className="pt-4 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Crypto Coin Protocol</label>
                  <select 
                    value={cryptoType}
                    onChange={e => setCryptoType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none text-white outline-none font-medium"
                  >
                    <option value="USDT TRC20">USDT (TRC20)</option>
                    <option value="USDT ERC20">USDT (ERC20)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Recipient Wallet Address</label>
                  <input 
                    type="text"
                    value={cryptoAddress}
                    onChange={e => setCryptoAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-mono" 
                    placeholder="Paste crypto wallet string address..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Wallet QR Code Image</label>
                  <div className="relative border-2 border-dashed border-white/15 hover:border-primary/50 bg-black/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-36 transition-all group">
                    {cryptoQR ? (
                      <div className="space-y-3">
                        <img src={cryptoQR} alt="Wallet QR" className="max-h-32 object-contain mx-auto rounded-lg border border-white/10" />
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCryptoQR('');
                          }} 
                          className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-wider"
                        >
                          Remove QR
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={28} className="text-white/20 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">
                          {uploadingQR ? 'Uploading QR Code...' : 'Tap or drop QR image here'}
                        </p>
                        <p className="text-[8px] text-white/25 mt-1">Supports PNG, JPG, JPEG</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleQRUpload} 
                      disabled={uploadingQR}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {payTab === 'giftcard' && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Configure Gift Card Settlement</h4>
              <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Let fans activate card memberships using store gift cards</p>
              
              <div className="pt-4 space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Enable Gift Card payments</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Let fans upload physical cards snapshots to proceed</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAllowGiftCards(!allowGiftCards)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      allowGiftCards ? 'bg-primary text-black font-black' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {allowGiftCards ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-2">Accepted Card Brand Type</label>
                  <input 
                    type="text"
                    value={giftCardName}
                    onChange={e => setGiftCardName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white font-medium" 
                    placeholder="e.g. Apple Store Physical ($500 base only)"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Extracted upgrade screen
const UpgradeScreen = ({ siteSettings, celebId, setActiveTab }: any) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleUpgrade = async () => {
    if (!file) return alert('Payment receipt image required.');
    setLoading(true);
    try {
      const url = await uploadToCloudinary(file);
      await setDoc(doc(db, 'celebrityProfiles', celebId), { 
        upgradePending: true,
        paymentProof: url,
        upgradeDate: new Date().toISOString()
      }, { merge: true });
      alert('Verification payment receipt uploaded successfully! The administrator will review and approve your account shortly.');
      setActiveTab('dashboard');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = siteSettings?.currency === 'NGN' ? '₦' : '$';

  return (
    <div className="glass-dark rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-12 max-w-2xl mx-auto border-4 border-primary/25 shadow-2xl space-y-8 sm:space-y-10 text-center font-sans">
      <div>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6 ring-8 ring-primary/5">
          <Award size={32} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tighter italic">Activate Account</h2>
        <p className="text-xs text-white/40 uppercase font-black tracking-widest mt-1">Get verified to unlock profile customized tools</p>
      </div>

      <div className="bg-slate-950/60 p-5 sm:p-8 rounded-[2rem] border border-white/5 space-y-6 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Landmark size={80} />
        </div>
        <div>
          <p className="text-[10px] uppercase font-mono tracking-widest text-white/30">Activation Fee</p>
          <div className="overflow-x-auto scrollbar-none max-w-full">
            <p className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white italic mt-1 whitespace-nowrap break-keep select-all">
              {currencySymbol}{siteSettings?.activationFee || '499'}
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-4 text-xs font-medium">
          <div>
            <p className="text-[10px] uppercase text-white/30">Bank Name</p>
            <p className="font-bold text-white italic text-base mt-0.5">{siteSettings?.adminBankName || 'OPAY'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/30">Account Number</p>
            <p className="font-mono text-primary font-bold text-lg mt-0.5 select-all">{siteSettings?.adminAccountNo || '8062827392'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/30">Account Name</p>
            <p className="font-bold text-white uppercase italic tracking-wider mt-0.5">{siteSettings?.adminAccountName || 'BENJAMIN GEORGE'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <label className="block border-2 border-dashed border-white/10 hover:border-primary/50 bg-black/40 h-40 sm:h-48 rounded-[2rem] flex flex-col items-center justify-center p-6 cursor-pointer relative overflow-hidden transition-all group">
          {file ? (
            <span className="text-primary text-xs font-black uppercase tracking-wider italic">{file.name}</span>
          ) : (
            <>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/30 group-hover:text-primary mb-3 transition-colors"><Send size={20} /></div>
              <p className="text-[10px] text-white/45 font-black uppercase tracking-widest">Upload Payment Receipt</p>
            </>
          )}
          <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>

        <button 
          onClick={handleUpgrade}
          disabled={loading || !file}
          className="w-full py-4 sm:py-5 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-30 text-xs"
        >
          {loading ? 'Submitting Receipt...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
};

// Extracted AI Premium Assist component
const AiPremiumScreen = ({ celebData, setCelebData, user, aiUsageCount, userAiUsage, siteSettings }: any) => {
  const isAiSubscribed = celebData?.isAiSubscribed === true || celebData?.aiPremium === true;
  const aiUpgradePending = celebData?.aiUpgradePending === true;
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleAiUpgrade = async () => {
    if (!receiptFile) return alert('Payment receipt image is required.');
    setUploadingReceipt(true);
    try {
      const url = await uploadToCloudinary(receiptFile);
      await setDoc(doc(db, 'celebrityProfiles', user!.uid), { 
        aiUpgradePending: true,
        aiPaymentProof: url,
        aiUpgradeDate: new Date().toISOString()
      }, { merge: true });
      
      // Sync local state
      setCelebData({
        ...celebData,
        aiUpgradePending: true,
        aiPaymentProof: url
      });

      alert('Verification payment slip uploaded successfully! The Super Admin will review and activate your AI Premium Upgrade shortly.');
      setReceiptFile(null);
    } catch (err: any) {
      alert('Error submitting AI Premium slip: ' + err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const subCurrency = siteSettings?.aiSubCurrency || 'USD';
  const subAmount = siteSettings?.aiSubAmount || '150';
  const paymentDetailsText = siteSettings?.aiPaymentDetails || 'Transfer premium dues to OPAY admin details and upload receipt.';

  const displayLimit = isAiSubscribed ? 50 : 5;
  const remaining = Math.max(0, displayLimit - aiUsageCount);

  return (
    <div className="space-y-8 text-left font-sans animate-fade-in">
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/40 p-10 border border-indigo-500/20 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary animate-pulse" size={20} />
            <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-widest text-white italic">AI Premium Assist</h3>
          </div>
          <p className="text-xs text-white/60 max-w-xl leading-relaxed">
            Elevate your chat experience automatically! Unlocks 5 high-quality smart replies suggestions instead of 3, expands your daily quota to 50 queries, and supports robust prompt configurations.
          </p>
        </div>

        {isAiSubscribed ? (
          <div className="px-6 py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Premium Active
          </div>
        ) : aiUpgradePending ? (
          <div className="px-6 py-3 bg-amber-500/20 border border-amber-500 text-amber-400 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Pending Review
          </div>
        ) : (
          <div className="px-6 py-3 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest rounded-2xl">
            Basic Inactive
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Telemetry Panel */}
        <div className="glass-dark rounded-[2.5rem] p-8 border border-white/5 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Usage Telemetry Desk</h4>
                <p className="text-xs text-white/40 leading-relaxed font-semibold">
                  Track your daily API queries. Your quota resets dynamically every 24 hours.
                </p>
              </div>
              <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isAiSubscribed ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border border-white/10 text-white/40'}`}>
                {isAiSubscribed ? "⭐ Premium Plan" : "Trial plan"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center hover:bg-white/[0.04] transition-all">
              <p className="text-4xl font-display font-bold text-white italic">{aiUsageCount}</p>
              <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mt-1">Queries Today</p>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center hover:bg-white/[0.04] transition-all">
              <p className="text-4xl font-display font-bold text-primary italic">{displayLimit}</p>
              <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mt-1">Daily Quota limit</p>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center hover:bg-white/[0.04] transition-all">
              <p className="text-4xl font-display font-bold text-sky-400 italic">{remaining}</p>
              <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mt-1 font-mono">Quotas Remaining</p>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center hover:bg-white/[0.04] transition-all">
              <p className="text-4xl font-display font-bold text-purple-400 italic">{userAiUsage?.totalLifetimeRequests || 0}</p>
              <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mt-1 font-mono">Lifetime Requests</p>
            </div>
          </div>

          <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl text-xs space-y-2.5 text-white/50 leading-relaxed font-sans">
            <div className="flex justify-between items-center">
              <span>AI Plan Status:</span>
              <span className={`font-black font-mono tracking-wide ${isAiSubscribed ? "text-indigo-400" : "text-amber-500"}`}>
                {isAiSubscribed ? "Premium AI Active" : "Standard AI Trial"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Suggesting Capacity:</span>
              <span className="font-extrabold text-white">{isAiSubscribed ? "5 premium options" : "3 basic options"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active AI Engine:</span>
              <span className="font-mono text-sky-400 font-extrabold uppercase text-[10px] tracking-widest">{userAiUsage?.activeProvider === 'demo' ? 'DEMO' : userAiUsage?.activeProvider === 'groq' ? 'LIVE' : 'LIVE PRO'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Quota Gauge:</span>
              <span className="font-mono text-primary font-extrabold">{aiUsageCount} / {displayLimit} Used</span>
            </div>
            {isAiSubscribed && (
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.03]">
                <span>Plan Expiry:</span>
                <span className="font-mono text-emerald-400 font-extrabold uppercase text-[10px] tracking-widest whitespace-nowrap">
                  {celebData?.aiPremiumExpiresAt 
                    ? `${Math.max(0, Math.ceil((celebData.aiPremiumExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))} Days Left (35 Days Plan)`
                    : '35 Days Plan'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment/Upgrade Form */}
        {!isAiSubscribed && (
          <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-6">
            <div className="pb-4 border-b border-white/5">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Unlock AI Premium</h4>
              <p className="text-[10px] text-white/40 mt-1 uppercase font-black tracking-widest">Submit activation payment slide</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase text-white/30">Subscription Due Fee</p>
                <p className="text-2xl font-display font-black text-white italic mt-0.5">
                  {subCurrency === 'NGN' ? '₦' : '$'}{subAmount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/30">Payment Information / Instructions</p>
                <p className="text-xs text-primary font-bold italic mt-1 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5 whitespace-pre-wrap select-all">
                  {paymentDetailsText}
                </p>
              </div>
            </div>

            {aiUpgradePending ? (
              <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-center space-y-2">
                <p className="text-xs text-amber-500 font-extrabold uppercase tracking-wider">Review Is Ongoing</p>
                <p className="text-[10px] text-white/45 leading-relaxed">
                  Our billing desk is reviewing your payment slide. Your account is expected to unlock premium AI capabilities shortly. Keep checking!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block border-2 border-dashed border-white/10 hover:border-primary/50 bg-black/40 h-28 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer relative overflow-hidden transition-all group">
                  {receiptFile ? (
                    <span className="text-primary text-xs font-black uppercase tracking-wider italic text-center w-full truncate">
                      {receiptFile.name}
                    </span>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-white/30 group-hover:text-primary mb-1.5 transition-colors" />
                      <p className="text-[9px] text-white/45 font-black uppercase tracking-widest">Select Receipt Screenshot</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)} 
                  />
                </label>

                <button 
                  onClick={handleAiUpgrade}
                  disabled={uploadingReceipt || !receiptFile}
                  className="w-full py-4 bg-primary text-black rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-30 text-xs shadow-lg shadow-primary/10"
                >
                  {uploadingReceipt ? 'Submitting Receipt...' : 'Confirm Premium Payment'}
                </button>
              </div>
            )}
          </div>
        )}

        {isAiSubscribed && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Sparkles size={28} className="animate-pulse" />
            </div>
            <h4 className="text-md font-black text-white uppercase tracking-wider">AI Assistant Fully Configured</h4>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              You are currently subscribed to the maximum tier. Standard smart recommendations retrieve up to 5 customized options instantly next to your chats. Enjoy!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
