export type ExpenseCategory = "groceries" | "dining" | "transport" | "shopping" | "utilities" | "entertainment" | "other";

export interface LineItem {
  name: string;
  price: number;
  quantity?: number;
  category?: ExpenseCategory | ""; // Optional category override
}

export interface Receipt {
  id: string;
  merchant: string;
  date: string;
  category: ExpenseCategory;
  lineItems: LineItem[];
  tax: number;
  total: number;
  imageUrl?: string;
  scannedAt: string; // ISO String of when it was scanned
  mode: "api" | "preset" | "mock";
}

export interface CategoryBudget {
  category: ExpenseCategory;
  label: string;
  color: string;
  iconName: string; // Used to dynamic map to Lucide icons
  budget?: number;   // Optional budget set by user
}
