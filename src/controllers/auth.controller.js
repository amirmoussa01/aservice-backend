import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";
import { OAuth2Client } from "google-auth-library"; 
import crypto from "crypto";
import { sendEmail } from "../config/mailer.js";

/* ---------------------- FORGOT PASSWORD ---------------------- */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'email est requis" });
    }

    const [rows] = await pool.query(
      "SELECT id, name FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    // On ne précise jamais si l'email existe
    if (rows.length === 0) {
      return res.json({
        message: "Si cet email est enregistré, un code de réinitialisation sera envoyé.",
      });
    }

    const user = rows[0];

    // Générer code 6 chiffres
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 3600000); // +1h

    await pool.query(
      "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?",
      [code, expiry, user.id]
    );

    const subject = "Code de réinitialisation - Bconnect";
    const htmlContent = `
      <p>Bonjour ${user.name},</p>
      <p>Votre code de réinitialisation est : <strong>${code}</strong></p>
      <p>Il expire dans 1 heure.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `;

    await sendEmail(email, subject, htmlContent);

    res.json({
      message: "Code envoyé à votre adresse email.",
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Erreur serveur lors de l'envoi du code." });
  }
};

/* ---------------------- RESET PASSWORD ---------------------- */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, code et nouveau mot de passe sont requis",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, reset_password_token, reset_password_expires FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const user = rows[0];

    // Vérification du code + expiration
    if (
      user.reset_password_token !== code ||
      new Date(user.reset_password_expires) < new Date()
    ) {
      await pool.query(
        "UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
        [user.id]
      );
      return res.status(400).json({ message: "Code invalide ou expiré" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({
      message: "Erreur serveur lors de la réinitialisation.",
    });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ----------------------- REGISTER CLIENT ----------------------- */
export const registerClient = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants" });

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Cet email est déjà utilisé" });

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users(name, email, phone, password, role, is_google_account)
       VALUES (?, ?, ?, ?, 'client', 0)`,
      [name, email, phone || null, hashed]
    );

    const user = {
      id: result.insertId,
      role: "client",
    };

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
        is_google_account: 0,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ----------------------- REGISTER PROVIDER ----------------------- */
export const registerProvider = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants" });

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0)
      return res.status(400).json({ message: "Cet email est déjà utilisé" });

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users(name, email, phone, password, role, is_google_account)
       VALUES (?, ?, ?, ?, 'provider', 0)`,
      [name, email, phone || null, hashed]
    );

    const userId = result.insertId;

    await pool.query(
      `INSERT INTO provider_profiles(user_id) VALUES (?)`,
      [userId]
    );

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
        provider_profile_created: true,
        is_google_account: 0,
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ----------------------- LOGIN NORMAL ----------------------- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email et mot de passe requis" });

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    const user = rows[0];

    if (user.is_google_account === 1)
      return res.status(403).json({
        message:
          "Ce compte utilise Google Sign-In. Veuillez vous connecter via Google.",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = generateToken({ id: user.id, role: user.role });

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
        ...user,
        provider_profile: providerProfile,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/* ----------------------- LOGIN GOOGLE (MODIFIÉ - ACCEPTE ID TOKEN ET ACCESS TOKEN) ----------------------- */
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token Google manquant" });
    }

    let googleUser;

    try {
      // ✅ TENTATIVE 1 : Vérifier comme ID Token
      console.log("🔍 Tentative de vérification comme ID Token...");
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      googleUser = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      };
      console.log("✅ ID Token validé avec succès");

    } catch (idTokenError) {
      // ✅ TENTATIVE 2 : Si échec, essayer comme Access Token
      console.log("⚠️ Échec ID Token, tentative avec Access Token...");
      
      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`
        );

        if (!response.ok) {
          throw new Error("Access Token invalide");
        }

        const data = await response.json();

        if (!data.email) {
          throw new Error("Email non trouvé dans la réponse Google");
        }

        googleUser = {
          name: data.name,
          email: data.email,
          picture: data.picture,
        };
        console.log("✅ Access Token validé avec succès");

      } catch (accessTokenError) {
        console.error("❌ Échec des deux méthodes de validation:", {
          idTokenError: idTokenError.message,
          accessTokenError: accessTokenError.message,
        });
        return res.status(401).json({
          success: false,
          message: "Token Google invalide (ID Token et Access Token rejetés)",
        });
      }
    }

    const { name, email, picture: avatar } = googleUser;

    // 2. Vérifier si l'utilisateur existe en SQL
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    let user;

    if (rows.length === 0) {
      // 3. Création de l'utilisateur s'il n'existe pas
      console.log(`📝 Création d'un nouvel utilisateur: ${email}`);
      const [result] = await pool.query(
        `INSERT INTO users(name, email, avatar, role, is_google_account) 
         VALUES (?, ?, ?, 'client', 1)`,
        [name, email, avatar]
      );
      
      const newUserId = result.insertId;
      
      // Récupérer le nouvel utilisateur créé
      const [newUserRows] = await pool.query("SELECT * FROM users WHERE id = ?", [newUserId]);
      user = newUserRows[0];
    } else {
      user = rows[0];
      console.log(`✅ Utilisateur existant trouvé: ${email}`);
      
      // Mettre à jour l'avatar et le statut Google si nécessaire
      if (user.is_google_account === 0 || user.avatar !== avatar) {
        await pool.query(
          "UPDATE users SET is_google_account = 1, avatar = ? WHERE id = ?",
          [avatar, user.id]
        );
        user.is_google_account = 1;
        user.avatar = avatar;
      }
    }

    // 4. Générer le token JWT
    const jwtToken = generateToken({ id: user.id, role: user.role });

    // 5. Charger le profil provider si nécessaire
    let providerProfile = null;
    if (user.role === "provider") {
      const [profile] = await pool.query(
        "SELECT * FROM provider_profiles WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      providerProfile = profile[0] || null;
    }

    console.log(`🎉 Login Google réussi pour: ${email}`);

    return res.json({
      success: true,
      message: "Login Google réussi",
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        is_google_account: user.is_google_account,
        provider_profile: providerProfile,
      },
    });

  } catch (error) {
    console.error("❌ Google Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur Google Login",
      error: error.message,
    });
  }
};
/* ----------------------- LOGOUT ----------------------- */
export const logout = async (req, res) => {
  return res.status(200).json({
    message: "Déconnexion réussie. Supprimez le token côté client."
  });
};
