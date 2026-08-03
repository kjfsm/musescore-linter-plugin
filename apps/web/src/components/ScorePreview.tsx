import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";

export interface ScorePreviewProps {
  name: string;
  xml: string;
}

/**
 * OSMD は容量が大きい（大半が VexFlow）ため動的 import にし、初期バンドルへ含めない。
 * このコンポーネント自体も、呼び出し側で `<details>` を開いたときだけマウントされる想定。
 */
export function ScorePreview({ name, xml }: ScorePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    // ここでの catch は UI の I/O 境界（parseFile の catch と同種）であり、
    // checker 内 catch 禁止のルールとは無関係。
    async function run() {
      const container = containerRef.current;
      if (!container) return;
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled) return;
        container.replaceChildren();
        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: false,
          backend: "svg",
        });
        await osmd.load(xml);
        if (cancelled) return;
        osmd.render();
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [xml]);

  return (
    <div className="px-4 py-3">
      {status === "loading" && <p className="text-sm text-muted-foreground">読み込み中…</p>}
      {status === "error" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          楽譜プレビューを表示できませんでした: {error}
        </p>
      )}
      {/*
       * status !== "ready" の間も表示領域からは外さない。display:none にすると
       * offsetWidth が 0 になり、OSMD が render() 時にそれを読んで幅 0 のまま
       * 描画してしまう（実測して判明した挙動）。
       */}
      <div
        ref={containerRef}
        aria-label={`${name} の楽譜プレビュー`}
        className="w-full overflow-x-auto"
      />
    </div>
  );
}
