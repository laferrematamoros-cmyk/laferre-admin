"use client";
import React from "react";

// Cable e Interruptor — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "cei17-" para no chocar con otros componentes.

const CableEInterruptor_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500&display=swap\");@keyframes cei17-frg-flow{to{stroke-dashoffset:-24}}@keyframes cei17-el-spin{to{transform:rotate(360deg)}}@keyframes cei17-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.cei17-frg-pulse{transform-box:fill-box;transform-origin:center;animation:cei17-frg-pulse 1.1s ease-out 0s 2 both}@media (prefers-reduced-motion:reduce){.cei17-frg-pulse{animation:none;opacity:0}}";

const STEPS = [
  { cal: '14', amp: '15', t: 'Iluminación', d: 'Focos y apagadores.' },
  { cal: '12', amp: '20', t: 'Contactos', d: 'Refrigerador, TV, licuadora, plancha, computadora y herramienta eléctrica.' },
  { cal: '10', amp: '30', t: 'Aparatos de alto consumo', d: 'Minisplit en largas distancias, estufa eléctrica, horno eléctrico y secadora.' },
  { cal: '8', amp: '40', t: 'Acometida', d: 'La entrada de luz que llega del medidor a tu casa.' }
];
const DUR = [3400, 3600, 3600, 4400];

class CableEInterruptor extends React.Component {
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
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: STEPS.length - 1, ph: 1 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.T.push(setTimeout(() => this.setState({ st: k, ph: 0 }), t)); this.T.push(setTimeout(() => this.setState({ ph: 1 }), t + 90)); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.setState({ st: k, ph: 0 }); this.T.push(setTimeout(() => this.setState({ ph: 1 }), 90)); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const done = k => st > k || (st === k && ph === 1);
    const live = st >= 0;
    const T = (p, d, dl) => live ? p + ' ' + d + 's ease ' + dl + 's' : 'none';
    const R = [40, 100, 160, 220], W = [4, 5.5, 7, 9], CC = ['#E5322D', '#1A1A1A', '#E5322D', '#1A1A1A'];
    const lit = (k, a, b, dl) => ({ fill: done(k) ? a : b, transition: T('fill', .5, dl == null ? 1.2 : dl) });
    const show = (k, key, kids, dl) => h('g', { key, style: { opacity: done(k) ? 1 : 0, transition: T('opacity', .5, dl == null ? 1.2 : dl) } }, kids);
    const spin = (k, s) => ({ transformBox: 'fill-box', transformOrigin: 'center', animation: done(k) ? 'cei17-el-spin ' + s + 's linear infinite' : 'none' });
    const G = '#7E868D', L = '#9AA0A6', SCR = '#2B2F33';

