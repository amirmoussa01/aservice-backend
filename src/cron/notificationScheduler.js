import cron from 'node-cron';
import { sendScheduledNotifications } from '../controllers/booking.controller.js';  // ✅ UN SEUL ../

// Exécuter toutes les minutes pour vérifier les notifications à envoyer
export const startNotificationScheduler = () => {
  cron.schedule('* * * * *', async () => {
    console.log('🔔 Vérification des notifications programmées...');
    const result = await sendScheduledNotifications();
    
    if (result.success && result.count > 0) {
      console.log(`✅ ${result.count} notification(s) envoyée(s)`);
    }
  });
  
  console.log('✅ Planificateur de notifications démarré');
};