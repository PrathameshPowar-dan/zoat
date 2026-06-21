import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // VERCEL PRODUCTION: Read directly from the secure Environment Variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // LOCAL DEVELOPMENT: Read from the ignored JSON file
    const serviceAccountPath = join(process.cwd(), 'firebase-service-account.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
}

const app = initializeApp({
    credential: cert(serviceAccount),
});

export default app;