import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Tag, ChevronRight, Menu, X, Users, Compass, CalendarRange, Heart, Globe, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const LandingPage = () => {
  const { t, lang } = useLanguage();
  const [featuredCelebs, setFeaturedCelebs] = useState<any[]>([]);
  const [trendingCelebs, setTrendingCelebs] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  useEffect(() => {
    // Fetch settings
    const fetchSettings = async () => {
      try {
        const snap = await getDocs(collection(db, 'siteSettings'));
        if (!snap.empty) {
          setSiteSettings(snap.docs[0].data());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();

    // Fetch manually marked celebrities
    const fetchCelebs = async () => {
      try {
        // Featureds
        const qFeature = query(
          collection(db, 'landingPageShowcase'),
          where('isVisible', '==', true),
          where('isFeatured', '==', true),
          limit(6)
        );
        const snapF = await getDocs(qFeature);
        setFeaturedCelebs(snapF.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Trendings
        const qTrending = query(
          collection(db, 'landingPageShowcase'),
          where('isVisible', '==', true),
          where('isTrending', '==', true),
          limit(6)
        );
        const snapT = await getDocs(qTrending);
        setTrendingCelebs(snapT.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching curated landing showcase:', err);
      }
    };
    fetchCelebs();
  }, []);

  const finalFeatured = featuredCelebs;
  const finalTrending = trendingCelebs;

  // Currency helper (Showcase prices on landing page should always be USD)
  const currencySymbol = '$';

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-x-hidden selection:bg-primary selection:text-black">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[50rem] opacity-25 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[70vw] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* Navbar Container */}
      <nav className="fixed top-0 w-full z-50 glass-dark border-b border-white/5 px-6 py-5 flex justify-between items-center backdrop-blur-2xl">
        <div className="text-2xl font-display font-black tracking-tighter text-white flex items-center gap-2">
          BOOK A <span className="text-primary italic underline underline-offset-4 decoration-primary/40">Celeb</span>
        </div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex gap-10 font-bold text-xs uppercase tracking-widest text-white/60">
          <a href="#featured" className="hover:text-primary transition-all">{t('nav.featured')}</a>
          <a href="#trending" className="hover:text-primary transition-all">{t('nav.trending')}</a>
          <a href="#stats" className="hover:text-primary transition-all">{t('nav.metrics')}</a>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="px-6 py-2.5 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">{t('nav.login')}</Link>
          <Link to="/register" className="px-6 py-2.5 rounded-2xl bg-primary text-black hover:scale-105 transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">{t('nav.signUp')}</Link>
        </div>

        {/* Hamburger - Mobile */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="md:hidden p-3 border border-white/10 bg-white/5 rounded-2xl hover:bg-white/10 focus:outline-none transition-all"
        >
          {isMenuOpen ? <X size={20} className="text-primary" /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Hamburger Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[76px] z-40 bg-slate-950/95 backdrop-blur-3xl border-b border-white/10 p-8 flex flex-col gap-6 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              <a href="#featured" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-white/5 text-lg font-bold tracking-tight hover:text-primary transition-all flex justify-between items-center">
                <span>{t('nav.featured')}</span>
                <ChevronRight size={16} />
              </a>
              <a href="#trending" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-white/5 text-lg font-bold tracking-tight hover:text-primary transition-all flex justify-between items-center">
                <span>{t('nav.trending')}</span>
                <ChevronRight size={16} />
              </a>
              <a href="#stats" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-white/5 text-lg font-bold tracking-tight hover:text-primary transition-all flex justify-between items-center">
                <span>{t('nav.metrics')}</span>
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-center text-sm font-bold uppercase tracking-wider">{t('nav.login')}</Link>
              <Link to="/register" onClick={() => setIsMenuOpen(false)} className="py-4 rounded-2xl bg-primary text-black hover:scale-105 transition-all text-center text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/10">{t('nav.signUp')}</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative z-10 pt-44 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Small badge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] uppercase tracking-[0.25em] mb-10 shadow-xl shadow-primary/5"
        >
          <Award size={12} className="animate-spin duration-10000" /> {t('hero.badge')}
        </motion.div>

        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-display font-bold leading-tight md:leading-none tracking-tight mb-8 text-white max-w-4xl"
        >
          {t('hero.titleLine1')} <br />
          <span className="text-primary italic neon-text uppercase tracking-tighter inline-block mt-2">{t('hero.titleLine2')}</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/50 text-base md:text-xl max-w-2xl mb-12 font-medium leading-relaxed"
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* Action button container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto items-center justify-center relative mt-2"
        >
          <Link to="/register" className="w-full sm:w-auto px-12 py-5 bg-primary text-black rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-primary/20">
            {t('hero.ctaBook')} <ChevronRight size={18} />
          </Link>
          <a href="#featured" className="w-full sm:w-auto px-12 py-5 border border-white/10 hover:border-white/25 rounded-3xl font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2 backdrop-blur-3xl bg-slate-900/40">
            {t('hero.ctaExplore')}
          </a>
        </motion.div>
      </section>

      {/* Premium Statistics Cards */}
      <section id="stats" className="relative z-10 py-12 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center shadow-xl shadow-black/30 group hover:border-primary/25 transition-all"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 ring-4 ring-primary/5 group-hover:scale-110 transition-all">
              <Globe size={28} />
            </div>
            <h3 className="text-4xl font-display font-black tracking-tighter text-white uppercase italic">150+ Icons</h3>
            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mt-2">{t('landing.statsVerified', 'Verified Celebrities Globally')}</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center shadow-xl shadow-black/30 group hover:border-primary/25 transition-all"
          >
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 ring-4 ring-blue-500/5 group-hover:scale-110 transition-all">
              <Users size={28} />
            </div>
            <h3 className="text-4xl font-display font-black tracking-tighter text-white uppercase italic">12k+ Fans</h3>
            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mt-2">{t('landing.statsFans', 'Registered Happy Members')}</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center shadow-xl shadow-black/30 group hover:border-primary/25 transition-all"
          >
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 ring-4 ring-purple-500/5 group-hover:scale-110 transition-all">
              <CalendarRange size={28} />
            </div>
            <h3 className="text-4xl font-display font-black tracking-tighter text-white uppercase italic">8.4k+ Sessions</h3>
            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mt-2">{t('landing.statsSessions', 'Completed VIP Bookings')}</p>
          </motion.div>
        </div>
      </section>

      {/* Featured Celebrities Section */}
      <section id="featured" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[10px] uppercase font-black tracking-[0.25em] text-primary">{t('landing.registryBadge')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white uppercase tracking-tight italic">{t('landing.featuredTitle')}</h2>
            <p className="text-white/40 mt-1 uppercase text-xs font-bold tracking-widest">{t('landing.featuredSubtitle')}</p>
          </div>
          <a href="#trending" className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80 transition-all border border-primary/20 px-5 py-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10">
            {t('landing.viewTrending')} <ChevronRight size={14} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {finalFeatured.length === 0 ? (
            <div className="col-span-full py-16 px-6 bg-slate-900/20 border border-white/5 rounded-[2rem] text-center max-w-lg mx-auto w-full">
              <p className="text-sm text-white/50 font-bold uppercase tracking-widest mb-1">{t('landing.comingSoon')}</p>
              <p className="text-[11px] text-white/30 uppercase tracking-wider">{t('landing.curatedWillBeUpdated')}</p>
            </div>
          ) : (
            finalFeatured.map((celeb, idx) => (
              <CelebrityCard key={celeb.id || idx} celeb={celeb} currencySymbol={currencySymbol} />
            ))
          )}
        </div>
      </section>

      {/* Trending Celebrities Section */}
      <section id="trending" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[10px] uppercase font-black tracking-[0.25em] text-orange-500">{t('landing.popularityVector')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white uppercase tracking-tight italic">{t('landing.trendingTitle')}</h2>
            <p className="text-white/40 mt-1 uppercase text-xs font-bold tracking-widest">{t('landing.trendingSubtitle')}</p>
          </div>
          <a href="#featured" className="text-white/60 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 hover:opacity-100 transition-all border border-white/10 px-5 py-2.5 rounded-2xl hover:bg-white/5">
            {t('landing.backToFeatured')}
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {finalTrending.length === 0 ? (
            <div className="col-span-full py-16 px-6 bg-slate-900/20 border border-white/5 rounded-[2rem] text-center max-w-lg mx-auto w-full">
              <p className="text-sm text-white/50 font-bold uppercase tracking-widest mb-1">{t('landing.comingSoon')}</p>
              <p className="text-[11px] text-white/30 uppercase tracking-wider">{t('landing.trendingWillBeUpdated')}</p>
            </div>
          ) : (
            finalTrending.map((celeb, idx) => (
              <CelebrityCard key={celeb.id || idx} celeb={celeb} currencySymbol={currencySymbol} isTrending />
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950/80 backdrop-blur-3xl text-white py-24 px-6 border-t border-white/5 relative z-10 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 border-b border-white/10 pb-20">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="text-3xl font-display font-black tracking-tighter text-white">
              BOOK A <span className="text-primary italic uppercase underline decoration-primary/40">Celeb</span>
            </div>
            <p className="text-white/45 max-w-md text-sm font-medium leading-relaxed">
              {t('landing.footerText')}
            </p>
            <div className="flex gap-4 pt-2">
              {['Instagram', 'Telegram', 'TikTok'].map(s => (
                <a key={s} href="#" className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black hover:border-transparent font-black tracking-widest text-xs transition-all uppercase">{s[0]}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs text-white/40 mb-8 font-mono">{t('landing.platformNotes')}</h4>
            <ul className="space-y-4 font-bold text-sm text-white/50">
              <li>
                <Link 
                  to="/admin/login" 
                  className="hover:text-primary transition-all uppercase tracking-widest text-[11px] font-bold opacity-60 hover:opacity-100"
                >
                  {t('landing.adminPortal')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs text-white/40 mb-8 font-mono">{t('landing.directSupport')}</h4>
            <ul className="space-y-4 font-bold text-sm text-white/50">
              <li><a href="#" className="hover:text-primary transition-all">{t('landing.helpCenter')}</a></li>
              <li><a href="#" className="hover:text-primary transition-all">{t('landing.escrowSafety')}</a></li>
              <li><a href="#" className="hover:text-primary transition-all">{t('landing.platformGuidelines')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-10 flex flex-col md:flex-row justify-between items-center text-white/30 text-xs gap-4">
          <p>{t('landing.copyright')}</p>
        </div>
      </footer>
    </div>
  );
};

const CelebrityCard = ({ celeb, currencySymbol, isTrending }: any) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleAction = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      localStorage.setItem('referred_by', celeb.id);
      localStorage.setItem('referred_celeb_name', celeb.celebName);
      navigate('/register');
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 hover:border-white/10 group flex flex-col justify-between"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] p-4">
        <img 
          src={celeb.profilePic || `https://picsum.photos/seed/${celeb.id}/600/800`} 
          alt={celeb.celebName}
          onClick={handleAction}
          className="w-full h-full object-cover rounded-[2rem] transition-transform duration-700 group-hover:scale-105 cursor-pointer"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-8 left-8">
          <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl border ${
            isTrending 
              ? 'bg-orange-500/90 text-white border-orange-400/20' 
              : 'bg-primary/90 text-black border-primary/20'
          }`}>
            {isTrending ? t('landing.cardTrending', 'Trending') : t('landing.cardCurated', 'Curated')}
          </span>
        </div>
        {celeb.country && (
          <div className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-md text-white/80 shrink-0 px-4 py-1.5 rounded-xl border border-white/5 text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1">
            <MapPin size={10} className="text-primary" /> {celeb.country}
          </div>
        )}
      </div>
      
      <div className="p-8 pt-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 onClick={handleAction} className="text-2xl font-display font-bold text-white group-hover:text-primary transition-colors cursor-pointer">{celeb.celebName}</h3>
            <div className="flex items-center gap-1 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl">
              <Star size={12} className="fill-orange-400 text-orange-400" />
              4.9
            </div>
          </div>
          <p className="text-white/40 text-sm font-medium line-clamp-2 italic mb-6">
            "{celeb.bio || t('booking.reasonPlaceholder', 'High-end consultation and private elite fan card options.')}"
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="text-left">
              <p className="text-[9px] uppercase font-mono tracking-widest text-white/30">{t('landing.cardConsultationRate', 'Consultation Rate')}</p>
              <p className="text-xl font-display font-extrabold text-white flex items-center gap-0.5 mt-0.5">
                <span className="text-primary">{currencySymbol}</span>{celeb.bookingPrice || '0'}<span className="text-[10px] text-white/30 font-medium">/hr</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-mono tracking-widest text-white/30">{t('landing.cardFanMembership', 'Fan Membership')}</p>
              <p className="text-xl font-display font-extrabold text-white flex items-center gap-0.5 mt-0.5 justify-end">
                <span className="text-primary">{currencySymbol}</span>{celeb.fanCardPrice || '0'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {user ? (
              <Link to={`/book/${celeb.id}`} className="w-full py-4 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
                {t('landing.cardBookAppt', 'Book Appointment')}
              </Link>
            ) : (
              <button onClick={handleAction} className="w-full py-4 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
                {t('landing.cardBookAppt', 'Book Appointment')}
              </button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {user ? (
                <Link to={`/donate/${celeb.id}`} className="py-3 bg-slate-900 border border-white/5 text-white/80 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-850 hover:text-white transition-all">
                  <Compass size={12} className="text-primary" /> {t('dashboard.donateText', 'Support VIP')}
                </Link>
              ) : (
                <button onClick={handleAction} className="py-3 bg-slate-900 border border-white/5 text-white/80 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-850 hover:text-white transition-all">
                  <Compass size={12} className="text-primary" /> {t('dashboard.donateText', 'Support VIP')}
                </button>
              )}

              {user ? (
                <Link to={`/fan-card/${celeb.id}`} className="py-3 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/60 hover:text-white">
                  <Star size={12} className="text-primary" /> {t('dashboard.managePass', 'Fan Card')}
                </Link>
              ) : (
                <button onClick={handleAction} className="py-3 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/5 transition-all text-white/60 hover:text-white">
                  <Star size={12} className="text-primary" /> {t('dashboard.managePass', 'Fan Card')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
