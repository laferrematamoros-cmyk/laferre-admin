"use client";
import React from "react";

// Pasos animados para pintar una pared — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias). Foto en /public/bfm-assets/pintura/facilita.webp.
// Props opcionales: titulo (string), coloresHref (enlace al catálogo de colores).

const PIN_PRODS = [{"name":"Sella Forte · sellador vinílico 5x1","note":"Se diluye 5 de agua por 1 · 1 L rinde aprox. 12 m² · secado rápido","img":"/bfm-assets/pintura/sella-forte-1l.png","links":[{"t":"1 L","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=79&ver=160112"},{"t":"4 L","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=79&ver=160113"}]},{"name":"Doal · sellador vinil acrílico 5x1","note":"Interiores y exteriores · se diluye 5 de agua por 1 · rinde 18 a 20 m² por litro · seca al tacto en 30 min","img":"/bfm-assets/pintura/doal-sellador-1l.png","links":[{"t":"1 L","href":"https://bfmpedidosv-2.vercel.app/cotizar?f=79&ver=8518"}]}];
const PIN_PASOS = [["Limpia la pared","Retira polvo, grasa y pintura floja con agua y jabón o una lija."],["Repara grietas","Rellena grietas e imperfecciones con resanador y lija al secar."],["Deja secar","Espera a que el resane y la pared estén bien secos."],["Aplica sellador","Diluye el sellador: 5 partes de agua por 1 de sellador. Aplícalo con brocha o rodillo para que la pintura se adhiera y rinda más. No lo apliques con lluvia ni a menos de 10 °C."],["Pinta en capas uniformes","Diluye Facilita con 10% de agua limpia y aplica capas parejas con brocha o rodillo."]];
const PIN_CSS = ".pin-move{animation:pin-move 1.8s cubic-bezier(.2,.7,.2,1) 3.4s both}@keyframes pin-move{0%{transform:translateX(180px);opacity:0}1%{transform:translateX(180px);opacity:1}100%{transform:none;opacity:1}}.pin-bob{animation:pin-bob .3s ease-in-out 3.4s 6 alternate both}@keyframes pin-bob{from{transform:none}to{transform:translateY(-3px)}}.pin-lamp{animation:pin-lamp .7s ease-out 5.3s both}@keyframes pin-lamp{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}.pin-glow{animation:pin-in .8s ease 6s both}@media (prefers-reduced-motion:reduce){.pin-move,.pin-bob,.pin-lamp,.pin-glow{animation:none !important}}@keyframes pin-in{from{opacity:0}to{opacity:1}}.pin-strip{transform-box:fill-box;transform-origin:50% 0%;animation:pin-strip .58s ease-in-out both}@keyframes pin-strip{from{transform:scaleY(0)}to{transform:scaleY(1)}}.pin-roll{animation:pin-roll 3.2s linear forwards}@keyframes pin-roll{0%{transform:translate(51.2px,22px);opacity:1}18%{transform:translate(51.2px,214px);opacity:1}20%{transform:translate(125.6px,22px);opacity:1}38%{transform:translate(125.6px,214px);opacity:1}40%{transform:translate(200px,22px);opacity:1}58%{transform:translate(200px,214px);opacity:1}60%{transform:translate(274.4px,22px);opacity:1}78%{transform:translate(274.4px,214px);opacity:1}80%{transform:translate(348.8px,22px);opacity:1}98%{transform:translate(348.8px,214px);opacity:1}100%{transform:translate(348.8px,214px);opacity:0}}@media (prefers-reduced-motion:reduce){.pin-strip{animation:none !important}.pin-roll{display:none}}.bfm-pin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:12px;align-items:start}.bfm-pin-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}";

