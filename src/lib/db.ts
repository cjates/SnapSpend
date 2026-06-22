import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  orderBy 
} from "firebase/firestore";
import { Receipt, ExpenseCategory } from "../types";

// Persist or delete a single receipt record
export async function dbSaveReceipt(userId: string | null, receipt: Receipt) {
  if (!userId) {
    // If not authenticated, we let LocalStorage handle save in App.tsx
    return;
  }
  try {
    const docRef = doc(db, "receipts", receipt.id);
    await setDoc(docRef, {
      ...receipt,
      userId
    });
  } catch (error) {
    console.error("Firestore [saveReceipt] failed:", error);
    throw error;
  }
}

export async function dbDeleteReceipt(userId: string | null, receiptId: string) {
  if (!userId) return;
  try {
    const docRef = doc(db, "receipts", receiptId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Firestore [deleteReceipt] failed:", error);
    throw error;
  }
}

export async function dbFetchReceipts(userId: string): Promise<Receipt[]> {
  try {
    const q = query(
      collection(db, "receipts"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const list: Receipt[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: data.id,
        merchant: data.merchant,
        date: data.date,
        category: data.category as ExpenseCategory,
        lineItems: data.lineItems || [],
        tax: Number(data.tax) || 0,
        total: Number(data.total) || 0,
        imageUrl: data.imageUrl || undefined,
        scannedAt: data.scannedAt || new Date().toISOString(),
        mode: data.mode || "mock"
      });
    });
    // Sort descending by scannedAt or date
    return list.sort((a,b) => b.scannedAt.localeCompare(a.scannedAt));
  } catch (error) {
    console.error("Firestore [fetchReceipts] failed:", error);
    throw error;
  }
}

// Persist or fetch custom monthly budgets per category
export async function dbSaveBudgets(userId: string | null, budgets: Record<ExpenseCategory, number>) {
  if (!userId) return;
  try {
    const docRef = doc(db, "budgets", userId);
    await setDoc(docRef, budgets);
  } catch (error) {
    console.error("Firestore [saveBudgets] failed:", error);
    throw error;
  }
}

export async function dbFetchBudgets(userId: string): Promise<Record<ExpenseCategory, number> | null> {
  try {
    const docRef = doc(db, "budgets", userId);
    const snap = await getDocs(query(collection(db, "budgets")));
    const foundDoc = snap.docs.find(d => d.id === userId);
    if (foundDoc && foundDoc.exists()) {
      return foundDoc.data() as Record<ExpenseCategory, number>;
    }
    return null;
  } catch (error) {
    console.error("Firestore [fetchBudgets] failed:", error);
    throw error;
  }
}
