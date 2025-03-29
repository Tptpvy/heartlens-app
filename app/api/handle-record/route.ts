// app/api/handle-record/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// Database connection setup
async function dbConnect() {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(MONGODB_URI);
}

// Schema definition
const RecordSchema = new mongoose.Schema({
  subjectId: { type: String, required: true },
  heartRate: { bpm: Number, confidence: Number },
  hrv: { sdnn: Number, confidence: Number },
  ppgData: [Number],
  timestamp: { type: Date, default: Date.now },
});

const Record = mongoose.models.Record || mongoose.model('Record', RecordSchema);

// GET Handler
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    if (!subjectId) {
      return NextResponse.json({ success: false, error: 'Missing subjectId' });
    }
    const pipeline = [
      {
        $match: { 
          subjectId: subjectId // Ensure this matches your data type (string/number)
        }
      },
      {
        $group: {
          _id: null,
          avgHeartRate: { $avg: '$heartRate.bpm' },
          avgHRV: { $avg: '$hrv.sdnn' },
        }
      }
    ];
    

    const result = await Record.aggregate(pipeline);

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        avgHeartRate: -3, 
        avgHRV: -3,
      });
    }
    return NextResponse.json({
      success: true,
      avgHeartRate: result[0].avgHeartRate,
      avgHRV: result[0].avgHRV,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}