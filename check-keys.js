import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getProjectId() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return data.projectId;
    }
  } catch (err) { }
  return "bookaceleb-e9162";
}

const projectId = getProjectId();
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail: `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`,
      privateKey: privateKey.replace(/\\n/g, '\n')
    })
  });
} else {
  admin.initializeApp({ projectId });
}

const db = getFirestore();

async function run() {
  console.log("Checking firestore documents for adminSettings...");
  try {
    const geminiDoc = await db.collection("adminSettings").doc("gemini").get();
    if (geminiDoc.exists) {
      const data = geminiDoc.data();
      const rawKey = data?.apiKey || "";
      console.log("GEMINI KEY IN DB:", rawKey ? `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}` : "(Empty)", `[Length: ${rawKey.length}]`);
      if (rawKey.startsWith("AIzaSy")) {
        console.log("-> Gemini key starts with AIzaSy: Valid prefix.");
      } else {
        console.log("-> Gemini key does NOT start with AIzaSy: INVALID PREFIX!");
      }
    } else {
      console.log("GEMINI KEY IN DB: Document does not exist");
    }

    const groqDoc = await db.collection("adminSettings").doc("groq").get();
    if (groqDoc.exists) {
      const data = groqDoc.data();
      const rawKey = data?.apiKey || "";
      console.log("GROQ KEY IN DB:", rawKey ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}` : "(Empty)", `[Length: ${rawKey.length}]`);
      if (rawKey.startsWith("gsk_")) {
        console.log("-> Groq key starts with gsk_: Valid prefix.");
      } else {
        console.log("-> Groq key does NOT start with gsk_: INVALID PREFIX!");
      }
    } else {
      console.log("GROQ KEY IN DB: Document does not exist");
    }
  } catch (err) {
    console.error("Error reading Firestore keys:", err);
  }
}

run();
