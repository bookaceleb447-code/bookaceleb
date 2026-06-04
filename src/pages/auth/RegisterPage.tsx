import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getFriendlyRegisterError } from '../../lib/authErrors';
import { AuthLockScreen } from '../../components/AuthLockScreen';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authControls, setAuthControls] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'authControls'), (snap) => {
      if (snap.exists()) {
        setAuthControls(snap.data());
      } else {
        setAuthControls({
          celebrityRegisterEnabled: true,
          celebrityLoginEnabled: true,
          fanRegisterEnabled: true,
          fanLoginEnabled: true,
          globalAuthEnabled: true,
          maintenanceReason: 'We are performing scheduled upgrades. Please try again later.'
        });
      }
    }, (err) => {
      console.warn("Error loading register auth locks:", err);
    });
    return unsub;
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      const referredBy = localStorage.getItem('referred_by') || null;

      // Create base user record
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: formData.email,
        displayName: formData.name,
        role: 'user',
        referredBy,
        createdAt: new Date().toISOString(),
      });

      // Clear referral local storage details as user is now successfully registered/linked in Firestore
      localStorage.removeItem('referred_by');
      localStorage.removeItem('referred_celeb_name');

      navigate('/dashboard');

    } catch (err: any) {
      setError(getFriendlyRegisterError(err));
    } finally {
      setLoading(false);
    }
  };

  const isGlobalLocked = authControls && authControls.globalAuthEnabled === false;
  const isFanRegisterLocked = authControls && authControls.fanRegisterEnabled === false;
  const isLocked = isGlobalLocked || isFanRegisterLocked;

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full" />
        </div>
        <AuthLockScreen 
          title="Registration Temporarily Unavailable" 
          reason={authControls?.maintenanceReason} 
        />
      </div>
    );
  }

  const referredCelebName = localStorage.getItem('referred_celeb_name') || '';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass w-full max-w-xl p-10 md:p-14 rounded-[3rem] shadow-2xl relative z-10 border border-white/5"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold mb-3 tracking-tighter uppercase underline decoration-primary/30 text-white">Join the Circle</h1>
          <p className="text-white/40">Experience the world's most elite celebrity connection platform.</p>
        </div>

        {referredCelebName && (
          <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest text-primary leading-none">
              Referred by {referredCelebName}
            </p>
          </div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-60 text-white/60">
              Full Name
            </label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-medium text-white"
              placeholder="e.g. Leonardo DiCaprio"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-60 text-white/60">Email Address</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-medium text-white"
              placeholder="luxury@bookaceleb.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 opacity-60 text-white/60">Security Password</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-medium text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="md:col-span-2">
            {error && <p className="text-red-500 text-sm font-medium text-center mb-4">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-primary text-black rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Invitation...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sans">
          <p className="text-sm text-white/40 font-medium">
            Already registered? <Link to="/login" className="text-white hover:underline font-bold">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
