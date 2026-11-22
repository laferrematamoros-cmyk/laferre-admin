"use client";
import React from "react";

// Comparativa Focos — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "cf16-" para no chocar con otros componentes.

const ComparativaFocos_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes cf16-cfl-on{0%{opacity:0}7%{opacity:.8}11%{opacity:0}18%{opacity:.9}22%{opacity:.15}30%{opacity:.45}100%{opacity:1}}@keyframes cf16-el-rise{0%{transform:translateY(6px);opacity:0}30%{opacity:.8}100%{transform:translateY(-14px);opacity:0}}@keyframes cf16-led-ray{0%,100%{opacity:.55}50%{opacity:1}}@keyframes cf16-inc-flick{0%,100%{opacity:1}50%{opacity:.88}}@media (prefers-reduced-motion:reduce){svg *{animation:none !important}}";

const B = [
  { name: 'INCANDESCENTE', eq: 'Foco tradicional de 60 W', W: 60, H: 1000, wl: 'Alto', hl: 'Corta', col: '#B9502A', bg: '#FBEDE2', bd: '#F3D9C8', track: '#F3D9C8' },
  { name: 'FLUORESCENTE (AHORRADOR)', eq: '≈ Equivale a un incandescente de 60 W', W: 15, H: 8000, wl: 'Medio', hl: 'Media', col: '#6F655A', bg: '#F3F1EE', bd: '#E4DFD8', track: '#E4DFD8' },
  { name: 'LED', eq: '≈ Equivale a un incandescente de 100 W', W: 14, H: 25000, wl: 'Bajo', hl: 'Larga', col: '#1E8A6E', bg: '#E4F3EE', bd: '#1E8A6E', track: '#CBE7DE', best: true }
];

