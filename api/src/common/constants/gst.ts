/**
 * Domestic GST tax engine (CGST+SGST vs IGST). Intra-state supply (supplier & client in the
 * same state) attracts CGST + SGST (rate split in half); inter-state attracts IGST (full rate).
 * Exports are zero-rated and handled separately (LUT / §12).
 */
export type GstTaxType = 'LUT_ZERO' | 'IGST' | 'CGST_SGST';
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export const DEFAULT_GST_RATE = 18;

export interface GstLineInput { lineTotalCents: number; gstRate: number; }

export interface GstResult {
  taxType: GstTaxType;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  taxTotalCents: number;
  grandTotalCents: number; // taxable + tax
}

/**
 * @param supplierState 2-digit GST state code of the exporter/seller
 * @param clientState   2-digit GST state code of the buyer (place of supply)
 */
export function computeGst(
  subtotalCents: number,
  lines: GstLineInput[],
  supplierState: string,
  clientState: string,
): GstResult {
  const intra = supplierState === clientState;
  let taxCents = 0;
  for (const l of lines) taxCents += Math.round((l.lineTotalCents * l.gstRate) / 100);

  if (intra) {
    const half = Math.round(taxCents / 2);
    return {
      taxType: 'CGST_SGST',
      cgstCents: half,
      sgstCents: taxCents - half,
      igstCents: 0,
      taxTotalCents: taxCents,
      grandTotalCents: subtotalCents + taxCents,
    };
  }
  return {
    taxType: 'IGST',
    cgstCents: 0,
    sgstCents: 0,
    igstCents: taxCents,
    taxTotalCents: taxCents,
    grandTotalCents: subtotalCents + taxCents,
  };
}

export const DOMESTIC_TAX_NOTE =
  'Tax invoice issued under the CGST Act, 2017. This is a domestic supply of services within India.';
