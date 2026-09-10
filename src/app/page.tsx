import "./v2.css";
import V2Home from "@/components/v2/V2Home";

/**
 * The LivegridAV homepage — the V2 design: an editorial 2D foundation with a
 * physical anamorphic LED-corner hero (grounded tiger) that reads premium with
 * or without WebGL. The previous immersive venue is preserved at /experience.
 */
export default function Home() {
  return (
    <div className="v2root" id="top">
      <V2Home />
    </div>
  );
}
