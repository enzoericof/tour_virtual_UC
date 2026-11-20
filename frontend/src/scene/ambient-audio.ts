import { ambientLevels, type AmbientLevels, type AmbientTheme } from "./ambient-zones";

/**
 * Sonido ambiente sintetizado con Web Audio: pajaritos en los jardines, conversaciones
 * en la cantina y la plaza techada, y el murmullo de las clases detrás de las paredes.
 *
 * No usa grabaciones: cada fuente es un conjunto acotado de osciladores y ruido filtrado,
 * así que no suma descargas ni licencias. El contexto se crea con el primer gesto del
 * visitante (igual que el ascensor) y el volumen de cada familia sale de las zonas.
 */

const KINDS = ["birds", "chatter", "murmur", "crickets"] as const;
type OneShot = "birds" | "chatter" | "murmur";
/** Volumen máximo de cada familia sobre el nivel de zona (0..1). */
const VOLUME: Record<(typeof KINDS)[number], number> = {
  birds: 0.5,
  chatter: 0.38,
  murmur: 0.5,
  crickets: 0.14,
};
/** Apariciones por segundo con la zona al máximo: se reparten con el reloj del audio. */
const RATE: Record<OneShot, number> = { birds: 0.85, chatter: 1.1, murmur: 2.4 };
/** Cada cuánto se recalculan las zonas, en segundos: a 4 m/s el caminante avanza medio metro. */
const MIX_STEP = 0.12;

type BedOptions = {
  kind: "chatter" | "murmur";
  filter: BiquadFilterType;
  frequency: number;
  Q: number;
  volume: number;
  /** Frecuencia del vaivén y cuánto sube y baja el volumen (0..1). */
  tremolo: readonly [number, number];
};

export class AmbientAudio {
  private context: AudioContext | null = null;
  private enabled = true;
  private theme: AmbientTheme = "light";
  private gains = {} as Record<(typeof KINDS)[number], GainNode>;
  private levels: AmbientLevels = { birds: 0, chatter: 0, murmur: 0, crickets: 0 };
  private pending: Record<OneShot, number> = { birds: 0, chatter: 0, murmur: 0 };
  private mix = 0;
  private noise: AudioBuffer | null = null;

