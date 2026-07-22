"use client"

import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { StateSelect } from "@/components/ui/StateSelect"
import { showToast } from "@/components/ui/Toast"
import { useFormErrors } from "@/lib/hooks/useFormErrors"
import { isValidEmail } from "@/lib/utils/email"
import { sortCartItems, useCartStore } from "@/lib/store/cart"
import { sanitizeZip, sanitizeCity } from "@/lib/utils/numberInput"
import { getStripe } from "@/lib/stripe"
import { CheckCircleIcon, CheckIcon } from "@phosphor-icons/react"
import { Elements } from "@stripe/react-stripe-js"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { StripePaymentForm } from "./StripePaymentForm"

type Step = 1 | 2 | 3 | "confirmed"

interface ContactForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface ShippingForm {
  address: string
  apt: string
  city: string
  state: string
  zip: string
  country: string
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { data: session } = useSession()
  const { items, total, clearCart } = useCartStore()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [step, setStep] = useState<Step>(1)

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [loadingIntent, setLoadingIntent] = useState(false)

  const [contact, setContact] = useState<ContactForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [shipping, setShipping] = useState<ShippingForm>({
    address: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  })

  // Gift card redemption — only coffee & merch items are eligible, not
  // subscriptions (an ongoing commitment) or other gift cards. Multiple
  // cards can be stacked on one order (up to MAX_GIFT_CARDS), applied
  // greedily in the order they were added against whatever eligible
  // subtotal is left after the ones before them.
  const MAX_GIFT_CARDS = 5
  const [giftCodeInput, setGiftCodeInput] = useState("")
  const [appliedGiftCards, setAppliedGiftCards] = useState<{ code: string; balance: number }[]>([])
  const [giftCardError, setGiftCardError] = useState<string | null>(null)
  const [giftCardChecking, setGiftCardChecking] = useState(false)
  const [finalChargeAmount, setFinalChargeAmount] = useState<number | null>(null)
  const [fullyCoveredByGiftCard, setFullyCoveredByGiftCard] = useState(false)
  const [giftRecipientsSent, setGiftRecipientsSent] = useState<string[]>([])
  const [giftRecipientsScheduled, setGiftRecipientsScheduled] = useState<{ email: string; date: string }[]>([])
  const [wasGiftCardOnlyOrder, setWasGiftCardOnlyOrder] = useState(false)
  // When the order will be fully covered by gift card balance, wait for an
  // explicit "Place Order" click before actually finalizing it — otherwise
  // there's no payment button at all and the order would place itself the
  // instant step 3 loads.
  const [giftOrderConfirmed, setGiftOrderConfirmed] = useState(false)

  // Gift cards are delivered by email — nothing to ship, so no shipping fee
  // and no Shipping step when the cart is gift cards only.
  const isGiftCardOnlyCart = items.length > 0 && items.every((i) => i.type === "gift")
  const STEPS: { label: string; value: 1 | 2 | 3 }[] = isGiftCardOnlyCart
    ? [{ label: "Contact", value: 1 }, { label: "Payment", value: 3 }]
    : [{ label: "Contact", value: 1 }, { label: "Shipping", value: 2 }, { label: "Payment", value: 3 }]

  const subtotal = total()
  const shippingCost = isGiftCardOnlyCart ? 0 : subtotal >= 60 ? 0 : 8
  const eligibleSubtotal = items
    .filter((i) => i.type === "coffee" || i.type === "merch")
    .reduce((sum, i) => sum + i.price * i.qty, 0)

  // Gift cards pay down eligible product cost first; once that's fully
  // covered, any balance left over spills into paying shipping too — so a
  // card that covers everything results in a true $0 order, not just free
  // product with shipping still owed.
  const giftCardAllocations = (() => {
    let remainingProduct = eligibleSubtotal
    let remainingShipping = shippingCost
    const allocations: { code: string; amount: number }[] = []
    for (const gc of appliedGiftCards) {
      if (remainingProduct <= 0 && remainingShipping <= 0) break
      let balanceLeft = gc.balance
      let used = 0
      if (remainingProduct > 0) {
        const use = Math.min(balanceLeft, remainingProduct)
        used += use
        remainingProduct -= use
        balanceLeft -= use
      }
      if (remainingProduct <= 0 && remainingShipping > 0 && balanceLeft > 0) {
        const use = Math.min(balanceLeft, remainingShipping)
        used += use
        remainingShipping -= use
        balanceLeft -= use
      }
      if (used > 0) allocations.push({ code: gc.code, amount: used })
    }
    return allocations
  })()
  const giftCardDiscount = giftCardAllocations.reduce((sum, a) => sum + a.amount, 0)
  const grandTotal = Math.max(0, subtotal + shippingCost - giftCardDiscount)
  // Mirrors the server's STRIPE_MIN_CHARGE threshold — predicts whether this
  // order will be fully covered by gift card balance (no card charge at
  // all), so we can hold off on actually placing it until the user presses
  // a button, instead of silently finalizing the moment step 3 loads.
  const isLikelyFullyCovered = appliedGiftCards.length > 0 && grandTotal < 0.5

