"use client";
import React from "react";

// Medir Manguera Nivel — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "mmn18-" para no chocar con otros componentes.

const MedirMangueraNivel_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes mmn18-mn-pulse{0%,100%{opacity:.45}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.mmn18-root svg *{animation:none !important}}";

const STEPS = [
  ['Abre el rollo por un extremo', 'Abre el plástico sólo por la parte de arriba y quita el fleje de arriba. Deja el fleje de los lados: así la manguera se queda contenida y el rollo no se desarma.'],
  ['Busca la punta del centro y mide', 'Toma siempre el extremo de la manguera que está en el centro del rollo, nunca el de afuera. Sácalo por la abertura y empieza a medir desde ahí.'],
  ['Medidas largas: el rollo al piso', 'Para medidas largas, de 5 a 50 metros, baja el rollo y colócalo en el piso.'],
  ['Gira el rollo para evitar enredos', 'Ve girando el rollo mientras sale la manguera: así sale derecha y no se enreda.'],
  ['Apóyate con otra persona', 'Una persona gira el rollo y la otra jala la punta y lleva la medida.'],
  ['En carrete despachador', 'Si la manguera está en el carrete, sólo estírala y mide.'],
  ['Para montarla en el rack', 'Primero vende manguera del centro del rollo. Así entra el tubo del carrete y puedes montar el rollo en el rack despachador.']
];
const DUR = [6200, 6200, 4800, 6400, 7200, 6200, 7600];

