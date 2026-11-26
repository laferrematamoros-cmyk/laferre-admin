"use client";
import React from "react";

// Tuberia Cortada — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "tc14-" para no chocar con otros componentes.

const TuberiaCortada_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@media (prefers-reduced-motion:reduce){.tc14-root svg *{animation:none !important}}";

const STEPS = [
  ['Tramos de 3 m: al área de tubería', 'La tubería cortada en tramos de 3 metros se pasa al área de tubería, en la zona interior.'],
  ['Tramos de 5 m y 4 m: córtalos por metro', 'Córtalos de metro en metro hasta que quede un tramo de 3 metros. Sólo aplica en tubos de ½" y ¾" de CPVC y PVC hidráulico.'],
  ['Los metros cortados: a venta por metro', 'Los metros cortados de CPVC y PVC hidráulico se acomodan en el área de venta de tubos por metro.'],
  ['Avisa a tu superior', 'Si hay tubería cortada de mayor diámetro (4", 3", 2", 1-1/2", 1-1/4" o 1"), avísale a tu superior.']
];
const DUR = [6200, 6200, 6000, 6800];

class TuberiaCortada extends React.Component {
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
    const sans = 'Geist, sans-serif', RED = '#DB011C', OK = '#1E9E55', SK = '#C68B5E', PANTS = '#2B3035', STEEL = '#5C6268';
    const cl = (v, a, b) => Math.min(b, Math.max(a, v)), seg = (a, b) => cl((t - a) / (b - a), 0, 1);
    const ease = s => s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    const pop = (on, d) => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .45s ease ' + (d || 0) + 's, transform .45s cubic-bezier(.3,1.4,.5,1) ' + (d || 0) + 's' });
    const chip = (key, cx0, y, txt, bg, fg, on) => { const w = 18 + txt.length * 6.2; return h('g', { key, style: pop(on) }, h('rect', { x: cx0 - w / 2, y, width: w, height: 22, rx: 11, fill: bg }), h('text', { x: cx0, y: y + 15, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: sans }, txt)); };
    const tag = (key, x, y, txt, c, on) => h('text', { key, x, y, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: c, fontFamily: sans, style: { opacity: on ? 1 : 0, transition: 'opacity .35s' } }, txt);
    const MAT = { pvc: ['#F1F3F5', '#9AA0A6'], cpvc: ['#EADCB8', '#B89F66'], big: ['#E3E6E9', '#8A9096'] };
    const pipe = (key, x, y, len, mat, o) => { o = o || {}; const c = MAT[mat || 'pvc'], th = o.th || 10;
      return h('g', { key }, h('rect', { x, y: y - th / 2, width: len, height: th, rx: 2, fill: c[0], stroke: c[1], strokeWidth: 1.2 }),
        h('line', { x1: x + 3, y1: y - th / 2 + th * .25, x2: x + len - 3, y2: y - th / 2 + th * .25, stroke: '#FFFFFF', strokeWidth: Math.max(1.2, th * .12), opacity: .85 }),
        o.noEnd ? null : h('ellipse', { cx: x + len, cy: y, rx: th * .22, ry: th / 2, fill: c[0], stroke: c[1], strokeWidth: 1 }),
        o.noEnd ? null : h('ellipse', { cx: x + len, cy: y, rx: th * .1, ry: th * .3, fill: c[1], opacity: .5 })); };
    const person = (key, o) => {
      const x = o.x, fy = 230, f = o.face || 1, s = o.walk ? Math.sin(o.walk) * 9 : 0;
      const hip = [x, fy - 50], sh = [x + f, fy - 92], hd = [x + f * 2, fy - 106];
      const legs = [[[x - 2 - s * .4, fy - 25], [x - 5 - s, fy - 2]], [[x + 2 + s * .4, fy - 25], [x + 5 + s, fy - 2]]];
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
    const P1 = { shirt: RED, cap: PANTS }, BOSS = { shirt: '#2B3035', cap: '#F2B705' };
    const floor = h('line', { key: 'fl', x1: 0, y1: 230, x2: 400, y2: 230, stroke: '#EAD7C8', strokeWidth: 2 });
    const sign = (key, x, y, w, txt) => h('g', { key }, h('rect', { x, y, width: w, height: 22, rx: 6, fill: '#141414' }), h('text', { x: x + w / 2, y: y + 14.5, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', fill: '#FFFFFF', fontFamily: sans }, txt));
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: qué hacer con la tubería cortada', style: { display: 'block', width: '100%', height: 'auto' } }, kids);

    if (k === 0) {
      const L = 141, lift = ease(seg(.6, 1.4)), walk = ease(seg(1.6, 4.2)), place = ease(seg(4.4, 5.2)), px = 90 + 110 * walk;
      let x = 20 + 110 * walk, y = 192 - 66 * lift;
      if (place > 0) { x = 130 + 120 * place; y = 126 + 25 * place; }
      const hands = place >= 1 ? [[px + 12, 186], [px - 10, 188]] : [[Math.min(px + 16, x + L - 6), y + 3], [Math.max(px - 14, x + 6), y + 3]];
      const [pb, pf] = person('p', Object.assign({ x: px, face: 1, walk: walk > 0 && walk < 1 ? t * 9 : 0, hands }, P1));
      const horse = cx => h('g', { key: 'h' + cx }, h('path', { d: 'M' + (cx - 12) + ' 230 L' + cx + ' 198 L' + (cx + 12) + ' 230', fill: 'none', stroke: '#8A6A2A', strokeWidth: 3 }), h('rect', { x: cx - 16, y: 196, width: 32, height: 5, rx: 1, fill: '#B48A50' }));
      const rack = h('g', { key: 'rack' }, sign('sg', 244, 66, 150, 'ÁREA DE TUBERÍA · INTERIOR'),
        [246, 390].map(xx => h('line', { key: 'po' + xx, x1: xx, y1: 92, x2: xx, y2: 230, stroke: STEEL, strokeWidth: 4 })),
        [120, 156, 192].map(yy => h('line', { key: 'sh' + yy, x1: 244, y1: yy, x2: 392, y2: yy, stroke: STEEL, strokeWidth: 3 })),
        pipe('e1', 250, 114, 136), pipe('e2', 254, 104, 132, 'cpvc'), pipe('e3', 250, 186, 136, 'cpvc'), pipe('e4', 252, 176, 134));
      return svg([floor, horse(45), horse(135), rack, pb, pipe('m', x, y, L), pf,
        tag('t3', x + L / 2, y - 9, '3 m', '#141414', t > .3),
        chip('c1', 104, 20, 'Tramo de 3 m', '#141414', '#FFFFFF', t > .3),
        chip('c2', 318, 34, '✓ Al área de tubería', OK, '#FFFFFF', t > 5.2)]);
    }
    if (k === 1) {
      const x0 = 40, m = 47, end = x0 + 5 * m, c1 = end - m, c2 = end - 2 * m;
      const saw1 = t > 1 && t < 2.4, saw2 = t > 2.8 && t < 4.2, sawing = saw1 || saw2;
      const sx = t < 2.6 ? c1 : c2, wob = sawing ? Math.sin(t * 16) * 7 : 0;
      const p1 = ease(seg(2.4, 3)), p2 = ease(seg(4.2, 4.8)), cut1 = t > 2.4, cut2 = t > 4.2;
      const [pb, pf] = person('p', Object.assign({ x: sx + 36, face: -1, hands: [[sx + wob + 26, 152], [sx - 12, 166]] }, P1));
      const table = h('g', { key: 'tb' }, h('rect', { x: 20, y: 176, width: 360, height: 8, rx: 2, fill: '#C9A46A', stroke: '#8A6A2A', strokeWidth: 1.2 }), h('rect', { x: 26, y: 184, width: 348, height: 10, fill: '#B48A50' }),
        [34, 358].map(lx => h('rect', { key: lx, x: lx, y: 194, width: 8, height: 36, fill: '#8A6A2A' })));
      const marks = h('g', { key: 'mk', style: { opacity: t > .6 ? 1 : 0, transition: 'opacity .4s' } }, [c1, c2].map(cx => h('line', { key: cx, x1: cx, y1: 160, x2: cx, y2: 176, stroke: RED, strokeWidth: 1.6, strokeDasharray: '2 2' })));
      const saw = h('g', { key: 'saw', transform: 'translate(' + (sx + wob) + ' 162)', style: { opacity: sawing ? 1 : 0, transition: 'opacity .2s' } },
        h('path', { d: 'M-22 0 V-20 H18 V0', fill: 'none', stroke: '#F2B705', strokeWidth: 3, strokeLinejoin: 'round' }),
        h('line', { x1: -22, y1: 0, x2: 18, y2: 0, stroke: '#7E868D', strokeWidth: 1.6 }),
        h('rect', { x: 17, y: -8, width: 10, height: 15, rx: 3, fill: '#141414' }));
      const dust = sawing ? h('g', { key: 'du' }, [0, 1, 2].map(i => h('circle', { key: i, cx: sx + (i - 1) * 4, cy: 180 + ((t * 40 + i * 13) % 40), r: 1.2, fill: '#C9B48A' }))) : null;
      return svg([floor, pb, table, marks,
        pipe('s0', x0, 168, c2 - x0, 'cpvc', { noEnd: !cut2 }),
        h('g', { key: 'g1', transform: 'translate(' + (12 * p2) + ' 0)' }, pipe('s1', c2, 168, m, 'cpvc', { noEnd: !cut1 })),
        h('g', { key: 'g2', transform: 'translate(' + (12 * p2 + 24 * p1) + ' 0)' }, pipe('s2', c1, 168, m, 'cpvc')),
        h('text', { key: 'lb', x: x0 + 8, y: 171, fontSize: 7, fontWeight: 700, fill: '#8A6A2A', fontFamily: sans }, 'CPVC ½"'),
        saw, dust, pf,
        tag('l1', c1 + m / 2 + 24 * p1 + 12 * p2, 154, '1 m', RED, t > .6),
        tag('l2', c2 + m / 2 + 12 * p2, 154, '1 m', RED, t > .6),
        tag('l3', (x0 + c2) / 2, 154, '✓ Quedan 3 m', OK, t > 4.6),
        chip('c1', 200, 14, 'Tramo de 5 m: corta por metro', '#141414', '#FFFFFF', t > .3),
        chip('c2', 200, 42, 'Sólo ½" y ¾" · CPVC y PVC hidráulico', '#FDE7EA', RED, t > .8)]);
    }
    if (k === 2) {
      const pick = ease(seg(.5, 1.2)), walk = ease(seg(1.4, 3.6)), px = 80 + 145 * walk, lerp = (a, b, s) => a + (b - a) * s;
      const PILE = [[46, 224, 'pvc'], [48, 214, 'cpvc'], [46, 204, 'cpvc']], SLOT = [348, 362, 376];
      const pieces = PILE.map(([x0, y0, mat], n) => {
        const cx1 = px - 4, cy1 = 180 - n * 9, pl = ease(seg(3.8 + n * .4, 4.5 + n * .4));
        let x = lerp(x0, cx1, pick), y = lerp(y0, cy1, pick), a = 0;
        if (pl > 0) { x = lerp(cx1, SLOT[n], pl); y = lerp(cy1, 198.5, pl) - Math.sin(Math.PI * pl) * 24; a = -90 * pl; }
        return h('g', { key: 'pc' + n, transform: 'translate(' + x + ' ' + y + ') rotate(' + a + ')' }, pipe('p', -23.5, 0, 47, mat));
      });
      const done = t > 5.3;
      const [pb, pf] = person('p', Object.assign({ x: px, face: 1, walk: walk > 0 && walk < 1 ? t * 9 : 0, hands: done ? [[px + 12, 186], [px - 10, 188]] : [[px + 18, 182], [px - 14, 182]] }, P1));
      const vp = (key, x, mat) => h('g', { key, transform: 'translate(' + x + ' 198.5) rotate(-90)' }, pipe('p', -23.5, 0, 47, mat));
      const rack = h('g', { key: 'rk' }, sign('sg', 244, 118, 152, 'VENTA DE TUBOS POR METRO'),
        h('rect', { x: 268, y: 148, width: 120, height: 82, rx: 3, fill: '#E7EAED', stroke: '#9AA0A6', strokeWidth: 1.5 }),
        [278, 292, 306, 320, 334].map((x, n) => vp('v' + x, x, n % 2 ? 'cpvc' : 'pvc')));
      const front = h('g', { key: 'fr' }, h('rect', { x: 266, y: 206, width: 124, height: 10, rx: 2, fill: STEEL }),
        h('text', { x: 328, y: 214, textAnchor: 'middle', fontSize: 7.5, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, 'TRAMOS DE 1 M'),
        h('rect', { x: 266, y: 226, width: 124, height: 4, fill: STEEL }));
      return svg([floor, rack, pb, pieces, front, pf,
        chip('c1', 120, 20, '1 m · CPVC y PVC hidráulico', '#141414', '#FFFFFF', t > .3),
        chip('c3', 110, 50, '✓ Llévate todos los tramos', RED, '#FFFFFF', t > 1.3 && t < 4),
        chip('c2', 300, 84, '✓ En vertical, en su estante', OK, '#FFFFFF', done)]);
    }
    const walk = ease(seg(1.6, 3.6)), px = 150 + 120 * walk, talking = t > 3.8;
    const [pb, pf] = person('p', Object.assign({ x: px, face: walk > 0 ? 1 : -1, walk: walk > 0 && walk < 1 ? t * 9 : 0, hands: talking ? [[px - 40, 150], [px - 8, 188]] : [[px + 10, 188], [px - 8, 188]] }, P1));
    const [bb, bf] = person('b', Object.assign({ x: 350, face: -1, hands: [[338, 188], [356, 188]] }, BOSS));
    const bubble = (key, x, y, w, txt, c, tail, on) => h('g', { key, style: pop(on) },
      h('path', { d: tail, fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.5, strokeLinejoin: 'round' }),
      h('rect', { x, y, width: w, height: 28, rx: 10, fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.5 }),
      h('path', { d: tail.replace(/ Z$/, ''), fill: '#FFFFFF', stroke: 'none' }),
      h('text', { x: x + w / 2, y: y + 18, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: c, fontFamily: sans }, txt));
    return svg([floor,
      pipe('d1', 24, 214, 64, 'big', { th: 30 }), pipe('d2', 30, 192, 56, 'big', { th: 16 }), pipe('d3', 34, 180, 48, 'big', { th: 9 }),
      tag('dl1', 52, 218, '4"', '#5C5F63', true), tag('dl2', 56, 195, '2"', '#5C5F63', true),
      h('g', { key: 'ex', style: pop(t > .7 && t < 3.8) }, h('circle', { cx: 150, cy: 100, r: 10, fill: RED }), h('text', { x: 150, y: 105, textAnchor: 'middle', fontSize: 14, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, '!')),
      bb, pb, bf, pf,
      bubble('q1', 150, 70, 150, '¡Hay tubo cortado de 4"!', '#141414', 'M262 98 L272 110 L276 98 Z', talking),
      bubble('q2', 260, 30, 130, '✓ Bien, lo reviso', OK, 'M340 58 L348 100 L354 58 Z', t > 5),
      chip('c1', 112, 14, '4" · 3" · 2" · 1-1/2" · 1-1/4" · 1"', '#141414', '#FFFFFF', t > .4),
      chip('c2', 200, 236, 'Mayor diámetro: avisa a tu superior', RED, '#FFFFFF', t > 1.2)]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st);
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, past = a || k < st;
        return { n: String(k + 1), t, d, lbl: k === 3 ? 'IMPORTANTE · PASO 4' : 'PASO ' + (k + 1),
          bd: a ? '#DB011C' : '#F2DCCB', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? '#DB011C' : '#F6E3D6', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, TuberiaCortada_CSS), h("section", { ref: v.rootRef, className: "tc14-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FFF4EC", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · INSTRUCCIÓN DE TRABAJO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Tubería cortada"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Qué hacer con cada tramo de tubo cortado.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F2DCCB", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F6E3D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))), h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "16px", background: "#141414", color: "#FFFFFF" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#DB011C", fontWeight: "800" } }, "!"), h("span", { style: { fontWeight: "600", fontSize: "15px", lineHeight: "1.3" } }, "Cumplir y mantener conforme a este estándar."))))));
  }
}

export default TuberiaCortada;
