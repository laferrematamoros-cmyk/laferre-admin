"use client";
import React from "react";

// Cable Delgado Peligro — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "cdp19-" para no chocar con otros componentes.

const CableDelgadoPeligro_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes cdp19-frg-flow{to{stroke-dashoffset:-24}}@keyframes cdp19-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.cdp19-frg-pulse{transform-box:fill-box;transform-origin:center;animation:cdp19-frg-pulse 1.1s ease-out .2s 2 both}@keyframes cdp19-el-glow{0%,100%{opacity:.25}50%{opacity:.65}}@keyframes cdp19-el-rise{0%{transform:translateY(6px);opacity:0}30%{opacity:.9}100%{transform:translateY(-10px);opacity:0}}@keyframes cdp19-el-smoke{0%{transform:translateY(0) scale(.6);opacity:.7}100%{transform:translateY(-44px) scale(1.8);opacity:0}}@keyframes cdp19-el-drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(26px);opacity:0}}@keyframes cdp19-el-flick{0%,100%{transform:scale(1,1)}50%{transform:scale(.9,1.14)}}@media (prefers-reduced-motion:reduce){.cdp19-frg-pulse{animation:none;opacity:0}}";

const STEPS = [
  ['Cable delgado, interruptor grande', 'Un cable calibre 14 aguanta 15 A, pero lo conectaron a un interruptor de 40 A.'],
  ['Conectas una máquina de alta potencia', 'Por ejemplo, una soldadora que jala 30 A: el doble de lo que aguanta el cable.'],
  ['El cable se calienta', 'Dentro de la pared, el cable se pone cada vez más caliente.'],
  ['El forro se derrite y se quema', 'Sale humo y puede haber un corto o un incendio.'],
  ['El interruptor nunca se bota', '30 A es menos que sus 40 A, así que para él todo está bien. Primero se quema el cable.'],
  ['Lo correcto: interruptor de acuerdo al cable', 'Con cable calibre 14 va un interruptor de 15 A. Si algo jala de más, se bota y el cable queda a salvo.']
];
const DUR = [3400, 3600, 3800, 4200, 4000, 5400];

class CableDelgadoPeligro extends React.Component {
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
    if (k === 5) this.T.push(setTimeout(() => this.setState({ ph: 2 }), t + 1900));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 5, ph: 2 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const G = '#7E868D', L = '#9AA0A6', RED = '#DB011C', OK = '#1E9E55';
    const fix = st === 5;
    const amps = (st >= 1 && st <= 4 && !(st === 1 && ph === 0)) || (fix && ph === 1) ? 30 : 0;
    const lvl = st === 2 ? (ph ? 1 : 0) : st === 3 ? (ph ? 2 : 1) : st === 4 ? 2 : 0;
    const brkOn = !(fix && ph === 2);
    const brkA = fix ? 15 : 40;
    const plugged = st >= 1;
    const vis = (on, dl) => ({ opacity: on ? 1 : 0, transition: 'opacity .5s ease ' + (dl || 0) + 's' });
    const anim = (a, origin, extra) => Object.assign({ transformBox: 'fill-box', transformOrigin: origin || 'center', animation: a }, extra || {});
    const X = a => 90 + a * 300 / 45;

