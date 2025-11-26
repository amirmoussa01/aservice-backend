// src/controllers/client.controller.js
import db from "../config/db.js";
import fs from "fs";
import path from "path";

/**
 * GET /api/client/me
 * Récupère le profil du client connecté
 */
export const getClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, name, email, phone, avatar, status, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Client introuvable" });

    return res.json({ profile: rows[0] });
  } catch (err) {
    console.error("getClientProfile:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * PUT /api/client/update
 * Body: { name, email, phone }
 * Met à jour le nom, l'email et le téléphone du client.
 */
export const updateClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    // Vérifier email unique si modifié
    if (email) {
      const [existing] = await db.query("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1", [email, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Cet email est déjà utilisé par un autre compte." });
      }
    }

    // Mise à jour
    await db.query("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?", [
      name || null,
      email || null,
      phone || null,
      userId,
    ]);

    // Récupérer le profil mis à jour
    const [rows] = await db.query("SELECT id, name, email, phone, avatar, status, created_at FROM users WHERE id = ? LIMIT 1", [userId]);

    return res.json({ message: "Profil mis à jour", profile: rows[0] });
  } catch (err) {
    console.error("updateClientProfile:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * POST /api/client/avatar
 * upload.single('avatar')
 * Upload et met à jour l'avatar du client
 */
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) return res.status(400).json({ message: "Fichier avatar manquant" });

    const relativePath = `/uploads/avatars/${req.file.filename}`; // accessible via static route
    // Récupérer l'ancien avatar pour suppression si besoin
    const [rows] = await db.query("SELECT avatar FROM users WHERE id = ? LIMIT 1", [userId]);
    const oldAvatar = rows[0]?.avatar;

    // Mettre à jour la BDD
    await db.query("UPDATE users SET avatar = ? WHERE id = ?", [relativePath, userId]);

    // Supprimer l'ancien fichier si présent et différent
    if (oldAvatar) {
      try {
        const oldPath = path.join(process.cwd(), oldAvatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {
        console.warn("Impossible de supprimer l'ancien avatar:", e.message);
      }
    }

    return res.status(201).json({ message: "Avatar mis à jour", avatar: relativePath });
  } catch (err) {
    console.error("uploadAvatar:", err);
    return res.status(500).json({ message: "Erreur lors de l'upload de l'avatar" });
  }
};

/**
 * DELETE /api/client/avatar
 * Supprime l'avatar du client (met avatar = NULL)
 */
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query("SELECT avatar FROM users WHERE id = ? LIMIT 1", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "Client introuvable" });

    const avatar = rows[0].avatar;
    if (!avatar) return res.status(400).json({ message: "Aucun avatar à supprimer" });

    // Mettre avatar à NULL
    await db.query("UPDATE users SET avatar = NULL WHERE id = ?", [userId]);

    // Supprimer le fichier physique
    try {
      const filePath = path.join(process.cwd(), avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn("Impossible de supprimer le fichier avatar:", e.message);
    }

    return res.json({ message: "Avatar supprimé" });
  } catch (err) {
    console.error("deleteAvatar:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
