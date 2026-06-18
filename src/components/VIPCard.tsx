import React from 'react';
import { Crown, Star, ShieldCheck, CreditCard, Award, Sparkles, Trophy, Calendar, MessageSquare, ShoppingBag, Headphones } from 'lucide-react';

interface VIPCardFrontProps {
  celebName: string;
  fanName: string;
  tierTitle: string;
  membershipCardId: string;
  photoUrl?: string;
  joinDate?: string;
  celebPhotoUrl?: string;
}

export const VIPCardFront: React.FC<VIPCardFrontProps> = ({
  celebName,
  fanName,
  tierTitle,
  membershipCardId,
  photoUrl,
  joinDate = '12 JUN 2024',
  celebPhotoUrl
}) => {
  // Safe extraction of tier plan term
  const planLabel = tierTitle?.toUpperCase()?.includes('PLAN') 
    ? tierTitle.toUpperCase() 
    : `${tierTitle?.toUpperCase() || 'GOLD'} PLAN`;

  return (
    <div className="w-full h-full bg-[#05060B] border border-[#DFB15B]/45 rounded-[2rem] overflow-hidden relative select-none shadow-2xl transition-all duration-300 group flex items-center justify-between p-4 sm:p-5 md:p-6">
      {/* Dual border hairlines */}
      <div className="absolute inset-1.5 border border-[#DFB15B]/15 rounded-[1.85rem] pointer-events-none z-10" />
      
      {/* Luxury diagonal brushed texture lines overlay */}
      <div className="absolute inset-0 opacity-[0.06] bg-repeat pointer-events-none z-0" style={{ 
        backgroundImage: `repeating-linear-gradient(45deg, #dfb15b 0px, #dfb15b 1px, transparent 0px, transparent 8px)`,
        backgroundSize: '16px 16px'
      }} />

      {/* Subtle security/radar circular guilloche watermarks */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full border border-[#dfb15b] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full border border-[#dfb15b] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Left-most shimmer sheen effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#DFB15B]/5 to-transparent pointer-events-none z-0 opacity-60" />

      {/* =============================================================== */}
      {/* LEFT PORTRAIT: FAN / MEMBER                                     */}
      {/* =============================================================== */}
      <div className="w-[30%] h-[92%] flex flex-col justify-between items-center text-center z-10 relative">
        <div className="w-full aspect-[0.82] rounded-[1.2rem] overflow-hidden border-2 border-[#DFB15B]/40 shadow-lg relative bg-[#0C1024] p-[1.5px]">
          <div className="w-full h-full rounded-[1.05rem] overflow-hidden relative">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                className="w-full h-full object-cover filter brightness-[1.05] contrast-[1.02]" 
                referrerPolicy="no-referrer"
                alt="VIP Fan Portrait"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#151930] to-[#0A0D1F] gap-1">
                <CreditCard className="w-5 h-5 text-white/10 animate-pulse" />
                <p className="text-[6px] xs:text-[7px] text-white/20 tracking-wider font-bold">NO PIC</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </div>
        </div>
        
        {/* Fan Name Tag */}
        <div className="w-full mt-1.5 min-h-[36px] flex flex-col justify-center">
          <span className="text-[6.5px] xs:text-[7.5px] text-[#818B9C] tracking-[0.2em] font-extrabold uppercase block leading-none">
            VIP MEMBER
          </span>
          <p className="text-[9.5px] xs:text-[11px] sm:text-[12.5px] font-black text-white uppercase tracking-wider truncate block mt-0.5 max-w-full font-sans">
            {fanName || 'MEMBER'}
          </p>
        </div>
      </div>

      {/* =============================================================== */}
      {/* CENTER PILLAR: BRANDING & CHIP                                  */}
      {/* =============================================================== */}
      <div className="w-[36%] h-[95%] flex flex-col justify-between items-center text-center z-10 px-1 py-1">
        
        {/* Branding Head */}
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[9px] xs:text-[11px] sm:text-[13px] md:text-[14px] font-black tracking-[0.16em] bg-gradient-to-r from-[#FDF0CE] via-[#DFB15B] to-[#A37B34] bg-clip-text text-transparent font-sans uppercase leading-none">
            BOOK A CELEBRITY™
          </p>
          <p className="text-[5.5px] xs:text-[6.5px] text-[#A5ABB8] font-extrabold tracking-[0.25em] uppercase leading-none block">
            OFFICIAL VIP ACCESS PASS
          </p>
        </div>

        {/* EMV Microchip Representation */}
        <div className="flex flex-col items-center my-1 sm:my-2 shrink-0">
          <div className="w-8 xs:w-10 h-5 xs:h-6.5 rounded-[4px] bg-gradient-to-r from-[#edd393] via-[#DFB15B] to-[#b38530] p-[1.2px] relative overflow-hidden shadow-lg">
            <div className="w-full h-full border border-black/35 rounded-[2.5px] relative">
              <div className="absolute top-1/2 left-0 right-0 h-[1.2px] bg-black/45 -translate-y-1/2" />
              <div className="absolute top-0 bottom-0 left-1/3 w-[0.8px] bg-black/45" />
              <div className="absolute top-0 bottom-0 right-1/3 w-[0.8px] bg-black/45" />
              <div className="absolute inset-0.5 border border-black/15 rounded-[1.5px] pointer-events-none" />
              <div className="absolute top-0.5 bottom-0.5 left-1/2 w-[0.8px] bg-black/45 -translate-x-1/2" />
            </div>
          </div>
          {/* Wireless icon */}
          <div className="flex justify-center items-center mt-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 opacity-80 shrink-0">
              <path d="M5 12a7 7 0 0 1 2-5M9 12a11 11 0 0 1 3-8M13 12a15 15 0 0 1 4-11" />
            </svg>
          </div>
        </div>

        {/* Level Banner & Credentials */}
        <div className="w-full space-y-1 sm:space-y-1.5">
          {/* Symmetrical Tier Badge */}
          <div className="inline-block px-2 py-0.5 bg-[#15192c] border border-[#dfb15b]/35 rounded-[4px] shadow-sm shadow-[#dfb15b]/10 max-w-full">
            <p className="text-[7px] xs:text-[8px] text-[#DFB15B] font-extrabold tracking-[0.16em] uppercase truncate leading-none py-0.5">
              👑 {planLabel}
            </p>
          </div>

          <p className="text-[7.5px] xs:text-[8.5px] font-mono font-bold text-white/50 leading-none tracking-tight block truncate max-w-full mt-1">
            {membershipCardId}
          </p>

          <p className="text-[5px] xs:text-[5.8px] text-white/35 font-extrabold tracking-[0.18em] uppercase block leading-none">
            SINCE {joinDate}
          </p>
        </div>

      </div>

      {/* =============================================================== */}
      {/* RIGHT PORTRAIT: CELEBRITY / HOST                                */}
      {/* =============================================================== */}
      <div className="w-[30%] h-[92%] flex flex-col justify-between items-center text-center z-10 relative">
        <div className="w-full aspect-[0.82] rounded-[1.2rem] overflow-hidden border-2 border-[#DFB15B]/40 shadow-lg relative bg-[#0C1024] p-[1.5px]">
          <div className="w-full h-full rounded-[1.05rem] overflow-hidden relative">
            {celebPhotoUrl ? (
              <img 
                src={celebPhotoUrl} 
                className="w-full h-full object-cover filter brightness-[1.05] contrast-[1.02]" 
                referrerPolicy="no-referrer"
                alt="VIP Host Celebrity"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#070914] gap-1">
                <Crown size={14} className="text-[#DFB15B] animate-pulse" />
                <p className="text-[6px] xs:text-[7px] text-white/20 tracking-wider font-bold">APPROVED</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </div>
        </div>
        
        {/* Celebrity Name Tag */}
        <div className="w-full mt-1.5 min-h-[36px] flex flex-col justify-center">
          <span className="text-[6.5px] xs:text-[7.5px] text-[#DFB15B] tracking-[0.2em] font-extrabold uppercase block leading-none">
            APPROVED BY
          </span>
          <p className="text-[9.5px] xs:text-[11px] sm:text-[12.5px] font-black bg-gradient-to-r from-[#FFF2CE] to-[#DFB15B] bg-clip-text text-transparent uppercase tracking-wider truncate block mt-0.5 max-w-full font-sans">
            {celebName || 'CELEBRITY'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface VIPCardBackProps {
  celebName: string;
  fanName: string;
  tierTitle: string;
  membershipCardId: string;
  joinDate?: string;
  validUntil?: string;
}

export const VIPCardBack: React.FC<VIPCardBackProps> = ({
  celebName,
  fanName,
  tierTitle,
  membershipCardId,
  joinDate = '12 JUN 2024',
  validUntil = '12 JUN 2025'
}) => {
  return (
    <div className="w-full h-full bg-[#07080F] border border-[#DFB15B]/40 rounded-[2rem] overflow-hidden relative select-none shadow-2xl flex flex-col justify-between p-0">
      {/* Outer hairline details */}
      <div className="absolute inset-1.5 border border-[#DFB15B]/10 rounded-[1.85rem] pointer-events-none z-10" />

      {/* Top golden brushed metallic bar header */}
      <div className="relative z-10 bg-gradient-to-r from-[#DFB15B] via-[#FCECB9] to-[#926922] text-[#0A0D1C] uppercase font-black text-[7.5px] xs:text-[8.5px] tracking-[0.25em] text-center py-2 relative flex items-center justify-center font-sans">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#0A0D1C]/25" />
        OFFICIAL VIP MEMBERSHIP CARD
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#0A0D1C]/25" />
      </div>

      {/* Main double column grid */}
      <div className="relative z-10 grid grid-cols-12 gap-4 px-6 py-4 flex-1">
        
        {/* Left Column: Member details with matching format */}
        <div className="col-span-7 flex flex-col justify-between text-left space-y-3">
          <div className="space-y-2">
            <h5 className="text-[7.5px] xs:text-[8.5px] font-black text-[#DFB15B] tracking-widest uppercase border-b border-white/5 pb-1 max-w-fit">
              MEMBER INFORMATION
            </h5>
            
            {/* Grid properties */}
            <div className="space-y-1 text-[7px] xs:text-[8px] font-bold text-[#9DA0AF] tracking-wide">
              <div className="flex gap-1.5">
                <span className="w-21 xs:w-24 uppercase opacity-45">FULL NAME</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="text-white font-extrabold uppercase truncate">{fanName || 'BENJAMIN'}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-21 xs:w-24 uppercase opacity-45">MEMBERSHIP TIER</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="text-white font-extrabold uppercase truncate">{tierTitle || 'SILVER PLAN'}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-21 xs:w-24 uppercase opacity-45">MEMBERSHIP ID</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="text-white/90 font-mono font-bold truncate">{membershipCardId}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-21 xs:w-24 uppercase opacity-45">JOIN DATE</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="text-white font-extrabold">{joinDate}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-21 xs:w-24 uppercase opacity-45">VALID UNTIL</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="text-white font-extrabold">{validUntil}</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-21 xs:w-24 uppercase opacity-45">STATUS</span>
                <span className="text-[#DFB15B]">:</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[6.5px] xs:text-[7.5px] font-black tracking-widest rounded leading-none">APPROVED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Member benefits listed exactly like the card layout */}
        <div className="col-span-5 text-left flex flex-col justify-between space-y-3 pl-3 border-l border-white/5">
          <div className="space-y-2">
            <h5 className="text-[7.5px] xs:text-[8.5px] font-black text-[#DFB15B] tracking-widest uppercase border-b border-white/5 pb-1 max-w-fit">
              MEMBER BENEFITS
            </h5>
            
            <div className="space-y-1.5">
              {[
                { icon: <Trophy className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'PRIORITY BOOKING ACCESS' },
                { icon: <Calendar className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'EXCLUSIVE EVENTS INVITATION' },
                { icon: <MessageSquare className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'PRIVATE CHAT ACCESS' },
                { icon: <Star className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'BEHIND THE SCENES ACCESS' },
                { icon: <ShoppingBag className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'SPECIAL MERCH DISCOUNTS' },
                { icon: <Headphones className="w-2.5 h-2.5 text-[#DFB15B]" />, text: 'DEDICATED SUPPORT' }
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[5.8px] xs:text-[6.8px] text-white/80 font-black tracking-wider leading-none">
                  <span className="shrink-0">{b.icon}</span>
                  <span className="truncate">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="relative z-10 px-6 pb-5 flex gap-4 items-center border-t border-white/5 pt-3.5">
        
        {/* Bottom Left: Barcode / QR Code placeholder inside double outlines */}
        <div className="w-12 h-12 p-[1px] bg-gradient-to-br from-[#dfb15b] to-[#916922] rounded-[4px] shrink-0">
          <div className="w-full h-full bg-white p-1 rounded-[3px] flex items-center justify-center">
            {/* Elegant SVG QR code layout closely mirroring barcode */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black">
              <path d="M2 2h6v6H2V2zm1 1v4h4V3H3zm13-1h6v6h-6V2zm1 1v4h4V3h-4zm-14 14h6v6H2v-6zm1 1v4h4v-4H3zm12-4h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-8-4h2v2h-2v-2zm0 4h2v2h-2v-2zm2-2h2v2h-2v-2zm-2-2h2v2h-2v-2z" />
            </svg>
          </div>
        </div>

        {/* Bottom Center: certification text paragraph */}
        <div className="flex-1 text-left">
          <p className="text-[6.5px] xs:text-[7.5px] text-white/45 font-bold uppercase tracking-widest leading-normal max-w-[280px]">
            This card certifies that the member is an official VIP member of Book A Celebrity. Card is non-transferable.
          </p>
        </div>

        {/* Bottom Right: Gold Sweep Crown Watermark */}
        <div className="shrink-0 opacity-40 px-1 relative flex items-center h-full">
          {/* Concentric guilloche lines overlapping bottom corner */}
          <div className="absolute right-[-4px] bottom-[-2px] w-20 h-20 opacity-20 bg-repeat pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, #dfb15b 1px, transparent 1px)`,
            backgroundSize: '4px 4px'
          }} />
          <Crown className="w-5 h-5 text-[#DFB15B] text-right" />
        </div>

      </div>

    </div>
  );
};
