import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { Crown, Heart, Calendar, CreditCard, MessageSquare, ListCheck, UserCircle, Star, Sparkles, Activity, ShieldCheck, ArrowUpRight, MapPin, Tag, LogOut, Menu, X, LifeBuoy, Home, PhoneCall, Instagram, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatWidget } from '../../components/ChatWidget';

export const UserDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [celeb, setCeleb] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [availableCelebs, setAvailableCelebs] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isContactSupportOpen, setIsContactSupportOpen] = useState(false);

  // Fetch all available verified celebrities to let unassociated users link instantly
  useEffect(() => {
    if (!user) return;
    const fetchAvailable = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'celebrityProfiles'), where('isVisible', '==', true)));
        setAvailableCelebs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Failed to fetch available celebrities:", err);
      }
    };
    fetchAvailable();
  }, [user]);

  const handleConnectCeleb = async (celebId: string) => {
    try {
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid), {
        referredBy: celebId,
        assignedCelebrityId: celebId
      });
      localStorage.setItem('referred_by', celebId);
    } catch (err) {
      console.error("Failed to map connection:", err);
      // Fallback update
      try {
        localStorage.setItem('referred_by', celebId);
        window.location.reload();
      } catch (e) {
        console.log(e);
      }
    }
  };

  useEffect(() => {
    if (!user) return;

    // 1. Real-time User & Assigned Celebrity sync
    let unsubCeleb: (() => void) | null = null;
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (userSnap) => {
      let celebId = userSnap.exists() ? (userSnap.data()?.referredBy || userSnap.data()?.assignedCelebrityId) : null;
      if (!celebId) {
        celebId = localStorage.getItem('referred_by');
      }
      
      if (!celebId) {
        try {
          const bookingSnap = await getDocs(query(collection(db, 'bookings'), where('fanId', '==', user.uid), limit(1)));
          if (!bookingSnap.empty) {
            celebId = bookingSnap.docs[0].data().celebId;
          } else {
            const membershipSnap = await getDocs(query(collection(db, 'memberships'), where('fanId', '==', user.uid), limit(1)));
            if (!membershipSnap.empty) {
              celebId = membershipSnap.docs[0].data().celebId;
            }
          }
        } catch (e) {
          console.warn("Secondary celebrity association fallback evaluation caught:", e);
        }
      }
      
      if (celebId) {
        if (unsubCeleb) unsubCeleb();
        unsubCeleb = onSnapshot(doc(db, 'celebrityProfiles', celebId), (celebSnap) => {
          if (celebSnap.exists()) {
            const data = celebSnap.data();
            if (data?.isBanned) {
              setCeleb(null);
            } else {
              setCeleb({ id: celebSnap.id, ...data });
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `celebrityProfiles/${celebId}`);
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    // 2. Real-time user bookings listener
    const bQuery = query(collection(db, 'bookings'), where('fanId', '==', user.uid));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bookings');
    });

    // 3. Real-time donations listener
    const dQuery = query(collection(db, 'donations'), where('fanId', '==', user.uid));
    const unsubDonations = onSnapshot(dQuery, (snap) => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'donations');
    });

    return () => {
      unsubUser();
      if (unsubCeleb) unsubCeleb();
      unsubBookings();
      unsubDonations();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-[#020512] text-white selection:bg-primary selection:text-black">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] opacity-20 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-indigo-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 pt-12 relative z-10">
        {/* Header section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-row justify-between items-center mb-12 pb-6 border-b border-white/5 gap-4"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                <Crown size={10} /> VIP Pass Holder
              </span>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight uppercase italic text-white flex items-center gap-3">
              {t('dashboard.vipTitle')}
            </h1>
            <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1 flex flex-wrap items-center gap-1 max-w-full">
              <span>Verified Fan Profile Key:</span> 
              <span className="text-white font-mono break-all truncate max-w-[200px] sm:max-w-xs">{user?.displayName || user?.email || 'N/A'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-40">System Status</p>
              <p className="text-xs font-mono font-bold text-emerald-400">Escrow Securely Active</p>
            </div>
            <div className="h-10 w-px bg-white/10 hidden md:block" />
            <div className="flex gap-2 shrink-0">
              <button 
                title="VIP Gate Menu" 
                onClick={() => setIsMobileMenuOpen(true)}
                className="glass h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl hover:bg-white/10 hover:border-primary/30 transition-all flex items-center justify-center text-primary border border-white/5 bg-primary/5 cursor-pointer shrink-0"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Celebrity Connection Grid */}
        {celeb ? (
          <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8 mb-12 max-w-7xl mx-auto w-full">
            {/* Primary Celebrity Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full lg:max-w-xl flex-1 bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between hover:border-primary/20 transition-all duration-300 mx-auto"
            >
              {/* TOP SECTION: Celebrity image/banner at top */}
              <div className="w-full h-[260px] overflow-hidden relative shrink-0">
                <img 
                  src={celeb.profilePic || 'https://picsum.photos/seed/vip/600/800'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  alt={celeb.celebName}
                />
                <div className="absolute top-4 right-4 bg-[#020512]/80 backdrop-blur-md px-3.5 py-1.5 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-xl">
                  <Star size={10} className="fill-primary text-primary" /> Active Link
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-6 flex flex-col flex-1 justify-between gap-5 text-left min-w-0">
                <div className="space-y-3 min-w-0">
                  {/* Name and Rating */}
                  <div className="flex justify-between items-center gap-3 min-w-0">
                    <h2 className="text-2xl font-sans font-bold text-white tracking-tight leading-none truncate flex-1 min-w-0" title={celeb.celebName}>
                      {celeb.celebName}
                    </h2>
                    <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-amber-500 shrink-0">
                      <span>⭐</span> 4.9
                    </div>
                  </div>

                  {/* Metadata Indicators */}
                  <div className="space-y-1.5 text-xs font-semibold text-white/60">
                    {celeb.country && (
                      <p className="flex items-center gap-2">
                        <span>📍</span> {celeb.country}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-primary font-bold">
                      <span>🏷</span> ${Number(celeb.bookingPrice || 0).toLocaleString()} / hr
                    </p>
                  </div>

                  {celeb.bio && (
                    <p className="text-white/40 text-xs italic leading-relaxed line-clamp-2 pt-1 border-t border-white/5">
                      "{celeb.bio}"
                    </p>
                  )}
                </div>

                {/* BUTTON LAYOUT */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      to={`/book/${celeb.id}`} 
                      className="h-11 bg-primary hover:bg-primary/95 text-black rounded-xl font-bold flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg hover:shadow-primary/10 uppercase text-[10px] tracking-widest text-center"
                    >
                      <Calendar size={13}/> {t('dashboard.bookText')}
                    </Link>
                    <Link 
                      to={`/donate/${celeb.id}`} 
                      className="h-11 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg hover:shadow-primary/10 transition-all uppercase text-[10px] tracking-widest text-center"
                    >
                      <Heart size={13}/> {t('dashboard.donateText')}
                    </Link>
                  </div>
                  <Link 
                    to={`/fan-card/${celeb.id}`} 
                    className="h-11 w-full border border-white/10 hover:bg-white/5 hover:border-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase text-[10px] tracking-widest text-center"
                  >
                    <CreditCard size={13}/> {t('dashboard.managePass')}
                  </Link>
                </div>
              </div>
            </motion.div>
            
            {/* Realtime membership perks / benefits sidebar card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full lg:max-w-xl flex-1 glass rounded-[2.5rem] p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent mx-auto"
            >
              <div>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6"><Crown size={24} /></div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-white italic">Active Inner Circle Perks</h3>
                <p className="text-white/40 text-xs mb-6 font-bold uppercase tracking-wider">VIP Benefits Active</p>
                
                <div className="space-y-4">
                  {[
                    { title: 'Backstage Chat Pass', desc: 'Get access to direct chat messaging with stars' },
                    { title: 'Priority Direct Messages', desc: 'Your direct messages go straight to the top of the queue' },
                    { title: 'Autographed Souvenirs', desc: 'Qualify for rare authentic gifts and custom keepsakes' }
                  ].map((p, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <ListCheck size={11} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">{p.title}</p>
                        <p className="text-[10px] text-white/50">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link 
                to={`/fan-card/${celeb.id}`} 
                className="mt-8 text-center py-4 rounded-xl border border-dashed border-white/10 hover:border-primary/50 text-white/40 hover:text-primary transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1"
              >
                Access Lounge <ArrowUpRight size={14} />
              </Link>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-[3rem] p-8 md:p-16 text-center mb-12 border border-white/5 relative overflow-hidden bg-[#0a0f28]/35"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] text-primary font-mono tracking-widest uppercase border border-primary/20 inline-block mb-4">
              Awaiting Celebrity Link
            </span>
            
            <h2 className="text-2xl sm:text-4xl font-display font-black mb-2 italic uppercase text-white tracking-tighter">
              Quick Connect to a Celebrity
            </h2>
            <p className="text-white/45 max-w-xl mx-auto font-medium text-xs sm:text-sm mb-8 leading-relaxed">
              Select any of our premium verified celebrities below to connect with their concierge atrium. This will instantly activate live direct chat, custom AI suggested option panels, VIP membership cards, and real-time custom booking slots.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
              {(availableCelebs.length > 0 ? availableCelebs : [
                { id: 'seed-1', celebName: 'Leonardo DiCaprio', profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80', country: 'United States', bookingPrice: 2500 },
                { id: 'seed-2', celebName: 'Davido', profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80', country: 'Nigeria', bookingPrice: 1500 },
                { id: 'seed-3', celebName: 'Wizkid', profilePic: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80', country: 'Nigeria', bookingPrice: 1800 }
              ]).map((c) => (
                <div key={c.id} className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center gap-4 group">
                  <img 
                    src={c.profilePic} 
                    alt={c.celebName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-xs truncate uppercase tracking-tight">{c.celebName}</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">{c.country}</p>
                    <button
                      onClick={() => handleConnectCeleb(c.id)}
                      className="mt-1.5 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-center inline-block cursor-pointer hover:bg-white"
                    >
                      Connect VIP ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Real-time Tracking Bento Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking queue */}
          <motion.div 
            id="bookings-section"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-[2.5rem] p-4 sm:p-6 md:p-8 border border-white/5 text-left min-w-0"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-black flex items-center gap-2 italic uppercase tracking-wider text-white min-w-0 flex-1">
                <Calendar size={16} className="text-primary shrink-0"/>
                <span className="truncate" title="Booking Matrix Status">Booking Matrix Status</span>
              </h3>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-white/5 px-2.5 py-1 rounded border border-white/5 text-white/40 self-start sm:self-auto shrink-0">
                {bookings.length} Events Total
              </span>
            </div>
            
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {bookings && bookings.length > 0 ? bookings.map((b) => (
                <div key={b.id} className="p-3 sm:p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between transition-all min-w-0 w-full gap-2.5 sm:gap-3">
                  {/* Top line on mobile, Left on desktop */}
                  <div className="flex justify-between items-center sm:items-start sm:flex-col min-w-0 flex-1 w-full sm:w-auto gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white uppercase text-xs tracking-wide truncate" title={b.eventType}>{b.eventType}</h4>
                      <p className="text-[10px] text-white/40 font-mono font-bold mt-0.5 hidden sm:block whitespace-nowrap">{b.dateTime ? new Date(b.dateTime).toLocaleDateString() : 'Pending Date'}</p>
                    </div>
                    {/* Status Badge on core Mobile (hidden on sm+) */}
                    <span className={`sm:hidden px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                      b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      b.status === 'rejected' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  {/* Bottom line on mobile, Right on desktop */}
                  <div className="flex justify-between items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto border-t border-white/5 sm:border-t-0 pt-2 sm:pt-0">
                    <div className="flex items-center gap-1.5 sm:hidden text-[9px] font-mono text-white/40 font-bold">
                      <span className="whitespace-nowrap">{b.dateTime ? new Date(b.dateTime).toLocaleDateString() : 'Pending Date'}</span>
                      <span>•</span>
                      <span className="uppercase">{b.paymentMethod || 'Bank'}</span>
                    </div>

                    <span className="hidden sm:inline text-[10px] text-white/50 font-bold uppercase tracking-widest">{b.paymentMethod || 'Bank'}</span>
                    <span className={`hidden sm:inline px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                      b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      b.status === 'rejected' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-black/10">
                  <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No Active Bookings Configured</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Donations dynamic snapshot tracking */}
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-[2.5rem] p-4 sm:p-6 md:p-8 border border-white/5 text-left min-w-0"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-black flex items-center gap-2 italic uppercase tracking-wider text-white min-w-0 flex-1">
                <Heart size={16} className="text-primary shrink-0"/>
                <span className="truncate" title="Verified Global Contributions">Verified Global Contributions</span>
              </h3>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-white/5 px-2.5 py-1 rounded border border-white/5 text-white/40 self-start sm:self-auto shrink-0">
                {donations.length} Contributions
              </span>
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {donations && donations.length > 0 ? donations.map((d) => (
                <div key={d.id} className="p-3 sm:p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between transition-all min-w-0 w-full gap-2.5 sm:gap-3">
                  {/* Top line description */}
                  <div className="flex justify-between items-center sm:items-start sm:flex-col min-w-0 flex-1 w-full sm:w-auto gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white uppercase text-xs tracking-wide truncate" title={d.charityType === 'edu' ? "Education" : d.charityType === 'env' ? "Environment" : "Healthcare"}>
                        {d.charityType === 'edu' ? "Education" : d.charityType === 'env' ? "Environment" : "Healthcare"}
                      </h4>
                      <p className="text-[10px] text-white/40 font-mono font-bold mt-0.5 hidden sm:block whitespace-nowrap">{d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
                    </div>
                    {/* Status badge on mobile right side */}
                    <span className={`sm:hidden px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                      d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      d.status === 'rejected' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  {/* Bottom line meta */}
                  <div className="flex justify-between items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto border-t border-white/5 sm:border-t-0 pt-2 sm:pt-0 animate-none">
                    <div className="flex items-center gap-1.5 sm:hidden text-[9px] font-mono text-white/40 font-semibold">
                      <span className="whitespace-nowrap">{d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                      <span>•</span>
                      <span className="text-primary font-bold font-sans">${d.amount?.toLocaleString()}</span>
                    </div>

                    <span className="hidden sm:inline text-xs font-bold text-primary shrink-0">${d.amount?.toLocaleString()}</span>
                    <span className={`hidden sm:inline px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                      d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      d.status === 'rejected' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-black/10">
                  <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No verified contribution snapshot found</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modern Glassmorphic Side Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-sm h-full bg-[#030718]/95 backdrop-blur-2xl border-l border-white/10 p-6 sm:p-8 flex flex-col justify-start gap-8 overflow-y-auto pb-12 z-10"
            >
              <div className="space-y-8 shrink-0">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                      ★
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white leading-none">Backstage Gate</h4>
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">VIP NAVIGATION</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-xl text-white/60 hover:text-white transition-all border border-white/5 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Nav list */}
                <nav className="space-y-1.5">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.01] hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-xl text-left text-xs font-bold uppercase tracking-wider text-white hover:text-primary transition-all group cursor-pointer"
                  >
                    <Home size={15} className="text-white/50 group-hover:text-primary transition-all" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      document.getElementById('bookings-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.01] hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-xl text-left text-xs font-bold uppercase tracking-wider text-white hover:text-primary transition-all group cursor-pointer"
                  >
                    <Calendar size={15} className="text-white/50 group-hover:text-primary transition-all" />
                    <span>My Bookings</span>
                  </button>

                  <Link
                    to={celeb ? `/fan-card/${celeb.id}` : '#'}
                    onClick={(e) => {
                      if (!celeb) {
                        e.preventDefault();
                        alert('Connect with a verified creator referral string first.');
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.01] hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-xl text-left text-xs font-bold uppercase tracking-wider text-white hover:text-primary decoration-transparent transition-all group flex"
                  >
                    <CreditCard size={15} className="text-white/50 group-hover:text-primary transition-all" />
                    <span>Fan Cards</span>
                  </Link>

                  <Link
                    to={celeb ? `/donate/${celeb.id}` : '#'}
                    onClick={(e) => {
                      if (!celeb) {
                        e.preventDefault();
                        alert('Connect with a verified creator referral string first.');
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.01] hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-xl text-left text-xs font-bold uppercase tracking-wider text-white hover:text-primary decoration-transparent transition-all group flex"
                  >
                    <Heart size={15} className="text-white/50 group-hover:text-primary transition-all" />
                    <span>Donations</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsContactSupportOpen(true);
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.01] hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded-xl text-left text-xs font-bold uppercase tracking-wider text-white hover:text-primary transition-all group cursor-pointer"
                  >
                    <ShieldCheck size={15} className="text-white/50 group-hover:text-primary transition-all" />
                    <span>Contact Support</span>
                  </button>
                </nav>
              </div>

              {/* Footer */}
              <div className="space-y-4 min-w-0">
                <div className="p-4 bg-white/[2%] border border-white/5 rounded-2xl text-left min-w-0">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Fan Passholder</p>
                  <p className="text-xs font-black text-white truncate" title={user?.displayName || ''}>{user?.displayName || 'Anonymous'}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-1 truncate" title={user?.email || ''}>{user?.email}</p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await auth.signOut();
                      localStorage.removeItem('referred_by');
                      localStorage.removeItem('referred_celeb_name');
                      window.location.href = '/';
                    } catch (e) {
                      console.log(e);
                    }
                  }}
                  className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:text-black rounded-xl text-red-500 transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={13} /> Log Out Pass
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Info FAQs Modal */}
      <AnimatePresence>
        {isSupportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#04081c] border border-white/10 rounded-[2.5rem] p-4 sm:p-8 md:p-10 shadow-2xl z-10 space-y-6 text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-primary">
                  <LifeBuoy size={20} />
                  <h3 className="text-lg font-black uppercase tracking-tight italic text-white">Backstage VIP Support FAQ</h3>
                </div>
                <button
                  onClick={() => setIsSupportOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-all border border-white/5 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {[
                  {
                    q: "How does the secure booking system work?",
                    a: "All payment bookings are kept safe. Funds are only sent after your request/event is completed successfully. Your deposit is 100% secure."
                  },
                  {
                    q: "What benefits do I get with higher Fan Card plans?",
                    a: "Higher plans unlock direct chat with your favored stars, priority booking queues, autographed cards, and exclusive backstage options."
                  },
                  {
                    q: "Can I get a refund if the creator cancels?",
                    a: "Yes! If a creator cancels or does not accept your request within 7 business days, your payment will be refunded in full immediately."
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">{faq.q}</h4>
                    <p className="text-white/50 text-xs leading-relaxed font-medium">{faq.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Support Hotline modal */}
      <AnimatePresence>
        {isContactSupportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactSupportOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#04081c] border border-white/10 rounded-[2.5rem] p-4 sm:p-8 md:p-10 shadow-2xl z-10 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/10 border border-primary/25 rounded-3xl flex items-center justify-center mx-auto text-primary">
                <PhoneCall size={32} />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-full inline-block">
                  Direct Support Protocol
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight italic text-white">Contact Support</h3>
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider leading-relaxed">
                  Select an authenticated channel below configured by {celeb?.celebName || 'your artist'} to communicate directly on third-party secure systems:
                </p>
              </div>

              {/* Grid of config links */}
              <div className="space-y-3">
                {[
                  { name: 'WhatsApp Direct', value: celeb?.waLink, icon: <MessageSquare size={16} className="text-emerald-400" />, color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' },
                  { name: 'Telegram Link', value: celeb?.tgLink, icon: <Send size={16} className="text-blue-400" />, color: 'border-blue-500/20 bg-blue-500/5 text-blue-300' },
                  { name: 'Instagram VIP', value: celeb?.instaLink, icon: <Instagram size={16} className="text-pink-400" />, color: 'border-pink-500/20 bg-pink-500/5 text-pink-300' },
                  { name: 'TikTok Feed', value: celeb?.tiktokLink, icon: <Sparkles size={16} className="text-red-400" />, color: 'border-red-500/20 bg-red-500/5 text-red-300' }
                ].filter(item => !!item.value && item.value.trim() !== '').length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 text-left">
                    {[
                      { name: 'WhatsApp Direct', value: celeb?.waLink, icon: <MessageSquare size={16} className="text-emerald-400" />, color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' },
                      { name: 'Telegram Link', value: celeb?.tgLink, icon: <Send size={16} className="text-blue-400" />, color: 'border-blue-500/20 bg-blue-500/5 text-blue-300' },
                      { name: 'Instagram VIP', value: celeb?.instaLink, icon: <Instagram size={16} className="text-pink-400" />, color: 'border-pink-500/20 bg-pink-500/5 text-pink-300' },
                      { name: 'TikTok Feed', value: celeb?.tiktokLink, icon: <Sparkles size={16} className="text-red-405" />, color: 'border-red-500/20 bg-red-500/5 text-red-300' }
                    ].filter(item => !!item.value && item.value.trim() !== '').map((item, id) => {
                      const isUrl = item.value.startsWith('http://') || item.value.startsWith('https://');
                      const linkHref = isUrl ? item.value : `https://${item.value}`;
                      return (
                        <a 
                          key={id}
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider hover:scale-[1.01] ${item.color}`}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon}
                            <span>{item.name}</span>
                          </div>
                          <span className="opacity-65 font-mono text-[9px] max-w-[150px] truncate">{item.value} ↗</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-white/10 rounded-2xl bg-black/20 text-center space-y-2">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest">No Active Channels Configured</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-wider leading-relaxed">
                      Your connected celebrity has not initialized their private contact channels. Use the direct live chat window at the bottom-right of your screen instead.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsContactSupportOpen(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all cursor-pointer"
              >
                Return to Lounge
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {celeb && <ChatWidget targetId={celeb.id} targetName={celeb.celebName} />}
    </div>
  );
};
