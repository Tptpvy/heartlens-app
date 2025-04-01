// hooks/useSignalQuality.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

interface SignalQualityResults {
  signalQuality: string;
  qualityConfidence: number;
}
export default function useSignalQuality(
  ppgData: number[]
): SignalQualityResults {
  const modelRef = useRef<tf.LayersModel | null>(null);
  const [signalQuality, setSignalQuality] = useState<string>('--');
  const [qualityConfidence, setQualityConfidence] = useState<number>(0);

  // Load TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await tf.loadLayersModel('/tfjs_model/model.json'); 
        modelRef.current = loadedModel;
        console.log('PPG quality assessment model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };

    loadModel();
  }, []);

  const assessSignalQuality = useCallback(async (signal: number[]) => {
    if (!modelRef.current || signal.length < 100) return;

    try {
      const features = calculateFeatures(signal);
      const inputTensor = tf.tensor2d([features]);
      const prediction = (await modelRef.current.predict(
        inputTensor
      )) as tf.Tensor;
      const probabilities = await prediction.data();

      const classIndex = probabilities.indexOf(Math.max(...probabilities));
      const classes = ['bad', 'acceptable', 'excellent'];
      const predictedClass = classes[classIndex];
      const confidence = probabilities[classIndex] * 100;

      setSignalQuality(predictedClass);
      setQualityConfidence(confidence);

      inputTensor.dispose();
      prediction.dispose();
    } catch (error) {
      console.error('Error assessing signal quality:', error);
    }
  }, []);

  useEffect(() => {
    if (ppgData.length >= 100) {
      assessSignalQuality(ppgData);
    }
  }, [ppgData, assessSignalQuality]);

  const calculateFeatures = (signal: number[], fs: number = 30): number[] => {
    if (!signal.length) return new Array(12).fill(0); // Increased array size for new features

    // Basic statistics
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    
    // Calculate standard deviation and variance
    const squaredDiffs = signal.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / signal.length;
    const std = Math.sqrt(variance);
    
    // Median
    const sorted = [...signal].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 
        : sorted[Math.floor(sorted.length/2)];

    // Higher-order statistics
    const cubedDiffs = signal.map((val) => Math.pow(val - mean, 3));
    const skewness = cubedDiffs.reduce((sum, val) => sum + val, 0) / signal.length / Math.pow(std, 3);

    const fourthPowerDiffs = signal.map((val) => Math.pow(val - mean, 4));
    const kurtosis = fourthPowerDiffs.reduce((sum, val) => sum + val, 0) / signal.length / Math.pow(std, 4);

    // Signal range features
    const max = Math.max(...signal);
    const min = Math.min(...signal);
    const signalRange = max - min;
    const peakToPeak = signalRange;

    // Zero crossings
    let zeroCrossings = 0;
    for (let i = 1; i < signal.length; i++) {
        if ((signal[i] >= 0 && signal[i-1] < 0) || (signal[i] < 0 && signal[i-1] >= 0)) {
            zeroCrossings++;
        }
    }

    // RMS
    const squaredSum = signal.reduce((sum, val) => sum + val * val, 0);
    const rms = Math.sqrt(squaredSum / signal.length);

    // FFT-based features
    const fft = (signal: number[]) => {
        const n = signal.length;
        const freqs = Array.from({length: n}, (_, i) => (i <= n/2) ? i/(n/fs) : -(n-i)/(n/fs));
        const fftValues = new Array(n).fill(0);
        
        // Simple DFT implementation (for real use, consider a more efficient FFT library)
        for (let k = 0; k < n; k++) {
            let sumReal = 0;
            let sumImag = 0;
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                sumReal += signal[t] * Math.cos(angle);
                sumImag += signal[t] * Math.sin(angle);
            }
            fftValues[k] = Math.sqrt(sumReal**2 + sumImag**2);
        }
        return { freqs, fftValues };
    };

    const { freqs, fftValues } = fft(signal);
    const halfLength = Math.floor(fftValues.length/2);
    const positiveFreqs = freqs.slice(1, halfLength);
    const positiveFFT = fftValues.slice(1, halfLength);
    
    const dominantIndex = positiveFFT.indexOf(Math.max(...positiveFFT));
    const dominantFreq = positiveFreqs[dominantIndex];
    const dominantPower = positiveFFT[dominantIndex];

    return [
        mean,
        std,
        skewness,
        kurtosis,
        signalRange,
        zeroCrossings,
        rms,
        peakToPeak,
        median,
        variance,
        dominantFreq,
        dominantPower
    ];
  };

  return { signalQuality, qualityConfidence };
}
