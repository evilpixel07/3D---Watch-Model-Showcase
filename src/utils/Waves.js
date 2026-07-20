
class Grad {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  dot2(x, y) { return this.x * x + this.y * y; }
}

class Noise {
  constructor(seed = 0) {
    this.grad3 = [
      new Grad(1,1,0), new Grad(-1,1,0), new Grad(1,-1,0), new Grad(-1,-1,0),
      new Grad(1,0,1), new Grad(-1,0,1), new Grad(1,0,-1), new Grad(-1,0,-1),
      new Grad(0,1,1), new Grad(0,-1,1), new Grad(0,1,-1), new Grad(0,-1,-1)
    ];
    this.p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    this.perm = new Array(512);
    this.gradP = new Array(512);
    this.seed(seed);
  }
  seed(seed) {
    if (seed > 0 && seed < 1) seed *= 65536;
    seed = Math.floor(seed);
    if (seed < 256) seed |= seed << 8;
    for (let i = 0; i < 256; i++) {
      let v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return (1 - t) * a + t * b; }
  perlin2(x, y) {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y;
    X &= 255; Y &= 255;
    const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
    const u = this.fade(x);
    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
  }
}

// ─── Waves class ──
export default class Waves {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.opts = {
      lineColor:       '#B7BEC2',
      waveSpeedX:      0.008,
      waveSpeedY:      0.003,
      waveAmpX:        24,
      waveAmpY:        12,
      xGap:            40,
      yGap:            40,
      friction:        0.925,
      tension:         0.005,
      maxCursorMove:   80,
      ...opts
    };

    this.noise = new Noise(Math.random());
    this.lines = [];
    this.totalLines = 0;   // for horizontal pass
    this.totalPoints = 0;   // for horizontal pass
    this.mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
    this.frameId = null;
    this.bounding = { width: 0, height: 0, left: 0, top: 0 };

    this._onResize = this._onResize.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._tick = this._tick.bind(this);

    this._init();
  }

  _init() {
    this._setSize();
    this._setLines();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.frameId = requestAnimationFrame(this._tick);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('touchmove', this._onTouchMove);
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.lines = [];
  }

  _setSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.bounding = { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  _setLines() {
    const { width, height } = this.bounding;
    this.lines = [];
    const oWidth = width + 200, oHeight = height + 30;
    const { xGap, yGap } = this.opts;
    this.totalLines = Math.ceil(oWidth / xGap);
    this.totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * this.totalLines) / 2;
    const yStart = (height - yGap * this.totalPoints) / 2;
    for (let i = 0; i <= this.totalLines; i++) {
      const pts = [];
      for (let j = 0; j <= this.totalPoints; j++) {
        pts.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
      }
      this.lines.push(pts);
    }
  }

  _movePoints(time) {
    const { waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove } = this.opts;
    this.lines.forEach(pts => {
      pts.forEach(p => {
        const move = this.noise.perlin2(
          (p.x + time * waveSpeedX) * 0.002,
          (p.y + time * waveSpeedY) * 0.0015
        ) * 12;
        p.wave.x = Math.cos(move) * waveAmpX;
        p.wave.y = Math.sin(move) * waveAmpY;

        const dx = p.x - this.mouse.sx, dy = p.y - this.mouse.sy;
        const dist = Math.hypot(dx, dy), l = Math.max(175, this.mouse.vs);
        if (dist < l) {
          const s = 1 - dist / l;
          const f = Math.cos(dist * 0.001) * s;
          p.cursor.vx += Math.cos(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
          p.cursor.vy += Math.sin(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
        }

        p.cursor.vx += (0 - p.cursor.x) * tension;
        p.cursor.vy += (0 - p.cursor.y) * tension;
        p.cursor.vx *= friction;
        p.cursor.vy *= friction;
        p.cursor.x += p.cursor.vx * 2;
        p.cursor.y += p.cursor.vy * 2;
        p.cursor.x = Math.min(maxCursorMove, Math.max(-maxCursorMove, p.cursor.x));
        p.cursor.y = Math.min(maxCursorMove, Math.max(-maxCursorMove, p.cursor.y));
      });
    });
  }

  _moved(point, withCursor = true) {
    return {
      x: Math.round((point.x + point.wave.x + (withCursor ? point.cursor.x : 0)) * 10) / 10,
      y: Math.round((point.y + point.wave.y + (withCursor ? point.cursor.y : 0)) * 10) / 10
    };
  }

  _drawLines() {
    const { width, height } = this.bounding;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = this.opts.lineColor;

    ctx.beginPath();

    // ── Vertical pass (columns) ──
    for (let i = 0; i < this.lines.length; i++) {
      const pts = this.lines[i];
      if (pts.length === 0) continue;
      let p1 = this._moved(pts[0], false);
      ctx.moveTo(p1.x, p1.y);
      for (let j = 0; j < pts.length; j++) {
        const isLast = j === pts.length - 1;
        p1 = this._moved(pts[j], !isLast);
        ctx.lineTo(p1.x, p1.y);
      }
    }

    // ── Horizontal pass (rows) ──
    for (let j = 0; j <= this.totalPoints; j++) {
      if (this.lines.length === 0) continue;
      let p1 = this._moved(this.lines[0][j], false);
      ctx.moveTo(p1.x, p1.y);
      for (let i = 0; i < this.lines.length; i++) {
        const isLast = i === this.lines.length - 1;
        p1 = this._moved(this.lines[i][j], !isLast);
        ctx.lineTo(p1.x, p1.y);
      }
    }

    ctx.stroke();
  }

  _tick(t) {
    const m = this.mouse;
    m.sx += (m.x - m.sx) * 0.1;
    m.sy += (m.y - m.sy) * 0.1;
    const dx = m.x - m.lx, dy = m.y - m.ly;
    const d = Math.hypot(dx, dy);
    m.v = d;
    m.vs += (d - m.vs) * 0.1;
    m.vs = Math.min(100, m.vs);
    m.lx = m.x; m.ly = m.y;
    m.a = Math.atan2(dy, dx);

    this._movePoints(t);
    this._drawLines();
    this.frameId = requestAnimationFrame(this._tick);
  }

  _onResize() {
    this._setSize();
    this._setLines();
  }

  _onMouseMove(e) { this._updateMouse(e.clientX, e.clientY); }
  _onTouchMove(e) { const t = e.touches[0]; this._updateMouse(t.clientX, t.clientY); }

  _updateMouse(x, y) {
    const b = this.bounding;
    this.mouse.x = x - b.left;
    this.mouse.y = y - b.top;
    if (!this.mouse.set) {
      this.mouse.sx = this.mouse.x;
      this.mouse.sy = this.mouse.y;
      this.mouse.lx = this.mouse.x;
      this.mouse.ly = this.mouse.y;
      this.mouse.set = true;
    }
  }
}