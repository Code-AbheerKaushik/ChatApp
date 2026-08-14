import admin from "firebase-admin";

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle newlines in private key securely
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "❌ [FIREBASE ADMIN ERROR] Missing Firebase service account credentials. Firebase verification will not function."
    );
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("⚡ [FIREBASE ADMIN] Initialized successfully.");
  } catch (error) {
    console.error("❌ [FIREBASE ADMIN INIT ERROR] Failed to initialize Firebase Admin:", error.message);
  }
};

export { initializeFirebaseAdmin, admin };
