import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, dto: CreateEmployeeDto) {
    const existing = await this.employees.findOne({ orgId, empCode: dto.empCode }).exec();
    if (existing) throw new BadRequestException(`Employee ID "${dto.empCode}" already exists`);
    const doc = await this.employees.create({ orgId, ...dto });
    await this.audit.log({ action: 'employee.created', orgId, resourceId: doc.id, meta: { empCode: doc.empCode } });
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

  async update(orgId: string, id: string, dto: UpdateEmployeeDto) {
    if (dto.empCode) {
      const clash = await this.employees.findOne({ orgId, empCode: dto.empCode, _id: { $ne: id } }).exec();
      if (clash) throw new BadRequestException(`Employee ID "${dto.empCode}" already exists`);
    }
    const doc = await this.employees.findOneAndUpdate({ _id: id, orgId }, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Employee not found');
    await this.audit.log({ action: 'employee.updated', orgId, resourceId: id });
    return doc.toJSON();
  }

  async remove(orgId: string, id: string) {
    const res = await this.employees.deleteOne({ _id: id, orgId }).exec();
    if (!res.deletedCount) throw new NotFoundException('Employee not found');
    await this.audit.log({ action: 'employee.deleted', orgId, resourceId: id });
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
