import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, Trash2, Calendar, Coffee, ShoppingBag, Car, Tag, Film, Receipt, CircleEllipsis, ExternalLink, Filter } from "lucide-react";
import { Receipt as ReceiptType, ExpenseCategory } from "../types";

interface HistoryListProps {
  receipts: ReceiptType[];
  onDelete: (id: string) => void;
}

const CATEGORIES: { value: ExpenseCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "groceries", label: "Groceries" },
  { value: "dining", label: "Dining" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "utilities", label: "Utilities" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" }
];

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  groceries: ShoppingBag,
  dining: Coffee,
  transport: Car,
  shopping: Tag,
  utilities: CircleEllipsis,
  entertainment: Film,
  other: Receipt
};

export default function HistoryList({ receipts, onDelete }: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "all">("all");
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedReceiptId(expandedReceiptId === id ? null : id);
  };

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          receipt.lineItems.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || receipt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6" id="history-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight" id="history-header">
            All Scans
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Running log of all captured receipts and spending details.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2" id="history-filter-toolbar">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition font-sans"
              placeholder="Search merchant or items..."
              id="search-receipts"
            />
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition font-medium capitalize"
              id="search-category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-slate-400" id="history-empty">
          <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-sans font-medium text-slate-800">
            {searchTerm || selectedCategory !== "all" ? "No matching scans found" : "No receipt scans aggregated"}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== "all" 
              ? "Try adjusting your search filters or scan category filters." 
              : "Locate or capture a paper receipt above using your phone's camera, or try a preset template."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 animate-fade-in" id="receipts-journal-list">
          {filteredReceipts.map((receipt) => {
            const IconComponent = CATEGORY_ICONS[receipt.category] || Receipt;
            const isExpanded = expandedReceiptId === receipt.id;

            return (
              <div 
                key={receipt.id}
                className="border border-slate-200 hover:border-slate-300 bg-white rounded-xl overflow-hidden transition-all shadow-3xs"
                id={`receipt-item-${receipt.id}`}
              >
                {/* Header bar of the item in the list */}
                <div 
                  onClick={() => toggleExpand(receipt.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/30 transition-colors"
                  id={`receipt-header-trigger-${receipt.id}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-2w0 text-slate-600 flex items-center justify-center shrink-0">
                      <IconComponent className="w-5 h-5 text-slate-600" />
                    </div>
                    
                    <div className="min-w-0 font-sans">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {receipt.merchant}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-300" /> {receipt.date}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{receipt.category}</span>
                        {receipt.mode === "api" && (
                          <span className="text-slate-800 bg-slate-100 px-1.5 py-0.25 rounded text-[9px] font-bold tracking-wide border border-slate-200">
                            live ocr
                          </span>
                        )}
                        {receipt.mode === "preset" && (
                          <span className="text-slate-800 bg-slate-100 px-1.5 py-0.25 rounded text-[9px] font-bold tracking-wide border border-slate-200">
                            demo
                          </span>
                        )}
                        {receipt.mode === "mock" && (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.25 rounded text-[9px] font-bold tracking-wide border border-amber-100 animate-pulse">
                            simulated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-sans">
                      <p className="text-sm font-bold text-slate-900 font-mono">
                        ${receipt.total.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {receipt.lineItems.length} lines
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}
                        className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50/30 transition cursor-pointer"
                        title="Delete record"
                        id={`delete-history-${receipt.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Itemized View */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/30 px-4 py-5 space-y-4" id={`expanded-inner-${receipt.id}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                          Itemized Lines
                        </span>
                        
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                          <div className="divide-y divide-slate-100">
                            {receipt.lineItems.map((item, idx) => (
                              <div key={idx} className="p-2.5 flex items-center justify-between gap-4 text-slate-700">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">{item.name}</span>
                                  {item.category && (
                                    <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded w-max mt-0.5 capitalize font-semibold">
                                      {item.category}
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-slate-400 shrink-0">
                                  {item.quantity && item.quantity > 1 ? `${item.quantity} × ` : ""}
                                  <strong className="text-slate-900">${item.price.toFixed(2)}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-slate-50/50 p-2.5 flex justify-between font-mono text-slate-500 text-[11px] border-t border-slate-200">
                            <span>Subtotal:</span>
                            <span>${receipt.lineItems.reduce((acc, item) => acc + (item.price * (item.quantity ?? 1)), 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-slate-50/50 p-2.5 flex justify-between font-mono text-slate-500 text-[11px]">
                            <span>Tax:</span>
                            <span>${receipt.tax.toFixed(2)}</span>
                          </div>
                          <div className="p-2.5 flex justify-between font-mono text-slate-900 font-bold text-xs border-t border-slate-200 bg-slate-100">
                            <span>Grand Total:</span>
                            <span>${receipt.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual snap screenshot details */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                          Image Attachment
                        </span>
                        {receipt.imageUrl ? (
                          <div className="relative inline-block overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <img 
                              src={receipt.imageUrl} 
                              alt="Paper Receipt Scan" 
                              referrerPolicy="no-referrer"
                              className="max-h-[140px] max-w-full object-contain mx-auto transition hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="p-5 text-center bg-slate-50/50 border border-dashed border-slate-250 rounded-lg text-[11px] text-slate-400">
                            No camera attachment stored. Loaded using static preset simulator.
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 italic font-mono mt-1">
                          Captured {new Date(receipt.scannedAt).toLocaleTimeString()} on desktop/mobile shell
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
