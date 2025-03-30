// app/page.tsx
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import CameraFeed from './components/CameraFeed';
import MetricsCard from './components/MetricsCard';
import SignalCombinationSelector from './components/SignalCombinationSelector';
import ChartComponent from './components/ChartComponent';
import usePPGProcessing from './hooks/usePPGProcessing';
import useSignalQuality from './hooks/useSignalQuality';
import useMongoDB from './hooks/useMongoDB';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [signalCombination, setSignalCombination] = useState('default');
  const [showConfig, setShowConfig] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [confirmedSubject, setConfirmedSubject] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  // Define refs for video and canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    ppgData,
    valleys,
    heartRate,
    hrv,
    processFrame,
    startCamera,
    stopCamera,
  } = usePPGProcessing(isRecording, signalCombination, videoRef, canvasRef);

  const { signalQuality, qualityConfidence } = useSignalQuality(ppgData);
  const { isUploading, pushDataToMongo, fetchHistoricalData, fetchLastAccess, historicalData, lastAccessDate } = useMongoDB();

  // Confirm User Function
  const confirmUser = async () => {
    console.log('button pressed'); // debug
    const subject = currentSubject.trim();
    if (subject) {
      setConfirmedSubject(subject);
      console.log('subject set');
      try {
        await handlePullData();
        console.log('handPullData complete');
      } catch (error) {
        console.error('Error confirming user:', error);
      }
    } else {
      alert('Please enter a valid Subject ID.');
    }
  };

  // Start or stop recording
  useEffect(() => {
    if (isRecording) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isRecording, startCamera, stopCamera]);

  // Process frame loop
  useEffect(() => {
    let animationFrame: number;
    const processFrameLoop = () => {
      if (isRecording) {
        processFrame();
        animationFrame = requestAnimationFrame(processFrameLoop);
      }
    };
    if (isRecording) {
      processFrameLoop();
    }
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isRecording, processFrame]);

  // Retrieve data from db
  const handlePullData = async () => {
    if (!confirmedSubject) {
      console.log('subject not found'); // debug
      return;}
    try {
      await fetchHistoricalData(confirmedSubject);
      await fetchLastAccess(confirmedSubject);
      console.log('fetchHistoricalData done'); // debug
      console.log('fetchLastAccess done');
      if (historicalData.avgHeartRate == null || historicalData.avgHeartRate <= 0) {
        console.log('no data found for subject'); // debug
        setIsNewUser(true);
        return;
      }
      console.log('subject data found'); // debug
      setIsNewUser(false);
      const dateObj = new Date(lastAccessDate);
      setLastAccess(dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }))
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsNewUser(true);
    }
  };

  // Store data to db
  const handlePushData = useCallback(async () => {
    if (!isSampling || ppgData.length === 0) {
      alert('No data to save. Please capture data first.');
      return;
    } 

    try {
      const recordData = {
        subjectId: confirmedSubject || 'unknown',
        heartRate: {
          bpm: isNaN(heartRate.bpm) ? 0 : heartRate.bpm,
          confidence: heartRate.confidence || 0,
        },
        hrv: {
          sdnn: isNaN(hrv.sdnn) ? 0 : hrv.sdnn,
          confidence: hrv.confidence || 0,
        },
        ppgData: ppgData,
        timestamp: new Date(),
        signalQuality: qualityConfidence,
      };
      
      await pushDataToMongo(recordData);
      alert('Data saved successfully!');
    } catch {
      alert('Failed to save data. Please try again.');
    }
  }, [isSampling, ppgData, confirmedSubject, heartRate, hrv, qualityConfidence, pushDataToMongo]);
  
  return (
    <div className="flex flex-col items-center p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-4xl mb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
          HeartLens
        </h1>
      </div>
  
      {/* Main Grid: Camera and Chart Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        {/* Left Column: Camera Feed, Controls, and User Input */}
        <div className="space-y-4">
          {/* Camera Feed */}
          <CameraFeed videoRef={videoRef} canvasRef={canvasRef} />
  
          {/* Recording Controls */}
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
            {/* Recording Button */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-lg text-sm transition-all duration-300 flex-1 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }`}
            >
              {isRecording ? '⏹ STOP' : '⏺ START'} RECORDING
            </button>
            
            {/* Sampling Button */}
            <button
              onClick={() => setIsSampling(!isSampling)}
              className={`p-3 rounded-lg text-sm transition-all duration-300 flex-1 ${
                isSampling
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
              disabled={!isRecording}
            >
              {isSampling ? '⏹ STOP SAMPLING' : '⏺ START SAMPLING'}
            </button>
          </div>
  
          {/* Signal Combination Selector */}
          <button
            onClick={() => setShowConfig((prev) => !prev)}
            className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 w-full"
          >
            Toggle Config
          </button>
          {showConfig && (
            <SignalCombinationSelector
              signalCombination={signalCombination}
              setSignalCombination={setSignalCombination}
            />
          )}
  
          {/* User Input Section */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <input
              type="text"
              value={currentSubject}
              onChange={(e) => setCurrentSubject(e.target.value)}
              placeholder="Enter Subject ID"
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <button
              onClick={confirmUser}
              className="bg-cyan-500 text-white px-4 py-2 rounded-md mt-2 w-full"
            >
              Confirm User
            </button>
            
            {confirmedSubject && (
              <div className="space-y-1 mt-3">
                <br />
                {isNewUser ? (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="text-blue-700 font-medium">New User Detected</p>
                  </div>
                ) : (
                  <>
                    <p>
                      <strong>Last Access Date:</strong>
                      <span className="text-gray-500 ml-1">
                        {lastAccessDate === 'Never' ? 'Never' : lastAccessDate}
                      </span>
                    </p>
                    <p>
                      <strong>Average Heart Rate:</strong>
                      <span className="text-gray-500 ml-1">
                        {historicalData.avgHeartRate ?? 'N/A'} BPM
                      </span>
                    </p>
                    <p>
                      <strong>Average HRV:</strong>
                      <span className="text-gray-500 ml-1">
                        {historicalData.avgHRV ?? 'N/A'} ms
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
  
        {/* Right Column: Chart and Metrics */}
        <div className="space-y-4">
          <ChartComponent ppgData={ppgData} valleys={valleys} />
  
          <button
            onClick={handlePushData}
            disabled={isUploading}
            className={`w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? 'Saving...' : 'Save Data to MongoDB'}
          </button>
  
          <div className="flex flex-wrap gap-4">
            <MetricsCard
              title="HEART RATE"
              value={heartRate || {}}
              confidence={heartRate?.confidence || 0}
            />
            <MetricsCard
              title="HRV"
              value={hrv || {}}
              confidence={hrv?.confidence || 0}
            />
            <MetricsCard
              title="Signal Quality"
              value={Number(signalQuality)}
              confidence={qualityConfidence}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
