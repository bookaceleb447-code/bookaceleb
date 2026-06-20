import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';

export type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'ar';

export interface LanguageContextType {
  lang: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Robust fallback English dictionary embedded directly in code to prevent any startup rendering flickers
const fallbackEn: Record<string, any> = {
  "nav": {
    "featured": "Featured",
    "trending": "Trending",
    "metrics": "Metrics",
    "login": "Login",
    "signUp": "Sign Up",
    "logout": "Log Out",
    "dashboard": "Dashboard",
    "home": "Home",
    "admin": "Admin"
  },
  "hero": {
    "badge": "Elite Global Connectivity Protocol",
    "titleLine1": "Meet Your Favorite",
    "titleLine2": "Celebrity",
    "subtitle": "Connect directly with your favorite stars. Unlock custom-tailored elite experiences, personalized video shoutouts, official dynamic fan VIP credentials, secure ledger tipping, and direct private messaging channels, all managed by official artist representation.",
    "ctaBook": "Book VIP Access",
    "ctaExplore": "Explore Members",
    "trustedBy": "Trusted by elite managers, artists, and VIP clients globally."
  },
  "common": {
    "welcome": "Welcome",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "submit": "Submit",
    "loading": "Loading...",
    "save": "Save",
    "edit": "Edit",
    "delete": "Delete",
    "back": "Back",
    "next": "Next",
    "status": "Status",
    "actions": "Actions",
    "approved": "Approved",
    "pending": "Pending",
    "rejected": "Rejected",
    "price": "Price",
    "amount": "Amount",
    "date": "Date",
    "currency": "$",
    "noData": "No data found",
    "upload": "Upload",
    "success": "Success",
    "error": "Error"
  },
  "auth": {
    "loginTitle": "VIP Access Portal",
    "loginSubtitle": "Enter your validated credentials to unlock exclusive celebrity access rooms.",
    "registerTitle": "Create Fan Account",
    "registerSubtitle": "Join the elite connectivity protocol to engage directly with iconic artists.",
    "emailLabel": "Authorized Email Address",
    "passwordLabel": "Secure Security Key",
    "fullNameLabel": "Full Member Name",
    "dontHaveAccount": "Don't have an account?",
    "alreadyHaveAccount": "Already registered?",
    "joinAsFan": "Join as Fan",
    "joinAsCeleb": "Apply as Celebrity"
  },
  "dashboard": {
    "vipTitle": "MEMBER ATRIUM",
    "welcomeBack": "Welcome back, Collector",
    "joinedOn": "Authorized since",
    "activeMemberships": "Active VIP Memberships",
    "pendingMemberships": "Pending Applications",
    "noMemberships": "You have no active memberships. Connect with your favorite celebrity to begin.",
    "bookingStatus": "Your Bookings",
    "bookingHeaderTitle": "Booking Requests",
    "managePass": "Open VIP Pass",
    "contact": "Message Panel",
    "donateText": "Sponsor",
    "bookText": "Book Private Session"
  },
  "booking": {
    "title": "Book Private Experience",
    "subtitle": "Initiate booking validation. Requests are reviewed and verified directly by artist management.",
    "selectTier": "Choose Membership Tier",
    "customReason": "Occasion / Session Details",
    "reasonPlaceholder": "Describe details of the requested event, customized video shoutout, or priority meet-up...",
    "fileUploadLabel": "Upload Payment Receipt Proof",
    "fileUploadHelp": "PNG or JPG format showing transaction verification.",
    "submittingBooking": "Validating credentials and routing payment file...",
    "bookingSuccess": "Booking application submitted successfully! Artist manager is reviewing your files.",
    "insufficientDetails": "Please fill out all required fields and upload payment proof."
  },
  "fanCard": {
    "title": "VIP Digital Credentials",
    "subtitle": "Your official double-sided membership pass, authorized by management.",
    "downloadPass": "Download Pass High-Res",
    "front": "Front Card",
    "back": "Back Card",
    "howToUse": "Present this digital card at entry checkpoints or exclusive virtual gates to verify VIP authorization."
  }
};

const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'de', 'es', 'it', 'pt', 'ar'];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    // 1. Try saved language 
    const saved = localStorage.getItem('vip_language');
    if (saved && SUPPORTED_LANGUAGES.includes(saved as Language)) {
      return saved as Language;
    }
    // 2. Detect browser primary language
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
    if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
      return browserLang as Language;
    }
    // 3. Fallback
    return 'en';
  });

  const [dictionary, setDictionary] = useState<Record<string, any>>(fallbackEn);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Function to load language file asynchronously
  const loadTranslationFile = async (targetLang: Language): Promise<Record<string, any>> => {
    try {
      const response = await fetch(`/locales/${targetLang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translation: ${response.statusText}`);
      }
      return await response.json();
    } catch (e) {
      console.warn(`Could not load translation file for "${targetLang}". Using preloaded keys or fallback.`, e);
      return {};
    }
  };

  const setLanguage = async (newLang: Language) => {
    setIsLoaded(false);
    const data = await loadTranslationFile(newLang);
    
    // Merge new translation data with English fallback to guarantee no missing keys trigger blank fields
    const merged = { ...fallbackEn };
    if (data) {
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'object' && data[key] !== null) {
          merged[key] = { ...fallbackEn[key], ...data[key] };
        } else {
          merged[key] = data[key];
        }
      });
    }

    setLangState(newLang);
    setDictionary(merged);
    localStorage.setItem('vip_language', newLang);
    
    // Set HTML and directional properties
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    setIsLoaded(true);
  };

  // Initial load
  useEffect(() => {
    setLanguage(lang);
  }, []);

  // Safe translation resolver that parses nested paths (e.g. 'nav.featured')
  const t = (key: string, fallback?: string): string => {
    const parts = key.split('.');
    
    // 1. Seek in dynamic loaded dictionary
    let curr: any = dictionary;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        curr = undefined;
        break;
      }
    }

    if (typeof curr === 'string') {
      return curr;
    }

    // 2. Seek in fallback static English source
    let fallbackCurr: any = fallbackEn;
    for (const part of parts) {
      if (fallbackCurr && typeof fallbackCurr === 'object' && part in fallbackCurr) {
        fallbackCurr = fallbackCurr[part];
      } else {
        fallbackCurr = undefined;
        break;
      }
    }

    if (typeof fallbackCurr === 'string') {
      return fallbackCurr;
    }

    // 3. Return explicit or raw key fallback
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Automatic dynamic text translation hook with localStorage query cache
export function useAutoTranslate(text: string): string {
  const context = useContext(LanguageContext);
  const lang = context ? context.lang : 'en';
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (!text || typeof text !== 'string' || !text.trim() || lang === 'en') {
      setTranslated(text);
      return;
    }

    const trimmed = text.trim();
    const cacheKey = `trans_${lang}_${encodeURIComponent(trimmed)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setTranslated(cached);
      return;
    }

    let isMounted = true;
    const fetchTranslation = async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (auth.currentUser) {
          try {
            const token = await auth.currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
          } catch (tokenErr) {
            console.warn("Failed to retrieve ID token for translation request:", tokenErr);
          }
        }
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ text: trimmed, targetLang: lang })
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.translatedText) {
            localStorage.setItem(cacheKey, data.translatedText);
            setTranslated(data.translatedText);
          }
        }
      } catch (err) {
        console.error("AutoTranslate error:", err);
      }
    };

    fetchTranslation();

    return () => {
      isMounted = false;
    };
  }, [text, lang]);

  return translated;
}

// Global drop-in React component for real-time translation fallback
export const Translate: React.FC<{ text: string }> = ({ text }) => {
  const translated = useAutoTranslate(text);
  return <>{translated}</>;
};
