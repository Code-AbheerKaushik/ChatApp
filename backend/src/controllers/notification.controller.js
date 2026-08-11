import PushSubscription from "../models/pushSubscription.model.js";
import { getVapidPublicKey } from "../lib/pushNotification.js";

export const getVapidKey = (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.status(200).json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve VAPID public key" });
  }
};

export const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user._id;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: "Invalid push subscription object" });
    }

    const userAgent = req.headers["user-agent"] || "";

    // Upsert subscription
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId, endpoint, keys, userAgent },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Push subscription saved successfully" });
  } catch (error) {
    console.error("Error in subscribePush:", error.message);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId });
    } else {
      await PushSubscription.deleteMany({ userId });
    }

    res.status(200).json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (error) {
    console.error("Error in unsubscribePush:", error.message);
    res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
  }
};
