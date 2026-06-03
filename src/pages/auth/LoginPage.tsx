import { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginPageProps {
  forceRole?: 'celebrity' | 'superadmin' | 'user';
}

export const LoginPage = ({ forceRole }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      let role = 'user';
      
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
        role = 'superadmin';
      } else {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          throw new Error('User record not found in system directories.');
        }
        const data = userDoc.data();
        if (data?.isBanned) {
          await auth.signOut();
          throw new Error('This account has been suspended or banned by the Super Admin.');
        }
        role = data.role || 'user';
      }

      // Enforce Role Pathways
      if (forceRole) {
        if (role !== forceRole) {
          throw new Error(`Unauthorized. This login portal is strictly for ${forceRole} accounts only.`);
        }
      } else {
        // Normal general fan login page - strictly block celebrities & superadmins
        if (role !== 'user') {
          throw new Error('Unauthorized. This portal is for Fans only. Celebrities must sign in at the Celebrity portal.');
        }
      }

      // Link referral to user document in Firestore on login, then clear from local storage
      const referredBy = localStorage.getItem('referred_by');
      if (referredBy && role === 'user') {
        try {
          await setDoc(doc(db, 'users', uid), { referredBy }, { merge: true });
        } catch (syncErr) {
          console.error("Error syncing referral ID:", syncErr);
        }
      }
      localStorage.removeItem('referred_by');
      localStorage.removeItem('referred_celeb_name');

      // Route Redirection
      if (role === 'superadmin') {
        navigate('/super-admin');
      } else if (role === 'celebrity') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            {forceRole === 'superadmin' ? 'Elite Control' : forceRole === 'celebrity' ? 'Celebrity Access' : 'Fan Login'}
          </h1>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Welcome back to the premium circle</p>
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
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-slate-300">Email Address</label>
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
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-slate-300">Security Password</label>
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
            {loading ? 'Authenticating Credentials...' : 'Sign In Now'}
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
              Don't possess a fan profile yet? <Link to="/register" className="text-primary hover:underline font-extrabold uppercase ml-1">Sign Up</Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
