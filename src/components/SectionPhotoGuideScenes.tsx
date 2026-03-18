"use client";

import React from "react";

export type PhotoGuideSceneCard = {
  id: string;
  accepted: boolean;
  label: string;
  lightboxTitle: string;
  description: string;
  svg: React.ReactNode;
};

function SvgRoot({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 160 90" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      {children}
    </svg>
  );
}

const C_SKY = "#a9dcff";
const C_GRASS = "#4fbf66";
const C_BRICK = "#b64a3b";
const C_MORTAR = "#e7d4c2";
const C_STONE = "#c7c5bf";
const C_SOIL = "#8a5c3c";
const C_DIRT = "#7a4e33";
const C_CONCRETE = "#9aa0a6";

function BrickPattern({
  rows = 9,
  cols = 8,
  brick = C_BRICK,
  mortar = C_MORTAR,
}: {
  rows?: number;
  cols?: number;
  brick?: string;
  mortar?: string;
}) {
  const brickW = 160 / cols;
  const brickH = 90 / rows;
  return (
    <g>
      {Array.from({ length: rows }).map((_, r) => {
        const y = r * brickH;
        const rowOffset = r % 2 === 1 ? brickW / 2 : 0;
        // Render an extra brick on either side for staggering.
        return Array.from({ length: cols + 2 }).map((__, c) => {
          const x = c * brickW - brickW + rowOffset;
          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={brickW}
              height={brickH}
              fill={brick}
              stroke={mortar}
              strokeWidth={1}
            />
          );
        });
      })}
    </g>
  );
}

function Scene1FullExteriorFacade() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <rect x="18" y="42" width="124" height="44" rx="2" fill="#a54a3b" />
      <rect x="22" y="46" width="116" height="38" fill={C_BRICK} />
      {Array.from({ length: 3 }).map((_, r) => (
        <g key={r}>
          {Array.from({ length: 3 }).map((__, c) => {
            const x = 42 + c * 26;
            const y = 52 + r * 10;
            return (
              <rect
                key={c}
                x={x}
                y={y}
                width="14"
                height="8"
                fill={C_STONE}
                stroke={C_MORTAR}
                strokeWidth={1}
                rx="1"
              />
            );
          })}
        </g>
      ))}
      <rect
        x="66"
        y="62"
        width="28"
        height="24"
        fill={C_STONE}
        stroke={C_MORTAR}
        strokeWidth={1}
        rx="2"
      />
      <rect x="76" y="68" width="8" height="12" fill="#3d2a24" opacity="0.95" rx="1" />
      <rect x="0" y="76" width="160" height="14" fill={C_CONCRETE} />
      <rect x="0" y="78" width="160" height="2" fill="#7d858e" opacity="0.8" />
    </SvgRoot>
  );
}

function Scene1StreetLevelWithGround() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <path d="M0 64 C30 70, 60 74, 160 82 L160 90 L0 90 Z" fill="#9aa0a6" />
      <path
        d="M0 66 C35 72, 65 76, 160 84"
        fill="none"
        stroke="#7d858e"
        strokeWidth="2"
        opacity="0.6"
      />
      <rect x="26" y="38" width="108" height="52" fill={C_BRICK} />
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 2 }).map((__, c) => {
          const x = 52 + c * 40 + (r % 2) * 2;
          const y = 46 + r * 10;
          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width="18"
              height="9"
              fill={C_STONE}
              stroke={C_MORTAR}
              strokeWidth={1}
              rx="1"
            />
          );
        }),
      )}
      <rect
        x="66"
        y="60"
        width="28"
        height="30"
        fill={C_STONE}
        stroke={C_MORTAR}
        strokeWidth={1}
        rx="2"
      />
      <rect x="79" y="66" width="6" height="14" fill="#3d2a24" opacity="0.95" rx="1" />
      <line x1="18" y1="60" x2="142" y2="72" stroke={C_MORTAR} strokeWidth={2} opacity="0.55" />
    </SvgRoot>
  );
}

function Scene1SiteContextSurroundings() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <path d="M0 72 C40 60, 90 60, 160 66 L160 90 L0 90 Z" fill={C_GRASS} />
      <path d="M62 62 L104 56" stroke="#2c7a3e" strokeWidth="3" strokeLinecap="round" />
      <path d="M102 56 L111 52" stroke="#2c7a3e" strokeWidth="3" strokeLinecap="round" />
      <rect x="48" y="38" width="72" height="52" fill={C_BRICK} />
      <rect x="41" y="44" width="6" height="46" fill="#9e3f33" opacity="0.9" />
      <rect x="120" y="44" width="6" height="46" fill="#9e3f33" opacity="0.9" />
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 2 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={58 + c * 34}
            y={48 + r * 12}
            width="12"
            height="8"
            fill={C_STONE}
            stroke={C_MORTAR}
            strokeWidth={1}
            rx="1"
          />
        )),
      )}
      <g opacity="0.95">
        <rect x="18" y="52" width="6" height="28" fill="#6b4a2b" />
        <circle cx="21" cy="48" r="16" fill="#2f9f4b" />
      </g>
      <g opacity="0.95">
        <rect x="136" y="52" width="6" height="28" fill="#6b4a2b" />
        <circle cx="139" cy="48" r="16" fill="#2f9f4b" />
      </g>
    </SvgRoot>
  );
}

function Scene1NotInteriorOnly() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#dbe3ea" />
      <path d="M0 62 L160 62 L160 90 L0 90 Z" fill="#c2b6a8" />
      <path d="M0 62 L160 90 L160 90 L0 90 Z" fill="#b3a392" opacity="0.85" />
      <path d="M78 0 L78 90" stroke="#b8c0c7" strokeWidth="6" opacity="0.85" />
      <rect x="46" y="50" width="44" height="16" fill="#8b5c3c" opacity="0.8" rx="2" />
      <rect x="40" y="52" width="56" height="10" fill="#7a4e33" opacity="0.55" rx="2" />
    </SvgRoot>
  );
}

function Scene2BrickWallCloseUp() {
  return (
    <SvgRoot>
      <BrickPattern />
      <line x1="0" y1="54" x2="160" y2="54" stroke="#c8b49f" strokeWidth={4} strokeLinecap="round" />
      <text x="10" y="42" fill={C_MORTAR} fontSize="10" fontFamily="ui-sans-serif, system-ui" opacity="0.9">
        DPC
      </text>
    </SvgRoot>
  );
}

