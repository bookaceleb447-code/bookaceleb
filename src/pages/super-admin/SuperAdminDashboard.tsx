import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { checkAndExpireAiPremium } from '../../lib/premiumCheck';
import { Toast } from '../../components/Toast';
import { 
  doc, getDoc, updateDoc, setDoc, collection, onSnapshot, query, where, deleteDoc, getDocs 
} from 'firebase/firestore';
import { 
  ShieldCheck, LayoutGrid, Users, CreditCard, Settings,
  Check, X, Eye, ExternalLink, TrendingUp, BarChart3,
  Calendar, Heart, MessageSquare, Menu, Sparkles,
  Building2, Link as LinkIcon, DollarSign, Globe,
  Briefcase, ShieldAlert, Award, Search, Trash2, EyeOff, Save, PhoneCall,
  UploadCloud, Video, PlayCircle, PlusCircle
} from 'lucide-react';

export const SuperAdminDashboard = () => {
    const [activeTab, setActiveTabState] = useState(() => {
        return localStorage.getItem('super_active_tab') || 'dashboard';
    });
    const setActiveTab = (tab: string) => {
        localStorage.setItem('super_active_tab', tab);
        setActiveTabState(tab);
    };
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Core loaded states
    const [siteSettings, setSiteSettings] = useState<any>(null);
    const [allCelebs, setAllCelebs] = useState<any[]>([]); // Real Master list of celebrity profiles (from celebrityProfiles)
    const [showcaseCards, setShowcaseCards] = useState<any[]>([]); // Curated landing page list (from landingPageShowcase)
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [pendingUpgrades, setPendingUpgrades] = useState<any[]>([]);
    const [pendingAiUpgrades, setPendingAiUpgrades] = useState<any[]>([]);
    const [aiUsageLogs, setAiUsageLogs] = useState<any[]>([]);
    const [allAiUsage, setAllAiUsage] = useState<any[]>([]);
    
    // UI Helpers
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null); // For Eye Details Modal
    
    // Manual demo creation inputs
    const [demoName, setDemoName] = useState('');
    const [demoPic, setDemoPic] = useState('');
    const [demoBio, setDemoBio] = useState('');
    const [demoCountry, setDemoCountry] = useState('Nigeria');
    const [demoPrice, setDemoPrice] = useState('1000');
    const [demoFanCard, setDemoFanCard] = useState('50');

    // Toast and Upload states
    const [toastShow, setToastShow] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [demoIsFeatured, setDemoIsFeatured] = useState(true);
    const [demoIsTrending, setDemoIsTrending] = useState(false);
    const [uploaderLoading, setUploaderLoading] = useState(false);
    
    // Core system purge states
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetPhraseInput, setResetPhraseInput] = useState('');

    // Celebrity Tutorials States
    const [tutorials, setTutorials] = useState<any[]>([]);
    const [tutTitle, setTutTitle] = useState('');
    const [tutDesc, setTutDesc] = useState('');
    const [tutVideoFile, setTutVideoFile] = useState<File | null>(null);
    const [tutVideoUrl, setTutVideoUrl] = useState('');
    const [isUploadingTut, setIsUploadingTut] = useState(false);
    const [editingTutId, setEditingTutId] = useState<string | null>(null);

    // AI Engine settings state
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [groqApiKey, setGroqApiKey] = useState('');
    const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
    const [faviconUploading, setFaviconUploading] = useState(false);

    // Authentication Lock controls state
    const [authControls, setAuthControls] = useState<any>({
        celebrityRegisterEnabled: true,
        celebrityLoginEnabled: true,
        fanRegisterEnabled: true,
        fanLoginEnabled: true,
        globalAuthEnabled: true,
        maintenanceReason: 'We are performing scheduled upgrades. Please try again later.'
    });

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setToastShow(true);
    };

    useEffect(() => {
        // Real-time Global Settings
        const unsubSettings = onSnapshot(doc(db, 'siteSettings', 'global'), (docSnap) => {
            if (docSnap.exists()) {
                setSiteSettings(docSnap.data());
            } else {
                // Initialize default
                const defaultSettings = {
                    activationFee: 499,
                    currency: 'USD',
                    adminBankName: 'INTERNATIONAL DIAMOND BANK',
                    adminAccountNo: '00293188201',
                    adminAccountName: 'BOOK A CELEB LTD',
                    whatsappLink: 'https://wa.me/23400000000',
                    telegramLink: 'https://t.me/bookacelebsupport',
                    appName: 'Book A Celeb',
                    appDescription: 'Exclusive booking & membership link platform.'
                };
                setDoc(doc(db, 'siteSettings', 'global'), defaultSettings);
                setSiteSettings(defaultSettings);
            }
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'siteSettings/global');
        });

        // Real-time custom Gemini API Key
        const unsubGemini = onSnapshot(doc(db, 'adminSettings', 'gemini'), (docSnap) => {
            if (docSnap.exists()) {
                setGeminiApiKey(docSnap.data()?.apiKey || '');
            }
        }, (err) => {
            console.log("Error loading dynamic Gemini settings:", err);
        });

        // Real-time custom Groq API Key
        const unsubGroq = onSnapshot(doc(db, 'adminSettings', 'groq'), (docSnap) => {
            if (docSnap.exists()) {
                setGroqApiKey(docSnap.data()?.apiKey || '');
            }
        }, (err) => {
            console.log("Error loading dynamic Groq settings:", err);
        });

        // Real-time dynamic Authentication Controls
        const unsubAuthControls = onSnapshot(doc(db, 'siteSettings', 'authControls'), (docSnap) => {
            if (docSnap.exists()) {
                setAuthControls(docSnap.data());
            } else {
                const defaultControls = {
                    celebrityRegisterEnabled: true,
                    celebrityLoginEnabled: true,
                    fanRegisterEnabled: true,
                    fanLoginEnabled: true,
                    globalAuthEnabled: true,
                    maintenanceReason: 'We are performing scheduled upgrades. Please try again later.'
                };
                setDoc(doc(db, 'siteSettings', 'authControls'), defaultControls);
                setAuthControls(defaultControls);
            }
        }, (err) => {
            console.error("Error loading auth controls:", err);
        });

        // Real-time Master Celebrities profiles (using celebrityProfiles collection)
        const unsubCelebs = onSnapshot(collection(db, 'celebrityProfiles'), (snap) => {
            const list = snap.docs.map(d => {
                const data = d.data();
                const celebId = d.id;
                // If premium and expired (> 35 days), trigger downgrade in background
                if (data.isAiSubscribed === true || data.aiPremium === true) {
                    if (data.aiPremiumExpiresAt && Date.now() > data.aiPremiumExpiresAt) {
                        checkAndExpireAiPremium(db, celebId, data).catch(err => {
                            console.error("Auto downgrade error in SuperAdmin:", err);
                        });
                        return {
                            id: celebId,
                            ...data,
                            isAiSubscribed: false,
                            aiPremium: false,
                            aiPremiumActivatedAt: null,
                            aiPremiumExpiresAt: null
                        };
                    }
                }
                return { id: celebId, ...data };
            });
            setAllCelebs(list);
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'celebrityProfiles');
        });

        // Real-time Curated landing page showcase collection
        const unsubShowcase = onSnapshot(collection(db, 'landingPageShowcase'), (snap) => {
            setShowcaseCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'landingPageShowcase');
        });

        // Real-time Users/Fans collection
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'users');
        });

        // Pending upgrades (from celebrityProfiles collection)
        const qPending = query(collection(db, 'celebrityProfiles'), where('upgradePending', '==', true));
        const unsubPending = onSnapshot(qPending, (snap) => {
            setPendingUpgrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'celebrityProfiles (pending)');
        });

        // Pending AI Premium upgrades (from celebrityProfiles collection)
        const qAiPending = query(collection(db, 'celebrityProfiles'), where('aiUpgradePending', '==', true));
        const unsubAiPending = onSnapshot(qAiPending, (snap) => {
            setPendingAiUpgrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'celebrityProfiles (ai pending)');
        });

        // Real-time AI usage logs for analytics (mapping newer aiRequests collection)
        const unsubAiLogs = onSnapshot(collection(db, 'aiRequests'), (snap) => {
            setAiUsageLogs(snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    isSubscribed: data.isPremiumAI === true,
                    isPremiumAI: data.isPremiumAI === true,
                    celebrityId: data.celebrityId,
                    date: data.requestDate || (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
                };
            }));
        }, (err) => {
            console.warn("AI requests fetch failed:", err);
        });

        // Real-time tutorials collection
        const unsubTutorials = onSnapshot(collection(db, 'tutorials'), (snap) => {
            setTutorials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'tutorials');
        });

        // Real-time aiUsage collection (Single Source Of Truth)
        const unsubAiUsage = onSnapshot(collection(db, 'aiUsage'), (snap) => {
            setAllAiUsage(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.warn("aiUsage collection subscription issue:", err);
        });

        return () => {
            unsubSettings();
            unsubGemini();
            unsubCelebs();
            unsubShowcase();
            unsubUsers();
            unsubPending();
            unsubAiPending();
            unsubAiLogs();
            unsubTutorials();
            unsubGroq();
            unsubAiUsage();
            unsubAuthControls();
        };
    }, []);

    // Calculated metrics
    const totalCelebrities = allCelebs.length;
    const totalFans = allUsers.filter(u => u.role === 'user').length;
    const totalPeople = totalCelebrities + allUsers.length;
    
    // VIP sum paid
    // Each approved (isLocked === false) celebrity represents one activation fee paid.
    const activeVipCount = allCelebs.filter(c => !c.isLocked).length;
    const calculatedVipRevenue = activeVipCount * (siteSettings?.activationFee || 499);
    const currencySym = siteSettings?.currency === 'NGN' ? '₦' : '$';

    // LiteLLM AI Gateway metrics
    const totalAiRequests = aiUsageLogs.length;
    const geminiRequests = aiUsageLogs.filter(log => log.provider === 'gemini' || !log.provider).length;
    const groqRequests = aiUsageLogs.filter(log => log.provider === 'groq').length;
    const fallbackActivations = aiUsageLogs.filter(log => log.fallbackActivated === true).length;
    const failedRequests = aiUsageLogs.filter(log => log.status === 'failed' || log.failed === true || log.status === 'error').length;
    const aiSuccessRate = totalAiRequests > 0 ? Math.round(((totalAiRequests - failedRequests) / totalAiRequests) * 100) : 100;
    
    const timedLogs = aiUsageLogs.filter(log => typeof log.responseTime === 'number' && log.responseTime > 0);
    const avgResponseSpeed = timedLogs.length > 0 ? (timedLogs.reduce((acc, log) => acc + log.responseTime, 0) / timedLogs.length / 1000).toFixed(2) + "s" : "0.94s";

    // Settings save actions
    const handleSaveGlobalSettings = async (updates: any) => {
        try {
            await updateDoc(doc(db, 'siteSettings', 'global'), updates);
            triggerToast('Settings Saved Successfully');
        } catch (e: any) {
            alert('Error updating configuration: ' + e.message);
        }
    };

    const handleResetAiQuota = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'aiUsage', userId), {
                geminiQuotaExceeded: false,
                geminiQuotaExceededAt: null,
                requestCountToday: 0,
                dailyRequests: 0,
                activeProvider: "gemini",
                cooldownUntil: null
            });
            triggerToast('AI Quota & Status Successfully Reset to Live Pro');
        } catch (e: any) {
            alert('Error resetting AI Quota of user: ' + e.message);
        }
    };

    // Manual custom celeb onboarding
    const handleCreateDemoCeleb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demoName) return alert('Stage name is mandatory');
        if (!demoPic) return alert('Please upload a profile image file first');
        try {
            const docId = 'demo-' + Date.now();
            const slug = demoName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const payloadProfile = {
                celebId: docId,
                celebName: demoName,
                slug,
                profilePic: demoPic,
                bio: demoBio || 'Professional verified celebrity agent.',
                country: demoCountry,
                bookingPrice: Number(demoPrice),
                fanCardPrice: Number(demoFanCard),
                isLocked: false, // pre-verified
                isVisible: true,
                referralLink: `${window.location.origin}/ref/dm/${slug}`,
                createdAt: new Date().toISOString()
            };
            // 1. Create Profile
            await setDoc(doc(db, 'celebrityProfiles', docId), payloadProfile);

            // 2. Add a user companion doc
            await setDoc(doc(db, 'users', docId), {
                uid: docId,
                email: `${demoName.toLowerCase().replace(/\s+/g, '')}@demo-idols.com`,
                displayName: demoName,
                role: 'celebrity',
                createdAt: new Date().toISOString()
            });

            triggerToast('Registered Creator Profile Successfully! Promote them to landing showcase if desired.');
            setDemoName('');
            setDemoPic('');
            setDemoBio('');
            setDemoIsFeatured(true);
            setDemoIsTrending(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Toggle states for curated showcase document
    const handleToggleCelebFlag = async (id: string, field: string, currentVal: boolean) => {
        try {
            await updateDoc(doc(db, 'landingPageShowcase', id), { [field]: !currentVal });
            triggerToast('Curated Display Status Synced Successfully');
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Delete showcase card only (without deleting celebrity profile)
    const handleDeleteShowcaseCard = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this celebrity from the public landing showcase? This does not delete their registered profile.')) return;
        try {
            await deleteDoc(doc(db, 'landingPageShowcase', id));
            triggerToast('Removed from landing page showcase successfully');
        } catch (err: any) {
            alert('Error removing: ' + err.message);
        }
    };

    // Save or publish custom tutorial video
    const handleSaveTutorial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tutTitle.trim() || !tutDesc.trim()) {
            triggerToast('Title and Description are required.');
            return;
        }
        if (!tutVideoFile && !tutVideoUrl) {
            triggerToast('Please choose a video file.');
            return;
        }

        setIsUploadingTut(true);
        try {
            let finalVideoUrl = tutVideoUrl;
            if (tutVideoFile) {
                const formData = new FormData();
                formData.append('file', tutVideoFile);
                formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'bookaceleb');
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dobi1sllq';
                
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('Cloudinary video upload failed');
                const data = await response.json();
                finalVideoUrl = data.secure_url;
            }

            if (editingTutId) {
                await updateDoc(doc(db, 'tutorials', editingTutId), {
                    title: tutTitle,
                    description: tutDesc,
                    videoUrl: finalVideoUrl,
                    updatedAt: new Date().toISOString()
                });
                triggerToast('Tutorial updated successfully!');
            } else {
                const newDocRef = doc(collection(db, 'tutorials'));
                await setDoc(newDocRef, {
                    title: tutTitle,
                    description: tutDesc,
                    videoUrl: finalVideoUrl,
                    createdAt: new Date().toISOString()
                });
                triggerToast('Tutorial published successfully!');
            }

            // Reset state
            setTutTitle('');
            setTutDesc('');
            setTutVideoFile(null);
            setTutVideoUrl('');
            setEditingTutId(null);
        } catch (err: any) {
            console.error("Save tutorial error:", err);
            handleFirestoreError(err, OperationType.WRITE, 'tutorials');
        } finally {
            setIsUploadingTut(false);
        }
    };

    const handleEditTutorial = (tut: any) => {
        setTutTitle(tut.title);
        setTutDesc(tut.description);
        setTutVideoUrl(tut.videoUrl);
        setTutVideoFile(null);
        setEditingTutId(tut.id);
    };

    const handleDeleteTutorial = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'tutorials', id));
            triggerToast('Tutorial deleted successfully.');
        } catch (err: any) {
            handleFirestoreError(err, OperationType.DELETE, `tutorials/${id}`);
        }
    };

    // Add existing registered celebrity to curated showcase list
    const handleAddProfileToShowcase = async (celeb: any) => {
        try {
            const docId = celeb.celebId || celeb.id;
            await setDoc(doc(db, 'landingPageShowcase', docId), {
                celebId: docId,
                celebName: celeb.celebName,
                slug: celeb.slug || celeb.celebName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                profilePic: celeb.profilePic || '',
                bio: celeb.bio || 'High-end consultation and private elite fan card options.',
                country: celeb.country || '',
                bookingPrice: Number(celeb.bookingPrice || 0),
                fanCardPrice: Number(celeb.fanCardPrice || 0),
                isFeatured: true,
                isTrending: false,
                isVisible: true,
                createdAt: new Date().toISOString()
            });
            triggerToast(`${celeb.celebName} has been added to the landing showcase directory!`);
        } catch (err: any) {
            alert('Error adding: ' + err.message);
        }
    };

    // Verification approve/reject
    const handleUpgradeStatus = async (id: string, approve: boolean) => {
        try {
            if (approve) {
                await updateDoc(doc(db, 'celebrityProfiles', id), { 
                    isLocked: false, 
                    upgradePending: false 
                });
                triggerToast('VIP Activation Approved');
            } else {
                await updateDoc(doc(db, 'celebrityProfiles', id), { 
                    upgradePending: false 
                });
                triggerToast('Payment Proof Terminated');
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    // AI Subscription Activation / Deactivation Helper
    const handleToggleAiSub = async (id: string, activate: boolean) => {
        try {
            const now = Date.now();
            const durationMs = 35 * 24 * 60 * 60 * 1000;
            const expiresAt = now + durationMs;

            const updates = {
                isAiSubscribed: activate,
                aiPremium: activate,
                aiUpgradePending: false,
                aiPremiumActivatedAt: activate ? now : null,
                aiPremiumExpiresAt: activate ? expiresAt : null
            };
            await updateDoc(doc(db, 'celebrityProfiles', id), updates);
            try {
                await updateDoc(doc(db, 'users', id), {
                    isAiSubscribed: activate,
                    aiPremium: activate,
                    aiPremiumActivatedAt: activate ? now : null,
                    aiPremiumExpiresAt: activate ? expiresAt : null
                });
            } catch (err) {
                console.warn("Could not sync AI tier in 'users' doc directly:", err);
            }
            try {
                const planType = activate ? "ai_subscribed" : "free";
                const dailyLimit = activate ? 50 : 5;
                await setDoc(doc(db, 'aiUsage', id), {
                    planType: planType,
                    dailyLimit: dailyLimit,
                    maxDailyRequests: dailyLimit,
                    aiPremium: activate,
                    aiPremiumActivatedAt: activate ? now : null,
                    aiPremiumExpiresAt: activate ? expiresAt : null,
                    remainingRequests: dailyLimit,
                    requestCountToday: 0,
                    dailyRequests: 0,
                    geminiQuotaExceeded: false,
                }, { merge: true });
            } catch (err) {
                console.warn("Could not sync Firestore aiUsage collection:", err);
            }
            triggerToast(activate ? 'AI Premium Subscription Activated!' : 'AI Premium Subscription Terminated.');
            
            // If selectedUser is this celebrity, update its details in real-time
            if (selectedUser && selectedUser.id === id) {
                setSelectedUser((prev: any) => ({
                    ...prev,
                    details: {
                        ...prev.details,
                        isAiSubscribed: activate,
                        aiPremium: activate,
                        aiPremiumActivatedAt: activate ? now : null,
                        aiPremiumExpiresAt: activate ? expiresAt : null
                    }
                }));
            }
        } catch (e: any) {
            alert("Error updating AI premium: " + e.message);
        }
    };

    // AI Subscription approve/reject
    const handleAiUpgradeStatus = async (id: string, approve: boolean) => {
        await handleToggleAiSub(id, approve);
    };

    // Delete user profile and all companions
    const handleDeleteUser = async (id: string, isCeleb: boolean) => {
        if (!window.confirm('Are you absolutely sure you want to terminate this entity? This is irreversible.')) return;
        try {
            if (isCeleb) {
                await deleteDoc(doc(db, 'celebrityProfiles', id));
                try {
                    await deleteDoc(doc(db, 'landingPageShowcase', id));
                } catch (e) {
                    // Ignore if not present in showcase
                }
            }
            await deleteDoc(doc(db, 'users', id));
            alert('Entity removed from central directories.');
            if (selectedUser?.id === id) setSelectedUser(null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Toggle Ban Status
    const handleToggleBanUser = async (p: any) => {
        if (p.role === 'user') {
            alert('Fans are safe from ban enforcement protocols.');
            return;
        }
        const actionText = p.isBanned ? 'unban' : 'ban';
        if (!window.confirm(`Are you absolutely sure you want to ${actionText} ${p.name}?`)) return;

        try {
            const nextBannedVal = !p.isBanned;
            // Write to users collection
            await updateDoc(doc(db, 'users', p.id), { isBanned: nextBannedVal });
            
            // If celebrity, also write to celebrityProfiles collection
            if (p.role === 'celebrity') {
                try {
                    await updateDoc(doc(db, 'celebrityProfiles', p.id), { isBanned: nextBannedVal });
                } catch(e) {
                    console.log('No separate celebrity profile doc to ban-sync.');
                }
            }

            triggerToast(`User account status modified: ${actionText.toUpperCase()}NED`);
        } catch(err: any) {
            alert('Enforcement failed: ' + err.message);
        }
    };

    // Complete Database Wipe / Purge Implementation
    const handleExecutePlatformReset = async () => {
        if (resetPhraseInput !== 'TERMINATE-SYSTEM') {
            alert('Incorrect verification phrase. Reset sequence aborted.');
            return;
        }

        try {
            triggerToast('Initiating Platform Pure Purge...');
            
            // 1. Wipe bookings
            const bookingsSnap = await getDocs(collection(db, 'bookings'));
            for (const docObj of bookingsSnap.docs) {
                await deleteDoc(doc(db, 'bookings', docObj.id));
            }

            // 2. Wipe memberships
            const membershipsSnap = await getDocs(collection(db, 'memberships'));
            for (const docObj of membershipsSnap.docs) {
                await deleteDoc(doc(db, 'memberships', docObj.id));
            }

            // 3. Wipe donations
            const donationsSnap = await getDocs(collection(db, 'donations'));
            for (const docObj of donationsSnap.docs) {
                await deleteDoc(doc(db, 'donations', docObj.id));
            }

            // 4. Wipe chats & messages
            const chatsSnap = await getDocs(collection(db, 'chats'));
            for (const docObj of chatsSnap.docs) {
                await deleteDoc(doc(db, 'chats', docObj.id));
            }

            // 5. Wipe celebrity profiles and landing showcase
            const celebsSnap = await getDocs(collection(db, 'celebrityProfiles'));
            for (const docObj of celebsSnap.docs) {
                await deleteDoc(doc(db, 'celebrityProfiles', docObj.id));
            }
            const showcaseSnap = await getDocs(collection(db, 'landingPageShowcase'));
            for (const docObj of showcaseSnap.docs) {
                await deleteDoc(doc(db, 'landingPageShowcase', docObj.id));
            }

            // 6. Wipe users (EXCEPT the super admin 'bookaceleb447@gmail.com')
            const usersSnap = await getDocs(collection(db, 'users'));
            for (const docObj of usersSnap.docs) {
                const data = docObj.data();
                if (data.email !== 'bookaceleb447@gmail.com') {
                    await deleteDoc(doc(db, 'users', docObj.id));
                }
            }

            // 7. Wipe AI usage counts and log telemetry (AI Assistant System Analytics)
            const aiUsageSnap = await getDocs(collection(db, 'aiUsage'));
            for (const docObj of aiUsageSnap.docs) {
                await deleteDoc(doc(db, 'aiUsage', docObj.id));
            }
            const aiUsageLogsSnap = await getDocs(collection(db, 'aiUsageLogs'));
            for (const docObj of aiUsageLogsSnap.docs) {
                await deleteDoc(doc(db, 'aiUsageLogs', docObj.id));
            }

            triggerToast('Database purged successfully. All fans, celebs, and AI Analytics terminated.');
            setIsResetModalOpen(false);
            setResetPhraseInput('');
        } catch (err: any) {
            alert('Failure executing purge routine: ' + err.message);
        }
    };

    // Master deduplicated people directory
    const filteredPeople = (() => {
        const uniquePeopleMap = new Map<string, any>();

        // 1. Process allUsers (users and super admins)
        allUsers.forEach((u) => {
            const userId = u.uid || u.id || '';
            if (!userId) return;

            let roleName = u.role || 'user';
            if (u.email === 'bookaceleb447@gmail.com') {
                roleName = 'superadmin';
            }

            uniquePeopleMap.set(userId, {
                id: userId,
                name: u.displayName || u.fullName || u.celebName || (roleName === 'superadmin' ? 'Super Admin User' : 'Anonymous Fan'),
                email: u.email || 'No email configured',
                role: roleName,
                isBanned: u.isBanned || false,
                createdAt: u.createdAt || null,
                details: u
            });
        });

        // 2. Overlay celebrities
        allCelebs.forEach((c) => {
            if (!c.id) return;
            const existing = uniquePeopleMap.get(c.id);
            uniquePeopleMap.set(c.id, {
                id: c.id,
                name: c.celebName || existing?.name || 'Celebrity Agent',
                email: c.email || existing?.email || `${(c.celebName || 'celeb').toLowerCase().replace(/\s+/g, '')}@celeb.com`,
                role: 'celebrity',
                isBanned: c.isBanned || existing?.isBanned || false,
                createdAt: c.createdAt || existing?.createdAt || null,
                details: { ...existing?.details, ...c }
            });
        });

        // Search filtering
        return Array.from(uniquePeopleMap.values()).filter(p => {
            const text = `${p.name} ${p.email} ${p.role}`.toLowerCase();
            return text.includes(userSearchTerm.toLowerCase());
        });
    })();

    // Master list of sections
    const navItems = [
        { id: 'dashboard', label: 'Overview', icon: <BarChart3 size={18} /> },
        { id: 'vip-activation', label: 'VIP Activation Settings', icon: <DollarSign size={18} /> },
        { id: 'currency', label: 'Currency Selector', icon: <Globe size={18} /> },
        { id: 'bank', label: 'Bank Configuration', icon: <Building2 size={18} /> },
        { id: 'support-links', label: 'Support Links Settings', icon: <PhoneCall size={18} /> },
        { id: 'featured-celebs', label: 'Featured Celebrities', icon: <Award size={18} /> },
        { id: 'trending-celebs', label: 'Trending Celebrities', icon: <TrendingUp size={18} /> },
        { id: 'approvals', label: 'Public Approvals', icon: <Sparkles size={18} /> },
        { id: 'users', label: 'User Directory', icon: <Users size={18} /> },
        { id: 'analytics', label: 'Analytics Systems', icon: <Briefcase size={18} /> },
        { id: 'landing-mgmt', label: 'Landing Page Management', icon: <LayoutGrid size={18} /> },
        { id: 'tutorials', label: 'Celebrity Tutorials', icon: <Video size={18} /> },
        { id: 'branding', label: 'Branding & Setup', icon: <Settings size={18} /> },
        { id: 'auth-controls', label: 'Authentication Controls', icon: <ShieldAlert size={18} /> },
    ];

    const currentActiveItem = navItems.find(item => item.id === activeTab);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-primary selection:text-black">
            
            {/* Header Mobile - Hamburger Toggle */}
            <header className="md:hidden glass-dark border-b border-white/5 px-6 py-5 flex justify-between items-center sticky top-0 z-40 bg-slate-950/95">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-primary" />
                    <span className="text-sm font-display font-black uppercase tracking-wider">COMMAND CENTER</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                  className="p-2 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10"
                >
                  {isMobileMenuOpen ? <X size={20} className="text-primary" /> : <Menu size={20} />}
                </button>
            </header>

            {/* Sticky Sidebar Nav for Desktop / Drawer for Mobile */}
            <aside className={`
                ${isMobileMenuOpen ? 'fixed inset-x-0 top-[65px] bottom-0 z-30 flex flex-col justify-start gap-8 overflow-y-auto max-h-[calc(100vh-65px)] pb-12' : 'hidden md:flex md:flex-col md:justify-between'}
                w-full md:w-80 border-r border-white/5 shrink-0 bg-slate-950/95 md:bg-black/35 backdrop-blur-3xl p-6
            `}>
                <div className="space-y-10 shrink-0">
                    {/* Header Brand */}
                    <div className="hidden md:flex items-center gap-4 px-2">
                        <div className="w-10 h-10 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-md font-display font-black uppercase italic tracking-wider leading-none">Command Center</h1>
                            <p className="text-[9px] text-white/40 tracking-[0.25em] font-black uppercase mt-1">Super Authority</p>
                        </div>
                    </div>

                    {/* Navigation Directives */}
                    <nav className="space-y-1.5">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                                    activeTab === item.id 
                                        ? 'bg-primary text-black shadow-xl shadow-primary/10 font-black' 
                                        : 'text-white/45 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <span className={activeTab === item.id ? 'text-black' : 'text-primary'}>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-12 border-t border-white/5 pt-6 px-2 text-center shrink-0">
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em]">Corporate Portal v2.5</p>
                    <button onClick={() => window.location.href = '/'} className="text-[9px] uppercase font-black text-primary border-b border-primary/20 pb-0.5 hover:border-primary mt-3 block mx-auto">Exit Control Session</button>
                </div>
            </aside>

            {/* Core Workspace */}
            <main className="flex-1 p-6 md:p-14 overflow-y-auto z-10 relative">
                
                {/* Active Section Header */}
                <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] font-mono">
                            <Sparkles size={12} /> SECURE AUTHORIZED DIR
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold text-white uppercase italic tracking-tighter">
                            {currentActiveItem?.label}
                        </h2>
                    </div>
                    {/* Logged admin details card */}
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-5 py-3 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-black text-xs">SA</div>
                        <div className="text-left font-sans">
                            <p className="text-xs font-bold text-white">bookaceleb447@gmail.com</p>
                            <p className="text-[9px] font-mono text-primary uppercase font-black tracking-widest mt-0.5">Verified Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* Routing Render Content Panels */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10"
                    >
                        
                        {/* 1. Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <AdminStatCard label="Total Celebrities Onboard" value={totalCelebrities} sub={`${activeVipCount} Verified • ${totalCelebrities - activeVipCount} Locked`} />
                                    <AdminStatCard label="Total Happy Fans" value={totalFans} sub="Registered users with fan status" />
                                    <AdminStatCard label="Total Platform People" value={totalPeople} sub="Celebrities + Users aggregate" />
                                    <AdminStatCard label="VIP Access Revenue Gained" value={`${currencySym}${calculatedVipRevenue}`} sub={`From ${activeVipCount} fully approved VIP members`} highlight />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <h3 className="text-lg font-bold uppercase tracking-widest text-white/45 italic">Aggregated Directory Registry</h3>
                                        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                                            <div className="overflow-x-auto w-full max-w-full custom-scrollbar">
                                                <table className="w-full text-left font-sans text-sm min-w-[650px]">
                                                    <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-widest text-white/40">
                                                        <tr>
                                                            <th className="p-5">Name / Identifier</th>
                                                            <th className="p-5">Assigned Role</th>
                                                            <th className="p-5">Account Level</th>
                                                            <th className="p-5 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 text-xs font-medium">
                                                        {filteredPeople.slice(0, 5).map(p => (
                                                            <tr key={p.id} className="group hover:bg-white/[0.01] transition-all">
                                                                <td className="p-5 flex items-center gap-3">
                                                                    <div className="w-9 h-9 bg-white/5 rounded-xl overflow-hidden shrink-0">
                                                                        {p.details.profilePic ? <img src={p.details.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-bold uppercase">{p.name[0]}</div>}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-extrabold text-white tracking-tight text-sm">{p.name}</p>
                                                                        <p className="text-[10px] text-white/35 font-mono">{p.email}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-300">
                                                                        {p.role}
                                                                    </span>
                                                                </td>
                                                                <td className="p-5">
                                                                    {p.role === 'celebrity' ? (
                                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                            !p.details.isLocked ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-400'
                                                                        }`}>
                                                                            {!p.details.isLocked ? 'VIP Active' : 'Locked'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-white/20">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-5 text-right">
                                                                    <button 
                                                                      onClick={() => setSelectedUser(p)}
                                                                      className="p-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition-all mr-2"
                                                                    >
                                                                        <Eye size={14} className="text-primary" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-4 bg-white/[0.01] border-t border-white/5 text-center">
                                                <button onClick={() => setActiveTab('users')} className="text-xs uppercase font-black text-primary tracking-widest hover:underline">View Entire Database Directory</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-lg font-bold uppercase tracking-widest text-white/45 italic">Direct Action Queue</h3>
                                        <div className="space-y-4">
                                            {pendingUpgrades.length > 0 ? pendingUpgrades.slice(0, 3).map(p => (
                                                <div key={p.id} className="bg-primary/5 border border-primary/20 p-5 rounded-[2rem] space-y-4 shadow-sm relative overflow-hidden">
                                                    <div>
                                                        <h4 className="font-black text-white text-md tracking-tight">{p.celebName}</h4>
                                                        <p className="text-[9px] font-extrabold text-primary italic uppercase tracking-wider mt-0.5">Pending VIP Deposit Review</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a href={p.paymentProof} target="_blank" className="px-4 py-2.5 border border-white/10 bg-black/40 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-black/60 transition-all flex items-center gap-1.5"><ExternalLink size={12} /> View Slip</a>
                                                        <button onClick={() => handleUpgradeStatus(p.id, true)} className="flex-1 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest">Verify</button>
                                                        <button onClick={() => handleUpgradeStatus(p.id, false)} className="px-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><X size={14} /></button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] text-center">
                                                    <Check className="mx-auto mb-3 text-white/20" size={24} />
                                                    <p className="text-[10px] uppercase font-black text-white/30 tracking-widest">All pending upgrades clear</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. VIP Activation Settings Tab */}
                        {activeTab === 'vip-activation' && (
                            <div className="space-y-8 font-sans">
                                <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-6">VIP Activation Fee Configuration</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Escrow Activation Fee</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-lg text-primary">{currencySym}</span>
                                                <input 
                                                  type="number"
                                                  value={siteSettings?.activationFee || ''}
                                                  onChange={e => setSiteSettings({...siteSettings, activationFee: Number(e.target.value)})}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pl-10 text-2xl font-bold focus:border-primary/50 outline-none text-white" 
                                                />
                                            </div>
                                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-2.5">Paid by celebrities to unlock full interactive panel features.</p>
                                        </div>
                                        <button 
                                          onClick={() => handleSaveGlobalSettings({ activationFee: siteSettings.activationFee })}
                                          className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Save size={16} /> Save Activation Fee
                                        </button>
                                    </div>
                                </div>

                                <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-2">AI Premium Subscription Configuration</h3>
                                    <p className="text-[10px] text-white/45 uppercase font-black tracking-wider mb-6">Manage global parameters for the smart AI replies billing system</p>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">AI Subscription Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-lg text-primary">
                                                    {siteSettings?.aiSubCurrency === 'NGN' ? '₦' : '$'}
                                                </span>
                                                <input 
                                                  type="number"
                                                  value={siteSettings?.aiSubAmount || ''}
                                                  placeholder="e.g. 199"
                                                  onChange={e => setSiteSettings({...siteSettings, aiSubAmount: Number(e.target.value)})}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pl-10 text-2xl font-bold focus:border-primary/50 outline-none text-white" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">AI Subscription Currency</label>
                                            <select 
                                              value={siteSettings?.aiSubCurrency || 'USD'}
                                              onChange={e => setSiteSettings({...siteSettings, aiSubCurrency: e.target.value})}
                                              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none font-medium"
                                            >
                                                <option value="USD">USD ($ - United States Dollar)</option>
                                                <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">AI Payment Account Details</label>
                                            <textarea 
                                              value={siteSettings?.aiPaymentDetails || ''}
                                              onChange={e => setSiteSettings({...siteSettings, aiPaymentDetails: e.target.value})}
                                              placeholder="Type descriptive instructions, bank routing, account number or crypto wallet address for the AI subscription payout..."
                                              rows={5}
                                              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-semibold text-white outline-none focus:border-primary/50"
                                            />
                                        </div>

                                        <button 
                                          onClick={() => handleSaveGlobalSettings({ 
                                            aiSubAmount: siteSettings.aiSubAmount || 0,
                                            aiSubCurrency: siteSettings.aiSubCurrency || 'USD',
                                            aiPaymentDetails: siteSettings.aiPaymentDetails || ''
                                          })}
                                          className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Save size={16} /> Save AI Subscription Options
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Currency Selector Tab */}
                        {activeTab === 'currency' && (
                            <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-6">Currency Base Directive</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Active Treasury Currency</label>
                                        <select 
                                          value={siteSettings?.currency || 'USD'}
                                          onChange={e => setSiteSettings({...siteSettings, currency: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-md font-bold text-white focus:border-primary/50 outline-none"
                                        >
                                            <option value="USD">$ Dollar Symbol ($)</option>
                                            <option value="NGN">₦ Naira Symbol (₦)</option>
                                        </select>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-2.5">Adapts payment templates globally across upgraded pages.</p>
                                    </div>
                                    <button 
                                      onClick={() => handleSaveGlobalSettings({ currency: siteSettings.currency })}
                                      className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Commit Currency Symbol
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 4. Bank Configuration Tab */}
                        {activeTab === 'bank' && (
                            <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem] font-sans">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-6">Escrow Bank Credentials</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Bank Details Format</label>
                                        <select 
                                          value={siteSettings?.adminBankFormat || 'international'}
                                          onChange={e => setSiteSettings({...siteSettings, adminBankFormat: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none font-medium"
                                        >
                                            <option value="nigerian">Nigerian Bank Account Layout (Bank, Code, Name)</option>
                                            <option value="international">USA / International SWIFT layout (Bank, Account, Routing, SWIFT)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Escrow Bank Name</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.adminBankName || ''}
                                          onChange={e => setSiteSettings({...siteSettings, adminBankName: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold text-white focus:border-primary/50 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Beneficiary / Account Name</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.adminAccountName || ''}
                                          onChange={e => setSiteSettings({...siteSettings, adminAccountName: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-bold uppercase tracking-wider text-white focus:border-primary/50 outline-none" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Account Number / IBAN</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.adminAccountNo || ''}
                                          onChange={e => setSiteSettings({...siteSettings, adminAccountNo: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-white focus:border-primary/50 outline-none" 
                                        />
                                    </div>

                                    {siteSettings?.adminBankFormat === 'international' && (
                                        <>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Routing Number (9 Digits)</label>
                                                <input 
                                                  type="text"
                                                  value={siteSettings?.adminRoutingNo || ''}
                                                  onChange={e => setSiteSettings({...siteSettings, adminRoutingNo: e.target.value})}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-white focus:border-primary/50 outline-none" 
                                                  placeholder="9 digit USA routing ID"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">SWIFT / BIC Code</label>
                                                <input 
                                                  type="text"
                                                  value={siteSettings?.adminSwiftCode || ''}
                                                  onChange={e => setSiteSettings({...siteSettings, adminSwiftCode: e.target.value})}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-white focus:border-primary/50 outline-none" 
                                                  placeholder="SWIFT identifier"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Bank Address (Optional)</label>
                                                <input 
                                                  type="text"
                                                  value={siteSettings?.adminBankAddress || ''}
                                                  onChange={e => setSiteSettings({...siteSettings, adminBankAddress: e.target.value})}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none" 
                                                  placeholder="Headquarters address"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button 
                                      onClick={() => handleSaveGlobalSettings({
                                        adminBankFormat: siteSettings.adminBankFormat || 'international',
                                        adminBankName: siteSettings.adminBankName || '',
                                        adminAccountNo: siteSettings.adminAccountNo || '',
                                        adminAccountName: siteSettings.adminAccountName || '',
                                        adminRoutingNo: siteSettings?.adminRoutingNo || '',
                                        adminSwiftCode: siteSettings?.adminSwiftCode || '',
                                        adminBankAddress: siteSettings?.adminBankAddress || ''
                                      })}
                                      className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Bank Credentials
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 5. Support Links Tab */}
                        {activeTab === 'support-links' && (
                            <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-6">Concierge Support Hub</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">WhatsApp Support link</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.whatsappLink || ''}
                                          onChange={e => setSiteSettings({...siteSettings, whatsappLink: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none font-medium" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Telegram Support Channel Link</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.telegramLink || ''}
                                          onChange={e => setSiteSettings({...siteSettings, telegramLink: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none font-medium" 
                                        />
                                    </div>
                                    <button 
                                      onClick={() => handleSaveGlobalSettings({
                                        whatsappLink: siteSettings.whatsappLink,
                                        telegramLink: siteSettings.telegramLink
                                      })}
                                      className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Help Channels
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 6. Featured Celebrities Tab */}
                        {activeTab === 'featured-celebs' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold uppercase tracking-widest text-white/45 italic">Manual Featured Curators</h3>
                                <div className="bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {showcaseCards.length > 0 ? (
                                            showcaseCards.map(c => (
                                                <div key={c.id} className="p-5 bg-black/30 border border-white/5 rounded-2xl flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <img src={c.profilePic} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                                        <div>
                                                            <h4 className="font-extrabold text-white text-sm">{c.celebName}</h4>
                                                            <span className="text-[9px] uppercase font-black tracking-wider text-white/30">{c.country}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                      onClick={() => handleToggleCelebFlag(c.id, 'isFeatured', c.isFeatured || false)}
                                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                          c.isFeatured 
                                                              ? 'bg-primary text-black font-black' 
                                                              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                                      }`}
                                                    >
                                                        {c.isFeatured ? '★ Featured' : '☆ Not Featured'}
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 py-10 text-center text-white/40 uppercase font-black text-xs tracking-widest border border-dashed border-white/5 rounded-2xl">
                                                No showcase items created yet. Add them in Landing Page Management.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 7. Trending Celebrities Tab */}
                        {activeTab === 'trending-celebs' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold uppercase tracking-widest text-white/45 italic">Manual Popularity Vectored Icons</h3>
                                <div className="bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {showcaseCards.length > 0 ? (
                                            showcaseCards.map(c => (
                                                <div key={c.id} className="p-5 bg-black/30 border border-white/5 rounded-2xl flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <img src={c.profilePic} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                                        <div>
                                                            <h4 className="font-extrabold text-white text-sm">{c.celebName}</h4>
                                                            <span className="text-[9px] uppercase font-black tracking-wider text-white/30">{c.country}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                      onClick={() => handleToggleCelebFlag(c.id, 'isTrending', c.isTrending || false)}
                                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                          c.isTrending 
                                                              ? 'bg-orange-500 text-white font-black' 
                                                              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                                      }`}
                                                    >
                                                        {c.isTrending ? '🔥 Trending' : '❄ Not Trending'}
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 py-10 text-center text-white/40 uppercase font-black text-xs tracking-widest border border-dashed border-white/5 rounded-2xl">
                                                No showcase items created yet. Add them in Landing Page Management.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 8. Approvals Tab */}
                        {activeTab === 'approvals' && (
                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold uppercase tracking-widest text-[#a855f7] italic">Escrow VIP Approvals Desk</h3>
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-4 sm:p-6 md:p-10 text-sans">
                                        {pendingUpgrades.length > 0 ? (
                                            <div className="space-y-6">
                                                {pendingUpgrades.map(p => (
                                                    <div key={p.id} className="p-6 bg-black/40 border border-white/5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-w-0 w-full">
                                                        <div className="flex items-center gap-6 min-w-0 flex-1 w-full md:w-auto">
                                                            <div className="relative shrink-0 flex items-center gap-3">
                                                                <img src={p.profilePic || "/default-avatar.png"} className="w-12 h-12 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" />
                                                                {p.paymentProof && (
                                                                    <div className="relative shrink-0">
                                                                        <img 
                                                                            src={p.paymentProof} 
                                                                            onClick={() => setPreviewReceiptUrl(p.paymentProof)}
                                                                            className="w-12 h-12 rounded-xl object-cover border border-white/15 hover:border-primary/50 cursor-zoom-in transition-all" 
                                                                            title="Click to zoom receipt"
                                                                            referrerPolicy="no-referrer" 
                                                                        />
                                                                        <span className="absolute -bottom-1 -right-1 px-1 bg-primary text-black font-black text-[7px] uppercase tracking-wide rounded border border-black scale-90 select-none">REC</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-extrabold text-white text-md sm:text-lg leading-tight truncate break-all" title={p.celebName}>{p.celebName}</h4>
                                                                <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Upgrade Snapshot Received</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                                            <a 
                                                              href="#" 
                                                              onClick={(e) => { e.preventDefault(); setPreviewReceiptUrl(p.paymentProof); }}
                                                              target="_blank" 
                                                              rel="noreferrer"
                                                              className="px-5 py-3 border border-white/10 bg-slate-950/40 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-1.5"
                                                            >
                                                                <ExternalLink size={14} /> Review Receipt Snapshot
                                                            </a>
                                                            <button 
                                                              onClick={() => handleUpgradeStatus(p.id, true)} 
                                                              className="flex-1 md:flex-none px-6 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest"
                                                            >
                                                                Verify
                                                            </button>
                                                            <button 
                                                              onClick={() => handleUpgradeStatus(p.id, false)} 
                                                              className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                                                 <Check className="mx-auto mb-4 text-white/10" size={32} />
                                                 <p className="text-white/30 font-bold uppercase tracking-widest text-xs">All standard activation deposit certificates processed and verified.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold uppercase tracking-widest text-indigo-400 italic">Premium AI Assistant Subscriptions</h3>
                                    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-4 sm:p-6 md:p-10 text-sans">
                                        {pendingAiUpgrades.length > 0 ? (
                                            <div className="space-y-6">
                                                {pendingAiUpgrades.map(p => (
                                                    <div key={p.id} className="p-6 bg-black/40 border border-white/5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-w-0 w-full">
                                                        <div className="flex items-center gap-6 min-w-0 flex-1 w-full md:w-auto">
                                                            <div className="relative shrink-0 flex items-center gap-3">
                                                                <img src={p.profilePic || "/default-avatar.png"} className="w-12 h-12 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" />
                                                                {(p.aiPaymentProof || p.aiUpgradeProof) && (
                                                                    <div className="relative shrink-0">
                                                                        <img 
                                                                            src={p.aiPaymentProof || p.aiUpgradeProof} 
                                                                            onClick={() => setPreviewReceiptUrl(p.aiPaymentProof || p.aiUpgradeProof)}
                                                                            className="w-12 h-12 rounded-xl object-cover border border-white/15 hover:border-indigo-400/50 cursor-zoom-in transition-all" 
                                                                            title="Click to zoom receipt"
                                                                            referrerPolicy="no-referrer" 
                                                                        />
                                                                        <span className="absolute -bottom-1 -right-1 px-1 bg-indigo-500 text-white font-black text-[7px] uppercase tracking-wide rounded border border-black scale-90 select-none">AI</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-extrabold text-white text-md sm:text-lg leading-tight truncate break-all" title={p.celebName}>{p.celebName}</h4>
                                                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">AI Subscription Proof Received</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                                            <a 
                                                              href="#" 
                                                              onClick={(e) => { e.preventDefault(); setPreviewReceiptUrl(p.aiPaymentProof || p.aiUpgradeProof); }}
                                                              target="_blank" 
                                                              rel="noreferrer"
                                                              className="px-5 py-3 border border-white/10 bg-slate-950/40 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-1.5"
                                                            >
                                                                <ExternalLink size={14} /> Review Receipt Snapshot
                                                            </a>
                                                            <button 
                                                              onClick={() => handleAiUpgradeStatus(p.id, true)} 
                                                              className="flex-1 md:flex-none px-6 py-3 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                                                            >
                                                                Approve AI
                                                            </button>
                                                            <button 
                                                              onClick={() => handleAiUpgradeStatus(p.id, false)} 
                                                              className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                                                 <Check className="mx-auto mb-4 text-white/10" size={32} />
                                                 <p className="text-white/30 font-bold uppercase tracking-widest text-xs">All AI subscription deposit certificates processed and verified.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 9. User Management Tab */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <h3 className="text-lg font-bold uppercase tracking-widest text-white/45 italic">All Directory Entities</h3>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input 
                                          type="text"
                                          placeholder="Search records by term..."
                                          value={userSearchTerm}
                                          onChange={e => setUserSearchTerm(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-xs font-semibold text-white focus:border-primary/50 outline-none" 
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden w-full">
                                    <div className="overflow-x-auto w-full max-w-full custom-scrollbar">
                                        <table className="w-full text-left font-sans text-sm min-w-[850px]">
                                        <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-widest text-white/40">
                                            <tr>
                                                <th className="p-6">ID Entity / Registered Date</th>
                                                <th className="p-6">Role Tag</th>
                                                <th className="p-6">VIP Status</th>
                                                <th className="p-6">Enforcement Status</th>
                                                <th className="p-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-xs font-medium">
                                            {filteredPeople.map(p => (
                                                <tr key={p.id} className="group hover:bg-white/[0.01] transition-all">
                                                    <td className="p-6 flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white/5 rounded-xl overflow-hidden shrink-0">
                                                            {p.details.profilePic ? (
                                                                <img src={p.details.profilePic} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-primary font-bold uppercase text-xs">
                                                                    {(p.name || 'F')[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-white tracking-tight text-sm">{p.name}</p>
                                                            <p className="text-[10px] text-white/35 font-mono">{p.email}</p>
                                                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Registered: {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US') : 'Legacy Account'}</p>
                                                        </div>
                                                     </td>
                                                     <td className="p-6">
                                                        {p.role === 'superadmin' && (
                                                            <span className="px-3 py-1 bg-purple-500/15 text-purple-450 border border-purple-500/30 font-black uppercase text-[9px] tracking-wider rounded-full">
                                                                SUPER ADMIN
                                                            </span>
                                                        )}
                                                        {p.role === 'celebrity' && (
                                                            <div className="space-y-1">
                                                                <span className="px-3 py-1 bg-emerald-500/15 text-primary border border-emerald-500/30 font-black uppercase text-[9px] tracking-wider rounded-full block w-max">
                                                                    CELEBRITY ACCOUNT
                                                                </span>
                                                                <span className="text-[9px] text-emerald-450/70 font-bold block">
                                                                    {p.details.celebName ? '★ Profile Configured' : '☆ Empty Profile'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {p.role === 'user' && (
                                                            <span className="px-3 py-1 bg-blue-500/15 text-blue-450 border border-blue-500/30 font-black uppercase text-[9px] tracking-wider rounded-full">
                                                                FAN ACCOUNT
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-6">
                                                        {p.role === 'celebrity' ? (
                                                            <div className="space-y-1">
                                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider block w-max ${
                                                                    !p.details.isLocked ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'
                                                                }`}>
                                                                    {!p.details.isLocked ? 'VIP ACTIVATED' : 'NOT ACTIVATED'}
                                                                </span>
                                                                <span className="text-[9px] text-white/40 block font-mono">
                                                                    Fee: {currencySym}{siteSettings?.activationFee || 499}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-white/20 font-bold uppercase block">
                                                                N/A
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="space-y-1">
                                                            {p.isBanned ? (
                                                                <span className="px-2.5 py-1 bg-red-650 text-white border border-red-550 rounded-full text-[9px] font-black uppercase tracking-wider block w-max">
                                                                    BANNED
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider block w-max">
                                                                    ACTIVE
                                                                </span>
                                                            )}
                                                            {p.role === 'celebrity' && (
                                                                <span className={`text-[9px] block font-extrabold uppercase ${p.details.isHidden ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                                    {p.details.isHidden ? '👁 Hidden Profile' : '👁 Visible Profile'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <button 
                                                              onClick={() => setSelectedUser(p)}
                                                              className="p-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                                              title="Inspect Entity"
                                                            >
                                                                <Eye size={14} className="text-primary" />
                                                            </button>
                                                            {p.role === 'celebrity' && (
                                                                <button 
                                                                  onClick={() => handleToggleBanUser(p)}
                                                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                                    p.isBanned 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25' 
                                                                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/25'
                                                                  }`}
                                                                  title={p.isBanned ? "Unban Creator" : "Ban Creator"}
                                                                >
                                                                    {p.isBanned ? 'Unban' : 'Ban'}
                                                                </button>
                                                            )}
                                                            <button 
                                                              onClick={() => handleDeleteUser(p.id, p.role === 'celebrity')}
                                                              className="p-2 border border-white/5 bg-white/5 hover:bg-red-500/25 hover:border-red-500/50 rounded-xl transition-all"
                                                              title="Delete User"
                                                            >
                                                                <Trash2 size={14} className="text-red-400" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 10. Analytics Systems Tab */}
                        {activeTab === 'analytics' && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4">Celebrity Conversion Index</p>
                                        <div className="flex items-end gap-2 h-32 pt-6">
                                            <div className="flex-1 bg-white/5 h-[30%] rounded-lg" />
                                            <div className="flex-1 bg-white/5 h-[50%] rounded-lg" />
                                            <div className="flex-1 bg-white/5 h-[45%] rounded-lg" />
                                            <div className="flex-1 bg-primary/20 h-[85%] rounded-lg relative">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-primary">85%</div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider text-center mt-4">Average conversion on premium VIP activates</p>
                                    </div>

                                    <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4">Fan Engagement Scale</p>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-[10px] uppercase font-black mb-1">
                                                    <span className="text-white/50">Consultations</span>
                                                    <span className="text-primary">76%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="bg-primary h-full w-[76%]" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] uppercase font-black mb-1">
                                                    <span className="text-white/50">Fan Cards</span>
                                                    <span className="text-primary">54%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="bg-primary h-full w-[54%]" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] uppercase font-black mb-1">
                                                    <span className="text-white/50">Donations</span>
                                                    <span className="text-primary">32%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="bg-primary h-full w-[32%]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-white/30 tracking-widest">Global Escrow Reserves</p>
                                            <p className="text-4xl font-display font-black text-white italic tracking-tighter mt-4">{currencySym}{calculatedVipRevenue}</p>
                                            <p className="text-[9px] uppercase font-mono text-primary font-black tracking-widest mt-2">Treasury balance optimized</p>
                                        </div>
                                        <div className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Protocol Sync State: SECURE 100%</div>
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-10">
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-indigo-400 italic mb-6">AI Assistant System Analytics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-indigo-500/5 border border-indigo-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-2 font-mono">Total AI Requests</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">{aiUsageLogs.length}</p>
                                            <p className="text-[9px] uppercase font-mono text-[#818cf8] font-black tracking-widest mt-2">Overall lifetime quota calls</p>
                                        </div>

                                        <div className="bg-purple-500/5 border border-purple-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-2 font-mono">Premium User Requests</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">{aiUsageLogs.filter(log => log.isSubscribed || log.isPremiumAI).length}</p>
                                            <p className="text-[9px] uppercase font-mono text-purple-400 font-black tracking-widest mt-2">VIP premium tier generation count</p>
                                        </div>

                                        <div className="bg-slate-500/5 border border-slate-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 font-mono">Non-Premium User Requests</p>
                                            <p className="text-5xl font-display font-black text-slate-300 italic tracking-tighter">{aiUsageLogs.filter(log => !log.isSubscribed && !log.isPremiumAI).length}</p>
                                            <p className="text-[9px] uppercase font-mono text-slate-500 font-black tracking-widest mt-2 font-mono">Free trial tier request count</p>
                                        </div>

                                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mb-2 font-mono">Today's Requests</p>
                                            <p className="text-5xl font-display font-black text-emerald-300 italic tracking-tighter">
                                                {aiUsageLogs.filter(log => log.date === new Date().toISOString().split('T')[0]).length}
                                            </p>
                                            <p className="text-[9px] uppercase font-mono text-emerald-500 font-black tracking-widest mt-2">Current 24h utilization speed</p>
                                        </div>

                                        <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-2 font-mono">Total Premium Subscribers</p>
                                            <p className="text-5xl font-display font-black text-amber-300 italic tracking-tighter">
                                                {allCelebs.filter(c => c.isAiSubscribed === true || c.aiPremium === true).length}
                                            </p>
                                            <p className="text-[9px] uppercase font-mono text-amber-500 font-black tracking-widest mt-2">Active quota upgraded stars</p>
                                        </div>

                                        <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-rose-400 tracking-widest mb-2 font-mono">Total Non-Premium Users</p>
                                            <p className="text-5xl font-display font-black text-rose-300 italic tracking-tighter">
                                                {allCelebs.filter(c => !c.isAiSubscribed && !c.aiPremium).length}
                                            </p>
                                            <p className="text-[9px] uppercase font-mono text-rose-500 font-black tracking-widest mt-2">Standard active limit profiles</p>
                                        </div>
                                    </div>

                                    {/* LiteLLM Live Analytics Section */}
                                    <h4 className="text-xs uppercase font-black tracking-widest text-amber-400 font-mono mt-10 mb-6 italic">★ LiteLLM Multi-Provider AI Gateway Telemetry</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mb-2 font-mono">Live Pro Requests</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">{geminiRequests}</p>
                                            <p className="text-[9px] uppercase font-mono text-emerald-500 font-black tracking-widest mt-2">Primary AI provider volume</p>
                                        </div>

                                        <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-2 font-mono">Live Requests</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">{groqRequests}</p>
                                            <p className="text-[9px] uppercase font-mono text-amber-500 font-black tracking-widest mt-2">Fallback AI provider volume</p>
                                        </div>

                                        <div className="bg-purple-500/5 border border-purple-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-purple-400 tracking-widest mb-2 font-mono">Fallback Activations</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">{fallbackActivations}</p>
                                            <p className="text-[9px] uppercase font-mono text-purple-500/50 font-black tracking-widest mt-2">Failover automated trigger count</p>
                                        </div>

                                        <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-rose-400 tracking-widest mb-2 font-mono">Failed Requests</p>
                                            <p className="text-5xl font-display font-black text-rose-300 italic tracking-tighter">{failedRequests}</p>
                                            <p className="text-[9px] uppercase font-mono text-rose-500/50 font-black tracking-widest mt-2">Total failed requests logged</p>
                                        </div>

                                        <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest mb-2 font-mono font-bold">Remaining Global Quota</p>
                                            <p className="text-5xl font-display font-black text-white italic tracking-tighter">
                                                {Math.max(0, 100000 - aiUsageLogs.length).toLocaleString()}
                                            </p>
                                            <p className="text-[9px] uppercase font-mono text-blue-400 font-black tracking-widest mt-2">Enterprise limit headroom (100k cap)</p>
                                        </div>

                                        <div className="bg-sky-500/5 border border-sky-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-sky-450 tracking-widest mb-2 font-mono">AI Success Rate</p>
                                            <p className="text-5xl font-display font-black text-sky-300 italic tracking-tighter">{aiSuccessRate}%</p>
                                            <p className="text-[9px] uppercase font-mono text-sky-500 font-black tracking-widest mt-2">Gateway availability performance</p>
                                        </div>

                                        <div className="bg-cyan-500/5 border border-cyan-500/20 p-8 rounded-[2rem]">
                                            <p className="text-[10px] uppercase font-black text-cyan-400 tracking-widest mb-2 font-mono">Average Response Speed</p>
                                            <p className="text-5xl font-display font-black text-cyan-300 italic tracking-tighter">{avgResponseSpeed}</p>
                                            <p className="text-[9px] uppercase font-mono text-cyan-500 font-black tracking-widest mt-2">End-to-end model generation latency</p>
                                        </div>
                                    </div>

                                    {/* Daily AI Usage & Per Celebrity Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                                        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 lg:col-span-1">
                                            <h4 className="text-xs uppercase font-black tracking-widest text-white/50 mb-4">Daily AI Usage Tracker</h4>
                                            {(() => {
                                                const dailyAcc = aiUsageLogs.reduce((acc: any, log: any) => {
                                                    const d = log.date || "Unknown";
                                                    acc[d] = (acc[d] || 0) + 1;
                                                    return acc;
                                                }, {});
                                                const maxCount = Math.max(...(Object.values(dailyAcc) as number[]), 1);
                                                const entries = Object.entries(dailyAcc).sort((a, b) => b[0].localeCompare(a[0]));
                                                if (entries.length > 0) {
                                                    return (
                                                        <div className="space-y-3 font-mono">
                                                            {entries.slice(0, 7).map(([date, count]: any) => (
                                                                <div key={date} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                                                    <span className="text-xs font-bold text-white/60">{date}</span>
                                                                    <div className="flex-1 mx-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                        <div className="bg-indigo-500 h-full animate-pulse" style={{ width: `${(count / maxCount) * 100}%` }} />
                                                                    </div>
                                                                    <span className="text-xs font-black text-indigo-400">{count} calls</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <div className="py-12 text-center text-xs text-white/20 font-bold uppercase tracking-widest">No dates logged yet</div>;
                                            })()}
                                        </div>

                                        <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 lg:col-span-2">
                                            <h4 className="text-xs uppercase font-black tracking-widest text-indigo-400 mb-4">Live Quotas & AI Usage (Single Source of Truth)</h4>
                                            {allAiUsage.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse text-xs font-mono">
                                                        <thead>
                                                            <tr className="border-b border-white/10 text-white/40 uppercase tracking-widest text-[9px]">
                                                                <th className="py-3 px-4">Celebrity</th>
                                                                <th className="py-3 px-4">Plan</th>
                                                                <th className="py-3 px-4">Last Provider</th>
                                                                <th className="py-3 px-4 text-center">Today's Use</th>
                                                                <th className="py-3 px-4 text-right">Lifetime Requests</th>
                                                                <th className="py-3 px-4 text-center">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {allAiUsage.map((item: any) => {
                                                                const celeb = allCelebs.find(c => c.id === item.userId);
                                                                const currentTodayRequests = item.requestCountToday !== undefined ? item.requestCountToday : (item.dailyRequests ?? 0);
                                                                const isPremiumUser = celeb?.isAiSubscribed === true || celeb?.aiPremium === true || item.planType === 'ai_subscribed' || item.aiPremium === true;
                                                                const limit = item.maxDailyRequests ?? item.dailyLimit ?? (isPremiumUser ? 50 : 5);

                                                                return (
                                                                    <tr key={item.userId} className="border-b border-white/5 hover:bg-white/[0.02] transition animate-fadeIn">
                                                                        <td className="py-3 px-4 font-sans font-extrabold text-white flex items-center gap-2">
                                                                            <img src={celeb?.profilePic || "/default-avatar.png"} className="w-5 h-5 rounded object-cover" referrerPolicy="no-referrer" />
                                                                            {celeb?.celebName || item.userId || "Unknown Creator"}
                                                                        </td>
                                                                        <td className="py-3 px-4 uppercase text-[9px] font-black">
                                                                            <span className={`px-1.5 py-0.5 rounded ${celeb?.isAiSubscribed === true || celeb?.aiPremium === true || item.planType === 'ai_subscribed' || item.aiPremium === true ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/5'}`}>
                                                                                {celeb?.isAiSubscribed === true || celeb?.aiPremium === true || item.planType === 'ai_subscribed' || item.aiPremium === true ? 'subscribed' : 'free'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-4 uppercase text-[9px] font-black">
                                                                            {item.geminiQuotaExceeded === true ? (
                                                                                <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-max">
                                                                                    ⚠️ Quota Over
                                                                                </span>
                                                                            ) : item.activeProvider === 'groq' || (item.activeProvider === 'live' && item.fallbackActivated) || item.provider === 'groq' ? (
                                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                                                                                    ⚡ LIVE
                                                                                </span>
                                                                            ) : item.activeProvider === 'demo' ? (
                                                                                <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-white/5 flex items-center gap-1 w-max">
                                                                                    ℹ️ Offline Demo
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/10 whitespace-nowrap">
                                                                                    LIVE PRO
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center">
                                                                            <span className={currentTodayRequests >= limit ? 'text-red-400 font-extrabold animate-pulse' : 'text-emerald-400 font-black'}>
                                                                                {currentTodayRequests}
                                                                            </span>
                                                                            <span className="text-white/30"> / {limit}</span>
                                                                        </td>
                                                                        <td className="py-3 px-4 text-right text-indigo-400 font-extrabold">
                                                                            {item.totalLifetimeRequests ?? item.totalRequests ?? 0}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center">
                                                                            <button
                                                                                onClick={() => handleResetAiQuota(item.userId)}
                                                                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-sans font-black uppercase text-[10px] rounded border border-emerald-500/20 hover:border-emerald-500/40 transition cursor-pointer"
                                                                                title="Reset quota limits, clear Gemini Quota indicator, set active provider, and wipe cooldown timestamp."
                                                                            >
                                                                                Reset Quota
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-xs text-white/20 font-bold uppercase tracking-widest">No live AI quota records synced from Firestore yet</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 11. Landing Page Management Tab */}
                        {activeTab === 'landing-mgmt' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                {/* Onboard Manual Celebrity */}
                                <div className="lg:col-span-1 bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-6">
                                    <div>
                                        <h4 className="text-md font-bold uppercase tracking-widest text-white italic">Register New Creator</h4>
                                        <p className="text-[10px] text-white/40 tracking-wider font-extrabold uppercase mt-1">Onboard a verified celebrity onto landing page</p>
                                    </div>

                                    <form onSubmit={handleCreateDemoCeleb} className="space-y-4 font-sans text-xs">
                                        <div>
                                            <label className="block text-white/50 font-bold mb-1">Stage / Name</label>
                                            <input 
                                              type="text"
                                              required
                                              value={demoName}
                                              onChange={e => setDemoName(e.target.value)}
                                              placeholder="e.g. Davido"
                                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none font-medium" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-white/50 font-bold mb-1">Profile Photo Image File</label>
                                            <div className="relative border border-dashed border-white/10 bg-black/20 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[120px] transition-all group">
                                                {demoPic ? (
                                                    <div className="space-y-2">
                                                        <img src={demoPic} alt="Celebrity Preview" className="w-16 h-16 object-cover rounded-xl mx-auto border border-white/15" />
                                                        <button 
                                                          type="button" 
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDemoPic('');
                                                          }} 
                                                          className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded text-[9px] uppercase font-black tracking-wider"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <UploadCloud size={24} className="text-white/20 mb-1.5 group-hover:scale-105 transition-transform" />
                                                        <span className="text-[10px] text-white/40 uppercase font-black tracking-wider">
                                                            {uploaderLoading ? 'Uploading image...' : 'Drop/pick profile photo'}
                                                        </span>
                                                    </>
                                                )}
                                                <input 
                                                  type="file" 
                                                  accept="image/*" 
                                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                                  onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploaderLoading(true);
                                                    try {
                                                        const url = await uploadToCloudinary(file);
                                                        setDemoPic(url);
                                                        triggerToast('Photo Uploaded Successfully');
                                                    } catch (err: any) {
                                                        alert('Upload failed: ' + err.message);
                                                    } finally {
                                                        setUploaderLoading(false);
                                                    }
                                                  }} 
                                                  disabled={uploaderLoading}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-white/50 font-bold mb-1">Country</label>
                                            <input 
                                              type="text"
                                              value={demoCountry}
                                              onChange={e => setDemoCountry(e.target.value)}
                                              placeholder="e.g. Nigeria"
                                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none" 
                                            />
                                        </div>

                                        <div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-white/50 font-bold mb-1">Price / hr ($ USD)</label>
                                                    <input 
                                                      type="number"
                                                      value={demoPrice}
                                                      onChange={e => setDemoPrice(e.target.value)}
                                                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none font-medium" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-white/50 font-bold mb-1">Fan Card Price ($)</label>
                                                    <input 
                                                      type="number"
                                                      value={demoFanCard}
                                                      onChange={e => setDemoFanCard(e.target.value)}
                                                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none font-medium" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-white/50 font-bold mb-1">Biography</label>
                                            <textarea 
                                              value={demoBio}
                                              onChange={e => setDemoBio(e.target.value)}
                                              placeholder="Pioneer of global brand representation..."
                                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none h-20" 
                                            />
                                        </div>

                                        {/* Featured & Trending Toggles */}
                                        <div className="pt-2 grid grid-cols-2 gap-4">
                                            <button 
                                              type="button"
                                              onClick={() => setDemoIsFeatured(!demoIsFeatured)}
                                              className={`py-2 px-3 border rounded-xl font-bold uppercase tracking-wider text-[10px] text-center transition-all ${
                                                demoIsFeatured ? 'bg-primary/20 text-primary border-primary/30' : 'bg-transparent text-white/40 border-white/10'
                                              }`}
                                            >
                                                ★ Featured
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => setDemoIsTrending(!demoIsTrending)}
                                              className={`py-2 px-3 border rounded-xl font-bold uppercase tracking-wider text-[10px] text-center transition-all ${
                                                demoIsTrending ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-transparent text-white/40 border-white/10'
                                              }`}
                                            >
                                                🔥 Trending
                                            </button>
                                        </div>

                                        <button 
                                          type="submit" 
                                          disabled={uploaderLoading}
                                          className="w-full py-3.5 bg-primary text-black rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/5 hover:scale-[1.01] transition-all disabled:opacity-40 font-black"
                                        >
                                            {uploaderLoading ? 'Uploading Assets...' : 'Add Public Celebrity'}
                                        </button>
                                    </form>
                                </div>

                                {/* Curate Live Matrix Options */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-6">
                                        <div>
                                            <h4 className="text-md font-bold uppercase tracking-widest text-white italic">Active Landing Page Showcase</h4>
                                            <p className="text-[10px] text-white/40 tracking-wider font-extrabold uppercase mt-1">
                                                These celebrities appear on the public landing page index. Toggle Featured/Trending or remove them from public view.
                                            </p>
                                        </div>

                                        <div className="space-y-4 font-sans text-xs">
                                            {showcaseCards.length > 0 ? (
                                                showcaseCards.map(c => (
                                                    <div key={c.id} className="p-4 bg-black/35 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={c.profilePic} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                                                            <div>
                                                                <h5 className="font-extrabold text-white text-sm">{c.celebName}</h5>
                                                                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                                                                    {c.country} • ${Number(c.bookingPrice || 0).toLocaleString('en-US')}/hr
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            <button 
                                                              onClick={() => handleToggleCelebFlag(c.id, 'isFeatured', c.isFeatured || false)}
                                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                                  c.isFeatured ? 'bg-primary/20 text-primary border border-primary/25' : 'bg-white/5 text-white/40'
                                                              }`}
                                                            >
                                                                ★ Featured
                                                            </button>
                                                            <button 
                                                              onClick={() => handleToggleCelebFlag(c.id, 'isTrending', c.isTrending || false)}
                                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                                  c.isTrending ? 'bg-orange-500/20 text-orange-400 border border-orange-400/20' : 'bg-white/5 text-white/40'
                                                              }`}
                                                            >
                                                                🔥 Trending
                                                            </button>
                                                            <button 
                                                              onClick={() => handleToggleCelebFlag(c.id, 'isVisible', c.isVisible ?? true)}
                                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                                  (c.isVisible ?? true) ? 'bg-blue-500/20 text-blue-400 border border-blue-400/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'
                                                              }`}
                                                            >
                                                                {(c.isVisible ?? true) ? '👁 Visible' : '👁 Hidden'}
                                                            </button>
                                                            <button 
                                                              onClick={() => handleDeleteShowcaseCard(c.id)}
                                                              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all ml-2"
                                                              title="Remove from showcase only"
                                                            >
                                                                Remove Card
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl text-white/35 font-bold uppercase tracking-widest text-[10px]">
                                                    No curated showcase cards active. Add verified profiles below.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* All Celebrity Profiles Directory for Showcase Promotion */}
                                    <div className="bg-slate-900/40 p-8 border border-white/5 rounded-[2.5rem] space-y-6">
                                        <div>
                                            <h4 className="text-md font-bold uppercase tracking-widest text-white italic">Verified Creator Profiles</h4>
                                            <p className="text-[10px] text-white/40 tracking-wider font-extrabold uppercase mt-1">
                                                Select registered creators to promote to the Landing Page Showcase. Deleting showcase cards does not affect these profiles.
                                            </p>
                                        </div>

                                        <div className="space-y-3 font-sans text-xs max-h-96 overflow-y-auto pr-2">
                                            {allCelebs.map(c => {
                                                const isInShowcase = showcaseCards.some(s => s.id === c.id || s.celebId === c.celebId);
                                                return (
                                                    <div key={c.id} className="p-3.5 bg-black/20 hover:bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-4 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <img src={c.profilePic} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                                            <div>
                                                                <h5 className="font-extrabold text-white text-sm">{c.celebName}</h5>
                                                                <span className="text-[9px] uppercase font-bold text-white/30">
                                                                    Slug: <span className="text-primary font-mono">{c.slug}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {isInShowcase ? (
                                                                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wider rounded-lg block">
                                                                    Promoted
                                                                </span>
                                                            ) : (
                                                                <button 
                                                                  onClick={() => handleAddProfileToShowcase(c)}
                                                                  className="px-3 py-1.5 bg-white/5 hover:bg-primary hover:text-black rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                                >
                                                                    Promote to Landing
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Celebrity Tutorials Management Tab */}
                        {activeTab === 'tutorials' && (
                            <div className="space-y-10 font-sans">
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-2">Celebrity Tutorials Console</h3>
                                    <p className="text-xs text-white/50">Manage education or streaming tutorial videos distributed to celebrity admin dashboards in real-time.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                                    {/* Edit / Form Section */}
                                    <div className="lg:col-span-12 xl:col-span-5 bg-slate-900/40 p-4 sm:p-6 md:p-8 border border-white/5 rounded-[2.5rem] space-y-6">
                                        <div className="flex items-center gap-3">
                                            {editingTutId ? (
                                                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs uppercase">
                                                    ✏️
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                    +
                                                </div>
                                            )}
                                            <h4 className="text-sm font-black uppercase tracking-widest text-white">
                                                {editingTutId ? 'Modify Existing Tutorial' : 'Publish New Tutorial Video'}
                                            </h4>
                                        </div>

                                        <form onSubmit={handleSaveTutorial} className="space-y-5 text-left">
                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Tutorial Title</label>
                                                <input 
                                                  type="text"
                                                  placeholder="e.g. VIP Booking Management Best Practices"
                                                  value={tutTitle}
                                                  onChange={e => setTutTitle(e.target.value)}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/20 focus:border-primary/50 outline-none font-bold text-xs" 
                                                  required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Tutorial Description</label>
                                                <textarea 
                                                  placeholder="Describe what the celebrity will learn from this tutorial video..."
                                                  value={tutDesc}
                                                  onChange={e => setTutDesc(e.target.value)}
                                                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/20 focus:border-primary/50 outline-none h-24 font-semibold text-xs leading-relaxed" 
                                                  required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Tutorial Video Source</label>
                                                <div className="space-y-4">
                                                    <input 
                                                      type="file" 
                                                      accept="video/*" 
                                                      id="video-uploader"
                                                      className="hidden" 
                                                      onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                          setTutVideoFile(e.target.files[0]);
                                                        }
                                                      }} 
                                                    />
                                                    <label 
                                                      htmlFor="video-uploader" 
                                                      className="w-full h-32 bg-black/40 border border-white/10 hover:border-primary/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer group transition-all text-center p-4 border-dashed"
                                                    >
                                                        <UploadCloud className="text-white/30 group-hover:text-primary transition-all mb-2" size={28} />
                                                        <span className="text-xs font-black uppercase tracking-wider text-white/50 group-hover:text-white truncate max-w-full px-2">
                                                            {tutVideoFile ? tutVideoFile.name : (tutVideoUrl ? 'Replace current video file' : 'Choose video file')}
                                                        </span>
                                                        <span className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">
                                                            MP4, WebM or MOV (Cloudinary Video Storage)
                                                        </span>
                                                    </label>

                                                    {tutVideoUrl && !tutVideoFile && (
                                                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-white/40 truncate">
                                                            Current: {tutVideoUrl}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button 
                                                  type="submit"
                                                  disabled={isUploadingTut}
                                                  className="flex-1 py-4 px-6 bg-primary text-black disabled:bg-primary/20 disabled:text-black/40 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/5"
                                                >
                                                    {isUploadingTut ? (
                                                        <>
                                                            <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                                                            Uploading Custom Stream...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlusCircle size={16} />
                                                            {editingTutId ? 'Update & Release' : 'Publish Tutorial Video'}
                                                        </>
                                                    )}
                                                </button>

                                                {editingTutId && (
                                                    <button 
                                                      type="button"
                                                      onClick={() => {
                                                        setTutTitle('');
                                                        setTutDesc('');
                                                        setTutVideoUrl('');
                                                        setTutVideoFile(null);
                                                        setEditingTutId(null);
                                                      }}
                                                      className="px-5 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    </div>

                                    {/* Tutorials List Section */}
                                    <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-white/50 text-left">Active Tutorials Directory ({tutorials.length})</h4>

                                        {tutorials.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {tutorials.map(tut => (
                                                    <div key={tut.id} className="bg-slate-900/40 border border-white/5 rounded-3xl p-4 space-y-4 flex flex-col justify-between min-w-0 w-full text-left">
                                                        <div className="space-y-3">
                                                            <div className="h-40 bg-black rounded-2xl overflow-hidden relative">
                                                                <video 
                                                                  src={tut.videoUrl} 
                                                                  controls 
                                                                  preload="metadata"
                                                                  className="w-full h-full object-cover" 
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h5 className="font-extrabold text-white text-md tracking-tight break-all truncate">{tut.title}</h5>
                                                                <p className="text-xs text-white/55 font-medium mt-1 leading-relaxed break-all line-clamp-3">{tut.description}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-white/5 flex gap-2">
                                                            <button 
                                                              onClick={() => handleEditTutorial(tut)}
                                                              className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                            >
                                                              Edit
                                                            </button>
                                                            <button 
                                                              onClick={() => handleDeleteTutorial(tut.id)}
                                                              className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-400 border border-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                            >
                                                              Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center bg-slate-900/20 border border-white/5 border-dashed rounded-[2.5rem] space-y-2">
                                                <Video size={36} className="text-white/20 mx-auto animate-pulse" />
                                                <p className="text-white/30 text-xs font-black uppercase tracking-widest mt-2">No tutorials configured yet</p>
                                                <p className="text-[10px] text-white/20 leading-relaxed font-semibold max-w-xs mx-auto">Complete the custom upload console on the left to publish tutorial streams for VIP curators.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 12. Branding & Settings Tab */}
                        {activeTab === 'branding' && (
                            <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem]">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-6">Corporate Platform Branding</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Platform Master Name</label>
                                        <input 
                                          type="text"
                                          value={siteSettings?.appName || ''}
                                          onChange={e => setSiteSettings({...siteSettings, appName: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">Meta Description / Moto</label>
                                        <textarea 
                                          value={siteSettings?.appDescription || ''}
                                          onChange={e => setSiteSettings({...siteSettings, appDescription: e.target.value})}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none h-24 font-medium" 
                                        />
                                    </div>
                                    <button 
                                      onClick={() => handleSaveGlobalSettings({
                                        appName: siteSettings.appName,
                                        appDescription: siteSettings.appDescription
                                      })}
                                      className="py-4 px-8 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Platform Identity
                                    </button>

                                    {/* Favicon Management Area */}
                                    <div className="pt-6 border-t border-white/5 space-y-4 text-left">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Browser Favicon Management</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1 leading-relaxed">
                                                Configure the shortcut icon shown in modern browser tabs, mobile previews, bookmarks, and app shortcuts. (Supported formats: .png, .jpg, .svg, .ico)
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/35 p-5 rounded-2xl border border-white/5">
                                            <div className="flex-1 text-center sm:text-left min-w-0">
                                                {siteSettings?.faviconUrl ? (
                                                    <div className="space-y-1">
                                                        <span className="inline-block bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                                            Active Favicon Configured
                                                        </span>
                                                        <p className="text-[9px] font-mono text-white/40 truncate max-w-[250px] mt-1">
                                                            {siteSettings.faviconUrl}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-450">
                                                        No Custom Favicon Active (Default Browser Icon In Use)
                                                     </p>
                                                )}
                                            </div>

                                            <div className="flex gap-2 shrink-0 col-span-full sm:col-auto">
                                                <label className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center border border-white/5 min-w-[110px]">
                                                    <UploadCloud size={14} className="mr-1.5" />
                                                    {faviconUploading ? 'Uploading...' : 'Upload Icon'}
                                                    <input 
                                                      type="file"
                                                      accept=".png,.jpg,.jpeg,.svg,.ico"
                                                      onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setFaviconUploading(true);
                                                        try {
                                                          const url = await uploadToCloudinary(file);
                                                          const updatedSettings = { ...siteSettings, faviconUrl: url };
                                                          setSiteSettings(updatedSettings);
                                                          await handleSaveGlobalSettings({ faviconUrl: url });
                                                          triggerToast('Favicon uploaded and synced!');
                                                        } catch (err: any) {
                                                          alert('Favicon upload failed: ' + err.message);
                                                        } finally {
                                                          setFaviconUploading(false);
                                                        }
                                                      }}
                                                      className="hidden"
                                                      disabled={faviconUploading}
                                                    />
                                                </label>

                                                {siteSettings?.faviconUrl && (
                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        if (confirm('Are you sure you want to delete this custom favicon? This will reset the browser favicon to default.')) {
                                                          try {
                                                            const updatedSettings = { ...siteSettings, faviconUrl: "" };
                                                            setSiteSettings(updatedSettings);
                                                            await handleSaveGlobalSettings({ faviconUrl: "" });
                                                            triggerToast('Favicon deleted successfully.');
                                                          } catch (err: any) {
                                                            alert('Failed to delete favicon: ' + err.message);
                                                          }
                                                        }
                                                      }}
                                                      className="py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Unified LiteLLM AI Gateway Configuration */}
                                    <div className="pt-8 border-t border-white/5 space-y-6 text-left">
                                        <div className="flex items-center gap-2 text-indigo-400">
                                            <Sparkles size={18} />
                                            <h4 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">LiteLLM Multi-Provider AI Gateway</h4>
                                        </div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-extrabold leading-relaxed">
                                            Manage your dynamic API keys for standard and fallback routing. If your primary Gemini quota is exhausted, the portal instantly and seamlessly swaps to Groq LLaMA 3.3 70B so fans never see interruptions.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-emerald-400 mb-1 font-mono">Primary Provider: Gemini 3.5 Flash</label>
                                                <div className="relative">
                                                    <input 
                                                      type="password"
                                                      value={geminiApiKey}
                                                      onChange={e => setGeminiApiKey(e.target.value)}
                                                      placeholder="Paste Gemini API Key (AIzaSy...)"
                                                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-white focus:border-emerald-500/50 outline-none font-mono text-xs" 
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                                                      🔑
                                                    </div>
                                                </div>
                                                <button 
                                                  onClick={async () => {
                                                    try {
                                                      const cleanedKey = geminiApiKey.trim().replace(/^["']|["']$/g, "").trim();
                                                      await setDoc(doc(db, 'adminSettings', 'gemini'), { apiKey: cleanedKey }, { merge: true });
                                                      setGeminiApiKey(cleanedKey);
                                                      triggerToast('Gemini Primary Key Synced Live!');
                                                    } catch (err: any) {
                                                      alert('Failed to save Gemini key: ' + err.message);
                                                    }
                                                  }}
                                                  className="py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 cursor-pointer font-bold"
                                                >
                                                    <Save size={10} /> Sync Gemini Key
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase font-black tracking-widest text-amber-500 mb-1 font-mono">Fallback Provider: Groq LLaMA 3.3 70B</label>
                                                <div className="relative">
                                                    <input 
                                                      type="password"
                                                      value={groqApiKey}
                                                      onChange={e => setGroqApiKey(e.target.value)}
                                                      placeholder="Paste Groq API Key (gsk_...)"
                                                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-white focus:border-amber-500/50 outline-none font-mono text-xs" 
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                                                      🔑
                                                    </div>
                                                </div>
                                                <button 
                                                  onClick={async () => {
                                                    try {
                                                      const cleanedKey = groqApiKey.trim().replace(/^["']|["']$/g, "").trim();
                                                      await setDoc(doc(db, 'adminSettings', 'groq'), { apiKey: cleanedKey }, { merge: true });
                                                      setGroqApiKey(cleanedKey);
                                                      triggerToast('Groq Fallback Key Synced Live!');
                                                    } catch (err: any) {
                                                      alert('Failed to save Groq key: ' + err.message);
                                                    }
                                                  }}
                                                  className="py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 cursor-pointer font-bold"
                                                >
                                                    <Save size={10} /> Sync Groq Key
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dangerous platform reset zone */}
                                    <div className="mt-12 pt-8 border-t border-red-500/10 space-y-4">
                                        <div className="flex items-center gap-2 text-red-500">
                                            <ShieldAlert size={20} />
                                            <h4 className="text-xs font-black uppercase tracking-widest">DANGER ZONE: PLATFORM TERMINATE / RESET</h4>
                                        </div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-extrabold leading-relaxed text-left">
                                            Executing a core partition purge will delete all fan accounts, celebrities, memberships, schedules, and active message streams. This cannot be undone. Only settings and branding parameters will persist.
                                        </p>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            setResetPhraseInput('');
                                            setIsResetModalOpen(true);
                                          }}
                                          className="py-3.5 px-6 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all block w-full text-center"
                                        >
                                            Purge Central Database
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 13. Authentication Controls Tab */}
                        {activeTab === 'auth-controls' && (
                            <div className="max-w-xl bg-slate-900/40 p-4 sm:p-6 md:p-10 border border-white/5 rounded-[2.5rem] space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-white italic mb-2">Authentication Controls</h3>
                                    <p className="text-white/40 text-[10px] uppercase tracking-wider leading-relaxed">
                                        Instantly toggle real-time login and registration locks across the entire platform. Settings apply immediately.
                                    </p>
                                </div>

                                {/* Global Override */}
                                <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Global Authentication Override</h4>
                                            <p className="text-[10px] text-white/35 mt-1">If disabled, overrides all registrations and logins, locking the entire gateway.</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const nextVal = !authControls.globalAuthEnabled;
                                            const updated = { ...authControls, globalAuthEnabled: nextVal };
                                            setAuthControls(updated);
                                            await setDoc(doc(db, 'siteSettings', 'authControls'), updated);
                                            triggerToast(nextVal ? 'Global Authentication Enabled' : 'Global Authentication Disabled');
                                          }}
                                          className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            authControls.globalAuthEnabled 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                          }`}
                                        >
                                            {authControls.globalAuthEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>
                                </div>

                                {/* Celebrity Controls */}
                                <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary italic border-b border-white/5 pb-2">Celebrity Portal</h4>
                                    
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-300">Celebrity Registration</p>
                                            <p className="text-[9px] text-white/35 mt-0.5">Allow new celebrity profiles to apply and register on the system.</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const nextVal = !authControls.celebrityRegisterEnabled;
                                            const updated = { ...authControls, celebrityRegisterEnabled: nextVal };
                                            setAuthControls(updated);
                                            await setDoc(doc(db, 'siteSettings', 'authControls'), updated);
                                            triggerToast(nextVal ? 'Celebrity Registration Enabled' : 'Celebrity Registration Disabled');
                                          }}
                                          className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            authControls.celebrityRegisterEnabled 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                          }`}
                                        >
                                            {authControls.celebrityRegisterEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-300">Celebrity Login</p>
                                            <p className="text-[9px] text-white/35 mt-0.5">Unlock sign in controls for already registered celebrity curators.</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const nextVal = !authControls.celebrityLoginEnabled;
                                            const updated = { ...authControls, celebrityLoginEnabled: nextVal };
                                            setAuthControls(updated);
                                            await setDoc(doc(db, 'siteSettings', 'authControls'), updated);
                                            triggerToast(nextVal ? 'Celebrity Login Enabled' : 'Celebrity Login Disabled');
                                          }}
                                          className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            authControls.celebrityLoginEnabled 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                          }`}
                                        >
                                            {authControls.celebrityLoginEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>
                                </div>

                                {/* Fan Controls */}
                                <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-[#6366f1] italic border-b border-white/5 pb-2">Fan Portal</h4>
                                    
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-300">Fan Registration</p>
                                            <p className="text-[9px] text-white/35 mt-0.5">Enable new general user and fan check-ins to join the portal.</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const nextVal = !authControls.fanRegisterEnabled;
                                            const updated = { ...authControls, fanRegisterEnabled: nextVal };
                                            setAuthControls(updated);
                                            await setDoc(doc(db, 'siteSettings', 'authControls'), updated);
                                            triggerToast(nextVal ? 'Fan Registration Enabled' : 'Fan Registration Disabled');
                                          }}
                                          className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            authControls.fanRegisterEnabled 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                          }`}
                                        >
                                            {authControls.fanRegisterEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-300">Fan Login</p>
                                            <p className="text-[9px] text-white/35 mt-0.5">Allow verified fans and users to access their dashboard portals.</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const nextVal = !authControls.fanLoginEnabled;
                                            const updated = { ...authControls, fanLoginEnabled: nextVal };
                                            setAuthControls(updated);
                                            await setDoc(doc(db, 'siteSettings', 'authControls'), updated);
                                            triggerToast(nextVal ? 'Fan Login Enabled' : 'Fan Login Disabled');
                                          }}
                                          className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            authControls.fanLoginEnabled 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                          }`}
                                        >
                                            {authControls.fanLoginEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Message Field */}
                                <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[#a5b4fc] mb-1">Maintenance Reason</label>
                                    <textarea
                                      value={authControls.maintenanceReason || ''}
                                      onChange={e => setAuthControls({ ...authControls, maintenanceReason: e.target.value })}
                                      placeholder="Explain the maintenance event..."
                                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none h-24 font-semibold text-xs leading-relaxed"
                                    />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await setDoc(doc(db, 'siteSettings', 'authControls'), authControls);
                                        triggerToast('Maintenance Reason Saved Successfully!');
                                      }}
                                      className="py-3 px-6 bg-indigo-500/10 hover:bg-indigo-500 hover:text-black border border-indigo-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 cursor-pointer font-bold"
                                    >
                                        <Save size={14} /> Save Maintenance Message
                                    </button>
                                </div>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Entity Inspection Overlay Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass w-full max-w-lg p-10 rounded-[2.5rem] relative border border-white/10 shadow-2xl overflow-y-auto max-h-[85vh] font-sans text-sm"
                        >
                            <button 
                              onClick={() => setSelectedUser(null)}
                              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>

                            <div className="text-center mb-8 border-b border-white/5 pb-6">
                                <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto mb-4 overflow-hidden ring-4 ring-primary/5">
                                    {selectedUser.details.profilePic ? <img src={selectedUser.details.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary text-4xl font-black uppercase">{selectedUser.name[0]}</div>}
                                </div>
                                <h4 className="text-2xl font-display font-black text-white italic uppercase tracking-tight">{selectedUser.name}</h4>
                                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase tracking-widest font-black text-primary italic mt-2 inline-block">Role: {selectedUser.role}</span>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/30">Document ID</p>
                                        <p className="font-mono text-white/80 select-all truncate">{selectedUser.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/30">Email Credentials</p>
                                        <p className="font-semibold text-white/90 truncate">{selectedUser.email}</p>
                                    </div>
                                </div>

                                {selectedUser.role === 'celebrity' && (
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                                        <p className="text-[10px] uppercase font-black text-primary tracking-widest italic border-b border-white/5 pb-2">Celebrity Credentials</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-[10px] text-white/30">Stage Name</p>
                                                <p className="font-semibold text-white">{selectedUser.details.celebName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/30">Home Country</p>
                                                <p className="font-semibold text-white">{selectedUser.details.country || 'Global'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/30">Hourly Session Fee</p>
                                                <p className="font-bold text-primary">{currencySym}{selectedUser.details.bookingPrice || '0'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/30">Fan Membership Card Rate</p>
                                                <p className="font-bold text-primary">{currencySym}{selectedUser.details.fanCardPrice || '0'}</p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-[10px] text-white/30">Private Biography Reference</p>
                                            <p className="text-white/60 italic font-medium mt-1 leading-relaxed">"{selectedUser.details.bio || 'None entered.'}"</p>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 space-y-2">
                                            <p className="text-[10px] text-white/30 uppercase tracking-wider font-extrabold font-mono">AI Copilot System Tier</p>
                                            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                                <div>
                                                    <p className="text-xs font-bold text-white leading-none">
                                                        {(selectedUser.details?.isAiSubscribed === true || selectedUser.details?.aiPremium === true) 
                                                            ? '👑 Premium AI Assistant' 
                                                            : '⚪ Basic AI (5 limit)'}
                                                    </p>
                                                    <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1.5 font-mono">
                                                        {(selectedUser.details?.isAiSubscribed === true || selectedUser.details?.aiPremium === true)
                                                            ? `50 queries daily • 5 suggestion replies${selectedUser.details?.aiPremiumExpiresAt ? ` • ${Math.ceil((selectedUser.details.aiPremiumExpiresAt - Date.now()) / (24 * 60 * 60 * 1000))} days left` : ''}`
                                                            : '5 queries daily • 3 suggestion replies'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleAiSub(
                                                        selectedUser.id, 
                                                        !(selectedUser.details?.isAiSubscribed === true || selectedUser.details?.aiPremium === true)
                                                    )}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        (selectedUser.details?.isAiSubscribed === true || selectedUser.details?.aiPremium === true)
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                                                    }`}
                                                >
                                                    {(selectedUser.details?.isAiSubscribed === true || selectedUser.details?.aiPremium === true)
                                                        ? 'Deactivate'
                                                        : 'Activate'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="pt-4 border-t border-white/5 flex gap-2">
                                    <button 
                                      onClick={() => setSelectedUser(null)}
                                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold uppercase text-xs"
                                    >
                                        Close Panel
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(selectedUser.id, selectedUser.role === 'celebrity')}
                                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase text-xs"
                                    >
                                        Delete Entity
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Core Platform Reset Confirmation Overlay */}
            <AnimatePresence>
                {isResetModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass w-full max-w-md p-10 rounded-[2.5rem] relative border border-red-500/20 shadow-2xl overflow-y-auto max-h-[85vh] font-sans text-sm"
                        >
                            <button 
                              onClick={() => {
                                setIsResetModalOpen(false);
                                setResetPhraseInput('');
                              }}
                              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/50"
                            >
                                <X size={18} />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-red-500/10 rounded-3xl mx-auto mb-4 flex items-center justify-center ring-4 ring-red-500/5">
                                    <ShieldAlert size={28} className="text-red-400" />
                                </div>
                                <h4 className="text-xl font-display font-black text-red-500 uppercase tracking-tight">CONFIRM DATABASE PURGE</h4>
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Authorized Super Admins Only</p>
                            </div>

                            <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl mb-6 text-left">
                                <p className="text-xs text-red-400 font-bold leading-relaxed">
                                    This operation is permanent. It will instantly destroy and clear all records of booking calendars, celebrity profiles, memberships, messages, chats, and general fan accounts.
                                </p>
                            </div>

                            <div className="space-y-4 mb-6 text-left">
                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">
                                        Type <span className="text-red-400 font-mono">TERMINATE-SYSTEM</span> to verify:
                                    </label>
                                    <input 
                                      type="text"
                                      placeholder="Type exact phrase..."
                                      value={resetPhraseInput}
                                      onChange={e => setResetPhraseInput(e.target.value)}
                                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-center text-red-400 focus:border-red-500/50 outline-none font-mono" 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                  onClick={() => {
                                    setIsResetModalOpen(false);
                                    setResetPhraseInput('');
                                  }}
                                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-wider text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                  onClick={handleExecutePlatformReset}
                                  disabled={resetPhraseInput !== 'TERMINATE-SYSTEM'}
                                  className="flex-1 py-3 bg-red-500 disabled:opacity-40 disabled:hover:bg-red-900 disabled:hover:text-white rounded-xl font-black uppercase text-[10px] text-white tracking-widest transition-all"
                                >
                                    PURGE ALL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Inline Receipt Snapshot Interactive Modal */}
            <AnimatePresence>
                {previewReceiptUrl && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" 
                        onClick={() => setPreviewReceiptUrl(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="relative max-w-4xl max-h-[85vh] bg-slate-950 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 overflow-hidden flex flex-col items-center justify-center shadow-2xl" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setPreviewReceiptUrl(null)}
                                className="absolute top-5 right-5 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all z-10 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                            
                            <img 
                                src={previewReceiptUrl} 
                                alt="Receipt Snapshot Preview" 
                                className="max-w-full max-h-[65vh] object-contain rounded-2xl border border-white/5" 
                                referrerPolicy="no-referrer" 
                            />
                            
                            <div className="mt-6 text-center">
                                <p className="text-[10px] uppercase font-black text-indigo-400 tracking-[0.25em] font-mono">Verification deposit certificate</p>
                                <a 
                                    href={previewReceiptUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-primary hover:underline text-xs mt-2.5 inline-flex items-center gap-1.5 font-bold font-mono transition-all"
                                >
                                    <ExternalLink size={12} /> Open in standard window ↗
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Toast show={toastShow} message={toastMessage} onClose={() => setToastShow(false)} />
        </div>
    );
};

const AdminStatCard = ({ label, value, sub, highlight }: any) => (
    <div className={`p-8 rounded-[2rem] border transition-all ${highlight ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' : 'bg-slate-900/40 border-white/5'}`}>
        <p className="text-[9px] uppercase font-mono font-black text-white/35 tracking-[0.25em] mb-4">{label}</p>
        <p className="text-4xl font-display font-semibold tracking-tighter mb-2 italic uppercase text-white">{value}</p>
        <p className="text-[9px] uppercase font-bold text-white/20 tracking-wider font-sans">{sub}</p>
    </div>
);