    const rows = R.map((y, k) => {
      const cab = 'M62 ' + y + ' H146';
      return h('g', { key: 'r' + k },
        h('rect', { x: 82, y: y - 28, width: 314, height: 56, rx: 10, fill: '#FFFFFF', style: { opacity: st === k ? 1 : 0, transition: 'opacity .4s ease' } }),
        h('rect', { x: 26, y: y - 24, width: 36, height: 48, rx: 3, fill: '#1B1B1B', stroke: '#000000', strokeWidth: 1 }),
        h('rect', { x: 29, y: y - 21, width: 30, height: 12, rx: 3, fill: '#D9C7F0' }),
        h('text', { x: 44, y: y - 12, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: '#141414', fontFamily: 'Geist, sans-serif' }, STEPS[k].amp + 'A'),
        h('rect', { x: 38, y: y - 5, width: 12, height: 24, rx: 2, fill: '#0A0A0A', stroke: '#3A3F45', strokeWidth: 1 }),
        h('rect', { x: 40, y: y - 3, width: 8, height: 10, rx: 1.5, fill: done(k) ? '#E5322D' : L, style: { transform: done(k) ? 'none' : 'translateY(10px)', transition: live ? 'transform .35s ease, fill .35s ease' : 'none' } }),
        h('text', { x: 104, y: y - 10, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'CAL. ' + STEPS[k].cal),
        h('path', { d: cab, stroke: '#E3DCCF', strokeWidth: W[k], strokeDasharray: '3 4' }),
        h('path', { d: cab, fill: 'none', stroke: CC[k], strokeWidth: W[k], strokeDasharray: 90, style: { strokeDashoffset: done(k) ? 0 : 90, transition: T('stroke-dashoffset', 1, .3) } }),
        show(k, 'tip', [h('path', { key: 'c', d: 'M146 ' + y + ' H160', stroke: '#C77B3B', strokeWidth: W[k] * .75, strokeLinecap: 'round' }), h('path', { key: 'c2', d: 'M147 ' + y + ' H159', stroke: '#F0B27A', strokeWidth: W[k] * .75, strokeDasharray: '1.5 2' })], 1.1),
        show(k, 'flow', [h('path', { key: 'f', d: cab, fill: 'none', stroke: '#FFD23F', strokeWidth: Math.max(1.5, W[k] * .35), strokeLinecap: 'round', strokeDasharray: '4 8', style: { animation: 'cei17-frg-flow .6s linear infinite' } })], 1.3));
    });

    const rays = [-150, -110, -70, -30, 180, 0].map((a, i) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return h('path', { key: 'ry' + i, d: 'M' + (205 + c * 15).toFixed(1) + ' ' + (33 + s * 15).toFixed(1) + ' L' + (205 + c * 20).toFixed(1) + ' ' + (33 + s * 20).toFixed(1), stroke: '#F2B705', strokeWidth: 2, strokeLinecap: 'round' }); });
    const row0 = h('g', { key: 'l0' },
      show(0, 'rays', rays),
      h('circle', { cx: 205, cy: 33, r: 11, stroke: G, strokeWidth: 1.5, style: lit(0, '#FFD84D', '#F1F1EE') }),
      h('path', { d: 'M201 37 L203 41 L205 37 L207 41 L209 37', fill: 'none', stroke: G, strokeWidth: 1 }),
      h('rect', { x: 200, y: 44, width: 10, height: 9, rx: 2, fill: L }),
      h('path', { d: 'M200 47 H210 M200 50 H210', stroke: G, strokeWidth: 1 }),
      h('rect', { x: 253, y: 24, width: 24, height: 32, rx: 3, fill: '#FFFFFF', stroke: L, strokeWidth: 1.5 }),
      h('circle', { cx: 265, cy: 27.5, r: 1.2, fill: L }), h('circle', { cx: 265, cy: 52.5, r: 1.2, fill: L }),
      h('rect', { x: 260, y: 31, width: 10, height: 18, rx: 2, fill: '#ECEEF0', stroke: L, strokeWidth: 1.2 }),
      h('rect', { x: 261, y: 32, width: 8, height: 8, rx: 1.5, fill: '#C9CED3', style: { transform: done(0) ? 'none' : 'translateY(8px)', transition: T('transform', .3, 1) } }),
      show(0, 'glow', [h('circle', { key: 'g', cx: 330, cy: 32, r: 20, fill: '#FFE58A', opacity: .4 })]),
      h('circle', { cx: 330, cy: 32, r: 12, stroke: '#B9C0C6', strokeWidth: 1.5, style: lit(0, '#FFF4C2', '#ECECE8') }),
      h('rect', { x: 325, y: 42, width: 10, height: 11, rx: 2, fill: '#C9CED3', stroke: L, strokeWidth: 1 }),
      h('path', { d: 'M325 46 H335 M325 49 H335', stroke: L, strokeWidth: 1 }));

