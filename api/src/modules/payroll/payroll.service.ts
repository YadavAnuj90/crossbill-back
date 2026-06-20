import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalarySlip, SalarySlipDocument } from './schemas/salary-slip.schema';
import { PayrollRun, PayrollRunDocument } from './schemas/payroll-run.schema';
import { CreateSlipDto } from './dto/payroll.dto';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { AuditService } from '../audit/audit.service';

const paise = (s?: string | null) => Math.round(parseFloat(s || '0') * 100);
const rupees = (p: number) => (p / 100).toFixed(2);

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectModel(SalarySlip.name) private readonly slips: Model<SalarySlipDocument>,
    @InjectModel(PayrollRun.name) private readonly runs: Model<PayrollRunDocument>,
    private readonly employees: EmployeesService,
    private readonly orgs: OrganizationsService,
    private readonly pdf: PdfServiceClient,
    private readonly audit: AuditService,
  ) {}

  /** Compute gross / deductions / net from the components (integer paise → no float drift). */
  static compute(dto: Partial<CreateSlipDto>) {
    const grossP = paise(dto.basic) + paise(dto.hra) + paise(dto.bonus) + paise(dto.allowances);
    const dedP = paise(dto.pf) + paise(dto.esic) + paise(dto.tds) + paise(dto.otherDeductions);
    return { gross: rupees(grossP), totalDeductions: rupees(dedP), net: rupees(grossP - dedP) };
  }

  async createSlip(orgId: string, dto: CreateSlipDto) {
    const emp = await this.employees.findOneScoped(orgId, dto.employeeId);
    const totals = PayrollService.compute(dto);
    const fields = {
      orgId, employeeId: dto.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName ?? ''}`.trim(),
      empCode: emp.empCode, designation: emp.designation,
      month: dto.month,
      basic: dto.basic ?? '0.00', hra: dto.hra ?? '0.00', bonus: dto.bonus ?? '0.00', allowances: dto.allowances ?? '0.00',
      pf: dto.pf ?? '0.00', esic: dto.esic ?? '0.00', tds: dto.tds ?? '0.00', otherDeductions: dto.otherDeductions ?? '0.00',
      ...totals,
      status: 'draft' as const,
    };
    const slip = await this.slips.findOneAndUpdate(
      { orgId, employeeId: dto.employeeId, month: dto.month },
      { $set: fields },
      { new: true, upsert: true },
    ).exec();

    await this.generatePdf(orgId, slip);
    await this.audit.log({ action: 'salary_slip.created', orgId, resourceId: slip.id, meta: { employeeId: dto.employeeId, month: dto.month, net: totals.net } });
    return slip.toJSON();
  }

  private async generatePdf(orgId: string, slip: SalarySlipDocument) {
    try {
      const company = await this.orgs.getCompany(orgId).catch(() => null);
      const { url } = await this.pdf.generateSalarySlip({
        company: { name: company?.name ?? 'Company', logoUrl: company?.logoUrl ?? null, address: company?.registeredAddress ?? null },
        employeeName: slip.employeeName, empCode: slip.empCode, designation: slip.designation,
        month: slip.month,
        earnings: { basic: slip.basic, hra: slip.hra, bonus: slip.bonus, allowances: slip.allowances },
        deductions: { pf: slip.pf, esic: slip.esic, tds: slip.tds, other: slip.otherDeductions },
        gross: slip.gross, totalDeductions: slip.totalDeductions, net: slip.net,
        slipId: slip.id,
        generatedAt: new Date().toISOString(),
      });
      slip.pdfUrl = url;
      slip.generatedAt = new Date().toISOString();
      await slip.save();
    } catch (e: any) {
      this.logger.warn(`Slip PDF ${slip.id} deferred: ${e.message}`);
    }
  }

  listSlips(orgId: string, employeeId?: string, month?: string) {
    const filter: Record<string, any> = { orgId };
    if (employeeId) filter.employeeId = employeeId;
    if (month) filter.month = month;
    return this.slips.find(filter).sort({ month: -1, createdAt: -1 }).limit(500).exec().then((r) => r.map((s) => s.toJSON()));
  }

  async getSlip(orgId: string, id: string) {
    const s = await this.slips.findOne({ _id: id, orgId }).exec();
    if (!s) throw new NotFoundException('Salary slip not found');
    if (!s.pdfUrl) await this.generatePdf(orgId, s);
    return s.toJSON();
  }

  async removeSlip(orgId: string, id: string) {
    const res = await this.slips.deleteOne({ _id: id, orgId }).exec();
    if (!res.deletedCount) throw new NotFoundException('Salary slip not found');
    await this.audit.log({ action: 'salary_slip.deleted', orgId, resourceId: id });
    return { deleted: true };
  }

  // ─────────────────────────── Payroll runs ───────────────────────────
  async runPayroll(orgId: string, period: string) {
    const agg = await this.slips.aggregate([
      { $match: { orgId, month: period } },
      { $group: {
        _id: null,
        gross: { $sum: { $toDouble: '$gross' } },
        deductions: { $sum: { $toDouble: '$totalDeductions' } },
        net: { $sum: { $toDouble: '$net' } },
        count: { $sum: 1 },
      } },
    ]).exec();
    const a = agg[0] ?? { gross: 0, deductions: 0, net: 0, count: 0 };
    const run = await this.runs.findOneAndUpdate(
      { orgId, period },
      { $set: { gross: a.gross.toFixed(2), deductions: a.deductions.toFixed(2), net: a.net.toFixed(2), slipCount: a.count, status: 'draft' } },
      { new: true, upsert: true },
    ).exec();
    await this.audit.log({ action: 'payroll.run', orgId, resourceId: run.id, meta: { period, net: run.net } });
    return run.toJSON();
  }

  listRuns(orgId: string) {
    return this.runs.find({ orgId }).sort({ period: -1 }).exec().then((r) => r.map((x) => x.toJSON()));
  }

  async finaliseRun(orgId: string, period: string) {
    const run = await this.runs.findOneAndUpdate(
      { orgId, period },
      { $set: { status: 'finalised', finalisedAt: new Date().toISOString() } },
      { new: true },
    ).exec();
    if (!run) throw new NotFoundException('Run not found — generate it first');
    await this.slips.updateMany({ orgId, month: period }, { $set: { status: 'finalised' } }).exec();
    await this.audit.log({ action: 'payroll.finalised', orgId, resourceId: run.id, meta: { period } });
    return run.toJSON();
  }
}
