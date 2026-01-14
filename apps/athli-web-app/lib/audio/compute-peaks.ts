export async function computeWaveformPeaksFromBlob(blob: Blob, barCount = 64) {
  try {
    // Wait a bit to ensure blob is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    // Validate blob
    if (blob.size < 1024) {
      throw new Error('Audio blob too small (< 1KB)');
    }

    const arrayBuffer = await blob.arrayBuffer();

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('AudioContext not supported in this browser');
    }

    const audioCtx = new AudioContextCtor();

    let audioBuffer: AudioBuffer;
    try {
      // Clone the array buffer to avoid potential issues
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    } catch (decodeError) {
      console.error('Audio decode error:', decodeError, 'Blob type:', blob.type, 'Blob size:', blob.size);
      await audioCtx.close();
      throw new Error(`Failed to decode audio: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
    }

    // Validate decoded audio
    if (!audioBuffer || audioBuffer.length === 0) {
      await audioCtx.close();
      throw new Error('Decoded audio buffer is empty');
    }

    await audioCtx.close();

    // Mix to mono
    const len = audioBuffer.length;
    const chs = audioBuffer.numberOfChannels;
    const mono = new Float32Array(len);

    for (let ch = 0; ch < chs; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < len; i++) mono[i] += data[i] / chs;
    }

    // RMS per segment
    const samplesPerBar = Math.max(1, Math.floor(mono.length / barCount));
    const peaks: number[] = [];

    for (let b = 0; b < barCount; b++) {
      const start = b * samplesPerBar;
      const end = Math.min(mono.length, start + samplesPerBar);

      let sumSq = 0;
      for (let i = start; i < end; i++) {
        const v = mono[i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, end - start));
      peaks.push(rms);
    }

    // Normalize + smooth
    const max = Math.max(...peaks, 1e-6);
    const norm = peaks.map((p) => p / max);
    return smooth(norm, 2);
  } catch (error) {
    console.error('Error computing waveform peaks:', error);
    throw error;
  }
}

function smooth(values: number[], passes = 1) {
  let arr = values.slice();
  for (let p = 0; p < passes; p++) {
    const next = arr.slice();
    for (let i = 0; i < arr.length; i++) {
      const a = arr[Math.max(0, i - 1)];
      const b = arr[i];
      const c = arr[Math.min(arr.length - 1, i + 1)];
      next[i] = (a + 2 * b + c) / 4;
    }
    arr = next;
  }
  return arr;
}
