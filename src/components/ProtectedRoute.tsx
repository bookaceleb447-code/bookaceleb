import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'fan' | 'celebrity' | 'superadmin' | 'demoCelebrity')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
  </div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role) {
    const isAllowed = allowedRoles.some(r => {
      if (r === 'user' && (role === 'user' || role === 'fan')) return true;
      if (r === 'fan' && (role === 'user' || role === 'fan')) return true;
      return r === role;
    });
    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
