"use client"

import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { useFormErrors } from "@/lib/hooks/useFormErrors"
import { useCartStore } from "@/lib/store/cart"
import { blockInvalidNumberKey } from "@/lib/utils/numberInput"
import { useState } from "react"

const GIFT_GRADIENT = "linear-gradient(135deg,#1A1208 0%,#3D2010 100%)"

interface GiftCardsContent {
  heading: string
  subheading: string
  amounts: number[]
  customHeading: string
  customBody: string
  customMin: number
  customMax: number
}

export function GiftCardsPageClient({
  content,
}: {
  content: GiftCardsContent
}) {
  const { addItem, items } = useCartStore()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [customAmount, setCustomAmount] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [message, setMessage] = useState("")

  function addGiftCard(amt: number) {
    addItem({
      key: `gc-${amt}`,
      id: `gc-${amt}`,
      type: "gift",
      name: `$${amt} E-Gift Card`,
      variant: "Digital",
      price: amt,
      gradient: GIFT_GRADIENT,
      icon: "🎁",
    })
    showToast(`$${amt} gift card added to cart`)
  }

  function addCustomGift() {
    const amt = parseInt(customAmount)
    const missing = new Set<string>()
    if (!amt || amt < content.customMin || amt > content.customMax)
      missing.add("customAmount")
    if (!recipientEmail) missing.add("recipientEmail")
    if (missing.size > 0) {
      setErrors(missing)
      showToast(
        missing.has("customAmount")
          ? `Please enter an amount between $${content.customMin} and $${content.customMax}`
          : "Please enter a recipient email",
      )
      return
    }
    setErrors(new Set())
    addItem({
      key: `gc-custom-${amt}-${recipientEmail}`,
      id: `gc-custom-${amt}`,
      type: "gift",
      name: `$${amt} E-Gift Card`,
      variant: `To: ${recipientEmail}`,
      price: amt,
      gradient: GIFT_GRADIENT,
      icon: "🎁",
    })
    showToast(`$${amt} gift card for ${recipientEmail} added to cart`)
    setCustomAmount("")
    setRecipientEmail("")
    setMessage("")
  }

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
          Give the Gift of Coffee
        </p>
        <h1 className="font-serif text-4xl text-stone-900 mb-3">
          {content.heading}
        </h1>
        <p className="text-stone-500 max-w-md mx-auto text-sm leading-relaxed">
          {content.subheading}
        </p>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        {content.amounts.map((amt) => {
          const cartQty = items
            .filter((i) => i.id === `gc-${amt}`)
            .reduce((sum, i) => sum + i.qty, 0)
          return (
            <div
              key={amt}
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => addGiftCard(amt)}
            >
              <div
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{
                  backgroundImage: "url(/images/values-bg.png)",
                  backgroundPosition: "center 0%",
                }}
              />
              <div className="relative p-8 text-center">
                <p className="text-3xl font-serif text-stone-900 mb-1">
                  ${amt}
                </p>
                <p className="text-stone-600 text-xs mb-1">E-Gift Card</p>
                <p className="text-[10px] text-amber-700 font-medium mb-4 h-4">
                  {cartQty > 0 ? `${cartQty} in cart` : ""}
                </p>
                <button className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded-full transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom amount */}
      <div
        className="relative rounded-2xl shadow-sm overflow-hidden"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/gift-form-bg.png)",
            backgroundPosition: "center center",
          }}
        />
        <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-14 my-16">
          <h2 className="font-serif text-2xl text-stone-900 mb-1">
            {content.customHeading}
          </h2>
          <p className="text-sm text-stone-500 mb-6">{content.customBody}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  clearError("customAmount")
                }}
                onKeyDown={(e) => blockInvalidNumberKey(e)}
                placeholder={`e.g. ${Math.round((content.customMin + content.customMax) / 4)}`}
                min={content.customMin}
                max={content.customMax}
                className={`w-full border ${borderClass("customAmount")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value)
                  clearError("recipientEmail")
                }}
                placeholder="friend@example.com"
                className={`w-full border ${borderClass("recipientEmail")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Personal Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enjoy some amazing coffee on me!"
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
            />
          </div>

          <Button variant="primary" onClick={addCustomGift}>
            Add Custom Gift Card →
          </Button>
        </div>
      </div>
    </section>
  )
}
