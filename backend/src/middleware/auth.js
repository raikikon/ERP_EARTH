import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing authorization token" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid user" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid authorization token" });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
    next();
  };
}
