/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

// Lazy load all feature pages to perform route-based bundle splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const CelebrityRegisterPage = lazy(() => import('./pages/auth/CelebrityRegisterPage').then(m => ({ default: m.CelebrityRegisterPage })));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard').then(m => ({ default: m.UserDashboard })));
const CelebrityDashboard = lazy(() => import('./pages/admin/CelebrityDashboard').then(m => ({ default: m.CelebrityDashboard })));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const BookingPage = lazy(() => import('./pages/user/BookingPage').then(m => ({ default: m.BookingPage })));
const DonationPage = lazy(() => import('./pages/user/DonationPage').then(m => ({ default: m.DonationPage })));
const FanCardPage = lazy(() => import('./pages/user/FanCardPage').then(m => ({ default: m.FanCardPage })));
const ContactCelebrityPage = lazy(() => import('./pages/user/ContactCelebrityPage').then(m => ({ default: m.ContactCelebrityPage })));
const ReferralHandler = lazy(() => import('./pages/ReferralHandler').then(m => ({ default: m.ReferralHandler })));

const ModuleLoader = () => (
  <div className="h-screen w-screen bg-[#020512] flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary/10 border-t-primary animate-spin mb-4" />
      <p className="font-sans font-black tracking-[0.3em] text-[10px] uppercase text-primary/80 animate-pulse">VIP Atrium loading...</p>
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    // Record original favicons to fallback upon deletion
    const selectors = ["link[rel~='icon']", "link[rel='apple-touch-icon']", "link[rel='shortcut icon']"];
    const originalHrefs: Record<string, string> = {};
    selectors.forEach(sel => {
      const el = document.querySelector(sel) as HTMLLinkElement;
      if (el) {
        originalHrefs[sel] = el.getAttribute('href') || '';
      }
    });

    const unsub = onSnapshot(doc(db, 'siteSettings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const faviconUrl = data?.faviconUrl || '';
        
        selectors.forEach(selector => {
          const el = document.querySelector(selector) as HTMLLinkElement;
          if (el) {
            el.href = faviconUrl || originalHrefs[selector] || '';
          }
        });
        
        // If there's an active custom favicon but no icon link tags at all exist, append one
        if (faviconUrl) {
          let hasIcon = false;
          selectors.forEach(selector => {
            if (document.querySelector(selector)) hasIcon = true;
          });
          if (!hasIcon) {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = faviconUrl;
            document.head.appendChild(newLink);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<ModuleLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ref/:slug/:celebName" element={<ReferralHandler />} />
            
            {/* User Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/book/:celebId" element={
              <ProtectedRoute allowedRoles={['user']}>
                <BookingPage />
              </ProtectedRoute>
            } />
            <Route path="/donate/:celebId" element={
              <ProtectedRoute allowedRoles={['user']}>
                <DonationPage />
              </ProtectedRoute>
            } />
            <Route path="/fan-card/:celebId" element={
              <ProtectedRoute allowedRoles={['user']}>
                <FanCardPage />
              </ProtectedRoute>
            } />
            <Route path="/contact-celebrity/:celebId" element={
              <ProtectedRoute allowedRoles={['user']}>
                <ContactCelebrityPage />
              </ProtectedRoute>
            } />

            {/* Celeb Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['celebrity']}>
                <CelebrityDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/login" element={<LoginPage forceRole="celebrity" />} />
            <Route path="/admin/register" element={<CelebrityRegisterPage />} />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/super-admin/login" element={<LoginPage forceRole="superadmin" />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