function Scene2WindowRevealGlazing() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="44" y="28" width="72" height="50" fill={C_STONE} stroke={C_MORTAR} strokeWidth={2} rx="2" />
      <rect x="54" y="36" width="52" height="34" fill="#1d4ed8" opacity="0.15" stroke="#4b5563" strokeWidth={2} rx="1" />
      <rect x="58" y="39" width="44" height="28" fill="none" stroke="#3b82f6" strokeWidth={2} opacity="0.6" rx="1" />
      <rect x="58" y="39" width="44" height="28" fill="none" stroke={C_MORTAR} strokeWidth={1} opacity="0.8" rx="1" />
      <rect x="44" y="62" width="72" height="6" fill="#e9dfd3" opacity="0.9" />
      <rect x="48" y="32" width="64" height="42" fill="none" stroke="#8b6b5a" strokeWidth={2} opacity="0.5" rx="2" />
    </SvgRoot>
  );
}

function Scene2AirBrickSubfloorVent() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="52" y="52" width="56" height="18" fill="#bfb7ae" stroke={C_MORTAR} strokeWidth={2} rx="2" />
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 5 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={56 + c * 10}
            y={56 + r * 5}
            width="7"
            height="3.5"
            fill="#5f646b"
            opacity="0.7"
            rx="1"
          />
        )),
      )}
      <line x1="0" y1="50" x2="160" y2="50" stroke={C_MORTAR} strokeWidth={3} opacity="0.65" />
    </SvgRoot>
  );
}

function Scene2NotFurnitureObjects() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#dde3ea" />
      <rect x="44" y="50" width="72" height="12" fill="#8b5c3c" opacity="0.95" rx="3" />
      <rect x="56" y="62" width="48" height="6" fill="#6f3f28" opacity="0.7" rx="2" />
      <rect x="30" y="34" width="20" height="48" fill="#7a4e33" opacity="0.85" rx="4" />
      <rect x="110" y="34" width="20" height="48" fill="#7a4e33" opacity="0.85" rx="4" />
      <circle cx="98" cy="36" r="14" fill="#9e6b4f" opacity="0.65" />
      <rect x="85" y="38" width="26" height="48" fill="#6f3f28" opacity="0.6" rx="4" />
    </SvgRoot>
  );
}

function Scene3GuttersAndDownpipes() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <rect x="0" y="28" width="160" height="62" fill={C_BRICK} />
      <rect x="18" y="30" width="124" height="10" fill="#6b7280" opacity="0.9" rx="2" />
      <rect x="18" y="34" width="124" height="3" fill={C_STONE} opacity="0.5" rx="2" />
      <rect x="84" y="38" width="14" height="46" fill="#6b7280" opacity="0.95" rx="2" />
      <path d="M84 58 C88 62, 92 66, 98 68" stroke="#8b5e3c" strokeWidth={4} strokeLinecap="round" opacity="0.85" />
      <path d="M86 70 C92 74, 96 78, 98 82" stroke="#6b3d2c" strokeWidth={3} strokeLinecap="round" opacity="0.7" />
      <rect x="0" y="74" width="160" height="16" fill={C_CONCRETE} />
    </SvgRoot>
  );
}

function Scene3FailedPointingRenderCrack() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="0" y="22" width="160" height="68" fill="#e8e0d5" opacity="0.45" />
      <path d="M45 25 L62 40 L80 55 L98 28 L120 46" stroke="#5b2b2b" strokeWidth={3} fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M80 55 L86 58" stroke="#7b3a2b" strokeWidth={3} strokeLinecap="round" opacity="0.6" />
      <path d="M62 40 L56 46" stroke="#7b3a2b" strokeWidth={2} strokeLinecap="round" opacity="0.55" />
      <circle cx="62" cy="40" r="2" fill="#6b2e2e" opacity="0.7" />
      <circle cx="98" cy="28" r="2" fill="#6b2e2e" opacity="0.7" />
    </SvgRoot>
  );
}

function Scene3DpcBridgingWallBase() {
  return (
    <SvgRoot>
      <BrickPattern />
      <line x1="0" y1="56" x2="160" y2="56" stroke="#c8b49f" strokeWidth={4} strokeLinecap="round" opacity="0.95" />
      <path
        d="M0 60 C35 55, 65 55, 110 60 C135 63, 150 66, 160 70 L160 90 L0 90 Z"
        fill={C_SOIL}
        opacity="0.95"
      />
      <path d="M22 68 C50 60, 90 62, 138 74" fill="none" stroke={C_DIRT} strokeWidth={3} opacity="0.55" />
      <rect x="0" y="72" width="160" height="18" fill="#b8bdc4" opacity="0.65" />
    </SvgRoot>
  );
}

function Scene3NotInteriorShots() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e7eef6" />
      <rect x="44" y="18" width="72" height="56" fill={C_STONE} stroke={C_MORTAR} strokeWidth={2} rx="3" />
      <rect x="52" y="26" width="56" height="40" fill="#1d4ed8" opacity="0.12" stroke="#4b5563" strokeWidth={2} rx="2" />
      <path d="M34 20 C30 40, 30 60, 34 82" stroke="#7c2d12" strokeWidth={10} strokeLinecap="round" opacity="0.55" />
      <path d="M126 20 C130 40, 130 60, 126 82" stroke="#7c2d12" strokeWidth={10} strokeLinecap="round" opacity="0.55" />
      <rect x="0" y="70" width="160" height="20" fill="#c2b6a8" opacity="0.95" />
    </SvgRoot>
  );
}

function Scene4TideMarksOnLowerWall() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_BRICK} opacity="0.95" />
      <rect x="0" y="68" width="160" height="22" fill="#d1c7bc" opacity="0.95" />
      <path
        d="M0 80 C20 72, 40 74, 60 66 C80 58, 100 60, 120 54 C140 48, 150 48, 160 46 L160 68 L0 68 Z"
        fill="#5b2b2b"
        opacity="0.75"
      />
      <rect x="0" y="64" width="160" height="2" fill={C_MORTAR} opacity="0.8" />
      <line x1="0" y1="50" x2="160" y2="50" stroke={C_MORTAR} strokeWidth={1} opacity="0.35" />
    </SvgRoot>
  );
}

function Scene4BlackMouldOnWallCeilingCorner() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#c9c5bf" opacity="0.35" />
      <rect x="0" y="0" width="90" height="90" fill="#d3cec6" opacity="0.95" />
      <rect x="70" y="0" width="90" height="90" fill="#c9c4bb" opacity="0.95" />
      <rect x="0" y="68" width="160" height="22" fill="#d1c7bc" opacity="0.95" />
      {Array.from({ length: 14 }).map((_, i) => {
        const cx = 20 + (i % 7) * 10 + (i % 2 ? 4 : 0);
        const cy = 22 + Math.floor(i / 7) * 16 + (i % 2 ? 3 : -2);
        const r = 4 + (i % 3);
        return <circle key={i} cx={cx} cy={cy} r={r} fill="#0b0f18" opacity={0.9 - (i % 4) * 0.12} />;
      })}
      <path d="M0 0 L160 0 L160 10 L0 10 Z" fill="#0b0f18" opacity="0.15" />
    </SvgRoot>
  );
}

