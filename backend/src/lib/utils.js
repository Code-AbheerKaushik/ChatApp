import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Session from "../models/session.model.js";

// Parse user agent string into OS and browser
const parseUserAgent = (ua = "") => {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  if (/mobile|android|iphone|ipad|tablet/i.test(ua)) device = "Mobile";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  if (/chrome\/(\d+)/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) browser = "Chrome";
  else if (/firefox\/(\d+)/i.test(ua)) browser = "Firefox";
  else if (/safari\/(\d+)/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";

  return { browser, os, device };
};

export const generateToken = async (userId, res, req = null) => {
  const jti = uuidv4();

  const token = jwt.sign({ userId, jti }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production",
  });

  // Record session if request is available
  if (req) {
    const ua = req.headers["user-agent"] || "";
    const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
    const { browser, os, device } = parseUserAgent(ua);

    await Session.create({
      userId,
      jti,
      device,
      browser,
      os,
      ip,
    });
  }

  return { token, jti };
};
