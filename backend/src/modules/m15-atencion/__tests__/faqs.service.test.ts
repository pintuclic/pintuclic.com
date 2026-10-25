import { beforeEach, describe, expect, it } from 'vitest';
import type { CrearFaqRequest, EditarFaqRequest, PreguntaFrecuente } from '../dtos/m15-atencion.dto';
import type { FaqsRepositoryPort, FiltroFaqsAdmin, PaginaFaqs } from '../interfaces/atencion.interface';
import { AtencionError } from '../services/atencion.error';
import { FaqsService } from '../services/faqs.service';

const FECHA = '2026-10-26T13:00:00.000Z';

function pregunta(
  idPregunta: number,
  tema: string,
  orden: number,
  activa = true,
): PreguntaFrecuente {
  return {
    idPregunta,
    tema,
    pregunta: `Pregunta ${idPregunta}`,
    respuesta: `Respuesta ${idPregunta}`,
    orden,
    activa,
    fechaCreacion: FECHA,
    fechaActualizacion: FECHA,
  };
}

class FaqsRepositorioFalso implements FaqsRepositoryPort {
  constructor(public filas: PreguntaFrecuente[]) {}

  reordenamientos: number[][] = [];

  private ordenadas(filas: PreguntaFrecuente[]): PreguntaFrecuente[] {
    return [...filas].sort(
      (a, b) => a.tema.localeCompare(b.tema) || a.orden - b.orden || a.idPregunta - b.idPregunta,
    );
  }

  async listarPublicas(): Promise<PreguntaFrecuente[]> {
    return this.ordenadas(this.filas.filter((fila) => fila.activa));
  }

  async listarAdmin(filtro: FiltroFaqsAdmin): Promise<PaginaFaqs> {
    const filtradas = this.ordenadas(
      this.filas
        .filter((fila) => filtro.tema === undefined || fila.tema === filtro.tema)
        .filter((fila) => filtro.incluirInactivas || fila.activa),
    );
    const inicio = (filtro.pagina - 1) * filtro.limite;
    return { items: filtradas.slice(inicio, inicio + filtro.limite), total: filtradas.length };
  }

  async obtener(idPregunta: number): Promise<PreguntaFrecuente | null> {
    return this.filas.find((fila) => fila.idPregunta === idPregunta) ?? null;
  }

  async crear(datos: CrearFaqRequest): Promise<PreguntaFrecuente> {
    const nueva = { ...pregunta(99, datos.tema, datos.orden), ...datos, idPregunta: 99 };
    this.filas.push(nueva);
    return nueva;
  }

  async actualizar(idPregunta: number, datos: EditarFaqRequest): Promise<PreguntaFrecuente> {
    const indice = this.filas.findIndex((fila) => fila.idPregunta === idPregunta);
    const actualizada: PreguntaFrecuente = {
      ...this.filas[indice]!,
      ...(datos.tema === undefined ? {} : { tema: datos.tema }),
      ...(datos.pregunta === undefined ? {} : { pregunta: datos.pregunta }),
      ...(datos.respuesta === undefined ? {} : { respuesta: datos.respuesta }),
      ...(datos.orden === undefined ? {} : { orden: datos.orden }),
    };
    this.filas[indice] = actualizada;
    return actualizada;
  }

  async cambiarActiva(idPregunta: number, activa: boolean): Promise<PreguntaFrecuente> {
    const indice = this.filas.findIndex((fila) => fila.idPregunta === idPregunta);
    const actualizada = { ...this.filas[indice]!, activa };
    this.filas[indice] = actualizada;
    return actualizada;
  }

  async eliminar(idPregunta: number): Promise<void> {
    this.filas = this.filas.filter((fila) => fila.idPregunta !== idPregunta);
  }

  async idsDelTema(tema: string): Promise<number[]> {
    return this.filas.filter((fila) => fila.tema === tema).map((fila) => fila.idPregunta);
  }

