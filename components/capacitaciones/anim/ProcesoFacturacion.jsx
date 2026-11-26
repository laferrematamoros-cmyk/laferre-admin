"use client";
import React from "react";

// Proceso de Facturacion — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "pf18-" para no chocar con otros componentes.

const ProcesoFacturacion_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@media (prefers-reduced-motion:reduce){.pf18-root svg *{animation:none !important}}";

const STEPS = [
  ['Confirma si ya ha facturado', 'Pregúntale al cliente si ya ha facturado antes con nosotros.'],
  ['Pide su nombre o razón social', 'Solicita el nombre o la razón social con el que ha facturado antes.'],
  ['Anota los datos en la bitácora', 'Anota los datos que se requieren en la bitácora de facturación.'],
  ['Explícale que hay que darlo de alta', 'Coméntale al cliente que se tiene que dar de alta en el sistema.'],
  ['Dale el ticket con los datos a llenar', 'Proporciónale al cliente el ticket con los datos que debe llenar.'],
  ['Si no tiene los datos: por WhatsApp', 'Si no conoce esos datos, pídele que los envíe por WhatsApp a más tardar a las 5:00 pm. Su factura se enviará a su correo electrónico.'],
  ['Sólo el mismo día de la compra', 'Menciónale que sólo se factura el mismo día de la compra, en el horario indicado. Pasado ese día no se podrá hacer la factura.']
];
const DUR = [5200, 5600, 6000, 5600, 5400, 7200, 6400];

