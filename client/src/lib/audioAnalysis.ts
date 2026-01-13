export interface AudioAnalysis {
  bpm: number;
  confidence: number;
  onsets: number[];
  duration: number;
  intensity: number[];
  rhythmPattern: string;
}

export async function analyzeAudio(audioFile: File): Promise<AudioAnalysis> {
  const audioContext = new AudioContext();
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  
  const bpmResult = detectBPM(channelData, sampleRate);
  const onsets = detectOnsets(channelData, sampleRate);
  const intensity = analyzeIntensity(channelData, sampleRate);
  const rhythmPattern = classifyRhythm(onsets, bpmResult.bpm, duration);
  
  audioContext.close();
  
  return {
    bpm: bpmResult.bpm,
    confidence: bpmResult.confidence,
    onsets,
    duration,
    intensity,
    rhythmPattern
  };
}

function detectBPM(channelData: Float32Array, sampleRate: number): { bpm: number; confidence: number } {
  const windowSize = 1024;
  const hopSize = 512;
  const energies: number[] = [];
  
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    energies.push(energy);
  }
  
  const diff: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    diff.push(Math.max(0, energies[i] - energies[i - 1]));
  }
  
  const minBPM = 60;
  const maxBPM = 200;
  const secondsPerHop = hopSize / sampleRate;
  
  let bestBPM = 120;
  let bestScore = 0;
  
  for (let bpm = minBPM; bpm <= maxBPM; bpm++) {
    const beatInterval = 60 / bpm / secondsPerHop;
    let score = 0;
    
    for (let offset = 0; offset < beatInterval; offset++) {
      let offsetScore = 0;
      for (let beat = offset; beat < diff.length; beat += beatInterval) {
        const idx = Math.floor(beat);
        if (idx < diff.length) {
          offsetScore += diff[idx];
        }
      }
      score = Math.max(score, offsetScore);
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestBPM = bpm;
    }
  }
  
  const avgEnergy = diff.reduce((a, b) => a + b, 0) / diff.length;
  const confidence = Math.min(1, bestScore / (avgEnergy * diff.length / 10));
  
  return { bpm: bestBPM, confidence };
}

function detectOnsets(channelData: Float32Array, sampleRate: number): number[] {
  const windowSize = 1024;
  const hopSize = 256;
  const energies: number[] = [];
  
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += Math.abs(channelData[i + j]);
    }
    energies.push(energy / windowSize);
  }
  
  const onsets: number[] = [];
  const threshold = 1.5;
  const minGap = 0.05;
  let lastOnset = -minGap;
  
  for (let i = 5; i < energies.length - 5; i++) {
    const localAvg = (energies[i - 5] + energies[i - 4] + energies[i - 3] + energies[i - 2] + energies[i - 1]) / 5;
    const timeInSeconds = (i * hopSize) / sampleRate;
    
    if (energies[i] > localAvg * threshold && timeInSeconds - lastOnset > minGap) {
      onsets.push(timeInSeconds);
      lastOnset = timeInSeconds;
    }
  }
  
  return onsets;
}

function analyzeIntensity(channelData: Float32Array, sampleRate: number): number[] {
  const segmentDuration = 0.25;
  const samplesPerSegment = Math.floor(sampleRate * segmentDuration);
  const intensity: number[] = [];
  
  for (let i = 0; i < channelData.length; i += samplesPerSegment) {
    let rms = 0;
    const end = Math.min(i + samplesPerSegment, channelData.length);
    for (let j = i; j < end; j++) {
      rms += channelData[j] * channelData[j];
    }
    rms = Math.sqrt(rms / (end - i));
    intensity.push(rms);
  }
  
  const maxIntensity = Math.max(...intensity);
  if (maxIntensity === 0) return intensity.map(() => 0);
  return intensity.map(i => i / maxIntensity);
}

function classifyRhythm(onsets: number[], bpm: number, duration: number): string {
  const beatDuration = 60 / bpm;
  const beatsPerBar = 4;
  const barDuration = beatDuration * beatsPerBar;
  
  const onsetsPerBar = onsets.filter(o => o < barDuration * 2).length / 2;
  
  if (onsetsPerBar < 4) return "sparse";
  if (onsetsPerBar < 8) return "moderate";
  if (onsetsPerBar < 16) return "busy";
  return "dense";
}
