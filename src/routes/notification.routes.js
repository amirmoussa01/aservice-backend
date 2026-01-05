import express from "express";
import { 
  getUserNotifications,
  getUnreadCount,            
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  broadcastNotification      
} from "../controllers/notification.controller.js";
import { auth } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/roles.js";

const router = express.Router();

// Routes protégées (utilisateur)
router.get("/notifications", auth, getUserNotifications);
router.get("/notifications/unread-count", auth, getUnreadCount); 
router.patch("/notifications/:id/read", auth, markAsRead);
router.patch("/notifications/read-all", auth, markAllAsRead);
router.delete("/notifications/:id", auth, deleteNotification);
router.delete("/notifications", auth, deleteAllNotifications);

// Routes admin
router.post("/admin/notifications", auth, isAdmin, createNotification);
router.post("/admin/notifications/broadcast", auth, isAdmin, broadcastNotification); 

export default router;
