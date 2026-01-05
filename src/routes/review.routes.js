import express from "express";
import { 
  createReview,
  getProviderReviews,
  getServiceReviews,
  canReview,
  deleteReview,
  updateReview,              
  getMyReviews               
} from "../controllers/review.controller.js";
import { auth } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/roles.js";

const router = express.Router();

// Routes publiques
router.get("/reviews/provider/:providerId", getProviderReviews);
router.get("/reviews/service/:serviceId", getServiceReviews);

// Routes protégées (client)
router.post("/reviews", auth, createReview);
router.get("/reviews/can-review/:bookingId", auth, canReview);
router.get("/reviews/my-reviews", auth, getMyReviews);           
router.put("/reviews/:id", auth, updateReview);                  
router.delete("/reviews/:id", auth, deleteReview);

// Routes admin
router.delete("/admin/reviews/:id", auth, isAdmin, deleteReview);

export default router;

