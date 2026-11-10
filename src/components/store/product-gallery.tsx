"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDir, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface GalleryImage {
  url: string;
  alt?: string | undefined;
}

/**
 * Swipeable 4:5 gallery with thumbnails (desktop) and dots (mobile). Embla handles RTL via `direction`,
 * so swiping and the thumbnail order flip correctly in Arabic.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const t = useT();
  const dir = useDir();
  const [viewport, embla] = useEmblaCarousel({ loop: false, direction: dir });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => embla && setSelected(embla.selectedScrollSnap()), [embla]);
  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect).on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect).off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  if (images.length === 0) return <div className="media-4x5" />;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 ? (
        <ul className="hidden shrink-0 flex-col gap-2 md:flex md:w-16" aria-label={t("product.thumbnails")}>
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => embla?.scrollTo(index)}
                aria-label={t("product.showImage", { n: index + 1 })}
                aria-current={selected === index}
                className={cn("relative block aspect-[4/5] w-full overflow-hidden bg-muted outline-offset-2", selected === index ? "ring-1 ring-foreground" : "opacity-70 hover:opacity-100")}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="overflow-hidden" ref={viewport}>
          <div className="flex" style={{ touchAction: "pan-y pinch-zoom" }}>
            {images.map((image, index) => (
              <div key={image.url} className="media-4x5 min-w-0 flex-[0_0_100%]">
                <Image
                  src={image.url}
                  alt={image.alt ?? `${title} — ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {images.map((image, index) => (
              <span key={image.url} className={cn("h-1 rounded-full transition-all duration-200", selected === index ? "w-6 bg-foreground" : "w-1.5 bg-border")} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
