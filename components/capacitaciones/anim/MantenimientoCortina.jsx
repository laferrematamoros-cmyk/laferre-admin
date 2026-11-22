"use client";
import React from "react";

// Mantenimiento Cortina — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "mc20-" para no chocar con otros componentes.

const MantenimientoCortina_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500&display=swap\");@keyframes mc20-frg-flow{to{stroke-dashoffset:-24}}@keyframes mc20-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.mc20-frg-pulse{transform-box:fill-box;transform-origin:center;animation:mc20-frg-pulse 1.1s ease-out .3s 2 both}@keyframes mc20-cor-ud{0%{transform:translateY(0)}40%{transform:translateY(-150px)}60%{transform:translateY(-150px)}100%{transform:translateY(0)}}@keyframes mc20-cor-mist{0%,100%{opacity:.3}50%{opacity:.75}}@keyframes mc20-cor-fall{0%{transform:translateY(0);opacity:.8}100%{transform:translateY(30px);opacity:0}}@media (prefers-reduced-motion:reduce){.mc20-frg-pulse{animation:none;opacity:0}}";

const COT = 'https://bfmpedidosv-2.vercel.app/cotizar';
const STEPS = [
  ['Limpieza previa', 'Retira el polvo y la arena de las guías con un trapo seco. Si hay grasa vieja, quítala con desengrasante; si hay óxido, con cepillo de alambre.'],
  ['Lubrica las guías', 'Rocía una capa ligera de lubricante seco de teflón (PTFE) dentro de las guías laterales y un poco en la chapa. Sube y baja la cortina 2 a 3 veces para repartirlo.'],
  ['Engrasa el mecanismo', 'Con la cortina cerrada (y desconectada si es eléctrica), aplica grasa blanca de litio en aerosol en los baleros o bujes del eje, en el resorte si está a la vista y en la cadena del motor.'],
  ['Verifica', 'Súbela a media altura y suéltala: debe quedarse en su lugar. Revisa que suba y baje suave y sin ruido, y limpia el exceso de grasa para evitar manchas.']
];
const PRODS = [
  [],
  [{ name: 'Lubricante seco de teflón (PTFE) en aerosol', note: 'Seca rápido y casi no atrapa polvo ni arena.', href: COT + '?ver=101977T', slot: 'cor-lub-101977t', img: 'https://res.cloudinary.com/dpss0nzqo/image/upload/w_400,h_400,c_limit,q_auto,f_auto/v1771137839/productos/101977T.jpg' }],
  [{ name: 'Grasa blanca de litio en aerosol', note: 'Resiste la fricción y la humedad.', href: COT + '?ver=101974T', slot: 'cor-grasa-101974t', img: 'https://res.cloudinary.com/dpss0nzqo/image/upload/w_400,h_400,c_limit,q_auto,f_auto/v1771137377/productos/101974T.jpg' }],
  []
];
const DUR = [5400, 8400, 6400, 6000];
const LOOPS = {
  '0': ['152,212;155,180;150,148;155,116;150,90;155,116;150,148;155,180;152,212', '3.4s'],
  '1': ['140,206;140,96;140,206', '3s'],
  '2': ['100,116;200,116;100,116', '3s'],
  '3': ['156,218;160,198;156,218', '1.2s']
};

class MantenimientoCortina extends React.Component {
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
    if (k === 1) this.T.push(setTimeout(() => this.setState({ ph: 2 }), t + 3400));
    if (k === 3) this.T.push(setTimeout(() => this.setState({ ph: 2 }), t + 3600));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 3, ph: 2 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const A = '#C2560A', G = '#7E868D', RED = '#DB011C';
    const live = st >= 0;
    const vis = (on, d, dl) => ({ opacity: on ? 1 : 0, transition: live ? 'opacity ' + (d || .5) + 's ease ' + (dl || 0) + 's' : 'none' });
    const anim = (a, extra) => Object.assign({ transformBox: 'fill-box', transformOrigin: 'center', animation: a }, extra || {});
    const cleaned = st >= 1 || (st === 0 && ph === 1);
    const lubed = st >= 2 || (st === 1 && ph >= 1);
    const greased = st >= 3 || (st === 2 && ph === 1);
    const moving = (st === 1 && ph === 2) || (st === 3 && ph >= 1);
    const curAnim = st === 1 && ph === 2 ? 'mc20-cor-ud 2.6s ease-in-out .3s 2 both' : st === 3 && ph >= 1 ? 'mc20-cor-ud 3s ease-in-out .3s 1 both' : 'none';

