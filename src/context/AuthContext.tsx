import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'fan' | 'celebrity' | 'demoCelebrity' | 'superadmin' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'fan' | 'celebrity' | 'demoCelebrity' | 'superadmin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authControls, setAuthControls] = useState<any>(null);

  useEffect(() => {
    const unsubControls = onSnapshot(doc(db, 'siteSettings', 'authControls'), (snap) => {
      if (snap.exists()) {
        setAuthControls(snap.data());
      }
    }, (err) => {
      console.error('Error loading authControls in auth provider:', err);
    });
    return unsubControls;
  }, []);

  useEffect(() => {
    if (!user || !role || !authControls) return;

    // Super Admin is always exempt from authentication locks
    if (role === 'superadmin' || user.email === 'bookaceleb447@gmail.com') return;

    const isGlobalDisabled = authControls.globalAuthEnabled === false;
    const isCelebLoginBlocked = role === 'celebrity' && authControls.celebrityLoginEnabled === false;
    const isFanLoginBlocked = (role === 'user' || role === 'fan') && authControls.fanLoginEnabled === false;

    if (isGlobalDisabled || isCelebLoginBlocked || isFanLoginBlocked) {
      console.warn(`[AuthLock Session Enforcement] Active lock triggered logout. Role: ${role}, GlobalDisabled: ${isGlobalDisabled}, CelebLoginBlocked: ${isCelebLoginBlocked}, FanLoginBlocked: ${isFanLoginBlocked}`);
      auth.signOut().catch(err => {
        console.error('Error executing forced auth lock logout:', err);
      });
    }
  }, [user, role, authControls]);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      setUser(u);
      if (u) {
        if (u.email === 'bookaceleb447@gmail.com') {
          setRole('superadmin');
          setLoading(false);
        } else {
          // Listen to changes in real-time to allow instant session termination if banned
          unsubUserDoc = onSnapshot(doc(db, 'users', u.uid), async (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data?.isBanned) {
                alert('Your account is currently suspended / banned by Super Admin. Connection terminated.');
                await auth.signOut();
                setUser(null);
                setRole(null);
              } else {
                setRole(data?.role || 'fan');
              }
            } else {
              setRole('fan');
            }
            setLoading(false);
          }, (err) => {
            console.error('Error in real-time user profile sync:', err);
            setRole('fan');
            setLoading(false);
          });
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
