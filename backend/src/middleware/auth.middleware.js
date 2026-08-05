import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    // Validate session exists (jti check)
    if (decoded.jti) {
      const session = await Session.findOne({ jti: decoded.jti });
      if (!session) {
        return res.status(401).json({ message: "Session expired or revoked. Please login again." });
      }
      // Update last active
      session.lastActive = new Date();
      await session.save();
      req.jti = decoded.jti;
    }

    const user = await User.findById(decoded.userId).select(
      "-password -twoFactor.secret -twoFactor.recoveryKeys"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
