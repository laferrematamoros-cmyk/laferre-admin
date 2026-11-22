"use client";
import React from "react";

// Instalar Bomba — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Fotos en /public/bfm-assets/.
// Clases y animaciones con prefijo "ib13-" para no chocar con otros componentes.

const InstalarBomba_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes ib13-frg-flow{to{stroke-dashoffset:-24}}@keyframes ib13-el-spin{to{transform:rotate(360deg)}}@keyframes ib13-frg-pulse{0%{transform:scale(.4);opacity:0}25%{opacity:.9}100%{transform:scale(1.7);opacity:0}}.ib13-frg-pulse{transform-box:fill-box;transform-origin:center;animation:ib13-frg-pulse 1.1s ease-out 1.1s 2 both}@media (prefers-reduced-motion:reduce){.ib13-frg-pulse{animation:none;opacity:0}}";

const STEPS = [
  ['Llega el agua de la calle', 'El agua de la toma pasa por el filtro y llena la cisterna. El flotante cierra la entrada cuando se llena.'],
  ['Mete la succión con pichancha', 'En la punta del tubo, dentro de la cisterna, va la pichancha. Así el tubo no se vacía, la bomba no pierde el agua y su coladera detiene la basura.'],
  ['Fija la bomba', 'Colócala cerca de la cisterna, sobre una base firme y nivelada.'],
  ['Conecta la succión y la descarga', 'La succión va de la cisterna a la entrada de la bomba. La descarga sube al tinaco de la azotea. Usa cinta teflón en las roscas.'],
  ['Instala el control de nivel', 'Va en el tinaco de la azotea: prende la bomba cuando baja el agua y la apaga cuando se llena.'],
  ['Ceba la bomba', 'Antes de conectarla, llénala de agua junto con el tubo de succión para que no trabaje en seco.'],
  ['Así funciona', 'La bomba llena el tinaco y se apaga sola. La cisterna se vuelve a llenar con agua de la calle. Cuando usas agua, baja el tinaco y el ciclo se repite.']
];
const PRODS = [[], [], [{ name: 'Bomba periférica ½ HP, Truper', code: '12111', href: 'https://bfmpedidosv-2.vercel.app/cotizar?f=25&ver=12111T', img: '/bfm-assets/bomba/12111T.png', slot: 'bomba-12111' }], [], [], [], []];
const DUR = [4400, 4200, 3200, 4600, 4600, 4200, 7000];
const PX = [236, 244, 240, 240, 150, 236, 356], PY = [170, 170, 170, 170, 78, 170, 170];
const HAND = [null, [284, 176], [214, 154], [226, 162], [124, 40], [212, 138], null];

