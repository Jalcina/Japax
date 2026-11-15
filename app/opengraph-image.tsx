import { ImageResponse } from "next/og";

export const alt = "JaPax: know what to protect, before the fire decides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg,#0b0d12 0%,#1a1020 100%)",
          color: "#f4f1ea",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#ff8a4c" }}>JAPAX · SPACE FIRE SAFETY</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 28, lineHeight: 1.05 }}>
          Know what to protect, before the fire decides.
        </div>
        <div style={{ fontSize: 32, marginTop: 36, color: "#b9b5ad" }}>
          NASA fire experiments for spacesuits, ships and lunar bases · NASA Space Apps 2026
        </div>
      </div>
    ),
    size,
  );
}
