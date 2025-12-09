import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,      // smtp-relay.brevo.com
  port: process.env.MAIL_PORT,      // 587
  secure: false,                    // TLS
  auth: {
    user: process.env.MAIL_USER,    // ton email brevo
    pass: process.env.MAIL_PASS,    // clé SMTP brevo
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Vérifie la connexion SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur transporteur mail:", error);
  } else {
    console.log("Serveur SMTP Brevo opérationnel ✔️");
  }
});

export const sendEmail = (to, subject, htmlContent) => {
  return transporter.sendMail({
    from: `"Bconnect" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
  });
};