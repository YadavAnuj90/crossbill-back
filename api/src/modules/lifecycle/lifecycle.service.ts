import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Onboarding, OnboardingDocument } from './schemas/onboarding.schema';
import { Exit, ExitDocument } from './schemas/exit.schema';
import { CreateExitDto, UpdateExitDto, ToggleChecklistDto } from './dto/lifecycle.dto';
import { EmployeesService } from '../employees/employees.service';
import { AuditService } from '../audit/audit.service';

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

  async toggleChecklist(orgId: string, employeeId: string, itemId: string, dto: ToggleChecklistDto) {
    const doc = await this.onboardings.findOne({ orgId, employeeId }).exec();
    if (!doc) throw new NotFoundException('Onboarding not found');
    const item = (doc.checklist as any).id(itemId);
    if (!item) throw new NotFoundException('Checklist item not found');
    item.done = dto.done;
    if (dto.docUrl !== undefined) item.docUrl = dto.docUrl || null;

    const allRequiredDone = doc.checklist.filter((c) => c.required).every((c) => c.done);
    doc.status = allRequiredDone ? 'complete' : 'in_progress';
    doc.completedAt = allRequiredDone ? new Date().toISOString() : null;
    await doc.save();

    if (allRequiredDone) {
      await this.employees.update(orgId, employeeId, { status: 'active' }).catch(() => {});
    }
    await this.audit.log({ action: 'onboarding.updated', orgId, resourceId: employeeId, meta: { item: item.key, done: dto.done } });
    return doc.toJSON();
  }

  // ─────────────────────────── Exit ───────────────────────────
  async createExit(orgId: string, dto: CreateExitDto) {
    const emp = await this.employees.findOneScoped(orgId, dto.employeeId);
    const noticeDays = dto.noticeDays ?? 30;
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
    await this.audit.log({ action: 'exit.initiated', orgId, resourceId: doc.id, meta: { employeeId: dto.employeeId } });
    return doc.toJSON();
  }

  list(orgId: string, status?: string) {
    const filter: Record<string, any> = { orgId };
    if (status) filter.status = status;
    return this.exits.find(filter).sort({ createdAt: -1 }).exec().then((r) => r.map((e) => e.toJSON()));
  }

  async getExit(orgId: string, id: string) {
    const e = await this.exits.findOne({ _id: id, orgId }).exec();
    if (!e) throw new NotFoundException('Exit record not found');
    return e.toJSON();
  }

  async updateExit(orgId: string, id: string, dto: UpdateExitDto) {
    const e = await this.exits.findOne({ _id: id, orgId }).exec();
    if (!e) throw new NotFoundException('Exit record not found');
    if (dto.assets) e.assets = dto.assets.map((a) => ({ asset: a.asset, returned: Boolean(a.returned) })) as any;
    if (dto.managerApproved !== undefined) e.managerApproved = dto.managerApproved;
    if (dto.hrApproved !== undefined) e.hrApproved = dto.hrApproved;
    if (dto.finalSettlement !== undefined) e.finalSettlement = dto.finalSettlement;
    if (dto.settlementNotes !== undefined) e.settlementNotes = dto.settlementNotes || null;
    if (dto.lastWorkingDate !== undefined) e.lastWorkingDate = dto.lastWorkingDate.slice(0, 10);

    const assetsReturned = e.assets.every((a) => a.returned);
    const cleared = e.managerApproved && e.hrApproved && assetsReturned;
    if (dto.status) {
      e.status = dto.status;
    } else if (cleared && e.status === 'notice') {
      e.status = 'cleared';
    }
    if (e.status === 'settled') {
      e.completedAt = new Date().toISOString();
      await this.employees.update(orgId, e.employeeId, { status: 'exited' }).catch(() => {});
    }
    await e.save();
    await this.audit.log({ action: 'exit.updated', orgId, resourceId: id, meta: { status: e.status } });
    return e.toJSON();
  }
}
