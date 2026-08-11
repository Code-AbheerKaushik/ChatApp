import { useProfileStore } from "../store/useProfileStore";
import { useChatStore } from "../store/useChatStore";

const playedMessageIds = new Set();

/**
 * Synthesizes a crisp, pleasant dual-tone chime using Web Audio API.
 */
const playWebAudioChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.error("Web Audio chime playback failed:", err);
  }
};

/**
 * Plays incoming message chime if sound settings and muting preferences permit.
 */
export const playIncomingSound = (message) => {
  if (!message || !message._id) return;

  // Deduplication check: prevent playing sound twice for the same message ID
  if (playedMessageIds.has(message._id)) return;
  playedMessageIds.add(message._id);

  // Keep set bounded to max 100 items
  if (playedMessageIds.size > 100) {
    const firstKey = playedMessageIds.values().next().value;
    playedMessageIds.delete(firstKey);
  }

  // Check notification settings
  const { notifications } = useProfileStore.getState();
  if (!notifications?.sound || notifications?.muteAll) return;

  // Check if sender or group is muted
  const { mutedUsers } = useChatStore.getState();
  const senderId = message.senderId?._id || message.senderId;
  if (senderId && mutedUsers.includes(String(senderId))) return;

  playWebAudioChime();
};
