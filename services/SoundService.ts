
class SoundService {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Sequencer State
  private isPlayingMusic: boolean = false;
  private current16thNote: number = 0;
  private nextNoteTime: number = 0;
  private scheduleTimer: number | null = null;
  private tempo: number = 130;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s

  constructor() {
    // Initialize lazily
  }

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.6; // Boosted Volume
      this.masterGain.connect(this.audioCtx.destination);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = 0.6; 
      this.musicGain.connect(this.masterGain);
    }
  }

  // Called from App UI on any user interaction to unlock the audio engine
  public async resume() {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.error("Audio resume failed", e);
      }
    }
  }

  public startMusic() {
    this.resume(); 
    if (!this.audioCtx) return;

    // If already playing, don't restart
    if (this.isPlayingMusic) return;

    this.isPlayingMusic = true;
    this.current16thNote = 0;
    // Reset time to slightly in the future to ensure clean start
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.scheduler();
  }

  public stopMusic() {
    this.isPlayingMusic = false;
    if (this.scheduleTimer) {
      window.clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }

  private scheduler = () => {
    if (!this.isPlayingMusic || !this.audioCtx) return;

    // Safety: If execution timing drifted significantly (e.g. tab background), reset nextNoteTime
    // This prevents a burst of notes playing all at once to catch up
    if (this.nextNoteTime < this.audioCtx.currentTime - 0.1 || this.nextNoteTime > this.audioCtx.currentTime + 1.0) {
        this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    }

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.advanceNote();
    }
    
    this.scheduleTimer = window.setTimeout(this.scheduler, this.lookahead);
  };

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Advance by a 16th note
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.audioCtx || !this.musicGain) return;

    // --- Bass Line (Sawtooth) ---
    // Shifted UP an octave for better visibility on laptop speakers (E2 ~ 82Hz)
    // Driving 8th note bass: E - E - E - G - E - E - A - G
    if (beatNumber % 2 === 0) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.musicGain);

      // Bass Pattern Frequencies (approx E2, G2, A2)
      // E2 = 82.41, G2 = 98.00, A2 = 110.00
      const noteMap = [
        82.41, 82.41, 82.41, 98.00, // E E E G
        82.41, 82.41, 110.00, 98.00  // E E A G
      ];
      const noteIndex = Math.floor(beatNumber / 2) % 8;
      
      osc.type = 'sawtooth';
      osc.frequency.value = noteMap[noteIndex];

      // Plucky Envelope
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.2);
    }

    // --- Percussion / High Hat ---
    // Every off-beat 16th
    if (beatNumber % 4 === 2) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, time); // Higher pitch for crisper sound
      
      // Very short blip
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      osc.start(time);
      osc.stop(time + 0.03);
    }

    // --- Snare / Clap Accent ---
    // Every beat 4 and 12 (backbeat)
    if (beatNumber === 4 || beatNumber === 12) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + 0.12);
      
      // Louder snare
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

      osc.start(time);
      osc.stop(time + 0.15);
    }
  }

  public playShoot() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  public playExplosion() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
  }

  public playCollect() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.2);
  }

  public playPowerUp() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    // Rising sequence for powerup
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
    osc.frequency.setValueAtTime(554, this.audioCtx.currentTime + 0.1); // C#
    osc.frequency.setValueAtTime(659, this.audioCtx.currentTime + 0.2); // E
    
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.4);
  }
  
  public playStart() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(440, now + 0.2);
    osc.frequency.setValueAtTime(880, now + 0.4);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(now + 1.0);
  }

  public playDash() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    
    // White noise-ish effect using frequency modulation or just a quick slide
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.2);
    
    // Lowpass filter sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.2);
  }

  public playBombPlant() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    // Short, mechanical blip
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.15);
  }

  public playSkill() {
    this.resume();
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    // Deep bass sweep
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, this.audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.8);
    
    // Crackle
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, this.audioCtx.currentTime);
    osc2.frequency.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.8);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.audioCtx.currentTime + 0.8);
    osc2.stop(this.audioCtx.currentTime + 0.8);
  }
}

export const soundService = new SoundService();
