import { pool } from "../config/db.js";

/* ==================== CLIENT : CRÉER UNE RÉSERVATION ==================== */
export const createBooking = async (req, res) => {
  try {
    const clientId = req.user.id; // ID du client connecté (via middleware auth)
    const { service_id, date, time, notes } = req.body;

    // Validation
    if (!service_id || !date || !time) {
      return res.status(400).json({ 
        success: false, 
        message: "Service, date et heure sont requis" 
      });
    }

    // 1. Récupérer les infos du service
    const [services] = await pool.query(
      `SELECT s.id, s.provider_id, s.price, s.duration, s.title,
              u.name as provider_name, u.email as provider_email
       FROM services s
       JOIN provider_profiles pp ON s.provider_id = pp.id
       JOIN users u ON pp.user_id = u.id
       WHERE s.id = ? AND s.status = 'active'`,
      [service_id]
    );

    if (services.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Service non trouvé ou inactif" 
      });
    }

    const service = services[0];

    // 2. Vérifier que le client ne réserve pas son propre service
    const [clientProfile] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ?",
      [clientId]
    );

    if (clientProfile.length > 0 && clientProfile[0].id === service.provider_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Vous ne pouvez pas réserver votre propre service" 
      });
    }

    // 3. Vérifier la disponibilité (éviter les doublons)
    const [existingBookings] = await pool.query(
      `SELECT id FROM bookings 
       WHERE provider_id = ? 
       AND date = ? 
       AND time = ? 
       AND status IN ('pending', 'accepted')`,
      [service.provider_id, date, time]
    );

    if (existingBookings.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Ce créneau n'est plus disponible" 
      });
    }

    // 4. Créer la réservation
    const [result] = await pool.query(
      `INSERT INTO bookings (client_id, service_id, provider_id, date, time, total_price, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [clientId, service_id, service.provider_id, date, time, service.price, notes || null]
    );

    // 5. Créer une notification pour le prestataire
    const [providerUser] = await pool.query(
      "SELECT user_id FROM provider_profiles WHERE id = ?",
      [service.provider_id]
    );

    if (providerUser.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, 'booking')`,
        [
          providerUser[0].user_id,
          "Nouvelle réservation",
          `Vous avez une nouvelle demande de réservation pour "${service.title}"`,
        ]
      );
    }

    // 6. Récupérer la réservation créée avec toutes les infos
    const [newBooking] = await pool.query(
      `SELECT b.*, 
              s.title as service_title, s.image as service_image, s.duration,
              u.name as client_name, u.avatar as client_avatar,
              p.name as provider_name, p.avatar as provider_avatar
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u ON b.client_id = u.id
       JOIN provider_profiles pp ON b.provider_id = pp.id
       JOIN users p ON pp.user_id = p.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Réservation créée avec succès",
      booking: newBooking[0],
    });
  } catch (error) {
    console.error("Erreur création réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur lors de la création de la réservation" 
    });
  }
};

/* ==================== CLIENT : LISTE DE SES RÉSERVATIONS ==================== */
export const getClientBookings = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { status } = req.query; // Filtrer par statut (optionnel)

    let query = `
      SELECT b.*, 
             s.title as service_title, s.image as service_image, s.duration,
             p.name as provider_name, p.avatar as provider_avatar, p.phone as provider_phone,
             pp.address as provider_address
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN provider_profiles pp ON b.provider_id = pp.id
      JOIN users p ON pp.user_id = p.id
      WHERE b.client_id = ?
    `;

    const params = [clientId];

    if (status) {
      query += " AND b.status = ?";
      params.push(status);
    }

    query += " ORDER BY b.date DESC, b.time DESC";

    const [bookings] = await pool.query(query, params);

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Erreur récupération réservations client:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== PRESTATAIRE : LISTE DE SES RÉSERVATIONS ==================== */
export const getProviderBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Récupérer l'ID du profil prestataire
    const [profiles] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ?",
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Profil prestataire non trouvé" 
      });
    }

    const providerId = profiles[0].id;

    let query = `
      SELECT b.*, 
             s.title as service_title, s.image as service_image, s.duration,
             u.name as client_name, u.avatar as client_avatar, u.phone as client_phone, u.email as client_email
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.client_id = u.id
      WHERE b.provider_id = ?
    `;

    const params = [providerId];

    if (status) {
      query += " AND b.status = ?";
      params.push(status);
    }

    query += " ORDER BY b.date DESC, b.time DESC";

    const [bookings] = await pool.query(query, params);

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Erreur récupération réservations prestataire:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== DÉTAILS D'UNE RÉSERVATION ==================== */
export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [bookings] = await pool.query(
      `SELECT b.*, 
              s.title as service_title, s.description as service_description, 
              s.image as service_image, s.duration, s.price,
              client.name as client_name, client.avatar as client_avatar, 
              client.phone as client_phone, client.email as client_email,
              provider.name as provider_name, provider.avatar as provider_avatar, 
              provider.phone as provider_phone,
              pp.address as provider_address, pp.specialty as provider_specialty
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users client ON b.client_id = client.id
       JOIN provider_profiles pp ON b.provider_id = pp.id
       JOIN users provider ON pp.user_id = provider.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    // Vérifier que l'utilisateur a le droit de voir cette réservation
    const [providerProfile] = await pool.query(
      "SELECT id, user_id FROM provider_profiles WHERE id = ?",
      [booking.provider_id]
    );

    const isClient = booking.client_id === userId;
    const isProvider = providerProfile.length > 0 && providerProfile[0].user_id === userId;

    if (!isClient && !isProvider) {
      return res.status(403).json({ 
        success: false, 
        message: "Accès non autorisé" 
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Erreur récupération détails réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== PRESTATAIRE : ACCEPTER UNE RÉSERVATION ==================== */
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que c'est bien le prestataire
    const [bookings] = await pool.query(
      `SELECT b.*, pp.user_id as provider_user_id, s.title as service_title
       FROM bookings b
       JOIN provider_profiles pp ON b.provider_id = pp.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    if (booking.provider_user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Vous n'êtes pas autorisé à accepter cette réservation" 
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Cette réservation ne peut plus être acceptée" 
      });
    }

    // Mettre à jour le statut
    await pool.query(
      "UPDATE bookings SET status = 'accepted' WHERE id = ?",
      [id]
    );

    // Notifier le client
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'booking')`,
      [
        booking.client_id,
        "Réservation confirmée",
        `Votre réservation pour "${booking.service_title}" a été acceptée`,
      ]
    );

    res.json({
      success: true,
      message: "Réservation acceptée avec succès",
    });
  } catch (error) {
    console.error("Erreur acceptation réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== PRESTATAIRE : REFUSER UNE RÉSERVATION ==================== */
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [bookings] = await pool.query(
      `SELECT b.*, pp.user_id as provider_user_id, s.title as service_title
       FROM bookings b
       JOIN provider_profiles pp ON b.provider_id = pp.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    if (booking.provider_user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Cette réservation ne peut plus être refusée" 
      });
    }

    // Mettre à jour le statut (tu peux ajouter un champ rejection_reason si besoin)
    await pool.query(
      "UPDATE bookings SET status = 'cancelled', notes = CONCAT(IFNULL(notes, ''), '\nRefusée par le prestataire') WHERE id = ?",
      [id]
    );

    // Notifier le client
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'booking')`,
      [
        booking.client_id,
        "Réservation refusée",
        `Votre réservation pour "${booking.service_title}" a été refusée`,
      ]
    );

    res.json({
      success: true,
      message: "Réservation refusée",
    });
  } catch (error) {
    console.error("Erreur refus réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== CLIENT : ANNULER UNE RÉSERVATION ==================== */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const [bookings] = await pool.query(
      `SELECT b.*, s.title as service_title, pp.user_id as provider_user_id
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN provider_profiles pp ON b.provider_id = pp.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    if (booking.client_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({ 
        success: false, 
        message: "Cette réservation ne peut plus être annulée" 
      });
    }

    // Annuler la réservation
    const cancellationNote = reason || "Annulée par le client";
    await pool.query(
      "UPDATE bookings SET status = 'cancelled', notes = CONCAT(IFNULL(notes, ''), '\n', ?) WHERE id = ?",
      [cancellationNote, id]
    );

    // Notifier le prestataire
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'booking')`,
      [
        booking.provider_user_id,
        "Réservation annulée",
        `La réservation pour "${booking.service_title}" a été annulée par le client`,
      ]
    );

    res.json({
      success: true,
      message: "Réservation annulée avec succès",
    });
  } catch (error) {
    console.error("Erreur annulation réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== PRESTATAIRE : MARQUER COMME TERMINÉ ==================== */
export const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [bookings] = await pool.query(
      `SELECT b.*, pp.user_id as provider_user_id, s.title as service_title
       FROM bookings b
       JOIN provider_profiles pp ON b.provider_id = pp.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    if (booking.provider_user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ 
        success: false, 
        message: "Cette réservation ne peut pas être marquée comme terminée" 
      });
    }

    // Marquer comme terminé
    await pool.query(
      "UPDATE bookings SET status = 'completed' WHERE id = ?",
      [id]
    );

    // Notifier le client
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'booking')`,
      [
        booking.client_id,
        "Service terminé",
        `Le service "${booking.service_title}" est terminé. Laissez un avis !`,
      ]
    );

    res.json({
      success: true,
      message: "Réservation marquée comme terminée",
    });
  } catch (error) {
    console.error("Erreur complétion réservation:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== STATS POUR LE DASHBOARD ==================== */
export const getBookingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === "client") {
      // Stats client
      const [clientStats] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM bookings
         WHERE client_id = ?`,
        [userId]
      );

      stats = clientStats[0];
    } else if (userRole === "provider") {
      // Stats prestataire
      const [profiles] = await pool.query(
        "SELECT id FROM provider_profiles WHERE user_id = ?",
        [userId]
      );

      if (profiles.length > 0) {
        const providerId = profiles[0].id;

        const [providerStats] = await pool.query(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as total_earnings
           FROM bookings
           WHERE provider_id = ?`,
          [providerId]
        );

        stats = providerStats[0];
      }
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Erreur récupération stats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};
