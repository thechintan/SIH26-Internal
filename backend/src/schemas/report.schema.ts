import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReportStatus, PriorityTier, ReportCategory } from '../common/constants';

export type ReportDocument = Report & Document;

@Schema({ _id: false })
export class StatusHistoryEntry {
  @Prop({ required: true, enum: ReportStatus })
  status: ReportStatus;

  @Prop({ required: true })
  note: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  actor_id: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  timestamp: Date;

  @Prop()
  photo_url: string;
}

export const StatusHistoryEntrySchema =
  SchemaFactory.createForClass(StatusHistoryEntry);

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reporter_id: Types.ObjectId;

  @Prop({ required: true, enum: ReportCategory })
  category: ReportCategory;

  @Prop({ maxlength: 500 })
  description: string;

  @Prop()
  voice_note_url: string;

  @Prop({ type: [String], required: true, validate: [(v: string[]) => v.length >= 1 && v.length <= 3, 'Must have 1-3 images'] })
  images: string[];

  @Prop(
    raw({
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    }),
  )
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop({ trim: true })
  address: string;

  @Prop({ type: Types.ObjectId, ref: 'Ward' })
  ward_id: Types.ObjectId;

  @Prop({
    required: true,
    enum: ReportStatus,
    default: ReportStatus.SUBMITTED,
  })
  status: ReportStatus;

  @Prop({ enum: PriorityTier, default: PriorityTier.LOW })
  priority_tier: PriorityTier;

  @Prop({ default: 0 })
  priority_score: number;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  assigned_department_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assigned_staff_id: Types.ObjectId;

  @Prop({ default: 0 })
  upvote_count: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  upvoted_by: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Report' })
  duplicate_of_report_id: Types.ObjectId;

  @Prop({ type: [StatusHistoryEntrySchema], default: [] })
  status_history: StatusHistoryEntry[];

  @Prop()
  resolved_at: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Geospatial index for location-based queries (duplicate detection, map, nearby)
ReportSchema.index({ location: '2dsphere' });

// Compound index for filtered queries
ReportSchema.index({ category: 1, status: 1, createdAt: -1 });
ReportSchema.index({ assigned_department_id: 1, status: 1 });
ReportSchema.index({ assigned_staff_id: 1, status: 1 });
ReportSchema.index({ reporter_id: 1, createdAt: -1 });
