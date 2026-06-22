import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON body parser with increased limits for Base64 receipt images
app.use(express.json({ limit: "15mb" }));

// Mock receipts database for fallback or instant-demo presets
const MOCK_RECEIPTS = [
  {
    merchant: "Whole Foods Market",
    date: new Date().toISOString().split("T")[0],
    category: "groceries",
    lineItems: [
      { name: "Organic Honey Crips Apples", price: 4.99, quantity: 1 },
      { name: "Almond Milk 1/2 Gal", price: 3.49, quantity: 2 },
      { name: "Grass-Fed Ground Beef 1lb", price: 9.99, quantity: 1 },
      { name: "Organic Avocados 4-pack", price: 5.49, quantity: 1 },
      { name: "Sourdough Boule Bread", price: 4.29, quantity: 1 }
    ],
    tax: 1.83,
    total: 33.57
  },
  {
    merchant: "Starbucks Coffee",
    date: new Date().toISOString().split("T")[0],
    category: "dining",
    lineItems: [
      { name: "Grande Caramel Macchiato", price: 5.45, quantity: 1 },
      { name: "Butter Croissant", price: 3.75, quantity: 1 },
      { name: "Stainless Tumbler 16oz", price: 19.95, quantity: 1 }
    ],
    tax: 2.33,
    total: 31.48
  },
  {
    merchant: "Shell Gas & Go",
    date: new Date().toISOString().split("T")[0],
    category: "transport",
    lineItems: [
      { name: "Regular Fuel (12.4 Gal)", price: 45.26, quantity: 1 },
      { name: "Energy Drink 16oz", price: 3.29, quantity: 2 }
    ],
    tax: 0.00,
    total: 51.84
  },
  {
    merchant: "Best Buy",
    date: new Date().toISOString().split("T")[0],
    category: "shopping",
    lineItems: [
      { name: "Wireless Charging Pad", price: 29.99, quantity: 1 },
      { name: "USB-C Braided Cable 6ft", price: 14.99, quantity: 2 }
    ],
    tax: 4.80,
    total: 64.77
  },
  {
    merchant: "AMC Theatres",
    date: new Date().toISOString().split("T")[0],
    category: "entertainment",
    lineItems: [
      { name: "Adult Evening Admission", price: 16.50, quantity: 2 },
      { name: "Large Popcorn & Soda Combo", price: 18.25, quantity: 1 }
    ],
    tax: 2.78,
    total: 54.03
  }
];

// Lazy-initialized Gemini Client
let googleGenAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!googleGenAI) {
    googleGenAI = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return googleGenAI;
}

// API endpoint to process a receipt photo using Gemini Flash Vision
app.post("/api/scan", async (req, res) => {
  try {
    const { image, mimeType, isPreset, presetIndex } = req.body;

    // Handle preset/demo fallback requested directly by frontend
    if (isPreset && typeof presetIndex === "number" && presetIndex >= 0 && presetIndex < MOCK_RECEIPTS.length) {
      console.log(`[SnapSpend] Returning preset demo receipt: ${MOCK_RECEIPTS[presetIndex].merchant}`);
      return res.json({ success: true, data: MOCK_RECEIPTS[presetIndex], mode: "preset" });
    }

    // Capture safety validation checks
    if (!image) {
      return res.status(400).json({ success: false, error: "No image content provided for scanning." });
    }

    // Clean base64 string
    let base64Data = image;
    if (image.includes("base64,")) {
      base64Data = image.split("base64,")[1];
    }

    const aiClient = getGenAI();

    // If Gemini Client is unavailable, perform smart local mock generation
    if (!aiClient) {
      console.log("[SnapSpend] Gemini API Key missing or default. Falling back to a random realistic receipt parser.");
      // Create a slightly localized mock receipt with simulated dates to feel dynamic
      const randomIndex = Math.floor(Math.random() * MOCK_RECEIPTS.length);
      const matchedMock = { ...MOCK_RECEIPTS[randomIndex] };
      matchedMock.date = new Date().toISOString().split("T")[0];
      return res.json({
        success: true,
        data: matchedMock,
        mode: "mock",
        warning: "Running with simulated analysis. Connect your Gemini API Key in Settings > Secrets to enable native machine-learning vision scans!"
      });
    }

    console.log("[SnapSpend] Contacting Gemini vision server for receipt analysis...");
    
    // Set up standard multimodal parts
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: base64Data
      }
    };

    const textPart = {
      text: `Analyze this paper receipt carefully. Extract the merchant, date, each line item with its cost price and quantity, sales tax, and the total spent amount.
Also, classify the entire receipt into one of these spending categories: 'groceries', 'dining', 'transport', 'shopping', 'utilities', 'entertainment', 'other'.
For each line item in 'lineItems', determine if its category differs from the overall receipt category. If so, classify that item as well ('groceries', 'dining', 'transport', 'shopping', 'utilities', 'entertainment', 'other'). Otherwise, leave empty.
Requirements:
1. Provide a highly accurate merchant name.
2. The date must be strictly in YYYY-MM-DD format. If no date is found or readable in the receipt, fallback to today's date: ${new Date().toISOString().split("T")[0]}.
3. Every individual item from the breakdown list must be placed in the 'lineItems' array with its friendly name, total price, optional category override if different from receipt overall category, and its quantity (default to 1 if not explicitly specified).
4. Parse tax as a number. Set to 0 if not found.
5. Parse total as a positive decimal number representing the absolute net total paid.`
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: "The merchant or company name." },
            date: { type: Type.STRING, description: "Receipt date in YYYY-MM-DD format." },
            category: { type: Type.STRING, description: "Spending category (groceries, dining, transport, shopping, utilities, entertainment, other)." },
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Item description or name on the receipt." },
                  price: { type: Type.NUMBER, description: "Total price of this line item." },
                  quantity: { type: Type.INTEGER, description: "Quantity of this item." },
                  category: { type: Type.STRING, description: "Optional item category override (groceries, dining, transport, shopping, utilities, entertainment, other or empty)." }
                },
                required: ["name", "price"]
              }
            },
            tax: { type: Type.NUMBER, description: "The sales tax paid." },
            total: { type: Type.NUMBER, description: "The grand total paid." }
          },
          required: ["merchant", "date", "category", "lineItems", "tax", "total"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Unable to parse a coherent text output from the model.");
    }

    const parsedData = JSON.parse(resultText.trim());
    return res.json({ success: true, data: parsedData, mode: "api" });

  } catch (error: any) {
    console.error("[SnapSpend API Error]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to parse receipt. Please make sure the receipt is clear, readable, and fully captured.",
      details: error?.message || error
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Configure Vite middleware or custom production asset routing
async function init() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SnapSpend] Server is listening on port ${PORT}`);
  });
}

init();
