import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const ReferralHandler = () => {
  const { slug, celebName } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleReferral = async () => {
      try {
        // Find celeb by celebrity name slug first
        const targetSlug = celebName || slug;
        if (!targetSlug) throw new Error("No slug detected.");
        const q = query(collection(db, 'celebrityProfiles'), where('slug', '==', targetSlug), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const celebDoc = snap.docs[0];
          const cData = celebDoc.data();
          if (cData.isBanned) {
            alert('This VIP invitation channel has been suspended by platform administrators.');
            navigate('/');
            return;
          }
          const celebId = celebDoc.id;
          localStorage.setItem('referred_by', celebId);
          localStorage.setItem('referred_celeb_name', cData.celebName);
          localStorage.setItem('referral_code', slug || '');
          console.log('Referral captured:', celebId);
        }
      } catch (err) {
        console.error('Referral error:', err);
      } finally {
        navigate('/');
      }
    };
    handleReferral();
  }, [slug, celebName, navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full mb-4 ring-8 ring-primary/5" />
        <p className="font-display font-black tracking-[0.3em] text-white/40 uppercase text-xs italic">Connecting to VIP Channel...</p>
      </div>
    </div>
  );
};
