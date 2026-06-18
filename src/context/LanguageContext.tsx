import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLanguageName, SUPPORTED_LANGUAGES } from '../lib/translateService';
import { AnimatePresence, motion } from 'motion/react';
import { Globe, X } from 'lucide-react';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
  autoTranslateIncoming: boolean;
  setAutoTranslateIncoming: (val: boolean) => Promise<void>;
  autoTranslateOutgoing: boolean;
  setAutoTranslateOutgoing: (val: boolean) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Core translation dictionary for UI coherence across all 10 target languages
const UI_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    home: 'Home',
    dashboard: 'Dashboard',
    lounge: 'Lounge',
    login: 'Sign In',
    logout: 'Disconnect',
    register: 'Sign Up',
    chats: 'Chats / Messages',
    pref_lang: 'Preferred Language',
    translation_settings: 'Translation Settings',
    auto_translate_incoming: 'Auto Translate Incoming Messages',
    auto_translate_outgoing: 'Auto Translate Outgoing Messages',
    send_as: 'Send As',
    is_typing: 'is typing',
    unlocked_channels: 'Unlocked Contact Links',
    back_to_lounge: 'Back to Lounge',
    direct_channel: 'Direct Backstage Channel',
    vip_atrium_title: 'Elite Backstage Chat',
    celeb_dashboard: 'Celebrity Portal',
    fan_dashboard: 'Fan Lounge Dashboard',
    contact_star: 'Contact Star',
    translate_btn: 'Translate',
    show_original_btn: 'Show Original',
    copy_text_btn: 'Copy Text',
    copied_alert: 'Text copied to clipboard!',
    translation_unavailable: 'Translation unavailable. Please try again later.',
    settings_saved: 'Settings updated successfully!',
    welcome_to_celeb: 'Welcome to Book A Celebrity',
    hero_descr: 'Book your favorite stars for private consultation, video greetings, and personalized fan cards.',
    profile_settings: 'Profile Settings',
  },
  fr: {
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    lounge: 'Salon',
    login: 'Se connecter',
    logout: 'Déconnexion',
    register: "S'inscrire",
    chats: 'Chats / Messages',
    pref_lang: 'Langue Préférée',
    translation_settings: 'Paramètres de Traduction',
    auto_translate_incoming: 'Traduire Automatiquement les Messages Entrants',
    auto_translate_outgoing: 'Traduire Automatiquement les Messages Sortants',
    send_as: 'Envoyer En',
    is_typing: 'est en train d\'écrire',
    unlocked_channels: 'Liens de Contact Déverrouillés',
    back_to_lounge: 'Retour au Salon',
    direct_channel: 'Canal Direct Backstage',
    vip_atrium_title: 'Chat Backstage Élite',
    celeb_dashboard: 'Portail Célébrité',
    fan_dashboard: 'Tableau de bord du Salon Fan',
    contact_star: 'Contacter la Star',
    translate_btn: 'Traduire',
    show_original_btn: 'Afficher l\'original',
    copy_text_btn: 'Copier le texte',
    copied_alert: 'Texte copié dans le presse-papiers !',
    translation_unavailable: 'Traduction indisponible. Veuillez réessayer plus tard.',
    settings_saved: 'Paramètres mis à jour avec succès !',
    welcome_to_celeb: 'Bienvenue sur Book A Celebrity',
    hero_descr: 'Réservez vos stars préférées pour des consultations privées, des messages vidéo et des cartes de fan personnalisées.',
    profile_settings: 'Paramètres du Profil',
  },
  es: {
    home: 'Inicio',
    dashboard: 'Tablero',
    lounge: 'Salón',
    login: 'Iniciar Sesión',
    logout: 'Desconectar',
    register: 'Registrarse',
    chats: 'Chats / Mensajes',
    pref_lang: 'Idioma Preferido',
    translation_settings: 'Ajustes de Traducción',
    auto_translate_incoming: 'Traducir Automáticamente Mensajes Entrantes',
    auto_translate_outgoing: 'Traducir Automáticamente Mensajes Salientes',
    send_as: 'Enviar Como',
    is_typing: 'está escribiendo',
    unlocked_channels: 'Enlaces de Contacto Desbloqueados',
    back_to_lounge: 'Volver al Salón',
    direct_channel: 'Canal Directo Backstage',
    vip_atrium_title: 'Chat Backstage Élite',
    celeb_dashboard: 'Portal de Celebridades',
    fan_dashboard: 'Tablero del Salón de Fans',
    contact_star: 'Contactar Estrella',
    translate_btn: 'Traducir',
    show_original_btn: 'Mostrar Original',
    copy_text_btn: 'Copiar Texto',
    copied_alert: '¡Texto copiado al portapapeles!',
    translation_unavailable: 'Traducción no disponible. Por favor, inténtelo más tarde.',
    settings_saved: '¡Ajustes actualizados con éxito!',
    welcome_to_celeb: 'Bienvenido a Book A Celebrity',
    hero_descr: 'Reserva tus estrellas favoritas para consultas privadas, saludos en video y tarjetas de fan personalizadas.',
    profile_settings: 'Ajustes de Perfil',
  },
  de: {
    home: 'Startseite',
    dashboard: 'Dashboard',
    lounge: 'Lounge',
    login: 'Einloggen',
    logout: 'Abmelden',
    register: 'Registrieren',
    chats: 'Chats / Nachrichten',
    pref_lang: 'Bevorzugte Sprache',
    translation_settings: 'Übersetzungseinstellungen',
    auto_translate_incoming: 'Eingehende Nachrichten automatisch übersetzen',
    auto_translate_outgoing: 'Ausgehende Nachrichten automatisch übersetzen',
    send_as: 'Senden als',
    is_typing: 'schreibt...',
    unlocked_channels: 'Freigeschaltete Kontaktlinks',
    back_to_lounge: 'Zurück zur Lounge',
    direct_channel: 'Direkter Backstage-Kanal',
    vip_atrium_title: 'Elite Backstage-Chat',
    celeb_dashboard: 'Promi-Portal',
    fan_dashboard: 'Fan-Lounge-Dashboard',
    contact_star: 'Star kontaktieren',
    translate_btn: 'Übersetzen',
    show_original_btn: 'Original anzeigen',
    copy_text_btn: 'Text kopieren',
    copied_alert: 'Text in die Zwischenablage kopiert!',
    translation_unavailable: 'Übersetzung nicht verfügbar. Bitte versuchen Sie es später noch einmal.',
    settings_saved: 'Einstellungen erfolgreich aktualisiert!',
    welcome_to_celeb: 'Willkommen bei Book A Celebrity',
    hero_descr: 'Buchen Sie Ihre Lieblingsstars für private Beratungen, Videogrüße und personalisierte Fankarten.',
    profile_settings: 'Profileinstellungen',
  },
  it: {
    home: 'Home',
    dashboard: 'Cruscotto',
    lounge: 'Lounge',
    login: 'Accedi',
    logout: 'Disconnetti',
    register: 'Registrati',
    chats: 'Chat / Messaggi',
    pref_lang: 'Lingua Preferita',
    translation_settings: 'Impostazioni di Traduzione',
    auto_translate_incoming: 'Traduzione Automatica Messaggi in Entrata',
    auto_translate_outgoing: 'Traduzione Automatica Messaggi in Uscita',
    send_as: 'Invia Come',
    is_typing: 'sta scrivendo...',
    unlocked_channels: 'Link di Contatto Sbloccati',
    back_to_lounge: 'Torna alla Lounge',
    direct_channel: 'Canale Diretto Backstage',
    vip_atrium_title: 'Chat Backstage d\'Élite',
    celeb_dashboard: 'Portale delle Celebrità',
    fan_dashboard: 'Cruscotto della Lounge dei Fan',
    contact_star: 'Contatta la Star',
    translate_btn: 'Traduci',
    show_original_btn: 'Mostra Originale',
    copy_text_btn: 'Copia Testo',
    copied_alert: 'Testo copiato negli appunti!',
    translation_unavailable: 'Traduzione non disponibile. Riprova più tardi.',
    settings_saved: 'Impostazioni aggiornate con successo!',
    welcome_to_celeb: 'Benvenuto su Book A Celebrity',
    hero_descr: 'Prenota le tue star preferite per consulenze private, auguri video e fankard personalizzate.',
    profile_settings: 'Impostazioni del Profilo',
  },
  pt: {
    home: 'Início',
    dashboard: 'Painel',
    lounge: 'Salão',
    login: 'Entrar',
    logout: 'Desconectar',
    register: 'Cadastrar-se',
    chats: 'Chats / Mensagens',
    pref_lang: 'Idioma Preferido',
    translation_settings: 'Configurações de Tradução',
    auto_translate_incoming: 'Traduzir Automaticamente Mensagens Recebidas',
    auto_translate_outgoing: 'Traduzir Automaticamente Mensagens Enviadas',
    send_as: 'Enviar Como',
    is_typing: 'está escrevendo...',
    unlocked_channels: 'Links de Contato Desbloqueados',
    back_to_lounge: 'Voltar ao Salão',
    direct_channel: 'Canal Direto de Bastidores',
    vip_atrium_title: 'Chat de Bastidores Elite',
    celeb_dashboard: 'Portal de Celebridades',
    fan_dashboard: 'Painel do Salão de Fãs',
    contact_star: 'Contatar Estrela',
    translate_btn: 'Traduzir',
    show_original_btn: 'Mostrar Original',
    copy_text_btn: 'Copiar Texto',
    copied_alert: 'Texto copiado para a área de transferência!',
    translation_unavailable: 'Tradução indisponível. Tente novamente mais tarde.',
    settings_saved: 'Configurações atualizadas com sucesso!',
    welcome_to_celeb: 'Bem-vindo ao Book A Celebrity',
    hero_descr: 'Reserve suas estrelas favoritas para consultas privadas, videochamadas de saudações e cartões de fãs personalizados.',
    profile_settings: 'Configurações do Perfil',
  },
  ar: {
    home: 'العربية',
    dashboard: 'لوحة التحكم',
    lounge: 'الصالة',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    register: 'الاشتراك',
    chats: 'المحادثات / الرسائل',
    pref_lang: 'اللغة المفضلة',
    translation_settings: 'إعدادات الترجمة',
    auto_translate_incoming: 'ترجمة تلقائية للرسائل الواردة',
    auto_translate_outgoing: 'ترجمة تلقائية للرسائل الواردة',
    send_as: 'إرسال كـ',
    is_typing: 'يكتب الآن...',
    unlocked_channels: 'روابط الاتصال المفتوحة',
    back_to_lounge: 'العودة إلى الصالة',
    direct_channel: 'قناة مباشرة خلف الكواليس',
    vip_atrium_title: 'دردشة النخبة خلف الكواليس',
    celeb_dashboard: 'بوابة المشاهير',
    fan_dashboard: 'لوحة التحكم لصالة المعجبين',
    contact_star: 'اتصل بالنجم',
    translate_btn: 'ترجم',
    show_original_btn: 'عرض النص الأصلي',
    copy_text_btn: 'نسخ النص',
    copied_alert: 'تم نسخ النص إلى الحافظة!',
    translation_unavailable: 'الترجمة غير متوفرة حاليًا. يرجى المحاولة لاحقًا.',
    settings_saved: 'تم تحديث الإعدادات بنجاح!',
    welcome_to_celeb: 'مرحبًا بك في Book A Celebrity',
    hero_descr: 'احجز نجومك المفضلين للاستشارات الخاصة وتحيات الفيديو وبطاقات المعجبين المخصصة.',
    profile_settings: 'إعدادات الملف الشخصي',
  },
  zh: {
    home: '主页',
    dashboard: '控制台',
    lounge: '大厅',
    login: '登录',
    logout: '登出',
    register: '注册',
    chats: '聊天 / 消息',
    pref_lang: '首选语言',
    translation_settings: '翻译设置',
    auto_translate_incoming: '自动翻译接收到的消息',
    auto_translate_outgoing: '自动翻译发送的消息',
    send_as: '发送语言',
    is_typing: '正在输入...',
    unlocked_channels: '已解锁的联系链接',
    back_to_lounge: '返回大厅',
    direct_channel: '直通后台频道',
    vip_atrium_title: '精英幕后聊天',
    celeb_dashboard: '明星入口',
    fan_dashboard: '粉丝休息室控制台',
    contact_star: '联系明星',
    translate_btn: '翻译',
    show_original_btn: '显示原文',
    copy_text_btn: '复制文本',
    copied_alert: '文本已复制到剪贴板！',
    translation_unavailable: '翻译服务不可用。请稍后再试。',
    settings_saved: '设置更新成功！',
    welcome_to_celeb: '欢迎来到 Book A Celebrity',
    hero_descr: '预订您喜爱的明星进行私人咨询、视频问候和个性化粉丝卡。',
    profile_settings: '个人主页设置',
  },
  ja: {
    home: 'ホーム',
    dashboard: 'ダッシュボード',
    lounge: 'ラウンジ',
    login: 'ログイン',
    logout: 'ログアウト',
    register: '新規登録',
    chats: 'チャット / メッセージ',
    pref_lang: '優先言語',
    translation_settings: '翻訳設定',
    auto_translate_incoming: '受信メッセージを自動翻訳',
    auto_translate_outgoing: '送信メッセージを自動翻訳',
    send_as: '送信形式',
    is_typing: 'が入力中...',
    unlocked_channels: 'ロック解除済みの連絡先リンク',
    back_to_lounge: 'ラウンジに戻る',
    direct_channel: 'ダイレクトバックステージチャンネル',
    vip_atrium_title: 'エリートバックステージチャット',
    celeb_dashboard: 'セレブポータル',
    fan_dashboard: 'ファンラウンジダッシュボード',
    contact_star: 'セレブに連絡',
    translate_btn: '翻訳',
    show_original_btn: '原文を表示',
    copy_text_btn: 'テキストをコピー',
    copied_alert: 'テキストがクリップボードにコピーされました！',
    translation_unavailable: '翻訳は利用できません。後ほどもう一度お試しください。',
    settings_saved: '設定が正常に更新されました！',
    welcome_to_celeb: 'Book A Celebrity へようこそ',
    hero_descr: 'お気に入りのスターをプライベート相談、ビデオグリーティング、パーソナライズされたファンカードで予約しましょう。',
    profile_settings: 'プロフィール設定',
  },
  ru: {
    home: 'Главная',
    dashboard: 'Панель управления',
    lounge: 'Лаундж',
    login: 'Войти',
    logout: 'Выйти',
    register: 'Регистрация',
    chats: 'Чаты / Сообщения',
    pref_lang: 'Предпочтительный язык',
    translation_settings: 'Настройки перевода',
    auto_translate_incoming: 'Автоматически переводить входящие',
    auto_translate_outgoing: 'Автоматически переводить исходящие',
    send_as: 'Отправлять как',
    is_typing: 'печатает...',
    unlocked_channels: 'Разблокированные контакты',
    back_to_lounge: 'Назад в Лаундж',
    direct_channel: 'Прямой закрытый канал',
    vip_atrium_title: 'Элитный бэкстейдж чат',
    celeb_dashboard: 'Портал Знаменитости',
    fan_dashboard: 'Панель Лаунджа фанатов',
    contact_star: 'Связаться со звездой',
    translate_btn: 'Перевести',
    show_original_btn: 'Показать оригинал',
    copy_text_btn: 'Копировать текст',
    copied_alert: 'Текст скопирован в буфер обмена!',
    translation_unavailable: 'Перевод недоступен. Пожалуйста, попробуйте позже.',
    settings_saved: 'Настройки успешно обновлены!',
    welcome_to_celeb: 'Добро пожаловать в Book A Celebrity',
    hero_descr: 'Бронируйте любимых звезд для личных консультаций, видеопоздравлений и именных фан-карт.',
    profile_settings: 'Настройки профиля',
  }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguageState] = useState<string>('en');
  const [autoTranslateIncoming, setAutoTranslateIncomingState] = useState<boolean>(true);
  const [autoTranslateOutgoing, setAutoTranslateOutgoingState] = useState<boolean>(false);
  
  // Detection prompt state
  const [showDetectPopup, setShowDetectPopup] = useState<boolean>(false);
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');
  const [detectedLangName, setDetectedLangName] = useState<string>('');

  // 1. Load initial preference
  useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved) {
      setCurrentLanguageState(saved);
    } else {
      // Automatic detection workflow trigger
      detectBrowserLanguage();
    }
  }, []);

  // 2. Fetch user profile configurations when authenticated
  useEffect(() => {
    if (!user) return;
    const loadProfileSettings = async () => {
      try {
        const udoc = await getDoc(doc(db, 'users', user.uid));
        if (udoc.exists()) {
          const data = udoc.data();
          if (data.preferredLanguage) {
            setCurrentLanguageState(data.preferredLanguage);
            localStorage.setItem('preferredLanguage', data.preferredLanguage);
          }
          if (data.autoTranslateIncoming !== undefined) {
            setAutoTranslateIncomingState(data.autoTranslateIncoming);
          }
          if (data.autoTranslateOutgoing !== undefined) {
            setAutoTranslateOutgoingState(data.autoTranslateOutgoing);
          }
        }
      } catch (err) {
        console.warn('Could not read preferredLanguage from user profile doc', err);
      }
    };
    loadProfileSettings();
  }, [user]);

  const detectBrowserLanguage = () => {
    try {
      const browserLocale = navigator.language || 'en';
      const rootCode = browserLocale.split('-')[0].toLowerCase();
      
      const isOkCode = SUPPORTED_LANGUAGES.some(l => l.code === rootCode);
      if (isOkCode && rootCode !== 'en') {
        const langName = getLanguageName(rootCode);
        setDetectedLangCode(rootCode);
        setDetectedLangName(langName);
        setShowDetectPopup(true);
      }
    } catch (e) {
      console.warn('Error on browser language detection:', e);
    }
  };

  const setLanguage = async (lang: string) => {
    setCurrentLanguageState(lang);
    localStorage.setItem('preferredLanguage', lang);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          preferredLanguage: lang
        }, { merge: true });
      } catch (err) {
        console.error('Failed to sync user dynamic language in profile:', err);
      }
    }
  };

  const setAutoTranslateIncoming = async (val: boolean) => {
    setAutoTranslateIncomingState(val);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          autoTranslateIncoming: val
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update incoming translation settings:', err);
      }
    }
  };

  const setAutoTranslateOutgoing = async (val: boolean) => {
    setAutoTranslateOutgoingState(val);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          autoTranslateOutgoing: val
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update outgoing translation settings:', err);
      }
    }
  };

  const t = (key: string): string => {
    const localeDict = UI_DICTIONARY[currentLanguage] || UI_DICTIONARY.en;
    return localeDict[key] || UI_DICTIONARY.en[key] || key;
  };

  const handleApplyDetection = async () => {
    await setLanguage(detectedLangCode);
    setShowDetectPopup(false);
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage,
      autoTranslateIncoming,
      setAutoTranslateIncoming,
      autoTranslateOutgoing,
      setAutoTranslateOutgoing,
      t
    }}>
      {children}

      {/* Glassmorphic Language Detector Suggestion Popup */}
      <AnimatePresence>
        {showDetectPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-[200] max-w-sm w-[90vw] glass p-6 border border-white/10 rounded-[2rem] shadow-2xl flex flex-col gap-4 text-white"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 text-primary rounded-2xl">
                  <Globe size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-[13px] tracking-wider uppercase font-sans">Language Detected</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Automated detection</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetectPopup(false)}
                className="p-1 px-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              We detected your system language is <span className="text-primary font-bold">{detectedLangName}</span>. 
              Would you like to translate the Book A Celebrity panel now?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleApplyDetection}
                className="flex-1 py-3 px-4 bg-primary text-black font-sans font-black text-[10px] tracking-widest uppercase rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                Switch to {detectedLangName}
              </button>
              <button
                onClick={() => setShowDetectPopup(false)}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-sans font-black text-[10px] tracking-widest uppercase border border-white/5 hover:border-white/15 rounded-xl transition-all cursor-pointer"
              >
                Stay in English
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