function Scene4EfflorescenceSaltDeposits() {
  return (
    <SvgRoot>
      <BrickPattern />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 20 + (i % 3) * 45 + (i % 2 ? 8 : 0);
        const y = 30 + Math.floor(i / 3) * 18 + (i % 2 ? 4 : 0);
        return (
          <g key={i} opacity={0.95}>
            <path d={`M${x} ${y} l6 -4 l6 4 l-6 4 z`} fill="#f8fafc" />
            <path d={`M${x + 10} ${y + 5} l6 -4 l6 4 l-6 4 z`} fill="#ffffff" opacity="0.9" />
            <circle cx={x + 20} cy={y + 10} r={3} fill="#ffffff" opacity="0.8" />
          </g>
        );
      })}
      <rect x="0" y="18" width="160" height="62" fill="#ffffff" opacity="0.06" />
    </SvgRoot>
  );
}

function Scene4NotExteriorOrObjects() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <path d="M0 60 C30 58, 60 66, 90 62 C120 58, 140 52, 160 55 L160 90 L0 90 Z" fill={C_GRASS} />
      <rect x="16" y="68" width="16" height="22" fill="#2f9f4b" opacity="0.75" rx="6" />
      <rect x="128" y="66" width="18" height="24" fill="#2f9f4b" opacity="0.75" rx="6" />
      <circle cx="40" cy="42" r="8" fill="#f59e0b" opacity="0.75" />
    </SvgRoot>
  );
}

function Scene5MoistureMeterOnWall() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="92" y="30" width="52" height="40" rx="10" fill="#111827" opacity="0.92" />
      <rect x="98" y="35" width="40" height="30" rx="8" fill="#0f172a" opacity="0.95" />
      <rect
        x="104"
        y="42"
        width="28"
        height="14"
        rx="3"
        fill="#16a34a"
        opacity="0.15"
        stroke="#22c55e"
        strokeWidth={2}
      />
      <text x="118" y="52" textAnchor="middle" fill="#16a34a" fontSize="10" fontFamily="ui-sans-serif, system-ui">
        18.2
      </text>
      <rect x="84" y="38" width="12" height="26" rx="4" fill="#0f172a" opacity="0.9" />
      <circle cx="89" cy="44" r="2.2" fill="#22c55e" opacity="0.8" />
    </SvgRoot>
  );
}

function Scene5HeightProfileWithScale() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path d="M0 64 C30 58, 60 58, 100 56 C130 54, 148 52, 160 50 L160 64 Z" fill="#5b2b2b" opacity="0.65" />
      <rect x="10" y="28" width="20" height="58" rx="6" fill="#d1d5db" stroke="#9ca3af" strokeWidth={2} />
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1={12 + (i % 2 ? 2 : 6)}
          y1={32 + i * 6}
          x2={28}
          y2={32 + i * 6}
          stroke="#111827"
          strokeWidth={2}
          opacity={0.55}
        />
      ))}
      <text x="16" y="70" fill="#111827" fontSize="8" fontFamily="ui-sans-serif, system-ui" opacity="0.75">
        0.4m
      </text>
      <line x1="28" y1="40" x2="70" y2="36" stroke="#22c55e" strokeWidth={2} opacity="0.65" />
    </SvgRoot>
  );
}

function Scene5NotGeneralRoomView() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e9edf2" />
      <rect x="18" y="16" width="124" height="66" fill="#f8fafc" opacity="0.6" stroke="#cbd5e1" strokeWidth={2} />
      <rect x="28" y="58" width="104" height="18" fill="#c7c0b4" opacity="0.85" />
      <rect x="64" y="46" width="32" height="12" fill="#cbd5e1" opacity="0.45" />
    </SvgRoot>
  );
}

function Scene6ExtractorFanGrille() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.35" />
      <circle cx="95" cy="32" r="20" fill="#0f172a" opacity="0.95" />
      <circle cx="95" cy="32" r="16" fill="#111827" opacity="0.9" />
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={95}
          y1={16}
          x2={95}
          y2={48}
          stroke="#94a3b8"
          strokeWidth={2}
          opacity="0.35"
          transform={`rotate(${i * 10} 95 32)`}
        />
      ))}
      <rect x="0" y="60" width="160" height="30" fill={C_CONCRETE} opacity="0.9" />
    </SvgRoot>
  );
}

function Scene6CondensationOnWindow() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.35" />
      <rect x="38" y="18" width="84" height="56" fill="#e5e7eb" opacity="0.4" stroke="#94a3b8" strokeWidth={2} rx="3" />
      <rect x="44" y="24" width="72" height="44" fill="#60a5fa" opacity="0.12" rx="2" />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 50 + (i % 7) * 10 + (i % 2 ? 2 : 0);
        const y = 26 + Math.floor(i / 7) * 16 + (i % 3 ? 2 : -2);
        return <circle key={i} cx={x} cy={y} r={2.2} fill="#93c5fd" opacity="0.6" />;
      })}
      <rect x="44" y="56" width="72" height="10" rx="4" fill="#dbeafe" opacity="0.55" />
      <rect x="44" y="52" width="72" height="2" fill="#93c5fd" opacity="0.45" />
    </SvgRoot>
  );
}

function Scene6AirBrickAtLowLevel() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="58" y="52" width="44" height="18" fill="#e5e7eb" opacity="0.5" stroke={C_MORTAR} strokeWidth={2} rx="2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={62 + i * 8} y={56} width={5} height={10} rx="1" fill="#374151" opacity="0.55" />
      ))}
      <path d="M0 68 L160 68" stroke={C_MORTAR} strokeWidth={2} opacity="0.5" />
      <rect x="0" y="70" width="160" height="20" fill={C_CONCRETE} opacity="0.85" />
    </SvgRoot>
  );
}

function Scene6NotOutdoorLandscape() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill={C_SKY} />
      <rect x="20" y="36" width="6" height="54" fill="#6b4a2b" opacity="0.9" />
      <circle cx="23" cy="34" r="18" fill={C_GRASS} opacity="0.95" />
      <rect x="132" y="36" width="6" height="54" fill="#6b4a2b" opacity="0.9" />
      <circle cx="135" cy="34" r="18" fill={C_GRASS} opacity="0.95" />
      <path d="M0 62 C35 56, 70 64, 160 58 L160 90 L0 90 Z" fill={C_GRASS} />
    </SvgRoot>
  );
}

function Scene7TideMarkPattern() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path
        d="M0 74 C18 72, 35 68, 54 64 C74 59, 92 56, 110 54 C130 52, 145 50, 160 48 L160 90 L0 90 Z"
        fill="#5b2b2b"
        opacity="0.75"
      />
      <path
        d="M0 66 C20 58, 40 62, 58 56 C76 50, 94 52, 112 47 C130 42, 148 44, 160 40"
        fill="none"
        stroke="#3b2a2a"
        strokeWidth={3}
        opacity="0.6"
        strokeLinecap="round"
      />
    </SvgRoot>
  );
}

function Scene7LocalisedPatchNearWindow() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="48" y="26" width="64" height="48" fill={C_STONE} stroke={C_MORTAR} strokeWidth={2} rx="2" opacity="0.95" />
      <rect x="56" y="34" width="48" height="32" fill="#60a5fa" opacity="0.15" stroke="#94a3b8" strokeWidth={2} rx="1" />
      <path d="M66 62 C56 54, 60 46, 72 42 C84 38, 92 46, 88 58 C86 64, 76 68, 66 62 Z" fill="#5b2b2b" opacity="0.7" />
      <path d="M62 54 L44 44" stroke="#5b2b2b" strokeWidth={2} opacity="0.35" strokeLinecap="round" />
      <path d="M84 58 L100 48" stroke="#5b2b2b" strokeWidth={2} opacity="0.35" strokeLinecap="round" />
    </SvgRoot>
  );
}

function Scene7CeilingStain() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.45" />
      <rect x="20" y="18" width="120" height="54" rx="8" fill="#d1d5db" opacity="0.45" />
      <circle cx="80" cy="44" r="20" fill="#7a4e33" opacity="0.65" />
      <circle cx="80" cy="44" r="12" fill="#5b2b2b" opacity="0.35" />
      <path d="M0 62 L160 58 L160 90 L0 90 Z" fill={C_CONCRETE} opacity="0.55" />
      <circle cx="56" cy="50" r="4" fill="#7a4e33" opacity="0.35" />
      <circle cx="104" cy="48" r="3.5" fill="#7a4e33" opacity="0.35" />
    </SvgRoot>
  );
}

function Scene7NotNoMoistureVisible() {
  return (
    <SvgRoot>
      <BrickPattern />
      <circle cx="118" cy="38" r="1.8" fill="#7a4e33" opacity="0.15" />
      <rect x="0" y="0" width="160" height="90" fill="#ffffff" opacity="0.02" />
    </SvgRoot>
  );
}

function Scene8FloorboardSurface() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#f5efe6" opacity="0.25" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * 16} y={20} width="16" height="70" fill="#b7794f" opacity={0.92 - (i % 3) * 0.08} />
      ))}
      <path d="M0 58 C30 54, 62 52, 96 56 C120 58, 140 60, 160 62 L160 90 L0 90 Z" fill="#5b2b2b" opacity="0.55" />
      <path
        d="M12 48 C28 46, 46 46, 60 50 C74 54, 92 52, 108 48"
        stroke="#5b2b2b"
        strokeWidth={4}
        opacity="0.35"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="0" y="0" width="160" height="24" fill="#d3cec6" opacity="0.4" />
    </SvgRoot>
  );
}

function Scene8SkirtingBoardAtWallBase() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="0" y="62" width="160" height="28" fill="#d1c7bc" opacity="0.95" />
      <path d="M60 62 C55 70, 55 80, 62 90 L66 90 C60 80, 64 70, 72 62 Z" fill="#5b2b2b" opacity="0.55" />
      <path
        d="M0 64 C30 58, 60 70, 90 64 C120 58, 145 60, 160 66"
        stroke="#5b2b2b"
        strokeWidth={4}
        opacity="0.3"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="38" y="66" width="20" height="22" fill="#8b5c3c" opacity="0.65" rx="3" />
    </SvgRoot>
  );
}

function Scene8LiftedCarpetShowingUnderlay() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path d="M0 56 C30 52, 55 60, 78 64 C100 68, 120 70, 160 60 L160 90 L0 90 Z" fill="#1f2937" opacity="0.9" />
      <path d="M30 66 C52 58, 72 60, 92 66 C110 72, 130 74, 150 70" fill="none" stroke="#0b1220" strokeWidth={3} opacity="0.6" strokeLinecap="round" />
      <path d="M48 62 C70 54, 96 56, 120 62 C135 66, 148 70, 160 66 L160 90 L48 90 Z" fill="#5b2b2b" opacity="0.55" />
      <path d="M62 66 C78 60, 94 60, 110 66" stroke="#334155" strokeWidth={4} opacity="0.45" fill="none" strokeLinecap="round" />
    </SvgRoot>
  );
}

function Scene8NotWallOnlyNoTimber() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="0" y="0" width="160" height="90" fill="#ffffff" opacity="0.02" />
      <circle cx="40" cy="45" r="2.2" fill={C_MORTAR} opacity="0.15" />
    </SvgRoot>
  );
}

function Scene9DiagonalCrackAtWindowCorner() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="50" y="24" width="60" height="52" fill={C_STONE} stroke={C_MORTAR} strokeWidth={2} rx="2" />
      <rect x="58" y="32" width="44" height="36" fill="#60a5fa" opacity="0.12" stroke="#94a3b8" strokeWidth={2} rx="1" />
      <path d="M66 28 L54 60 L50 74" stroke="#5b2b2b" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M82 74 L90 52" stroke="#6b2e2e" strokeWidth={2} fill="none" opacity="0.65" strokeLinecap="round" />
    </SvgRoot>
  );
}

function Scene9StairStepCrackingInBrickwork() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path d="M30 28 L48 36 L48 44 L66 52 L66 60 L86 68 L120 62" stroke="#5b2b2b" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="36" r="2" fill="#6b2e2e" opacity="0.6" />
      <circle cx="66" cy="52" r="2" fill="#6b2e2e" opacity="0.6" />
    </SvgRoot>
  );
}

function Scene9FullCrackExtentTopToBottom() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path d="M78 10 L74 30 L74 44 L72 60 L76 80" stroke="#5b2b2b" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d="M86 22 L80 30 L78 46 L82 64 L88 78" stroke="#6b2e2e" strokeWidth={2} fill="none" opacity="0.6" strokeLinecap="round" />
      <circle cx="105" cy="62" r="9" fill={C_CONCRETE} opacity="0.95" stroke="#9ca3af" strokeWidth={2} />
      <text x="105" y="66" textAnchor="middle" fill="#6b7280" fontSize="6" fontFamily="ui-sans-serif, system-ui">
        1
      </text>
    </SvgRoot>
  );
}

function Scene9NotNoCracksVisible() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#f5efe6" opacity="0.25" />
      <rect x="0" y="0" width="160" height="90" fill="#d1c7bc" opacity="0.45" />
      <rect x="0" y="0" width="160" height="90" fill="#ffffff" opacity="0.05" />
      <circle cx="92" cy="34" r="1.6" fill="#5b2b2b" opacity="0.1" />
    </SvgRoot>
  );
}

