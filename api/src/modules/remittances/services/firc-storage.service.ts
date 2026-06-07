import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
}

/**
 * Stores FIRC/e-FIRA uploads on local disk (design §15, §17). Files live OUTSIDE the web root
 * and are served only through a scoped, authenticated download route. In production this is an
 * S3-compatible object store with signed URLs; the interface stays identical.
 */
@Injectable()
export class FircStorageService {
  private readonly logger = new Logger(FircStorageService.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = resolve(process.env.STORAGE_DIR ?? config.get('storageDir') ?? './storage');
  }

  async save(orgId: string, remittanceId: string, filename: string, data: Buffer): Promise<StoredFile> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const key = join('firc', orgId, remittanceId, safeName);
    const full = join(this.baseDir, key);
    await fs.mkdir(join(this.baseDir, 'firc', orgId, remittanceId), { recursive: true });
    await fs.writeFile(full, data);
    return {
      storageKey: key,
      sizeBytes: data.length,
      checksumSha256: createHash('sha256').update(data).digest('hex'),
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(join(this.baseDir, storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    try { await fs.unlink(join(this.baseDir, storageKey)); }
    catch (e: any) { this.logger.warn(`Could not delete ${storageKey}: ${e.message}`); }
  }
}
