"use client";
import React from "react";

// Extension Sobrecargada — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "es21-" para no chocar con otros componentes.

const ExtensionSobrecargada_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes es21-frg-flow{to{stroke-dashoffset:-24}}@keyframes es21-el-glow{0%,100%{opacity:.25}50%{opacity:.65}}@keyframes es21-el-rise{0%{transform:translateY(6px);opacity:0}30%{opacity:.9}100%{transform:translateY(-12px);opacity:0}}@keyframes es21-el-smoke{0%{transform:translateY(0) scale(.6);opacity:.7}100%{transform:translateY(-44px) scale(1.8);opacity:0}}@keyframes es21-el-drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(18px);opacity:0}}@keyframes es21-el-spark{0%,49%{opacity:0}50%,100%{opacity:1}}@media (prefers-reduced-motion:reduce){svg *{animation:none !important}}";

const STEPS = [
  ['Una extensión delgada', 'Aguanta unos 10 A. Para un cargador o una lámpara, sobra.'],
  ['Conectas el tostador', 'Jala unos 8 A. La extensión ya va casi a su límite.'],
  ['Luego la secadora de pelo', 'Unos 12 A más: ya pasan 21 A, el doble de lo que aguanta.'],
  ['Y también el calentador', 'Otros 12 A: ya son 33 A. El cable se calienta cada vez más.'],
  ['El forro se derrite', 'Sale humo, el plástico gotea y saltan chispas. Puede haber un corto o un incendio.'],
  ['Cada aparato en su propio contacto', 'El tostador, la secadora y el calentador van directo a la pared, uno por contacto. En la extensión, sólo lo de bajo consumo: 2 celulares, la tablet y la tele suman unos 7 A.']
];
const DUR = [3400, 3400, 3600, 3800, 4800, 5400];
const AMPS = [1, 9, 21, 33, 33, 7];

