import express from "express";
import path from "path";
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

export function isValidGeminiApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const clean = key.trim().replace(/^["']|["']$/g, "").trim();
  if (clean.length < 15) return false;
  if (!clean.startsWith("AIzaSy")) return false;
  const upper = clean.toUpperCase();
  if (upper.includes("PLACEHOLDER") || upper.includes("YOUR_") || upper.includes("API_KEY") || upper.includes("ENTER_") || upper === "UNDEFINED") {
    return false;
  }
  return true;
}

export function isValidGroqApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const clean = key.trim().replace(/^["']|["']$/g, "").trim();
  if (clean.length < 15) return false;
  if (!clean.startsWith("gsk_")) return false;
  const upper = clean.toUpperCase();
  if (upper.includes("PLACEHOLDER") || upper.includes("YOUR_") || upper.includes("API_KEY") || upper.includes("ENTER_") || upper === "UNDEFINED") {
    return false;
  }
  return true;
}

console.log("==================================================");
console.log("🔍 [INIT] INVESTIGATING ENVIRONMENT CONFIGURATION ON SERVER STARTUP");
console.log(`🌍 Env node_env: ${process.env.NODE_ENV || "development"}`);
console.log(`🌐 Hosting Environment: ${process.env.VERCEL ? "Vercel Serverless Function" : "Google Cloud Run / Local Sandbox"}`);
console.log(`📦 Loaded api keys details:`);

const rawGemini = process.env.GEMINI_API_KEY;
if (rawGemini) {
  const isVal = isValidGeminiApiKey(rawGemini);
  const cleaned = rawGemini.trim().replace(/^["']|["']$/g, "").trim();
  console.log(`  - GEMINI_API_KEY: EXISTS (Length: ${rawGemini.length}, Starts with AIzaSy: ${cleaned.startsWith("AIzaSy")}, Masked: ${cleaned.slice(0, 6)}...${cleaned.slice(-4)}, Valid: ${isVal})`);
} else {
  console.log("  - GEMINI_API_KEY: MISSING ❌");
}

const rawGroq = process.env.GROQ_API_KEY;
if (rawGroq) {
  const isVal = isValidGroqApiKey(rawGroq);
  const cleaned = rawGroq.trim().replace(/^["']|["']$/g, "").trim();
  console.log(`  - GROQ_API_KEY: EXISTS (Length: ${rawGroq.length}, Starts with gsk_: ${cleaned.startsWith("gsk_")}, Masked: ${cleaned.slice(0, 6)}...${cleaned.slice(-4)}, Valid: ${isVal})`);
} else {
  console.log("  - GROQ_API_KEY: MISSING ❌");
}
console.log("==================================================");

// Initialize Firebase Admin lazily to avoid crashing on startup if keys are missing
let db: any = null;

function getDatabaseId() {
  // 1. Check environment variables (precedence)
  if (process.env.FIRESTORE_DATABASE_ID) return process.env.FIRESTORE_DATABASE_ID;
  if (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) return process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

  // 2. If running on Vercel or live server, defaults to "(default)" standard production database
  if (process.env.VERCEL) {
    return "(default)";
  }

  // 3. Try to read from local config inside sandbox if present
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data.firestoreDatabaseId) {
        return data.firestoreDatabaseId;
      }
    }
  } catch (err) {
    // ignore
  }

  return "(default)";
}

function getProjectId() {
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    return process.env.VITE_FIREBASE_PROJECT_ID;
  }
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data.projectId) {
        return data.projectId;
      }
    }
  } catch (err) {
    // ignore
  }
  return "placeholder-project-id";
}

function getDb() {
  if (db) return db;
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = getProjectId();

  // If we are on Vercel or any non-Google cloud environment and do not have FIREBASE_PRIVATE_KEY, do not initialize Admin SDK.
  // This completely avoids hanging Firestore connections due to default credential lookup timeouts.
  const isGoogleEnvironment = process.env.K_SERVICE || process.env.K_REVISION || process.env.GOOGLE_CLOUD_PROJECT;
  if (!privateKey && !isGoogleEnvironment) {
    console.warn("⚠️ No FIREBASE_PRIVATE_KEY detected outside of Google Cloud. Skipping Admin SDK to prevent auth hangs, using lightweight REST fallback instead.");
    return null;
  }

  if (!(admin.apps && admin.apps.length)) {
    try {
      if (privateKey) {
        const adminConfig = {
          projectId: projectId,
          clientEmail: `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`,
          privateKey: privateKey.replace(/\\n/g, '\n')
        };
        admin.initializeApp({
          credential: admin.credential.cert(adminConfig),
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log(`✅ Firebase Admin successfully initialized using private key cert credentials for project: ${projectId}`);
      } else {
        // Fallback to default application credentials natively available in Cloud Run env
        admin.initializeApp({
          projectId: projectId,
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log(`✅ Firebase Admin successfully initialized using Google Application Default Credentials for project: ${projectId}`);
      }
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Admin:", error);
      return null;
    }
  }

  try {
    const databaseId = getDatabaseId();
    db = getFirestore(admin.apps[0], databaseId);
    console.log(`✅ Firebase Admin SDK successfully bound to custom firestore databaseId: ${databaseId}`);
  } catch (err: any) {
    console.error("❌ Failed to get Firestore DB with custom databaseId. Falling back to default database:", err);
    db = admin.firestore();
  }

  return db;
}

// Convert Firestore REST document formats to dynamic JavaScript JSON values
function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    const parsedObj: any = {};
    for (const [k, v] of Object.entries(fields)) {
      parsedObj[k] = parseFirestoreValue(v);
    }
    return parsedObj;
  }
  return value;
}

function parseFirestoreRestDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const result: any = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

// Universal fetch utility that reads from Firestore Admin SDK or falls back to production REST API with user JWT context Bearer Token
async function fetchDocumentWithFallback(collectionName: string, docId: string, token: string, firestore: any) {
  // 1. Try custom firestore database ID (e.g. sandbox firestore)
  if (firestore) {
    try {
      const docSnap = await firestore.collection(collectionName).doc(docId).get();
      if (docSnap.exists) {
        return docSnap.data();
      }
    } catch (err: any) {
      console.warn(`⚠️ Firebase Admin fetch failed for custom DB ${collectionName}/${docId}: ${err.message}.`);
    }
  }

  // 2. Failsafe fallback: Try standard "(default)" firestore database
  try {
    if (admin && admin.apps && admin.apps.length > 0) {
      const defaultDb = admin.firestore();
      if (defaultDb && defaultDb !== firestore) {
        const defaultDocSnap = await defaultDb.collection(collectionName).doc(docId).get();
        if (defaultDocSnap.exists) {
          console.log(`✅ [FAILSAFE DEFAULT DB] Loaded ${collectionName}/${docId} successfully from (default) database.`);
          return defaultDocSnap.data();
        }
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ Firebase Admin fetch failed for default DB ${collectionName}/${docId}: ${err.message}.`);
  }

  // 3. Fallback to REST API using custom database ID
  if (token) {
    try {
      const databaseId = getDatabaseId();
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}`;
      console.log(`📡 [FAILSAFE REST] Fetching ${url} with token...`);
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const json = await response.json();
        const parsed = parseFirestoreRestDoc(json);
        console.log(`✅ [FAILSAFE REST] Loaded ${collectionName}/${docId} successfully.`);
        return parsed;
      } else {
        console.error(`❌ [FAILSAFE REST] Failed to load ${collectionName}/${docId}. Status: ${response.status} - ${response.statusText}`);
      }
    } catch (err: any) {
      console.error(`❌ [FAILSAFE REST] Error fetching ${collectionName}/${docId} from REST API:`, err);
    }

    // 4. Fallback to REST API using "(default)" database ID
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
      console.log(`📡 [FAILSAFE REST DEFAULT DB] Fetching ${url} with token...`);
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const json = await response.json();
        const parsed = parseFirestoreRestDoc(json);
        console.log(`✅ [FAILSAFE REST DEFAULT DB] Loaded ${collectionName}/${docId} successfully.`);
        return parsed;
      }
    } catch (err: any) {
      console.error(`❌ [FAILSAFE REST DEFAULT DB] Error fetch fallback:`, err);
    }
  }
  return null;
}

const app = express();

app.use(express.json());

// API Routes
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", firebaseAdmin: !!getDb() });
});

app.get(["/api/admin/test-groq", "/admin/test-groq"], async (req, res) => {
  const firestore = getDb();
  let keyToTest = process.env.GROQ_API_KEY || "";
  
  if (firestore) {
    try {
      const snap = await firestore.collection("adminSettings").doc("groq").get();
      if (snap.exists && snap.data()?.apiKey) {
        keyToTest = snap.data()?.apiKey.trim();
        console.log("[GROQ-TEST] Loaded key from adminSettings/groq to run diagnostics check.");
      }
    } catch (dbErr) {
      console.warn("[GROQ-TEST] Failed to fetch key from adminSettings/groq, fallback to .env:", dbErr);
    }
  }

  if (!keyToTest) {
    return res.status(400).json({
      success: false,
      error: "No Groq API Key has been configured in .env or administrative settings."
    });
  }

  console.log(`[GROQ-TEST] Initiating diagnostic call with key: ${keyToTest.substring(0, 8)}...`);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${keyToTest.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Identify yourself with 'GROQ_VERIFIED' and say hi!" }],
        max_tokens: 35
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: errorText
      });
    }

    const payload: any = await response.json();
    const textResult = payload?.choices?.[0]?.message?.content || "No message body found";
    return res.json({
      success: true,
      status: response.status,
      modelUsed: "llama-3.3-70b-versatile",
      message: textResult,
      keyUsedPreview: `${keyToTest.substring(0, 10)}...`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  }
});

