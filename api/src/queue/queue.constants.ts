/** BullMQ queue + job names (design §13). */
export const QUEUES = {
  PDF: 'pdf',
  EMAIL: 'email',
} as const;

export const JOBS = {
  GENERATE_PDF: 'generate-pdf',
  GSTR_EXPORT: 'gstr-export',
  FEMA_AGING: 'fema-aging',
  LUT_RENEWAL: 'lut-renewal',
  SEND_EMAIL: 'send-email',
} as const;
