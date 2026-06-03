// server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
dotenv.config();
function isValidGeminiApiKey(key) {
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
function isValidGroqApiKey(key) {
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
var db = null;
function getDatabaseId() {
  if (process.env.FIRESTORE_DATABASE_ID) return process.env.FIRESTORE_DATABASE_ID;
  if (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) return process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
  if (process.env.VERCEL) {
    return "(default)";
  }
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (data.firestoreDatabaseId) {
        return data.firestoreDatabaseId;
      }
    }
  } catch (err) {
  }
  return "(default)";
}
function getDb() {
  if (db) return db;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = "bookaceleb-e9162";
  if (!(admin.apps && admin.apps.length)) {
    try {
      if (privateKey) {
        const adminConfig = {
          projectId,
          clientEmail: "firebase-adminsdk-fbsvc@bookaceleb-e9162.iam.gserviceaccount.com",
          privateKey: privateKey.replace(/\\n/g, "\n")
        };
        admin.initializeApp({
          credential: admin.credential.cert(adminConfig),
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log("\u2705 Firebase Admin successfully initialized using private key cert credentials.");
      } else {
        admin.initializeApp({
          projectId,
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        console.log("\u2705 Firebase Admin successfully initialized using Google Application Default Credentials.");
      }
    } catch (error) {
      console.error("\u274C Failed to initialize Firebase Admin:", error);
      return null;
    }
  }
  try {
    const databaseId = getDatabaseId();
    db = getFirestore(admin.apps[0], databaseId);
    console.log(`\u2705 Firebase Admin SDK successfully bound to custom firestore databaseId: ${databaseId}`);
  } catch (err) {
    console.error("\u274C Failed to get Firestore DB with custom databaseId. Falling back to default database:", err);
    db = admin.firestore();
  }
  return db;
}
function parseFirestoreValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return parseInt(value.integerValue, 10);
  if ("doubleValue" in value) return parseFloat(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const values = value.arrayValue.values || [];
    return values.map((v) => parseFirestoreValue(v));
  }
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    const parsedObj = {};
    for (const [k, v] of Object.entries(fields)) {
      parsedObj[k] = parseFirestoreValue(v);
    }
    return parsedObj;
  }
  return value;
}
function parseFirestoreRestDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}
async function fetchDocumentWithFallback(collectionName, docId, token, firestore) {
  if (firestore) {
    try {
      const docSnap = await firestore.collection(collectionName).doc(docId).get();
      if (docSnap.exists) {
        return docSnap.data();
      }
    } catch (err) {
      console.warn(`⚠️ Firebase Admin fetch failed for custom DB ${collectionName}/${docId}: ${err.message}.`);
    }
  }

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
  } catch (err) {
    console.warn(`⚠️ Firebase Admin fetch failed for default DB ${collectionName}/${docId}: ${err.message}.`);
  }

  if (token) {
    try {
      const databaseId = getDatabaseId();
      const projectId = "bookaceleb-e9162";
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
    } catch (err) {
      console.error(`❌ [FAILSAFE REST] Error fetching ${collectionName}/${docId} from REST API:`, err);
    }

    try {
      const projectId = "bookaceleb-e9162";
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
    } catch (err) {
      console.error(`❌ [FAILSAFE REST DEFAULT DB] Error fetch fallback:`, err);
    }
  }
  return null;
}
var app = express();
app.use(express.json());
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", firebaseAdmin: !!getDb() });
});
app.post(["/api/admin/verify-celebrity", "/admin/verify-celebrity"], async (req, res) => {
  const { celebId } = req.body;
  const firestore = getDb();
  if (!firestore) return res.status(503).json({ error: "Admin SDK not configured" });
  try {
    await firestore.collection("celebrities").doc(celebId).update({
      isLocked: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var lastRequestTime = /* @__PURE__ */ new Map();
var suggestionCache = /* @__PURE__ */ new Map();
function generateSmartFallbackReplies(lastFanText, isAiSubscribed) {
  const norm = (lastFanText || "").toLowerCase();
  let candidateReplies = [];
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
async function generateWithLiteLLM(geminiApiKey, groqApiKey, profileContext, formattedHistory, lastFanText, desiredRepliesCount, platformInstruction) {
  const startTime = Date.now();
  let suggestions = [];
  let lastErr = null;
  let geminiQuotaExceeded = false;
  const geminiKeysToTry = [];
  if (geminiApiKey && geminiApiKey !== "undefined" && geminiApiKey.trim() !== "") {
    const cleaned = geminiApiKey.trim().replace(/^["']|["']$/g, "").trim();
    if (isValidGeminiApiKey(cleaned)) {
      geminiKeysToTry.push(cleaned);
    }
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "undefined" && process.env.GEMINI_API_KEY.trim() !== "") {
    const envKey = process.env.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "").trim();
    if (isValidGeminiApiKey(envKey) && !geminiKeysToTry.includes(envKey)) {
      geminiKeysToTry.push(envKey);
    }
  }
  if (geminiKeysToTry.length === 0) {
    console.log("\u2139\uFE0F [LiteLLM Router] Skipping primary Gemini routes: No configured or valid Gemini API keys found.");
  }
  let geminiSuccess = false;
  for (let k = 0; k < geminiKeysToTry.length; k++) {
    const activeKey = geminiKeysToTry[k];
    try {
      console.log(`\u{1F916} [LiteLLM Router] Routing request to primary model: gemini/gemini-3.5-flash (attempt key ${k + 1}/${geminiKeysToTry.length})...`);
      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Primary provider gemini-3.5-flash timed out (25s limit reached).")), 25e3)
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
        const duration2 = Date.now() - startTime;
        console.log(`\u2705 [LiteLLM Router] gemini-3.5-flash resolved successfully using key entry ${k + 1} in ${duration2}ms.`);
        geminiSuccess = true;
        return {
          suggestions,
          provider: "gemini",
          responseTime: duration2,
          fallbackActivated: false,
          status: "success",
          geminiQuotaExceeded: false
        };
      }
    } catch (err) {
      let errMsg = err.message || String(err);
      if (errMsg.includes("API Key not found") || errMsg.includes("API_KEY_INVALID") || errMsg.toLowerCase().includes("api key is invalid") || errMsg.toLowerCase().includes("invalid api key")) {
        errMsg = "API Key not found or invalid";
      }
      if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.toLowerCase().includes("limit exceeded")) {
        geminiQuotaExceeded = true;
        console.warn("\u26A0\uFE0F [LiteLLM Router] Checked Gemini response indicates resource or rate quota execution limit hit.");
      }
      console.warn(`\u26A0\uFE0F [LiteLLM Router] Primary model (gemini-3.5-flash) failed/timed out with key index ${k}: ${errMsg}.`);
      lastErr = err;
    }
    if (suggestions.length === 0) {
      try {
        console.log(`\u{1F916} [LiteLLM Router] Retrying gemini-3.5-flash using plain-text prompt without schema constraints (using key entry ${k + 1})...`);
        const ai = new GoogleGenAI({
          apiKey: activeKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const timeoutTextPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Primary text fallback timed out (25s limit reached).")), 25e3)
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
        const lines = result.text.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim().replace(/^["']|["']$/g, "").trim()).filter((l) => l.length > 0);
        if (lines.length > 0) {
          suggestions = lines.slice(0, desiredRepliesCount);
          const duration2 = Date.now() - startTime;
          console.log(`\u2705 [LiteLLM Router] gemini-3.5-flash plain-text fallback resolved successfully using key entry ${k + 1} in ${duration2}ms.`);
          geminiSuccess = true;
          return {
            suggestions,
            provider: "gemini",
            responseTime: duration2,
            fallbackActivated: false,
            status: "success",
            geminiQuotaExceeded: false
          };
        }
      } catch (err) {
        let errMsg = err.message || String(err);
        if (errMsg.includes("API Key not found") || errMsg.includes("API_KEY_INVALID") || errMsg.toLowerCase().includes("api key is invalid") || errMsg.toLowerCase().includes("invalid api key")) {
          errMsg = "API Key not found or invalid";
        }
        if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("429") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.toLowerCase().includes("limit exceeded")) {
          geminiQuotaExceeded = true;
        }
        console.warn(`\u26A0\uFE0F [LiteLLM Router] Primary model plain text generation failed with key index ${k}: ${errMsg}.`);
        lastErr = err;
      }
    }
  }
  if (groqApiKey && groqApiKey !== "undefined" && groqApiKey.trim() !== "") {
    try {
      console.log(`\u26A1 [LiteLLM Router] Active failover mapping in progress! Dispatching request to Groq LLaMA 3.3 70B...`);
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `${platformInstruction}

CRITICAL ENRICHED CONTEXT FACTS:
${profileContext}`
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
      const controller = new AbortController();
      const signalTimeoutId = setTimeout(() => controller.abort(), 25e3);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(signalTimeoutId);
      if (!response.ok) {
        throw new Error(`Groq server returned rate-limited or error HTTP status code: ${response.status}`);
      }
      const body = await response.json();
      const rawText = body?.choices?.[0]?.message?.content || "[]";
      let parsed = JSON.parse(rawText);
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.suggestions)) {
        parsed = parsed.suggestions;
      } else if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.replies)) {
        parsed = parsed.replies;
      } else if (parsed && !Array.isArray(parsed)) {
        const potentialArr = Object.values(parsed).find((v) => Array.isArray(v));
        if (potentialArr) parsed = potentialArr;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        suggestions = parsed.slice(0, desiredRepliesCount);
        const duration2 = Date.now() - startTime;
        console.log(`\u2705 [LiteLLM Router] Fallback model groq/llama-3.3-70b-versatile successfully generated replies in ${duration2}ms!`);
        return {
          suggestions,
          provider: "groq",
          responseTime: duration2,
          fallbackActivated: true,
          status: "success",
          geminiQuotaExceeded
        };
      }
    } catch (err) {
      console.error(`\u274C [LiteLLM Router] Fallback model (groq/llama-3.3-70b-versatile) failed: ${err.message}.`);
      lastErr = err;
    }
  } else {
    console.warn("\u26A0\uFE0F [LiteLLM Router] Fallback Groq API key is not configured yet. Fall routing skipped.");
  }
  const duration = Date.now() - startTime;
  console.error("\u{1F6A8} [LiteLLM Router] CRITICAL EXHAUSTION: All cloud AI generators failed. Servicing resilient human fallback arrays.");
  return {
    suggestions: [],
    provider: "demo",
    responseTime: duration,
    fallbackActivated: true,
    status: "fallback",
    errorMessage: lastErr?.message || "All multi-channel providers timed out or returned exception states.",
    geminiQuotaExceeded
  };
}
async function logAiReq(firestore, verifiedCelebId, isAiSubscribed, status, errorMsg = null, requestText = "", responseGenerated = [], celebProfile = null, provider = "gemini", fallbackActivated = false, responseTime = 0, failed = false, geminiQuotaExceeded = false, amountToDeduct = 0) {
  if (!firestore) return;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await firestore.collection("aiUsageLogs").add({
      userId: verifiedCelebId,
      celebrityId: verifiedCelebId,
      isSubscribed: isAiSubscribed,
      isPremiumAI: isAiSubscribed,
      date: todayStr,
      timestamp: nowStr,
      status,
      errorMsg,
      lastRequestAt: nowStr,
      provider,
      fallbackActivated,
      responseTime,
      failed
    });
    await firestore.collection("aiRequests").add({
      userId: verifiedCelebId,
      celebrityId: verifiedCelebId,
      celebrityName: celebProfile?.celebName || "Unknown",
      isPremiumAI: isAiSubscribed,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      requestText,
      requestDate: todayStr,
      responseGenerated,
      requestType: "suggest-replies",
      status,
      errorMsg,
      provider,
      fallbackActivated,
      responseTime,
      failed
    });
    if (status !== "success" && status !== "fallback") {
      return;
    }
    const aiUsageRef = firestore.collection("aiUsage").doc(verifiedCelebId);
    const userUsageRef = firestore.collection("userAiUsage").doc(verifiedCelebId);
    const globalRef = firestore.collection("aiAnalytics").doc("global");
    const legacyStatsRef = firestore.collection("aiUsageStats").doc(verifiedCelebId);
    await firestore.runTransaction(async (transaction) => {
      const [aiUsageDoc, globalDoc] = await Promise.all([
        transaction.get(aiUsageRef),
        transaction.get(globalRef)
      ]);
      let initialTotalRequests = 0;
      let dailyRequests = 0;
      let lastRequestDateObj = null;
      let planType = isAiSubscribed ? "ai_subscribed" : "free";
      if (aiUsageDoc.exists) {
        const uData = aiUsageDoc.data();
        initialTotalRequests = uData?.totalRequests || 0;
        dailyRequests = uData?.dailyRequests || 0;
        lastRequestDateObj = uData?.lastRequestDate;
        planType = uData?.planType || (isAiSubscribed ? "ai_subscribed" : "free");
      }
      let isNewDay = true;
      if (lastRequestDateObj) {
        let dateObj;
        if (typeof lastRequestDateObj.toDate === "function") {
          dateObj = lastRequestDateObj.toDate();
        } else if (lastRequestDateObj instanceof Date) {
          dateObj = lastRequestDateObj;
        } else if (lastRequestDateObj.seconds) {
          dateObj = new Date(lastRequestDateObj.seconds * 1e3);
        } else {
          dateObj = new Date(lastRequestDateObj);
        }
        const dateStr = dateObj.toISOString().split("T")[0];
        isNewDay = dateStr !== todayStr;
      }
      const isFallback = status === "fallback" || fallbackActivated || provider === "demo" || failed === true;
      const nextTodayCount = isFallback ? dailyRequests : isNewDay ? amountToDeduct : dailyRequests + amountToDeduct;
      const nextLifetimeRequests = isFallback ? initialTotalRequests : initialTotalRequests + (amountToDeduct > 0 ? 1 : 0);
      const maxLimit = planType === "ai_subscribed" ? 50 : 5;
      const remainingRequests = Math.max(0, maxLimit - nextTodayCount);
      let dbCooldownUntil = null;
      if (aiUsageDoc.exists) {
        dbCooldownUntil = aiUsageDoc.data()?.cooldownUntil || null;
      }
      if (!isFallback && amountToDeduct > 0) {
        const cooldownPeriodMs = 3 * 60 * 1e3;
        const rawCooldownUntil = new Date(Date.now() + cooldownPeriodMs);
        dbCooldownUntil = admin.firestore.Timestamp.fromDate(rawCooldownUntil);
      }
      const activeProviderName = provider;
      transaction.set(aiUsageRef, {
        userId: verifiedCelebId,
        totalRequests: nextLifetimeRequests,
        dailyRequests: nextTodayCount,
        planType,
        dailyLimit: maxLimit,
        monthlyLimit: maxLimit * 30,
        fallbackActivated: isFallback,
        // REQUIRED FIRESTORE STRUCTURE
        requestCountToday: nextTodayCount,
        remainingRequests,
        totalLifetimeRequests: nextLifetimeRequests,
        aiPremium: planType === "ai_subscribed",
        maxDailyRequests: maxLimit,
        lastRequestDate: admin.firestore.FieldValue.serverTimestamp(),
        cooldownUntil: dbCooldownUntil,
        activeProvider: activeProviderName,
        geminiQuotaExceeded,
        geminiQuotaExceededAt: geminiQuotaExceeded ? admin.firestore.FieldValue.serverTimestamp() : null
      }, { merge: true });
      transaction.set(userUsageRef, {
        userId: verifiedCelebId,
        celebrityId: verifiedCelebId,
        requestCountToday: nextTodayCount,
        totalLifetimeRequests: nextLifetimeRequests,
        aiPremium: planType === "ai_subscribed",
        remainingRequests,
        maxDailyRequests: maxLimit,
        activeProvider: activeProviderName,
        lastRequestDate: todayStr,
        lastResetDate: todayStr
      }, { merge: true });
      transaction.set(legacyStatsRef, {
        userId: verifiedCelebId,
        celebrityId: verifiedCelebId,
        requestCountToday: nextTodayCount,
        totalLifetimeRequests: nextLifetimeRequests,
        isPremiumAI: planType === "ai_subscribed",
        lastRequestAt: nowStr,
        lastResetDate: todayStr
      }, { merge: true });
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
    console.error("\u26A0\uFE0F Failed to write to telemetry collections (aiRequests, userAiUsage, aiAnalytics):", err);
  }
}
app.post(["/api/gemini/suggest-replies", "/gemini/suggest-replies"], async (req, res) => {
  const { chatId, messages, celebId, isRegenerate, previousSuggestions } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("\u{1F510} Unauthorized: Missing authentication credentials in request headers.");
    return res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
  }
  const token = authHeader.split("Bearer ")[1];
  let verifiedCelebId = celebId;
  try {
    getDb();
    if (admin && admin.apps && admin.apps.length > 0) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        verifiedCelebId = decoded.uid;
      } catch (adminErr) {
        console.warn("\u26A0\uFE0F Firebase Admin verifyIdToken signature check failed (using safe JWT payload fallback):", adminErr);
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
          verifiedCelebId = payloadJson.sub || payloadJson.uid || celebId;
        }
      }
    } else {
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const payloadJson = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
        verifiedCelebId = payloadJson.sub || payloadJson.uid || celebId;
      }
    }
  } catch (authErr) {
    console.error("\u274C Token decoding/validation failed:", authErr);
    return res.status(401).json({ error: "Unauthorized: Invalid Firebase authentication token format." });
  }
  if (celebId !== verifiedCelebId) {
    console.error(`\u{1F6A8} Forbidden: Celebrity identity mismatch. Expected UID: ${verifiedCelebId}, got ${celebId}`);
    return res.status(403).json({ error: "Forbidden: Celebrity identity mismatch." });
  }
  const firestore = getDb();
  let celebProfile = null;
  let userData = null;
  let chatData = null;
  try {
    userData = await fetchDocumentWithFallback("users", verifiedCelebId, token, firestore);
    celebProfile = await fetchDocumentWithFallback("celebrityProfiles", verifiedCelebId, token, firestore);
    if (!userData && !celebProfile) {
      console.warn(`\u26A0\uFE0F User profile record not found yet in 'users' or 'celebrityProfiles' collections for ID: ${verifiedCelebId}. Triggering custom onboarding flow.`);
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
    if (userData?.isBanned || celebProfile?.isBanned || userData?.status === "inactive" || celebProfile?.status === "inactive") {
      console.warn(`\u{1F6A8} Suspended account access attempted for ID: ${verifiedCelebId}`);
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
    if (userData && userData.role && userData.role !== "celebrity" && userData.role !== "superadmin") {
      console.error(`\u274C Validation failed: User ${verifiedCelebId} has role '${userData.role}', expected 'celebrity'.`);
      return res.status(403).json({ error: "Forbidden: Only celebrities are authorized to use Chat AI capability." });
    }
    chatData = await fetchDocumentWithFallback("chats", chatId, token, firestore);
    if (!chatData) {
      console.error(`\u274C Validation failed: Chat session and event path with ID ${chatId} does not exist.`);
      return res.status(404).json({ error: "Not Found: Chat session was not located." });
    }
    const participants = chatData.participants || [];
    if (!Array.isArray(participants) || !participants.includes(verifiedCelebId)) {
      console.error(`\u274C Validation/Security failed: User ${verifiedCelebId} is not a registered participant in chat session ${chatId}. Participants list:`, participants);
      return res.status(403).json({ error: "Forbidden: You do not own or participate in this premium service session." });
    }
    if (celebProfile) {
      console.log(`\u2139\uFE0F Celebrity profile live context loaded successfully for star: ${celebProfile?.celebName || "Unnamed"}. Profile Access status: ${!!celebProfile?.aiProfileAccess}`);
    } else {
      console.warn(`\u26A0\uFE0F Warning: Celebrity registry profile not found or empty for ID: ${verifiedCelebId}`);
    }
  } catch (dbErr) {
    console.error("\u{1F525} Critical error during security validation or profile fetch load:", dbErr);
  }
  const lastTime = lastRequestTime.get(verifiedCelebId) || 0;
  const now = Date.now();
  const cooldownPeriodMs = 4e3;
  if (now - lastTime < cooldownPeriodMs) {
    console.warn(`\u23F3 Rate Limited spam-click prevention for celebrity: ${verifiedCelebId}`);
    return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment before requesting suggestions again." });
  }
  lastRequestTime.set(verifiedCelebId, now);
  const isAiSubscribed = celebProfile?.isAiSubscribed === true || celebProfile?.aiPremium === true;
  if (!messages || !Array.isArray(messages) || messages.length < 1) {
    return res.status(400).json({ error: "Not enough conversation data to analyze. Chat thread must have at least 1 message." });
  }
  const last4 = messages.slice(-4);
  const lastFanMsg = [...last4].reverse().find((m) => m.senderId !== verifiedCelebId);
  const lastFanText = lastFanMsg ? lastFanMsg.text : "No recent message";
  const last4Hash = last4.map((m) => `${m.senderId}:${m.text || ""}`).join("|");
  const cacheKey = `${verifiedCelebId}::${chatId}::${last4Hash}`;
  const cached = suggestionCache.get(cacheKey);
  if (!isRegenerate && cached && cached.expiresAt > Date.now()) {
    console.log(`\u26A1 [CACHE HIT] Returning identical context recommendations for celebrity ${verifiedCelebId} via cached provider ${cached.provider}`);
    return res.json({
      success: true,
      suggestions: cached.suggestions,
      replies: cached.suggestions,
      provider: "pre-live",
      cached: true
    });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let dailyCalls = 0;
  let isPremiumUser = isAiSubscribed;
  if (firestore) {
    try {
      const celebDoc = await firestore.collection("celebrityProfiles").doc(verifiedCelebId).get();
      if (celebDoc.exists) {
        const celebData = celebDoc.data();
        if (celebData?.isAiSubscribed === true || celebData?.aiPremium === true) {
          isPremiumUser = true;
        }
      }
      const userUsageRef = firestore.collection("aiUsage").doc(verifiedCelebId);
      const usageDoc = await userUsageRef.get();
      if (usageDoc.exists) {
        const uData = usageDoc.data();
        if (uData && uData.cooldownUntil) {
          const cd = uData.cooldownUntil;
          let cdTime = 0;
          if (typeof cd.toDate === "function") {
            cdTime = cd.toDate().getTime();
          } else if (cd instanceof Date) {
            cdTime = cd.getTime();
          } else if (cd.seconds) {
            cdTime = cd.seconds * 1e3;
          } else if (typeof cd === "number") {
            cdTime = cd;
          } else {
            cdTime = new Date(cd).getTime();
          }
          const nowMs = Date.now();
          if (nowMs < cdTime) {
            const remainingSec = Math.ceil((cdTime - nowMs) / 1e3);
            return res.status(429).json({
              error: "Wait until cooldown ends.",
              cooldownRemaining: remainingSec
            });
          }
        }
        let isSameDay = false;
        if (uData && uData.lastRequestDate) {
          let dateObj;
          const lastReqDateVal = uData.lastRequestDate;
          if (typeof lastReqDateVal.toDate === "function") {
            dateObj = lastReqDateVal.toDate();
          } else if (lastReqDateVal instanceof Date) {
            dateObj = lastReqDateVal;
          } else if (lastReqDateVal.seconds) {
            dateObj = new Date(lastReqDateVal.seconds * 1e3);
          } else {
            dateObj = new Date(lastReqDateVal);
          }
          const dateStr = dateObj.toISOString().split("T")[0];
          isSameDay = dateStr === todayStr;
        }
        if (!isSameDay) {
          dailyCalls = 0;
        } else {
          dailyCalls = uData.requestCountToday !== void 0 ? uData.requestCountToday : uData.dailyRequests ?? 0;
        }
        if (uData.planType === "ai_subscribed" || uData.planType === "vip" || uData.aiPremium === true) {
          isPremiumUser = true;
        }
      } else {
        const planType = isPremiumUser ? "ai_subscribed" : "free";
        const dailyLimit = planType === "ai_subscribed" ? 50 : 5;
        await userUsageRef.set({
          userId: verifiedCelebId,
          // Legacy Compatibility
          totalRequests: 0,
          dailyRequests: 0,
          planType,
          dailyLimit,
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
      console.warn("\u26A0\uFE0F Cannot count daily logs from userAiUsage collection:", uErr);
    }
  }
  const maxRequests = isPremiumUser ? 50 : 5;
  if (dailyCalls >= maxRequests) {
    console.warn(`\u{1F6AB} Limit Exceeded inside API route check: Celeb ${verifiedCelebId} at ${dailyCalls}/${maxRequests} calls.`);
    return res.status(403).json({ error: "Daily AI request limit reached." });
  }
  const last10 = messages.slice(-10);
  let apiKey = "";
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
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || "";
  }
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^["']|["']$/g, "").trim();
  }
  if (apiKey && !isValidGeminiApiKey(apiKey)) {
    console.warn("⚠️ Resolved Gemini API Key is invalid or placeholder. Disallowing to trigger fallback routing.");
    apiKey = "";
  }
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
    console.warn("\u26A0\uFE0F Resolved Groq API Key is invalid or placeholder. Disallowing to trigger fallback routing.");
    groqApiKey = "";
  }
  const hasGemini = apiKey && apiKey !== "undefined" && apiKey.trim() !== "";
  const hasGroq = groqApiKey && groqApiKey !== "undefined" && groqApiKey.trim() !== "";
  if (!hasGemini && !hasGroq) {
    console.error("\u274C Both GEMINI_API_KEY and GROQ_API_KEY are missing/undefined. Relying on local client rule generators.");
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
  const desiredRepliesCount = isAiSubscribed ? 5 : 3;
  const amountToDeduct = isRegenerate === true || isRegenerate === "true" ? 2 : 1;
  let regenerateInstructions = "";
  if ((isRegenerate === true || isRegenerate === "true") && Array.isArray(previousSuggestions) && previousSuggestions.length > 0) {
    regenerateInstructions = `
=========================================
STRICT REGENERATION REQUIREMENT:
The celebrity needs completely NEW suggestions. You MUST NOT include, repeat, or closely resemble any of the following previous suggestions. They must be completely different in sentiment, wording, style, and content:
${previousSuggestions.map((s) => `- "${s}"`).join("\n")}

Provide fully distinct and creative new options that have different structures and semantics.
`;
  }
  try {
    const formattedHistory = last4.map((m) => {
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
    const referralLink = celebProfile?.referralLink || `https://bookaceleb-e9162.web.app/r/${username}`;
    let plansText = "No memberships configured yet.";
    if (Array.isArray(celebProfile?.membershipPlans) && celebProfile.membershipPlans.length > 0) {
      plansText = celebProfile.membershipPlans.map(
        (p) => `- ${p.title} Fan Card Plan: Cost is $${p.price} USD. Benefits & Perks include: ${Array.isArray(p.perks) ? p.perks.join(", ") : "VIP exclusive message privileges and special benefits"}`
      ).join("\n");
    } else {
      plansText = `- Silver Fan Card Membership Plan: $49 USD. Perks are: Direct chat priority VIP support.
- Gold Fan Card Membership Plan: $99 USD. Perks are: Video shout-outs and premium star messaging options.
- Platinum Fan Card Membership Plan: $299 USD. Perks are: Hand-delivered visual contents, interactive privileges, and private premium access.`;
    }
    let payMethods = [];
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
    const paymentText = payMethods.join(" OR ");
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
 
Your goal is to:
- build fan trust
- encourage bookings
- encourage fan card purchases
- encourage donations professionally
- answer naturally and confidently
- speak warmly and professionally
- sound human and premium

You are NOT an AI assistant. You are representing the celebrity directly.
The tone should feel:
- confident
- warm
- persuasive
- professional
- premium
- human-like

You must always use REAL celebrity profile data from Firestore.
If a fan asks about:
- prices
- booking
- fan cards
- donations
- payments
- profile details
you MUST answer using the actual configured celebrity data provided below. Do not refer to generic values or make things up.

You should naturally persuade fans and make the celebrity feel authentic and trustworthy.
If fans are doubtful or nervous:
- reassure them professionally and confidently
- explain the secure booking/payment process
- explain verification
- explain premium benefits

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
- "I\u2019m just an assistant..."
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
      console.warn("\u26A0\uFE0F Both primary and fallback paths timed out or failed. Dispensing smart fallback rules...");
      suggestions = generateSmartFallbackReplies(lastFanText, isAiSubscribed);
      logStatus = "fallback";
    }
    suggestionCache.set(cacheKey, {
      suggestions,
      provider: logStatus === "fallback" ? "demo" : liteResult.provider,
      expiresAt: Date.now() + 10 * 60 * 1e3
    });
    if (firestore) {
      await logAiReq(
        firestore,
        verifiedCelebId,
        isPremiumUser,
        logStatus,
        liteResult.status === "fallback" ? liteResult.errorMessage || "All AI providers failed" : null,
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
        const usageD = await firestore.collection("aiUsage").doc(verifiedCelebId).get();
        if (usageD.exists) {
          const u = usageD.data();
          if (u) {
            requestCountToday = u.requestCountToday !== void 0 ? u.requestCountToday : u.dailyRequests ?? 0;
            maxDailyRequests = u.maxDailyRequests || (u.planType === "ai_subscribed" ? 50 : 5);
          }
        }
      } catch (uErr) {
        console.error("\u26A5 Error fetching usage doc configuration:", uErr);
      }
    }
    return res.json({
      success: true,
      suggestions,
      replies: suggestions,
      provider: logStatus === "fallback" ? "demo" : liteResult.provider,
      fallback: liteResult.fallbackActivated,
      requestCountToday,
      maxDailyRequests,
      quotaDeducted: amountToDeduct
    });
  } catch (err) {
    console.error("\u274C suggest-replies handler uncaught exception:", err);
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
        const usageD = await firestore.collection("aiUsage").doc(verifiedCelebId).get();
        if (usageD.exists) {
          const u = usageD.data();
          if (u) {
            requestCountToday = u.requestCountToday !== void 0 ? u.requestCountToday : u.dailyRequests ?? 0;
            maxDailyRequests = u.maxDailyRequests || (u.planType === "ai_subscribed" ? 50 : 5);
          }
        }
      } catch (uErr) {
        console.error("\u26A5 Error fetching usage doc configuration:", uErr);
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
  } catch (error) {
    console.error("\u274C Error deducting quota:", error);
    return res.status(500).json({ error: error.message });
  }
});
if (!process.env.VERCEL) {
  const PORT = 3e3;
  if (process.env.NODE_ENV !== "production") {
    const viteMod = "vite";
    import(viteMod).then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      }).then((viteInst) => {
        app.use(viteInst.middlewares);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] \u{1F680} Premium System running at http://localhost:${PORT}`);
    const firestore = getDb();
    if (firestore) {
      console.log("[FIREBASE] Admin SDK connected. Checking site settings...");
      const settingsRef = firestore.collection("siteSettings").doc("global");
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
      }).catch((err) => {
        console.error("[FIREBASE] Failed to initialize settings:", err);
      });
    } else {
      console.warn("[FIREBASE] Admin SDK failed to initialize. Check your FIREBASE_PRIVATE_KEY secret.");
    }
  });
}
var server_default = app;
export {
  server_default as default,
  isValidGeminiApiKey,
  isValidGroqApiKey
};
//# sourceMappingURL=index.js.map
