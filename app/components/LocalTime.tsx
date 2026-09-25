"use client";

import { useEffect, useState } from "react";

// Shows a date in the viewer's own timezone. The server runs in UTC, so the
// time is filled in by the browser after the page loads.
export function LocalTime({ iso, mode = "short" }: { iso: string; mode?: "short" | "full" }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    if (mode === "full") {
      setText(date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
      return;
    }
    const sameDay = date.toDateString() === new Date().toDateString();
    setText(
      sameDay
        ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
  }, [iso, mode]);

  return <time dateTime={iso}>{text}</time>;
}
