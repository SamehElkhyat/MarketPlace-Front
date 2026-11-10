import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ tags: z.array(z.string().min(1).max(100)).min(1).max(20) });

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * On-demand cache invalidation. The API calls this after a product/category/brand changes, so storefront
 * pages refresh within seconds instead of waiting for their time-based revalidation.
 * Lives outside `/api` (that prefix is proxied to the backend) and is protected by a shared secret.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-revalidate-secret") ?? "";
  if (!secret || !safeEqual(provided, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // 'max' = stale-while-revalidate: shoppers keep getting a fast page while the fresh one is built.
  for (const tag of parsed.data.tags) revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: parsed.data.tags });
}
