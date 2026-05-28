import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { comparePassword } from "../utils/password.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, phone, password } = req.body;
  const query = email ? { email: email.toLowerCase() } : { phone };
  const user = await User.findOne({ ...query, isActive: true });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone
    }
  });
});

export default router;
