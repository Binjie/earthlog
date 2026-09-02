"use client";

import dynamic from "next/dynamic";

const EarthViewer = dynamic(() => import("./EarthViewer"), {
  ssr: false,
  loading: () => <main className="loading">Loading EarthLog...</main>,
});

export default function EarthViewerLoader() {
  return <EarthViewer />;
}