class MedirMangueraNivel extends React.Component {
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
      this.t0 = performance.now(); this.tMax = DUR[k] / 1000 + .3;
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
    const sans = 'Geist, sans-serif', mono = 'Geist Mono, monospace', RED = '#DB011C', OK = '#1E9E55';
    const G = '#DCEFF5', GD = '#B9D7E2', GK = '#7FA3B1', SK = '#C68B5E', PANTS = '#2B3035', STEEL = '#9AA0A6';
    const cl = (v, a, b) => Math.min(b, Math.max(a, v)), seg = (a, b) => cl((t - a) / (b - a), 0, 1);
    const ease = s => s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    const rad = a => a * Math.PI / 180;
    const pop = (on, d) => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .45s ease ' + (d || 0) + 's, transform .45s cubic-bezier(.3,1.4,.5,1) ' + (d || 0) + 's' });
    const chip = (key, cx0, y, txt, bg, fg, on) => { const w = 18 + txt.length * 6.2; return h('g', { key, style: pop(on) }, h('rect', { x: cx0 - w / 2, y, width: w, height: 22, rx: 11, fill: bg }), h('text', { x: cx0, y: y + 15, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: sans }, txt)); };
    const line = (key, d, c, on) => h('path', { key, d, stroke: c, strokeWidth: 1.4, fill: 'none', style: { opacity: on ? 1 : 0, transition: 'opacity .4s' } });
    const RX = 40, RY = 14, HH = 20;
    const roll = (key, cx, ty, o) => {
      const P = (a, rx, ry) => [cx + rx * Math.cos(rad(a)), ty + ry * Math.sin(rad(a))];
      const hr = o.hole || 16, side = 'M' + (cx - RX) + ' ' + ty + ' V' + (ty + HH) + ' A' + RX + ' ' + RY + ' 0 0 0 ' + (cx + RX) + ' ' + (ty + HH) + ' V' + ty + ' Z';
      const kids = [h('path', { key: 'sb', d: side, fill: GD })];
      for (let j = 1; j < 5; j++) { const y = ty + j * HH / 5; kids.push(h('path', { key: 'c' + j, d: 'M' + (cx - RX) + ' ' + y + ' A' + RX + ' ' + RY + ' 0 0 0 ' + (cx + RX) + ' ' + y, fill: 'none', stroke: GK, strokeWidth: 1.3, opacity: .6 })); }
      kids.push(h('path', { key: 'bt', d: side, fill: 'url(#mn-braid)' }));
      kids.push(h('path', { key: 'sp', d: side, fill: '#FFFFFF', opacity: .2 }));
      kids.push(h('ellipse', { key: 'tf', cx, cy: ty, rx: RX, ry: RY, fill: G }));
      kids.push(h('ellipse', { key: 'tb', cx, cy: ty, rx: RX, ry: RY, fill: 'url(#mn-braid)' }));
      [34, 28, 22].filter(r => r > hr + 3).forEach(r => kids.push(h('ellipse', { key: 'r' + r, cx, cy: ty, rx: r, ry: r * RY / RX, fill: 'none', stroke: GK, strokeWidth: 1.3, opacity: .7 })));
      kids.push(h('ellipse', { key: 'ho', cx, cy: ty, rx: hr, ry: hr * RY / RX, fill: '#6F95A3' }));
      if (o.open) kids.push(h('ellipse', { key: 'rim', cx, cy: ty, rx: RX - 1.5, ry: RY - .5, fill: 'none', stroke: '#FFFFFF', strokeWidth: 3, opacity: .5 }));
      else kids.push(h('ellipse', { key: 'pl', cx, cy: ty, rx: RX, ry: RY, fill: '#FFFFFF', opacity: .32 }));
      const [h1x, h1y] = P(200, RX, RY), [h2x, h2y] = P(250, RX, RY);
      kids.push(h('path', { key: 'hl', d: 'M' + h1x + ' ' + h1y + ' A' + RX + ' ' + RY + ' 0 0 1 ' + h2x + ' ' + h2y, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2.5, opacity: .75 }));
      const sty = { fill: 'none', stroke: '#FFFFFF', strokeWidth: 3, strokeLinejoin: 'round', opacity: .95 };
      [90, 210, 330].forEach(a0 => {
        const a = a0 + (o.rot || 0), [ix, iy] = P(a, hr + 1, (hr + 1) * RY / RX), [ox, oy] = P(a, RX, RY), front = Math.sin(rad(a)) > .15, down = front ? ' L' + ox + ' ' + (oy + HH) : '';
        if (o.open && !front) return;
        if (o.snip && a0 === 210) {
          const mx = (ix + ox) / 2, my = (iy + oy) / 2, L = Math.hypot(ix - ox, iy - oy) || 1, ux = (ix - ox) / L, uy = (iy - oy) / L;
          kids.push(h('path', Object.assign({ key: 'sa', d: 'M' + (mx - ux * 3) + ' ' + (my - uy * 3) + ' L' + ox + ' ' + oy + down }, sty)));
          kids.push(h('path', Object.assign({ key: 'sb2', d: 'M' + (mx + ux * 3) + ' ' + (my + uy * 3) + ' L' + ix + ' ' + iy }, sty)));
        } else kids.push(h('path', Object.assign({ key: 'st' + a0, d: o.open ? 'M' + ox + ' ' + oy + ' L' + ox + ' ' + (oy + HH) : 'M' + ix + ' ' + iy + ' L' + ox + ' ' + oy + down }, sty)));
      });
      if (o.cut > 0) { let d = ''; for (let i = 0; i <= 48; i++) { const a = rad(200 - 360 * o.cut * (1 - i / 48)); d += (i ? ' L' : 'M') + (cx + 36 * Math.cos(a)).toFixed(1) + ' ' + (ty + 12.6 * Math.sin(a)).toFixed(1); }
        kids.push(h('path', { key: 'cut', d, fill: 'none', stroke: RED, strokeWidth: 2, strokeLinejoin: 'round' })); }
      const fo = o.open && o.flap != null ? o.flap : 0;
      if (fo > 0) kids.push(h('g', { key: 'lid', opacity: fo, transform: 'translate(' + (10 * (1 - fo)) + ' ' + (-30 * (1 - fo)) + ')' }, h('ellipse', { cx, cy: ty, rx: 36, ry: 12.6, fill: '#FFFFFF', fillOpacity: .6, stroke: '#FFFFFF', strokeWidth: 1.5 }),
        [90, 210, 330].map(a0 => { const a = a0 + (o.rot || 0), [ix, iy] = P(a, hr + 1, (hr + 1) * RY / RX), [ox, oy] = P(a, RX, RY); return h('path', { key: a0, d: 'M' + ix + ' ' + iy + ' L' + ox + ' ' + oy, stroke: '#FFFFFF', strokeWidth: 3 }); })));
      return h('g', { key }, kids);
    };
    const hose = (key, d) => h('g', { key }, h('path', { d, fill: 'none', stroke: GK, strokeWidth: 8, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d, fill: 'none', stroke: G, strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d, fill: 'none', stroke: '#FFFFFF', strokeWidth: 1.8, opacity: .9 }));
    const spring = (x0, xe, yb, n, r) => { let d = ''; const N = n * 24; for (let i = 0; i <= N; i++) { const th = i / N * 2 * Math.PI * n; d += (i ? ' L' : 'M') + (x0 + (xe - x0) * i / N - r * Math.sin(th)).toFixed(1) + ' ' + (yb - r * (1 - Math.cos(th))).toFixed(1); } return d; };
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
    const P1 = { shirt: RED, cap: PANTS }, P2 = { shirt: '#1E6FC2', cap: RED };
    const floor = h('line', { key: 'fl', x1: 0, y1: 230, x2: 400, y2: 230, stroke: '#EAD7C8', strokeWidth: 2 });
    const counter = op => h('g', { key: 'ct', style: { opacity: op } }, h('rect', { x: 80, y: 176, width: 240, height: 57, fill: '#F3F4F5', stroke: '#B9C0C6', strokeWidth: 1.5 }), h('rect', { x: 74, y: 168, width: 252, height: 10, rx: 3, fill: '#D5DADF', stroke: STEEL, strokeWidth: 1.2 }));
    const defs = h('defs', { key: 'df' }, h('pattern', { id: 'mn-braid', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: '#FFFFFF', strokeWidth: .8, opacity: 0 })));
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: cómo medir manguera de nivel', style: { display: 'block', width: '100%', height: 'auto' } }, [defs].concat(kids));
    const scissors = (key, x, y, on, closed) => h('g', { key, transform: 'translate(' + x + ' ' + y + ') rotate(-25)', style: { opacity: on ? 1 : 0, transition: 'opacity .2s' } },
      h('path', { d: closed ? 'M0 0 L11 -1 M0 0 L11 1' : 'M0 0 L11 -5 M0 0 L11 5', stroke: '#7E868D', strokeWidth: 2.2, strokeLinecap: 'round' }),
      h('circle', { cx: -4.5, cy: -3.5, r: 3, fill: 'none', stroke: RED, strokeWidth: 1.8 }), h('circle', { cx: -4.5, cy: 3.5, r: 3, fill: 'none', stroke: RED, strokeWidth: 1.8 }));
    const meters = v => 'Midiendo: ' + v + ' m';

    if (k === 0) {
      const cx = 240, ty = 136, cs = seg(1, 3.4), hx = cx + 36 * Math.cos(rad(200)), hy = ty + 12.6 * Math.sin(rad(200));
      const cutting = t > .5 && t < 3.7, hand = cutting ? [hx, hy] : [210, 162];
      const [pb, pf] = person('p', Object.assign({ x: 182, face: 1, hands: [hand, [200, 166]] }, P1));
      const cutter = cutting ? h('g', { key: 'cu', transform: 'translate(' + hx + ' ' + hy + ') rotate(-35)' }, h('rect', { x: -12, y: -3, width: 14, height: 6, rx: 2, fill: '#FFC21A', stroke: '#B98A00', strokeWidth: .8 }), h('polygon', { points: '2,-2.5 9,0 2,2.5', fill: '#B9C0C6', stroke: '#7E868D', strokeWidth: .6 })) : null;
      return svg([floor, pb, counter(1), roll('r', cx, ty, { open: t > 3.4, cut: t > 3.4 ? 0 : cs, rot: -360 * cs, flap: 1 - seg(3.6, 4.4) }), pf, cutter,
        chip('c1', 110, 50, '✓ Abre sólo la parte de arriba', RED, '#FFFFFF', t > 4.2), line('l1', 'M150 72 L232 132', RED, t > 4.2),
        chip('c2', 290, 92, '✓ El fleje de los lados se queda', OK, '#FFFFFF', t > 4.8), line('l2', 'M282 114 L242 160', OK, t > 4.8)]);
    }
    if (k === 1) {
      const cx = 240, ty = 136;
      const W = [[0, [210, 162]], [.4, [210, 162]], [1.4, [238, 136]], [2.2, [222, 108]], [2.9, [196, 162]], [3.2, [196, 162]], [5.8, [96, 162]]];
      let hx = 96, hy = 162;
      for (let i = 1; i < W.length; i++) if (t <= W[i][0]) { const s = ease(cl((t - W[i - 1][0]) / (W[i][0] - W[i - 1][0] || 1), 0, 1)); hx = W[i - 1][1][0] + (W[i][1][0] - W[i - 1][1][0]) * s; hy = W[i - 1][1][1] + (W[i][1][1] - W[i - 1][1][1]) * s; break; }
      const sw = ease(seg(3.2, 5.8)), px = 182 - 90 * sw;
      const d = t >= 2.9 ? 'M240 136 C240 110 200 120 196 162 L' + hx + ' 162' : 'M240 136 C240 116 ' + (hx + 10) + ' ' + (hy - 24) + ' ' + hx + ' ' + hy;
      const [pb, pf] = person('p', Object.assign({ x: px, face: t > 3.2 ? -1 : 1, walk: sw > 0 && sw < 1 ? t * 9 : 0, hands: [[hx, hy], [hx + (t > 3.2 ? 12 : -14), hy + 4]] }, P1));
      const ticks = []; for (let x = 196, i = 0; x >= 96; x -= 10, i++) ticks.push(h('line', { key: x, x1: x, y1: 168, x2: x, y2: i % 5 ? 172 : 175, stroke: '#6B5200', strokeWidth: 1 }));
      const ruler = h('g', { key: 'ru', style: { opacity: t > .3 ? 1 : 0, transition: 'opacity .5s' } }, h('rect', { x: 92, y: 168, width: 108, height: 8, fill: '#FFD23F', stroke: '#B98A00', strokeWidth: .8 }), ticks,
        [[196, '0'], [146, '50 cm'], [96, '1 m']].map(([x, l]) => h('text', { key: l, x, y: 190, textAnchor: 'middle', fontSize: 9.5, fontWeight: 700, fill: '#6B5200', fontFamily: mono }, l)));
      const badOn = t > .4 && t < 3.2;
      const badMark = h('g', { key: 'bm', style: { opacity: badOn ? 1 : 0, transition: 'opacity .4s' } },
        h('circle', { cx: 281, cy: 146, r: 8, fill: '#FFFFFF', stroke: RED, strokeWidth: 2 }),
        h('text', { x: 281, y: 150, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: RED, fontFamily: sans }, '✗'));
      return svg([floor, pb, counter(1), ruler, roll('r', cx, ty, { open: true }), t >= 1.4 ? hose('h', d) : null, pf, badMark,
        chip('c1', 110, 50, '✓ Siempre la punta del centro', RED, '#FFFFFF', t > 1.6), line('l1', 'M150 72 L236 134', RED, t > 1.6 && t < 3),
        chip('cb', 300, 92, '✗ Nunca la punta de afuera', '#FDE7EA', RED, badOn), line('lb', 'M300 114 L285 140', RED, badOn),
        chip('c2', 300, 92, meters(Math.max(0, (196 - hx) / 100).toFixed(2)), '#141414', '#FFFFFF', t > 3.2)]);
    }
    if (k === 2) {
      const s = ease(seg(.8, 2.6)), cx = 240 - 110 * s, ty = 136 + 62 * s - 18 * Math.sin(Math.PI * s), rot = 180 * s;
      const kneel = t > 2.7, px = cx - 70;
      const hands = kneel ? [[cx - 28, ty - 4], [cx - 36, ty + 6]] : [[cx - 32, ty + 4], [cx - 38, ty + 14]];
      const [pb, pf] = person('p', Object.assign({ x: px, face: 1, pose: kneel ? 'kneel' : 'stand', walk: s > 0 && s < 1 ? t * 9 : 0, hands }, P1));
      const sa = rad(180 + rot), sx = cx + 30 * Math.cos(sa), sy = ty + 10.5 * Math.sin(sa);
      return svg([floor, counter(1 - seg(0, .6)), pb, roll('r', cx, ty, { open: true, rot }), hose('h', 'M' + cx + ' ' + ty + ' q8 -14 22 -10'), pf,
        chip('c1', 200, 40, 'Medidas largas: 5 a 50 m', '#141414', '#FFFFFF', t > .4),
        chip('c2', 240, 84, '✓ Rollo en el piso', RED, '#FFFFFF', t > 2.9)]);
    }
    if (k === 3) {
      const cx = 130, ty = 198, rot = 180 + t * 80, hm = Math.sin(t * 3) * 14;
      const Pr = a => [cx + 36 * Math.cos(rad(a)), ty + 12.6 * Math.sin(rad(a))];
      const [pb, pf] = person('p', Object.assign({ x: 60, face: 1, pose: 'kneel', hands: [Pr(205 + hm), Pr(160 + hm)] }, P1));
      const arc = d => h('path', { d, fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', style: { animation: 'mmn18-mn-pulse 1.4s ease-in-out infinite' } });
      const arrows = h('g', { key: 'ar', style: { opacity: t > .4 ? 1 : 0, transition: 'opacity .5s' } },
        arc('M86 184 Q130 158 174 184'), h('path', { d: 'M174 184 l-11 -2 l6 -8 Z', fill: '#141414' }),
        arc('M174 240 Q130 254 86 240'), h('path', { d: 'M86 240 l11 -1 l-5 9 Z', fill: '#141414' }));
      const xe = 186 + 160 * ease(seg(.6, 5));
      const bad = h('g', { key: 'bad', style: pop(t > 2.6) },
        h('circle', { cx: 334, cy: 80, r: 42, fill: '#FFFFFF', stroke: RED, strokeWidth: 2 }),
        hose('hb', 'M306 96 C312 52 356 60 336 86 S302 110 322 70 S372 80 352 100 S312 96 346 64'),
        h('circle', { cx: 366, cy: 44, r: 11, fill: RED }),
        h('text', { x: 366, y: 48.5, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, '✗'),
        h('text', { x: 334, y: 140, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: RED, fontFamily: sans }, 'Sin girar, se enreda'));
      return svg([floor, pb, arrows, roll('r', cx, ty, { open: true, rot }), hose('h', 'M130 198 C132 180 162 186 166 206 Q176 228 186 228 H' + xe), pf, bad,
        chip('c1', 84, 40, '✓ Gira el rollo', OK, '#FFFFFF', t > 1.2)]);
    }
    if (k === 4) {
      const cx = 130, ty = 198, rot = 180 + t * 80, hm = Math.sin(t * 3) * 14;
      const Pr = a => [cx + 36 * Math.cos(rad(a)), ty + 12.6 * Math.sin(rad(a))];
      const [pb, pf] = person('p', Object.assign({ x: 60, face: 1, pose: 'kneel', hands: [Pr(205 + hm), Pr(160 + hm)] }, P1));
      const arc = d => h('path', { d, fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', style: { animation: 'mmn18-mn-pulse 1.4s ease-in-out infinite' } });
      const arrows = h('g', { key: 'ar', style: { opacity: t > .4 ? 1 : 0, transition: 'opacity .5s' } },
        arc('M86 184 Q130 158 174 184'), h('path', { d: 'M174 184 l-11 -2 l6 -8 Z', fill: '#141414' }),
        arc('M174 240 Q130 254 86 240'), h('path', { d: 'M86 240 l11 -1 l-5 9 Z', fill: '#141414' }));
      const s2 = ease(seg(.6, 5.2)), x2 = 200 + 150 * s2, walking = s2 > 0 && s2 < 1;
      const [qb, qf] = person('q', Object.assign({ x: x2, face: 1, walk: walking ? t * 8 : 0, hands: [[x2 + 12, 186 + (walking ? Math.sin(t * 8) * 4 : 0)], [x2 - 14, 184]] }, P2));
      const xh = Math.max(186, x2 - 34);
      return svg([floor, pb, arrows, roll('r', cx, ty, { open: true, rot }), hose('h', 'M130 198 C132 180 162 186 166 206 Q176 228 186 228 H' + xh + ' Q' + (x2 - 18) + ' 228 ' + (x2 - 14) + ' 186'), pf, qb, qf,
        chip('c1', 70, 40, '1 · Gira el rollo', RED, '#FFFFFF', t > .3),
        chip('c2', cl(x2, 120, 330), 84, '2 · Jala y mide: ' + Math.round(50 * s2) + ' m', '#141414', '#FFFFFF', t > .6),
        chip('c3', 250, 40, '✓ Sin enredos', OK, '#FFFFFF', t > 5.4)]);
    }
    if (k === 5) {
      const s = ease(seg(.6, 5.4)), ang = s * 540, xh = 180 + 150 * s, walking = s > 0 && s < 1, rx = 118, ry = 146;
      const [pb, pf] = person('p', Object.assign({ x: xh + 28, face: 1, walk: walking ? t * 8 : 0, hands: [[xh + 12, 190 + (walking ? Math.sin(t * 8) * 3 : 0)], [xh + 18, 194]] }, P1));
      const reel = h('g', { key: 'reel' },
        h('path', { d: 'M84 230 L' + rx + ' ' + ry + ' L152 230', fill: 'none', stroke: '#7E868D', strokeWidth: 5, strokeLinejoin: 'round' }),
        h('circle', { cx: rx, cy: ry, r: 50, fill: '#E7EAED', stroke: STEEL, strokeWidth: 2 }),
        h('circle', { cx: rx, cy: ry, r: 42, fill: G }), h('circle', { cx: rx, cy: ry, r: 42, fill: 'url(#mn-braid)' }),
        [36, 30, 24, 18].map(r => h('circle', { key: r, cx: rx, cy: ry, r, fill: 'none', stroke: GK, strokeWidth: 1.3, opacity: .7 })),
        h('g', { transform: 'rotate(' + ang + ' ' + rx + ' ' + ry + ')' }, [0, 120, 240].map(a => h('line', { key: a, x1: rx, y1: ry, x2: rx + 48 * Math.cos(rad(a)), y2: ry + 48 * Math.sin(rad(a)), stroke: '#7E868D', strokeWidth: 3, strokeLinecap: 'round', opacity: .85 }))),
        h('circle', { cx: rx, cy: ry, r: 9, fill: STEEL, stroke: '#7E868D', strokeWidth: 1.5 }));
      return svg([floor, reel, hose('h', 'M' + rx + ' ' + (ry + 42) + ' C' + (rx + 14) + ' 226 150 226 170 226 L' + xh + ' 226 Q' + (xh + 10) + ' 226 ' + (xh + 12) + ' 190'), pb, pf,
        chip('c1', 240, 40, '✓ En carrete: sólo estira y mide', RED, '#FFFFFF', t > .4),
        chip('c2', cl(xh + 28, 130, 330), 84, meters(Math.round(10 * s)), '#141414', '#FFFFFF', t > .6)]);
    }
    const s = ease(seg(.6, 3)), hr = 16 + 13 * s, cx = 210, ty = 196, view2 = t > 4.6, RK = '#1F2326';
    const ts = ease(seg(3.2, 4.2)), tubeTop = ty - 110 + 66 * ts, ringR = 6 + 14 * s;
    const tube = h('g', { key: 'tube', style: { opacity: t > 3.1 ? 1 : 0, transition: 'opacity .3s' } },
      h('rect', { x: cx - 16, y: tubeTop, width: 32, height: ty - tubeTop, fill: '#3A3F44' }),
      h('rect', { x: cx - 13, y: tubeTop, width: 8, height: ty - tubeTop, fill: '#FFFFFF', opacity: .15 }),
      h('ellipse', { cx, cy: tubeTop, rx: 16, ry: 5.6, fill: '#5C6268', stroke: '#2B3035', strokeWidth: 1.2 }));
    const topG = h('g', { key: 'top', style: { opacity: view2 ? 0 : 1, transition: 'opacity .5s' } },
      roll('r', cx, ty, { open: true, hole: hr }),
      s < 1 ? hose('cn', 'M' + cx + ' ' + ty + ' C' + (cx - 10) + ' 170 110 176 ' + (80 + ringR) + ' 214') : null,
      h('g', { key: 'coil', style: { opacity: t > .6 ? 1 : 0, transition: 'opacity .4s' } }, hose('cl', spring(78, 86, 226, 4, ringR))),
      tube);
    const rs = ease(seg(4.8, 5.8)), C = [200, 138], pt = (a, rr) => [C[0] + rr * Math.cos(rad(a)), C[1] + rr * Math.sin(rad(a))];
    const rackG = h('g', { key: 'rack', style: { opacity: view2 ? 1 : 0, transition: 'opacity .5s' } },
      h('path', { d: 'M86 66 L110 50 H338 L316 66 M338 50 L366 212', fill: 'none', stroke: RK, strokeWidth: 4, strokeLinejoin: 'round', opacity: .5 }),
      h('path', { d: 'M56 230 L86 66 H316 L346 230', fill: 'none', stroke: RK, strokeWidth: 5, strokeLinejoin: 'round' }),
      h('line', { x1: 86, y1: C[1], x2: 316, y2: C[1], stroke: RK, strokeWidth: 4 }),
      h('g', { transform: 'translate(0 ' + (-44 * (1 - rs)) + ')', opacity: rs > 0 ? 1 : 0 },
        h('circle', { cx: C[0] + 7, cy: C[1] + 2, r: 66, fill: GD }),
        h('circle', { cx: C[0], cy: C[1], r: 66, fill: G }), h('circle', { cx: C[0], cy: C[1], r: 66, fill: 'url(#mn-braid)' }),
        [58, 50, 42, 34].map(rr => h('circle', { key: rr, cx: C[0], cy: C[1], r: rr, fill: 'none', stroke: GK, strokeWidth: 1.4, opacity: .7 })),
        h('circle', { cx: C[0], cy: C[1], r: 27, fill: '#FFFFFF' }),
        h('line', { x1: C[0] - 27, y1: C[1], x2: C[0] + 27, y2: C[1], stroke: RK, strokeWidth: 4 }),
        h('path', { d: 'M' + pt(-65, 27).join(' ') + ' L' + pt(-65, 66).join(' '), stroke: '#FFFFFF', strokeWidth: 4, opacity: .9 }),
        [45, 135, 225, 315].map(a => h('line', { key: a, x1: pt(a, 8)[0], y1: pt(a, 8)[1], x2: pt(a, 76)[0], y2: pt(a, 76)[1], stroke: RK, strokeWidth: 6, strokeLinecap: 'round' })),
        h('circle', { cx: C[0], cy: C[1], r: 9, fill: RK })),
      h('path', { d: 'M56 230 L74 212 M346 230 L330 212', stroke: RK, strokeWidth: 5, strokeLinecap: 'round' }),
      h('rect', { x: 54, y: 206, width: 294, height: 14, fill: RK }),
      h('rect', { x: 54, y: 214, width: 294, height: 3.5, fill: '#F26B1D' }),
      h('text', { x: 340, y: 213, textAnchor: 'end', fontSize: 7, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, 'Venta por metro'));
    return svg([floor, topG, rackG,
      chip('c1', 200, 20, '1 · Vende primero del centro', '#141414', '#FFFFFF', t > .3 && !view2),
      chip('c4', 80, 170, 'Vendida', '#141414', '#FFFFFF', t > 2.6 && !view2),
      chip('c2', 300, 56, '2 · Entra el tubo del carrete', RED, '#FFFFFF', t > 3.4 && !view2),
      chip('c3', 200, 16, '✓ Móntalo en el rack despachador', OK, '#FFFFFF', t > 5.8)]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st);
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, past = a || k < st;
        return { n: String(k + 1), t, d, lbl: k < 2 ? 'PASO ' + (k + 1) : k < 5 ? 'MEDIDAS LARGAS · PASO ' + (k + 1) : 'CARRETE · PASO ' + (k + 1),
          bd: a ? '#DB011C' : '#F2DCCB', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? '#DB011C' : '#F6E3D6', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, MedirMangueraNivel_CSS), h("section", { ref: v.rootRef, className: "mmn18-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FFF4EC", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · INSTRUCCIÓN DE TRABAJO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Cómo medir manguera de nivel"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Sin desarmar el rollo y sin que se enrede.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F2DCCB", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F6E3D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))), h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "16px", background: "#141414", color: "#FFFFFF" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#DB011C", fontWeight: "800" } }, "!"), h("span", { style: { fontWeight: "600", fontSize: "15px", lineHeight: "1.3" } }, "Cumplir y mantener conforme a este estándar."))))));
  }
}

export default MedirMangueraNivel;
