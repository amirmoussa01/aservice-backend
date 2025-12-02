import express from "express";
import {
  login,
  registerClient,
  registerProvider,
  logout,
  googleLogin
} from "../controllers/auth.controller.js";

import { auth } from "../middlewares/auth.js";

const router = express.Router();

// CLIENT + PROVIDER
router.post("/client/register", registerClient);
router.post("/provider/register", registerProvider);
router.post("/login", login);

// GOOGLE LOGIN
router.post("/google", googleLogin);

// LOGOUT
router.post("/logout", auth, logout);

export default router;
