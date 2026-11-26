"use client";
import React from "react";

// Conoce las Tuberias — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias ni fotos).
// Clases y animaciones con prefijo "ct14-" para no chocar con otros componentes.

const ConoceTuberias_CSS = "@import url(\"https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@500;600&display=swap\");@keyframes ct14-tub-flow{to{stroke-dashoffset:-18}}@keyframes ct14-tub-fa{0%,42%{opacity:1}50%,92%{opacity:0}100%{opacity:1}}@keyframes ct14-tub-fb{0%,42%{opacity:0}50%,92%{opacity:1}100%{opacity:0}}@keyframes ct14-tub-pulse{0%,100%{opacity:.35}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.ct14-root svg *{animation:none !important}}";

const STEPS = [
  ['Tubería hidráulica (PVC cédula 40)', 'Medidas de ½" a 1-1/2". Blanca, de pared gruesa y con un extremo más amplio. Para agua fría con presión. No es para exterior. En BFM manejamos cédula 40.'],
  ['PVC: cédula 30, 40 y 80', 'En BFM manejamos PVC hidráulico cédula 40. También existen cédula 30, de pared más delgada, y cédula 80, de color gris y para presiones muy altas.'],
  ['Tubería sanitaria', 'Medidas de 2", 3" y 4". Pared delgada y diámetro más grande que la hidráulica, sin extremo amplio. Para drenajes: no lleva presión.'],
  ['Tubería CPVC', 'Medidas de ½" y ¾". Color amarillento y pared un poco gruesa, sin extremo amplio. Para agua fría y caliente con presión. No es para exterior.'],
  ['Tubería de cobre', 'Medidas de ½" y ¾". Metálica, rígida y color cobre, sin extremo amplio. Su pared lisa reduce la pérdida de presión por fricción y tiene larga vida útil. Agua fría y caliente a presión de calle. Sí va en exterior.'],
  ['Tipos de tubo de cobre', 'M y N: agua potable fría o caliente en casas y edificios; la M también en comercios y servicios. L: para presión alta; agua, gas LP, natural y medicinal. Flexible: agua, gas LP y natural, aire acondicionado y refrigeración. En BFM manejamos la tipo N y la flexible.'],
  ['¿Cómo se mide? IPS y CTS', 'IPS (Iron Pipe Size, medida de tubo de hierro), PVC hidráulico y sanitario: la medida corresponde al interior. CTS (Copper Tube Size, medida de tubo de cobre), cobre y CPVC: la medida corresponde al exterior.'],
  ['Resumen', 'Qué agua conduce cada tubería, si aguanta presión y si se puede usar en exterior.']
];
const DUR = [7500, 6500, 7500, 7500, 7500, 7500, 6500, 7000];
const PIPES = [
  { k: 'hid', body: '#F5F6F7', edge: '#AEB5BB', inn: '#C9CFD4', R: 26, w: 8, flare: true, sizes: ['½"', '¾"', '1"', '1-1/4"', '1-1/2"'], cold: 1, hot: 0, pres: 1, ext: 0, wl: 'Pared gruesa, color blanco', fl: 'Extremo más amplio' },
  { k: 'san', body: '#FAFAFA', edge: '#B9C0C6', inn: '#D5DADF', R: 34, w: 3, flare: false, sizes: ['2"', '3"', '4"'], cold: 1, hot: 0, pres: 0, ext: 0, wl: 'Pared delgada, diámetro grande', fl: 'Sin extremo amplio' },
  { k: 'cpvc', body: '#EFE2BE', edge: '#BFA76A', inn: '#D9C38C', R: 20, w: 6, flare: false, sizes: ['½"', '¾"'], cold: 1, hot: 1, pres: 1, ext: 0, wl: 'Amarillenta, pared un poco gruesa', fl: 'Sin extremo amplio' },
  { k: 'cu', body: '#C9773F', edge: '#8E4A22', inn: '#6E3416', R: 18, w: 2.5, flare: false, sizes: ['½"', '¾"'], cold: 1, hot: 1, pres: 1, ext: 1, wl: 'Metálica y rígida', fl: 'Sin extremo amplio' }
];

