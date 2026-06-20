/**
 * Pluggable Aadhaar verification provider. The platform ships with a Sandbox
 * implementation (works out-of-the-box for dev/demo); a UIDAI-licensed ASA/KUA
 * provider (Digio / Protean / SignDesk) is selected via config when keys are present.
 *
 * Compliance: implementations MUST NOT persist the full Aadhaar number or the OTP.
 * Only a masked last-4 + provider reference id are stored.
 */
export interface AadhaarProvider {
  readonly name: string;
  readonly sandbox: boolean;

  /** Send an OTP to the Aadhaar-linked mobile. `devOtp` is only returned by the sandbox. */
  initiate(aadhaar: string): Promise<{ referenceId: string; devOtp?: string }>;

  /** Verify the OTP for a previously initiated reference. */
  verify(referenceId: string, otp: string): Promise<{ ok: boolean; last4?: string; name?: string }>;
}

export const AADHAAR_PROVIDER = 'AADHAAR_PROVIDER';
