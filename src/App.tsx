import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Trash2, 
  Download, 
  RefreshCw, 
  LayoutDashboard, 
  FileText, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Cloud, 
  CloudOff, 
  LogIn, 
  User as UserIcon, 
  LogOut,
  Camera,
  DollarSign
} from "lucide-react";
import { Receipt, ExpenseCategory } from "./types";
import ReceiptScanner from "./components/ReceiptScanner";
import ReceiptDetails from "./components/ReceiptDetails";
import CategoryStats from "./components/CategoryStats";
import HistoryList from "./components/HistoryList";
import AuthModal from "./components/AuthModal";
import ShareModal from "./components/ShareModal";
import FinancialBuddy from "./components/FinancialBuddy";
import { auth } from "./lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { 
  dbSaveReceipt, 
  dbDeleteReceipt, 
  dbFetchReceipts, 
  dbSaveBudgets, 
  dbFetchBudgets 
} from "./lib/db";

const DEFAULT_BUDGETS: Record<ExpenseCategory, number> = {
  groceries: 200,
  dining: 150,
  transport: 100,
  shopping: 150,
  utilities: 155,
  entertainment: 100,
  other: 80
};

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [budgets, setBudgets] = useState<Record<ExpenseCategory, number>>(DEFAULT_BUDGETS);
  const [currentScannedData, setCurrentScannedData] = useState<(Omit<Receipt, "id" | "scannedAt"> & { imagePreview?: string }) | null>(null);
  
  // App modals & notification toggles
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);

  // User auth state tracking
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Cross-origin iframe cookie detection state for mobile devices
  const [isIframeMobile, setIsIframeMobile] = useState(false);

  useEffect(() => {
    try {
      const isIframe = window.self !== window.top;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isIframe && isMobile) {
        setIsIframeMobile(true);
      }
    } catch (e) {
      // If parent context blocks window.self querying, assume encapsulated iframe context
      setIsIframeMobile(true);
    }
  }, []);

  // Listen to Auth State Updates
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingCloud(true);
      if (user) {
        setCurrentUser(user);
        try {
          // Fetch Cloud Data
          const cloudReceipts = await dbFetchReceipts(user.uid);
          const cloudBudgets = await dbFetchBudgets(user.uid);

          // Silent Local Merger: check local storage items
          const localString = localStorage.getItem("snapspend_receipts");
          const localBudgetsString = localStorage.getItem("snapspend_budgets");

          let finalReceipts = [...cloudReceipts];
          if (localString) {
            const localReceipts = JSON.parse(localString) as Receipt[];
            const unsynced = localReceipts.filter(lr => !cloudReceipts.some(cr => cr.id === lr.id));
            if (unsynced.length > 0) {
              // Upload unsynced local receipts to cloud
              for (const rc of unsynced) {
                await dbSaveReceipt(user.uid, rc);
              }
              finalReceipts = [...unsynced, ...finalReceipts];
            }
          }

          let finalBudgets = cloudBudgets || DEFAULT_BUDGETS;
          if (!cloudBudgets && localBudgetsString) {
            finalBudgets = JSON.parse(localBudgetsString);
            await dbSaveBudgets(user.uid, finalBudgets);
          }

          setReceipts(finalReceipts);
          setBudgets(finalBudgets);
          
          localStorage.setItem("snapspend_receipts", JSON.stringify(finalReceipts));
          localStorage.setItem("snapspend_budgets", JSON.stringify(finalBudgets));
          showToast(`Synced cloud account ${user.email} successfully.`);
        } catch (e) {
          console.error("Failed to sync cloud data for user:", e);
          showToast("Cloud sync failed. Operating offline.");
        }
      } else {
        // Logged Out Sequence
        setCurrentUser(null);
        try {
          const localRec = localStorage.getItem("snapspend_receipts");
          const localBud = localStorage.getItem("snapspend_budgets");
          
          if (localRec) setReceipts(JSON.parse(localRec));
          else setReceipts([]);

          if (localBud) setBudgets(JSON.parse(localBud));
          else setBudgets(DEFAULT_BUDGETS);
        } catch (e) {
          console.error("Local recovery error:", e);
        }
      }
      setLoadingCloud(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleScanComplete = (extracted: any) => {
    setCurrentScannedData(extracted);
    setIsScanning(false);
    showToast("Receipt parsed successfully! Please review the details.");
  };

  // Save Receipts and keep cloud database & localStorage synced
  const handleApproveReceipt = async (approved: Omit<Receipt, "id" | "scannedAt">) => {
    const newReceipt: Receipt = {
      ...approved,
      id: "rcpt_" + Math.random().toString(36).substr(2, 9),
      scannedAt: new Date().toISOString()
    };
    
    const updated = [newReceipt, ...receipts];
    setReceipts(updated);
    localStorage.setItem("snapspend_receipts", JSON.stringify(updated));

    if (currentUser) {
      try {
        await dbSaveReceipt(currentUser.uid, newReceipt);
      } catch (err) {
        showToast("Logged receipt offline. Will retry cloud sync.");
      }
    }

    setCurrentScannedData(null);
    showToast(`Added receipt from ${approved.merchant} to your report.`);
  };

  const handleDeleteReceipt = async (id: string) => {
    const merchantName = receipts.find(r => r.id === id)?.merchant || "Receipt";
    const updated = receipts.filter((r) => r.id !== id);
    setReceipts(updated);
    localStorage.setItem("snapspend_receipts", JSON.stringify(updated));

    if (currentUser) {
      try {
        await dbDeleteReceipt(currentUser.uid, id);
      } catch (err) {
        showToast("Error removing on cloud. Deleted locally.");
      }
    }
    showToast(`Removed receipt from ${merchantName}.`);
  };

  const handleUpdateBudget = async (category: ExpenseCategory, amount: number) => {
    const updatedBudgets = {
      ...budgets,
      [category]: amount
    };
    setBudgets(updatedBudgets);
    localStorage.setItem("snapspend_budgets", JSON.stringify(updatedBudgets));

    if (currentUser) {
      try {
        await dbSaveBudgets(currentUser.uid, updatedBudgets);
      } catch (err) {
        console.error("Failed to sync updated budget to Firestore:", err);
      }
    }
  };

  const handleResetSession = async () => {
    if (window.confirm("Are you sure you want to clear your active spending report and start a brand-new session?")) {
      setReceipts([]);
      localStorage.setItem("snapspend_receipts", JSON.stringify([]));

      if (currentUser) {
        try {
          // Cleans cloud receipts logs
          for (const r of receipts) {
            await dbDeleteReceipt(currentUser.uid, r.id);
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      setCurrentScannedData(null);
      showToast("Session reset. Start scanning fresh receipts!");
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Sign out of SnapSpend Cloud? Offline local progress is retained.")) {
      try {
        await signOut(auth);
        showToast("Signed out. Operating in guest sandbox.");
      } catch (err) {
        showToast("Sign out unsuccessful.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-800" id="app-root-container">
      {/* Mobile Standalone View Suggestion Banner */}
      {isIframeMobile && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 text-center text-xs font-bold flex flex-wrap items-center justify-center gap-2 relative z-50 border-b border-emerald-600 shadow-md animate-fade-in" id="iframe-mobile-cookies-banner">
          <span>🚀 Open in a Standalone Tab for direct, full-screen smartphone and camera access!</span>
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline text-slate-950 hover:text-black transition duration-150 inline-flex items-center gap-1 bg-white/30 hover:bg-white/40 px-2.5 py-1 rounded text-[11px] font-extrabold shadow-sm"
          >
            Launch Standalone ↗
          </a>
        </div>
      )}

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-3 border border-slate-850 animate-slide-up text-xs font-semibold animate-fade-in" id="status-toast">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Bar / Header */}
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-40" id="app-main-header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 relative shadow-md border border-slate-705 overflow-hidden select-none" id="app-logo">
              {/* Blue/emerald dollar sign integrated behind */}
              <span className="absolute text-emerald-400 font-extrabold text-2xl tracking-normal pointer-events-none font-mono opacity-40 z-0 select-none">
                $
              </span>
              {/* White camera on top */}
              <Camera className="w-4.5 h-4.5 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight" id="app-brand-name">
                SnapSpend
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase leading-none mt-0.5">
                📱 camera-to-expense mobile assistant
              </p>
            </div>
          </div>

          {/* Connected environment tags & authentication controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto" id="header-action-panel">
            <div className="flex items-center gap-2">
              {currentUser ? (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-emerald-400 text-[10px] font-mono rounded-md border border-slate-700 animate-fade-in">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  Synced
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] font-mono rounded-md border border-slate-700 animate-fade-in">
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  Offline Sandbox
                </span>
              )}

              {/* Account Interaction Interface Badge */}
              {loadingCloud ? (
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-white rounded-full animate-spin" />
              ) : currentUser ? (
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 p-1 pl-2.5 rounded-lg text-xs font-medium animate-fade-in" id="header-user-badge">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[120px] truncate text-[11px] font-semibold text-slate-200">
                    {currentUser.email?.split("@")[0]}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="p-1 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 rounded-md transition cursor-pointer"
                    title="Sign Out"
                    id="signout-trigger-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 border border-slate-700 hover:border-emerald-400 text-slate-200 hover:text-white bg-slate-800 font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  id="login-modal-trigger"
                >
                  <LogIn className="w-3.5 h-3.5" /> Cloud Sync
                </button>
              )}
            </div>

            {/* General Export Actions */}
            {receipts.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-sm cursor-pointer transition flex items-center gap-1"
                  id="export-report-btn"
                >
                  <Download className="w-3.5 h-3.5" /> 
                  <span>Share Report</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="p-2 text-emerald-400 hover:text-rose-400 rounded-md bg-[#132c20]/50 hover:bg-rose-950/20 cursor-pointer transition text-xs border border-[#1c382a]"
                  title="Reset session journal"
                  id="header-reset-btn"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Primary body view */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8" id="layout-main-panel">
        {/* If review state is active, render verification table */}
        {currentScannedData ? (
          <div className="max-w-5xl mx-auto space-y-4 animate-fade-in" id="review-active-grid">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-100 bg-slate-900 p-4 rounded-xl border border-slate-850 shadow-lg">
              <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>We extracted the receipt details below! Review the itemized breakdown before approving it.</span>
            </div>
            
            <ReceiptDetails
              scannedData={currentScannedData}
              onApprove={handleApproveReceipt}
              onCancel={() => {
                setCurrentScannedData(null);
                showToast("Scanning canceled.");
              }}
            />
          </div>
        ) : (
          /* Normal state: Scanner and stats side-by-side, journal at bottom */
          <div className="space-y-8 animate-fade-in" id="main-working-grid-wrapper">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="main-working-grid">
              {/* Left and central workspace */}
              <div className="lg:col-span-8 space-y-8" id="workspace-lhs">
                <ReceiptScanner
                  onScanComplete={handleScanComplete}
                  isScanning={isScanning}
                  setIsScanning={setIsScanning}
                />
              </div>

              {/* Right-hand side aggregation stats */}
              <div className="lg:col-span-4" id="workspace-rhs">
                <div className="sticky top-24" id="sticky-rhs-container">
                  <CategoryStats 
                    receipts={receipts} 
                    budgets={budgets}
                    onUpdateBudget={handleUpdateBudget}
                  />
                </div>
              </div>
            </div>

            {/* All Scans History at the bottom */}
            <div id="workspace-bottom">
              <HistoryList
                receipts={receipts}
                onDelete={handleDeleteReceipt}
              />
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal Component */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* Share / Export Modal Component */}
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        receipts={receipts}
        showToast={showToast}
      />

      {/* Styled Footer */}
      <footer className="max-w-7xl mx-auto px-6 sm:px-8 text-center text-xs text-slate-450 pt-12 border-t border-slate-200" id="main-footer">
        <p>© {new Date().getFullYear()} SnapSpend • Intelligent Mobile Expense Assistant.</p>
        <p className="mt-1 text-[10px] font-mono">
          Model alias: <strong className="text-slate-600">models/gemini-3.5-flash</strong> • Built with Antigravity Agent Platform
        </p>
      </footer>

      {/* Floating Sparkle Financial AI Assistant Coach */}
      <FinancialBuddy receipts={receipts} budgets={budgets} />
    </div>
  );
}
