import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur (ex: Gmail, SendGrid, etc.)
// Remplacer avec vos propres informations de service SMTP
const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE || 'gmail', // Ex: 'gmail'
  auth: {
    user: process.env.MAIL_USER, // Votre adresse email
    pass: process.env.MAIL_PASS, // Votre mot de passe/clé d'application
  },
  // Si vous utilisez Gmail, vous devrez peut-être activer l'accès aux applications moins sécurisées ou utiliser des mots de passe d'application.
});

// Fonction pour envoyer un email
export const sendEmail = (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};
