import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.users.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.users.findById(id).exec();
  }

  create(dto: CreateUserDto & { passwordHash?: string | null; orgId: string }) {
    return this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash: dto.passwordHash ?? null,
      googleId: dto.googleId ?? null,
      legalName: dto.legalName ?? null,
      orgId: dto.orgId,
    });
  }

  async markEmailVerified(id: string) {
    await this.users.findByIdAndUpdate(id, { emailVerified: true }).exec();
  }

  async linkGoogle(id: string, googleId: string) {
    await this.users.findByIdAndUpdate(id, { googleId, emailVerified: true }).exec();
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.users.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Safe profile projection — never returns the password hash. */
  toProfile(user: UserDocument) {
    const obj: any = user.toJSON();
    delete obj.passwordHash;
    return obj;
  }
}
