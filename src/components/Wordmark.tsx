export default function Wordmark({
  className,
  accent = "aqua",
}: {
  className?: string;
  accent?: "aqua" | "glow";
}) {
  return (
    <span
      className={className}
      style={{ fontWeight: 600, letterSpacing: "-0.03em" }}
    >
      livegrid<span className={accent === "glow" ? "text-glow" : "text-aqua"}>AV</span>
    </span>
  );
}
