// «Проверить микрофон»: уровень голоса с микрофона — только локально, Web Audio API.
// Звук никуда не отправляется и не записывается: берём громкость и спектр, рисуем, и всё.
export interface VoiceMeter {
  /** 0..1 общий уровень и полосы спектра 0..1 */
  read(): { level: number; bands: number[] };
  stop(): void;
}

export async function startVoiceMeter(bandsCount = 16): Promise<VoiceMeter> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 512;
  an.smoothingTimeConstant = 0.72;
  src.connect(an); // в динамики не подключаем — без эха
  const time = new Uint8Array(an.fftSize);
  const freq = new Uint8Array(an.frequencyBinCount);
  let level = 0;

  return {
    read() {
      an.getByteTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / time.length);
      // чувствительность под голос: шёпот ~0.1, громкое пение ~1
      const target = Math.min(1, Math.max(0, (rms - 0.015) * 5.5));
      level += (target - level) * (target > level ? 0.5 : 0.12);

      an.getByteFrequencyData(freq);
      // логарифмические полосы 80 Гц – 8 кГц
      const nyq = ctx.sampleRate / 2;
      const bands: number[] = [];
      for (let b = 0; b < bandsCount; b++) {
        const f0 = 80 * Math.pow(100, b / bandsCount);
        const f1 = 80 * Math.pow(100, (b + 1) / bandsCount);
        const i0 = Math.floor((f0 / nyq) * freq.length);
        const i1 = Math.max(i0 + 1, Math.floor((f1 / nyq) * freq.length));
        let m = 0;
        for (let i = i0; i < i1 && i < freq.length; i++) m = Math.max(m, freq[i]);
        bands.push(Math.min(1, Math.max(0, (m - 60) / 170)));
      }
      return { level, bands };
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
