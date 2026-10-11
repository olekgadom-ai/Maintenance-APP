"use client";

import type { IScannerControls } from "@zxing/browser";
import { CameraOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Report.scanner");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const resultRef = useRef(onResult);
  useEffect(() => {
    resultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    dialogRef.current?.showModal();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result, _error, ctrl) => {
            if (result) {
              ctrl.stop();
              resultRef.current(result.getText());
            }
          },
        );
        if (cancelled) controls.stop();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={t("title")}
      className="m-auto w-[min(100vw-2rem,28rem)] rounded-2xl border bg-surface p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <p className="font-semibold">{t("title")}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("close")}
          onClick={() => dialogRef.current?.close()}
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="relative aspect-square bg-black">
        {failed ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            <div>
              <CameraOff aria-hidden className="mx-auto size-8" />
              <p className="mt-3">{t("noCamera")}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80"
            />
          </>
        )}
      </div>
      <p className="px-4 py-3 text-sm text-muted-foreground">{t("hint")}</p>
    </dialog>
  );
}
