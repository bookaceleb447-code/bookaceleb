import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isConfigured = !!rawApiKey && rawApiKey !== "undefined" && rawApiKey.trim() !== "";

const firebaseConfig = {
  apiKey: isConfigured ? rawApiKey : (appletConfig.apiKey || "placeholder-api-key"),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "placeholder-auth-domain"),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "placeholder-project"),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "placeholder-bucket"),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "placeholder-sender"),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || "placeholder-app"),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "placeholder-measurement")
};

const app = initializeApp(firebaseConfig);
const rawDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

// Always favor env var, then appletConfig's firestoreDatabaseId, then fallback to current environment DB
const clientDbId = rawDbId || appletConfig.firestoreDatabaseId || "ai-studio-fc2e29c9-e9f3-420d-bf1d-1132fe54e4f0";

export const db = (clientDbId && clientDbId !== "(default)") 
  ? getFirestore(app, clientDbId) 
  : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