    const meter = h('g', { key: 'meter' },
      h('text', { x: 82, y: 31, textAnchor: 'end', fontSize: 8, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, 'CORRIENTE'),
      h('text', { x: 82, y: 41, textAnchor: 'end', fontSize: 8, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, 'QUE PASA'),
      h('g', { style: { opacity: amps > 0 ? 1 : 0, transform: 'translateX(' + (amps / 45 * 300) + 'px)', transition: 'transform 1.4s cubic-bezier(.3,.7,.3,1), opacity .4s' } },
        h('rect', { x: 68, y: 3, width: 44, height: 19, rx: 9.5, style: { fill: amps > 15 ? RED : OK, transition: 'fill .4s' } }),
        h('path', { d: 'M85 21.5 L90 27 L95 21.5 Z', style: { fill: amps > 15 ? RED : OK, transition: 'fill .4s' } }),
        h('text', { x: 90, y: 16.5, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, amps + ' A')),
      h('rect', { x: 90, y: 28, width: 300, height: 10, rx: 5, fill: '#E9E2D8' }),
      h('rect', { x: 90, y: 28, width: 300, height: 10, rx: 5, style: { fill: amps > 15 ? RED : OK, transformBox: 'fill-box', transformOrigin: 'left center', transform: 'scaleX(' + (amps / 45) + ')', transition: 'transform 1.4s cubic-bezier(.3,.7,.3,1), fill .4s' } }),
      h('path', { d: 'M' + X(15) + ' 24 V42', stroke: RED, strokeWidth: 2 }),
      h('text', { x: X(15), y: 52, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: RED, fontFamily: 'Geist, sans-serif' }, 'El cable aguanta 15 A'),
      h('g', { style: { transform: 'translateX(' + (X(brkA) - X(40)) + 'px)', transition: 'transform 1s ease' } },
        h('path', { d: 'M' + X(40) + ' 24 V42', stroke: '#141414', strokeWidth: 2, strokeDasharray: '3 2' }),
        h('text', { x: X(40), y: 64, textAnchor: 'end', fontSize: 9, fontWeight: 700, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'El interruptor se bota a ' + brkA + ' A')));

    const chip = fix
      ? h('g', { key: 'okchip' }, h('rect', { x: 90, y: 72, width: 128, height: 20, rx: 10, fill: '#E3F5EA', stroke: OK, strokeWidth: 1.2 }), h('text', { x: 154, y: 85.5, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: OK, fontFamily: 'Geist, sans-serif' }, '✓ Instalación correcta'))
      : h('g', { key: 'badchip', style: vis(st >= 0) }, h('rect', { x: 90, y: 72, width: 136, height: 20, rx: 10, fill: '#FDE7E4', stroke: RED, strokeWidth: 1.2 }), h('text', { x: 158, y: 85.5, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: RED, fontFamily: 'Geist, sans-serif' }, '✕ Instalación incorrecta'));

    const cab = 'M62 150 H304';
    const ins = lvl === 2 ? '#3B2A20' : lvl === 1 ? '#FF8A3D' : '#E5322D';
    const waves = [216, 268, 294].map((x, i) => h('path', { key: 'w' + x, d: 'M' + x + ' 142 c-4 -5 4 -9 0 -14 c-4 -5 4 -9 0 -14', fill: 'none', stroke: '#FF8A3D', strokeWidth: 1.6, strokeLinecap: 'round', style: anim('cdp19-el-rise 1.6s ease-in-out ' + (i * .45) + 's infinite') }));
    const smoke = [0, .8, 1.6].map(d => h('circle', { key: 'sm' + d, cx: 244, cy: 122, r: 6, fill: '#8A8D91', style: anim('cdp19-el-smoke 2.4s ease-out ' + d + 's infinite', 'center', { opacity: 0 }) }));
    const cable = h('g', { key: 'cable' },
      h('text', { x: 84, y: 138, textAnchor: 'start', fontSize: 10.5, fontWeight: 700, fill: amps > 15 ? RED : '#141414', fontFamily: 'Geist, sans-serif' }, 'CAL. 14 · ' + (amps > 15 ? 'le pasan 30 A' : 'aguanta 15 A')),
      h('path', { d: cab, fill: 'none', strokeLinecap: 'round', strokeWidth: 14, style: Object.assign({ stroke: lvl === 2 ? '#FF5A36' : '#FFA14A' }, vis(lvl >= 1), lvl >= 1 ? { animation: 'cdp19-el-glow 1.2s ease-in-out infinite' } : {}) }),
      h('path', { d: cab, fill: 'none', strokeWidth: 5, style: { stroke: ins, transition: 'stroke 1.6s ease' } }),
      h('path', { d: 'M222 150 H266', fill: 'none', stroke: '#C77B3B', strokeWidth: 3, strokeDasharray: '7 4', style: vis(lvl === 2, .8) }),
      h('path', { d: cab, fill: 'none', stroke: '#FFD23F', strokeWidth: 1.8, strokeLinecap: 'round', strokeDasharray: '4 8', style: Object.assign({ animation: 'cdp19-frg-flow .35s linear infinite' }, vis(amps > 0, .3)) }),
      h('g', { style: vis(lvl >= 1, .3) }, waves),
      h('g', { style: vis(lvl === 2, .6) },
        smoke,
        h('ellipse', { cx: 230, cy: 156, rx: 2, ry: 3, fill: '#3B2A20', style: anim('cdp19-el-drip 1.4s ease-in .2s infinite') }),
        h('ellipse', { cx: 258, cy: 156, rx: 2, ry: 3, fill: '#3B2A20', style: anim('cdp19-el-drip 1.4s ease-in .9s infinite') }),
        h('g', { style: anim('cdp19-el-flick .35s ease-in-out infinite', 'center bottom') },
          h('path', { d: 'M244 149 C233 141 237 130 241 123 C242 129 246 131 246 125 C253 132 255 142 244 149 Z', fill: '#FF7A1A' }),
          h('path', { d: 'M244 149 C239 144 241 138 243 134 C244 138 247 139 247 136 C250 140 250 146 244 149 Z', fill: '#FFD23F' }))));

    const wall = h('g', { key: 'wall' },
      h('rect', { x: 78, y: 100, width: 246, height: 104, rx: 4, fill: '#EDE7DC', stroke: '#CDBFA9', strokeWidth: 1.5 }),
      [132, 206, 280].map(x => h('rect', { key: 'st' + x, x, y: 100, width: 8, height: 104, fill: '#E2D3B8' })),
      h('path', { d: 'M0 242 H400', stroke: '#CDBFA9', strokeWidth: 2 }));

    const breaker = h('g', { key: 'brk' },
      h('rect', { x: 14, y: 84, width: 56, height: 150, rx: 6, fill: '#5A6068' }),
      h('rect', { x: 20, y: 90, width: 44, height: 138, rx: 3, fill: '#3A3F45' }),
      h('rect', { x: 22, y: 118, width: 40, height: 64, rx: 3, fill: '#1B1B1B', stroke: '#000000', strokeWidth: 1 }),
      h('rect', { x: 26, y: 122, width: 32, height: 13, rx: 3, fill: '#D9C7F0' }),
      h('text', { x: 42, y: 131.8, textAnchor: 'middle', fontSize: 9.5, fontWeight: 700, fill: '#141414', fontFamily: 'Geist, sans-serif' }, brkA + 'A'),
      h('rect', { x: 36, y: 142, width: 12, height: 30, rx: 2, fill: '#0A0A0A', stroke: '#3A3F45', strokeWidth: 1 }),
      h('rect', { x: 38, y: 144, width: 8, height: 12, rx: 1.5, style: { fill: brkOn ? '#E5322D' : L, transform: brkOn ? 'none' : 'translateY(14px)', transition: 'transform .3s ease, fill .3s' } }));

    const welderOn = amps > 0;
    const welder = h('g', { key: 'weld' },
      h('rect', { x: 304, y: 136, width: 18, height: 28, rx: 3, fill: '#FFFFFF', stroke: L, strokeWidth: 1.5 }),
      h('path', { d: 'M310 141 V146 M316 141 V146', stroke: '#5E646B', strokeWidth: 2, strokeLinecap: 'round' }),
      h('g', { style: vis(plugged) },
        h('path', { d: 'M313 158 C313 196 332 200 344 208', fill: 'none', stroke: '#1A1A1A', strokeWidth: 2.5 }),
        h('rect', { x: 308.5, y: 150, width: 9, height: 10, rx: 1.5, fill: '#1A1A1A' })),
      h('path', { d: 'M352 198 V190 H380 V198', fill: 'none', stroke: '#2B2F33', strokeWidth: 3, strokeLinejoin: 'round' }),
      h('rect', { x: 340, y: 198, width: 52, height: 42, rx: 4, fill: '#2F6DB5', stroke: '#1F4E86', strokeWidth: 1.5 }),
      h('circle', { cx: 355, cy: 215, r: 7.5, fill: '#FFFFFF', stroke: '#1F4E86', strokeWidth: 1 }),
      h('path', { d: 'M355 215 V209', stroke: RED, strokeWidth: 1.6, strokeLinecap: 'round', style: { transformBox: 'view-box', transformOrigin: '355px 215px', transform: 'rotate(' + (welderOn ? 70 : -60) + 'deg)', transition: 'transform 1.2s ease' } }),
      h('rect', { x: 369, y: 207, width: 17, height: 9, rx: 1.5, style: { fill: welderOn ? '#3FD07A' : '#1F2A33', transition: 'fill .4s' } }),
      h('circle', { cx: 372, cy: 230, r: 3, fill: '#1A1A1A' }), h('circle', { cx: 383, cy: 230, r: 3, fill: '#1A1A1A' }),
      h('text', { x: 366, y: 253, textAnchor: 'middle', fontSize: 8, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, 'SOLDADORA'));

    const bubble = (on, w, fill, txt, key) => h('g', { key, style: vis(on, .2) }, h('rect', { x: 78, y: 212, width: w, height: 22, rx: 11, fill }), h('text', { x: 78 + w / 2, y: 227, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, txt));
    const PT = [[42, 150], [366, 216], [150, 150], [244, 140], [42, 150], [42, 150]];
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: qué pasa si usas un cable delgado con un interruptor de muchos amperes', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F6F2EC' } },
      wall, cable, breaker, welder, meter, chip,
      bubble(st === 4, 176, RED, '¡El interruptor sigue arriba!', 'b4'),
      bubble(fix && ph === 2, 190, OK, '✓ Se botó: el cable está a salvo', 'b5'),
      st >= 0 && ph >= 1 ? h('circle', { key: 'p' + st, className: 'cdp19-frg-pulse', cx: PT[st][0], cy: PT[st][1], r: 14, fill: 'none', stroke: fix ? OK : RED, strokeWidth: 2.5, style: fix ? { animationDelay: '1.8s' } : undefined }) : null);
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(N),
      barC: st === 5 ? '#1E9E55' : '#DB011C',
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map(([t, d], k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph >= 1), act = st === k && !isDone, on = act || isDone;
        const A = k === N - 1 ? '#1E9E55' : '#DB011C', soft = k === N - 1 ? '#E3F5EA' : '#F6E3DC';
        return { t, d, n: String(k + 1), go: () => this.go(k), lbl: k === N - 1 ? 'LO CORRECTO' : 'PASO ' + (k + 1), lblC: on ? A : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? A : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? A : soft, nfg: on ? '#FFFFFF' : A };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, CableDelgadoPeligro_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FBF4EF", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "ERROR COMÚN · ELECTRICIDAD"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "¿Qué pasa si el interruptor es más grande que el cable?"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "El interruptor protege al cable. Si es de más amperes, el cable se quema primero.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #EFD9CF", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F3E3DA", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: v.barC, transition: "width .6s ease, background .4s" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))))));
  }
}

export default CableDelgadoPeligro;
