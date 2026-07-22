import { auth } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"

export const metadata = { title: "Admin — Coastal Granny's Collective" }

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Content", href: "/admin/content" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Subscriptions", href: "/admin/subscriptions" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Gift Cards", href: "/admin/gift-cards" },
  { label: "Submissions", href: "/admin/submissions" },
  { label: "Users", href: "/admin/users" },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user?.role !== "admin") redirect("/account/login")

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-stone-900 text-white px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="text-amber-400 text-lg shrink-0">◉</span>
            <span className="text-sm font-medium whitespace-nowrap">Coastal Granny's Admin</span>
            {/* Inline nav — desktop only. On mobile it moves to the scrollable strip below. */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-stone-400 truncate max-w-[180px]">{session.user.email}</span>
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-600 text-stone-300 hover:text-white hover:border-stone-400 transition-colors whitespace-nowrap"
            >
              View Site ↗
            </Link>
          </div>
        </div>
        {/* Mobile nav — horizontally scrollable strip, edge-to-edge. Desktop uses the inline nav above. */}
        <nav className="md:hidden flex items-center gap-1 mt-3 -mx-4 px-4 overflow-x-auto scrollbar-none">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-lg text-xs text-stone-300 hover:text-white hover:bg-stone-700 transition-colors whitespace-nowrap shrink-0"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  )
}