function Scene10DpcInjectionHoles() {
  return (
    <SvgRoot>
      <BrickPattern rows={8} cols={8} />
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} cx={25 + i * 13} cy={52} r={3} fill="#6b2e2e" opacity="0.25" stroke="#6b2e2e" strokeWidth={1} />
      ))}
      <rect x="0" y="50" width="160" height="4" fill="#c8b49f" opacity="0.45" />
    </SvgRoot>
  );
}

function Scene10WaterproofRenderTanking() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#d1c7bc" opacity="0.22" />
      <BrickPattern />
      <rect x="0" y="34" width="160" height="56" fill="#e5e7eb" opacity="0.6" />
      <path d="M0 38 C40 42, 70 32, 110 36 C140 38, 152 42, 160 40" stroke={C_MORTAR} strokeWidth={4} opacity="0.35" fill="none" />
      <rect x="0" y="40" width="160" height="4" fill="#cfd3d8" opacity="0.8" />
      <line x1="0" y1="44" x2="160" y2="44" stroke="#9ca3af" strokeWidth={2} opacity="0.4" />
    </SvgRoot>
  );
}

function Scene10PatchedRepointedSection() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="44" y="30" width="72" height="46" fill="#f0eadf" opacity="0.72" rx="3" />
      <path d="M44 42 L116 42" stroke="#e5dfd3" strokeWidth={3} opacity="0.9" />
      <path d="M44 56 L116 56" stroke="#e5dfd3" strokeWidth={3} opacity="0.9" />
      <rect x="44" y="30" width="72" height="46" fill="none" stroke="#e5dfd3" strokeWidth={2} opacity="0.6" rx="3" />
    </SvgRoot>
  );
}

function Scene10NotGenericUnmodifiedWall() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="0" y="0" width="160" height="90" fill="#ffffff" opacity="0.03" />
    </SvgRoot>
  );
}

function Scene11LargeScaleMouldCoverage() {
  return (
    <SvgRoot>
      <BrickPattern />
      {Array.from({ length: 22 }).map((_, i) => {
        const x = 10 + (i % 11) * 14 + (i % 3) * 2;
        const y = 22 + Math.floor(i / 11) * 26 + (i % 2 ? 3 : 0);
        const r = 4 + (i % 4);
        return <circle key={i} cx={x} cy={y} r={r} fill="#0b0f18" opacity={0.18 + (i % 4) * 0.08} />;
      })}
      <rect x="0" y="34" width="160" height="42" fill="#0b0f18" opacity="0.08" />
    </SvgRoot>
  );
}

function Scene11FullExtentVisibleWithScale() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#dbe2ea" opacity="0.45" />
      <rect x="0" y="0" width="96" height="90" fill="#d1c7bc" opacity="0.6" />
      <rect x="64" y="0" width="96" height="90" fill="#c9c4bb" opacity="0.6" />
      <rect x="96" y="18" width="34" height="62" fill={C_STONE} opacity="0.8" stroke={C_MORTAR} strokeWidth={2} rx="2" />
      <rect x="100" y="28" width="26" height="44" fill="#60a5fa" opacity="0.08" />
      <path d="M20 86 C30 70, 40 64, 55 56 C72 46, 86 44, 110 48 L110 90 L20 90 Z" fill="#5b2b2b" opacity="0.3" />
      {Array.from({ length: 18 }).map((_, i) => (
        <circle
          key={i}
          cx={20 + (i % 9) * 10 + (i % 2 ? 3 : 0)}
          cy={30 + Math.floor(i / 9) * 24 + (i % 3)}
          r={2.5 + (i % 3) * 0.6}
          fill="#0b0f18"
          opacity="0.12"
        />
      ))}
    </SvgRoot>
  );
}

function Scene11NotMinorOrCleanSurface() {
  return (
    <SvgRoot>
      <BrickPattern />
      <ellipse cx="112" cy="44" rx="10" ry="4" fill="#5b2b2b" opacity="0.08" />
      <circle cx="114" cy="43" r="1.6" fill="#5b2b2b" opacity="0.12" />
    </SvgRoot>
  );
}

function Scene12MoistureMeterInUse() {
  return (
    <SvgRoot>
      <BrickPattern />
      <rect x="96" y="28" width="54" height="44" rx="12" fill="#111827" opacity="0.92" />
      <rect x="102" y="34" width="42" height="30" rx="10" fill="#0f172a" opacity="0.96" />
      <rect
        x="108"
        y="42"
        width="30"
        height="14"
        rx="4"
        fill="#16a34a"
        opacity="0.14"
        stroke="#22c55e"
        strokeWidth={2}
      />
      <text x="123" y="52" textAnchor="middle" fill="#16a34a" fontSize="10" fontFamily="ui-sans-serif, system-ui">
        24%
      </text>
      <path d="M88 45 C92 42, 95 40, 99 40" stroke="#22c55e" strokeWidth={3} opacity="0.6" strokeLinecap="round" />
    </SvgRoot>
  );
}

function Scene12SubfloorHatchOpen() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#c2b6a8" opacity="0.55" />
      <rect x="0" y="54" width="160" height="36" fill="#8b5c3c" opacity="0.45" />
      <rect x="54" y="52" width="52" height="32" fill="#111827" opacity="0.88" rx="6" />
      <path d="M58 55 L102 55 L102 78 L58 78 Z" fill="#0f172a" opacity="0.85" />
      <rect x="66" y="66" width="8" height="12" fill="#6b4a2b" opacity="0.85" />
      <rect x="78" y="64" width="8" height="14" fill="#6b4a2b" opacity="0.8" />
      <rect x="90" y="66" width="8" height="12" fill="#6b4a2b" opacity="0.85" />
      <rect x="0" y="0" width="160" height="44" fill={C_BRICK} opacity="0.35" />
      <path d="M0 44 L160 44" stroke={C_MORTAR} strokeWidth={3} opacity="0.35" />
    </SvgRoot>
  );
}

function Scene12NotEquipmentNotInUse() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.4" />
      <rect x="20" y="52" width="120" height="18" fill={C_CONCRETE} opacity="0.9" rx="6" />
      <rect x="86" y="24" width="50" height="32" rx="12" fill="#111827" opacity="0.92" />
      <rect x="92" y="30" width="38" height="20" rx="10" fill="#0f172a" opacity="0.96" />
      <rect x="98" y="34" width="26" height="12" rx="4" fill="#16a34a" opacity="0.14" stroke="#22c55e" strokeWidth={2} />
      <text x="111" y="42" textAnchor="middle" fill="#16a34a" fontSize="9" fontFamily="ui-sans-serif, system-ui">
        18.0
      </text>
      <rect x="0" y="0" width="160" height="54" fill={C_BRICK} opacity="0.14" />
    </SvgRoot>
  );
}

