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

router.get("/", auth, getUserNotifications);                    // GET /api/notifications
router.get("/unread-count", auth, getUnreadCount);              // GET /api/notifications/unread-count
router.patch("/:id/read", auth, markAsRead);                    // PATCH /api/notifications/:id/read
router.patch("/read-all", auth, markAllAsRead);                 // PATCH /api/notifications/read-all
router.delete("/:id", auth, deleteNotification);                // DELETE /api/notifications/:id
router.delete("/", auth, deleteAllNotifications);               // DELETE /api/notifications

// Routes admin
router.post("/admin", auth, isAdmin, createNotification);       // POST /api/notifications/admin
router.post("/admin/broadcast", auth, isAdmin, broadcastNotification); // POST /api/notifications/admin/broadcast

export default router;