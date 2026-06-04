/** Central typed configuration, loaded from environment (design §21). */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '3000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:3001',
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',

  database: { url: process.env.DATABASE_URL },
  mongo: { uri: process.env.MONGO_URI },
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh',
    accessTtl: parseInt(process.env.ACCESS_TOKEN_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.REFRESH_TOKEN_TTL ?? '2592000', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3000/api/v1/auth/google/callback',
  },

  pdfService: {
    url: process.env.PDF_SERVICE_URL ?? 'http://localhost:8000',
    internalToken: process.env.INTERNAL_SERVICE_TOKEN ?? 'dev-internal-token',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? 'Crossbill <no-reply@crossbill.app>',
  },
});

export type AppConfig = ReturnType<typeof import('./configuration').default>;
