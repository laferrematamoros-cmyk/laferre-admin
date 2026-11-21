"use client";
import React, { useState } from "react";

// Calculadora de cubetas + tips para impermeabilizar — BFM Bodega Ferretera de Monterrey
// Componente React autocontenido (sin dependencias).
// Rendimiento: 1 L por m² a dos manos (0.5 L por mano). Cubeta de 19 L.
// Props opcionales: litrosPorCubeta (19), litrosPorM2 (1).

const h = React.createElement;

const TIPS = [
  ["La malla no es obligatoria.", "Úsala sólo en puntos críticos: chaflanes, bajadas de agua y bases de domo."],
  ["Elige bien el momento.", "No apliques si amenaza lluvia, con charcos o con el techo muy caliente: lo ideal es entre 10 °C y 30 °C. En Matamoros, mejor temprano en la mañana."],
];

const mono = "500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace";

export function CalculadoraCubetas({ litrosPorCubeta = 19, litrosPorM2 = 1 }) {
  const [m2, setM2] = useState("");
  const n = parseFloat(m2);
  const ok = n > 0;
  const need = ok ? Math.ceil(n * litrosPorM2) : 0;
  const cub = ok ? Math.ceil(need / litrosPorCubeta) : 0;
  const left = cub * litrosPorCubeta - need;
  const nota = !ok ? "" : "Usarás " + need + " L" + (left > 0
    ? " y te sobran " + left + " L para retoques o una tercera mano en puntos críticos"
    : ", justo lo de " + (cub === 1 ? "la cubeta" : "las cubetas"));

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 14, padding: 18, borderRadius: 18, background: "#FFFFFF", border: "1px solid #DCE8F5", color: "#141414" } },
    h("span", { style: { font: mono, letterSpacing: ".08em", color: "#1E6FC2" } }, "CALCULA TUS CUBETAS"),
    h("label", { style: { display: "flex", flexDirection: "column", gap: 8 } },
      h("span", { style: { fontWeight: 600, fontSize: 15 } }, "¿Cuántos metros cuadrados vas a impermeabilizar?"),
      h("span", { style: { display: "flex", alignItems: "center", gap: 10 } },
        h("input", {
          type: "number", inputMode: "decimal", min: "1", step: "1", placeholder: "Ej. 18",
          value: m2, onChange: (e) => setM2(e.target.value),
          style: { flex: 1, minWidth: 0, minHeight: 52, padding: "0 16px", borderRadius: 14, border: "1px solid #D9D9D5", background: "#F6F6F4", fontFamily: "inherit", fontWeight: 600, fontSize: 20, color: "#141414", outline: "none" }
        }),
        h("span", { style: { fontWeight: 600, fontSize: 17, color: "#5C5F63" } }, "m²"))),
    ok ? h("div", { style: { display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 14, background: "#1E6FC2", color: "#FFFFFF" } },
      h("span", { style: { fontWeight: 700, fontSize: 44, lineHeight: 1, letterSpacing: "-.04em" } }, cub),
      h("span", { style: { display: "flex", flexDirection: "column", gap: 2 } },
        h("span", { style: { fontWeight: 600, fontSize: 17 } }, (cub === 1 ? "cubeta de " : "cubetas de ") + litrosPorCubeta + " L"),
        h("span", { style: { fontSize: 13, opacity: 0.9 } }, nota))) : null,
    h("span", { style: { fontSize: 12, lineHeight: 1.4, color: "#5C5F63" } },
      "Cálculo a dos manos (1 L por m²) sobre superficie lisa y sellada. Si tu techo es rugoso, considera un poco más."));
}

export function TipsImpermeabilizar() {
  return h("div", { style: { display: "flex", flexDirection: "column", padding: "16px 18px 6px", borderRadius: 18, background: "#FFF8E6", border: "1px solid #F3E3B5", color: "#141414" } },
    h("span", { style: { font: mono, letterSpacing: ".08em", color: "#8A6A12", paddingBottom: 12 } }, "TIPS PARA IMPERMEABILIZAR"),
    h("ul", { style: { listStyle: "none", margin: 0, padding: 0 } },
      TIPS.map(([titulo, texto]) => h("li", { key: titulo, style: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderTop: "1px solid #F0E6C8" } },
        h("span", { "aria-hidden": "true", style: { flex: "none", width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: "#FFFFFF", fontSize: 13 } }, "💡"),
        h("span", { style: { fontSize: 14, lineHeight: 1.45 } }, h("strong", { style: { fontWeight: 600 } }, titulo), " " + texto)))));
}

export default function CalculadoraYTipsImpermeabilizante(props) {
  return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 12, alignItems: "start" } },
    h(CalculadoraCubetas, props),
    h(TipsImpermeabilizar));
}
