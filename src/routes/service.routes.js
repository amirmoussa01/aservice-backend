import express from "express";
import { 
  createService, 
  getMyServices, 
  updateService, 
  deleteService,
  getPublicServices,
  getServicesByCategory
} from "../controllers/service.controller.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Routes prestataire (protégées)
router.post("/provider/services", authenticateToken, createService);
router.get("/provider/services", authenticateToken, getMyServices);
router.put("/provider/services/:id", authenticateToken, updateService);
router.delete("/provider/services/:id", authenticateToken, deleteService);

// Routes publiques
router.get("/services", getPublicServices);
router.get("/services/category/:categoryId", getServicesByCategory);

export default router;