    const slats = [];
    for (let y = 54; y < 232; y += 9) slats.push(h('path', { key: 'sl' + y, d: 'M170 ' + y + ' H342', stroke: '#A3AAB2', strokeWidth: 1.2 }));
    const curtain = h('g', { clipPath: 'url(#cor-clip)' },
      h('g', { key: 'cur' + st + '-' + ph, style: { animation: curAnim } },
        h('rect', { x: 170, y: 50, width: 172, height: 184, fill: '#D3D8DD' }),
        slats,
        h('rect', { x: 166, y: 232, width: 180, height: 10, rx: 1.5, fill: '#2B2F33' }),
        h('rect', { x: 250, y: 242, width: 12, height: 4, rx: 1, fill: '#5E646B' })));

    const rust = [[163, 92], [167, 134], [164, 178], [166, 214], [345, 108], [348, 168], [346, 206]].map((p, i) => h('circle', { key: 'ru' + i, cx: p[0], cy: p[1], r: i % 2 ? 2.6 : 3.2, fill: i % 3 === 2 ? '#5A4A2A' : '#A0522D', style: { opacity: cleaned ? 0 : .85, transition: live ? 'opacity 1.6s ease ' + (.4 + i * .35) + 's' : 'none' } }));
    const dust = st === 0 && ph === 1 ? [100, 140, 180, 120, 160].map((y, i) => h('circle', { key: 'du' + i, cx: 164 + (i % 2) * 3, cy: y, r: 1.8, fill: '#B8A58A', style: anim('mc20-cor-fall 1.4s ease-in ' + (i * .3) + 's infinite', { opacity: 0 }) })) : null;
    const film = [160, 342].map(x => h('rect', { key: 'fi' + x, x, y: 50, width: 10, height: 196, fill: '#9FD3FF', style: { opacity: lubed ? .45 : 0, transition: live ? 'opacity 2.6s ease .4s' : 'none' } }));

    const coil = []; for (let x = 188; x <= 324; x += 8) coil.push((x === 188 ? 'M' : 'L') + x + ' ' + (x % 16 === 12 ? 29 : 39));
    const dots = [190, 214, 238, 262, 286, 310].map((x, i) => h('circle', { key: 'gd' + x, cx: x, cy: 34, r: 3.4, fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: 1, style: { opacity: greased ? 1 : 0, transition: st === 2 ? 'opacity .4s ease ' + (.8 + i * .4) + 's' : 'none' } }));
    const cdots = [70, 100, 130].map((y, i) => h('circle', { key: 'cd' + y, cx: 366, cy: y, r: 3, fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: 1, style: { opacity: greased ? 1 : 0, transition: st === 2 ? 'opacity .4s ease ' + (3.4 + i * .3) + 's' : 'none' } }));
    const box = h('g', { key: 'box' },
      h('rect', { x: 152, y: 16, width: 208, height: 34, rx: 4, fill: '#2B313A' }),
      h('rect', { x: 164, y: 30, width: 190, height: 8, rx: 4, fill: '#B9C0C6' }),
      h('path', { d: coil.join(' '), fill: 'none', stroke: '#E8A23C', strokeWidth: 2, strokeLinejoin: 'round' }),
      h('circle', { cx: 354, cy: 34, r: 9, fill: '#8A9096', stroke: '#5E646B', strokeWidth: 1.5 }),
      dots,
      h('g', { style: { opacity: st === 2 ? .12 : 1, transition: live ? 'opacity .8s ease' : 'none' } },
        h('rect', { x: 152, y: 16, width: 208, height: 34, rx: 4, fill: '#4A5361' }),
        h('path', { d: 'M232 33 q6 -6 12 0 t12 0', fill: 'none', stroke: '#C9CED3', strokeWidth: 2, strokeLinecap: 'round' }),
        h('circle', { cx: 270, cy: 33, r: 7, fill: 'none', stroke: '#E8A23C', strokeWidth: 2 }),
        h('circle', { cx: 270, cy: 33, r: 2, fill: '#E8A23C' })));

    const chain = h('g', { key: 'chain' },
      h('path', { d: 'M366 34 V214', stroke: '#5E646B', strokeWidth: 3.5, strokeDasharray: '3 3', style: moving ? { animation: 'mc20-frg-flow .4s linear infinite' } : undefined }),
      cdots);

