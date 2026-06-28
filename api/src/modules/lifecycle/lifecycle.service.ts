import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Onboarding, OnboardingDocument } from './schemas/onboarding.schema';
import { Exit, ExitDocument } from './schemas/exit.schema';
import { CreateExitDto, UpdateExitDto, ToggleChecklistDto } from './dto/lifecycle.dto';
import { EmployeesService } from '../employees/employees.service';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AuditService } from '../audit/audit.service';

/** Exit status forward-only state machine (same-status no-op is always allowed). */
const EXIT_STATUSES = ['initiated', 'notice', 'cleared', 'settled'] as const;
type ExitStatus = (typeof EXIT_STATUSES)[number];
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;

const EXIT_TRANSITIONS: Record<ExitStatus, ExitStatus[]> = {
  initiated: ['notice'],
  notice: ['cleared'],
  cleared: ['settled'],
  settled: [],
};

function assertExitTransition(from: ExitStatus, to: ExitStatus): void {
  if (from === to) return;
  if (!EXIT_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(`Invalid exit status transition: ${from} → ${to}`);
  }
}

const DEFAULT_CHECKLIST = [
  { key: 'aadhaar', label: 'Aadhaar card upload', required: true },
  { key: 'pan', label: 'PAN card upload', required: true },
  { key: 'photo', label: 'Passport photo upload', required: true },
  { key: 'bank', label: 'Bank account details', required: true },
  { key: 'certs', label: 'Educational certificates', required: true },
  { key: 'offer', label: 'Signed offer letter', required: true },
  { key: 'it', label: 'IT setup & access provisioning', required: false },
];

const DEFAULT_ASSETS = ['Laptop', 'ID card', 'Access card'];

function addDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class LifecycleService {
  constructor(
    @InjectModel(Onboarding.name) private readonly onboardings: Model<OnboardingDocument>,
    @InjectModel(Exit.name) private readonly exits: Model<ExitDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────── Onboarding ───────────────────────────
  async getOnboarding(orgId: string, employeeId: string) {
    await this.employees.findOneScoped(orgId, employeeId); // ensures tenant ownership
    let doc = await this.onboardings.findOne({ orgId, employeeId }).exec();
    if (!doc) {
      doc = await this.onboardings.create({
        orgId, employeeId,
        checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: false, docUrl: null })),
        status: 'in_progress',
      });
    }
    return doc.toJSON();
  }

  async toggleChecklist(orgId: string, userId: string, employeeId: string, itemId: string, dto: ToggleChecklistDto) {
    const doc = await this.onboardings.findOne({ orgId, employeeId }).exec();
    if (!doc) throw new NotFoundException('Onboarding not found');
    const item = (doc.checklist as any).id(itemId);
    if (!item) throw new NotFoundException('Checklist item not found');
    item.done = dto.done;
    if (dto.docUrl !== undefined) item.docUrl = dto.docUrl || null;

    const wasComplete = doc.status === 'complete';
    // Auto-complete recompute: ALL checklist items must be done.
    const allDone = doc.checklist.length > 0 && doc.checklist.every((c) => c.done);
    doc.status = allDone ? 'complete' : 'in_progress';
    doc.completedAt = allDone ? new Date().toISOString() : null;
    await doc.save();

    await this.audit.log({
      action: 'onboarding.item_toggled', orgId, userId, resourceId: employeeId,
      meta: { item: item.key, done: dto.done },
    });

    if (allDone && !wasComplete) {
      await this.employees.update(orgId, employeeId, { status: 'active' }).catch(() => {});
      await this.audit.log({
        action: 'onboarding.completed', orgId, userId, resourceId: employeeId,
        meta: { completedAt: doc.completedAt },
      });
    }
    return doc.toJSON();
  }

  // ─────────────────────────── Exit ───────────────────────────
  async createExit(orgId: string, userId: string, dto: CreateExitDto) {
    const emp = await this.employees.findOneScoped(orgId, dto.employeeId);
    const noticeDays = dto.noticeDays ?? 30;
    if (noticeDays < 0) throw new BadRequestException('Notice days cannot be negative.');
    // One open exit per employee at a time.
    const existing = await this.exits.findOne({ orgId, employeeId: dto.employeeId, status: { $ne: 'settled' } }).exec();
    if (existing) throw new BadRequestException('This employee already has an exit in progress.');
    const doc = await this.exits.create({
      orgId, employeeId: dto.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName ?? ''}`.trim(),
      resignationDate: dto.resignationDate.slice(0, 10),
      lastWorkingDate: addDays(dto.resignationDate, noticeDays),
      noticeDays, reason: dto.reason ?? null,
      assets: DEFAULT_ASSETS.map((a) => ({ asset: a, returned: false })),
      status: 'notice',
    });
    await this.employees.update(orgId, dto.employeeId, { status: 'on_notice' }).catch(() => {});
    await this.audit.log({ action: 'exit.initiated', orgId, userId, resourceId: doc.id, meta: { employeeId: dto.employeeId } });
    return doc.toJSON();
  }

  list(orgId: string, status?: string, q?: string) {
    const filter: Record<string, any> = { orgId };
    if (status) filter.status = status;
    if (q && q.trim()) filter.employeeName = { $regex: q.trim(), $options: 'i' };
    return this.exits.find(filter).sort({ createdAt: -1 }).exec().then((r) => r.map((e) => e.toJSON()));
  }

  async getExit(orgId: string, id: string) {
    const e = await this.exits.findOne({ _id: id, orgId }).exec();
    if (!e) throw new NotFoundException('Exit record not found');
    return e.toJSON();
  }

  async updateExit(orgId: string, userId: string, id: string, dto: UpdateExitDto) {
    const e = await this.exits.findOne({ _id: id, orgId }).exec();
    if (!e) throw new NotFoundException('Exit record not found');
    if (e.status === 'settled') throw new BadRequestException('This exit is settled and can no longer be changed.');

    if (dto.assets) e.assets = dto.assets.map((a) => ({ asset: a.asset, returned: Boolean(a.returned) })) as any;
    if (dto.managerApproved !== undefined) e.managerApproved = dto.managerApproved;
    if (dto.hrApproved !== undefined) e.hrApproved = dto.hrApproved;
    if (dto.finalSettlement !== undefined) {
      if (!MONEY_RE.test(dto.finalSettlement)) throw new BadRequestException('Final settlement must be a valid amount.');
      e.finalSettlement = dto.finalSettlement;
    }
    if (dto.settlementNotes !== undefined) e.settlementNotes = dto.settlementNotes || null;
    if (dto.lastWorkingDate !== undefined) {
      const lwd = dto.lastWorkingDate.slice(0, 10);
      if (lwd < e.resignationDate) throw new BadRequestException('Last working date cannot be before resignation date.');
      e.lastWorkingDate = lwd;
    }

    const assetsReturned = e.assets.length === 0 || e.assets.every((a) => a.returned);
    if (dto.status) {
      const from = e.status as ExitStatus;
      const to = dto.status as ExitStatus;
      assertExitTransition(from, to);
      if (to === 'cleared' && !(e.managerApproved && e.hrApproved && assetsReturned)) {
        throw new BadRequestException('Manager + HR approval and returned assets are required before clearance.');
      }
      if (to === 'settled' && !(MONEY_RE.test(e.finalSettlement) && parseFloat(e.finalSettlement) > 0)) {
        throw new BadRequestException('Record the final settlement before settling this exit.');
      }
      e.status = to;
    } else if (assetsReturned && e.managerApproved && e.hrApproved && e.status === 'notice') {
      e.status = 'cleared';
    }

    if (e.status === 'settled') {
      e.completedAt = new Date().toISOString();
      await this.employees.update(orgId, e.employeeId, { status: 'exited' }).catch(() => {});
    }
    await e.save();
    await this.audit.log({
      action: e.status === 'settled' ? 'exit.settled' : 'exit.updated',
      orgId, userId, resourceId: id, meta: { status: e.status },
    });
    return e.toJSON();
  }
}
