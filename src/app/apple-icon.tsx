import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1A19",
          color: "#FAFAF9",
          fontSize: 120,
          fontWeight: 600,
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: -6,
          position: "relative",
        }}
      >
        u
        <span
          style={{
            position: "absolute",
            right: 42,
            bottom: 50,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#FAFAF9",
          }}
        />
      </div>
    ),
    size
  );
}
