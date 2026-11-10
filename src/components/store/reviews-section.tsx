"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Star } from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/shared/field";
import { RatingStars } from "@/components/shared/rating-stars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { Page, Review } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
});
type FormValues = z.infer<typeof schema>;

function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`} onClick={() => onChange(n)} className="rounded-sm p-1">
          <Star className={cn("size-6", n <= value ? "fill-accent text-accent" : "text-border")} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rating: 0, comment: "" } });

  const submit = useMutation({
    mutationFn: (values: FormValues) => api("/reviews", { method: "POST", body: { productId, ...values } }),
    onSuccess: () => {
      toast.success(t("reviews.thanks"));
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      void queryClient.invalidateQueries({ queryKey: ["review-eligibility", productId] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4 border border-border bg-card p-6" noValidate>
      <h3 className="font-sans text-base font-medium">{t("reviews.write")}</h3>
      <Controller
        control={form.control}
        name="rating"
        render={({ field, fieldState }) => (
          <Field label={t("reviews.yourRating")} error={fieldState.error ? t("reviews.ratingRequired") : undefined}>
            <StarInput value={field.value} onChange={field.onChange} label={t("reviews.yourRating")} />
          </Field>
        )}
      />
      <Field label={t("reviews.yourReview")} error={form.formState.errors.comment ? t("reviews.commentRequired") : undefined}>
        <Textarea rows={4} {...form.register("comment")} />
      </Field>
      <Button type="submit" disabled={submit.isPending}>
        {t("reviews.submit")}
      </Button>
    </form>
  );
}

export function ReviewsSection({ productId, ratingAvg, ratingCount }: { productId: string; ratingAvg: number; ratingCount: number }) {
  const t = useT();
  const locale = useLocale();
  const status = useAuthStore((s) => s.status);
  const [page, setPage] = useState(1);

  const reviews = useQuery({
    queryKey: ["reviews", productId, page],
    queryFn: () => api<Page<Review>>("/reviews", { query: { productId, page, limit: 5 }, auth: false }),
    placeholderData: (previous) => previous,
  });
  const eligibility = useQuery({
    queryKey: ["review-eligibility", productId],
    queryFn: () => api<{ canReview: boolean; alreadyReviewed: boolean }>(`/reviews/eligibility/${productId}`),
    enabled: status === "authenticated",
  });

  return (
    <section aria-labelledby="reviews-heading" className="grid gap-10 md:grid-cols-12">
      <div className="md:col-span-4">
        <h2 id="reviews-heading" className="text-xl">{t("reviews.title")}</h2>
        {ratingCount > 0 ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-heading text-2xl font-light tabular-nums">{ratingAvg.toFixed(1)}</span>
            <div>
              <RatingStars value={ratingAvg} size="md" label={t("product.ratingLabel", { value: ratingAvg })} />
              <p className="text-xs text-muted-foreground">{t("reviews.count", { count: ratingCount })}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("reviews.none")}</p>
        )}
      </div>

      <div className="space-y-8 md:col-span-8">
        {eligibility.data?.canReview ? <ReviewForm productId={productId} /> : null}
        {status !== "authenticated" ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">{t("reviews.signInToReview")}</Link>
          </p>
        ) : eligibility.data && !eligibility.data.canReview && !eligibility.data.alreadyReviewed ? (
          <p className="text-sm text-muted-foreground">{t("reviews.purchaseRequired")}</p>
        ) : null}

        <ul className="divide-y divide-border">
          {reviews.data?.items.map((review) => (
            <li key={review.id} className="space-y-2 py-6 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingStars value={review.rating} label={t("product.ratingLabel", { value: review.rating })} />
                <span className="text-sm font-medium">{review.author}</span>
                {review.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="size-3.5" /> {t("reviews.verified")}</span>
                ) : null}
                <time className="text-xs text-muted-foreground" dateTime={review.createdAt}>{formatDate(review.createdAt, locale)}</time>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
            </li>
          ))}
        </ul>

        {reviews.data && reviews.data.totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("common.previous")}</Button>
            <Button variant="outline" size="sm" disabled={page >= reviews.data.totalPages} onClick={() => setPage((p) => p + 1)}>{t("common.next")}</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