class ConoceTuberias extends React.Component {
  state = { st: -1, ph: 0 };
  T = [];
  rootRef = React.createRef();
  componentDidMount() {
    const el = this.rootRef.current;
    if (!el || !window.IntersectionObserver) { this.play(); return; }
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.io.disconnect(); this.play(); } }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    this.io.observe(el);
  }
  componentWillUnmount() { this.clear(); if (this.io) this.io.disconnect(); }
  clear() { this.T.forEach(clearTimeout); this.T = []; }
  enter(k, t) {
    this.T.push(setTimeout(() => this.setState({ st: k, ph: 0 }), t));
    [[90, 1], [1700, 2], [3100, 3]].forEach(([d, p]) => this.T.push(setTimeout(() => this.setState({ ph: p }), t + d)));
  }
  play() {
    if (this.io) this.io.disconnect();
    this.clear();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ st: STEPS.length - 1, ph: 3 }); return; }
    this.setState({ st: -1, ph: 0 });
    let t = 150;
    DUR.forEach((d, k) => { this.enter(k, t); t += d; });
  }
  go(k) { if (this.io) this.io.disconnect(); this.clear(); this.enter(k, 0); }
  scene() {
    const h = React.createElement, st = this.state.st, ph = st < 0 ? 0 : this.state.ph, k = Math.max(0, st);
    const sans = 'Geist, sans-serif', mono = 'Geist Mono, monospace', RED = '#DB011C', OK = '#1E9E55', BLUE = '#2F80D1', HOT = '#E2361A', MUT = '#5C5F63';
    const pop = (on, d) => ({ opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(.85)', transformBox: 'fill-box', transformOrigin: 'center', transition: 'opacity .45s ease ' + (d || 0) + 's, transform .45s cubic-bezier(.3,1.4,.5,1) ' + (d || 0) + 's' });
    const svg = kids => h('svg', { viewBox: '0 0 400 260', role: 'img', 'aria-label': 'Animación: conoce las tuberías', style: { display: 'block', width: '100%', height: 'auto' } }, kids);
    const show = ph >= 1, lab = ph >= 2, bad = ph >= 3;

    if (k <= 4 && k !== 1) {
      const p = PIPES[k > 1 ? k - 1 : k], cy = 118, x1 = 84, x2 = 316, R = p.R, ri = R - p.w, e = .42;
      const ang = p.k === 'san' ? 4 : 0, rad = ang * Math.PI / 180;
      const rot = (x, y) => [200 + (x - 200) * Math.cos(rad) - (y - cy) * Math.sin(rad), cy + (x - 200) * Math.sin(rad) + (y - cy) * Math.cos(rad)];
      const RF = R + 5, fx0 = x2 - 40, fx1 = x2 - 32;
      const bodyD = p.flare
        ? 'M' + x1 + ' ' + (cy - R) + ' H' + fx0 + ' L' + fx1 + ' ' + (cy - RF) + ' H' + x2 + ' A' + (RF * e) + ' ' + RF + ' 0 0 1 ' + x2 + ' ' + (cy + RF) + ' H' + fx1 + ' L' + fx0 + ' ' + (cy + R) + ' H' + x1 + ' Z'
        : 'M' + x1 + ' ' + (cy - R) + ' H' + x2 + ' A' + (R * e) + ' ' + R + ' 0 0 1 ' + x2 + ' ' + (cy + R) + ' H' + x1 + ' Z';
      const xEnd = p.flare ? fx0 : x2;
      const water = (col, tint) => h('g', null,
        p.pres
          ? h('rect', { x: x1 + 4, y: cy - ri + 1, width: xEnd - x1 - 8, height: 2 * ri - 2, rx: 2, fill: tint, opacity: .75 })
          : h('rect', { x: x1 + 4, y: cy + ri * .25, width: x2 - x1 - 8, height: ri * .75 - 1, fill: tint, opacity: .8 }),
        (p.pres ? [-.45, 0, .45] : [.6]).map((f, i) => h('path', { key: i, d: 'M' + (x1 + R * e + 8) + ' ' + (cy + f * ri) + ' H' + (xEnd - 10), fill: 'none', stroke: col, strokeWidth: p.pres ? 3 : 4, strokeLinecap: 'round', strokeDasharray: '10 8', style: { animation: 'ct14-tub-flow ' + (p.pres ? '.55s' : '1.3s') + ' linear infinite' } })));
      const flow = p.hot
        ? [h('g', { key: 'c', style: { animation: 'ct14-tub-fa 5s ease-in-out infinite' } }, water(BLUE, '#CFE3F7')), h('g', { key: 'hh', style: { animation: 'ct14-tub-fb 5s ease-in-out infinite' } }, water(HOT, '#F9D3C9'))]
        : [h('g', { key: 'c' }, water(BLUE, '#CFE3F7'))];
      const pipe = h('g', { key: 'pipe', style: { opacity: show ? 1 : 0, transform: show ? 'none' : 'translateX(-24px)', transition: 'opacity .5s ease, transform .7s cubic-bezier(.2,.7,.2,1)' } },
        h('g', { transform: ang ? 'rotate(' + ang + ' 200 ' + cy + ')' : undefined },
          h('path', { d: bodyD, fill: p.body, stroke: p.edge, strokeWidth: 1.5, strokeLinejoin: 'round' }),
          flow,
          h('path', { d: 'M' + (x1 + R * e + 4) + ' ' + (cy - R * .62) + ' H' + (xEnd - 8), stroke: p.k === 'cu' ? '#F2B48A' : '#FFFFFF', strokeWidth: Math.max(2, R * .14), strokeLinecap: 'round', opacity: .7 }),
          h('ellipse', { cx: x1, cy, rx: R * e, ry: R, fill: p.body, stroke: p.edge, strokeWidth: 1.5 }),
          h('ellipse', { cx: x1, cy, rx: ri * e, ry: ri, fill: p.inn, stroke: p.edge, strokeWidth: 1 })));
      let sx = 74;
      const sizes = p.sizes.map((s, i) => { const wd = 16 + s.length * 6.4, x = sx; sx += wd + 6; return h('g', { key: 's' + i, style: pop(show, .3 + i * .12) }, h('rect', { x, y: 12, width: wd, height: 22, rx: 11, fill: '#FFFFFF', stroke: '#DCE4EC', strokeWidth: 1.2 }), h('text', { x: x + wd / 2, y: 27, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#141414', fontFamily: sans }, s)); });
      const sizeLbl = h('text', { key: 'sl', x: 16, y: 27, fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em', fill: MUT, fontFamily: mono, style: { opacity: show ? 1 : 0, transition: 'opacity .4s' } }, 'MEDIDAS');
      let top = null;
      if (p.pres) {
        const gx = 236, gy = cy - R - 24;
        top = h('g', { key: 'g', style: pop(show, .5) },
          h('rect', { x: gx - 3, y: gy + 10, width: 6, height: cy - R - gy - 9, fill: '#9AA0A6' }),
          h('circle', { cx: gx, cy: gy, r: 12, fill: '#FFFFFF', stroke: '#5C5F63', strokeWidth: 2 }),
          h('line', { x1: gx, y1: gy, x2: gx, y2: gy - 9, stroke: RED, strokeWidth: 2, strokeLinecap: 'round', style: { transformOrigin: gx + 'px ' + gy + 'px', transform: 'rotate(' + (show ? 45 : -70) + 'deg)', transition: 'transform 1.2s cubic-bezier(.3,1.3,.5,1) .6s' } }),
          h('circle', { cx: gx, cy: gy, r: 2, fill: '#141414' }),
          h('text', { x: gx + 18, y: gy + 4, fontSize: 9.5, fontWeight: 600, letterSpacing: '.06em', fill: MUT, fontFamily: mono }, p.k === 'cu' ? 'PRESIÓN DE CALLE' : 'CON PRESIÓN'));
      } else {
        top = h('g', { key: 'g', style: pop(show, .5) },
          h('text', { x: 210, y: 50, textAnchor: 'middle', fontSize: 9.5, fontWeight: 600, letterSpacing: '.06em', fill: MUT, fontFamily: mono }, 'CORRE POR GRAVEDAD, SIN PRESIÓN'),
          h('path', { d: 'M140 58 L284 67', stroke: BLUE, strokeWidth: 2, strokeLinecap: 'round' }),
          h('path', { d: 'M284 67 l-9 -5 l1 9 Z', fill: BLUE }));
      }
      const fy0 = cy - R - 10;
      const water1 = p.hot
        ? h('g', { key: 'wl', style: pop(show, .4) },
          h('text', { x: x1 + 46, y: fy0, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', fill: BLUE, fontFamily: mono, style: { animation: 'ct14-tub-fa 5s ease-in-out infinite' } }, 'AGUA FRÍA'),
          h('text', { x: x1 + 46, y: fy0, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', fill: HOT, fontFamily: mono, style: { animation: 'ct14-tub-fb 5s ease-in-out infinite' } }, 'AGUA CALIENTE'))
        : p.pres ? h('text', { key: 'wl', x: x1 + 46, y: fy0, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', fill: BLUE, fontFamily: mono, style: pop(show, .4) }, 'AGUA FRÍA') : null;
      const [lx, ly] = rot(x1, cy), [wbx, wby] = rot(x1, cy + R);
      const wallMark = h('g', { key: 'wm', style: pop(lab) },
        h('ellipse', { cx: lx, cy: ly, rx: R * e + 7, ry: R + 7, fill: 'none', stroke: RED, strokeWidth: 2, transform: ang ? 'rotate(' + ang + ' ' + lx + ' ' + ly + ')' : undefined, style: { animation: 'ct14-tub-pulse 1.4s ease-in-out infinite' } }),
        wby + 7 < 164 ? h('path', { d: 'M' + wbx + ' ' + (wby + 7) + ' V168', stroke: RED, strokeWidth: 1.2 }) : null,
        h('text', { x: 16, y: 182, fontSize: 11.5, fontWeight: 700, fill: '#141414', fontFamily: sans }, p.wl));
      const fcx = p.flare ? x2 - 14 : x2, [fx, fy] = rot(fcx, cy), fr = p.flare ? RF : R, fly = fy + fr + 7;
      const flareMark = h('g', { key: 'fm', style: pop(lab, .25) },
        h('ellipse', { cx: fx, cy: fy, rx: p.flare ? 26 : R * e + 7, ry: fr + 7, fill: 'none', stroke: p.flare ? RED : '#9AA0A6', strokeWidth: 2, strokeDasharray: p.flare ? undefined : '4 3', transform: ang ? 'rotate(' + ang + ' ' + fx + ' ' + fy + ')' : undefined, style: p.flare ? { animation: 'ct14-tub-pulse 1.4s ease-in-out infinite' } : undefined }),
        fly < 164 ? h('path', { d: 'M' + fx + ' ' + fly + ' V168', stroke: p.flare ? RED : '#9AA0A6', strokeWidth: 1.2 }) : null,
        h('text', { x: 384, y: 182, textAnchor: 'end', fontSize: 11.5, fontWeight: 700, fill: p.flare ? '#141414' : MUT, fontFamily: sans }, p.fl));
      const sun = p.ext ? h('g', { key: 'sun', style: pop(lab, .4) },
        h('circle', { cx: 370, cy: 52, r: 8, fill: '#FFC21A' }),
        [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r1 = a * Math.PI / 180; return h('line', { key: a, x1: 370 + Math.cos(r1) * 11, y1: 52 + Math.sin(r1) * 11, x2: 370 + Math.cos(r1) * 15, y2: 52 + Math.sin(r1) * 15, stroke: '#FFC21A', strokeWidth: 2, strokeLinecap: 'round' }); })) : null;
      const bads = [['Agua fría', p.cold, p.k === 'san' ? '✓ Drenaje' : null], ['Agua caliente', p.hot], ['Presión', p.pres, p.k === 'cu' ? '✓ De calle' : null], ['Exterior', p.ext]];
      const badges = bads.map(([l, ok, txt], i) => { const x = 16 + i * 94; return h('g', { key: 'b' + i, style: pop(bad, i * .15) },
        h('rect', { x, y: 198, width: 86, height: 46, rx: 10, fill: ok ? '#EAF6EE' : '#FBECEC', stroke: ok ? OK : RED, strokeWidth: 1.2 }),
        h('text', { x: x + 43, y: 215, textAnchor: 'middle', fontSize: 9.5, fontWeight: 600, fill: MUT, fontFamily: sans }, l),
        h('text', { x: x + 43, y: 234, textAnchor: 'middle', fontSize: txt ? 11.5 : 13, fontWeight: 800, fill: ok ? OK : RED, fontFamily: sans }, txt || (ok ? '✓ Sí' : '✗ No'))); });
      const ced = p.k === 'hid' ? h('g', { key: 'ced', style: pop(lab, .5) },
        h('rect', { x: 300, y: 10, width: 90, height: 26, rx: 13, fill: RED }),
        h('text', { x: 345, y: 27, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, 'Cédula 40')) : null;
      return svg([sizeLbl, sizes, top, water1, sun, pipe, wallMark, flareMark, badges, ced]);
    }

    if (k === 1) {
      const cs = [
        { n: '30', t: 'Cédula 30', s: 'Pared más delgada', body: '#F5F6F7', edge: '#AEB5BB', inn: '#C9CFD4', w: 5, hl: 0 },
        { n: '40', t: 'Cédula 40', s: 'La que manejamos', body: '#F5F6F7', edge: '#AEB5BB', inn: '#C9CFD4', w: 9, hl: 1 },
        { n: '80', t: 'Cédula 80', s: 'Gris · presión muy alta', body: '#8A9299', edge: '#5E656B', inn: '#4A5056', w: 14, hl: 0 }
      ];
      return svg([
        h('text', { key: 'tt', x: 200, y: 26, textAnchor: 'middle', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', fill: MUT, fontFamily: mono, style: { opacity: show ? 1 : 0, transition: 'opacity .4s' } }, 'PVC HIDRÁULICO · CÉDULAS'),
        cs.map((c, i) => { const x = 72 + i * 128;
          return h('g', { key: 'c' + i },
            h('g', { style: pop(show, i * .2) },
              c.hl ? h('rect', { x: x - 58, y: 40, width: 116, height: 190, rx: 16, fill: '#FDF0F1', stroke: RED, strokeWidth: 2, style: { animation: bad ? 'ct14-tub-pulse 1.4s ease-in-out infinite' : undefined } }) : null,
              h('circle', { cx: x, cy: 104, r: 40, fill: c.body, stroke: c.edge, strokeWidth: 2 }),
              h('circle', { cx: x, cy: 104, r: 40 - c.w, fill: '#FFFFFF', stroke: c.edge, strokeWidth: 1.2 }),
              h('text', { x, y: 110, textAnchor: 'middle', fontSize: 18, fontWeight: 800, fill: c.hl ? RED : '#141414', fontFamily: sans }, c.n)),
            h('g', { style: pop(lab, i * .15) },
              h('text', { x, y: 172, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: c.hl ? RED : '#141414', fontFamily: sans }, c.t),
              h('text', { x, y: 190, textAnchor: 'middle', fontSize: 10.5, fill: MUT, fontFamily: sans }, c.s)),
            c.hl ? h('g', { style: pop(bad) },
              h('rect', { x: x - 46, y: 202, width: 92, height: 20, rx: 10, fill: RED }),
              h('text', { x, y: 216, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#FFFFFF', fontFamily: sans }, '✓ En BFM')) : null);
        }),
        h('text', { key: 'ft', x: 200, y: 250, textAnchor: 'middle', fontSize: 9.5, fontWeight: 600, letterSpacing: '.04em', fill: MUT, fontFamily: mono, style: { opacity: bad ? 1 : 0, transition: 'opacity .5s' } }, 'A MAYOR CÉDULA, PARED MÁS GRUESA')
      ]);
    }

    if (k === 5) {
      const cards = [
        { L: 'M', c: RED, t: 'Tipo M', lines: ['Agua potable fría o caliente', 'Casas, edificios y comercios'] },
        { L: 'N', c: RED, t: 'Tipo N', bfm: 1, lines: ['Agua potable fría o caliente', 'Casas y edificios'] },
        { L: 'L', c: '#1E6FC2', t: 'Tipo L', chip: 'PRESIÓN ALTA', lines: ['Agua potable fría o caliente', 'Gas LP, natural y medicinal'] },
        { L: '', c: '#C9773F', t: 'Flexible', bfm: 1, lines: ['Agua y gas LP o natural', 'Aire acond. y refrigeración'] }
      ];
      return svg(cards.map((cd, i) => {
        const x = i % 2 ? 204 : 8, y = i < 2 ? 14 : 138;
        return h('g', { key: 'cd' + i },
          h('g', { style: pop(show, i * .15) },
            h('rect', { x, y, width: 188, height: 112, rx: 14, fill: cd.bfm ? '#FDF0F1' : '#F6F8FA', stroke: cd.bfm ? RED : '#DCE4EC', strokeWidth: cd.bfm ? 2 : 1.2 }),
            h('rect', { x: x + 12, y: y + 12, width: 40, height: 40, rx: 8, fill: cd.c }),
            cd.L ? h('text', { x: x + 32, y: y + 41, textAnchor: 'middle', fontSize: 26, fontWeight: 800, fill: '#FFFFFF', fontFamily: sans }, cd.L)
              : h('g', null, h('circle', { cx: x + 32, cy: y + 32, r: 12, fill: 'none', stroke: '#FFFFFF', strokeWidth: 3 }), h('circle', { cx: x + 32, cy: y + 32, r: 6, fill: 'none', stroke: '#FFFFFF', strokeWidth: 3 })),
            h('text', { x: x + 62, y: y + 30, fontSize: 15, fontWeight: 700, fill: '#141414', fontFamily: sans }, cd.t),
            h('text', { x: x + 62, y: y + 45, fontSize: 9, fontWeight: 600, letterSpacing: '.06em', fill: MUT, fontFamily: mono }, 'COBRE')),
          cd.bfm ? h('g', { style: pop(bad, .1) },
            h('rect', { x: x + 120, y: y + 16, width: 60, height: 18, rx: 9, fill: RED }),
            h('text', { x: x + 150, y: y + 28.5, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: '#FFFFFF', fontFamily: sans }, '✓ En BFM')) : null,
          cd.chip ? h('g', { style: pop(bad) },
            h('rect', { x: x + 112, y: y + 16, width: 68, height: 18, rx: 9, fill: '#1E6FC2', style: { animation: bad ? 'ct14-tub-pulse 1.4s ease-in-out infinite' : undefined } }),
            h('text', { x: x + 146, y: y + 28.5, textAnchor: 'middle', fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', fill: '#FFFFFF', fontFamily: mono }, cd.chip)) : null,
          cd.lines.map((ln, j) => h('g', { key: j, style: pop(lab, i * .12 + j * .1) },
            h('circle', { cx: x + 17, cy: y + 74 + j * 20, r: 3, fill: cd.c }),
            h('text', { x: x + 26, y: y + 78 + j * 20, fontSize: 10.5, fill: '#141414', fontFamily: sans }, ln))));
      }));
    }

    if (k === 6) {
      const arrow = (xa, xb, y, col, d) => h('g', { style: { transformBox: 'fill-box', transformOrigin: 'center', transform: lab ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .8s cubic-bezier(.3,.7,.3,1) ' + d + 's' } },
        h('line', { x1: xa + 6, y1: y, x2: xb - 6, y2: y, stroke: col, strokeWidth: 2.5 }),
        h('path', { d: 'M' + xa + ' ' + y + ' l8 -5 v10 Z M' + xb + ' ' + y + ' l-8 -5 v10 Z', fill: col }));
      return svg([
        h('line', { key: 'div', x1: 200, y1: 16, x2: 200, y2: 236, stroke: '#DCE4EC', strokeWidth: 1.5, strokeDasharray: '4 4' }),
        h('g', { key: 'L', style: pop(show) },
          h('text', { x: 110, y: 30, textAnchor: 'middle', fontSize: 20, fontWeight: 800, fill: '#141414', fontFamily: sans }, 'IPS'),
          h('text', { x: 110, y: 44, textAnchor: 'middle', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', fill: MUT, fontFamily: mono }, 'IRON PIPE SIZE'),
          h('text', { x: 110, y: 57, textAnchor: 'middle', fontSize: 10, fill: MUT, fontFamily: sans }, '(medida de tubo de hierro)'),
          h('circle', { cx: 110, cy: 120, r: 50, fill: '#F5F6F7', stroke: '#AEB5BB', strokeWidth: 2 }),
          h('circle', { cx: 110, cy: 120, r: 34, fill: '#FFFFFF', stroke: '#C9CFD4', strokeWidth: 1.5 })),
        h('g', { key: 'R', style: pop(show, .2) },
          h('text', { x: 290, y: 30, textAnchor: 'middle', fontSize: 20, fontWeight: 800, fill: '#141414', fontFamily: sans }, 'CTS'),
          h('text', { x: 290, y: 44, textAnchor: 'middle', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', fill: MUT, fontFamily: mono }, 'COPPER TUBE SIZE'),
          h('text', { x: 290, y: 57, textAnchor: 'middle', fontSize: 10, fill: MUT, fontFamily: sans }, '(medida de tubo de cobre)'),
          h('circle', { cx: 290, cy: 120, r: 44, fill: '#C9773F', stroke: '#8E4A22', strokeWidth: 2 }),
          h('circle', { cx: 290, cy: 120, r: 39, fill: '#FFFFFF', stroke: '#8E4A22', strokeWidth: 1.2 })),
        h('g', { key: 'ext', style: { opacity: lab ? 1 : 0, transition: 'opacity .4s' } },
          h('path', { d: 'M246 66 V120 M334 66 V120', stroke: RED, strokeWidth: 1.2, strokeDasharray: '3 3' })),
        h('g', { key: 'a1' }, arrow(76, 144, 120, BLUE, 0)),
        h('g', { key: 'a2' }, arrow(246, 334, 70, RED, .3)),
        h('g', { key: 'l1', style: pop(bad) },
          h('text', { x: 110, y: 196, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: BLUE, fontFamily: sans }, 'Medida = interior'),
          h('text', { x: 110, y: 214, textAnchor: 'middle', fontSize: 11, fill: MUT, fontFamily: sans }, 'PVC hidráulico y sanitario')),
        h('g', { key: 'l2', style: pop(bad, .2) },
          h('text', { x: 290, y: 196, textAnchor: 'middle', fontSize: 14, fontWeight: 700, fill: RED, fontFamily: sans }, 'Medida = exterior'),
          h('text', { x: 290, y: 214, textAnchor: 'middle', fontSize: 11, fill: MUT, fontFamily: sans }, 'Cobre y CPVC'))
      ]);
    }

    const cx = [196, 250, 304, 358];
    const rows = [[0, 'Hidráulica', 'PVC cédula 40', [1, 0, 1, 0]], [1, 'Sanitaria', 'Drenaje', [1, 0, 0, 0]], [2, 'CPVC', 'Amarillenta', [1, 1, 1, 0]], [3, 'Cobre', 'Metálica, rígida', [1, 1, 'calle', 1]]];
    return svg([
      h('g', { key: 'hd', style: { opacity: show ? 1 : 0, transition: 'opacity .4s' } }, ['FRÍA', 'CALIENTE', 'PRESIÓN', 'EXTERIOR'].map((t, j) => h('text', { key: j, x: cx[j], y: 24, textAnchor: 'middle', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', fill: MUT, fontFamily: mono }, t))),
      rows.map(([pi, name, sub, vals], i) => {
        const p = PIPES[pi], y = 56 + i * 46;
        return h('g', { key: 'r' + i },
          h('g', { style: pop(show, i * .12) },
            h('rect', { x: 10, y: y - 20, width: 380, height: 40, rx: 10, fill: '#F6F8FA' }),
            h('ellipse', { cx: 30, cy: y, rx: 7, ry: 14, fill: p.body, stroke: p.edge, strokeWidth: 1.2 }),
            h('ellipse', { cx: 30, cy: y, rx: 4.5, ry: 14 - Math.min(6, p.w), fill: p.inn }),
            h('text', { x: 46, y: y - 1, fontSize: 13, fontWeight: 700, fill: '#141414', fontFamily: sans }, name),
            h('text', { x: 46, y: y + 12, fontSize: 9.5, fill: MUT, fontFamily: sans }, sub)),
          vals.map((v, j) => h('g', { key: j, style: pop(lab, (i * 4 + j) * .08) },
            v === 'calle'
              ? [h('rect', { key: 'r', x: cx[j] - 22, y: y - 10, width: 44, height: 20, rx: 10, fill: OK }), h('text', { key: 't', x: cx[j], y: y + 4, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#FFFFFF', fontFamily: sans }, 'Calle')]
              : [h('circle', { key: 'c', cx: cx[j], cy: y, r: 11, fill: v ? OK : '#FBECEC', stroke: v ? OK : RED, strokeWidth: 1.2 }), h('text', { key: 't', x: cx[j], y: y + 4.5, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: v ? '#FFFFFF' : RED, fontFamily: sans }, v ? '✓' : '✗')])));
      }),
      h('text', { key: 'ft', x: 200, y: 248, textAnchor: 'middle', fontSize: 9.5, fontWeight: 600, letterSpacing: '.04em', fill: MUT, fontFamily: mono, style: { opacity: bad ? 1 : 0, transition: 'opacity .5s' } }, 'IPS: MEDIDA INTERIOR · CTS: MEDIDA EXTERIOR')
    ]);
  }
  renderVals() {
    const st = this.state.st, cur = Math.max(0, st), last = STEPS.length - 1;
    return {
      rootRef: this.rootRef, scene: this.scene(), replay: () => this.play(),
      curT: STEPS[cur][0], curN: String(cur + 1), total: String(STEPS.length),
      pct: (st < 0 ? 0 : (cur + 1) / STEPS.length * 100) + '%', barC: cur === last ? '#1E9E55' : '#DB011C',
      steps: STEPS.map(([t, d], k) => {
        const a = k === st, fin = k === last, c = fin ? '#1E9E55' : '#DB011C', past = a || k < st;
        return { n: fin ? '✓' : String(k + 1), t, d, lbl: fin ? 'RESUMEN' : 'PASO ' + (k + 1), lblC: c,
          bd: a ? c : '#DCE4EC', bg: a ? '#FFFFFF' : 'rgba(255,255,255,.55)', nbg: past ? c : '#E3EAF1', nfg: past ? '#FFFFFF' : '#5C5F63', go: () => this.go(k) };
      })
    };
  }
  render() {
    const h = React.createElement;
    const v = typeof this.renderVals === 'function' ? this.renderVals() : {};
    return h(React.Fragment, null, h("style", null, ConoceTuberias_CSS), h("section", { ref: v.rootRef, className: "ct14-root", style: { containerType: "inline-size", maxWidth: "1312px", margin: "0 auto", padding: "clamp(16px,3cqw,28px)", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "24px", background: "#F3F6F9", color: "#141414", fontFamily: "'Geist',system-ui,sans-serif" } }, h("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px 24px" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, h("span", { style: { font: "500 12px/1 'Geist Mono',monospace", letterSpacing: ".08em", color: "#DB011C" } }, "CAPACITACIÓN · PLOMERÍA"), h("h3", { style: { margin: "0", fontWeight: "600", fontSize: "clamp(26px,2.8cqw,36px)", lineHeight: "1.08", letterSpacing: "-.03em", textWrap: "balance" } }, "Conoce las tuberías"), h("p", { style: { margin: "0", fontSize: "15px", color: "#5C5F63", textWrap: "pretty" } }, "Cuál usar para agua fría, caliente, con presión o para drenaje.")), h("button", { type: "button", onClick: v.replay, style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1px solid #DCE4EC", borderRadius: "999px", background: "#FFFFFF", color: "#141414", font: "600 13px/1 'Geist',sans-serif", whiteSpace: "nowrap", cursor: "pointer" } }, "↻ Ver de nuevo")), h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "12px", alignItems: "start" } }, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", padding: "14px", borderRadius: "18px", background: "#FFFFFF" } }, v.scene, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", padding: "0 4px 4px" } }, h("span", { style: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px" } }, h("span", { style: { fontWeight: "600" } }, v.curT), h("span", { style: { color: "#5C5F63", whiteSpace: "nowrap" } }, "Paso ", v.curN, " de ", v.total)), h("span", { style: { display: "block", height: "6px", borderRadius: "999px", background: "#E3EAF1", overflow: "hidden" } }, h("span", { style: { display: "block", height: "100%", width: v.pct, borderRadius: "999px", background: v.barC, transition: "width .6s ease, background .4s" } })))), h("ol", { style: { listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "8px" } }, (v.steps || []).map((s, $index) => h(React.Fragment, { key: $index }, h("li", { style: { display: "flex", flexDirection: "column", borderRadius: "16px", border: ("1.5px solid " + String(s?.bd ?? "")), background: s?.bg, overflow: "hidden", transition: "background .3s, border-color .3s" } }, h("button", { type: "button", onClick: s?.go, style: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", border: "0", background: "transparent", color: "#141414", font: "inherit", textAlign: "left", cursor: "pointer" } }, h("span", { style: { flex: "none", width: "30px", height: "30px", display: "grid", placeItems: "center", borderRadius: "50%", background: s?.nbg, color: s?.nfg, fontWeight: "700", fontSize: "14px", transition: "background .3s, color .3s" } }, s?.n), h("span", { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" } }, h("span", { style: { font: "500 11px/1.2 'Geist Mono',monospace", letterSpacing: ".08em", color: s?.lblC } }, s?.lbl), h("span", { style: { fontWeight: "600", fontSize: "16px", lineHeight: "1.25" } }, s?.t), h("span", { style: { fontSize: "13px", lineHeight: "1.4", color: "#5C5F63", textWrap: "pretty" } }, s?.d))))))))));
  }
}

export default ConoceTuberias;
