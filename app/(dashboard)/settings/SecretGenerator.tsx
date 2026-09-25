"use client";

import { useState } from "react";
import { CopyButton } from "@/app/components/CopyButton";

// Makes long random strings for Vercel environment variables, right in your
// browser (nothing is sent anywhere), so you don't need a terminal.
function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function SecretGenerator() {
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <div>
      {secret && <div className="secret-output">{secret}</div>}
      <div className="row">
        <button className="button" type="button" onClick={() => setSecret(randomSecret())}>
          {secret ? "Make another" : "Make a random secret"}
        </button>
        {secret && <CopyButton key={secret} text={secret} />}
      </div>
    </div>
  );
}