    const row1 = h('g', { key: 'l1' },
      h('rect', { x: 176, y: 78, width: 26, height: 44, rx: 3, fill: '#EEF2F6', stroke: G, strokeWidth: 1.5 }),
      h('path', { d: 'M176 93 H202', stroke: G, strokeWidth: 1.2 }),
      h('path', { d: 'M181 82 V89 M181 97 V108', stroke: G, strokeWidth: 2, strokeLinecap: 'round' }),
      show(1, 'snow', [h('circle', { key: 'c', cx: 200, cy: 80, r: 7.5, fill: '#1E6FC2' }), h('path', { key: 'p', d: 'M200 75 V85 M195.7 77.5 L204.3 82.5 M195.7 82.5 L204.3 77.5', stroke: '#FFFFFF', strokeWidth: 1.4, strokeLinecap: 'round' })]),
      h('rect', { x: 219, y: 84, width: 22, height: 32, rx: 3, fill: '#FFFFFF', stroke: L, strokeWidth: 1.5 }),
      h('path', { d: 'M226 89 V95 M234 89 V95 M226 103 V109 M234 103 V109', stroke: '#5E646B', strokeWidth: 2, strokeLinecap: 'round' }),
      h('path', { d: 'M228.5 98 a1.5 1.5 0 0 1 3 0 M228.5 112 a1.5 1.5 0 0 1 3 0', stroke: '#5E646B', strokeWidth: 1.5, fill: 'none' }),
      h('path', { d: 'M266 86 L260 78 M282 86 L288 78', stroke: G, strokeWidth: 1.5, strokeLinecap: 'round' }),
      h('rect', { x: 254, y: 86, width: 40, height: 27, rx: 3, fill: SCR }),
      h('rect', { x: 257, y: 89, width: 34, height: 21, rx: 1.5, style: lit(1, '#7FC4F0', '#4A5057') }),
      show(1, 'gl', [h('path', { key: 'g', d: 'M262 106 L276 92 M270 107 L282 95', stroke: '#FFFFFF', strokeWidth: 1.5, opacity: .6 })]),
      h('rect', { x: 268, y: 113, width: 12, height: 4, fill: SCR }), h('rect', { x: 263, y: 117, width: 22, height: 2.5, rx: 1, fill: SCR }),
      h('rect', { x: 309, y: 75, width: 18, height: 4, rx: 1.5, fill: G }),
      h('path', { d: 'M310 79 H326 L323 102 H313 Z', fill: '#E3F1F8', stroke: G, strokeWidth: 1.5, strokeLinejoin: 'round' }),
      h('g', { style: spin(1, .35) }, h('path', { d: 'M313 97 H323', stroke: '#5E646B', strokeWidth: 2, strokeLinecap: 'round' })),
      h('rect', { x: 308, y: 102, width: 20, height: 16, rx: 3, fill: '#DB011C' }),
      h('circle', { cx: 318, cy: 110, r: 3.5, fill: '#FFFFFF', stroke: G, strokeWidth: 1 }),
      h('rect', { x: 344, y: 86, width: 30, height: 21, rx: 2, fill: SCR }),
      h('rect', { x: 346.5, y: 88.5, width: 25, height: 16, style: lit(1, '#7FC4F0', '#4A5057') }),
      h('path', { d: 'M359 107 V113', stroke: SCR, strokeWidth: 3 }), h('path', { d: 'M352 114 H366', stroke: SCR, strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('rect', { x: 378, y: 86, width: 12, height: 31, rx: 1.5, fill: '#1F1F1F' }),
      h('path', { d: 'M381 91 H387 M381 94 H387', stroke: '#5E646B', strokeWidth: 1 }),
      h('circle', { cx: 384, cy: 110, r: 1.6, style: lit(1, '#3FD07A', '#3A3F45') }));

    const air = [190, 212, 234].map(x => h('path', { key: 'a' + x, d: 'M' + x + ' 171 C' + (x + 4) + ' 177 ' + (x - 4) + ' 181 ' + x + ' 188', fill: 'none', stroke: '#5AA9E6', strokeWidth: 2, strokeLinecap: 'round', strokeDasharray: '3 3', style: { animation: 'cei17-frg-flow 1s linear infinite' } }));
    const coil = (cx, r, w) => h('circle', { key: 'k' + cx + r, cx, cy: 162, r, fill: 'none', strokeWidth: w, style: { stroke: done(2) ? '#FF5A36' : '#5E646B', transition: T('stroke', .6, 1.2) } });
    const row2 = h('g', { key: 'l2' },
      h('rect', { x: 176, y: 142, width: 72, height: 25, rx: 7, fill: '#F3F0E2', stroke: G, strokeWidth: 1.5 }),
      h('path', { d: 'M182 160 H242', stroke: L, strokeWidth: 1.2 }),
      h('rect', { x: 204, y: 148, width: 16, height: 6, rx: 3, style: lit(2, '#3FD07A', '#C9C3AE') }),
      show(2, 'air', air),
      h('rect', { x: 262, y: 149, width: 52, height: 26, rx: 3, fill: SCR }),
      show(2, 'heat', [h('circle', { key: 'a', cx: 276, cy: 162, r: 11, fill: '#FF5A36', opacity: .22 }), h('circle', { key: 'b', cx: 300, cy: 162, r: 11, fill: '#FF5A36', opacity: .22 })]),
      coil(276, 8, 2.2), coil(276, 4, 1.8), coil(300, 8, 2.2), coil(300, 4, 1.8),
      h('rect', { x: 330, y: 136, width: 48, height: 48, rx: 4, fill: '#F4A585', stroke: G, strokeWidth: 1.5 }),
      h('rect', { x: 330, y: 136, width: 48, height: 10, rx: 3, fill: '#FFFFFF', stroke: G, strokeWidth: 1.5 }),
      h('circle', { cx: 362, cy: 141, r: 2.2, fill: G }), h('circle', { cx: 370, cy: 141, r: 2.2, fill: G }),
      h('circle', { cx: 354, cy: 166, r: 13, fill: '#FFFFFF', stroke: G, strokeWidth: 2 }),
      h('circle', { cx: 354, cy: 166, r: 9, fill: '#F1F1EE' }),
      h('g', { style: spin(2, 1.2) }, h('circle', { cx: 354, cy: 166, r: 9, fill: 'none' }), h('circle', { cx: 350, cy: 169, r: 3, fill: '#5AA9E6' }), h('circle', { cx: 358, cy: 163, r: 2.5, fill: '#DB011C' }), h('circle', { cx: 352, cy: 161, r: 2, fill: '#3FD07A' })));

    const acom = 'M208 197 Q262 216 322 207';
    const row3 = h('g', { key: 'l3' },
      h('path', { d: 'M168 246 H396', stroke: '#CDBFA9', strokeWidth: 2 }),
      h('rect', { x: 193, y: 192, width: 6, height: 54, fill: '#E8A23C', stroke: '#9A6A20', strokeWidth: 1 }),
      h('rect', { x: 180, y: 197, width: 32, height: 4, fill: '#E8A23C', stroke: '#9A6A20', strokeWidth: 1 }),
      h('circle', { cx: 184, cy: 196, r: 2, fill: '#5E646B' }), h('circle', { cx: 208, cy: 196, r: 2, fill: '#5E646B' }),
      h('rect', { x: 178, y: 220, width: 14, height: 18, rx: 2, fill: '#D5DADF', stroke: G, strokeWidth: 1.2 }),
      h('circle', { cx: 185, cy: 227, r: 4, fill: '#FFFFFF', stroke: G, strokeWidth: 1 }),
      h('path', { d: acom, fill: 'none', stroke: '#E3DCCF', strokeWidth: 3, strokeDasharray: '3 4' }),
      h('path', { d: acom, fill: 'none', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: 130, style: { strokeDashoffset: done(3) ? 0 : 130, transition: T('stroke-dashoffset', 1, 1.1) } }),
      show(3, 'af', [h('path', { key: 'f', d: acom, fill: 'none', stroke: '#FFD23F', strokeWidth: 1.4, strokeLinecap: 'round', strokeDasharray: '4 8', style: { animation: 'cei17-frg-flow .6s linear infinite' } })], 2.1),
      h('rect', { x: 362, y: 188, width: 7, height: 14, fill: '#D5DADF', stroke: G, strokeWidth: 1.2 }),
      h('polygon', { points: '314,210 347,186 380,210', fill: '#E5322D', stroke: '#B3201B', strokeWidth: 1.5, strokeLinejoin: 'round' }),
      h('rect', { x: 320, y: 208, width: 54, height: 38, fill: '#FFFFFF', stroke: G, strokeWidth: 1.5 }),
      h('rect', { x: 342, y: 222, width: 11, height: 24, fill: G }),
      h('rect', { x: 326, y: 216, width: 11, height: 10, stroke: G, strokeWidth: 1.2, style: lit(3, '#FFD84D', '#D5DADF', 2.1) }),
      h('rect', { x: 358, y: 216, width: 11, height: 10, stroke: G, strokeWidth: 1.2, style: lit(3, '#FFD84D', '#D5DADF', 2.1) }));

    const seps = [70, 130, 190].map(y => h('path', { key: 's' + y, d: 'M84 ' + y + ' H396', stroke: '#E6DFD3', strokeWidth: 1, strokeDasharray: '2 4' }));
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: qué calibre de cable e interruptor usar en cada caso', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F6F2EC' } },
      seps,
      h('rect', { x: 14, y: 8, width: 62, height: 244, rx: 6, fill: '#5A6068' }),
      h('rect', { x: 20, y: 12, width: 50, height: 236, rx: 3, fill: '#3A3F45' }),
      rows, row0, row1, row2, row3,
      st >= 0 && ph === 1 ? h('circle', { key: 'p' + st, className: 'cei17-frg-pulse', cx: 44, cy: R[st], r: 16, fill: 'none', stroke: '#DB011C', strokeWidth: 2.5 }) : null);
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: 'Cal. ' + STEPS[cur].cal + ' · ' + STEPS[cur].t, curN: String(cur + 1), total: String(N),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map((s, k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph === 1), act = st === k && !isDone, on = act || isDone;
        return { t: s.t, d: s.d, cal: s.cal, go: () => this.go(k), lbl: 'CAL. ' + s.cal + ' · INTERRUPTOR ' + s.amp + ' A', lblC: on ? '#DB011C' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#DB011C' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#DB011C' : '#F6E3DC', nfg: on ? '#FFFFFF' : '#DB011C' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, CableEInterruptor_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FBF4EF", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "GUÍA RÁPIDA · ELECTRICIDAD"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "¿Qué cable e interruptor usar?"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Entre más bajo el calibre, más grueso el cable y más corriente aguanta.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #EFD9CF", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F3E3DA", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "34px", height: "34px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.cal), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))))));
  }
}

export default CableEInterruptor;
