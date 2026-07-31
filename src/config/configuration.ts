export interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  documents: {
    storagePath: string;
  };
  photos: {
    storagePath: string;
  };
  fcm: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  brevo: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'eikpet',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'eikpet',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  documents: {
    storagePath: process.env.DOCUMENTS_STORAGE_PATH ?? './storage/documents',
  },
  photos: {
    storagePath: process.env.PHOTOS_STORAGE_PATH ?? './storage/photos',
  },
  fcm: {
    projectId: process.env.FCM_PROJECT_ID ?? '',
    clientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
    privateKey: (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? 'no-reply@eikpet.fr',
    senderName: process.env.BREVO_SENDER_NAME ?? 'EikPet',
  },
});