class ProcesoFacturacion extends React.Component {
  state = { st: -1, t: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; cancelAnimationFrame(this.raf); this.raf = 0; }
  tick = () => {
    const t = (performance.now() - this.t0) / 1000;
    this.setState({ t });
    if (t < this.tMax) this.raf = requestAnimationFrame(this.tick); else this.raf = 0;
  };
  enter(k, at) {
    this.T.push(setTimeout(() => {
      cancelAnimationFrame(this.raf);
      this.t0 = performance.now(); this.tMax = DUR[k] / 1000 + .3;
      this.setState({ st: k, t: 0 });
      this.raf = requestAnimationFrame(this.tick);
    }, at));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: STEPS.length - 1, t: 99 }); return; }
    this.setState({ st: -1, t: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, k = Math.max(0, st), t = st < 0 ? 0 : this.state.t;
    const sans = 'Geist, sans-serif', RED = '#DB011C', OK = '#1E9E55', YEL = '#F2B705', SK = '#C68B5E', PANTS = '#2B3035', PINK = '#FDE7EA';
    const cl = (v, a, b) => Math.min(b, Math.max(a, v)), seg = (a, b) => cl((t - a) / (b - a), 0, 1);
    const ease = s => s < .5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2, lerp = (a, b, s) => a + (b - a) * s;
    const pop = on => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .4s ease, transform .4s cubic-bezier(.3,1.4,.5,1)' });
    const chip = (key, cx0, y, txt, bg, fg, on) => { const w = 18 + txt.length * 6.2; return h('g', { key, style: pop(on) }, h('rect', { x: cx0 - w / 2, y, width: w, height: 22, rx: 11, fill: bg }), h('text', { x: cx0, y: y + 15, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: sans }, txt)); };
    const bubble = (key, x, y, lines, tip, on, o) => {
      o = o || {}; const w = 22 + Math.max.apply(null, lines.map(l => l.length)) * 5.6, hh = 12 + lines.length * 13, bx = cl(x, 4, 396 - w), bd = o.bd || '#141414', tx = cl(tip[0], bx + 16, bx + w - 16);
      return h('g', { key, style: pop(on) },
        h('path', { d: 'M' + (tx - 7) + ' ' + (y + hh - 1) + ' L' + tip[0] + ' ' + tip[1] + ' L' + (tx + 7) + ' ' + (y + hh - 1) + ' Z', fill: '#FFFFFF', stroke: bd, strokeWidth: 1.5, strokeLinejoin: 'round' }),
        h('rect', { x: bx, y, width: w, height: hh, rx: 10, fill: '#FFFFFF', stroke: bd, strokeWidth: 1.5 }),
        h('rect', { x: tx - 6, y: y + hh - 3, width: 12, height: 4, fill: '#FFFFFF' }),
        lines.map((l, i) => h('text', { key: i, x: bx + w / 2, y: y + 18 + i * 13, textAnchor: 'middle', fontSize: 10.5, fontWeight: 600, fill: '#141414', fontFamily: sans }, l)));
    };
    const person = (key, o) => {
      const x = o.x, fy = 230, f = o.face || 1;
      const hip = [x, fy - 50], sh = [x + f, fy - 92], hd = [x + f * 2, fy - 106];
      const legs = [[[x - 2, fy - 25], [x - 5, fy - 2]], [[x + 2, fy - 25], [x + 5, fy - 2]]];
      const leg = (lg, i) => h('g', { key: 'l' + i }, h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + lg[0][0] + ' ' + lg[0][1] + ' L' + lg[1][0] + ' ' + lg[1][1], fill: 'none', stroke: o.pants || PANTS, strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d: 'M' + (lg[1][0] - f * 2) + ' ' + (lg[1][1] + 1) + ' h' + (f * 9), stroke: '#141414', strokeWidth: 5, strokeLinecap: 'round' }));
      const arm = (hp, i) => {
        const ax = sh[0], ay = sh[1] + 4, reach = 60; let dx = hp[0] - ax, dy = hp[1] - ay, L = Math.hypot(dx, dy) || 1;
        let hx = hp[0], hy = hp[1]; if (L > reach) { hx = ax + dx / L * reach; hy = ay + dy / L * reach; dx = hx - ax; dy = hy - ay; L = reach; }
        const b = Math.sqrt(Math.max(0, Math.pow(reach / 2, 2) - Math.pow(L / 2, 2)));
        let px = -dy / L, py = dx / L; if (py < 0) { px = -px; py = -py; }
        const ex = (ax + hx) / 2 + px * b, ey = (ay + hy) / 2 + py * b;
        return h('g', { key: 'a' + i }, h('path', { d: 'M' + ax + ' ' + ay + ' L' + ex + ' ' + ey, stroke: o.shirt, strokeWidth: 7, strokeLinecap: 'round' }), h('path', { d: 'M' + ex + ' ' + ey + ' L' + hx + ' ' + hy, stroke: SK, strokeWidth: 5.5, strokeLinecap: 'round' }), h('circle', { cx: hx, cy: hy, r: 3.8, fill: SK }));
      };
      const head = h('g', { key: 'hd' }, h('circle', { cx: hd[0], cy: hd[1], r: 10, fill: SK }),
        h('path', { d: 'M' + (hd[0] - 10.5) + ' ' + (hd[1] - 1) + ' A10.5 10.5 0 0 1 ' + (hd[0] + 10.5) + ' ' + (hd[1] - 1) + ' Z', fill: o.cap }),
        o.hair ? null : h('path', { d: 'M' + (hd[0] + f * 5) + ' ' + (hd[1] - 2) + ' h' + (f * 9), stroke: o.cap, strokeWidth: 3, strokeLinecap: 'round' }),
        h('circle', { cx: hd[0] + f * 5, cy: hd[1] + 2, r: 1.3, fill: '#141414' }));
      const body = h('g', { key: key + 'b' }, leg(legs[0], 0), arm(o.hands[1], 1), h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + sh[0] + ' ' + (sh[1] + 6), stroke: o.shirt, strokeWidth: 19, strokeLinecap: 'round' }), leg(legs[1], 1), head);
      return [body, h('g', { key: key + 'f' }, arm(o.hands[0], 0))];
    };
    const floor = h('line', { key: 'fl', x1: 0, y1: 230, x2: 400, y2: 230, stroke: '#EAD7C8', strokeWidth: 2 });
    const counter = h('g', { key: 'ct' }, h('rect', { x: 60, y: 176, width: 200, height: 57, fill: '#F3F4F5', stroke: '#B9C0C6', strokeWidth: 1.5 }), h('rect', { x: 54, y: 168, width: 212, height: 10, rx: 3, fill: '#D5DADF', stroke: '#9AA0A6', strokeWidth: 1.2 }));
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: proceso de facturación', style: { display: 'block', width: '100%', height: 'auto' } }, kids);
    const E_TIP = [118, 108], C_TIP = [308, 108];
    const scene = (eh, ch, back, front) => {
      const [eb, ef] = person('e', { x: 110, face: 1, shirt: RED, cap: PANTS, hands: eh || [[150, 172], [96, 186]] });
      const [cb, cf] = person('c', { x: 312, face: -1, shirt: '#1E6FC2', cap: '#3A2A22', hair: true, pants: '#4A5560', hands: ch || [[300, 188], [318, 188]] });
      return svg([floor, eb, counter].concat(back || [], [cb, cf, ef], front || []));
    };
    const card = (key, x, y, w, hh, on, kids) => h('g', { key, style: pop(on) }, h('rect', { x, y, width: w, height: hh, rx: 8, fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.5 }), kids);
    const label = (x, y, txt, c, sz, anchor) => h('text', { x, y, textAnchor: anchor || 'start', fontSize: sz || 9, fontWeight: 800, letterSpacing: '.06em', fill: c || RED, fontFamily: sans }, txt);
    const squig = (key, x, y, on, n) => { let d = 'M' + x + ' ' + y + ' q5 -4 10 0'; for (let i = 1; i < (n || 6); i++) d += ' t10 0'; return h('path', { key, d, fill: 'none', stroke: '#1E6FC2', strokeWidth: 1.4, pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: on ? 0 : 1, style: { transition: 'stroke-dashoffset .6s ease' } }); };

    if (k === 0) return scene(null, null, [], [
      bubble('e', 14, 30, ['¿Ya ha facturado antes', 'con nosotros?'], E_TIP, t > .4),
      bubble('c', 230, 62, ['Sí, ya he facturado.'], C_TIP, t > 1.8),
      chip('c1', 200, 236, '✓ Cliente con facturación previa', YEL, '#141414', t > 3)]);
    if (k === 1) return scene(null, null, [], [
      bubble('e', 14, 30, ['¿Con qué nombre o', 'razón social?'], E_TIP, t > .4),
      bubble('c', 220, 62, ['A nombre de mi empresa.'], C_TIP, t > 1.8),
      card('nm', 140, 116, 124, 40, t > 3, [label(150, 131, 'NOMBRE O RAZÓN SOCIAL', RED, 7.5), squig('s', 150, 146, t > 3.3, 9)]),
      chip('c1', 200, 236, '✓ Nombre o razón social', YEL, '#141414', t > 3.6)]);
    if (k === 2) {
      const writing = t > .6 && t < 4.4, wob = writing ? Math.sin(t * 22) * 4 : 0;
      return scene([[150 + wob, 164], [132, 168]], null, [h('rect', { key: 'pd', x: 140, y: 162, width: 36, height: 7, rx: 1.5, fill: '#FFFFFF', stroke: '#9AA0A6', strokeWidth: 1 })], [
        card('bk', 150, 10, 170, 104, true, [label(162, 27, 'BITÁCORA DE FACTURACIÓN'),
          h('text', { key: 'l1', x: 162, y: 46, fontSize: 9, fontWeight: 600, fill: '#5C5F63', fontFamily: sans }, 'Nombre o razón social'),
          squig('s1', 162, 58, t > .8, 13), squig('s2', 162, 74, t > 1.6, 11), squig('s3', 162, 90, t > 2.4, 13), squig('s4', 162, 106 - 4, t > 3.2, 8)]),
        chip('c1', 200, 236, '✓ Anota los datos en la bitácora', YEL, '#141414', t > 4)]);
    }
    if (k === 3) {
      const prog = seg(2.4, 4);
      const mon = h('g', { key: 'mon' }, h('rect', { x: 176, y: 124, width: 58, height: 38, rx: 3, fill: '#2B3035' }), h('rect', { x: 180, y: 128, width: 50, height: 28, fill: '#EAF2FB' }),
        h('rect', { x: 200, y: 162, width: 10, height: 6, fill: '#2B3035' }),
        h('text', { x: 205, y: 140, textAnchor: 'middle', fontSize: 7.5, fontWeight: 800, fill: '#1E6FC2', fontFamily: sans }, '+ ALTA'),
        h('rect', { x: 186, y: 146, width: 38, height: 4, rx: 2, fill: '#C9D6E3' }), h('rect', { x: 186, y: 146, width: 38 * prog, height: 4, rx: 2, fill: prog >= 1 ? OK : '#1E6FC2' }));
      return scene(null, null, [mon], [
        bubble('e', 14, 30, ['Primero hay que darlo', 'de alta en el sistema.'], E_TIP, t > .4),
        bubble('c', 250, 62, ['Claro.'], C_TIP, t > 2),
        chip('c1', 200, 236, 'Cliente sin facturación previa', RED, '#FFFFFF', t > .2),
        chip('c2', 300, 14, '✓ Alta en el sistema', OK, '#FFFFFF', t > 4.2)]);
    }
    if (k === 4) {
      const mv = ease(seg(1.2, 2.6)), tx = lerp(150, 276, mv), ty = lerp(140, 150, mv);
      const ticket = h('g', { key: 'tk', transform: 'translate(' + tx + ' ' + ty + ')' }, h('path', { d: 'M0 0 H28 V36 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3 Z', fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.3, strokeLinejoin: 'round' }),
        [8, 15, 22].map(y => h('g', { key: y }, h('rect', { x: 4, y: y - 4, width: 4, height: 4, fill: 'none', stroke: RED, strokeWidth: 1 }), h('line', { x1: 11, y1: y - 2, x2: 24, y2: y - 2, stroke: '#9AA0A6', strokeWidth: 1.2 }))));
      return scene(mv < 1 ? [[tx + 2, ty + 14], [96, 186]] : null, mv >= .9 ? [[tx + 6, ty + 18], [318, 188]] : null, [], [ticket,
        bubble('e', 14, 30, ['Aquí están los datos', 'que debe llenar.'], E_TIP, t > .3),
        chip('c1', 300, 14, '✓ Ticket con los datos', OK, '#FFFFFF', t > 3)]);
    }
    if (k === 5) {
      const ph = [288, 128], m1 = ease(seg(1.4, 2.8)), m2 = ease(seg(4.2, 5.6));
      const phone = h('rect', { key: 'ph', x: ph[0], y: ph[1], width: 12, height: 20, rx: 2.5, fill: '#141414' });
      const store = h('g', { key: 'st' }, h('rect', { x: 186, y: 146, width: 14, height: 22, rx: 3, fill: '#141414' }), h('rect', { x: 188, y: 149, width: 10, height: 15, fill: '#EAF2FB' }));
      const msg = h('g', { key: 'ms', transform: 'translate(' + lerp(250, 150, m1) + ' ' + lerp(100, 110, m1) + ')', style: { opacity: t > 1.2 && t < 3.4 ? 1 : 0, transition: 'opacity .3s' } },
        h('rect', { x: 0, y: 0, width: 104, height: 22, rx: 8, fill: '#25D366' }), h('text', { x: 52, y: 14.5, textAnchor: 'middle', fontSize: 9.5, fontWeight: 700, fill: '#FFFFFF', fontFamily: sans }, 'Datos de facturación'));
      const env = h('g', { key: 'en', transform: 'translate(' + lerp(150, 262, m2) + ' ' + lerp(110, 92, m2) + ')', style: { opacity: t > 4 && t < 6.4 ? 1 : 0, transition: 'opacity .3s' } },
        h('rect', { x: 0, y: 0, width: 34, height: 22, rx: 3, fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.4 }), h('path', { d: 'M0 0 L17 12 L34 0', fill: 'none', stroke: '#141414', strokeWidth: 1.4 }),
        h('text', { x: 17, y: 34, textAnchor: 'middle', fontSize: 8.5, fontWeight: 800, fill: '#141414', fontFamily: sans }, 'FACTURA'));
      return scene(null, [[ph[0] + 4, ph[1] + 12], [318, 188]], [store], [phone, msg, env,
        chip('c1', 200, 14, 'Por WhatsApp antes de las 5:00 pm', '#141414', '#FFFFFF', t > .4),
        chip('c2', 200, 236, '✓ La factura llega a su correo', OK, '#FFFFFF', t > 5.6)]);
    }
    const day = (key, x, top, big, ok, on) => card(key, x, 24, 78, 70, on, [h('rect', { x, y: 24, width: 78, height: 20, rx: 8, fill: ok ? OK : RED }), h('rect', { x, y: 36, width: 78, height: 8, fill: ok ? OK : RED }),
      label(x + 39, 38, top, '#FFFFFF', 9, 'middle'), h('text', { x: x + 39, y: 80, textAnchor: 'middle', fontSize: 26, fontWeight: 800, fill: ok ? OK : RED, fontFamily: sans }, big)]);
    return scene(null, null, [], [
      bubble('e', 14, 24, ['Sólo se factura el mismo', 'día de la compra.'], E_TIP, t > .4),
      day('d1', 190, 'HOY', '✓', true, t > 1.6), day('d2', 284, 'MAÑANA', '✗', false, t > 2.6),
      chip('c1', 200, 236, 'Pasado ese día no se puede facturar', RED, '#FFFFFF', t > 3.6)]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st);
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, past = a || k < st, A = k < 3, c = A ? '#F2B705' : '#DB011C';
        return { n: String(A ? k + 1 : k - 2), t, d, lbl: (A ? 'CON FACTURACIÓN PREVIA · ' : 'SIN FACTURACIÓN PREVIA · ') + (A ? k + 1 : k - 2), lc: A ? '#8A6A00' : '#DB011C',
          bd: a ? c : '#F2DCCB', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? c : '#F6E3D6', nfg: past ? (A ? '#141414' : '#FFFFFF') : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, ProcesoFacturacion_CSS), h("section", { ref: v.rootRef, className: "pf18-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FFF4EC", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · INSTRUCCIÓN DE TRABAJO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Proceso de facturación"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Qué hacer si el cliente ya ha facturado con nosotros y qué hacer si es su primera vez.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F2DCCB", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F6E3D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lc } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))))));
  }
}

export default ProcesoFacturacion;
