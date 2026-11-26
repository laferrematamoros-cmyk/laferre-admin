"use client";
import React from "react";

// Recepcion de Llamadas — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "rl17-" para no chocar con otros componentes.

const RecepcionLlamadas_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@media (prefers-reduced-motion:reduce){.rl17-root svg *{animation:none !important}}";

const STEPS = [
  ['Contesta con un saludo breve', '"Ferretería, buenos días" o "buenas tardes", "¿en qué le puedo ayudar?". No des información de personas ni datos internos.'],
  ['Sólo cotizaciones, precios y ubicación', 'Por teléfono sólo puedes dar cotizaciones, precios y la ubicación de la tienda.'],
  ['Nunca des información sensible', 'No des teléfonos internos de personas, números de tarjeta, contraseñas, montos en caja, etc. Si la persona insiste, cambia de tema con educación o corta la llamada.'],
  ['Señales de estafa o extorsión', '"Su familiar está en riesgo, necesito que coopere". Te piden verificar tu información con un número que te dan. Preguntan datos personales (nombre completo, dirección, número de cuenta, cumpleaños). Piden hablar con el encargado. Dicen que llegarán documentos por DHL o paquetería (licencia de funcionamiento, factura de COEPRIS) y te piden anotar folios.'],
  ['Durante una llamada sospechosa', 'Mantén la calma, no discutas ni confrontes. No confirmes nada con "sí" o "sí, señor": pueden grabarlo y usarlo para clonar tu voz o autorizar operaciones. Si hay amenazas o presión, no negocies: discúlpate con educación y cuelga.'],
  ['Después de la llamada', 'Anota en la bitácora la fecha, la hora, el número que llamó, lo que dijo y quién atendió. Comparte el número con el equipo para que no lo contesten y repórtalo con tu superior.']
];
const DUR = [6000, 6000, 6600, 8200, 7200, 7600];

