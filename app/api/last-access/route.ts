// app/api/last-access/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not defined');
}

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// Database connection setup
async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Define schema
const RecordSchema = new mongoose.Schema({
  subjectId: { type: String, required: true },
  heartRate: { bpm: Number, confidence: Number },
  hrv: { sdnn: Number, confidence: Number },
  ppgData: [Number],
  timestamp: { type: Date, default: Date.now },
});

const Record = mongoose.models.Record || mongoose.model('Record', RecordSchema);

// GET handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subjectId');

  if (!subjectId) {
    return NextResponse.json({ success: false, error: 'Missing subjectId' });
  }

  try {
    await dbConnect();
    const lastRecord = await Record.findOne({ subjectId }).sort({ timestamp: -1 });
    if (!lastRecord) {
      return NextResponse.json({ success: false, error: 'No records found' });
    }

    return NextResponse.json({ success: true, lastAccess: lastRecord.timestamp });
  } catch (error) {
    // Type-safe error handling
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage });
  }
}