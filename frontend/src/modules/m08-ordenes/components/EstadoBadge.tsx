import { Badge } from '@/core/components';
import type { EstadoOrden } from '../dtos/m08-ordenes.dto';
import { ETIQUETA_ESTADO, varianteEstado } from '../services/presentacion';

export function EstadoBadge({ estado }: { estado: EstadoOrden }) {
  return (
    <Badge variant={varianteEstado(estado)} pill>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  );
}
