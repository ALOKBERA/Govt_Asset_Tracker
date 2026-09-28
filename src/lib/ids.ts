import connectDB from './db';
import { Counter } from '@/models/Alert';
import type { ClassCode } from './constants';

/**
 * Generate a unique asset ID: GJ-RNB-{CLASS}-{DISTRICT}-{SERIAL6}
 * Uses atomic findOneAndUpdate + $inc on Counter collection
 */
export async function generateAssetId(classCode: ClassCode, districtCode: string): Promise<string> {
  await connectDB();

  const counterKey = `${classCode}-${districtCode}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const serial = String(counter.seq).padStart(6, '0');
  return `GJ-RNB-${classCode}-${districtCode}-${serial}`;
}

/**
 * Get the class code for display label
 */
export function classLabel(classCode: string): string {
  const labels: Record<string, string> = {
    RDS: 'Road',
    SEG: 'Road Segment',
    BRG: 'Bridge',
    BLD: 'Building',
    LND: 'Land',
    MCH: 'Machinery',
  };
  return labels[classCode] || classCode;
}
