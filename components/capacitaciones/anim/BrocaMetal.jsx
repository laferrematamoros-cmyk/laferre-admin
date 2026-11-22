"use client";
import React from "react";

// Broca Metal — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "bm10-" para no chocar con otros componentes.

const BrocaMetal_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");\n.bm10-b-down{transform:translateY(54px)}.bm10-b-up{transform:translateY(-24px)}\n.bm10-b-slot,.bm10-b-badge,.bm10-b-puff{transform-box:fill-box;transform-origin:center}.bm10-b-slot{transform-origin:top}\n.bm10-b-flash{opacity:0;transform-box:fill-box;transform-origin:center}.bm10-b-flick{transform-box:fill-box;transform-origin:50% 100%}\n.bm10-brc-run .bm10-b-fade{animation:bm10-b-fade 7s linear infinite}.bm10-brc-run .bm10-b-down{animation:bm10-b-down 7s ease-in-out infinite}.bm10-brc-run .bm10-b-slot{animation:bm10-b-slot 7s ease-in-out infinite}\n.bm10-brc-run .bm10-b-spin{animation:bm10-b-spin .9s linear infinite}.bm10-brc-run .bm10-b-hel{animation:bm10-b-hel .3s linear infinite}\n.bm10-brc-run .bm10-b-heat{animation:bm10-b-heat 7s linear infinite}.bm10-brc-run .bm10-b-smoke{animation:bm10-b-smoke 7s linear infinite}.bm10-brc-run .bm10-b-fire{animation:bm10-b-fire 7s linear infinite}\n.bm10-brc-run .bm10-b-puff{animation:bm10-b-puff 2s ease-out infinite}.bm10-brc-run .bm10-b-flick{animation:bm10-b-flick .22s ease-in-out infinite alternate}\n.bm10-brc-run .bm10-b-oil{animation:bm10-b-oil 7s linear infinite}.bm10-brc-run .bm10-b-flowoil{animation:bm10-b-flow .6s linear infinite}.bm10-brc-run .bm10-b-chip{animation:bm10-b-chip 7s ease-out infinite}\n.bm10-brc-run .bm10-b-badge{animation:bm10-b-badge 7s ease infinite}.bm10-brc-run .bm10-b-shake{animation:bm10-b-shake .16s linear infinite}.bm10-brc-run .bm10-b-up{animation:bm10-b-up 7s ease-out infinite}\n.bm10-brc-run .bm10-b-crack{animation:bm10-b-crack 7s ease-out infinite}.bm10-brc-run .bm10-b-frag{animation:bm10-b-frag 7s ease-out infinite}.bm10-brc-run .bm10-b-flash{animation:bm10-b-flash 7s ease-out infinite}\n.bm10-brc-run .bm10-b-hammer{animation:bm10-b-hammer .18s ease-in-out infinite}\n@keyframes bm10-b-fade{0%{opacity:0}4%,94%{opacity:1}100%{opacity:0}}\n@keyframes bm10-b-down{0%,8%{transform:translateY(0)}55%,100%{transform:translateY(54px)}}\n@keyframes bm10-b-slot{0%,19%{transform:scaleY(0)}55%,100%{transform:scaleY(1)}}\n@keyframes bm10-b-spin{to{stroke-dashoffset:-28}}@keyframes bm10-b-hel{to{transform:translateY(8px)}}\n@keyframes bm10-b-heat{0%,22%{opacity:0}55%,100%{opacity:1}}@keyframes bm10-b-smoke{0%,32%{opacity:0}50%,100%{opacity:1}}@keyframes bm10-b-fire{0%,42%{opacity:0}58%,100%{opacity:1}}\n@keyframes bm10-b-puff{0%{transform:translateY(0) scale(.6);opacity:.75}100%{transform:translateY(-70px) scale(2);opacity:0}}\n@keyframes bm10-b-flick{0%{transform:scaleY(.85)}100%{transform:scaleY(1.12)}}\n@keyframes bm10-b-oil{0%,6%{opacity:0}12%,100%{opacity:1}}@keyframes bm10-b-flow{to{stroke-dashoffset:-24}}\n@keyframes bm10-b-chip{0%,26%{stroke-dashoffset:1;opacity:0}27%{opacity:1}80%,100%{stroke-dashoffset:0;opacity:1}}\n@keyframes bm10-b-badge{0%,58%{opacity:0;transform:scale(.6)}64%,100%{opacity:1;transform:none}}\n@keyframes bm10-b-shake{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}\n@keyframes bm10-b-up{0%,57%{transform:translateY(0)}64%,100%{transform:translateY(-24px)}}\n@keyframes bm10-b-crack{0%,56%{stroke-dashoffset:1;opacity:0}57%{opacity:1}66%,100%{stroke-dashoffset:0;opacity:1}}\n@keyframes bm10-b-frag{0%,56%{transform:translate(0,0);opacity:0}58%{opacity:1}72%,100%{transform:translate(var(--dx),var(--dy));opacity:1}}\n@keyframes bm10-b-flash{0%,55%{opacity:0;transform:scale(.4)}58%{opacity:1;transform:scale(1)}66%,100%{opacity:0;transform:scale(1.2)}}\n@keyframes bm10-b-hammer{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}\n@media (prefers-reduced-motion:reduce){.bm10-brc-run *{animation:none !important}}";

