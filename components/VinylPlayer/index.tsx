"use client";

import { useEffect, useRef } from "react";

type Props = {
  isPlaying: boolean;
  size?: number;
};

export default function VinylPlayer({ isPlaying, size = 240 }: Props) {
  const diskRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);

  useEffect(() => {
    const el = diskRef.current;
    if (!el) return;

    if (isPlaying) {
      if (!animRef.current) {
        animRef.current = el.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: 3000, iterations: Infinity }
        );
      } else {
        animRef.current.play();
      }
    } else {
      animRef.current?.pause();
    }
  }, [isPlaying]);

  const r = size / 2;
  const tracks = [0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.94];

  return (
    <div
      ref={diskRef}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        flexShrink: 0,
        willChange: "transform",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer disk */}
        <circle cx={r} cy={r} r={r} fill="#0d0d0d" />
        {/* Vinyl grooves */}
        {tracks.map((ratio, i) => (
          <circle
            key={i}
            cx={r}
            cy={r}
            r={r * ratio}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
        ))}
        {/* Shine arc */}
        <path
          d={`M ${r * 0.4} ${r * 0.15} A ${r * 0.85} ${r * 0.85} 0 0 1 ${r * 1.6} ${r * 0.15}`}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Label background */}
        <circle cx={r} cy={r} r={r * 0.28} fill="#E8522A" />
        {/* Label text ring */}
        <circle cx={r} cy={r} r={r * 0.25} fill="#cc4422" />
        {/* Center hole */}
        <circle cx={r} cy={r} r={r * 0.06} fill="#0a0a0a" />

        {/* UNDER text */}
        <text
          x={r}
          y={r - 4}
          textAnchor="middle"
          fill="white"
          fontSize={r * 0.1}
          fontWeight="900"
          fontFamily="Arial Black, sans-serif"
        >
          UNDER
        </text>
        <text
          x={r}
          y={r + r * 0.12}
          textAnchor="middle"
          fill="white"
          fontSize={r * 0.09}
          fontWeight="700"
          fontFamily="Arial Black, sans-serif"
        >
          HITS
        </text>
      </svg>
    </div>
  );
}
