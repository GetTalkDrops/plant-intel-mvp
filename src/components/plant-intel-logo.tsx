interface PlantIntelLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function PlantIntelLogo({
  className = "",
  width = 200,
  height = 60,
}: PlantIntelLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 60"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gear/dot pattern icon */}
      <g transform="translate(20, 30)">
        {/* Center circle */}
        <circle
          cx="0"
          cy="0"
          r="3"
          fill="currentColor"
          className="text-blue-600"
        />

        {/* Surrounding dots in gear pattern */}
        <circle
          cx="8"
          cy="0"
          r="2"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="-8"
          cy="0"
          r="2"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="0"
          cy="8"
          r="2"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="0"
          cy="-8"
          r="2"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="6"
          cy="6"
          r="1.5"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="-6"
          cy="6"
          r="1.5"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="6"
          cy="-6"
          r="1.5"
          fill="currentColor"
          className="text-blue-600"
        />
        <circle
          cx="-6"
          cy="-6"
          r="1.5"
          fill="currentColor"
          className="text-blue-600"
        />
      </g>

      {/* PLANT INTEL text */}
      <text
        x="50"
        y="37"
        fontFamily="Inter, sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="currentColor"
        className="text-gray-700"
      >
        PLANT INTEL
      </text>
    </svg>
  );
}
