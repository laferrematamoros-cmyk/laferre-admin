"use client";
import React from "react";

// Bomba Sistemas Incorrectos — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "bsi24-" para no chocar con otros componentes.

const BombaSistemasIncorrectos_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes bsi24-frg-flow{to{stroke-dashoffset:-24}}@keyframes bsi24-el-spin{to{transform:rotate(360deg)}}@keyframes bsi24-el-glow{0%,100%{opacity:.2}50%{opacity:.6}}@keyframes bsi24-el-smoke{0%{transform:translateY(0) scale(.6);opacity:.7}100%{transform:translateY(-40px) scale(1.8);opacity:0}}@keyframes bsi24-el-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes bsi24-el-spark{0%,100%{opacity:0}50%{opacity:1}}";

const STEPS = [
  ['Bomba directo a la toma', 'Conectada al medidor de la calle, sin cisterna ni tinaco. Cuando se va el agua, sigue prendida en seco y se daña.'],
  ['Con control de presión, directo a la toma', 'Aunque lleve control de presión, sigue tomando el agua directo de la calle.'],
  ['Presurizadora directo a la toma', 'Tampoco conectes una presurizadora directo al medidor de la calle.'],
  ['Equipo de tanque azul', 'Este tipo de equipo hidroneumático no es compatible con la bomba de ½ HP.'],
  ['Control de presión en la salida, directo a la toma', 'Aunque el control vaya en la salida, la bomba sigue tomando el agua directo de la calle.'],
  ['Agua sucia', 'No uses la bomba con agua sucia: la arena y la tierra la desgastan. Pon un filtro en la entrada y una válvula check entre el tinaco y la bomba.'],
  ['Hidroneumático directo a la toma', 'Aunque tenga tanque, la bomba sigue tomando el agua directo de la calle. Si se va el agua, trabaja en seco y se daña.']
];
const DUR = [6600, 6600, 6600, 4400, 6600, 7800, 6600];
const IMGS = [{ img: '/bfm-assets/bomba/12111T.png', imgName: 'Bomba periférica ½ HP' }, { img: '/bfm-assets/bomba/bomba-control-102417.png', imgName: 'Bomba ½ HP con control automático de presión' }, { img: '/bfm-assets/bomba/presurizadora.png', imgName: 'Bomba presurizadora' }, null, null, { img: '/bfm-assets/bomba/bomba-control-102417.png', imgName: 'Bomba ½ HP con control automático de presión' }, { img: '/bfm-assets/hidro/20183T.png', imgName: 'Equipo hidroneumático ½ HP, tanque 24 L' }];
const PH = { 0: [2600, 4000], 1: [2600, 4000], 2: [2600, 4000], 4: [2600, 4000], 5: [2800, 4800], 6: [2600, 4000] };

const SEQ = { 0: [[90, 1], [2600, 2], [4000, 3]], 1: [[90, 1], [2600, 2], [4000, 3]], 2: [[90, 1], [2600, 2], [4000, 3]], 3: [[90, 1]], 4: [[90, 1], [2600, 2], [4000, 3]], 5: [[90, 1], [2800, 2], [4800, 3]] , 6: [[90, 1], [2600, 2], [4000, 3]] };
const FINAL = [3, 3, 3, 1, 3, 3, 3];

