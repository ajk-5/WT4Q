import React from "react";
import styles from "../css/mememaker.module.css";

export type MediaType = {
  url: string;
  type: "image" | "video";
  width: number;
  height: number;
  aspectRatio: number;
};

interface MediaProps {
  media: MediaType;
  scale: number;
  onResizeStart: (e: React.MouseEvent) => void;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

const mediaResizeHandle: React.CSSProperties = {
  position: "absolute",
  width: 16,
  height: 16,
  right: 8,
  bottom: 8,
  borderRadius: 4,
  background:
    "linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,255,255,.3))",
  boxShadow: "0 2px 6px rgba(0,0,0,.35) inset",
  cursor: "nwse-resize",
};

export default function Media({
  media,
  scale,
  onResizeStart,
  videoRef,
}: MediaProps) {
  const wrapper: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const commonInner: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    borderRadius: 20,
    background: "#1b0a60",
    padding: 16,
    boxSizing: "border-box",
    transform: `scale(${scale})`,
    transformOrigin: "center center",
    transition: "transform 60ms linear",
  };

  const mediaElement =
    media.type === "image" ? (
      <img
        src={media.url}
        alt="media"
        draggable={false}
        style={commonInner}
        className={styles.rimLight}
      />
    ) : (
      <video
        ref={videoRef || undefined}
        src={media.url}
        controls
        loop
        autoPlay
        muted
        playsInline
        draggable={false}
        style={commonInner}
        className={styles.rimLight}
      />
    );

  return (
    <div style={wrapper}>
      {mediaElement}
      <div
        role="button"
        aria-label="Resize media"
        onMouseDown={onResizeStart}
        style={mediaResizeHandle}
        title="Drag to resize media"
      />
    </div>
  );
}

