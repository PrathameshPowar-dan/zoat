const base = 'http://localhost:3000';

const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const json = await response.json();
    if (!response.ok) {
        throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(json)}`);
    }

    return json;
};

const checks = [];
const addCheck = (test, ok, extra = {}) => checks.push({ test, ok, ...extra });

try {
    const list = await request('/api/restaurants/dine-in/list');
    addCheck('GET /dine-in/list', list.success === true && Array.isArray(list.data) && list.data.length > 0, {
        count: Array.isArray(list.data) ? list.data.length : 0
    });

    const slotTime = new Date();
    slotTime.setUTCDate(slotTime.getUTCDate() + 1);
    slotTime.setUTCHours(20, 0, 0, 0);
    const bookingDateTime = slotTime.toISOString();

    const filtered = await request(`/api/restaurants/dine-in/list?partySize=2&bookingDateTime=${encodeURIComponent(bookingDateTime)}`);
    const hasAvailabilityFields = Array.isArray(filtered.data) && filtered.data.length > 0
        ? (Object.prototype.hasOwnProperty.call(filtered.data[0], 'bookedSeats') && Object.prototype.hasOwnProperty.call(filtered.data[0], 'availableSeats'))
        : false;

    addCheck('GET /dine-in/list with filters', filtered.success === true && hasAvailabilityFields, { bookingDateTime });

    const identifier = `apitest_${Date.now()}@example.com`;

    const sendOtp = await request('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier })
    });

    const verifyOtp = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier, otp: sendOtp.data.otp })
    });

    const completeProfile = await request('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
            profileToken: verifyOtp.data.profileToken,
            name: 'API Test User',
            gender: 'MALE',
            dateOfBirth: '1999-01-01',
            preferredLanguage: 'en',
            preferredCuisines: ['Indian', 'Italian']
        })
    });

    const token = completeProfile.data.token;
    addCheck('Auth flow token', typeof token === 'string' && token.length > 20);

    const restaurantId = list.data[0].id;

    const createBooking = await request('/api/restaurants/dine-in/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            restaurantId,
            bookingDateTime,
            partySize: 2,
            specialRequest: 'Window seat if available'
        })
    });

    addCheck('POST /dine-in/bookings', createBooking.success === true && createBooking.data.restaurantId === restaurantId, {
        bookingId: createBooking.data.id
    });

    const myBookings = await request('/api/restaurants/dine-in/bookings/me', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const found = Array.isArray(myBookings.data) && myBookings.data.some((b) => b.id === createBooking.data.id);
    addCheck('GET /dine-in/bookings/me', myBookings.success === true && found, {
        totalBookings: Array.isArray(myBookings.data) ? myBookings.data.length : 0
    });

    const allPassed = checks.every((c) => c.ok);
    console.log(JSON.stringify({ allPassed, checks }, null, 2));
    process.exit(allPassed ? 0 : 1);
} catch (error) {
    console.error(JSON.stringify({ allPassed: false, error: String(error), checks }, null, 2));
    process.exit(1);
}
