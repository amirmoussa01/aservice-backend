import { pool } from "../config/db.js";

/* ==================== RÉCUPÉRER LES NOTIFICATIONS D'UN UTILISATEUR ==================== */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND is_sent = TRUE
    `;

    if (unreadOnly === 'true') {
      query += " AND is_read = 0";
    }

    query += " ORDER BY created_at DESC LIMIT ?";

    const [notifications] = await pool.query(query, [userId, parseInt(limit)]);

    // Compter les non lues
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_sent = TRUE",
      [userId]
    );

    res.json({
      success: true,
      notifications,
      unread_count: countResult[0].unread_count,
    });
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== MARQUER UNE NOTIFICATION COMME LUE ==================== */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Vérifier que la notification appartient à l'utilisateur
    const [notifications] = await pool.query(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification non trouvée" 
      });
    }

    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Notification marquée comme lue",
    });
  } catch (error) {
    console.error("Erreur marquage notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== MARQUER TOUTES LES NOTIFICATIONS COMME LUES ==================== */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    res.json({
      success: true,
      message: "Toutes les notifications ont été marquées comme lues",
    });
  } catch (error) {
    console.error("Erreur marquage notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== SUPPRIMER UNE NOTIFICATION ==================== */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Vérifier que la notification appartient à l'utilisateur
    const [notifications] = await pool.query(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification non trouvée" 
      });
    }

    await pool.query("DELETE FROM notifications WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Notification supprimée",
    });
  } catch (error) {
    console.error("Erreur suppression notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== SUPPRIMER TOUTES LES NOTIFICATIONS ==================== */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query("DELETE FROM notifications WHERE user_id = ?", [userId]);

    res.json({
      success: true,
      message: "Toutes les notifications ont été supprimées",
    });
  } catch (error) {
    console.error("Erreur suppression notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== CRÉER UNE NOTIFICATION (ADMIN) ==================== */
export const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Utilisateur, titre et message requis" 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_sent)
       VALUES (?, ?, ?, ?, TRUE)`,
      [user_id, title, message, type || 'system']
    );

    res.status(201).json({
      success: true,
      message: "Notification créée",
      notification_id: result.insertId,
    });
  } catch (error) {
    console.error("Erreur création notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== COMPTER LES NOTIFICATIONS NON LUES ==================== */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(
      "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_sent = TRUE",
      [userId]
    );

    res.json({
      success: true,
      unread_count: result[0].unread_count,
    });
  } catch (error) {
    console.error("Erreur comptage notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== ENVOYER UNE NOTIFICATION À TOUS (ADMIN) ==================== */
export const broadcastNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Titre et message requis" 
      });
    }

    // Récupérer tous les utilisateurs
    const [users] = await pool.query("SELECT id FROM users");

    // Créer une notification pour chaque utilisateur
    const promises = users.map(user => 
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_sent)
         VALUES (?, ?, ?, ?, TRUE)`,
        [user.id, title, message, type || 'system']
      )
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Notification envoyée à ${users.length} utilisateurs`,
    });
  } catch (error) {
    console.error("Erreur broadcast notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};
