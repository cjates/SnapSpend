import React, { useState, useEffect } from "react";
import { Sparkles, Trash2, Download, RefreshCw, LayoutDashboard, FileText, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { Receipt } from "./types";
import ReceiptScanner from "./components/ReceiptScanner";
import ReceiptDetails from "./components/ReceiptDetails";
import CategoryStats from "./components/CategoryStats";
import HistoryList from "./components/HistoryList";

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [currentScannedData, setCurrentScannedData] = useState<(Omit<Receipt, "id" | "scannedAt"> & { imagePreview?: string }) | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load active session from localStorage to ensure data resilience
  useEffect(() => {
    try {
      const persisted = localStorage.getItem("snapspend_receipts");
      if (persisted) {
        setReceipts(JSON.parse(persisted));
      }
    } catch (e) {
      console.error("Failed to load snapspend persisted state", e);
    }
  }, []);

  // Sync receipts list to localStorage on every update
  const saveReceipts = (updated: Receipt[]) => {
    setReceipts(updated);
    try {
      localStorage.setItem("snapspend_receipts", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist snapspend state", e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleScanComplete = (extracted: any) => {
    setCurrentScannedData(extracted);
    setIsScanning(false);
    showToast("Receipt parsed successfully! Please review the details.");
  };

  const handleApproveReceipt = (approved: Omit<Receipt, "id" | "scannedAt">) => {
    const newReceipt: Receipt = {
      ...approved,
      id: "rcpt_" + Math.random().toString(36).substr(2, 9),
      scannedAt: new Date().toISOString()
    };
    const updated = [newReceipt, ...receipts];
    saveReceipts(updated);
    setCurrentScannedData(null);
    showToast(`Added receipt from ${approved.merchant} to your report.`);
  };

  const handleDeleteReceipt = (id: string) => {
    const merchantName = receipts.find(r => r.id === id)?.merchant || "Receipt";
    const updated = receipts.filter((r) => r.id !== id);
    saveReceipts(updated);
    showToast(`Removed receipt from ${merchantName}.`);
  };

  const handleResetSession = () => {
    if (window.confirm("Are you sure you want to clear your active spending report and start a brand-new session?")) {
      saveReceipts([]);
      setCurrentScannedData(null);
      showToast("Session reset. Start scanning fresh receipts!");
    }
  };

  // Generate a clean summary text representing the full expense report
  const handleExportTextSummary = () => {
    const total = receipts.reduce((sum, r) => sum + r.total, 0);
    const tax = receipts.reduce((sum, r) => sum + r.tax, 0);
    const categoryTotals: Record<string, number> = {};
    receipts.forEach(r => {
      categoryTotals[r.category] = Number(((categoryTotals[r.category] || 0) + r.total).toFixed(2));
    });

    let summary = `=========================================\n`;
    summary += `       SNAPSPEND EXPENSE REPORT          \n`;
    summary += `=========================================\n`;
    summary += `Generated: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}\n`;
    summary += `Total scanned receipts: ${receipts.length}\n`;
    summary += `Grand Total Spend: $${total.toFixed(2)}\n`;
    summary += `Total Estimated Tax: $${tax.toFixed(2)}\n\n`;
    
    summary += `SPENDING BY CATEGORY:\n`;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      summary += `- ${cat.toUpperCase()}: $${amt.toFixed(2)}\n`;
    });
    summary += `\n`;

    summary += `ITEMIZED TRANSACTION LOG:\n`;
    receipts.forEach((r, idx) => {
      summary += `${idx + 1}. [${r.date}] ${r.merchant} (${r.category.toUpperCase()}) - $${r.total.toFixed(2)} [Tax: $${r.tax.toFixed(2)}]\n`;
      r.lineItems.forEach(i => {
        summary += `   • ${i.name} - $${i.price.toFixed(2)} (Qty: ${i.quantity || 1})\n`;
      });
    });
    summary += `\n=========================================\n`;
    summary += `Thank you for using SnapSpend!`;

    // Download compiled text as string attachment
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SnapSpend_Report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded expense report as TXT summary!");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-800" id="app-root-container">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-lg flex items-center gap-3 border border-slate-850 animate-slide-up text-xs font-semibold" id="status-toast">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Bar / Header */}
      <header className="bg-white border-b border-slate-250 sticky top-0 z-40" id="app-main-header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-xs" id="app-logo">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900" id="app-brand-name">
                SnapSpend
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase">
                📱 camera-to-expense mobile assistant
              </p>
            </div>
          </div>

          {/* Connected environment tags & actions */}
          <div className="flex items-center gap-4" id="header-action-panel">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-semibold font-mono rounded-md border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
              Gemini Vision Ready
            </span>

            {receipts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTextSummary}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm cursor-pointer transition"
                  id="export-report-btn"
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" /> Export Report
                </button>
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50/20 cursor-pointer transition text-xs border border-slate-200"
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
          <div className="max-w-5xl mx-auto space-y-4" id="review-active-grid">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <AlertCircle className="w-4 h-4 text-slate-900 shrink-0" />
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
          /* Normal state: Scanner on top/left, analytics/journal below */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="main-working-grid">
            {/* Left and central workspace */}
            <div className="lg:col-span-8 space-y-8" id="workspace-lhs">
              
              <ReceiptScanner
                onScanComplete={handleScanComplete}
                isScanning={isScanning}
                setIsScanning={setIsScanning}
              />

              <HistoryList
                receipts={receipts}
                onDelete={handleDeleteReceipt}
              />
            </div>

            {/* Right-hand side aggregation stats */}
            <div className="lg:col-span-4" id="workspace-rhs">
              <div className="sticky top-24" id="sticky-rhs-container">
                <CategoryStats receipts={receipts} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="max-w-7xl mx-auto px-6 sm:px-8 text-center text-xs text-slate-400 pt-12 border-t border-slate-200" id="main-footer">
        <p>© {new Date().getFullYear()} SnapSpend • Intelligent Mobile Expense Assistant.</p>
        <p className="mt-1 text-[10px] font-mono">
          Model alias: <strong>models/gemini-3.5-flash</strong> • Built with Antigravity Agent Platform
        </p>
      </footer>
    </div>
  );
}
