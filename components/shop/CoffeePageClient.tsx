"use client"

import { CoffeeCard } from "@/components/shop/CoffeeCard"
import { ProductModal } from "@/components/shop/ProductModal"
import { Button } from "@/components/ui/Button"
import { Reveal } from "@/components/ui/Reveal"
import type { Coffee, RoastFilter } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

const ROAST_FILTERS: { label: string; value: RoastFilter }[] = [
  { label: "All Roasts", value: "all" },
  { label: "Light", value: "light" },
  { label: "Light-Medium", value: "light-medium" },
  { label: "Medium", value: "medium" },
  { label: "Medium-Dark", value: "medium-dark" },
  { label: "Dark", value: "dark" },
]

const ROAST_BG: Record<string, string> = {
  light:         '#C8941A',
  'light-medium': '#A0721A',
  medium:        '#7A5020',
  'medium-dark': '#50321A',
  dark:          '#2A1810',
}

const FLAVOR_FAMILIES: { label: string; notes: string[]; isAll?: boolean }[] = [
  { label: "All Flavors", notes: [], isAll: true },
  { label: "Fruity", notes: ["cherry", "cherry cola", "raspberry", "sangria", "mango", "pineapple", "tropical", "tropical fruit", "stone fruit", "melon", "jolly rancher", "watermelon", "berry", "grape", "blueberry", "strawberry", "peach", "apricot", "lychee", "passion fruit", "bright", "citrus", "lime", "orange"] },
  { label: "Chocolate", notes: ["chocolate", "dark chocolate", "baker's chocolate", "cocoa", "milk chocolate", "toffee", "brownie"] },
  { label: "Sweet", notes: ["caramel", "brown sugar", "honey", "vanilla", "candy", "butterscotch", "molasses", "maple", "sugar cane", "toffee"] },
  { label: "Floral", notes: ["florals", "floral", "jasmine", "lavender", "white tea", "rose", "hibiscus", "honeysuckle", "bergamot", "hops"] },
  { label: "Nutty", notes: ["nutty", "nuttiness", "almond", "hazelnut", "walnut", "pecan", "peanut"] },
  { label: "Spiced", notes: ["baking spices", "spice", "cinnamon", "clove", "cardamom", "black pepper", "ginger"] },
  { label: "Earthy", notes: ["earthy", "tobacco", "cedar", "leather", "woody", "herbaceous"] },
]

type SortBy = "default" | "best-selling" | "name-asc" | "name-desc" | "price-asc" | "price-desc"
type BadgeFilter = "all" | "staff-pick" | "limited" | "featured"

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: "Default", value: "default" },
  { label: "Best Selling", value: "best-selling" },
  { label: "A → Z", value: "name-asc" },
  { label: "Z → A", value: "name-desc" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
]

const BADGE_OPTIONS: { label: string; value: BadgeFilter }[] = [
  { label: "All Badges", value: "all" },
  { label: "Staff Pick", value: "staff-pick" },
  { label: "Limited", value: "limited" },
  { label: "Featured", value: "featured" },
]

function originToCountry(origin: string): string {
  const parts = origin.split(",")
  return parts[parts.length - 1].trim()
}

