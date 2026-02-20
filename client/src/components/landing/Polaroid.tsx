interface PolaroidProps {
  src: string;
  x: string;
  y: string;
  r: string;
  z: number;
}

export default function Polaroid({ src, x, y, r, z }: PolaroidProps) {
  return (
    <div
      className="polaroid"
      style={{
        "--x": x,
        "--y": y,
        "--r": r,
        "--z": z,
      } as React.CSSProperties}
    >
      <img src={src} alt="" loading="lazy" />
    </div>
  );
}
