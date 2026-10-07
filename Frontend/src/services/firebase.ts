import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type Auth,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";

// Firebase Web configuration (from VITE_ env variables or fallback)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY"
  );
};

// Initialize Firebase App
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  if (getApps().length === 0) {
    if (firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    }
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
} catch (err) {
  console.warn("⚠️ Firebase initialization warning:", err);
}

export { auth };

/**
 * Configure invisible RecaptchaVerifier for Phone SMS OTP
 */
export function createRecaptchaVerifier(containerId = "recaptcha-container"): RecaptchaVerifier | null {
  if (!auth) {
    console.warn("Firebase Auth not initialized yet.");
    return null;
  }

  // Clear existing verifier if any
  if (typeof window !== "undefined" && (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier) {
    try {
      (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier?.clear();
    } catch {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Please retry.");
    },
  });

  if (typeof window !== "undefined") {
    (window as unknown as { recaptchaVerifier: RecaptchaVerifier }).recaptchaVerifier = verifier;
  }

  return verifier;
}

/**
 * Send SMS OTP via Firebase to physical phone number
 * @param mobile 10-digit Indian mobile or full international number
 * @param verifier RecaptchaVerifier instance
 */
export async function sendFirebasePhoneOtp(
  mobile: string,
  verifier: RecaptchaVerifier
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string; code?: string }> {
  if (!auth) {
    return {
      success: false,
      error: "Firebase Authentication is not configured. Please add Firebase keys to .env",
    };
  }

  try {
    const cleanDigits = mobile.replace(/\D/g, "");
    const formattedPhone = mobile.startsWith("+")
      ? mobile
      : cleanDigits.length === 10
      ? `+91${cleanDigits}`
      : `+${cleanDigits}`;

    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    return { success: true, confirmationResult };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Firebase Phone SMS dispatch failed:", error);

    let friendlyMessage = error.message || "Failed to send SMS verification code.";
    if (error.code === "auth/invalid-phone-number") {
      friendlyMessage = "The provided phone number is invalid. Please check the number.";
    } else if (error.code === "auth/too-many-requests") {
      friendlyMessage = "Too many SMS requests sent. Please wait a few moments and try again.";
    } else if (error.code === "auth/billing-not-enabled") {
      friendlyMessage = "Firebase Phone Auth requires the Blaze plan (Pay-as-you-go) for live carrier SMS, or add your number under 'Phone numbers for testing' in Firebase Console.";
    } else if (error.code === "auth/quota-exceeded") {
      friendlyMessage = "SMS quota exceeded for today. Please try again later or use email.";
    } else if (error.code === "auth/captcha-check-failed") {
      friendlyMessage = "reCAPTCHA verification failed. Please refresh and try again.";
    }

    return { success: false, error: friendlyMessage, code: error.code };
  }
}

/**
 * Verify SMS OTP entered by user against Firebase
 */
export async function verifyFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<{ success: boolean; userCredential?: UserCredential; idToken?: string; error?: string }> {
  try {
    const userCredential = await confirmationResult.confirm(otpCode.trim());
    const idToken = await userCredential.user.getIdToken();
    return { success: true, userCredential, idToken };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Firebase OTP confirmation failed:", error);

    let friendlyMessage = "Invalid verification code. Please check and try again.";
    if (error.code === "auth/code-expired") {
      friendlyMessage = "Verification code has expired. Please request a new code.";
    } else if (error.code === "auth/invalid-verification-code") {
      friendlyMessage = "Incorrect 6-digit verification code.";
    }

    return { success: false, error: friendlyMessage };
  }
}

/**
 * Register account with Firebase Email + Password and send verification email
 */
export async function registerFirebaseEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; userCredential?: UserCredential; idToken?: string; error?: string }> {
  if (!auth) {
    return { success: false, error: "Firebase Authentication is not configured." };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    // Send email verification
    await sendEmailVerification(userCredential.user);
    const idToken = await userCredential.user.getIdToken();
    return { success: true, userCredential, idToken };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Firebase Email registration failed:", error);

    let friendlyMessage = error.message || "Failed to register with email.";
    if (error.code === "auth/email-already-in-use") {
      friendlyMessage = "An account with this email already exists. Please sign in.";
    } else if (error.code === "auth/weak-password") {
      friendlyMessage = "Password is too weak. Please use at least 6 characters.";
    } else if (error.code === "auth/invalid-email") {
      friendlyMessage = "Please enter a valid email address.";
    }

    return { success: false, error: friendlyMessage };
  }
}

/**
 * Sign in with Firebase Email + Password
 */
export async function loginFirebaseEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; userCredential?: UserCredential; idToken?: string; error?: string }> {
  if (!auth) {
    return { success: false, error: "Firebase Authentication is not configured." };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const idToken = await userCredential.user.getIdToken();
    return { success: true, userCredential, idToken };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Firebase Email sign in failed:", error);

    let friendlyMessage = error.message || "Email sign in failed.";
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      friendlyMessage = "Invalid email or password. Please check your credentials.";
    }

    return { success: false, error: friendlyMessage };
  }
}

/**
 * Send password reset email via Firebase
 */
export async function sendFirebasePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) {
    return { success: false, error: "Firebase Authentication is not configured." };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    return { success: false, error: error.message || "Failed to send reset email." };
  }
}

/**
 * Sign out of Firebase session
 */
export async function logoutFirebase(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
}
