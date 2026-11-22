import { cert, initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import config from "../../config";
import { AppError } from "../error/AppError";

let firebaseApp: App | null = null;

/**
 * Initialize Firebase Admin SDK using available configuration
 */
export const initFirebase = (): boolean => {
  if (firebaseApp || getApps().length > 0) {
    firebaseApp = getApps()[0];
    return true;
  }

  try {
    let credentialCert = null;

    // 1. Check if SERVICE_ACCOUNT_PATH is provided and exists
    if (config.firebase.service_account_path) {
      const resolvedPath = path.isAbsolute(config.firebase.service_account_path)
        ? config.firebase.service_account_path
        : path.join(process.cwd(), config.firebase.service_account_path);

      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        credentialCert = cert(JSON.parse(fileContent));
      }
    }

    // 2. Check if SERVICE_ACCOUNT_KEY JSON string or Base64 is provided in .env
    if (!credentialCert && config.firebase.service_account_key) {
      let rawKey = config.firebase.service_account_key.trim();
      if (!rawKey.startsWith("{") && !rawKey.startsWith("[")) {
        try {
          rawKey = Buffer.from(rawKey, "base64").toString("utf-8");
        } catch {
          // keep as is
        }
      }
      credentialCert = cert(JSON.parse(rawKey));
    }

    // 3. Check if individual env variables are provided
    if (
      !credentialCert &&
      config.firebase.project_id &&
      config.firebase.client_email &&
      config.firebase.private_key
    ) {
      const privateKey = config.firebase.private_key.replace(/\\n/g, "\n");
      credentialCert = cert({
        projectId: config.firebase.project_id,
        clientEmail: config.firebase.client_email,
        privateKey,
      });
    }

    if (credentialCert) {
      firebaseApp = initializeApp({ credential: credentialCert });
      console.log("🔥 [Firebase Admin]: Initialized successfully.");
      return true;
    } else {
      console.warn(
        "⚠️ [Firebase Admin]: No Firebase credentials found in environment. Social login verification via Firebase will require credentials."
      );
      return false;
    }
  } catch (error: any) {
    console.error("❌ [Firebase Admin Initialization Error]:", error.message);
    return false;
  }
};

/**
 * Verify a Firebase ID Token sent from the frontend / mobile client (Google or Apple sign-in)
 */
export const verifyFirebaseIdToken = async (idToken: string): Promise<DecodedIdToken> => {
  if (!idToken || typeof idToken !== "string" || idToken.trim().length === 0) {
    throw new AppError("Firebase ID token is required.", 400);
  }

  const isReady = initFirebase();
  if (!isReady || getApps().length === 0) {
    throw new AppError(
      "Firebase authentication is not configured on the server. Please set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.",
      503
    );
  }

  try {
    const auth = getAuth(getApps()[0]);
    const decodedToken = await auth.verifyIdToken(idToken.trim());
    return decodedToken;
  } catch (error: any) {
    console.error("❌ [Firebase Token Verification Failed]:", error.code, "-", error.message);

    if (error.code === "auth/id-token-expired") {
      throw new AppError("Firebase session expired. Please sign in again on your device.", 401);
    }

    if (error.code === "auth/argument-error") {
      throw new AppError("Malformed Firebase authentication token.", 400);
    }

    throw new AppError(
      `Firebase token verification failed: ${error.message || "Invalid credentials."}`,
      401
    );
  }
};

/**
 * Get Firebase Cloud Messaging instance
 */
export const getFirebaseMessaging = () => {
  const isReady = initFirebase();
  if (!isReady || getApps().length === 0) {
    return null;
  }
  return getMessaging(getApps()[0]);
};
