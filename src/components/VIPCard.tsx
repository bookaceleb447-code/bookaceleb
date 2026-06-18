import React from 'react';
import { Crown, Star, ShieldCheck, CreditCard, Award, Sparkles, Trophy, Calendar, MessageSquare, ShoppingBag, Headphones } from 'lucide-react';

interface VIPCardFrontProps {
  celebName: string;
  fanName: string;
  tierTitle: string;
  membershipCardId: string;
  photoUrl?: string;
  joinDate?: string;
}

export const VIPCardFront: React.FC<VIPCardFrontProps> = ({
  celebName,
  fanName,
  tierTitle,
  membershipCardId,
  photoUrl,
  joinDate = '12 JUN 2024'
}) => {
  // Safe extraction of tier plan term
  const planLabel = tierTitle?.toUpperCase()?.includes('PLAN') 
    ? tierTitle.toUpperCase() 
    : `${tierTitle?.toUpperCase() || 'GOLD'} PLAN`;

  // Standard VIP display for header shield
  const headerVIPLabel = tierTitle?.toUpperCase()?.replace(' ACCESS', '')?.replace(' PLAN', '')?.replace(' PREMIUM', '')?.replace(' ELITE', '') || 'VIP';

  return (
    <div className="w-full h-full bg-[#0A0C16] border border-[#DFB15B]/50 rounded-[2rem] overflow-hidden relative select-none shadow-2xl transition-all duration-300 group">
      {/* Dual border hairlines */}
      <div className="absolute inset-1.5 border border-[#DFB15B]/15 rounded-[1.85rem] pointer-events-none z-10" />
      
      {/* Luxury diagonal brushed texture lines overlay */}
      <div className="absolute inset-0 opacity-[0.06] bg-repeat pointer-events-none z-0" style={{ 
        backgroundImage: `repeating-linear-gradient(45deg, #dfb15b 0px, #dfb15b 1px, transparent 0px, transparent 8px)`,
        backgroundSize: '16px 16px'
      }} />

      {/* Subtle security/radar circular guilloche watermarks */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]">
        <div className="absolute top-1/2 left-1/4 w-[280px] h-[280px] rounded-full border border-[#dfb15b] -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/4 w-[340px] h-[340px] rounded-full border border-[#dfb15b] -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full border border-[#dfb15b] -translate-y-1/2" />
      </div>

      {/* Left-most shimmer sheen effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#DFB15B]/5 to-transparent pointer-events-none z-0 opacity-60" />

      {/* Main Content Area */}
      <div className="absolute inset-0 flex flex-col justify-between p-7 text-left z-10 w-[55%]">
        
        {/* Top Header Branding & Celebrity Name */}
        <div className="space-y-1">
          <p className="text-[14px] xs:text-[16px] font-extrabold tracking-[0.12em] bg-gradient-to-r from-[#FDF0CE] via-[#DFB15B] to-[#A37B34] bg-clip-text text-transparent font-sans uppercase leading-none">
            BOOK A CELEBRITY™
          </p>
          <p className="text-[7.5px] xs:text-[8.5px] text-[#A5ABB8] font-bold tracking-[0.22em] uppercase leading-none">
            OFFICIAL VIP MEMBERSHIP
          </p>
          
          {/* Displaying Celebrity Name requested placeholder */}
          <div className="inline-flex items-center gap-1 mt-1 bg-[#15192c] border border-[#dfb15b]/25 rounded-md px-2 py-0.5 max-w-full">
            <Sparkles className="w-2.5 h-2.5 text-[#DFB15B] shrink-0" />
            <p className="text-[7.5px] xs:text-[8.5px] text-[#DFB15B] font-extrabold tracking-widest uppercase truncate">
              {celebName || 'Artist Official'}
            </p>
          </div>
        </div>

        {/* EMV Chip & Contactless waves */}
        <div className="flex items-center gap-2.5 mt-2.5">
          {/* Detailed EMV Chip */}
          <div className="w-10 sm:w-11 h-7.5 rounded-[5px] bg-gradient-to-r from-[#edd393] via-[#DFB15B] to-[#b38530] p-[1px] relative overflow-hidden shrink-0 shadow-md">
            <div className="w-full h-full border border-black/35 rounded-[3.5px] relative">
              <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/45 -translate-y-1/2" />
              <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-black/45" />
              <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-black/45" />
              <div className="absolute inset-1 border border-black/15 rounded-[2.5px] pointer-events-none" />
              <div className="absolute top-1 bottom-1 left-1/2 w-[1px] bg-black/45 -translate-x-1/2" />
            </div>
          </div>

          {/* Wireless wave SVG */}
          <svg viewBox="0 0 24 24" fill="none" stroke="#dfb15b" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5 opacity-80 shrink-0">
            <path d="M5 12a7 7 0 0 1 2-5M9 12a11 11 0 0 1 3-8M13 12a15 15 0 0 1 4-11" />
          </svg>
        </div>

        {/* Central Cardholder Name Identity */}
        <div className="my-2.5">
          <h3 className="text-lg xs:text-xl md:text-2xl font-black tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] via-[#FFF3D6] to-[#DFB15B] uppercase leading-none truncate font-sans max-w-full">
            {fanName || 'BENJAMIN'}
          </h3>
          <p className="text-[7px] xs:text-[8px] text-[#818B9C] tracking-[0.18em] font-extrabold uppercase mt-1 leading-none">
            EXCLUSIVE RESIDENT CREATOR
          </p>
        </div>

        {/* Bottom Details Row */}
        <div className="flex justify-between items-end gap-1 border-t border-white/5 pt-2.5">
          {/* Metadata info */}
          <div className="space-y-2 text-[7.5px] uppercase">
            <div className="flex gap-4">
              <div>
                <p className="text-white/30 text-[5.5px] font-black tracking-wider">TIER LEVEL</p>
                <p className="text-[#DFB15B] font-extrabold leading-none mt-0.5">{planLabel}</p>
              </div>
              <div>
                <p className="text-white/30 text-[5.5px] font-black tracking-wider">MEMBER SINCE</p>
                <p className="text-white/90 font-extrabold leading-none mt-0.5">{joinDate}</p>
              </div>
            </div>
            
            <div>
              <p className="text-white/30 text-[5.5px] font-black tracking-wider">MEMBERSHIP ID</p>
              <p className="text-white/90 font-mono font-bold leading-none mt-0.5 tracking-wide">{membershipCardId}</p>
            </div>
          </div>

          {/* Signature script */}
          <div className="flex flex-col text-left pl-1.5 border-l border-white/5">
            <p className="text-sm xs:text-base font-medium text-[#DFB15B] leading-none text-left tracking-wide select-none" style={{ fontFamily: '"Playball", "Alex Brush", cursive, sans-serif' }}>
              Book A Celebrity
            </p>
            <span className="text-[5px] xs:text-[6px] text-white/35 font-extrabold tracking-[0.20em] uppercase leading-none mt-1 whitespace-nowrap">
              AUTHORIZED SIGNATURE
            </span>
          </div>
        </div>

      </div>

      {/* Top Center-Right Hanging Brand Tag */}
      <div 
        className="absolute top-0 left-[55%] -translate-x-1/2 w-[62px] xs:w-[74px] h-[80px] xs:h-[96px] z-20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] pointer-events-none"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)' }}
      >
        <div 
          className="w-full h-full p-[1.5px] bg-gradient-to-b from-[#FFF2CE] via-[#DFB15B] to-[#916922]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)' }}
        >
          <div 
            className="w-full h-full bg-[#0A0B0E] flex flex-col items-center justify-start pt-1.5 xs:pt-2 text-center"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)' }}
          >
            <Crown className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 text-[#DFB15B]" />
            <span className="text-[5.5px] xs:text-[6.5px] font-bold text-white/40 tracking-[0.1em] uppercase leading-none mt-1">PLATINUM</span>
            <span className="text-[14px] xs:text-[18px] font-sans font-black text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#ecd59d] to-[#DFB15B] leading-none mt-0.5 tracking-tight">VIP</span>
            <span className="text-[5.5px] xs:text-[6.5px] font-extrabold text-[#DFB15B]/95 tracking-[0.12em] uppercase leading-none mt-1">MEMBER</span>
          </div>
        </div>
      </div>

      {/* Sweeping Concave Curved Portrait Picture Section (Right Side) */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-[48%] h-full z-10 overflow-hidden"
        style={{ borderTopRightRadius: '1.92rem', borderBottomRightRadius: '1.92rem' }}
      >
        {/* The arched clipping boundaries */}
        <div 
          className="absolute inset-0 w-full h-full scale-[1.03] translate-x-[4%] -translate-y-[1%] rounded-l-[50px] xs:rounded-l-[70px] sm:rounded-l-[90px] border-l-[3px] border-[#DFB15B] bg-[#0A0B10] overflow-hidden" 
          style={{ boxShadow: '-8px 0 24px rgba(0,0,0,0.7)' }}
        >
          {photoUrl ? (
            <img 
              src={photoUrl} 
              className="w-full h-full object-cover filter brightness-[1.1] contrast-[1.05]" 
              referrerPolicy="no-referrer"
              alt="VIP Cardholder Portrait"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#151930] to-[#0A0D1F] gap-2">
              <CreditCard className="w-6 h-6 text-white/10 animate-pulse" />
              <p className="text-[7px] text-white/20 tracking-wider">NO PHOTO</p>
            </div>
          )}
          {/* Subtle bottom shadowing for the face */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Verification Scalloped Medal Seal */}
      <div 
        className="absolute bottom-[24px] right-[24px] z-30 w-[64px] xs:w-[76px] h-[64px] xs:h-[76px] bg-gradient-to-br from-[#eddba1] via-[#DFB15B] to-[#916922] rounded-full p-[1.5px] shadow-[0_6px_20px_rgba(0,0,0,0.65)] flex items-center justify-center transition-transform group-hover:scale-105 duration-300"
      >
        {/* Inner dotted tracking gold circle */}
        <div className="absolute inset-[1.5px] border border-dashed border-[#DFB15B]/35 rounded-full" />
        
        {/* Solid Center */}
        <div className="w-full h-full rounded-full bg-gradient-to-b from-[#111322] to-[#070914] flex flex-col items-center justify-center p-1.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45" />
          
          <Crown className="w-2.5 h-2.5 text-[#DFB15B]" />
          <span className="text-[6.5px] xs:text-[7.5px] font-black text-[#DFB15B] tracking-[0.16em] uppercase leading-tight mt-0.5 xs:mt-1">VERIFIED</span>
          <span className="text-[5.5px] xs:text-[6.5px] font-black text-white/90 tracking-[0.2em] uppercase leading-none">MEMBER</span>
          
          {/* 3 stars */}
          <div className="flex gap-[1px] mt-1 text-[#DFB15B]">
            <Star className="w-1 h-1 fill-current stroke-none" />
            <Star className="w-1.5 h-1.5 fill-current stroke-none" />
            <Star className="w-1 h-1 fill-current stroke-none" />
          </div>
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
