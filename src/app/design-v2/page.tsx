import V2Home from "@/components/v2/V2Home";

// /design-v2 = the noindex preview of the same homepage now served at "/".
// The layout supplies the `.v2root` wrapper, v2.css and robots:noindex.
export default function DesignV2Preview() {
  return <V2Home />;
}
