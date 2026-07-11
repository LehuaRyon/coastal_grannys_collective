"use client"

import { Button } from "@/components/ui/Button"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { showToast } from "@/components/ui/Toast"
import { blockInvalidNumberKey } from "@/lib/utils/numberInput"
import {
  FlowerIcon,
  InstagramLogoIcon,
  SparkleIcon,
} from "@phosphor-icons/react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useFormErrors } from "@/lib/hooks/useFormErrors"

const EVENT_TYPES = [
  "Private Gathering",
  "Birthday Party",
  "Bridal / Baby Shower",
  "Wedding",
  "Corporate Event",
  "Pop-Up Coffee Bar",
  "Farmers Market",
  "Other",
]

const START_TIMES = [
  "Morning (7am – 11am)",
  "Midday (11am – 2pm)",
  "Afternoon (2pm – 5pm)",
  "Evening (5pm – 9pm)",
  "Flexible",
]

const HOW_FOUND = [
  "Instagram",
  "Word of Mouth",
  "Google",
  "Facebook Marketplace",
  "Friend or Family",
  "Other",
]

export function CoffeeCartClient() {
  const { data: session } = useSession()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    eventDate: "",
    startTime: "",
    guestCount: "",
    eventType: "",
    occasion: "",
    flexible: "",
    howFound: "",
    details: "",
  })

  // Prefill from the logged-in user's account, without clobbering anything they've already typed
  useEffect(() => {
    if (!session?.user) return
    setForm((f) => ({
      ...f,
      firstName: f.firstName || session.user.firstName || "",
      lastName: f.lastName || session.user.lastName || "",
      email: f.email || session.user.email || "",
    }))
  }, [session])

  // Phone isn't on the session — fetch it from the account's saved profile
  useEffect(() => {
    if (!session?.user) return
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const phone = data?.user?.phone
        if (!phone) return
        setForm((f) => ({ ...f, phone: f.phone || phone }))
      })
      .catch(() => {})
  }, [session])

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    clearError(key)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing = new Set<string>()
    if (!form.firstName) missing.add("firstName")
    if (!form.lastName) missing.add("lastName")
    if (!form.email) missing.add("email")
    if (!form.eventDate) missing.add("eventDate")
    if (!form.startTime) missing.add("startTime")
    if (!form.guestCount) missing.add("guestCount")
    if (!form.eventType) missing.add("eventType")
    if (!form.details) missing.add("details")
    if (missing.size > 0) {
      setErrors(missing)
      showToast("Please fill in all required fields")
      return
    }
    setErrors(new Set())
    setSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CART", data: form }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      showToast("Something went wrong — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-24 px-4">
        <FlowerIcon
          size={48}
          weight="duotone"
          color="#C8921A"
          className="mb-4"
        />
        <h2 className="font-serif text-3xl text-stone-900 mb-3">We got it!</h2>
        <p className="text-stone-500 max-w-sm mx-auto text-sm leading-relaxed">
          Your inquiry has been sent to Kelly. She&apos;ll be in touch within 48
          hours to talk through the details.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-8 text-sm text-amber-700 hover:underline"
        >
          Send another inquiry
        </button>
      </div>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16" id="inquiry">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Left — copy */}
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
            Book the Cart
          </p>
          <h2 className="font-serif text-4xl text-stone-900 mb-5 leading-tight">
            Get the Party Started
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-6">
            Fill out the form and Kelly will get back to you within 48 hours to
            talk through your event vision, availability, and pricing.
          </p>
          <ul className="space-y-5">
            {[
              "Pop-ups & private gatherings",
              "Birthdays, showers & weddings",
              "Corporate events & team experiences",
              "Custom coffee & matcha menus",
              "All around San Diego & surrounding areas",
            ].map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="w-8 flex-shrink-0 mt-0.5">
                  <SparkleIcon size={20} weight="duotone" color="#C8921A" />
                </span>
                <p className="text-sm text-stone-700">{item}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 p-4 bg-stone-100 rounded-2xl border border-stone-200">
            <p className="text-xs text-stone-400 mb-3 font-medium uppercase tracking-wider">
              Follow along for pop-up dates and drop announcements
            </p>
            <a
              href="https://www.instagram.com/coastalgrannys/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-stone-900 hover:text-amber-700 transition-colors"
            >
              <InstagramLogoIcon size={16} weight="duotone" />
              @coastalgrannys
            </a>
          </div>
        </div>

        {/* Right — form */}
        <div
          className="lg:col-span-3 relative rounded-2xl shadow-sm overflow-hidden p-8"
          style={{ backgroundColor: "#F5EFE6" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: "url(/images/cart-form-bg.png)",
              backgroundPosition: "center center",
            }}
          />
          <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-14 my-16">
            <h3 className="font-serif text-2xl text-stone-900 mb-6">Inquire</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    First Name *
                  </label>
                  <input
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className={`w-full border ${borderClass("firstName")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    placeholder="Jasmine"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    className={`w-full border ${borderClass("lastName")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    placeholder="Ryon"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={`w-full border ${borderClass("email")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Phone
                  </label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>

              {/* Date + time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Desired Event Date *
                  </label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => set("eventDate", e.target.value)}
                    className={`w-full border ${borderClass("eventDate")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Start Time *
                  </label>
                  <select
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                    className={`w-full border ${borderClass("startTime")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  >
                    <option value="">Select a time</option>
                    {START_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guests + event type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Estimated Guest Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.guestCount}
                    onChange={(e) => set("guestCount", e.target.value)}
                    onKeyDown={(e) => blockInvalidNumberKey(e)}
                    className={`w-full border ${borderClass("guestCount")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    placeholder="e.g. 25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Event Type *
                  </label>
                  <select
                    value={form.eventType}
                    onChange={(e) => set("eventType", e.target.value)}
                    className={`w-full border ${borderClass("eventType")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  >
                    <option value="">Select type</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  What are we celebrating?
                </label>
                <input
                  value={form.occasion}
                  onChange={(e) => set("occasion", e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  placeholder="Birthday, anniversary, team milestone…"
                />
              </div>

              {/* Flexible + how found */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    Is your date flexible?
                  </label>
                  <select
                    value={form.flexible}
                    onChange={(e) => set("flexible", e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    <option value="">Select</option>
                    <option>Yes, very flexible</option>
                    <option>Somewhat flexible</option>
                    <option>No, date is fixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    How did you find us?
                  </label>
                  <select
                    value={form.howFound}
                    onChange={(e) => set("howFound", e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    <option value="">Select</option>
                    {HOW_FOUND.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Tell us about your event *
                </label>
                <textarea
                  rows={4}
                  value={form.details}
                  onChange={(e) => set("details", e.target.value)}
                  className={`w-full border ${borderClass("details")} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none`}
                  placeholder="Location, vibe, any special requests or ideas — the more detail the better!"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                full
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send Inquiry →"}
              </Button>
              <p className="text-center text-xs text-stone-400">
                We&apos;ll get back to you within 48 hours.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
