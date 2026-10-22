import type { DateProviderPort } from '../interfaces/date-provider.port';

export class SistemaDateProviderAdapter implements DateProviderPort {
  ahora(): Date {
    return new Date();
  }
}

export class SimuladoDateProviderAdapter implements DateProviderPort {
  private fechaActual: Date;

  constructor(fechaInicial: Date = new Date()) {
    this.fechaActual = new Date(fechaInicial.getTime());
  }

  ahora(): Date {
    return new Date(this.fechaActual.getTime());
  }

  fijarFecha(fecha: Date): void {
    this.fechaActual = new Date(fecha.getTime());
  }

  avanzarSegundos(segundos: number): void {
    this.fechaActual = new Date(this.fechaActual.getTime() + segundos * 1000);
  }

  avanzarMinutos(minutos: number): void {
    this.avanzarSegundos(minutos * 60);
  }
}