    const loop = ph >= 1 && !(st === 1 && ph === 2) && !(st === 3 && ph === 2) ? LOOPS[String(st)] : null;
    const rest = st === 2 ? [150, 112] : [124, 196];
    const tool = st === 0 ? [h('rect', { key: 'hd', x: -2, y: -2, width: 10, height: 4, rx: 1, fill: '#B07A3A' }), h('rect', { key: 'br', x: 7, y: -7, width: 6, height: 14, rx: 1.5, fill: '#3A3F45' }), h('path', { key: 'bb', d: 'M13 -6 H16 M13 -2 H16 M13 2 H16 M13 6 H16', stroke: '#3A3F45', strokeWidth: 1 })]
      : st === 1 ? [h('rect', { key: 'cb', x: -4, y: -12, width: 8, height: 20, rx: 2, fill: '#F07A1A' }), h('rect', { key: 'cc', x: -3, y: -16, width: 6, height: 4, rx: 1, fill: '#2B2B2B' }), loop ? h('path', { key: 'mi', d: 'M3 -15 L24 -24 L24 -4 Z', fill: '#DDF0FF', style: { animation: 'mc20-cor-mist .5s ease-in-out infinite' } }) : null]
      : st === 2 ? [h('rect', { key: 'gb', x: -4, y: -12, width: 8, height: 18, rx: 2, fill: '#3E4A5C' }), h('rect', { key: 'gc', x: -3, y: -16, width: 6, height: 4, rx: 1, fill: '#F07A1A' }), loop ? h('path', { key: 'gm', d: 'M-2 -16 L-10 -34 L10 -34 L2 -16 Z', fill: '#FFFFFF', stroke: '#DDE2E6', strokeWidth: 1, style: { animation: 'mc20-cor-mist .5s ease-in-out infinite' } }) : null]
      : st === 3 && ph === 1 ? [h('path', { key: 'rg', d: 'M-2 -6 C6 -9 12 -4 10 2 C8 8 0 8 -3 4 C-6 0 -6 -4 -2 -6 Z', fill: '#7FB8E6', stroke: '#4F8FC4', strokeWidth: 1 })] : [];
    const kid = 'h' + st + '-' + ph;
    let armKids = null, toolKids = null;
    if (loop) {
      const pts = loop[0].split(';').map(p => p.split(','));
      armKids = [h('animate', { key: 'ax', attributeName: 'x2', values: pts.map(p => p[0]).join(';'), dur: loop[1], repeatCount: 'indefinite' }), h('animate', { key: 'ay', attributeName: 'y2', values: pts.map(p => p[1]).join(';'), dur: loop[1], repeatCount: 'indefinite' })];
      toolKids = h('animateTransform', { key: 'at', attributeName: 'transform', type: 'translate', values: loop[0].split(';').map(p => p.replace(',', ' ')).join(';'), dur: loop[1], repeatCount: 'indefinite' });
    }
    const person = h('g', { key: 'person', style: { transform: st === 2 ? 'translate(90px,-70px)' : 'none', transition: 'transform 1.1s ease' } },
      h('path', { d: 'M106 246 L110 200 M118 246 L114 200', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round' }),
      h('path', { d: 'M112 200 L112 152', stroke: RED, strokeWidth: 20, strokeLinecap: 'round' }),
      h('line', { key: 'arm' + kid, x1: 117, y1: 154, x2: rest[0], y2: rest[1], stroke: RED, strokeWidth: 6, strokeLinecap: 'round' }, armKids),
      h('g', { key: 'tool' + kid, transform: 'translate(' + rest[0] + ' ' + rest[1] + ')' }, toolKids, tool, h('circle', { key: 'hand', cx: 0, cy: 0, r: 4, fill: '#A8704A' })),
      h('circle', { cx: 112, cy: 133, r: 11, fill: '#A8704A' }),
      h('path', { d: 'M100 132 A12 12 0 0 1 124 132 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M123 132 H132', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' }));

    const ladder = h('g', { key: 'lad', style: vis(st === 2, .5) },
      h('path', { d: 'M188 246 L198 176 M228 246 L218 176', stroke: '#8A9096', strokeWidth: 4, strokeLinecap: 'round' }),
      h('path', { d: 'M197 182 H219 M194 202 H222 M191 222 H225 M189 240 H227', stroke: '#8A9096', strokeWidth: 3, strokeLinecap: 'round' }));

    const PT = [[165, 150], [165, 150], [262, 34], [256, 236]];
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación del mantenimiento de una cortina metálica', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F3F0EA' } },
      h('defs', null, h('clipPath', { id: 'cor-clip' }, h('rect', { x: 160, y: 50, width: 200, height: 196 }))),
      h('rect', { x: 0, y: 246, width: 400, height: 14, fill: '#E3DCCF' }),
      h('rect', { x: 146, y: 10, width: 220, height: 236, fill: '#E9E2D6' }),
      curtain,
      h('rect', { x: 160, y: 50, width: 10, height: 196, fill: '#9AA3AE', stroke: '#7E868D', strokeWidth: 1 }),
      h('rect', { x: 342, y: 50, width: 10, height: 196, fill: '#9AA3AE', stroke: '#7E868D', strokeWidth: 1 }),
      film, rust, dust, box, chain, ladder, person,
      h('g', { key: 'okc', style: vis(st === 3 && ph === 2, .5) }, h('rect', { x: 10, y: 20, width: 128, height: 26, rx: 13, fill: A }), h('text', { x: 74, y: 37, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓ Sube y baja suave')),
      st >= 0 && ph === 1 ? h('circle', { key: 'p' + st, className: 'mc20-frg-pulse', cx: PT[st][0], cy: PT[st][1], r: 13, fill: 'none', stroke: A, strokeWidth: 2.5 }) : null);
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(N),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map(([t, d], k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph === 2), act = st === k && !isDone, on = act || isDone;
        return { t, d, prods: PRODS[k], hasProds: PRODS[k].length > 0, n: String(k + 1), go: () => this.go(k), lbl: 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : ''), lblC: on ? '#C2560A' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#C2560A' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#C2560A' : '#F6E6D6', nfg: on ? '#FFFFFF' : '#C2560A' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, MantenimientoCortina_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FBF5EE", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#C2560A" } }, "PASO A PASO · MANTENIMIENTO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Mantenimiento de tu cortina metálica en 4 pasos.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F0DCC8", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F3E5D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#C2560A", transition: "width .6s ease" } })))), h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", minWidth: "0" } }, h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 14px 10px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))), (s?.hasProds ? h(React.Fragment, null, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } }, (s?.prods || []).map((p, $index) => h(React.Fragment, { key: $index }, h("a", { href: p?.href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 6px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #EFE6DC", textDecoration: "none", color: "#141414" } }, h("span", { style: { flex: "none", width: "76px", height: "76px", borderRadius: "10px", overflow: "hidden", background: "#F6F6F4", color: "#8A8D91" } }, (p?.img ? h("img", { src: p?.img, alt: "Foto", style: Object.assign({ width: "76px", height: "76px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "76px", height: "76px" }, { background: '#F3F3F1' }) }))), h("span", { style: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" } }, h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.25" } }, p?.name), h("span", { style: { fontSize: "12px", lineHeight: "1.3", color: "#5C5F63" } }, p?.note), h("span", { style: { fontWeight: "600", fontSize: "12px", color: "#DB011C" } }, "Cotizar →"))))))) : null))))), h("div", { role: "note", style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "16px", background: "#FDECEC", border: "1.5px solid #DB011C" } }, h("span", { style: { flex: "none", width: "28px", height: "28px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#DB011C", color: "#FFFFFF", fontWeight: "700", fontSize: "15px" } }, "⚠"), h("span", { style: { fontSize: "14px", lineHeight: "1.45", textWrap: "pretty" } }, h("strong", { style: { fontWeight: "600" } }, "Importante:"), " no ajustes ni desarmes el resorte. Está bajo mucha tensión y puede causar lesiones graves. Si está roto, no uses la cortina y llama a un técnico.")))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "12px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", minWidth: "0" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#C2560A" } }, "CADA CUÁNTO"), h("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid #EFE6DC" } }, h("span", {  }, "Negocio o uso diario rudo"), h("span", { style: { fontWeight: "600", whiteSpace: "nowrap" } }, "Cada 3 a 4 meses")), h("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0" } }, h("span", {  }, "Uso ocasional o casa"), h("span", { style: { fontWeight: "600", whiteSpace: "nowrap" } }, "Cada 6 meses"))), h("div", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#5C5F63" } }, "EVITA"), h("ul", { style: { margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", lineHeight: "1.4" } }, h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "✗"), h("span", {  }, h("strong", { style: { fontWeight: "600" } }, "Grasa o aceite en las guías:"), " atrapan arena y traban la cortina.")), h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "✗"), h("span", {  }, h("strong", { style: { fontWeight: "600" } }, "WD-40 como único lubricante:"), " limpia y afloja, pero se evapora rápido."))))), h("div", { style: { display: "flex", flexDirection: "column", gap: "10px", padding: "18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "SEÑALES DE QUE ALGO FALLA"), h("ul", { style: { margin: "0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "8px 16px", fontSize: "14px", lineHeight: "1.4" } }, h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "!"), "Rechina o se oye fricción metálica"), h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "!"), "Se traba o se frena en el mismo punto"), h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "!"), "Necesitas mucha fuerza para moverla"), h("li", { style: { display: "flex", gap: "8px" } }, h("span", { style: { color: "#DB011C", fontWeight: "700" } }, "!"), "Se desalinea o baja chueca")), h("p", { style: { margin: "4px 0 0", paddingTop: "10px", borderTop: "1px solid #EFE6DC", fontSize: "13px", lineHeight: "1.45", color: "#5C5F63", textWrap: "pretty" } }, "Si necesitas mucha fuerza o no se queda a media altura, el problema es el resorte y no se arregla con grasa. Llama a un técnico.")))));
  }
}

export default MantenimientoCortina;
