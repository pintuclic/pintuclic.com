/** El estado de la página de paleta, tal como viaja en la dirección (contrato M01 · P5). */
export interface EstadoPaleta {
  familia: number | null;
  idMarca: number | null;
  q: string;
  color: number | null;
}

const entero = (valor: string | null): number | null => {
  if (valor === null || !/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export function paletaDesdeUrl(params: { get: (nombre: string) => string | null }): EstadoPaleta {
  return {
    familia: entero(params.get('familia')),
    idMarca: entero(params.get('marca')),
    q: (params.get('q') ?? '').slice(0, 100),
    color: entero(params.get('color')),
  };
}

/** `?familia=&marca=&q=&color=`, sin los vacíos; cadena vacía si no hay nada. */
export function paletaAUrl(estado: EstadoPaleta): string {
  const p = new URLSearchParams();
  if (estado.familia !== null) p.set('familia', String(estado.familia));
  if (estado.idMarca !== null) p.set('marca', String(estado.idMarca));
  if (estado.q.trim() !== '') p.set('q', estado.q.trim());
  if (estado.color !== null) p.set('color', String(estado.color));
  const texto = p.toString();
  return texto === '' ? '' : `?${texto}`;
}
