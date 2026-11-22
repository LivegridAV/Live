"use client";
import { createContext, useContext } from "react";

/**
 * Lite mode: a load-group gate renders its zone inside this context until the
 * group is warm (see LiteGroup.tsx). Under it, models load their
 * `<name>.lite.glb` (useModelUrl), screens show a plain dark panel with no
 * media fetch (useMedia), and the heavy extras are skipped: contact-shadow
 * bakes, the basin reflection, haze and painter artwork.
 */
export const LiteMode = createContext(false);

export const useLiteMode = () => useContext(LiteMode);
