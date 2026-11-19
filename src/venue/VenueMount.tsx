"use client";
import dynamic from "next/dynamic";
import { LoadingRoom } from "./ui/Loader";

/**
 * Client-only mount for the walkthrough.
 *
 * The venue needs a WebGL context, so it never renders on the server. While
 * its code downloads, the placeholder is just the dark room with the same
 * hairline progress bar the venue shows while it warms up — no splash page —
 * and the crawlable content underneath is server-rendered either way.
 */

const Venue = dynamic(() => import("./Venue"), {
  ssr: false,
  loading: () => (
    <div className="venue">
      <LoadingRoom percent={0} />
    </div>
  ),
});

export default function VenueMount() {
  return <Venue />;
}
