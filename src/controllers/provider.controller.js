import {pool} from "../config/db.js";
import fs from "fs";
import path from "path";

/**
 * GET /api/provider/profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[userRows]] = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.avatar, u.status,
        p.id AS provider_id, p.bio, p.address, p.formatted_address, 
        p.specialty, p.latitude, p.longitude, p.verified, p.created_at AS provider_created_at
       FROM users u
       LEFT JOIN provider_profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    if (!userRows) {
      return res.status(404).json({ message: "Profil introuvable" });
    }

    res.json({ profile: userRows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * PUT /api/provider/profile
 * Body: { name, phone, bio, address }
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { 
      name, phone, bio, address, formatted_address, specialty 
    } = req.body;

    // 1️⃣ Récupérer user
    const [[currentUser]] = await pool.query(
      "SELECT name, phone FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!currentUser) return res.status(404).json({ message: "Utilisateur introuvable." });

    // 2️⃣ Récupérer provider profile
    const [[currentProvider]] = await pool.query(
      `SELECT bio, address, formatted_address, specialty 
       FROM provider_profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    // 3️⃣ Merge des valeurs
    const newName = name ?? currentUser.name;
    const newPhone = phone ?? currentUser.phone;

    const newBio = bio ?? currentProvider?.bio ?? null;
    const newAddress = address ?? currentProvider?.address ?? null;
    const newFormattedAddress = formatted_address ?? currentProvider?.formatted_address ?? null;
    const newSpecialty = specialty ?? currentProvider?.specialty ?? null;

    // 4️⃣ Update users
    await pool.query(
      `UPDATE users SET name = ?, phone = ? WHERE id = ?`,
      [newName, newPhone, userId]
    );

    // 5️⃣ Update / Insert provider profile
    if (!currentProvider) {
      await pool.query(
        `INSERT INTO provider_profiles 
         (user_id, bio, address, formatted_address, specialty) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, newBio, newAddress, newFormattedAddress, newSpecialty]
      );
    } else {
      await pool.query(
        `UPDATE provider_profiles 
         SET bio = ?, address = ?, formatted_address = ?, specialty = ?
         WHERE user_id = ?`,
        [newBio, newAddress, newFormattedAddress, newSpecialty, userId]
      );
    }

    // 6️⃣ Retourner profil mis à jour
    const [[updated]] = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.avatar, u.status,
        p.id AS provider_id, p.bio, p.address, p.formatted_address,
        p.specialty, p.latitude, p.longitude, p.verified
       FROM users u
       LEFT JOIN provider_profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    return res.json({
      message: "Profil mis à jour",
      profile: updated
    });

  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * POST /api/provider/avatar
 * Upload avatar du provider
 */
export const uploadProviderAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) return res.status(400).json({ message: "Fichier avatar manquant" });

    const relativePath = `/uploads/avatars/${req.file.filename}`;
    
    // Récupérer l'ancien avatar
    const [[user]] = await pool.query("SELECT avatar FROM users WHERE id = ? LIMIT 1", [userId]);
    const oldAvatar = user?.avatar;

    // Mettre à jour la BDD
    await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [relativePath, userId]);

    // Supprimer l'ancien fichier
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
    console.error("uploadProviderAvatar:", err);
    return res.status(500).json({ message: "Erreur lors de l'upload de l'avatar" });
  }
};

/**
 * DELETE /api/provider/avatar
 * Supprime l'avatar du provider
 */
export const deleteProviderAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[user]] = await pool.query("SELECT avatar FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!user) return res.status(404).json({ message: "Provider introuvable" });

    const avatar = user.avatar;
    if (!avatar) return res.status(400).json({ message: "Aucun avatar à supprimer" });

    // Mettre avatar à NULL
    await pool.query("UPDATE users SET avatar = NULL WHERE id = ?", [userId]);

    // Supprimer le fichier physique
    try {
      const filePath = path.join(process.cwd(), avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn("Impossible de supprimer le fichier avatar:", e.message);
    }

    return res.json({ message: "Avatar supprimé" });
  } catch (err) {
    console.error("deleteProviderAvatar:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
/**
 * PUT /api/provider/profile/location
 * Body: { latitude, longitude, address }
 */
export const updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    const { latitude, longitude, address, formatted_address } = req.body;

    // Vérifier si profil existe
    const [profiles] = await pool.query(
      `SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (profiles.length === 0) {
      await pool.query(
        `INSERT INTO provider_profiles 
         (user_id, latitude, longitude, address, formatted_address)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, latitude, longitude, address, formatted_address]
      );
    } else {
      await pool.query(
        `UPDATE provider_profiles 
         SET latitude = ?, longitude = ?, address = ?, formatted_address = ?
         WHERE user_id = ?`,
        [latitude, longitude, address, formatted_address, userId]
      );
    }

    const [[updated]] = await pool.query(
      `SELECT id AS provider_id, latitude, longitude, address, formatted_address, verified
       FROM provider_profiles
       WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    res.json({
      message: "Localisation mise à jour",
      provider_profile: updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


/**
 * POST /api/provider/documents
 * multipart/form-data => field 'type' (e.g. 'CNI','diplome') and file 'file'
 */
export const uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const providerIdRow = await pool.query(`SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    const providerRows = providerIdRow[0];
    let providerId;
    if (providerRows.length === 0) {
      // create profile if absent
      const [ins] = await pool.query(`INSERT INTO provider_profiles(user_id) VALUES (?)`, [userId]);
      providerId = ins.insertId;
    } else {
      providerId = providerRows[0].id;
    }

    if (!req.file) return res.status(400).json({ message: "Fichier manquant" });
    const fileUrl = `/uploads/documents/${req.file.filename}`; // path relatif (adapter en prod)

    const { type } = req.body;

    const [result] = await pool.query(
      `INSERT INTO documents (provider_id, type, file_url, status) VALUES (?, ?, ?, 'pending')`,
      [providerId, type || "document", fileUrl]
    );

    res.status(201).json({
      message: "Document envoyé, en attente de validation",
      document: {
        id: result.insertId,
        provider_id: providerId,
        type: type || "document",
        file_url: fileUrl,
        status: "pending"
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur upload document" });
  }
};

/**
 * GET /api/provider/documents
 */
export const listDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const [[profile]] = await pool.query(`SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    if (!profile) return res.json({ documents: [] });

    const [docs] = await pool.query(`SELECT id, type, file_url, status, created_at FROM documents WHERE provider_id = ? ORDER BY created_at DESC`, [profile.id]);
    res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération documents" });
  }
};

/**
 * DELETE /api/provider/documents/:id
 */
export const deleteDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const docId = req.params.id;

    const [[profile]] = await pool.query(`SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    if (!profile) return res.status(404).json({ message: "Profil prestataire introuvable" });

    const [docs] = await pool.query(`SELECT file_url FROM documents WHERE id = ? AND provider_id = ? LIMIT 1`, [docId, profile.id]);
    if (docs.length === 0) return res.status(404).json({ message: "Document introuvable" });

    const fileUrl = docs[0].file_url;
    // Supprimer de la base
    await pool.query(`DELETE FROM documents WHERE id = ? AND provider_id = ?`, [docId, profile.id]);

    // Supprimer le fichier physique si présent
    try {
      const filePath = path.join(process.cwd(), fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn("Impossible de supprimer le fichier physique:", e.message);
    }

    res.json({ message: "Document supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur suppression document" });
  }
};

/**
 * GET /api/provider/status
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [[profile]] = await pool.query(`SELECT verified FROM provider_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    if (!profile) return res.status(404).json({ message: "Profil introuvable" });
    res.json({ verified: profile.verified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
