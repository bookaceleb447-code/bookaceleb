import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, getDoc, addDoc, collection, serverTimestamp, query, where, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { motion, AnimatePresence } from 'motion/react';
import { CelebrityHeader, FAQSection } from '../../components/CelebrityLayout';
import { VIPCardFront, VIPCardBack } from '../../components/VIPCard';
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
    
    // Create standard high-resolution size canvas
    const canvas = document.createElement('canvas');
    const width = 1012;
    const height = 1350; // Stacking Front & Back (650px each, 50px gap)
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background base
    ctx.fillStyle = '#02040b';
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

    // ==========================================
    // DRAW FRONT SIDE AT (30, 30)
    // ==========================================
    ctx.save();
    
    // 1. Base Metallic Deep Platinum/Graphite Gradient
    const frontGrad = ctx.createLinearGradient(30, 30, width - 30, 630);
    frontGrad.addColorStop(0, '#15161a');
    frontGrad.addColorStop(0.35, '#07080a');
    frontGrad.addColorStop(0.7, '#020203');
    frontGrad.addColorStop(1, '#1a1b22');
    ctx.fillStyle = frontGrad;
    roundedRect(30, 30, width - 60, 600, 32);
    ctx.fill();

    // 2. Realistic Brushed Metal Texture Strokes (Fine diagonal lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for (let i = -600; i < width; i += 8) {
      ctx.beginPath();
      ctx.moveTo(30 + i, 30);
      ctx.lineTo(30 + i + 400, 630);
      ctx.stroke();
    }

    // 3. Gold foil trim borders (dual luxury lines)
    ctx.strokeStyle = '#dfb15b';
    ctx.lineWidth = 5;
    roundedRect(30, 30, width - 60, 600, 32);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(223, 177, 91, 0.25)';
    ctx.lineWidth = 1.5;
    roundedRect(38, 38, width - 76, 584, 24);
    ctx.stroke();

    // 4. Subtle security circular guilloche/watermark pattern
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.04)';
    ctx.lineWidth = 1;
    for (let radius = 60; radius <= 340; radius += 28) {
      ctx.beginPath();
      ctx.arc(width - 240, 330, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Blended Celebrity Portrait Background Alignment
    const celebPic = celeb?.avatarUrl || celeb?.profileImage;
    if (celebPic) {
      try {
        const cimg = new Image();
        cimg.crossOrigin = 'anonymous';
        cimg.src = celebPic;
        await new Promise((resolve) => {
          cimg.onload = resolve;
          cimg.onerror = resolve;
        });

        ctx.save();
        // Clip to the inner boundary of the card
        roundedRect(38, 38, width - 76, 584, 24);
        ctx.clip();

        // Blend mode overlay style
        ctx.globalAlpha = 0.16;
        const targetW = 480;
        const targetH = 480;
        ctx.drawImage(cimg, width - 480, 110, targetW, targetH);
        
        // Add smooth gradient mask to fade the left edge of the celebrity background photo
        const maskG = ctx.createLinearGradient(width - 500, 300, width - 200, 300);
        maskG.addColorStop(0, '#07080a');
        maskG.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = maskG;
        ctx.fillRect(width - 520, 30, 500, 600);
        ctx.restore();
      } catch (ce) {
        console.warn('Celebrity face texture cross-origin canvas trace bypassed:', ce);
      }
    }

    // 6. Top Header Luxury Branding Text
    const brandGlow = ctx.createRadialGradient(250, 95, 20, 250, 95, 180);
    brandGlow.addColorStop(0, 'rgba(223, 177, 91, 0.08)');
    brandGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = brandGlow;
    ctx.fillRect(30, 30, 600, 150);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px "Inter", sans-serif';
    ctx.fillText('BOOK A CELEBRITY™', 80, 95);
    ctx.fillStyle = '#dfb15b';
    ctx.font = '700 12px "Inter", sans-serif';
    ctx.fillText('OFFICIAL VIP MEMBERSHIP PROGRAM', 80, 120);

    // 7. Security unique member number watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '900 13px "Courier New", monospace';
    ctx.fillText(m.membershipCardId || 'BAC-VIP-99420-A', 80, 150);

    // 8. Celebrity title emblem plaque
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(80, 190, width - 160, 115);
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.2)';
    ctx.strokeRect(80, 190, width - 160, 115);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 28px "Inter", sans-serif';
    ctx.fillText(celeb?.celebName || m.celebName || 'Celebrity Sponsor', 110, 245);
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'italic 700 13px "Inter", sans-serif';
    ctx.fillText('OFFICIAL SELECTION CREATOR', 110, 272);

    // 9. Interactive high-contrast photo of the user in luxury frame
    const pPic = m.photoUrl || user?.photoURL;
    if (pPic) {
      try {
        const pimg = new Image();
        pimg.crossOrigin = 'anonymous';
        pimg.src = pPic;
        await new Promise((resolve) => {
          pimg.onload = resolve;
          pimg.onerror = resolve;
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(175, 455, 78, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(pimg, 95, 375, 160, 160);
        ctx.restore();

        // Thick golden trim edge border
        ctx.strokeStyle = '#dfb15b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(175, 455, 79, 0, Math.PI * 2);
        ctx.stroke();
      } catch (pe) {
        console.warn('User profile image canvas trace fallback due to secure hosting constraints:', pe);
        ctx.strokeStyle = 'rgba(223, 177, 91, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(175, 455, 79, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Draw initials circle placeholder
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(175, 455, 79, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfb15b';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // 10. Credentials mapping data text blocks
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Inter", sans-serif';
    ctx.fillText(m.fanName || 'Elite Fan Supporter', 290, 420);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('MEMBERSHIP TIER LEVEL', 290, 462);
    ctx.fillStyle = '#dfb15b';
    ctx.font = '900 17px "Inter", sans-serif';
    ctx.fillText(m.tierTitle?.toUpperCase() || 'GOLD ACCESS', 290, 488);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('REGISTRY JOIN DATE', 550, 462);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px "Inter", sans-serif';
    const jDate = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'});
    ctx.fillText(jDate, 550, 488);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('STATUS', 770, 462);
    ctx.fillStyle = '#10b981';
    ctx.font = '900 16px "Inter", sans-serif';
    ctx.fillText(m.status?.toUpperCase() || 'ACTIVE', 770, 488);

    // 11. Luxury metallic VIP sticker badge at top-right
    const badgeGrad = ctx.createLinearGradient(width - 240, 75, width - 80, 115);
    badgeGrad.addColorStop(0, '#f8e8c1');
    badgeGrad.addColorStop(0.5, '#dfb15b');
    badgeGrad.addColorStop(1, '#9b712b');
    ctx.fillStyle = badgeGrad;
    roundedRect(width - 240, 75, 160, 42, 10);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((m.tierTitle || 'VIP MEMBER').toUpperCase(), width - 160, 101);
    ctx.textAlign = 'left'; // restore align

    ctx.restore();

    // ==========================================
    // DRAW BACK SIDE AT (30, 690)
    // ==========================================
    ctx.save();
    const backY = 690;

    // 1. Background gradient setup
    const backGrad = ctx.createLinearGradient(30, backY, width - 30, backY + 600);
    backGrad.addColorStop(0, '#07080b');
    backGrad.addColorStop(0.5, '#020203');
    backGrad.addColorStop(1, '#111217');
    ctx.fillStyle = backGrad;
    roundedRect(30, backY, width - 60, 600, 32);
    ctx.fill();

    // Brushed metal trace lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for (let i = -600; i < width; i += 8) {
      ctx.beginPath();
      ctx.moveTo(30 + i, backY);
      ctx.lineTo(30 + i + 400, backY + 600);
      ctx.stroke();
    }

    // Concentric luxury lines watermarks
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.04)';
    ctx.lineWidth = 1;
    for (let radius = 100; radius <= 500; radius += 40) {
      ctx.beginPath();
      ctx.arc(width / 2, backY + 300, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer Dual line golden foil trim borders
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.7)';
    ctx.lineWidth = 5;
    roundedRect(30, backY, width - 60, 600, 32);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(223, 177, 91, 0.2)';
    ctx.lineWidth = 1.5;
    roundedRect(38, backY + 8, width - 76, 584, 24);
    ctx.stroke();

    // 2. Certificate Official Title Header
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'italic 900 22px "Inter", sans-serif';
    ctx.fillText('OFFICIAL MEMBERSHIP CERTIFICATE', 80, backY + 75);

    // 3. Stately core authorization paragraph statement
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = '14px/22px "Inter", sans-serif';
    const stmt = `This certifies that the cardholder is an officially registered member of the celebrity fan community and is entitled to membership benefits associated with the selected plan.`;

    const words = stmt.split(' ');
    let line = '';
    let currY = backY + 125;
    const maxWidth = width - 160;
    const lineHeight = 24;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, 80, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, currY);

    // 4. Credentials metadata grid row layout (2x3 precise grid columns)
    let dataGridY = backY + 230;
    // Row 1 Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('CELEBRITY NAME', 80, dataGridY);
    ctx.fillText('MEMBER NAME', 380, dataGridY);
    ctx.fillText('MEMBERSHIP TIER', 680, dataGridY);

    // Row 1 Values
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px "Inter", sans-serif';
    ctx.fillText(celeb?.celebName || m.celebName || 'Approved Sponsor', 80, dataGridY + 24);
    ctx.fillText(m.fanName || 'VIP Member', 380, dataGridY + 24);
    ctx.fillStyle = '#dfb15b';
    ctx.fillText(m.tierTitle || 'Platinum Access', 680, dataGridY + 24);

    // Row 2 Labels
    let dataRow2Y = dataGridY + 65;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('MEMBERSHIP ID', 80, dataRow2Y);
    ctx.fillText('ISSUE DATE', 380, dataRow2Y);
    ctx.fillText('STATUS', 680, dataRow2Y);

    // Row 2 Values
    ctx.fillStyle = '#ffffff';
    ctx.font = '950 15px "Inter", sans-serif';
    ctx.fillText(m.membershipCardId || 'BAC-VIP-99420-A', 80, dataRow2Y + 24);
    ctx.fillText(jDate, 380, dataRow2Y + 24);
    ctx.fillStyle = '#10b981';
    ctx.fillText(m.status?.toUpperCase() || 'ACTIVE', 680, dataRow2Y + 24);

    // 5. Active perks benefits list rendering
    const activePerks = activePerksAndFallback(m.tier);
    let perksY = backY + 395;
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'italic 900 13px "Inter", sans-serif';
    ctx.fillText('OFFICIAL TIER BENEFITS & PRIVILEGES', 80, perksY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '700 13px "Inter", sans-serif';
    let pY = perksY + 30;
    activePerks.forEach((p: string) => {
      ctx.fillText(`✓  ${p}`, 80, pY);
      pY += 26;
    });

    // 6. Security verification panel (Removed Web URL completely!)
    const secY = backY + 500;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(80, secY, width - 160, 75);
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.15)';
    ctx.strokeRect(80, secY, width - 160, 75);

    // Text signature
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px "Inter", sans-serif';
    ctx.fillText('Verified securely by Book A Celebrity™', 110, secY + 32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText('DECEN-LEDGER ENCRYPTED • OFFICIAL CR80 VERIFICATION ID • APPROVED VIP PASS', 110, secY + 50);

    // Drawn Majestic Seal decoration
    ctx.fillStyle = '#dfb15b';
    ctx.beginPath();
    ctx.arc(width - 150, secY + 38, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw little crown layout or spokes inside seal context
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 10) {
      ctx.beginPath();
      ctx.moveTo(width - 150, secY + 38);
      ctx.lineTo(width - 150 + Math.cos(ang) * 18, secY + 38 + Math.sin(ang) * 18);
      ctx.stroke();
    }
    // Inner center circle overlay
    ctx.fillStyle = '#dfb15b';
    ctx.beginPath();
    ctx.arc(width - 150, secY + 38, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 7px "Inter", sans-serif';
    ctx.fillText('SECURE', width - 166, secY + 41);

    ctx.restore();

    // Trigger JPEG compilation and device local downloads
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

  const approvedMembership = userMemberships.find(m => m.status === 'approved');
  const pendingMembership = userMemberships.find(m => m.status === 'pending');

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

        {approvedMembership ? (
          /* REDESIGNED ACTIVE MEMBERSHIP DASHBOARD (Requirement 7 & 4 & 5) */
          <div className="bg-[#0b0e22]/90 border border-[#dfb15b]/20 p-6 sm:p-10 md:p-12 rounded-[2.5rem] mt-12 text-left relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#dfb15b]/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Stately Membership Details & Perks */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-3">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/5">
                    <Crown size={11} className="text-[#dfb15b]" /> OFFICIAL VIP PROTOCOL ENGAGED
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight uppercase italic text-white leading-none">
                    My VIP Fan Card
                  </h2>
                  <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-loose">
                    Your digital credentials have been verified and approved by {celeb?.celebName || approvedMembership.celebName}'s management.
                  </p>
                </div>

                {/* Stately Stats Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                  <div>
                    <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Cardholder Name</span>
                    <p className="text-sm font-black text-white uppercase tracking-tight mt-1 truncate">{approvedMembership.fanName}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Membership Tier</span>
                    <p className="text-sm font-black text-[#dfb15b] uppercase tracking-tight mt-1">{approvedMembership.tierTitle}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Registry ID</span>
                    <p className="text-sm font-mono text-white/80 tracking-normal mt-1 truncate">{approvedMembership.membershipCardId || approvedMembership.id.substring(0, 12).toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Authorized Since</span>
                    <p className="text-sm font-black text-white/90 tracking-tight mt-1">
                      {approvedMembership.createdAt?.toDate ? approvedMembership.createdAt.toDate().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">Status Level</span>
                    <div>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-md mt-1.5 inline-block">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Privileges checklist */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#dfb15b] border-b border-white/5 pb-2">Active Backstage Tier Perks & Experiences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePerksAndFallback(approvedMembership.tier).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 py-1 text-xs text-white/80">
                        <div className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20">
                          ✓
                        </div>
                        <span className="font-bold">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Premium 3D Interactive Card Preview */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Interactive 3D Preview (Flip & View)</p>
                
                {approvedMembership.fanCardImage ? (
                  // Custom uploaded celebrity card
                  <div className="space-y-4 w-full">
                    <div className="w-full max-w-[420px] aspect-[1.58] rounded-[24px] overflow-hidden border border-[#dfb15b]/40 shadow-2xl mx-auto relative bg-[#040714]">
                      <img 
                        src={approvedMembership.fanCardImage} 
                        alt="Celebrity Uploaded Fan Card" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <p className="text-[9.5px] text-white/40 uppercase font-black tracking-widest text-center italic">Custom official pass direct from {celeb?.celebName}</p>
                  </div>
                ) : (
                  // Custom generated card preview (Real double sided)
                  <div className="perspective-1000 w-full max-w-[420px] aspect-[1.58] mx-auto relative overflow-visible">
                    <motion.div 
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="w-full h-full transform-style-3d relative"
                    >
                      {/* FRONT SIDE */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rounded-[2rem] overflow-hidden shadow-2xl shadow-black/90 text-left">
                        <VIPCardFront
                          celebName={celeb?.celebName || approvedMembership.celebName}
                          fanName={approvedMembership.fanName}
                          tierTitle={approvedMembership.tierTitle}
                          membershipCardId={approvedMembership.membershipCardId || approvedMembership.id.substring(0, 12).toUpperCase()}
                          photoUrl={approvedMembership.photoUrl}
                          joinDate={approvedMembership.createdAt?.toDate ? approvedMembership.createdAt.toDate().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase() : new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase()}
                        />
                      </div>

                      {/* BACK SIDE */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-[2rem] overflow-hidden shadow-2xl relative">
                        <VIPCardBack
                          celebName={celeb?.celebName || approvedMembership.celebName}
                          fanName={approvedMembership.fanName}
                          tierTitle={approvedMembership.tierTitle}
                          membershipCardId={approvedMembership.membershipCardId || approvedMembership.id.substring(0, 12).toUpperCase()}
                          joinDate={approvedMembership.createdAt?.toDate ? approvedMembership.createdAt.toDate().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase() : new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase()}
                          validUntil={approvedMembership.createdAt?.toDate 
                            ? new Date(approvedMembership.createdAt.toDate().setFullYear(approvedMembership.createdAt.toDate().getFullYear() + 1)).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase() 
                            : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase()
                          }
                        />
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* MY VIP FAN CARD action buttons as requested */}
                <div className="w-full flex flex-col sm:flex-row gap-3 pt-4">
                  {!approvedMembership.fanCardImage && (
                    <button 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="flex-1 py-3 px-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                    >
                      <RefreshCw size={14} className="animate-pulse" /> Flip Card View
                    </button>
                  )}
                  <button 
                    onClick={() => handleDownload(approvedMembership)}
                    className="flex-1 py-3 px-5 bg-[#dfb15b] hover:bg-[#c99f50] text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/10"
                  >
                    <Download size={14} /> Download Pass File
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : pendingMembership ? (
          /* REDESIGNED PENDING STATUS VIEW (Requirement 6) */
          <div className="max-w-4xl mx-auto bg-[#0b0e22]/80 border border-amber-500/20 p-6 sm:p-10 md:p-12 rounded-[3.5rem] relative shadow-2xl text-center space-y-8 mt-12">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
              <CreditCard size={40} className="animate-pulse" />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 shadow-md shadow-amber-500/5">
                <RefreshCw size={11} className="animate-spin-slow text-amber-400" /> VERIFICATION IN PROGRESS
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-white italic">
                VIP Credentials Process Initiated
              </h2>
              <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-amber-300 font-bold text-xs uppercase tracking-wider leading-relaxed max-w-lg mx-auto">
                Thank you for your application! We are validating your payment receipt snapshot. Your interactive double-sided VIP Pass will unlock automatically as soon as verified by celebrity management.
              </div>
            </div>

            {/* Show customizable card preview they submitted */}
            <div className="space-y-4">
              <p className="text-white/40 text-[9.5px] font-black uppercase tracking-widest">SUBMITTED CARD SPECIFICATION</p>
              
              <div className="perspective-1000 w-full max-w-[420px] aspect-[1.58] mx-auto relative text-left">
                <div className="w-full h-full relative rounded-[2rem] overflow-hidden shadow-2xl opacity-75">
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-[2px] rounded-[2rem]">
                    <span className="px-5 py-2.5 border-2 border-amber-500/50 text-amber-400 font-extrabold tracking-[0.2em] text-xs uppercase rounded-2xl bg-black/90 rotate-[-12deg] shadow-2xl shadow-black/95">
                      PENDING VERIFICATION
                    </span>
                  </div>
                  
                  {/* Render Front Card with pending details */}
                  <VIPCardFront
                    celebName={celeb?.celebName || pendingMembership.celebName}
                    fanName={pendingMembership.fanName}
                    tierTitle={pendingMembership.tierTitle}
                    membershipCardId={pendingMembership.membershipCardId || 'BAC-VIP-PENDING'}
                    photoUrl={pendingMembership.photoUrl}
                    joinDate={pendingMembership.createdAt?.toDate ? pendingMembership.createdAt.toDate().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase() : new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase()}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD SIGNUP STEPS FLOW WIZARD */
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
                        <div className="w-full aspect-[1.58] overflow-visible relative">
                          <VIPCardFront
                            celebName={celeb?.celebName || 'Celebrity Sponsor'}
                            fanName={cardName || 'SARAH JOHNSON'}
                            tierTitle={currentTier?.title || 'PLATINUM VIP'}
                            membershipCardId={membershipCardId}
                            photoUrl={photoPreview || undefined}
                            joinDate={new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase()}
                          />
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
      )}

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