class ExtensionSobrecargada extends React.Component {
  state = { st: -1, ph: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0.25 });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; }
  enter(k, t) {
    this.T.push(setTimeout(() => this.setState({ st: k, ph: 0 }), t));
    this.T.push(setTimeout(() => this.setState({ ph: 1 }), t + 90));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 5, ph: 1 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const RED = '#DB011C', OK = '#1E9E55', G = '#7E868D', INK = '#2B3035';
    const fix = st === 5;
    const amps = st < 0 ? 0 : ph ? AMPS[st] : (st > 0 ? AMPS[st - 1] : 1);
    const on = i => i === 0 ? st >= 0 : !fix && (st > i || (st === i && ph === 1));
    const pw = i => fix ? true : on(i);
    const lvl = st === 2 ? (ph ? 1 : 0) : st === 3 ? (ph ? 2 : 1) : st === 4 ? 3 : 0;
    const melt = st === 4 && ph === 1;
    const vis = (v, dl) => ({ opacity: v ? 1 : 0, transition: 'opacity .5s ease ' + (dl || 0) + 's' });
    const anim = (a, origin) => ({ transformBox: 'fill-box', transformOrigin: origin || 'center', animation: a });
    const mono = 'Geist Mono, monospace';
    const barC = amps <= 10 ? OK : RED, dx = Math.min(amps, 40) / 40 * 300;
    const meter = h('g', { key: 'meter' },
      h('text', { x: 82, y: 31, textAnchor: 'end', fontSize: 8, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: mono }, 'CORRIENTE'),
      h('text', { x: 82, y: 41, textAnchor: 'end', fontSize: 8, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: mono }, 'QUE PASA'),
      h('rect', { x: 90, y: 28, width: 300, height: 10, rx: 5, fill: '#F3E3DA' }),
      h('rect', { x: 90, y: 28, width: 300, height: 10, style: { fill: barC, transformBox: 'fill-box', transformOrigin: 'left center', transform: 'scaleX(' + (dx / 300) + ')', transition: 'transform 1.2s cubic-bezier(.3,.7,.3,1), fill .4s' } }),
      h('line', { x1: 165, y1: 22, x2: 165, y2: 44, stroke: '#141414', strokeWidth: 1.5, strokeDasharray: '3 2' }),
      h('text', { x: 165, y: 55, textAnchor: 'middle', fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', fill: '#141414', fontFamily: mono }, 'AGUANTA 10 A'),
      h('g', { style: { opacity: amps > 0 ? 1 : 0, transform: 'translateX(' + dx + 'px)', transition: 'transform 1.2s cubic-bezier(.3,.7,.3,1), opacity .4s' } },
        h('rect', { x: 68, y: 3, width: 44, height: 19, rx: 9.5, style: { fill: barC, transition: 'fill .4s' } }),
        h('path', { d: 'M85 21.5 L90 27 L95 21.5 Z', style: { fill: barC, transition: 'fill .4s' } }),
        h('text', { x: 90, y: 16.5, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, amps + ' A')));
    const CORD = 'M150 217 C112 217 96 238 66 238 C44 238 34 224 34 204 V120';
    const cord = h('g', { key: 'cord', fill: 'none', strokeLinecap: 'round' },
      h('path', { d: CORD, stroke: '#FF6A2A', strokeWidth: 20, filter: 'url(#ext-blur)', style: { opacity: [0, .25, .45, .6][lvl], transition: 'opacity 1.2s' } }),
      h('path', { d: CORD, stroke: G, strokeWidth: 9 }),
      h('path', { d: CORD, stroke: '#F1F2F3', strokeWidth: 6 }),
      h('path', { d: CORD, strokeWidth: 6, style: { stroke: lvl >= 2 ? '#E2361A' : '#FF8A2A', opacity: [0, .55, .85, .9][lvl], transition: 'opacity 1.2s, stroke 1s' } }));
    const waves = h('g', { key: 'waves', fill: 'none', stroke: '#E2551A', strokeWidth: 1.8, strokeLinecap: 'round', style: vis(lvl >= 1 && !melt) },
      [[72, 224, 0], [100, 216, .4], [128, 206, .8]].map(([x, y, d]) => h('path', { key: x, d: 'M' + x + ' ' + y + ' q3 -4 0 -8 q-3 -4 0 -8', style: anim('es21-el-rise 1.4s ease-out ' + d + 's infinite') })));
    const wall = h('g', { key: 'wall' },
      h('rect', { x: 14, y: 80, width: 40, height: 50, rx: 5, fill: '#FFFFFF', stroke: G, strokeWidth: 1.5 }),
      h('rect', { x: 22, y: 90, width: 24, height: 30, rx: 4, fill: '#F1F2F3', stroke: '#B9C0C6' }),
      h('rect', { x: 27, y: 100, width: 14, height: 20, rx: 3, fill: INK }));
    const OUT = [180, 210, 240, 270, 300];
    const strip = h('g', { key: 'strip' },
      h('rect', { x: 150, y: 202, width: 180, height: 30, rx: 8, fill: '#F7F8F9', stroke: G, strokeWidth: 1.5 }),
      OUT.map(x => h('g', { key: x },
        h('rect', { x: x - 9, y: 208, width: 18, height: 18, rx: 4, fill: '#FFFFFF', stroke: '#B9C0C6' }),
        h('path', { d: 'M' + (x - 3) + ' 212 V218 M' + (x + 3) + ' 212 V218', stroke: INK, strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: x, cy: 222, r: 1.6, fill: INK }))),
      h('rect', { x: 312, y: 210, width: 12, height: 14, rx: 2, fill: RED }));
    const CORDS = ['M169 158 C169 182 180 186 180 204', 'M215 158 C215 182 210 184 210 204', 'M298 162 C298 190 240 182 240 204', 'M351 160 C351 196 270 182 270 204'];
    const dcords = h('g', { key: 'dcords' }, CORDS.map((d, i) => { const mv = i === 0 && fix, ox = mv ? 240 : OUT[i]; return h('g', { key: i + (mv ? 'f' : ''), style: vis(on(i)) },
      h('path', { d: mv ? 'M169 158 C169 178 240 176 240 204' : d, fill: 'none', stroke: i ? G : INK, strokeWidth: i ? 3 : 2.2, strokeLinecap: 'round' }),
      h('rect', { x: ox - 6, y: 203, width: 12, height: 14, rx: 2, fill: INK })); }));
    const wallOut = (x, y2) => h('g', { key: 'wo' + x },
      h('path', { d: 'M' + x + ' 86 V' + y2, stroke: G, strokeWidth: 3, strokeLinecap: 'round' }),
      h('rect', { x: x - 12, y: 58, width: 24, height: 30, rx: 4, fill: '#FFFFFF', stroke: G, strokeWidth: 1.5 }),
      h('rect', { x: x - 7, y: 63, width: 14, height: 20, rx: 3, fill: '#F1F2F3', stroke: '#B9C0C6' }),
      h('rect', { x: x - 5, y: 74, width: 10, height: 14, rx: 2, fill: INK }));
    const plug = (d, x) => h('g', { key: 'pl' + x }, h('path', { d, fill: 'none', stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round' }), h('rect', { x: x - 6, y: 203, width: 12, height: 14, rx: 2, fill: INK }));
    const fixG = h('g', { key: 'fixg', style: vis(fix && ph === 1, .2) },
      wallOut(215, 118), wallOut(300, 111), wallOut(351, 104),
      plug('M92 176 C92 196 180 186 180 204', 180), plug('M143 158 C143 182 210 176 210 204', 210), plug('M334 182 C296 182 270 184 270 204', 270),
      h('rect', { x: 334, y: 166, width: 48, height: 32, rx: 4, fill: INK }),
      h('rect', { x: 338, y: 170, width: 40, height: 24, rx: 2, fill: '#6E9BC4' }),
      h('path', { d: 'M88 170 L82 178 H102 L96 170 Z', fill: '#5A6168' }),
      h('rect', { x: 58, y: 124, width: 68, height: 46, rx: 4, fill: INK }),
      h('rect', { x: 62, y: 128, width: 60, height: 36, rx: 2, fill: '#6E9BC4' }),
      h('rect', { x: 132, y: 120, width: 22, height: 38, rx: 4, fill: INK }),
      h('rect', { x: 135, y: 125, width: 16, height: 26, rx: 1.5, fill: '#6E9BC4' }));
    const dim = i => ({ opacity: pw(i) ? 1 : .35, transition: 'opacity .5s' });
    const phone = h('g', { key: 'ph', style: dim(0) },
      h('rect', { x: 158, y: 120, width: 22, height: 38, rx: 4, fill: INK }),
      h('rect', { x: 161, y: 125, width: 16, height: 26, rx: 1.5, fill: '#6E9BC4' }));
    const slot = y => h('rect', { key: y, x: 199, y, width: 32, height: 5, rx: 2.5, style: { fill: pw(1) ? '#FF8A2A' : INK, transition: 'fill .6s' } });
    const toaster = h('g', { key: 'to', style: dim(1) },
      h('ellipse', { cx: 215, cy: 118, rx: 22, ry: 7, fill: '#FFB347', style: Object.assign(vis(pw(1)), pw(1) ? anim('es21-el-glow 1.6s ease-in-out infinite') : {}) }),
      h('rect', { x: 190, y: 118, width: 50, height: 40, rx: 10, fill: '#DDE1E5', stroke: G, strokeWidth: 1.5 }),
      slot(123), slot(131),
      h('rect', { x: 240, y: 132, width: 6, height: 10, rx: 2, fill: INK }),
      h('rect', { x: 196, y: 158, width: 8, height: 3, rx: 1, fill: INK }), h('rect', { x: 226, y: 158, width: 8, height: 3, rx: 1, fill: INK }));
    const dryer = h('g', { key: 'dr', style: dim(2) },
      h('g', { fill: 'none', stroke: '#8DB6D9', strokeWidth: 2, strokeLinecap: 'round', strokeDasharray: '4 3', style: vis(pw(2)) },
        ['M260 122 H249', 'M260 127 H247', 'M260 132 H250'].map((d, j) => h('path', { key: j, d, style: pw(2) ? { animation: 'es21-frg-flow .5s linear infinite' } : undefined }))),
      h('rect', { x: 292, y: 136, width: 13, height: 26, rx: 5, fill: '#E7A3C2', stroke: '#B5708F' }),
      h('rect', { x: 262, y: 120, width: 26, height: 14, rx: 3, fill: '#C77FA2', stroke: '#B5708F' }),
      h('circle', { cx: 300, cy: 127, r: 16, fill: '#F0B5CF', stroke: '#B5708F' }),
      h('circle', { cx: 300, cy: 127, r: 7, fill: 'none', stroke: '#B5708F' }));
    const grill = []; for (let y = 127; y <= 150; y += 5) grill.push(h('path', { key: y, d: 'M336 ' + y + ' H366', strokeWidth: 2, strokeLinecap: 'round', style: { stroke: pw(3) ? '#E2551A' : '#9AA0A6', transition: 'stroke .6s' } }));
    const heater = h('g', { key: 'he', style: dim(3) },
      h('rect', { x: 326, y: 104, width: 50, height: 56, rx: 8, fill: '#EEF0F2', stroke: G, strokeWidth: 1.5 }),
      h('circle', { cx: 340, cy: 113, r: 3.5, fill: INK }), h('circle', { cx: 352, cy: 113, r: 3.5, fill: INK }),
      h('rect', { x: 333, y: 122, width: 36, height: 32, rx: 3, style: { fill: pw(3) ? '#FFC58A' : '#D5DADF', transition: 'fill .6s' } }),
      h('rect', { x: 333, y: 122, width: 36, height: 32, rx: 3, fill: '#FF7A2A', style: Object.assign(vis(pw(3)), pw(3) ? anim('es21-el-glow 1.4s ease-in-out infinite') : {}) }),
      grill);
    const burn = h('g', { key: 'burn', style: vis(melt, .3) },
      h('path', { d: 'M132 217 C112 218 98 236 70 238', fill: 'none', stroke: '#2B1E18', strokeWidth: 10, strokeLinecap: 'round' }),
      h('path', { d: 'M132 217 C112 218 98 236 70 238', fill: 'none', stroke: '#FF4A1A', strokeWidth: 3, strokeDasharray: '7 6', strokeLinecap: 'round', style: melt ? { animation: 'es21-el-glow .6s ease-in-out infinite' } : undefined }),
      [[82, 243, 0], [100, 241, .5], [118, 232, 1]].map(([x, y, d]) => h('ellipse', { key: 'd' + x, cx: x, cy: y, rx: 2.5, ry: 4, fill: '#3A2A22', style: melt ? anim('es21-el-drip 1.4s ease-in ' + d + 's infinite') : undefined })),
      [[86, 226, 0], [106, 220, .45], [124, 212, .9], [74, 230, 1.35]].map(([x, y, d]) => h('circle', { key: 's' + x, cx: x, cy: y, r: 9, fill: '#9AA0A6', opacity: .6, style: melt ? anim('es21-el-smoke 1.8s ease-out ' + d + 's infinite') : undefined })),
      [['M94 204 L100 212 L95 213 L102 222', 0], ['M128 196 L133 204 L128 205 L134 213', .25]].map(([d, dl]) => h('path', { key: d, d, fill: 'none', stroke: '#FFC21A', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', style: melt ? { animation: 'es21-el-spark .5s linear ' + dl + 's infinite' } : undefined })),
      h('polygon', { points: '112,160 128,188 96,188', fill: RED, stroke: '#FFFFFF', strokeWidth: 1.5, strokeLinejoin: 'round' }),
      h('text', { x: 112, y: 185, textAnchor: 'middle', fontSize: 16, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '!'));
    const ok = h('g', { key: 'ok', style: vis(fix && ph === 1, .4) },
      h('circle', { cx: 362, cy: 217, r: 16, fill: OK }),
      h('text', { x: 362, y: 223, textAnchor: 'middle', fontSize: 17, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓'));
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: extensión sobrecargada con varios aparatos', style: { display: 'block', width: '100%', height: 'auto' } },
      h('defs', null, h('filter', { id: 'ext-blur', x: '-20%', y: '-20%', width: '140%', height: '140%' }, h('feGaussianBlur', { stdDeviation: 3 }))),
      meter, wall, cord, waves, strip, dcords, fixG, phone, toaster, dryer, heater, burn, ok);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st), last = STEPS.length - 1;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%', barC: cur === last ? '#1E9E55' : '#DB011C',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, fin = k === last, c = fin ? '#1E9E55' : '#DB011C', past = a || k < st;
        return { n: fin ? '✓' : String(k + 1), t, d, lbl: fin ? 'LO CORRECTO' : 'PASO ' + (k + 1), lblC: c,
          bd: a ? c : '#EFD9CF', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.5)', nbg: past ? c : '#F3E3DA', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, ExtensionSobrecargada_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FBF4EF", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "ERROR COMÚN · ELECTRICIDAD"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "¿Conectas todo a una extensión?"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Una extensión delgada no aguanta varios aparatos de alto consumo al mismo tiempo.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #EFD9CF", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F3E3DA", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: v.barC, transition: "width .6s ease, background .4s" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d)))))))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "12px", alignItems: "stretch" } }, h("div", { style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "18px", background: "#FFF6DB", border: "1.5px solid #F2D27A" } }, h("span", { style: { flex: "none", padding: "5px 9px", borderRadius: "999px", background: "#F5C518", color: "#141414", font: "600 11px/1 'Geist Mono',monospace", letterSpacing: ".06em" } }, "TIP"), h("span", { style: { fontSize: "15px", lineHeight: "1.45", textWrap: "pretty" } }, "Algunas regletas y multicontactos traen un ", h("strong", { style: { fontWeight: "600" } }, "interruptor que las protege"), ": si conectas demasiado, se apagan solas.")), h("a", { href: "https://bfmpedidosv-2.vercel.app/cotizar?f=317&ver=48188T", target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "16px", padding: "10px 18px 10px 12px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #EFD9CF", textDecoration: "none", color: "#141414" } }, h("img", { src: "/bfm-assets/electricidad/48188T.png", alt: "Multicontacto supresor de picos Volteck 48188, 8 contactos", width: "240", height: "384", style: { flex: "none", width: "56px", height: "auto" } }), h("span", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: "#1E9E55" } }, "RECOMENDADO · VOLTECK 48188"), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, "Multicontacto supresor de picos, uso extra rudo"), h("span", { style: { alignSelf: "flex-start", padding: "4px 10px", borderRadius: "999px", background: "#E3F4EA", color: "#167A42", fontWeight: "600", fontSize: "13px", lineHeight: "1.3" } }, "⚡ Protección contra picos de voltaje de 1200 Joules"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "8 contactos · con interruptor · cable calibre 14"), h("span", { style: { fontWeight: "600", fontSize: "14px", color: "#DB011C" } }, "Cotizar →"))), h("a", { href: "https://bfmpedidosv-2.vercel.app/cotizar?f=317&ver=47186T", target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "16px", padding: "10px 18px 10px 12px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #EFD9CF", textDecoration: "none", color: "#141414" } }, h("img", { src: "/bfm-assets/electricidad/47186T.png", alt: "Multicontacto uso rudo Volteck 47186, 8 contactos", width: "240", height: "347", style: { flex: "none", width: "56px", height: "auto" } }), h("span", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: "#1E9E55" } }, "RECOMENDADO · VOLTECK 47186"), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, "Multicontacto uso rudo, aterrizado"), h("span", { style: { alignSelf: "flex-start", padding: "4px 10px", borderRadius: "999px", background: "#E3F4EA", color: "#167A42", fontWeight: "600", fontSize: "13px", lineHeight: "1.3" } }, "⚡ Protege tus equipos contra sobrecargas de voltaje"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "8 contactos · interruptor con reset · cable calibre 14"), h("span", { style: { fontWeight: "600", fontSize: "14px", color: "#DB011C" } }, "Cotizar →"))))));
  }
}

export default ExtensionSobrecargada;
