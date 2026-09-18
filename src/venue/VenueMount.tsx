"use client";
import dynamic from "next/dynamic";

/**
 * Client-only mount for the walkthrough.
 *
 * The venue needs a WebGL context, so it never renders on the server. The
 * placeholder below is the same dark room with the same wordmark, so the first
 * paint is already the experience rather than a flash of nothing — and the
 * crawlable content underneath is server-rendered either way.
 */

const Venue = dynamic(() => import("./Venue"), {
  ssr: false,
  loading: () => (
    <div className="venue">
      <div className="v-loader" data-done="false">
        <div className="v-loader-inner">
          <p className="v-loader-word">
            livegrid<span>AV</span>
          </p>
          <p className="v-mono">Preparing the experience</p>
        </div>
      </div>
    </div>
  ),
});

export default function VenueMount() {
  return <Venue />;
}
