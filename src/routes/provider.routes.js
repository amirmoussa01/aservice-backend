import express from "express";
import { auth } from "../middlewares/auth.js";
import { isProvider } from "../middlewares/roles.js";
import {
  getProfile,
  updateProfile,
  updateLocation,
  uploadDocument,
  listDocuments,
  deleteDocument,
  getVerificationStatus,
  uploadProviderAvatar,  // ← NOUVEAU
  deleteProviderAvatar   // ← NOUVEAU
} from "../controllers/provider.controller.js";

import { uploadDoc } from "../config/multer.js";
import { uploadAvatar as avatarMiddleware } from "../config/multerAvatar.js"; // ← NOUVEAU

const router = express.Router();
router.use(auth, isProvider);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/profile/location", updateLocation);

// Routes avatar
router.post("/avatar", avatarMiddleware.single("avatar"), uploadProviderAvatar); // ← NOUVEAU
router.delete("/avatar", deleteProviderAvatar); // ← NOUVEAU

// Routes documents
router.post("/documents", uploadDoc.single("file"), uploadDocument);
router.get("/documents", listDocuments);
router.delete("/documents/:id", deleteDocument);

router.get("/status", getVerificationStatus);

export default router;