import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User
} from "firebase/auth";
import { LogIn, UserPlus, LogOut, Shield, Key, Eye, EyeOff, X, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  showToast: (msg: string) => void;
}

export default function AuthModal({ isOpen, onClose, currentUser, showToast }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all columns.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Welcome! Your SnapSpend secure cloud account has been created.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Successfully logged in. Syncing receipts from the cloud database...");
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "An authentication error occurred.";
      if (err.code === "auth/wrong-password") {
        errMsg = "Incorrect password. Please try again.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "No account found with this email. Click 'Create Account' below to sign up.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password must be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="auth-modal-wrapper">
      {/* Blurred Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300" 
      />

      {/* Auth Card Panel */}
      <div 
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 md:p-8 overflow-hidden z-10 animate-fade-in"
        id="auth-modal-card"
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 transition p-1 rounded-md"
          id="close-auth-btn"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isSignUp ? "Create SnapSpend Account" : "Access Cloud Workspace"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp 
              ? "Join to sync your expenditures, capture history, and configure targets across all screens." 
              : "Sign in to securely access your saved journal and monthly cap stats state."}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs flex items-start gap-2 mb-4 animate-fade-in" id="auth-error-msg">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4" id="auth-form">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition"
              placeholder="name@company.com"
              id="auth-email-input"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Secret Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition"
                placeholder={isSignUp ? "Minimum 6 characters" : "••••••••"}
                id="auth-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition p-1 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            id="auth-submit-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sing In Securely
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            {isSignUp ? "Already have a cloud workspace?" : "New to SnapSpend cloud ledger?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="font-bold text-slate-900 hover:underline cursor-pointer"
              id="auth-toggle-btn"
            >
              {isSignUp ? "Log In Here" : "Create Account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
