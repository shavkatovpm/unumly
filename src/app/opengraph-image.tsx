import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Unumly — kunlik ishlarni rejalashtirish ilovasi";
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
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #FAFAF9 0%, #F2F2F0 60%, #E8E8E5 100%)",
          color: "#1A1A19",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1.2 }}>
            unumly
          </span>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#1A1A19",
              transform: "translateY(-4px)",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 0.95,
              letterSpacing: -3.5,
              maxWidth: 980,
            }}
          >
            Vaqtingizni unumli boshqaring.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#666",
              letterSpacing: -0.4,
            }}
          >
            Kunlik ishlarni rejalashtirish ilovasi · O&apos;zbekcha
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#888",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Rejalang · Boshqaring · Bajaring</span>
          <span>unumly.uz</span>
        </div>
      </div>
    ),
    size
  );
}
