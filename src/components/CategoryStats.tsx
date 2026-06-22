import React, { useState } from "react";
import { TrendingUp, Award, DollarSign, Wallet, AlertCircle, HelpCircle, CheckCircle2 } from "lucide-react";
import { Receipt, ExpenseCategory, CategoryBudget } from "../types";

interface CategoryStatsProps {
  receipts: Receipt[];
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; border: string; text: string; lightBg: string }> = {
  groceries: { label: "Groceries", color: "bg-emerald-500", border: "border-emerald-100", text: "text-emerald-700", lightBg: "bg-emerald-50/85" },
  dining: { label: "Dining", color: "bg-orange-500", border: "border-orange-100", text: "text-orange-700", lightBg: "bg-orange-50/85" },
  transport: { label: "Transport", color: "bg-blue-500", border: "border-blue-100", text: "text-blue-700", lightBg: "bg-blue-50/85" },
  shopping: { label: "Shopping", color: "bg-purple-500", border: "border-purple-100", text: "text-purple-700", lightBg: "bg-purple-50/85" },
  utilities: { label: "Utilities", color: "bg-amber-400", border: "border-amber-100", text: "text-amber-700", lightBg: "bg-amber-50/85" },
  entertainment: { label: "Entertainment", color: "bg-rose-500", border: "border-rose-100", text: "text-rose-700", lightBg: "bg-rose-50/85" },
  other: { label: "Other", color: "bg-gray-400", border: "border-gray-100", text: "text-gray-700", lightBg: "bg-gray-50/85" }
};

export default function CategoryStats({ receipts }: CategoryStatsProps) {
  const [globalBudget, setGlobalBudget] = useState<number>(300);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("300");

  // Calculate high-level aggregate metrics from session list
  const totalSpend = receipts.reduce((sum, r) => sum + r.total, 0);
  const totalTax = receipts.reduce((sum, r) => sum + r.tax, 0);
  const totalItems = receipts.reduce((sum, r) => sum + r.lineItems.reduce((acc, arg) => acc + (arg.quantity || 1), 0), 0);

  // Group receipt spending aggregate totals into categories
  const categorySpendMap: Record<ExpenseCategory, number> = {
    groceries: 0,
    dining: 0,
    transport: 0,
    shopping: 0,
    utilities: 0,
    entertainment: 0,
    other: 0
  };

  receipts.forEach((r) => {
    categorySpendMap[r.category] = Number((categorySpendMap[r.category] + r.total).toFixed(2));
  });

  // Pick high spend categoric identifier
  const highCategoryIndex = (Object.keys(categorySpendMap) as ExpenseCategory[]).reduce(
    (highCat, currentCat) => (categorySpendMap[currentCat] > categorySpendMap[highCat] ? currentCat : highCat),
    "groceries" as ExpenseCategory
  );
  
  const highCategorySpend = categorySpendMap[highCategoryIndex];

  // Prepare scannable sorted arrays
  const categoryBreakdown = (Object.keys(categorySpendMap) as ExpenseCategory[]).map((cat) => {
    const amount = categorySpendMap[cat];
    const percentage = totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0;
    return {
      category: cat,
      amount,
      percentage,
      meta: CATEGORY_META[cat]
    };
  }).sort((a, b) => b.amount - a.amount);

  const budgetProgress = globalBudget > 0 ? (totalSpend / globalBudget) * 100 : 0;
  const isOverBudget = totalSpend > globalBudget;

  const handleSaveBudget = () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val >= 0) {
      setGlobalBudget(val);
    }
    setEditingBudget(false);
  };

  return (
    <div className="space-y-6" id="stats-summary-panel">
      {/* Session Summary Card matching standard specified mock HTML structure */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6" id="summary-category-report">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
            Session Summary
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time aggregate totals from active receipt scans.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 animate-fade-in" id="aggregations-counter-grid">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Total Spend
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              ${totalSpend.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              from {receipts.length} snaps
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Receipt Count
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {receipts.length}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              {totalItems} lines extracted
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Estimated Tax
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              ${totalTax.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              tax calculated
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg relative overflow-hidden">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Target Cap Limit
            </p>
            {editingBudget ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs font-semibold focus:outline-slate-900 font-mono"
                  onKeyDown={(e) => { if(e.key === 'Enter') handleSaveBudget(); }}
                />
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="px-1.5 text-xs text-slate-900 font-bold bg-white border border-slate-300 rounded cursor-pointer"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
                  ${globalBudget.toFixed(0)}
                </p>
                <button
                  type="button"
                  onClick={() => { setTempBudget(globalBudget.toString()); setEditingBudget(true); }}
                  className="text-[9px] text-slate-400 hover:text-slate-900 underline font-semibold transition cursor-pointer"
                >
                  edit
                </button>
              </div>
            )}
            {/* Minimal line progress at the bottom edge */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
              <div 
                className={`h-full transition-all duration-500 ${isOverBudget ? "bg-rose-500" : "bg-slate-900"}`} 
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {receipts.length === 0 ? (
          <div className="py-8 text-center rounded-lg bg-slate-50/50 border border-dashed border-slate-200 text-slate-400" id="stats-empty">
            <Wallet className="w-6 h-6 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">No active spent records</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Scan paper receipt images to instantly view categorized breakdown statistics here.
            </p>
          </div>
        ) : (
          <div className="space-y-5" id="report-analytics-split">
            {/* Visual categories listing matching spec */}
            <div className="space-y-4" id="stats-ranking-bars">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">By Category</p>
              
              <div className="space-y-3">
                {categoryBreakdown.map(({ category, amount, percentage, meta }) => {
                  if (amount === 0) return null;
                  return (
                    <div key={category} className="space-y-1.5" id={`stat-row-${category}`}>
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${meta.color}`}></div>
                          <span className="text-sm text-slate-600 capitalize">{meta.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">({percentage}%)</span>
                        </div>
                        <span className="text-sm font-mono font-medium text-slate-900">${amount.toFixed(2)}</span>
                      </div>
                      
                      {/* Fluid thin loading bar representation */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${meta.color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart mini insights box */}
            <div className="pt-2" id="stats-insights-column">
              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 space-y-2 font-sans" id="budget-utilization-insight">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest block">
                  Reserve Limit Utilization
                </span>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Utilization ratio:</span>
                    <span className="font-bold font-mono text-slate-800">
                      {Math.round(budgetProgress)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-350 ${isOverBudget ? "bg-rose-500" : "bg-slate-900"}`}
                      style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {isOverBudget ? (
                  <div className="p-2 bg-rose-50 text-rose-800 border border-rose-100 rounded text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>Over budget by <strong className="font-mono">${(totalSpend - globalBudget).toFixed(2)}</strong>.</span>
                  </div>
                ) : (
                  <div className="p-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-600">Spent: ${totalSpend.toFixed(0)} • Remaining: ${(globalBudget - totalSpend).toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
