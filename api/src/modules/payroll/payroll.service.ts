import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalarySlip, SalarySlipDocument } from './schemas/salary-slip.schema';
import { PayrollRun, PayrollRunDocument } from './schemas/payroll-run.schema';
import { CreateSlipDto, UpdateSlipDto } from './dto/payroll.dto';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { AuditService } from '../audit/audit.service';

const paise = (s?: string | null) => Math.round(parseFloat(s || '0') * 100);
const rupees = (p: number) => (p / 100).toFixed(2);

/** Slip statuses that are locked against edits/deletes. */
const LOCKED_SLIP_STATUSES = new Set(['finalised', 'shared']);

interface ListSlipFilters {
  employeeId?: string;
  month?: string;
  status?: string;
}

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

  /**
   * Compute gross / deductions / net from the components using integer-paise
   * math (no float drift). Client-supplied totals are never trusted. Throws if
   * deductions exceed earnings (net would be negative).
   */
  static compute(dto: Partial<CreateSlipDto>) {
    const grossP = paise(dto.basic) + paise(dto.hra) + paise(dto.bonus) + paise(dto.allowances);
    const dedP = paise(dto.pf) + paise(dto.esic) + paise(dto.tds) + paise(dto.otherDeductions);
    const netP = grossP - dedP;
    if (netP < 0) throw new BadRequestException('Deductions exceed earnings.');
    return {
      gross: rupees(grossP),
      totalDeductions: rupees(dedP),
      net: rupees(netP),
      // Additive computed aliases (frontend keeps reading gross/net/totalDeductions).
      grossEarnings: rupees(grossP),
      netPay: rupees(netP),
    };
  }

  async createSlip(orgId: string, userId: string, dto: CreateSlipDto) {
    const emp = await this.employees.findOneScoped(orgId, dto.employeeId);

    // One slip per (orgId, employeeId, month) — pre-check before insert.
    const dup = await this.slips
      .findOne({ orgId, employeeId: dto.employeeId, month: dto.month })
      .select('_id')
      .lean()
      .exec();
    if (dup) {
      throw new ConflictException('A salary slip for this employee and month already exists.');
    }

    const totals = PayrollService.compute(dto);
    const fields = {
      orgId,
      employeeId: dto.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName ?? ''}`.trim(),
      empCode: emp.empCode,
      designation: emp.designation,
      month: dto.month,
      basic: dto.basic ?? '0.00',
      hra: dto.hra ?? '0.00',
      bonus: dto.bonus ?? '0.00',
      allowances: dto.allowances ?? '0.00',
      pf: dto.pf ?? '0.00',
      esic: dto.esic ?? '0.00',
      tds: dto.tds ?? '0.00',
      otherDeductions: dto.otherDeductions ?? '0.00',
      gross: totals.gross,
      totalDeductions: totals.totalDeductions,
      net: totals.net,
      status: 'draft' as const,
    };

    let slip: SalarySlipDocument;
    try {
      slip = await this.slips.create(fields);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('A salary slip for this employee and month already exists.');
      }
      throw err;
    }

    await this.generatePdf(orgId, slip);
    await this.audit.log({
      action: 'payroll.slip_created',
      orgId,
      userId,
      resourceId: slip.id,
      meta: { employeeId: dto.employeeId, month: dto.month, net: totals.net },
    });
    return slip.toJSON();
  }

  async updateSlip(orgId: string, userId: string, id: string, dto: UpdateSlipDto) {
    const slip = await this.slips.findOne({ _id: id, orgId }).exec();
    if (!slip) throw new NotFoundException('Salary slip not found');
    if (LOCKED_SLIP_STATUSES.has(slip.status)) {
      throw new ConflictException('This salary slip is finalised and cannot be changed.');
    }

    // Recompute totals server-side from the merged component set.
    const merged: Partial<CreateSlipDto> = {
      basic: dto.basic ?? slip.basic,
      hra: dto.hra ?? slip.hra,
      bonus: dto.bonus ?? slip.bonus,
      allowances: dto.allowances ?? slip.allowances,
      pf: dto.pf ?? slip.pf,
      esic: dto.esic ?? slip.esic,
      tds: dto.tds ?? slip.tds,
      otherDeductions: dto.otherDeductions ?? slip.otherDeductions,
    };
    const totals = PayrollService.compute(merged);

    slip.basic = merged.basic!;
    slip.hra = merged.hra!;
    slip.bonus = merged.bonus!;
    slip.allowances = merged.allowances!;
    slip.pf = merged.pf!;
    slip.esic = merged.esic!;
    slip.tds = merged.tds!;
    slip.otherDeductions = merged.otherDeductions!;
    slip.gross = totals.gross;
    slip.totalDeductions = totals.totalDeductions;
    slip.net = totals.net;
    if (dto.status && !LOCKED_SLIP_STATUSES.has(dto.status)) slip.status = dto.status as any;
    // Components changed → invalidate the cached PDF so it re-renders.
    slip.pdfUrl = null;
    await slip.save();

    await this.generatePdf(orgId, slip);
    await this.audit.log({
      action: 'payroll.slip_updated',
      orgId,
      userId,
      resourceId: slip.id,
      meta: { month: slip.month, net: totals.net },
    });
    return slip.toJSON();
  }

  private async generatePdf(orgId: string, slip: SalarySlipDocument) {
    try {
      const company = await this.orgs.getCompany(orgId).catch(() => null);
      const { url } = await this.pdf.generateSalarySlip({
        company: {
          name: company?.name ?? 'Company',
          logoUrl: company?.logoUrl ?? null,
          address: company?.registeredAddress ?? null,
        },
        employeeName: slip.employeeName,
        empCode: slip.empCode,
        designation: slip.designation,
        month: slip.month,
        earnings: { basic: slip.basic, hra: slip.hra, bonus: slip.bonus, allowances: slip.allowances },
        deductions: { pf: slip.pf, esic: slip.esic, tds: slip.tds, other: slip.otherDeductions },
        gross: slip.gross,
        totalDeductions: slip.totalDeductions,
        net: slip.net,
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

  listSlips(orgId: string, filters: ListSlipFilters = {}) {
    const filter: Record<string, any> = { orgId };
    if (filters.employeeId) filter.employeeId = filters.employeeId;
    if (filters.month) filter.month = filters.month;
    if (filters.status) filter.status = filters.status;
    return this.slips
      .find(filter)
      .sort({ month: -1, createdAt: -1 })
      .limit(500)
      .exec()
      .then((r) => r.map((s) => s.toJSON()));
  }

  async getSlip(orgId: string, id: string) {
    const s = await this.slips.findOne({ _id: id, orgId }).exec();
    if (!s) throw new NotFoundException('Salary slip not found');
    if (!s.pdfUrl) await this.generatePdf(orgId, s);
    return s.toJSON();
  }

  async removeSlip(orgId: string, userId: string, id: string) {
    const slip = await this.slips.findOne({ _id: id, orgId }).exec();
    if (!slip) throw new NotFoundException('Salary slip not found');
    if (LOCKED_SLIP_STATUSES.has(slip.status)) {
      throw new ConflictException('This salary slip is finalised and cannot be changed.');
    }
    await this.slips.deleteOne({ _id: id, orgId }).exec();
    await this.audit.log({
      action: 'payroll.slip_removed',
      orgId,
      userId,
      resourceId: id,
      meta: { month: slip.month, employeeId: slip.employeeId },
    });
    return { deleted: true };
  }

  // ─────────────────────────── Payroll runs ───────────────────────────
  async runPayroll(orgId: string, userId: string, period: string) {
    // A finalised run is locked — do not let a re-run overwrite its summary.
    const existing = await this.runs.findOne({ orgId, period }).exec();
    if (existing && existing.status === 'finalised') {
      throw new ConflictException('Payroll run already finalised.');
    }

    const agg = await this.slips
      .aggregate([
        { $match: { orgId, month: period } },
        {
          $group: {
            _id: null,
            gross: { $sum: { $toDouble: '$gross' } },
            deductions: { $sum: { $toDouble: '$totalDeductions' } },
            net: { $sum: { $toDouble: '$net' } },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    const a = agg[0] ?? { gross: 0, deductions: 0, net: 0, count: 0 };
    const run = await this.runs
      .findOneAndUpdate(
        { orgId, period },
        {
          $set: {
            gross: a.gross.toFixed(2),
            deductions: a.deductions.toFixed(2),
            net: a.net.toFixed(2),
            slipCount: a.count,
            status: 'draft',
          },
        },
        { new: true, upsert: true },
      )
      .exec();
    await this.audit.log({
      action: 'payroll.run_created',
      orgId,
      userId,
      resourceId: run.id,
      meta: { period, net: run.net },
    });
    return run.toJSON();
  }

  listRuns(orgId: string, filters: { month?: string; status?: string } = {}) {
    const filter: Record<string, any> = { orgId };
    if (filters.month) filter.period = filters.month;
    if (filters.status) filter.status = filters.status;
    return this.runs
      .find(filter)
      .sort({ period: -1 })
      .exec()
      .then((r) => r.map((x) => x.toJSON()));
  }

  async finaliseRun(orgId: string, userId: string, period: string) {
    const run = await this.runs.findOne({ orgId, period }).exec();
    if (!run) throw new NotFoundException('Run not found — generate it first');
    if (run.status === 'finalised') {
      throw new ConflictException('Payroll run already finalised.');
    }

    const now = new Date().toISOString();
    run.status = 'finalised';
    run.finalisedAt = now;
    run.finalisedBy = userId;
    await run.save();

    await this.slips
      .updateMany(
        { orgId, month: period },
        { $set: { status: 'finalised', finalisedAt: now, finalisedBy: userId } },
      )
      .exec();
    await this.audit.log({
      action: 'payroll.run_finalised',
      orgId,
      userId,
      resourceId: run.id,
      meta: { period },
    });
    return run.toJSON();
  }
}
