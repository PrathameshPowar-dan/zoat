import '../../config/firebase.js';
import { getMessaging } from 'firebase-admin/messaging';
import prisma from '../../utils/prisma.js';

class NotificationService {
    async sendOrderStatusNotification(
        userId: string, 
        title: string, 
        body: string, 
        fcmToken?: string | null
    ) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    isRead: false
                }
            });

            if (fcmToken) {
                await getMessaging().send({
                    token: fcmToken,
                    notification: {
                        title: title,
                        body: body,
                    },
                    data: {
                        type: 'ORDER_UPDATE'
                    }
                });
                console.log(`📲 Push notification successfully sent to user: ${userId}`);
            }
        } catch (error) {
            console.error(`❌ Failed to send push notification to user ${userId}:`, error);
        }
    }
}

export default new NotificationService();