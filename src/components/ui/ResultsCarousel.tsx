"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

const slides = [
  {
    src: "/images/resultado-demo-masculino-limpo-v1.webp",
    alt: "Exemplo ilustrativo masculino de evolução física, com antes e depois",
  },
  {
    src: "/images/resultado-demo-feminino-v1.webp",
    alt: "Exemplo ilustrativo feminino de evolução física, com antes e depois",
  },
];

export function ResultsCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStart = useRef<number | null>(null);

  const showSlide = (index: number) => {
    setActiveSlide((index + slides.length) % slides.length);
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStart.current === null) return;
    const movement = clientX - touchStart.current;
    if (Math.abs(movement) > 45) showSlide(activeSlide + (movement < 0 ? 1 : -1));
    touchStart.current = null;
  };

  const slide = slides[activeSlide];

  return (
    <figure
      className="before-after-example"
      aria-roledescription="carrossel"
      aria-label="Exemplos de evolução física"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") showSlide(activeSlide - 1);
        if (event.key === "ArrowRight") showSlide(activeSlide + 1);
      }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
    >
      <div className="before-after-media" aria-live="polite">
        <Image src={slide.src} alt={slide.alt} fill sizes="(max-width: 680px) 100vw, 1120px" unoptimized />

        <button className="result-carousel-arrow previous" type="button" onClick={() => showSlide(activeSlide - 1)} aria-label="Ver resultado anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <button className="result-carousel-arrow next" type="button" onClick={() => showSlide(activeSlide + 1)} aria-label="Ver próximo resultado">
          <ChevronRight aria-hidden="true" />
        </button>

        <span className="result-carousel-count">{activeSlide + 1} de {slides.length}</span>
      </div>

      <figcaption>
        <div>
          <strong>Demonstração de layout</strong>
          <p>Imagem ilustrativa. Substituir por um resultado real e autorizado antes da publicação.</p>
        </div>
        <div className="result-carousel-dots" aria-label="Escolher resultado">
          {slides.map((item, index) => (
            <button
              key={item.src}
              type="button"
              className={index === activeSlide ? "active" : ""}
              onClick={() => showSlide(index)}
              aria-label={`Ver resultado ${index + 1}`}
              aria-current={index === activeSlide ? "true" : undefined}
            />
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
