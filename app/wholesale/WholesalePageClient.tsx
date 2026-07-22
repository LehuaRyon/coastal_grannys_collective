"use client"

import { Button } from "@/components/ui/Button"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { showToast } from "@/components/ui/Toast"
import { useFormErrors } from "@/lib/hooks/useFormErrors"
import { isValidEmail } from "@/lib/utils/email"
import { Reveal } from "@/components/ui/Reveal"
import { CheckCircleIcon } from "@phosphor-icons/react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface WholesaleContent {
  heroTitle: string
  heroSubtitle: string
  whyHeading: string
  whyBody1: string
  whyBody2: string
  perks: string[]
  formHeading: string
}

export function WholesalePageClient({
  content,
}: {
  content: WholesaleContent
}) {
  const { data: session } = useSession()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessType: "",
    volume: "",
    message: "",
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

  async function handleSubmit() {
    const missing = new Set<string>()
    if (!form.businessName) missing.add("businessName")
    if (!form.email) missing.add("email")
    const emailInvalid = !!form.email && !isValidEmail(form.email)
    if (emailInvalid) missing.add("email")
    if (missing.size > 0) {
      setErrors(missing)
      showToast(
        missing.size === 1 && emailInvalid
          ? "Please enter a valid email address"
          : "Please fill in required fields",
      )
      return
    }
    setErrors(new Set())
    setSubmitting(true)
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WHOLESALE", data: form }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      showToast("Something went wrong — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/wholesale-hero-bg.png)",
            backgroundPosition: "center 0%",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-3">
            Trade Program
          </p>
          <h1 className="font-serif text-4xl md:text-5xl mb-4 text-stone-900">
            {content.heroTitle}
          </h1>
          <p className="text-stone-600 max-w-xl mx-auto mb-8 leading-relaxed">
            {content.heroSubtitle}
          </p>
          <Button
            variant="dark"
            onClick={() =>
              document
                .getElementById("ws-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Get in Touch
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-20">
          <Reveal>
            <h2 className="font-serif text-3xl text-stone-900 mb-4">
              {content.whyHeading}
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-4">
              {content.whyBody1}
            </p>
            <p className="text-stone-500 text-sm leading-relaxed mb-8">
              {content.whyBody2}
            </p>
            <ul className="space-y-3">
              {content.perks.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-sm text-stone-700"
                >
                  <CheckCircleIcon
                    size={18}
                    weight="duotone"
                    color="#C8921A"
                    className="flex-shrink-0 mt-0.5"
                  />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={150}
            id="ws-form"
            className="lg:col-span-3 relative rounded-2xl shadow-sm overflow-hidden p-0 sm:p-8"
            style={{ backgroundColor: "#F5EFE6" }}
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: "url(/images/merch-hero-bg.png)",
                backgroundPosition: "center center",
              }}
            />
            <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-4 my-6 sm:mx-14 sm:my-16">
              <h3 className="font-serif text-2xl text-stone-900 mb-6">
                {content.formHeading}
              </h3>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <CheckCircleIcon
                    size={36}
                    weight="duotone"
                    color="#16a34a"
                    className="mb-2 mx-auto"
                  />
                  <p className="font-medium text-green-800">
                    Request received!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    We&apos;ll reach out to {form.email} within 1 business day.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => {
                        setForm({ ...form, businessName: e.target.value })
                        clearError("businessName")
                      }}
                      placeholder="Blue Bottle Café"
                      className={`w-full border ${borderClass("businessName")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) =>
                          setForm({ ...form, firstName: e.target.value })
                        }
                        placeholder="Jane"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) =>
                          setForm({ ...form, lastName: e.target.value })
                        }
                        placeholder="Doe"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value })
                          clearError("email")
                        }}
                        placeholder="jane@cafe.com"
                        className={`w-full border ${borderClass("email")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Phone
                      </label>
                      <PhoneInput
                        value={form.phone}
                        onChange={(v) => setForm({ ...form, phone: v })}
                        placeholder="(555) 000-0000"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Business Type
                      </label>
                      <select
                        value={form.businessType}
                        onChange={(e) =>
                          setForm({ ...form, businessType: e.target.value })
                        }
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      >
                        <option value="">Select</option>
                        <option>Café / Coffee Shop</option>
                        <option>Restaurant / Bar</option>
                        <option>Hotel</option>
                        <option>Office / Workplace</option>
                        <option>Grocery / Retail</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Estimated Weekly Volume
                      </label>
                      <select
                        value={form.volume}
                        onChange={(e) =>
                          setForm({ ...form, volume: e.target.value })
                        }
                        className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      >
                        <option value="">Select</option>
                        <option>5–10 lbs</option>
                        <option>10–25 lbs</option>
                        <option>25–50 lbs</option>
                        <option>50–100 lbs</option>
                        <option>100+ lbs</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Message
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Tell us about your café and what you're looking for…"
                      rows={3}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
                    />
                  </div>
                  <Button
                    variant="primary"
                    full
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : "Send Request →"}
                  </Button>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
