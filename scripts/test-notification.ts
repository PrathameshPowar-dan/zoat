import '../src/config/firebase.js';
import prisma from '../src/utils/prisma.js';
import notificationService from '../src/services/notification/notification.service.js';

async function main() {
    console.log('🧪 Starting End-to-End Notification Test...\n');

    // 1. Find a test user (Let's use the 'Dan' user you seeded earlier)
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No users found in the database. Run seed first.');
        return;
    }
    console.log(`👤 Found Test User: ${user.name || user.id}`);

    // 2. Simulate the Frontend App Launch
    console.log(`📱 Simulating React Native App Launch...`);
    const dummyToken = `test_dummy_token_node_${Date.now()}`;
    await prisma.user.update({
        where: { id: user.id },
        data: { fcmToken: dummyToken }
    });
    console.log(`✅ FCM Token successfully updated in database to: ${dummyToken}\n`);

    // 3. Simulate an Order Event (Triggering the Push Notification)
    console.log(`🚀 Firing Push Notification via Google Firebase...`);
    
    // We expect this to print an error about an "invalid token" in the console, 
    // which is exactly what we want! It proves Firebase was successfully contacted.
    await notificationService.sendOrderStatusNotification(
        user.id,
        "Order Accepted! 👨‍🍳",
        "Your favorite restaurant is preparing your food.",
        dummyToken
    );

    // 4. Verify the Database History (The Notification Center)
    console.log(`\n🔍 Checking PostgreSQL for saved notification history...`);
    const savedNotifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (savedNotifications.length > 0) {
        console.log(`✅ Notification successfully saved to Database!`);
        console.log(`   Title: ${savedNotifications[0].title}`);
        console.log(`   Body:  ${savedNotifications[0].body}`);
        console.log(`   Read Status: ${savedNotifications[0].isRead ? 'Read' : 'Unread'}`);
    } else {
        console.error(`❌ Failed to save notification to the database.`);
    }

    console.log('\n🎉 Test Complete!');
}

main()
    .catch((e) => {
        console.error('❌ Test failed with error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });