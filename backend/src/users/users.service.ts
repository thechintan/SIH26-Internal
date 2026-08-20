import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateStaffDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash -otp_hash -otp_expires_at')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user as any;
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<any> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .select('-passwordHash -otp_hash -otp_expires_at')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createStaff(dto: CreateStaffDto): Promise<any> {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      department_id: dto.department_id,
      ward_scope: dto.ward_scope || [],
    });

    const { passwordHash: _, otp_hash, otp_expires_at, ...result } = user.toObject();
    return result;
  }

  async listStaff(): Promise<any[]> {
    return this.userModel
      .find({ role: { $ne: 'citizen' } })
      .select('-passwordHash -otp_hash -otp_expires_at')
      .populate('department_id', 'name')
      .lean();
  }
}
