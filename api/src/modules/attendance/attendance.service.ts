import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { Leave, LeaveDocument } from './schemas/leave.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { CreateLeaveDto, ListAttendanceQueryDto, ListLeaveQueryDto } from './dto/attendance.dto';
import { AuditService } from '../audit/audit.service';

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function isoDay(v: string): string { return v.slice(0, 10); }
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.max(1, Math.floor((b - a) / 86400_000) + 1);
}
function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

const LIST_CAP = 500;
const FULL_DAY_MINUTES = 240;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendance: Model<AttendanceDocument>,
    @InjectModel(Leave.name) private readonly leaves: Model<LeaveDocument>,
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    private readonly audit: AuditService,
  ) {}

  /** Resolve an active (non-exited) employee within the org, or throw. */
  private async requireActiveEmployee(orgId: string, employeeId: string): Promise<void> {
    const emp = await this.employees.findOne({ _id: employeeId, orgId }).select('status').lean().exec();
    if (!emp) throw new NotFoundException('Employee not found in this organisation.');
    if (emp.status === 'exited') throw new BadRequestException('Employee has exited and cannot be marked.');
  }

  // ─────────────────────────── Check in / out ───────────────────────────
  async checkIn(orgId: string, employeeId: string, ip?: string) {
    const date = todayStr();
    await this.requireActiveEmployee(orgId, employeeId);

    const existing = await this.attendance.findOne({ orgId, employeeId, date }).exec();
    if (existing?.checkInAt) throw new ConflictException('Already checked in for this date.');

    const now = new Date().toISOString();
    const doc = await this.attendance.findOneAndUpdate(
      { orgId, employeeId, date },
      { $set: { checkInAt: now, status: 'present', source: 'web', ip: ip ?? null } },
      { new: true, upsert: true },
    ).exec();
    await this.audit.log({ action: 'attendance.check_in', orgId, resourceId: employeeId, meta: { date } });
    return doc.toJSON();
  }

  async checkOut(orgId: string, employeeId: string) {
    const date = todayStr();
    await this.requireActiveEmployee(orgId, employeeId);

    const doc = await this.attendance.findOne({ orgId, employeeId, date }).exec();
    if (!doc || !doc.checkInAt) throw new BadRequestException('No check-in found for this date.');
    if (doc.checkOutAt) throw new ConflictException('Already checked out for this date.');

    const now = new Date().toISOString();
    if (new Date(now).getTime() <= new Date(doc.checkInAt).getTime()) {
      throw new BadRequestException('Check-out must be after check-in.');
    }

    const worked = Math.max(0, Math.round((new Date(now).getTime() - new Date(doc.checkInAt).getTime()) / 60000));
    doc.checkOutAt = now;
    doc.workedMinutes = worked;
    doc.status = worked >= FULL_DAY_MINUTES ? 'present' : 'half';
    await doc.save();
    await this.audit.log({ action: 'attendance.check_out', orgId, resourceId: employeeId, meta: { date, worked } });
    return doc.toJSON();
  }

  // ─────────────────────────── Reads ───────────────────────────
  list(orgId: string, q: ListAttendanceQueryDto = {}) {
    const filter: Record<string, any> = { orgId };
    if (q.employeeId) filter.employeeId = q.employeeId;
    if (q.status) filter.status = q.status;

    const range: Record<string, string> = {};
    if (q.from) range.$gte = isoDay(q.from);
    if (q.to) range.$lte = isoDay(q.to);
    if (!q.from && !q.to && q.month) { range.$gte = `${q.month}-01`; range.$lte = `${q.month}-31`; }
    if (Object.keys(range).length) filter.date = range;

    return this.attendance.find(filter).sort({ date: -1 }).limit(LIST_CAP).exec().then((r) => r.map((a) => a.toJSON()));
  }

  /** Today's records keyed for the live board. */
  today(orgId: string) {
    return this.attendance.find({ orgId, date: todayStr() }).limit(LIST_CAP).exec().then((r) => r.map((a) => a.toJSON()));
  }

  async summary(orgId: string, month: string) {
    const rows = await this.attendance.aggregate([
      { $match: { orgId, date: { $gte: `${month}-01`, $lte: `${month}-31` } } },
      { $group: {
        _id: '$employeeId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        half: { $sum: { $cond: [{ $eq: ['$status', 'half'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
        workedMinutes: { $sum: '$workedMinutes' },
      } },
    ]).exec();
    const byEmployee = rows.map((r: any) => ({
      employeeId: r._id, present: r.present, half: r.half, leave: r.leave,
      workedHours: Math.round((r.workedMinutes / 60) * 10) / 10,
    }));
    const totals = byEmployee.reduce((t, r) => ({
      present: t.present + r.present, half: t.half + r.half, leave: t.leave + r.leave,
      workedHours: Math.round((t.workedHours + r.workedHours) * 10) / 10,
    }), { present: 0, half: 0, leave: 0, workedHours: 0 });
    return { month, byEmployee, totals };
  }

  // ─────────────────────────── Leave ───────────────────────────
  async requestLeave(orgId: string, dto: CreateLeaveDto) {
    await this.requireActiveEmployee(orgId, dto.employeeId);

    const from = isoDay(dto.from);
    const to = isoDay(dto.to);
    if (to < from) throw new BadRequestException('End date is before start date.');
    if (from < todayStr()) throw new BadRequestException('Leave cannot start in the past.');

    // Reject overlaps with any pending/approved leave for the same employee.
    const overlap = await this.leaves.findOne({
      orgId,
      employeeId: dto.employeeId,
      status: { $in: ['pending', 'approved'] },
      from: { $lte: to },
      to: { $gte: from },
    }).exec();
    if (overlap) throw new ConflictException('Overlapping leave already exists.');

    const days = daysBetween(from, to);
    const doc = await this.leaves.create({
      orgId, employeeId: dto.employeeId, type: dto.type,
      from, to, days,
      reason: dto.reason ?? null, status: 'pending',
    });
    await this.audit.log({ action: 'leave.requested', orgId, resourceId: doc.id, meta: { employeeId: dto.employeeId, days } });
    return doc.toJSON();
  }

  listLeaves(orgId: string, q: ListLeaveQueryDto = {}) {
    const filter: Record<string, any> = { orgId };
    if (q.status) filter.status = q.status;
    if (q.employeeId) filter.employeeId = q.employeeId;
    return this.leaves.find(filter).sort({ createdAt: -1 }).limit(LIST_CAP).exec().then((r) => r.map((l) => l.toJSON()));
  }

  async decideLeave(orgId: string, id: string, decision: 'approved' | 'rejected', approverId: string) {
    const doc = await this.leaves.findOne({ _id: id, orgId }).exec();
    if (!doc) throw new NotFoundException('Leave request not found');
    if (doc.status !== 'pending') throw new ConflictException('Leave already decided.');

    const now = new Date().toISOString();
    doc.status = decision;
    doc.approverId = approverId;
    doc.decidedBy = approverId;
    doc.decidedAt = now;
    await doc.save();

    // On approval, mark each day in the range as 'leave' on the attendance sheet.
    if (decision === 'approved') {
      for (const date of eachDate(doc.from, doc.to)) {
        await this.attendance.updateOne(
          { orgId, employeeId: doc.employeeId, date },
          { $set: { status: 'leave', source: 'leave' } },
          { upsert: true },
        ).exec();
      }
    }
    await this.audit.log({ action: `leave.${decision}`, orgId, userId: approverId, resourceId: id, meta: { employeeId: doc.employeeId } });
    return doc.toJSON();
  }

  /** Pending-leave count + today present count for the dashboard. */
  async stats(orgId: string) {
    const [pendingLeaves, presentToday] = await Promise.all([
      this.leaves.countDocuments({ orgId, status: 'pending' }).exec(),
      this.attendance.countDocuments({ orgId, date: todayStr(), status: { $in: ['present', 'half'] } }).exec(),
    ]);
    return { pendingLeaves, presentToday };
  }
}
