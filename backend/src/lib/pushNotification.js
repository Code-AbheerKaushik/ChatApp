import webpush from "web-push";
import PushSubscription from "../models/pushSubscription.model.js";
import User from "../models/user.model.js";

// Initialize VAPID keys from env or fallback stable key pair
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  // Generate fallback VAPID keys for runtime execution if not specified in .env
  const keys = webpush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  console.log("Generated runtime VAPID keys for push notifications.");
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:support@chatapp.com",
  vapidPublicKey,
  vapidPrivateKey
);

export const getVapidPublicKey = () => vapidPublicKey;

/**
 * Send Web Push notification to all active devices of a user.
 * Cleans up expired / invalid subscriptions (410 Gone / 404 Not Found).
 */
export const sendPushNotificationToUser = async (targetUserId, payloadData) => {
  try {
    // Check if target user exists and notification settings allow push
    const targetUser = await User.findById(targetUserId).select("privacy").lean();
    if (!targetUser) return;

    const subscriptions = await PushSubscription.find({ userId: targetUserId });
    if (!subscriptions.length) return;

    const payload = JSON.stringify(payloadData);

    const pushPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payload);
      } catch (err) {
        // If subscription has expired or is invalid, delete it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired push subscription for user ${targetUserId}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Error sending push notification:", err.message);
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error("Error in sendPushNotificationToUser:", error.message);
  }
};
