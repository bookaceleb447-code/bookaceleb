import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getFriendlyLoginError } from '../../lib/authErrors';
import { AuthLockScreen } from '../../components/AuthLockScreen';
import { useLanguage } from '../../context/LanguageContext';

interface LoginPageProps {
  forceRole?: 'celebrity' | 'superadmin' | 'user' | 'fan';
}

export const LoginPage = ({ forceRole }: LoginPageProps) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      console.warn("Error loading login auth locks:", err);
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Special Handling for Fixed SuperAdmin Credentials
      if (email === 'bookaceleb447@gmail.com') {
        const adminDoc = await getDoc(doc(db, 'users', uid));
        if (!adminDoc.exists()) {
          // Provision missing Super Admin Document in directory!
          await setDoc(doc(db, 'users', uid), {
            uid,
            email,
            displayName: 'Super Admin',
            role: 'superadmin',
            createdAt: new Date().toISOString()
          });
        }
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        await auth.signOut();
        throw new Error('User record not found in system directories.');
      }
      
      const data = userDoc.data();
      if (data?.isBanned) {
        await auth.signOut();
        throw new Error('This account has been suspended or banned by the Super Admin.');
      }
      
      // Obtain actual role from firestore
      const role = data.role || 'fan';

      // Enforce Portal Rules (both general/fan portal or explicit forceRole ones)
      if (!forceRole) {
        // We are on general Fan Login Page (/login)
        if (role === 'fan' || role === 'user') {
          // Allowed login!
        } else if (role === 'celebrity') {
          await auth.signOut();
          throw new Error('Celebrity accounts must login through the Celebrity Portal.');
        } else if (role === 'superadmin' || role === 'super_admin') {
          await auth.signOut();
          throw new Error('Super Admin accounts must login through the Super Admin Portal.');
        } else {
          await auth.signOut();
          throw new Error('Unauthorized. This portal is for Fans only.');
        }
      } else {
        // Specific Portal pathway
        if (forceRole === 'celebrity') {
          if (role !== 'celebrity') {
            await auth.signOut();
            throw new Error('Unauthorized. This login portal is strictly for celebrity accounts only.');
          }
        } else if (forceRole === 'superadmin') {
          if (role !== 'superadmin' && role !== 'super_admin') {
            await auth.signOut();
            throw new Error('Unauthorized. This login portal is strictly for superadmin accounts only.');
          }
        } else {
          if (role !== forceRole) {
            await auth.signOut();
            throw new Error(`Unauthorized. This login portal is strictly for ${forceRole} accounts only.`);
          }
        }
      }

      // Link referral to user document in Firestore on login, then clear from local storage
      const referredBy = localStorage.getItem('referred_by');
      const assignedCelebrityName = localStorage.getItem('referred_celeb_name');
      const referralCode = localStorage.getItem('referral_code');

      if (referredBy && (role === 'fan' || role === 'user')) {
        try {
          await setDoc(doc(db, 'users', uid), { 
            referredBy,
            assignedCelebrityId: referredBy,
            assignedCelebrityName: assignedCelebrityName || null,
            referralCode: referralCode || null
          }, { merge: true });
        } catch (syncErr) {
          console.error("Error syncing referral ID:", syncErr);
        }
      }
      localStorage.removeItem('referred_by');
      localStorage.removeItem('referred_celeb_name');
      localStorage.removeItem('referral_code');

      // Route Redirection
      if (role === 'superadmin' || role === 'super_admin') {
        navigate('/super-admin');
      } else if (role === 'celebrity') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(getFriendlyLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  const isGlobalLocked = authControls && authControls.globalAuthEnabled === false;
  const isCelebLoginLocked = authControls && authControls.celebrityLoginEnabled === false && forceRole === 'celebrity';
  const isFanLoginLocked = authControls && authControls.fanLoginEnabled === false && (!forceRole || forceRole === 'user' || forceRole === 'fan');

  // Super Admin bypasses all locks
  const isLocked = forceRole !== 'superadmin' && (isGlobalLocked || isCelebLoginLocked || isFanLoginLocked);

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans selection:bg-primary selection:text-black">
        <div className="absolute top-0 left-0 w-full h-full opacity-25 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary blur-[150px] rounded-full" />
        </div>
        <AuthLockScreen 
          title="Login Temporarily Unavailable" 
          reason={authControls?.maintenanceReason} 
        />
      </div>
    );
  }

  const referredCelebName = localStorage.getItem('referred_celeb_name') || '';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans selection:bg-primary selection:text-black">
      <div className="absolute top-0 left-0 w-full h-full opacity-25 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-dark w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/5"
      >
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-display font-black tracking-tighter mb-4 inline-block italic text-white">
            BOOK A <span className="text-primary uppercase underline underline-offset-4 decoration-primary/40">Celeb</span>
          </Link>
          <h1 className="text-3xl font-display font-bold mb-2 text-white italic uppercase tracking-tight">
            {forceRole === 'superadmin' ? 'Elite Control' : forceRole === 'celebrity' ? 'Celebrity Access' : t('auth.loginTitle')}
          </h1>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">{t('auth.loginSubtitle')}</p>
        </div>

        {!forceRole && referredCelebName && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest text-primary leading-none">
              Referred by {referredCelebName}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-slate-300">{t('auth.emailLabel')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-medium text-white text-sm"
              placeholder="e.g. luxury@celeb.com"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-slate-300">{t('auth.passwordLabel')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all font-medium text-white text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold text-center bg-red-550/10 py-3 rounded-xl border border-red-500/20 leading-relaxed px-4">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 shadow-primary/10"
          >
            {loading ? t('common.loading') : t('nav.login')}
          </button>
        </form>

        {forceRole === 'celebrity' ? (
          <div className="mt-8 text-center border-t border-white/5 pt-6 text-sm">
            <p className="text-white/30 font-medium text-xs">
              Want to join the onboarding roster? <Link to="/admin/register" className="text-primary hover:underline font-extrabold uppercase ml-1">Apply Now</Link>
            </p>
          </div>
        ) : forceRole === 'superadmin' ? (
          <div className="mt-8 text-center border-t border-white/5 pt-6 text-xs">
            <Link to="/" className="text-white/30 hover:text-white font-extrabold uppercase">← Back to Lands</Link>
          </div>
        ) : (
          <div className="mt-8 text-center border-t border-white/5 pt-6 text-sm">
            <p className="text-white/30 font-medium text-xs">
              {t('auth.dontHaveAccount')} <Link to="/register" className="text-primary hover:underline font-extrabold uppercase ml-1">{t('nav.signUp')}</Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
