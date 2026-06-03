import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { motion } from 'motion/react';
import { CelebrityHeader, FAQSection } from '../../components/CelebrityLayout';
import { Heart, UploadCloud, ShieldCheck, CheckCircle, Globe, Landmark, Coins, Gift, ArrowLeft } from 'lucide-react';

const CHARITY_TYPES = [
    { id: 'edu', title: "Children's Education Foundation", desc: "Supporting education for underprivileged children worldwide." },
    { id: 'env', title: "Environmental Conservation", desc: "Climate change and environmental protection initiatives." },
    { id: 'health', title: "Healthcare Access", desc: "Providing medical care to communities in need." }
];

export const DonationPage = () => {
    const { celebId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [celeb, setCeleb] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [amount, setAmount] = useState(500);
    const [selectedCharity, setSelectedCharity] = useState(CHARITY_TYPES[0].id);
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto' | 'giftcard'>('bank');

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

    const handleSubmit = async () => {
        if (!file) return alert('Upload validation snapshot');
        setLoading(true);
        try {
            const proofUrl = await uploadToCloudinary(file);
            await addDoc(collection(db, 'donations'), {
                amount,
                charityType: selectedCharity,
                paymentMethod,
                paymentProof: proofUrl,
                fanId: user?.uid,
                fanName: user?.displayName || user?.email?.split('@')[0] || 'Member Fan',
                fanEmail: user?.email || '',
                celebId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert('Thank you! Your donation was submitted successfully.');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

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
                        <Heart size={10} /> Charity Ally
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight uppercase italic text-white">
                      Diamond Charity Portal
                    </h1>
                    <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                      Transforming fame into global impact
                    </p>
                  </div>
                </motion.div>

                <CelebrityHeader celeb={celeb} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 glass rounded-[3rem] p-6 sm:p-10 md:p-12 space-y-10 border border-white/5">
                        <h2 className="text-3xl font-display font-bold uppercase tracking-tighter italic border-b border-white/5 pb-6 text-white text-left">Define Your Impact</h2>
                        
                        <div className="space-y-6">
                            <label className="block text-[10px] uppercase font-black opacity-30 tracking-[0.2em] italic text-white/40">Contribution Tier (USD)</label>
                            <div className="grid grid-cols-3 gap-4">
                                {[100, 500, 1000].map(val => (
                                    <button 
                                      key={val} 
                                      onClick={() => setAmount(val)} 
                                      className={`py-4 rounded-2xl font-black text-xl transition-all ${amount === val ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}`}
                                    >
                                        ${val}
                                    </button>
                                ))}
                            </div>
                            <input 
                               type="number" 
                               value={amount} 
                               onChange={e => setAmount(Number(e.target.value))}
                               className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-center text-2xl font-display font-black text-white outline-none focus:border-primary/50" 
                            />
                        </div>

                        <div className="space-y-4">
                             <label className="block text-[10px] uppercase font-black opacity-30 tracking-[0.2em] italic text-white/40">Allocation Protocol</label>
                             <div className="space-y-3">
                                {CHARITY_TYPES.map(type => (
                                    <div 
                                      key={type.id} 
                                      onClick={() => setSelectedCharity(type.id)}
                                      className={`p-6 rounded-3xl border transition-all cursor-pointer flex gap-4 items-start ${selectedCharity === type.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                    >
                                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedCharity === type.id ? 'border-primary' : 'border-white/10'}`}>
                                            {selectedCharity === type.id && <div className="h-2.5 w-2.5 bg-primary rounded-full" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm uppercase tracking-wide text-white">{type.title}</h4>
                                            <p className="text-xs text-white/40 font-medium italic mt-1">{type.desc}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass rounded-[3rem] p-4 sm:p-8 md:p-12 bg-slate-900 text-white space-y-8 relative overflow-hidden group shadow-2xl border border-white/5">
                             <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 group-hover:rotate-45 transition-transform duration-1000 pointer-events-none">
                                <Globe size={180} />
                             </div>
                             <h3 className="font-bold uppercase tracking-widest text-white/40 border-l-4 border-primary pl-4 italic text-left">Payment Gateway Selection</h3>
                             
                             {/* Payment Method Selector Cards */}
                             <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                 {[
                                     { id: 'bank', name: 'Bank', icon: <Landmark size={14} /> },
                                     { id: 'crypto', name: 'Crypto', icon: <Coins size={14} /> },
                                     { id: 'giftcard', name: 'Gift Card', icon: <Gift size={14} /> }
                                 ].map(method => (
                                     <button
                                         type="button"
                                         key={method.id}
                                         onClick={() => setPaymentMethod(method.id as any)}
                                         className={`p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all break-words word-break-normal overflow-wrap-anywhere ${
                                             paymentMethod === method.id 
                                                 ? 'bg-primary text-black border-primary shadow-xl shadow-primary/10'                                                 : 'bg-black/40 text-white/60 border-white/10 hover:bg-white/5 hover:text-white'
                                         }`}
                                     >
                                         {method.icon}
                                         <span className="text-center">{method.name}</span>
                                     </button>
                                 ))}
                             </div>

                             {/* Dynamic Configured Info Panel */}
                             <div className="p-4 sm:p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4 text-xs font-semibold">
                                 {paymentMethod === 'bank' && (
                                      <div className="space-y-3 text-left">
                                         <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Bank Transfer Box</p>
                                         <div className="space-y-2 text-white/70">
                                             <p><span className="opacity-40 uppercase text-[9px] block">Bank Name</span> <strong className="text-white font-bold">{celeb?.payoutBankName || 'Not configured'}</strong></p>
                                             <p><span className="opacity-40 uppercase text-[9px] block">Acc Name</span> <strong className="text-white font-bold">{celeb?.payoutAccountName || 'Not configured'}</strong></p>
                                             <p><span className="opacity-40 uppercase text-[9px] block">Acc Number</span> <strong className="text-white font-mono font-bold tracking-wider text-sm">{celeb?.payoutAccountNo || 'Not configured'}</strong></p>
                                             {celeb?.payoutRoutingNo && <p><span className="opacity-40 uppercase text-[9px] block">Routing / Code</span> <strong className="text-white font-mono font-bold">{celeb?.payoutRoutingNo}</strong></p>}
                                         </div>
                                     </div>
                                 )}

                                 {paymentMethod === 'crypto' && (
                                      <div className="space-y-3 text-left">
                                         <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Crypto Token</p>
                                         <div className="space-y-2 text-white/70">
                                             <p><span className="opacity-40 uppercase text-[9px] block">Network</span> <strong className="text-white font-bold">{celeb?.cryptoTokenName || 'USDT TRC20'}</strong></p>
                                             <p><span className="opacity-40 uppercase text-[9px] block">Address</span> <strong className="text-white font-mono font-bold select-all bg-black/50 p-2 rounded block break-all text-[11px] border border-white/5 mt-1">{celeb?.cryptoWalletAddress || 'Not configured'}</strong></p>
                                             {celeb?.cryptoWalletQR && (
                                                 <div className="flex flex-col items-center pt-2">
                                                     <div className="p-2 bg-white rounded-xl w-32 h-32 flex items-center justify-center">
                                                         <img src={celeb.cryptoWalletQR} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )}

                                 {paymentMethod === 'giftcard' && (
                                      <div className="space-y-2 text-left text-xs">
                                         <p className="text-[10px] uppercase font-black tracking-widest text-primary">Celebrity Gift Card</p>
                                         <p><span className="opacity-40 uppercase text-[9px] block">Required Voucher</span> <strong className="text-white font-bold">{celeb?.payoutGiftCardName || 'Apple Store Gift Card'}</strong></p>
                                         <p className="text-white/40 text-[9px] leading-relaxed italic">Purchase and submit screenshots of the barcode or active redemption card proof cleanly.</p>
                                     </div>
                                 )}
                             </div>

                             <div className="pt-2 space-y-6">
                                <label className="block text-[10px] uppercase font-black opacity-30 tracking-[0.2em] italic text-white/40">Upload Payment Receipt</label>
                                <div className="h-44 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center px-10 relative cursor-pointer hover:border-primary transition-all bg-black/40">
                                    {file ? (
                                        <div className="space-y-2">
                                            <p className="text-primary font-extrabold uppercase tracking-widest text-[11px]">✓ File Selected</p>
                                            <p className="text-white/75 font-mono text-[10px] truncate max-w-[220px]">{file.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud size={24} className="opacity-45 mb-2 text-primary" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white mt-1">
                                                {paymentMethod === 'bank' ? 'Upload Bank Transfer Slip' :
                                                 paymentMethod === 'crypto' ? 'Upload TX Screenshot' :
                                                 'Upload Card & Receipt'}
                                            </p>
                                        </>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
                                </div>
                             </div>

                             <button 
                                onClick={handleSubmit} 
                                disabled={loading || !file}
                                className="w-full py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-30"
                             >
                                {loading ? 'Submitting...' : 'Make Donation'}
                             </button>
                        </div>
                        
                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><CheckCircle size={24}/></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 leading-tight text-white/60">100% of your contribution (net processing) goes directly to the chosen foundation.</p>
                        </div>
                    </div>
                </div>

                <FAQSection />
            </div>
        </div>
    );
};
