/**
 * RBI Balance-of-Payments purpose codes commonly used for IT/software service exports.
 * The applicable code must be confirmed with the user's bank/CA (design §12).
 */
export interface PurposeCode { code: string; description: string; }

export const PURPOSE_CODES: PurposeCode[] = [
  { code: 'P0802', description: 'Software consultancy / implementation / supply' },
  { code: 'P0801', description: 'Telecommunication & computer services' },
  { code: 'P0803', description: 'Information / data / news-related services' },
  { code: 'P0806', description: 'Business & management consultancy' },
  { code: 'P0807', description: 'Advertising, market research & polling' },
  { code: 'P0808', description: 'Research & development services' },
  { code: 'P0809', description: 'Architectural, engineering & technical services' },
  { code: 'P0902', description: 'Other technical, trade-related & business services' },
];

export const DEFAULT_PURPOSE_CODE = 'P0802';
export const VALID_PURPOSE_CODES = new Set(PURPOSE_CODES.map((p) => p.code));
