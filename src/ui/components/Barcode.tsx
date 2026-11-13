
interface BarcodeProps {
  fingerprint: string;
  className?: string;
}

export function Barcode({ fingerprint, className = '' }: BarcodeProps) {
  if (!fingerprint || fingerprint.length < 16) {
    return null;
  }

  // Parse pairs of hex digits (up to 32 bytes)
  const bytes: number[] = [];
  for (let i = 0; i < fingerprint.length; i += 2) {
    bytes.push(parseInt(fingerprint.substring(i, i + 2), 16));
  }

  return (
    <div className={`flex items-end justify-center h-14 bg-white p-2 rounded border border-ink ${className}`}>
      <svg
        viewBox="0 0 240 40"
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {bytes.map((byte, i) => {
          // Bar width between 1 and 4 px based on byte value
          const barWidth = 1 + (byte % 4);
          const x = i * 7.2;
          const barHeight = 28 + (byte % 12);
          const y = 40 - barHeight;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#0F0F0F"
            />
          );
        })}
      </svg>
    </div>
  );
}
