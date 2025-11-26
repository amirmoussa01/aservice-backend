// src/routes/client.routes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js"; // s'assure que tu exportes `auth` dans ton fichier middleware
import { isClient } from "../middlewares/roles.js";
import {
  getClientProfile,
  updateClientProfile,
  uploadAvatar,
  deleteAvatar
} from "../controllers/client.controller.js";

import { uploadAvatar as avatarMiddleware } from "../config/multerAvatar.js";

const router = Router();
router.use(auth, isClient);

// Toutes ces routes exigent un utilisateur authentifié (client ou provider possible)
// Si tu veux restreindre aux seuls clients, ajoute un middleware de rôle (isClient)
router.get("/me", getClientProfile);
router.put("/update", updateClientProfile);

// upload avatar : field name = 'avatar'
router.post("/avatar", avatarMiddleware.single("avatar"), uploadAvatar);
router.delete("/avatar", deleteAvatar);

export default router;
