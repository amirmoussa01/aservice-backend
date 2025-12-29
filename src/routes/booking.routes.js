import express from "express";
import { auth } from "../middlewares/auth.js";
import { isClient, isProvider } from "../middlewares/roles.js";
import {
  createBooking,
  getClientBookings,
  getProviderBookings,
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  completeBooking,
  getBookingStats,
} from "../controllers/booking.controller.js";

const router = express.Router();

// ==================== ROUTES CLIENT ====================
router.post("/client/bookings", auth, isClient, createBooking);                // Créer une réservation
router.get("/client/bookings", auth, isClient, getClientBookings);             // Liste des réservations
router.delete("/client/bookings/:id/cancel", auth, isClient, cancelBooking);   // Annuler une réservation

// ==================== ROUTES PRESTATAIRE ====================
router.get("/provider/bookings", auth, isProvider, getProviderBookings);       // Liste des réservations
router.patch("/provider/bookings/:id/accept", auth, isProvider, acceptBooking); // Accepter
router.patch("/provider/bookings/:id/reject", auth, isProvider, rejectBooking); // Refuser
router.patch("/provider/bookings/:id/complete", auth, isProvider, completeBooking); // Terminer

// ==================== ROUTES COMMUNES ====================
router.get("/bookings/stats", auth, getBookingStats);                          // Statistiques (client ou provider)
router.get("/bookings/:id", auth, getBookingDetails);                          // Détails d'une réservation

export default router;
