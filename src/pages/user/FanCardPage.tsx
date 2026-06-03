import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { motion } from 'motion/react';
import { CelebrityHeader, FAQSection } from '../../components/CelebrityLayout';
import { CreditCard, UploadCloud, CheckCircle, Crown, Star, Sparkles, Landmark, Coins, Gift, ArrowLeft } from 'lucide-react';

const MEMBERSHIP_TIERS = [
    { id: 'silver', title: 'Silver Access', price: 99, perks: ['Priority Booking', 'Basic Badge', 'Event Access'] },
    { id: 'gold', title: 'Gold Premium', price: 199, perks: ['All Silver Perks', 'Private Q&A', 'Merch Discounts', 'Personal Shoutout'], recommended: true },
    { id: 'platinum', title: 'Platinum Elite', price: 399, perks: ['All Gold Perks', 'VIP Backstage', 'Luxury Welcome Box', 'Direct DM Access'] }
];

export const FanCardPage = () => {
    const { celebId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [celeb, setCeleb] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [selectedTier, setSelectedTier] = useState(MEMBERSHIP_TIERS[1].id);
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto' | 'giftcard'>('bank');
    const [userMemberships, setUserMemberships] = useState<any[]>([]);

    useEffect(() => {
        if (!user || !celebId) return;
        const q = query(
            collection(db, 'memberships'),
            where('fanId', '==', user.uid),
            where('celebId', '==', celebId)
        );
        const unsub = onSnapshot(q, (snap) => {
            setUserMemberships(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'memberships');
        });
        return () => unsub();
    }, [user, celebId]);

    const handleDownloadCard = async (imageUrl: string, tierTitle: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${tierTitle.replace(/\s+/g, '_')}_Fan_Card.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            window.open(imageUrl, '_blank');
        }
    };

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'celebrityProfiles', celebId!), (snap) => {
            if (snap.exists()) {
                setCeleb({ id: snap.id, ...snap.data() });
            }
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, `celebrityProfiles/${celebId}`);
        });
        return () => unsub();
    }, [celebId]);

    const plans = celeb?.membershipPlans && celeb.membershipPlans.length > 0 ? celeb.membershipPlans : MEMBERSHIP_TIERS;

    useEffect(() => {
        if (plans && plans.length > 0 && !plans.some((p: any) => p.id === selectedTier)) {
            const rec = plans.find((p: any) => p.recommended || p.badge?.toLowerCase() === 'recommended');
            setSelectedTier(rec ? rec.id : plans[0].id);
        }
    }, [celeb]);

    const handleSubmit = async () => {
        if (!file) return alert('Protocol requires payment proof upload');
        setLoading(true);
        try {
            const proofUrl = await uploadToCloudinary(file);
            await addDoc(collection(db, 'memberships'), {
                tier: selectedTier,
                tierTitle: currentTier?.title || 'Bespoke Plan',
                price: currentTier?.price || 0,
                paymentMethod,
                paymentProof: proofUrl,
                fanId: user?.uid,
                fanName: user?.displayName || user?.email || 'Elite Fan',
                fanEmail: user?.email || '',
                celebId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert('Membership purchase successful! We are reviewing your payment and your fan card will be sent to your verified email address shortly.');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const currentTier = plans.find((t: any) => t.id === selectedTier) || plans[0];

    return (
        <div className="min-h-screen bg-[#020512] py-12 px-6 text-white font-sans relative overflow-hidden">
            {/* Dynamic Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[600px] opacity-20 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-indigo-500/10 blur-[130px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <button 
                  onClick={() => navigate(-1)} 
                  className="mb-8 flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-row justify-between items-center mb-12 pb-6 border-b border-white/5 gap-4 text-left"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                        <Crown size={10} /> Fan Protocol Access
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight uppercase italic text-white flex items-center gap-3">
                      VIP Fan Protocol
                    </h1>
                    <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                      Exclusive membership authentication
                    </p>
                  </div>
                </motion.div>

                <CelebrityHeader celeb={celeb} />

                {userMemberships.length > 0 && (
                    <div className="mb-16 mt-12 space-y-8 text-left">
                        <h2 className="text-3xl font-display font-black tracking-tight uppercase italic text-white flex items-center gap-3">
                            <Sparkles className="text-primary animate-pulse" /> My Premium Fan Cards
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {userMemberships.map((m) => {
                                const isApproved = m.status === 'approved';
                                return (
                                    <div 
                                        key={m.id} 
                                        className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-4 sm:p-6 md:p-10 relative overflow-hidden flex flex-col justify-between min-h-[320px] shadow-2xl group transition-all"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity" />

                                        <div className="relative z-10 flex justify-between items-start gap-4">
                                            <div>
                                                <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-md ${
                                                    isApproved ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-300 border border-amber-500/10'
                                                }`}>
                                                    {m.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                                <h3 className="text-2xl font-black uppercase tracking-tight italic text-white mt-3">{m.tierTitle}</h3>
                                                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Verified Elite Tier</p>
                                            </div>
                                            <div className="text-right text-xs">
                                                <p className="font-mono text-white/30 text-[9px]">ID: {m.id.substring(0, 8).toUpperCase()}</p>
                                                <p className="text-primary font-bold text-sm mt-1">${m.price}</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 my-6 bg-black/40 border border-white/5 rounded-3xl overflow-hidden p-1 flex items-center justify-center min-h-[160px]">
                                            {m.fanCardImage ? (
                                                <div className="relative w-full group/img">
                                                    {m.fanCardImage.toLowerCase().endsWith('.pdf') ? (
                                                        <div className="p-8 text-center space-y-3 w-full">
                                                            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-xs font-black">
                                                                PDF
                                                            </div>
                                                            <p className="text-xs font-black uppercase tracking-widest text-white">Official Membership PDF Document</p>
                                                            <p className="text-[10px] text-white/40 uppercase">Uploaded secure verification credentials</p>
                                                        </div>
                                                    ) : (
                                                        <img 
                                                            src={m.fanCardImage} 
                                                            alt="Official Fan Card" 
                                                            className="w-full h-auto rounded-2xl border border-white/5 object-cover max-h-56 transition-all" 
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                                                        <button 
                                                            onClick={() => handleDownloadCard(m.fanCardImage, m.tierTitle)}
                                                            className="px-4 py-2 bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <UploadCloud size={12} className="rotate-180" /> Direct Download
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6 space-y-2">
                                                    <CreditCard size={32} className="mx-auto text-white/10 animate-pulse" />
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-primary/70 leading-relaxed uppercase">VERIFICATION IN PROGRESS</p>
                                                    <p className="text-[9px] text-white/30 leading-relaxed max-w-[280px]">
                                                        {isApproved 
                                                            ? 'Your card is currently being personalized by the celebrity. It will resolve in real-time shortly.' 
                                                            : 'We are verifying your payment receipt. The card details will unlock once approved.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative z-10 flex justify-between items-center text-[10px] border-t border-white/5 pt-4">
                                            <div className="min-w-0 pr-2 flex-1">
                                                <p className="opacity-30 uppercase font-black text-[8px]">Cardholder</p>
                                                <p className="text-white font-bold uppercase tracking-tight mt-0.5 truncate" title={user?.displayName || 'Elite Supporter'}>{user?.displayName || 'Elite Supporter'}</p>
                                            </div>
                                            {m.fanCardImage && (
                                                <button 
                                                    onClick={() => handleDownloadCard(m.fanCardImage, m.tierTitle)}
                                                    className="py-2 px-3 bg-white/5 hover:bg-primary hover:text-black border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                                >
                                                    <UploadCloud size={11} className="rotate-180" /> Download Card
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-slate-900/45 border border-white/5 p-4 sm:p-6 md:p-8 rounded-[2rem] space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Protocol Purchase History</h4>
                            <div className="space-y-2 divide-y divide-white/5">
                                {userMemberships.map((m) => (
                                    <div key={m.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-3 min-w-0">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-primary font-mono text-[10px] shrink-0">
                                                {m.tierTitle?.[0] || 'M'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-extrabold text-white truncate">{m.tierTitle} Membership</p>
                                                <p className="text-[9px] text-white/30 font-mono truncate">Gateway Ref: {m.id?.substring(0, 8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-left sm:text-right shrink-0">
                                            <div>
                                                <p className="font-mono text-white/75 font-semibold">${m.price}</p>
                                                <p className="text-[9px] text-white/30 lowercase">{m.paymentMethod} payment</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                                m.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                                {m.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {plans.map((tier: any) => (
                                 <div 
                                    key={tier.id}
                                    onClick={() => setSelectedTier(tier.id)}
                                    className={`relative p-8 rounded-[2.5rem] border cursor-pointer transition-all flex flex-col justify-between overflow-hidden group ${
                                        selectedTier === tier.id ? 'border-primary bg-white/5 shadow-2xl scale-105' : 'border-white/5 bg-white/5 hover:border-primary/30'
                                    }`}
                                 >
                                     {(tier.recommended || tier.badge) && (
                                         <div className="absolute top-0 right-0 bg-primary text-black text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-[0.2em]">
                                             {tier.badge || 'Recommended'}
                                         </div>
                                     )}
                                     <div>
                                        <h3 className={`text-xl font-bold uppercase tracking-tight mb-2 ${selectedTier === tier.id ? 'text-primary' : 'text-white/40'}`}>{tier.title}</h3>
                                        <div className="flex items-baseline gap-1 mb-8">
                                            <span className="text-3xl font-display font-black tracking-tighter text-white">${tier.price}</span>
                                            <span className="text-[10px] font-bold opacity-30 uppercase text-white/40">/YR</span>
                                        </div>
                                        <ul className="space-y-3">
                                            {tier.perks?.map((p: string) => (
                                                <li key={p} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-60 text-white/80">
                                                    <CheckCircle size={14} className="text-primary shrink-0" /> {p}
                                                </li>
                                            ))}
                                        </ul>
                                     </div>
                                     {selectedTier === tier.id && <motion.div layoutId="select" className="absolute bottom-0 left-0 w-full h-1.5 bg-primary" />}
                                 </div>
                             ))}
                         </div>

                          <form className="glass rounded-[3rem] p-4 sm:p-8 md:p-12 space-y-10 border border-white/5">
                              <h3 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tighter italic border-b border-white/5 pb-6 text-white text-left">Identification Protocol</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2 text-left">
                                      <label className="text-[10px] font-black uppercase opacity-30 italic tracking-widest ml-4 text-white/40">Full Name</label>
                                      <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white outline-none focus:border-primary/50" placeholder="e.g. Leonardo DiCaprio Fan" />
                                  </div>
                                  <div className="space-y-2 text-left">
                                      <label className="text-[10px] font-black uppercase opacity-30 italic tracking-widest ml-4 text-white/40">Date of Birth</label>
                                      <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white outline-none focus:border-primary/50" />
                                  </div>
                              </div>
                              
                              {/* Payment Method Selector switcher */}
                              <div className="space-y-6 pt-6 border-t border-white/5">
                                  <h3 className="font-bold uppercase tracking-widest text-white/40 border-l-4 border-primary pl-4 italic text-left">Payment Gateway Selection</h3>
                                  
                                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                      {[
                                          { id: 'bank', name: 'Bank Transfer', icon: <Landmark size={14} /> },
                                          { id: 'crypto', name: 'Crypto Wallet', icon: <Coins size={14} /> },
                                          { id: 'giftcard', name: 'Gift Card', icon: <Gift size={14} /> }
                                      ].map(method => (
                                          <button
                                              type="button"
                                              key={method.id}
                                              onClick={() => setPaymentMethod(method.id as any)}
                                              className={`p-2.5 sm:p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 border text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all break-words word-break-normal overflow-wrap-anywhere ${
                                                  paymentMethod === method.id 
                                                      ? 'bg-primary text-black border-primary shadow-xl shadow-primary/10' 
                                                      : 'bg-black/40 text-white/60 border-white/10 hover:bg-white/5 hover:text-white'
                                              }`}
                                          >
                                              {method.icon}
                                              <span className="text-center">{method.name}</span>
                                          </button>
                                      ))}
                                  </div>

                                  {/* Configure details panel based on Selection */}
                                  <div className="p-4 sm:p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                      {paymentMethod === 'bank' && (
                                          <div className="space-y-3 text-sm text-left">
                                              <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Bank Details</p>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-white/60">
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Bank Name</span>
                                                      <span className="text-white font-bold">{celeb?.payoutBankName || 'Not configured'}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Account Name</span>
                                                      <span className="text-white font-bold">{celeb?.payoutAccountName || 'Not configured'}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Account Number</span>
                                                      <span className="text-white font-mono font-bold text-sm tracking-wider">{celeb?.payoutAccountNo || 'Not configured'}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Routing/SWIFT</span>
                                                      <span className="text-white font-mono font-bold">{celeb?.payoutRoutingNo || celeb?.payoutSwiftCode || 'Not configured'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      )}

                                      {paymentMethod === 'crypto' && (
                                          <div className="space-y-4 text-sm text-left">
                                              <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Crypto Address</p>
                                              <div className="space-y-2 text-xs">
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Network Name</span>
                                                      <span className="text-white font-bold text-sm">{celeb?.cryptoTokenName || 'USDT TRC20'}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block opacity-45 uppercase text-[9px]">Wallet Address</span>
                                                      <span className="text-white font-mono font-bold select-all bg-black/60 p-2 text-xs border border-white/5 block break-all mt-1">{celeb?.cryptoWalletAddress || 'Not configured'}</span>
                                                  </div>
                                                  {celeb?.cryptoWalletQR && (
                                                      <div className="flex flex-col items-center pt-2">
                                                          <div className="p-3 bg-white rounded-xl w-36 h-36 flex items-center justify-center">
                                                              <img src={celeb.cryptoWalletQR} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      )}

                                      {paymentMethod === 'giftcard' && (
                                          <div className="space-y-3 text-sm text-left">
                                              <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Gift Card</p>
                                              <div className="text-xs">
                                                  <span className="block opacity-45 uppercase text-[9px]">Voucher Type</span>
                                                  <span className="text-white font-bold block mt-1">{celeb?.payoutGiftCardName || 'Apple Store Gift Card'}</span>
                                                  <p className="mt-1 text-white/40 text-[9px] leading-relaxed">Provide and upload redemption snapshots cleanly.</p>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>

                              <div className="space-y-6">
                                 <label className="block text-[10px] uppercase font-black opacity-30 tracking-[0.2em] italic text-white/40 text-left">Authentication Snapshot (Payment Proof)</label>
                                 <div className="h-48 rounded-[2rem] bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center px-10 relative cursor-pointer hover:border-primary/50 transition-all group">
                                      {file ? <p className="text-primary font-bold uppercase italic">{file.name}</p> : (
                                        <>
                                          <UploadCloud size={32} className="opacity-20 mb-3 group-hover:scale-110 transition-all text-white" />
                                          <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-white">Drop Proof Snapshot</p>
                                        </>
                                      )}
                                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
                                 </div>
                              </div>

                              <button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !file}
                                className="w-full py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-30"
                              >
                                  {loading ? 'Submitting request...' : 'Confirm Membership Tier'}
                              </button>
                          </form>
                    </div>

                    <div className="space-y-8">
                        <div className="glass rounded-[3rem] p-4 sm:p-8 md:p-10 bg-slate-900 text-white relative overflow-hidden group shadow-2xl border border-white/5">
                             <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                <Sparkles size={180} />
                             </div>
                             <div className="relative z-10 space-y-10">
                                 <div>
                                    <h4 className="text-[10px] font-black uppercase italic tracking-widest opacity-40 mb-6 underline decoration-white/20">Selected Tier</h4>
                                    <p className="text-5xl font-display font-black tracking-tighter italic uppercase text-primary leading-none mb-2">{currentTier?.title}</p>
                                    <p className="text-sm font-bold opacity-60 italic">Membership Status: {selectedTier === 'platinum' ? 'ELITE' : 'ACTIVE'}</p>
                                 </div>

                                 <div className="space-y-6 pt-10 border-t border-white/5">
                                     <div>
                                         <p className="text-[10px] font-black uppercase opacity-40 mb-2 tracking-widest text-white/40">Membership Cost</p>
                                         <p className="text-4xl font-display font-black tracking-tighter text-white">${currentTier?.price}</p>
                                     </div>
                                     <div className="p-5 bg-white/5 rounded-3xl border border-white/10 italic">
                                         <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-widest text-white/40">Identification Key</p>
                                         <p className="text-xs font-medium opacity-70 leading-relaxed text-white/60">Your Fan Card will be generated as a high-security PDF containing a unique QR Protocol ID for VIP entries.</p>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="p-8 glass rounded-[2.5rem] flex items-center gap-4 border border-white/5">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Star size={24}/></div>
                            <p className="text-[10px] font-black uppercase opacity-50 tracking-widest leading-tight text-white/60">Digital Fan Card authentication sent to verified email shortly after verification.</p>
                        </div>
                    </div>
                </div>

                <FAQSection />
            </div>
        </div>
    );
};
