import prisma from '../src/utils/prisma.js';

import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Create a Sample Restaurant
    // const restaurant = await prisma.restaurant.create({
    //     data: {
    //         name: 'The Chinese Eatery',
    //         address: '0503 Sanskriti Street, Bandra West, Mumbai, Maharashtra, India',
    //         lat: 18.0760,
    //         lng: 71.8777,     
    //         openingHours: '11:00 AM - 02:00 AM, 05:00 PM - 11:00 PM',
    //         isPureVeg: false,
    //         costForTwo: 900,
    //         cuisines: ['American', 'Italian', 'Japanese', 'Desserts', 'Chinese', 'Indian'],
    //         imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    //         adminId: 'dummy-admin-id', 
    //         rating: 4.9,
    //     },
    // });

    // console.log(`✅ Created Restaurant: ${restaurant.name}`);

    // 2. Read and parse your response.json file
    // const dataPath = join(process.cwd(), 'response.json');
    // const rawData = readFileSync(dataPath, 'utf8');
    // const jsonData = JSON.parse(rawData);

    // // Your JSON structure has the items inside a "data" array
    // const menuData = jsonData.data;

    // // 3. Map the JSON data to match our Prisma schema
    // const menuItemsToInsert = menuData.map((item: any) => ({
    //     restaurantId: restaurant.id,
    //     name: item.name,
    //     price: item.price,
    //     category: item.category,
    //     imageUrl: item.image, // Map 'image' from JSON to 'imageUrl' in Prisma
    //     isVeg: item.category === 'Desserts' ? false : true, // Mockup logic for veg/non-veg
    //     isAvailable: true
    // }));

    // // 4. Bulk insert the Menu Items
    // const insertedItems = await prisma.menuItem.createMany({
    //     data: menuItemsToInsert,
    // });

    // console.log(`✅ Successfully seeded ${insertedItems.count} menu items!`);

    const banner = await prisma.banner.create({
        data: { imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80' }
    });

    // const categories = await prisma.category.createMany({
    //     data: [
    //         { name: 'American', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80' },
    //         { name: 'Japanese', imageUrl: 'https://images.unsplash.com/photo-1580870058426-fa2020fc4561?auto=format&fit=crop&w=200&q=80' },
    //         { name: 'Desserts', imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=200&q=80' },
    //     ]
    // });
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });