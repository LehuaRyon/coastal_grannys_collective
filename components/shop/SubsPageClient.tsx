"use client"

import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { useCartStore } from "@/lib/store/cart"
import type { Subscription } from "@/lib/types"
import { ROAST_LEVELS } from "@/lib/constants/roast"
import { CheckCircleIcon, PackageIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function SubsPageClient({
  subscriptions,
}: {
  subscriptions: Subscription[]
}) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const [roastPrefs, setRoastPrefs] = useState<Record<string, string>>({})

  function handleSubscribe(sub: Subscription) {
    const roast = roastPrefs[sub.id]
    const variant =
      roast && roast !== "No Preference"
        ? `${sub.freq} · ${roast} Roast`
        : sub.freq
    addItem({
      key: `${sub.id}-sub-${roast ?? "any"}`,
      id: sub.id,
      type: "sub",
      name: sub.name,
      variant,
      price: sub.price,
      gradient: sub.gradient,
    })
    showToast(`"${sub.name}" added to cart`)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
          Never Run Out
        </p>
        <h1 className="font-serif text-4xl text-stone-900 mb-3">
          Coffee Subscriptions
        </h1>
        <p className="text-stone-500 max-w-xl mx-auto text-sm leading-relaxed">
          Fresh coffee delivered on your schedule. Flexible, curated, and always
          exceptional. Cancel or pause anytime — no strings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className={`group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col transition-all duration-300 ${sub.inStock ? "hover:shadow-md hover:border-stone-200 hover:-translate-y-1" : "opacity-60"}`}
          >
            <div
              className="relative p-8 text-white"
              style={{ background: sub.gradient }}
            >
              {sub.badge && (
                <span className="absolute top-4 right-4 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  {sub.badge}
                </span>
              )}
              {!sub.inStock && (
                <span className="absolute top-4 left-4 bg-black/40 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
              <h3 className="font-serif text-xl mb-1">{sub.name}</h3>
              <p className="text-white/70 text-sm mb-4">{sub.freq}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold">${sub.price}</span>
                <span className="text-white/70 text-sm">{sub.period}</span>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <p className="text-sm text-stone-500 leading-relaxed mb-5">
                {sub.desc}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {sub.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <CheckCircleIcon
                      size={18}
                      weight="duotone"
                      color="#C8921A"
                      className="flex-shrink-0 mt-0.5"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Roast preference — only shown if admin has set roast options */}
              {sub.inStock && sub.roastOptions.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Roast Preference
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["No Preference", ...ROAST_LEVELS].map((r) => {
                      const active =
                        (roastPrefs[sub.id] ?? "No Preference") === r
                      return (
                        <button
                          key={r}
                          onClick={() =>
                            setRoastPrefs((p) => ({ ...p, [sub.id]: r }))
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            active
                              ? "bg-stone-900 text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <Button
                variant="dark"
                full
                onClick={() => sub.inStock && handleSubscribe(sub)}
                className={!sub.inStock ? "opacity-50 cursor-not-allowed" : ""}
              >
                {sub.inStock
                  ? `Subscribe for $${sub.price}${sub.period}`
                  : "Out of Stock"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-12 text-center relative rounded-2xl shadow-sm overflow-hidden p-10"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/coffee-hero-bg.png)",
            backgroundPosition: "center 4%",
          }}
        />
        <div className="relative">
          <PackageIcon
            size={40}
            weight="duotone"
            color="#CC9818"
            className="mb-3 mx-auto block"
          />
          <h3 className="font-serif text-xl text-stone-900 mb-2">
            Not sure which plan is right?
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Try a one-time order first and subscribe later — we&apos;re happy to
            help you find the right plan.
          </p>
          <Button variant="outline" onClick={() => router.push("/contact")}>
            Talk to Us
          </Button>
        </div>
      </div>
    </section>
  )
}
