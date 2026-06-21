import prisma from '../src/utils/prisma.js';

import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Create a Sample Restaurant
    const restaurant = await prisma.restaurant.create({
        data: {
            name: 'The Zoat Grand Eatery',
            address: '123 Main Street, Mumbai',
            lat: 19.0760,
            lng: 72.8777,     
            openingHours: '10:00 AM - 11:00 PM',
            isPureVeg: false,
            costForTwo: 600,
            cuisines: ['American', 'Italian', 'Japanese', 'Desserts'],
            imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            adminId: 'dummy-admin-id', 
            rating: 4.5,
        },
    });

    console.log(`✅ Created Restaurant: ${restaurant.name}`);

    // 2. Read and parse your response.json file
    const dataPath = join(process.cwd(), 'response.json');
    const rawData = readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // Your JSON structure has the items inside a "data" array
    const menuData = jsonData.data;

    // 3. Map the JSON data to match our Prisma schema
    const menuItemsToInsert = menuData.map((item: any) => ({
        restaurantId: restaurant.id,
        name: item.name,
        price: item.price,
        category: item.category,
        imageUrl: item.image, // Map 'image' from JSON to 'imageUrl' in Prisma
        isVeg: item.category === 'Desserts' ? false : true, // Mockup logic for veg/non-veg
        isAvailable: true
    }));

    // 4. Bulk insert the Menu Items
    const insertedItems = await prisma.menuItem.createMany({
        data: menuItemsToInsert,
    });

    console.log(`✅ Successfully seeded ${insertedItems.count} menu items!`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });