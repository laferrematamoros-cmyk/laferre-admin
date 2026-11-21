"use client";
import React from "react";

// Pasos animados para impermeabilizar — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Requiere la imagen aislamax-recorte.webp en /public.
// Props opcionales: titulo (string), cubetaSrc (ruta de la imagen de la cubeta).

const IMP_PASOS = [["Limpia el techo","Raspa con espátula lo que esté flojo y barre polvo, tierra y restos de asfalto. Debe quedar limpio y seco."],["Resana grietas","Rellena fisuras con resanador de grietas y deja secar 12 horas."],["Aplica el sello","Una mano de Impersayer Sello, o Aislamax diluido 3 de agua por 1."],["Primera mano","Medio litro por m², sin diluir, en un solo sentido."],["Segunda mano","Otro medio litro por m², en sentido cruzado, unas 2 horas después."],["Deja secar","No lo pises ni lo mojes hasta que seque por completo."]];
const IMP_CSS = ".imp-tilt{transform-origin:50% 50%;animation:imp-tilt 1.6s ease-in-out 2s forwards}@keyframes imp-tilt{0%{transform:none;opacity:1}75%{opacity:1}100%{transform:perspective(700px) rotateX(58deg) rotateZ(-28deg) scale(.6);opacity:0}}@keyframes isc-rain{from{transform:translateY(0)}to{transform:translateY(250px)}}@keyframes isc-dripL{from{transform:translateY(0);opacity:1}to{transform:translateY(96px);opacity:.2}}@keyframes isc-dripR{from{transform:translateY(0);opacity:1}to{transform:translateY(124px);opacity:.2}}.isc-splash{transform-box:fill-box;transform-origin:50% 50%}@keyframes isc-splash{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.4);opacity:0}}@keyframes isc-heat{0%{transform:translateY(0);opacity:0}30%{opacity:.95}100%{transform:translateY(-26px);opacity:0}}.imp-strip{transform-box:fill-box;transform-origin:50% 0%;animation-name:imp-sy;animation-timing-function:ease-in-out;animation-fill-mode:both}.imp-stripx{transform-box:fill-box;transform-origin:0% 50%;animation-name:imp-sx;animation-timing-function:ease-in-out;animation-fill-mode:both}@keyframes imp-sy{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes imp-sx{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes imp-in{from{opacity:0}to{opacity:1}}@keyframes imp-out{from{opacity:1}to{opacity:0}}.imp-scrape{animation:imp-scrape 4.5s linear forwards}.imp-sweep{animation:imp-sweep 3s linear 4.8s both}.imp-crk{animation:imp-crk 1.8s linear forwards}.imp-rollv{animation:imp-rollv 7s linear forwards}.imp-rollh{animation:imp-rollh 7s linear forwards}@keyframes imp-scrape{0%{transform:translate(51.2px,22px);opacity:1}17%{transform:translate(51.2px,230px)}20%{transform:translate(125.6px,22px)}37%{transform:translate(125.6px,230px)}40%{transform:translate(200px,22px)}57%{transform:translate(200px,230px)}60%{transform:translate(274.4px,22px)}77%{transform:translate(274.4px,230px)}80%{transform:translate(348.8px,22px)}97%{transform:translate(348.8px,230px)}98%{transform:translate(348.8px,230px);opacity:1}100%{transform:translate(348.8px,230px);opacity:0}}@keyframes imp-sweep{0%{transform:translate(51.2px,22px);opacity:0}1%{transform:translate(51.2px,22px);opacity:1}17%{transform:translate(51.2px,230px)}20%{transform:translate(125.6px,22px)}37%{transform:translate(125.6px,230px)}40%{transform:translate(200px,22px)}57%{transform:translate(200px,230px)}60%{transform:translate(274.4px,22px)}77%{transform:translate(274.4px,230px)}80%{transform:translate(348.8px,22px)}97%{transform:translate(348.8px,230px)}98%{transform:translate(348.8px,230px);opacity:1}100%{transform:translate(348.8px,230px);opacity:0}}@keyframes imp-crk{0.0%{transform:translate(80px,52px);opacity:1}18.8%{transform:translate(104px,80px);opacity:1}34.0%{transform:translate(94px,108px);opacity:1}55.0%{transform:translate(124px,136px);opacity:1}70.2%{transform:translate(114px,164px);opacity:1}94.0%{transform:translate(146px,198px);opacity:1}100%{transform:translate(146px,198px);opacity:0}}@keyframes imp-rollv{0%{transform:translate(51.2px,22px);opacity:1}8%{transform:translate(51.2px,228px)}12%{transform:translate(51.2px,22px)}19%{transform:translate(51.2px,228px);opacity:1}20%{transform:translate(125.6px,22px)}28%{transform:translate(125.6px,228px)}32%{transform:translate(125.6px,22px)}39%{transform:translate(125.6px,228px);opacity:1}40%{transform:translate(200px,22px)}48%{transform:translate(200px,228px)}52%{transform:translate(200px,22px)}59%{transform:translate(200px,228px);opacity:1}60%{transform:translate(274.4px,22px)}68%{transform:translate(274.4px,228px)}72%{transform:translate(274.4px,22px)}79%{transform:translate(274.4px,228px);opacity:1}80%{transform:translate(348.8px,22px)}88%{transform:translate(348.8px,228px)}92%{transform:translate(348.8px,22px)}99%{transform:translate(348.8px,228px);opacity:1}100%{transform:translate(348.8px,228px);opacity:0}}@keyframes imp-rollh{0%{transform:translate(22px,36.2px);opacity:1}8%{transform:translate(378px,36.2px)}12%{transform:translate(22px,36.2px)}19%{transform:translate(378px,36.2px);opacity:1}20%{transform:translate(22px,80.6px)}28%{transform:translate(378px,80.6px)}32%{transform:translate(22px,80.6px)}39%{transform:translate(378px,80.6px);opacity:1}40%{transform:translate(22px,125px)}48%{transform:translate(378px,125px)}52%{transform:translate(22px,125px)}59%{transform:translate(378px,125px);opacity:1}60%{transform:translate(22px,169.4px)}68%{transform:translate(378px,169.4px)}72%{transform:translate(22px,169.4px)}79%{transform:translate(378px,169.4px);opacity:1}80%{transform:translate(22px,213.8px)}88%{transform:translate(378px,213.8px)}92%{transform:translate(22px,213.8px)}99%{transform:translate(378px,213.8px);opacity:1}100%{transform:translate(378px,213.8px);opacity:0}}@media (prefers-reduced-motion:reduce){.imp-strip,.imp-stripx{animation:none !important}.imp-scrape,.imp-sweep,.imp-crk,.imp-rollv,.imp-rollh{display:none}}@media (prefers-reduced-motion:reduce){.imp-tilt{animation:none !important}.isc-scene{display:none}}.bfm-imp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:12px;align-items:start}.bfm-imp-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}@media (max-width:640px){.bfm-imp-steps{grid-template-columns:minmax(0,1fr)}}";

class PasosImpermeabilizar extends React.Component {
  state = { impStep: -1, impPh: 0 };
  impT = [];
  impRoofRef = el => {
    if (!el || this.impIO || this.state.impStep >= 0) return;
    if (!window.IntersectionObserver) { this.impPlay(); return; }
    this.impIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.impIO.disconnect(); this.impPlay(); } }, { threshold: 0.45 });
    this.impIO.observe(el);
  };
  impClear() { this.impT.forEach(clearTimeout); this.impT = []; }
  impPlay() {
    this.impClear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ impStep: 5, impPh: 1 }); return; }
    this.setState({ impStep: -1, impPh: 0 });
    const D = [11500, 3200, 10600, 10600, 10600, 2700]; let t = 150;
    for (let k = 0; k < 6; k++) {
      this.impT.push(setTimeout(() => this.setState({ impStep: k, impPh: 0 }), t));
      this.impT.push(setTimeout(() => this.setState({ impPh: 1 }), t + 90));
      t += D[k];
    }
  }
  impGo(k) { if (this.impIO) this.impIO.disconnect(); else this.impIO = { disconnect() {} }; this.impClear(); this.setState({ impStep: k, impPh: 0 }); this.impT.push(setTimeout(() => this.setState({ impPh: 1 }), 90)); }
  impWorkRef = el => {
    if (!el) return;
    cancelAnimationFrame(this.impRaf);
    const q = k => el.querySelector('[data-k="' + k + '"]');
    this.impAnim = { el, st: +el.getAttribute('data-st'), t0: performance.now(), q: {}, get: function (k) { return this.q[k] || (this.q[k] = q(k)); } };
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.setAttribute('opacity', 0); return; }
    this.impTick();
  };
  impKeys(st) {
    if (!this.impK) {
      const W = 74.4, RH = 44.4, n5 = [0, 1, 2, 3, 4], xs = n5.map(n => 14 + W * n + W / 2), ys = n5.map(n => 14 + RH * n + RH / 2);
      const C = [[80,52],[104,80],[94,108],[124,136],[114,164],[146,198]]; const cum = [0]; for (let i = 1; i < C.length; i++) cum.push(cum[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
      const L = cum[cum.length - 1];
      this.impK = {
        a: [].concat(...n5.map(n => [[n * 1.26, xs[n], 22], [n * 1.26 + 1.07, xs[n], 230]])),
        b: [].concat(...n5.map(n => [[6.72 + n * .84, xs[n], 22], [6.72 + n * .84 + .71, xs[n], 230]])),
        c: C.map((p, i) => [cum[i] / L * 2.5, p[0], p[1]]),
        v: [].concat(...n5.map(n => { const t = n * 1.96, x = xs[n]; return [[t, x, 22], [t + .78, x, 228], [t + 1.18, x, 22], [t + 1.86, x, 228]]; })),
        h: [].concat(...n5.map(n => { const t = n * 1.96, y = ys[n]; return [[t, 22, y], [t + .78, 378, y], [t + 1.18, 22, y], [t + 1.86, 378, y]]; }))
      };
    }
    return this.impK;
  }
  impPose(st, t) {
    const K = this.impKeys(), cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const at = (k, t) => { if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const a = k[i - 1], b = k[i], u = (t - a[0]) / ((b[0] - a[0]) || 1); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } const e = k[k.length - 1]; return [e[1], e[2]]; };
    let kind, keys, alpha = 1, end;
    if (st === 0) { if (t < 6.44) { kind = 'scrape'; keys = K.a; alpha = cl((6.3 - t) / .12, 0, 1); } else { kind = 'sweep'; keys = K.b; alpha = cl((t - 6.55) / .12, 0, 1); } }
    else if (st === 1) { kind = 'crk'; keys = K.c; } else if (st === 4) { kind = 'rh'; keys = K.h; } else { kind = 'rv'; keys = K.v; }
    const last = keys[keys.length - 1][0];
    if (kind !== 'scrape') alpha *= cl(1 - (t - last) / .4, 0, 1);
    const p = at(keys, t), q = at(keys, t - .03);
    return { kind, tx: p[0], ty: p[1], walk: Math.hypot(p[0] - q[0], p[1] - q[1]) > .3, alpha, end: kind !== 'scrape' && t > last + .45 };
  }
  impTick = () => {
    const A = this.impAnim;
    if (!A || !A.el.isConnected) { this.impRaf = 0; return; }
    const t = (performance.now() - A.t0) / 1000, P = this.impPose(A.st, t);
    const CFG = { scrape: { hand: [[-2, -30], [2, -20]], off: [0, -50], rot: 0 }, sweep: { hand: [[0, -38], [0, -24]], off: [0, -58], rot: 0 }, crk: { hand: [[0, -22], [0, -22]], off: [0, -40], rot: 0 }, rv: { hand: [[0, -50], [0, -40]], off: [0, -64], rot: 0 }, rh: { hand: [[-50, 0], [-40, 0]], off: [-64, 0], rot: -90 } }[P.kind];
    A.el.setAttribute('opacity', P.alpha);
    if (A.st === 0) { A.get('scrape').setAttribute('opacity', P.kind === 'scrape' ? 1 : 0); A.get('sweep').setAttribute('opacity', P.kind === 'sweep' ? 1 : 0); }
    A.get('tool').setAttribute('transform', 'translate(' + P.tx + ',' + P.ty + ')');
    const px = P.tx + CFG.off[0], py = P.ty + CFG.off[1], rad = CFG.rot * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
    A.get('person').setAttribute('transform', 'translate(' + px + ',' + py + ') rotate(' + CFG.rot + ')');
    const sw = P.walk ? Math.sin(t * 14) * 5 : 0;
    A.get('footA').setAttribute('cy', sw); A.get('footB').setAttribute('cy', -sw);
    [['A', -12], ['B', 12]].forEach(([k, sx], i) => {
      const shx = px + sx * c - 2 * s, shy = py + sx * s + 2 * c, hx = P.tx + CFG.hand[i][0], hy = P.ty + CFG.hand[i][1];
      const arm = A.get('arm' + k); arm.setAttribute('x1', shx); arm.setAttribute('y1', shy); arm.setAttribute('x2', hx); arm.setAttribute('y2', hy);
      const hd = A.get('hand' + k); hd.setAttribute('cx', hx); hd.setAttribute('cy', hy);
    });
    this.impRaf = P.end ? 0 : requestAnimationFrame(this.impTick);
  };
  impSceneEl() {
    const h = React.createElement;
    const vis = (a, b) => ({ animation: 'imp-in .7s ease ' + a + 's both' + (b ? ', imp-out .8s ease ' + b + 's forwards' : '') });
    const pill = (k, x, y, w, t, bg, fg, st) => h('g', { key: k, style: st }, h('rect', { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 11, fill: bg }), h('text', { x, y: y + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: 'Geist, sans-serif' }, t));
    const thermo = (k, x, y, c, lvl, st) => h('g', { key: k, transform: 'translate(' + x + ',' + y + ')', style: st },
      h('rect', { x: -4, y: -26, width: 8, height: 28, rx: 4, fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }),
      h('rect', { x: -1.8, y: lvl, width: 3.6, height: 2 - lvl, fill: c }),
      h('circle', { cx: 0, cy: 5, r: 6.5, fill: c, stroke: '#1A1A1A', strokeWidth: 1.5 }));
    const rain = []; for (let i = 0; i < 46; i++) { const x = (i * 53 + 17) % 410, y = (i * 97) % 250; rain.push(h('line', { key: 'a' + i, x1: x, y1: y, x2: x - 3, y2: y + 13, stroke: '#D7E8F7', strokeWidth: 1.6, strokeLinecap: 'round', opacity: .85 }), h('line', { key: 'b' + i, x1: x, y1: y - 250, x2: x - 3, y2: y - 237, stroke: '#D7E8F7', strokeWidth: 1.6, strokeLinecap: 'round', opacity: .85 })); }
    const splash = [[130,108],[170,96],[210,110],[250,100],[290,96],[190,102],[150,114],[230,92],[270,110]];
    const heat = (x, d) => h('path', { key: 'h' + x, d: 'M' + x + ' 80 q6 -7 12 0 t12 0 t12 0', stroke: '#FF7A2F', strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round', style: { animation: 'isc-heat 1.8s ease-in-out ' + d + 's infinite' } });
    return h('svg', { className: 'isc-scene', viewBox: '0 0 400 250', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'imp-in .9s ease 3s both' } },
      h('rect', { x: 0, y: 0, width: 400, height: 250, fill: '#BFE3F7' }),
      h('rect', { x: 0, y: 0, width: 400, height: 250, fill: '#5B6673', style: vis(3.8, 8.8) }),
      h('g', { style: vis(3.8, 8.8) }, [[86,36,26,13],[116,28,30,16],[148,38,24,12],[246,32,28,14],[280,24,32,17],[314,34,24,12]].map(([cx, cy, rx, ry], n) => h('ellipse', { key: n, cx, cy, rx, ry, fill: n % 2 ? '#7F8A95' : '#97A1AB' }))),
      h('g', { style: vis(9, null) }, [0, 45, 90, 135, 180, 225, 270, 315].map(a => h('line', { key: a, x1: 345, y1: 42, x2: 345 + 32 * Math.cos(a * Math.PI / 180), y2: 42 + 32 * Math.sin(a * Math.PI / 180), stroke: '#FFC21A', strokeWidth: 4, strokeLinecap: 'round' })), h('circle', { cx: 345, cy: 42, r: 20, fill: '#FFC21A', stroke: '#F2A900', strokeWidth: 2 })),
      h('rect', { x: 0, y: 222, width: 400, height: 28, fill: '#8DB86A' }),
      h('g', { transform: 'translate(-39.6,22.2) scale(.9)' },
      h('rect', { x: 96, y: 132, width: 170, height: 90, fill: '#F4E7D3' }),
      h('rect', { x: 96, y: 210, width: 170, height: 12, fill: '#CDB79A' }),
      h('rect', { x: 212, y: 144, width: 34, height: 26, rx: 2, fill: '#BFE3F7', stroke: '#FFFFFF', strokeWidth: 3 }),
      h('g', null, h('rect', { x: 112, y: 182, width: 54, height: 16, rx: 5, fill: '#24596E' }), h('rect', { x: 108, y: 194, width: 62, height: 14, rx: 5, fill: '#1E4A5C' }), h('rect', { x: 120, y: 186, width: 12, height: 9, rx: 3, fill: '#DB011C' })),
      h('rect', { x: 96, y: 132, width: 170, height: 78, fill: '#9FD0FF', fillOpacity: .35, style: { animation: 'imp-in 1.2s ease 10.2s both' } }),
      thermo('ti', 256, 182, '#1E6FC2', -8, vis(10.4, null)),
      h('rect', { x: 90, y: 126, width: 6, height: 96, fill: '#D9D2C6' }),
      h('rect', { x: 266, y: 126, width: 6, height: 96, fill: '#D9D2C6' }),
      h('polygon', { points: '272,126 330,96 330,192 272,222', fill: '#E4DED3' }),
      h('polygon', { points: '290,140 314,128 314,150 290,162', fill: '#BFE3F7', stroke: '#FFFFFF', strokeWidth: 2 }),
      h('polygon', { points: '84,118 278,118 278,126 84,126', fill: '#C9C2B6' }),
      h('polygon', { points: '278,118 336,88 336,96 278,126', fill: '#BDB6AA' }),
      h('polygon', { points: '84,118 142,88 336,88 278,118', fill: '#FFFFFF', stroke: '#D9D9D2', strokeWidth: 1 }),
      h('g', { style: vis(4.3, 8.6) }, splash.map(([x, y], n) => h('ellipse', { key: n, className: 'isc-splash', cx: x, cy: y, rx: 5, ry: 2, fill: 'none', stroke: '#9CC7EE', strokeWidth: 1.4, style: { animation: 'isc-splash .7s ease-out ' + (n * .11).toFixed(2) + 's infinite' } })),
        [0, 1, 2].map(n => h('ellipse', { key: 'l' + n, cx: 85, cy: 126, rx: 1.8, ry: 3, fill: '#7FB5E8', style: { animation: 'isc-dripL .8s ease-in ' + (n * .27).toFixed(2) + 's infinite' } })),
        [0, 1, 2].map(n => h('ellipse', { key: 'r' + n, cx: 335, cy: 98, rx: 1.8, ry: 3, fill: '#7FB5E8', style: { animation: 'isc-dripR .9s ease-in ' + (n * .3).toFixed(2) + 's infinite' } }))),
      h('g', { style: vis(9.8, null) }, heat(118, 0), heat(200, .6), heat(262, 1.2))),
      h('g', { style: vis(3.4, null) },
        h('ellipse', { cx: 336, cy: 222.5, rx: 38, ry: 4.5, fill: '#000000', opacity: .22 }),
        h('image', { href: (this.props.cubetaSrc || '/aislamax-recorte.webp'), x: 290, y: 108, width: 92, height: 115, preserveAspectRatio: 'xMidYMax meet', style: { filter: 'brightness(1.05) saturate(1.1)' } })),
      h('g', { style: vis(4.3, 8.6) }, h('g', { style: { animation: 'isc-rain .45s linear infinite' } }, rain)),
      pill('pr', 200, 22, 236, 'Lluvia intensa · sin filtraciones ✓', '#FFFFFF', '#1E6FC2', vis(5, 8.8)),
      pill('pd', 94, 159, 108, '✓ Seco por dentro', '#1E6FC2', '#FFFFFF', vis(5.4, 8.8)),
      h('g', { style: vis(9.6, null) },
        [[185.4,112.2],[149.4,115.8],[113.4,115.8]].map(([x, y], n) => h('line', { key: 'i' + n, x1: 340, y1: 50, x2: x, y2: y, stroke: '#FFC21A', strokeWidth: 2, strokeDasharray: '5 5', opacity: .9 })),
        [[185.4,112.2,163.8,72.6],[149.4,115.8,127.8,76.2],[113.4,115.8,91.8,76.2]].map(([x, y, x2, y2], n) => h('g', { key: 'o' + n }, h('line', { x1: x, y1: y, x2, y2, stroke: '#FF9F1C', strokeWidth: 2.6, strokeLinecap: 'round' }), h('path', { d: 'M' + x2 + ' ' + y2 + ' l-2 9 l8 -3 Z', fill: '#FF9F1C' })))),
      thermo('to', 30, 76, '#E5321B', -22, vis(9.8, null)),
      pill('ps', 64, 30, 92, 'Techo al sol', '#E5321B', '#FFFFFF', vis(10, null)),
      pill('pf', 94, 159, 104, 'Más fresco adentro', '#1E6FC2', '#FFFFFF', vis(10.6, null)),
      pill('pa', 186, 40, 104, 'Refleja el sol', '#FFFFFF', '#C25E00', vis(10.2, null)));
  }
  impRoofEl() {
    const h = React.createElement, st = this.state.impStep, ph = this.state.impPh;
    const done = k => st > k || (st === k && ph === 1);
    const run = k => st === k && ph === 1;
    const tr = (p, d) => st < 0 ? 'none' : p + ' ' + d + 's ease-in-out';
    const S = { x: 14, y: 14, width: 372, height: 222, rx: 12 };
    const W = 74.4, RH = 44.4, cols = [0, 1, 2, 3, 4];
    const lines = (dir, c) => { const a = []; if (dir === 'h') for (let y = 30; y < 236; y += 18) a.push(h('line', { key: y, x1: 14, x2: 386, y1: y, y2: y, stroke: c, strokeWidth: 2, opacity: .5 })); else for (let x = 30; x < 386; x += 18) a.push(h('line', { key: x, x1: x, x2: x, y1: 14, y2: 236, stroke: c, strokeWidth: 2, opacity: .5 })); return a; };
    const crack = 'M80 52 L104 80 L94 108 L124 136 L114 164 L146 198';
    const patches = [[70,70,34,18,'#A89F92'],[180,120,46,22,'#B5735E'],[300,60,30,14,'#A89F92'],[120,190,38,16,'#B5735E'],[290,170,44,20,'#A89F92'],[350,120,20,12,'#B5735E'],[220,210,26,10,'#A89F92']];
    const dirt = [[60,180,6],[110,60,4],[170,150,7],[230,90,5],[280,190,6],[320,70,4],[200,205,4],[150,110,3],[260,140,3],[340,150,5],[90,140,3],[300,110,4]];
    const specks = [[40,40],[130,30],[210,60],[360,40],[50,110],[240,170],[330,215],[180,230],[370,120],[120,200]];
    const debris = cols.map(n => [0, 1, 2, 3, 4, 5, 6].map(m => [14 + n * W + 10 + ((m * 37 + n * 13) % 54), 26 + ((m * 71 + n * 29) % 200), 2 + (m % 3)]));
    const strip = (n, dir, c, op, dur, delay, key) => h('rect', Object.assign({ key, className: dir === 'v' ? 'imp-strip' : 'imp-stripx', fill: c, opacity: op, style: { animationDuration: dur + 's', animationDelay: delay + 's' } }, dir === 'v' ? { x: 14 + n * W - 1, y: 14, width: W + 2, height: 222 } : { x: 14, y: 14 + n * RH - 1, width: 372, height: RH + 2 }));
    const coat = (k, c, dir, lc) => {
      if (st > k) return h('g', { key: 'C' + k }, h('rect', Object.assign({ fill: c }, S)), lc ? lines(dir, lc) : null);
      if (!run(k)) return null;
      return h('g', { key: 'R' + k, clipPath: 'url(#imp-clip)' },
        cols.map(n => strip(n, dir, c, .55, .78, +(n * 1.96).toFixed(2), 'a' + n)),
        cols.map(n => strip(n, dir, c, 1, .69, +(n * 1.96 + 1.18).toFixed(2), 'b' + n)),
        h('rect', Object.assign({ key: 'solid', fill: c, style: { animation: 'imp-in .15s linear 9.75s both' } }, S)),
        lc ? h('g', { style: { animation: 'imp-in .5s ease 9.8s both' } }, lines(dir, lc)) : null);
    };
    const tool = null;
    let work = null;
    if (ph === 1 && st >= 0 && st <= 4) {
      const g = (k, kids, vis) => h('g', { key: k, 'data-k': k, opacity: vis ? 1 : 0 }, kids);
      const shapes = st === 0 ? [
          g('scrape', [h('rect', { key: 1, x: -5, y: -32, width: 10, height: 28, rx: 3, fill: '#C68B4E' }), h('rect', { key: 2, x: -30, y: -4, width: 60, height: 8, rx: 1, fill: '#B8BEC4', stroke: '#1A1A1A', strokeWidth: 1.5 })], true),
          g('sweep', [h('path', { key: 1, d: 'M0 -6 V-40', stroke: '#8A6A3A', strokeWidth: 5, strokeLinecap: 'round' }), h('rect', { key: 2, x: -33, y: -6, width: 66, height: 12, rx: 3, fill: '#C9A15E', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('rect', { key: 3, x: -33, y: 5, width: 66, height: 6, fill: '#E2C88E' })], false)]
        : st === 1 ? [g('crk', [h('rect', { key: 1, x: -3, y: -26, width: 6, height: 22, rx: 2, fill: '#C68B4E' }), h('rect', { key: 2, x: -12, y: -4, width: 24, height: 6, rx: 1, fill: '#B8BEC4', stroke: '#1A1A1A', strokeWidth: 1.5 })], true)]
        : st === 4 ? [g('rh', [h('path', { key: 1, d: 'M-7 0 H-52', stroke: '#8E959C', strokeWidth: 3.5, strokeLinecap: 'round' }), h('rect', { key: 2, x: -7, y: -20, width: 14, height: 40, rx: 7, fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 2 })], true)]
        : [g('rv', [h('path', { key: 1, d: 'M0 -7 V-52', stroke: '#8E959C', strokeWidth: 3.5, strokeLinecap: 'round' }), h('rect', { key: 2, x: -32, y: -7, width: 64, height: 14, rx: 7, fill: st === 2 ? '#CFE3F5' : '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 2 })], true)];
      work = h('g', { key: 'iw' + st, ref: this.impWorkRef, 'data-st': st },
        h('g', { 'data-k': 'tool' }, shapes),
        h('line', { 'data-k': 'armA', stroke: '#DB011C', strokeWidth: 5, strokeLinecap: 'round' }),
        h('line', { 'data-k': 'armB', stroke: '#DB011C', strokeWidth: 5, strokeLinecap: 'round' }),
        h('circle', { 'data-k': 'handA', r: 3.5, fill: '#A8704A' }),
        h('circle', { 'data-k': 'handB', r: 3.5, fill: '#A8704A' }),
        h('g', { 'data-k': 'person' },
          h('ellipse', { 'data-k': 'footA', cx: -6, cy: 0, rx: 3.5, ry: 5, fill: '#1F2A44' }),
          h('ellipse', { 'data-k': 'footB', cx: 6, cy: 0, rx: 3.5, ry: 5, fill: '#1F2A44' }),
          h('ellipse', { cx: 0, cy: 0, rx: 15, ry: 8.5, fill: '#DB011C' }),
          h('rect', { x: -4.5, y: 4, width: 9, height: 6, rx: 3, fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.2 }),
          h('circle', { cx: 0, cy: 0, r: 7.5, fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.2 })));
    }
    const svg = h('svg', { viewBox: '0 0 400 250', role: 'img', 'aria-label': 'Animación de los pasos para impermeabilizar un techo', className: done(5) ? 'imp-tilt' : undefined, style: { display: 'block', width: '100%', height: 'auto', borderRadius: '12px', background: '#EEF4FA' } },
      h('defs', null, h('clipPath', { id: 'imp-clip' }, h('rect', S))),
      h('rect', Object.assign({ fill: '#D6D1C9', stroke: '#B9B2A6', strokeWidth: 6 }, S)),
      specks.map(([x, y], n) => h('circle', { key: 's' + n, cx: x, cy: y, r: 2, fill: '#C2BBB0' })),
      st <= 0 ? h('g', { key: 'old' }, patches.map(([x, y, rx, ry, c], n) => h('ellipse', { key: 'p' + n, cx: x, cy: y, rx, ry, fill: c, opacity: .75 })), dirt.map(([x, y, rr], n) => h('ellipse', { key: 'd' + n, cx: x, cy: y, rx: rr * 1.4, ry: rr, fill: n % 3 ? '#8B6B4A' : '#A88B66', opacity: .85 }))) : null,
      run(0) ? h('g', { key: 'scr', clipPath: 'url(#imp-clip)' }, cols.map(n => strip(n, 'v', '#D6D1C9', 1, 1.07, +(n * 1.26).toFixed(2), 'sc' + n))) : null,
      run(0) ? h('g', { key: 'scs' }, specks.map(([x, y], n) => h('circle', { key: 'z' + n, cx: x, cy: y, r: 2, fill: '#C2BBB0', style: { animation: 'imp-in .3s ease ' + (Math.floor((x - 14) / W) * 1.26 + .84).toFixed(2) + 's both' } }))) : null,
      h('path', { d: crack, stroke: '#6E675D', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('path', { d: crack, stroke: '#ECE8E2', strokeWidth: 8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 220, style: { strokeDashoffset: done(1) ? 0 : 220, transition: st < 0 ? 'none' : 'stroke-dashoffset 2.5s linear' } }),
      run(0) ? h('g', { key: 'deb' }, debris.map((ps, n) => ps.map(([x, y, rr], m) => h('ellipse', { key: n + '-' + m, cx: x, cy: y, rx: rr * 1.5, ry: rr, fill: m % 2 ? '#8B6B4A' : '#9C9387', style: { animation: 'imp-in .3s ease ' + (n * 1.26 + .5).toFixed(2) + 's both, imp-out .35s ease ' + (6.72 + n * .84 + .35).toFixed(2) + 's forwards' } })))) : null,
      coat(2, '#CFE3F5', 'v', null),
      coat(3, '#F4F4F1', 'v', '#DCDCD6'),
      coat(4, '#FFFFFF', 'h', '#E6E6E1'),
      h('polygon', { points: '14,236 120,14 190,14 84,236', fill: '#DDEBF8', style: { opacity: done(5) ? .5 : 0, transition: tr('opacity', 1) } }),
      h('g', { style: { opacity: done(5) ? 1 : 0, transform: done(5) ? 'scale(1)' : 'scale(.4)', transformOrigin: '350px 50px', transition: tr('opacity .8s ease, transform', .9) } },
        [0, 45, 90, 135, 180, 225, 270, 315].map(a => h('line', { key: 'r' + a, x1: 350, y1: 50, x2: 350 + 28 * Math.cos(a * Math.PI / 180), y2: 50 + 28 * Math.sin(a * Math.PI / 180), stroke: '#FFC21A', strokeWidth: 4, strokeLinecap: 'round' })),
        h('circle', { cx: 350, cy: 50, r: 17, fill: '#FFC21A', stroke: '#F2A900', strokeWidth: 2 })),
      h('g', { style: { opacity: done(5) ? 1 : 0, transform: done(5) ? 'none' : 'translate(0px,12px)', transition: tr('opacity .8s ease .5s, transform', .8) } },
        h('rect', { x: 118, y: 192, width: 164, height: 32, rx: 16, fill: '#1E6FC2' }),
        h('text', { x: 200, y: 213, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓ Techo protegido')),
      tool, work);
    return h('div', { ref: this.impRoofRef, style: { position: 'relative', overflow: 'hidden', borderRadius: '12px', background: '#EEF4FA' } }, svg, done(5) ? this.impSceneEl() : null);
  }
  componentWillUnmount() {
    this.impClear(); if (this.impIO) this.impIO.disconnect(); cancelAnimationFrame(this.impRaf);
  }
  render() {
    const h = React.createElement, st = this.state.impStep, ph = this.state.impPh, cur = Math.max(0, st);
    const pct = (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / 6) * 100)) + '%';
    const mono = '500 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace';
    return h('section', { className: 'bfm-imp', style: { color: '#141414', background: '#F3F7FB', borderRadius: 24, padding: 'clamp(16px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 } },
      h('style', null, IMP_CSS),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px 24px' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('span', { style: { font: mono, fontSize: 12, letterSpacing: '.08em', color: '#1E6FC2' } }, 'PASO A PASO'),
          h('h3', { style: { margin: 0, fontWeight: 700, fontSize: 'clamp(22px, 2.6vw, 32px)', lineHeight: 1.1, letterSpacing: '-.02em' } }, this.props.titulo || 'Cómo impermeabilizar tu techo en 6 pasos.')),
        h('button', { type: 'button', onClick: () => this.impPlay(), style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #D4E3F2', borderRadius: 999, background: '#FFFFFF', color: '#141414', fontWeight: 600, fontSize: 13, lineHeight: 1, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer' } }, '↻ Ver de nuevo')),
      h('div', { className: 'bfm-imp-grid' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 18, background: '#FFFFFF' } },
          this.impRoofEl(),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 4px' } },
            h('span', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 } }, h('span', { style: { fontWeight: 600 } }, IMP_PASOS[cur][0]), h('span', { style: { color: '#5C5F63', whiteSpace: 'nowrap' } }, 'Paso ' + (cur + 1) + ' de 6')),
            h('span', { style: { display: 'block', height: 6, borderRadius: 999, background: '#E3ECF5', overflow: 'hidden' } }, h('span', { style: { display: 'block', height: '100%', width: pct, borderRadius: 999, background: '#1E6FC2', transition: 'width .6s ease' } })))),
        h('ol', { className: 'bfm-imp-steps' }, IMP_PASOS.map(([t, d], k) => {
          const isDone = st > k || (k === 5 && st === 5 && ph === 1), act = st === k && !isDone, on = act || isDone;
          return h('li', { key: k, style: { display: 'flex' } },
            h('button', { type: 'button', onClick: () => this.impGo(k), style: { flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, border: '1.5px solid ' + (act ? '#1E6FC2' : isDone ? '#FFFFFF' : 'transparent'), background: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', color: '#141414', font: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'background .3s, border-color .3s' } },
              h('span', { style: { flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', background: on ? '#1E6FC2' : '#E3ECF5', color: on ? '#FFFFFF' : '#1E6FC2', fontWeight: 700, fontSize: 14, transition: 'background .3s, color .3s' } }, String(k + 1)),
              h('span', { style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 } },
                h('span', { style: { font: mono, letterSpacing: '.08em', color: on ? '#1E6FC2' : '#5C5F63' } }, 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : '')),
                h('span', { style: { fontWeight: 600, fontSize: 16, lineHeight: 1.25 } }, t),
                h('span', { style: { fontSize: 13, lineHeight: 1.4, color: '#5C5F63' } }, d))));
        })))
    );
  }
}

export default PasosImpermeabilizar;
