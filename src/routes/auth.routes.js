import express from "express";
import {
  login,
  registerClient,
  registerProvider,
  logout,
  googleLogin,
  forgotPassword, // Ajouter
  resetPassword
} from "../controllers/auth.controller.js"; 

import { auth } from "../middlewares/auth.js";

const router = express.Router();

// CLIENT + PROVIDER
router.post("/client/register", registerClient);
router.post("/provider/register", registerProvider);
router.post("/login", login);

// GOOGLE LOGIN
router.post("/google", googleLogin);


// FORGOT PASSWORD
router.post("/forgot-password", forgotPassword); // Nouvelle route pour envoyer le code
router.post("/reset-password", resetPassword);   // Nouvelle route pour réinitialiser le mot de passe


// LOGOUT
router.post("/logout", auth, logout);

export default router;
