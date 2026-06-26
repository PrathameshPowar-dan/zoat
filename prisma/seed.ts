import prisma from '../src/utils/prisma.js';

async function main() {
    console.log('🧹 Clearing existing data...');
    // We clear data in reverse order of relations to prevent foreign key errors
    await prisma.menuItem.deleteMany();
    await prisma.order.deleteMany().catch(() => { });
    await prisma.restaurant.deleteMany();
    await prisma.category.deleteMany();
    await prisma.banner.deleteMany();

    console.log('🌱 Seeding Banners...');
    await prisma.banner.createMany({
        data: [
            { bannerName: 'veg-banner-1', imageUrl: 'https://res.cloudinary.com/dpyttzuvx/image/upload/v1782456012/WhatsApp_Image_2026-06-24_at_23.22.12_1_mzcup0.jpg' },
            { bannerName: 'non-veg-banner-1', imageUrl: 'https://res.cloudinary.com/dpyttzuvx/image/upload/v1782456013/WhatsApp_Image_2026-06-24_at_23.22.12_qesoun.jpg' }
        ]
    });

    console.log('🌱 Seeding Categories...');
    await prisma.category.createMany({
        data: [
            { name: 'American', imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80' },
            { name: 'Japanese', imageUrl: 'https://images.unsplash.com/photo-1580870058426-fa2020fc4561?auto=format&fit=crop&w=200&q=80' },
            { name: 'Italian', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80' },
            { name: 'Indian', imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&q=80' },
            { name: 'Desserts', imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=200&q=80' },
            { name: 'Healthy', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80' },
            { name: 'Beverages', imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=80' },
            { name: 'Fast Food', imageUrl: 'https://images.unsplash.com/photo-1526894198609-10b3cdf45c53?auto=format&fit=crop&w=200&q=80' },
        ]
    });

    console.log('🌱 Seeding Restaurants & Menu Items...');
    const adminId = 'dummy-admin-id';

    const restaurants = [
        {
            name: 'The Zoat Grand Eatery',
            address: '123 Main Street, Mumbai',
            lat: 19.0760, lng: 72.8777,
            openingHours: '10:00 AM - 11:00 PM',
            isPureVeg: false,
            costForTwo: 600,
            rating: 4.5,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            cuisines: ['American', 'Italian', 'Desserts'],
            menuItems: {
                create: [
                    { name: 'Classic Cheeseburger', price: 250, category: 'American', isVeg: false, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Truffle Fries', price: 150, category: 'American', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Pepperoni Pizza', price: 450, category: 'Italian', isVeg: false, imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        },
        {
            name: 'Bombay Spice & Curry',
            address: 'Andheri West, Mumbai',
            lat: 19.1136, lng: 72.8297,
            openingHours: '11:00 AM - 11:30 PM',
            isPureVeg: true,
            costForTwo: 400,
            rating: 4.8,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1517055748809-5c4be461f687?auto=format&fit=crop&w=800&q=80',
            cuisines: ['Indian', 'Healthy'],
            menuItems: {
                create: [
                    { name: 'Paneer Butter Masala', price: 280, category: 'Indian', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Garlic Naan', price: 60, category: 'Indian', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1605333314050-6e4693cbab78?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Dal Makhani', price: 220, category: 'Indian', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        },
        {
            name: 'Tokyo Drift Sushi',
            address: 'Bandra Kurla Complex, Mumbai',
            lat: 19.0616, lng: 72.8499,
            openingHours: '12:00 PM - 10:30 PM',
            isPureVeg: false,
            costForTwo: 1200,
            rating: 4.9,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
            cuisines: ['Japanese', 'Healthy'],
            menuItems: {
                create: [
                    { name: 'Salmon Maki Roll', price: 550, category: 'Japanese', isVeg: false, imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Spicy Tuna Sushi', price: 600, category: 'Japanese', isVeg: false, imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Vegetable Tempura', price: 350, category: 'Japanese', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1605809798544-71bcba983056?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        },
        {
            name: 'Green Bowl Salads',
            address: 'Colaba, Mumbai',
            lat: 18.9067, lng: 72.8147,
            openingHours: '08:00 AM - 09:00 PM',
            isPureVeg: true,
            costForTwo: 500,
            rating: 4.1,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
            cuisines: ['Healthy'],
            menuItems: {
                create: [
                    { name: 'Quinoa Avocado Salad', price: 320, category: 'Healthy', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Detox Green Juice', price: 150, category: 'Beverages', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        },
        {
            name: 'Luigi\'s Pizzeria',
            address: 'Juhu, Mumbai',
            lat: 19.1075, lng: 72.8263,
            openingHours: '11:00 AM - 12:00 AM',
            isPureVeg: false,
            costForTwo: 800,
            rating: 4.4,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
            cuisines: ['Italian', 'Fast Food'],
            menuItems: {
                create: [
                    { name: 'Margherita Pizza', price: 350, category: 'Italian', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=60' },
                    { name: 'BBQ Chicken Pizza', price: 500, category: 'Italian', isVeg: false, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Garlic Breadsticks', price: 180, category: 'Fast Food', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        },
        {
            name: 'Sugar Rush Desserts',
            address: 'Powai, Mumbai',
            lat: 19.1176, lng: 72.9060,
            openingHours: '12:00 PM - 02:00 AM',
            isPureVeg: true,
            costForTwo: 300,
            rating: 4.7,
            adminId,
            imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
            cuisines: ['Desserts', 'Beverages'],
            menuItems: {
                create: [
                    { name: 'Chocolate Lava Cake', price: 180, category: 'Desserts', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Strawberry Cheesecake', price: 220, category: 'Desserts', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=60' },
                    { name: 'Iced Caramel Macchiato', price: 160, category: 'Beverages', isVeg: true, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=500&q=60' },
                ]
            }
        }
    ];

    for (const restaurant of restaurants) {
        await prisma.restaurant.create({
            data: restaurant
        });
    }

    console.log('✅ Database seeded successfully with massive dataset!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });