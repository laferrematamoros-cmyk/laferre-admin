"use client";
import React from "react";

// Instalar Gas Estufa — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "ige17-" para no chocar con otros componentes.

const InstalarGasEstufa_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@500&display=swap\");@keyframes ige17-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.ige17-frg-pulse{transform-box:fill-box;transform-origin:center;animation:ige17-frg-pulse 1.1s ease-out 1.3s 2 both}.ige17-gas-flame path{transform-box:fill-box;transform-origin:50% 100%;animation:ige17-gas-flk .45s ease-in-out infinite alternate}@keyframes ige17-gas-flk{from{transform:scaleY(1)}to{transform:scaleY(.75)}}@keyframes ige17-gas-bub{0%{transform:scale(.3);opacity:0}40%{opacity:1}100%{transform:scale(1.2);opacity:0}}.ige17-gas-bub{transform-box:fill-box;transform-origin:center;animation:ige17-gas-bub 1.2s ease-out infinite}.ige17-gas-inset{transform-box:fill-box;transform-origin:center;animation:ige17-gas-inset 3.2s ease both}@keyframes ige17-gas-inset{0%{opacity:0;transform:scale(.85)}10%{opacity:1;transform:none}82%{opacity:1;transform:none}100%{opacity:0;transform:scale(.92)}}@keyframes ige17-gas-in{from{opacity:0}to{opacity:1}}.ige17-gas-band{opacity:0;animation:ige17-gas-in .2s ease forwards}.ige17-gas-roll{animation:ige17-gas-roll 1.6s ease-in-out .4s both}@keyframes ige17-gas-roll{from{transform:translateX(0)}to{transform:translateX(-34px)}}@keyframes ige17-gas-roll2{from{transform:translateX(0)}to{transform:translateX(-20px)}}@keyframes ige17-gas-slide{from{transform:translateX(0)}to{transform:translateX(10px)}}@media (prefers-reduced-motion:reduce){.ige17-frg-pulse{animation:none;opacity:0}.ige17-gas-flame path,.ige17-gas-bub{animation:none}.ige17-gas-inset,.ige17-gas-roll{animation:none}.ige17-gas-inset g{animation:none !important}.ige17-gas-band{animation:none;opacity:1}}";

const U = c => 'https://bfmpedidosv-2.vercel.app/cotizar?ver=' + c;
const STEPS = [
  ['Revisa el cilindro', 'Debe tener válvula mexicana y estar en buen estado. Por seguridad, se recomienda cambiar el cilindro cada 10 años y su válvula cada 5 años. Manejamos cilindros mexicanos de 9, 20 y 30 kg.'],
  ['Coloca el regulador', 'Enróscalo en la válvula del cilindro con su empaque y apriétalo bien. Estos reguladores son para cilindros con válvula mexicana.'],
  ['Pon el niple terminal', 'Ponle cinta teflón sólo a la rosca NPT, la que entra al regulador, y enróscalo. La rosca flare, la de la manguera, va sin teflón. La medida del niple puede variar según tu regulador y tu manguera.'],
  ['Conecta la manguera', 'Un extremo va al niple terminal, sin teflón: esa conexión sella sola. Usa la misma medida: 3/8 con 3/8 o 5/16 con 5/16. Tenemos mangueras de 2 m hasta 5 m: elige el largo que necesites según la distancia entre el cilindro y la estufa.'],
  ['Conecta la estufa', 'Ponle teflón a la rosca exterior NPT que sale de la estufa y enrosca ahí el niple campana. La manguera va en el lado flare, sin teflón. La medida del niple puede variar según tu estufa y tu manguera.'],
  ['Revisa que no haya fugas', 'Abre la válvula y unta agua con jabón en cada conexión. Si salen burbujas, cierra y vuelve a apretar. Nunca uses fuego.'],
  ['Enciende la estufa', 'Abre la perilla y enciende el quemador. La flama debe salir azul.']
];
const PRODS = [
  [{ name: 'Cilindro para gas LP, válvula mexicana', code: '9 kg · 20 lb', href: 'https://bfmpedidosv-2.vercel.app/cotizar?c=122', slot: 'gas-cil-9', img: '/bfm-assets/gas/cil-9kg.png' }, { name: 'Cilindro para gas LP, válvula mexicana', code: '20 kg', href: 'https://bfmpedidosv-2.vercel.app/cotizar?c=122', slot: 'gas-cil-20', img: '/bfm-assets/gas/cil-20kg.png' }, { name: 'Cilindro para gas LP, válvula mexicana', code: '30 kg', href: 'https://bfmpedidosv-2.vercel.app/cotizar?c=122', slot: 'gas-cil-30', img: '/bfm-assets/gas/cil-30kg.png' }],
  [{ name: 'Regulador para gas con empaque', code: '49225T', href: U('49225T'), slot: 'gas-49225t', img: '/bfm-assets/gas/49225T.png' }, { name: 'Regulador para gas con empaque', code: '40709T', href: U('40709T'), slot: 'gas-40709t', img: '/bfm-assets/gas/40709T.png' }],
  [{ name: 'Niple terminal 3/8 NPT x 3/8 flare', code: '47433T', href: U('47433T'), slot: 'gas-47433t', img: '/bfm-assets/gas/47433T.png' }, { name: 'Niple terminal 3/8 NPT x 5/16 flare', code: '41052T', href: U('41052T'), slot: 'gas-41052t', img: '/bfm-assets/gas/41052T.png' }],
  [{ name: 'Manguera para gas 2 m · 3/8 x 3/8', code: '24063T', href: U('24063T'), slot: 'gas-24063t', img: '/bfm-assets/gas/24063T.png' }, { name: 'Manguera para gas 2 m · 5/16 x 5/16', code: '23204T', href: U('23204T'), slot: 'gas-23204t', img: '/bfm-assets/gas/23204T.png' }],
  [{ name: 'Niple campana 3/8 NPT x 3/8', code: '47428T', href: U('47428T'), slot: 'gas-47428t', img: '/bfm-assets/gas/47428T.png' }, { name: 'Niple campana 3/8 NPT x 5/16', code: '41054T', href: U('41054T'), slot: 'gas-41054t', img: '/bfm-assets/gas/41054T.png' }, { name: 'Niple campana 1/2 NPT x 3/8', code: '47429T', href: U('47429T'), slot: 'gas-47429t', img: '/bfm-assets/gas/47429T.png' }],
  [],
  []
];
const DUR = [3600, 3200, 5800, 3400, 5800, 3800, 4000];

class InstalarGasEstufa extends React.Component {
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
    const STAND = [158, 130], KNEEL = [170, 200];
    const stand = !(st === 3 || st === 4);
    const part = (k, key, hand, tgt, kids, delay) => h('g', { key, style: { opacity: st >= k ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center', transform: done(k) ? 'none' : 'translate(' + (hand[0] - tgt[0]) + 'px,' + (hand[1] - tgt[1]) + 'px) scale(.7)', transition: live ? 'transform 1.3s cubic-bezier(.3,.7,.3,1) ' + (delay || 0) + 's, opacity .3s' : 'none' } }, kids);
    const draw = (k, key, d, stroke, w) => h('path', { key, d, fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 220, style: { strokeDashoffset: done(k) ? 0 : 220, transition: live ? 'stroke-dashoffset 1.6s ease-in-out' : 'none' } });
    const fade = (k, key, kids, delay) => h('g', { key, style: { opacity: done(k) ? 1 : 0, transition: live ? 'opacity .6s ease ' + (delay || 0) + 's' : 'none' } }, kids);
    const brass = '#C8A04A', brassD = '#8A6A2A';
    const TG = [[173, 138], [200, 141], [221, 141], [236, 176], [245, 212], [214, 141]];
    const hose = 'M228 141 C250 141 224 212 241 212';
    const flame = (x, k) => h('g', { key: 'f' + x, className: 'ige17-gas-flame' },
      [-8, 0, 8].map((dx, i) => h('path', { key: 'o' + i, d: 'M' + (x + dx) + ' 120 q-4 -5 0 -11 q4 6 0 11 Z', fill: '#3B82F6', style: { animationDelay: ((i + k) * .12) + 's' } })),
      [-8, 0, 8].map((dx, i) => h('path', { key: 'i' + i, d: 'M' + (x + dx) + ' 120 q-2 -3 0 -6 q2 3 0 6 Z', fill: '#BFDBFE', style: { animationDelay: ((i + k) * .12) + 's' } })));
    const okW = done(6) ? 168 : 118;
    const tefOn = (st === 2 || st === 4) && ph === 1;
    const npTop = x => 64 - (x - 36) / 40 * 4, npBot = x => 80 + (x - 36) / 40 * 4, P = ps => ps.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const bands = [0, 1, 2, 3, 4].map(i => { const x = 68 - i * 7; return h('polygon', { key: 'tb' + i, className: 'ige17-gas-band', points: P([[x, npTop(x)], [x + 7, npTop(x + 7)], [x + 3, npBot(x + 3)], [x - 4, npBot(x - 4)]]), fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8, style: { animationDelay: (.4 + 1.6 * (.5 + 7 * i) / 34).toFixed(2) + 's' } }); });
    const threads = []; for (let x = 42; x < 76; x += 4.5) threads.push(h('line', { key: 'th' + x, x1: x, y1: npTop(x), x2: x - 3.5, y2: npBot(x - 3.5), stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const fthreads = []; for (let x = 100; x < 116; x += 4) fthreads.push(h('line', { key: 'ft' + x, x1: x, y1: 65, x2: x - 3, y2: 79, stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const teflon = st === 2 && ph === 1 ? h('g', { key: 'tef' + st, className: 'ige17-gas-inset' },
      h('defs', null, h('clipPath', { id: 'gas-tef-clip' }, h('circle', { cx: 80, cy: 72, r: 56 }))),
      h('circle', { cx: 80, cy: 72, r: 58, fill: '#FFFFFF', stroke: '#1E6FC2', strokeWidth: 3 }),
      h('g', { clipPath: 'url(#gas-tef-clip)' },
        h('polygon', { points: '36,64 76,60 76,84 36,80', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        threads,
        h('polygon', { points: '76,58 79,54 93,54 96,58 96,86 93,90 79,90 76,86', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('path', { d: 'M76 64 H96 M76 80 H96', stroke: brassD, strokeWidth: 1, opacity: .55 }),
        h('rect', { x: 96, y: 65, width: 20, height: 14, fill: brass, stroke: brassD, strokeWidth: 1.2 }),
        fthreads,
        h('polygon', { points: '116,65 124,68.5 124,75.5 116,79', fill: '#D9B866', stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        bands,
        h('g', { className: 'ige17-gas-roll' },
          h('polygon', { points: '68,51 76,51 73,60.4 65,60.7', fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8 }),
          h('circle', { cx: 72, cy: 39, r: 12, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 4 }),
          h('circle', { cx: 72, cy: 39, r: 5, fill: '#F1F1EE', stroke: '#B9C0C6', strokeWidth: 1 }))),
      h('text', { x: 56, y: 102, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#1E6FC2', fontFamily: 'Geist Mono, monospace' }, 'NPT'),
      h('text', { x: 110, y: 102, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#DB011C', fontFamily: 'Geist Mono, monospace' }, 'FLARE'),
      h('rect', { x: 144, y: 30, width: 118, height: 52, rx: 10, fill: '#FFFFFF', stroke: '#E7ECF2', strokeWidth: 1.5 }),
      h('rect', { x: 152, y: 41, width: 8, height: 8, rx: 2, fill: '#1E6FC2' }),
      h('text', { x: 165, y: 49, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'NPT: con teflón'),
      h('rect', { x: 152, y: 61, width: 8, height: 8, rx: 2, fill: '#DB011C' }),
      h('text', { x: 165, y: 69, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Flare: sin teflón')) : null;
    const stTop = x => 65 - (x - 92) / 28 * 3, stBot = x => 79 + (x - 92) / 28 * 3;
    const bands2 = [0, 1, 2].map(i => { const x = 111 - i * 7; return h('polygon', { key: 'sb' + i, className: 'ige17-gas-band', points: P([[x, stTop(x)], [x + 7, stTop(x + 7)], [x + 3, stBot(x + 3)], [x - 4, stBot(x - 4)]]), fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8, style: { animationDelay: (.4 + 1.4 * (1.5 + 7 * i) / 20).toFixed(2) + 's' } }); });
    const sthreads = []; for (let x = 96; x < 120; x += 4.5) sthreads.push(h('line', { key: 'st' + x, x1: x, y1: stTop(x), x2: x - 3.5, y2: stBot(x - 3.5), stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const cthreads = [41, 45, 49].map(x => h('line', { key: 'ct' + x, x1: x, y1: 65, x2: x - 3, y2: 79, stroke: brassD, strokeWidth: 1.1, opacity: .7 }));
    const teflon2 = st === 4 && ph === 1 ? h('g', { key: 'tef4', className: 'ige17-gas-inset' },
      h('defs', null, h('clipPath', { id: 'gas-tef-clip2' }, h('circle', { cx: 80, cy: 72, r: 56 }))),
      h('circle', { cx: 80, cy: 72, r: 58, fill: '#FFFFFF', stroke: '#1E6FC2', strokeWidth: 3 }),
      h('g', { clipPath: 'url(#gas-tef-clip2)' },
        h('rect', { x: 120, y: 20, width: 40, height: 104, fill: '#F4F4F2', stroke: '#C9CED3', strokeWidth: 1.5 }),
        h('polygon', { points: '92,65 120,62 120,82 92,79', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
        sthreads, bands2,
        h('g', { style: { animation: 'ige17-gas-slide .7s ease-in-out 2s both' } },
          h('polygon', { points: '30,68.5 38,65 38,79 30,75.5', fill: '#D9B866', stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
          h('rect', { x: 38, y: 65, width: 12, height: 14, fill: brass, stroke: brassD, strokeWidth: 1.2 }),
          cthreads,
          h('polygon', { points: '50,58 53,54 63,54 66,58 66,86 63,90 53,90 50,86', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
          h('path', { d: 'M50 64 H66 M50 80 H66', stroke: brassD, strokeWidth: 1, opacity: .55 }),
          h('polygon', { points: '66,61 86,57 86,87 66,83', fill: brass, stroke: brassD, strokeWidth: 1.2, strokeLinejoin: 'round' }),
          h('ellipse', { cx: 86, cy: 72, rx: 3, ry: 13, fill: '#7A5A22' })),
        h('g', { style: { animation: 'ige17-gas-roll2 1.4s ease-in-out .4s both' } },
          h('polygon', { points: '112,52 120,52 117,62.3 109,62.6', fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: .8 }),
          h('circle', { cx: 116, cy: 40, r: 12, fill: '#FFFFFF', stroke: '#B9C0C6', strokeWidth: 4 }),
          h('circle', { cx: 116, cy: 40, r: 5, fill: '#F1F1EE', stroke: '#B9C0C6', strokeWidth: 1 }))),
      h('text', { x: 46, y: 104, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#DB011C', fontFamily: 'Geist Mono, monospace' }, 'FLARE'),
      h('text', { x: 106, y: 104, textAnchor: 'middle', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', fill: '#1E6FC2', fontFamily: 'Geist Mono, monospace' }, 'NPT'),
      h('rect', { x: 144, y: 30, width: 142, height: 52, rx: 10, fill: '#FFFFFF', stroke: '#E7ECF2', strokeWidth: 1.5 }),
      h('rect', { x: 152, y: 41, width: 8, height: 8, rx: 2, fill: '#1E6FC2' }),
      h('text', { x: 165, y: 49, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Estufa NPT: con teflón'),
      h('rect', { x: 152, y: 61, width: 8, height: 8, rx: 2, fill: '#DB011C' }),
      h('text', { x: 165, y: 69, fontSize: 10, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Flare: sin teflón')) : null;
    const noTef = st === 3 && ph === 1 ? h('g', { key: 'nt3', style: { animation: 'ige17-gas-in .4s ease both' } },
      h('rect', { x: 16, y: 18, width: 168, height: 28, rx: 14, fill: '#FFFFFF', stroke: '#DB011C', strokeWidth: 1.5 }),
      h('text', { x: 100, y: 36, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: '#DB011C', fontFamily: 'Geist, sans-serif' }, '✕ Lado manguera: sin teflón')) : null;
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación de la conexión de una estufa al gas', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#F3F0EA' } },
      h('rect', { x: 236, y: 60, width: 164, height: 186, fill: '#ECE6DB' }),
      h('rect', { x: 0, y: 246, width: 400, height: 14, fill: '#E3DCCF' }),
      h('path', { d: 'M146 166 Q146 150 162 150 H184 Q200 150 200 166 V240 Q200 246 194 246 H152 Q146 246 146 240 Z', fill: '#D9DCDF', stroke: '#A9B0B7', strokeWidth: 2 }),
      h('path', { d: 'M146 198 H200', stroke: '#B9C0C6', strokeWidth: 2 }),
      h('rect', { x: 157, y: 210, width: 32, height: 14, rx: 3, fill: '#FFFFFF', stroke: '#C9CED3', strokeWidth: 1 }),
      h('text', { x: 173, y: 220, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: '#5C5F63', fontFamily: 'Geist, sans-serif' }, 'GAS LP'),
      h('path', { d: 'M156 150 V140 Q156 136 160 136 H186 Q190 136 190 140 V150', fill: 'none', stroke: '#A9B0B7', strokeWidth: 3 }),
      h('rect', { x: 168, y: 128, width: 10, height: 22, rx: 2, fill: brass, stroke: brassD, strokeWidth: 1.2 }),
      h('rect', { x: 162, y: 123, width: 22, height: 5, rx: 2, fill: '#2B2B2B' }),
      h('rect', { x: 178, y: 138, width: 7, height: 6, fill: brass, stroke: brassD, strokeWidth: 1 }),
      h('rect', { x: 256, y: 98, width: 122, height: 22, rx: 2, fill: '#E9E9E6', stroke: '#C9CED3', strokeWidth: 1.5 }),
      h('rect', { x: 252, y: 128, width: 130, height: 116, fill: '#F4F4F2', stroke: '#C9CED3', strokeWidth: 2 }),
      h('rect', { x: 248, y: 120, width: 138, height: 8, rx: 2, fill: '#2B2B2B' }),
      h('rect', { x: 270, y: 116, width: 30, height: 4, rx: 1, fill: '#1A1A1A' }), h('rect', { x: 334, y: 116, width: 30, height: 4, rx: 1, fill: '#1A1A1A' }),
      h('rect', { x: 254, y: 130, width: 126, height: 16, fill: '#E4E4E0' }),
      [272, 298, 324, 350].map(x => h('circle', { key: 'k' + x, cx: x, cy: 138, r: 5, fill: '#2B2B2B' })),
      h('rect', { x: 264, y: 154, width: 106, height: 76, rx: 4, fill: '#E9E9E6', stroke: '#C9CED3', strokeWidth: 1.5 }),
      h('rect', { x: 276, y: 158, width: 82, height: 4, rx: 2, fill: '#B9C0C6' }),
      h('rect', { x: 280, y: 170, width: 74, height: 40, rx: 3, fill: '#3A3F45' }),
      h('rect', { x: 258, y: 244, width: 10, height: 4, fill: '#2B2B2B' }), h('rect', { x: 366, y: 244, width: 10, height: 4, fill: '#2B2B2B' }),
      h('rect', { x: 248, y: 209, width: 5, height: 6, fill: '#8A9096' }),
      draw(3, 'ho', hose, '#C79A12', 7), draw(3, 'hi', hose, '#F5D04A', 3),
      part(1, 'reg', STAND, [200, 141], [
        h('rect', { key: 'n', x: 185, y: 137, width: 7, height: 8, rx: 1, fill: brass, stroke: brassD, strokeWidth: 1 }),
        h('circle', { key: 'b', cx: 201, cy: 141, r: 10, fill: '#C9CED3', stroke: '#8A9096', strokeWidth: 1.5 }),
        h('circle', { key: 'v', cx: 201, cy: 141, r: 3.5, fill: '#8A9096' }),
        h('rect', { key: 'o', x: 210, y: 138, width: 6, height: 6, fill: '#B9C0C6', stroke: '#8A9096', strokeWidth: 1 })]),
      part(2, 'nt', STAND, [221, 141], [h('rect', { key: 'a', x: 216, y: 136, width: 6, height: 10, rx: 1, fill: brass, stroke: brassD, strokeWidth: 1 }), h('rect', { key: 'b', x: 222, y: 138, width: 6, height: 6, fill: brass, stroke: brassD, strokeWidth: 1 })], 2.4),
      part(4, 'nc', KNEEL, [244, 212], [h('rect', { key: 'a', x: 243, y: 207, width: 5, height: 10, rx: 1, fill: brass, stroke: brassD, strokeWidth: 1 }), h('rect', { key: 'b', x: 238, y: 209, width: 5, height: 6, fill: brass, stroke: brassD, strokeWidth: 1 })], 2.4),
      h('g', { style: { opacity: st === 5 && ph === 1 ? 1 : 0, transition: 'opacity .5s ease' } },
        [[188, 132], [220, 132], [241, 203]].map(([x, y], i) => h('g', { key: 'b' + i },
          h('circle', { className: 'ige17-gas-bub', cx: x, cy: y, r: 4, fill: '#FFFFFF', stroke: '#7FB5E8', strokeWidth: 1.2, style: { animationDelay: (i * .3) + 's' } }),
          h('circle', { className: 'ige17-gas-bub', cx: x + 5, cy: y - 4, r: 2.5, fill: '#FFFFFF', stroke: '#7FB5E8', strokeWidth: 1, style: { animationDelay: (i * .3 + .5) + 's' } })))),
      fade(6, 'fl', [flame(285, 0), flame(349, 1)], .3),
      h('g', { style: { opacity: st === 0 && ph === 1 ? 1 : 0, transition: 'opacity .5s ease' } },
        h('rect', { x: 16, y: 18, width: 168, height: 66, rx: 10, fill: '#FFFFFF', stroke: '#E7ECF2', strokeWidth: 1.5 }),
        h('text', { x: 28, y: 36, fontSize: 9, fontWeight: 700, letterSpacing: '.06em', fill: '#1E6FC2', fontFamily: 'Geist Mono, monospace' }, 'POR SEGURIDAD, CAMBIA:'),
        h('text', { x: 28, y: 55, fontSize: 11, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'El cilindro cada 10 años'),
        h('text', { x: 28, y: 72, fontSize: 11, fontWeight: 600, fill: '#141414', fontFamily: 'Geist, sans-serif' }, 'Su válvula cada 5 años')),
      fade(5, 'ok', [h('rect', { key: 'r', x: 18, y: 18, width: okW, height: 28, rx: 14, fill: '#1E6FC2' }), h('text', { key: 't', x: 18 + okW / 2, y: 37, textAnchor: 'middle', fontSize: 13, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, done(6) ? '✓ Lista para cocinar' : '✓ Sin fugas')], .4),
      teflon, teflon2, noTef,
      st >= 0 && ph === 1 && st < last ? h('circle', { key: 'p' + st, className: 'ige17-frg-pulse', cx: TG[st][0], cy: TG[st][1], r: 12, fill: 'none', stroke: '#1E6FC2', strokeWidth: 2.5, style: st === 2 || st === 4 ? { animationDelay: '3.6s' } : undefined }) : null,
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
    return h(React.Fragment, null, h("style", null, InstalarGasEstufa_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F7FB", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "PASO A PASO · GAS"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Cómo conectar tu estufa al gas en 7 pasos.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #D4E3F2", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3ECF5", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#1E6FC2", transition: "width .6s ease" } }))), h("div", { style: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "12px", background: "#FFF6D6", fontSize: "14px", lineHeight: "1.4" } }, h("span", { style: { flex: "none", padding: "3px 8px", borderRadius: "999px", background: "#FFD84D", font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em" } }, "TIP"), h("span", { style: { textWrap: "pretty" } }, "Por seguridad, se recomienda cambiar el cilindro cada ", h("strong", { style: { fontWeight: "600" } }, "10 años"), " y su válvula cada ", h("strong", { style: { fontWeight: "600" } }, "5 años"), ".")), h("div", { style: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "12px", background: "#FFF6D6", fontSize: "14px", lineHeight: "1.4" } }, h("span", { style: { flex: "none", padding: "3px 8px", borderRadius: "999px", background: "#FFD84D", font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em" } }, "TIP"), h("span", { style: { textWrap: "pretty" } }, "Usa ", h("strong", { style: { fontWeight: "600" } }, "cinta teflón"), " sólo en las roscas NPT: la del niple terminal que entra al regulador y la que sale de la estufa. Del lado de la manguera (flare) ", h("strong", { style: { fontWeight: "600" } }, "no lleva teflón"), "."))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 14px 10px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))), (s?.hasProds ? h(React.Fragment, null, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } }, (s?.prods || []).map((p, $index) => h(React.Fragment, { key: $index }, h("a", { href: p?.href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 6px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E7ECF2", textDecoration: "none", color: "#141414" } }, h("span", { style: { flex: "none", width: "76px", height: "76px", borderRadius: "10px", overflow: "hidden", background: "#F6F6F4", color: "#8A8D91" } }, (p?.img ? h("img", { src: p?.img, alt: "Foto", style: Object.assign({ width: "76px", height: "76px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "76px", height: "76px" }, { background: '#F3F3F1' }) }))), h("span", { style: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" } }, h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.25", overflowWrap: "break-word" } }, p?.name), h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", color: "#5C5F63", overflowWrap: "break-word" } }, p?.code), h("span", { style: { fontWeight: "600", fontSize: "12px", color: "#DB011C" } }, "Cotizar →"))))))) : null))))))));
  }
}

export default InstalarGasEstufa;
