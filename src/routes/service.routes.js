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

const router = express.Router();

// Routes prestataire (protégées - nécessitent auth + rôle provider)
router.post("/provider/services", auth, isProvider, createService);
router.get("/provider/services", auth, isProvider, getMyServices);
router.put("/provider/services/:id", auth, isProvider, updateService);
router.delete("/provider/services/:id", auth, isProvider, deleteService);

// Routes publiques (accessibles sans authentification)
router.get("/services", getPublicServices);
router.get("/services/category/:categoryId", getServicesByCategory);

export default router;