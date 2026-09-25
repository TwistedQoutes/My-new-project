import { requireSession } from "@/lib/auth";
import { logout } from "./actions";
import { NavLinks } from "./NavLinks";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">InboxBouncer</span>
          <form action={logout}>
            <button className="button button-quiet" type="submit">
              Log out
            </button>
          </form>
        </div>
        <NavLinks />
      </header>
      <main className="container">{children}</main>
    </>
  );
}
