/**
 * Common SAC (Services Accounting Code) values for IT / software export services.
 * Defaults are per business profile and overridable per invoice item (design §12).
 * NOTE: confirm the exact applicable codes with a CA before production.
 */
export interface SacCode {
  code: string;
  description: string;
}

export const SAC_CODES: SacCode[] = [
  { code: '998313', description: 'Information technology (IT) consulting and support services' },
  { code: '998314', description: 'IT design and development services' },
  { code: '998315', description: 'Hosting and IT infrastructure provisioning services' },
  { code: '998316', description: 'IT infrastructure and network management services' },
  { code: '998319', description: 'Other IT services n.e.c.' },
  { code: '998361', description: 'Advertising services' },
  { code: '998391', description: 'Specialty design services (incl. graphic/UX design)' },
  { code: '998399', description: 'Other professional, technical and business services n.e.c.' },
];

export const DEFAULT_SAC = '998314';
export const VALID_SAC_CODES = new Set(SAC_CODES.map((s) => s.code));
