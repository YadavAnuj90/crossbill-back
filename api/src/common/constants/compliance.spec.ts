import { renderDeclaration, EXPORT_DECLARATION_WITH_IGST } from './compliance';

describe('renderDeclaration', () => {
  it('uses the LUT declaration and substitutes ARN/FY when on LUT', () => {
    const text = renderDeclaration({ onLut: true, lutArn: 'AD0123', lutFy: '2026-27' });
    expect(text).toContain('without payment of');
    expect(text).toContain('AD0123');
    expect(text).toContain('2026-27');
  });
  it('falls back to the with-IGST declaration when not on LUT', () => {
    expect(renderDeclaration({ onLut: false })).toBe(EXPORT_DECLARATION_WITH_IGST);
  });
});
