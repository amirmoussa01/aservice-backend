import {pool} from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

export const registerClient = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants" });

    // Vérifier si email existe déjà
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Cet email est déjà utilisé" });

    // Hash du mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // Inscription du client
    const [result] = await pool.query(
      `INSERT INTO users(name, email, phone, password, role)
       VALUES (?, ?, ?, ?, 'client')`,
      [name, email, phone || null, hashed]
    );

    const user = {
      id: result.insertId,
      role: "client",
    };

    // Générer token
    const token = generateToken(user);

    res.status(201).json({
      message: "Client inscrit avec succès",
      token,
      user: {
        id: user.id,
        name,
        email,
        phone,
        role: "client",
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const registerProvider = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants" });

    // Vérifier email déjà utilisé
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Cet email est déjà utilisé" });

    // Hash du mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // Enregistrer dans users
    const [result] = await pool.query(
      `INSERT INTO users(name, email, phone, password, role)
       VALUES (?, ?, ?, ?, 'provider')`,
      [name, email, phone || null, hashed]
    );

    const userId = result.insertId;

    // Créer son profil prestataire
    await pool.query(
      `INSERT INTO provider_profiles(user_id)
       VALUES (?)`,
      [userId]
    );

    // Générer token
    const token = generateToken({ id: userId, role: "provider" });

    res.status(201).json({
      message: "Prestataire inscrit avec succès",
      token,
      user: {
        id: userId,
        name,
        email,
        phone,
        role: "provider",
        provider_profile_created: true
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email et mot de passe requis" });

    // Vérifier si l'utilisateur existe
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    const user = rows[0];

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Mot de passe incorrect" });

    // Générer un token
    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    // Charger infos supplémentaires pour les prestataires
    let providerProfile = null;

    if (user.role === "provider") {
      const [profile] = await pool.query(
        "SELECT * FROM provider_profiles WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      providerProfile = profile[0] || null;
    }

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        provider_profile: providerProfile,
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const logout = async (req, res) => {
  try {
    // côté serveur : rien à faire pour JWT
    return res.status(200).json({
      message: "Déconnexion réussie. Veuillez supprimer le token côté client."
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
  }
};


