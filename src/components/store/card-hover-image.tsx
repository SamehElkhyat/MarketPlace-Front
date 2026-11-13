"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface CardHoverImageProps {
  src: string;
  sizes: string;
}

/**
 * The alternate photo shown on hover. It is NOT in the DOM until the pointer or keyboard focus first
 * reaches the card (the nearest `.group`), so a listing of 24 products downloads 24 images, not 48 — and
 * phones never pay for a photo they cannot reveal. The cross-fade itself is CSS-only (opacity: compositor
 * friendly, no layout work). Zero layout shift: it is absolutely positioned inside the card's fixed 4:5 box.
 */
export function CardHoverImage({ src, sizes }: CardHoverImageProps) {
  const [armed, setArmed] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = anchor.current?.closest(".group");
    if (!card) return;
    const arm = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType === "touch") return; // touch can't hover
      setArmed(true);
    };
    card.addEventListener("pointerenter", arm, { once: true });
    card.addEventListener("focusin", arm, { once: true });
    return () => {
      card.removeEventListener("pointerenter", arm);
      card.removeEventListener("focusin", arm);
    };
  }, []);

  return (
    <>
      <span ref={anchor} hidden aria-hidden />
      {armed ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          aria-hidden
          className="object-cover opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
        />
      ) : null}
    </>
  );
}
