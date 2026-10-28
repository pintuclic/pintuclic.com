import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { ContactoOrden, CrearContactoRequest, CrearNotaRequest, NotaOrden } from '../dtos/m08-ordenes.dto';
import type { NotasRepository } from '../interfaces/notas.interface';
import { ConsultaOrdenError } from './consulta-cliente.service';

/** HU-ORD-10 y HU-ORD-09-02: constancia de lo ocurrido con un pedido. Solo se añade, nunca se edita (R11). */
export class NotasService {
  constructor(private readonly repo: NotasRepository) {}

  async crearNota(codigo: string, nota: CrearNotaRequest, actor: Actor): Promise<NotaOrden> {
    const creada = await this.repo.agregarNota(codigo, actor.idUsuario, nota.texto);
    if (!creada) throw new ConsultaOrdenError();
    return { idNota: creada.idNota, texto: creada.texto, autor: creada.autor, fecha: creada.fecha.toISOString() };
  }

  /** Registra que el contacto se inició; no envía el mensaje (D3 del contrato). */
  async crearContacto(codigo: string, contacto: CrearContactoRequest, actor: Actor): Promise<ContactoOrden> {
    const creado = await this.repo.agregarContacto(codigo, actor.idUsuario, contacto.medio, contacto.detalle ?? null);
    if (!creado) throw new ConsultaOrdenError();
    return {
      idContacto: creado.idContacto,
      medio: creado.medio,
      detalle: creado.detalle,
      autor: creado.autor,
      fecha: creado.fecha.toISOString(),
    };
  }
}
