/**
 * Externalised compliance configuration (design §12).
 * These exact strings MUST be CA-signed before production.
 */
export const COMPLIANCE_CONFIG_VERSION = '2026-04-01';

export const EXPORT_DECLARATION_LUT =
  'Supply meant for export under LUT (Letter of Undertaking) without payment of ' +
  'Integrated Goods and Services Tax (IGST). LUT ARN: {{lutArn}}, FY: {{lutFy}}.';

export const EXPORT_DECLARATION_WITH_IGST =
  'Supply meant for export with payment of Integrated Goods and Services Tax (IGST), ' +
  'eligible for refund of IGST paid.';

export const PLACE_OF_SUPPLY_EXPORT = 'Outside India (export of services)';

export type FxRateBasis = 'RBI_REFERENCE' | 'CBIC_NOTIFIED';
export const DEFAULT_FX_RATE_BASIS: FxRateBasis = 'CBIC_NOTIFIED';

/** Render a declaration string with the profile's LUT details substituted in. */
export function renderDeclaration(opts: { onLut: boolean; lutArn?: string | null; lutFy?: string | null }): string {
  if (!opts.onLut) return EXPORT_DECLARATION_WITH_IGST;
  return EXPORT_DECLARATION_LUT
    .replace('{{lutArn}}', opts.lutArn ?? 'N/A')
    .replace('{{lutFy}}', opts.lutFy ?? 'N/A');
}
