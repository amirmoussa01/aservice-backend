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
router.use(auth, isProvider);
// Routes prestataire (protégées)
router.post("/provider/services", createService);
router.get("/provider/services", getMyServices);
router.put("/provider/services/:id", updateService);
router.delete("/provider/services/:id", deleteService);

// Routes publiques
router.get("/services", getPublicServices);
router.get("/services/category/:categoryId", getServicesByCategory);

export default router;