export function CoffeePageClient({ coffees }: { coffees: Coffee[] }) {
  const router = useRouter()
  const [roastFilter, setRoastFilter] = useState<RoastFilter>("all")
  const [originFilter, setOriginFilter] = useState<string>("all")
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set())
  const [stockFilter, setStockFilter] = useState<"in" | "out" | "all">("in")
  const [sortBy, setSortBy] = useState<SortBy>("default")
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all")
  const [selectedProduct, setSelectedProduct] = useState<Coffee | null>(null)

  const countries = useMemo(() => {
    const set = new Set<string>()
    for (const c of coffees) if (c.origin) set.add(originToCountry(c.origin))
    return Array.from(set).sort()
  }, [coffees])

  function lowestPrice(c: Coffee) {
    return Math.min(...Object.values(c.prices))
  }

  function coffeeMatchesFamily(coffee: Coffee, family: string): boolean {
    const f = FLAVOR_FAMILIES.find((f) => f.label === family)
    if (!f) return false
    const coffeeNotes = coffee.notes.map((n) => n.toLowerCase())
    return f.notes.some((n) => coffeeNotes.some((cn) => cn.includes(n) || n.includes(cn)))
  }

  function toggleFamily(family: string) {
    if (family === "All Flavors") {
      setSelectedFamilies(new Set())
      return
    }
    setSelectedFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
  }

  const filtered = coffees
    .filter((c) => {
      if (stockFilter === "in" && !c.inStock) return false
      if (stockFilter === "out" && c.inStock) return false
      if (roastFilter !== "all" && c.roast.toLowerCase().replace(" ", "-") !== roastFilter) return false
      if (originFilter !== "all" && originToCountry(c.origin) !== originFilter) return false
      if (selectedFamilies.size > 0) {
        if (!Array.from(selectedFamilies).some((f) => coffeeMatchesFamily(c, f))) return false
      }
      if (badgeFilter === "staff-pick" && c.badge !== "Staff Pick") return false
      if (badgeFilter === "limited" && c.badge !== "Limited") return false
      if (badgeFilter === "featured" && !c.featured) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "best-selling") return b.salesRank - a.salesRank
      if (sortBy === "name-asc") return a.name.localeCompare(b.name)
      if (sortBy === "name-desc") return b.name.localeCompare(a.name)
      if (sortBy === "price-asc") return lowestPrice(a) - lowestPrice(b)
      if (sortBy === "price-desc") return lowestPrice(b) - lowestPrice(a)
      return 0 // "default" = position order from DB
    })

  const selectedIndex = selectedProduct
    ? filtered.findIndex((c) => c.id === selectedProduct.id)
    : -1
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < filtered.length - 1

  function goToPrevProduct() {
    if (hasPrev) setSelectedProduct(filtered[selectedIndex - 1])
  }
  function goToNextProduct() {
    if (hasNext) setSelectedProduct(filtered[selectedIndex + 1])
  }

  function resetFilters() {
    setRoastFilter("all")
    setOriginFilter("all")
    setSelectedFamilies(new Set())
    setStockFilter("in")
    setSortBy("default")
    setBadgeFilter("all")
  }

  const hasActiveFilters =
    roastFilter !== "all" ||
    originFilter !== "all" ||
    selectedFamilies.size > 0 ||
    stockFilter !== "in" ||
    (sortBy !== "default" && sortBy !== "best-selling") ||
    badgeFilter !== "all"

  const filterBtn = (active: boolean, color: "stone" | "amber" | "green") => {
    const activeClasses = {
      stone: "bg-stone-900 text-white",
      amber: "bg-amber-700 text-white",
      green: "text-white",
    }
    return `px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
      active
        ? activeClasses[color]
        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
    }`
  }

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

          {/* Stock */}
          <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Stock</span>
            {(
              [
                { value: "in", label: "In Stock", style: { backgroundColor: "#6B7A4A" } },
                { value: "out", label: "Out of Stock", style: { backgroundColor: "#9A5858" } },
                { value: "all", label: "All", style: undefined },
              ] as const
            ).map(({ value, label, style }) => (
              <button
                key={value}
                onClick={() => setStockFilter(value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  stockFilter === value ? "text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                style={stockFilter === value ? style ?? { backgroundColor: "#1c1917" } : undefined}
              >
                {label}
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={resetFilters} className="ml-2 text-xs text-stone-400 hover:text-stone-700 underline transition-colors">
                Reset
              </button>
            )}
          </div>

          {/* Roast */}
          <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Roast</span>
            {ROAST_FILTERS.map((f) => {
              const active = roastFilter === f.value
              const roastColor = ROAST_BG[f.value]
              return (
                <button
                  key={f.value}
                  onClick={() => setRoastFilter(f.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    active
                      ? roastColor
                        ? 'text-white'
                        : 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  style={active && roastColor ? { backgroundColor: roastColor } : undefined}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Origin */}
          {countries.length > 1 && (
            <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Origin</span>
              {(["all", ...countries] as string[]).map((country) => {
                const active = originFilter === country
                return (
                  <button
                    key={country}
                    onClick={() => setOriginFilter(country)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                      active ? "text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    style={active ? { backgroundColor: "#6B7A4A" } : undefined}
                  >
                    {country === "all" ? "All Origins" : country}
                  </button>
                )
              })}
            </div>
          )}

          {/* Badge */}
          <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Badge</span>
            {BADGE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setBadgeFilter(value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                  badgeFilter === value
                    ? value === "staff-pick"
                      ? "text-stone-900 font-semibold"
                      : value === "limited"
                      ? "bg-red-600 text-white"
                      : "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                style={badgeFilter === value && value === "staff-pick" ? { backgroundColor: "#CC9818" } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Flavor families */}
          <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Flavor</span>
            {FLAVOR_FAMILIES.map(({ label, isAll }) => {
              const active = isAll ? selectedFamilies.size === 0 : selectedFamilies.has(label)
              return (
                <button
                  key={label}
                  onClick={() => toggleFamily(label)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    active ? "text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                  style={active ? { backgroundColor: "#6B7A4A" } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <div className="flex gap-2 items-center overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide w-14 flex-shrink-0">Sort</span>
            {SORT_OPTIONS.map(({ label, value }) => (
              <button key={value} onClick={() => setSortBy(value)} className={`${filterBtn(sortBy === value, "stone")} flex-shrink-0`}>
                {label}
              </button>
            ))}
          </div>

        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="mb-3">No coffees match those filters.</p>
            <button onClick={resetFilters} className="text-sm text-amber-700 hover:underline">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((coffee, i) => (
              <Reveal key={coffee.id} delay={Math.min(i * 60, 480)}>
                <CoffeeCard coffee={coffee} onViewDetails={setSelectedProduct} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onPrev={goToPrevProduct}
        onNext={goToNextProduct}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </>
  )
}
