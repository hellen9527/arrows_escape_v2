let context: AudioContext | null = null;
export function playSound(
  kind: 'escape' | 'block' | 'hint' | 'win',
  index = 0,
) {
  try {
    context ??= new AudioContext();
    const ctx = context;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const melody =
      kind === 'win'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'block'
          ? [170]
          : kind === 'hint'
            ? [587.33, 783.99]
            : [[392, 440, 523.25, 587.33, 659.25, 783.99][index % 6]];
    melody.forEach((hz, n) => {
      const start = ctx.currentTime + n * 0.095;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, start);
      if (kind === 'block')
        osc.frequency.exponentialRampToValueAtTime(100, start + 0.12);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        kind === 'block' ? 0.035 : 0.065,
        start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Sound is optional when the browser cannot provide an audio context. */
  }
}
