import { useState, useEffect, useMemo } from 'react';
import { 
  collection, onSnapshot, doc, updateDoc, writeBatch, getDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Search, Calendar, Filter, X, Eye, 
  FileSpreadsheet, FileText, Download, Check, AlertCircle, Save,
  CalendarDays, TrendingUp, DollarSign, Wallet, RefreshCw, Layers, ShieldCheck,
  CheckCircle, ArrowUpRight, ArrowDownRight, Printer, FileDown
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  transactionId?: string;
  txRef?: string;
  paymentReference?: string;
  userId: string;
  userEmail?: string;
  email?: string;
  userName?: string;
  name?: string;
  upgradeType: 'celebrity' | 'ai_premium' | string;
  planType?: 'monthly' | 'yearly' | string;
  planName?: 'monthly' | 'yearly' | string;
  paymentMethod: 'flutterwave' | 'manual' | string;
  amount: number;
  currency: string;
  status?: 'PAID' | 'UNPAID' | 'FAILED' | string;
  paymentStatus?: 'pending' | 'success' | 'failed' | string;
  initiatedAt?: any;
  createdAt?: any;
  paidAt?: any;
  updatedAt?: any;
  expiresAt?: any;
  failureReason?: string;
  proofOfPayment?: string;
  paymentProof?: string;
  adminNotes?: string;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PAID, UNPAID, FAILED
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, CELEBRITY, AI
  const [methodFilter, setMethodFilter] = useState('ALL'); // ALL, FLUTTERWAVE, MANUAL
  const [planFilter, setPlanFilter] = useState('ALL'); // ALL, MONTHLY, YEARLY
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, YEAR, CUSTOM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected item modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotesText, setAdminNotesText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Real-time listener for premiumPayments
  useEffect(() => {
    setLoading(true);
    const paymentsCol = collection(db, 'premiumPayments');
    
    const unsubscribe = onSnapshot(paymentsCol, (snapshot) => {
      const records: PaymentRecord[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ...d
        } as PaymentRecord;
      });
      
      // Sort newest first
      records.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      setPayments(records);
      setLoading(false);
    }, (err) => {
      console.error("Firestore loading error:", err);
      handleFirestoreError(err, OperationType.GET, 'premiumPayments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Normalized record fields for uniform handling
  const getNormalized = (p: PaymentRecord) => {
    const status = (p.status || p.paymentStatus || 'UNPAID').toUpperCase();
    let normalizedStatus = 'UNPAID';
    if (status === 'SUCCESS' || status === 'PAID') normalizedStatus = 'PAID';
    else if (status === 'FAILED' || status === 'REJECTED') normalizedStatus = 'FAILED';

    return {
      transactionId: p.transactionId || p.id,
      paymentReference: p.txRef || p.paymentReference || p.id,
      userId: p.userId,
      userEmail: p.userEmail || p.email || 'no-email@bookaceleb.com',
      userName: p.userName || p.name || 'Anonymous User',
      upgradeType: p.upgradeType === 'celebrity' ? 'Celebrity Upgrade' : 'AI Premium Upgrade',
      rawUpgradeType: p.upgradeType,
      planType: (p.planType || p.planName || 'monthly').toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly',
      rawPlanType: p.planType || p.planName || 'monthly',
      paymentMethod: p.paymentMethod === 'flutterwave' ? 'Flutterwave' : 'Manual Payment',
      rawPaymentMethod: p.paymentMethod,
      amount: Number(p.amount || 0),
      currency: (p.currency || 'USD').toUpperCase(),
      status: normalizedStatus,
      initiatedAt: p.createdAt || p.initiatedAt || null,
      paidAt: p.paidAt || null,
      expiresAt: p.expiresAt || null,
      proofOfPayment: p.proofOfPayment || p.paymentProof || '',
      adminNotes: p.adminNotes || '',
      failureReason: p.failureReason || ''
    };
  };

  // Date Check Helper
  const isDateInFilter = (timestamp: any) => {
    if (dateRangeFilter === 'ALL') return true;
    if (!timestamp) return false;

    // Convert Firestore Timestamp or String date to JS Date
    let d: Date;
    if (timestamp.seconds) {
      d = new Date(timestamp.seconds * 1000);
    } else {
      d = new Date(timestamp);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (dateRangeFilter) {
      case 'TODAY':
        return d >= startOfToday;
      case 'WEEK':
        return d >= startOfWeek;
      case 'MONTH':
        return d >= startOfMonth;
      case 'YEAR':
        return d >= startOfYear;
      case 'CUSTOM':
        if (!customStartDate) return true;
        const sD = new Date(customStartDate);
        const eD = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
        return d >= sD && d <= eD;
      default:
        return true;
    }
  };

  // Memoized filtered and searched payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const norm = getNormalized(p);

      // Search checking
      const sTerm = searchTerm.toLowerCase();
      const matchSearch = 
        norm.userEmail.toLowerCase().includes(sTerm) ||
        norm.userName.toLowerCase().includes(sTerm) ||
        norm.transactionId.toLowerCase().includes(sTerm) ||
        norm.paymentReference.toLowerCase().includes(sTerm);

      if (!matchSearch) return false;

      // Status checking
      if (statusFilter !== 'ALL' && norm.status !== statusFilter) return false;

      // Upgrade type checking
      if (typeFilter !== 'ALL') {
        const targetType = typeFilter === 'CELEBRITY' ? 'celebrity' : 'ai_premium';
        if (p.upgradeType !== targetType) return false;
      }

      // Method checking
      if (methodFilter !== 'ALL' && p.paymentMethod !== methodFilter.toLowerCase()) return false;

      // Plan checking
      if (planFilter !== 'ALL' && norm.planType.toUpperCase() !== planFilter) return false;

      // Date checking
      if (!isDateInFilter(p.createdAt || p.initiatedAt)) return false;

      return true;
    });
  }, [payments, searchTerm, statusFilter, typeFilter, methodFilter, planFilter, dateRangeFilter, customStartDate, customEndDate]);

  // Paginated payments list
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;

  // Handle page limits
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Statistics Computations
  const stats = useMemo(() => {
    let usdPaid = 0;
    let ngnPaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let failedCount = 0;

    let celebrityUsd = 0;
    let celebrityNgn = 0;
    let aiUsd = 0;
    let aiNgn = 0;

    let todayUsd = 0;
    let todayNgn = 0;
    let monthUsd = 0;
    let monthNgn = 0;
    let yearUsd = 0;
    let yearNgn = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    payments.forEach(p => {
      const norm = getNormalized(p);
      const isPaid = norm.status === 'PAID';
      
      let date: Date = new Date();
      if (p.createdAt?.seconds) {
        date = new Date(p.createdAt.seconds * 1000);
      } else if (p.createdAt) {
        date = new Date(p.createdAt);
      } else if (p.initiatedAt) {
        date = new Date(p.initiatedAt);
      }

      if (isPaid) {
        paidCount++;
        if (norm.currency === 'NGN') {
          ngnPaid += norm.amount;
          if (p.upgradeType === 'celebrity') celebrityNgn += norm.amount;
          else if (p.upgradeType === 'ai_premium') aiNgn += norm.amount;

          if (date >= startOfToday) todayNgn += norm.amount;
          if (date >= startOfMonth) monthNgn += norm.amount;
          if (date >= startOfYear) yearNgn += norm.amount;

        } else {
          usdPaid += norm.amount;
          if (p.upgradeType === 'celebrity') celebrityUsd += norm.amount;
          else if (p.upgradeType === 'ai_premium') aiUsd += norm.amount;

          if (date >= startOfToday) todayUsd += norm.amount;
          if (date >= startOfMonth) monthUsd += norm.amount;
          if (date >= startOfYear) yearUsd += norm.amount;
        }
      } else if (norm.status === 'UNPAID') {
        unpaidCount++;
      } else if (norm.status === 'FAILED') {
        failedCount++;
      }
    });

    return {
      usdPaid,
      ngnPaid,
      paidCount,
      unpaidCount,
      failedCount,
      celebrityUsd,
      celebrityNgn,
      aiUsd,
      aiNgn,
      todayUsd,
      todayNgn,
      monthUsd,
      monthNgn,
      yearUsd,
      yearNgn,
    };
  }, [payments]);

  // Graph Data Computations
  const analyticsData = useMemo(() => {
    // 1. Last 7 Days Revenue
    const daysArr = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        dateKey: d.toDateString(),
        USD: 0,
        NGN: 0
      };
    });

    // 2. Yearly Months Revenue
    const monthsArr = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(new Date().getFullYear(), i, 1);
      return {
        monthStr: d.toLocaleString('en-US', { month: 'short' }),
        monthIndex: i,
        USD: 0,
        NGN: 0
      };
    });

    // Pie Splits counts
    let celebCount = 0;
    let aiCount = 0;
    let flutterwaveCount = 0;
    let manualCount = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;

    payments.forEach(p => {
      const norm = getNormalized(p);
      if (norm.status !== 'PAID') return;

      let date: Date = new Date();
      if (p.createdAt?.seconds) {
        date = new Date(p.createdAt.seconds * 1000);
      } else if (p.createdAt) {
        date = new Date(p.createdAt);
      }

      // 1. Day revenue accumulation
      const dayIndex = daysArr.findIndex(d => d.dateKey === date.toDateString());
      if (dayIndex !== -1) {
        if (norm.currency === 'NGN') daysArr[dayIndex].NGN += norm.amount;
        else daysArr[dayIndex].USD += norm.amount;
      }

      // 2. Month revenue accumulation
      if (date.getFullYear() === new Date().getFullYear()) {
        const mIdx = date.getMonth();
        if (norm.currency === 'NGN') monthsArr[mIdx].NGN += norm.amount;
        else monthsArr[mIdx].USD += norm.amount;
      }

      // Upgrade type
      if (p.upgradeType === 'celebrity') celebCount += norm.amount * (norm.currency === 'NGN' ? 1 : 1500); // converting mock parity value or counts. Let's just store transaction absolute count
      else aiCount += norm.amount * (norm.currency === 'NGN' ? 1 : 1500);

      // Payment method
      if (p.paymentMethod === 'flutterwave') flutterwaveCount++;
      else manualCount++;

      // Plan size
      if (norm.planType === 'Yearly') yearlyCount++;
      else monthlyCount++;
    });

    return {
      days: daysArr,
      months: monthsArr,
      upgradeType: { celebrity: celebCount, ai_premium: aiCount },
      methods: { flutterwave: flutterwaveCount, manual: manualCount },
      plans: { monthly: monthlyCount, yearly: yearlyCount }
    };
  }, [payments]);

  // Handle Payment Approval
  const handleApprovePayment = async (payment: PaymentRecord, customNotes?: string) => {
    if (!window.confirm(`Are you absolutely sure you want to APPROVE this payment for (${payment.userEmail || payment.email || 'this user'})? This will transition its state to PAID and activate their Premium upgrade instantly.`)) return;
    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const planName = (payment.planName || payment.planType || 'monthly').toLowerCase();
      const durationDays = planName === "yearly" ? 365 : 31;
      const expiryMs = now + durationDays * 24 * 60 * 60 * 1000;
      const expiryISO = new Date(expiryMs).toISOString();

      const finalNotes = customNotes || adminNotesText || 'Approved by Super Admin';

      // 1. Update checkout record
      const payRef = doc(db, 'premiumPayments', payment.id);
      batch.set(payRef, {
        status: 'PAID',
        paymentStatus: 'success',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        adminNotes: finalNotes
      }, { merge: true });

      // 2. Modify Celebrity Profiles & Sync core Users Roles
      const profileRef = doc(db, 'celebrityProfiles', payment.userId);
      const userRef = doc(db, 'users', payment.userId);

      if (payment.upgradeType === 'celebrity') {
        batch.set(profileRef, {
          isLocked: false,
          upgradePending: false,
          verifiedCelebrity: true,
          premiumCelebrity: true,
          celebrityPlan: planName,
          celebrityExpiryDate: expiryISO,
          verifiedAtDate: new Date().toISOString()
        }, { merge: true });

        batch.set(userRef, {
          role: 'celebrity',
          verifiedCelebrity: true,
          premiumCelebrity: true,
          celebrityPlan: planName,
          celebrityExpiryDate: expiryISO
        }, { merge: true });

      } else {
        // ai_premium / AI Premium upgrade
        batch.set(profileRef, {
          aiPremium: true,
          isAiSubscribed: true,
          aiUpgradePending: false,
          aiPremiumActivatedAt: now,
          aiPremiumExpiresAt: expiryMs,
          aiPremiumExpiryDate: expiryISO,
          aiPremiumPlan: planName
        }, { merge: true });

        batch.set(userRef, {
          aiPremium: true,
          isAiSubscribed: true,
          aiPremiumActivatedAt: now,
          aiPremiumExpiresAt: expiryMs,
          aiPremiumExpiryDate: expiryISO,
          aiPremiumPlan: planName
        }, { merge: true });

        const usageRef = doc(db, 'aiUsage', payment.userId);
        batch.set(usageRef, {
          planType: 'ai_subscribed',
          dailyLimit: 50,
          maxDailyRequests: 50,
          aiPremium: true,
          aiPremiumActivatedAt: now,
          aiPremiumExpiresAt: expiryMs,
          remainingRequests: 50,
          requestCountToday: 0,
          dailyRequests: 0,
          geminiQuotaExceeded: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();

      triggerNotification('Subscription upgrade activated successfully!');
      setModalOpen(false);
      setSelectedPayment(null);
    } catch (err: any) {
      console.error("Payment activation failed:", err);
      triggerNotification('Activation failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Payment Rejection
  const handleRejectPayment = async (payment: PaymentRecord, customNotes?: string) => {
    let reason = customNotes || adminNotesText;
    if (!reason) {
      const input = window.prompt("Please enter the reason for declining/rejecting this payment:", "Declined by super admin / Payment verification failed.");
      if (input === null) return; // User cancelled prompt
      reason = input || "Declined by Super Admin";
      setAdminNotesText(reason);
    }

    if (!window.confirm(`Do you want to DECLINE/REJECT this payment for (${payment.userEmail || payment.email || 'this user'})? This will set state to FAILED and release their pending lock status.`)) return;
    
    setActionLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Update checkout record
      const payRef = doc(db, 'premiumPayments', payment.id);
      batch.set(payRef, {
        status: 'FAILED',
        paymentStatus: 'failed',
        failureReason: reason,
        adminNotes: reason,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Reset pending state on Profile
      const profileRef = doc(db, 'celebrityProfiles', payment.userId);
      if (payment.upgradeType === 'celebrity') {
        batch.set(profileRef, {
          upgradePending: false
        }, { merge: true });
      } else {
        batch.set(profileRef, {
          aiUpgradePending: false
        }, { merge: true });
      }

      await batch.commit();

      triggerNotification('Payment was successfully declined.', 'success');
      setModalOpen(false);
      setSelectedPayment(null);
    } catch (err: any) {
      console.error("Rejection action failed:", err);
      triggerNotification('Rejection action failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Convert normalized payments data to CSV format & trigger desktop browser download
  const handleExportCSV = (isExcelFormat = false) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add columns headers block
    const headers = [
      "Transaction ID",
      "User Email",
      "User Name",
      "Upgrade Type",
      "Plan",
      "Payment Method",
      "Amount",
      "Currency",
      "Status",
      "Proof of Payment Link",
      "Admin Notes",
      "Failure Reason",
      "Created Date",
      "Paid Date"
    ];
    csvContent += headers.map(h => `"${h}"`).join(isExcelFormat ? "\t" : ",") + "\n";

    // Loop through filtered payments
    filteredPayments.forEach(p => {
      const norm = getNormalized(p);
      const row = [
        norm.transactionId,
        norm.userEmail,
        norm.userName,
        norm.upgradeType,
        norm.planType,
        norm.paymentMethod,
        norm.amount,
        norm.currency,
        norm.status,
        norm.proofOfPayment,
        norm.adminNotes,
        norm.failureReason,
        p.createdAt || p.initiatedAt ? new Date(p.createdAt?.seconds ? p.createdAt.seconds * 1000 : p.createdAt || p.initiatedAt).toLocaleString() : '',
        p.paidAt ? new Date(p.paidAt).toLocaleString() : ''
      ];
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(isExcelFormat ? "\t" : ",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `Payments_Export_${new Date().toISOString().slice(0,10)}.${isExcelFormat ? 'xls' : 'csv'}`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerNotification(`Successfully downloaded payment history as ${isExcelFormat ? 'Excel' : 'CSV'}!`);
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md ${
              notification.type === 'success' 
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30' 
                : 'bg-red-950/90 text-red-300 border border-red-500/30'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${notification.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            </div>
            <p className="text-xs font-black uppercase tracking-wider">{notification.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with Export trigger system */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="text-primary animate-pulse" size={24} />
            <h1 className="text-xl font-display font-black tracking-wider text-white uppercase">Payment Management Center</h1>
          </div>
          <p className="text-xs text-white/40 mt-1 max-w-xl font-medium uppercase tracking-wider">
            Consolidated Command Center for monitoring transactions, verifying manual receipts, approving upgrades, and conducting financial audits.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button 
            type="button"
            onClick={() => handleExportCSV(false)}
            className="py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
          >
            <FileText size={14} className="text-slate-400" /> Export CSV
          </button>
          
          <button 
            type="button"
            onClick={() => handleExportCSV(true)}
            className="py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" /> Export Excel
          </button>

          <button 
            type="button"
            onClick={() => window.print()}
            className="py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
          >
            <Printer size={14} className="text-primary" /> Print as PDF
          </button>
        </div>
      </div>

      {/* 3x3 Responsive Statistics Grid Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric Card - Total Revenue */}
        <div className="glass-dark border border-white/5 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Settled Revenue</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-black text-white font-mono tracking-tight">
              ${stats.usdPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] font-extrabold font-mono text-emerald-400 mt-0.5">
              ₦{stats.ngnPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} NGN
            </p>
          </div>
        </div>

        {/* Metric Card - Celebrity Upgrade Revenue */}
        <div className="glass-dark border border-white/5 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Celebrity VIP Revenue</span>
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-black text-white font-mono tracking-tight">
              ${stats.celebrityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] font-extrabold font-mono text-primary mt-0.5">
              ₦{stats.celebrityNgn.toLocaleString(undefined, { minimumFractionDigits: 2 })} NGN
            </p>
          </div>
        </div>

        {/* Metric Card - AI Premium Revenue */}
        <div className="glass-dark border border-white/5 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">AI Premium Revenue</span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-black text-white font-mono tracking-tight">
              ${stats.aiUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-[10px] font-extrabold font-mono text-indigo-400 mt-0.5">
              ₦{stats.aiNgn.toLocaleString(undefined, { minimumFractionDigits: 2 })} NGN
            </p>
          </div>
        </div>

        {/* Metric Card - Today/Monthly Revenue */}
        <div className="glass-dark border border-white/5 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Periodic Income</span>
            <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-white">
              <CalendarDays size={16} />
            </div>
          </div>
          <div className="mt-3 space-y-1 bg-white/5 p-2 rounded-xl border border-white/5">
            <div className="flex justify-between text-[8px] tracking-wider uppercase font-extrabold text-white/40">
              <span>Today</span>
              <span className="font-mono text-emerald-400">${stats.todayUsd} / ₦{stats.todayNgn}</span>
            </div>
            <div className="flex justify-between text-[8px] tracking-wider uppercase font-extrabold text-white/40">
              <span>Month</span>
              <span className="font-mono text-indigo-400">${stats.monthUsd} / ₦{stats.monthNgn}</span>
            </div>
            <div className="flex justify-between text-[8px] tracking-wider uppercase font-extrabold text-white/40">
              <span>Year</span>
              <span className="font-mono text-primary">${stats.yearUsd} / ₦{stats.yearNgn}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Transaction status counts block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-[#10b981]/5 border border-[#10b981]/15 py-3.5 px-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-[#10b981] tracking-wider">Paid Transactions</p>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.paidCount}</h4>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#10b981]/15 flex items-center justify-center text-[#10b981]">
            <CheckCircle size={16} />
          </div>
        </div>

        <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/15 py-3.5 px-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-[#f59e0b] tracking-wider">Unpaid / Initiated Only</p>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.unpaidCount}</h4>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#f59e0b]/15 flex items-center justify-center text-[#f59e0b]">
            <AlertCircle size={16} />
          </div>
        </div>

        <div className="bg-[#ef4444]/5 border border-[#ef4444]/15 py-3.5 px-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-[#ef4444] tracking-wider">Failed / Declined</p>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.failedCount}</h4>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#ef4444]/15 flex items-center justify-center text-[#ef4444]">
            <X size={16} />
          </div>
        </div>

      </div>

      {/* Charts & Graphs Panel - SVG Implementation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Bar Chart: Revenue by Day (SVG) */}
        <div className="glass-dark border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-primary">Live Trend Tracker</span>
            <h3 className="text-sm font-bold text-white uppercase mt-0.5">Revenue By Day (Last 7 Days)</h3>
            <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">Aggregated daily sales converted to USD values (Parity Rate ₦1500/$)</p>
          </div>

          <div className="relative h-44 w-full mt-6 flex items-end justify-between border-b border-white/10 pb-2">
            {analyticsData.days.map((d, idx) => {
              const totalEquivalentUsd = d.USD + (d.NGN / 1500);
              // Max scale limit calculation
              const maxUsd = Math.max(...analyticsData.days.map(x => x.USD + (x.NGN / 1500))) || 100;
              const barHeightPct = Math.min(100, Math.max(8, (totalEquivalentUsd / maxUsd) * 100));

              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip */}
                  <div className="absolute bottom-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-none bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-xl z-20 text-[9px] text-center shadow-xl">
                    <p className="font-bold text-white mb-0.5">{d.dateKey}</p>
                    <p className="text-emerald-400 font-mono">${d.USD.toFixed(1)} USD</p>
                    <p className="text-primary font-mono">₦{d.NGN.toLocaleString()} NGN</p>
                  </div>

                  {/* SVG Bar */}
                  <div className="w-6 sm:w-8 relative rounded-t-md overflow-hidden bg-white/5 hover:bg-white/10 transition-all" style={{ height: `${barHeightPct}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-primary" />
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-primary brightness-150 animate-pulse" />
                  </div>
                  
                  <span className="text-[7.5px] font-black uppercase text-white/30 tracking-wider truncate max-w-full mt-2 block">
                    {d.dateStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Bar Chart: Monthly Income distribution (SVG) */}
        <div className="glass-dark border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Annual Audit Roll</span>
            <h3 className="text-sm font-bold text-white uppercase mt-0.5">Active Fiscal Monthly Income</h3>
            <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">Aggregated sales track of current calendar year.</p>
          </div>

          <div className="relative h-44 w-full mt-6 flex items-end justify-between border-b border-white/10 pb-2 gap-1">
            {analyticsData.months.map((m, idx) => {
              const totalEquivalentUsd = m.USD + (m.NGN / 1500);
              const maxUsd = Math.max(...analyticsData.months.map(x => x.USD + (x.NGN / 1500))) || 100;
              const barHeightPct = Math.min(100, Math.max(8, (totalEquivalentUsd / maxUsd) * 100));

              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="absolute bottom-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-none bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-xl z-20 text-[9px] text-center shadow-xl">
                    <p className="font-bold text-white mb-0.5">{m.monthStr}</p>
                    <p className="text-indigo-400 font-mono">${m.USD.toFixed(1)} USD</p>
                    <p className="text-emerald-400 font-mono">₦{m.NGN.toLocaleString()} NGN</p>
                  </div>

                  <div className="w-2 sm:w-4 relative rounded-t-sm bg-white/5 hover:bg-indigo-500/20 transition-all overflow-hidden" style={{ height: `${barHeightPct}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-indigo-500" />
                  </div>
                  
                  <span className="text-[7px] font-black uppercase text-white/30 mt-2 block">
                    {m.monthStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Splits & Divisions (Upgrade Type, Plans, Payment Methods) */}
        <div className="glass-dark border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#10b981]">Volume Splits</span>
            <h3 className="text-sm font-bold text-white uppercase mt-0.5">Upgrade, Method & Plan share</h3>
            <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider">Platform product divisions by volume ratio.</p>
          </div>

          <div className="space-y-4 mt-6">
            
            {/* Upgrade share */}
            <div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-white/50 mb-1.5">
                <span>By Upgrade Type</span>
                <span className="font-mono text-primary">Celeb VS AI Sub</span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                {analyticsData.upgradeType.celebrity === 0 && analyticsData.upgradeType.ai_premium === 0 ? (
                  <div className="w-full bg-white/10 h-full flex items-center justify-center text-[7px] font-black text-white/30 uppercase">No Revenue Collected Yet</div>
                ) : (
                  <>
                    <div 
                      className="bg-primary hover:brightness-110 transition-all h-full" 
                      style={{ width: `${(analyticsData.upgradeType.celebrity / (analyticsData.upgradeType.celebrity + analyticsData.upgradeType.ai_premium)) * 100}%` }}
                    />
                    <div 
                      className="bg-indigo-500 hover:brightness-110 transition-all h-full" 
                      style={{ width: `${(analyticsData.upgradeType.ai_premium / (analyticsData.upgradeType.celebrity + analyticsData.upgradeType.ai_premium)) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Methods share */}
            <div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-white/50 mb-1.5">
                <span>By Payment Gateway</span>
                <span className="font-mono text-[#10b981]">Flutterwave VS Manual</span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                {analyticsData.methods.flutterwave === 0 && analyticsData.methods.manual === 0 ? (
                  <div className="w-full bg-white/10 h-full flex items-center justify-center text-[7px] font-black text-white/30 uppercase">No Transaction Recorded</div>
                ) : (
                  <>
                    <div 
                      className="bg-emerald-500 transition-all h-full" 
                      style={{ width: `${(analyticsData.methods.flutterwave / (analyticsData.methods.flutterwave + analyticsData.methods.manual)) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500 transition-all h-full" 
                      style={{ width: `${(analyticsData.methods.manual / (analyticsData.methods.flutterwave + analyticsData.methods.manual)) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Plan tier share */}
            <div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-white/50 mb-1.5">
                <span>By Billing Tier</span>
                <span className="font-mono text-purple-400">Monthly VS Yearly</span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                {analyticsData.plans.monthly === 0 && analyticsData.plans.yearly === 0 ? (
                  <div className="w-full bg-white/10 h-full flex items-center justify-center text-[7px] font-black text-white/30 uppercase">No Plan Records</div>
                ) : (
                  <>
                    <div 
                      className="bg-purple-500 transition-all h-full" 
                      style={{ width: `${(analyticsData.plans.monthly / (analyticsData.plans.monthly + analyticsData.plans.yearly)) * 100}%` }}
                    />
                    <div 
                      className="bg-rose-500 transition-all h-full" 
                      style={{ width: `${(analyticsData.plans.yearly / (analyticsData.plans.monthly + analyticsData.plans.yearly)) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Structured Search filters desk */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 backdrop-blur-sm space-y-6">
        
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search email, name, txRef, reference..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 text-xs text-white border border-white/15 rounded-2xl focus:outline-none focus:border-primary placeholder-white/30 font-medium font-sans uppercase tracking-wider"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-white">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
              <Filter size={12} /> Filter Options:
            </span>
            <button 
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setMethodFilter('ALL');
                setPlanFilter('ALL');
                setDateRangeFilter('ALL');
                setSearchTerm('');
              }}
              className="py-1.5 px-3 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 text-primary"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Multiline interactive filter tags */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Payment Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 rounded-xl"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Upgrade Type filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Upgrade Category</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 rounded-xl"
            >
              <option value="ALL">All Upgrades</option>
              <option value="CELEBRITY">Celebrity Upgrade</option>
              <option value="AI">AI Premium Upgrade</option>
            </select>
          </div>

          {/* Payment Method filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Gateway Method</label>
            <select 
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full py-2 px-3 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 rounded-xl"
            >
              <option value="ALL">All Gateways</option>
              <option value="FLUTTERWAVE">Flutterwave</option>
              <option value="MANUAL">Manual Payment</option>
            </select>
          </div>

          {/* Plan filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Billing Plan</label>
            <select 
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full py-2 px-3 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 rounded-xl"
            >
              <option value="ALL">All Plans</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Time Period</label>
            <select 
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 rounded-xl"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="YEAR">This Year</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

        </div>

        {/* Custom date boundaries picker */}
        {dateRangeFilter === 'CUSTOM' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-3 bg-slate-950/40 p-4 border border-white/5 rounded-2xl flex-wrap"
          >
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Start Date</span>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg text-xs text-white uppercase"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">End Date</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg text-xs text-white uppercase"
              />
            </div>
          </motion.div>
        )}

      </div>

      {/* Payment List Table Frame */}
      <div className="glass-dark border border-white/5 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center bg-slate-900/10 gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Payment History Inventory List ({filteredPayments.length} matches)</h3>
          <div className="text-[10px] font-bold text-white/40 font-mono tracking-wider">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-primary/25 border-t-primary animate-spin mb-4" />
              <p className="text-[9px] font-black uppercase tracking-widest text-primary animate-pulse">Syncing Payments Desk...</p>
            </div>
          ) : paginatedPayments.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-4">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-white tracking-widest uppercase">No transactions matched your filtering criteria</h4>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-1">Try to clear the active filters or input different search terms.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-[9px] font-black uppercase tracking-widest text-white/40">
                  <th className="py-4 px-6">Transaction ID / Ref</th>
                  <th className="py-4 px-6">Name / Subscriber</th>
                  <th className="py-4 px-6 text-center">Upgrade Tier</th>
                  <th className="py-4 px-6 text-center">Plan</th>
                  <th className="py-4 px-6 text-center">Payment System</th>
                  <th className="py-4 px-6 text-right">Sum Total</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Initiated At</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px] font-medium text-white/80">
                {paginatedPayments.map((p, idx) => {
                  const norm = getNormalized(p);
                  
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Transaction ID & reference */}
                      <td className="py-4 px-6">
                        <div className="font-mono font-black text-white/90 uppercase tracking-wider select-all truncate max-w-[150px]">
                          {norm.transactionId}
                        </div>
                        <div className="text-[9px] font-mono text-white/40 lowercase truncate max-w-[180px] mt-0.5">
                          Ref: {norm.paymentReference}
                        </div>
                      </td>

                      {/* Username details */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-xs truncate max-w-[180px]">
                          {norm.userName}
                        </div>
                        <div className="text-[10px] text-white/40 truncate max-w-[180px] select-all mt-0.5">
                          {norm.userEmail}
                        </div>
                      </td>

                      {/* Upgrade categorise */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          p.upgradeType === 'celebrity' 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {norm.upgradeType}
                        </span>
                      </td>

                      {/* Plan terms */}
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold font-mono tracking-wide">
                          {norm.planType}
                        </span>
                      </td>

                      {/* Payment Methods */}
                      <td className="py-4 px-6 text-center">
                        <span className="font-medium">
                          {norm.paymentMethod}
                        </span>
                      </td>

                      {/* Amount details */}
                      <td className="py-4 px-6 text-right">
                        <div className="font-mono font-black text-white">
                          {norm.currency === 'NGN' ? '₦' : '$'}{norm.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[8px] font-mono tracking-widest uppercase text-white/30">
                          {norm.currency}
                        </div>
                      </td>

                      {/* Status pill badges */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          norm.status === 'PAID' 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : norm.status === 'FAILED'
                            ? 'bg-red-500/15 text-red-500 border border-red-500/20'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                        }`}>
                          {norm.status}
                        </span>
                      </td>

                      {/* Process/Initiate Timestamps */}
                      <td className="py-4 px-6 text-center font-mono text-[10px] text-white/40">
                        {p.createdAt || p.initiatedAt ? new Date(p.createdAt?.seconds ? p.createdAt.seconds * 1000 : p.createdAt || p.initiatedAt).toLocaleDateString() : 'Pending'}
                      </td>

                      {/* Interactive click triggers */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedPayment(p);
                              setAdminNotesText(p.adminNotes || '');
                              setModalOpen(true);
                            }}
                            className="p-2 border border-white/10 hover:border-primary/50 text-white hover:text-primary rounded-xl active:scale-95 transition-all inline-flex items-center justify-center bg-white/5"
                            title="View Transaction Sheet & Notes"
                          >
                            <Eye size={12} />
                          </button>
                          
                          {norm.status === 'UNPAID' && (
                            <>
                              <button 
                                type="button"
                                onClick={() => handleApprovePayment(p, 'Approved directly via quick-action command button')}
                                disabled={actionLoading}
                                className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-white rounded-xl active:scale-95 transition-all inline-flex items-center justify-center disabled:opacity-40"
                                title="Accept Payment & Activate"
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRejectPayment(p)}
                                disabled={actionLoading}
                                className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white rounded-xl active:scale-95 transition-all inline-flex items-center justify-center disabled:opacity-40"
                                title="Decline / Reject Payment"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Flat compact footer navigator */}
        <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center bg-slate-950/20 gap-3">
          <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} overall transactions
          </p>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="py-1.5 px-3 rounded-lg border border-white/10 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 transition-all text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Prev
            </button>
            <div className="px-3 py-1 bg-slate-900 border border-white/5 rounded-lg text-xs font-mono font-bold text-white">
              {currentPage} / {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="py-1.5 px-3 rounded-lg border border-white/10 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 transition-all text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Extended details and Manual Action Dialog Modal */}
      <AnimatePresence>
        {modalOpen && selectedPayment && (() => {
          const norm = getNormalized(selectedPayment);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              >
                
                {/* Modal Title header */}
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-slate-900/25">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transaction Management Sheet</h3>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">Reference Desk ID: {norm.paymentReference}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setModalOpen(false);
                      setSelectedPayment(null);
                    }}
                    className="p-1.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Main Details Block */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  
                  {/* Visual Status Indicator Banner */}
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                    norm.status === 'PAID' 
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                      : norm.status === 'FAILED'
                      ? 'bg-red-500/5 border-red-500/15 text-red-400'
                      : 'bg-amber-500/5 border-amber-500/15 text-amber-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${norm.status === 'PAID' ? 'bg-emerald-500/10' : norm.status === 'FAILED' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        {norm.status === 'PAID' ? <CheckCircle size={18} /> : norm.status === 'FAILED' ? <AlertCircle size={18} /> : <RefreshCw className="animate-spin" size={18} />}
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/50">Current Database Status State</p>
                        <h4 className="text-xs font-black uppercase tracking-widest mt-0.5">{norm.status}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Calculated Fee Paid</p>
                      <h4 className="text-sm font-black text-white font-mono mt-0.5">
                        {norm.currency === 'NGN' ? '₦' : '$'}{norm.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {norm.currency}
                      </h4>
                    </div>
                  </div>

                  {/* Comprehensive metadata matrix block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Transaction Code</span>
                      <p className="font-mono text-white select-all break-all">{norm.transactionId}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Client Reference ID</span>
                      <p className="font-mono text-white select-all break-all">{norm.paymentReference}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Subscriber Username</span>
                      <p className="font-bold text-white uppercase">{norm.userName}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Subscriber Email address</span>
                      <p className="font-mono text-white text-xs select-all break-all">{norm.userEmail}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Subscription Tier</span>
                      <p className="font-bold text-primary font-mono uppercase text-[10px] tracking-wider">{norm.upgradeType}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Billing Terms</span>
                      <p className="font-bold text-white uppercase tracking-wider">{norm.planType}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Activated/Process System</span>
                      <p className="font-bold text-emerald-400 font-mono tracking-wider">{norm.paymentMethod}</p>
                    </div>

                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Created Timeline</span>
                      <p className="font-bold text-white font-mono uppercase">
                        {norm.initiatedAt ? new Date(norm.initiatedAt?.seconds ? norm.initiatedAt.seconds * 1000 : norm.initiatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                  </div>

                  {/* Manual upload screenshot proof viewer */}
                  {norm.rawPaymentMethod === 'manual' && norm.proofOfPayment && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        📋 Uploaded bank deposit screenshot proof:
                      </span>
                      <div className="border border-white/10 bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center p-2 relative group max-h-[300px]">
                        <img 
                          src={norm.proofOfPayment} 
                          alt="screenshot proof of payment text"
                          className="max-h-[250px] object-contain rounded-lg shadow-2xl transition-all brightness-90 group-hover:brightness-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="mt-2 text-center w-full bg-slate-950 py-1.5 rounded-lg">
                          <a 
                            href={norm.proofOfPayment} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-primary font-black uppercase tracking-wider inline-flex items-center gap-1 hover:underline"
                          >
                            <ArrowUpRight size={10} /> View full resolution file
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification system parameters details if Flutterwave response exists */}
                  {selectedPayment.paymentMethod === 'flutterwave' && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">
                        🛡️ Flutterwave verification parameters detail logs:
                      </span>
                      <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 font-mono text-[10px] text-indigo-200/80 max-h-[160px] overflow-y-auto space-y-1 select-all break-all uppercase">
                        <p>REFERENCE: {norm.paymentReference}</p>
                        <p>INTEGRATION GATEWAY: API.FLUTTERWAVE.COM/V3/TRANSACTIONS/VERIFY</p>
                        <p>VERIFICATION ACTION: ENFORCED AUTOMATICALLY</p>
                        {selectedPayment.failureReason && <p className="text-red-400">GATEWAY FAILURE REASON: {selectedPayment.failureReason}</p>}
                      </div>
                    </div>
                  )}

                  {/* Super admin review form controls notes */}
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/50">
                      📝 Super Admin Review Notes & Rejection details
                    </span>
                    <textarea 
                      value={adminNotesText}
                      onChange={(e) => setAdminNotesText(e.target.value)}
                      placeholder="Add transactional details, reason for rejection, validation confirmation notes..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans uppercase tracking-wider"
                    />
                  </div>

                  {/* Error code indicators */}
                  {norm.failureReason && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex gap-2 items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 block">Failure Reason Tracked</span>
                        <p className="font-semibold uppercase font-sans leading-relaxed text-[10px]">{norm.failureReason}</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal actions panel footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-slate-900/20 flex flex-wrap gap-2.5 justify-end">
                  
                  {/* Reject deposit button */}
                  {norm.status === 'UNPAID' && (
                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleRejectPayment(selectedPayment)}
                      className="py-3 px-6 bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-500/15 disabled:opacity-40 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      {actionLoading ? 'Declining...' : 'Decline & Mark Failed'}
                    </button>
                  )}

                  {/* Approve deposit button */}
                  {norm.status === 'UNPAID' && (
                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprovePayment(selectedPayment)}
                      className="py-3 px-6 bg-primary text-black hover:scale-105 disabled:brightness-50 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      {actionLoading ? 'Activating...' : 'Accept & Mark Paid'}
                    </button>
                  )}

                  {/* Standard Dismiss Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setSelectedPayment(null);
                    }}
                    className="py-3 px-5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70"
                  >
                    Close Sheet
                  </button>

                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
