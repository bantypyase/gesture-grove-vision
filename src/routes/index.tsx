import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/gesture/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestureAI — Real-Time Hand Gesture Recognition" },
      { name: "description", content: "Detect hand landmarks and recognize gestures live in your browser. Video stays on your device." },
      { property: "og:title", content: "GestureAI — Real-Time Hand Gesture Recognition" },
      { property: "og:description", content: "In-browser hand tracking and gesture recognition with MediaPipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
