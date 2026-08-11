import { axiosInstance } from "./axios";

// Helper: Convert VAPID public key string to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
};

export const subscribeUserToPush = async () => {
  if (!isPushSupported()) throw new Error("Push notifications are not supported by this browser");

  if (Notification.permission === "denied") {
    throw new Error("Notification permission was denied. Please enable notifications in your browser settings.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await registerServiceWorker();
  if (!registration) throw new Error("Service Worker failed to register");

  // Fetch VAPID key from backend
  const keyRes = await axiosInstance.get("/notifications/vapid-key");
  const vapidPublicKey = keyRes.data.publicKey;

  if (!vapidPublicKey) throw new Error("Could not obtain VAPID public key");

  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  const subJson = subscription.toJSON();

  // Save to backend
  await axiosInstance.post("/notifications/subscribe", {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
  });

  return subscription;
};

export const unsubscribeUserFromPush = async () => {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await axiosInstance.post("/notifications/unsubscribe", {
        endpoint: subscription.endpoint,
      });
    }
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
  }
};
