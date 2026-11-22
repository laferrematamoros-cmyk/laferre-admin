"use client";
import React from "react";

// Instalar Lavabo — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "il14-" para no chocar con otros componentes.

const InstalarLavabo_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@500&display=swap\");@keyframes il14-frg-flow{to{stroke-dashoffset:-24}}@keyframes il14-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.il14-frg-pulse{transform-box:fill-box;transform-origin:center;animation:il14-frg-pulse 1.1s ease-out 1.3s 2 both}.il14-gas-inset{transform-box:fill-box;transform-origin:center;animation:il14-gas-inset 3.2s ease both}@keyframes il14-gas-inset{0%{opacity:0;transform:scale(.85)}10%{opacity:1;transform:none}82%{opacity:1;transform:none}100%{opacity:0;transform:scale(.92)}}@keyframes il14-gas-in{from{opacity:0}to{opacity:1}}.il14-gas-band{opacity:0;animation:il14-gas-in .2s ease forwards}.il14-lav-roll{animation:il14-lav-roll 1.6s ease-in-out .4s both}@keyframes il14-lav-roll{from{transform:translateX(0)}to{transform:translateX(-35px)}}@media (prefers-reduced-motion:reduce){.il14-frg-pulse{animation:none;opacity:0}.il14-gas-inset,.il14-lav-roll{animation:none}.il14-gas-band{animation:none;opacity:1}}";

const U = c => 'https://bfmpedidosv-2.vercel.app/cotizar?ver=' + c;
const STEPS = [
  ['Coloca la contra', 'Pon sellador bajo la ceja de la contra y aprieta la contratuerca por abajo del lavabo.'],
  ['Conecta la trampa flexible', 'De la contra a la salida de la pared. Su curva guarda agua y evita malos olores.'],
  ['Sella con el empaque chupón', 'Mételo en la salida de la pared para que no haya fugas ni olores.'],
  ['Instala las llaves angulares', 'De la pared salen dos roscas NPT de ½". Ponle cinta teflón a cada una y enrosca ahí una llave angular. Te recomendamos la de ½ x ½; según la manguera que tengas, puedes ocupar la de ½ x ⅜.'],
  ['Coloca la mezcladora', 'Pásala por el orificio del lavabo y apriétala por abajo.'],
  ['Conecta las mangueras', 'De cada llave angular a la mezcladora: una para fría y otra para caliente.'],
  ['Abre el agua y revisa', 'Abre las llaves, deja correr el agua y revisa que no gotee ninguna conexión.']
];
const PRODS = [
  [{ name: 'Contra para lavabo 1-1/4"', code: '49333T', href: U('49333T'), slot: 'lav-c49333t', img: 'https://res.cloudinary.com/dpss0nzqo/image/upload/w_400,h_400,c_limit,q_auto,f_auto/v1771139153/productos/49333T.jpg' }],
  [{ name: 'Trampa flexible', code: '49509T', href: U('49509T'), slot: 'lav-49509t', img: '/bfm-assets/fregadero/frg-49509t.webp' }, { name: 'Céspol tipo P (otra opción)', code: '5329', href: 'https://bfmpedidosv-2.vercel.app/cotizar?f=365&ver=5329', slot: 'lav-5329', img: '/bfm-assets/lavabo/5329.png' }],
  [{ name: 'Empaque chupón 2" x 1-1/2"', code: '49627T', href: U('49627T'), slot: 'lav-49627t', img: '/bfm-assets/fregadero/frg-49627t.webp' }],
  [{ name: 'Llave angular ½ x ½', code: '49110T', href: U('49110T'), slot: 'lav-c49110t', img: '/bfm-assets/fregadero/frg-c49110t.webp' }, { name: 'Llave angular ½ x ⅜', code: '49118T', href: U('49118T'), slot: 'lav-c49118t', img: '/bfm-assets/fregadero/frg-c49118t.webp' }],
  [{ name: 'Mezcladora para lavabo', code: '45513T', href: U('45513T'), slot: 'lav-mezcladora', img: 'https://res.cloudinary.com/dpss0nzqo/image/upload/w_400,h_400,c_limit,q_auto,f_auto/v1771133922/productos/45513T.jpg' }],
  [{ name: 'Manguera alimentadora ½ x ½', code: 'VLB-C20', href: U('VLBC20'), slot: 'lav-vlbc20', img: '/bfm-assets/fregadero/frg-vlbc30.webp' }, { name: 'Manguera alimentadora ½ x ⅜', code: 'VLB-D20', href: U('VLBD20'), slot: 'lav-vlbd20', img: '/bfm-assets/fregadero/frg-vlbd30.webp' }],
  []
];
const DUR = [3200, 3200, 2800, 5800, 3000, 3200, 4000];

