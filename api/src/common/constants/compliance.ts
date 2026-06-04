/**
 * Externalised compliance configuration (design §12).
 * Declaration text, FX-rate basis, and SAC defaults live here as versioned config
 * so they can be changed WITHOUT a redeploy once moved to a config store/DB, and
 * every change is logged. These exact strings MUST be CA-signed before production.
 */
export const COMPLIANCE_CONFIG_VERSION = '2026-04-01';

/** Export under LUT, without payment of IGST (zero-rated). */
export const EXPORT_DECLARATION_LUT =
  'Supply meant for export under LUT (Letter of Undertaking) without payment of ' +
  'Integrated Goods and Services Tax (IGST). LUT ARN: {{lutArn}}, FY: {{lutFy}}.';

/** Fallback when the exporter is NOT on an LUT (export with payment of IGST). */
export const EXPORT_DECLARATION_WITH_IGST =
  'Supply meant for export with payment of Integrated Goods and Services Tax (IGST), ' +
  'eligible for refund of IGST paid.';

export const PLACE_OF_SUPPLY_EXPORT = 'Outside India (export of services)';

/** Basis used to convert invoice currency -> INR. Must be CA-confirmed (§12). */
export type FxRateBasis = 'RBI_REFERENCE' | 'CBIC_NOTIFIED';
export const DEFAULT_FX_RATE_BASIS: FxRateBasis = 'CBIC_NOTIFIED';

/** Render a declaration string with the profile's LUT details substituted in. */
export function renderDeclaration(opts: { onLut: boolean; lutArn?: string; lutFy?: string }): string {
  if (!opts.onLut) return EXPORT_DECLARATION_WITH_IGST;
  return EXPORT_DECLARATION_LUT
    .replace('{{lutArn}}', opts.lutArn ?? 'N/A')
    .replace('{{lutFy}}', opts.lutFy ?? 'N/A');
}
