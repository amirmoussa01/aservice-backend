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
  getVerificationStatus
} from "../controllers/provider.controller.js";

import { uploadDoc } from "../config/multer.js";

const router = express.Router();

// Toutes les routes nécessitent un prestataire authentifié
router.use(auth, isProvider);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/profile/location", updateLocation);

router.post("/documents", uploadDoc.single("file"), uploadDocument);
router.get("/documents", listDocuments);
router.delete("/documents/:id", deleteDocument);

router.get("/status", getVerificationStatus);

export default router;