function Scene13FreshRepointingCompleted() {
  return (
    <SvgRoot>
      <BrickPattern />
      <path d="M0 40 L160 40" stroke="#f6f1e6" strokeWidth={6} opacity="0.85" strokeLinecap="round" />
      <path d="M0 56 L160 56" stroke="#f6f1e6" strokeWidth={6} opacity="0.85" strokeLinecap="round" />
      <rect x="0" y="0" width="160" height="90" fill="#ffffff" opacity="0.03" />
    </SvgRoot>
  );
}

function Scene13InstalledExtractorFan() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.35" />
      <rect x="58" y="28" width="44" height="44" rx="10" fill="#0f172a" opacity="0.95" stroke="#94a3b8" strokeWidth={2} />
      <circle cx="80" cy="50" r="16" fill="#111827" opacity="0.9" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={80}
          y1={34}
          x2={80}
          y2={66}
          stroke="#94a3b8"
          strokeWidth={2}
          opacity="0.45"
          transform={`rotate(${i * 30} 80 50)`}
        />
      ))}
      <circle cx="66" cy="34" r="3" fill="#9ca3af" opacity="0.7" />
      <circle cx="94" cy="34" r="3" fill="#9ca3af" opacity="0.7" />
      <path d="M102 44 C116 52, 116 60, 112 66" stroke="#2563eb" strokeWidth={3} opacity="0.55" fill="none" strokeLinecap="round" />
    </SvgRoot>
  );
}

function Scene13GroundLevelLoweredDpcExposed() {
  return (
    <SvgRoot>
      <BrickPattern />
      <line x1="0" y1="56" x2="160" y2="56" stroke="#c8b49f" strokeWidth={4} strokeLinecap="round" opacity="0.95" />
      <rect x="0" y="60" width="160" height="30" fill={C_CONCRETE} opacity="0.75" />
      <path d="M0 66 C30 64, 70 60, 120 66 C140 68, 150 70, 160 72 L160 90 L0 90 Z" fill={C_SOIL} opacity="0.2" />
      <line x1="0" y1="60" x2="160" y2="60" stroke={C_MORTAR} strokeWidth={2} opacity="0.55" />
    </SvgRoot>
  );
}

function Scene13NotDocumentsPaperwork() {
  return (
    <SvgRoot>
      <rect width="160" height="90" fill="#e5e7eb" opacity="0.4" />
      <rect x="14" y="52" width="132" height="22" fill={C_CONCRETE} opacity="0.9" rx="8" />
      <path
        d="M36 28 L124 28 L124 52 L36 52 Z"
        fill="#ffffff"
        opacity="0.85"
        stroke="#cbd5e1"
        strokeWidth={2}
      />
      <path d="M42 36 L118 36" stroke="#e5e7eb" strokeWidth={2} opacity="0.9" />
      <path d="M42 42 L104 42" stroke="#e5e7eb" strokeWidth={2} opacity="0.9" />
      <circle cx="52" cy="44" r="10" fill="#f59e0b" opacity="0.25" />
    </SvgRoot>
  );
}

