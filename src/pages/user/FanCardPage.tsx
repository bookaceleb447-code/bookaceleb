import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, getDoc, addDoc, collection, serverTimestamp, query, where, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { motion, AnimatePresence } from 'motion/react';
import { CelebrityHeader, FAQSection } from '../../components/CelebrityLayout';
import { 
  CreditCard, 
  UploadCloud, 
  CheckCircle, 
  Crown, 
  Star, 
  Sparkles, 
  Landmark, 
  Coins, 
  Gift, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  Award 
} from 'lucide-react';

const MEMBERSHIP_TIERS = [
  { id: 'silver', title: 'Silver Access', price: 99, perks: ['Priority Booking Access', 'Basic Verified Badge', 'Standard Event Access'] },
  { id: 'gold', title: 'Gold Premium', price: 199, perks: ['Priority Booking Access', 'Private Chat Access', 'VIP Event Invitations', 'Celebrity Merch Discounts'], recommended: true },
  { id: 'platinum', title: 'Platinum Elite', price: 399, perks: ['Priority Booking Access', 'Private Chat Access', 'VIP Event Invitations', 'Exclusive Celebrity Content', 'Personalized Video Messages'] }
];

export const FanCardPage = () => {
  const { celebId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Celebrity info
  const [celeb, setCeleb] = useState<any>(null);
  
  // Registration Stepper: 
  // 0: Plan Select, 1: Account Details, 2: Card Customization, 3: Payment/Proof, 4: Success Message
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userMemberships, setUserMemberships] = useState<any[]>([]);

  // Form Fields
  const [selectedTier, setSelectedTier] = useState(MEMBERSHIP_TIERS[1].id);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto' | 'giftcard'>('bank');
  
  // Step 1: Account Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dob, setDob] = useState('');

  // Step 2: Card Customization
  const [cardName, setCardName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  // Step 3: Payment Proof
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');

  // 3D Card flips
  const [isFlipped, setIsFlipped] = useState(false);
  const [membershipCardId, setMembershipCardId] = useState('');

  // Toast message
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Generate a realistic Membership ID on render
  useEffect(() => {
    const randomId = 'BAC-VIP-' + Math.floor(100000 + Math.random() * 900000);
    setMembershipCardId(randomId);
  }, []);

  // Sync user info initially
  useEffect(() => {
    if (user) {
      setFullName(user.displayName || '');
      setCardName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Read User assigned celebrity and memberships
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

  // Read assigned celebrity profile details
  useEffect(() => {
    if (!celebId) return;
    const unsub = onSnapshot(doc(db, 'celebrityProfiles', celebId), (snap) => {
      if (snap.exists()) {
        setCeleb({ id: snap.id, ...snap.data() });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `celebrityProfiles/${celebId}`);
    });
    return () => unsub();
  }, [celebId]);

  const plans = celeb?.membershipPlans && celeb.membershipPlans.length > 0 ? celeb.membershipPlans : MEMBERSHIP_TIERS;
  const currentTier = plans.find((t: any) => t.id === selectedTier) || plans[0];

  useEffect(() => {
    if (plans && plans.length > 0 && !plans.some((p: any) => p.id === selectedTier)) {
      const rec = plans.find((p: any) => p.recommended || p.badge?.toLowerCase() === 'recommended');
      setSelectedTier(rec ? rec.id : plans[0].id);
    }
  }, [celeb]);

  // Handle Photo input select & preview
  const handlePhotoChange = (file: File | null) => {
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Proof input select & preview
  const handleProofChange = (file: File | null) => {
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form step navigation checks
  const validateStep1 = () => {
    if (!fullName.trim()) {
      alert('Please enter your full name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return false;
    }
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number.');
      return false;
    }
    if (!dob) {
      alert('Please enter your date of birth.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!cardName.trim()) {
      alert('Please enter the name to appear on the VIP card.');
      return false;
    }
    if (!photoFile && !photoPreview) {
      alert('Please upload a high-quality profile picture for your fan card.');
      return false;
    }
    return true;
  };

  // Main purchase submission
  const handleSubmitPurchase = async () => {
    if (!proofFile) {
      alert('A valid payment screenshot proof is required to submit transaction.');
      return;
    }
    setLoading(true);
    try {
      // 1. Upload portrait picture to Cloudinary
      let uploadedPhotoUrl = '';
      if (photoFile) {
        uploadedPhotoUrl = await uploadToCloudinary(photoFile);
      } else {
        uploadedPhotoUrl = photoPreview; // fallback URL or placeholder
      }

      // 2. Upload payment proof to Cloudinary
      const uploadedProofUrl = await uploadToCloudinary(proofFile);

      // Save user assigned details back to general user catalog
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          assignedCelebrityId: celebId,
          assignedCelebrityName: celeb?.celebName || '',
          referralCode: celeb?.slug || '',
          phoneNumber: phoneNumber,
          dob: dob,
          cardHolderName: cardName,
          cardPhotoUrl: uploadedPhotoUrl
        }, { merge: true });
      }

      // 3. Create Membership Record
      await addDoc(collection(db, 'memberships'), {
        membershipCardId: membershipCardId,
        tier: selectedTier,
        tierTitle: currentTier?.title || 'Elite Plan',
        price: currentTier?.price || 0,
        paymentMethod,
        paymentProof: uploadedProofUrl,
        fanId: user?.uid,
        fanName: cardName,
        fullname: fullName,
        email: email,
        phoneNumber: phoneNumber,
        dob: dob,
        photoUrl: uploadedPhotoUrl,
        celebId,
        celebName: celeb?.celebName || 'Artist',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Move to success screen
      setStep(4);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'memberships');
      alert(`There was an issue processing your VIP Fan Card: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Canvas-based offline downloader
  // Combines Front and Back onto a single canvas side-by-side or stacked
  const generateCanvasImage = async (m: any) => {
    triggerToast('Generating VIP Card textures...');
    
    // Create standard size canvas
    const canvas = document.createElement('canvas');
    const width = 1012;
    const height = 1350; // Stacking Front & Back (650px each, 50px gap)
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background base
    ctx.fillStyle = '#020512';
    ctx.fillRect(0, 0, width, height);

    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Draw Front Side at 0, 0
    ctx.save();
    // 1. Base Metallic Gradient
    const frontGrad = ctx.createLinearGradient(0, 0, width, 600);
    frontGrad.addColorStop(0, '#0a1033');
    frontGrad.addColorStop(0.5, '#04081c');
    frontGrad.addColorStop(1, '#0e0b24');
    ctx.fillStyle = frontGrad;
    roundedRect(30, 30, width - 60, 600, 32);
    ctx.fill();

    // 2. Gold Border accent
    ctx.strokeStyle = '#dfb15b';
    ctx.lineWidth = 4;
    roundedRect(30, 30, width - 60, 600, 32);
    ctx.stroke();

    // 3. Draw premium glow lighting
    const glowGrad = ctx.createRadialGradient(width/2, 330, 50, width/2, 330, 450);
    glowGrad.addColorStop(0, 'rgba(223, 177, 91, 0.08)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    roundedRect(30, 30, width - 60, 600, 32);
    ctx.fill();

    // 4. Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 16px "Inter", sans-serif';
    ctx.fillText('BOOK A CELEBRITY™', 80, 95);
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('OFFICIAL VIP MEMBERSHIP CARD', 80, 120);

    // 5. Draw ID
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '11px monospace';
    ctx.fillText(m.membershipCardId || m.id?.substring(0, 16).toUpperCase() || 'BAC-VIP-9921', 80, 145);

    // 6. Draw Celebrity title banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(80, 180, width - 160, 110);
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.15)';
    ctx.strokeRect(80, 180, width - 160, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black italic 26px "Inter", sans-serif';
    ctx.fillText(celeb?.celebName || m.celebName || 'Celebrity Star', 110, 230);
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'medium italic 13px "Inter", sans-serif';
    ctx.fillText(celeb?.celebCategory || 'EXCLUSIVE CREATOR', 110, 255);

    // 7. Member Portrait (Draw if available)
    const pPic = m.photoUrl || user?.photoURL;
    if (pPic) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = pPic;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // proceed anyway on load error
        });
        ctx.save();
        ctx.beginPath();
        // Circular mask for avatar 
        ctx.arc(170, 430, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 95, 355, 150, 150);
        ctx.restore();

        // Portrait frame border
        ctx.strokeStyle = '#dfb15b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(170, 430, 76, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {
        console.warn("Portrait not drawn due to cross-origin limitations on canvas:", e);
      }
    } else {
      // Draw placeholder circle
      ctx.strokeStyle = '#dfb15b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(170, 430, 76, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.stroke();
    }

    // 8. Custom cardholder credentials text mapping
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.fillText(m.fanName || 'Elite Fan Supporter', 290, 400);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('MEMBERSHIP TIER', 290, 440);
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'black 16px "Inter", sans-serif';
    ctx.fillText(m.tierTitle?.toUpperCase() || 'PLATINUM VIP', 290, 465);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('JOIN DATE', 520, 440);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Inter", sans-serif';
    const jDate = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    ctx.fillText(jDate, 520, 465);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('STATUS', 720, 440);
    ctx.fillStyle = '#10b981';
    ctx.font = 'black 15px "Inter", sans-serif';
    ctx.fillText(m.status?.toUpperCase() || 'ACTIVE', 720, 465);

    // 9. Premium VIP Seal / Badge icon
    ctx.fillStyle = 'rgba(223,177,91,0.15)';
    ctx.fillRect(width - 240, 70, 160, 40);
    ctx.strokeStyle = '#dfb15b';
    ctx.strokeRect(width - 240, 70, 160, 40);
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'black 10px "Inter", sans-serif';
    ctx.fillText('👑 ELITE VIP', width - 200, 94);

    ctx.restore();

    // Draw Back Side at Bottom (after gap)
    ctx.save();
    const backY = 690;
    // 1. Background gradient
    const backGrad = ctx.createLinearGradient(0, backY, width, backY + 600);
    backGrad.addColorStop(0, '#060a24');
    backGrad.addColorStop(0.5, '#02030a');
    backGrad.addColorStop(1, '#09051c');
    ctx.fillStyle = backGrad;
    roundedRect(30, backY, width - 60, 600, 32);
    ctx.fill();

    // Gold outline
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.4)';
    ctx.lineWidth = 4;
    roundedRect(30, backY, width - 60, 600, 32);
    ctx.stroke();

    // 2. Header Certificate Text
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'black italic 20px "Inter", sans-serif';
    ctx.fillText('OFFICIAL MEMBERSHIP CERTIFICATE', 80, backY + 70);

    // 3. Certified core statement
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '14px "Inter", sans-serif';
    const stmt = `This certifies that ${m.fanName || 'supporter'} is an officially registered member of ${celeb?.celebName || m.celebName || 'Artist'}'s exclusive fan community and is entitled to all VIP privileges associated with the ${m.tierTitle || 'Premium'} membership status.`;

    // Wrap statement paragraph text beautifully on Canvas
    const words = stmt.split(' ');
    let line = '';
    let yPos = backY + 120;
    const maxWidth = width - 160;
    const lineHeight = 24;

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '15px/22px "Inter", sans-serif';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, 80, yPos);
        line = words[n] + ' ';
        yPos += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, yPos);

    // 4. Credentials list in grid layout
    let detailY = backY + 230;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('CELEBRITY SPONSOR', 80, detailY);
    ctx.fillText('GOLDEN FAN IDENTIFIER', 380, detailY);
    ctx.fillText('MEMBERSHIP TIER TYPE', 680, detailY);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillText(celeb?.celebName || m.celebName || 'Celebrity Sponsor', 80, detailY + 28);
    ctx.fillText(m.membershipCardId || 'BAC-VIP-9921', 380, detailY + 28);
    ctx.fillStyle = '#dfb15b';
    ctx.fillText(m.tierTitle || 'Platinum Access', 680, detailY + 28);

    // 5. Perks benefits rendered list
    const activePerks = currentTier?.perks || ['VIP Verified Status', 'Direct Messaging Privileges'];
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'bold italic 13px "Inter", sans-serif';
    ctx.fillText('ACTIVE PROTOCOL VIP BENEFITS', 80, detailY + 90);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '13px "Inter", sans-serif';
    let perkY = detailY + 125;
    activePerks.forEach((perk: string) => {
      ctx.fillText(`✓  ${perk}`, 80, perkY);
      perkY += 26;
    });

    // 6. Verification segment
    const qrY = backY + 450;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(80, qrY, width - 160, 100);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(80, qrY, width - 160, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 14px "Inter", sans-serif';
    ctx.fillText('Verified by Book A Celebrity™', 110, qrY + 42);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillText('SECURE CR80 ACCESS PORTAL • WWW.BOOKACELEB.SITE', 110, qrY + 62);

    // Seal icon placeholder decoration
    ctx.fillStyle = '#dfb15b';
    ctx.beginPath();
    ctx.arc(width - 150, qrY + 50, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.fillText('VERIFIED', width - 173, qrY + 53);

    ctx.restore();

    // Trigger download
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `VIP_${(m.tierTitle || 'Membership').replace(/\s+/g, '_')}_Card.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('Download complete!');
    } catch (err: any) {
      console.error(err);
      alert('Could not complete download rendering. Please try holding/screenshotting on mobile.');
    }
  };

  const handleDownload = async (m: any) => {
    // If celebrity uploaded custom card file, download that
    if (m.fanCardImage) {
      triggerToast('Downloading official fan card...');
      try {
        const response = await fetch(m.fanCardImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${m.tierTitle.replace(/\s+/g, '_')}_Fan_Card.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (e) {
        window.open(m.fanCardImage, '_blank');
      }
    } else {
      // Otherwise render double sided high fidelity canvas
      await generateCanvasImage(m);
    }
  };

  return (
    <div className="min-h-screen bg-[#020512] py-12 px-4 text-white font-sans relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] opacity-20 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-indigo-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Embedded Perspective styles for physical card flips */}
      <style>{`
        .perspective-1000 {
          perspective: 1200px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .flip-btn-glow {
          box-shadow: 0 0 15px rgba(223, 177, 91, 0.2);
        }
      `}</style>

      {/* Real-time Toast System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#dfb15b] text-black px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-2xl border border-white/20"
          >
            <Sparkles size={16} className="animate-spin text-black" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto relative z-10">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="mb-8 flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Hub
        </button>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-row justify-between items-center mb-8 pb-6 border-b border-white/5 gap-4 text-left"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                <Crown size={10} /> Exclusive VIP Credentials
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight uppercase italic text-white flex items-center gap-3">
              Elite Fan Card Registry
            </h1>
            <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
              Verify identity & generate your permanent digital backstage access pass
            </p>
          </div>
        </motion.div>

        <CelebrityHeader celeb={celeb} />

        {/* Existing Membership cards (Active/Pending directories) layout */}
        {userMemberships.length > 0 && (
          <div className="mb-16 mt-12 space-y-8 text-left">
            <h2 className="text-3xl font-display font-black tracking-tight uppercase italic text-white flex items-center gap-3">
              <Sparkles className="text-primary animate-pulse" /> My VIP Credentials
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {userMemberships.map((m) => {
                const isApproved = m.status === 'approved';
                return (
                  <div 
                    key={m.id} 
                    className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col justify-between min-h-[380px] shadow-2xl group transition-all"
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
                        <p className="font-mono text-white/30 text-[9px]">ID: {m.membershipCardId || m.id.substring(0, 12).toUpperCase()}</p>
                        <p className="text-primary font-bold text-sm mt-1">${m.price}</p>
                      </div>
                    </div>

                    {/* INTERACTIVE 3D FLIP RECONSTRUCTION FOR APPROVED MEMBERS */}
                    <div className="relative z-10 my-6 bg-black/40 border border-white/5 rounded-3xl overflow-hidden p-4 flex flex-col items-center justify-center min-h-[280px]">
                      {isApproved ? (
                        <>
                          {/* If celebrity manually uploaded his own fan card image, show that. Otherwise show interactive 3D Card flips! */}
                          {m.fanCardImage ? (
                            <div className="relative w-full text-center">
                              <img 
                                src={m.fanCardImage} 
                                alt="Celebrity Custom Fan Card" 
                                className="w-full h-auto rounded-2xl border border-white/5 object-cover max-h-56" 
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-[9px] text-white/40 uppercase font-black tracking-widest mt-2">Custom Fan card uploaded by {celeb?.celebName}</p>
                            </div>
                          ) : (
                            <div className="w-full space-y-4">
                              {/* 3D Premium Card presentation */}
                              <div className="perspective-1000 w-full max-w-[340px] aspect-[1.58] mx-auto relative">
                                <motion.div 
                                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                  className="w-full h-full transform-style-3d relative"
                                >
                                  {/* FRONT SIDE */}
                                  <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border-2 border-[#dfb15b]/50 bg-gradient-to-br from-[#0c1445] via-[#04081c] to-[#0e0721] p-4 flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/80">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,177,91,0.12),transparent_60%)] pointer-events-none" />
                                    
                                    {/* Top Area */}
                                    <div className="flex justify-between items-start">
                                      <div className="text-left">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-white">BOOK A CELEBRITY™</p>
                                        <p className="text-[7px] text-[#dfb15b] uppercase font-black tracking-widest">OFFICIAL VIP MEMBERSHIP</p>
                                      </div>
                                      <span className="px-2 py-0.5 bg-[#dfb15b]/10 border border-[#dfb15b]/20 text-[#dfb15b] text-[6px] font-black uppercase tracking-widest rounded">👑 VIP ELITE</span>
                                    </div>

                                    {/* Celeb info */}
                                    <div className="my-1.5 p-1.5 bg-white/5 border border-white/5 rounded-lg text-left">
                                      <p className="text-[12px] font-black italic uppercase text-white truncate leading-none">{celeb?.celebName || m.celebName}</p>
                                      <p className="text-[6px] text-[#dfb15b] uppercase font-extrabold tracking-widest">{celeb?.celebCategory || 'EXCLUSIVE ARTIST'}</p>
                                    </div>

                                    {/* Account Portrait & Identity Details row */}
                                    <div className="flex items-center gap-3 text-left">
                                      <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[#dfb15b]/50 bg-slate-950">
                                          <img 
                                            src={m.photoUrl || 'https://picsum.photos/seed/vip/200'} 
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-black flex items-center justify-center text-[8px]">✓</div>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-white uppercase tracking-tight truncate">{m.fanName}</p>
                                        <div className="flex gap-4 mt-0.5 text-[6px] font-bold uppercase text-white/40">
                                          <div>
                                            <p>TIER</p>
                                            <p className="text-[#dfb15b] font-black">{m.tierTitle}</p>
                                          </div>
                                          <div>
                                            <p>ID</p>
                                            <p className="font-mono text-white/80">{m.membershipCardId || 'BAC-VIP-9942'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-1">
                                      <span className="text-[5px] text-white/30 uppercase tracking-widest">OFFICIAL CELEBRITY MEMBERSHIP</span>
                                      <div className="w-4 h-4 bg-white rounded p-0.5 flex items-center justify-center">
                                        <div className="grid grid-cols-2 gap-0.5">
                                          <div className="w-1.5 h-1.5 bg-black"></div>
                                          <div className="w-1.5 h-1.5 bg-black"></div>
                                          <div className="w-1.5 h-1.5 bg-black"></div>
                                          <div className="w-1.5 h-1.5 bg-black"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* BACK SIDE */}
                                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border-2 border-[#dfb15b]/30 bg-[#04081c] p-4 flex flex-col justify-between text-left shadow-2xl">
                                    <div className="space-y-1.5">
                                      <h4 className="text-[8px] font-black uppercase text-[#dfb15b]">OFFICIAL MEMBERSHIP CERTIFICATE</h4>
                                      <p className="text-[6px] text-white/70 leading-normal font-sans">
                                        This certifies that <strong className="text-white">{m.fanName}</strong> is an officially registered member of <strong className="text-white">{celeb?.celebName || m.celebName}</strong>'s exclusive elite VIP circle and is entitled to backstage benefits.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-1 my-1 text-[5px]">
                                      <div>
                                        <p className="text-white/30">SPONSOR</p>
                                        <p className="font-bold text-white truncate">{celeb?.celebName || m.celebName}</p>
                                      </div>
                                      <div>
                                        <p className="text-white/30">MEMBER ID</p>
                                        <p className="font-mono font-bold text-white truncate">{m.membershipCardId || 'BAC-VIP-XXXX'}</p>
                                      </div>
                                      <div>
                                        <p className="text-white/30">TIER LEVEL</p>
                                        <p className="font-bold text-[#dfb15b] truncate">{m.tierTitle}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[5px] text-[#dfb15b] font-black">BENEFITS PRIVILEGES:</p>
                                      <div className="grid grid-cols-2 gap-1 text-[5px] text-white/60">
                                        {activePerksAndFallback(m.tier).slice(0, 4).map((p, i) => (
                                          <p key={i} className="truncate">✓ {p}</p>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1 text-[5px]">
                                      <p className="text-white/30 truncate">Verified by Book A Celebrity™</p>
                                      <p className="text-[#dfb15b] font-bold">www.bookaceleb.site</p>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>

                              <div className="flex justify-center gap-3">
                                <button 
                                  onClick={() => setIsFlipped(!isFlipped)}
                                  className="px-4 py-2 bg-[#dfb15b]/10 hover:bg-[#dfb15b]/20 text-[#dfb15b] border border-[#dfb15b]/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer flip-btn-glow transition-all active:scale-95"
                                >
                                  <RefreshCw size={12} className="animate-pulse" /> Flip Card Side
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <CreditCard size={32} className="mx-auto text-white/10 animate-pulse" />
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#dfb15b]/70 leading-relaxed uppercase">VIP VERIFICATION IN PROGRESS</p>
                          <p className="text-[9px] text-white/30 leading-relaxed max-w-[280px]">
                            We are verifying your payment receipt snapshot. Your interactive double-sided VIP pass will unlock in real-time as soon as approved by the celebrity.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 flex justify-between items-center text-[10px] border-t border-white/5 pt-4">
                      <div className="min-w-0 pr-2 flex-1 text-left">
                        <p className="opacity-30 uppercase font-black text-[8px]">Cardholder VIP Name</p>
                        <p className="text-white font-bold uppercase tracking-tight mt-0.5 truncate" title={m.fanName}>{m.fanName}</p>
                      </div>
                      
                      <button 
                        onClick={() => handleDownload(m)}
                        className="py-2.5 px-4 bg-[#dfb15b] hover:bg-[#c99f50] text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Download size={12} /> Download Pass File
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Multi-Step Fan Card Purchase Wizard Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
          
          {/* Main Steps Form Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0b0e22]/80 border border-white/5 p-6 sm:p-10 md:p-12 rounded-[3.5rem] relative shadow-2xl">
              
              {/* Steps Progress Indicator Head */}
              {step < 4 && (
                <div className="mb-10">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">
                    <span>VIP CREDENTIAL PROTOCOL</span>
                    <span className="text-primary">Step {step + 1} of 4</span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-primary h-full transition-all duration-500 ease-out" 
                      style={{ width: `${((step + 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* STEP WORKFLOW INSTRUCTIONS */}
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight italic text-white">
                        Choose Membership Tier
                      </h2>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Select a verified backstage privileges plan
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {plans.map((tier: any) => (
                        <div 
                          key={tier.id}
                          onClick={() => setSelectedTier(tier.id)}
                          className={`relative p-6 rounded-[2rem] border cursor-pointer transition-all flex flex-col justify-between overflow-hidden group ${
                            selectedTier === tier.id 
                              ? 'border-[#dfb15b] bg-[#dfb15b]/5 shadow-2xl scale-102 font-bold' 
                              : 'border-white/5 bg-white/5 hover:border-[#dfb15b]/30'
                          }`}
                        >
                          {(tier.recommended || tier.badge) && (
                            <div className="absolute top-0 right-0 bg-[#dfb15b] text-black text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-[0.2em]">
                              {tier.badge || 'Recommended'}
                            </div>
                          )}
                          <div>
                            <h3 className={`text-md font-bold uppercase tracking-tight mb-2 ${selectedTier === tier.id ? 'text-[#dfb15b]' : 'text-white/50'}`}>{tier.title}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                              <span className="text-3xl font-display font-black tracking-tighter text-white">${tier.price}</span>
                              <span className="text-[9px] font-bold opacity-30 uppercase text-white/40">/YR</span>
                            </div>
                            <ul className="space-y-2.5">
                              {tier.perks?.map((p: string) => (
                                <li key={p} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-white/70">
                                  <CheckCircle size={12} className="text-[#dfb15b] shrink-0" /> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => setStep(1)}
                        className="px-8 py-4 bg-[#dfb15b] hover:bg-[#c99f50] text-black rounded-xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer shadow-xl active:scale-95 flex items-center gap-2"
                      >
                        Continue to Identity Form
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight italic text-white">
                        Account Verification Details
                      </h2>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Please provide valid personal details for official register
                      </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                          Full Name (Legal)
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                          <input 
                            value={fullName}
                            onChange={e => { setFullName(e.target.value); if(!cardName) setCardName(e.target.value); }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 font-bold text-white outline-none focus:border-[#dfb15b]/50 transition-all text-sm" 
                            placeholder="e.g. Sarah Johnson" 
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                          <input 
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 font-bold text-white outline-none focus:border-[#dfb15b]/50 transition-all text-sm" 
                            placeholder="sarah.johnson@example.com" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone Number */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input 
                              type="tel"
                              value={phoneNumber}
                              onChange={e => setPhoneNumber(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 font-bold text-white outline-none focus:border-[#dfb15b]/50 transition-all text-sm" 
                              placeholder="+1 (555) 019-2834" 
                            />
                          </div>
                        </div>

                        {/* Date of birth */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                            Date of Birth
                          </label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input 
                              type="date"
                              value={dob}
                              onChange={e => setDob(e.target.value)}
                              className="w-full bg-black/40 border border-white/15 rounded-xl p-4 pl-12 font-bold text-white outline-none focus:border-[#dfb15b]/50 transition-all text-xs" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                      <button
                        onClick={() => setStep(0)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => { if(validateStep1()) setStep(2); }}
                        className="px-8 py-4 bg-[#dfb15b] hover:bg-[#c99f50] text-black rounded-xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer shadow-xl active:scale-95"
                      >
                        Pass Customization
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight italic text-white">
                        Card Customization & Photo
                      </h2>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Upload custom portrait style file and confirm card display name
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {/* Left Form Controls */}
                      <div className="space-y-4">
                        {/* Display Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                            Name on Fan Card (Display Name)
                          </label>
                          <input 
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-bold text-white outline-none focus:border-[#dfb15b]/50 transition-all text-sm" 
                            placeholder="e.g. Sarah J." 
                            maxLength={28}
                          />
                        </div>

                        {/* Portrait photo uploader */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest ml-1 text-white">
                            Upload Portrait Photograph
                          </label>
                          <div className="h-44 rounded-2xl bg-black/40 border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-center px-6 relative cursor-pointer hover:border-[#dfb15b]/50 transition-all group">
                            {photoPreview ? (
                              <div className="flex items-center gap-3">
                                <CheckCircle size={20} className="text-primary" />
                                <p className="text-primary font-black uppercase text-[10px] tracking-widest">Image Loaded! Click to Change</p>
                              </div>
                            ) : (
                              <>
                                <UploadCloud size={24} className="opacity-20 mb-2 group-hover:scale-110 transition-all text-white" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">Select Portrait Image</p>
                                <p className="text-[8px] text-white/30 uppercase mt-1 leading-normal">Optimized for circles / square profiles</p>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={e => handlePhotoChange(e.target.files?.[0] || null)} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Card Real-time Preview */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-40 tracking-widest text-[#dfb15b] block text-center">
                          LIVE PREVIEW (Front Side)
                        </label>
                        
                        {/* Static Front Card Preview layout */}
                        <div className="w-full rounded-2xl border-2 border-[#dfb15b]/40 bg-gradient-to-br from-[#0c1445] via-[#04081c] to-[#0e0721] p-5 aspect-[1.58] flex flex-col justify-between overflow-hidden relative shadow-2xl">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,177,91,0.1),transparent_60%)]" />
                          
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <p className="text-[9px] font-black tracking-wide text-white leading-none">BOOK A CELEBRITY™</p>
                              <p className="text-[7px] text-[#dfb15b] uppercase font-black tracking-widest leading-none mt-0.5">OFFICIAL VIP MEMBERSHIP</p>
                            </div>
                            <span className="px-2 py-0.5 bg-[#dfb15b]/10 border border-[#dfb15b]/20 text-[#dfb15b] text-[6px] font-black tracking-widest rounded">👑 VIP ELITE</span>
                          </div>

                          <div className="z-10 p-2 bg-white/5 border border-white/5 rounded-lg">
                            <p className="text-sm font-black italic uppercase text-white truncate leading-none">{celeb?.celebName || 'Celebrity Sponsor'}</p>
                            <p className="text-[7px] text-[#dfb15b] uppercase font-extrabold tracking-widest mt-0.5">{celeb?.celebCategory || 'EXCLUSIVE ARTIST'}</p>
                          </div>

                          <div className="flex items-center gap-3 z-10 text-left">
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-[#dfb15b]/50 bg-slate-950 flex items-center justify-center">
                                {photoPreview ? (
                                  <img src={photoPreview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User size={16} className="text-white/20 animate-pulse" />
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-black flex items-center justify-center text-[7px]">✓</div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-black text-white uppercase tracking-tight truncate leading-none mb-1">{cardName || 'SARAH JOHNSON'}</p>
                              <div className="flex gap-4 text-[6px] font-extrabold uppercase text-white/40">
                                <div>
                                  <p>TIER</p>
                                  <p className="text-[#dfb15b] font-black">{currentTier?.title || 'PLATINUM VIP'}</p>
                                </div>
                                <div>
                                  <p>ID</p>
                                  <p className="font-mono text-white/80">{membershipCardId}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                      <button
                        onClick={() => setStep(1)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => { if(validateStep2()) setStep(3); }}
                        className="px-8 py-4 bg-[#dfb15b] hover:bg-[#c99f50] text-black rounded-xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer shadow-xl active:scale-95"
                      >
                        Payment Gateways
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight italic text-white">
                        Verification Payment Gateway
                      </h2>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Settle fees to unlock permanent digital certificate issuance
                      </p>
                    </div>

                    {/* Payment Switchers */}
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
                          className={`p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 border text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all break-words word-break-normal overflow-wrap-anywhere ${
                            paymentMethod === method.id 
                              ? 'bg-primary text-black border-primary shadow-xl shadow-primary/10 font-bold' 
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
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#dfb15b]">Celebrity Sync Bank Details</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-white/60">
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Bank Name</span>
                              <span className="text-white font-bold">{celeb?.payoutBankName || 'Standard Global Bank'}</span>
                            </div>
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Account Name</span>
                              <span className="text-white font-bold">{celeb?.payoutAccountName || 'Celebrity Agent Admin'}</span>
                            </div>
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Account Number</span>
                              <span className="text-[#dfb15b] font-mono font-bold text-sm tracking-wider">{celeb?.payoutAccountNo || '192-482-947-192'}</span>
                            </div>
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Routing/SWIFT CODE</span>
                              <span className="text-white font-mono font-bold">{celeb?.payoutRoutingNo || celeb?.payoutSwiftCode || 'SWIFTGB22'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'crypto' && (
                        <div className="space-y-4 text-sm text-left">
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#dfb15b]">Celebrity Ledger Address</p>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Ledger Asset Network</span>
                              <span className="text-white font-bold text-sm">{celeb?.cryptoTokenName || 'USDT TRC20 (Tether)'}</span>
                            </div>
                            <div>
                              <span className="block opacity-45 uppercase text-[9px]">Secure Wallet Address</span>
                              <span className="text-white font-mono font-bold select-all bg-black/60 p-2 text-xs border border-white/5 block break-all mt-1">{celeb?.cryptoWalletAddress || 'TYJ8m9VAr7pC5dfXg4N8qA2m3Y91vR2Vp'}</span>
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
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#dfb15b]">Celebrity Gift Card Option</p>
                          <div className="text-xs">
                            <span className="block opacity-45 uppercase text-[9px]">Approved Voucher Category</span>
                            <span className="text-white font-bold block mt-1">{celeb?.payoutGiftCardName || 'Apple Store Gift Card'}</span>
                            <p className="mt-1.5 text-white/40 text-[9px] leading-relaxed uppercase font-bold">Please purchase voucher pin, and upload receipt proof below.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Proof selection */}
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-black opacity-40 tracking-widest italic text-white">
                        Authentication Snapshot (Payment Proof Receipt)
                      </label>
                      <div className="h-36 rounded-2xl bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6 relative cursor-pointer hover:border-[#dfb15b]/50 transition-all group">
                        {proofPreview ? (
                          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
                            <CheckCircle size={16} /> Receipt Loaded! Tap to change
                          </div>
                        ) : (
                          <>
                            <UploadCloud size={24} className="opacity-20 mb-2 group-hover:scale-110 transition-all text-white" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">Drop Payment Proof Image</p>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={e => handleProofChange(e.target.files?.[0] || null)} 
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                      <button
                        onClick={() => setStep(2)}
                        disabled={loading}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all disabled:opacity-35"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitPurchase}
                        disabled={loading || !proofFile}
                        className="px-8 py-4 bg-primary hover:bg-[#dfb15b] text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-2xl shadow-primary/25 disabled:opacity-30 flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        {loading ? 'Submitting Purchase...' : `Settle Fees & Request Card`}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/5">
                      <CheckCircle size={40} className="animate-bounce" />
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white italic">
                        Request Received!
                      </h2>
                      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-300 font-bold text-xs uppercase tracking-wider leading-relaxed max-w-lg mx-auto">
                        Thank you for joining. Your membership request has been received and your personalized fan card is being processed. A copy will be sent to your email after approval.
                      </div>
                    </div>

                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto">
                      The creator has been notified in real-time. Once validated, you can flip, view, and print your VIP credentials from this page.
                    </p>

                    <div className="pt-6 border-t border-white/5">
                      <button
                        onClick={() => { setStep(0); setProofPreview(''); setProofFile(null); }}
                        className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/10 cursor-pointer active:scale-95 transition-all"
                      >
                        Purchase Another Tier
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* Right Status Overview Column */}
          <div className="space-y-8">
            <div className="bg-gradient-to-b from-[#111636] to-[#0a0c1e] rounded-[3rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 pointer-events-none">
                <Sparkles size={180} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div>
                  <h4 className="text-[9px] font-black uppercase italic tracking-widest text-white/40 mb-4 underline decoration-white/10 text-left">Selected Access Tier</h4>
                  <p className="text-4xl font-display font-black tracking-tight italic uppercase text-primary leading-none mb-1 text-left">{currentTier?.title}</p>
                  <p className="text-[10px] font-extrabold opacity-60 text-emerald-400 text-left">STATUS: ACTIVE SELECTION</p>
                </div>

                <div className="space-y-5 pt-6 border-t border-white/5">
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase opacity-45 mb-1 tracking-widest text-white/50">Membership Cost</p>
                    <p className="text-3xl font-display font-black tracking-tight text-white">${currentTier?.price} <span className="text-[9px] text-white/30 lowercase font-sans">/year</span></p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left space-y-2">
                    <p className="text-[8px] font-black uppercase opacity-40 tracking-widest text-[#dfb15b]">Backstage ID Credentials</p>
                    <p className="text-[10px] opacity-60 leading-relaxed text-white/70">
                      Your high-security fan pass will display your name, membership ID, issue timestamp, and benefits. It will automatically authorize within direct private messages and chats.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl flex items-center gap-4 border border-white/5 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Star size={18} />
              </div>
              <p className="text-[9px] font-black uppercase opacity-60 tracking-widest leading-snug text-white/60">
                Digital Fan Card is hosted securely on decentralized systems for instant online back-end validation.
              </p>
            </div>
          </div>

        </div>

        <FAQSection />
      </div>
    </div>
  );
};

// Helper benefits getter based on tier identifier
function activePerksAndFallback(tierId: string): string[] {
  if (tierId === 'silver') {
    return ['Priority Booking Access', 'Basic Verified Badge', 'Standard Event Access'];
  } else if (tierId === 'gold') {
    return ['Priority Booking Access', 'Private Chat Access', 'VIP Event Invitations', 'Celebrity Merch Discounts'];
  } else {
    return ['Priority Booking Access', 'Private Chat Access', 'VIP Event Invitations', 'Exclusive Celebrity Content', 'Personalized Video Messages'];
  }
}
