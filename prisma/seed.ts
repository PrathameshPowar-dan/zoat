import prisma from '../src/utils/prisma.js';

async function main() {
    console.log('🌱 Adding new restaurants to the existing database...');
    
    // We will use a generic adminId, or you can replace this with a real user's ID
    const adminId = 'dummy-admin-id';

    const newRestaurants = [
        // -------------------------------------------------------------------
        // NAGPUR RESTAURANT 
        // -------------------------------------------------------------------
        {
            id: "1ec46a25-dd1a-4f82-8fe6-eac53d0acf95",
            name: "Haldiram's Thaat Baat (Nagpur)",
            address: "Sitabuldi Main Road, Nagpur, Maharashtra 440022",
            lat: 21.1458, lng: 79.0882,
            openingHours: "10:00 AM - 11:00 PM",
            isPureVeg: true,
            costForTwo: 600,
            rating: 4.6,
            supportsDineIn: true,
            dineInCapacity: 50,
            adminId,
            imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            cuisines: ["Indian", "Desserts", "Fast Food"],
            menuItems: {
                create: [
                    { name: "Raj Kachori", price: 120, category: "Fast Food", isVeg: true, isFeatured: true, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                    { name: "Chole Bhature", price: 180, category: "Indian", isVeg: true, isFeatured: true, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                    { name: "Orange Rasgulla", price: 90, category: "Desserts", isVeg: true, isFeatured: true, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                ]
            }
        },
        // -------------------------------------------------------------------
        // BHANDARA RESTAURANT
        // -------------------------------------------------------------------
        {
            id: "f67e6dc3-8e8d-4a53-b7a5-6ce0800fb84f",
            name: "Bhandara Family Dhaba (Bhandara)",
            address: "NH 53, Main Highway, Bhandara, Maharashtra 441904",
            lat: 21.1777, lng: 79.6583,
            openingHours: "11:00 AM - 11:30 PM",
            isPureVeg: false,
            costForTwo: 400,
            rating: 4.2,
            supportsDineIn: true,
            dineInCapacity: 80,
            adminId,
            imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            cuisines: ["Indian"],
            menuItems: {
                create: [
                    { name: "Saoji Mutton Curry", price: 350, category: "Indian", isVeg: false, isFeatured: true, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                    { name: "Chicken Dum Biryani", price: 280, category: "Indian", isVeg: false, isFeatured: true, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                    { name: "Butter Naan", price: 45, category: "Indian", isVeg: true, isFeatured: false, imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80" },
                ]
            }
        }
    ];

    for (const restaurant of newRestaurants) {
        // We use upsert so if you run this script twice by accident, 
        // it won't crash trying to create the same ID again!
        await prisma.restaurant.upsert({
            where: { id: restaurant.id },
            update: {}, // Do nothing if it already exists
            create: restaurant
        });
    }

    console.log('✅ New restaurants added safely without deleting existing data!');
}

main()
    .catch((e) => {
        console.error('❌ Addition failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });