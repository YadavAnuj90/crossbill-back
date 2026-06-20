import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Scaffolding for Aadhaar eSign / DSC via a GSP/ASP provider (Digio, Protean, SignDesk) and
 * digital eStamping. Stays inert until credentials are supplied; the native e-signature flow
 * works without it. When configured, `initiateAadhaarEsign` will hand off to the provider.
 */
@Injectable()
export class EsignProviderClient {
  private readonly logger = new Logger(EsignProviderClient.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly estampKey: string;

  constructor(config: ConfigService) {
    this.provider = config.get<string>('esign.provider') ?? '';
    this.apiKey = config.get<string>('esign.apiKey') ?? '';
    this.apiSecret = config.get<string>('esign.apiSecret') ?? '';
    this.estampKey = config.get<string>('estamp.apiKey') ?? '';
  }

  aadhaarConfigured(): boolean { return Boolean(this.provider && this.apiKey && this.apiSecret); }
  estampConfigured(): boolean { return Boolean(this.estampKey); }

  status() {
    return {
      aadhaarEsign: this.aadhaarConfigured(),
      eStamp: this.estampConfigured(),
      provider: this.provider || null,
    };
  }

  /** Placeholder for the provider hand-off (returns a redirect URL when wired). */
  async initiateAadhaarEsign(_payload: Record<string, unknown>): Promise<{ redirectUrl: string; requestId: string }> {
    if (!this.aadhaarConfigured()) {
      throw new HttpException('Aadhaar eSign is not configured. Add ESIGN_PROVIDER, ESIGN_API_KEY and ESIGN_API_SECRET to enable it.', 503);
    }
    // Provider-specific REST call goes here once a GSP/ASP account is connected.
    throw new HttpException(`eSign provider "${this.provider}" integration is not yet wired in this build.`, 501);
  }
}
