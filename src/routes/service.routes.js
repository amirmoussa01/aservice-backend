import express from "express";
import { 
  createService, 
  getMyServices, 
  updateService, 
  deleteService,
  getPublicServices,
  getServicesByCategory
} from "../controllers/service.controller.js";
import { auth } from "../middlewares/auth.js";
import { isProvider } from "../middlewares/roles.js";
import { uploadServiceImage } from "../config/multer.services.js"; // ✅ Fichier séparé

const router = express.Router();

// Routes prestataire
router.post("/provider/services", auth, isProvider, uploadServiceImage, createService);
router.get("/provider/services", auth, isProvider, getMyServices);
router.put("/provider/services/:id", auth, isProvider, uploadServiceImage, updateService);
router.delete("/provider/services/:id", auth, isProvider, deleteService);

// Routes publiques
router.get("/services", getPublicServices);
router.get("/services/category/:categoryId", getServicesByCategory);

export default router;
