import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the JSON file securely
const serviceAccountPath = join(process.cwd(), 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
    credential: cert(serviceAccount),
});

export default app;