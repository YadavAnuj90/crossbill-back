/** Central typed configuration, loaded from environment (design §21). */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '4000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:3001',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',

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
      process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/v1/auth/google/callback',
  },

  storageDir: process.env.STORAGE_DIR ?? './storage',

  pdfService: {
    url: process.env.PDF_SERVICE_URL ?? 'http://localhost:8000',
    internalToken: process.env.INTERNAL_SERVICE_TOKEN ?? 'dev-internal-token',
  },

  esign: {
    provider: process.env.ESIGN_PROVIDER ?? '',
    apiKey: process.env.ESIGN_API_KEY ?? '',
    apiSecret: process.env.ESIGN_API_SECRET ?? '',
  },
  estamp: {
    apiKey: process.env.ESTAMP_API_KEY ?? '',
  },
  einvoicing: {
    // Provider for GST IRN registration. Empty/`sandbox` → built-in sandbox provider.
    // Set to a licensed GSP (e.g. 'mastergst', 'cleartax', 'irp') once credentials exist.
    provider: process.env.EINVOICE_PROVIDER ?? 'sandbox',
    apiBaseUrl: process.env.EINVOICE_API_BASE_URL ?? '',
    apiUser: process.env.EINVOICE_API_USER ?? '',
    apiPassword: process.env.EINVOICE_API_PASSWORD ?? '',
    gstin: process.env.EINVOICE_GSTIN ?? '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? 'Crossbill <no-reply@crossbill.app>',
  },
});
