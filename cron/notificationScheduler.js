import cron from 'node-cron';
import { sendScheduledNotifications } from '../controllers/bookingController.js';

// Exécuter toutes les minutes pour vérifier les notifications à envoyer
export const startNotificationScheduler = () => {
  cron.schedule('* * * * *', async () => {
    console.log('Vérification des notifications programmées...');
    await sendScheduledNotifications();
  });
  
  console.log('✅ Planificateur de notifications démarré');
};