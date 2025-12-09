import Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Bconnect", email: process.env.MAIL_FROM };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email envoyé !");
  } catch (err) {
    console.error("Erreur envoi email:", err);
  }
};