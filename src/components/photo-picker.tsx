"use client";

import { Camera, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { downscaleImage } from "@/lib/images";
import { MAX_PHOTOS } from "@/lib/tickets/schemas";

export type Photo = { file: File; url: string };

// Photo selection with previews. Files are downscaled as they are added and
// preview URLs are released on removal and unmount.
export function usePhotoSelection() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setProcessing(true);
    const room = MAX_PHOTOS - photos.length;
    const next = await Promise.all(
      [...files].slice(0, room).map(async (f) => {
        const file = await downscaleImage(f);
        const url = URL.createObjectURL(file);
        previewUrls.current.add(url);
        return { file, url };
      }),
    );
    setPhotos((prev) => [...prev, ...next]);
    setProcessing(false);
  }

  function remove(url: string) {
    URL.revokeObjectURL(url);
    previewUrls.current.delete(url);
    setPhotos((prev) => prev.filter((p) => p.url !== url));
  }

  return { photos, processing, add, remove };
}

export function PhotoPicker({
  selection,
}: {
  selection: ReturnType<typeof usePhotoSelection>;
}) {
  const t = useTranslations("Report.photos");
  const { photos, processing, add, remove } = selection;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {photos.map((photo) => (
        <div
          key={photo.url}
          className="relative aspect-square overflow-hidden rounded-lg border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={photo.url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => remove(photo.url)}
            aria-label={t("remove")}
            className="absolute top-1 right-1 grid size-9 cursor-pointer place-items-center rounded-full bg-black/60 text-white"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <>
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed bg-surface text-muted-foreground hover:text-foreground">
            <span className="grid justify-items-center gap-1 text-xs">
              {processing ? (
                <LoaderCircle aria-hidden className="size-6 animate-spin" />
              ) : (
                <Camera aria-hidden className="size-6" />
              )}
              {t("take")}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed bg-surface text-muted-foreground hover:text-foreground">
            <span className="grid justify-items-center gap-1 text-xs">
              <ImagePlus aria-hidden className="size-6" />
              {t("pick")}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
