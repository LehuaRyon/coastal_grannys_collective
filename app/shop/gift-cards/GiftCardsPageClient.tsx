"use client"

import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { useFormErrors } from "@/lib/hooks/useFormErrors"
import { useCartStore } from "@/lib/store/cart"
import { blockInvalidNumberKey } from "@/lib/utils/numberInput"
import { isValidEmail } from "@/lib/utils/email"
import { CheckIcon } from "@phosphor-icons/react"
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
  const { addItem } = useCartStore()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [amount, setAmount] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [message, setMessage] = useState("")
  const [deliverOn, setDeliverOn] = useState("")

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  function selectPreset(amt: number) {
    setAmount(String(amt))
    clearError("customAmount")
    document
      .getElementById("gift-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function addGiftCard() {
    const amt = parseInt(amount)
    const missing = new Set<string>()
    if (!amt || amt < content.customMin || amt > content.customMax)
      missing.add("customAmount")
    const emailEmpty = !recipientEmail.trim()
    if (emailEmpty || !isValidEmail(recipientEmail)) missing.add("recipientEmail")
    if (missing.size > 0) {
      setErrors(missing)
      showToast(
        missing.has("customAmount")
          ? `Please enter an amount between $${content.customMin} and $${content.customMax}`
          : emailEmpty
            ? "Please enter a recipient email"
            : "Please enter a valid email address",
      )
      return
    }
    setErrors(new Set())
    addItem({
      key: `gc-${amt}-${recipientEmail}-${deliverOn}`,
      id: `gc-${amt}`,
      type: "gift",
      name: `$${amt} E-Gift Card`,
      variant: deliverOn
        ? `To: ${recipientEmail} (scheduled ${deliverOn})`
        : `To: ${recipientEmail}`,
      price: amt,
      gradient: GIFT_GRADIENT,
      giftRecipientEmail: recipientEmail,
      giftMessage: message.trim() || undefined,
      giftDeliverOn: deliverOn || undefined,
    })
    showToast(
      deliverOn
        ? `$${amt} gift card scheduled for ${recipientEmail} on ${deliverOn}`
        : `$${amt} gift card for ${recipientEmail} added to cart`,
    )
    setAmount("")
    setRecipientEmail("")
    setMessage("")
    setDeliverOn("")
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

      {/* Preset amounts — selecting one fills the amount below; every gift card
          still requires a recipient email before it can be added to the cart. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        {content.amounts.map((amt) => {
          const active = parseInt(amount) === amt
          return (
            <div
              key={amt}
              className={`relative rounded-2xl overflow-hidden cursor-pointer group border shadow-sm hover:shadow-md transition-all duration-300 ${
                active
                  ? "border-amber-400 ring-2 ring-amber-200"
                  : "border-stone-100 hover:border-stone-200"
              }`}
              onClick={() => selectPreset(amt)}
            >
              <div
                className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: "url(/images/values-bg.png)",
                  backgroundPosition: "center 0%",
                }}
              />
              <div className="relative p-8 text-center">
                <p className="text-3xl font-serif text-stone-900 mb-1 group-hover:text-amber-700 transition-colors">
                  ${amt}
                </p>
                <p className="text-stone-600 text-xs mb-4">E-Gift Card</p>
                <span
                  className={`inline-flex items-center justify-center gap-1 w-full py-2 text-sm font-medium rounded-full transition-colors ${
                    active
                      ? "bg-amber-700 text-white"
                      : "bg-stone-100 text-stone-600 group-hover:bg-stone-200"
                  }`}
                >
                  {active ? (
                    <>
                      <CheckIcon size={14} weight="bold" />
                      Selected
                    </>
                  ) : (
                    "Select"
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Amount + recipient — required for every gift card, preset or custom */}
      <div
        id="gift-form"
        className="relative rounded-2xl shadow-sm overflow-hidden scroll-mt-24"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/gift-form-bg.png)",
            backgroundPosition: "center center",
          }}
        />
        <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-4 my-6 sm:mx-14 sm:my-16">
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
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
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

          <div className="mb-5">
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Deliver On
            </label>
            <input
              type="date"
              value={deliverOn}
              min={tomorrow}
              onChange={(e) => setDeliverOn(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
            <p className="text-xs text-stone-400 mt-1">
              Leave blank to send right away, or pick a future date — like a
              birthday — and we&apos;ll email the code then instead.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <Button variant="primary" onClick={addGiftCard}>
              Add Gift Card to Cart →
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
