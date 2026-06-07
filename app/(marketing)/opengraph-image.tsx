import { marketingSite } from "@/lib/config/marketing";
import { ImageResponse } from "next/og";

export const alt = marketingSite.title;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 20% 30%, rgba(220, 38, 38, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.12) 0%, transparent 50%), linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, Arial, sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative elements matching logo theme */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Header with Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          {/* Logo placeholder matching school colors */}
          <div
            style={{
              height: "120px",
              width: "120px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(34, 197, 94, 0.2) 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              fontWeight: 800,
              color: "#dc2626",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              border: "4px solid rgba(220, 38, 38, 0.4)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circle matching logo design */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.3)",
                border: "2px solid rgba(34, 197, 94, 0.5)",
              }}
            />
            <span style={{ position: "relative", zIndex: 1 }}>S R</span>
            <div
              style={{
                position: "absolute",
                bottom: "15%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "60%",
                height: "3px",
                background: "rgba(34, 197, 94, 0.6)",
                borderRadius: "2px",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                textShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              }}
            >
              {marketingSite.name}
            </span>
            <span
              style={{
                fontSize: "18px",
                opacity: 0.8,
                color: "#d1d5db",
                fontWeight: 500,
              }}
            >
              {marketingSite.address.city} • Founded{" "}
              {marketingSite.founder.founded}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            maxWidth: "1000px",
          }}
        >
          <h1
            style={{
              fontSize: "76px",
              lineHeight: 1.05,
              margin: 0,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              fontWeight: 800,
              textShadow:
                "0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(220, 38, 38, 0.3)",
            }}
          >
            Excellence in Education
          </h1>
          <p
            style={{
              fontSize: "36px",
              lineHeight: 1.4,
              margin: 0,
              color: "rgba(255, 255, 255, 0.95)",
              fontWeight: 500,
              textShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
              maxWidth: "900px",
            }}
          >
            {marketingSite.tagline}
          </p>
        </div>

        {/* Footer with Key Features */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {marketingSite.facilities.slice(0, 4).map((item) => (
            <div
              key={item}
              style={{
                padding: "14px 24px",
                borderRadius: "9999px",
                background:
                  "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)",
                border: "1.5px solid rgba(220, 38, 38, 0.3)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                fontSize: "18px",
                fontWeight: 600,
                color: "#ffffff",
                backdropFilter: "blur(10px)",
              }}
            >
              {item}
            </div>
          ))}
          <div
            style={{
              padding: "14px 24px",
              borderRadius: "9999px",
              background: "rgba(34, 197, 94, 0.2)",
              border: "1.5px solid rgba(34, 197, 94, 0.4)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              fontSize: "18px",
              fontWeight: 700,
              color: "#22c55e",
              backdropFilter: "blur(10px)",
            }}
          >
            {marketingSite.founder.trust}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
