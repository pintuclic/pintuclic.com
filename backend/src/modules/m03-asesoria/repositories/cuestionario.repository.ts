import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  CrearOpcionRequest,
  CrearPreguntaRequest,
  EditarOpcionRequest,
  EditarPreguntaRequest,
  EfectoOpcion,
  OpcionAdmin,
  PreguntaAdmin,
} from '../dtos/cuestionario.dto';
import type { CuestionarioRepositoryPort } from '../interfaces/cuestionario.interface';

/** Fila de efecto tal como la guarda la base; el `CHECK` del DDL garantiza su forma. */
type FilaEfecto = {
  tipo: 'filtrar' | 'filtrar_ambiente' | 'incluir';
  dimension: string | null;
  idObjetivo: number | null;
  ambiente: 'interior' | 'exterior' | null;
  requiereOpciones: number[];
};

const seleccionOpcion = {
  idOpcion: true,
  texto: true,
  orden: true,
  estado: true,
  efectos: {
    select: {
      tipo: true,
      dimension: true,
      idObjetivo: true,
      ambiente: true,
      requiereOpciones: true,
    },
    orderBy: { idEfecto: 'asc' },
  },
} satisfies Prisma.OpcionAsesoriaSelect;

/**
 * Traduce una fila de efecto al tipo del contrato.
 *
 * El `CHECK` `ck_efecto_asesoria_forma` ya impide guardar una fila incoherente, así que los
 * casos imposibles devuelven `null` y se descartan en lugar de romper el flujo de quien
 * está respondiendo (F4).
 */
function aEfecto(fila: FilaEfecto): EfectoOpcion | null {
  if (fila.tipo === 'filtrar_ambiente') {
    return fila.ambiente === null ? null : { tipo: 'filtrar_ambiente', ambiente: fila.ambiente };
  }

  if (fila.dimension === null || fila.idObjetivo === null) return null;

  if (fila.tipo === 'filtrar') {
    const dimension = fila.dimension;
    if (
      dimension !== 'categoria' &&
      dimension !== 'subcategoria' &&
      dimension !== 'superficie' &&
      dimension !== 'familia_color' &&
      dimension !== 'tipo_resina' &&
      dimension !== 'linea'
    ) {
      return null;
    }
    return { tipo: 'filtrar', dimension, idObjetivo: fila.idObjetivo };
  }

  if (fila.dimension !== 'categoria' && fila.dimension !== 'subcategoria') return null;
  return {
    tipo: 'incluir',
    dimension: fila.dimension,
    idObjetivo: fila.idObjetivo,
    requiereOpciones: fila.requiereOpciones,
  };
}

function aOpcion(fila: {
  idOpcion: number;
  texto: string;
  orden: number;
  estado: string;
  efectos: FilaEfecto[];
}): OpcionAdmin {
  const efectos: EfectoOpcion[] = [];
  for (const e of fila.efectos) {
    const efecto = aEfecto(e);
    if (efecto !== null) efectos.push(efecto);
  }
  return {
    idOpcion: fila.idOpcion,
    texto: fila.texto,
    orden: fila.orden,
    activa: fila.estado === 'activo',
    efectos,
  };
}

function aEfectoData(idOpcion: number, efecto: EfectoOpcion): Prisma.EfectoOpcionAsesoriaCreateManyInput {
  if (efecto.tipo === 'filtrar_ambiente') {
    return { idOpcion, tipo: 'filtrar_ambiente', ambiente: efecto.ambiente, requiereOpciones: [] };
  }
  if (efecto.tipo === 'filtrar') {
    return {
      idOpcion,
      tipo: 'filtrar',
      dimension: efecto.dimension,
      idObjetivo: efecto.idObjetivo,
      requiereOpciones: [],
    };
  }
  return {
    idOpcion,
    tipo: 'incluir',
    dimension: efecto.dimension,
    idObjetivo: efecto.idObjetivo,
    requiereOpciones: [...efecto.requiereOpciones],
  };
}

export class PrismaCuestionarioRepository implements CuestionarioRepositoryPort {
  async listarPublicas(): Promise<PreguntaAdmin[]> {
    const preguntas = await prisma.preguntaAsesoria.findMany({
      where: { estado: 'activo' },
      orderBy: [{ orden: 'asc' }, { idPregunta: 'asc' }],
      select: {
        idPregunta: true,
        texto: true,
        orden: true,
        estado: true,
        origenOpciones: true,
        opciones: {
          where: { estado: 'activo' },
          orderBy: [{ orden: 'asc' }, { idOpcion: 'asc' }],
          select: seleccionOpcion,
        },
      },
    });
    return preguntas.map((p) => ({
      idPregunta: p.idPregunta,
      texto: p.texto,
      orden: p.orden,
      activa: true,
      origenOpciones: p.origenOpciones,
      opciones: p.opciones.map(aOpcion),
    }));
  }

