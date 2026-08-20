import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoutingRuleDocument = RoutingRule & Document;

@Schema({ timestamps: true, collection: 'routing_rules' })
export class RoutingRule {
  @Prop({ required: true })
  category: string;

  @Prop({ type: Types.ObjectId, ref: 'Ward', default: null })
  ward_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Department' })
  department_id: Types.ObjectId;
}

export const RoutingRuleSchema = SchemaFactory.createForClass(RoutingRule);

// Compound unique index: one rule per (category, ward) pair
RoutingRuleSchema.index({ category: 1, ward_id: 1 }, { unique: true });
