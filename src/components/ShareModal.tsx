import React, { useRef } from "react";
import { X, Mail, MessageSquare, Clipboard, FileSpreadsheet, Printer, Check, Copy } from "lucide-react";
import { Receipt } from "../types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: Receipt[];
  showToast: (msg: string) => void;
}

export default function ShareModal({ isOpen, onClose, receipts, showToast }: ShareModalProps) {
  const [copied, setCopied] = React.useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  if (!isOpen) return null;

  const total = receipts.reduce((sum, r) => sum + r.total, 0);
  const tax = receipts.reduce((sum, r) => sum + r.tax, 0);

  // Group by category to output in reports
  const categoryTotals: Record<string, number> = {};
  receipts.forEach(r => {
    categoryTotals[r.category] = Number(((categoryTotals[r.category] || 0) + r.total).toFixed(2));
  });

  // 1. Generate Markdown/Text representation of the report
  const generateTextSummary = () => {
    let text = `=========================================\n`;
    text += `       SNAPSPEND EXPENSE AUDIT           \n`;
    text += `=========================================\n`;
    text += `Generated: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}\n`;
    text += `Receipt count: ${receipts.length} scanned records\n`;
    text += `Total Outflow: $${total.toFixed(2)}\n`;
    text += `Estimated Tax: $${tax.toFixed(2)}\n\n`;
    
    text += `AGGREGATED CATEGORY METRICS:\n`;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      text += `- ${cat.toUpperCase()}: $${amt.toFixed(2)}\n`;
    });
    text += `\n`;

    text += `ITEMIZED TRANSACTION LIST:\n`;
    receipts.forEach((r, idx) => {
      text += `${idx + 1}. [${r.date}] ${r.merchant} (${r.category.toUpperCase()}) - $${r.total.toFixed(2)}\n`;
    });
    text += `=========================================\n`;
    text += `Drafted securely with SnapSpend AI\n`;
    return text;
  };

  const handleCopyClipboard = () => {
    try {
      navigator.clipboard.writeText(generateTextSummary());
      setCopied(true);
      showToast("Report text copied! Paste it in SMS, Slack, or any messaging app.");
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      showToast("Unable to copy automatically. Please select text manually.");
    }
  };

  // 2. Email pre-filled layout prepped via mailto
  const handleShareEmail = () => {
    const subject = encodeURIComponent(`SnapSpend Expense Summary - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(generateTextSummary());
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    showToast("Opened your local email compiler.");
  };

  // 3. Sharing via web intent or copying to clipboard
  const handleShareMessaging = () => {
    const text = encodeURIComponent(`SnapSpend Expense Summary: ${receipts.length} receipts scanned. Total: $${total.toFixed(2)}. http://ai.studio/build`);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${text}`;
    window.open(whatsappUrl, "_blank");
    showToast("Redirected to Whatsapp summary share.");
  };

  // 4. Exporting as CSV
  const handleExportCSV = () => {
    let csv = "Date,Merchant,Category,Items_Count,Tax,Total\n";
    receipts.forEach(r => {
      // Escape commas in merchants
      const escapedMerchant = r.merchant.includes(",") ? `"${r.merchant}"` : r.merchant;
      csv += `${r.date},${escapedMerchant},${r.category},${r.lineItems.length},${r.tax.toFixed(2)},${r.total.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SnapSpend_Outflow_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV sheet downloaded successfully!");
  };

  // 5. PDF generation by feeding printable styled html layout to print Frame
  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blocker enabled. Please allow popups or use Copy Report.");
      return;
    }

    let itemsHtml = "";
    receipts.forEach((r, idx) => {
      itemsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 11px;">${r.date}</td>
          <td style="padding: 10px; font-size: 11px; font-weight: bold;">${r.merchant}</td>
          <td style="padding: 10px; font-size: 11px; text-transform: capitalize;">${r.category}</td>
          <td style="padding: 10px; font-size: 11px;">${r.lineItems.length} lines</td>
          <td style="padding: 10px; font-size: 11px; font-family: monospace;">$${r.tax.toFixed(2)}</td>
          <td style="padding: 10px; font-size: 11px; font-family: monospace; font-weight: bold;">$${r.total.toFixed(2)}</td>
        </tr>
      `;
    });

    let categoriesHtml = "";
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      categoriesHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
          <span style="text-transform: capitalize; color: #4a5568;">${cat}:</span>
          <strong style="font-family: monospace;">$${amt.toFixed(2)}</strong>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>SnapSpend Expense Report - Printed Summary</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a202c; line-height: 1.5; }
            .header { border-bottom: 2px solid #2d3748; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta { font-size: 11px; color: #718096; margin-top: 4px; font-family: monospace; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .card { background: #f7fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #718096; margin-bottom: 10px; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; }
            .stat-val { font-size: 22px; font-weight: bold; margin: 5px 0; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background: #f7fafc; padding: 10px; font-size: 10px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #edf2f7; }
            .footer { border-top: 1px solid #edf2f7; margin-top: 40px; padding-top: 10px; font-size: 9px; color: #a0aec0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SnapSpend expense audit</h1>
            <div class="meta">Captured via SnapSpend platform on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Outflow Summary</div>
              <div style="font-size: 11px; color: #4a5568;">Grand Total Outflow:</div>
              <div class="stat-val">$${total.toFixed(2)}</div>
              <div style="font-size: 11px; color: #718096; margin-top: 4px;">For ${receipts.length} recorded paper scans</div>
            </div>
            <div class="card">
              <div class="card-title">Category Outlays</div>
              ${categoriesHtml}
            </div>
          </div>

          <h3 style="font-size: 12px; text-transform: uppercase; color: #4a5568; letter-spacing: 0.5px; margin-bottom: 8px;">Scanned journal</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Breakdown</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="footer">
            SnapSpend • Intelligent Mobile Expense Assistant • Prepared securely by user.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="share-modal-container">
      {/* Semi-transparent overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300" 
      />

      <div 
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 overflow-hidden z-10 animate-fade-in text-slate-800"
        id="share-dialog-card"
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 transition p-1 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            Share & Export Reports
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch, download, or copy parsed spending records across common formats and clients.
          </p>
        </div>

        {/* Selected receipts quick tally metrics info */}
        <div className="p-3.5 bg-slate-55 border border-slate-200 rounded-lg flex justify-between items-center mb-6 font-sans">
          <div>
            <span className="text-[10px] text-slate-430 font-bold uppercase tracking-wider block">Currently selected</span>
            <span className="text-xs text-slate-800 font-semibold">{receipts.length} scans parsed</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-430 font-bold uppercase tracking-wider block">Grand Total</span>
            <span className="text-sm font-mono font-bold text-slate-950">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Sharing Options Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="sharing-actions-grid">
          {/* Format: CSV export */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:underline">Export CSV Table</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Compatible with Excel & Sheets</span>
            </div>
          </button>

          {/* Format: Print / PDF save */}
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:underline">Print / Save PDF</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Formatted printable invoice audit</span>
            </div>
          </button>

          {/* Format: Copy report text */}
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 bg-purple-50 border border-purple-100 rounded-lg text-purple-600 flex items-center justify-center shrink-0">
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Clipboard className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:underline">
                {copied ? "Copied Report!" : "Copy Text Summary"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Instant copying for SMS/Slack</span>
            </div>
          </button>

          {/* Format: Share via Email */}
          <button
            type="button"
            onClick={handleShareEmail}
            className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:underline">Share via Email</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Pre-fills native default compiler</span>
            </div>
          </button>

          {/* WhatsApp / Messaging Share */}
          <button
            type="button"
            onClick={handleShareMessaging}
            className="sm:col-span-2 flex items-center gap-3 p-4 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold block group-hover:underline">Share Instant Messaging link</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Fires up Whatsapp web sharing interface</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
