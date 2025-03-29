// hooks/useMongoDB.ts
import { useState } from 'react';

interface HistoricalData {
  avgHeartRate: number;
  avgHRV: number;
}

interface HeartRateData {
  bpm: number;
  confidence: number;
}

interface HRVData {
  sdnn: number;
  confidence: number;
}

export interface RecordData {
  subjectId: string;
  heartRate: HeartRateData;
  hrv: HRVData;
  ppgData: number[];
  timestamp: Date;
}

export default function useMongoDB() {
  const [isUploading, setIsUploading] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalData>({
    avgHeartRate: -1,
    avgHRV: -1,
  });
  const [lastAccessDate, setLastAccessDate] = useState('Never');
  
  // POST: Save data to MongoDB
  const pushDataToMongo = async (recordData: RecordData) => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/handle-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      });
      const result = await response.json();
      if (result.success) {
        console.log('✅ Data saved:', result.data);
      } else {
        console.error('❌ Error:', result.error);
      }
    } catch (error) {
      console.error('🚨 Network error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // GET: Fetch historical averages
  const fetchHistoricalData = async (subjectId?: string) => {
    try {
      const url = subjectId 
        ? `/api/handle-record?subjectId=${encodeURIComponent(subjectId)}`
        : '/api/handle-record';
        
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) { // debug
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setHistoricalData({
          avgHeartRate: result.avgHeartRate || -2,
          avgHRV: result.avgHRV || -2,
        });
      } else {
        console.error('❌ Error:', result.error);
      }
    } catch (error) {
      console.error('🚨 Network error:', error);
    }
  };

  const fetchLastAccess = async (subjectId: string) => {
    try {
      const url = await subjectId 
      ? `/api/last-access?subjectId=${encodeURIComponent(subjectId)}`
      : '/api/last-access';
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      
      if (result.success) {
        return setLastAccessDate(result.lastAccess);
      }
      throw new Error(result.error || 'Failed to fetch last access');
    } catch (error) {
      console.error('Error fetching last access:', error);
      throw error;
    }
  };

  return {
    isUploading,
    pushDataToMongo,
    fetchHistoricalData,
    fetchLastAccess,
    historicalData,
    lastAccessDate,
  };
}