class InstalarLavabo extends React.Component {
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
    const h = React.createElement, st = this.state.st, ph = this.state.ph, last = STEPS.length - 1;
    const done = k => st > k || (st === k && ph === 1);
    const live = st >= 0;
    const STAND = [156, 108], KNEEL = [170, 200];
    const stand = st < 0 || st === 0 || st === 4 || st === 6;
    const part = (k, key, hand, tgt, kids, delay) => h('g', { key, style: { opacity: st >= k ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center', transform: done(k) ? 'none' : 'translate(' + (hand[0] - tgt[0]) + 'px,' + (hand[1] - tgt[1]) + 'px) scale(.7)', transition: live ? 'transform 1.3s cubic-bezier(.3,.7,.3,1) ' + (delay || 0) + 's, opacity .3s' : 'none' } }, kids);
    const draw = (k, key, d, stroke, w) => h('path', { key, d, fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 220, style: { strokeDashoffset: done(k) ? 0 : 220, transition: live ? 'stroke-dashoffset 1.6s ease-in-out' : 'none' } });
    const fade = (k, key, kids, delay) => h('g', { key, style: { opacity: done(k) ? 1 : 0, transition: live ? 'opacity .6s ease ' + (delay || 0) + 's' : 'none' } }, kids);
    const valve = x => [h('rect', { key: 'o', x: x - 3, y: 200, width: 6, height: 9, fill: '#C9CED3', stroke: '#8A9096', strokeWidth: 1 }), h('rect', { key: 'b', x: x - 7, y: 208, width: 14, height: 12, rx: 2, fill: '#D5DADF', stroke: '#8A9096', strokeWidth: 1.5 }), h('circle', { key: 'h', cx: x - 11, cy: 214, r: 5, fill: '#B9C0C6', stroke: '#8A9096', strokeWidth: 1.5 })];
    const TG = [[270, 167], [283, 212], [349, 190], [222, 214], [270, 90], [222, 176]];
    const trap = 'M270 176 V204 C270 222 296 222 296 204 V190 H346';
    const hose1 = 'M205 200 C205 166 262 162 262 120', hose2 = 'M240 200 C240 170 278 162 278 120';
    const tiles = [];
    for (let y = 22; y < 246; y += 22) tiles.push(h('line', { key: 'y' + y, x1: 0, x2: 400, y1: y, y2: y, stroke: '#E6DFD3', strokeWidth: 1 }));
    for (let x = 22; x < 400; x += 22) tiles.push(h('line', { key: 'x' + x, x1: x, x2: x, y1: 0, y2: 246, stroke: '#E6DFD3', strokeWidth: 1 }));
    const brass = '#C8A04A', brassD = '#8A6A2A';
    const stubs = [205, 240].map(x => h('g', { key: 'sb' + x }, h('circle', { cx: x, cy: 214, r: 6, fill: brass, stroke: brassD, strokeWidth: 1.2 }), h('circle', { cx: x, cy: 214, r: 3.8, fill: 'none', stroke: brassD, strokeWidth: .8 }), h('circle', { cx: x, cy: 214, r: 2, fill: '#5E584F' })));
    const P = ps => ps.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const tTop = x => 62 + (x - 48) / 56 * 4, tBot = x => 82 - (x - 48) / 56 * 4;
    const threads = []; for (let x = 54; x < 104; x += 5) threads.push(h('line', { key: 'th' + x, x1: x, y1: tTop(x), x2: x - 4, y2: tBot(x - 4), stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const bands = [0, 1, 2, 3, 4].map(i => { const x = 96 - i * 7; return h('polygon', { key: 'tb' + i, className: 'il14-gas-band', points: P([[x, tTop(x)], [x + 7, tTop(x + 7)], [x + 3, tBot(x + 3)], [x - 4, tBot(x - 4)]]), fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8, style: { animationDelay: (.4 + 1.6 * (7 * i + .5) / 35).toFixed(2) + 's' } }); });
    const teflon = st === 3 && ph === 1 ? h('g', { key: 'tef', className: 'il14-gas-inset' },
      h('defs', null, h('clipPath', { id: 'lav-tef-clip' }, h('circle', { cx: 80, cy: 72, r: 56 }))),
      h('circle', { cx: 80, cy: 72, r: 58, fill: '#FFFFFF', stroke: '#1E6FC2', strokeWidth: 3 }),
      h('g', { clipPath: 'url(#lav-tef-clip)' },
        h('rect', { x: 0, y: 10, width: 48, height: 130, fill: '#EDE7DC', stroke: '#CDBFA9', strokeWidth: 1.5 }),
        h('path', { d: 'M0 38 H48 M0 106 H48 M24 10 V38 M24 106 V140', stroke: '#DCD3C4', strokeWidth: 1 }),
        h('rect', { x: 44, y: 54, width: 6, height: 36, rx: 2, fill: '#D5DADF', stroke: '#8A9096', strokeWidth: 1 }),
        h('polygon', { points: '48,62 104,66 104,78 48,82', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('ellipse', { cx: 104, cy: 72, rx: 2.5, ry: 6, fill: '#7A5A22' }),
        threads, bands,
        h('g', { className: 'il14-lav-roll' },
          h('polygon', { points: '96,52 104,52 101,62.4 93,62.4', fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8 }),
          h('circle', { cx: 100, cy: 40, r: 12, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 4 }),
          h('circle', { cx: 100, cy: 40, r: 5, fill: '#F1F1EE', stroke: '#B9C0C6', strokeWidth: 1 }))),
      h('text', { x: 82, y: 104, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#1E6FC2', fontFamily: 'Geist Mono, monospace' }, 'NPT ½"'),
      h('rect', { x: 144, y: 30, width: 150, height: 52, rx: 10, fill: '#FFFFFF', stroke: '#E7ECF2', strokeWidth: 1.5 }),
      h('rect', { x: 152, y: 41, width: 8, height: 8, rx: 2, fill: '#1E6FC2' }),
      h('text', { x: 165, y: 49, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Pared: 2 roscas NPT ½"'),
      h('rect', { x: 152, y: 61, width: 8, height: 8, rx: 2, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 1.5 }),
      h('text', { x: 165, y: 69, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Teflón y luego la llave')) : null;
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación de la instalación de un lavabo', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F3F0EA' } },
      h('g', null, tiles),
      h('rect', { x: 0, y: 246, width: 400, height: 14, fill: '#E3DCCF' }),
      h('rect', { x: 226, y: 14, width: 88, height: 50, rx: 8, fill: '#E4EEF5', stroke: '#C9CED3', strokeWidth: 2 }),
      h('path', { d: 'M240 26 L258 26 M240 34 L250 34', stroke: '#FFFFFF', strokeWidth: 3, strokeLinecap: 'round' }),
      stubs,
      h('circle', { cx: 358, cy: 190, r: 9, fill: '#8C857A' }), h('circle', { cx: 358, cy: 190, r: 5, fill: '#5E584F' }),
      draw(5, 'm1', hose1, '#B9C0C6', 4), draw(5, 'm2', hose2, '#B9C0C6', 4),
      fade(5, 'mb', [h('path', { key: 'a', d: hose1, fill: 'none', stroke: '#7E868D', strokeWidth: 4, strokeDasharray: '1.5 2' }), h('path', { key: 'b', d: hose2, fill: 'none', stroke: '#7E868D', strokeWidth: 4, strokeDasharray: '1.5 2' })], 1.4),
      h('path', { d: 'M178 120 V146 H186 L206 120 Z', fill: '#CDBFA9' }),
      h('path', { d: 'M362 120 V146 H354 L334 120 Z', fill: '#CDBFA9' }),
      h('path', { d: 'M215 120 V130 Q215 158 243 158 H297 Q325 158 325 130 V120 Z', fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: 2 }),
      h('rect', { x: 170, y: 110, width: 200, height: 10, rx: 2, fill: '#DAD3C6', stroke: '#C9C0B0', strokeWidth: 1.5 }),
      draw(1, 't1o', trap, '#9AA0A6', 10), draw(1, 't1i', trap, '#F7F7F5', 6),
      fade(1, 'rib', [h('path', { key: 'r', d: 'M270 180 V204 C270 222 296 222 296 204 V194', fill: 'none', stroke: '#C9CED3', strokeWidth: 6, strokeDasharray: '1.5 2.5' })], 1.2),
      part(0, 'ct', STAND, [270, 167], [h('rect', { key: 'b', x: 264, y: 156, width: 12, height: 22, rx: 2, fill: '#E2E5E8', stroke: '#8A9096', strokeWidth: 1.5 }), h('rect', { key: 'n', x: 261, y: 161, width: 18, height: 5, rx: 1, fill: '#2B2B2B' })]),
      part(2, 'emp', KNEEL, [349, 190], [h('rect', { key: 'e', x: 344, y: 182, width: 9, height: 16, rx: 2, fill: '#1F1F1F' })]),
      part(3, 'v1', KNEEL, [205, 210], valve(205), 2.4), part(3, 'v2', KNEEL, [240, 210], valve(240), 2.65),
      part(4, 'mz', STAND, [270, 90], [
        h('rect', { key: 'b', x: 261, y: 104, width: 18, height: 6, rx: 2, fill: '#C9CED3', stroke: '#8A9096', strokeWidth: 1.5 }),
        h('rect', { key: 'c', x: 264, y: 80, width: 12, height: 25, rx: 3, fill: '#D5DADF', stroke: '#8A9096', strokeWidth: 1.5 }),
        h('path', { key: 's', d: 'M265 87 H252 Q248 87 248 91 V94', fill: 'none', stroke: '#C9CED3', strokeWidth: 5, strokeLinecap: 'round' }),
        h('path', { key: 's2', d: 'M265 87 H252 Q248 87 248 91 V94', fill: 'none', stroke: '#8A9096', strokeWidth: 1 }),
        h('rect', { key: 'l', x: 262, y: 74, width: 22, height: 5, rx: 2.5, fill: '#B9C0C6', stroke: '#8A9096', strokeWidth: 1.2 })]),
      fade(6, 'water', [
        h('path', { key: 'w1', d: 'M248 96 L249 110', stroke: '#5AA9E6', strokeWidth: 3.5, strokeLinecap: 'round', strokeDasharray: '5 4', style: { animation: 'il14-frg-flow .5s linear infinite' } }),
        h('path', { key: 'w3', d: 'M270 160 V204 C270 222 296 222 296 204 V190 H352', fill: 'none', stroke: '#5AA9E6', strokeWidth: 2.5, strokeLinecap: 'round', strokeDasharray: '5 7', style: { animation: 'il14-frg-flow .7s linear infinite' } }),
        h('g', { key: 'ok' }, h('rect', { x: 18, y: 18, width: 118, height: 28, rx: 14, fill: '#1E6FC2' }), h('text', { x: 77, y: 37, textAnchor: 'middle', fontSize: 13, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓ Sin fugas'))
      ], .5),
      teflon,
      st >= 0 && ph === 1 && st < last ? h('circle', { key: 'p' + st, className: 'il14-frg-pulse', cx: TG[st][0], cy: TG[st][1], r: 12, fill: 'none', stroke: '#1E6FC2', strokeWidth: 2.5, style: st === 3 ? { animationDelay: '3.6s' } : undefined }) : null,
      h('g', { style: { opacity: stand ? 1 : 0, transition: 'opacity .45s ease' } },
        h('path', { d: 'M106 246 L110 200 M118 246 L114 200', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round' }),
        h('path', { d: 'M112 200 L112 152', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M117 154 L' + STAND[0] + ' ' + STAND[1], stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: STAND[0], cy: STAND[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 112, cy: 133, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M100 132 A12 12 0 0 1 124 132 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M123 132 H132', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })),
      h('g', { style: { opacity: stand ? 0 : 1, transition: 'opacity .45s ease' } },
        h('path', { d: 'M96 244 L128 244 L118 212', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }),
        h('path', { d: 'M118 212 L136 182', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M140 184 L' + KNEEL[0] + ' ' + KNEEL[1], stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: KNEEL[0], cy: KNEEL[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 144, cy: 166, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M132 165 A12 12 0 0 1 156 165 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M155 165 H164', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })));
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(N),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map(([t, d], k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph === 1), act = st === k && !isDone, on = act || isDone;
        return { t, d, prods: PRODS[k], hasProds: PRODS[k].length > 0, n: String(k + 1), go: () => this.go(k), lbl: 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : ''), lblC: on ? '#1E6FC2' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#1E6FC2' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#1E6FC2' : '#E3ECF5', nfg: on ? '#FFFFFF' : '#1E6FC2' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, InstalarLavabo_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F7FB", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "PASO A PASO · PLOMERÍA"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Cómo instalar tu lavabo en 7 pasos.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #D4E3F2", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3ECF5", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#1E6FC2", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 14px 10px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))), (s?.hasProds ? h(React.Fragment, null, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } }, (s?.prods || []).map((p, $index) => h(React.Fragment, { key: $index }, h("a", { href: p?.href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 6px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E7ECF2", textDecoration: "none", color: "#141414" } }, h("span", { style: { flex: "none", width: "76px", height: "76px", borderRadius: "10px", overflow: "hidden", background: "#F6F6F4", color: "#8A8D91" } }, (p?.img ? h("img", { src: p?.img, alt: "Foto", style: Object.assign({ width: "76px", height: "76px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "76px", height: "76px" }, { background: '#F3F3F1' }) }))), h("span", { style: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" } }, h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.25", overflowWrap: "break-word" } }, p?.name), h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", color: "#5C5F63", overflowWrap: "break-word" } }, p?.code), h("span", { style: { fontWeight: "600", fontSize: "12px", color: "#DB011C" } }, "Cotizar →"))))))) : null))))))));
  }
}

export default InstalarLavabo;
