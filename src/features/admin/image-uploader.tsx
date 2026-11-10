"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export interface ProductImageValue {
  url: string;
  publicId?: string | undefined;
}

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Drag & drop upload straight to Cloudinary using a short-lived SIGNED request from our API —
 * image bytes never pass through our server, and the API secret never reaches the browser.
 * Falls back to pasting an image URL when Cloudinary isn't configured (demo/dev).
 */
export function ImageUploader({ value, onChange, disabled }: { value: ProductImageValue[]; onChange: (next: ProductImageValue[]) => void; disabled?: boolean }) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const [uploading, setUploading] = useState(0);
  const [url, setUrl] = useState("");

  const upload = useCallback(
    async (files: File[]) => {
      setUploading((n) => n + files.length);
      const added: ProductImageValue[] = [];
      try {
        const sign = await api<Signature>("/admin/uploads/sign", { method: "POST" });
        for (const file of files) {
          const body = new FormData();
          body.append("file", file);
          body.append("api_key", sign.apiKey);
          body.append("timestamp", String(sign.timestamp));
          body.append("folder", sign.folder);
          body.append("signature", sign.signature);
          const response = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body });
          if (!response.ok) throw new Error("upload failed");
          const result = (await response.json()) as { secure_url: string; public_id: string };
          added.push({ url: result.secure_url, publicId: result.public_id });
        }
        onChange([...value, ...added]);
      } catch (error) {
        if (error instanceof ApiError && error.code === "BAD_REQUEST") toast.error(t("admin.products.cloudinaryMissing"));
        else toast.error(error instanceof ApiError ? errorMessage(error) : t("admin.products.uploadFailed"));
        if (added.length) onChange([...value, ...added]);
      } finally {
        setUploading((n) => n - files.length);
      }
    },
    [value, onChange, errorMessage, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => void upload(files),
    accept: { "image/*": [] },
    maxSize: 8 * 1024 * 1024,
    disabled,
    onDropRejected: () => toast.error(t("admin.products.imageRejected")),
  });

  const addUrl = () => {
    if (/^https?:\/\//.test(url.trim())) {
      onChange([...value, { url: url.trim() }]);
      setUrl("");
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-card px-4 py-8 text-center text-sm transition-colors", isDragActive && "border-foreground bg-muted", disabled && "cursor-not-allowed opacity-50")}
      >
        <input {...getInputProps()} aria-label={t("admin.products.uploadImages")} />
        {uploading > 0 ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <ImagePlus className="size-6 text-muted-foreground" strokeWidth={1.25} />}
        <p>{isDragActive ? t("admin.products.dropHere") : t("admin.products.dragImages")}</p>
        <p className="text-xs text-muted-foreground">{t("admin.products.imageHint")}</p>
      </div>

      {/* Not a <form>: this component lives inside the product form and forms can't nest. */}
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder={t("admin.products.pasteUrl")}
          aria-label={t("admin.products.pasteUrl")}
          dir="ltr"
          className="h-10"
          disabled={disabled}
        />
        <Button type="button" variant="outline" size="sm" className="h-10" disabled={disabled} onClick={addUrl}>
          {t("common.add")}
        </Button>
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {value.map((image, index) => (
            <li key={image.url} className="group relative">
              <div className="media-4x5"><Image src={image.url} alt="" fill sizes="120px" className="object-cover" /></div>
              {index === 0 ? <span className="absolute start-1 top-1 rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] text-primary-foreground">{t("admin.products.primaryImage")}</span> : null}
              <div className="mt-1 flex justify-between">
                <span className="flex">
                  <Button type="button" variant="ghost" size="icon-xs" disabled={index === 0 || disabled} onClick={() => move(index, -1)} aria-label={t("admin.products.moveEarlier")}><ArrowUp className="rtl:-scale-x-100 -rotate-90" /></Button>
                  <Button type="button" variant="ghost" size="icon-xs" disabled={index === value.length - 1 || disabled} onClick={() => move(index, 1)} aria-label={t("admin.products.moveLater")}><ArrowDown className="rtl:-scale-x-100 -rotate-90" /></Button>
                </span>
                <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={t("common.delete")}><X /></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
