import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { motion } from 'motion/react';
import { CelebrityHeader, FAQSection } from '../../components/CelebrityLayout';
import { Calendar, Clock, MapPin, CreditCard, UploadCloud, ShieldCheck, Landmark, Coins, Gift, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const BookingPage = () => {
    const { celebId } = useParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [celeb, setCeleb] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto' | 'giftcard'>('bank');
    const [formData, setFormData] = useState({
        eventType: 'Meet and Greet',
        location: '',
        dateTime: '',
        hours: 1,
        fullName: '',
        email: '',
        phone: '',
        message: ''
    });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'celebrityProfiles', celebId!), (snap) => {
            if (snap.exists()) {
                setCeleb({ id: snap.id, ...snap.data() });
            }
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, `celebrityProfiles/${celebId}`);
        });
        if (user) {
            setFormData(prev => ({ ...prev, fullName: user.displayName || '', email: user.email || '' }));
        }
        return () => unsub();
    }, [celebId, user]);

    const totalPrice = (celeb?.bookingPrice || 0) * formData.hours;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return alert('Upload payment proof');
        setLoading(true);
        try {
            const proofUrl = await uploadToCloudinary(file);
            await addDoc(collection(db, 'bookings'), {
                ...formData,
                totalPrice,
                paymentMethod,
                paymentProof: proofUrl,
                fanId: user?.uid,
                celebId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert('Booking request completed. Sent for verification!');
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
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
                  <ArrowLeft size={14} /> {t('common.back', 'Back')}
                </button>

                <CelebrityHeader celeb={celeb} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <form onSubmit={handleSubmit} className="glass rounded-[3rem] p-4 sm:p-8 md:p-14 space-y-10 border border-white/5">
                            <h2 className="text-3xl font-display font-bold uppercase tracking-tighter italic block border-b border-white/5 pb-4">{t('booking.title', 'Schedule Your Moment')}</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] uppercase font-black opacity-30 mb-2 tracking-widest italic text-white/40">{t('booking.eventTypeProtocol', 'Event Type Protocol')}</label>
                                    <select 
                                      value={formData.eventType}
                                      onChange={e => setFormData({...formData, eventType: e.target.value})}
                                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold outline-none focus:border-primary/50 text-white appearance-none transition-all"
                                    >
                                        <option className="bg-slate-900">Birthday Party</option>
                                        <option className="bg-slate-900">Concert</option>
                                        <option className="bg-slate-900">Wedding</option>
                                        <option className="bg-slate-900">Meet and Greet</option>
                                        <option className="bg-slate-900">Corporate Event</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black opacity-30 mb-2 tracking-widest italic text-white/40">{t('booking.temporalWindow', 'Temporal Window')}</label>
                                    <input 
                                      type="datetime-local" 
                                      value={formData.dateTime}
                                      onChange={e => setFormData({...formData, dateTime: e.target.value})}
                                      required
                                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold outline-none focus:border-primary/50 text-white transition-all font-mono" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black opacity-30 mb-2 tracking-widest italic flex justify-between text-white/40">
                                    {t('booking.chronosAllocation', 'Chronos Allocation (Hours)')} <span>${celeb?.bookingPrice}/hr</span>
                                </label>
                                <input 
                                    type="range" min="1" max="24" 
                                    value={formData.hours}
                                    onChange={e => setFormData({...formData, hours: Number(e.target.value)})}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                                />
                                <div className="flex justify-between text-xs font-black opacity-30 mt-2">
                                    <span>1H</span>
                                    <span className="text-primary opacity-100 font-display italic text-lg">{formData.hours} Hours</span>
                                    <span>24H</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="font-bold uppercase tracking-widest text-white/40 border-l-4 border-primary pl-4 italic">{t('booking.identificationMatrix', 'Identification Matrix')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input placeholder={t('booking.fullNameSignature', 'Full Name Signature')} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-black/40 border border-white/10 rounded-2xl p-4 font-medium text-white outline-none focus:border-primary/50" required />
                                    <input type="email" placeholder={t('booking.communicationEmail', 'Communication Email')} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-black/40 border border-white/10 rounded-2xl p-4 font-medium text-white outline-none focus:border-primary/50" required />
                                    <input placeholder={t('booking.contactCipher', 'Contact Cipher (Phone)')} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-black/40 border border-white/10 rounded-2xl p-4 font-medium text-white outline-none focus:border-primary/50" required />
                                    <input placeholder={t('booking.destinationGeometry', 'Destination Geometry (Location)')} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="bg-black/40 border border-white/10 rounded-2xl p-4 font-medium text-white outline-none focus:border-primary/50" required />
                                </div>
                            </div>

                            {/* Payment Method Protocol Selection */}
                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <h3 className="font-bold uppercase tracking-widest text-white/40 border-l-4 border-primary pl-4 italic">{t('booking.gatewaySelection', 'Payment Gateway Selection')}</h3>
                                
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    {[
                                        { id: 'bank', name: t('booking.bankTransfer', 'Bank Transfer'), icon: <Landmark size={14} /> },
                                        { id: 'crypto', name: t('booking.cryptoWallet', 'Crypto Wallet'), icon: <Coins size={14} /> },
                                        { id: 'giftcard', name: t('booking.giftCard', 'Gift Card'), icon: <Gift size={14} /> }
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

                                {/* Dynamic Payment Info display based on Selection */}
                                <div className="p-4 sm:p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                    {paymentMethod === 'bank' && (
                                        <div className="space-y-3 text-sm text-left">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-primary">{t('booking.bankTransfer', 'Bank Transfer')} Details</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-white/60">
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Bank Name</span>
                                                    <span className="text-white font-bold">{celeb?.payoutBankName || 'Not configured'}</span>
                                                </div>
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Account Name</span>
                                                    <span className="text-white font-bold">{celeb?.payoutAccountName || 'Not configured'}</span>
                                                </div>
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Account Number</span>
                                                    <span className="text-white font-mono font-bold text-sm tracking-widest">{celeb?.payoutAccountNo || 'Not configured'}</span>
                                                </div>
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Routing/SWIFT Address</span>
                                                    <span className="text-white font-mono font-bold">{celeb?.payoutRoutingNo || celeb?.payoutSwiftCode || 'Not configured'}</span>
                                                </div>
                                                {celeb?.payoutBankAddress && (
                                                    <div className="md:col-span-2">
                                                        <span className="block opacity-40 uppercase text-[9px] font-bold">Bank Address</span>
                                                        <span className="text-white font-bold">{celeb?.payoutBankAddress}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'crypto' && (
                                        <div className="space-y-4 text-sm text-left">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-primary">{t('booking.cryptoWallet', 'Crypto Wallet')} Details</p>
                                            <div className="space-y-2 text-xs">
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Token Network</span>
                                                    <span className="text-white font-bold text-sm">{celeb?.cryptoTokenName || 'USDT TRC20'}</span>
                                                </div>
                                                <div>
                                                    <span className="block opacity-40 uppercase text-[9px] font-bold">Wallet Address</span>
                                                    <span className="text-white font-mono font-bold select-all bg-black/60 p-2.5 rounded-lg block text-xs border border-white/5 break-all mt-1">{celeb?.cryptoWalletAddress || 'Not configured'}</span>
                                                </div>
                                                {celeb?.cryptoWalletQR && (
                                                    <div className="flex flex-col items-center justify-center pt-2">
                                                        <span className="block opacity-40 uppercase text-[9px] font-bold self-start mb-2">QR Code Gateway</span>
                                                        <div className="p-3 bg-white rounded-2xl w-44 h-44 flex items-center justify-center shadow-lg">
                                                            <img src={celeb.cryptoWalletQR} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'giftcard' && (
                                        <div className="space-y-3 text-sm text-left">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-primary">{t('booking.giftCard', 'Gift Card')} Details</p>
                                            <div className="text-xs">
                                                <span className="block opacity-40 uppercase text-[9px] font-bold">Supported Card Type</span>
                                                <span className="text-white font-bold text-sm block mt-1">{celeb?.payoutGiftCardName || 'Apple Store Gift Card'}</span>
                                                <p className="mt-2 text-white/50 text-[10px] font-medium italic">Please buy physical token or digital voucher, then upload the redemption pin or receipt as the snapshot reference.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] uppercase font-black opacity-30 mb-4 tracking-widest italic text-white/40">{t('booking.uploadPdfProof', 'Payment Proof Screenshot')}</h4>
                                <div className="h-48 rounded-[2rem] bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center px-10 relative cursor-pointer hover:border-primary/50 transition-all overflow-hidden group">
                                     {file ? <div className="text-primary font-bold animate-pulse">{file.name}</div> : (
                                       <>
                                         <UploadCloud size={32} className="opacity-20 mb-3 group-hover:scale-110 transition-transform text-white" />
                                         <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-white">{t('booking.uploadPdfProof', 'Upload Payment Proof Receipt')}</p>
                                       </>
                                     )}
                                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-30"
                            >
                                {loading ? t('booking.submittingBooking', 'Submitting request...') : t('booking.bookApptAndRoute', 'Confirm Booking')}
                            </button>
                        </form>
                    </div>

                    <div className="space-y-8">
                        <div className="glass rounded-[2rem] p-4 sm:p-8 bg-slate-900 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
                           <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                                <DollarSignIcon />
                           </div>
                           <h4 className="text-[10px] font-black uppercase italic tracking-widest opacity-40 mb-6">{t('common.price', 'Total Price')}</h4>
                           <div className="flex items-baseline gap-2 mb-8">
                               <span className="text-6xl font-display font-black tracking-tighter">${totalPrice.toLocaleString()}</span>
                               <span className="text-xs font-bold opacity-40 uppercase">Total</span>
                           </div>
                           <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4 text-left">
                               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('booking.gatewaySelection', 'Payment Gateway')}</p>
                               <div className="flex justify-between items-center">
                                   <p className="font-bold italic uppercase tracking-wide text-xs">
                                       {paymentMethod === 'bank' ? t('booking.bankTransfer', 'Direct Bank Transfer') : paymentMethod === 'crypto' ? t('booking.cryptoWallet', 'Crypto Gateway') : t('booking.giftCard', 'Gift Card/Voucher')}
                                   </p>
                                   <span className="px-2 py-1 bg-primary text-black text-[8px] font-black rounded uppercase">Selected</span>
                               </div>
                               <p className="text-xs opacity-60 font-medium">Please deposit exactly the calculated price to the details displayed in the selector.</p>
                           </div>
                        </div>

                        <div className="glass rounded-[2rem] p-8 space-y-6 border border-white/5">
                            <h4 className="font-bold uppercase tracking-widest italic text-xs text-white/40">{t('dashboard.systemStatus', 'Secure Payments')}</h4>
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <ShieldCheck size={20} className="text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-tight">{t('dashboard.escrowActive', 'Secure Booking. Your payment is safely held until after the booking completes.')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <FAQSection />
            </div>
        </div>
    );
};

const DollarSignIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);