class PasosPintar extends React.Component {
  state = { pinStep: -1, pinPh: 0 };
  pinT = [];
  pinWallRef = el => {
    if (!el || this.pinIO || this.state.pinStep >= 0) return;
    if (!window.IntersectionObserver) { this.pinPlay(); return; }
    this.pinIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.pinIO.disconnect(); this.pinPlay(); } }, { threshold: 0.45 });
    this.pinIO.observe(el);
  };
  pinClear() { this.pinT.forEach(clearTimeout); this.pinT = []; }
  pinPlay() {
    this.pinClear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ pinStep: 4, pinPh: 1 }); return; }
    this.setState({ pinStep: -1, pinPh: 0 });
    const D = [3100, 2700, 2700, 3900, 3900]; let t = 150;
    for (let k = 0; k < 5; k++) {
      this.pinT.push(setTimeout(() => this.setState({ pinStep: k, pinPh: 0 }), t));
      this.pinT.push(setTimeout(() => this.setState({ pinPh: 1 }), t + 90));
      t += D[k];
    }
  }
  pinGo(k) { if (this.pinIO) this.pinIO.disconnect(); else this.pinIO = { disconnect() {} }; this.pinClear(); this.setState({ pinStep: k, pinPh: 0 }); this.pinT.push(setTimeout(() => this.setState({ pinPh: 1 }), 90)); }
  pinWorkRef = el => {
    if (!el) return;
    cancelAnimationFrame(this.pinRaf);
    const q = k => el.querySelector('[data-k="' + k + '"]');
    this.pinAnim = { el, st: +el.getAttribute('data-st'), t0: performance.now(), tool: q('tool'), pole: q('pole'), person: q('person'), legA: q('legA'), legB: q('legB'), arm: q('arm'), hand: q('hand') };
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.setAttribute('opacity', 0); return; }
    this.pinTick();
  };
  pinPose(st, t) {
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    let tx, ty, hx, hy, px, walk = false, dur;
    if (st === 0) { dur = 2.4; const u = cl(t / dur, 0, 1); tx = 40 + 300 * ease(u); ty = 119 + 9 * Math.sin(t * 16); hx = tx + 14; hy = ty + 4; px = Math.min(372, tx + 48); walk = u > 0 && u < 1; }
    else if (st === 1) { dur = 1.8; const u = cl(t / dur, 0, 1); const C = [[250,96],[242,116],[256,138],[244,160],[256,182],[248,204]]; ty = 96 + 108 * u; let i = 0; while (i < C.length - 2 && ty > C[i + 1][1]) i++; const a = C[i], b = C[i + 1]; const k = cl((ty - a[1]) / (b[1] - a[1]), 0, 1); tx = a[0] + (b[0] - a[0]) * k; hx = tx + 28; hy = ty; px = 312; }
    else {
      dur = 3.2; const W = 74.4, slot = .64, down = .576, xc = c => 14 + W * c + W / 2;
      const n = Math.min(4, Math.floor(t / slot)), s = t - n * slot;
      if (t >= dur || (n === 4 && s >= down)) { tx = xc(4); ty = 214; }
      else if (s < down) { tx = xc(n); ty = 22 + 192 * (s / down); }
      else { const k = (s - down) / (slot - down); tx = xc(n) + (xc(n + 1) - xc(n)) * k; ty = 214 - 192 * k; walk = true; }
      px = Math.min(372, tx + 48); hx = px - 18; hy = cl(ty + 48, 118, 176);
    }
    return { tx, ty, hx, hy, px, walk, alpha: t <= dur ? 1 : Math.max(0, 1 - (t - dur) / .4), end: t > dur + .45 };
  }
  pinTick = () => {
    const A = this.pinAnim;
    if (!A || !A.el.isConnected) { this.pinRaf = 0; return; }
    const t = (performance.now() - A.t0) / 1000, P = this.pinPose(A.st, t);
    A.el.setAttribute('opacity', P.alpha);
    A.tool.setAttribute('transform', 'translate(' + P.tx + ',' + P.ty + ')');
    if (A.pole) { const dx = P.hx - P.tx, dy = P.hy - (P.ty + 14), L = Math.hypot(dx, dy) || 1; A.pole.setAttribute('x1', P.tx); A.pole.setAttribute('y1', P.ty + 14); A.pole.setAttribute('x2', P.hx + dx / L * 12); A.pole.setAttribute('y2', P.hy + dy / L * 12); }
    A.person.setAttribute('transform', 'translate(' + P.px + ',228)');
    const sw = P.walk ? Math.sin(t * 14) * 6 : 0;
    A.legA.setAttribute('d', 'M0 -46 L' + (-6 + sw) + ' 0'); A.legB.setAttribute('d', 'M0 -46 L' + (6 - sw) + ' 0');
    A.arm.setAttribute('x1', P.px - 4); A.arm.setAttribute('y1', 144); A.arm.setAttribute('x2', P.hx); A.arm.setAttribute('y2', P.hy);
    A.hand.setAttribute('cx', P.hx); A.hand.setAttribute('cy', P.hy);
    this.pinRaf = P.end ? 0 : requestAnimationFrame(this.pinTick);
  };
  pinWallEl() {
    const h = React.createElement, st = this.state.pinStep, ph = this.state.pinPh;
    const done = k => st > k || (st === k && ph === 1);
    const tr = (p, d) => st < 0 ? 'none' : p + ' ' + d + 's ease-in-out';
    const S = { x: 14, y: 14, width: 372, height: 208 };
    const PAINT = '#F2B544';
    const layer = (k, c) => st > k ? h('rect', Object.assign({ key: 'L' + k, fill: c }, S)) : (st === k && ph ? h('g', { key: 'A' + k }, [0, 1, 2, 3, 4].map(n => h('rect', { key: n, className: 'pin-strip', x: 14 + n * 74.4 - 1, y: 14, width: 76.4, height: 208, fill: c, style: { animationDelay: (n * 0.64) + 's' } })), h('rect', Object.assign({ key: 'solid', fill: c, style: { animation: 'pin-in .15s linear 3.2s both' } }, S))) : null);
    const crack = 'M250 96 L242 116 L256 138 L244 160 L256 182 L248 204';
    const stains = [[80,60,22,12,'#B9B0A2'],[150,150,30,16,'#C4BBAD'],[320,80,18,10,'#B4AA9B'],[100,185,16,9,'#BDB4A6'],[330,170,24,12,'#C1B8AA']];
    const mv = ph ? 'transform 1.9s ease-in-out' : 'none';
    const tool = null;
    let work = null;
    if (ph === 1 && (st === 0 || st === 1 || st === 3 || st === 4)) {
      const shape = st === 0 ? [h('rect', { key: 'a', x: -16, y: -23, width: 32, height: 46, rx: 10, fill: '#FFD23F', stroke: '#1A1A1A', strokeWidth: 2 }), h('rect', { key: 'b', x: -16, y: 7, width: 32, height: 16, rx: 6, fill: '#3FA34D' })]
        : st === 1 ? [h('rect', { key: 'a', x: 4, y: -4, width: 26, height: 8, rx: 4, fill: '#C68B4E' }), h('rect', { key: 'b', x: -14, y: -8, width: 20, height: 16, rx: 1.5, fill: '#B8BEC4', stroke: '#1A1A1A', strokeWidth: 1.5 })]
        : [h('path', { key: 'a', d: 'M0 7 V14', stroke: '#9AA0A6', strokeWidth: 3 }), h('rect', { key: 'b', x: -32, y: -7, width: 64, height: 14, rx: 7, fill: st === 3 ? '#F7F5F0' : PAINT, stroke: '#1A1A1A', strokeWidth: 2 })];
      work = h('g', { key: 'w' + st, ref: this.pinWorkRef, 'data-st': st },
        h('g', { 'data-k': 'tool' }, shape),
        st >= 3 ? h('line', { 'data-k': 'pole', stroke: '#8E959C', strokeWidth: 3.5, strokeLinecap: 'round' }) : null,
        h('g', { 'data-k': 'person' },
          h('path', { 'data-k': 'legA', d: 'M0 -46 L-6 0', stroke: '#1F2A44', strokeWidth: 8, strokeLinecap: 'round', fill: 'none' }),
          h('path', { 'data-k': 'legB', d: 'M0 -46 L6 0', stroke: '#1F2A44', strokeWidth: 8, strokeLinecap: 'round', fill: 'none' }),
          h('path', { d: 'M1 -82 L8 -56', stroke: '#A80016', strokeWidth: 6, strokeLinecap: 'round' }),
          h('path', { d: 'M0 -46 L-2 -86', stroke: '#DB011C', strokeWidth: 18, strokeLinecap: 'round' }),
          h('circle', { cx: -3, cy: -101, r: 11, fill: '#A8704A' }),
          h('path', { d: 'M-15 -102 A12 12 0 0 1 9 -102 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 1.5 }),
          h('path', { d: 'M-14 -102 H-23', stroke: '#1A1A1A', strokeWidth: 3, strokeLinecap: 'round' })),
        h('line', { 'data-k': 'arm', stroke: '#DB011C', strokeWidth: 6, strokeLinecap: 'round' }),
        h('circle', { 'data-k': 'hand', r: 4, fill: '#A8704A' }));
    }
    const svg = h('svg', { viewBox: '0 0 400 250', role: 'img', 'aria-label': 'Animación de los pasos para pintar una pared', style: { display: 'block', width: '100%', height: 'auto', borderRadius: '12px', background: '#F3EFE8' } },
      h('rect', Object.assign({ fill: '#E2DCD2' }, S)),
      h('rect', { x: 14, y: 222, width: 372, height: 14, fill: '#BFB6A8' }),
      h('g', null, stains.map(([x, y, rx, ry, c], n) => h('ellipse', { key: 'st' + n, cx: x, cy: y, rx, ry, fill: c, style: { opacity: done(0) ? 0 : .8, transition: st < 0 ? 'none' : 'opacity .5s ease ' + Math.max(0, (x - 40) / 300 * 2.4).toFixed(2) + 's' } }))),
      h('path', { d: crack, stroke: '#6E675D', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('path', { d: crack, strokeWidth: 12, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: 200, style: { stroke: done(2) ? '#EEEAE3' : '#BDB5A8', strokeDashoffset: done(1) ? 0 : 200, transition: st < 0 ? 'none' : 'stroke-dashoffset 1.8s linear, stroke 1.6s ease' } }),
      h('g', { style: { opacity: st === 2 ? (ph ? 0 : 1) : 0, transition: st === 2 && ph ? 'opacity 2s ease' : 'none' } },
        [[232, 120], [270, 150], [236, 186]].map(([x, y], n) => h('path', { key: 'w' + n, d: 'M' + x + ' ' + (y - 8) + 'C' + (x + 5) + ' ' + y + ' ' + (x + 6) + ' ' + (y + 3) + ' ' + x + ' ' + (y + 7) + 'C' + (x - 6) + ' ' + (y + 3) + ' ' + (x - 5) + ' ' + y + ' ' + x + ' ' + (y - 8) + 'Z', fill: '#7FB5E8' }))),
      h('g', { style: { opacity: st === 2 ? 1 : 0, transition: tr('opacity', .5) } },
        h('circle', { cx: 350, cy: 48, r: 20, fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 2 }),
        h('path', { d: 'M350 36 V48 L358 54', stroke: '#DB011C', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' })),
      layer(3, '#F7F5F0'),
      layer(4, PAINT),
      done(4) ? h('g', { key: 'room' },
        h('g', { className: 'pin-lamp' },
          h('ellipse', { className: 'pin-glow', cx: 86, cy: 112, rx: 46, ry: 30, fill: '#FFF3C4', opacity: .7 }),
          h('path', { d: 'M86 118 V226', stroke: '#1A1A1A', strokeWidth: 3 }),
          h('ellipse', { cx: 86, cy: 227, rx: 16, ry: 4, fill: '#1A1A1A' }),
          h('path', { d: 'M64 118 L108 118 L100 88 L72 88 Z', fill: '#FFFFFF', stroke: '#1A1A1A', strokeWidth: 2, strokeLinejoin: 'round' })),
        h('g', { className: 'pin-move' },
          h('g', { transform: 'translate(150,166)' },
            h('rect', { x: 8, y: 0, width: 134, height: 36, rx: 10, fill: '#24596E' }),
            h('rect', { x: 0, y: 30, width: 150, height: 30, rx: 8, fill: '#1E4A5C' }),
            h('path', { d: 'M75 32 V58', stroke: '#173B49', strokeWidth: 2 }),
            h('rect', { x: -6, y: 18, width: 22, height: 44, rx: 8, fill: '#24596E' }),
            h('rect', { x: 134, y: 18, width: 22, height: 44, rx: 8, fill: '#24596E' }),
            h('rect', { x: 22, y: 12, width: 30, height: 22, rx: 6, fill: '#DB011C', transform: 'rotate(-8 37 23)' }),
            h('rect', { x: 6, y: 60, width: 6, height: 6, fill: '#1A1A1A' }),
            h('rect', { x: 138, y: 60, width: 6, height: 6, fill: '#1A1A1A' })),
          h('g', { transform: 'translate(326,228)' },
            h('g', { className: 'pin-bob' },
              h('path', { d: 'M2 -42 L-10 -1', stroke: '#1F2A44', strokeWidth: 7, strokeLinecap: 'round' }),
              h('path', { d: 'M2 -42 L15 -1', stroke: '#1F2A44', strokeWidth: 7, strokeLinecap: 'round' }),
              h('path', { d: 'M2 -42 L-6 -72', stroke: '#DB011C', strokeWidth: 15, strokeLinecap: 'round' }),
              h('path', { d: 'M-6 -70 L-19 -46', stroke: '#DB011C', strokeWidth: 5, strokeLinecap: 'round' }),
              h('circle', { cx: -20, cy: -44, r: 3.5, fill: '#A8704A' }),
              h('circle', { cx: -10, cy: -86, r: 9, fill: '#A8704A' }),
              h('path', { d: 'M-19 -88 A9 9 0 0 1 -1 -88 Q-6 -92 -19 -88 Z', fill: '#2B1D14' }))))) : null,
      h('g', { style: { opacity: done(4) ? 1 : 0, transform: done(4) ? 'none' : 'translate(0px,12px)', transition: (st < 0 ? 'none' : 'opacity .8s ease 3.3s, transform .8s ease-in-out 3.3s') } },
        h('rect', { x: 128, y: 28, width: 144, height: 32, rx: 16, fill: '#DB011C' }),
        h('text', { x: 200, y: 49, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: '#FFFFFF', fontFamily: 'Geist, sans-serif' }, '✓ Pared lista')),
      tool, work);
    return h('div', { ref: this.pinWallRef }, svg);
  }
  componentWillUnmount() {
    this.pinClear(); if (this.pinIO) this.pinIO.disconnect(); cancelAnimationFrame(this.pinRaf);
  }
  render() {
    const h = React.createElement, st = this.state.pinStep, ph = this.state.pinPh, cur = Math.max(0, st);
    const pct = (st < 0 ? 0 : Math.round(((st + (ph ? 1 : 0)) / 5) * 100)) + '%';
    const mono = '500 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace';
    const RED = '#DB011C';
    return h('section', { className: 'bfm-pin', style: { color: '#141414', background: '#F6F6F4', borderRadius: 24, padding: 'clamp(16px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 } },
      h('style', null, PIN_CSS),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px 24px' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('span', { style: { font: mono, fontSize: 12, letterSpacing: '.08em', color: RED } }, 'PASO A PASO'),
          h('h3', { style: { margin: 0, fontWeight: 700, fontSize: 'clamp(22px, 2.6vw, 32px)', lineHeight: 1.1, letterSpacing: '-.02em' } }, this.props.titulo || 'Cómo pintar tu pared en 5 pasos.')),
        h('button', { type: 'button', onClick: () => this.pinPlay(), style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E2DE', borderRadius: 999, background: '#FFFFFF', color: '#141414', fontWeight: 600, fontSize: 13, lineHeight: 1, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer' } }, '↻ Ver de nuevo')),
      h('div', { className: 'bfm-pin-grid' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 18, background: '#FFFFFF' } },
          this.pinWallEl(),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 4px' } },
            h('span', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 } }, h('span', { style: { fontWeight: 600 } }, PIN_PASOS[cur][0]), h('span', { style: { color: '#5C5F63', whiteSpace: 'nowrap' } }, 'Paso ' + (cur + 1) + ' de 5')),
            h('span', { style: { display: 'block', height: 6, borderRadius: 999, background: '#F1E3E3', overflow: 'hidden' } }, h('span', { style: { display: 'block', height: '100%', width: pct, borderRadius: 999, background: RED, transition: 'width .6s ease' } })))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('ol', { className: 'bfm-pin-steps' }, PIN_PASOS.map(([t, d], k) => {
            const isDone = st > k || (k === 4 && st === 4 && ph === 1), act = st === k && !isDone, on = act || isDone;
            return h('li', { key: k, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('button', { type: 'button', onClick: () => this.pinGo(k), style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, border: '1.5px solid ' + (act ? RED : isDone ? '#FFFFFF' : 'transparent'), background: on ? '#FFFFFF' : 'rgba(255,255,255,.55)', color: '#141414', font: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'background .3s, border-color .3s' } },
                h('span', { style: { flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', background: on ? RED : '#F1E3E3', color: on ? '#FFFFFF' : RED, fontWeight: 700, fontSize: 14, transition: 'background .3s, color .3s' } }, String(k + 1)),
                h('span', { style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 } },
                  h('span', { style: { font: mono, letterSpacing: '.08em', color: on ? RED : '#5C5F63' } }, 'PASO ' + (k + 1) + (isDone ? ' · LISTO ✓' : '')),
                  h('span', { style: { fontWeight: 600, fontSize: 16, lineHeight: 1.25 } }, t),
                  h('span', { style: { fontSize: 13, lineHeight: 1.4, color: '#5C5F63' } }, d))),
              k === 3 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 42 } }, PIN_PRODS.map((p, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 8px 8px', borderRadius: 14, background: '#FFFFFF', border: '1px solid #EDEDEA' } },
                h('img', { src: p.img, alt: p.name, style: { flex: 'none', display: 'block', width: 44, height: 56, objectFit: 'contain' } }),
                h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 } },
                  h('span', { style: { fontWeight: 600, fontSize: 14, lineHeight: 1.3 } }, p.name),
                  h('span', { style: { fontSize: 12, lineHeight: 1.3, color: '#5C5F63' } }, p.note),
                  h('span', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, p.links.map(l => h('a', { key: l.t, href: l.href, target: '_blank', rel: 'noopener', style: { padding: '4px 10px', borderRadius: 999, background: '#FCEDEE', color: '#B90017', textDecoration: 'none', fontSize: 12, fontWeight: 600 } }, l.t + ' · Cotizar →'))))))) : null);
          })),
          h('a', { href: this.props.coloresHref || 'https://pinturas-bfm.vercel.app/', style: { display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px 10px 10px', borderRadius: 16, background: '#FFFFFF', border: '1.5px solid #E2E2DE', color: '#141414', textDecoration: 'none' } },
            h('img', { src: '/bfm-assets/pintura/facilita.webp', alt: 'Cubeta de pintura Sayer Facilita', style: { flex: 'none', display: 'block', width: 56, height: 56, objectFit: 'contain' } }),
            h('span', { style: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 } },
              h('span', { style: { font: mono, letterSpacing: '.06em', color: '#5C5F63' } }, 'SAYER FACILITA · MÁS DE 1,000 TONOS'),
              h('span', { style: { fontWeight: 600, fontSize: 15, lineHeight: 1.25 } }, 'Elige tu color en nuestro catálogo'),
              h('span', { style: { fontWeight: 600, fontSize: 14, color: RED } }, 'Busca tu color →')))))
    );
  }
}

export default PasosPintar;
