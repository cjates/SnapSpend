import React, { useRef, useState, useEffect } from "react";
import { Camera, Upload, AlertCircle, Sparkles, Coffee, ShoppingBag, Car, Tag, Film, CheckCircle2 } from "lucide-react";
import { Receipt } from "../types";

interface ReceiptScannerProps {
  onScanComplete: (receipt: Omit<Receipt, "id" | "scannedAt"> & { imagePreview?: string }) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

const PRESET_TEMPLATES = [
  { name: "Starbucks Coffee", icon: Coffee, desc: "Breakfast & Coffee ($31.48)", index: 1, category: "dining" },
  { name: "Whole Foods Market", icon: ShoppingBag, desc: "Fresh Groceries ($33.57)", index: 0, category: "groceries" },
  { name: "Shell Gas & Go", icon: Car, desc: "Regular Fuel ($51.84)", index: 2, category: "transport" },
  { name: "AMC Theatres", icon: Film, desc: "Movie Night Out ($54.03)", index: 4, category: "entertainment" },
  { name: "Best Buy", icon: Tag, desc: "Charging Accessories ($64.77)", index: 3, category: "shopping" }
];

const LOADING_STEPS = [
  "Uploading image to secure backend...",
  "Running Gemini 3.5-Flash OCR...",
  "Extracting itemized names & unit prices...",
  "Tallying merchant details & receipt date...",
  "Determining correct budget categories...",
  "Cross-verifying taxes and totals..."
];

export default function ReceiptScanner({ onScanComplete, isScanning, setIsScanning }: ReceiptScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate reassuring loading phrases to keep user engaged during OCR
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isScanning) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  const processFile = async (file: File) => {
    try {
      setError(null);
      setIsScanning(true);

      // Create a local preview for immediate visual feedback
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Convert standard file to Base64 for receipt submission
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const response = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64String,
              mimeType: file.type
            })
          });

          if (!response.ok) {
            throw new Error(`Server returned error: ${response.statusText}`);
          }

          const result = await response.json();
          if (result.success && result.data) {
            onScanComplete({
              ...result.data,
              imagePreview: preview,
              mode: result.mode
            });
          } else {
            throw new Error(result.error || "Failed to scan receipt properly.");
          }
        } catch (err: any) {
          setError(err.message || "Something went wrong during machine scanning.");
          setIsScanning(false);
        }
      };

      reader.onerror = () => {
        setError("Error reading the captured image file.");
        setIsScanning(false);
      };

      reader.readAsDataURL(file);

    } catch (e: any) {
      setError(e.message || "Failed to parse image file.");
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleSelectPreset = async (presetIndex: number) => {
    try {
      setError(null);
      setIsScanning(true);
      setPreviewUrl(null);

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPreset: true,
          presetIndex
        })
      });

      if (!response.ok) {
        throw new Error("Unable to load preset template.");
      }

      const result = await response.json();
      if (result.success && result.data) {
        onScanComplete({
          ...result.data,
          mode: "preset"
        });
      } else {
        throw new Error(result.error || "Failed to load preset details.");
      }
    } catch (err: any) {
      setError(err.message || "Could not retrieve preset receipt.");
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-lg p-6 md:p-8 space-y-8 text-white" id="scanner-container">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white font-sans" id="scanner-title">
          1. Snap or Upload Receipt
        </h2>
        <p className="text-sm text-slate-300 mt-1">
          Take a clear snapshot of your receipt. Gemini AI parses dates, items, tax, total, and assigns categories perfectly.
        </p>
      </div>

      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
          id="camera-input"
        />

        {isScanning ? (
          <div className="border-2 border-dashed border-slate-600/80 bg-slate-800/50 rounded-xl p-12 text-center aspect-video flex flex-col items-center justify-center space-y-4" id="scanning-indicator">
            <div className="relative flex items-center justify-center">
              <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-emerald-400 opacity-20"></div>
              <div className="relative rounded-full p-4 bg-slate-800 text-emerald-400 shadow-md animate-pulse border border-slate-700">
                <Camera className="w-8 h-8" />
              </div>
            </div>
            
            <div className="space-y-2 max-w-sm">
              <p className="text-white font-bold text-lg animate-pulse font-sans" id="scan-pulse-text">
                Analyzing Receipt...
              </p>
              <p className="text-xs text-slate-300 font-mono tracking-tight min-h-6 transition-all duration-300" id="scan-step-text">
                ⚡ {LOADING_STEPS[loadingStep]}
              </p>
            </div>
          </div>
        ) : (
          <div 
            onClick={triggerCamera}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-405 hover:bg-slate-800/40 cursor-pointer rounded-xl p-10 md:p-14 text-center transition-all duration-200 group flex flex-col items-center justify-center space-y-4"
            id="scanner-dropzone"
          >
            <div className="rounded-xl p-4 bg-slate-800 text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all border border-slate-700">
              <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1e293b] text-emerald-400 mb-2 border border-slate-700">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Gemini Powered
              </span>
              <p className="text-base text-white font-bold tracking-tight font-sans">
                TAP TO SCAN RECEIPT
              </p>
              <p className="text-xs text-slate-400">
                Supports real-time camera snapshot or native photo files
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-200" id="scanner-error">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">Unable to analyze receipt</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Preset demo receipts carousel */}
      <div className="pt-2" id="demo-presets-container">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
            No receipt in hand? Try Demo Presets
          </span>
          <span className="text-[11px] text-slate-500 font-mono italic">
            Instant OCR Simulator
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" id="presets-grid">
          {PRESET_TEMPLATES.map((tmpl) => {
            const IconComponent = tmpl.icon;
            return (
              <button
                key={tmpl.name}
                type="button"
                disabled={isScanning}
                onClick={() => handleSelectPreset(tmpl.index)}
                className="flex flex-col items-start text-left p-3.5 rounded-xl border border-slate-700 hover:border-emerald-400 hover:bg-slate-800 bg-slate-800/30 disabled:opacity-50 transition-all font-sans cursor-pointer group"
                id={`preset-${tmpl.index}`}
              >
                <div className="p-2 rounded-lg bg-slate-900 text-slate-350 group-hover:text-emerald-400 group-hover:bg-slate-800 border border-slate-700 transition-colors mb-2">
                  <IconComponent className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-100 truncate w-full">
                  {tmpl.name}
                </p>
                <p className="text-[10px] text-slate-405 mt-0.5 leading-tight">
                  {tmpl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
