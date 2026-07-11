"use client"

import { Button } from "@/components/ui/Button"
import { ArrowsClockwiseIcon, GiftIcon } from "@phosphor-icons/react"
import type { Merch } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MerchModal } from "@/components/shop/MerchModal"
import { useCartStore } from "@/lib/store/cart"

export function MerchPageClient({ merch }: { merch: Merch[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Merch | null>(null)
  const [showingBack, setShowingBack] = useState<Record<string, boolean>>({})
  const { items } = useCartStore()

  const selectedIndex = selected ? merch.findIndex((m) => m.id === selected.id) : -1
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < merch.length - 1

  function goToPrevProduct() {
    if (hasPrev) setSelected(merch[selectedIndex - 1])
  }
  function goToNextProduct() {
    if (hasNext) setSelected(merch[selectedIndex + 1])
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
          Carry the Brand
        </p>
        <h1 className="font-serif text-4xl text-stone-900 mb-2">Merch &amp; Gear</h1>
        <p className="text-stone-500 text-sm max-w-xl mx-auto">
          Thoughtfully made goods for coffee lovers. Limited quantities — made to last.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {merch.map((m) => {
          const isBack = !!showingBack[m.id]
          const imgSrc = m.hasFrontBack
            ? `/images/products/${m.slug}-${isBack ? "back" : "front"}.png`
            : `/images/products/${m.slug}.png`

          return (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              className="group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-stone-200 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                {m.hasImage ? (
                  <>
                    <img
                      src={imgSrc}
                      alt={`${m.name}${m.hasFrontBack ? (isBack ? " — back" : " — front") : ""}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {m.hasFrontBack && (
                      <>
                        <span className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold text-stone-500 bg-white/80 rounded-full px-2 py-0.5">
                          {isBack ? "Back" : "Front"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowingBack((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }}
                          className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white border border-stone-200 rounded-full p-1.5 shadow-sm transition-all"
                          title={isBack ? "Show front" : "Show back"}
                        >
                          <ArrowsClockwiseIcon size={14} weight="bold" color="#78716c" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: m.gradient }}
                  >
                    <span className="text-5xl">{m.icon}</span>
                  </div>
                )}

              </div>

              {/* Name + price */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-base text-stone-900 group-hover:text-amber-700 transition-colors">{m.name}</p>
                  {(() => {
                    const cartQty = items.filter((i) => i.id === m.id).reduce((sum, i) => sum + i.qty, 0)
                    return cartQty > 0 ? (
                      <p className="text-[10px] text-amber-700 font-medium mt-0.5">{cartQty} in cart</p>
                    ) : null
                  })()}
                </div>
                <p className="text-sm font-semibold text-stone-600">${m.price}</p>
              </div>
            </div>
          )
        })}
      </div>

      <MerchModal
        product={selected}
        onClose={() => setSelected(null)}
        onPrev={goToPrevProduct}
        onNext={goToNextProduct}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

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
          <GiftIcon size={40} weight="duotone" color="#CC9818" className="mb-3 mx-auto block" />
          <h3 className="font-serif text-xl text-stone-900 mb-2">Looking for a gift?</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Pair any merch item with a coffee subscription or e-gift card — the perfect bundle for
            any coffee lover.
          </p>
          <Button variant="outline" onClick={() => router.push("/shop/gift-cards")}>
            Shop Gift Cards
          </Button>
        </div>
      </div>
    </section>
  )
}
