import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, passwordStatus } from "@/lib/session";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isLoggedIn()) redirect("/");

  const { error } = await searchParams;
  const status = passwordStatus();

  return (
    <main className="login-wrap">
      <div className="card login-card">
        <h1>InboxBouncer</h1>

        {status === "missing" && (
          <div className="alert alert-error">
            Setup needed: add a <strong>DASHBOARD_PASSWORD</strong> environment variable in Vercel,
            then redeploy.
          </div>
        )}
        {status === "too_short" && (
          <div className="alert alert-error">
            Setup needed: <strong>DASHBOARD_PASSWORD</strong> must be at least {MIN_PASSWORD_LENGTH}{" "}
            characters. Change it in Vercel, then redeploy.
          </div>
        )}
        {status === "ok" && error === "wrong" && (
          <div className="alert alert-error">That password didn&apos;t match. Try again.</div>
        )}

        <form action={login}>
          {/* Lets iPad/iPhone Passwords remember this login. */}
          <input
            className="visually-hidden"
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="inboxbouncer"
            tabIndex={-1}
            aria-hidden="true"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
            disabled={status !== "ok"}
          />
          <button className="button button-full" type="submit" disabled={status !== "ok"}>
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}
