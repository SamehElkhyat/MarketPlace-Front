interface LoaderProps {
  src: string;
  width: number;
  quality?: number;
}

const CLOUDINARY_HOST = "res.cloudinary.com";
const PICSUM = /^(https:\/\/picsum\.photos\/seed\/[^/]+)\/\d+\/\d+(\?.*)?$/;

/**
 * `next/image` loader that lets the image CDN do the resizing instead of Vercel's metered optimiser:
 *  - Cloudinary → `f_auto,q_auto,w_<width>` (format negotiation + resize at the edge)
 *  - Picsum demo photos (seed data) → a 4:5 crop at the requested width
 *  - anything else → the original URL with a `w` hint (so the contract "implement width" holds)
 */
export default function imageLoader({ src, width, quality }: LoaderProps): string {
  if (src.includes(CLOUDINARY_HOST) && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_${quality ?? "auto"},w_${width},c_limit/`);
  }
  const picsum = PICSUM.exec(src);
  if (picsum) return `${picsum[1]}/${width}/${Math.round(width * 1.25)}${picsum[2] ?? ""}`;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
