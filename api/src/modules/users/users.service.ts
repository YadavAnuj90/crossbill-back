import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto & { passwordHash?: string | null; orgId: string }): Promise<User> {
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash: dto.passwordHash ?? null,
      googleId: dto.googleId ?? null,
      legalName: dto.legalName ?? null,
      orgId: dto.orgId,
    });
    return this.users.save(user);
  }

  async markEmailVerified(id: string) {
    await this.users.update({ id }, { emailVerified: true });
  }

  async linkGoogle(id: string, googleId: string) {
    await this.users.update({ id }, { googleId, emailVerified: true });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    return this.users.save(user);
  }

  /** Safe profile projection — never returns password/token hashes. */
  toProfile(user: User) {
    const { passwordHash, ...safe } = user;
    void passwordHash;
    return safe;
  }
}
