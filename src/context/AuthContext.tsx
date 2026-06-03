import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'celebrity' | 'superadmin' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'celebrity' | 'superadmin' | null>(null);
  const [loading, setLoading] = useState(true);

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
                setRole(data?.role || 'user');
              }
            } else {
              setRole('user');
            }
            setLoading(false);
          }, (err) => {
            console.error('Error in real-time user profile sync:', err);
            setRole('user');
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
