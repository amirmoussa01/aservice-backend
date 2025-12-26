import { pool } from "../config/db.js";

/**
 * POST /api/provider/services
 * Créer un nouveau service
 */
export const createService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, title, description, price, duration } = req.body;

    // Validation
    if (!category_id || !title || !price) {
      return res.status(400).json({ 
        message: "Catégorie, titre et prix sont obligatoires" 
      });
    }

    // Récupérer provider_id depuis user_id
    const [[provider]] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!provider) {
      return res.status(404).json({ message: "Profil prestataire introuvable" });
    }

    const providerId = provider.id;

    // Insérer le service
    const [result] = await pool.query(
      `INSERT INTO services (provider_id, category_id, title, description, price, duration, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [providerId, category_id, title, description, price, duration || 60]
    );

    // Récupérer le service créé
    const [[newService]] = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon
       FROM services s
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Service créé avec succès",
      service: newService
    });

  } catch (err) {
    console.error("createService error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/provider/services
 * Liste des services du prestataire connecté
 */
export const getMyServices = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer provider_id
    const [[provider]] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!provider) {
      return res.status(404).json({ message: "Profil prestataire introuvable" });
    }

    // Récupérer tous les services
    const [services] = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon
       FROM services s
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`,
      [provider.id]
    );

    res.json({ services });

  } catch (err) {
    console.error("getMyServices error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * PUT /api/provider/services/:id
 * Modifier un service
 */
export const updateService = async (req, res) => {
  try {
    const userId = req.user.id;
    const serviceId = req.params.id;
    const { category_id, title, description, price, duration, status } = req.body;

    // Récupérer provider_id
    const [[provider]] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!provider) {
      return res.status(404).json({ message: "Profil prestataire introuvable" });
    }

    // Vérifier que le service appartient bien au prestataire
    const [[service]] = await pool.query(
      "SELECT id FROM services WHERE id = ? AND provider_id = ? LIMIT 1",
      [serviceId, provider.id]
    );

    if (!service) {
      return res.status(404).json({ message: "Service introuvable" });
    }

    // Mettre à jour
    await pool.query(
      `UPDATE services 
       SET category_id = ?, title = ?, description = ?, price = ?, duration = ?, status = ?
       WHERE id = ? AND provider_id = ?`,
      [category_id, title, description, price, duration, status || 'active', serviceId, provider.id]
    );

    // Récupérer le service mis à jour
    const [[updatedService]] = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon
       FROM services s
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [serviceId]
    );

    res.json({
      message: "Service mis à jour",
      service: updatedService
    });

  } catch (err) {
    console.error("updateService error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * DELETE /api/provider/services/:id
 * Supprimer un service
 */
export const deleteService = async (req, res) => {
  try {
    const userId = req.user.id;
    const serviceId = req.params.id;

    // Récupérer provider_id
    const [[provider]] = await pool.query(
      "SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!provider) {
      return res.status(404).json({ message: "Profil prestataire introuvable" });
    }

    // Vérifier que le service appartient bien au prestataire
    const [[service]] = await pool.query(
      "SELECT id FROM services WHERE id = ? AND provider_id = ? LIMIT 1",
      [serviceId, provider.id]
    );

    if (!service) {
      return res.status(404).json({ message: "Service introuvable" });
    }

    // Supprimer
    await pool.query(
      "DELETE FROM services WHERE id = ? AND provider_id = ?",
      [serviceId, provider.id]
    );

    res.json({ message: "Service supprimé" });

  } catch (err) {
    console.error("deleteService error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/services
 * Liste publique de tous les services actifs
 */
export const getPublicServices = async (req, res) => {
  try {
    const { category_id, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        s.*,
        c.name as category_name, 
        c.icon as category_icon,
        p.id as provider_profile_id,
        u.id as provider_user_id,
        u.name as provider_name,
        u.avatar as provider_avatar,
        p.specialty as provider_specialty,
        p.address as provider_address,
        p.verified as provider_verified
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN provider_profiles p ON s.provider_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE s.status = 'active'
    `;

    const params = [];

    if (category_id) {
      query += " AND s.category_id = ?";
      params.push(category_id);
    }

    if (search) {
      query += " AND (s.title LIKE ? OR s.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY s.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [services] = await pool.query(query, params);

    res.json({ services });

  } catch (err) {
    console.error("getPublicServices error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/services/category/:categoryId
 * Services d'une catégorie spécifique
 */
export const getServicesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const [services] = await pool.query(
      `SELECT 
        s.*,
        c.name as category_name, 
        c.icon as category_icon,
        p.id as provider_profile_id,
        u.id as provider_user_id,
        u.name as provider_name,
        u.avatar as provider_avatar,
        p.specialty as provider_specialty,
        p.verified as provider_verified
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN provider_profiles p ON s.provider_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE s.category_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC`,
      [categoryId]
    );

    res.json({ services });

  } catch (err) {
    console.error("getServicesByCategory error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};