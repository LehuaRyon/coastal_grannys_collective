"use client"

import { CoffeeCard } from "@/components/shop/CoffeeCard"
import { ProductModal } from "@/components/shop/ProductModal"
import { Button } from "@/components/ui/Button"
import type { Coffee, RoastFilter } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

const ROAST_FILTERS: { label: string; value: RoastFilter }[] = [
  { label: "All Roasts", value: "all" },
  { label: "Light", value: "light" },
  { label: "Medium", value: "medium" },
  { label: "Medium-Dark", value: "medium-dark" },
  { label: "Dark", value: "dark" },
]

function originToCountry(origin: string): string {
  const parts = origin.split(",")
  return parts[parts.length - 1].trim()
}

export function CoffeePageClient({ coffees }: { coffees: Coffee[] }) {
  const router = useRouter()
  const [roastFilter, setRoastFilter] = useState<RoastFilter>("all")
  const [originFilter, setOriginFilter] = useState<string>("all")
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [stockFilter, setStockFilter] = useState<"in" | "out" | "all">("in")
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none")
  const [selectedProduct, setSelectedProduct] = useState<Coffee | null>(null)

  const countries = useMemo(() => {
    const set = new Set<string>()
    for (const c of coffees) if (c.origin) set.add(originToCountry(c.origin))
    return Array.from(set).sort()
  }, [coffees])

  const allNotes = useMemo(() => {
    const set = new Set<string>()
    for (const c of coffees) for (const n of c.notes) set.add(n.toLowerCase())
    return Array.from(set).sort()
  }, [coffees])

  function lowestPrice(c: Coffee) {
    return Math.min(...Object.values(c.prices))
  }

  const filtered = coffees
    .filter((c) => {
      if (stockFilter === "in" && !c.inStock) return false
      if (stockFilter === "out" && c.inStock) return false
      if (roastFilter !== "all" && c.roast.toLowerCase() !== roastFilter)
        return false
      if (originFilter !== "all" && originToCountry(c.origin) !== originFilter)
        return false
      if (selectedNotes.size > 0) {
        const coffeeNotes = c.notes.map((n) => n.toLowerCase())
        if (!Array.from(selectedNotes).some((n) => coffeeNotes.includes(n)))
          return false
      }
      return true
    })
    .sort((a, b) => {
      if (priceSort === "asc") return lowestPrice(a) - lowestPrice(b)
      if (priceSort === "desc") return lowestPrice(b) - lowestPrice(a)
      return 0
    })

  function toggleNote(note: string) {
    setSelectedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(note)) next.delete(note)
      else next.add(note)
      return next
    })
  }

  function resetFilters() {
    setRoastFilter("all")
    setOriginFilter("all")
    setSelectedNotes(new Set())
    setStockFilter("in")
    setPriceSort("none")
  }

  const hasActiveFilters =
    roastFilter !== "all" ||
    originFilter !== "all" ||
    selectedNotes.size > 0 ||
    stockFilter !== "in" ||
    priceSort !== "none"

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/coffee-hero-bg.png)",
            backgroundPosition: "center 56.5%",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-3">
            Freshly Roasted · Ethically Sourced
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-4 leading-tight text-stone-900">
            Coffee that
            <br />
            tells a <em style={{ color: "#CC9818" }}>story</em>
          </h1>
          <p className="text-stone-600 max-w-lg mb-8 leading-relaxed">
            We source exclusively from small farms and cooperatives, roasting
            every batch to order so you taste the bean at its best.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="dark"
              onClick={() =>
                document
                  .getElementById("coffee-grid")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Shop All Coffees
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/shop/subscriptions")}
            >
              Subscribe &amp; Save
            </Button>
          </div>
        </div>
      </section>

      {/* Products */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-14"
        id="coffee-grid"
      >
        <div className="mb-8">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
            The Collection
          </p>
          <h2 className="font-serif text-3xl text-stone-900 mb-2">
            Our Coffees
          </h2>
          <p className="text-stone-500 text-sm">
            Single-origins and seasonal favorites, roasted in small batches
            every week.
          </p>
        </div>

        {/* Filter bar */}
        <div className="space-y-3 mb-8">
          {/* Roast */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">
              Roast
            </span>
            {ROAST_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setRoastFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  roastFilter === f.value
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Origin */}
          {countries.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">
                Origin
              </span>
              <button
                onClick={() => setOriginFilter("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  originFilter === "all"
                    ? "bg-amber-700 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                All Origins
              </button>
              {countries.map((country) => (
                <button
                  key={country}
                  onClick={() => setOriginFilter(country)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    originFilter === country
                      ? "bg-amber-700 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          )}

          {/* Tasting notes — multi-select, single scrollable row */}
          {allNotes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">
                Notes
              </span>
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                {allNotes.map((note) => {
                  const active = selectedNotes.has(note)
                  return (
                    <button
                      key={note}
                      onClick={() => toggleNote(note)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all whitespace-nowrap flex-shrink-0 ${
                        active ? "text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                      style={active ? { backgroundColor: '#6B7A4A' } : undefined}
                    >
                      {note}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Price sort */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">
              Price
            </span>
            {(
              [
                { value: "none", label: "Default" },
                { value: "asc", label: "Low → High" },
                { value: "desc", label: "High → Low" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPriceSort(value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  priceSort === value
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Availability — three-way */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">
              Stock
            </span>
            {(
              [
                { value: "in", label: "In Stock", cls: "", style: { backgroundColor: '#6B7A4A' } },
                { value: "out", label: "Out of Stock", cls: "", style: { backgroundColor: '#9A5858' } },
                { value: "all", label: "All", cls: "bg-stone-900", style: undefined },
              ] as const
            ).map(({ value, label, cls, style }) => (
              <button
                key={value}
                onClick={() => setStockFilter(value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  stockFilter === value
                    ? `${cls} text-white`
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                style={stockFilter === value ? style : undefined}
              >
                {label}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-2 text-xs text-stone-400 hover:text-stone-700 underline transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="mb-3">No coffees match those filters.</p>
            <button
              onClick={resetFilters}
              className="text-sm text-amber-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((coffee) => (
              <CoffeeCard
                key={coffee.id}
                coffee={coffee}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  )
}
