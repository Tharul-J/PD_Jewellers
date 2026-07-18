// One Euro Filter — adaptive low-pass for noisy real-time signals (hand-tracking landmarks).
// Low speed → strong smoothing (kills jitter); high speed → light smoothing (kills lag).
// Reference: Casiez, Roussel & Vogel, "1€ Filter" (CHI 2012).

class LowPass {
  private s: number | null = null;
  private y: number | null = null;
  filter(x: number, alpha: number) {
    this.s = this.s === null ? x : alpha * x + (1 - alpha) * this.s;
    this.y = x;
    return this.s;
  }
  has() { return this.y !== null; }
  last() { return this.y as number; }
  reset() { this.s = null; this.y = null; }
}

export class OneEuroFilter {
  private xf = new LowPass();
  private dxf = new LowPass();
  private lastT: number | null = null;
  constructor(private freq = 60, private minCutoff = 1.2, private beta = 0.02, private dCutoff = 1.0) {}
  private alpha(cutoff: number) {
    const te = 1 / this.freq;
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }
  filter(x: number, tSeconds?: number) {
    if (this.lastT != null && tSeconds != null && tSeconds > this.lastT)
      this.freq = 1 / (tSeconds - this.lastT);
    if (tSeconds != null) this.lastT = tSeconds;
    const dx = this.xf.has() ? (x - this.xf.last()) * this.freq : 0;
    const edx = this.dxf.filter(dx, this.alpha(this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xf.filter(x, this.alpha(cutoff));
  }
  reset() { this.xf.reset(); this.dxf.reset(); this.lastT = null; }
}

// Vec3 helper: one filter per axis
export class Vec3Filter {
  private fx = new OneEuroFilter();
  private fy = new OneEuroFilter();
  private fz = new OneEuroFilter();
  filter(v: {x:number;y:number;z:number}, t?: number) {
    return { x: this.fx.filter(v.x, t), y: this.fy.filter(v.y, t), z: this.fz.filter(v.z, t) };
  }
  reset() { this.fx.reset(); this.fy.reset(); this.fz.reset(); }
}
