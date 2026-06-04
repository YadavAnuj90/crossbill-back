import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Resend transactional/reminder email provider (design §6, §13).
 * Sends via Resend's REST API when RESEND_API_KEY is set; otherwise logs (dev mode).
 */
@Injectable()
export class ResendProvider {
  private readonly logger = new Logger(ResendProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(msg: EmailMessage): Promise<void> {
    const apiKey = this.config.get<string>('email.resendApiKey');
    const from = this.config.get<string>('email.from');
    if (!apiKey) {
      this.logger.warn(`[dev] would send email to ${msg.to}: "${msg.subject}"`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
    }
  }
}
