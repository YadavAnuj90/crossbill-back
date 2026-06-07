/** BullMQ queue + job names (design §13). */
export const QUEUES = {
  PDF: 'pdf',
  EMAIL: 'email',
  REMINDERS: 'reminders',
} as const;

export const JOBS = {
  GENERATE_PDF: 'generate-pdf',
  GSTR_EXPORT: 'gstr-export',
  FEMA_AGING: 'fema-aging',
  LUT_RENEWAL: 'lut-renewal',
  SEND_EMAIL: 'send-email',
  FEMA_SWEEP: 'fema-sweep',
  LUT_SWEEP: 'lut-sweep',
} as const;
