"use client";
import React from "react";

// Medir Poliducto — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "mp14-" para no chocar con otros componentes.

const MedirPoliducto_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes mp14-pol-pulse{0%,100%{opacity:.45}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.mp14-root svg *{animation:none !important}}";

const STEPS = [
  ['Abre el rollo por un extremo', 'Abre el plástico sólo por la parte de arriba y quita el fleje de arriba. Deja el fleje de los lados: así el poliducto se queda contenido y el rollo no se desarma.'],
  ['Busca la punta del centro y mide', 'Toma siempre el extremo del poliducto que está en el centro del rollo, nunca el de afuera. Sácalo por la abertura y empieza a medir desde ahí.'],
  ['Medidas largas: el rollo al piso', 'Para medidas largas, de 5 a 50 metros, baja el rollo y colócalo en el piso.'],
  ['Gira el rollo para evitar enredos', 'Ve girando el rollo mientras sale la manguera: así sale derecha y no se enreda.'],
  ['Apóyate con otra persona', 'Una persona gira el rollo y la otra jala la punta y lleva la medida.']
];
const DUR = [6200, 6200, 4800, 6400, 7200];

class MedirPoliducto extends React.Component {
  state = { st: -1, t: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; cancelAnimationFrame(this.raf); this.raf = 0; }
  tick = () => {
    const t = (performance.now() - this.t0) / 1000;
    this.setState({ t });
    if (t < this.tMax) this.raf = requestAnimationFrame(this.tick); else this.raf = 0;
  };
  enter(k, at) {
    this.T.push(setTimeout(() => {
      cancelAnimationFrame(this.raf);
      this.t0 = performance.now(); this.tMax = k >= 3 ? 20 : DUR[k] / 1000 + .3;
      this.setState({ st: k, t: 0 });
      this.raf = requestAnimationFrame(this.tick);
    }, at));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: STEPS.length - 1, t: 99 }); return; }
    this.setState({ st: -1, t: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, k = Math.max(0, st), t = st < 0 ? 0 : this.state.t;
    const sans = 'Geist, sans-serif', mono = 'Geist Mono, monospace', RED = '#DB011C', OK = '#1E9E55', MUT = '#5C5F63';
    const OR = '#F26B1D', ORD = '#D9581A', ORK = '#B4440F', SK = '#C68B5E', PANTS = '#2B3035';
    const cl = (v, a, b) => Math.min(b, Math.max(a, v)), seg = (a, b) => cl((t - a) / (b - a), 0, 1);
    const ease = s => s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    const rad = a => a * Math.PI / 180;
    const pop = (on, d) => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .45s ease ' + (d || 0) + 's, transform .45s cubic-bezier(.3,1.4,.5,1) ' + (d || 0) + 's' });
    const chip = (key, cx0, y, txt, bg, fg, on) => { const w = 18 + txt.length * 6.2; return h('g', { key, style: pop(on) }, h('rect', { x: cx0 - w / 2, y, width: w, height: 22, rx: 11, fill: bg }), h('text', { x: cx0, y: y + 15, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: sans }, txt)); };
    const RX = 40, RY = 14, HH = 18;
    const roll = (key, cx, ty, o) => {
      const P = (a, rx, ry) => [cx + (rx || RX) * Math.cos(rad(a)), ty + (ry || RY) * Math.sin(rad(a))];
      const kids = [h('path', { key: 'sb', d: 'M' + (cx - RX) + ' ' + ty + ' V' + (ty + HH) + ' A' + RX + ' ' + RY + ' 0 0 0 ' + (cx + RX) + ' ' + (ty + HH) + ' V' + ty + ' Z', fill: ORD })];
      const off = (((o.rot || 0) / 360 * 2 * Math.PI * RX) % 6 + 6) % 6;
      for (let x = cx - RX + 2 + off; x < cx + RX - 1; x += 6) { const yy = RY * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / RX, 2))); kids.push(h('line', { key: 'c' + x.toFixed(1), x1: x, y1: ty + yy, x2: x, y2: ty + yy + HH, stroke: ORK, strokeWidth: 1.4, opacity: .55 })); }
      kids.push(h('path', { key: 'sbp', d: 'M' + (cx - RX) + ' ' + ty + ' V' + (ty + HH) + ' A' + RX + ' ' + RY + ' 0 0 0 ' + (cx + RX) + ' ' + (ty + HH) + ' V' + ty + ' Z', fill: '#FFFFFF', opacity: .18 }));
      kids.push(h('ellipse', { key: 'tf', cx, cy: ty, rx: RX, ry: RY, fill: OR }));
      [34, 28, 22].forEach(r => kids.push(h('ellipse', { key: 'r' + r, cx, cy: ty, rx: r, ry: r * RY / RX, fill: 'none', stroke: ORK, strokeWidth: 1.3, opacity: .7 })));
      kids.push(h('ellipse', { key: 'ho', cx, cy: ty, rx: 16, ry: 5.6, fill: '#7A2E08' }));
      if (o.open) {
        kids.push(h('ellipse', { key: 'rim', cx, cy: ty, rx: RX - 1.5, ry: RY - .5, fill: 'none', stroke: '#FFFFFF', strokeWidth: 3, opacity: .5 }));
        const fo = o.flap == null ? 0 : o.flap;
        if (fo > 0) kids.push(h('g', { key: 'lid', opacity: fo, transform: 'translate(' + (10 * (1 - fo)) + ' ' + (-30 * (1 - fo)) + ')' }, h('ellipse', { cx, cy: ty, rx: 36, ry: 12.6, fill: '#FFFFFF', fillOpacity: .6, stroke: '#FFFFFF', strokeWidth: 1.5 }),
          [90, 210, 330].map(a0 => { const a = a0 + (o.rot || 0), [ix, iy] = P(a, 16, 5.6), [ox, oy] = P(a); return h('path', { key: a0, d: 'M' + ix + ' ' + iy + ' L' + ox + ' ' + oy, stroke: '#FFFFFF', strokeWidth: 3, strokeLinecap: 'round' }); })));
      } else kids.push(h('ellipse', { key: 'pl', cx, cy: ty, rx: RX, ry: RY, fill: '#FFFFFF', opacity: .32 }));
      kids.push(h('path', { key: 'hl', d: 'M' + P(200)[0] + ' ' + P(200)[1] + ' A' + RX + ' ' + RY + ' 0 0 1 ' + P(250)[0] + ' ' + P(250)[1], fill: 'none', stroke: '#FFFFFF', strokeWidth: 2.5, opacity: .75 }));
      [90, 210, 330].forEach(a0 => { const a = a0 + (o.rot || 0), [ix, iy] = P(a, 16, 5.6), [ox, oy] = P(a); const front = Math.sin(rad(a)) > .15;
        if (o.open && !front) return;
        kids.push(h('path', { key: 'st' + a0, d: o.open ? 'M' + ox + ' ' + oy + ' L' + ox + ' ' + (oy + HH) : 'M' + ix + ' ' + iy + ' L' + ox + ' ' + oy + (front ? ' L' + ox + ' ' + (oy + HH) : ''), fill: 'none', stroke: '#FFFFFF', strokeWidth: 3, strokeLinejoin: 'round', opacity: .95 })); });
      if (o.cut > 0) { let d = ''; for (let i = 0; i <= 48; i++) { const a = rad(200 - 360 * o.cut * (1 - i / 48)); d += (i ? ' L' : 'M') + (cx + 36 * Math.cos(a)).toFixed(1) + ' ' + (ty + 12.6 * Math.sin(a)).toFixed(1); }
        kids.push(h('path', { key: 'cut', d, fill: 'none', stroke: RED, strokeWidth: 2, strokeLinejoin: 'round' })); }
      return h('g', { key }, kids);
    };
    const hose = (key, d) => h('g', { key }, h('path', { d, fill: 'none', stroke: ORK, strokeWidth: 8, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d, fill: 'none', stroke: OR, strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d, fill: 'none', stroke: ORK, strokeWidth: 6, strokeDasharray: '1.4 3', opacity: .55 }));
    const person = (key, o) => {
      const x = o.x, fy = 230, f = o.face || 1;
      let hip, sh, hd, legs;
      if (o.pose === 'kneel') {
        hip = [x, fy - 32]; sh = [x + f * 8, fy - 72]; hd = [x + f * 11, fy - 86];
        legs = [[[x - f * 2, fy - 4], [x - f * 22, fy - 4]], [[x + f * 18, fy - 30], [x + f * 18, fy - 2]]];
      } else {
        const s = o.walk ? Math.sin(o.walk) * 9 : 0;
        hip = [x, fy - 50]; sh = [x + f, fy - 92]; hd = [x + f * 2, fy - 106];
        legs = [[[x - 2 - s * .4, fy - 25], [x - 5 - s, fy - 2]], [[x + 2 + s * .4, fy - 25], [x + 5 + s, fy - 2]]];
      }
      const leg = (lg, i) => h('g', { key: 'l' + i }, h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + lg[0][0] + ' ' + lg[0][1] + ' L' + lg[1][0] + ' ' + lg[1][1], fill: 'none', stroke: PANTS, strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d: 'M' + (lg[1][0] - f * 2) + ' ' + (lg[1][1] + 1) + ' h' + (f * 9), stroke: '#141414', strokeWidth: 5, strokeLinecap: 'round' }));
      const arm = (hp, i) => {
        const ax = sh[0], ay = sh[1] + 4, reach = 60; let dx = hp[0] - ax, dy = hp[1] - ay, L = Math.hypot(dx, dy) || 1;
        let hx = hp[0], hy = hp[1]; if (L > reach) { hx = ax + dx / L * reach; hy = ay + dy / L * reach; dx = hx - ax; dy = hy - ay; L = reach; }
        const b = Math.sqrt(Math.max(0, Math.pow(reach / 2, 2) - Math.pow(L / 2, 2)));
        let px = -dy / L, py = dx / L; if (py < 0) { px = -px; py = -py; }
        const ex = (ax + hx) / 2 + px * b, ey = (ay + hy) / 2 + py * b;
        return h('g', { key: 'a' + i }, h('path', { d: 'M' + ax + ' ' + ay + ' L' + ex + ' ' + ey, stroke: o.shirt, strokeWidth: 7, strokeLinecap: 'round' }), h('path', { d: 'M' + ex + ' ' + ey + ' L' + hx + ' ' + hy, stroke: SK, strokeWidth: 5.5, strokeLinecap: 'round' }), h('circle', { cx: hx, cy: hy, r: 3.8, fill: SK }));
      };
      const head = h('g', { key: 'hd' }, h('circle', { cx: hd[0], cy: hd[1], r: 10, fill: SK }),
        h('path', { d: 'M' + (hd[0] - 10.5) + ' ' + (hd[1] - 1) + ' A10.5 10.5 0 0 1 ' + (hd[0] + 10.5) + ' ' + (hd[1] - 1) + ' Z', fill: o.cap }),
        h('path', { d: 'M' + (hd[0] + f * 5) + ' ' + (hd[1] - 2) + ' h' + (f * 9), stroke: o.cap, strokeWidth: 3, strokeLinecap: 'round' }),
        h('circle', { cx: hd[0] + f * 5, cy: hd[1] + 2, r: 1.3, fill: '#141414' }));
      const body = h('g', { key: key + 'b' }, leg(legs[0], 0), arm(o.hands[1], 1), h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + sh[0] + ' ' + (sh[1] + 6), stroke: o.shirt, strokeWidth: 19, strokeLinecap: 'round' }), leg(legs[1], 1), head);
      return [body, h('g', { key: key + 'f' }, arm(o.hands[0], 0))];
    };
    const floor = h('line', { key: 'fl', x1: 0, y1: 230, x2: 400, y2: 230, stroke: '#EAD7C8', strokeWidth: 2 });
    const counter = op => h('g', { key: 'ct', style: { opacity: op } }, h('rect', { x: 80, y: 176, width: 240, height: 57, fill: '#F3F4F5', stroke: '#B9C0C6', strokeWidth: 1.5 }), h('rect', { x: 74, y: 168, width: 252, height: 10, rx: 3, fill: '#D5DADF', stroke: '#9AA0A6', strokeWidth: 1.2 }));
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: cómo medir poliducto', style: { display: 'block', width: '100%', height: 'auto' } }, kids);
    const P1 = { shirt: RED, cap: PANTS }, P2 = { shirt: '#1E6FC2', cap: RED };

    if (k === 0) {
      const cx = 250, ty = 136, cs = seg(1, 3.4), a = 200, hx = cx + 36 * Math.cos(rad(a)), hy = ty + 12.6 * Math.sin(rad(a));
      const cutting = t > .5 && t < 3.7, hand = cutting ? [hx, hy] : [214, 160];
      const [pb, pf] = person('p', Object.assign({ x: 178, face: 1, hands: [hand, [196, 166]] }, P1));
      const cutter = cutting ? h('g', { key: 'cu', transform: 'translate(' + hx + ' ' + hy + ') rotate(-35)' }, h('rect', { x: -12, y: -3, width: 14, height: 6, rx: 2, fill: '#FFC21A', stroke: '#B98A00', strokeWidth: .8 }), h('polygon', { points: '2,-2.5 9,0 2,2.5', fill: '#B9C0C6', stroke: '#7E868D', strokeWidth: .6 })) : null;
      return svg([floor, pb, counter(1), roll('r', cx, ty, { open: t > 3.4, cut: t > 3.4 ? 0 : cs, rot: -360 * cs, flap: 1 - seg(3.6, 4.4) }), pf, cutter,
        chip('c1', 110, 50, '✓ Abre sólo la parte de arriba', RED, '#FFFFFF', t > 4.2),
        h('path', { key: 'l1', d: 'M150 72 L238 130', stroke: RED, strokeWidth: 1.4, style: { opacity: t > 4.2 ? 1 : 0, transition: 'opacity .4s' } }),
        chip('c2', 290, 92, '✓ El fleje de los lados se queda', OK, '#FFFFFF', t > 4.8),
        h('path', { key: 'l2', d: 'M290 114 L252 158', stroke: OK, strokeWidth: 1.4, style: { opacity: t > 4.8 ? 1 : 0, transition: 'opacity .4s' } })]);
    }
    if (k === 1) {
      const cx = 250, ty = 136;
      const W = [[0, [214, 162]], [.4, [214, 162]], [1.4, [248, 136]], [2.2, [232, 108]], [2.9, [214, 162]], [3.2, [214, 162]], [5.8, [114, 162]]];
      let hx = 114, hy = 162;
      for (let i = 1; i < W.length; i++) if (t <= W[i][0]) { const s = ease(cl((t - W[i - 1][0]) / (W[i][0] - W[i - 1][0] || 1), 0, 1)); hx = W[i - 1][1][0] + (W[i][1][0] - W[i - 1][1][0]) * s; hy = W[i - 1][1][1] + (W[i][1][1] - W[i - 1][1][1]) * s; break; }
      const sw = ease(seg(3.2, 5.8)), px = 188 - 90 * sw;
      const d = t >= 2.9 ? 'M250 136 C250 110 218 120 214 162 L' + hx + ' 162' : 'M250 136 C250 116 ' + (hx + 10) + ' ' + (hy - 24) + ' ' + hx + ' ' + hy;
      const [pb, pf] = person('p', Object.assign({ x: px, face: t > 3.2 ? -1 : 1, walk: sw > 0 && sw < 1 ? t * 9 : 0, hands: [[hx, hy], [hx + (t > 3.2 ? 12 : -14), hy + 4]] }, P1));
      const ticks = []; for (let x = 214, i = 0; x >= 114; x -= 10, i++) ticks.push(h('line', { key: x, x1: x, y1: 168, x2: x, y2: i % 5 ? 172 : 175, stroke: '#6B5200', strokeWidth: 1 }));
      const ruler = h('g', { key: 'ru', style: { opacity: t > .3 ? 1 : 0, transition: 'opacity .5s' } }, h('rect', { x: 100, y: 168, width: 118, height: 8, fill: '#FFD23F', stroke: '#B98A00', strokeWidth: .8 }), ticks,
        [[214, '0'], [164, '50 cm'], [114, '1 m']].map(([x, l]) => h('text', { key: l, x, y: 190, textAnchor: 'middle', fontSize: 9.5, fontWeight: 700, fill: '#6B5200', fontFamily: mono }, l)));
      const badOn = t > .4 && t < 3.2, fade = on => ({ opacity: on ? 1 : 0, transition: 'opacity .4s' });
      const badMark = h('g', { key: 'bm', style: fade(badOn) },
        h('circle', { cx: 291, cy: 146, r: 8, fill: '#FFFFFF', stroke: RED, strokeWidth: 2 }),
        h('text', { x: 291, y: 150, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: RED, fontFamily: sans }, '✗'));
      return svg([floor, pb, counter(1), ruler, roll('r', cx, ty, { open: true }), t >= 1.4 ? hose('h', d) : null, pf, badMark,
        chip('c1', 110, 50, '✓ Siempre la punta del centro', RED, '#FFFFFF', t > 1.6),
        h('path', { key: 'l1', d: 'M150 72 L246 134', stroke: RED, strokeWidth: 1.4, fill: 'none', style: fade(t > 1.6 && t < 3) }),
        chip('cb', 300, 92, '✗ Nunca la punta de afuera', '#FDE7EA', RED, badOn),
        h('path', { key: 'lb', d: 'M306 114 L295 140', stroke: RED, strokeWidth: 1.4, fill: 'none', style: fade(badOn) }),
        chip('c2', 300, 92, 'Midiendo: ' + Math.max(0, (214 - hx) / 100).toFixed(2) + ' m', '#141414', '#FFFFFF', t > 3.2)]);
    }
    if (k === 2) {
      const s = ease(seg(.8, 2.6)), cx = 250 - 110 * s, ty = 136 + 62 * s - 18 * Math.sin(Math.PI * s), rot = 180 * s;
      const kneel = t > 2.7, px = kneel ? 70 : cx - 70;
      const hands = kneel ? [[cx - 28, ty - 4], [cx - 36, ty + 6]] : [[cx - 32, ty + 4], [cx - 38, ty + 14]];
      const [pb, pf] = person('p', Object.assign({ x: px, face: 1, pose: kneel ? 'kneel' : 'stand', walk: s > 0 && s < 1 ? t * 9 : 0, hands }, P1));
      const sa = rad(180 + rot), sx = cx + 30 * Math.cos(sa), sy = ty + 10.5 * Math.sin(sa);
      return svg([floor, counter(1 - seg(0, .6)), pb, roll('r', cx, ty, { open: true, rot, srot: rot }), hose('h', 'M' + cx + ' ' + ty + ' q8 -14 22 -10'), pf,
        chip('c1', 200, 40, 'Medidas largas: 5 a 50 m', '#141414', '#FFFFFF', t > .4),
        chip('c2', 230, 78, '✓ Rollo en el piso', RED, '#FFFFFF', t > 2.9)]);
    }
    const cx = 140, ty = 198, rot = 180 + t * 80, hm = Math.sin(t * 3) * 14;
    const P = (a) => [cx + 36 * Math.cos(rad(a)), ty + 12.6 * Math.sin(rad(a))];
    const [pb, pf] = person('p', Object.assign({ x: 70, face: 1, pose: 'kneel', hands: [P(205 + hm), P(160 + hm)] }, P1));
    const arrows = h('g', { key: 'ar', style: { opacity: t > .4 ? 1 : 0, transition: 'opacity .5s' } },
      h('path', { d: 'M96 184 Q140 158 184 184', fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', style: { animation: 'mp14-pol-pulse 1.4s ease-in-out infinite' } }),
      h('path', { d: 'M184 184 l-11 -2 l6 -8 Z', fill: '#141414' }),
      h('path', { d: 'M184 240 Q140 254 96 240', fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', style: { animation: 'mp14-pol-pulse 1.4s ease-in-out infinite' } }),
      h('path', { d: 'M96 240 l11 -1 l-5 9 Z', fill: '#141414' }));
    const rl = roll('r', cx, ty, { open: true, rot, srot: 180 });
    if (k === 3) {
      const xe = 196 + 150 * ease(seg(.6, 5));
      const bad = h('g', { key: 'bad', style: pop(t > 2.6) },
        h('circle', { cx: 334, cy: 80, r: 42, fill: '#FFFFFF', stroke: RED, strokeWidth: 2 }),
        hose('hb', 'M306 96 C312 52 356 60 336 86 S302 110 322 70 S372 80 352 100 S312 96 346 64'),
        h('circle', { cx: 366, cy: 44, r: 11, fill: RED }),
        h('text', { x: 366, y: 48.5, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, '✗'),
        h('text', { x: 334, y: 140, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: RED, fontFamily: sans }, 'Sin girar, se enreda'));
      return svg([floor, pb, arrows, rl, hose('h', 'M140 198 C142 180 172 186 176 206 Q186 228 196 228 H' + xe), pf, bad,
        chip('c1', 84, 40, '✓ Gira el rollo', OK, '#FFFFFF', t > 1.2)]);
    }
    const s2 = ease(seg(.6, 5.2)), x2 = 210 + 150 * s2, walking = s2 > 0 && s2 < 1;
    const [qb, qf] = person('q', Object.assign({ x: x2, face: 1, walk: walking ? t * 8 : 0, hands: [[x2 + 12, 186 + (walking ? Math.sin(t * 8) * 4 : 0)], [x2 - 14, 184]] }, P2));
    const xh = Math.max(196, x2 - 34);
    return svg([floor, pb, arrows, rl, hose('h', 'M140 198 C142 180 172 186 176 206 Q186 228 196 228 H' + xh + ' Q' + (x2 - 18) + ' 228 ' + (x2 - 14) + ' 186'), pf, qb, qf,
      chip('c1', 70, 40, '1 · Gira el rollo', RED, '#FFFFFF', t > .3),
      chip('c2', Math.min(330, Math.max(120, x2)), 84, '2 · Jala y mide: ' + Math.round(50 * s2) + ' m', '#141414', '#FFFFFF', t > .6),
      chip('c3', 250, 40, '✓ Sin enredos', OK, '#FFFFFF', t > 5.4)]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st);
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, past = a || k < st;
        return { n: String(k + 1), t, d, lbl: k < 2 ? 'PASO ' + (k + 1) : 'MEDIDAS LARGAS · PASO ' + (k + 1),
          bd: a ? '#DB011C' : '#F2DCCB', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? '#DB011C' : '#F6E3D6', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, MedirPoliducto_CSS), h("section", { ref: v.rootRef, className: "mp14-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FFF4EC", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · INSTRUCCIÓN DE TRABAJO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Cómo medir poliducto"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Liso y corrugado, sin desarmar el rollo y sin que se enrede.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F2DCCB", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F6E3D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))), h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "16px", background: "#141414", color: "#FFFFFF" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#DB011C", fontWeight: "800" } }, "!"), h("span", { style: { fontWeight: "600", fontSize: "15px", lineHeight: "1.3" } }, "Cumplir y mantener conforme a este estándar."))))));
  }
}

export default MedirPoliducto;