const CARDS = [
  { ok: false, tag: '✕ NO', t: 'Velocidad excesiva', s: 'Fricción excesiva', d: 'Gira tan rápido que el calor por fricción destempla y quema el filo de la broca.' },
  { ok: true, tag: '✓ ASÍ SÍ', t: 'Baja velocidad + aceite', s: 'Corte perfecto', d: 'El aceite de corte enfría y lubrica el filo. La broca corta parejo y saca viruta larga.' },
  { ok: false, tag: '✕ NO', t: 'Modo percutor', s: 'Rompe la broca', d: 'El golpeteo del percutor es para concreto. En metal despostilla y quiebra la broca.' }
];
const zig = (x0, y0, x1, y1, n, a) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  let d = 'M' + x0 + ' ' + y0;
  for (let i = 1; i <= n; i++) { const t = i / n, s = i === n ? 0 : (i % 2 ? a : -a); d += ' L' + (x0 + dx * t + nx * s).toFixed(1) + ' ' + (y0 + dy * t + ny * s).toFixed(1); }
  return d;
};

class BrocaMetal extends React.Component {
  state = { run: false };
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.setState({ run: true }); return; }
    // Capacitaciones: arranca al llegar a la parte de arriba de la pantalla (con threshold, las altas no arrancaban en celular).
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.setState({ run: true }); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { if (this.io) this.io.disconnect(); }
  scene(k) {
    const h = React.createElement, id = s => 'brc' + k + s, u = s => 'url(#' + id(s) + ')';
    const RED = '#DB011C', GRN = '#1E9E55';
    const stop = (o, c, op) => h('stop', { key: o, offset: o, stopColor: c, stopOpacity: op == null ? 1 : op });
    const FL = 'M142 114 H158 V162 L150 174 L142 162 Z';
    const defs = h('defs', null,
      h('linearGradient', { id: id('ch'), x1: 0, x2: 1, y1: 0, y2: 0 }, stop(0, '#4A5157'), stop(.45, '#A9B1B8'), stop(.6, '#C9CFD4'), stop(1, '#454C52')),
      h('linearGradient', { id: id('bit'), x1: 0, x2: 1, y1: 0, y2: 0 }, stop(0, '#7E878E'), stop(.4, '#E3E7EA'), stop(1, '#6B737A')),
      h('linearGradient', { id: id('fr'), x1: 0, x2: 0, y1: 0, y2: 1 }, stop(0, '#B9BFC4'), stop(1, '#8E959B')),
      h('radialGradient', { id: id('glow') }, stop(0, '#FFF3B0'), stop(.35, '#FF9A1F'), stop(.7, '#E2430F', .8), stop(1, '#B3200A', 0)),
      h('linearGradient', { id: id('hot'), x1: 0, x2: 0, y1: 0, y2: 1 }, stop(0, '#3C5A9A', 0), stop(.35, '#6B4FA0', .55), stop(.7, '#E2661A', .85), stop(1, '#FFB347', .95)),
      h('clipPath', { id: id('fl') }, h('path', { d: FL })),
      h('clipPath', { id: id('up') }, h('path', { d: 'M100 40 H200 V140 L158 140 L154 146 L150 139 L146 147 L142 141 L100 141 Z' })),
      h('clipPath', { id: id('lo') }, h('path', { d: 'M100 141 L142 141 L146 147 L150 139 L154 146 L158 140 L200 140 V200 H100 Z' })));
    const hel = ['.12s', '.7s', '.3s'][k], sp = ['.35s', '1.6s', '.9s'][k];
    const stripes = []; for (let y = 102; y < 188; y += 8) stripes.push(h('path', { key: y, d: 'M141 ' + y + ' L159 ' + (y - 11), stroke: '#5E666D', strokeWidth: 3.2, strokeLinecap: 'round' }));
    const bitArt = key => h('g', { key },
      h('rect', { x: 144, y: 76, width: 12, height: 40, fill: u('bit'), stroke: '#5E666D', strokeWidth: 1 }),
      h('path', { d: FL, fill: u('bit'), stroke: '#5E666D', strokeWidth: 1 }),
      h('g', { clipPath: u('fl') }, h('g', { className: 'bm10-b-hel', style: { animationDuration: hel } }, stripes)),
      k === 0 ? h('path', { className: 'bm10-b-heat', d: FL, fill: u('hot') }) : null);
    const knurl = []; for (let x = 120; x <= 180; x += 4) knurl.push(h('path', { key: x, d: 'M' + x + ' 2 V40', stroke: '#2F353A', strokeWidth: 1.2, opacity: .45 }));
    const chuck = h('g', { key: 'chuck' },
      h('rect', { x: 128, y: -60, width: 44, height: 40, fill: u('ch') }),
      h('rect', { x: 114, y: -26, width: 72, height: 72, rx: 6, fill: u('ch'), stroke: '#3A4046', strokeWidth: 1 }),
      knurl,
      h('rect', { x: 122, y: 46, width: 56, height: 16, rx: 3, fill: u('ch'), stroke: '#3A4046', strokeWidth: 1 }),
      h('circle', { cx: 168, cy: 54, r: 3, fill: '#2F353A' }),
      h('path', { d: 'M130 62 H170 L161 80 H139 Z', fill: u('ch'), stroke: '#3A4046', strokeWidth: 1 }));
    const arc = h('g', { key: 'arc' },
      h('path', { className: 'bm10-b-spin', d: 'M104 54 A46 11 0 0 0 196 54', fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: '18 10', style: { animationDuration: sp } }),
      h('path', { d: 'M189 50 L198 52 L194 60', fill: 'none', stroke: '#141414', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    const block = h('g', null,
      h('polygon', { points: '210,196 236,178 236,268 210,286', fill: '#7D848A', stroke: '#636A70', strokeWidth: 1 }),
      h('rect', { x: 64, y: 196, width: 146, height: 90, fill: u('fr'), stroke: '#636A70', strokeWidth: 1 }),
      h('polygon', { points: '64,196 210,196 236,178 90,178', fill: '#CDD2D6', stroke: '#636A70', strokeWidth: 1 }),
      h('ellipse', { cx: 150, cy: 187, rx: 10, ry: 4, fill: '#3E454B' }),
      h('rect', { className: 'bm10-b-slot', x: 140, y: 187, width: 20, height: 46, rx: 9, fill: k === 1 ? '#5A6268' : '#454C52' }));
    const chip = (key, ok) => h('g', { key: 'chip' + key, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: ok ? 1 : 0 },
      h('path', { className: 'bm10-b-chip', d: key === 'l' ? zig(143, 186, 98, 116, 12, 7) : zig(157, 186, 204, 124, 12, 7), pathLength: 1, strokeDasharray: 1, stroke: '#5E666D', strokeWidth: 5 }),
      h('path', { className: 'bm10-b-chip', d: key === 'l' ? zig(143, 186, 98, 116, 12, 7) : zig(157, 186, 204, 124, 12, 7), pathLength: 1, strokeDasharray: 1, stroke: '#D3D8DC', strokeWidth: 2.4 }));
    const badge = h('g', { className: 'bm10-b-badge' },
      h('circle', { cx: 268, cy: 32, r: 18, fill: k === 1 ? GRN : RED }),
      h('text', { x: 268, y: 39, textAnchor: 'middle', fontSize: 20, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, k === 1 ? '✓' : '✕'));
    const lbl = ['VELOCIDAD EXCESIVA', 'VELOCIDAD BAJA', 'PERCUTOR'][k];
    const chipLbl = h('g', null,
      h('rect', { x: 12, y: 12, width: lbl.length * 6.6 + 22, height: 24, rx: 12, fill: '#FFFFFF', stroke: k === 1 ? GRN : RED, strokeWidth: 1.5 }),
      h('text', { x: 23, y: 28, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', fill: k === 1 ? GRN : RED, fontFamily: 'Geist Mono, monospace' }, lbl));
    let back = null, front = null, drill;
    if (k === 0) {
      back = h('g', null,
        h('ellipse', { className: 'bm10-b-heat', cx: 150, cy: 214, rx: 36, ry: 32, fill: u('glow') }),
        h('ellipse', { className: 'bm10-b-heat', cx: 150, cy: 187, rx: 20, ry: 7, fill: 'none', stroke: '#3A2A20', strokeWidth: 4, opacity: .7 }),
        h('g', { className: 'bm10-b-smoke' }, [[140, 168, 0], [160, 158, .5], [132, 150, 1], [168, 176, 1.5]].map(([x, y, dl]) => h('circle', { key: dl, className: 'bm10-b-puff', cx: x, cy: y, r: 14, fill: '#9AA0A6', opacity: .5, style: { animationDelay: dl + 's' } }))));
      front = h('g', { className: 'bm10-b-fire' },
        h('g', { className: 'bm10-b-flick', style: { animationDuration: '.2s' } }, h('path', { d: 'M150 188 C130 172 138 150 145 134 C147 150 156 150 155 130 C170 150 172 174 150 188 Z', fill: '#FF7A1A', opacity: .92 })),
        h('g', { className: 'bm10-b-flick', style: { animationDuration: '.26s' } }, h('path', { d: 'M150 188 C140 178 143 164 147 154 C149 164 153 164 153 152 C160 164 162 178 150 188 Z', fill: '#FFD15C' })),
        h('g', { className: 'bm10-b-flick', style: { animationDuration: '.3s' } }, h('path', { d: 'M134 188 C124 180 128 168 132 160 C134 170 140 176 142 188 Z', fill: '#FF9A1F' })),
        h('g', { className: 'bm10-b-flick', style: { animationDuration: '.24s' } }, h('path', { d: 'M166 188 C176 180 172 168 168 160 C166 170 160 176 158 188 Z', fill: '#FF9A1F' })));
    }
    if (k === 1) {
      back = h('g', null,
        h('path', { d: 'M310 14 C276 36 236 70 214 102', fill: 'none', stroke: '#6E767D', strokeWidth: 9, strokeLinecap: 'round' }),
        h('path', { d: 'M310 14 C276 36 236 70 214 102', fill: 'none', stroke: '#A9B1B8', strokeWidth: 3, strokeLinecap: 'round' }),
        h('g', { className: 'bm10-b-oil' },
          h('ellipse', { cx: 162, cy: 188, rx: 22, ry: 5, fill: '#D9A928', opacity: .45 }),
          h('path', { className: 'bm10-b-flowoil', d: 'M213 106 C200 130 174 160 160 186', fill: 'none', stroke: '#D9A928', strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: '8 4', opacity: .9 })));
      front = h('g', null, chip('l', true), chip('r', true));
    }
    if (k === 2) {
      back = h('g', { fill: 'none', stroke: '#2F353A', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
        ['M146 198 L132 214 L120 212 L104 232', 'M154 198 L170 216 L186 214 L198 236', 'M146 230 L138 252 L142 270', 'M154 230 L164 250 L180 258', 'M141 186 L118 182 L104 186', 'M159 186 L182 181 L198 184'].map((d, i) => h('path', { key: i, className: 'bm10-b-crack', d, pathLength: 1, strokeDasharray: 1 })));
      front = h('g', null,
        h('polygon', { className: 'bm10-b-flash', points: '150,162 156,178 172,176 160,188 170,202 152,194 142,208 140,192 124,190 138,180 132,166 146,176', fill: '#FFE08A' }),
        [[-40, -32], [36, -38], [-54, -6], [48, -12], [8, -48]].map(([dx, dy], i) => h('g', { key: 'f' + i, transform: 'translate(' + (148 + i) + ' 184)' },
          h('polygon', { className: 'bm10-b-frag', points: '0,0 8,2 3,8', fill: '#8E959B', stroke: '#5E666D', strokeWidth: .8, style: { '--dx': dx + 'px', '--dy': dy + 'px', transform: 'translate(' + dx + 'px,' + dy + 'px)' } }))),
        h('g', { transform: 'rotate(28 252 128)' }, h('g', { className: 'bm10-b-hammer', style: { transformOrigin: '252px 128px' } },
          h('rect', { x: 248, y: 94, width: 8, height: 36, rx: 3, fill: '#141414' }),
          h('rect', { x: 234, y: 82, width: 36, height: 15, rx: 3, fill: '#141414' }))));
      drill = h('g', { className: 'bm10-b-down' }, h('g', { className: 'bm10-b-shake' },
        h('g', { clipPath: u('lo') }, bitArt('lo')),
        h('g', { className: 'bm10-b-up' }, chuck, arc, h('g', { clipPath: u('up') }, bitArt('up')))));
    } else {
      drill = h('g', { className: 'bm10-b-down' }, chuck, arc, bitArt('b'));
    }
    return h('svg', { viewBox: '0 0 300 300', className: this.state.run ? 'bm10-brc-run' : '', role: 'img', 'aria-label': CARDS[k].t + ': ' + CARDS[k].s, style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F3F4F5' } },
      defs, h('g', { className: 'bm10-b-fade' }, block, back, drill, front, badge), chipLbl);
  }
  renderVals() {
    return { rootRef: this.rootRef, cards: CARDS.map((c, k) => ({ ...c, col: c.ok ? '#1E9E55' : '#DB011C', scene: this.scene(k) })) };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, BrocaMetal_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F4F5", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "TIPS · BROCAS PARA METAL"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "¿Por qué se quemó tu broca nueva?"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "En metal, más rápido no es mejor.")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "12px" } }, (v.cards || []).map((c, $index) => h(React.Fragment, { key: $index }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "12px", borderRadius: "18px", background: "#FFFFFF" } }, c?.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "4px", padding: "0 4px 4px" } }, h("span", { style: { font: "600 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: c?.col } }, c?.tag), h("span", { style: { fontWeight: "600", fontSize: "17px", lineHeight: "1.25" } }, c?.t, " ", h("span", { style: { color: c?.col } }, "· ", c?.s)), h("span", { style: { fontSize: "14px", lineHeight: "1.45", color: "#5C5F63", textWrap: "pretty" } }, c?.d)))))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "12px", alignItems: "stretch" } }, h("div", { style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #1E9E55" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#1E9E55", color: "#FFFFFF", fontWeight: "700" } }, "✓"), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px" } }, h("span", { style: { fontWeight: "600" } }, "Lo correcto"), h("span", { style: { fontSize: "14px", color: "#5C5F63", textWrap: "pretty" } }, "Taladra el metal a baja velocidad, con aceite de corte y sin percutor. El aceite enfría y lubrica el filo, y la broca te dura mucho más."))), h("a", { href: "https://bfmpedidosv-2.vercel.app/cotizar?f=75&ver=103618T", target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "16px", padding: "10px 18px 10px 14px", borderRadius: "18px", background: "#FFFFFF", border: "1.5px solid #E2E2DE", textDecoration: "none", color: "#141414" } }, h("img", { src: "/bfm-assets/lubricante/103618T.png", alt: "Lubricante multiusos Truper WT-175, 176 ml", width: "200", height: "476", style: { flex: "none", width: "44px", height: "auto" } }), h("span", { style: { display: "flex", flexDirection: "column", gap: "4px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".06em", color: "#5C5F63" } }, "RECOMENDADO · TRUPER 103618"), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, "Lubricante multiusos, 176 ml"), h("span", { style: { fontSize: "13px", color: "#5C5F63", textWrap: "pretty" } }, "Úsalo como lubricante al taladrar metal."), h("span", { style: { fontWeight: "600", fontSize: "14px", color: "#1E9E55" } }, "Cotizar →"))))));
  }
}

export default BrocaMetal;
