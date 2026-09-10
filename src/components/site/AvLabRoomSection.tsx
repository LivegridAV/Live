"use client";
import dynamic from "next/dynamic";

/**
 * Client wrapper that code-splits the AV Lab 3D room out of the route bundle
 * (ssr:false — WebGL is client-only) and shows a light placeholder while its
 * chunk loads. The room itself only mounts the WebGL canvas once on-screen.
 */
const AvLabRoom = dynamic(() => import("./AvLabRoom"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] rounded-[24px] border border-ink-soft bg-[#060b0a] md:h-[440px]" aria-hidden />
  ),
});

export default function AvLabRoomSection() {
  return <AvLabRoom />;
}
