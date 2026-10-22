import Image from 'next/image';
import { MessageSquareText, ShoppingCart } from 'lucide-react';
import { ButtonLink, Carousel } from '@/core/components';
import heroStorefront from '../../../../assets/hero-storefront-D9L_fhlS.png';
import { heroSlides } from '../_data/home.content';

/**
 * Hero / banner principal (UI Spec §4.1, punto 2). El arte es decorativo: el
 * mensaje vive en texto real. Con una sola diapositiva el carrusel no muestra
 * flechas ni puntos; al agregar más en `heroSlides` aparecen solos.
 */
export function HeroSection() {
  const diapositivas = heroSlides.map((slide, indice) => {
    const Titulo = indice === 0 ? 'h1' : 'h2';

    return (
      <div key={slide.id} className="relative h-[28rem] overflow-hidden sm:h-[22rem] lg:h-[21.5rem]">
        <Image
          src={heroStorefront}
          alt=""
          fill
          priority={indice === 0}
          sizes="(min-width: 1280px) 1232px, 100vw"
          className="object-cover object-right"
        />
        {/* Garantiza el contraste del texto sobre el arte, sobre todo en móvil. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-corporate/65 lg:bg-transparent lg:bg-linear-to-r lg:from-corporate/30 lg:via-transparent lg:to-transparent"
        />
        <div className="relative z-10 flex h-full max-w-xl flex-col lg:max-w-2xl justify-center gap-4 px-6 sm:px-10 lg:px-14">
          <Titulo className="font-title text-3xl font-bold leading-tight text-neutral-white sm:text-4xl lg:text-[2.5rem]">
            {slide.titleLine1}
            <br />
            <span className="text-highlight">{slide.titleLine2}</span>
          </Titulo>
          <p className="max-w-md font-sans text-base text-neutral-white">{slide.description}</p>
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

  return <Carousel slides={diapositivas} ariaLabel="Banners destacados" className="rounded-card" />;
}
