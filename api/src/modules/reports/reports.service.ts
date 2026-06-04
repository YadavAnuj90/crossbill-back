import { Injectable } from '@nestjs/common';
import { PdfServiceClient } from './clients/pdf-service.client';
import { GstrExportDto } from './dto/gstr-export.dto';

/**
 * GSTR-1 Table 6A export (design §5, §12). Delegates assembly to the Python service.
 * The 6A format must match the GST offline tool template and be CA-signed before production.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly pdfClient: PdfServiceClient) {}

  async gstr6a(orgId: string, dto: GstrExportDto): Promise<{ url: string }> {
    return this.pdfClient.generateGstr({ orgId, financialYear: dto.financialYear });
  }
}
