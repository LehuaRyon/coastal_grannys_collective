"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { useCartStore } from "@/lib/store/cart"
import { showToast } from "@/components/ui/Toast"
import { ArrowsClockwiseIcon } from "@phosphor-icons/react"
import type { Merch } from "@/lib/types"
import { useState, useEffect } from "react"

interface MerchModalProps {
  product: Merch | null
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function MerchModal({ product: m, onClose, onPrev, onNext, hasPrev, hasNext }: MerchModalProps) {
  const { addItem, items, updateQty, removeItem } = useCartStore()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [showingBack, setShowingBack] = useState(false)

  useEffect(() => {
    setSelectedSize(null)
    setShowingBack(false)
  }, [m?.id])

  if (!m) return null

  const activeSize = selectedSize ?? m.options?.[0] ?? null
  const cartKey = m ? `${m.id}-${activeSize ?? "One Size"}` : null
  const cartQty = cartKey ? (items.find((i) => i.key === cartKey)?.qty ?? 0) : 0
  const imgSrc = m.hasFrontBack
    ? `/images/products/${m.slug}-${showingBack ? "back" : "front"}.png`
    : `/images/products/${m.slug}.png`

  function handleAddToCart() {
    if (!m) return
    const variant = activeSize ?? "One Size"
    addItem({
      key: `${m.id}-${variant}`,
      id: m.id,
      type: "merch",
      name: m.name,
      variant,
      price: m.price,
      gradient: m.gradient,
      slug: m.slug,
      hasImage: m.hasImage,
      hasFrontBack: m.hasFrontBack,
    })
    showToast(`"${m.name}" added to cart`)
    onClose()
  }

  return (
    <Modal
      isOpen={!!m}
      onClose={onClose}
      className="max-w-5xl w-full"
      onPrev={onPrev}
      onNext={onNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      mobileFullHeight
    >
      <div className="flex flex-col h-full md:grid md:grid-cols-[2fr_3fr] md:h-[560px]">
        {/* Image — on mobile it grows (flex-1) to fill the leftover sheet height so
            more of the product photo is visible instead of leaving an empty gap. On
            desktop it's a grid cell, so flex-grow is inert and the 2fr track governs. */}
        <div className="relative flex-1 overflow-hidden rounded-none md:rounded-l-2xl md:rounded-tr-none bg-stone-50 flex items-center justify-center min-h-64">
          {m.hasImage ? (
            <>
              <img
                src={imgSrc}
                alt={`${m.name}${m.hasFrontBack ? (showingBack ? " — back" : " — front") : ""}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {m.hasFrontBack && (
                <>
                  <button
                    onClick={() => setShowingBack((v) => !v)}
                    className="absolute bottom-3 right-3 bg-white/90 hover:bg-white border border-stone-200 rounded-full p-2 shadow-sm transition-all"
                    title={showingBack ? "Show front" : "Show back"}
                  >
                    <ArrowsClockwiseIcon size={16} weight="bold" color="#78716c" />
                  </button>
                  <span className="absolute bottom-3 left-3 text-[10px] font-semibold text-stone-500 bg-white/80 rounded-full px-2.5 py-1">
                    {showingBack ? "Back" : "Front"}
                  </span>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-10" style={{ background: m.gradient }}>
              <span className="text-6xl">{m.icon}</span>
            </div>
          )}
        </div>

        {/* Info — on mobile it sizes to its content and sits at the bottom of the sheet
            (the image above absorbs the slack), so there's no empty gap. On desktop it's a
            fixed-height column that space-distributes and scrolls independently. */}
        <div className="p-6 sm:p-8 flex flex-col overflow-y-auto md:justify-between md:max-h-[560px]">
          <div>
            <h2 className="font-serif text-2xl text-stone-900 mb-2">{m.name}</h2>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">{m.desc}</p>
          </div>

          <div>
            {m.options && m.options.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Select Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {m.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedSize(opt)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        activeSize === opt
                          ? "bg-stone-900 text-white border-stone-900"
                          : "border-stone-200 text-stone-700 hover:border-stone-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-6 mb-4">
              <div className="text-2xl font-serif text-stone-900">${m.price}</div>
              {cartQty > 0 && cartKey && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Quantity</span>
                  <div className="flex items-center border border-stone-200 rounded-full overflow-hidden">
                    <button
                      onClick={() => cartQty === 1 ? removeItem(cartKey) : updateQty(cartKey, -1)}
                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
                    >−</button>
                    <span className="px-3 text-sm font-semibold text-stone-900">{cartQty}</span>
                    <button
                      onClick={() => updateQty(cartKey, 1)}
                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
                    >+</button>
                  </div>
                  <span className="text-xs text-amber-700 font-medium">in cart</span>
                </div>
              )}
            </div>
            <Button variant="dark" full onClick={handleAddToCart}>
              Add to Cart{activeSize ? ` — ${activeSize}` : ""}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
