export default function Wordmark({
  className,
}: {
  className?: string;
  accent?: "aqua" | "glow";
}) {
  return (
    <span
      className={className}
      style={{ fontWeight: 600, letterSpacing: "-0.03em", color: "#ffffff" }}
    >
      livegrid<span style={{ color: "#3fd6c8" }}>AV</span>
    </span>
  );
}
