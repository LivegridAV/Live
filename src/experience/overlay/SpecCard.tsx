"use client";
import { useExperience } from "../store";

/** Floating glass specification card for clicked equipment. */
export default function SpecCard() {
  const specCard = useExperience((s) => s.specCard);
  const setSpecCard = useExperience((s) => s.setSpecCard);

  if (!specCard) return null;

  return (
    <div className="lg-modal" role="dialog" aria-label={specCard.name} onClick={() => setSpecCard(null)}>
      <div className="lg-modal-card" onClick={(e) => e.stopPropagation()}>
        <p className="lg-modal-eyebrow">EQUIPMENT SPEC</p>
        <h3>{specCard.name}</h3>
        <p className="lg-modal-role">{specCard.role}</p>
        <dl className="lg-spec-list">
          {specCard.specs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <button className="lg-btn" onClick={() => setSpecCard(null)}>Close</button>
      </div>
    </div>
  );
}
