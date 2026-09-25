"use client";

import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      {secret && <div className="secret-output">{secret}</div>}
      <div className="row">
        <button
          className="button"
          type="button"
          onClick={() => {
            setSecret(randomSecret());
            setCopied(false);
          }}
        >
          {secret ? "Make another" : "Make a random secret"}
        </button>
        {secret && (
          <button className="button button-quiet" type="button" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
