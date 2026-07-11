"use client"

import { Button } from "@/components/ui/Button"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { showToast } from "@/components/ui/Toast"
import { useFormErrors } from "@/lib/hooks/useFormErrors"
import { sanitizeZip } from "@/lib/utils/numberInput"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const router = useRouter()
  const { setErrors, clearError, borderClass } = useFormErrors()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing = new Set<string>()
    if (!form.firstName) missing.add("firstName")
    if (!form.lastName) missing.add("lastName")
    if (!form.email) missing.add("email")
    if (!form.password) missing.add("password")
    if (!form.confirmPassword) missing.add("confirmPassword")
    if (missing.size > 0) {
      setErrors(missing)
      showToast("Please fill in all required fields")
      return
    }
    if (form.password.length < 8) {
      setErrors(new Set(["password"]))
      showToast("Password must be at least 8 characters")
      return
    }
    if (form.password !== form.confirmPassword) {
      setErrors(new Set(["password", "confirmPassword"]))
      showToast("Passwords do not match")
      return
    }
    setErrors(new Set())

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          apt: form.apt.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zip: form.zip.trim() || undefined,
          country: form.address.trim() ? form.country : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error ?? "Registration failed")
        return
      }

      // Auto sign-in after successful registration
      const result = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        showToast("Account created — please sign in")
        router.push("/account/login")
      } else {
        showToast("Account created! Welcome aboard.")
        router.push("/shop/coffee")
        router.refresh()
      }
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/shop/coffee"
            className="inline-block text-3xl text-amber-700 mb-3"
          >
            ◉
          </Link>
          <h1 className="font-serif text-2xl text-stone-900">Create account</h1>
          <p className="text-sm text-stone-500 mt-1">
            Join us for faster checkout &amp; order tracking
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => {
                    setForm({ ...form, firstName: e.target.value })
                    clearError("firstName")
                  }}
                  placeholder="Jane"
                  className={`w-full border ${borderClass("firstName")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm({ ...form, lastName: e.target.value })
                    clearError("lastName")
                  }}
                  placeholder="Doe"
                  className={`w-full border ${borderClass("lastName")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                  autoComplete="family-name"
                />
              </div>
            </div>
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
                placeholder="jane@example.com"
                className={`w-full border ${borderClass("email")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  clearError("password")
                }}
                placeholder="Min. 8 characters"
                className={`w-full border ${borderClass("password")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value })
                  clearError("confirmPassword")
                }}
                placeholder="••••••••"
                className={`w-full border ${borderClass("confirmPassword")} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors`}
                autoComplete="new-password"
              />
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 mt-4">
                Shipping details
              </p>
              <p className="text-xs text-stone-400 mb-3 -mt-2">
                Save these now to skip re-entering them at checkout — you can
                always add or change them later in My Account.
              </p>
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
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Main St"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                autoComplete="address-line1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Apt / Suite
              </label>
              <input
                type="text"
                value={form.apt}
                onChange={(e) => setForm({ ...form, apt: e.target.value })}
                placeholder="Apt 4B"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                autoComplete="address-line2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="San Francisco"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="CA"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  autoComplete="address-level1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: sanitizeZip(e.target.value) })}
                  placeholder="94103"
                  maxLength={5}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  autoComplete="postal-code"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Country
                </label>
                <select
                  value={form.country}
                  disabled
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors bg-stone-100 text-stone-500 cursor-not-allowed"
                >
                  <option>United States</option>
                </select>
              </div>
            </div>

            <Button variant="primary" full type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-xs text-stone-500 mt-5">
            Already have an account?{" "}
            <Link
              href="/account/login"
              className="text-amber-700 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
