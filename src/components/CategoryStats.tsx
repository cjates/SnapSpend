import React, { useState } from "react";
import { TrendingUp, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Settings, BarChart2 } from "lucide-react";
import { Receipt, ExpenseCategory } from "../types";

interface CategoryStatsProps {
  receipts: Receipt[];
  budgets: Record<ExpenseCategory, number>;
  onUpdateBudget: (category: ExpenseCategory, amount: number) => void;
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

export default function CategoryStats({ receipts, budgets, onUpdateBudget }: CategoryStatsProps) {
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<Record<ExpenseCategory, string>>({
    groceries: budgets.groceries.toString(),
    dining: budgets.dining.toString(),
    transport: budgets.transport.toString(),
    shopping: budgets.shopping.toString(),
    utilities: budgets.utilities.toString(),
    entertainment: budgets.entertainment.toString(),
    other: budgets.other.toString()
  });

  const handleLocalBudgetChange = (cat: ExpenseCategory, val: string) => {
    setLocalBudgets(prev => ({ ...prev, [cat]: val }));
    const numeric = parseFloat(val);
    if (!isNaN(numeric) && numeric >= 0) {
      onUpdateBudget(cat, numeric);
    }
  };

  // Synchronize when parent changes (e.g., on auth state changes)
  React.useEffect(() => {
    setLocalBudgets({
      groceries: budgets.groceries.toString(),
      dining: budgets.dining.toString(),
      transport: budgets.transport.toString(),
      shopping: budgets.shopping.toString(),
      utilities: budgets.utilities.toString(),
      entertainment: budgets.entertainment.toString(),
      other: budgets.other.toString()
    });
  }, [budgets]);

  // Calculate high-level aggregate metrics
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
    if (!r.lineItems || r.lineItems.length === 0) {
      categorySpendMap[r.category] = Number((categorySpendMap[r.category] + r.total).toFixed(2));
    } else {
      const totalItemsCost = r.lineItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      r.lineItems.forEach((item) => {
        const itemCat = item.category ? item.category : r.category;
        const itemCost = item.price * (item.quantity || 1);
        categorySpendMap[itemCat] = Number((categorySpendMap[itemCat] + itemCost).toFixed(2));
      });
      // Any remainder (e.g., tax, tips, general rounding adjustments) is assigned to the receipt's overall category
      const difference = r.total - totalItemsCost;
      if (Math.abs(difference) > 0.001) {
        categorySpendMap[r.category] = Number((categorySpendMap[r.category] + difference).toFixed(2));
      }
    }
  });

  // Ensure positive values with formatting precision
  (Object.keys(categorySpendMap) as ExpenseCategory[]).forEach((cat) => {
    categorySpendMap[cat] = Math.max(0, Number(categorySpendMap[cat].toFixed(2)));
  });

  // Calculate total budget
  const totalBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0);
  const totalProgress = totalBudget > 0 ? (totalSpend / totalBudget) * 105 : 0;
  const isOverallOverBudget = totalSpend > totalBudget;

  // Compile detailed budget statuses
  const budgetStatuses = (Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => {
    const spent = categorySpendMap[cat];
    const budget = budgets[cat];
    const remaining = Math.max(0, budget - spent);
    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
    const isOver = spent > budget;
    const isWarning = !isOver && percentUsed >= 80; // 80% to 100% is warning

    let statusColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
    let progressColor = "bg-emerald-500";
    
    if (isOver) {
      statusColor = "text-rose-600 bg-rose-50 border-rose-100";
      progressColor = "bg-rose-500";
    } else if (isWarning) {
      statusColor = "text-amber-650 bg-amber-50 border-amber-100";
      progressColor = "bg-amber-500";
    }

    return {
      category: cat,
      spent,
      budget,
      remaining,
      percentUsed,
      isOver,
      isWarning,
      statusColor,
      progressColor,
      meta: CATEGORY_META[cat]
    };
  });

  // Summary indicators
  const overBudgetCount = budgetStatuses.filter(s => s.isOver).length;
  const warningBudgetCount = budgetStatuses.filter(s => s.isWarning).length;
  const optimalBudgetCount = budgetStatuses.filter(s => !s.isOver && !s.isWarning).length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800" id="stats-summary-panel">
      {/* Dynamic Session Dashboard Info Block */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-5" id="summary-category-report">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span>Overall Ledger Summary</span>
            <span className="text-[10px] font-mono lowercase text-slate-400 font-normal">monthly tracking</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Real-time aggregate totals from active receipt scans against target budgets.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4" id="aggregations-counter-grid">
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">
              Total Spend
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight font-sans">
              ${totalSpend.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              from {receipts.length} snaps
            </p>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">
              Budget Allocated
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight font-sans">
              ${totalBudget.toFixed(0)}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              across {Object.keys(budgets).length} sections
            </p>
          </div>
        </div>

        {/* Mini progress across general allocation */}
        <div className="relative pt-1">
          <div className="flex mb-1 items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Overall Reserve Remaining:</span>
            <span className={`font-mono font-bold ${isOverallOverBudget ? "text-rose-600" : "text-emerald-700"}`}>
              ${(totalBudget - totalSpend).toFixed(2)}
            </span>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100 border border-slate-200/50">
            <div
              style={{ width: `${Math.min(100, (totalSpend / (totalBudget || 1)) * 100)}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-550 ${
                isOverallOverBudget ? "bg-rose-500" : "bg-slate-900"
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>{Math.min(100, Math.round((totalSpend / (totalBudget || 1)) * 100))}% used</span>
            <span>Est. Tax: ${totalTax.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Category Budgets Status Overview Board */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5" id="category-budgets-section">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Category Budgets</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Live spend tracked against custom monthly bounds.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBudgetEditor(!showBudgetEditor)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-md text-[10px] font-semibold transition cursor-pointer"
            id="configure-budgets-toggle"
          >
            <Settings className="w-3 h-3" />
            <span>{showBudgetEditor ? "Hide Panel" : "Set Budgets"}</span>
          </button>
        </div>

        {/* Collapsible Budget Configuration Panel */}
        {showBudgetEditor && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 animate-slide-up" id="budgets-editor-form">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Configure Monthly Limits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                <div key={cat} className="flex flex-col gap-1">
                  <span className="text-[10px] capitalize text-slate-600 font-medium">
                    {CATEGORY_META[cat].label} ($)
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={localBudgets[cat]}
                    onChange={(e) => handleLocalBudgetChange(cat, e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded text-xs outline-none focus:border-slate-800 font-mono tracking-tight"
                  />
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 italic">
              Changes save instantly. Synced and updated in cloud persistently if logged in.
            </p>
          </div>
        )}

        {/* Budgets Summary Status Badges Grid */}
        <div className="grid grid-cols-3 gap-2" id="budget-status-summary-row">
          <div className="p-2 border border-slate-200 bg-slate-50/50 rounded text-center">
            <span className="text-[18px] font-bold text-slate-800 block font-mono">
              {overBudgetCount}
            </span>
            <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider">
              Exceeded
            </span>
          </div>
          <div className="p-2 border border-slate-200 bg-slate-50/50 rounded text-center">
            <span className="text-[18px] font-bold text-slate-800 block font-mono">
              {warningBudgetCount}
            </span>
            <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider">
              Warning
            </span>
          </div>
          <div className="p-2 border border-slate-200 bg-slate-50/50 rounded text-center">
            <span className="text-[18px] font-bold text-slate-800 block font-mono">
              {optimalBudgetCount}
            </span>
            <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">
              Healthy
            </span>
          </div>
        </div>

        {/* Vertical itemized progress views for budget metrics */}
        <div className="space-y-4" id="category-budgets-list">
          {budgetStatuses.map(({ category, spent, budget, remaining, percentUsed, isOver, isWarning, statusColor, progressColor, meta }) => {
            return (
              <div 
                key={category} 
                className="space-y-1.5 p-3.5 bg-slate-50/30 hover:bg-slate-50/60 border border-slate-200/50 rounded-lg transition"
                id={`budget-bar-row-${category}`}
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.color}`}></div>
                    <span className="font-bold text-slate-900 capitalize">{meta.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    ${spent.toFixed(2)} <span className="text-slate-400 font-normal">/ ${budget.toFixed(0)}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden relative border border-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${Math.min(100, percentUsed)}%` }}
                  />
                </div>

                {/* Remaining status reporting text */}
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-[9px] text-slate-400 font-mono">
                    {Math.round(percentUsed)}% consumed
                  </span>
                  
                  {isOver ? (
                    <span className="text-[9px] font-bold text-rose-600 px-1.5 py-0.25 bg-rose-55 rounded uppercase">
                      Over by ${(spent - budget).toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-slate-500">
                      ${remaining.toFixed(0)} left
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
