"use client";
import React from "react";

// Instalar Fregadero — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "if17-" para no chocar con otros componentes.

const InstalarFregadero_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@500&display=swap\");@keyframes if17-frg-flow{to{stroke-dashoffset:-24}}@keyframes if17-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.if17-frg-pulse{transform-box:fill-box;transform-origin:center;animation:if17-frg-pulse 1.1s ease-out 1.3s 2 both}.if17-gas-inset{transform-box:fill-box;transform-origin:center;animation:if17-gas-inset 3.2s ease both}@keyframes if17-gas-inset{0%{opacity:0;transform:scale(.85)}10%{opacity:1;transform:none}82%{opacity:1;transform:none}100%{opacity:0;transform:scale(.92)}}@keyframes if17-gas-in{from{opacity:0}to{opacity:1}}.if17-gas-band{opacity:0;animation:if17-gas-in .2s ease forwards}.if17-lav-roll{animation:if17-lav-roll 1.6s ease-in-out .4s both}@keyframes if17-lav-roll{from{transform:translateX(0)}to{transform:translateX(-35px)}}@media (prefers-reduced-motion:reduce){.if17-frg-pulse{animation:none;opacity:0}.if17-gas-inset,.if17-lav-roll{animation:none}.if17-gas-band{animation:none;opacity:1}}";

const FRG = [
  ['Coloca las contracanastas', 'Pon sellador bajo la ceja de cada coladera y aprieta la contratuerca por abajo.', 'Cód. 49353T c/u'],
  ['Arma el desagüe doble', 'Une las dos contracanastas con el desagüe doble y su conexión en T.', ''],
  ['Conecta la trampa flexible', 'De la T a la salida de la pared. Su curva guarda agua y evita malos olores.', 'Cód. 49509T'],
  ['Sella con el empaque chupón', 'Mételo en la salida de la pared para que no haya fugas ni olores.', 'Cód. 49627T · 2" x 1-1/2"'],
  ['Instala las llaves angulares', 'De la pared salen dos roscas NPT de ½". Ponle cinta teflón a cada una y enrosca ahí un estopero. Te recomendamos el de ½ x ½; según la manguera que tengas, puedes ocupar el de ½ x ⅜.', '½ x ½ 49110T · ½ x ⅜ 49118T'],
  ['Coloca la mezcladora', 'Pásala por los orificios de la tarja y apriétala por abajo.', ''],
  ['Conecta las mangueras', 'De cada llave angular a la mezcladora: una para fría y otra para caliente.', '½ x ½ VLB-C20 · ½ x ⅜ VLB-D20'],
  ['Abre el agua y revisa', 'Abre las llaves, deja correr el agua y revisa que no gotee ninguna conexión.', '']
];
const FRG_P = [[{"name":"Contracanasta para fregadero","code":"49353T","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=49353T","slot":"frg-49353t","img":"/bfm-assets/fregadero/frg-49353t.webp"}],[{"name":"Desagüe doble","code":"48338T","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=627&ver=48338T","slot":"frg-48338t","img":"/bfm-assets/fregadero/frg-48338t.webp"}],[{"name":"Trampa flexible","code":"49509T","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=49509T","slot":"frg-49509t","img":"/bfm-assets/fregadero/frg-49509t.webp"},{"name":"Céspol tipo P (otra opción)","code":"5329","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=365&ver=5329","slot":"frg-5329","img":"/bfm-assets/lavabo/5329.png"}],[{"name":"Empaque chupón 2\" x 1-1/2\"","code":"49627T","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=49627T","slot":"frg-49627t","img":"/bfm-assets/fregadero/frg-49627t.webp"}],[{"name":"Llave angular ½ x ½","code":"49110T","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=49110T","slot":"frg-c49110t","img":"/bfm-assets/fregadero/frg-c49110t.webp"},{"name":"Llave angular ½ x ⅜","code":"49118T","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=49118T","slot":"frg-c49118t","img":"/bfm-assets/fregadero/frg-c49118t.webp"}],[{"name":"Mezcladora para fregadero","code":"48194T","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=305&ver=48194T","slot":"frg-48194t","img":"/bfm-assets/fregadero/frg-48194t.webp"}],[{"name":"Manguera alimentadora ½ x ½","code":"VLB-C30","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=VLBC30","slot":"frg-vlbc30","img":"/bfm-assets/fregadero/frg-vlbc30.webp"},{"name":"Manguera alimentadora ½ x ⅜","code":"VLB-D30","href":"https://bfmpedidosv-2.vercel.app/cotizar?ver=VLBD30","slot":"frg-vlbd30","img":"/bfm-assets/fregadero/frg-vlbd30.webp"}],[]];
const FRG_D = [3200, 3000, 3200, 2800, 5800, 3000, 3200, 4000];

