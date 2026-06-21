import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the JSON file securely
const serviceAccountPath = join(process.env.FIREBASE_SERVICE_ACCOUNT_PATH as string, 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;