class InstalarBomba extends React.Component {
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
    if (k === 0) this.T.push(setTimeout(() => this.setState({ ph: 2 }), t + 2900));
    if (k === 6) this.T.push(setTimeout(() => this.cyc(), t + 90));
  }
  cyc() {
    this.setState({ ph: 1 });
    [[4200, 2], [5800, 3], [8800, 4]].forEach(([d, p]) => this.T.push(setTimeout(() => this.setState({ ph: p }), d)));
    this.T.push(setTimeout(() => this.cyc(), 12600));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: 6, ph: 1 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = this.state.ph;
    const B = '#1E6FC2', G = '#7E868D', PIPE = '#D9C08A', PIPED = '#B39A62', brass = '#C8A04A', brassD = '#8A6A2A';
    const live = st >= 0;
    const done = k => st > k || (st === k && ph >= 1);
    const vis = (on, d, dl) => ({ opacity: on ? 1 : 0, transition: live ? 'opacity ' + (d || .5) + 's ease ' + (dl || 0) + 's' : 'none' });
    const draw = (k, key, d, L, w, dl) => h('path', { key, d, fill: 'none', stroke: PIPE, strokeWidth: w || 5, strokeLinejoin: 'round', strokeDasharray: L, style: { strokeDashoffset: done(k) ? 0 : L, transition: live ? 'stroke-dashoffset 1.6s ease-in-out ' + (dl || 0) + 's' : 'none' } });
    const flow = (on, key, d, sp, dl) => h('path', { key, d, fill: 'none', stroke: '#5AA9E6', strokeWidth: 2.2, strokeLinecap: 'round', strokeDasharray: '4 8', style: Object.assign({ animation: 'ib13-frg-flow ' + (sp || .6) + 's linear infinite' }, vis(on, .4, dl)) });
    const part = (k, key, tgt, kids, delay) => { const hd = HAND[k] || tgt; return h('g', { key, style: { opacity: st >= k ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center', transform: done(k) ? 'none' : 'translate(' + (hd[0] - tgt[0]) + 'px,' + (hd[1] - tgt[1]) + 'px) scale(.7)', transition: live ? 'transform 1.3s cubic-bezier(.3,.7,.3,1) ' + (delay || 0) + 's, opacity .3s' : 'none' } }, kids); };
    const lbl = (x, y, t, anchor) => h('text', { key: 'l' + t, x, y, textAnchor: anchor || 'start', fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', fill: '#5C5F63', fontFamily: 'Geist Mono, monospace' }, t);

    const running = st === 6 && ph === 1;
    const cis = st < 0 || (st === 0 && ph === 0) ? .15 : st === 6 && (ph === 1 || ph === 2) ? .45 : .85;
    const tank = st === 6 ? (ph === 0 ? .12 : ph === 4 ? .35 : .9) : .12;

    const ground = [
      h('rect', { key: 'soil', x: 0, y: 172, width: 400, height: 88, fill: '#E6D3AE' }),
      h('rect', { key: 'grass', x: 0, y: 166, width: 400, height: 7, fill: '#5FB360' })];

    const house = h('g', { key: 'house' },
      h('rect', { x: 24, y: 84, width: 120, height: 86, fill: '#F4E3C3', stroke: '#B9A27A', strokeWidth: 1.5 }),
      h('rect', { x: 18, y: 78, width: 132, height: 8, fill: '#B9A27A' }),
      h('rect', { x: 74, y: 134, width: 18, height: 36, fill: '#8A5A3A' }),
      h('rect', { x: 32, y: 104, width: 30, height: 22, fill: '#CFE6F5', stroke: '#B9A27A', strokeWidth: 1.2 }),
      h('rect', { x: 104, y: 104, width: 30, height: 22, fill: '#CFE6F5', stroke: '#B9A27A', strokeWidth: 1.2 }),
      h('path', { d: 'M98 78 V94 H48 V108', fill: 'none', stroke: PIPE, strokeWidth: 3, strokeLinejoin: 'round' }),
      h('path', { d: 'M44 108 H52 V112', fill: 'none', stroke: G, strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('path', { d: 'M40 124 H60', stroke: G, strokeWidth: 2.5, strokeLinecap: 'round' }),
      flow(st === 6 && ph === 4, 'grav', 'M98 80 V94 H48 V108', .8, .6),
      h('path', { d: 'M52 113 V123', stroke: '#5AA9E6', strokeWidth: 2, strokeDasharray: '3 3', style: Object.assign({ animation: 'ib13-frg-flow .5s linear infinite' }, vis(st === 6 && ph === 4, .4, .8)) }));

    const tinaco = h('g', { key: 'tin' },
      h('rect', { x: 84, y: 44, width: 40, height: 34, rx: 6, fill: '#E8F2F9', stroke: '#7FA9C9', strokeWidth: 1.5 }),
      h('rect', { x: 86, y: 46, width: 36, height: 30, rx: 4, fill: '#5AA9E6', style: { opacity: .75, transformBox: 'fill-box', transformOrigin: 'center bottom', transform: 'scaleY(' + tank + ')', transition: live ? 'transform 3.4s ease-in-out' : 'none' } }),
      h('rect', { x: 88, y: 38, width: 32, height: 7, rx: 3, fill: '#2B2F33' }),
      lbl(80, 62, 'TINACO', 'end'));

    const ctrl = part(4, 'ctrl', [120, 38], [
      h('rect', { key: 'b', x: 115, y: 33, width: 10, height: 9, rx: 1.5, fill: '#F2F2EF', stroke: G, strokeWidth: 1.2 }),
      h('circle', { key: 'led', cx: 120, cy: 37.5, r: 1.8, style: { fill: running ? '#3FD07A' : (done(4) ? '#DB011C' : '#C9CED3'), transition: 'fill .3s' } }),
      h('path', { key: 'w', d: 'M118 42 V' + (76 - tank * 30).toFixed(1), stroke: G, strokeWidth: .8, style: { transition: 'all 3.4s' } }),
      h('circle', { key: 'f', cx: 118, cy: 76 - tank * 30, r: 3, fill: '#FFD23F', stroke: brassD, strokeWidth: .8 })]);

    const cisterna = h('g', { key: 'cis' },
      h('rect', { x: 250, y: 176, width: 90, height: 78, rx: 3, fill: '#B9BFC6' }),
      h('rect', { x: 256, y: 180, width: 78, height: 68, fill: '#F2F6F9' }),
      h('rect', { x: 256, y: 180, width: 78, height: 68, fill: '#5AA9E6', style: { opacity: .7, transformBox: 'fill-box', transformOrigin: 'center bottom', transform: 'scaleY(' + cis + ')', transition: live ? 'transform 2.6s ease-in-out' : 'none' } }),
      h('rect', { x: 270, y: 168, width: 32, height: 8, fill: '#8A9096' }),
      h('path', { d: 'M400 190 H334', stroke: PIPE, strokeWidth: 5 }),
      flow((st === 0 && ph === 1) || (st === 6 && ph === 3), 'entry', 'M400 190 H336', .5),
      h('rect', { x: 354, y: 178, width: 12, height: 24, rx: 3, fill: '#3A7FD0', stroke: '#1F4E86', strokeWidth: 1 }),
      h('rect', { x: 356, y: 182, width: 8, height: 16, rx: 1.5, fill: '#FFFFFF', opacity: .6 }),
      lbl(360, 212, 'FILTRO', 'middle'),
      h('g', { style: { transformBox: 'view-box', transformOrigin: '332px 190px', transform: 'rotate(' + (cis > .5 ? 0 : -60) + 'deg)', transition: live ? 'transform 2.6s ease-in-out' : 'none' } },
        h('path', { d: 'M332 190 H314', stroke: G, strokeWidth: 1.5 }),
        h('circle', { cx: 312, cy: 190, r: 5, fill: '#2B2F33' })),
      lbl(398, 184, 'CALLE', 'end'),
      lbl(246, 214, 'CISTERNA', 'end'));

    const suctV = h('g', { key: 'sv' },
      draw(1, 'svp', 'M286 176 V232', 60, 5, .3),
      h('g', { style: vis(done(1), .4, 1.6) }, h('rect', { x: 281.5, y: 230, width: 9, height: 5, rx: 1, fill: brass, stroke: brassD, strokeWidth: 1 }), h('rect', { x: 280, y: 234.5, width: 12, height: 10, rx: 2, fill: '#D5DADF', stroke: '#7E868D', strokeWidth: 1 }), h('path', { d: 'M283 236.5 V242.5 M286 236.5 V242.5 M289 236.5 V242.5', stroke: '#7E868D', strokeWidth: 1 }), h('path', { d: 'M249 237 H279', stroke: G, strokeWidth: .8, strokeDasharray: '2 2' }), lbl(246, 239.5, 'PICHANCHA', 'end')));

    const pump = part(2, 'pump', [196, 158], [
      h('rect', { key: 'ba', x: 174, y: 166, width: 46, height: 4, rx: 1, fill: '#1A1D21' }),
      h('rect', { key: 'm', x: 176, y: 148, width: 24, height: 18, rx: 5, fill: '#3A4148' }),
      h('path', { key: 'fi', d: 'M181 150 V164 M186 150 V164 M191 150 V164', stroke: '#1A1D21', strokeWidth: 1.2 }),
      h('rect', { key: 'tb', x: 182, y: 143, width: 12, height: 6, rx: 1, fill: '#0E0F10' }),
      h('circle', { key: 'hd', cx: 208, cy: 158, r: 10, fill: '#4A525A', stroke: '#1A1D21', strokeWidth: 1.5 }),
      h('g', { key: 'imp', style: { transformBox: 'fill-box', transformOrigin: 'center', animation: running ? 'ib13-el-spin .4s linear infinite' : 'none' } }, h('path', { d: 'M202 158 H214 M208 152 V164', stroke: '#C9CED3', strokeWidth: 1.6, strokeLinecap: 'round' })),
      h('rect', { key: 'o', x: 205, y: 144, width: 6, height: 5, fill: brass }),
      h('rect', { key: 'i', x: 217, y: 155, width: 5, height: 6, fill: brass })]);

    const disch = 'M208 144 V30 H118 V33';
    const lines = h('g', { key: 'lines' },
      draw(3, 'sh', 'M222 158 H286 V176', 90, 5, .2),
      draw(3, 'dc', disch, 230, 5, .6),
            flow(running, 'fs', 'M286 238 V176 V158 H224', .5),
      flow(running, 'fd', disch, .5),
      h('path', { d: 'M126 38 H166 V152 H176', fill: 'none', stroke: '#DB011C', strokeWidth: 1.2, strokeDasharray: 190, style: { strokeDashoffset: done(4) ? 0 : 190, transition: live ? 'stroke-dashoffset 1.6s ease-in-out .8s' : 'none' } }),
      h('g', { style: vis(done(4), .4, .4) }, lbl(80, 42, 'CONTROL DE NIVEL', 'end')));

    const prime = h('g', { key: 'prime', style: vis(st === 5 && ph === 1, .3) },
      h('rect', { x: 206, y: 124, width: 13, height: 13, rx: 2, fill: '#DDEFF8', stroke: G, strokeWidth: 1.2 }),
      h('rect', { x: 207.5, y: 129, width: 10, height: 6.5, fill: '#5AA9E6' }),
      h('path', { d: 'M208 137 V144', stroke: '#5AA9E6', strokeWidth: 2.2, strokeDasharray: '3 3', style: { animation: 'ib13-frg-flow .4s linear infinite' } }),
      lbl(212.5, 119, 'CEBAR', 'middle'));

    const k0 = Math.max(0, st), kneel = st >= 0 && (k0 === 1 || k0 === 3 || k0 === 5);
    const tx = PX[k0] - 67.2, ty = PY[k0] - 147.6;
    const hg = st >= 0 && ph >= 1 ? HAND[k0] : null;
    const loc = p => [(p[0] - tx) / .6, (p[1] - ty) / .6];
    const sh = hg ? loc(hg) : [124, 196], kh = hg ? loc(hg) : [170, 200];
    const person = h('g', { key: 'person', style: { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.6)', transition: live ? 'transform 1s ease' : 'none' } },
      h('g', { style: { opacity: kneel ? 0 : 1, transition: 'opacity .4s ease' } },
        h('path', { d: 'M106 246 L110 200 M118 246 L114 200', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round' }),
        h('path', { d: 'M112 200 L112 152', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M117 154 L' + sh[0].toFixed(1) + ' ' + sh[1].toFixed(1), stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: sh[0], cy: sh[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 112, cy: 133, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M100 132 A12 12 0 0 1 124 132 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M123 132 H132', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })),
      h('g', { style: { opacity: kneel ? 1 : 0, transition: 'opacity .4s ease' } },
        h('path', { d: 'M96 244 L128 244 L118 212', stroke: '#1F2A44', strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }),
        h('path', { d: 'M118 212 L136 182', stroke: '#DB011C', strokeWidth: 20, strokeLinecap: 'round' }),
        h('path', { d: 'M140 184 L' + kh[0].toFixed(1) + ' ' + kh[1].toFixed(1), stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { cx: kh[0], cy: kh[1], r: 4, fill: '#A8704A' }),
        h('circle', { cx: 144, cy: 166, r: 11, fill: '#A8704A' }),
        h('path', { d: 'M132 165 A12 12 0 0 1 156 165 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }), h('path', { d: 'M155 165 H164', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })));

    const chip = (on, w, fill, txt, key) => h('g', { key, style: vis(on, .4, .3) }, h('rect', { x: 390 - w, y: 8, width: w, height: 24, rx: 12, fill }), h('text', { x: 390 - w / 2, y: 24, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, txt));
    const PT = [[360, 190], [286, 236], [196, 158], [222, 158], [120, 38], [208, 146], [104, 60]];
    return h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: cómo se instala y funciona una bomba de agua con cisterna y tinaco', style: { display: 'block', width: '100%', height: 'auto', borderRadius: 12, background: '#EEF5FA' } },
      ground, cisterna, suctV, house, tinaco, lines, pump, ctrl, prime,
      h('g', { key: 'lbb', style: vis(done(2), .4, 1) }, lbl(196, 184, 'BOMBA', 'middle')),
      person,
      chip(st === 0 && ph === 2, 170, B, 'El flotante cierra la entrada', 'c0'),
      chip(st === 5 && ph === 1, 196, B, 'Cebando: llena la bomba de agua', 'c5'),
      chip(running, 176, B, 'La bomba sube el agua al tinaco', 'c6a'),
      chip(st === 6 && ph === 2, 190, '#1E9E55', '✓ Tinaco lleno: se apaga sola', 'c6b'),
      chip(st === 6 && ph === 3, 184, B, 'La cisterna se vuelve a llenar', 'c6c'),
      chip(st === 6 && ph === 4, 196, B, 'Usas agua: baja el tinaco', 'c6d'),
      st >= 0 && ph === 1 && st < 6 ? h('circle', { key: 'p' + st, className: 'ib13-frg-pulse', cx: PT[st][0], cy: PT[st][1], r: 12, fill: 'none', stroke: B, strokeWidth: 2.5 }) : null);
  }
  renderVals() {
    const st = this.state.st, ph = this.state.ph, cur = Math.max(0, st), N = STEPS.length;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(N),
      pct: (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / N) * 100)) + '%',
      steps: STEPS.map(([t, d], k) => {
        const isDone = st > k || (k === N - 1 && st === N - 1 && ph >= 2), act = st === k && !isDone, on = act || isDone;
        return { t, d, prods: PRODS[k], hasProds: PRODS[k].length > 0, n: String(k + 1), go: () => this.go(k), lbl: 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : ''), lblC: on ? '#1E6FC2' : '#5C5F63', bg: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', bd: act ? '#1E6FC2' : (isDone ? '#FFFFFF' : 'transparent'), nbg: on ? '#1E6FC2' : '#E3ECF5', nfg: on ? '#FFFFFF' : '#1E6FC2' };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, InstalarBomba_CSS), h("section", { ref: v.rootRef, style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F7FB", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#1E6FC2" } }, "PASO A PASO · BOMBAS"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Así se instala y funciona tu bomba Truper de ½ HP.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #D4E3F2", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3ECF5", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#1E6FC2", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 14px 10px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))), (s?.hasProds ? h(React.Fragment, null, h("div", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } }, (s?.prods || []).map((p, $index) => h(React.Fragment, { key: $index }, h("a", { href: p?.href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px 6px 6px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E7ECF2", textDecoration: "none", color: "#141414" } }, h("span", { style: { flex: "none", width: "76px", height: "76px", borderRadius: "10px", overflow: "hidden", background: "#F6F6F4", color: "#8A8D91" } }, (p?.img ? h("img", { src: p?.img, alt: "Foto", style: Object.assign({ width: "76px", height: "76px" }, { objectFit: "contain", display: 'block' }) }) : h("div", { style: Object.assign({ width: "76px", height: "76px" }, { background: '#F3F3F1' }) }))), h("span", { style: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" } }, h("span", { style: { fontWeight: "600", fontSize: "13px", lineHeight: "1.25" } }, p?.name), h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", color: "#5C5F63" } }, p?.code), h("span", { style: { fontWeight: "600", fontSize: "12px", color: "#DB011C" } }, "Cotizar →"))))))) : null)))))), h("div", { style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "18px", background: "#FFFFFF" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#E3ECF5", color: "#1E6FC2", fontWeight: "700" } }, "i"), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px" } }, h("span", { style: { fontWeight: "600" } }, "También con tinaco sobre el suelo"), h("span", { style: { fontSize: "14px", color: "#5C5F63", textWrap: "pretty" } }, "Si tu reserva es un tinaco en el piso en lugar de cisterna, la bomba succiona de ese tinaco. El resto de la instalación es igual.")))));
  }
}

export default InstalarBomba;