class InstalarFregadero extends React.Component {
  state = { st: -1, ph: 0, w: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (el && window.ResizeObserver) { this.ro = new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w && w !== this.state.w) this.setState({ w }); }); this.ro.observe(el); }
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0.25 });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); if (this.ro) this.ro.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 7, ph: 1 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    FRG_D.forEach((d, k) => { this.T.push(setTimeout(() => this.setState({ st: k, ph: 0 }), t)); this.T.push(setTimeout(() => this.setState({ ph: 1 }), t + 90)); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.setState({ st: k, ph: 0 }); this.T.push(setTimeout(() => this.setState({ ph: 1 }), 90)); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const done = k => st > k || (st === k && ph === 1);
    const live = st >= 0;
    const STAND = [156, 108], KNEEL = [170, 200];
    const stand = st < 0 || st === 0 || st === 5 || st === 7;
    const part = (k, key, hand, tgt, kids, delay) => h('g', { key, style: { opacity: st >= k ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center', transform: done(k) ? 'none' : 'translate(' + (hand[0] - tgt[0]) + 'px,' + (hand[1] - tgt[1]) + 'px) scale(.7)', transition: live ? 'transform 1.3s cubic-bezier(.3,.7,.3,1) ' + (delay || 0) + 's, opacity .3s' : 'none' } }, kids);
    const draw = (k, key, d, stroke, w, extra) => h('path', Object.assign({ key, d, fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 220, style: { strokeDashoffset: done(k) ? 0 : 220, transition: live ? 'stroke-dashoffset 1.6s ease-in-out' : 'none' } }, extra || {}));
    const fade = (k, key, kids, delay) => h('g', { key, style: { opacity: done(k) ? 1 : 0, transition: live ? 'opacity .6s ease ' + (delay || 0) + 's' : 'none' } }, kids);
    const strainer = x => [h('rect', { key: 'b', x: x - 6, y: 150, width: 12, height: 16, rx: 2, fill: '#F2F2F0', stroke: '#8A9096', strokeWidth: 1.5 }), h('rect', { key: 'n', x: x - 8, y: 153, width: 16, height: 4, rx: 1, fill: '#2B2B2B' }), h('rect', { key: 'f', x: x - 10, y: 146, width: 20, height: 4, rx: 2, fill: '#2B2B2B' })];
    const valve = x => [h('rect', { key: 'o', x: x - 3, y: 200, width: 6, height: 9, fill: '#C9CED3', stroke: '#8A9096', strokeWidth: 1 }), h('rect', { key: 'b', x: x - 7, y: 208, width: 14, height: 12, rx: 2, fill: '#D5DADF', stroke: '#8A9096', strokeWidth: 1.5 }), h('circle', { key: 'h', cx: x - 11, cy: 214, r: 5, fill: '#B9C0C6', stroke: '#8A9096', strokeWidth: 1.5 })];
    const TG = [[270, 156], [270, 180], [283, 222], [350, 196], [225, 214], [262, 66], [237, 150], [236, 56]];
    const drainPath = 'M221 166 V180 H319 V166 M270 180 V194 V214 C270 232 296 232 296 214 V196 H350';
    const brass = '#C8A04A', brassD = '#8A6A2A';
    const stubs = [200, 250].map(x => h('g', { key: 'sb' + x }, h('circle', { cx: x, cy: 214, r: 6, fill: brass, stroke: brassD, strokeWidth: 1.2 }), h('circle', { cx: x, cy: 214, r: 3.8, fill: 'none', stroke: brassD, strokeWidth: .8 }), h('circle', { cx: x, cy: 214, r: 2, fill: '#5E584F' })));
    const P = ps => ps.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const tTop = x => 62 + (x - 48) / 56 * 4, tBot = x => 82 - (x - 48) / 56 * 4;
    const threads = []; for (let x = 54; x < 104; x += 5) threads.push(h('line', { key: 'th' + x, x1: x, y1: tTop(x), x2: x - 4, y2: tBot(x - 4), stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const bands = [0, 1, 2, 3, 4].map(i => { const x = 96 - i * 7; return h('polygon', { key: 'tb' + i, className: 'if17-gas-band', points: P([[x, tTop(x)], [x + 7, tTop(x + 7)], [x + 3, tBot(x + 3)], [x - 4, tBot(x - 4)]]), fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8, style: { animationDelay: (.4 + 1.6 * (7 * i + .5) / 35).toFixed(2) + 's' } }); });
    const teflon = st === 4 && ph === 1 ? h('g', { key: 'tef', className: 'if17-gas-inset' },
      h('defs', null, h('clipPath', { id: 'frg-tef-clip' }, h('circle', { cx: 80, cy: 72, r: 56 }))),
      h('circle', { cx: 80, cy: 72, r: 58, fill: '#FFFFFF', stroke: '#1E6FC2', strokeWidth: 3 }),
      h('g', { clipPath: 'url(#frg-tef-clip)' },
        h('rect', { x: 0, y: 10, width: 48, height: 130, fill: '#EDE7DC', stroke: '#CDBFA9', strokeWidth: 1.5 }),
        h('path', { d: 'M0 38 H48 M0 106 H48 M24 10 V38 M24 106 V140', stroke: '#DCD3C4', strokeWidth: 1 }),
        h('rect', { x: 44, y: 54, width: 6, height: 36, rx: 2, fill: '#D5DADF', stroke: '#8A9096', strokeWidth: 1 }),
        h('polygon', { points: '48,62 104,66 104,78 48,82', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('ellipse', { cx: 104, cy: 72, rx: 2.5, ry: 6, fill: '#7A5A22' }),
        threads, bands,
        h('g', { className: 'if17-lav-roll' },
          h('polygon', { points: '96,52 104,52 101,62.4 93,62.4', fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8 }),
          h('circle', { cx: 100, cy: 40, r: 12, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 4 }),
          h('circle', { cx: 100, cy: 40, r: 5, fill: '#F1F1EE', stroke: '#B9C0C6', strokeWidth: 1 }))),
      h('text', { x: 82, y: 104, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#1E6FC2', fontFamily: 'Geist Mono, monospace' }, 'NPT ½"'),
      h('rect', { x: 144, y: 30, width: 150, height: 52, rx: 10, fill: '#FFFFFF', stroke: '#E7ECF2', strokeWidth: 1.5 }),
      h('rect', { x: 152, y: 41, width: 8, height: 8, rx: 2, fill: '#1E6FC2' }),
      h('text', { x: 165, y: 49, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Pared: 2 roscas NPT ½"'),
      h('rect', { x: 152, y: 61, width: 8, height: 8, rx: 2, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 1.5 }),
      h('text', { x: 165, y: 69, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Teflón y luego el estopero')) : null;
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación de la instalación de un fregadero', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F3F0EA' } },
      h('rect', { x: 0, y: 246, width: 400, height: 14, fill: '#E3DCCF' }),
      h('rect', { x: 160, y: 104, width: 220, height: 142, fill: '#E9E3D8' }),
      h('rect', { x: 160, y: 104, width: 220, height: 142, fill: 'none', stroke: '#CDBFA9', strokeWidth: 6 }),
      h('rect', { x: 160, y: 236, width: 220, height: 10, fill: '#CDBFA9' }),
      stubs,
      h('circle', { cx: 358, cy: 196, r: 9, fill: '#8C857A' }), h('circle', { cx: 358, cy: 196, r: 5, fill: '#5E584F' }),
      h('path', { d: 'M180 104 V136 Q180 150 194 150 H248 Q262 150 262 136 V104 Z', fill: '#D5DADF', stroke: '#A9B0B7', strokeWidth: 2 }),
      h('path', { d: 'M278 104 V136 Q278 150 292 150 H346 Q360 150 360 136 V104 Z', fill: '#D5DADF', stroke: '#A9B0B7', strokeWidth: 2 }),
      h('rect', { x: 150, y: 94, width: 240, height: 10, rx: 2, fill: '#DAD3C6', stroke: '#C9C0B0', strokeWidth: 1.5 }),
      draw(1, 'd1o', 'M221 166 V180 H319 V166 M270 180 V194', '#9AA0A6', 10), draw(1, 'd1i', 'M221 166 V180 H319 V166 M270 180 V194', '#F7F7F5', 6),
      draw(2, 'd2o', 'M270 194 V214 C270 232 296 232 296 214 V196 H350', '#9AA0A6', 10), draw(2, 'd2i', 'M270 194 V214 C270 232 296 232 296 214 V196 H350', '#F7F7F5', 6),
      fade(2, 'rib', [h('path', { key: 'r', d: 'M270 196 V214 C270 232 296 232 296 214 V200', fill: 'none', stroke: '#C9CED3', strokeWidth: 6, strokeDasharray: '1.5 2.5' })], 1.2),
      part(0, 'c1', STAND, [221, 156], strainer(221)), part(0, 'c2', STAND, [319, 156], strainer(319), .25),
      part(3, 'emp', KNEEL, [350, 196], [h('rect', { key: 'e', x: 345, y: 188, width: 9, height: 16, rx: 2, fill: '#1F1F1F' })]),
      part(4, 'v1', KNEEL, [200, 210], valve(200), 2.4), part(4, 'v2', KNEEL, [250, 210], valve(250), 2.65),
      draw(6, 'm1', 'M200 200 C200 160 258 150 258 106', '#B9C0C6', 4), draw(6, 'm2', 'M250 200 C250 168 268 150 268 106', '#B9C0C6', 4),
      fade(6, 'mb', [h('path', { key: 'a', d: 'M200 200 C200 160 258 150 258 106', fill: 'none', stroke: '#7E868D', strokeWidth: 4, strokeDasharray: '1.5 2' }), h('path', { key: 'b', d: 'M250 200 C250 168 268 150 268 106', fill: 'none', stroke: '#7E868D', strokeWidth: 4, strokeDasharray: '1.5 2' })], 1.4),
      part(5, 'mz', STAND, [262, 66], [h('rect', { key: 'b', x: 254, y: 86, width: 16, height: 8, rx: 2, fill: '#C9CED3', stroke: '#8A9096', strokeWidth: 1.5 }), h('path', { key: 'n', d: 'M262 86 V44 Q262 30 248 30 Q236 30 236 44 V52', fill: 'none', stroke: '#C9CED3', strokeWidth: 6, strokeLinecap: 'round' }), h('path', { key: 'n2', d: 'M262 86 V44 Q262 30 248 30 Q236 30 236 44 V52', fill: 'none', stroke: '#8A9096', strokeWidth: 1.2 }), h('rect', { key: 'h1', x: 272, y: 84, width: 12, height: 5, rx: 2, fill: '#1E6FC2' }), h('rect', { key: 'h2', x: 240, y: 84, width: 12, height: 5, rx: 2, fill: '#DB011C' })]),
      fade(7, 'water', [
        h('path', { key: 'w1', d: 'M236 56 L230 146', stroke: '#5AA9E6', strokeWidth: 3.5, strokeLinecap: 'round', strokeDasharray: '7 5', style: { animation: 'if17-frg-flow .5s linear infinite' } }),
        h('ellipse', { key: 'w2', cx: 221, cy: 146, rx: 26, ry: 3, fill: '#9CCBF0' }),
        h('path', { key: 'w3', d: drainPath, fill: 'none', stroke: '#5AA9E6', strokeWidth: 2.5, strokeLinecap: 'round', strokeDasharray: '5 7', style: { animation: 'if17-frg-flow .7s linear infinite' } }),
        h('g', { key: 'ok' }, h('rect', { x: 18, y: 18, width: 118, height: 28, rx: 14, fill: '#1E6FC2' }), h('text', { x: 77, y: 37, textAnchor: 'middle', fontSize: 13, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓ Sin fugas'))
      ], .5),
      teflon,
      st >= 0 && ph === 1 && st < 7 ? h('circle', { key: 'p' + st, className: 'if17-frg-pulse', cx: TG[st][0], cy: TG[st][1], r: 12, fill: 'none', stroke: '#1E6FC2', strokeWidth: 2.5, style: st === 4 ? { animationDelay: '3.6s' } : undefined }) : null,
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
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), w = this.state.w || 1100;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: FRG[cur][0], curN: String(cur + 1),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / 8) * 100)) + '%',
      stepCols: w < 640 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      steps: FRG.map(([t, d, code], k) => {
        const isDone = st > k || (k === 7 && st === 7 && ph === 1), act = st === k && !isDone, on = act || isDone;
        return { t, d, prods: FRG_P[k], hasProds: FRG_P[k].length > 0, n: String(k + 1), go: () => this.go(k), lbl: 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : ''), lblC: on ? '#1E6FC2' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#1E6FC2' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#1E6FC2' : '#E3ECF5', nfg: on ? '#FFFFFF' : '#1E6FC2' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, InstalarFregadero_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F7FB", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "PASO A PASO · PLOMERÍA"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Cómo instalar tu fregadero en 8 pasos.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #D4E3F2", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de 8")), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3ECF5", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#1E6FC2", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 14px 10px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))), (s?.hasProds ? h(React.Fragment, null, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } }, (s?.prods || []).map((p, $index) => h(React.Fragment, { key: $index }, h("a", { href: p?.href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 6px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E7ECF2", textDecoration: "none", color: "#141414" } }, h("span", { style: { flex: "none", width: "76px", height: "76px", borderRadius: "10px", overflow: "hidden", background: "#F6F6F4", color: "#8A8D91" } }, (p?.img ? h("img", { src: p?.img, alt: "Foto", style: Object.assign({ width: "76px", height: "76px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "76px", height: "76px" }, { background: '#F3F3F1' }) }))), h("span", { style: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" } }, h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.25", overflowWrap: "break-word" } }, p?.name), h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", color: "#5C5F63", overflowWrap: "break-word" } }, p?.code), h("span", { style: { fontWeight: "600", fontSize: "12px", color: "#DB011C" } }, "Cotizar →"))))))) : null))))))));
  }
}

export default InstalarFregadero;
