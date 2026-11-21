"use client";
import React from "react";

// Lo que necesitas para impermeabilizar — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido. Fotos en /public/bfm-assets/pintura/.

const A = "/bfm-assets/pintura/";
const C = "https://bfmpedidosv-2.vercel.app/cotizar";
const ITEMS = [
  { name: "Impersayer Aislamax Fibrado", note: "1 L por m²", imgs: [["aislamax-recorte.webp", "Cubeta Impersayer Aislamax"]], links: [["Cubeta 19 L", C + "?f=76&ver=8359"]] },
  { name: "Impersayer Sello", note: "1 L por 2 a 4 m²", imgs: [["sello-cubeta.webp", "Impersayer Sello cubeta 19 L"], ["sello-galon.webp", "Impersayer Sello galón 4 L"]], links: [["Galón 4 L", C + "?f=76&ver=9302"], ["Cubeta 19 L", C + "?f=76&ver=7770"]] },
  { name: "Resanador de grietas Kover", note: "si hay grietas", imgs: [["resanador-kover.webp", "Resanador de grietas Kover"]], links: [["1 L", C + "?c=305&ver=7915"], ["4 L", C + "?c=305&ver=8026"]] },
  { name: "Cepillo Pretul con bastón", note: "para limpiar y aplicar", imgs: [["cepillo-28002T.png", "Cepillo con bastón Pretul"]], links: [["Cepillo", "https://bfmpedidosv-2.vercel.app/cotizar?f=78&ver=28002T"]] },
  { name: "Rodillo Truper 9″ para superficies rugosas", note: "para el techo", imgs: [["rodillo-13879T.png", "Rodillo profesional Truper 9 pulgadas"]], links: [["Rodillo 9″", "https://bfmpedidosv-2.vercel.app/cotizar?ver=13879T"]] },
  { name: "Brocha Truper 4″", note: "para orillas y esquinas", imgs: [["brocha-14486T.png", "Brocha profesional Truper 4 pulgadas"]], links: [["Brocha 4″", "https://bfmpedidosv-2.vercel.app/cotizar?ver=14486T"]] }
];

export default function ProductosImpermeabilizante({ cotizarHref = C + "?f=76" }) {
  const h = React.createElement;
  const thumb = it => {
    const box = { flex: "none", width: 64, height: 64, borderRadius: 12, background: "#FFFFFF", border: "1px solid #EDEDEA", overflow: "hidden" };
    if (it.imgs.length === 2) return h("span", { style: Object.assign({ position: "relative" }, box) },
      h("img", { src: A + it.imgs[0][0], alt: it.imgs[0][1], style: { position: "absolute", left: 5, bottom: 5, height: 50, width: "auto" } }),
      h("img", { src: A + it.imgs[1][0], alt: it.imgs[1][1], style: { position: "absolute", right: 4, bottom: 5, height: 30, width: "auto" } }));
    if (it.imgs.length === 3) return h("span", { style: Object.assign({ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, padding: 4 }, box) },
      h("img", { src: A + it.imgs[0][0], alt: it.imgs[0][1], style: { gridColumn: "1 / -1", width: "100%", height: "100%", objectFit: "contain" } }),
      h("img", { src: A + it.imgs[1][0], alt: it.imgs[1][1], style: { width: "100%", height: "100%", objectFit: "contain" } }),
      h("img", { src: A + it.imgs[2][0], alt: it.imgs[2][1], style: { width: "100%", height: "100%", objectFit: "contain" } }));
    return h("span", { style: Object.assign({ display: "grid", placeItems: "center" }, box) }, h("img", { src: A + it.imgs[0][0], alt: it.imgs[0][1], style: { display: "block", height: 54, width: "auto", maxWidth: 54, objectFit: "contain" } }));
  };
  return h("div", { style: { display: "flex", flexDirection: "column", gap: 14, padding: 18, borderRadius: 18, background: "#FFFFFF", border: "1px solid #EDEDEA", color: "#141414", fontFamily: "Geist, system-ui, sans-serif" } },
    h("span", { style: { font: "500 12px/1 'Geist Mono', monospace", letterSpacing: ".08em", color: "#5C5F63" } }, "LO QUE NECESITAS"),
    h("ul", { style: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" } },
      ITEMS.map((it, i) => h("li", { key: i, style: { display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < ITEMS.length - 1 ? "1px solid #EDEDEA" : "none" } },
        thumb(it),
        h("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 } },
          h("span", { style: { fontWeight: 600, fontSize: 15, lineHeight: 1.3 } }, it.name),
          it.links.length ? h("span", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
            it.links.map(([t, href]) => h("a", { key: t, href, style: { padding: "4px 10px", borderRadius: 999, background: "#EEF4FA", color: "#1E6FC2", textDecoration: "none", fontSize: 12, fontWeight: 600 } }, t))) : null),
        h("span", { style: { fontSize: 14, color: "#5C5F63", textAlign: "right" } }, it.note)))),
    h("a", { href: cotizarHref, style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 56, padding: "0 26px", borderRadius: 16, background: "#DB011C", color: "#FFFFFF", textDecoration: "none", fontWeight: 600 } }, "Cotizar impermeabilizante"));
}
