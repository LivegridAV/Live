"use client";
import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { useVenue } from "../systems/store";
import { WarmScope, afterWarmup, warmSubtree, warmupGateOpen, type WarmWork } from "../three/warmScene";
import { startVenueStreaming, visitorAt } from "./stream";
import { LiteGroup } from "./LiteGroup";

/**
 * Starts the background streamer for this venue's lifetime. Rendered once in
 * Scene. `full`: review, capture and inspection modes, which load every full
 * group before opening and never fetch a light pack.
 */
export function VenueStreaming({ full }: { full: boolean }) {
  const gl = useThree(state => state.gl);
  const phone = useVenue(state => state.isPhone);
  const sinceReport = useRef(0);
  useEffect(() => {
    fullClaims.reset();
    liteClaims.reset();
    return startVenueStreaming(gl, { full });
  }, [gl, full]);
  // Phones stream only the zones near the visitor (stream.ts, PHONE_LOOKAHEAD_M):
  // report where the camera is, a few times a second.
  useFrame(({ camera }, dt) => {
    if (!phone) return;
    sinceReport.current += dt;
    if (sinceReport.current < 0.25) return;
    sinceReport.current = 0;
    visitorAt(camera.position.z);
  });
  return null;
}

/*
 * A group may be gated in several places (e.g. a zone and the hall bay beside
 * it). It counts as warm (its full version, or its light pack) once every
 * instance mounted for it has warmed.
 */
function claims(mark: (id: string) => void) {
  const unwarmed = new Map<string, number>();
  const warmedSome = new Set<string>();
  return {
    reset() { warmedSome.clear(); },
    claim(id: string) {
      unwarmed.set(id, (unwarmed.get(id) ?? 0) + 1);
      let open = true;
      return (warmed: boolean) => {
        if (!open) return;
        open = false;
        const left = (unwarmed.get(id) ?? 1) - 1;
        unwarmed.set(id, left);
        if (warmed) warmedSome.add(id);
        if (left === 0 && warmedSome.has(id)) mark(id);
      };
    },
  };
}
const fullClaims = claims(id => useVenue.getState().markGroupWarm(id));
const liteClaims = claims(id => useVenue.getState().markLiteWarm(id));

/**
 * Holds a load group's part of the scene back until its files are in memory.
 *
 * Until the group is warm it renders `lite`: by default, once the group's
 * light pack has arrived (normal visits; review modes load full groups only),
 * the zone's own children in lite mode (LiteGroup), i.e. the light pack at the
 * same transforms, shader-warmed before it shows (then reported lite-warm);
 * nothing before that. Once the streamer reports the group ready it mounts `children`
 * hidden, warms that subtree's shaders and uploads during idle time, runs the
 * group's deferred bakes, then swaps lite for full in one commit and reports
 * the group warm. The swap happens as soon as the group is warm: usually
 * while the zone is still beyond its switch-on distance (hidden), and at once
 * when a visitor has jumped inside it. The surrounding `ZoneGroup` still
 * decides distance visibility as before.
 */
export function LoadGroupGate({ id, children, lite }: { id: string; children: ReactNode; lite?: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(() => useVenue.getState().readyGroups.includes(id));
  const [liteReady, setLiteReady] = useState(() => useVenue.getState().liteGroups.includes(id));
  const [warm, setWarm] = useState(false);
  const release = useRef<((warmed: boolean) => void) | null>(null);
  useEffect(() => {
    const done = fullClaims.claim(id);
    release.current = done;
    return () => { done(false); release.current = null; };
  }, [id]);
  useEffect(() => {
    if (ready) return;
    // Listen only until the group is ready: the store updates every scroll frame.
    let liteSeen = false;
    const check = (state: { readyGroups: string[]; liteGroups: string[] }) => {
      if (!liteSeen && state.liteGroups.includes(id)) { liteSeen = true; setLiteReady(true); }
      if (!state.readyGroups.includes(id)) return;
      unsubscribe();
      // A transition lets React yield between the group's models while they
      // are cloned and prepared, instead of one long task.
      startTransition(() => setReady(true));
    };
    const unsubscribe = useVenue.subscribe(check);
    check(useVenue.getState());
    return unsubscribe;
  }, [id, ready]);
  // Both state changes land in one commit: the lite subtree unmounts and the
  // full one is shown (WarmGroup's layout effect) before the next frame.
  const onWarm = useMemo(() => () => { setWarm(true); release.current?.(true); }, []);
  return <>
    {ready && <WarmGroup shown={warm} onWarm={onWarm}>{children}</WarmGroup>}
    {!warm && (lite !== undefined ? lite : liteReady ? <LiteLayer id={id}>{children}</LiteLayer> : null)}
  </>;
}

/** The light pack: warmed like a group before it shows, so it never compiles in a frame. */
function LiteLayer({ id, children }: { id: string; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  const release = useRef<((warmed: boolean) => void) | null>(null);
  useEffect(() => {
    const done = liteClaims.claim(id);
    release.current = done;
    return () => { done(false); release.current = null; };
  }, [id]);
  const onWarm = useMemo(() => () => { setShown(true); release.current?.(true); }, []);
  return <WarmGroup shown={shown} onWarm={onWarm}><LiteGroup id={id}>{children}</LiteGroup></WarmGroup>;
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const idle = () => new Promise<void>(resolve => {
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 1000 });
  else setTimeout(resolve, 0);
});

/** Deferred work (contact-shadow bakes) inside one gate, released after its warm-up. */
function createScope() {
  const queue = new Set<WarmWork>();
  let opened = false;
  return {
    after(work: WarmWork) {
      if (opened) return afterWarmup(work);
      queue.add(work);
      return () => { queue.delete(work); };
    },
    /** Run the queued work; resolves when it has finished (async bakes included). */
    open(): Promise<void> {
      opened = true;
      const queued = [...queue];
      queue.clear();
      // Before the venue opens, the venue's own warm-up runs the bakes (and
      // waits on this group to be warm first), so they are handed to it.
      if (!warmupGateOpen()) { queued.forEach(work => afterWarmup(work)); return Promise.resolve(); }
      return Promise.all(queued.map(work => Promise.resolve(work()).catch(error => {
        console.warn("[venue] deferred group work failed", error);
      }))).then(() => undefined);
    },
  };
}

function WarmGroup({ children, shown, onWarm }: { children: ReactNode; shown: boolean; onWarm: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const get = useThree(state => state.get);
  const scope = useMemo(() => createScope(), []);
  // Hidden from the first frame: only the warm-up draws it until it is warm.
  // Shown in the same commit that unmounts the light pack.
  useLayoutEffect(() => { if (ref.current) ref.current.visible = shown; }, [shown]);
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    void (async () => {
      // A couple of frames for late effects (media textures, painters), then idle time.
      await nextFrame(); await nextFrame();
      await idle();
      const root = ref.current;
      if (cancelled || !root) return;
      const { gl, scene, camera } = get();
      try { await warmSubtree(gl, scene, camera, root, isCancelled); }
      catch (error) { console.warn("[venue] load group warm-up failed", error); }
      if (cancelled) return;
      await scope.open();
      if (cancelled || !ref.current) return;
      onWarm();
    })();
    return () => { cancelled = true; };
  }, [get, onWarm, scope]);
  return <WarmScope.Provider value={scope.after}><group ref={ref}>{children}</group></WarmScope.Provider>;
}