  /** Llamar desde un gesto del visitante: crea o reanuda el contexto de audio. */
  unlock() {
    if (!this.context) {
      if (typeof AudioContext === "undefined") return;
      this.create(new AudioContext());
    }
    if (this.context!.state === "suspended") void this.context!.resume().catch(() => {});
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setTheme(theme: AmbientTheme) {
    this.theme = theme;
  }

  /**
   * `audible` apaga el ambiente en la vista general o mientras el visitante no camina;
   * las ganancias se mueven con `setTargetAtTime`, sin cortes.
   */
  update(position: { x: number; y: number; z: number }, dt: number, audible: boolean) {
    const context = this.context;
    if (!context || context.state !== "running" || dt <= 0) return;
    this.mix -= dt;
    if (this.mix <= 0) {
      this.mix = MIX_STEP;
      this.levels = ambientLevels(position, this.theme);
      const target = this.enabled && audible ? 1 : 0;
      const now = context.currentTime;
      for (const kind of KINDS)
        this.gains[kind].gain.setTargetAtTime(target * VOLUME[kind] * this.levels[kind], now, 0.4);
    }
    if (!this.enabled || !audible) return;
    for (const kind of ["birds", "chatter", "murmur"] as OneShot[]) this.schedule(kind, dt);
  }

  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private schedule(kind: OneShot, dt: number) {
    const rate = this.levels[kind] * RATE[kind];
    if (rate <= 0.01) {
      this.pending[kind] = 0;
      return;
    }
    this.pending[kind] += dt * rate;
    if (this.pending[kind] < 1) return;
    this.pending[kind] = 0;
    if (kind === "birds") this.chirp(this.levels[kind]);
    else this.voice(kind, this.levels[kind]);
  }

  private create(context: AudioContext) {
    this.context = context;
    const master = context.createGain();
    master.gain.value = 0.85;
    master.connect(context.destination);
    for (const kind of KINDS) {
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      this.gains[kind] = gain;
    }
    // Lechos continuos: ruido filtrado con un vaivén lento, como un murmullo de fondo.
    this.bed(context, { kind: "chatter", filter: "bandpass", frequency: 820, Q: 0.7, volume: 0.45, tremolo: [0.31, 0.35] });
    this.bed(context, { kind: "murmur", filter: "lowpass", frequency: 300, Q: 0.9, volume: 0.5, tremolo: [0.63, 0.4] });
    this.crickets(context);
  }

  /** Ruido continuo filtrado: es la base de las voces lejanas y del murmullo de clases. */
  private bed(context: AudioContext, options: BedOptions) {
    this.noise ??= this.noiseBuffer(context);
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = options.filter;
    filter.frequency.value = options.frequency;
    filter.Q.value = options.Q;
    const gain = context.createGain();
    gain.gain.value = options.volume;
    const lfo = context.createOscillator();
    lfo.frequency.value = options.tremolo[0];
    const depth = context.createGain();
    depth.gain.value = options.tremolo[1] * options.volume;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(this.gains[options.kind]);
    source.start();
    lfo.start();
  }

  /** Grillos: un tono agudo con pulsos rápidos y otro vaivén lento. */
  private crickets(context: AudioContext) {
    const tone = context.createOscillator();
    tone.type = "triangle";
    tone.frequency.value = 4300;
    const pulses = context.createGain();
    pulses.gain.value = 0.45;
    const pulse = context.createOscillator();
    pulse.type = "square";
    pulse.frequency.value = 19;
    const depth = context.createGain();
    depth.gain.value = 0.45;
    pulse.connect(depth).connect(pulses.gain);
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 4300;
    filter.Q.value = 2;
    const volume = context.createGain();
    volume.gain.value = 0.4;
    tone.connect(filter).connect(pulses).connect(volume).connect(this.gains.crickets);
    tone.start();
    pulse.start();
  }

  private noiseBuffer(context: AudioContext) {
    const length = Math.floor(context.sampleRate * 2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Pío corto: una a tres notas con barrido ascendente y panorámica al azar. */
  private chirp(level: number) {
    const context = this.context!;
    const pan = context.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    pan.connect(this.gains.birds);
    const notes = 1 + Math.floor(Math.random() * 3);
    const base = 2200 + Math.random() * 1400;
    let time = context.currentTime;
    let last: OscillatorNode | null = null;
    for (let i = 0; i < notes; i++) {
      const length = 0.06 + Math.random() * 0.05;
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), time);
      osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), time + length * 0.7);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(0.35 + level * 0.4, time + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + length);
      osc.connect(envelope).connect(pan);
      osc.start(time);
      osc.stop(time + length + 0.02);
      last = osc;
      time += length + 0.05;
    }
    last!.onended = () => {
      last!.disconnect();
      pan.disconnect();
    };
  }

  /**
   * Una voz sin palabras: una sierra con formante y unas sílabas cortas. En la cantina
   * y la plaza suena a conversación; en las aulas pasa por un filtro grave, como una
   * clase del otro lado de la pared.
   */
  private voice(kind: "chatter" | "murmur", level: number) {
    const context = this.context!;
    const time = context.currentTime;
    const pan = context.createStereoPanner();
    pan.pan.value = (Math.random() * 1.6 - 0.8) * (kind === "chatter" ? 1 : 0.35);
    const osc = context.createOscillator();
    osc.type = "sawtooth";
    const pitch = kind === "chatter" ? 105 + Math.random() * 70 : 85 + Math.random() * 45;
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.linearRampToValueAtTime(pitch * (0.85 + Math.random() * 0.3), time + 0.4);
    const formant = context.createBiquadFilter();
    formant.type = "bandpass";
    formant.frequency.value = kind === "chatter" ? 520 + Math.random() * 520 : 420 + Math.random() * 180;
    formant.Q.value = kind === "chatter" ? 6 : 4;
    const muffled = context.createBiquadFilter();
    muffled.type = "lowpass";
    muffled.frequency.value = kind === "chatter" ? 2400 : 340;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, time);
    const syllables = 2 + Math.floor(Math.random() * 3);
    const length = 0.09 + Math.random() * 0.07;
    let cursor = time;
    for (let i = 0; i < syllables; i++) {
      envelope.gain.linearRampToValueAtTime((0.4 + level * 0.5) * (0.6 + Math.random() * 0.4), cursor + length * 0.4);
      envelope.gain.linearRampToValueAtTime(0.01, cursor + length);
      cursor += length + 0.03;
    }
    envelope.gain.linearRampToValueAtTime(0, cursor + 0.06);
    osc.connect(formant).connect(muffled).connect(envelope).connect(pan).connect(this.gains[kind]);
    osc.start(time);
    osc.stop(cursor + 0.08);
    osc.onended = () => {
      osc.disconnect();
      formant.disconnect();
      muffled.disconnect();
      envelope.disconnect();
      pan.disconnect();
    };
  }
}
