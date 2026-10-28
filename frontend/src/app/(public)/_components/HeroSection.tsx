'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MessageSquareText, ShoppingCart } from 'lucide-react';
import { ButtonLink, Carousel } from '@/core/components';
import { landingBannersPublicoApi } from '@/core/landing/landing-banners-api';
import heroStorefront from '../../../../assets/hero-storefront-D9L_fhlS.png';
import { heroSlides, type HeroSlideContent } from '../_data/home.content';

const IMAGENES_HERO_RESPALDO: ReadonlyArray<string> = [
  '',
  '/images/landing/hero-slide-colores.png',
  '/images/landing/hero-slide-empresas.png',
];

/**
 * Hero / banner principal (UI Spec §4.1, punto 2).
 * Se inicializa con las diapositivas base para renderizado inmediato (SSR) y
 * sincroniza en cliente los sliders activos gestionados desde `/admin/banners`.
 * Cada diapositiva cuenta con su propia imagen de fondo o la subida por el admin.
 */
export function HeroSection() {
  const [slides, setSlides] = useState<ReadonlyArray<HeroSlideContent>>(heroSlides);

  useEffect(() => {
    let activo = true;
    landingBannersPublicoApi
      .listar()
      .then((banners) => {
        if (!activo || banners.length === 0) return;
        const mapeados: HeroSlideContent[] = banners.map((b) => {
          const idxRespaldo = Math.max(0, b.idBanner - 1);
          return {
            id: `banner-${b.idBanner}`,
            idBanner: b.idBanner,
            titleLine1: b.tituloLinea1,
            titleLine2: b.tituloLinea2 ?? '',
            description: b.descripcion,
            primaryCta: { label: b.textoBotonPrimario, href: b.enlaceBotonPrimario },
            secondaryCta: {
              label: b.textoBotonSecundario ?? 'Centro de ayuda',
              href: b.enlaceBotonSecundario ?? '/centro-de-ayuda',
            },
            customImageUrl: b.tieneImagenPersonalizada
              ? landingBannersPublicoApi.urlImagen(b.idBanner)
              : (IMAGENES_HERO_RESPALDO[idxRespaldo % IMAGENES_HERO_RESPALDO.length] || null),
          };
        });
        setSlides(mapeados);
      })
      .catch(() => {
        // Conserva las diapositivas base en caso de indisponibilidad de red.
      });

    return () => {
      activo = false;
    };
  }, []);

  const diapositivas = slides.map((slide, indice) => {
    const Titulo = indice === 0 ? 'h1' : 'h2';
    const imagenPersonalizadaORespaldo =
      slide.customImageUrl ?? (IMAGENES_HERO_RESPALDO[indice % IMAGENES_HERO_RESPALDO.length] || null);

    return (
      <div key={slide.id} className="relative h-[28rem] overflow-hidden sm:h-[22rem] lg:h-[21.5rem]">
        {imagenPersonalizadaORespaldo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagenPersonalizadaORespaldo} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
        ) : (
          <Image
            src={heroStorefront}
            alt=""
            fill
            priority={indice === 0}
            sizes="(min-width: 1536px) 1456px, 100vw"
            className="object-cover object-right"
          />
        )}
        {/* Garantiza el contraste del texto sobre el arte o la foto personalizada, sobre todo en móvil. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-corporate/70 lg:bg-transparent lg:bg-linear-to-r lg:from-corporate/80 lg:via-corporate/35 lg:to-transparent"
        />
        {/* En pantallas anchas el banner crece con el contenido (hasta 1536px): la columna de texto crece también, para
            que la primera línea del título no se parta (por ejemplo, "para" sola en otra línea). */}
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center gap-4 pl-12 pr-6 sm:pl-16 sm:pr-10 lg:max-w-3xl lg:pl-16 lg:pr-14 2xl:max-w-[52rem]">
          <Titulo className="font-title text-3xl font-bold leading-tight text-neutral-white sm:text-4xl lg:text-[2.5rem]">
            {slide.titleLine1}
            <br />
            <span className="text-highlight">{slide.titleLine2}</span>
          </Titulo>
          <p className="max-w-md font-sans text-base text-neutral-white/95">{slide.description}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink
              href={slide.primaryCta.href}
              variant="primary-conversion"
              size="lg"
              rightIcon={<ShoppingCart className="h-5 w-5" />}
            >
              {slide.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={slide.secondaryCta.href}
              variant="outline-light"
              size="lg"
              rightIcon={<MessageSquareText className="h-5 w-5" />}
            >
              {slide.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  });

  return <Carousel slides={diapositivas} ariaLabel="Banners destacados" autoPlayMs={6000} className="rounded-card" />;
}
