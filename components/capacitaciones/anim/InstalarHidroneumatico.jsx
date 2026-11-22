"use client";
import React from "react";

// Instalar Hidroneumatico — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "ih22-" para no chocar con otros componentes.

const InstalarHidroneumatico_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes ih22-frg-flow{to{stroke-dashoffset:-24}}@keyframes ih22-el-spin{to{transform:rotate(360deg)}}@keyframes ih22-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.ih22-frg-pulse{transform-box:fill-box;transform-origin:center;animation:ih22-frg-pulse 1.1s ease-out 1.1s 2 both}@media (prefers-reduced-motion:reduce){.ih22-frg-pulse{animation:none;opacity:0}}";

const STEPS = [
  ['Llega el agua de la calle', 'El agua de la toma pasa por el filtro y llena la cisterna. El flotante cierra la entrada cuando se llena.'],
  ['Mete la succión con pichancha', 'En la punta del tubo, dentro de la cisterna, va la pichancha. Así el tubo no se vacía, la bomba no pierde el agua y su coladera detiene la basura.'],
  ['Coloca el equipo hidroneumático', 'Bomba de ½ HP con tanque de 24 L, cerca de la cisterna y sobre una base firme y nivelada.'],
  ['Conecta la succión y la salida a la casa', 'La succión va de la cisterna a la bomba. La salida va directo a la tubería de la casa. Usa cinta teflón en las roscas.'],
  ['Ceba la bomba', 'Antes de conectarla, llénala de agua junto con el tubo de succión para que no trabaje en seco.'],
  ['Así funciona', 'La bomba llena el tanque y se apaga a 40 PSI. Al abrir una llave sale agua del tanque y baja la presión; a 20 PSI la bomba prende sola, con la llave todavía abierta, para que siga saliendo agua. Al cerrar la llave, la bomba sube la presión hasta 40 PSI y se apaga.']
];
const DUR = [4400, 4200, 3400, 4600, 4200, 12600];
const PX = [236, 244, 240, 240, 236, 236];
const HAND = [null, [284, 176], [196, 150], [226, 141], [204, 126], null];