  async reordenar(ordenIds: number[]): Promise<void> {
    this.reordenamientos.push(ordenIds);
    ordenIds.forEach((idPregunta, indice) => {
      const posicion = this.filas.findIndex((fila) => fila.idPregunta === idPregunta);
      this.filas[posicion] = { ...this.filas[posicion]!, orden: indice + 1 };
    });
  }
}

describe('FaqsService (HU-ATC-01)', () => {
  let repo: FaqsRepositorioFalso;
  let servicio: FaqsService;

  beforeEach(() => {
    repo = new FaqsRepositorioFalso([
      pregunta(1, 'Envíos y entregas', 2),
      pregunta(2, 'Envíos y entregas', 1),
      pregunta(3, 'Pedidos y pagos', 1),
      pregunta(4, 'Pedidos y pagos', 2, false),
    ]);
    servicio = new FaqsService(repo);
  });

  describe('listado público (R1, R2)', () => {
    it('omite las inactivas y no filtra nada más', async () => {
      const publicas = await servicio.listarPublicas();

      expect(publicas.map((p) => p.idPregunta)).toEqual([2, 1, 3]);
    });

    it('agrupa por tema y ordena dentro del tema (CA-ATC-01-03)', async () => {
      const publicas = await servicio.listarPublicas();

      expect(publicas.map((p) => `${p.tema}#${p.orden}`)).toEqual([
        'Envíos y entregas#1',
        'Envíos y entregas#2',
        'Pedidos y pagos#1',
      ]);
    });

    it('no expone los metadatos administrativos', async () => {
      const [primera] = await servicio.listarPublicas();

      expect(primera).toBeDefined();
      expect(Object.keys(primera!).sort()).toEqual([
        'idPregunta',
        'orden',
        'pregunta',
        'respuesta',
        'tema',
      ]);
    });
  });

  describe('desactivar (CA-ATC-01-02)', () => {
    it('oculta la pregunta sin eliminarla', async () => {
      await servicio.cambiarActiva(1, false);

      const publicas = await servicio.listarPublicas();
      expect(publicas.map((p) => p.idPregunta)).not.toContain(1);
      expect(repo.filas.map((f) => f.idPregunta)).toContain(1);
    });
  });

  describe('reordenar un tema', () => {
    it('fija el orden según la posición recibida', async () => {
      await servicio.reordenar({ tema: 'Envíos y entregas', ordenIds: [1, 2] });

      expect(repo.filas.find((f) => f.idPregunta === 1)?.orden).toBe(1);
      expect(repo.filas.find((f) => f.idPregunta === 2)?.orden).toBe(2);
    });

    it('rechaza una lista parcial: dejaría el tema con posiciones repetidas', async () => {
      await expect(servicio.reordenar({ tema: 'Envíos y entregas', ordenIds: [1] })).rejects.toThrow(
        AtencionError,
      );
      expect(repo.reordenamientos).toEqual([]);
    });

    it('rechaza ids repetidos', async () => {
      await expect(
        servicio.reordenar({ tema: 'Envíos y entregas', ordenIds: [1, 1] }),
      ).rejects.toThrow(AtencionError);
    });

    it('rechaza una pregunta de otro tema', async () => {
      await expect(
        servicio.reordenar({ tema: 'Envíos y entregas', ordenIds: [1, 3] }),
      ).rejects.toThrow(AtencionError);
      expect(repo.reordenamientos).toEqual([]);
    });

    it('un tema inexistente responde 404 opaco (R11)', async () => {
      await expect(servicio.reordenar({ tema: 'No existe', ordenIds: [1] })).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });
  });

  describe('operaciones sobre una pregunta inexistente (R11)', () => {
    it('editar responde 404 opaco', async () => {
      await expect(servicio.editar(404, { tema: 'Otro' })).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });

    it('desactivar responde 404 opaco', async () => {
      await expect(servicio.cambiarActiva(404, false)).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
      });
    });

    it('eliminar responde 404 opaco y no borra nada', async () => {
      await expect(servicio.eliminar(404)).rejects.toMatchObject({ status: 404 });
      expect(repo.filas).toHaveLength(4);
    });
  });
});