  async function applyGiftCard() {
    const code = giftCodeInput.trim().toUpperCase()
    if (!code) return
    if (appliedGiftCards.some((gc) => gc.code === code)) {
      setGiftCardError("That code is already applied")
      return
    }
    if (appliedGiftCards.length >= MAX_GIFT_CARDS) {
      setGiftCardError(`Only ${MAX_GIFT_CARDS} gift cards can be applied per order`)
      return
    }
    setGiftCardChecking(true)
    setGiftCardError(null)
    try {
      const res = await fetch("/api/gift-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!data.valid) {
        setGiftCardError(data.error ?? "That code isn't valid")
        return
      }
      if (eligibleSubtotal <= 0) {
        setGiftCardError("Gift cards can only be applied to coffee or merch items")
        return
      }
      setAppliedGiftCards((prev) => [...prev, { code, balance: data.balance }])
      setGiftCodeInput("")
      setClientSecret(null)
      setFinalChargeAmount(null)
    } catch {
      setGiftCardError("Couldn't check that code — please try again")
    } finally {
      setGiftCardChecking(false)
    }
  }

  function removeGiftCard(code: string) {
    setAppliedGiftCards((prev) => prev.filter((gc) => gc.code !== code))
    setGiftCardError(null)
    setClientSecret(null)
    setFinalChargeAmount(null)
  }

  // Prefill contact info from the logged-in user's session, without clobbering anything already typed
  useEffect(() => {
    if (!session?.user) return
    setContact((c) => ({
      ...c,
      firstName: c.firstName || session.user.firstName || "",
      lastName: c.lastName || session.user.lastName || "",
      email: c.email || session.user.email || "",
    }))
  }, [session])

  // Prefill phone + shipping address from the account's saved profile once the modal is opened
  useEffect(() => {
    if (!isOpen || !session?.user) return
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const profile = data?.user
        if (!profile) return
        setContact((c) => ({ ...c, phone: c.phone || profile.phone || "" }))
        setShipping((s) => ({
          address: s.address || profile.address || "",
          apt: s.apt || profile.apt || "",
          city: s.city || profile.city || "",
          state: s.state || profile.state || "",
          zip: s.zip || profile.zip || "",
          // US-only shipping — always United States, not user-editable
          country: "United States",
        }))
      })
      .catch(() => {})
  }, [isOpen, session])

  // Create a PaymentIntent when the user reaches step 3 — but if the order
  // will be fully covered by gift card balance, hold off until the user
  // explicitly clicks "Place Order" instead of finalizing it automatically
  // the instant this step loads (there'd otherwise be no button to press
  // and no chance to back out before it's placed).
  useEffect(() => {
    if (step !== 3 || clientSecret) return
    if (isLikelyFullyCovered && !giftOrderConfirmed) return

    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!stripeKey) {
      setPaymentError(
        "Stripe is not configured yet. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY to your .env.local file.",
      )
      return
    }

    setLoadingIntent(true)
    setPaymentError(null)

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Undiscounted — the server independently re-validates each gift
        // card's real balance and computes the actual discount, rather than
        // trusting a client-computed total.
        amount: subtotal + shippingCost,
        shippingCost,
        giftCardCodes: appliedGiftCards.map((gc) => gc.code),
        customerEmail: contact.email,
        customerName: `${contact.firstName} ${contact.lastName}`.trim(),
        shippingAddress: isGiftCardOnlyCart ? null : shipping,
        items: items.map((i) => ({
          key: i.key,
          id: i.id,
          type: i.type,
          name: i.name,
          variant: i.variant,
          price: i.price,
          qty: i.qty,
          giftRecipientEmail: i.giftRecipientEmail,
          giftMessage: i.giftMessage,
          giftDeliverOn: i.giftDeliverOn,
        })),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        if (data.fullyCovered) {
          // Gift card balance covered the whole order — nothing to charge,
          // so there's no Stripe payment step at all.
          setFullyCoveredByGiftCard(true)
          collectGiftRecipients()
          clearCart()
          setStep("confirmed")
          return
        }
        setClientSecret(data.clientSecret)
        setFinalChargeAmount(data.amount)
      })
      .catch((err: Error) => {
        setPaymentError(err.message)
      })
      .finally(() => setLoadingIntent(false))
  }, [step, clientSecret, subtotal, shippingCost, appliedGiftCards, clearCart, isLikelyFullyCovered, giftOrderConfirmed])

  // Confetti burst on order confirmation — brand colors, skipped for
  // prefers-reduced-motion since it's a purely celebratory flourish.
  useEffect(() => {
    if (step !== "confirmed") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const colors = ["#CC9818", "#E8A8A0", "#8A9660", "#9A6E14"]
    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.6 },
      colors,
      startVelocity: 35,
      scalar: 0.9,
    })
    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.6 },
        colors,
        startVelocity: 25,
        scalar: 0.7,
      })
    }, 150)
    return () => clearTimeout(timer)
  }, [step])

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep(1)
      setClientSecret(null)
      setPaymentError(null)
      setErrors(new Set())
      setAppliedGiftCards([])
      setGiftCodeInput("")
      setGiftCardError(null)
      setFinalChargeAmount(null)
      setFullyCoveredByGiftCard(false)
      setGiftRecipientsSent([])
      setGiftRecipientsScheduled([])
      setWasGiftCardOnlyOrder(false)
      setGiftOrderConfirmed(false)
    }, 300)
  }

  function collectGiftRecipients() {
    const giftItems = items.filter((i) => i.type === "gift" && i.giftRecipientEmail)
    const immediate = giftItems.filter((i) => !i.giftDeliverOn)
    const scheduled = giftItems.filter((i) => i.giftDeliverOn)
    setGiftRecipientsSent(Array.from(new Set(immediate.map((i) => i.giftRecipientEmail!))))
    setGiftRecipientsScheduled(
      scheduled.map((i) => ({ email: i.giftRecipientEmail!, date: i.giftDeliverOn! }))
    )
    setWasGiftCardOnlyOrder(isGiftCardOnlyCart)
  }

  function handlePaymentSuccess() {
    collectGiftRecipients()
    clearCart()
    setStep("confirmed")
  }

  function goToStep3() {
    // Reset clientSecret so a fresh PaymentIntent is created with the latest total
    setClientSecret(null)
    setGiftOrderConfirmed(false)
    setStep(3)
  }

  const OrderSummary = () => (
    <div className="bg-stone-50 rounded-xl p-4 mb-6">
      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
        Order Summary
      </h4>
      <div className="space-y-2">
        {sortCartItems(items).map((i) => (
          <div key={i.key} className="flex justify-between text-sm">
            <span className="text-stone-600">
              {i.name} ({i.variant}) ×{i.qty}
            </span>
            <span className="text-stone-800 font-medium">
              ${(i.price * i.qty).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="border-t border-stone-200 pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Shipping</span>
            <span>
              {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
            </span>
          </div>
          {giftCardAllocations.map((a) => (
            <div key={a.code} className="flex justify-between text-sm text-amber-700">
              <span>Gift card ({a.code})</span>
              <span>−${a.amount.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold text-stone-900">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Gift card redemption — coffee & merch only, up to MAX_GIFT_CARDS per order */}
      <div className="border-t border-stone-200 mt-3 pt-3 space-y-2">
        {appliedGiftCards.map((gc) => (
          <div key={gc.code} className="flex items-center justify-between text-xs">
            <span className="text-stone-600">
              Applied <span className="font-semibold text-stone-800">{gc.code}</span> — $
              {gc.balance.toFixed(2)} available
            </span>
            <button
              type="button"
              onClick={() => removeGiftCard(gc.code)}
              className="text-red-600 hover:underline font-medium"
            >
              Remove
            </button>
          </div>
        ))}
        {appliedGiftCards.length < MAX_GIFT_CARDS && (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCodeInput}
                onChange={(e) => {
                  setGiftCodeInput(e.target.value)
                  setGiftCardError(null)
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyGiftCard())}
                placeholder="Gift card code"
                className="flex-1 min-w-0 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="button"
                onClick={applyGiftCard}
                disabled={giftCardChecking || !giftCodeInput.trim()}
                className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {giftCardChecking ? "Checking…" : "Apply"}
              </button>
            </div>
            {giftCardError && <p className="text-xs text-red-600 mt-1.5">{giftCardError}</p>}
          </div>
        )}
      </div>
    </div>
  )

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const num = i + 1
        const isActive = step === s.value
        const isDone = typeof step === "number" && step > s.value
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isDone
                    ? "bg-amber-700 text-white"
                    : isActive
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {isDone ? <CheckIcon size={12} weight="bold" /> : num}
              </div>
              <span
                className={`text-xs font-medium ${isActive ? "text-stone-900" : "text-stone-400"}`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-stone-200" />}
          </div>
        )
      })}
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-xl" closeOnBackdropClick={false}>
      <div className="p-6 sm:p-8">
        {step === "confirmed" ? (
          <div className="text-center py-6">
            <CheckCircleIcon
              size={56}
              weight="duotone"
              color="#16a34a"
              className="mb-4 mx-auto"
            />
            <h2 className="font-serif text-2xl text-stone-900 mb-2">
              Order Confirmed!
            </h2>
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              {wasGiftCardOnlyOrder
                ? "Thank you! Your gift card is delivered by email — nothing to ship."
                : "Thank you! Your freshly roasted coffee is being prepared and will ship within 1–2 business days."}
            </p>
            <p className="text-xs text-stone-400 mb-2">
              {fullyCoveredByGiftCard
                ? "This order was fully covered by gift card balance — a confirmation has been sent to your email."
                : "A receipt has been sent to your email by Stripe."}
            </p>
            <p className="text-xs text-stone-400 mb-8">
              {giftRecipientsSent.length > 0 && `We've sent a gift card to ${giftRecipientsSent.join(", ")}. `}
              {giftRecipientsScheduled.length > 0 &&
                giftRecipientsScheduled
                  .map(
                    (g) =>
                      `Your gift card for ${g.email} will be sent on ${new Date(g.date).toLocaleDateString()}.`
                  )
                  .join(" ")}
            </p>
            <Button variant="primary" onClick={handleClose}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl text-stone-900 mb-1">Checkout</h2>
            <StepIndicator />

            {/* ── Step 1: Contact ── */}
            {step === 1 && (
              <div className="min-h-[600px] flex flex-col">
              <div className="space-y-4">
                <OrderSummary />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={contact.firstName}
                      onChange={(e) => {
                        setContact({ ...contact, firstName: e.target.value })
                        clearError("firstName")
                      }}
                      placeholder="Jane"
                      className={`w-full border ${borderClass("firstName")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={contact.lastName}
                      onChange={(e) =>
                        setContact({ ...contact, lastName: e.target.value })
                      }
                      placeholder="Doe"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => {
                      setContact({ ...contact, email: e.target.value })
                      clearError("email")
                    }}
                    placeholder="jane@example.com"
                    className={`w-full border ${borderClass("email")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Phone
                  </label>
                  <PhoneInput
                    value={contact.phone}
                    onChange={(v) => setContact({ ...contact, phone: v })}
                    placeholder="(555) 000-0000"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
                <div className="flex gap-3 pt-2 mt-auto">
                  <Button variant="ghost" className="flex-shrink-0" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    full
                    className="flex-1"
                    onClick={() => {
                      const missing = new Set<string>()
                      if (!contact.firstName) missing.add("firstName")
                      if (!contact.email) missing.add("email")
                      const emailInvalid = !!contact.email && !isValidEmail(contact.email)
                      if (emailInvalid) missing.add("email")
                      if (missing.size > 0) {
                        setErrors(missing)
                        showToast(
                          missing.size === 1 && emailInvalid
                            ? "Please enter a valid email address"
                            : "Please fill in all required fields",
                        )
                        return
                      }
                      setErrors(new Set())
                      if (isGiftCardOnlyCart) {
                        goToStep3()
                      } else {
                        setStep(2)
                      }
                    }}
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Shipping ── */}
            {step === 2 && (
              <div className="min-h-[600px] flex flex-col">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => {
                      setShipping({ ...shipping, address: e.target.value })
                      clearError("address")
                    }}
                    placeholder="123 Main St"
                    className={`w-full border ${borderClass("address")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Apt / Suite
                  </label>
                  <input
                    type="text"
                    value={shipping.apt}
                    onChange={(e) =>
                      setShipping({ ...shipping, apt: e.target.value })
                    }
                    placeholder="Apt 4B"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={shipping.city}
                      onChange={(e) => {
                        setShipping({ ...shipping, city: sanitizeCity(e.target.value) })
                        clearError("city")
                      }}
                      placeholder="San Francisco"
                      className={`w-full border ${borderClass("city")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      State *
                    </label>
                    <StateSelect
                      value={shipping.state}
                      onChange={(v) => {
                        setShipping({ ...shipping, state: v })
                        clearError("state")
                      }}
                      className={`w-full border ${borderClass("state")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={shipping.zip}
                      onChange={(e) => {
                        setShipping({ ...shipping, zip: sanitizeZip(e.target.value) })
                        clearError("zip")
                      }}
                      placeholder="94103"
                      maxLength={5}
                      className={`w-full border ${borderClass("zip")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Country
                    </label>
                    <select
                      value={shipping.country}
                      disabled
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors bg-stone-100 text-stone-500 cursor-not-allowed"
                    >
                      <option>United States</option>
                    </select>
                  </div>
                </div>
              </div>
                <div className="flex gap-3 pt-2 mt-auto">
                  <Button variant="ghost" className="flex-shrink-0" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    full
                    className="flex-1"
                    onClick={() => {
                      const missing = new Set<string>()
                      if (!shipping.address) missing.add("address")
                      if (!shipping.city) missing.add("city")
                      if (!shipping.state) missing.add("state")
                      if (!shipping.zip) missing.add("zip")
                      if (missing.size > 0) {
                        setErrors(missing)
                        showToast("Please fill in all required fields")
                        return
                      }
                      setErrors(new Set())
                      goToStep3()
                    }}
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Payment (Stripe) ── */}
            {step === 3 && (
              <div className="min-h-[600px] flex flex-col">
                <OrderSummary />

                {isLikelyFullyCovered && !giftOrderConfirmed ? (
                  <>
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                      <CheckCircleIcon size={40} weight="duotone" color="#CC9818" />
                      <div>
                        <p className="text-sm font-medium text-stone-800 mb-1">
                          Your gift card balance covers this order in full.
                        </p>
                        <p className="text-xs text-stone-500">
                          Nothing will be charged to a card.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2 mt-auto">
                      <Button
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => setStep(isGiftCardOnlyCart ? 1 : 2)}
                        disabled={loadingIntent}
                      >
                        ← Back
                      </Button>
                      <Button
                        variant="primary"
                        full
                        className="flex-1"
                        onClick={() => setGiftOrderConfirmed(true)}
                        disabled={loadingIntent}
                      >
                        {loadingIntent ? "Placing Order…" : "Place Order →"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {paymentError && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                        <strong>Stripe not configured:</strong> {paymentError}
                      </div>
                    )}

                    {loadingIntent && (
                      <div className="flex items-center justify-center py-12 text-stone-400 gap-3">
                        <svg
                          className="animate-spin w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        <span className="text-sm">Preparing payment…</span>
                      </div>
                    )}

                    {clientSecret && !loadingIntent && (
                      <Elements
                        stripe={getStripe()}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: "stripe",
                            variables: {
                              colorPrimary: "#92400e",
                              colorBackground: "#ffffff",
                              borderRadius: "8px",
                              fontFamily: "Inter, system-ui, sans-serif",
                            },
                          },
                        }}
                      >
                        <StripePaymentForm
                          total={finalChargeAmount ?? grandTotal}
                          onSuccess={handlePaymentSuccess}
                          onBack={() => setStep(isGiftCardOnlyCart ? 1 : 2)}
                        />
                      </Elements>
                    )}

                    {/* Fallback back button if Stripe fails to load */}
                    {paymentError && (
                      <Button
                        variant="ghost"
                        className="mt-4"
                        onClick={() => setStep(isGiftCardOnlyCart ? 1 : 2)}
                      >
                        ← Back
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
