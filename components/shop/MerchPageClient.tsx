"use client"

import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { useCartStore } from "@/lib/store/cart"
import type { Merch } from "@/lib/types"
import {
  CoffeeIcon,
  DropIcon,
  GiftIcon,
  HandbagIcon,
  PackageIcon,
  TShirtIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

function MerchIcon({ icon }: { icon: string }) {
  const props = { size: 52, weight: "duotone" as const, color: "white" }
  if (icon === "👜") return <HandbagIcon {...props} />
  if (icon === "🍵") return <CoffeeIcon {...props} />
  if (icon === "🫗") return <DropIcon {...props} />
  if (icon === "👕") return <TShirtIcon {...props} />
  return <PackageIcon {...props} />
}

export function MerchPageClient({ merch }: { merch: Merch[] }) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({})

  function selectOption(id: string, opt: string) {
    setSelectedOptions((prev) => ({ ...prev, [id]: opt }))
  }

  function handleAddToCart(m: Merch) {
    const opt = selectedOptions[m.id] ?? m.options?.[0] ?? null
    const variant = opt ?? "One Size"
    addItem({
      key: `${m.id}-${variant}`,
      id: m.id,
      type: "merch",
      name: m.name,
      variant,
      price: m.price,
      gradient: m.gradient,
      icon: m.icon,
    })
    showToast(`"${m.name}" added to cart`)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
          Carry the Brand
        </p>
        <h1 className="font-serif text-4xl text-stone-900 mb-2">
          Merch &amp; Gear
        </h1>
        <p className="text-stone-500 text-sm max-w-xl mx-auto">
          Thoughtfully made goods for coffee lovers. Limited quantities — made
          to last.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {merch.map((m) => {
          const activeOpt = selectedOptions[m.id] ?? m.options?.[0]
          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col"
            >
              <div
                className="h-44 flex items-center justify-center"
                style={{ background: m.gradient }}
              >
                <MerchIcon icon={m.icon} />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-serif text-lg text-stone-900 mb-1">
                  {m.name}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed mb-4 flex-1">
                  {m.desc}
                </p>

                {m.options && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Option
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => selectOption(m.id, opt)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                            activeOpt === opt
                              ? "bg-stone-900 text-white border-stone-900"
                              : "border-stone-200 text-stone-600 hover:border-stone-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">
                    ${m.price}
                  </span>
                  <Button
                    size="sm"
                    variant="dark"
                    onClick={() => handleAddToCart(m)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="mt-12 text-center relative rounded-2xl shadow-sm overflow-hidden p-10"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/merch-cta-bg.png)",
            backgroundPosition: "center 24%",
            transform: "scaleY(-1)",
          }}
        />
        <div className="relative">
          <GiftIcon
            size={40}
            weight="duotone"
            color="#CC9818"
            className="mb-3 mx-auto block"
          />
          <h3 className="font-serif text-xl text-stone-900 mb-2">
            Looking for a gift?
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Pair any merch item with a coffee subscription or e-gift card — the
            perfect bundle for any coffee lover.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/shop/gift-cards")}
          >
            Shop Gift Cards
          </Button>
        </div>
      </div>
    </section>
  )
}