class RecepcionLlamadas extends React.Component {
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
    const sans = 'Geist, sans-serif', RED = '#DB011C', OK = '#1E9E55', SK = '#C68B5E', PANTS = '#2B3035', PINK = '#FDE7EA';
    const cl = (v, a, b) => Math.min(b, Math.max(a, v));
    const pop = on => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .4s ease, transform .4s cubic-bezier(.3,1.4,.5,1)' });
    const chip = (key, cx0, y, txt, bg, fg, on) => { const w = 18 + txt.length * 6.2; return h('g', { key, style: pop(on) }, h('rect', { x: cx0 - w / 2, y, width: w, height: 22, rx: 11, fill: bg }), h('text', { x: cx0, y: y + 15, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: fg, fontFamily: sans }, txt)); };
    const bubble = (key, x, y, lines, tip, on, o) => {
      o = o || {}; const w = 22 + Math.max.apply(null, lines.map(l => l.length)) * 5.6, hh = 12 + lines.length * 13, bx = cl(x, 4, 396 - w), bd = o.bd || '#141414', tx = cl(tip[0], bx + 16, bx + w - 16);
      return h('g', { key, style: pop(on) },
        h('path', { d: 'M' + (tx - 7) + ' ' + (y + hh - 1) + ' L' + tip[0] + ' ' + tip[1] + ' L' + (tx + 7) + ' ' + (y + hh - 1) + ' Z', fill: '#FFFFFF', stroke: bd, strokeWidth: 1.5, strokeLinejoin: 'round' }),
        h('rect', { x: bx, y, width: w, height: hh, rx: 10, fill: '#FFFFFF', stroke: bd, strokeWidth: 1.5 }),
        h('rect', { x: tx - 6, y: y + hh - 3, width: 12, height: 4, fill: '#FFFFFF' }),
        lines.map((l, i) => h('text', { key: i, x: bx + w / 2, y: y + 18 + i * 13, textAnchor: 'middle', fontSize: 10.5, fontWeight: 600, fill: o.fg || '#141414', fontFamily: sans }, l)));
    };
    const person = (key, o) => {
      const x = o.x, fy = 230, f = o.face || 1;
      const hip = [x, fy - 50], sh = [x + f, fy - 92], hd = [x + f * 2, fy - 106];
      const legs = [[[x - 2, fy - 25], [x - 5, fy - 2]], [[x + 2, fy - 25], [x + 5, fy - 2]]];
      const leg = (lg, i) => h('g', { key: 'l' + i }, h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + lg[0][0] + ' ' + lg[0][1] + ' L' + lg[1][0] + ' ' + lg[1][1], fill: 'none', stroke: PANTS, strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('path', { d: 'M' + (lg[1][0] - f * 2) + ' ' + (lg[1][1] + 1) + ' h' + (f * 9), stroke: '#141414', strokeWidth: 5, strokeLinecap: 'round' }));
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
        h('path', { d: 'M' + (hd[0] + f * 5) + ' ' + (hd[1] - 2) + ' h' + (f * 9), stroke: o.cap, strokeWidth: 3, strokeLinecap: 'round' }),
        h('circle', { cx: hd[0] + f * 5, cy: hd[1] + 2, r: 1.3, fill: '#141414' }));
      const body = h('g', { key: key + 'b' }, leg(legs[0], 0), arm(o.hands[1], 1), h('path', { d: 'M' + hip[0] + ' ' + hip[1] + ' L' + sh[0] + ' ' + (sh[1] + 6), stroke: o.shirt, strokeWidth: 19, strokeLinecap: 'round' }), leg(legs[1], 1), head);
      return [body, h('g', { key: key + 'f' }, arm(o.hands[0], 0))];
    };
    const P1 = { shirt: RED, cap: PANTS }, EX = 110, EAR = [EX + 10, 124];
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: protocolo de recepción de llamadas', style: { display: 'block', width: '100%', height: 'auto' } }, kids);
    const floor = h('line', { key: 'fl', x1: 0, y1: 230, x2: 400, y2: 230, stroke: '#EAD7C8', strokeWidth: 2 });
    const counter = h('g', { key: 'ct' }, h('rect', { x: 60, y: 176, width: 200, height: 57, fill: '#F3F4F5', stroke: '#B9C0C6', strokeWidth: 1.5 }), h('rect', { x: 54, y: 168, width: 212, height: 10, rx: 3, fill: '#D5DADF', stroke: '#9AA0A6', strokeWidth: 1.2 }));
    const base = h('rect', { key: 'pb', x: 160, y: 160, width: 28, height: 9, rx: 3, fill: '#2B3035' });
    const cradle = on => h('rect', { key: 'pc', x: 157, y: 153, width: 34, height: 8, rx: 4, fill: '#141414', style: { opacity: on ? 1 : 0 } });
    const inHand = h('rect', { key: 'ih', x: EAR[0] - 4, y: EAR[1] - 12, width: 8, height: 22, rx: 3, fill: '#141414' });
    const caller = (sus, ended) => h('g', { key: 'cal', style: { opacity: ended ? .35 : 1, transition: 'opacity .5s' } },
      h('circle', { cx: 350, cy: 196, r: 26, fill: sus ? PINK : '#F1F2F3', stroke: sus ? RED : '#B9C0C6', strokeWidth: 2 }),
      h('path', { d: 'M339 186 Q334 202 350 208 Q359 211 362 205', fill: 'none', stroke: sus ? RED : '#2B3035', strokeWidth: 6, strokeLinecap: 'round' }),
      sus ? h('text', { x: 372, y: 178, textAnchor: 'middle', fontSize: 14, fontWeight: 800, fill: RED, fontFamily: sans }, '?') : null,
      ended ? h('path', { d: 'M330 176 L370 216', stroke: RED, strokeWidth: 3, strokeLinecap: 'round' }) : null);
    const CT = [338, 172];
    const scene = (onPhone, kids, sus, ended, extraHands) => {
      const [pb, pf] = person('p', Object.assign({ x: EX, face: 1, hands: extraHands || (onPhone ? [EAR, [140, 182]] : [[150, 172], [96, 186]]) }, P1));
      return svg([floor, pb, counter, base, cradle(!onPhone), caller(sus, ended), pf, onPhone ? inHand : null].concat(kids));
    };

    if (k === 0) {
      const ring = t < 1.2, up = t >= 1.2;
      const waves = ring ? h('g', { key: 'rg', fill: 'none', stroke: RED, strokeWidth: 2, strokeLinecap: 'round', opacity: .5 + .5 * Math.sin(t * 18) }, h('path', { d: 'M150 150 q-6 8 0 16' }), h('path', { d: 'M198 150 q6 8 0 16' }), h('path', { d: 'M143 146 q-9 12 0 24' }), h('path', { d: 'M205 146 q9 12 0 24' })) : null;
      return scene(up, [waves,
        bubble('e1', 14, 30, ['Ferretería, buenas tardes.', '¿En qué le puedo ayudar?'], [118, 108], t > 1.7),
        chip('c1', 300, 40, '✓ Saludo breve', OK, '#FFFFFF', t > 2.6),
        chip('c2', 200, 236, '✗ No des datos de personas ni internos', PINK, RED, t > 3.6)]);
    }
    if (k === 1) return scene(true, [
      bubble('q', 190, 120, ['¿Cuánto cuesta el tubo de ½"?'], CT, t > .4),
      bubble('e', 14, 40, ['Con gusto, le paso el precio.'], [118, 108], t > 1.6),
      chip('c1', 300, 14, '✓ Cotizaciones', OK, '#FFFFFF', t > 2.8),
      chip('c2', 300, 42, '✓ Precios', OK, '#FFFFFF', t > 3.2),
      chip('c3', 300, 70, '✓ Ubicación de la tienda', OK, '#FFFFFF', t > 3.6)]);
    if (k === 2) return scene(true, [
      bubble('q', 180, 132, ['¿Me pasa el celular del encargado?'], CT, t > .4),
      bubble('e', 14, 30, ['Eso no lo puedo dar.', '¿Le ayudo con otra cosa?'], [118, 108], t > 1.8),
      chip('c1', 300, 10, '✗ Teléfonos internos', PINK, RED, t > 3),
      chip('c2', 300, 36, '✗ Números de tarjeta', PINK, RED, t > 3.3),
      chip('c3', 300, 62, '✗ Contraseñas', PINK, RED, t > 3.6),
      chip('c4', 300, 88, '✗ Dinero en caja', PINK, RED, t > 3.9)]);
    if (k === 3) {
      const AL = [['"Su familiar está en riesgo,', 'necesito que coopere."'], ['"Verifique su información', 'con este número."'], ['"¿Me confirma su nombre', 'completo y su dirección?"'], ['"Páseme con el encargado."'], ['"Le llegará un paquete por DHL.', 'Anote este folio."']];
      const i = cl(Math.floor((t - .3) / 1.4), 0, 4), pulse = .75 + .25 * Math.sin(t * 7);
      const tri = h('g', { key: 'tri', opacity: pulse }, h('polygon', { points: '50,14 82,68 18,68', fill: '#FFC21A', stroke: '#141414', strokeWidth: 2.5, strokeLinejoin: 'round' }), h('text', { x: 50, y: 62, textAnchor: 'middle', fontSize: 30, fontWeight: 800, fill: '#141414', fontFamily: sans }, '!'));
      return scene(true, [tri,
        bubble('q' + i, 160, 112, AL[i], CT, t > .3, { bd: RED, fg: RED }),
        chip('c1', 290, 20, 'Señal de alarma ' + (i + 1) + ' de 5', RED, '#FFFFFF', t > .3),
        chip('c2', 200, 236, 'Si escuchas esto, puede ser estafa', '#141414', '#FFFFFF', t > 7)], true);
    }
    if (k === 4) {
      const hung = t > 4;
      return scene(!hung, [
        bubble('q', 200, 118, ['¡Conteste! ¿Sí o no?'], CT, t > .4 && !hung, { bd: RED, fg: RED }),
        bubble('e', 14, 30, ['Disculpe, no puedo ayudarle.'], [118, 108], t > 1.6 && t < 4.6),
        chip('c1', 300, 14, '✗ No digas "sí"', PINK, RED, t > 2.4),
        chip('c2', 300, 42, '✓ Calma, sin discutir', OK, '#FFFFFF', t > 2.9),
        chip('c3', 300, 70, '✓ Discúlpate y cuelga', OK, '#FFFFFF', t > 4.4)], true, hung);
    }
    const writing = t > .4 && t < 4, wob = writing ? Math.sin(t * 22) * 4 : 0;
    const ROWS = ['Fecha', 'Hora', 'Número que llamó', 'Qué dijo', 'Quién atendió'];
    const book = h('g', { key: 'bk', style: { opacity: t > 4.2 ? 0 : 1, transition: 'opacity .5s' } },
      h('rect', { x: 150, y: 10, width: 160, height: 104, rx: 8, fill: '#FFFFFF', stroke: '#141414', strokeWidth: 1.5 }),
      h('text', { x: 162, y: 27, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', fill: RED, fontFamily: sans }, 'BITÁCORA'),
      ROWS.map((r, n) => { const on = t > .6 + n * .65, y = 44 + n * 15; return h('g', { key: r },
        h('text', { x: 162, y, fontSize: 9, fontWeight: 600, fill: '#5C5F63', fontFamily: sans }, r),
        h('path', { d: 'M246 ' + (y - 3) + ' q5 -4 10 0 t10 0 t10 0 t10 0 t10 0', fill: 'none', stroke: '#1E6FC2', strokeWidth: 1.4, pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: on ? 0 : 1, style: { transition: 'stroke-dashoffset .6s ease' } }),
        h('text', { x: 300, y, textAnchor: 'end', fontSize: 9, fontWeight: 800, fill: OK, fontFamily: sans, style: { opacity: on ? 1 : 0, transition: 'opacity .3s .5s' } }, '✓')); }));
    const pad = h('rect', { key: 'pd', x: 140, y: 162, width: 36, height: 7, rx: 1.5, fill: '#FFFFFF', stroke: '#9AA0A6', strokeWidth: 1 });
    const team = t > 4.2;
    const [c1b, c1f] = person('m1', { x: 318, face: -1, shirt: '#1E6FC2', cap: RED, hands: [[306, 188], [324, 188]] });
    const [c2b, c2f] = person('m2', { x: 362, face: -1, shirt: OK, cap: PANTS, hands: [[350, 188], [368, 188]] });
    const teamG = h('g', { key: 'tm', style: { opacity: team ? 1 : 0, transition: 'opacity .5s' } }, c2b, c2f, c1b, c1f);
    const [pb, pf] = person('p', Object.assign({ x: EX, face: 1, hands: team ? [[150, 150], [96, 186]] : [[150 + wob, 164], [132, 168]] }, P1));
    return svg([floor, pb, counter, base, cradle(true), pad, teamG, pf, book,
      bubble('e', 120, 50, ['No contesten este número.'], [124, 110], t > 4.6),
      chip('c1', 300, 236, '✓ Repórtalo con tu superior', OK, '#FFFFFF', t > 6)]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st);
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, past = a || k < st;
        return { n: String(k + 1), t, d, lbl: k === 3 ? 'ALERTA · PASO 4' : 'PASO ' + (k + 1),
          bd: a ? '#DB011C' : '#F2DCCB', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? '#DB011C' : '#F6E3D6', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, RecepcionLlamadas_CSS), h("section", { ref: v.rootRef, className: "rl17-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#FFF4EC", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · PROTOCOLO"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Recepción de llamadas")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #F2DCCB", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, h("span", { style: { font: "500 11px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#5C5F63" } }, "OBJETIVO"), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "8px" } }, h("div", { style: { padding: "12px 14px", borderRadius: "14px", background: "#FFFFFF", fontWeight: "600", fontSize: "14px", lineHeight: "1.35", textWrap: "pretty" } }, "Proteger la información sensible de la empresa y de las personas."), h("div", { style: { padding: "12px 14px", borderRadius: "14px", background: "#FFFFFF", fontWeight: "600", fontSize: "14px", lineHeight: "1.35", textWrap: "pretty" } }, "Identificar y cortar llamadas de estafa o extorsión lo más rápido posible."), h("div", { style: { padding: "12px 14px", borderRadius: "14px", background: "#FFFFFF", fontWeight: "600", fontSize: "14px", lineHeight: "1.35", textWrap: "pretty" } }, "Saber qué hacer cuando se recibe una llamada sospechosa."))), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#F6E3D6", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: "#DB011C", transition: "width .6s ease" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d)))))))), h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px 24px", padding: "16px 18px", borderRadius: "16px", background: "#141414", color: "#FFFFFF" } }, h("span", { style: { display: "flex", alignItems: "center", gap: "12px" } }, h("span", { style: { flex: "none", width: "32px", height: "32px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#1E9E55", fontWeight: "800" } }, "✓"), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.3", textWrap: "pretty" } }, "Seguir este proceso garantiza una atención rápida, correcta y segura.")), h("span", { style: { display: "flex", flexWrap: "wrap", gap: "8px" } }, h("span", { style: { padding: "8px 12px", borderRadius: "999px", background: "#2B3035", fontWeight: "600", fontSize: "13px" } }, "Cliente satisfecho"), h("span", { style: { padding: "8px 12px", borderRadius: "999px", background: "#2B3035", fontWeight: "600", fontSize: "13px" } }, "Proceso seguro"), h("span", { style: { padding: "8px 12px", borderRadius: "999px", background: "#2B3035", fontWeight: "600", fontSize: "13px" } }, "Mejores resultados")))));
  }
}

export default RecepcionLlamadas;
