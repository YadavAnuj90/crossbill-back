import { financialYearOf } from '../../common/constants/financial-year';

/**
 * Auth flows (register, login, refresh rotation, reuse detection) are covered by e2e tests
 * (design §19) since they span Argon2 + JWT + the refresh-token repository. This unit file is
 * a placeholder per the design §15 layout; expand with mocked repos as the suite grows.
 */
describe('AuthService (placeholder)', () => {
  it('test harness wiring sanity check', () => {
    expect(financialYearOf(new Date('2026-05-01T00:00:00Z'))).toBe('2026-27');
  });
});
