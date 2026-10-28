/** Reloj inyectable: el año del código `PC-AAAA-NNNNN` sale de la hora de Colombia. */
export interface RelojPort {
  ahora(): Date;
}