export const SECTION_SCENE_CARDS: PhotoGuideSceneCard[][] = [
  [
    {
      id: "s1-facade",
      accepted: true,
      label: "Full exterior facade",
      lightboxTitle: "Full exterior facade",
      description:
        "Capture the full facade including the door and window pattern. Make sure the building outline is complete with sky above and a clear ground line.",
      svg: <Scene1FullExteriorFacade />,
    },
    {
      id: "s1-street",
      accepted: true,
      label: "Street-level with ground",
      lightboxTitle: "Street-level with ground",
      description:
        "Use a low viewpoint so the pavement/ground is visible in the foreground. This helps show the relationship between ground level and the wall base.",
      svg: <Scene1StreetLevelWithGround />,
    },
    {
      id: "s1-context",
      accepted: true,
      label: "Site context & surroundings",
      lightboxTitle: "Site context & surroundings",
      description:
        "Show the building in context with surrounding features like trees or slope direction. Include nearby ground conditions that could influence drainage or moisture pathways.",
      svg: <Scene1SiteContextSurroundings />,
    },
    {
      id: "s1-interior",
      accepted: false,
      label: "Not: interior only",
      lightboxTitle: "Not: interior only",
      description:
        "Rejected because this shows a generic interior without exterior wall fabric. Exterior evidence is needed to assess rising/penetrating damp pathways at the base.",
      svg: <Scene1NotInteriorOnly />,
    },
  ],
  [
    {
      id: "s2-brick-close",
      accepted: true,
      label: "Brick wall close-up",
      lightboxTitle: "Brick wall close-up",
      description:
        "Photograph the wall material clearly, including mortar joints and any visible DPC line. Close-up texture helps identify defects in pointing, render, or blockwork.",
      svg: <Scene2BrickWallCloseUp />,
    },
    {
      id: "s2-window-reveal",
      accepted: true,
      label: "Window reveal & glazing",
      lightboxTitle: "Window reveal & glazing",
      description:
        "Include the full window frame and deep reveal so damp patterns at the junction are visible. Show glazing edges and the sill for accurate assessment of moisture entry routes.",
      svg: <Scene2WindowRevealGlazing />,
    },
    {
      id: "s2-airbrick",
      accepted: true,
      label: "Air brick / subfloor vent",
      lightboxTitle: "Air brick / subfloor vent",
      description:
        "Capture the air brick or subfloor vent at low level with the surrounding wall fabric. A clear view of the grille and clearance from ground assists with ventilation diagnosis.",
      svg: <Scene2AirBrickSubfloorVent />,
    },
    {
      id: "s2-furniture",
      accepted: false,
      label: "Not: furniture / objects",
      lightboxTitle: "Not: furniture / objects",
      description:
        "Rejected because the photo focuses on objects or furnishings rather than wall material. The goal is to show construction surfaces where damp evidence would appear.",
      svg: <Scene2NotFurnitureObjects />,
    },
  ],
  [
    {
      id: "s3-gutters",
      accepted: true,
      label: "Gutters & downpipes",
      lightboxTitle: "Gutters & downpipes",
      description:
        "Photograph the gutter run and the downpipe, including joints and any overflow staining below. Evidence just after rain is especially useful for confirming water ingress pathways.",
      svg: <Scene3GuttersAndDownpipes />,
    },
    {
      id: "s3-crack",
      accepted: true,
      label: "Failed pointing / render crack",
      lightboxTitle: "Failed pointing / render crack",
      description:
        "Show the defective render or pointing with a crack line clearly visible. Include enough context around the crack so it can be related to moisture entry routes.",
      svg: <Scene3FailedPointingRenderCrack />,
    },
    {
      id: "s3-dpc-bridge",
      accepted: true,
      label: "DPC bridging at wall base",
      lightboxTitle: "DPC bridging at wall base",
      description:
        "Include the wall base and show soil or paving raised above the DPC line. This type of bridging can drive moisture up the wall and worsen damp outcomes.",
      svg: <Scene3DpcBridgingWallBase />,
    },
    {
      id: "s3-interior",
      accepted: false,
      label: "Not: interior shots",
      lightboxTitle: "Not: interior shots",
      description:
        "Rejected because the image is clearly indoors (for example, window and curtains). This section needs exterior defect evidence and wall-base moisture pathways.",
      svg: <Scene3NotInteriorShots />,
    },
  ],
  [
    {
      id: "s4-tide",
      accepted: true,
      label: "Tide marks on lower wall",
      lightboxTitle: "Tide marks on lower wall",
      description:
        "Show the lower wall and skirting junction with a visible horizontal band of staining rising upwards. The height and shape of the tide mark help indicate damp type and extent.",
      svg: <Scene4TideMarksOnLowerWall />,
    },
    {
      id: "s4-mould",
      accepted: true,
      label: "Black mould on wall/ceiling",
      lightboxTitle: "Black mould on wall/ceiling",
      description:
        "Capture mould growth in a wall corner or where it extends up to the ceiling line. A close view of colony clusters supports diagnosis of ventilation-related or penetrating damp sources.",
      svg: <Scene4BlackMouldOnWallCeilingCorner />,
    },
    {
      id: "s4-efflorescence",
      accepted: true,
      label: "Efflorescence (salt deposits)",
      lightboxTitle: "Efflorescence (salt deposits)",
      description:
        "Photograph white crystalline patches on brick/render surfaces. Efflorescence evidence can indicate active salt transport through damp masonry.",
      svg: <Scene4EfflorescenceSaltDeposits />,
    },
    {
      id: "s4-garden",
      accepted: false,
      label: "Not: exterior or objects",
      lightboxTitle: "Not: exterior or objects",
      description:
        "Rejected because the image shows an outdoor garden scene rather than interior damp evidence. This section focuses on internal signs like tide marks, mould, or efflorescence.",
      svg: <Scene4NotExteriorOrObjects />,
    },
  ],
  [
    {
      id: "s5-meter",
      accepted: true,
      label: "Moisture meter on wall",
      lightboxTitle: "Moisture meter on wall",
      description:
        "Show the handheld moisture meter contacting the wall surface. Make the reading and the contact point visible in the same frame.",
      svg: <Scene5MoistureMeterOnWall />,
    },
    {
      id: "s5-profile",
      accepted: true,
      label: "Height profile with scale",
      lightboxTitle: "Height profile with scale",
      description:
        "Include the tape measure or scale reference alongside the tide mark. This allows the surveyor to estimate measurement height and relate it to readings or moisture-rise profiles.",
      svg: <Scene5HeightProfileWithScale />,
    },
    {
      id: "s5-room",
      accepted: false,
      label: "Not: general room view",
      lightboxTitle: "Not: general room view",
      description:
        "Rejected because it shows a general room outline without equipment or measurable moisture evidence. This section needs visible readings or clear scale-based staining.",
      svg: <Scene5NotGeneralRoomView />,
    },
  ],
  [
    {
      id: "s6-fan",
      accepted: true,
      label: "Extractor fan grille",
      lightboxTitle: "Extractor fan grille",
      description:
        "Photograph the grille of an extractor fan (kitchen/bathroom) clearly. An up-close view helps confirm whether the louvres/grille are blocked or functioning.",
      svg: <Scene6ExtractorFanGrille />,
    },
    {
      id: "s6-condensation",
      accepted: true,
      label: "Condensation on window",
      lightboxTitle: "Condensation on window",
      description:
        "Show condensation droplets and any fogging along the lower edge of the window. This supports humidity and ventilation diagnosis for the room.",
      svg: <Scene6CondensationOnWindow />,
    },
    {
      id: "s6-airbrick",
      accepted: true,
      label: "Air brick at low level",
      lightboxTitle: "Air brick at low level",
      description:
        "Capture an air brick/vent near floor level with surrounding wall fabric visible. The condition and clearance can indicate whether ventilation is adequate.",
      svg: <Scene6AirBrickAtLowLevel />,
    },
    {
      id: "s6-outdoor",
      accepted: false,
      label: "Not: outdoor landscape",
      lightboxTitle: "Not: outdoor landscape",
      description:
        "Rejected because this is an outdoor landscape without building ventilation elements. Ventilation evidence is required (fans, trickle vents, condensation patterns).",
      svg: <Scene6NotOutdoorLandscape />,
    },
  ],
  [
    {
      id: "s7-tide",
      accepted: true,
      label: "Tide mark pattern",
      lightboxTitle: "Tide mark pattern",
      description:
        "Photograph the tide mark from the floor level upwards with a clear wavy top edge. The shape and height pattern help indicate damp type and moisture route.",
      svg: <Scene7TideMarkPattern />,
    },
    {
      id: "s7-window",
      accepted: true,
      label: "Localised patch near window",
      lightboxTitle: "Localised patch near window",
      description:
        "Show the window reveal and a local damp patch radiating from the junction. Capturing surrounding edges supports accurate moisture source identification.",
      svg: <Scene7LocalisedPatchNearWindow />,
    },
    {
      id: "s7-ceiling",
      accepted: true,
      label: "Ceiling stain",
      lightboxTitle: "Ceiling stain",
      description:
        "Capture an overhead view of the ceiling stain, including circular brown spotting patterns. This can indicate condensation damp or moisture transfer from above.",
      svg: <Scene7CeilingStain />,
    },
    {
      id: "s7-clean",
      accepted: false,
      label: "Not: no moisture visible",
      lightboxTitle: "Not: no moisture visible",
      description:
        "Rejected because there is no meaningful moisture evidence visible. This section relies on visible damp patterns to support diagnosis.",
      svg: <Scene7NotNoMoistureVisible />,
    },
  ],
  [
    {
      id: "s8-floorboards",
      accepted: true,
      label: "Floorboard surface condition",
      lightboxTitle: "Floorboard surface condition",
      description:
        "Show floorboards clearly with visible staining patches or wet/dry condition. Parallel plank views help confirm where moisture has affected the timber.",
      svg: <Scene8FloorboardSurface />,
    },
    {
      id: "s8-skirting",
      accepted: true,
      label: "Skirting board at wall base",
      lightboxTitle: "Skirting board at wall base",
      description:
        "Photograph the skirting at the wall base junction, especially where there is a gap or decay. This helps assess timber exposure and potential rot progression.",
      svg: <Scene8SkirtingBoardAtWallBase />,
    },
    {
      id: "s8-carpet",
      accepted: true,
      label: "Lifted carpet showing underlay",
      lightboxTitle: "Lifted carpet showing underlay",
      description:
        "Lift back the carpet to show the underlay or subfloor beneath. A clear wall junction improves interpretation of damp influence on timber surfaces.",
      svg: <Scene8LiftedCarpetShowingUnderlay />,
    },
    {
      id: "s8-wall-only",
      accepted: false,
      label: "Not: wall only, no timber",
      lightboxTitle: "Not: wall only, no timber",
      description:
        "Rejected because there are no timber/floor elements visible. This section focuses on accessible timber condition and junction integrity.",
      svg: <Scene8NotWallOnlyNoTimber />,
    },
  ],
  [
    {
      id: "s9-diagonal",
      accepted: true,
      label: "Diagonal crack at window corner",
      lightboxTitle: "Diagonal crack at window corner",
      description:
        "Capture the window corner with a diagonal crack running from the junction. Include enough surrounding masonry to assess structural relevance.",
      svg: <Scene9DiagonalCrackAtWindowCorner />,
    },
    {
      id: "s9-stair-step",
      accepted: true,
      label: "Stair-step cracking in brickwork",
      lightboxTitle: "Stair-step cracking in brickwork",
      description:
        "Show the stepped crack pattern following mortar joints. Clear views help estimate crack width and identify potential causes affecting damp risk.",
      svg: <Scene9StairStepCrackingInBrickwork />,
    },
    {
      id: "s9-full",
      accepted: true,
      label: "Full crack extent — top to bottom",
      lightboxTitle: "Full crack extent — top to bottom",
      description:
        "Photograph the complete crack extent from top to bottom. Include a simple scale marker (like a coin) to estimate crack width and severity.",
      svg: <Scene9FullCrackExtentTopToBottom />,
    },
    {
      id: "s9-clean",
      accepted: false,
      label: "Not: no cracks visible",
      lightboxTitle: "Not: no cracks visible",
      description:
        "Rejected because no cracks or structural defect evidence is visible. The surveyor needs clear crack geometry for this section.",
      svg: <Scene9NotNoCracksVisible />,
    },
  ],
  [
    {
      id: "s10-holes",
      accepted: true,
      label: "DPC injection holes",
      lightboxTitle: "DPC injection holes",
      description:
        "Photograph the row of evenly spaced drill holes in the mortar course. This supports confirmation of chemical DPC injection history and treatment approach.",
      svg: <Scene10DpcInjectionHoles />,
    },
    {
      id: "s10-render",
      accepted: true,
      label: "Waterproof render / tanking",
      lightboxTitle: "Waterproof render / tanking",
      description:
        "Show the wall section where waterproof render/tanking edges and thickness can be seen. Clear layer boundaries are needed to judge treatment integrity.",
      svg: <Scene10WaterproofRenderTanking />,
    },
    {
      id: "s10-patch",
      accepted: true,
      label: "Patched / re-pointed section",
      lightboxTitle: "Patched / re-pointed section",
      description:
        "Capture the patched area where lighter fresh mortar contrasts with older pointing. This colour/texture difference helps the surveyor evaluate past remediation quality.",
      svg: <Scene10PatchedRepointedSection />,
    },
    {
      id: "s10-unmodified",
      accepted: false,
      label: "Not: generic unmodified wall",
      lightboxTitle: "Not: generic unmodified wall",
      description:
        "Rejected because there is no visible evidence of treatment or repairs. This section requires clear prior intervention indicators on building fabric.",
      svg: <Scene10NotGenericUnmodifiedWall />,
    },
  ],
  [
    {
      id: "s11-mould-wide",
      accepted: true,
      label: "Large-scale mould coverage",
      lightboxTitle: "Large-scale mould coverage",
      description:
        "Capture a wide view showing extensive mould coverage across the affected surface area. Include as much of the damaged area as possible to estimate extent.",
      svg: <Scene11LargeScaleMouldCoverage />,
    },
    {
      id: "s11-scale",
      accepted: true,
      label: "Full extent visible with scale",
      lightboxTitle: "Full extent visible with scale",
      description:
        "Show the full impacted area and include a reference such as a doorframe or furniture for scale. This helps the surveyor classify severity and measure extent more reliably.",
      svg: <Scene11FullExtentVisibleWithScale />,
    },
    {
      id: "s11-minor",
      accepted: false,
      label: "Not: minor or clean surface",
      lightboxTitle: "Not: minor or clean surface",
      description:
        "Rejected because only a tiny or barely visible mark is shown. This section needs clear evidence and measurable affected area.",
      svg: <Scene11NotMinorOrCleanSurface />,
    },
  ],
  [
    {
      id: "s12-meter-in-use",
      accepted: true,
      label: "Moisture meter in use",
      lightboxTitle: "Moisture meter in use",
      description:
        "Photograph the moisture meter being used with direct contact to wall or floor fabric. Show the device touching the surface and include the display reading if possible.",
      svg: <Scene12MoistureMeterInUse />,
    },
    {
      id: "s12-hatch-open",
      accepted: true,
      label: "Subfloor hatch open",
      lightboxTitle: "Subfloor hatch open",
      description:
        "Show an open inspection hatch with the subfloor/void area visible beneath. Include enough context to confirm which structural elements can be assessed.",
      svg: <Scene12SubfloorHatchOpen />,
    },
    {
      id: "s12-not-in-use",
      accepted: false,
      label: "Not: equipment not in use",
      lightboxTitle: "Not: equipment not in use",
      description:
        "Rejected because the equipment is not being used on building fabric (for example, sitting on a table). This section needs an active method and contact evidence.",
      svg: <Scene12NotEquipmentNotInUse />,
    },
  ],
  [
    {
      id: "s13-repointing",
      accepted: true,
      label: "Fresh repointing completed",
      lightboxTitle: "Fresh repointing completed",
      description:
        "Photograph completed repointing where fresh, light mortar contrasts with older darker joints. Close-up texture helps judge whether the repair has been done cleanly.",
      svg: <Scene13FreshRepointingCompleted />,
    },
    {
      id: "s13-fan-installed",
      accepted: true,
      label: "Installed extractor fan",
      lightboxTitle: "Installed extractor fan",
      description:
        "Show the installed extractor fan unit mounted on the wall/ceiling. Include visible fixing points and wiring where possible to confirm correct installation.",
      svg: <Scene13InstalledExtractorFan />,
    },
    {
      id: "s13-ground-lowered",
      accepted: true,
      label: "Ground level lowered at wall base",
      lightboxTitle: "Ground level lowered at wall base",
      description:
        "Capture the wall base after ground clearance so the DPC line is exposed. This indicates the ground bridging has been reduced and improves assessment confidence.",
      svg: <Scene13GroundLevelLoweredDpcExposed />,
    },
    {
      id: "s13-paperwork",
      accepted: false,
      label: "Not: documents / paperwork",
      lightboxTitle: "Not: documents / paperwork",
      description:
        "Rejected because the photo shows paperwork on a table rather than building fabric remediation evidence. This section needs actual repair or installed measures visible on-site.",
      svg: <Scene13NotDocumentsPaperwork />,
    },
  ],
];

