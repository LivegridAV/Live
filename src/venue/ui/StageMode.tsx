"use client";
import { useVenue } from "../systems/store";

/**
 * The stage-mode controller.
 *
 * One stage, two creative directions. The switch is real: it changes the
 * content on every surface, the colour of the room, and how the movers behave —
 * while the trusses, the wall and the PA stay exactly where they are. That
 * contrast is the whole point, so the control only appears once the visitor is
 * close enough to see both halves of it.
 */
export function StageModeSwitch() {
  const zone = useVenue((s) => s.zone);
  const entered = useVenue((s) => s.entered);
  const mode = useVenue((s) => s.stageMode);
  const setMode = useVenue((s) => s.setStageMode);
  const panelOpen = useVenue((s) => s.activePavilion);
  const contactOpen = useVenue((s) => s.progress > 0.975);

  const pastVenue = useVenue((s) => s.pastVenue);
  const inRange = zone === "arena" || zone === "stage" || zone === "approach";
  const visible = entered && inRange && !panelOpen && !contactOpen && !pastVenue;

  return (
    <div
      className="v-stagemode"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
      }}
      aria-hidden={!visible}
    >
      <span className="v-mono">Stage experience</span>
      <div className="v-stagemode-switch" role="group" aria-label="Stage experience mode">
        {(["corporate", "festival"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="v-stagemode-btn"
            data-mode={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            tabIndex={visible ? 0 : -1}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
