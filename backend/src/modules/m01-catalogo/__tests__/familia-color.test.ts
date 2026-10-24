import { describe, expect, it } from "vitest";
import {
  derivarFamilia,
  distanciaColor,
  hexALab,
  type MuestraFamilia,
} from "../services/familia-color";

/** Las muestras de las familias sembradas en el seed (esquema 4.4). */
const FAMILIAS: MuestraFamilia[] = [
  { idFamiliaColor: 1, hexadecimal: "#F5F1EA" }, // Blancos
  { idFamiliaColor: 2, hexadecimal: "#8E9295" }, // Grises y negros
  { idFamiliaColor: 3, hexadecimal: "#F5D430" }, // Amarillos
  { idFamiliaColor: 4, hexadecimal: "#F08A24" }, // Naranjas
  { idFamiliaColor: 5, hexadecimal: "#D7263D" }, // Rojos
  { idFamiliaColor: 6, hexadecimal: "#8E5A9B" }, // Rosados y morados
  { idFamiliaColor: 7, hexadecimal: "#3B6EA5" }, // Azules
  { idFamiliaColor: 8, hexadecimal: "#1FA34A" }, // Verdes
  { idFamiliaColor: 9, hexadecimal: "#A67C52" }, // Tierras y cafés
];

describe("hexALab (sRGB → CIELAB)", () => {
  it("el blanco es L=100 y el negro L=0, ambos sin croma", () => {
    const blanco = hexALab("#FFFFFF");
    expect(blanco.l).toBeCloseTo(100, 0);
    expect(Math.abs(blanco.a)).toBeLessThan(0.5);
    const negro = hexALab("#000000");
    expect(negro.l).toBeCloseTo(0, 1);
  });

  it("un rojo puro tiene a* alto y un azul puro tiene b* negativo", () => {
    expect(hexALab("#FF0000").a).toBeGreaterThan(60);
    expect(hexALab("#0000FF").b).toBeLessThan(-80);
  });
});

describe("distanciaColor", () => {
  it("es 0 entre un color y sí mismo y simétrica", () => {
    expect(distanciaColor("#336699", "#336699")).toBe(0);
    expect(distanciaColor("#336699", "#CC9966")).toBeCloseTo(
      distanciaColor("#CC9966", "#336699"),
      10,
    );
  });
});

describe("derivarFamilia (D8)", () => {
  it.each([
    ["la muestra de Rojos", "#D7263D", 5],
    ["Azul Océano", "#2F6E9E", 7],
    ["Azul Marino", "#1F2F55", 7],
    ["Verde Bosque", "#2E5E3A", 8],
    ["Verde Menta", "#B8E2C8", 8],
    ["Negro", "#111111", 2],
    ["Gris Carbón", "#3B3D3F", 2],
    ["Blanco Puro", "#F7F5EF", 1],
    ["Amarillo Sol", "#F7C600", 3],
    ["Naranja Mandarina", "#F28C28", 4],
    ["Rojo Carmesí", "#A3161E", 5],
  ])("%s (%s) → familia %i", (_nombre, hex, esperada) => {
    expect(derivarFamilia(hex, FAMILIAS)).toBe(esperada);
  });

  it("sin familias no hay familia (null)", () => {
    expect(derivarFamilia("#FF0000", [])).toBeNull();
  });

  it("solo usa las familias recibidas, sin importar cómo se llamen ni cuántas haya", () => {
    expect(
      derivarFamilia("#2F6E9E", [
        { idFamiliaColor: 42, hexadecimal: "#1F2F55" },
      ]),
    ).toBe(42);
    expect(
      derivarFamilia("#2F6E9E", [FAMILIAS[0]!, FAMILIAS[5]!]),
    ).not.toBeNull();
  });

  it("es determinista: el mismo color siempre da la misma familia", () => {
    expect(derivarFamilia("#B5573B", FAMILIAS)).toBe(
      derivarFamilia("#B5573B", FAMILIAS),
    );
  });
});
