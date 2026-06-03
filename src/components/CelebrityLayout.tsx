import { Star, MapPin, User, ShieldCheck } from 'lucide-react';

export const CelebrityHeader = ({ celeb }: any) => {
  return (
    <div className="glass rounded-[3rem] p-6 md:p-10 flex flex-col gap-8 mb-12 border border-white/5 overflow-hidden text-left">
      {/* Short wide hero image/banner */}
      <div className="w-full h-[240px] sm:h-[280px] md:h-[320px] rounded-[2rem] overflow-hidden shadow-2xl shrink-0 ring-4 ring-white/5 relative bg-slate-900/40">
        <img 
          src={celeb?.profilePic || 'https://picsum.photos/seed/celeb/1200/400'} 
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-6 md:p-8 pointer-events-none">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.3em] text-[9px] bg-black/50 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
            <ShieldCheck size={12} className="text-primary" /> Verified Creator Profile
          </div>
        </div>
      </div>

      {/* Details Area */}
      <div className="flex-1">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-3">
          <ShieldCheck size={14} /> Star Verification Backstage
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tighter mb-4 italic uppercase underline decoration-primary/30 text-white leading-none">
          {celeb?.celebName}
        </h1>
        <p className="text-white/60 italic font-medium max-w-3xl mb-8 leading-relaxed text-sm md:text-base">
          {celeb?.bookingDescription || celeb?.bio || "Connect with this verified celebrity in direct private backstage messages, dynamic fan cards, and charity support consults."}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-white/5 pt-8">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-white/25">Global Feedback</p>
            <div className="flex items-center gap-1 font-bold text-white/80">
                <Star size={14} className="fill-orange-400 text-orange-400" /> 4.9 (120 reviews)
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-white/25">Residency Base</p>
            <div className="flex items-center gap-1 font-bold text-white/80 uppercase tracking-tight">
                <MapPin size={14} className="text-primary" /> {celeb?.country || 'United States'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-white/25">Activity Cycle</p>
            <div className="flex items-center gap-1 font-bold text-white/80 italic">
                {celeb?.yearsActive ? `${celeb.yearsActive} Years Active` : '1989-present'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-white/25">Monetization Active</p>
            <div className="flex items-center gap-1 font-bold text-primary uppercase text-xs">
                {celeb?.bookingTitle || 'Elite Creator Badge'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FAQSection = () => (
  <div className="mt-20 glass rounded-[3rem] p-12 border border-white/5">
    <h3 className="text-3xl font-display font-bold mb-10 tracking-tighter uppercase italic text-white">Elite Support Protocol (FAQ)</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <FAQItem 
        q="What happens after I book?" 
        a="After booking, you'll receive a confirmation email with your booking details. Our team will review your request and reach out within 24-48 hours to confirm availability and discuss further details." 
      />
      <FAQItem 
        q="What is the cancellation policy?" 
        a="Cancellations made 30+ days before the event will receive a full refund minus a 10% processing fee. Cancellations 15-29 days prior will receive a 50% refund. No refunds for cancellations made 14 days or less before the event." 
      />
      <FAQItem 
        q="Can I change my booking details?" 
        a="Yes, you can request changes to your booking up to 14 days before your event. Please contact our support team with your booking reference to request any changes." 
      />
      <FAQItem 
        q="Is the communication private?" 
        a="All interactions including chats and calls are strictly private between you and the celebrity admin. Our system is built on zero-knowledge encryption for these channels." 
      />
    </div>
  </div>
);

const FAQItem = ({ q, a }: any) => (
  <div className="space-y-3">
    <h4 className="font-bold text-white uppercase tracking-wide flex items-center gap-2"><span className="text-primary">Q.</span> {q}</h4>
    <p className="text-white/40 text-sm italic font-medium leading-relaxed">{a}</p>
  </div>
);
