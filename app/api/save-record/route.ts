// app/api/save-record/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable in .env.local'
  );
}

// Cache to reuse an existing connection
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Define the schema with an extra field for ppgData
const RecordSchema = new mongoose.Schema({
  subjectId: { type: String, required: true }, 
  heartRate: {
    bpm: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  hrv: {
    sdnn: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  ppgData: { type: [Number], required: true },
  timestamp: { type: Date, default: Date.now },
});

// Use an existing model if available or compile a new one
const Record = mongoose.models.Record || mongoose.model('Record', RecordSchema);

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Create a new record including the entire ppgData array
    const newRecord = await Record.create({
      subjectId: body.subjectId,
      heartRate: body.heartRate,
      hrv: body.hrv,
      ppgData: body.ppgData, // The whole ppgData array is posted here
      timestamp: body.timestamp || new Date(),
    });

    return NextResponse.json(
      { success: true, data: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}