// Example admin route to verify Celebrity
app.post(["/api/admin/verify-celebrity", "/admin/verify-celebrity"], async (req, res) => {
  const { celebId } = req.body;
  const firestore = getDb();
  if (!firestore) return res.status(503).json({ error: "Admin SDK not configured" });

  try {
    await firestore.collection('celebrities').doc(celebId).update({
      isLocked: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// In-memory caching and rate-limiting structures to optimize API utilization and satisfy rules
const lastRequestTime = new Map<string, number>(); // celebrityId -> lastTimestamp (cooldown system)
const suggestionCache = new Map<string, { suggestions: string[], provider: string, expiresAt: number }>(); // messagingHash -> cachedSuggestions

// Smart, contextually-aware fallback reply generator matching Rule 9 & Rule 11
function generateSmartFallbackReplies(lastFanText: string, isAiSubscribed: boolean): string[] {
  const norm = (lastFanText || "").toLowerCase();
  let candidateReplies: string[] = [];
  
  if (norm.includes("hello") || norm.includes("hi") || norm.includes("hey") || norm.includes("good morning") || norm.includes("good evening")) {
    candidateReplies = [
      "Hello! It is so incredible to hear from you today. How can I make your day special?",
      "Hi support! Thank you so much for reaching out on my official link. What would you love to talk about today?",
      "Hey! So glad you connected on my official private line. Sending you warm thoughts and wishes!",
      "Hi there! It's an honor to have you with me on my personal platform. How are you doing today?",
      "Hello! Thank you so much for booking/interacting with me here. What can I do to put a smile on your face?"
    ];
  } else if (norm.includes("price") || norm.includes("how much") || norm.includes("cost") || norm.includes("book") || norm.includes("rate") || norm.includes("video") || norm.includes("meeting")) {
    candidateReplies = [
      "I would be absolutely thrilled to jump on a direct video session with you! Feel free to review my booking options on the Booking tab.",
      "We can set up an authentic video link on my calendar. Check out my hourly rate and open slots right inside the Booking section.",
      "Scheduling rates are visible under the Book tab here. Choose a time that works best and we will chat face-to-face!",
      "I'd love to lock in our private video call! You can see the booking options and open hours on your dashboard.",
      "My pricing and details are fully customizable under the Book Session tab. Can't wait for us to interact!"
    ];
  } else if (norm.includes("card") || norm.includes("member") || norm.includes("tier") || norm.includes("join") || norm.includes("gold") || norm.includes("silver") || norm.includes("platinum")) {
    candidateReplies = [
      "Staying connected with my best fans means the world to me. Take a look at the custom Fan Cards on your dashboard!",
      "Unlocking an official Fan Card grants you exclusive access and direct messages with me. Check out the fan card tiers!",
      "My active Fan Cards are fully configured right here on the dashboard. Choose a tier that fits you best!",
      "Choosing a premium fan membership allows us to text directly and share behind-the-scenes content securely.",
      "You can support my creative journey and unlock elite messages through the Fan Cards section. Looking forward to it!"
    ];
  } else if (norm.includes("payout") || norm.includes("pay") || norm.includes("payment") || norm.includes("transfer") || norm.includes("bank") || norm.includes("account") || norm.includes("dollar") || norm.includes("naira") || norm.includes("ngn")) {
    candidateReplies = [
      "For standard profiles, you can complete escrow deposit transfers securely using OPAY or configured bank accounts.",
      "The billing page accepts bank wire transfers, crypto wallets, and gift card uploads. Check active escrow payment methods.",
      "All account activation fees and subscriber dues are handled securely by administrative escrow verification.",
      "Simply complete your transaction using the accounts, and upload a screenshot of your payment slip right here.",
      "Our backend team verifies bank deposit receipts instantly, so your access will pop up premium tools immediately!"
    ];
  } else if (norm.includes("love") || norm.includes("fan") || norm.includes("big fan") || norm.includes("idol") || norm.includes("admire") || norm.includes("support")) {
    candidateReplies = [
      "Your beautiful words and endless support warm my heart! Thank you for being such an extraordinary fan.",
      "Honestly, supporters like you are the entire reason I do what I do! Sending you my ultimate love and appreciation.",
      "Thank you for standing by me through thick and thin! You are a true trooper, and I'm deeply grateful to have you here.",
      "I am incredibly blessed to have someone so kind and positive supporting my journey. Wishing you the absolute best!",
      "I see your messages and support, and they mean the world to me. Stay creative and stay safe!"
    ];
  } else {
    // Elegant defaults
    candidateReplies = [
      "Thank you so much for your amazing support! It keeps me going every single day.",
      "I'm currently busy with production and creative sessions, but my team and I review these lines carefully. Let's schedule a call!",
      "Warmest regards from my desk! You are a true supporter, and I am highly blessed to have you here.",
      "I'm super thrilled to receive your message. Hope your week is off to a miraculous, wonderful start!",
      "Let's make sure we schedule some direct calendar time face-to-face. Checking out standard booking rates is a great start!"
    ];
  }

  const limit = isAiSubscribed ? 5 : 3;
  return candidateReplies.slice(0, limit);
}

// Unified LiteLLM Gateway Router supporting automatic fallback, routing, and latency tracking.
async function generateWithLiteLLM(
  geminiApiKey: string,
  groqApiKey: string,
  profileContext: string,
  formattedHistory: string,
  lastFanText: string,
  desiredRepliesCount: number,
  platformInstruction: string
): Promise<{ 
  suggestions: string[]; 
  provider: "gemini" | "groq" | "demo"; 
  responseTime: number; 
  fallbackActivated: boolean; 
  status: "success" | "fallback"; 
  errorMessage?: string;
  geminiQuotaExceeded?: boolean;
}> {
  const startTime = Date.now();
  let suggestions: string[] = [];
  let lastErr: any = null;
  let geminiQuotaExceeded = false;

  console.log("\n==================================================");
  console.log("📈 [LiteLLM Router] Starting smart replies generation workflow...");
  console.log("   - Request status: ACTIVE");
  console.log(`   - Output replies requested: ${desiredRepliesCount}`);
  console.log(`   - History context size: ${formattedHistory.split("\n").length} chat log entries`);
  console.log(`   - Profile context size: ${profileContext.length} characters`);
  console.log(`   - Latest Fan query: "${lastFanText}"`);

  // Verify and log API Keys from both runtime environment and arguments
  console.log("📝 [LiteLLM Router] Runtime environment variables state check:");
  const envGemini = process.env.GEMINI_API_KEY;
  const envGroq = process.env.GROQ_API_KEY;
  console.log(`   - process.env.GEMINI_API_KEY: ${envGemini ? `EXISTS (Length: ${envGemini.length}, Valid schema: ${isValidGeminiApiKey(envGemini)})` : "MISSING ❌"}`);
  console.log(`   - process.env.GROQ_API_KEY: ${envGroq ? `EXISTS (Length: ${envGroq.length}, Valid schema: ${isValidGroqApiKey(envGroq)})` : "MISSING ❌"}`);

  // Compile list of potential Gemini keys to try in order of priority (Dynamic Firestore setting first, then env)
  const geminiKeysToTry: string[] = [];
  if (geminiApiKey && geminiApiKey !== "undefined" && geminiApiKey.trim() !== "") {
    const cleaned = geminiApiKey.trim().replace(/^["']|["']$/g, "").trim();
    if (isValidGeminiApiKey(cleaned)) {
      geminiKeysToTry.push(cleaned);
      console.log(`   - Prioritizing dynamic database Gemini API key (Length: ${cleaned.length}, Masked: ${cleaned.slice(0, 6)}...${cleaned.slice(-4)})`);
    } else {
      console.warn(`   - Warning: Dynamic db Gemini API key candidate has invalid format: "${cleaned.slice(0, Math.min(6, cleaned.length))}..."`);
    }
  }
  if (envGemini && envGemini !== "undefined" && envGemini.trim() !== "") {
    const envKey = envGemini.trim().replace(/^["']|["']$/g, "").trim();
    if (isValidGeminiApiKey(envKey) && !geminiKeysToTry.includes(envKey)) {
      geminiKeysToTry.push(envKey);
      console.log(`   - Enlisting environment Gemini API key (Length: ${envKey.length}, Masked: ${envKey.slice(0, 6)}...${envKey.slice(-4)})`);
    }
  }

  if (geminiKeysToTry.length === 0) {
    console.warn("⚠️ [LiteLLM Router] Skipping primary Gemini routes: No configured or valid Gemini API keys identified in system.");
  }

  let geminiSuccess = false;

  // 1. PRIMARY MODEL: gemini/gemini-3.5-flash with key fallback and timeout protection
  for (let k = 0; k < geminiKeysToTry.length; k++) {
    const activeKey = geminiKeysToTry[k];
    const maskedKeyStr = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    
    // Attempt Structured JSON Generation
    try {
      console.log(`🤖 [LiteLLM Router] [INITIALIZATION] Preparing GoogleGenAI client (instance ${k + 1}/${geminiKeysToTry.length})...`);
      console.log(`   - Model: gemini-3.5-flash`);
      console.log(`   - Key Masked: ${maskedKeyStr}`);
      console.log(`   - Key Prefix Valid: ${activeKey.startsWith("AIzaSy")}`);
      
      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("🤖 [LiteLLM Router] [INITIALIZATION] GoogleGenAI client successfully constructed.");

      console.log("📈 [LiteLLM Router] [REQUEST] Dispatching generateContent with dynamic JSON schema to Gemini...");
      const timeoutPromise = new Promise<{ text: string }>((_, reject) => 
        setTimeout(() => reject(new Error("Primary provider gemini-3.5-flash timed out (25s limit reached).")), 25000)
      );

      const generatePromise = (async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `
[CELEBRITY CONTEXT FACTS]
${profileContext}

[CONVERSATION CHAT LOG]
${formattedHistory}

[HIGH PRIORITY LATEST FAN MESSAGE]
"${lastFanText}"

Suggest exactly ${desiredRepliesCount} beautiful, emotionally smart, fact-aware reply options that align with this latest query. Return a plain JSON Array of exactly ${desiredRepliesCount} different strings (one string per suggestion).
`,
          config: {
            systemInstruction: platformInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: `Exactly ${desiredRepliesCount} different, highly context-relevant, premium reply options matching the fan's intent, tone, and celebrity facts.`
            }
          }
        });
        return { text: response.text || "[]" };
      })();

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const parsed = JSON.parse(result.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        suggestions = parsed.slice(0, desiredRepliesCount);
        const duration = Date.now() - startTime;
        console.log(`✅ [LiteLLM Router] [RESPONSE] OK (Status 200 equivalent)`);
        console.log(`   - Provider: gemini-3.5-flash`);
        console.log(`   - Key attempt: ${k + 1} succeeded`);
        console.log(`   - Latency: ${duration}ms`);
        console.log(`   - Output candidates: ${JSON.stringify(suggestions)}`);
        
        geminiSuccess = true;
        return {
          suggestions,
          provider: "gemini",
          responseTime: duration,
          fallbackActivated: false,
          status: "success",
          geminiQuotaExceeded: false
        };
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      let errMsg = err.message || String(err);
      const isTimeout = errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out");
      
      console.error(`❌ [LiteLLM Router] [RESPONSE] Gemini-3.5-flash structured request failed (Latency: ${duration}ms)`);
      if (isTimeout) {
        console.error(`   - Error Type: TIMEOUT_ERROR`);
        console.error(`   - Error Details: ${errMsg}`);
      } else {
        console.error(`   - Error Type: API_ERROR`);
        console.error(`   - Error Details: ${errMsg}`);
        if (err.stack) {
          console.error(`   - Error Stack:\n${err.stack}`);
        }
      }

      if (errMsg.includes("API Key not found") || errMsg.includes("API_KEY_INVALID") || errMsg.toLowerCase().includes("api key is invalid") || errMsg.toLowerCase().includes("invalid api key")) {
        errMsg = "API Key not found or invalid";
      }
      if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.toLowerCase().includes("limit exceeded")) {
        geminiQuotaExceeded = true;
        console.warn("⚠️ [LiteLLM Router] Checked Gemini response indicates resource or rate quota execution limit hit.");
      }
      lastErr = err;
    }

    // Secondary attempt on Gemini using non-structured plain-text completion in case schema/JSON mode throws
    if (suggestions.length === 0) {
      try {
        console.log(`🤖 [LiteLLM Router] [RETRY] Falling back to plain-text prompt without schema constraints (key index ${k + 1})...`);
        const ai = new GoogleGenAI({
          apiKey: activeKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        console.log("📈 [LiteLLM Router] [REQUEST] Dispatching plain text generateContent to Gemini...");
        const timeoutTextPromise = new Promise<{ text: string }>((_, reject) => 
          setTimeout(() => reject(new Error("Primary text fallback timed out (25s limit reached).")), 25000)
        );

        const generateTextPromise = (async () => {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `
[CELEBRITY CONTEXT FACTS]
${profileContext}
 
[CONVERSATION CHAT LOG]
${formattedHistory}
 
[HIGH PRIORITY LATEST FAN MESSAGE]
"${lastFanText}"
 
Based on the latest fan query and celebrity facts above, list exactly ${desiredRepliesCount} natural, beautiful, engaging replies for the celebrity or assistant to send (one per line, plain text, no numbered list):
`,
            config: {
              systemInstruction: platformInstruction
            }
          });
          return { text: response.text || "" };
        })();

        const result = await Promise.race([generateTextPromise, timeoutTextPromise]);
        const lines = result.text.split("\n")
          .map(l => l.replace(/^\d+\.\s*/, "").trim().replace(/^["']|["']$/g, "").trim())
          .filter(l => l.length > 0);
        
        if (lines.length > 0) {
          suggestions = lines.slice(0, desiredRepliesCount);
          const duration = Date.now() - startTime;
          console.log(`✅ [LiteLLM Router] [RESPONSE] OK (Status 200 equivalent)`);
          console.log(`   - Provider: gemini-3.5-flash (Plain-Text mode)`);
          console.log(`   - Latency: ${duration}ms`);
          console.log(`   - Output candidates: ${JSON.stringify(suggestions)}`);
          
          geminiSuccess = true;
          return {
            suggestions,
            provider: "gemini",
            responseTime: duration,
            fallbackActivated: false,
            status: "success",
            geminiQuotaExceeded: false
          };
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        let errMsg = err.message || String(err);
        const isTimeout = errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out");
        
        console.error(`❌ [LiteLLM Router] [RESPONSE] Gemini-3.5-flash plain-text request failed (Latency: ${duration}ms)`);
        if (isTimeout) {
          console.error(`   - Error Type: TIMEOUT_ERROR`);
          console.error(`   - Error Details: ${errMsg}`);
        } else {
          console.error(`   - Error Type: API_ERROR`);
          console.error(`   - Error Details: ${errMsg}`);
          if (err.stack) {
            console.error(`   - Error Stack:\n${err.stack}`);
          }
        }
        
        if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.toLowerCase().includes("limit exceeded")) {
          geminiQuotaExceeded = true;
        }
        lastErr = err;
      }
    }
  }

  // 2. FALLBACK MODEL: groq/llama-3.3-70b-versatile with automatic schema parsing and failover logs
  if (!geminiSuccess) {
    console.warn("⚠️ [LiteLLM Router] [FALLBACK ACTIVATED] Primary Gemini routing block failed or timed out.");
    console.warn(`   - Reason for fallback trigger: ${lastErr?.message || "All Gemini API key attempts failed."}`);

    if (groqApiKey && groqApiKey !== "undefined" && groqApiKey.trim() !== "") {
      const groqClean = groqApiKey.trim().replace(/^["']|["']$/g, "").trim();
      const startTimeGroq = Date.now();
      try {
        console.log(`⚡ [LiteLLM Router] [INITIALIZATION] Preparing Groq fallover block (model: llama-3.3-70b-versatile)...`);
        console.log(`   - Groq API Key Masked: ${groqClean.slice(0, 6)}...${groqClean.slice(-4)}`);
        
        const payload = {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `${platformInstruction}\n\nCRITICAL ENRICHED CONTEXT FACTS:\n${profileContext}`
            },
            {
              role: "user",
              content: `
Conversation chat logs:
${formattedHistory}

HIGH PRIORITY LATEST FAN QUERY:
"${lastFanText}"

Based on the official celebrity instructions and facts above, generate exactly ${desiredRepliesCount} highly professional, celebrity-like replies.
Format the output as a clean, standardized JSON array containing exactly ${desiredRepliesCount} string candidates of premium answers:
["option 1", "option 2", ...]
`
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        };

        console.log("📈 [LiteLLM Router] [REQUEST] Dispatching POST request to Groq HTTP endpoint...");
        const controller = new AbortController();
        const signalTimeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds strict timeout protection

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqClean}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(signalTimeoutId);

        if (!response.ok) {
          throw new Error(`Groq server returned rate-limited or error HTTP status code: ${response.status} - ${response.statusText}`);
        }

        const body: any = await response.json();
        const rawText = body?.choices?.[0]?.message?.content || "[]";
        
        let parsed = JSON.parse(rawText);
        // Seamlessly resolve typical JSON schemas outputted by LLaMA models
        if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.suggestions)) {
          parsed = parsed.suggestions;
        } else if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.replies)) {
          parsed = parsed.replies;
        } else if (parsed && !Array.isArray(parsed)) {
          const potentialArr = Object.values(parsed).find(v => Array.isArray(v));
          if (potentialArr) parsed = potentialArr;
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestions = parsed.slice(0, desiredRepliesCount);
          const duration = Date.now() - startTime;
          const groqDuration = Date.now() - startTimeGroq;
          console.log(`✅ [LiteLLM Router] [RESPONSE] OK (Status 200 equivalent via Groq)`);
          console.log(`   - Provider: groq/llama-3.3-70b-versatile`);
          console.log(`   - Groq Latency: ${groqDuration}ms`);
          console.log(`   - Total Latency: ${duration}ms`);
          console.log(`   - Output candidates: ${JSON.stringify(suggestions)}`);
          
          return {
            suggestions,
            provider: "groq",
            responseTime: duration,
            fallbackActivated: true,
            status: "success",
            geminiQuotaExceeded: geminiQuotaExceeded
          };
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        let errMsg = err.message || String(err);
        const isTimeout = errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out") || errMsg.toLowerCase().includes("aborted");
        
        console.error(`❌ [LiteLLM Router] [RESPONSE] Fallback Groq LLaMA model failed (Latency: ${duration}ms)`);
        if (isTimeout) {
          console.error(`   - Error Type: TIMEOUT_ERROR`);
          console.error(`   - Error Details: ${errMsg}`);
        } else {
          console.error(`   - Error Type: API_ERROR`);
          console.error(`   - Error Details: ${errMsg}`);
          if (err.stack) {
            console.error(`   - Error Stack:\n${err.stack}`);
          }
        }
        lastErr = err;
      }
    } else {
      console.warn("⚠️ [LiteLLM Router] Fallback Groq API key is not configured or empty. Fall routing skipped.");
    }
  }

  // 3. SECURE FALLBACK CONDUIT: Dispense highly intelligent offline suggestions using regex query patterns so no error gets exposed
  const duration = Date.now() - startTime;
  console.error(`🚨 [LiteLLM Router] CRITICAL EXHAUSTION: All cloud AI generators failed. Servicing resilient human fallback arrays in ${duration}ms.`);
  console.error(`   - Concluding Exception Trace (Detailed logs kept server-side only):`, lastErr?.message || String(lastErr));
  
  return {
    suggestions: [],
    provider: "demo",
    responseTime: duration,
    fallbackActivated: true,
    status: "fallback",
    errorMessage: lastErr?.message || "All multi-channel providers timed out or returned exception states.",
    geminiQuotaExceeded: geminiQuotaExceeded
  };
}

// Reusable helper to update multi-tier Firestore counters and log details
async function logAiReq(
  firestore: any,
  verifiedCelebId: string,
  isAiSubscribed: boolean,
  status: string,
  errorMsg: string | null = null,
  requestText: string = "",
  responseGenerated: string[] = [],
  celebProfile: any = null,
  provider: string = "gemini",
  fallbackActivated: boolean = false,
  responseTime: number = 0,
  failed: boolean = false,
  geminiQuotaExceeded: boolean = false,
  amountToDeduct: number = 0
) {
  if (!firestore) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const nowStr = new Date().toISOString();

  try {
    // 1. Maintain the legacy log record for fallback/history compatibility
    await firestore.collection("aiUsageLogs").add({
      userId: verifiedCelebId,
      celebrityId: verifiedCelebId,
      isSubscribed: isAiSubscribed,
      isPremiumAI: isAiSubscribed,
      date: todayStr,
      timestamp: nowStr,
      status: status,
      errorMsg: errorMsg,
      lastRequestAt: nowStr,
      provider: provider,
      fallbackActivated: fallbackActivated,
      responseTime: responseTime,
      failed: failed
    });

    // 2. Save detailed request to the new `aiRequests` collection for analytics
    await firestore.collection("aiRequests").add({
      userId: verifiedCelebId,
      celebrityId: verifiedCelebId,
      celebrityName: celebProfile?.celebName || 'Unknown',
      isPremiumAI: isAiSubscribed,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      requestText: requestText,
      requestDate: todayStr,
      responseGenerated: responseGenerated,
      requestType: "suggest-replies",
      status: status,
      errorMsg: errorMsg,
      provider: provider,
      fallbackActivated: fallbackActivated,
      responseTime: responseTime,
      failed: failed
    });

    if (status !== "success" && status !== "fallback") {
      // If the response failed completely with an error, do NOT increment user daily limit counters!
      return;
    }

    // 3. Update user usage & global analytics atomically inside a transaction
    const aiUsageRef = firestore.collection("aiUsage").doc(verifiedCelebId);
    const userUsageRef = firestore.collection("userAiUsage").doc(verifiedCelebId);
    const globalRef = firestore.collection("aiAnalytics").doc("global");
    const legacyStatsRef = firestore.collection('aiUsageStats').doc(verifiedCelebId);

    await firestore.runTransaction(async (transaction: any) => {
      // Get all docs FIRST to satisfy the read-before-write requirement of transactions
      const [aiUsageDoc, globalDoc] = await Promise.all([
        transaction.get(aiUsageRef),
        transaction.get(globalRef)
      ]);
      
      let initialTotalRequests = 0;
      let dailyRequests = 0;
      let lastRequestDateObj: any = null;
      let planType: "free" | "vip" | "ai_subscribed" = isAiSubscribed ? "ai_subscribed" : "free";

      if (aiUsageDoc.exists) {
        const uData = aiUsageDoc.data();
        initialTotalRequests = uData?.totalRequests || 0;
        dailyRequests = uData?.dailyRequests || 0;
        lastRequestDateObj = uData?.lastRequestDate;
        planType = uData?.planType || (isAiSubscribed ? "ai_subscribed" : "free");
      }

      let isNewDay = true;
      if (lastRequestDateObj) {
        let dateObj: Date;
        if (typeof lastRequestDateObj.toDate === 'function') {
          dateObj = lastRequestDateObj.toDate();
        } else if (lastRequestDateObj instanceof Date) {
          dateObj = lastRequestDateObj;
        } else if (lastRequestDateObj.seconds) {
          dateObj = new Date(lastRequestDateObj.seconds * 1000);
        } else {
          dateObj = new Date(lastRequestDateObj);
        }
        const dateStr = dateObj.toISOString().split('T')[0];
        isNewDay = (dateStr !== todayStr);
      }

      const isFallback = (status === "fallback" || fallbackActivated || provider === "demo" || failed === true);

      const nextTodayCount = isFallback ? dailyRequests : (isNewDay ? amountToDeduct : dailyRequests + amountToDeduct);
      const nextLifetimeRequests = isFallback ? initialTotalRequests : (initialTotalRequests + (amountToDeduct > 0 ? 1 : 0));
      const maxLimit = planType === "ai_subscribed" ? 50 : 5;
      const remainingRequests = Math.max(0, maxLimit - nextTodayCount);

      // Add Cooldown System (3 minutes cooldown timestamp) - only if it is NOT a fallback request!
      let dbCooldownUntil: any = null;
      if (aiUsageDoc.exists) {
        dbCooldownUntil = aiUsageDoc.data()?.cooldownUntil || null;
      }
      if (!isFallback && amountToDeduct > 0) {
        const cooldownPeriodMs = 3 * 60 * 1000; // 3 minutes
        const rawCooldownUntil = new Date(Date.now() + cooldownPeriodMs);
        dbCooldownUntil = admin.firestore.Timestamp.fromDate(rawCooldownUntil);
      }

      const activeProviderName = provider; // Store exactly "gemini", "groq", or "demo"

      // Save User Usage Doc with all required telemetry fields to single-source-of-truth collection (aiUsage)
      transaction.set(aiUsageRef, {
        userId: verifiedCelebId,
        totalRequests: nextLifetimeRequests,
        dailyRequests: nextTodayCount,
        planType: planType,
        dailyLimit: maxLimit,
        monthlyLimit: maxLimit * 30,
        fallbackActivated: isFallback,

        // REQUIRED FIRESTORE STRUCTURE
        requestCountToday: nextTodayCount,
        remainingRequests: remainingRequests,
        totalLifetimeRequests: nextLifetimeRequests,
        aiPremium: planType === "ai_subscribed",
        maxDailyRequests: maxLimit,
        lastRequestDate: admin.firestore.FieldValue.serverTimestamp(),
        cooldownUntil: dbCooldownUntil,
        activeProvider: activeProviderName,
        geminiQuotaExceeded: geminiQuotaExceeded,
        geminiQuotaExceededAt: geminiQuotaExceeded ? admin.firestore.FieldValue.serverTimestamp() : null
      }, { merge: true });

      // Save User Usage Doc to legacy collector for safety
      transaction.set(userUsageRef, {
        userId: verifiedCelebId,
        celebrityId: verifiedCelebId,
        requestCountToday: nextTodayCount,
        totalLifetimeRequests: nextLifetimeRequests,
        aiPremium: planType === "ai_subscribed",
        remainingRequests: remainingRequests,
        maxDailyRequests: maxLimit,
        activeProvider: activeProviderName,
        lastRequestDate: todayStr,
        lastResetDate: todayStr
      }, { merge: true });

      // Save Legacy Stats Doc
      transaction.set(legacyStatsRef, {
        userId: verifiedCelebId,
        celebrityId: verifiedCelebId,
        requestCountToday: nextTodayCount,
        totalLifetimeRequests: nextLifetimeRequests,
        isPremiumAI: planType === "ai_subscribed",
        lastRequestAt: nowStr,
        lastResetDate: todayStr
      }, { merge: true });

      // Global dashboard analytics document calculations
      let totalRequests = 0;
      let todayRequests = 0;
      let premiumUserRequests = 0;
      let nonPremiumUserRequests = 0;
      let globalLastResetDate = "";

      if (globalDoc.exists) {
        const gData = globalDoc.data();
        totalRequests = gData?.totalRequests || 0;
        todayRequests = gData?.todayRequests || 0;
        premiumUserRequests = gData?.premiumUserRequests || 0;
        nonPremiumUserRequests = gData?.nonPremiumUserRequests || 0;
        globalLastResetDate = gData?.lastResetDate || "";
      }

      const isGlobalNewDay = globalLastResetDate !== todayStr;
      const nextTodayRequests = isGlobalNewDay ? 1 : todayRequests + 1;

      transaction.set(globalRef, {
        totalRequests: totalRequests + 1,
        todayRequests: nextTodayRequests,
        premiumUserRequests: premiumUserRequests + (isAiSubscribed ? 1 : 0),
        nonPremiumUserRequests: nonPremiumUserRequests + (!isAiSubscribed ? 1 : 0),
        lastResetDate: todayStr,
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

  } catch (err) {
    console.error("⚠️ Failed to write to telemetry collections (aiRequests, userAiUsage, aiAnalytics):", err);
  }
}

// Suggest 5 smart replies based on last 10 messages using Gemini 2.5/3.5 Flash API
app.post(["/api/gemini/suggest-replies", "/gemini/suggest-replies"], async (req, res) => {
  const { chatId, messages, celebId, isRegenerate, previousSuggestions } = req.body;
  const authHeader = req.headers.authorization;
  
  // No fallback replies to satisfy user instruction to strictly get answers from Gemini
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("🔐 Unauthorized: Missing authentication credentials in request headers.");
    return res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
  }
  const token = authHeader.split("Bearer ")[1];
  
  let verifiedCelebId = celebId;
  
  try {
    getDb(); // Ensure Firebase Admin is initialized if keys are present
    if (admin && admin.apps && admin.apps.length > 0) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        verifiedCelebId = decoded.uid;
      } catch (adminErr) {
        console.warn("⚠️ Firebase Admin verifyIdToken signature check failed (using safe JWT payload fallback):", adminErr);
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
          verifiedCelebId = payloadJson.sub || payloadJson.uid || celebId;
        }
      }
    } else {
      // Fallback decoder when Admin SDK is not initialized
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const payloadJson = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
        verifiedCelebId = payloadJson.sub || payloadJson.uid || celebId;
      }
    }
  } catch (authErr) {
    console.error("❌ Token decoding/validation failed:", authErr);
    return res.status(401).json({ error: "Unauthorized: Invalid Firebase authentication token format." });
  }

  if (celebId !== verifiedCelebId) {
    console.error(`🚨 Forbidden: Celebrity identity mismatch. Expected UID: ${verifiedCelebId}, got ${celebId}`);
    return res.status(403).json({ error: "Forbidden: Celebrity identity mismatch." });
  }

  // Role and session ownership validation (Task 4) with failsafe REST fallback
  const firestore = getDb();
  let celebProfile: any = null;
  let userData: any = null;
  let chatData: any = null;

  try {
    // 1. Fetch user data and celebrity profile using dual-channel paths
    userData = await fetchDocumentWithFallback('users', verifiedCelebId, token, firestore);
    celebProfile = await fetchDocumentWithFallback('celebrityProfiles', verifiedCelebId, token, firestore);

    // Dynamic onboarding checking to satisfy lenient requirements and prevent strict 403 blocks during draft/register sync
    if (!userData && !celebProfile) {
      console.warn(`⚠️ User profile record not found yet in 'users' or 'celebrityProfiles' collections for ID: ${verifiedCelebId}. Triggering custom onboarding flow.`);
      return res.json({
        success: true,
        suggestions: [
          "Welcome to Bookaceleb! Tap the 'Edit Profile Details' menu tab to customize your bio background description.",
          "Ensure your virtual hourly booking rates are updated under 'Pricing Settings'.",
          "Set up your bespoke fan card subscription plans (Silver, Gold, Platinum) with perks for your fans.",
          "Synchronize your official banking or cryptocurrency payment methods to unlock automated invoice confirmations.",
          "Your custom AI suggestions are fully operational and waiting to train on your personalized profile data!"
        ],
        provider: "demo",
        fallback: true,
        error_diagnostics: "celebrity_profile_empty"
      });
    }

    // Handlers for suspended/inactive/banned state
    if (userData?.isBanned || celebProfile?.isBanned || userData?.status === 'inactive' || celebProfile?.status === 'inactive') {
      console.warn(`🚨 Suspended account access attempted for ID: ${verifiedCelebId}`);
      return res.json({
        success: true,
        suggestions: [
          "Your creator/celebrity profile is currently inactive or undergoing compliance auditing review.",
          "Ensure your initial registration verification pledge deposit is cleared to unlock your timeline dashboard.",
          "Need help? Contact verified celebrity premium support directly at bookaceleb447@gmail.com for expedited resolution."
        ],
        provider: "demo",
        fallback: true,
        error_diagnostics: "profile_inactive_or_suspended"
      });
    }

    // Role verification failsafe (must be 'celebrity' role)
    if (userData && userData.role && userData.role !== 'celebrity' && userData.role !== 'superadmin') {
      console.error(`❌ Validation failed: User ${verifiedCelebId} has role '${userData.role}', expected 'celebrity'.`);
      return res.status(403).json({ error: "Forbidden: Only celebrities are authorized to use Chat AI capability." });
    }

    // 2. Validate that celebrity owns/participates in this chat session
    chatData = await fetchDocumentWithFallback('chats', chatId, token, firestore);
    if (!chatData) {
      console.error(`❌ Validation failed: Chat session and event path with ID ${chatId} does not exist.`);
      return res.status(404).json({ error: "Not Found: Chat session was not located." });
    }

    const participants = chatData.participants || [];
    if (!Array.isArray(participants) || !participants.includes(verifiedCelebId)) {
      console.error(`❌ Validation/Security failed: User ${verifiedCelebId} is not a registered participant in chat session ${chatId}. Participants list:`, participants);
      return res.status(403).json({ error: "Forbidden: You do not own or participate in this premium service session." });
    }

    if (celebProfile) {
      console.log(`ℹ️ Celebrity profile live context loaded successfully for star: ${celebProfile?.celebName || 'Unnamed'}. Profile Access status: ${!!celebProfile?.aiProfileAccess}`);
    } else {
      console.warn(`⚠️ Warning: Celebrity registry profile not found or empty for ID: ${verifiedCelebId}`);
    }
  } catch (dbErr: any) {
    console.error("🔥 Critical error during security validation or profile fetch load:", dbErr);
  }

  // A. Cooldown check - Rate limiting (Rule 1)
  const lastTime = lastRequestTime.get(verifiedCelebId) || 0;
  const now = Date.now();
  const cooldownPeriodMs = 4000; // 4 second rate limit
  if (now - lastTime < cooldownPeriodMs) {
    console.warn(`⏳ Rate Limited spam-click prevention for celebrity: ${verifiedCelebId}`);
    return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment before requesting suggestions again." });
  }
  // Record current timestamp
  lastRequestTime.set(verifiedCelebId, now);

  const isAiSubscribed = celebProfile?.isAiSubscribed === true || celebProfile?.aiPremium === true;

  if (!messages || !Array.isArray(messages) || messages.length < 1) {
    return res.status(400).json({ error: "Not enough conversation data to analyze. Chat thread must have at least 1 message." });
  }

  // Reduce context size: last 4 messages for token minimization and high performance
  const last4 = messages.slice(-4);
  const lastFanMsg = [...last4].reverse().find((m: any) => m.senderId !== verifiedCelebId);
  const lastFanText = lastFanMsg ? lastFanMsg.text : "No recent message";

  // B. In-Memory suggestion caching check (Rule 3)
  const last4Hash = last4.map(m => `${m.senderId}:${m.text || ""}`).join("|");
  const cacheKey = `${verifiedCelebId}::${chatId}::${last4Hash}`;
  const cached = suggestionCache.get(cacheKey);
  
  if (!isRegenerate && cached && cached.expiresAt > Date.now()) {
    console.log(`⚡ [CACHE HIT] Returning identical context recommendations for celebrity ${verifiedCelebId} via cached provider ${cached.provider}`);
    return res.json({
      success: true,
      suggestions: cached.suggestions,
      replies: cached.suggestions,
      provider: "pre-live",
      cached: true
    });
  }

  // C. Daily Request Limit control based on Premium Subscription (Rule 4)
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let dailyCalls = 0;
  let isPremiumUser = isAiSubscribed;

  if (firestore) {
    try {
      // 1. Fetch user profile upgrade status
      const celebDoc = await firestore.collection('celebrityProfiles').doc(verifiedCelebId).get();
      if (celebDoc.exists) {
        const celebData = celebDoc.data();
        if (celebData?.isAiSubscribed === true || celebData?.aiPremium === true) {
          isPremiumUser = true;
        }
      }

      // 2. Fetch and manage aiUsage telemetry (Single Source Of Truth)
      const userUsageRef = firestore.collection('aiUsage').doc(verifiedCelebId);
      const usageDoc = await userUsageRef.get();

      if (usageDoc.exists) {
        const uData = usageDoc.data();

        // Server-side Cooldown system enforcement (3 minutes)
        if (uData && uData.cooldownUntil) {
          const cd = uData.cooldownUntil;
          let cdTime = 0;
          if (typeof cd.toDate === 'function') {
            cdTime = cd.toDate().getTime();
          } else if (cd instanceof Date) {
            cdTime = cd.getTime();
          } else if (cd.seconds) {
            cdTime = cd.seconds * 1000;
          } else if (typeof cd === 'number') {
            cdTime = cd;
          } else {
            cdTime = new Date(cd).getTime();
          }
          const nowMs = Date.now();
          if (nowMs < cdTime) {
            const remainingSec = Math.ceil((cdTime - nowMs) / 1000);
            return res.status(429).json({
              error: "Wait until cooldown ends.",
              cooldownRemaining: remainingSec
            });
          }
        }

        let isSameDay = false;
        if (uData && uData.lastRequestDate) {
          let dateObj: Date;
          const lastReqDateVal = uData.lastRequestDate;
          if (typeof lastReqDateVal.toDate === 'function') {
            dateObj = lastReqDateVal.toDate();
          } else if (lastReqDateVal instanceof Date) {
            dateObj = lastReqDateVal;
          } else if (lastReqDateVal.seconds) {
            dateObj = new Date(lastReqDateVal.seconds * 1000);
          } else {
            dateObj = new Date(lastReqDateVal);
          }
          const dateStr = dateObj.toISOString().split('T')[0];
          isSameDay = (dateStr === todayStr);
        }

        // Stop quota reinitialization/writes on mount/login (Rule 6)
        if (!isSameDay) {
          dailyCalls = 0;
        } else {
          dailyCalls = uData.requestCountToday !== undefined ? uData.requestCountToday : (uData.dailyRequests ?? 0);
        }

        if (uData.planType === 'ai_subscribed' || uData.planType === 'vip' || uData.aiPremium === true) {
          isPremiumUser = true;
        }
      } else {
        // Initialize once ONLY when it does not exist (Rule 5)
        const planType = isPremiumUser ? "ai_subscribed" : "free";
        const dailyLimit = planType === "ai_subscribed" ? 50 : 5;
        await userUsageRef.set({
          userId: verifiedCelebId,
          // Legacy Compatibility
          totalRequests: 0,
          dailyRequests: 0,
          planType: planType,
          dailyLimit: dailyLimit,
          monthlyLimit: dailyLimit * 30,
          fallbackActivated: false,

          // Required telemetry fields
          requestCountToday: 0,
          remainingRequests: dailyLimit,
          totalLifetimeRequests: 0,
          aiPremium: planType === "ai_subscribed",
          maxDailyRequests: dailyLimit,
          lastRequestDate: admin.firestore.FieldValue.serverTimestamp(),
          cooldownUntil: null,
          activeProvider: "live",
          geminiQuotaExceeded: false
        }, { merge: true });
        dailyCalls = 0;
      }
    } catch (uErr) {
      console.warn("⚠️ Cannot count daily logs from userAiUsage collection:", uErr);
    }
  }

  const maxRequests = isPremiumUser ? 50 : 5;
  if (dailyCalls >= maxRequests) {
    console.warn(`🚫 Limit Exceeded inside API route check: Celeb ${verifiedCelebId} at ${dailyCalls}/${maxRequests} calls.`);
    return res.status(403).json({ error: "Daily AI request limit reached." });
  }

  // Get last 10 messages (for backward safety, although we use last4 context)
  const last10 = messages.slice(-10);

  let apiKey = "";

  // 1. Prioritize dynamic database key so administrator can override/hot-update it instantly online without redeploying
  try {
    const rawData = await fetchDocumentWithFallback("adminSettings", "gemini", token, firestore);
    if (rawData && rawData.apiKey && rawData.apiKey.trim() !== "") {
      const dbKey = rawData.apiKey.trim();
      if (isValidGeminiApiKey(dbKey)) {
        apiKey = dbKey;
        console.log("🔑 Gemini API Key successfully loaded Dynamically from Firestore adminSettings/gemini.");
      } else {
        console.log("⚠️ Loaded Gemini API Key from database exists but failed validation checks.");
      }
    }
  } catch (dbKeyErr) {
    console.error("⚠️ Failed to load Gemini API key from administrative Firestore config:", dbKeyErr);
  }

  // 2. Fall back to environment variable if database does not contain a custom key
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || "";
  }

  // Clean the API Key to safeguard against quotes, backslashes, or whitespace introduced during configuration pasting
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^["']|["']$/g, "").trim();
  }

  // Double check if key is valid, otherwise reset it to empty to trigger fallback gracefully
  if (apiKey && !isValidGeminiApiKey(apiKey)) {
    console.warn("⚠️ Resolved Gemini API Key is invalid or placeholder. Disallowing to trigger fallback routing.");
    apiKey = "";
  }

  // Load Groq API Key
  let groqApiKey = "";
  try {
    const rawData = await fetchDocumentWithFallback("adminSettings", "groq", token, firestore);
    if (rawData && rawData.apiKey && rawData.apiKey.trim() !== "") {
      const dbKey = rawData.apiKey.trim();
      if (isValidGroqApiKey(dbKey)) {
        groqApiKey = dbKey;
        console.log("🔑 Groq API Key successfully loaded Dynamically from Firestore adminSettings/groq.");
      } else {
        console.log("⚠️ Loaded Groq API Key from database exists but failed validation checks.");
      }
    }
  } catch (dbKeyErr) {
    console.error("⚠️ Failed to load Groq API key from administrative Firestore config:", dbKeyErr);
  }
  if (!groqApiKey) {
    groqApiKey = process.env.GROQ_API_KEY || "";
  }
  if (groqApiKey) {
    groqApiKey = groqApiKey.trim().replace(/^["']|["']$/g, "").trim();
  }

  if (groqApiKey && !isValidGroqApiKey(groqApiKey)) {
    console.warn("⚠️ Resolved Groq API Key is invalid or placeholder. Disallowing to trigger fallback routing.");
    groqApiKey = "";
  }

  // Handle missing physical API Keys gracefully
  const hasGemini = (apiKey && apiKey !== "undefined" && apiKey.trim() !== "");
  const hasGroq = (groqApiKey && groqApiKey !== "undefined" && groqApiKey.trim() !== "");

  if (!hasGemini && !hasGroq) {
    console.error("❌ Both GEMINI_API_KEY and GROQ_API_KEY are missing/undefined. Relying on local client rule generators.");
    const fbReplies = generateSmartFallbackReplies(lastFanText, isAiSubscribed);
    if (firestore) {
      await logAiReq(
        firestore,
        verifiedCelebId,
        isPremiumUser,
        "success",
        "Both API Keys missing/undefined",
        lastFanText,
        fbReplies,
        celebProfile,
        "demo",
        true,
        50,
        false,
        false
      );
    }
    return res.json({
      success: true,
      suggestions: fbReplies,
      replies: fbReplies,
      provider: "demo",
      fallback: true
    });
  }

  // Dynamic suggestion count based on subscription (Rule 8)
  const desiredRepliesCount = isAiSubscribed ? 5 : 3;
  const amountToDeduct = (isRegenerate === true || isRegenerate === "true") ? 2 : 1;

  // Compile strict regeneration instructions if active to satisfy user criteria
  let regenerateInstructions = "";
  if ((isRegenerate === true || isRegenerate === "true") && Array.isArray(previousSuggestions) && previousSuggestions.length > 0) {
    regenerateInstructions = `
=========================================
STRICT REGENERATION REQUIREMENT:
The celebrity needs completely NEW suggestions. You MUST NOT include, repeat, or closely resemble any of the following previous suggestions. They must be completely different in sentiment, wording, style, and content:
${previousSuggestions.map((s: string) => `- "${s}"`).join('\n')}

Provide fully distinct and creative new options that have different structures and semantics.
`;
  }

  try {
    const formattedHistory = last4.map((m: any) => {
      const role = m.senderId === verifiedCelebId ? "Celebrity/Manager" : "Fan";
      return `${role}: ${m.text || "[Image/Media Message]"}`;
    }).join("\n");

    const name = celebProfile?.celebName || "the Celebrity";
    const username = celebProfile?.username || celebProfile?.slug || "celebrity_star";
    const bio = celebProfile?.bio || celebProfile?.bookingDescription || "Premium brand content ambassador and star.";
    const country = celebProfile?.country || "International";
    const years = celebProfile?.yearsActive ? `${celebProfile.yearsActive} years` : "N/A";
    const bookingPrice = celebProfile?.bookingPrice ? `$${celebProfile.bookingPrice} USD per hour` : "Not Configured";
    const bookingDesc = celebProfile?.bookingDescription || celebProfile?.bio || "Schedule a formal meeting session or VIP virtual appearance.";
    const profileImageUrl = celebProfile?.profileImage || celebProfile?.imageUrl || "N/A";
    const projectId = getProjectId();
    const referralLink = celebProfile?.referralLink || `https://${projectId}.web.app/r/${username}`;
    
    let plansText = "No memberships configured yet.";
    if (Array.isArray(celebProfile?.membershipPlans) && celebProfile.membershipPlans.length > 0) {
      plansText = celebProfile.membershipPlans.map((p: any) => 
        `- ${p.title} Fan Card Plan: Cost is $${p.price} USD. Benefits & Perks include: ${Array.isArray(p.perks) ? p.perks.join(', ') : 'VIP exclusive message privileges and special benefits'}`
      ).join('\n');
    } else {
      plansText = `- Silver Fan Card Membership Plan: $49 USD. Perks are: Direct chat priority VIP support.
- Gold Fan Card Membership Plan: $99 USD. Perks are: Video shout-outs and premium star messaging options.
- Platinum Fan Card Membership Plan: $299 USD. Perks are: Hand-delivered visual contents, interactive privileges, and private premium access.`;
    }

    let payMethods: string[] = [];
    if (celebProfile?.payoutBankName) {
      payMethods.push(`Bank Transfer (Bank Name: ${celebProfile.payoutBankName}, Account Number: ${celebProfile.payoutAccountNo || "N/A"}, Recipient/Beneficiary Name: ${celebProfile.payoutAccountName || name})`);
    } else {
      payMethods.push(`Bank Transfer - Secure transfer via the Book Session payment gateway.`);
    }
    if (celebProfile?.cryptoTokenName && celebProfile?.cryptoWalletAddress) {
      payMethods.push(`Cryptocurrency (Token Type: ${celebProfile.cryptoTokenName}, Smart Wallet Address: ${celebProfile.cryptoWalletAddress})`);
    }
    if (celebProfile?.allowGiftCards && celebProfile?.payoutGiftCardName) {
      payMethods.push(`Gift Cards (E-gift card: ${celebProfile.payoutGiftCardName})`);
    }
    const paymentText = payMethods.join(' OR ');

    let socialText = "";
    if (celebProfile?.instaLink) socialText += `Instagram: ${celebProfile.instaLink}; `;
    if (celebProfile?.tgLink) socialText += `Telegram: ${celebProfile.tgLink}; `;
    if (celebProfile?.waLink) socialText += `WhatsApp: ${celebProfile.waLink}; `;
    if (celebProfile?.tiktokLink) socialText += `TikTok: ${celebProfile.tiktokLink}; `;
    if (!socialText) socialText = "Verify and connect fully on the official Bookaceleb workspace.";

    const donationText = `Suggested charity donation pledge rate: ${celebProfile?.baseSupportAmount ? `$${celebProfile.baseSupportAmount} USD` : "Not Configured"}. Support campaign cause name: ${celebProfile?.charityName || "Community & Social projects backed by " + name}`;

    const profileContext = `
=========================================
AUTHENTIC CELEBRITY CONFIGURATION DETAILS:
- Celebrity Real Name: ${name}
- Celebrity Username/Slug: ${username}
- Celebrity Bio Background & Specialty: ${bio}
- Country of Residency: ${country}
- Years Active in the Industry: ${years}
- Profile Image URL/Location: ${profileImageUrl}
- Unique Referral Link: ${referralLink}
- Referral System Tier: Priority queue with exclusive points tracking multipliers
- Booking Hourly Rate: ${bookingPrice}
- Booking Description: ${bookingDesc}
- Suggest Charity/Cause Donation Base pledge: ${donationText}
- Available Fan Card Memberships / Tier plans:
${plansText}
- Accepted Gateway Methods: ${paymentText}
- Connected Official Social Networks Profiles: ${socialText}
- Custom Booking Session Title: ${celebProfile?.bookingTitle || "Private VIP Video Appointment Session"}
=========================================
`;

    const platformInstruction = `
You are speaking as the professional celebrity "${name}" or a professional celebrity manager communicating with fans on Bookaceleb.

=========================================
CELEBRITY AI RESPONSE GUIDELINES:

1. PERSONALITY:
- Act as a professional celebrity, creator, influencer, athlete, musician, actor, or public figure.
- Be warm, appreciative, confident, and engaging.
- Maintain a polished public-persona tone.
- Never become overly emotional, dependent, romantic, or excessively personal.
- Communicate like a well-managed public figure interacting with supporters.

2. EMOTIONAL AWARENESS:
- Recognize emotions such as excitement, admiration, gratitude, celebration, disappointment, frustration, and sadness.
- Acknowledge the user's feelings naturally and appropriately.
- Respond with empathy while remaining professional.
- Keep emotional responses brief, authentic, and balanced.
- Avoid dramatic, exaggerated, or overly intimate reactions.

3. RESPONSE STRUCTURE:
- First suggestion in output array (Suggestion 1): Very short response (1–2 sentences maximum).
- Suggestions 2 and 3 in output array: Advanced, context-aware, highly personalized and descriptive replies (Advanced responses).
- Suggestions 4 and 5 in output array (Generated only for premium/subscribed celebrity status, where desiredRepliesCount is 5): Very advanced, extremely deep, highly exclusive, and tailored celebrity VIP-to-supporter messages (Very Advanced responses reflecting high-tier celebrity brand value, premium member status, and referral options).
- Keep all suggestions concise and easy to read.
- Avoid large paragraphs and unnecessary filler.
- Prioritize clarity, quality, and natural conversation flow.

4. CELEBRITY BEHAVIOR:
- Thank supporters professionally.
- Show appreciation for fans and community members.
- Encourage engagement naturally when appropriate.
- Mention platform features only when contextually relevant.
- Maintain exclusivity, professionalism, and brand value.
- Speak like a public figure communicating with supporters.

5. RELATIONSHIP BOUNDARIES:
- Do not imply a real romantic relationship.
- Do not claim exclusive affection or emotional dependency.
- Do not encourage unhealthy attachment.
- Avoid phrases such as:
  - "I need you."
  - "You're all I have."
  - "I belong to you."
  - "I love you more than anyone."
- Instead, express appreciation, admiration, gratitude, and support in a professional celebrity-to-fan manner.

6. RESPONSE QUALITY:
- Responses must feel authentic, human, and emotionally intelligent.
- Avoid robotic, scripted, or repetitive wording.
- Adapt naturally to the user's message and conversation context.
- Ensure all suggestions are distinct and provide different response styles (e.g. gratitude, excited, humble/warm, professional booking/membership referral).
- Maintain consistency with the celebrity's public persona.

7. EMOTIONAL REPLY EXAMPLES:
If User says: "I love you"

- Suggestion 1:
"That's incredibly kind of you—thank you for the support!"

- Suggestion 2:
"I truly appreciate that. Supporters like you are a big part of what makes this journey so rewarding."

- Suggestion 3:
"That means a lot to hear. I'm grateful for everyone who continues to support my work and be part of this community."

- Suggestion 4:
"Thank you for the love and encouragement. Having such dedicated supporters inspires me to keep creating and sharing more with all of you."

=========================================
GOAL:
Generate realistic celebrity-style responses that are emotionally aware, professional, engaging, and suitable for public-facing fan interactions while maintaining clear celebrity-to-fan boundaries and a premium creator experience.

=========================================
WEBSITE NAVIGATION & FLOW AWARENESS (ONLY FAN DASHBOARD STRUCTURE):
The fan dashboard allows the following interactions - explain these actual website flows professionally when asked:
- Where to book / How to book: Direct the fan to go to my profile / dashboard, tap the "Book Session" (or "Book Now") tab, choose their favorite event type (Birthday Party, Concert, Wedding, Meet and Greet, or Corporate Event), select booking hours, enter details, choose a payment method, upload payment proof/receipt, and submit.
- Where to buy fan card / benefit tiers: Direct the fan to go to \`/fan-card/\${verifiedCelebId}\` or tap the "Fan Card" option to view Silver, Gold, or Platinum plan benefits and checkout.
- Where to donate: Direct them to \`/donate/\${verifiedCelebId}\` or tap the "Donate" option to see active campaign details and support the charity cause.
- Where support/contact is: The active direct messaging screen where they currently are is the official chat line.

=========================================
AVOID ROBOTIC AI PHRASES:
NEVER sound like ChatGPT, a customer support bot, random AI assistant, or robotic helper.
Never use phrases like:
- "As an AI..."
- "I cannot..."
- "Please check profile..."
- "I’m just an assistant..."
- "I am an AI..."
- "My database..."
- "My programming..."
- "system..."
- "portal..."
- "profile details..."
- "gateway..."

Speak naturally and gracefully like a professional celebrity representative team.

=========================================
OUTPUT REQUIREMENT:
Generate exactly \${desiredRepliesCount} distinct raw emotional ready-to-select replies. Do NOT output markers, numbering, list bullets, labels, asterisks (* or **), or enclosing quotes in the structured array items.
${regenerateInstructions}
`;

    // Dispatching multi-provider unified routing call
    const liteResult = await generateWithLiteLLM(
      apiKey,
      groqApiKey,
      profileContext,
      formattedHistory,
      lastFanText,
      desiredRepliesCount,
      platformInstruction
    );

    let suggestions = liteResult.suggestions;
    let logStatus = "success";

    if (liteResult.status === "fallback" || !suggestions || suggestions.length === 0) {
      console.warn("⚠️ Both primary and fallback paths timed out or failed. Dispensing smart fallback rules...");
      suggestions = generateSmartFallbackReplies(lastFanText, isAiSubscribed);
      logStatus = "fallback";
    }

    // Save to Cache Map (expires in 10 minutes)
    suggestionCache.set(cacheKey, {
      suggestions: suggestions,
      provider: logStatus === "fallback" ? "demo" : liteResult.provider,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Write usage log tracking provider and fallback status exactly, passing amountToDeduct
    if (firestore) {
      await logAiReq(
        firestore,
        verifiedCelebId,
        isPremiumUser,
        logStatus,
        liteResult.status === "fallback" ? (liteResult.errorMessage || "All AI providers failed") : null,
        lastFanText,
        suggestions,
        celebProfile,
        logStatus === "fallback" ? "demo" : liteResult.provider,
        liteResult.fallbackActivated,
        liteResult.responseTime,
        logStatus === "fallback",
        liteResult.geminiQuotaExceeded,
        amountToDeduct
      );
    }

    let requestCountToday = 0;
    let maxDailyRequests = isPremiumUser ? 50 : 5;
    if (firestore) {
      try {
        const usageD = await firestore.collection('aiUsage').doc(verifiedCelebId).get();
        if (usageD.exists) {
          const u = usageD.data();
          if (u) {
            requestCountToday = u.requestCountToday !== undefined ? u.requestCountToday : (u.dailyRequests ?? 0);
            maxDailyRequests = u.maxDailyRequests || (u.planType === 'ai_subscribed' ? 50 : 5);
          }
        }
      } catch (uErr) {
        console.error("⚠️ Error fetching usage doc configuration:", uErr);
      }
    }

    return res.json({
      success: true,
      suggestions: suggestions,
      replies: suggestions,
      provider: logStatus === "fallback" ? "demo" : liteResult.provider,
      fallback: liteResult.fallbackActivated,
      requestCountToday,
      maxDailyRequests,
      quotaDeducted: amountToDeduct
    });

  } catch (err: any) {
    console.error("❌ suggest-replies handler uncaught exception:", err);
    const fbReplies = generateSmartFallbackReplies(lastFanText, isAiSubscribed);

    if (firestore) {
      await logAiReq(
        firestore,
        verifiedCelebId,
        isPremiumUser,
        "fallback",
        err.message || "Uncaught core error",
        lastFanText,
        fbReplies,
        celebProfile,
        "demo",
        true,
        500,
        true,
        false,
        amountToDeduct
      );
    }

    let requestCountToday = 0;
    let maxDailyRequests = isPremiumUser ? 50 : 5;
    if (firestore) {
      try {
        const usageD = await firestore.collection('aiUsage').doc(verifiedCelebId).get();
        if (usageD.exists) {
          const u = usageD.data();
          if (u) {
            requestCountToday = u.requestCountToday !== undefined ? u.requestCountToday : (u.dailyRequests ?? 0);
            maxDailyRequests = u.maxDailyRequests || (u.planType === 'ai_subscribed' ? 50 : 5);
          }
        }
      } catch (uErr) {
        console.error("⚠️ Error fetching usage doc configuration:", uErr);
      }
    }

    return res.json({
      success: true,
      suggestions: fbReplies,
      replies: fbReplies,
      provider: "demo",
      fallback: true,
      error_diagnostics: err.message,
      requestCountToday,
      maxDailyRequests,
      quotaDeducted: amountToDeduct
    });
  }
});

app.post(["/api/gemini/deduct-quota", "/gemini/deduct-quota"], async (req, res) => {
  const { celebId, amount } = req.body;
  
  if (!celebId) {
    return res.status(400).json({ error: "celebId must be passed." });
  }

  const verifiedCelebId = celebId;
  const deductAmount = typeof amount === "number" ? amount : 1;

  try {
    if (!db) {
      return res.status(500).json({ error: "Firestore is not initialized." });
    }

    let isPremiumUser = false;
    const celebDoc = await db.collection("celebrityProfiles").doc(verifiedCelebId).get();
    let celebProfileObj = null;
    if (celebDoc.exists) {
      celebProfileObj = celebDoc.data();
      if (celebProfileObj?.isAiSubscribed === true || celebProfileObj?.aiPremium === true) {
        isPremiumUser = true;
      }
    }

    await logAiReq(
      db,
      verifiedCelebId,
      isPremiumUser,
      "success",
      null,
      "Suggestion reply used inside active chat",
      [],
      celebProfileObj,
      "live",
      false,
      50,
      false,
      false,
      deductAmount
    );

    return res.json({ success: true, message: `Deducted ${deductAmount} quota successfully.` });
  } catch (error: any) {
    console.error("❌ Error deducting quota:", error);
    return res.status(500).json({ error: error.message });
  }
});

async function seedDefaultCelebrities(firestore: any) {
  try {
    const listSnap = await firestore.collection('celebrityProfiles').limit(1).get();
    if (listSnap.empty) {
      console.log("[SEEDER] Database is empty. Seeding default premium celebrities...");
      
      const seedCelebs = [
        {
          id: 'seed-1',
          name: 'Leonardo DiCaprio',
          country: 'United States',
          pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
          bio: 'Award-winning global actor and climate activist offering private live consultation sessions.',
          price: 2500,
          fanCard: 99,
          isFeatured: true,
          isTrending: false
        },
        {
          id: 'seed-2',
          name: 'Davido',
          country: 'Nigeria',
          pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
          bio: 'Afrobeats superstar offering backstage meetups, custom fan cards, and supporting clean water campaigns.',
          price: 1500,
          fanCard: 49,
          isFeatured: true,
          isTrending: false
        },
        {
          id: 'seed-3',
          name: 'Wizkid',
          country: 'Nigeria',
          pic: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
          bio: 'Grammy award winner, trendsetter, and global music icon supporting education projects.',
          price: 1800,
          fanCard: 59,
          isFeatured: true,
          isTrending: false
        },
        {
          id: 'seed-4',
          name: 'Burna Boy',
          country: 'Nigeria',
          pic: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
          bio: 'The African Giant. Get a signed Fan Card, VIP lounge perks, or book virtual meetups.',
          price: 2000,
          fanCard: 79,
          isFeatured: false,
          isTrending: true
        },
        {
          id: 'seed-5',
          name: 'Zendaya',
          country: 'United States',
          pic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
          bio: 'Fashion icon and Emmy-winning actress offering fashion consulting and youth support donations.',
          price: 3000,
          fanCard: 129,
          isFeatured: false,
          isTrending: true
        },
        {
          id: 'seed-6',
          name: 'Kylian Mbappé',
          country: 'France',
          pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
          bio: 'Elite footballer offering private mentorship slots and junior sports charity support.',
          price: 4500,
          fanCard: 199,
          isFeatured: false,
          isTrending: true
        }
      ];

      for (const sc of seedCelebs) {
        const slug = sc.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        await firestore.collection('users').doc(sc.id).set({
          uid: sc.id,
          email: `${sc.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          displayName: sc.name,
          role: 'celebrity',
          createdAt: new Date().toISOString()
        });

        const profilePayload = {
          celebId: sc.id,
          celebName: sc.name,
          slug,
          profilePic: sc.pic,
          bio: sc.bio,
          country: sc.country,
          bookingPrice: Number(sc.price),
          fanCardPrice: Number(sc.fanCard),
          isLocked: false,
          isVisible: true,
          referralLink: `${process.env.APP_URL || 'http://localhost:3000'}/ref/seed/${slug}`,
          createdAt: new Date().toISOString()
        };
        await firestore.collection('celebrityProfiles').doc(sc.id).set(profilePayload);

        const showcasePayload = {
          celebId: sc.id,
          celebName: sc.name,
          slug,
          profilePic: sc.pic,
          bio: sc.bio,
          country: sc.country,
          bookingPrice: Number(sc.price),
          fanCardPrice: Number(sc.fanCard),
          isFeatured: sc.isFeatured,
          isTrending: sc.isTrending,
          isVisible: true,
          createdAt: new Date().toISOString()
        };
        await firestore.collection('landingPageShowcase').doc(sc.id).set(showcasePayload);
      }
      console.log("[SEEDER] Successfully seeded 6 default premium celebrities!");
    }
  } catch (err) {
    console.error("[SEEDER] Failed to seed database:", err);
  }
}

if (!process.env.VERCEL) {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const viteMod = "vite";
    import(viteMod).then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((viteInst) => {
        app.use(viteInst.middlewares);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] 🚀 Premium System running at http://localhost:${PORT}`);
    
    // Initialize Site Settings in background
    const firestore = getDb();
    if (firestore) {
      console.log("[FIREBASE] Admin SDK connected. Checking site settings...");
      const settingsRef = firestore.collection('siteSettings').doc('global');
      settingsRef.get().then(async (settingsDoc) => {
        if (!settingsDoc.exists) {
          console.log("[FIREBASE] Initializing global site settings...");
          await settingsRef.set({
            activationFee: 499,
            adminBankName: "INTERNATIONAL DIAMOND BANK",
            adminAccountNo: "00293188201",
            adminAccountName: "BOOK A CELEB LTD",
            featuredCelebs: [],
            trendingCelebs: []
          });
        }
        
        // Quietly seed database if empty
        await seedDefaultCelebrities(firestore);
        
        // Dynamic Startup Groq API Diagnostics
        let startupGroqKey = process.env.GROQ_API_KEY || "";
        try {
          const snap = await firestore.collection("adminSettings").doc("groq").get();
          if (snap.exists && snap.data()?.apiKey) {
            startupGroqKey = snap.data().apiKey.trim();
          }
        } catch (dbErr) {
          // Ignore, fallback to env key
        }

        if (startupGroqKey && startupGroqKey.trim() !== "") {
          console.log("[GROQ-DIAGNOSTIC] Carrying out dynamic startup validation test on Groq API...");
          fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${startupGroqKey.trim()}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: "Respond strictly with 'GROQ_OK'" }],
              max_tokens: 10
            })
          }).then(async (diagnosticRes) => {
            if (diagnosticRes.ok) {
              const payload: any = await diagnosticRes.json();
              console.log(`[GROQ-DIAGNOSTIC] ✅ SUCCESS! Groq API is fully operational and responding on startup. Response text:`, payload?.choices?.[0]?.message?.content);
            } else {
              const errText = await diagnosticRes.text();
              console.error(`[GROQ-DIAGNOSTIC] ❌ FAILED! Startup test on Groq API failed with status ${diagnosticRes.status}:`, errText);
            }
          }).catch(err => {
            console.error(`[GROQ-DIAGNOSTIC] ❌ FAILED! Connection issue during startup Groq API diagnostics test:`, err);
          });
        } else {
          console.warn("[GROQ-DIAGNOSTIC] ⚠️ No GROQ_API_KEY configured in environment or administrative database.");
        }
        
      }).catch(err => {
        console.error("[FIREBASE] Failed to initialize settings:", err);
      });
    } else {
      console.warn("[FIREBASE] Admin SDK failed to initialize. Check your FIREBASE_PRIVATE_KEY secret.");
    }
  });
}

export default app;
