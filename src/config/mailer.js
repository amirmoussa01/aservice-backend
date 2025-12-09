import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // Mot de passe d'application Gmail
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur transporteur mail:", error);
  } else {
    console.log("Serveur SMTP OK pour envoyer des mails");
  }
});

export const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Bconnect" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};