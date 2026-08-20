import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WardDocument = Ward & Document;

@Schema({ timestamps: true, collection: 'wards' })
export class Ward {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop(
    raw({
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], required: true },
    }),
  )
  boundary: {
    type: string;
    coordinates: number[][][];
  };
}

export const WardSchema = SchemaFactory.createForClass(Ward);

// 2dsphere index for point-in-polygon lookups
WardSchema.index({ boundary: '2dsphere' });
