type Sound = "message" | "ragdoll-impact" | "footsteps";
/** Se desbloquea con un gesto del usuario; cada impacto modula volumen y tono. */
export class SocialAudio {
  private context?: AudioContext;
  private buffers = new Map<Sound, Promise<AudioBuffer | null>>();
  private last = new Map<Sound, number>();
  unlock = () => {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
    for (const name of ["message", "ragdoll-impact", "footsteps"] as Sound[])
      this.load(name);
  };
  private load(name: Sound) {
    if (!this.buffers.has(name))
      this.buffers.set(
        name,
        fetch(`/assets/audio/${name}.mp3`)
          .then((r) => {
            if (!r.ok) throw new Error("audio");
            return r.arrayBuffer();
          })
          .then((data) => this.context!.decodeAudioData(data))
          .catch(() => null),
      );
    return this.buffers.get(name)!;
  }
  play(name: Sound, volume = 0.3, rate = 1) {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const now = performance.now();
    if (
      now - (this.last.get(name) ?? -Infinity) <
      (name === "ragdoll-impact" ? 180 : 120)
    )
      return;
    this.last.set(name, now);
    void this.load(name).then((buffer) => {
      if (!buffer || context.state !== "running") return;
      const source = context.createBufferSource(),
        gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      // La grabación ragdoll se usa en fragmentos, únicamente cuando hay un impacto físico.
      source.start(
        0,
        0,
        name === "ragdoll-impact"
          ? Math.min(0.38, buffer.duration)
          : name === "footsteps"
            ? Math.min(0.22, buffer.duration)
            : buffer.duration,
      );
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
    });
  }
}
