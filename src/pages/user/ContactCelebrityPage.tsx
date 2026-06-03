import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { MessageSquare, Phone, Instagram, Send, Play, ArrowLeft, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

export const ContactCelebrityPage = () => {
  const { celebId } = useParams<{ celebId: string }>();
  const [celeb, setCeleb] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!celebId) return;

    const unsub = onSnapshot(doc(db, 'celebrityProfiles', celebId), (snap) => {
      if (snap.exists()) {
        setCeleb({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [celebId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020512] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase font-black tracking-widest text-white/40">Synchronizing Social Encrypted Links...</p>
        </div>
      </div>
    );
  }

  if (!celeb) {
    return (
      <div className="min-h-screen bg-[#020512] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight italic">Celebrity Connection Terminated</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold leading-relaxed">
              No registered verified profile belongs to this identifier, or access rules restrict connection.
            </p>
          </div>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:border-primary text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            <ArrowLeft size={14} /> Back to Lounge
          </Link>
        </div>
      </div>
    );
  }

  // Generate lists of available channels
  const socialChannels = [
    {
      name: 'WhatsApp Secure Line',
      value: celeb.waLink,
      icon: <Phone size={20} className="text-emerald-400" />,
      desc: 'Send instant media attachments or direct voice prompts.',
      color: 'hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]',
      tag: 'DIRECT WA'
    },
    {
      name: 'Telegram Channel/Alias',
      value: celeb.tgLink,
      icon: <Send size={20} className="text-blue-400" />,
      desc: 'Join custom broadcast feeds or communicate securely.',
      color: 'hover:border-blue-500/30 hover:bg-blue-500/[0.02]',
      tag: 'TELEGRAM'
    },
    {
      name: 'Instagram VIP Handle',
      value: celeb.instaLink,
      icon: <Instagram size={20} className="text-pink-400" />,
      desc: 'Follow curated stories or send premium direct DMs.',
      color: 'hover:border-pink-500/30 hover:bg-pink-500/[0.02]',
      tag: 'INSTAGRAM'
    },
    {
      name: 'TikTok Public Stream',
      value: celeb.tiktokLink,
      icon: <Play size={20} className="text-red-400" />,
      desc: 'Watch real-time micro-broadcasts and backstage visual updates.',
      color: 'hover:border-red-500/30 hover:bg-red-500/[0.02]',
      tag: 'TIKTOK'
    }
  ].filter(ch => !!ch.value && ch.value.trim() !== '');

  return (
    <div className="min-h-screen bg-[#020512] text-white selection:bg-primary selection:text-black font-sans relative">
      {/* Dynamic Glow background */}
      <div className="absolute top-0 left-0 w-full h-[500px] opacity-25 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-primary/20 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 pt-32 relative z-10">
        {/* Navigation back */}
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={14} className="text-primary" /> Back to Lounge
          </Link>
        </div>

        {/* Header Hero card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/30 border border-white/5 rounded-[2.5rem] p-8 md:p-12 mb-8 flex flex-col md:flex-row items-center gap-8 backdrop-blur-xl"
        >
          <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
            <img src={celeb.profilePic || 'https://picsum.photos/seed/elite/300/300'} className="w-full h-full object-cover" />
          </div>
          <div className="text-center md:text-left space-y-2">
            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-full inline-block">
              Direct Contact Channels
            </span>
            <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight uppercase italic text-white">
              Connect With {celeb.celebName}
            </h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
              Private contact details unlocked by your active Fan Card.
            </p>
          </div>
        </motion.div>

        {/* Channels display */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/45 italic">Unlocked Contact Links</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mt-1">Connect with the star directly through these social accounts</p>
          </div>

          {socialChannels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialChannels.map((ch, idx) => {
                const isUrl = ch.value.startsWith('http://') || ch.value.startsWith('https://');
                const targetUrl = isUrl ? ch.value : `https://${ch.value}`;
                return (
                  <motion.a
                    key={idx}
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-6 bg-slate-900/30 border border-white/5 rounded-3xl flex flex-col justify-between gap-6 transition-all duration-300 ${ch.color}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl">
                        {ch.icon}
                      </div>
                      <span className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[8px] font-black tracking-widest font-mono text-white/50">
                        {ch.tag}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <h4 className="font-extrabold text-white text-md tracking-tight">{ch.name}</h4>
                      <p className="text-white/40 text-xs font-medium leading-relaxed">{ch.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/50 gap-2 min-w-0">
                      <span className="font-mono text-primary truncate min-w-0 flex-1">{ch.value}</span>
                      <span className="hover:text-primary transition-all text-[9px] uppercase font-black tracking-wider shrink-0 flex items-center gap-1">
                        Access Tunnel ↗
                      </span>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-slate-900/10 space-y-3">
              <AlertCircle size={32} className="mx-auto text-white/20" />
              <p className="text-white/30 text-xs font-black uppercase tracking-widest">No Direct Contact Links Configured</p>
              <p className="text-[10px] text-white/20 max-w-sm mx-auto font-bold uppercase tracking-wider leading-relaxed">
                Your assigned celebrity hasn't set up active external secure channels yet. Send a direct real-time message through the backstage chat instead.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