class InstalarHidroneumatico extends React.Component {
  state = { st: -1, ph: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    // Capacitaciones: arranca al llegar a la parte de arriba de la pantalla (con threshold, las altas no arrancaban en celular).
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; }
  enter(k, t) {
    this.T.push(setTimeout(() => this.setState({ st: k, ph: 0 }), t));
    this.T.push(setTimeout(() => this.setState({ ph: 1 }), t + 90));
    if (k === 0) this.T.push(setTimeout(() => this.setState({ ph: 2 }), t + 2900));
    if (k === 5) this.T.push(setTimeout(() => this.cyc(), t + 3200));
  }
  cyc() {
    this.setState({ ph: 2 });
    [[2000, 3], [4600, 4], [6600, 5]].forEach(([d, p]) => this.T.push(setTimeout(() => this.setState({ ph: p }), d)));
    this.T.push(setTimeout(() => this.cyc(), 9400));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 5, ph: 5 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const B = '#1E6FC2', G = '#7E868D', PIPE = '#D9C08A', BLUE = '#2F6DB5', brass = '#C8A04A', brassD = '#8A6A2A', YEL = '#F2C230', YELD = '#B8901A';
    const live = st >= 0;
    const done = k => st > k || (st === k && ph >= 1);
    const vis = (on, d, dl) => ({ opacity: on ? 1 : 0, transition: live ? 'opacity ' + (d || .5) + 's ease ' + (dl || 0) + 's' : 'none' });
    const draw = (k, key, d, L, c, dl) => h('path', { key, d, fill: 'none', stroke: c || PIPE, strokeWidth: 5, strokeLinejoin: 'round', strokeDasharray: L, style: { strokeDashoffset: done(k) ? 0 : L, transition: live ? 'stroke-dashoffset 1.6s ease-in-out ' + (dl || 0) + 's' : 'none' } });
    const flow = (on, key, d, sp, dl) => h('path', { key, d, fill: 'none', stroke: '#5AA9E6', strokeWidth: 2.2, strokeLinecap: 'round', strokeDasharray: '4 8', style: Object.assign({ animation: 'ih22-frg-flow ' + (sp || .6) + 's linear infinite' }, vis(on, .4, dl)) });
    const part = (k, key, tgt, kids) => { const hd = HAND[k] || tgt; return h('g', { key, style: { opacity: st >= k ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center', transform: done(k) ? 'none' : 'translate(' + (hd[0] - tgt[0]) + 'px,' + (hd[1] - tgt[1]) + 'px) scale(.7)', transition: live ? 'transform 1.3s cubic-bezier(.3,.7,.3,1), opacity .3s' : 'none' } }, kids); };
    const lbl = (x, y, t, anchor) => h('text', { key: 'l' + t, x, y, textAnchor: anchor || 'start', fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, t);

    const fn = st === 5;
    const pumpOn = fn && (ph === 1 || ph === 4 || ph === 5);
    const tapOpen = fn && (ph === 3 || ph === 4);
    const psi = !fn || ph === 0 ? 0 : ph === 3 || ph === 4 ? 20 : 40;
    const cis = st < 0 || (st === 0 && ph === 0) ? .15 : fn && ph >= 1 ? .7 : .85;

    const ground = [h('rect', { key: 'soil', x: 0, y: 172, width: 400, height: 88, fill: '#E6D3AE' }), h('rect', { key: 'grass', x: 0, y: 166, width: 400, height: 7, fill: '#5FB360' })];
    const house = h('g', { key: 'house' },
      h('rect', { x: 24, y: 84, width: 120, height: 86, fill: '#F4E3C3', stroke: '#B9A27A', strokeWidth: 1.5 }),
      h('polygon', { points: '16,86 84,50 152,86', fill: '#C9683F' }),
      h('rect', { x: 74, y: 134, width: 18, height: 36, fill: '#8A5A3A' }),
      h('rect', { x: 32, y: 104, width: 30, height: 22, fill: '#CFE6F5', stroke: '#B9A27A', strokeWidth: 1.2 }),
      h('rect', { x: 104, y: 104, width: 30, height: 22, fill: '#CFE6F5', stroke: '#B9A27A', strokeWidth: 1.2 }),
      h('path', { d: 'M144 98 H52 V108', fill: 'none', stroke: BLUE, strokeWidth: 3, strokeLinejoin: 'round' }),
      h('path', { d: 'M44 108 H52 V112', fill: 'none', stroke: G, strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('path', { d: 'M40 124 H60', stroke: G, strokeWidth: 2.5, strokeLinecap: 'round' }),
      flow(tapOpen, 'hin', 'M144 98 H52 V108', .5),
      h('path', { d: 'M52 113 V123', stroke: '#5AA9E6', strokeWidth: 2, strokeDasharray: '3 3', style: Object.assign({ animation: 'ih22-frg-flow .5s linear infinite' }, vis(tapOpen, .4, .3)) }));

    const cisterna = h('g', { key: 'cis' },
      h('rect', { x: 250, y: 176, width: 90, height: 78, rx: 3, fill: '#B9BFC6' }),
      h('rect', { x: 256, y: 180, width: 78, height: 68, fill: '#F2F6F9' }),
      h('rect', { x: 256, y: 180, width: 78, height: 68, fill: '#5AA9E6', style: { opacity: .7, transformBox: 'fill-box', transformOrigin: 'center bottom', transform: 'scaleY(' + cis + ')', transition: live ? 'transform 2.6s ease-in-out' : 'none' } }),
      h('rect', { x: 270, y: 168, width: 32, height: 8, fill: '#8A9096' }),
      h('path', { d: 'M400 190 H392 V152 H374 V190 H334', fill: 'none', stroke: PIPE, strokeWidth: 5, strokeLinejoin: 'round' }),
      flow(st === 0 && ph === 1, 'entry', 'M400 190 H392 V152 H374 V190 H336', .5),
      h('rect', { x: 372, y: 164, width: 22, height: 9, rx: 1.5, fill: '#B9BFC6' }),
      h('rect', { x: 375, y: 143, width: 14, height: 18, rx: 3, fill: '#2F6DB5', stroke: '#1F4E86', strokeWidth: 1 }),
      h('circle', { cx: 382, cy: 150, r: 4.2, fill: '#F2F6F9', stroke: '#1F4E86', strokeWidth: .8 }),
      h('path', { d: 'M382 150 L384.5 147.8', stroke: '#DB011C', strokeWidth: 1, strokeLinecap: 'round' }),
      h('rect', { x: 378.5, y: 155.5, width: 7, height: 3, rx: .8, fill: '#F2F6F9' }),
      lbl(382, 137, 'MEDIDOR', 'middle'),
      h('rect', { x: 354, y: 178, width: 12, height: 24, rx: 3, fill: '#3A7FD0', stroke: '#1F4E86', strokeWidth: 1 }),
      h('rect', { x: 356, y: 182, width: 8, height: 16, rx: 1.5, fill: '#FFFFFF', opacity: .6 }),
      lbl(360, 212, 'FILTRO', 'middle'),
      h('g', { style: { transformBox: 'view-box', transformOrigin: '332px 190px', transform: 'rotate(' + (cis > .5 ? 0 : -60) + 'deg)', transition: live ? 'transform 2.6s ease-in-out' : 'none' } },
        h('path', { d: 'M332 190 H314', stroke: G, strokeWidth: 1.5 }), h('circle', { cx: 312, cy: 190, r: 5, fill: '#2B2F33' })),
      lbl(398, 204, 'CALLE', 'end'), lbl(246, 214, 'CISTERNA', 'end'));

    const suctV = h('g', { key: 'sv' },
      draw(1, 'svp', 'M286 176 V232', 60, PIPE, .3),
      h('g', { style: vis(done(1), .4, 1.6) }, h('rect', { x: 281.5, y: 230, width: 9, height: 5, rx: 1, fill: brass, stroke: brassD, strokeWidth: 1 }), h('rect', { x: 280, y: 234.5, width: 12, height: 10, rx: 2, fill: '#D5DADF', stroke: '#7E868D', strokeWidth: 1 }), h('path', { d: 'M283 236.5 V242.5 M286 236.5 V242.5 M289 236.5 V242.5', stroke: '#7E868D', strokeWidth: 1 }), h('path', { d: 'M249 237 H279', stroke: G, strokeWidth: .8, strokeDasharray: '2 2' }), lbl(246, 239.5, 'PICHANCHA', 'end')));

    const needleA = -120 + psi * 4;
    const unit = part(2, 'unit', [192, 150], [
      h('rect', { key: 'f1', x: 172, y: 164, width: 6, height: 6, fill: YELD }), h('rect', { key: 'f2', x: 206, y: 164, width: 6, height: 6, fill: YELD }),
      h('rect', { key: 'tk', x: 166, y: 146, width: 52, height: 20, rx: 10, fill: YEL, stroke: YELD, strokeWidth: 1.5 }),
      h('path', { key: 'tl', d: 'M174 156 H210', stroke: '#FFFFFF', strokeWidth: 1.5, opacity: .5 }),
      h('rect', { key: 'm', x: 174, y: 132, width: 22, height: 14, rx: 4, fill: YEL, stroke: YELD, strokeWidth: 1.2 }),
      h('path', { key: 'mf', d: 'M179 134 V144 M184 134 V144 M189 134 V144', stroke: YELD, strokeWidth: 1 }),
      h('circle', { key: 'hd', cx: 204, cy: 139, r: 8, fill: '#D9DDE1', stroke: G, strokeWidth: 1.5 }),
      h('g', { key: 'imp', style: { transformBox: 'fill-box', transformOrigin: 'center', animation: pumpOn ? 'ih22-el-spin .4s linear infinite' : 'none' } }, h('path', { d: 'M199 139 H209 M204 134 V144', stroke: '#8A9096', strokeWidth: 1.4, strokeLinecap: 'round' })),
      h('rect', { key: 'in', x: 211, y: 136, width: 5, height: 6, fill: brass }),
      h('rect', { key: 'ps', x: 196, y: 120, width: 10, height: 9, rx: 1.5, fill: '#5E646B' }),
      h('circle', { key: 'psl', cx: 201, cy: 124.5, r: 1.6, style: { fill: pumpOn ? '#3FD07A' : '#C9CED3', transition: 'fill .3s' } }),
      h('circle', { key: 'g', cx: 184, cy: 124, r: 5.5, fill: '#FFFFFF', stroke: G, strokeWidth: 1.2 }),
      h('path', { key: 'gn', d: 'M184 124 V119.5', stroke: '#DB011C', strokeWidth: 1.2, strokeLinecap: 'round', style: { transformBox: 'view-box', transformOrigin: '184px 124px', transform: 'rotate(' + needleA + 'deg)', transition: 'transform 2.6s ease-in-out' } }),
      h('path', { key: 'gs', d: 'M184 129.5 V132', stroke: G, strokeWidth: 1.5 })]);

    const out = 'M201 120 V98 H144';
    const lines = h('g', { key: 'lines' },
      draw(3, 'sh', 'M216 139 H286 V176', 110, PIPE, .2),
      draw(3, 'out', out, 90, BLUE, .6),
      flow(pumpOn, 'fs', 'M286 238 V176 V139 H218', .5),
      flow(tapOpen, 'fo', out, .5),
      h('g', { style: vis(done(2), .4, 1) }, lbl(192, 184, 'TANQUE 24 L', 'middle'), lbl(194, 116, 'PRESOSTATO', 'end')));

    const prime = h('g', { key: 'prime', style: vis(st === 4 && ph === 1, .3) },
      h('rect', { x: 210, y: 108, width: 13, height: 13, rx: 2, fill: '#DDEFF8', stroke: G, strokeWidth: 1.2 }),
      h('rect', { x: 211.5, y: 113, width: 10, height: 6.5, fill: '#5AA9E6' }),
      h('path', { d: 'M211 121 L206 131', stroke: '#5AA9E6', strokeWidth: 2.2, strokeDasharray: '3 3', style: { animation: 'ih22-frg-flow .4s linear infinite' } }),
      lbl(216.5, 103, 'CEBAR', 'middle'));

    const gx = 354, gy = 52, P = (a, r) => [(gx + r * Math.sin(a * Math.PI / 180)).toFixed(1), (gy - r * Math.cos(a * Math.PI / 180)).toFixed(1)];
    const band = P(-40, 24), band2 = P(40, 24);
    const gauge = h('g', { key: 'gauge' },
      h('circle', { cx: gx, cy: gy, r: 30, fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: 3 }),
      h('path', { d: 'M' + band[0] + ' ' + band[1] + ' A24 24 0 0 1 ' + band2[0] + ' ' + band2[1], fill: 'none', stroke: '#3FD07A', strokeWidth: 4 }),
      [0, 20, 40, 60].map(v => { const a = -120 + v * 4, p1 = P(a, 22), p2 = P(a, 27), pt = P(a, 15); return h('g', { key: 'tk' + v }, h('path', { d: 'M' + p1[0] + ' ' + p1[1] + ' L' + p2[0] + ' ' + p2[1], stroke: '#5C5F63', strokeWidth: 1.5 }), h('text', { x: pt[0], y: (+pt[1] + 2.5).toFixed(1), textAnchor: 'middle', fontSize: 6.5, fontWeight: 600, fill: '#5C5F63', fontFamily: 'Geist, sans-serif' }, String(v))); }),
      h('path', { d: 'M' + gx + ' ' + gy + ' V' + (gy - 22), stroke: '#DB011C', strokeWidth: 2, strokeLinecap: 'round', style: { transformBox: 'view-box', transformOrigin: gx + 'px ' + gy + 'px', transform: 'rotate(' + needleA + 'deg)', transition: live ? 'transform 2.6s ease-in-out' : 'none' } }),
      h('circle', { cx: gx, cy: gy, r: 3, fill: '#2B2F33' }),
      h('text', { x: gx, y: gy + 16, textAnchor: 'middle', fontSize: 7, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, 'PSI'),
      h('text', { x: gx, y: gy + 44, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#141414', fontFamily: 'Geist, sans-serif' }, psi + ' PSI'));

    const k0 = Math.max(0, st), kneel = st >= 0 && (k0 === 1 || k0 === 3 || k0 === 4);
    const tx = PX[k0] - 67.2, ty = 170 - 147.6;
    const hg = st >= 0 && ph >= 1 ? HAND[k0] : null;
    const loc = p => [(p[0] - tx) / .6, (p[1] - ty) / .6];
    const sh = hg ? loc(hg) : [124, 196], kh = hg ? loc(hg) : [170, 200];
    const person = h('g', { key: 'person', style: { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.6)', transition: live ? 'transform 1s ease' : 'none' } },
      h('g', { style: { opacity: kneel ? 0 : 1, transition: 'opacity .4s ease' } },
        h('path', { d: 'M106 246 L110 200 M118 246 L114 200', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round' }),
        h('path', { d: 'M112 200 L112 152', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M117 154 L' + sh[0].toFixed(1) + ' ' + sh[1].toFixed(1), stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: sh[0], cy: sh[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 112, cy: 133, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M100 132 A12 12 0 0 1 124 132 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M123 132 H132', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })),
      h('g', { style: { opacity: kneel ? 1 : 0, transition: 'opacity .4s ease' } },
        h('path', { d: 'M96 244 L128 244 L118 212', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }),
        h('path', { d: 'M118 212 L136 182', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M140 184 L' + kh[0].toFixed(1) + ' ' + kh[1].toFixed(1), stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: kh[0], cy: kh[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 144, cy: 166, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M132 165 A12 12 0 0 1 156 165 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M155 165 H164', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })));

    const chip = (on, w, fill, txt, key) => h('g', { key, style: vis(on, .4, .2) }, h('rect', { x: 10, y: 10, width: w, height: 24, rx: 12, fill }), h('text', { x: 10 + w / 2, y: 26, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, txt));
    const PT = [[360, 190], [286, 236], [192, 150], [222, 139], [204, 132]];
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: cómo se instala y funciona un sistema hidroneumático', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#EEF5FA' } },
      ground, cisterna, suctV, house, lines, unit, prime, gauge, person,
      chip(st === 0 && ph === 2, 170, B, 'El flotante cierra la entrada', 'c0'),
      chip(st === 4 && ph === 1, 196, B, 'Cebando: llena la bomba de agua', 'c4p'),
      chip(fn && ph === 1, 196, B, 'La bomba llena el tanque a presión', 'c1'),
      chip(fn && ph === 2, 160, '#1E9E55', '✓ A 40 PSI se apaga sola', 'c2'),
      chip(fn && ph === 3, 196, B, 'Abres una llave: baja la presión', 'c3'),
      chip(fn && ph === 4, 186, B, 'A 20 PSI la bomba prende sola', 'c4'),
      chip(fn && ph === 5, 202, B, 'Cierras la llave: sube hasta 40 PSI', 'c5'),
      st >= 0 && st < 5 && ph === 1 ? h('circle', { key: 'p' + st, className: 'ih22-frg-pulse', cx: PT[st][0], cy: PT[st][1], r: 12, fill: 'none', stroke: B, strokeWidth: 2.5 }) : null);
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(N),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map(([t, d], k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph >= 2), act = st === k && !isDone, on = act || isDone;
        return { t, d, n: String(k + 1), go: () => this.go(k), lbl: 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : ''), lblC: on ? '#1E6FC2' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#1E6FC2' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#1E6FC2' : '#E3ECF5', nfg: on ? '#FFFFFF' : '#1E6FC2' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, InstalarHidroneumatico_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F7FB", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "PASO A PASO · BOMBAS"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Así se instala y funciona un sistema hidroneumático."), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "La bomba de ½ HP también sirve como refacción para un sistema hidroneumático de 24 L.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #D4E3F2", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3ECF5", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#1E6FC2", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d)))))))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "12px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #DB011C" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "DATO IMPORTANTE"), h("span", { style: { fontSize: "14px", lineHeight: "1.45", textWrap: "pretty" } }, "Si la tubería de tu casa es antigua, puede haber fugas por la presión que manda la bomba.")), h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "CONFIGURACIÓN RECOMENDADA"), h("span", { style: { fontSize: "14px", lineHeight: "1.45", textWrap: "pretty" } }, "Tanque de 24 L con bomba de ½ HP para abastecer hasta 4 servicios.")), h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "TAMBIÉN CON TINACO SOBRE EL SUELO"), h("span", { style: { fontSize: "14px", lineHeight: "1.45", textWrap: "pretty" } }, "Si tu reserva es un tinaco en el piso en lugar de cisterna, el equipo succiona de ese tinaco. El resto es igual."))), h("a", { href: "https://bfmpedidosv-2.vercel.app/cotizar?f=26&ver=20183T", target: "_blank", rel: "noopener", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px 24px", alignItems: "center", padding: "14px 20px 14px 14px", borderRadius: "20px", background: "#FFFFFF", border: "1.5px solid #1E6FC2", textDecoration: "none", color: "#141414" } }, h("div", { style: { display: "flex", alignItems: "center", gap: "16px", minWidth: "0" } }, h("img", { src: "/bfm-assets/hidro/20183T.png", alt: "Equipo hidroneumático Pretul ½ HP con tanque de 24 L", width: "320", height: "388", style: { flex: "none", width: "110px", height: "auto" } }), h("span", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: "#1E6FC2" } }, "RECOMENDADO · PRETUL 20183"), h("span", { style: { fontWeight: "600", fontSize: "18px", lineHeight: "1.25", textWrap: "balance" } }, "Equipo hidroneumático ½ HP, tanque de 24 L"), h("span", { style: { fontWeight: "600", fontSize: "14px", color: "#1E6FC2" } }, "Cotizar →"))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" } }, h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderRadius: "14px", background: "#EEF4FB" } }, h("span", { style: { fontWeight: "700", fontSize: "22px", lineHeight: "1.1", letterSpacing: "-.02em", color: "#1E6FC2", whiteSpace: "nowrap" } }, "4"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "servicios")), h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderRadius: "14px", background: "#EEF4FB" } }, h("span", { style: { fontWeight: "700", fontSize: "22px", lineHeight: "1.1", letterSpacing: "-.02em", color: "#1E6FC2", whiteSpace: "nowrap" } }, "40 PSI"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "de presión")), h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderRadius: "14px", background: "#EEF4FB" } }, h("span", { style: { fontWeight: "700", fontSize: "22px", lineHeight: "1.1", letterSpacing: "-.02em", color: "#1E6FC2", whiteSpace: "nowrap" } }, "8 m"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "succiona hasta")), h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderRadius: "14px", background: "#EEF4FB" } }, h("span", { style: { fontWeight: "700", fontSize: "22px", lineHeight: "1.1", letterSpacing: "-.02em", color: "#1E6FC2", whiteSpace: "nowrap" } }, "20 m"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "sube hasta"))))));
  }
}

export default InstalarHidroneumatico;
