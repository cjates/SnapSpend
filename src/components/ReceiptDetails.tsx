import React, { useState, useEffect } from "react";
import { Edit2, Plus, Trash2, Check, AlertTriangle, Sparkles, Image as ImageIcon, Calendar, ShoppingBag } from "lucide-react";
import { Receipt, LineItem, ExpenseCategory } from "../types";

interface ReceiptDetailsProps {
  scannedData: Omit<Receipt, "id" | "scannedAt"> & { imagePreview?: string };
  onApprove: (data: Omit<Receipt, "id" | "scannedAt">) => void;
  onCancel: () => void;
}

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: "groceries", label: "Groceries", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { value: "dining", label: "Dining", color: "bg-orange-50 text-orange-700 border-orange-100" },
  { value: "transport", label: "Transport", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { value: "shopping", label: "Shopping", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { value: "utilities", label: "Utilities", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { value: "entertainment", label: "Entertainment", color: "bg-rose-50 text-rose-700 border-rose-100" },
  { value: "other", label: "Other", color: "bg-gray-50 text-gray-700 border-gray-100" }
];

export default function ReceiptDetails({ scannedData, onApprove, onCancel }: ReceiptDetailsProps) {
  const [merchant, setMerchant] = useState(scannedData.merchant);
  const [date, setDate] = useState(scannedData.date);
  const [category, setCategory] = useState<ExpenseCategory>(scannedData.category);
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    return (scannedData.lineItems || []).map((item) => {
      const isNameEmptyOrUnknown = !item.name || 
        item.name.trim() === "" || 
        item.name.toLowerCase() === "unknown" || 
        item.name.toLowerCase() === "item" || 
        item.name.toLowerCase() === "unknown item";
      
      return {
        ...item,
        name: isNameEmptyOrUnknown ? "Unknown Item" : item.name
      };
    });
  });
  const [tax, setTax] = useState<number>(scannedData.tax);
  const [total, setTotal] = useState<number>(scannedData.total);
  const [imagePreview] = useState(scannedData.imagePreview);
  const [warning, setWarning] = useState<string | null>(null);

  // Check if any items are unknown items
  const hasUnknownItems = lineItems.some(
    (item) => !item.name || 
              item.name.trim() === "" || 
              item.name.toLowerCase() === "unknown" || 
              item.name.toLowerCase() === "unknown item"
  );

  // Cross-verify sum of items matches the parsed grand total
  useEffect(() => {
    const calculatedSubtotal = lineItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    const expectedSum = Number((calculatedSubtotal + Number(tax)).toFixed(2));
    if (Math.abs(expectedSum - Number(total)) > 0.1) {
      setWarning(`Item subtotal (${calculatedSubtotal.toFixed(2)}) + Tax (${tax.toFixed(2)}) = ${expectedSum.toFixed(2)}. This slightly differs from the receipt's absolute Total (${total.toFixed(2)}).`);
    } else {
      setWarning(null);
    }
  }, [lineItems, tax, total]);

  const handleUpdateItem = (index: number, field: keyof LineItem, val: string | number) => {
    const updated = [...lineItems];
    if (field === "price") {
      updated[index][field] = Number(val);
    } else if (field === "quantity") {
      updated[index][field] = Number(val) || 1;
    } else {
      updated[index][field] = val as any;
    }
    setLineItems(updated);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { name: "New Item", price: 0.00, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleAutoCalcTotal = () => {
    const itemSums = lineItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
    setTotal(Number((itemSums + Number(tax)).toFixed(2)));
  };

  const handleSave = () => {
    onApprove({
      merchant: merchant.trim() || "Unknown Vendor",
      date: date || new Date().toISOString().split("T")[0],
      category,
      lineItems,
      tax: Number(tax) || 0,
      total: Number(total) || 0,
      imageUrl: imagePreview,
      mode: scannedData.mode
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-8 animate-fade-in" id="details-editor">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800">
              <Sparkles className="w-3 h-3 text-slate-900" /> parsed raw data
            </span>
            {scannedData.mode === "mock" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
                ⚠️ SIMULATED SCAN
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1" id="details-header-title">
            2. Verify & Approve Parsing
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Check the extracted lines below. You can adjust prices, correct merchant errors, or switch category codes.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            id="cancel-details-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-md text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            id="approve-details-btn"
          >
            <Check className="w-4 h-4" /> Approve & Save
          </button>
        </div>
      </div>

      {scannedData.mode === "mock" && (
        <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-xs space-y-1" id="api-key-warning">
          <p className="font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Local Intelligence Mode
          </p>
          <p>
            Your receipt was parsed using an offline simulation model. To connect live Gemini 3.5-Flash camera eyes, paste your real API key in the **Settings &gt; Secrets** tab in AI Studio.
          </p>
        </div>
      )}

      {hasUnknownItems && (
        <div className="p-4 bg-indigo-50 border border-indigo-150 text-indigo-900 rounded-xl text-xs flex items-start gap-3.5 shadow-xs animate-fade-in" id="unknown-item-warning-banner">
          <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-indigo-950 uppercase tracking-wide">⚠️ Unknown Item Detected in Receipt</p>
            <p className="leading-relaxed font-semibold text-indigo-800">
              One or more items on your receipt has an unrecognized or unknown title. We loaded them as &quot;Unknown Item&quot; but kept the category and amount exactly as scanned. Please alter any names as you choose before saving!
            </p>
          </div>
        </div>
      )}

      {/* Grid container: Receipt info on left, photo on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="scanned-grid-split">
        {/* Invoice configuration pane */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Merchant / Store
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition font-medium"
                placeholder="Merchant Name"
                id="edit-merchant"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Transaction Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition font-medium"
                  id="edit-date"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Budget Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition font-medium capitalize"
                id="edit-category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                Itemized Breakdown
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                id="add-item-row"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in" id="items-table-wrapper">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4 w-[140px]">Category Override</th>
                    <th className="py-3 px-4 w-18 text-center">Qty</th>
                    <th className="py-3 px-4 w-28 text-right">Price</th>
                    <th className="py-3 px-4 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs shadow-inner">
                        No items added yet. Click &quot;Add Item&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, idx) => {
                      const isItemUnknown = !item.name || 
                        item.name.trim() === "" || 
                        item.name.toLowerCase() === "unknown" || 
                        item.name.toLowerCase() === "unknown item";

                      return (
                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isItemUnknown ? "bg-indigo-50/10" : ""}`}>
                          <td className="py-2 px-4">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                                className={`w-full px-2 py-1.5 focus:bg-white border outline-none rounded-lg text-sm transition ${
                                  isItemUnknown 
                                    ? "border-indigo-200 bg-indigo-50/40 text-indigo-950 font-bold placeholder-indigo-300" 
                                    : "border-transparent focus:border-slate-200 text-slate-800 font-medium"
                                }`}
                                placeholder="Item description"
                                id={`item-name-${idx}`}
                              />
                              {isItemUnknown && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1 rounded uppercase tracking-wider scale-90 pointer-events-none">
                                  please edit
                                </span>
                              )}
                            </div>
                          </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.category || ""}
                            onChange={(e) => handleUpdateItem(idx, "category", e.target.value as ExpenseCategory)}
                            className="w-full px-2 py-1.5 bg-slate-50/70 hover:bg-white border border-slate-200 focus:border-slate-800 outline-none rounded-lg text-xs capitalize text-slate-700 transition font-medium cursor-pointer"
                            id={`item-category-${idx}`}
                          >
                            <option value="">-- Use Main --</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity || 1}
                            onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                            className="w-12 mx-auto px-1 py-1.5 focus:bg-white text-center border border-transparent focus:border-slate-200 outline-none rounded-lg text-sm text-slate-700 transition font-mono"
                            id={`item-qty-${idx}`}
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <div className="relative flex items-center justify-end">
                            <span className="text-slate-400 text-xs absolute left-2 font-mono">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(idx, "price", e.target.value)}
                              className="w-24 pl-5 pr-2 py-1.5 focus:bg-white text-right border border-transparent focus:border-slate-200 outline-none rounded-lg text-sm text-slate-800 font-mono transition"
                              id={`item-price-${idx}`}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-md text-slate-300 hover:text-rose-600 transition cursor-pointer"
                            title="Delete item"
                            id={`delete-item-${idx}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sum details: Tax and Overriding Total */}
          <div className="pt-2" id="financial-math-row">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-6 text-xs text-slate-400 space-y-1">
                {warning && (
                  <p className="flex items-start gap-1 p-3 bg-amber-50 rounded-lg text-amber-800 font-sans border border-amber-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </p>
                )}
                {!warning && (
                  <p className="p-3 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium">
                    ✨ Subtotal, tax values, and grand totals are mathematically aligned in active session report.
                  </p>
                )}
              </div>

              <div className="md:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 font-sans">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-900 text-sm">
                    ${lineItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sales Tax:</label>
                  <div className="relative flex items-center">
                    <span className="text-slate-400 text-xs absolute left-2 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(Number(e.target.value) || 0)}
                      className="w-24 pl-5 pr-2 py-1 bg-white border border-slate-200 outline-none rounded-md text-xs text-right text-slate-700 font-mono transition"
                      id="edit-tax"
                    />
                  </div>
                </div>

                {/* Styled Carbon Receipt Total widget block matching Design HTML precisely */}
                <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between items-center shadow-xs mt-1">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Receipt Total</span>
                  <div className="relative flex items-center">
                    <span className="text-slate-300 text-xl absolute left-2 font-mono font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={total}
                      onChange={(e) => setTotal(Number(e.target.value) || 0)}
                      className="w-28 pl-6 pr-2 py-0.5 bg-transparent border-b border-white/30 text-white text-xl font-bold font-mono focus:border-white outline-none text-right transition"
                      id="edit-total"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoCalcTotal}
                  className="w-full text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition py-1 rounded bg-slate-100 cursor-pointer"
                  id="auto-calc-total-btn"
                >
                  Recalculate Total from Items
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* receipt camera scan image component (if present) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center min-h-[300px]" id="receipt-preview-panel">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block self-start">
              Receipt Attachment
            </span>
            {imagePreview ? (
              <div className="relative group w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
                <img
                  src={imagePreview}
                  alt="Scanned Paper Receipt"
                  referrerPolicy="no-referrer"
                  className="w-full object-contain max-h-[320px] mx-auto rounded-lg transition duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                  <span className="bg-slate-900/90 text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> High-res paper record
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-4" id="placeholder-attachment">
                <div className="p-3 bg-white rounded-lg shadow-xs text-slate-400 inline-block mb-2 border border-slate-200">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-sm font-sans font-medium text-slate-900">Virtual Simulation</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Loaded using simulated preset structure. If uploading real images, standard captures will map right here side-by-side!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
