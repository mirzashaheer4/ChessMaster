// Original Premium Chess Audio Engine
// Procedurally generates all sounds using Web Audio API — no external files.
// Inspired by the crisp, wooden, satisfying feel of premium chess apps.

class ChessAudio {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ─── Core building block: filtered noise impulse ───
  // This creates the "wood hit" character — short noise shaped by filters
  private woodHit(
    time: number,
    duration: number,
    volume: number,
    lowFreq: number,
    highFreq: number,
    resonance: number = 1.0,
    decayRate: number = 0.12
  ) {
    const ctx = this.getCtx();
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // Shaped noise with fast exponential decay
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * decayRate));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Bandpass filter gives the "woody" tonal character
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (lowFreq + highFreq) / 2;
    bp.Q.value = resonance;

    // Highpass to remove rumble
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = lowFreq;

    // Output gain with envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start(time);
  }

  // ─── Pitched knock (board body resonance) ───
  private knock(time: number, freq: number, duration: number, volume: number) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  // ─── Clean tone for melodic/alert sounds ───
  private tone(
    time: number, freq: number, duration: number, volume: number,
    wave: OscillatorType = 'sine', attack: number = 0.008
  ) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  // ═══════════════════════════════════════════════════════
  //  CHESS SOUNDS
  // ═══════════════════════════════════════════════════════

  /** Premove queued — soft muted click with a subtle high-pitched hint */
  playPremove() {
    const t = this.getCtx().currentTime;
    // Soft muted snap — lighter than a real move
    this.woodHit(t, 0.025, 0.25, 2200, 4500, 0.8, 0.05);
    // Subtle high shimmer to signal "queued, not played yet"
    this.tone(t + 0.01, 1800, 0.06, 0.08, 'sine', 0.005);
  }

  /** Piece placement — crisp snap like wood-on-wood contact */
  // NOTE: User prefers "Crisp" sound. DO NOT add low-frequency thuds/knocks.
  // Keep high-frequency snap (2.8kHz+) boosted.
  playMove() {
    const t = this.getCtx().currentTime;
    // Crisp top-end click (the initial "snap") - Boosted freq and volume
    this.woodHit(t, 0.030, 0.6, 2800, 6000, 1.2, 0.06);
    // Mid-body warmth (board absorbing the impact) - Reduced volume, higher freq
    this.woodHit(t + 0.002, 0.05, 0.15, 800, 2000, 0.8, 0.08);
    // Subtle low thud - REMOVED for crispness
    // this.knock(t + 0.001, 200, 0.07, 0.1); 
  }

  /** Capture — heavier, more aggressive double-impact */
  playCapture() {
    const t = this.getCtx().currentTime;
    // Loud aggressive snap (piece slamming) - Boosted for crispness
    this.woodHit(t, 0.03, 0.65, 2500, 6000, 1.0, 0.07);
    // Heavy mid-body hit - Reduced volume for less "thickness"
    this.woodHit(t + 0.001, 0.07, 0.25, 700, 2200, 0.9, 0.09);
    // Second lighter hit (captured piece displaced)
    this.woodHit(t + 0.035, 0.04, 0.18, 1800, 4500, 1.5, 0.1);
    // Deep board knock - Reduced volume significantly to remove "mud/thick"
    this.knock(t, 160, 0.1, 0.08);
    // Brief high scatter
    this.woodHit(t + 0.05, 0.025, 0.08, 4000, 8000, 2.0, 0.06);
  }

  /** Check — move sound + short metallic alert ping */
  playCheck() {
    const t = this.getCtx().currentTime;
    // Normal move base
    this.woodHit(t, 0.035, 0.35, 2200, 5500, 1.2, 0.08);
    this.woodHit(t + 0.002, 0.06, 0.2, 600, 1800, 0.8, 0.1);
    this.knock(t + 0.001, 200, 0.06, 0.08);
    
    // Alert ping — sharp, clear, slightly metallic
    this.tone(t + 0.06, 1320, 0.08, 0.14, 'sine');    // E6
    this.tone(t + 0.06, 1980, 0.06, 0.06, 'sine');    // B6 harmonic shimmer
  }

  /** Check Ping Only — for when we want the alert but already played a capture sound */
  playCheckPing() {
    const t = this.getCtx().currentTime;
    this.tone(t + 0.06, 1320, 0.08, 0.14, 'sine');    // E6
    this.tone(t + 0.06, 1980, 0.06, 0.06, 'sine');    // B6 harmonic shimmer
  }

  /** Capturing Check — Heavy impact + Alert */
  playCaptureCheck() {
      this.playCapture();
      this.playCheckPing();
  }

  /** Checkmate — heavy impact + dramatic descending resolution */
  playCheckmate() {
    const t = this.getCtx().currentTime;
    // Heavy slam
    this.woodHit(t, 0.04, 0.5, 2000, 5000, 0.8, 0.07);
    this.knock(t, 130, 0.15, 0.2);
    this.woodHit(t + 0.002, 0.08, 0.3, 500, 1500, 0.7, 0.1);
    // Dramatic 3-note descend: E5 → C5 → G4 (minor feel, finality)
    this.tone(t + 0.18, 659.25, 0.22, 0.16, 'triangle');
    this.tone(t + 0.38, 523.25, 0.22, 0.14, 'triangle');
    this.tone(t + 0.58, 392.00, 0.5, 0.18, 'triangle');
    // Deep sustain underneath
    this.tone(t + 0.6, 196.00, 0.6, 0.07, 'sine');
  }

  /** Castling — two distinct placements in quick rhythm */
  playCastling() {
    const t = this.getCtx().currentTime;
    // King placement (first, slightly heavier)
    this.woodHit(t, 0.035, 0.38, 2100, 5200, 1.2, 0.08);
    this.woodHit(t + 0.002, 0.06, 0.2, 650, 1700, 0.8, 0.1);
    this.knock(t + 0.001, 190, 0.07, 0.09);
    // Rook slides in (second, slightly brighter, quick follow)
    this.woodHit(t + 0.11, 0.03, 0.32, 2600, 5800, 1.3, 0.08);
    this.woodHit(t + 0.112, 0.05, 0.18, 700, 1900, 0.9, 0.1);
    this.knock(t + 0.11, 220, 0.06, 0.08);
  }

  /** Promotion — placement + quick ascending shimmer */
  playPromotion() {
    const t = this.getCtx().currentTime;
    // Piece placement base
    this.woodHit(t, 0.035, 0.38, 2200, 5500, 1.2, 0.08);
    this.woodHit(t + 0.002, 0.06, 0.2, 600, 1800, 0.8, 0.1);
    this.knock(t + 0.001, 200, 0.06, 0.08);
    // Fast ascending shimmer: C6 → E6 → G6 → C7
    const notes = [1046.5, 1318.5, 1568.0, 2093.0];
    notes.forEach((f, i) => {
      this.tone(t + 0.08 + i * 0.05, f, 0.15, 0.1 - i * 0.015, 'sine');
    });
  }

  /** Game start — two light taps + welcoming chime */
  playGameStart() {
    const t = this.getCtx().currentTime;
    // Two setup taps (like placing pieces on the board)
    this.woodHit(t, 0.03, 0.12, 2000, 4500, 1.5, 0.1);
    this.knock(t, 220, 0.05, 0.06);
    this.woodHit(t + 0.1, 0.03, 0.15, 2300, 5000, 1.5, 0.1);
    this.knock(t + 0.1, 260, 0.05, 0.06);
    // Warm welcoming chime (major third — inviting)
    this.tone(t + 0.22, 523.25, 0.2, 0.1, 'sine');   // C5
    this.tone(t + 0.22, 659.25, 0.18, 0.06, 'sine');  // E5
  }

  /** Resign — somber descending sigh */
  playResign() {
    const t = this.getCtx().currentTime;
    // Soft piece toppling
    this.woodHit(t, 0.08, 0.12, 800, 2500, 0.6, 0.15);
    // Sad descending minor: D5 → Bb4 → G4
    this.tone(t + 0.06, 587.33, 0.22, 0.12, 'triangle');
    this.tone(t + 0.24, 466.16, 0.22, 0.11, 'triangle');
    this.tone(t + 0.42, 392.00, 0.4, 0.1, 'triangle');
    // Low mourning undertone
    this.tone(t + 0.45, 196.00, 0.5, 0.04, 'sine');
  }

  /** Draw — balanced, neutral resolution */
  playDraw() {
    const t = this.getCtx().currentTime;
    // Two equal-weight taps (symmetry = draw)
    this.woodHit(t, 0.03, 0.18, 2000, 4500, 1.3, 0.1);
    this.knock(t, 200, 0.06, 0.07);
    this.woodHit(t + 0.12, 0.03, 0.18, 2000, 4500, 1.3, 0.1);
    this.knock(t + 0.12, 200, 0.06, 0.07);
    // Neutral perfect fifth (neither happy nor sad)
    this.tone(t + 0.26, 392.00, 0.3, 0.1, 'sine');   // G4
    this.tone(t + 0.26, 523.25, 0.28, 0.06, 'sine');  // C5
  }

  /** Generic game over (timeout) */
  playGameOver() {
    const t = this.getCtx().currentTime;
    // Quick descending: G4 → D4 → C4
    this.tone(t, 392.00, 0.18, 0.14, 'triangle');
    this.tone(t + 0.18, 293.66, 0.18, 0.12, 'triangle');
    this.tone(t + 0.36, 261.63, 0.4, 0.15, 'triangle');
    this.tone(t + 0.4, 130.81, 0.5, 0.05, 'sine');
  }

  /** Low time warning — urgent double tick */
  playLowTime() {
    const t = this.getCtx().currentTime;
    this.tone(t, 880, 0.06, 0.15, 'sine');
    this.tone(t + 0.1, 880, 0.06, 0.15, 'sine');
  }

  /** Illegal move — short muffled error buzz */
  playIllegalMove() {
    const t = this.getCtx().currentTime;
    for (let i = 0; i < 2; i++) {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, t + i * 0.09);
      osc.frequency.linearRampToValueAtTime(65, t + i * 0.09 + 0.06);
      gain.gain.setValueAtTime(0.08, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.06);
    }
  }
}

export const audio = new ChessAudio();