class BombaSistemasIncorrectos extends React.Component {
  state = { phs: [0, 0, 0, 0, 0, 0, 0] };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ phs: FINAL.slice() }); return; }
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.start(); return; }
    // Capacitaciones: arranca al llegar a la parte de arriba de la pantalla (con threshold, las altas no arrancaban en celular).
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.start(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.T.forEach(clearTimeout); if (this.io) this.io.disconnect(); }
  setPh(k, v) { this.setState(s => { const a = s.phs.slice(); a[k] = v; return { phs: a }; }); }
  loop(k) {
    this.setPh(k, 0);
    SEQ[k].forEach(([t, p]) => this.T.push(setTimeout(() => this.setPh(k, p), t)));
    this.T.push(setTimeout(() => this.loop(k), DUR[k]));
  }
  start() { [0, 1, 2, 3, 4, 5, 6].forEach(k => this.T.push(setTimeout(() => this.loop(k), k * 250))); }
  scene(k0, ph, num) {
    const h = React.createElement, st = k0;
    const G = '#7E868D', RED = '#DB011C', OK = '#1E9E55', GP = '#D5DADF', brass = '#C8A04A', brassD = '#8A6A2A';
    const live = true;
    const vis = (on, d, dl) => ({ opacity: on ? 1 : 0, transition: live ? 'opacity ' + (d || .5) + 's ease ' + (dl || 0) + 's' : 'none' });
    const flow = (on, key, d, c, sp) => h('path', { key, d, fill: 'none', stroke: c || '#5AA9E6', strokeWidth: 2.4, strokeLinecap: 'round', strokeDasharray: '4 8', style: Object.assign({ animation: 'bsi24-frg-flow ' + (sp || .55) + 's linear infinite' }, vis(on, .4)) });
    const lbl = (x, y, t, anchor) => h('text', { key: 'l' + t, x, y, textAnchor: anchor || 'middle', fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, t);
    const k = k0;
    const caseA = k !== 3 && k !== 5, dirty = k === 5, blue = k === 3;
    const run = st >= 0 && ph >= 1 && !blue;
    const dry = caseA && ph >= 2, burn = caseA && ph === 3;
    const wear = dirty && ph === 2, filt = dirty && ph === 3;
    const outY = k === 1 ? 158 : 182;

    const ground = [h('rect', { key: 'soil', x: 0, y: 220, width: 400, height: 40, fill: '#E6D3AE' }), h('rect', { key: 'grass', x: 0, y: 214, width: 400, height: 7, fill: '#5FB360' })];
    const house = h('g', { key: 'house', style: vis(!blue, .4) },
      h('polygon', { points: '278,100 333,64 388,100', fill: '#C9683F' }),
      h('rect', { x: 286, y: 98, width: 94, height: 116, fill: '#F4E3C3', stroke: '#B9A27A', strokeWidth: 1.5 }),
      h('rect', { x: 344, y: 172, width: 18, height: 42, fill: '#8A5A3A' }),
      h('rect', { x: 296, y: 128, width: 32, height: 24, fill: '#CFE6F5', stroke: '#B9A27A', strokeWidth: 1.2 }),
      h('path', { d: 'M286 130 H312 V136', fill: 'none', stroke: '#2F6DB5', strokeWidth: 2.5 }),
      h('path', { d: 'M306 136 H314 V139', fill: 'none', stroke: G, strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('path', { d: 'M314 140 V150', stroke: '#5AA9E6', strokeWidth: 2, strokeDasharray: '3 3', style: Object.assign({ animation: 'bsi24-frg-flow .5s linear infinite' }, vis(run && !dry, .3)) }));

    const street = h('g', { key: 'street', style: vis(caseA, .4) },
      h('path', { d: 'M40 260 V196 H202', fill: 'none', stroke: dry ? '#ECEEF0' : GP, strokeWidth: 6, strokeLinejoin: 'round', style: { transition: 'stroke .6s' } }),
      flow(run && !dry && caseA, 'fin', 'M40 258 V196 H200'),
      h('rect', { x: 80, y: 189, width: 12, height: 14, rx: 2, fill: '#B9C0C6', stroke: G, strokeWidth: 1 }),
      h('path', { d: 'M86 189 V180', stroke: G, strokeWidth: 2 }),
      h('ellipse', { cx: 86, cy: 178, rx: 9, ry: 3, fill: '#8A9096' }),
      h('rect', { x: 128, y: 186, width: 26, height: 20, rx: 5, fill: '#E3E6E9', stroke: G, strokeWidth: 1.2 }),
      h('ellipse', { cx: 141, cy: 185, rx: 10, ry: 4, fill: '#FFFFFF', stroke: G, strokeWidth: 1.2 }),
      lbl(86, 170, 'LLAVE'), lbl(141, 176, 'MEDIDOR'), lbl(46, 238, 'TOMA DE LA CALLE', 'start'));

    const tinaco = h('g', { key: 'tin', style: vis(dirty, .4) },
      h('path', { d: 'M0 102 H90 V114', fill: 'none', stroke: GP, strokeWidth: 6, strokeLinejoin: 'round' }),
      h('g', { style: { opacity: filt ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center top', transform: filt ? 'none' : 'scale(.6)', transition: 'all .5s ease' } }, h('rect', { x: 26, y: 100, width: 14, height: 24, rx: 3, fill: '#3A7FD0', stroke: '#1F4E86', strokeWidth: 1 }), h('rect', { x: 28.5, y: 104, width: 9, height: 16, rx: 1.5, fill: '#FFFFFF', opacity: .6 }), lbl(33, 134, 'FILTRO')),
      flow(dirty && ph >= 1, 'tin-in', 'M0 102 H90 V114', filt ? '#5AA9E6' : '#8B5A2B'),
      h('rect', { x: 50, y: 112, width: 80, height: 102, rx: 14, fill: '#F1F1EE', stroke: G, strokeWidth: 1.5 }),
      h('ellipse', { cx: 90, cy: 114, rx: 24, ry: 5, fill: '#E3E6E9', stroke: G, strokeWidth: 1.2 }),
      h('rect', { x: 55, y: 136, width: 70, height: 74, rx: 10, style: { fill: filt ? '#5AA9E6' : '#A0784A', opacity: .8, transition: 'fill 1.6s ease' } }),
      h('g', { style: vis(!filt, 1.2) }, [[66, 150], [84, 168], [104, 146], [72, 186], [96, 196], [114, 176], [62, 200]].map((p, i) => h('circle', { key: 'pt' + i, cx: p[0], cy: p[1], r: 2.2, fill: '#5A3B1E', style: { transformBox: 'fill-box', animation: 'bsi24-el-float ' + (1.4 + (i % 3) * .3) + 's ease-in-out infinite' } }))),
      h('path', { d: 'M130 196 H202', fill: 'none', stroke: GP, strokeWidth: 6 }),
      flow(dirty && ph >= 1, 'tin-out', 'M130 196 H200', filt ? '#5AA9E6' : '#8B5A2B'),
      h('g', { style: { opacity: filt ? 1 : 0, transition: 'opacity .5s ease .3s' } },
        h('rect', { x: 156, y: 189.5, width: 14, height: 13, rx: 2, fill: brass, stroke: brassD, strokeWidth: 1 }),
        h('path', { d: 'M160 196 H166 M163.5 193 L166 196 L163.5 199', fill: 'none', stroke: brassD, strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M163 189 V178', stroke: G, strokeWidth: .8, strokeDasharray: '2 2' }),
        lbl(163, 174, 'VÁLVULA CHECK')),
      lbl(90, 240, 'TINACO'));

    const glow = burn || wear;
    const pumpVis = k !== 2 && k !== 6 && !blue;
    const pump = h('g', { key: 'pump' },
      h('rect', { x: 192, y: 206, width: 70, height: 8, fill: '#E5E5E2', stroke: '#C9CED3', strokeWidth: 1, style: vis(!blue, .4) }),
      h('circle', { cx: 228, cy: 194, r: 30, fill: '#FF5A36', style: Object.assign(vis(glow, .6), glow ? { animation: 'bsi24-el-glow 1s ease-in-out infinite' } : {}) }),
      h('g', { style: vis(pumpVis, .4) },
        h('rect', { x: 226, y: 184, width: 30, height: 22, rx: 6, fill: (k <= 1 || k === 5) ? '#3A4148' : '#2F6DB5' }),
        h('path', { d: 'M232 186 V204 M238 186 V204 M244 186 V204', stroke: (k <= 1 || k === 5) ? '#1A1D21' : '#1F4E86', strokeWidth: 1.2 }),
        h('circle', { cx: 214, cy: 194, r: 11, style: { fill: glow ? '#FF8A3D' : (k <= 1 || k === 5) ? '#4A525A' : '#C9CED3', stroke: G, strokeWidth: 1.5, transition: 'fill 1s ease' } }),
        h('rect', { x: 199, y: 191, width: 5, height: 7, fill: brass }),
        h('rect', { x: 211, y: 179, width: 6, height: 5, fill: brass })),
      h('g', { style: vis(k === 2 && st >= 0, .4) },
        h('rect', { x: 210, y: 166, width: 8, height: 8, rx: 1, fill: brass, stroke: brassD, strokeWidth: .8 }),
        h('path', { d: 'M210 168.5 H218 M210 171 H218', stroke: brassD, strokeWidth: .6 }),
        h('polygon', { points: '207,174 221,174 222,177 221,180 207,180 206,177', fill: brass, stroke: brassD, strokeWidth: .8 }),
        h('rect', { x: 199, y: 191, width: 8, height: 7, fill: brass, stroke: brassD, strokeWidth: .8 }),
        h('rect', { x: 205, y: 179, width: 17, height: 27, rx: 5, fill: '#2B2F33' }),
        h('rect', { x: 220, y: 183, width: 25, height: 22, rx: 4, fill: '#F07A1A', stroke: '#B8560F', strokeWidth: 1.2 }),
        h('ellipse', { cx: 245, cy: 194, rx: 5, ry: 11, fill: '#1A1D21' }),
        h('circle', { cx: 245.5, cy: 194, r: 2.4, fill: '#C9CED3' }),
        h('rect', { x: 221, y: 172, width: 22, height: 12, rx: 2, fill: '#1F2226' }),
        h('rect', { x: 235, y: 174.5, width: 6, height: 4, rx: 1.5, fill: '#F07A1A' })),
      h('g', { style: vis(k === 6 && st >= 0, .4) },
        h('path', { d: 'M199 194.5 H202 V177 H206', fill: 'none', stroke: GP, strokeWidth: 5, strokeLinejoin: 'round' }),
        h('rect', { x: 210, y: 203, width: 8, height: 4, fill: '#C99A0A' }), h('rect', { x: 246, y: 203, width: 8, height: 4, fill: '#C99A0A' }),
        h('rect', { x: 204, y: 184, width: 54, height: 21, rx: 10.5, fill: '#F5C518', stroke: '#C99A0A', strokeWidth: 1.2 }),
        h('ellipse', { cx: 207, cy: 194.5, rx: 3.5, ry: 8, fill: '#D5DADF', stroke: G, strokeWidth: 1 }),
        h('path', { d: 'M209 184 C202 186 202 191 205 194', fill: 'none', stroke: '#B9C0C6', strokeWidth: 2.2, strokeLinecap: 'round' }),
        h('rect', { x: 220, y: 180, width: 26, height: 5, fill: '#C99A0A' }),
        h('rect', { x: 222, y: 167, width: 24, height: 14, rx: 4, fill: '#F5C518', stroke: '#C99A0A', strokeWidth: 1.2 }),
        h('path', { d: 'M228 169 V179 M233 169 V179 M238 169 V179', stroke: '#C99A0A', strokeWidth: 1 }),
        h('rect', { x: 226, y: 162, width: 16, height: 5, rx: 1, fill: '#2B2F33' }),
        h('circle', { cx: 214, cy: 175, r: 8, fill: '#F5C518', stroke: '#C99A0A', strokeWidth: 1.2 }),
        h('circle', { cx: 214, cy: 175, r: 2.5, fill: '#F2F2EF' }),
        h('rect', { x: 205, y: 156, width: 16, height: 10, rx: 2, fill: '#9AA0A6', stroke: G, strokeWidth: .8 }),
        h('circle', { cx: 224, cy: 158, r: 3.5, fill: '#FFFFFF', stroke: G, strokeWidth: 1 })),
      h('g', { style: { transformBox: 'fill-box', transformOrigin: 'center', animation: run ? 'bsi24-el-spin ' + (dry ? .25 : .45) + 's linear infinite' : 'none', opacity: pumpVis ? 1 : 0 } }, h('path', { d: 'M208 194 H220 M214 188 V200', stroke: '#5E646B', strokeWidth: 1.6, strokeLinecap: 'round' })),
      h('g', { style: vis(burn, .5, .3) }, [0, .8, 1.6].map(d => h('circle', { key: 'sm' + d, cx: 240, cy: 176, r: 6, fill: '#8A8D91', style: { transformBox: 'fill-box', transformOrigin: 'center', animation: 'bsi24-el-smoke 2.2s ease-out ' + d + 's infinite', opacity: 0 } }))),
      h('g', { style: vis(wear, .3) }, [[200, 182], [228, 182], [206, 208]].map((p, i) => h('path', { key: 'sp' + i, d: 'M' + p[0] + ' ' + p[1] + ' l-5 -5 M' + (p[0] + 4) + ' ' + p[1] + ' l3 -7', stroke: '#FFB300', strokeWidth: 2, strokeLinecap: 'round', style: { animation: 'bsi24-el-spark .3s linear ' + (i * .1) + 's infinite' } }))));

    const out = 'M214 ' + outY + ' V130 H286';
    const disch = h('g', { key: 'disch', style: vis(!blue, .4) },
      h('path', { d: 'M214 182 V130 H286', fill: 'none', stroke: '#2F6DB5', strokeWidth: 5, strokeLinejoin: 'round' }),
      flow(run && !dry, 'fout', out),
      h('g', { style: vis(k === 1 && st >= 0, .4) }, h('rect', { x: 203, y: 158, width: 22, height: 24, rx: 4, fill: '#F07A1A', stroke: '#B8560F', strokeWidth: 1.2 }), h('circle', { cx: 214, cy: 168, r: 4, fill: '#FFFFFF', stroke: '#5E646B', strokeWidth: 1 })),
      h('g', { style: vis(k === 4, .4) }, h('rect', { x: 203, y: 138, width: 22, height: 24, rx: 4, fill: '#F07A1A', stroke: '#B8560F', strokeWidth: 1.2 }), h('circle', { cx: 214, cy: 148, r: 4, fill: '#FFFFFF', stroke: '#5E646B', strokeWidth: 1 })),
      h('g', { style: vis((k === 1 || k === 4) && st >= 0, .4) }, lbl(199, k === 1 ? 160 : 150, 'CONTROL DE PRESIÓN', 'end')));

    const xa = blue && ph >= 1;
    const tankBlue = h('g', { key: 'blue', style: vis(blue, .4) },
      h('rect', { x: 166, y: 196, width: 14, height: 18, rx: 2, fill: '#1F5FA0' }), h('rect', { x: 232, y: 196, width: 14, height: 18, rx: 2, fill: '#1F5FA0' }),
      h('rect', { x: 146, y: 146, width: 120, height: 58, rx: 29, fill: '#2F8FE0', stroke: '#1F5FA0', strokeWidth: 2 }),
      h('path', { d: 'M160 160 H252', stroke: '#FFFFFF', strokeWidth: 3, opacity: .35, strokeLinecap: 'round' }),
      h('rect', { x: 168, y: 112, width: 76, height: 34, rx: 6, fill: '#1F1F1F' }),
      h('path', { d: 'M212 116 V142 M220 116 V142 M228 116 V142', stroke: '#3A3F45', strokeWidth: 2 }),
      h('circle', { cx: 180, cy: 129, r: 9, fill: '#2B2F33', stroke: '#5E646B', strokeWidth: 1.5 }),
      h('path', { d: 'M150 176 C136 160 146 128 168 126', fill: 'none', stroke: '#9AA0A6', strokeWidth: 3 }),
      [['M140 104 L272 222', 0], ['M272 104 L140 222', .5]].map(([d, dl]) => h('path', { key: d, d, fill: 'none', stroke: '#E5322D', strokeWidth: 9, strokeLinecap: 'round', strokeDasharray: 180, style: { strokeDashoffset: xa ? 0 : 180, transition: xa ? 'stroke-dashoffset .6s ease ' + (.2 + dl) + 's' : 'none' } })));

    const chipW = t => Math.round(t.length * 5.7 + 22);
    const chip = (on, fill, txt, key, y) => { const w = chipW(txt); return h('g', { key, style: vis(on, .4, .1) }, h('rect', { x: 10, y: y || 42, width: w, height: 24, rx: 12, fill }), h('text', { x: 10 + w / 2, y: (y || 42) + 16, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, txt)); };
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: sistemas incorrectos que dañan la bomba', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F6F2EC' } },
      ground, house, street, tinaco, disch, pump, tankBlue,
      h('g', { key: 'badge', style: vis(st >= 0 && !filt, .3) }, h('circle', { cx: 22, cy: 22, r: 12, fill: RED }), h('text', { x: 22, y: 26.5, textAnchor: 'middle', fontSize: 13, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, String(num || k + 1)), h('text', { x: 40, y: 26.5, fontSize: 11, fontWeight: 800, fill: RED, fontFamily: 'Geist, sans-serif' }, '✕ INCORRECTO')),
      chip(caseA && ph === 1, '#1E6FC2', 'Funciona… mientras haya agua en la calle', 'a1'),
      chip(caseA && ph === 2, '#5C5F63', 'Se va el agua en la calle', 'a2'),
      chip(burn, RED, '✕ Sigue prendida en seco y se daña', 'a3'),
      chip(xa, RED, '✕ No es compatible con la bomba de ½ HP', 'b1'),
      chip(dirty && ph === 1, '#8B5A2B', 'Entra agua con arena y tierra', 'c1'),
      chip(wear, RED, '✕ La arena desgasta la bomba', 'c2'),
      chip(filt, OK, '✓ Con filtro, el agua llega limpia', 'c3', 10));
  }
  renderVals() {
    const phs = this.state.phs;
    return { rootRef: this.rootRef, cards: STEPS.map(([t, d], k) => ({ t, d, k })).filter(c => c.k !== 3 && c.k !== 4).map(({ t, d, k }, i) => ({ t, d, n: String(i + 1), scene: this.scene(k, phs[k], i + 1), hasImg: !!IMGS[k], slot: 'bsi-' + k, img: IMGS[k] ? IMGS[k].img : '', imgName: IMGS[k] ? IMGS[k].imgName : '' })) };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, BombaSistemasIncorrectos_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FBF4EF", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "ERRORES COMUNES · BOMBAS"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Así NO conectes tu bomba."), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Estos sistemas dañan la bomba o le acortan la vida útil."))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: "12px" } }, (v.cards || []).map((c, $index) => h(React.Fragment, { key: $index }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "12px", borderRadius: "18px", background: "#FFFFFF" } }, c?.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "3px", padding: "0 4px 4px" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "ERROR ", c?.n), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, c?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, c?.d)), (c?.hasImg ? h(React.Fragment, null, h("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "auto", padding: "6px 10px 6px 6px", borderRadius: "12px", background: "#F6F6F4" } }, h("span", { style: { flex: "none", width: "64px", height: "56px", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" } }, (c?.img ? h("img", { src: c?.img, alt: "Foto", style: Object.assign({ width: "64px", height: "56px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "64px", height: "56px" }, { background: '#F3F3F1' }) }))), h("span", { style: { display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" } }, h("span", { style: { font: "500 10.5px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#5C5F63" } }, "EQUIPO EN LA ANIMACIÓN"), h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.3" } }, c?.imgName)))) : null))))), h("div", { style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #1E9E55" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#1E9E55", color: "#FFFFFF", fontWeight: "700" } }, "✓"), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px" } }, h("span", { style: { fontWeight: "600" } }, "Lo correcto"), h("span", { style: { fontSize: "14px", color: "#5C5F63", textWrap: "pretty" } }, "La bomba siempre toma el agua de una cisterna o un tinaco, nunca directo de la toma de la calle.")))));
  }
}

export default BombaSistemasIncorrectos;