  async listarTodas(): Promise<PreguntaAdmin[]> {
    const preguntas = await prisma.preguntaAsesoria.findMany({
      orderBy: [{ orden: 'asc' }, { idPregunta: 'asc' }],
      select: {
        idPregunta: true,
        texto: true,
        orden: true,
        estado: true,
        origenOpciones: true,
        opciones: {
          orderBy: [{ orden: 'asc' }, { idOpcion: 'asc' }],
          select: seleccionOpcion,
        },
      },
    });
    return preguntas.map((p) => ({
      idPregunta: p.idPregunta,
      texto: p.texto,
      orden: p.orden,
      activa: p.estado === 'activo',
      origenOpciones: p.origenOpciones,
      opciones: p.opciones.map(aOpcion),
    }));
  }

  async obtenerPregunta(idPregunta: number): Promise<PreguntaAdmin | null> {
    const p = await prisma.preguntaAsesoria.findUnique({
      where: { idPregunta },
      select: {
        idPregunta: true,
        texto: true,
        orden: true,
        estado: true,
        origenOpciones: true,
        opciones: { orderBy: [{ orden: 'asc' }], select: seleccionOpcion },
      },
    });
    if (p === null) return null;
    return {
      idPregunta: p.idPregunta,
      texto: p.texto,
      orden: p.orden,
      activa: p.estado === 'activo',
      origenOpciones: p.origenOpciones,
      opciones: p.opciones.map(aOpcion),
    };
  }

  async crearPregunta(datos: CrearPreguntaRequest): Promise<PreguntaAdmin> {
    const creada = await prisma.preguntaAsesoria.create({
      data: { texto: datos.texto, orden: datos.orden, origenOpciones: datos.origenOpciones },
      select: { idPregunta: true },
    });
    const pregunta = await this.obtenerPregunta(creada.idPregunta);
    // Recién creada: no puede faltar.
    if (pregunta === null) throw new Error('No se pudo leer la pregunta recién creada');
    return pregunta;
  }

  async editarPregunta(idPregunta: number, datos: EditarPreguntaRequest): Promise<PreguntaAdmin | null> {
    const existe = await prisma.preguntaAsesoria.findUnique({
      where: { idPregunta },
      select: { idPregunta: true },
    });
    if (existe === null) return null;

    await prisma.preguntaAsesoria.update({
      where: { idPregunta },
      data: {
        ...(datos.texto === undefined ? {} : { texto: datos.texto }),
        ...(datos.orden === undefined ? {} : { orden: datos.orden }),
        // F5: no se borra, se desactiva.
        ...(datos.activa === undefined ? {} : { estado: datos.activa ? 'activo' : 'inactivo' }),
        fechaActualizacion: new Date(),
      },
    });
    return this.obtenerPregunta(idPregunta);
  }

  async obtenerOpcion(idOpcion: number): Promise<OpcionAdmin | null> {
    const o = await prisma.opcionAsesoria.findUnique({ where: { idOpcion }, select: seleccionOpcion });
    return o === null ? null : aOpcion(o);
  }

  async crearOpcion(idPregunta: number, datos: CrearOpcionRequest): Promise<OpcionAdmin | null> {
    const pregunta = await prisma.preguntaAsesoria.findUnique({
      where: { idPregunta },
      select: { origenOpciones: true },
    });
    // F3: una pregunta de familias cromáticas no lleva opciones propias.
    if (pregunta === null || pregunta.origenOpciones === 'familias_color') return null;

    const creada = await prisma.opcionAsesoria.create({
      data: { idPregunta, texto: datos.texto, orden: datos.orden },
      select: seleccionOpcion,
    });
    return aOpcion(creada);
  }

  async editarOpcion(idOpcion: number, datos: EditarOpcionRequest): Promise<OpcionAdmin | null> {
    const existe = await prisma.opcionAsesoria.findUnique({
      where: { idOpcion },
      select: { idOpcion: true },
    });
    if (existe === null) return null;

    const actualizada = await prisma.opcionAsesoria.update({
      where: { idOpcion },
      data: {
        ...(datos.texto === undefined ? {} : { texto: datos.texto }),
        ...(datos.orden === undefined ? {} : { orden: datos.orden }),
        ...(datos.activa === undefined ? {} : { estado: datos.activa ? 'activo' : 'inactivo' }),
      },
      select: seleccionOpcion,
    });
    return aOpcion(actualizada);
  }

  async reemplazarEfectos(idOpcion: number, efectos: readonly EfectoOpcion[]): Promise<OpcionAdmin | null> {
    const existe = await prisma.opcionAsesoria.findUnique({
      where: { idOpcion },
      select: { idOpcion: true },
    });
    if (existe === null) return null;

    // En una transacción: si falla la inserción, la opción no se queda sin sus efectos.
    await prisma.$transaction([
      prisma.efectoOpcionAsesoria.deleteMany({ where: { idOpcion } }),
      prisma.efectoOpcionAsesoria.createMany({
        data: efectos.map((e) => aEfectoData(idOpcion, e)),
      }),
    ]);

    return this.obtenerOpcion(idOpcion);
  }
}
