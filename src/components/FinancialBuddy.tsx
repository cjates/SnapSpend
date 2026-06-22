import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Sparkles, X, Send, Bot, User, Award, ArrowUpRight } from "lucide-react";
import { Receipt, ExpenseCategory } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FinancialBuddyProps {
  receipts: Receipt[];
  budgets: Record<ExpenseCategory, number>;
}

export default function FinancialBuddy({ receipts, budgets }: FinancialBuddyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your **SnapSpend AI Coach**. Let's talk about setting smart financial goals, reducing everyday spending, or looking over your active expense trends!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Hide the tagline speech bubble automatically if chat is opened
  useEffect(() => {
    if (isOpen) {
      setShowBubble(false);
    }
  }, [isOpen]);

  // Compile helper data to make Gemini contextual on user's current actions
  const getSpendingSummary = () => {
    const totalSpent = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const categoryTotals: Record<string, number> = {};
    receipts.forEach(r => {
      categoryTotals[r.category] = (categoryTotals[r.category] || 0) + (r.total || 0);
    });

    const budgetUsage: Record<string, { spent: number; limit: number; pct: number }> = {};
    Object.keys(budgets).forEach(cat => {
      const spent = categoryTotals[cat] || 0;
      const limit = budgets[cat as ExpenseCategory] || 0;
      budgetUsage[cat] = {
        spent,
        limit,
        pct: limit > 0 ? (spent / limit) * 100 : 0
      };
    });

    return {
      receiptCount: receipts.length,
      totalSpent,
      budgetUsage
    };
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
    const newMsg: Message = { id: userMsgId, role: "user", content: textToSend };
    
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const summary = getSpendingSummary();
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          spendingSummary: summary
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with the coaching AI server.");
      }

      const data = await response.json();
      const botMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
      
      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          role: "assistant",
          content: data.text || "I processed your request but had trouble forming an output. Try asking me for grocery tips!"
        }
      ]);
    } catch (err: any) {
      console.error("[SnapSpend Financial Buddy Error]:", err);
      const errorMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
      setMessages(prev => [
        ...prev,
        {
          id: errorMsgId,
          role: "assistant",
          content: "⚠️ **Connection Error**: I could not reach our coaching server. Please check your network or try again soon."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPresetPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end" id="financial-buddy-widget">
      {/* 1. Tagline Speech Bubble Over Button */}
      {showBubble && !isOpen && (
        <div 
          className="mr-2 mb-3 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-3.5 max-w-[280px] text-xs relative animate-bounce font-medium leading-relaxed shrink-0"
          id="buddy-intro-speech-bubble"
        >
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBubble(false);
            }} 
            className="absolute top-1 right-1 text-slate-400 hover:text-white p-0.5"
            aria-label="Close tagline"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="pr-3 text-slate-100">
            Hi, chat with me for tips for reduced spending, setting financial goals, or something else! 🎯
          </p>
          <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-slate-900 border-r border-b border-slate-800 transform rotate-45"></div>
        </div>
      )}

      {/* 2. Main Floating Chat Dialog */}
      {isOpen && (
        <div 
          className="w-[92vw] sm:w-[380px] h-[520px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-fade-in"
          id="buddy-chat-dialog"
        >
          {/* Header */}
          <div className="bg-[#0f172a] text-white p-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-inner">
                <Bot className="w-4.5 h-4.5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-mono tracking-wider">SNAPSPEND COACH</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-medium">Ready to support goals</span>
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conversation Core */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" id="buddy-messages-container">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-2.5 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                  m.role === "user" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Box */}
                <div className={`text-xs rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed ${
                  m.role === "user" 
                    ? "bg-[#0f172a] text-white rounded-tr-none" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none font-normal"
                }`}>
                  {/* Simplistic Markdown support highlights */}
                  {m.content.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx} className={pIdx > 0 ? "mt-2" : ""}>
                      {para.split("**").map((chunk, cIdx) => {
                        if (cIdx % 2 === 1) {
                          return <strong key={cIdx} className="font-bold text-emerald-600 dark:text-emerald-400">{chunk}</strong>;
                        }
                        return chunk;
                      })}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 mr-auto">
                <div className="w-7 h-7 rounded-lg shrink-0 bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Assistant Prompts */}
          <div className="p-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto shrink-0 select-none scrollbar-none">
            <button 
              type="button"
              onClick={() => triggerPresetPrompt("Highlight 3 tips to reduce grocery spending")}
              className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full hover:bg-emerald-100 transition whitespace-nowrap active:scale-95 shrink-0 flex items-center gap-1"
            >
              <Award className="w-3 h-3 shrink-0" /> Grocery Tips
            </button>
            <button 
              type="button"
              onClick={() => triggerPresetPrompt("Suggest a practical $500 savings goal plan")}
              className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full hover:bg-emerald-100 transition whitespace-nowrap active:scale-95 shrink-0 flex items-center gap-1"
            >
              <Award className="w-3 h-3 shrink-0" /> Goal Setting
            </button>
            <button 
              type="button"
              onClick={() => triggerPresetPrompt("Analyze my reports and suggest where to reduce expenses")}
              className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full hover:bg-emerald-100 transition whitespace-nowrap active:scale-95 shrink-0 flex items-center gap-1"
            >
              <Award className="w-3 h-3 shrink-0" /> Analyze Spending
            </button>
          </div>

          {/* Message Input Bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
            id="buddy-input-bar"
          >
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask for savings ideas or set a goal..."
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              id="buddy-user-text-input"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-8.5 h-8.5 rounded-xl bg-[#0f172a] text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#0f172a] transition duration-150 shrink-0 cursor-pointer"
              id="buddy-send-btn"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Floating Sparkle Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-[#0f172a] border border-slate-800 shadow-2xl flex items-center justify-center text-white hover:bg-slate-800 active:scale-95 hover:border-emerald-500 transition-all duration-200 focus:outline-hidden group cursor-pointer relative"
        id="buddy-floating-trigger-btn"
        title="Chat with your Financial Companion"
      >
        {isOpen ? (
          <X className="w-5.5 h-5.5 transition duration-150" />
        ) : (
          <>
            <MessageSquare className="w-5.5 h-5.5" />
            <span className="absolute -top-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full flex items-center justify-center p-0 shadow-xs ring-2 ring-[#0f172a] text-[8px] font-mono font-bold animate-pulse text-slate-950">
              AI
            </span>
          </>
        )}
      </button>
    </div>
  );
}
