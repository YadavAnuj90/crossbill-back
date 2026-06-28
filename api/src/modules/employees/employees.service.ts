import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument, EmployeeStatus } from './schemas/employee.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

/** Valid forward-only status transitions (same-status no-op is always allowed). */
const STATUS_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  onboarding: ['active'],
  active: ['on_notice', 'exited'],
  on_notice: ['exited'],
  exited: [],
};

/** Statuses that must be exited/deactivated before a hard delete is permitted. */
const UNDELETABLE_STATUSES: EmployeeStatus[] = ['active', 'on_notice'];

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    private readonly audit: AuditService,
  ) {}

  private assertTransition(from: EmployeeStatus, to: EmployeeStatus): void {
    if (from === to) return;
    if (!STATUS_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Invalid status transition: ${from} → ${to}`);
    }
  }

  /** Maps a Mongo duplicate-key error to a clean ConflictException. */
  private toDuplicateError(err: any): never {
    const key = err?.keyPattern ?? {};
    if ('email' in key) throw new ConflictException('An employee with this email already exists');
    if ('empCode' in key) throw new ConflictException('An employee with this Employee ID already exists');
    throw new ConflictException('An employee with these details already exists');
  }

  async create(orgId: string, dto: CreateEmployeeDto, userId?: string) {
    const codeClash = await this.employees.findOne({ orgId, empCode: dto.empCode }).exec();
    if (codeClash) throw new ConflictException(`Employee ID "${dto.empCode}" already exists`);
    if (dto.email) {
      const emailClash = await this.employees.findOne({ orgId, email: dto.email }).exec();
      if (emailClash) throw new ConflictException(`An employee with email "${dto.email}" already exists`);
    }
    let doc: EmployeeDocument;
    try {
      doc = await this.employees.create({ orgId, ...dto });
    } catch (err: any) {
      if (err?.code === 11000) this.toDuplicateError(err);
      throw err;
    }
    await this.audit.log({
      action: 'employee.created', orgId, userId, resourceId: doc.id,
      meta: { empCode: doc.empCode, status: doc.status },
    });
    return doc.toJSON();
  }

  async list(orgId: string, page: PaginationDto, q?: string, department?: string, status?: string): Promise<Paginated<any>> {
    const filter: Record<string, any> = { orgId };
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { empCode: rx }, { email: rx }, { designation: rx }, { department: rx }];
    }
    const [items, total] = await Promise.all([
      this.employees.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.employees.countDocuments(filter).exec(),
    ]);
    return { items: items.map((e) => e.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  async findOneScoped(orgId: string, id: string): Promise<EmployeeDocument> {
    const doc = await this.employees.findOne({ _id: id, orgId }).exec();
    if (!doc) throw new NotFoundException('Employee not found');
    return doc;
  }

  async get(orgId: string, id: string) {
    return (await this.findOneScoped(orgId, id)).toJSON();
  }

  async update(orgId: string, id: string, dto: UpdateEmployeeDto, userId?: string) {
    const current = await this.findOneScoped(orgId, id);

    if (dto.empCode && dto.empCode !== current.empCode) {
      const clash = await this.employees.findOne({ orgId, empCode: dto.empCode, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException(`Employee ID "${dto.empCode}" already exists`);
    }
    if (dto.email && dto.email !== current.email) {
      const clash = await this.employees.findOne({ orgId, email: dto.email, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException(`An employee with email "${dto.email}" already exists`);
    }
    if (dto.status) this.assertTransition(current.status, dto.status as EmployeeStatus);

    let doc: EmployeeDocument | null;
    try {
      doc = await this.employees.findOneAndUpdate({ _id: id, orgId }, dto, { new: true }).exec();
    } catch (err: any) {
      if (err?.code === 11000) this.toDuplicateError(err);
      throw err;
    }
    if (!doc) throw new NotFoundException('Employee not found');
    await this.audit.log({
      action: 'employee.updated', orgId, userId, resourceId: id,
      meta: {
        empCode: doc.empCode,
        ...(dto.status && dto.status !== current.status ? { status: doc.status } : {}),
      },
    });
    return doc.toJSON();
  }

  async remove(orgId: string, id: string, userId?: string) {
    const doc = await this.findOneScoped(orgId, id);
    if (UNDELETABLE_STATUSES.includes(doc.status)) {
      throw new ConflictException('Exit or deactivate this employee before deleting.');
    }
    const res = await this.employees.deleteOne({ _id: id, orgId }).exec();
    if (!res.deletedCount) throw new NotFoundException('Employee not found');
    await this.audit.log({
      action: 'employee.deleted', orgId, userId, resourceId: id,
      meta: { empCode: doc.empCode, status: doc.status },
    });
    return { deleted: true };
  }

  /** Aggregated HR counts for the dashboard. */
  async stats(orgId: string) {
    const [total, active, onboarding, onNotice, exited, byDept] = await Promise.all([
      this.employees.countDocuments({ orgId }).exec(),
      this.employees.countDocuments({ orgId, status: 'active' }).exec(),
      this.employees.countDocuments({ orgId, status: 'onboarding' }).exec(),
      this.employees.countDocuments({ orgId, status: 'on_notice' }).exec(),
      this.employees.countDocuments({ orgId, status: 'exited' }).exec(),
      this.employees.aggregate([
        { $match: { orgId } },
        { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).exec(),
    ]);
    return { total, active, onboarding, onNotice, exited, byDepartment: byDept.map((d: any) => ({ department: d._id, count: d.count })) };
  }
}
