import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true, collection: 'departments' })
export class Department {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: [String], default: [] })
  category_scope: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  head_user_id: Types.ObjectId;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