class ComparativaFocos extends React.Component {
  state = { on: false, p: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    // Capacitaciones: arranca al llegar a la parte de arriba de la pantalla (con threshold, las altas no arrancaban en celular).
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.stop(); if (this.io) this.io.disconnect(); }
  stop() { this.T.forEach(clearTimeout); this.T = []; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  play() {
    if (this.io) this.io.disconnect();
    this.stop();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ on: true, p: 1 }); return; }
    this.setState({ on: false, p: 0 });
    this.T.push(setTimeout(() => this.setState({ on: true }), 500));
    this.T.push(setTimeout(() => {
      const s = performance.now();
      const tick = now => { const x = Math.min(1, (now - s) / 1800), e = 1 - Math.pow(1 - x, 3); this.setState({ p: e }); if (x < 1) this.raf = requestAnimationFrame(tick); };
      this.raf = requestAnimationFrame(tick);
    }, 1500));
  }
  scene(k) {
    const h = React.createElement, on = this.state.on, id = s => 'fco' + k + s;
    const stop = (o, c, op) => h('stop', { key: o, offset: o, stopColor: c, stopOpacity: op == null ? 1 : op });
    const haloC = ['#FFB45C', '#FFF4D6', '#CFEFFF'][k];
    const haloStyle = k === 1 ? (on ? { animation: 'cf16-cfl-on 2.6s ease-out both' } : { opacity: 0 }) : { opacity: on ? 1 : 0, transition: k === 0 ? 'opacity .7s ease-in' : 'opacity .08s' };
    const defs = h('defs', null,
      h('radialGradient', { id: id('halo') }, stop(0, haloC, .95), stop(.45, haloC, .55), stop(1, haloC, 0)),
      h('radialGradient', { id: id('core') }, stop(0, '#FFFFFF', 1), stop(.55, '#FFFFFF', .85), stop(1, '#FFFFFF', 0)),
      h('linearGradient', { id: id('scr'), x1: 0, x2: 1, y1: 0, y2: 0 }, stop(0, '#8E959B'), stop(.45, '#D9DEE2'), stop(1, '#7E868D')));
    const halo = h('circle', { cx: 100, cy: 78, r: k === 2 ? 124 : 92, fill: 'url(#' + id('halo') + ')', style: haloStyle });
    const screw = y0 => h('g', null,
      h('rect', { x: 80, y: y0, width: 40, height: 30, rx: 3, fill: 'url(#' + id('scr') + ')', stroke: '#6E767D', strokeWidth: 1 }),
      [6, 13, 20].map(d => h('path', { key: d, d: 'M80 ' + (y0 + d + 4) + ' L120 ' + (y0 + d), stroke: '#6E767D', strokeWidth: 1.6, opacity: .7 })),
      h('path', { d: 'M84 ' + (y0 + 30) + ' H116 L108 ' + (y0 + 40) + ' H92 Z', fill: '#3A4046' }));
    let bulb, extra = null;
    if (k === 0) {
      const glass = 'M100 26 C70 26 48 50 48 80 C48 102 62 114 72 128 C78 136 78 142 78 148 H122 C122 142 122 136 128 128 C138 114 152 102 152 80 C152 50 130 26 100 26 Z';
      bulb = h('g', null,
        h('path', { d: glass, stroke: '#B9C0C6', strokeWidth: 1.5, style: { fill: on ? '#FFE6BF' : '#F4F6F7', fillOpacity: on ? .9 : .7, transition: 'fill .7s, fill-opacity .7s' } }),
        h('path', { d: 'M92 148 L88 96 M108 148 L112 96', stroke: '#9A8A70', strokeWidth: 1.4, fill: 'none' }),
        h('path', { d: 'M88 96 l3 -6 l3 6 l3 -6 l3 6 l3 -6 l3 6 l3 -6 l3 6', fill: 'none', strokeWidth: 2, strokeLinejoin: 'round', style: { stroke: on ? '#FF7A0A' : '#8A6A3A', transition: 'stroke .5s', animation: on ? 'cf16-inc-flick .18s linear infinite' : 'none' } }),
        h('path', { d: 'M70 60 C72 46 82 38 92 36', fill: 'none', stroke: '#FFFFFF', strokeWidth: 4, strokeLinecap: 'round', opacity: .8 }),
        screw(148));
      extra = h('g', { fill: 'none', stroke: '#E2551A', strokeWidth: 2, strokeLinecap: 'round', style: { opacity: on ? 1 : 0, transition: 'opacity .6s .6s' } },
        [[72, 0], [100, .45], [128, .9]].map(([x, d]) => h('path', { key: x, d: 'M' + x + ' 22 q4 -5 0 -10 q-4 -5 0 -10', style: on ? { transformBox: 'fill-box', animation: 'cf16-el-rise 1.6s ease-out ' + d + 's infinite' } : undefined })));
    } else if (k === 1) {
      const tube = c => [0, 1, 2, 3].map(i => h('ellipse', { key: c + i, cx: 100, cy: 42 + i * 19, rx: 30, ry: 9, fill: 'none', stroke: c, strokeWidth: c === 'o' ? 13 : 10 }));
      const outline = [0, 1, 2, 3].map(i => h('ellipse', { key: 'o' + i, cx: 100, cy: 42 + i * 19, rx: 30, ry: 9, fill: 'none', stroke: '#C9CED3', strokeWidth: 13 }));
      bulb = h('g', null,
        outline,
        h('g', null, [0, 1, 2, 3].map(i => h('ellipse', { key: 'b' + i, cx: 100, cy: 42 + i * 19, rx: 30, ry: 9, fill: 'none', stroke: '#ECEEF0', strokeWidth: 10 }))),
        h('g', { style: k === 1 && on ? { animation: 'cf16-cfl-on 2.6s ease-out both' } : { opacity: 0 } }, [0, 1, 2, 3].map(i => h('ellipse', { key: 'l' + i, cx: 100, cy: 42 + i * 19, rx: 30, ry: 9, fill: 'none', stroke: '#FFFDF4', strokeWidth: 10 }))),
        h('path', { d: 'M70 42 C70 30 86 26 100 26 C114 26 130 30 130 42', fill: 'none', stroke: '#C9CED3', strokeWidth: 13, strokeLinecap: 'round' }),
        h('path', { d: 'M70 42 C70 30 86 26 100 26 C114 26 130 30 130 42', fill: 'none', strokeWidth: 10, strokeLinecap: 'round', style: { stroke: on ? '#FFFDF4' : '#ECEEF0', transition: 'stroke 2s' } }),
        h('rect', { x: 68, y: 110, width: 64, height: 30, rx: 9, fill: '#F6F6F4', stroke: '#B9C0C6', strokeWidth: 1.5 }),
        h('path', { d: 'M72 140 H128 L122 150 H78 Z', fill: '#E7E8E6', stroke: '#B9C0C6', strokeWidth: 1 }),
        screw(150));
    } else {
      const rays = [0, 30, 150, 180, 210, 240, 270, 300, 330].map(a => { const rad = a * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad); return h('line', { key: a, x1: 100 + c * 64, y1: 76 + s * 64, x2: 100 + c * 84, y2: 76 + s * 84, stroke: '#F5B800', strokeWidth: 3.5, strokeLinecap: 'round' }); });
      extra = h('g', { style: { opacity: on ? 1 : 0, transition: 'opacity .15s' } },
        h('circle', { cx: 100, cy: 76, r: 82, fill: 'url(#' + id('core') + ')' }),
        h('g', { style: on ? { animation: 'cf16-led-ray 1.6s ease-in-out infinite' } : undefined }, rays));
      bulb = h('g', null,
        h('path', { d: 'M100 26 C66 26 48 52 48 80 C48 98 58 108 66 116 H134 C142 108 152 98 152 80 C152 52 134 26 100 26 Z', stroke: '#C9CED3', strokeWidth: 1.5, style: { fill: on ? '#FFFFFF' : '#EEF0F2', transition: 'fill .08s' } }),
        h('path', { d: 'M66 116 H134 L124 148 H76 Z', fill: '#E3E6E9', stroke: '#B9C0C6', strokeWidth: 1.5 }),
        h('path', { d: 'M70 70 C72 52 84 40 98 36', fill: 'none', stroke: '#FFFFFF', strokeWidth: 4, strokeLinecap: 'round', opacity: .9 }),
        screw(148));
    }
    return h('svg', { viewBox: '0 0 200 196', role: 'img', 'aria-label': 'Foco ' + B[k].name.toLowerCase(), style: { display: 'block', width: '100%', maxWidth: 260, height: 'auto', margin: '0 auto', overflow: 'visible' } }, defs, halo, extra, bulb);
  }
  renderVals() {
    const p = this.state.p, fmt = n => Math.round(n).toLocaleString('en-US');
    return {
      rootRef: this.rootRef, replay: () => this.play(),
      cards: B.map((b, k) => ({ ...b, scene: this.scene(k), wNow: fmt(b.W * p), hNow: fmt(b.H * p), wPct: (b.W / 60 * 100 * p).toFixed(1) + '%', hPct: (b.H / 25000 * 100 * p).toFixed(1) + '%' }))
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, ComparativaFocos_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F7F7F5", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "COMPARATIVA · ILUMINACIÓN"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "¿Qué foco te conviene?"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "La diferencia está en cuánta luz dan, cuánto gastan y cuánto duran.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #E2E2DE", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "12px" } }, (v.cards || []).map((c, $index) => h(React.Fragment, { key: $index }, h("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: "14px", padding: "18px 18px 20px", borderRadius: "22px", background: c?.bg, border: ("1.5px solid " + String(c?.bd ?? "")) } }, h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", minHeight: "26px" } }, h("span", { style: { font: "600 12px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: c?.col } }, c?.name), (c?.best ? h(React.Fragment, null, h("span", { style: { padding: "5px 10px", borderRadius: "999px", background: "#1E8A6E", color: "#FFFFFF", font: "600 11px/1 'Geist Mono',monospace", letterSpacing: ".06em", whiteSpace: "nowrap" } }, "✓ RECOMENDADO")) : null)), c?.scene, h("span", { style: { alignSelf: "center", padding: "7px 14px", borderRadius: "999px", background: "#FFFFFF", border: ("1px solid " + String(c?.bd ?? "")), color: c?.col, fontWeight: "600", fontSize: "14px", textAlign: "center", textWrap: "balance" } }, c?.eq), h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", fontSize: "14px" } }, h("span", { style: { color: "#5C5F63" } }, "Consumo"), h("span", {  }, h("span", { style: { fontWeight: "700", fontSize: "20px", letterSpacing: "-.02em" } }, c?.wNow, " W"), " ", h("span", { style: { color: c?.col, fontWeight: "600" } }, "· ", c?.wl))), h("span", { style: { display: "block", height: "8px", borderRadius: "999px", background: c?.track, overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: c?.wPct, borderRadius: "999px", background: c?.col } }))), h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", fontSize: "14px" } }, h("span", { style: { color: "#5C5F63" } }, "Vida útil"), h("span", {  }, h("span", { style: { fontWeight: "700", fontSize: "20px", letterSpacing: "-.02em" } }, c?.hNow, " h"), " ", h("span", { style: { color: c?.col, fontWeight: "600" } }, "· ", c?.hl))), h("span", { style: { display: "block", height: "8px", borderRadius: "999px", background: c?.track, overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: c?.hPct, borderRadius: "999px", background: c?.col } })))))))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "12px", alignItems: "stretch" } }, h("div", { style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #1E8A6E" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#1E8A6E", color: "#FFFFFF", fontWeight: "700" } }, "✓"), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px" } }, h("span", { style: { fontWeight: "600" } }, "Lo recomendable: LED"), h("span", { style: { fontSize: "14px", color: "#5C5F63", textWrap: "pretty" } }, "Con sólo 14 W da la luz de un foco incandescente de 100 W, y dura 25 veces más."))), h("a", { href: "https://bfmpedidosv-2.vercel.app/cotizar?ver=46221T", target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "16px", padding: "10px 18px 10px 10px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #E2E2DE", textDecoration: "none", color: "#141414" } }, h("img", { src: "/bfm-assets/focos-led/46221T.png", alt: "Foco LED Volteck 14 W, código 46221", width: "300", height: "496", style: { flex: "none", width: "64px", height: "auto" } }), h("span", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: "#5C5F63" } }, "VOLTECK · 46221"), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, "Foco LED 14 W, luz de día"), h("span", { style: { fontSize: "13px", color: "#5C5F63" } }, "Sustituye a uno de 100 W · 1500 lm"), h("span", { style: { fontWeight: "600", fontSize: "14px", color: "#1E8A6E" } }, "Cotizar →"))))));
  }
}

export default ComparativaFocos;
