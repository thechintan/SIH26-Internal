import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../common/constants';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, trim: true })
  phone: string;

  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  passwordHash: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.CITIZEN })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  department_id: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Ward' }], default: [] })
  ward_scope: Types.ObjectId[];

  @Prop()
  fcm_token: string;

  @Prop({ default: 0 })
  civic_score: number;

  /** Hashed OTP for citizen auth — transient, not for long-term storage */
  @Prop()
  otp_hash: string;

  @Prop()
  otp_expires_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
