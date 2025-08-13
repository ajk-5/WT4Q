"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JSX } from "react";
import html2canvas from "html2canvas";
import { useDropzone } from "react-dropzone";
import Media, { MediaType } from "./components/Media";

const PRESETS = {
  "1:1": { w: 1, h: 1 },
  "3:2": { w: 3, h: 2 },
  "2:3": { w: 2, h: 3 },
  "4:3": { w: 4, h: 3 },
  "3:4": { w: 3, h: 4 },
  "5:4": { w: 5, h: 4 },
  "4:5": { w: 4, h: 5 },
  "16:9": { w: 16, h: 9 },
  "9:16": { w: 9, h: 16 },
  "21:9": { w: 21, h: 9 },
  "9:21": { w: 9, h: 21 },
} as const;

type PresetKey = keyof typeof PRESETS;
type AspectChoice = PresetKey | "custom";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

async function readVideoMeta(
  url: string,
  timeoutMs = 4000
): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    (v as any).playsInline = true;
    v.src = url;

    let done = false;
    const cleanup = () => {
      v.onloadedmetadata = null;
      v.onloadeddata = null;
      v.onerror = null;
    };
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok ? { w: v.videoWidth, h: v.videoHeight } : null);
    };

    const to = window.setTimeout(() => finish(false), timeoutMs);
    v.onloadedmetadata = () => {
      window.clearTimeout(to);
      finish(true);
    };
    v.onloadeddata = () => {
      window.clearTimeout(to);
      finish(true);
    };
    v.onerror = () => {
      window.clearTimeout(to);
      finish(false);
    };
  });
}

export default function Page(): JSX.Element {
  const [text, setText] = useState<string>("Your epic glass text");
  const [watermark, setWatermark] = useState<string>("");

  const [aspectChoice, setAspectChoice] = useState<AspectChoice>("1:1");
  const [customW, setCustomW] = useState<number>(1);
  const [customH, setCustomH] = useState<number>(1);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  const [stageW, setStageW] = useState<number>(600);
  const [stageH, setStageH] = useState<number>(600);

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    lock: boolean;
  } | null>(null);

  const mediaResizeRef = useRef<{ startX: number; startY: number; startScale: number } | null>(null);

  const [placement, setPlacement] = useState<"center" | "above" | "below">(
    "center"
  );
  const [media, setMedia] = useState<MediaType | null>(null);
  const [mediaScale, setMediaScale] = useState<number>(1);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const [fontFamily, setFontFamily] = useState<string>(
    "Impact, Arial, sans-serif"
  );
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [manualSize, setManualSize] = useState<number>(72);

  const [viewportW, setViewportW] = useState<number>(0);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isSmall = viewportW < 640;
  const isMed = viewportW >= 640 && viewportW < 1024;
  const rowStyle = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: isSmall ? "1fr" : isMed ? "1fr 1fr" : "auto auto 1fr auto",
    gap: 12,
    alignItems: "center",
  }), [isSmall, isMed]);
  const rowWideStyle = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: isSmall ? "1fr" : isMed ? "1fr 1fr" : "1fr auto 1fr",
    gap: 12,
    alignItems: "center",
  }), [isSmall, isMed]);
  const btnResponsive = useMemo(() => ({
    ...styles.btn,
    width: isSmall ? "100%" : undefined,
  }), [isSmall]);

  const currentRatio = useMemo(() => {
    if (aspectChoice === "custom") return (customW || 1) / (customH || 1);
    const p = PRESETS[aspectChoice];
    return p.w / p.h;
  }, [aspectChoice, customW, customH]);

  useEffect(() => {
    const maxW = Math.max(320, Math.min(viewportW * 0.92, 1600));
    const newW = clamp(stageW, 240, maxW);
    const newH = Math.round(newW / currentRatio);
    setStageW(newW);
    setStageH(newH);
  }, [aspectChoice, customW, customH, viewportW]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    maxFiles: 1,
    onDrop: async (files) => {
      const f = files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      setMediaFile(f);

      if (f.type.startsWith("image")) {
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
          const ratio = img.naturalWidth / img.naturalHeight;
          setMedia({
            url,
            type: "image",
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: ratio,
          });
          setAspectChoice("custom");
          setCustomW(img.naturalWidth);
          setCustomH(img.naturalHeight);
          const maxW = Math.max(320, Math.min(window.innerWidth * 0.92, 1600));
          const w = clamp(
            Math.round(Math.min(maxW, img.naturalWidth)),
            240,
            3840
          );
          const h = Math.round(w / ratio);
          setStageW(w);
          setStageH(h);
          setMediaScale(1);
        } catch (e) {
          console.error("Image decode failed", e);
          alert("Could not read image. Try another file.");
          URL.revokeObjectURL(url);
          setMediaFile(null);
        }
      } else if (f.type.startsWith("video")) {
        try {
          const meta = await readVideoMeta(url);
          if (!meta) {
            alert(
              "Could not read video metadata. Keeping current aspect; you can still place the video."
            );
            setMedia({
              url,
              type: "video",
              width: 0,
              height: 0,
              aspectRatio: currentRatio,
            });
            setMediaScale(1);
          } else {
            const ratio = meta.w / meta.h;
            setMedia({
              url,
              type: "video",
              width: meta.w,
              height: meta.h,
              aspectRatio: ratio,
            });
            setAspectChoice("custom");
            setCustomW(meta.w);
            setCustomH(meta.h);
            const maxW = Math.max(320, Math.min(window.innerWidth * 0.92, 1600));
            const w = clamp(Math.round(Math.min(maxW, meta.w)), 240, 3840);
            const h = Math.round(w / ratio);
            setStageW(w);
            setStageH(h);
            setMediaScale(1);
          }
        } catch (e) {
          console.error("Video metadata read error", e);
          alert("Could not read video metadata. Try another file or browser.");
          URL.revokeObjectURL(url);
          setMediaFile(null);
        }
      }
    },
  });

  useEffect(() => {
    return () => {
      if (media?.url) URL.revokeObjectURL(media.url);
    };
  }, [media]);

  const stageRef = useRef<HTMLDivElement>(null);
  const textBoxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const [fittedFont, setFittedFont] = useState<number>(72);
  const textBoxHeight = useMemo(
    () => Math.round((media ? 0.4 : 0.7) * stageH),
    [stageH, media]
  );
  const fitKey = useMemo(
    () =>
      `${text}\n${watermark}|${stageW}x${stageH}|${textBoxHeight}|${placement}|${
        media ? media.type : "none"
      }|${fontFamily}|${autoFit}`,
    [
      text,
      watermark,
      stageW,
      stageH,
      textBoxHeight,
      placement,
      media,
      fontFamily,
      autoFit,
    ]
  );

  useLayoutEffect(() => {
    let raf = 0;
    let cancelled = false;
    if (!autoFit) return;

    const measure = async () => {
      const el = textRef.current;
      const box = textBoxRef.current;
      if (!el || !box) return;

      try {
        if ((document as any).fonts && (document as any).fonts.ready)
          await ((document as any).fonts.ready as Promise<any>);
      } catch {}

      el.style.fontFamily = fontFamily;
      el.style.whiteSpace = "pre-wrap";

      const MAX = Math.min(stageW, stageH);
      const MIN = 16;
      let low = MIN,
        high = Math.max(24, Math.floor(MAX * 0.22)),
        best = low;
      const fits = (size: number) => {
        el.style.fontSize = `${size}px`;
        const over =
          el.scrollHeight > box.clientHeight ||
          el.scrollWidth > box.clientWidth;
        return !over;
      };
      while (low <= high && !cancelled) {
        const mid = Math.floor((low + high) / 2);
        if (fits(mid)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      if (!cancelled) setFittedFont(best);
    };

    raf = window.requestAnimationFrame(() => {
      void measure();
    });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [fitKey]);

  useEffect(() => {
    const box = textBoxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      if (autoFit) setFittedFont((v) => v);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [autoFit]);

  const handleDownload = async () => {
    if (!stageRef.current) return;
    const dpr = Math.max(1, Math.min(3, (window as any).devicePixelRatio || 1));
    const canvas = await html2canvas(stageRef.current, {
      backgroundColor: null,
      useCORS: true,
      scale: dpr,
    });
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = "meme.png";
    a.click();
  };

  const handleDownloadVideo = () => {
    if (!media || media.type !== "video" || !mediaFile) return;
    const blobUrl = URL.createObjectURL(mediaFile);
    const a = document.createElement("a");
    a.href = blobUrl;
    const name = mediaFile.name || "video";
    a.download = /\.(mp4|webm|mov)$/i.test(name) ? name : `${name}.mp4`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const wrapCanvasText = (
    ctx: CanvasRenderingContext2D,
    content: string,
    x: number,
    yCenter: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = content.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    const totalH = (lines.length - 1) * lineHeight;
    lines.forEach((ln, i) => {
      const y = yCenter - totalH / 2 + i * lineHeight;
      ctx.strokeText(ln, x, y);
      ctx.fillText(ln, x, y);
    });
  };

  const handleExportComposedVideo = async () => {
    if (!media || media.type !== "video") return;
    if (!videoElRef.current) return;
    if (typeof (window as any).MediaRecorder === "undefined") {
      alert("Video export not supported in this browser.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    const dpr = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(stageW * dpr);
    canvas.height = Math.round(stageH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }
    ctx.scale(dpr, dpr);

    const stream = (canvas as HTMLCanvasElement).captureStream();
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data && chunks.push(e.data);

    const vid = videoElRef.current;
    const originalPaused = vid.paused;
    const originalLoop = vid.loop;
    vid.loop = false;
    vid.currentTime = 0;

    const onEnded = () => {
      recorder.stop();
    };
    vid.addEventListener("ended", onEnded);

    recorder.start(100);
    await vid.play();

    const fontSize = autoFit ? fittedFont : manualSize;
    const lineHeight = fontSize * 1.2;

    const draw = () => {
      ctx.clearRect(0, 0, stageW, stageH);
      ctx.fillStyle = "#2b0a86";
      ctx.fillRect(0, 0, stageW, stageH);

      const waterH = watermark ? Math.max(12, Math.floor(stageH * 0.05)) : 0;
      const textAreaH = media ? Math.floor(stageH * 0.4) : Math.floor(stageH * 0.7);
      const mediaAreaH = media ? stageH - textAreaH - waterH : 0;
      const mediaY =
        placement === "above"
          ? 0
          : placement === "center"
          ? Math.floor((stageH - mediaAreaH - textAreaH - waterH) / 2) + textAreaH
          : textAreaH;

      if (media) {
        const targetW = stageW - 32;
        const targetH = mediaAreaH ? mediaAreaH - 32 : 0;
        let drawW = 0,
          drawH = 0;
        if (targetW > 0 && targetH > 0) {
          const fitScale = Math.min(
            targetW / (media.width || stageW),
            targetH / (media.height || stageH)
          );
          const scale = Math.max(0.2, Math.min(2, mediaScale)) * (fitScale || 1);
          drawW = Math.round((media.width || stageW) * scale);
          drawH = Math.round((media.height || stageH) * scale);
          const x = Math.round((stageW - drawW) / 2);
          const y = Math.round(mediaY + (mediaAreaH - drawH) / 2);
          try {
            ctx.drawImage(vid as HTMLVideoElement, x, y, drawW, drawH);
          } catch {}
        }
      }

      const textCenterY =
        placement === "above"
          ? Math.round(mediaAreaH + textAreaH / 2)
          : placement === "below"
          ? Math.round(textAreaH / 2)
          : Math.round(stageH / 2);

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.06));
      ctx.strokeStyle = "#000";
      wrapCanvasText(ctx, text, Math.round(stageW / 2), textCenterY, Math.round(stageW * 0.9), lineHeight);

      if (watermark) {
        ctx.font = `${Math.max(10, Math.floor(stageH * 0.04))}px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.strokeText(watermark, stageW - 10, stageH - 10);
        ctx.fillText(watermark, stageW - 10, stageH - 10);
      }

      const p = (vid.currentTime / (vid.duration || 1)) * 100;
      setExportProgress(Math.max(0, Math.min(100, Math.floor(p))));
      if (!vid.paused && !vid.ended) {
        requestAnimationFrame(draw);
      }
    };

    requestAnimationFrame(draw);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    vid.removeEventListener("ended", onEnded);
    vid.loop = originalLoop;
    if (originalPaused) vid.pause();

    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meme.webm";
    a.click();
    URL.revokeObjectURL(url);

    setExportProgress(100);
    setIsExporting(false);
  };

  const effectiveFontSize = autoFit ? fittedFont : manualSize;

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const lockNow = lockAspect && !(e as any).shiftKey;
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: stageW,
      startH: stageH,
      lock: lockNow,
    };
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", onResizeMouseUp);
  };

  const onResizeMouseMove = (e: MouseEvent) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    const maxW = Math.max(320, Math.min(window.innerWidth * 0.95, 3840));
    const maxH = 2160;

    if (st.lock) {
      let newW = clamp(st.startW + dx, 240, maxW);
      let newH = Math.round(newW / currentRatio);
      if (newH > maxH) {
        newH = maxH;
        newW = Math.round(newH * currentRatio);
      }
      setStageW(newW);
      setStageH(newH);
    } else {
      const newW = clamp(st.startW + dx, 240, maxW);
      const newH = clamp(st.startH + dy, 240, maxH);
      setStageW(newW);
      setStageH(newH);
    }
  };

  const onResizeMouseUp = () => {
    window.removeEventListener("mousemove", onResizeMouseMove);
    window.removeEventListener("mouseup", onResizeMouseUp);
    dragStateRef.current = null;
  };

  const onMediaResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    mediaResizeRef.current = { startX: e.clientX, startY: e.clientY, startScale: mediaScale };
    window.addEventListener("mousemove", onMediaResizeMouseMove);
    window.addEventListener("mouseup", onMediaResizeMouseUp);
  };

  const onMediaResizeMouseMove = (e: MouseEvent) => {
    const st = mediaResizeRef.current; if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const dist = Math.hypot(dx, dy);
    const sign = dx + dy > 0 ? 1 : -1;
    const next = clamp(st.startScale + sign * (dist / 300), 0.2, 2);
    setMediaScale(next);
  };

  const onMediaResizeMouseUp = () => {
    window.removeEventListener("mousemove", onMediaResizeMouseMove);
    window.removeEventListener("mouseup", onMediaResizeMouseUp);
    mediaResizeRef.current = null;
  };

  const matchMediaAspect = () => {
    if (!media) return;
    setAspectChoice("custom");
    setCustomW(media.width || 1);
    setCustomH(media.height || 1);
    const ratio = (media.width || 1) / (media.height || 1);
    const maxW = Math.max(320, Math.min(window.innerWidth * 0.92, 1600));
    const w = clamp(Math.round(Math.min(maxW, stageW)), 240, 3840);
    const h = Math.round(w / ratio);
    setStageW(w);
    setStageH(h);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Glass 3D Meme Maker</h1>

      <div style={styles.controls}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Enter main text"
          style={styles.input}
          maxLength={240}
        />

        <div style={rowWideStyle}>
          <label style={styles.label}>
            Font:
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{ ...styles.select, width: isSmall ? "100%" : undefined }}
            >
              <option value="Impact, Arial, sans-serif">Impact</option>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="'Comic Sans MS', cursive, sans-serif">
                Comic Sans
              </option>
              <option value="'Courier New', Courier, monospace">
                Courier New
              </option>
              <option value="'Times New Roman', Times, serif">
                Times New Roman
              </option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="'Montserrat', Arial, sans-serif">Montserrat</option>
            </select>
          </label>

          <label style={styles.label}>
            Auto fit:
            <input
              type="checkbox"
              checked={autoFit}
              onChange={(e) => setAutoFit(e.target.checked)}
            />
          </label>

          {!autoFit && (
            <label style={{ ...styles.label, gap: 12, flex: 1 }}>
              Font size:
              <input
                type="range"
                min={16}
                max={200}
                value={manualSize}
                onChange={(e) => setManualSize(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={styles.badge}>{manualSize}px</span>
            </label>
          )}
        </div>

        <div style={rowStyle}>
          <label style={styles.label}>
            Aspect:
            <select
              value={aspectChoice}
              onChange={(e) => setAspectChoice(e.target.value as AspectChoice)}
              style={{ ...styles.select, width: isSmall ? "100%" : undefined }}
            >
              {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>

          {aspectChoice === "custom" && (
            <>
              <label style={styles.label}>
                W:
                <input
                  type="number"
                  min={1}
                  value={customW}
                  onChange={(e) => setCustomW(Math.max(1, +e.target.value))}
                  style={styles.number}
                />
              </label>
              <label style={styles.label}>
                H:
                <input
                  type="number"
                  min={1}
                  value={customH}
                  onChange={(e) => setCustomH(Math.max(1, +e.target.value))}
                  style={styles.number}
                />
              </label>
            </>
          )}

          <label style={styles.label}>
            Lock aspect:
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
              title="Hold Shift while dragging to temporarily free-resize"
            />
          </label>

          <button type="button" onClick={matchMediaAspect} style={btnResponsive}>
            Match media aspect
          </button>
        </div>

        <div style={rowStyle}>
          <label style={styles.label}>
            Media position:
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as any)}
              style={{ ...styles.select, width: isSmall ? "100%" : undefined }}
            >
              <option value="center">Center</option>
              <option value="above">Above text</option>
              <option value="below">Below text</option>
            </select>
          </label>

          <button type="button" {...getRootProps()} style={btnResponsive}>
            <input {...getInputProps()} />
            {isDragActive ? "Drop media..." : media ? "Replace media" : "Add image/video"}
          </button>

          <input
            type="text"
            placeholder="Watermark (small text row below)"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            style={styles.input}
            maxLength={64}
          />

          <button
            onClick={handleDownload}
            style={{ ...styles.btn, width: "100%" }}
          >
            Download PNG
          </button>

          {media && media.type === "video" && (
            <>
              <button onClick={handleDownloadVideo} style={{ ...styles.btn, width: "100%" }}>
                Download Original Video
              </button>
              <button
                onClick={handleExportComposedVideo}
                disabled={isExporting}
                style={{ ...styles.btn, width: "100%", opacity: isExporting ? 0.7 : 1 }}
              >
                {isExporting ? `Exporting ${exportProgress}%` : "Export Video (with overlay)"}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        style={{
          ...styles.stage,
          width: stageW,
          height: stageH,
          background: "#2b0a86",
          position: "relative",
        }}
      >
        <div style={styles.content}>
          {media && placement === "above" && (
            <div style={styles.mediaWrap}>
              <Media
                media={media}
                scale={mediaScale}
                onResizeStart={onMediaResizeMouseDown}
                videoRef={videoElRef}
              />
            </div>
          )}

          <div style={{ ...styles.textBlock }}>
            <div
              ref={textBoxRef}
              style={{ ...styles.textBox, height: textBoxHeight, maxWidth: "90%" }}
            >
              <div
                ref={textRef}
                style={{
                  ...styles.glassText,
                  fontFamily,
                  fontSize: effectiveFontSize,
                  maxWidth: "100%",
                  maxHeight: "100%",
                  overflow: "hidden",
                  hyphens: "auto",
                }}
              >
                {text}
              </div>
            </div>
          </div>

          {media && placement !== "above" && (
            <div
              style={{
                ...styles.mediaWrap,
                justifyContent: placement === "center" ? "center" : "flex-end",
              }}
            >
              <Media
                media={media}
                scale={mediaScale}
                onResizeStart={onMediaResizeMouseDown}
                videoRef={videoElRef}
              />
            </div>
          )}

          {watermark && <div style={styles.watermark}>{watermark}</div>}
        </div>

        <div
          role="button"
          aria-label="Resize output"
          onMouseDown={onResizeMouseDown}
          style={styles.resizeHandle}
          title={
            lockAspect
              ? "Drag to resize (aspect locked). Hold Shift to free-resize."
              : "Drag to resize (free)."
          }
        />
        {isExporting && (
          <div style={styles.progressWrap}>
            <div style={{ ...styles.progressBar, width: `${exportProgress}%` }} />
          </div>
        )}
      </div>

      <p style={styles.footer}>
        Tip: Hold <b>Shift</b> while dragging the corner to free-resize without
        locking the aspect.
      </p>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#0d0728",
    color: "#e9e7ff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: 20,
    boxSizing: "border-box",
  },
  h1: { textAlign: "center", margin: "8px 0 16px" },
  controls: {
    maxWidth: 1100,
    margin: "0 auto 16px",
    display: "grid",
    gap: 12,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto auto 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  rowWide: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 12,
    alignItems: "center",
  },
  label: { display: "flex", gap: 8, alignItems: "center" },
  select: {
    background: "#1a1440",
    color: "#fff",
    border: "1px solid #3a2b8f",
    borderRadius: 10,
    padding: "10px 12px",
  },
  number: {
    width: 90,
    background: "#1a1440",
    color: "#fff",
    border: "1px solid #3a2b8f",
    borderRadius: 10,
    padding: "8px 10px",
  },
  input: {
    width: "100%",
    background: "#1a1440",
    color: "#fff",
    border: "1px solid #3a2b8f",
    borderRadius: 10,
    padding: 12,
    resize: "vertical",
  },
  btn: {
    background: "#4b2ee6",
    color: "#fff",
    border: 0,
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  badge: {
    background: "#241b65",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
    fontWeight: 700,
  },
  stage: {
    margin: "16px auto",
    borderRadius: 24,
    boxShadow: "0 10px 40px rgba(0,0,0,.45)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.08)",
    userSelect: "none",
  },
  content: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    boxSizing: "border-box",
    gap: 8,
  },
  mediaWrap: {
    width: "100%",
    height: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  textBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  textBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
  },
  glassText: {
    color: "#ffffff",
    lineHeight: 1.1,
    fontWeight: 900,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: "0 .1em",
    textShadow:
      "0 1px 0 rgba(255,255,255,.9)," +
      "0 2px 0 rgba(255,255,255,.8)," +
      "0 3px 0 rgba(0,0,0,.08)," +
      "0 6px 12px rgba(0,0,0,.35)," +
      "0 0 18px rgba(255,255,255,.25)",
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.96) 30%, rgba(255,255,255,.88) 50%, rgba(255,255,255,.92) 55%, rgba(255,255,255,1) 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
  watermark: {
    alignSelf: "stretch",
    textAlign: "right",
    color: "#e9e7ff",
    opacity: 0.7,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  resizeHandle: {
    position: "absolute",
    width: 18,
    height: 18,
    right: 6,
    bottom: 6,
    borderRadius: 4,
    background:
      "linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,255,255,.2))",
    boxShadow: "0 2px 6px rgba(0,0,0,.35) inset",
    cursor: "nwse-resize",
  },
  progressWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    height: 8,
    background: "rgba(255,255,255,.2)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "#4b2ee6",
  },
  footer: { textAlign: "center", opacity: 0.7, marginTop: 4 },
};

