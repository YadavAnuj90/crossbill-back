import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HrLetter, HrLetterDocument, LetterStatus } from './schemas/hr-letter.schema';
import { CreateLetterDto } from './dto/letter.dto';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { AuditService } from '../audit/audit.service';

/** Allowed status transitions for an HR letter. Same-status is treated as a no-op. */
const STATUS_TRANSITIONS: Record<LetterStatus, LetterStatus[]> = {
  draft: ['sent', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
};

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

  async create(orgId: string, userId: string, dto: CreateLetterDto) {
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
    await this.audit.log({ action: 'letter.created', orgId, userId, resourceId: doc.id, meta: { kind: dto.kind, employeeId: dto.employeeId } });
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

  list(orgId: string, kind?: string, employeeId?: string, status?: string) {
    const filter: Record<string, any> = { orgId };
    if (kind) filter.kind = kind;
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    return this.letters.find(filter).sort({ createdAt: -1 }).limit(500).exec().then((r) => r.map((l) => l.toJSON()));
  }

  async get(orgId: string, id: string) {
    const l = await this.letters.findOne({ _id: id, orgId }).exec();
    if (!l) throw new NotFoundException('Letter not found');
    if (!l.pdfUrl) await this.generatePdf(orgId, l);
    return l.toJSON();
  }

  async setStatus(orgId: string, userId: string, id: string, status: LetterStatus) {
    const l = await this.letters.findOne({ _id: id, orgId }).exec();
    if (!l) throw new NotFoundException('Letter not found');

    const from = l.status;
    if (from !== status) {
      if (!STATUS_TRANSITIONS[from]?.includes(status)) {
        throw new BadRequestException(`Invalid letter status transition: ${from} -> ${status}`);
      }
      if (status === 'sent' && !l.pdfUrl && !l.generatedAt) {
        throw new BadRequestException('Generate the letter PDF before sending.');
      }

      l.status = status;
      const now = new Date().toISOString();
      if (status === 'sent') l.sentAt = now;
      if (status === 'accepted' || status === 'rejected') l.decidedAt = now;
      await l.save();
      await this.audit.log({ action: 'letter.status_changed', orgId, userId, resourceId: id, meta: { from, to: status, kind: l.kind } });
    }
    return l.toJSON();
  }

  async remove(orgId: string, userId: string, id: string) {
    const l = await this.letters.findOne({ _id: id, orgId }).exec();
    if (!l) throw new NotFoundException('Letter not found');
    const kind = l.kind;
    await this.letters.deleteOne({ _id: id, orgId }).exec();
    await this.audit.log({ action: 'letter.removed', orgId, userId, resourceId: id, meta: { kind } });
    return { deleted: true };
  }
}
