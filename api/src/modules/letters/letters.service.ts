import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HrLetter, HrLetterDocument } from './schemas/hr-letter.schema';
import { CreateLetterDto } from './dto/letter.dto';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LettersService {
  private readonly logger = new Logger(LettersService.name);

  constructor(
    @InjectModel(HrLetter.name) private readonly letters: Model<HrLetterDocument>,
    private readonly employees: EmployeesService,
    private readonly orgs: OrganizationsService,
    private readonly pdf: PdfServiceClient,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, dto: CreateLetterDto) {
    const emp = await this.employees.findOneScoped(orgId, dto.employeeId);
    const name = `${emp.firstName} ${emp.lastName ?? ''}`.trim();
    const doc = await this.letters.create({
      orgId, employeeId: dto.employeeId, employeeName: name, kind: dto.kind as any, status: 'draft',
      designation: dto.designation ?? emp.designation ?? null,
      department: dto.department ?? emp.department ?? null,
      joiningDate: dto.joiningDate ?? emp.joiningDate ?? null,
      ctc: dto.ctc ?? (emp.ctcAnnual && emp.ctcAnnual !== '0.00' ? emp.ctcAnnual : null),
      reportingManager: dto.reportingManager ?? emp.reportingManager ?? null,
      fromDate: dto.fromDate ?? emp.joiningDate ?? null,
      toDate: dto.toDate ?? null,
    });
    await this.generatePdf(orgId, doc);
    await this.audit.log({ action: 'letter.created', orgId, resourceId: doc.id, meta: { kind: dto.kind, employeeId: dto.employeeId } });
    return doc.toJSON();
  }

  private async generatePdf(orgId: string, letter: HrLetterDocument) {
    try {
      const company = await this.orgs.getCompany(orgId).catch(() => null);
      const { url } = await this.pdf.generateLetter({
        kind: letter.kind,
        company: { name: company?.name ?? 'Company', logoUrl: company?.logoUrl ?? null, address: company?.registeredAddress ?? null },
        employeeName: letter.employeeName,
        designation: letter.designation, department: letter.department,
        joiningDate: letter.joiningDate, ctc: letter.ctc, reportingManager: letter.reportingManager,
        fromDate: letter.fromDate, toDate: letter.toDate,
        signatory: company?.ownerName ?? null,
        letterId: letter.id,
        issuedAt: new Date().toISOString(),
      });
      letter.pdfUrl = url;
      letter.generatedAt = new Date().toISOString();
      await letter.save();
    } catch (e: any) {
      this.logger.warn(`Letter PDF ${letter.id} deferred: ${e.message}`);
    }
  }

  list(orgId: string, kind?: string, employeeId?: string) {
    const filter: Record<string, any> = { orgId };
    if (kind) filter.kind = kind;
    if (employeeId) filter.employeeId = employeeId;
    return this.letters.find(filter).sort({ createdAt: -1 }).limit(500).exec().then((r) => r.map((l) => l.toJSON()));
  }

  async get(orgId: string, id: string) {
    const l = await this.letters.findOne({ _id: id, orgId }).exec();
    if (!l) throw new NotFoundException('Letter not found');
    if (!l.pdfUrl) await this.generatePdf(orgId, l);
    return l.toJSON();
  }

  async setStatus(orgId: string, id: string, status: 'sent' | 'accepted' | 'rejected' | 'expired') {
    const l = await this.letters.findOne({ _id: id, orgId }).exec();
    if (!l) throw new NotFoundException('Letter not found');
    l.status = status;
    if (status === 'sent') l.sentAt = new Date().toISOString();
    if (status === 'accepted' || status === 'rejected') l.decidedAt = new Date().toISOString();
    await l.save();
    await this.audit.log({ action: `letter.${status}`, orgId, resourceId: id });
    return l.toJSON();
  }

  async remove(orgId: string, id: string) {
    const res = await this.letters.deleteOne({ _id: id, orgId }).exec();
    if (!res.deletedCount) throw new NotFoundException('Letter not found');
    await this.audit.log({ action: 'letter.deleted', orgId, resourceId: id });
    return { deleted: true };
  }
}
