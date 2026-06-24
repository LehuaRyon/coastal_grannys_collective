"use client"

import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { CheckCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"

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
  const [submitted, setSubmitted] = useState(false)
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

  function handleSubmit() {
    if (!form.businessName || !form.email) {
      showToast("Please fill in required fields")
      return
    }
    // TODO: POST form data to /api/submissions with type: 'WHOLESALE' so it appears
    // in the admin dashboard Submissions tab. See TODO in app/admin/page.tsx.
    setSubmitted(true)
  }

  return (
    <>
      {/* Hero */}
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

      {/* Body */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-20">
          {/* Info */}
          <div>
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
                  <CheckCircleIcon size={18} weight="duotone" color="#C8921A" className="flex-shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div
            id="ws-form"
            className="lg:col-span-3 relative rounded-2xl shadow-sm overflow-hidden p-8"
            style={{ backgroundColor: '#F5EFE6' }}
          >
            <div className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: 'url(/images/merch-hero-bg.png)', backgroundPosition: 'center center' }} />
            <div className="relative bg-white/80 rounded-xl p-6 backdrop-blur-[2px] mx-8 my-10">
            <h3 className="font-serif text-2xl text-stone-900 mb-6">
              {content.formHeading}
            </h3>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="font-medium text-green-800">Request received!</p>
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
                    onChange={(e) =>
                      setForm({ ...form, businessName: e.target.value })
                    }
                    placeholder="Blue Bottle Café"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="jane@cafe.com"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Business Type
                    </label>
                    <select
                      value={form.businessType}
                      onChange={(e) =>
                        setForm({ ...form, businessType: e.target.value })
                      }
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors bg-white"
                    >
                      <option value="">Select…</option>
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
                      className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors bg-white"
                    >
                      <option value="">Select…</option>
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
                    Message (optional)
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
                <Button variant="primary" full onClick={handleSubmit}>
                  Send Request →
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
