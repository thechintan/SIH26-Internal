import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ReportCategory,
  DEFAULT_CATEGORY_BASE_WEIGHTS,
} from '../common/constants';

export type SystemConfigDocument = SystemConfig & Document;

@Schema({ timestamps: true, collection: 'system_config' })
export class SystemConfig {
  @Prop({
    type: [String],
    default: Object.values(ReportCategory),
  })
  categories: string[];

  @Prop(
    raw({
      w1: { type: Number, default: 3 },
      w2: { type: Number, default: 2 },
      w3: { type: Number, default: 5 },
      w4: { type: Number, default: 1 },
    }),
  )
  priority_weights: {
    w1: number; // nearby report count weight
    w2: number; // upvote weight
    w3: number; // urgency keyword weight
    w4: number; // category base weight
  };

  @Prop({
    type: Object,
    default: DEFAULT_CATEGORY_BASE_WEIGHTS,
  })
  category_base_weights: Record<string, number>;

  @Prop({ default: 24 })
  sla_target_hours: number;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
