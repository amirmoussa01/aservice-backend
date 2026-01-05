import { pool } from "../config/db.js";

/* ==================== CLIENT : CRÉER UN AVIS ==================== */
export const createReview = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { booking_id, provider_id, rating, comment } = req.body;

    // Validation
    if (!booking_id || !provider_id || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: "Réservation, prestataire et note sont requis" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "La note doit être entre 1 et 5" 
      });
    }

    // Vérifier que la réservation existe et appartient au client
    const [bookings] = await pool.query(
      `SELECT b.*, s.provider_id 
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ? AND b.client_id = ?`,
      [booking_id, clientId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Réservation non trouvée" 
      });
    }

    const booking = bookings[0];

    // Vérifier que la réservation est terminée
    if (booking.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Vous ne pouvez évaluer que les services terminés" 
      });
    }

    // Vérifier si un avis existe déjà
    const [existingReview] = await pool.query(
      "SELECT id FROM reviews WHERE booking_id = ?",
      [booking_id]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Vous avez déjà laissé un avis pour cette réservation" 
      });
    }

    // Créer l'avis
    const [result] = await pool.query(
      `INSERT INTO reviews (booking_id, client_id, provider_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [booking_id, clientId, provider_id, rating, comment || null]
    );

    // Notifier le prestataire
    const [providerUser] = await pool.query(
      "SELECT user_id FROM provider_profiles WHERE id = ?",
      [provider_id]
    );

    if (providerUser.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, 'review')`,
        [
          providerUser[0].user_id,
          "Nouvel avis",
          `Vous avez reçu une note de ${rating}/5 étoiles`,
        ]
      );
    }

    // Récupérer l'avis créé avec les infos
    const [newReview] = await pool.query(
      `SELECT r.*, 
              u.name as client_name, u.avatar as client_avatar,
              s.title as service_title
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Avis publié avec succès",
      review: newReview[0],
    });
  } catch (error) {
    console.error("Erreur création avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== RÉCUPÉRER LES AVIS D'UN PRESTATAIRE ==================== */
export const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    const [reviews] = await pool.query(
      `SELECT r.*, 
              u.name as client_name, u.avatar as client_avatar,
              s.title as service_title
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       WHERE r.provider_id = ?
       ORDER BY r.created_at DESC`,
      [providerId]
    );

    // Calculer les stats
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM reviews
       WHERE provider_id = ?`,
      [providerId]
    );

    res.json({
      success: true,
      reviews,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Erreur récupération avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== RÉCUPÉRER LES AVIS D'UN SERVICE ==================== */
export const getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const [reviews] = await pool.query(
      `SELECT r.*, 
              u.name as client_name, u.avatar as client_avatar
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE b.service_id = ?
       ORDER BY r.created_at DESC`,
      [serviceId]
    );

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Erreur récupération avis service:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== VÉRIFIER SI L'UTILISATEUR PEUT LAISSER UN AVIS ==================== */
export const canReview = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { bookingId } = req.params;

    // Vérifier la réservation
    const [bookings] = await pool.query(
      `SELECT status FROM bookings WHERE id = ? AND client_id = ?`,
      [bookingId, clientId]
    );

    if (bookings.length === 0) {
      return res.json({
        success: true,
        canReview: false,
        reason: "Réservation non trouvée",
      });
    }

    if (bookings[0].status !== 'completed') {
      return res.json({
        success: true,
        canReview: false,
        reason: "La réservation doit être terminée",
      });
    }

    // Vérifier si un avis existe déjà
    const [existingReview] = await pool.query(
      "SELECT id FROM reviews WHERE booking_id = ?",
      [bookingId]
    );

    if (existingReview.length > 0) {
      return res.json({
        success: true,
        canReview: false,
        reason: "Avis déjà publié",
      });
    }

    res.json({
      success: true,
      canReview: true,
    });
  } catch (error) {
    console.error("Erreur vérification avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== SUPPRIMER UN AVIS (ADMIN/CLIENT) ==================== */
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Récupérer l'avis
    const [reviews] = await pool.query(
      "SELECT * FROM reviews WHERE id = ?",
      [id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Avis non trouvé" 
      });
    }

    const review = reviews[0];

    // Vérifier les droits (client propriétaire ou admin)
    if (review.client_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Non autorisé" 
      });
    }

    await pool.query("DELETE FROM reviews WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Avis supprimé",
    });
  } catch (error) {
    console.error("Erreur suppression avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== RÉCUPÉRER MES AVIS (CLIENT) ==================== */
export const getMyReviews = async (req, res) => {
  try {
    const clientId = req.user.id;

    const [reviews] = await pool.query(
      `SELECT r.*, 
              s.title as service_title,
              p.name as provider_name
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       JOIN provider_profiles pp ON s.provider_id = pp.id
       JOIN users p ON pp.user_id = p.id
       WHERE r.client_id = ?
       ORDER BY r.created_at DESC`,
      [clientId]
    );

    res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Erreur récupération mes avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};

/* ==================== MODIFIER UN AVIS ==================== */
export const updateReview = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        message: "La note doit être entre 1 et 5" 
      });
    }

    const [reviews] = await pool.query(
      "SELECT * FROM reviews WHERE id = ? AND client_id = ?",
      [id, clientId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Avis non trouvé" 
      });
    }

    await pool.query(
      `UPDATE reviews SET rating = ?, comment = ? WHERE id = ?`,
      [rating, comment, id]
    );

    res.json({
      success: true,
      message: "Avis modifié",
    });
  } catch (error) {
    console.error("Erreur modification avis:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur" 
    });
  }
};