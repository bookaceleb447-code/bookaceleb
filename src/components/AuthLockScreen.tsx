import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

export const AuthLockScreen = ({ title, reason }: { title: string; reason?: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-dark w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/5 text-center space-y-6"
    >
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto border border-red-500/15">
        <ShieldAlert size={28} />
      </div>
      <div>
        <h2 className="text-2xl font-display font-bold text-white uppercase italic tracking-tight">{title}</h2>
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mt-1">Platform Service Announcement</p>
      </div>
      <div className="p-5 bg-black/40 border border-white/5 rounded-2xl text-slate-300 text-sm font-medium leading-relaxed">
        {reason || "We are performing scheduled upgrades. Please try again later."}
      </div>
      <div className="pt-2">
        <a href="/" className="text-xs font-black uppercase tracking-widest text-[#a5b4fc] border-b border-[#a5b4fc]/20 pb-0.5 hover:border-[#a5b4fc] transition-all">
          ← Return to Lands
        </a>
      </div>
    </motion.div>
  );
};
