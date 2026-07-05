import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const base = 'http://localhost:3000';

const request = async (path, options = {}) => {
    const mergedHeaders = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const response = await fetch(`${base}${path}`, {
        ...options,
        headers: mergedHeaders
    });

    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        throw new Error(`${options.method || 'GET'} ${path} returned non-JSON (${response.status}): ${text.slice(0, 180)}`);
    }

    if (!response.ok) {
        throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
    }

    return json;
};

const checks = [];
const addCheck = (test, ok, extra = {}) => checks.push({ test, ok, ...extra });

try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing in env');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing in env');

    const list = await request('/api/restaurants/dine-in/list');
    addCheck('GET /api/restaurants/dine-in/list', list.success === true && Array.isArray(list.data) && list.data.length > 0, {
        count: Array.isArray(list.data) ? list.data.length : 0
    });

    const slot = new Date();
    slot.setUTCDate(slot.getUTCDate() + 1);
    slot.setUTCHours(20, 0, 0, 0);
    const bookingDateTime = slot.toISOString();

    const filtered = await request(`/api/restaurants/dine-in/list?partySize=2&bookingDateTime=${encodeURIComponent(bookingDateTime)}`);
    const hasAvailability = Array.isArray(filtered.data) && filtered.data.length > 0
        ? ('bookedSeats' in filtered.data[0] && 'availableSeats' in filtered.data[0])
        : false;
    addCheck('GET /api/restaurants/dine-in/list with filters', filtered.success === true && hasAvailability);

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const userResult = await pool.query('SELECT id, role FROM "User" ORDER BY "createdAt" ASC LIMIT 1');
    await pool.end();

    if (userResult.rowCount === 0) {
        throw new Error('No user exists in DB to test protected endpoints. Create one user first.');
    }

    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role || 'CUSTOMER' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const restaurantId = list.data[0].id;
    const booking = await request('/api/restaurants/dine-in/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            restaurantId,
            bookingDateTime,
            partySize: 2,
            specialRequest: 'Automated API check'
        })
    });

    addCheck('POST /api/restaurants/dine-in/bookings', booking.success === true && booking.data.restaurantId === restaurantId, {
        bookingId: booking.data.id
    });

    const myBookings = await request('/api/restaurants/dine-in/bookings/me', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const found = Array.isArray(myBookings.data) && myBookings.data.some((b) => b.id === booking.data.id);
    addCheck('GET /api/restaurants/dine-in/bookings/me', myBookings.success === true && found, {
        total: Array.isArray(myBookings.data) ? myBookings.data.length : 0
    });

    const allPassed = checks.every((c) => c.ok);
    console.log(JSON.stringify({ allPassed, checks }, null, 2));
    process.exit(allPassed ? 0 : 1);
} catch (error) {
    console.error(JSON.stringify({ allPassed: false, checks, error: String(error) }, null, 2));
    process.exit(1);
}
