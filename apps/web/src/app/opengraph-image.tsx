import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Swashbuckler — The knowledge base built for tabletops"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          padding: "60px 80px",
          gap: "60px",
        }}
      >
        {/* Skull and crossbones */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 128 128"
            width="200"
            height="200"
          >
            <ellipse cx="64" cy="52" rx="40" ry="38" fill="white" />
            <ellipse cx="50" cy="46" rx="10" ry="11" fill="#09090b" />
            <ellipse cx="78" cy="46" rx="10" ry="11" fill="#09090b" />
            <path d="M60 60 L64 68 L68 60 Z" fill="#09090b" />
            <rect x="48" y="72" width="6" height="10" rx="1" fill="white" />
            <rect x="57" y="72" width="6" height="10" rx="1" fill="white" />
            <rect x="66" y="72" width="6" height="10" rx="1" fill="white" />
            <rect x="75" y="72" width="6" height="10" rx="1" fill="white" />
            <line
              x1="20"
              y1="88"
              x2="108"
              y2="120"
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <line
              x1="108"
              y1="88"
              x2="20"
              y2="120"
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="20" cy="88" r="7" fill="white" />
            <circle cx="108" cy="88" r="7" fill="white" />
            <circle cx="20" cy="120" r="7" fill="white" />
            <circle cx="108" cy="120" r="7" fill="white" />
          </svg>
        </div>

        {/* Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Swashbuckler
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              lineHeight: 1.3,
            }}
          >
            The knowledge base built for tabletops.
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#52525b",
              lineHeight: 1.4,
              marginTop: "8px",
            }}
          >
            Because your world deserves better than a Google Doc.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
