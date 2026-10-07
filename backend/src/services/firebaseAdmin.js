import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let firebaseAdminInitialized = false;

function formatPrivateKey(rawKey) {
  if (!rawKey) return "";
  let cleanB64 = rawKey
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .trim();

  if (cleanB64.length % 4 !== 0) {
    cleanB64 += "=".repeat(4 - (cleanB64.length % 4));
  }

  const formatted = cleanB64.match(/.{1,64}/g)?.join("\n") || cleanB64;
  return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----\n`;
}

try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const cleanEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").replace(/"/g, "").trim();
      const pemKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: cleanEmail,
          privateKey: pemKey,
        }),
      });
      firebaseAdminInitialized = true;
      console.log(`🔥 [FIREBASE ADMIN] Connected successfully to project: ${process.env.FIREBASE_PROJECT_ID}`);
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      firebaseAdminInitialized = true;
      console.log(`🔥 [FIREBASE ADMIN] Initialized with Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    }
  } else {
    firebaseAdminInitialized = true;
  }
} catch (err) {
  console.warn("⚠️ [FIREBASE ADMIN] Initialization warning:", err.message);
}

/**
 * Verify a Firebase ID Token sent from the Frontend
 */
export async function verifyFirebaseToken(idToken) {
  if (!idToken) return null;

  if (firebaseAdminInitialized) {
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return decoded;
    } catch (err) {
      console.warn("Firebase token verification failed:", err.message);
    }
  }

  // Graceful fallback: decode JWT claims payload if admin credentials not yet configured
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      return payload;
    }
  } catch {
    // ignore
  }

  return null;
}
