"use client";
import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { useVenue } from "../systems/store";
import { WarmScope, afterWarmup, warmSubtree, warmupGateOpen, type WarmWork } from "../three/warmScene";
import { startVenueStreaming } from "./stream";

/** Starts the background streamer for this venue's lifetime. Rendered once in Scene. */
export function VenueStreaming() {
  useEffect(() => {
    warmedSome.clear();
    return startVenueStreaming();
  }, []);
  return null;
}

/*
 * A group may be gated in several places (e.g. a zone and the hall bay beside
 * it). It counts as warm once every gate instance mounted for it has warmed.
 */
const unwarmed = new Map<string, number>();
const warmedSome = new Set<string>();
function claim(id: string) {
  unwarmed.set(id, (unwarmed.get(id) ?? 0) + 1);
  let open = true;
  return (warmed: boolean) => {
    if (!open) return;
    open = false;
    const left = (unwarmed.get(id) ?? 1) - 1;
    unwarmed.set(id, left);
    if (warmed) warmedSome.add(id);
    if (left === 0 && warmedSome.has(id)) useVenue.getState().markGroupWarm(id);
  };
}

/**
 * Holds a load group's part of the scene back until its files are in memory.
 *
 * Until the streamer reports the group ready it renders `lite` (Task 5's
 * light pack; nothing until then). Once ready it mounts `children` hidden,
 * warms that subtree's shaders and uploads during idle time, runs the
 * group's deferred bakes, then shows it and reports the group warm. The
 * surrounding `ZoneGroup` still decides distance visibility as before.
 */
export function LoadGroupGate({ id, children, lite }: { id: string; children: ReactNode; lite?: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(() => useVenue.getState().readyGroups.includes(id));
  const [warm, setWarm] = useState(false);
  const release = useRef<((warmed: boolean) => void) | null>(null);
  useEffect(() => {
    const done = claim(id);
    release.current = done;
    return () => { done(false); release.current = null; };
  }, [id]);
  useEffect(() => {
    const check = (state: { readyGroups: string[] }) => {
      // A transition lets React yield between the group's models while they
      // are cloned and prepared, instead of one long task.
      if (state.readyGroups.includes(id)) startTransition(() => setReady(true));
    };
    check(useVenue.getState());
    return useVenue.subscribe(check);
  }, [id]);
  const onWarm = useMemo(() => () => { setWarm(true); release.current?.(true); }, []);
  return <>
    {ready && <WarmGroup onWarm={onWarm}>{children}</WarmGroup>}
    {!warm && (lite ?? null)}
  </>;
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

function WarmGroup({ children, onWarm }: { children: ReactNode; onWarm: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const get = useThree(state => state.get);
  const scope = useMemo(() => createScope(), []);
  // Hidden from the first frame: only the warm-up draws it until it is ready.
  useLayoutEffect(() => { if (ref.current) ref.current.visible = false; }, []);
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
      ref.current.visible = true;
      onWarm();
    })();
    return () => { cancelled = true; };
  }, [get, onWarm, scope]);
  return <WarmScope.Provider value={scope.after}><group ref={ref}>{children}</group></WarmScope.Provider>;
}
