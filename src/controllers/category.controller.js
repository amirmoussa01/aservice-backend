import { pool } from "../config/db.js";
import fs from "fs";
import path from "path";

/**
 * GET /api/categories
 * Liste toutes les catégories (publique)
 */
export const getAllCategories = async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query = "SELECT * FROM categories WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [categories] = await pool.query(query, params);

    res.json({ 
      success: true,
      categories 
    });

  } catch (err) {
    console.error("getAllCategories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/:id
 * Détails d'une catégorie
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[category]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable" });
    }

    // Compter le nombre de services dans cette catégorie
    const [[count]] = await pool.query(
      "SELECT COUNT(*) as total FROM services WHERE category_id = ? AND status = 'active'",
      [id]
    );

    res.json({
      success: true,
      category: {
        ...category,
        services_count: count.total
      }
    });

  } catch (err) {
    console.error("getCategoryById error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * POST /api/admin/categories
 * Créer une catégorie (Admin uniquement)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      // Supprimer le fichier si validation échoue
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "Le nom est obligatoire" });
    }

    // Vérifier si le nom existe déjà
    const [[existing]] = await pool.query(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      [name.trim()]
    );

    if (existing) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "Cette catégorie existe déjà" });
    }

    // Récupérer le chemin de l'icône si uploadée
    const iconPath = req.file ? `/uploads/icons/${req.file.filename}` : null;

    // Insérer la catégorie
    const [result] = await pool.query(
      "INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)",
      [name.trim(), description?.trim() || null, iconPath]
    );

    // Récupérer la catégorie créée
    const [[newCategory]] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      category: newCategory
    });

  } catch (err) {
    console.error("createCategory error:", err);
    
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * PUT /api/admin/categories/:id
 * Modifier une catégorie (Admin uniquement)
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Vérifier que la catégorie existe
    const [[category]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (!category) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "Catégorie introuvable" });
    }

    // Vérifier si le nouveau nom n'existe pas déjà (sauf pour cette catégorie)
    if (name && name.trim() !== category.name) {
      const [[existing]] = await pool.query(
        "SELECT id FROM categories WHERE name = ? AND id != ? LIMIT 1",
        [name.trim(), id]
      );

      if (existing) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Ce nom de catégorie existe déjà" });
      }
    }

    // Gérer l'icône
    let iconPath = category.icon;
    if (req.file) {
      // Supprimer l'ancienne icône si elle existe
      if (category.icon) {
        const oldIconPath = path.join(process.cwd(), category.icon);
        if (fs.existsSync(oldIconPath)) {
          fs.unlinkSync(oldIconPath);
        }
      }
      iconPath = `/uploads/icons/${req.file.filename}`;
    }

    // Mettre à jour
    await pool.query(
      "UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ?",
      [
        name?.trim() || category.name,
        description?.trim() || category.description,
        iconPath,
        id
      ]
    );

    // Récupérer la catégorie mise à jour
    const [[updatedCategory]] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Catégorie mise à jour",
      category: updatedCategory
    });

  } catch (err) {
    console.error("updateCategory error:", err);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * DELETE /api/admin/categories/:id
 * Supprimer une catégorie (Admin uniquement)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la catégorie existe
    const [[category]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable" });
    }

    // Vérifier qu'il n'y a pas de services associés
    const [[count]] = await pool.query(
      "SELECT COUNT(*) as total FROM services WHERE category_id = ?",
      [id]
    );

    if (count.total > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer. ${count.total} service(s) utilise(nt) cette catégorie.` 
      });
    }

    // Supprimer l'icône si elle existe
    if (category.icon) {
      const iconPath = path.join(process.cwd(), category.icon);
      if (fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath);
      }
    }

    // Supprimer la catégorie
    await pool.query("DELETE FROM categories WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Catégorie supprimée"
    });

  } catch (err) {
    console.error("deleteCategory error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/stats
 * Statistiques des catégories
 */
export const getCategoriesStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        COUNT(s.id) as services_count,
        COUNT(DISTINCT s.provider_id) as providers_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      GROUP BY c.id, c.name, c.icon
      ORDER BY services_count DESC
    `);

    res.json({
      success: true,
      stats
    });

  } catch (err) {
    console.error("getCategoriesStats error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
/**
 * GET /api/categories/search
 * Recherche avancée avec filtres multiples
 */
export const searchCategories = async (req, res) => {
  try {
    const { 
      q,              // Terme de recherche général
      name,           // Recherche par nom exact
      has_services,   // Filtrer celles qui ont des services
      min_services,   // Minimum de services
      limit = 20, 
      offset = 0,
      sort = 'name',  // name, services_count, created_at
      order = 'ASC'   // ASC ou DESC
    } = req.query;

    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as services_count,
        COUNT(DISTINCT s.provider_id) as providers_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      WHERE 1=1
    `;
    
    const params = [];

    // Recherche générale (nom OU description)
    if (q && q.trim().length > 0) {
      query += " AND (c.name LIKE ? OR c.description LIKE ?)";
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    // Recherche par nom exact
    if (name && name.trim().length > 0) {
      query += " AND c.name LIKE ?";
      params.push(`%${name.trim()}%`);
    }

    query += " GROUP BY c.id";

    // Filtrer celles qui ont des services
    if (has_services === 'true') {
      query += " HAVING services_count > 0";
    }

    // Minimum de services
    if (min_services && parseInt(min_services) > 0) {
      query += has_services === 'true' 
        ? ` AND services_count >= ${parseInt(min_services)}`
        : ` HAVING services_count >= ${parseInt(min_services)}`;
    }

    // Tri
    const validSorts = ['name', 'services_count', 'created_at', 'providers_count'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'name';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    if (sortField === 'services_count' || sortField === 'providers_count') {
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ` ORDER BY c.${sortField} ${sortOrder}`;
    }

    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [categories] = await pool.query(query, params);

    // Compter le total (pour pagination)
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      WHERE 1=1
    `;
    
    const countParams = [];

    if (q && q.trim().length > 0) {
      countQuery += " AND (c.name LIKE ? OR c.description LIKE ?)";
      countParams.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    if (name && name.trim().length > 0) {
      countQuery += " AND c.name LIKE ?";
      countParams.push(`%${name.trim()}%`);
    }

    const [[totalCount]] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      categories,
      pagination: {
        total: totalCount.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < totalCount.total
      }
    });

  } catch (err) {
    console.error("searchCategories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/popular
 * Top catégories les plus populaires (avec le plus de services)
 */
export const getPopularCategories = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const [categories] = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as services_count,
        COUNT(DISTINCT s.provider_id) as providers_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      GROUP BY c.id
      HAVING services_count > 0
      ORDER BY services_count DESC, providers_count DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      categories
    });

  } catch (err) {
    console.error("getPopularCategories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/trending
 * Catégories tendances (nouvelles avec beaucoup de services récents)
 */
export const getTrendingCategories = async (req, res) => {
  try {
    const { limit = 6, days = 30 } = req.query;

    const [categories] = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as recent_services_count,
        COUNT(DISTINCT s.provider_id) as providers_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id 
        AND s.status = 'active'
        AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY c.id
      HAVING recent_services_count > 0
      ORDER BY recent_services_count DESC
      LIMIT ?
    `, [parseInt(days), parseInt(limit)]);

    res.json({
      success: true,
      categories
    });

  } catch (err) {
    console.error("getTrendingCategories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/autocomplete
 * Autocomplétion pour recherche rapide
 */
export const autocompleteCategories = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ 
        success: true, 
        suggestions: [] 
      });
    }

    const [suggestions] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        COUNT(s.id) as services_count
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id AND s.status = 'active'
      WHERE c.name LIKE ?
      GROUP BY c.id, c.name, c.icon
      ORDER BY services_count DESC, c.name ASC
      LIMIT ?
    `, [`${q.trim()}%`, parseInt(limit)]);

    res.json({
      success: true,
      suggestions
    });

  } catch (err) {
    console.error("autocompleteCategories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET /api/categories/:id/services
 * Services d'une catégorie avec filtres
 */
export const getCategoryServices = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      search, 
      min_price, 
      max_price, 
      verified_only,
      limit = 20, 
      offset = 0,
      sort = 'created_at', // created_at, price, title
      order = 'DESC'
    } = req.query;

    // Vérifier que la catégorie existe
    const [[category]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable" });
    }

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
      WHERE s.category_id = ? AND s.status = 'active'
    `;

    const params = [id];

    // Recherche dans titre et description
    if (search && search.trim().length > 0) {
      query += " AND (s.title LIKE ? OR s.description LIKE ?)";
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Filtrer par prix
    if (min_price && parseFloat(min_price) > 0) {
      query += " AND s.price >= ?";
      params.push(parseFloat(min_price));
    }

    if (max_price && parseFloat(max_price) > 0) {
      query += " AND s.price <= ?";
      params.push(parseFloat(max_price));
    }

    // Seulement prestataires vérifiés
    if (verified_only === 'true') {
      query += " AND p.verified = 1";
    }

    // Tri
    const validSorts = ['created_at', 'price', 'title', 'duration'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    query += ` ORDER BY s.${sortField} ${sortOrder}`;
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [services] = await pool.query(query, params);

    res.json({
      success: true,
      category,
      services,
      total: services.length
    });

  } catch (err) {
    console.error("getCategoryServices error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};