import { FeaturedCoffeeCard } from "@/components/home/FeaturedCoffeeCard"
import { Reveal } from "@/components/ui/Reveal"
import { CountUpStat } from "@/components/ui/CountUpStat"
import { dbToCoffee } from "@/lib/data/db-products"
import { prisma } from "@/lib/db"
import {
  CoffeeIcon,
  FlaskIcon,
  FlowerIcon,
  LeafIcon,
} from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

function getVal(map: Map<string, string>, key: string, fallback: string) {
  return map.get(key) ?? fallback
}

export default async function HomePage() {
  const [featuredProducts, contentRows] = await Promise.all([
    prisma.product.findMany({
      where: { type: "coffee", inStock: true, featured: true },
      orderBy: { position: "asc" },
      take: 4,
    }),
    prisma.siteContent.findMany({ where: { page: "home" } }),
  ])

  // Fallback to first 4 in-stock by position if none are marked featured
  const products =
    featuredProducts.length > 0
      ? featuredProducts
      : await prisma.product.findMany({
          where: { type: "coffee", inStock: true },
          orderBy: { position: "asc" },
          take: 4,
        })

  const coffees = products.map(dbToCoffee)
  const c = new Map(contentRows.map((r) => [r.key, r.value]))

  const heroTitle = getVal(c, "hero_title", "Good Days Start Here")
  const heroSubtitle = getVal(
    c,
    "hero_subtitle",
    "Small-batch specialty coffee, roasted to order and shipped within 24 hours. Ethically sourced from farms we know by name.",
  )
  const featuredEyebrow = getVal(c, "featured_eyebrow", "The Collection")
  const featuredHeading = getVal(c, "featured_heading", "Our Coffees")
  const featuredBody = getVal(
    c,
    "featured_body",
    "Single-origins and seasonal favorites, roasted in small batches every week.",
  )
  const subHeading = getVal(c, "sub_heading", "Never Run Out of Coffee")
  const subBody = getVal(
    c,
    "sub_body",
    "Fresh coffee delivered on your schedule. Flexible plans that pause or cancel anytime.",
  )
  const storyEyebrow = getVal(c, "story_eyebrow", "Roasting Since 2019")
  const storyHeading = getVal(c, "story_heading", "Coffee That Tells a Story")
  const storyBody = getVal(
    c,
    "story_body",
    "We started with one roaster, one origin, and a belief that great coffee should be honest.",
  )

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden min-h-screen flex items-center"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/images/hero-bg.png)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-24 md:py-32 w-full">
          <p className="animate-hero-fade-up text-amber-700 text-xs font-semibold uppercase tracking-[0.2em] mb-6">
            Coastal Granny&apos;s Collective · San Diego, CA
          </p>
          <h1
            className="animate-hero-fade-up font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] mb-8 max-w-4xl text-stone-900 sm:whitespace-nowrap"
            style={{ animationDelay: "120ms" }}
          >
            {heroTitle}
          </h1>
          <p className="text-stone-600 text-lg max-w-4xl mb-10 leading-relaxed">
            {heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop/coffee"
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white font-semibold px-8 py-4 rounded-full transition-colors text-sm"
            >
              Shop Coffee
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <Link
              href="/shop/subscriptions"
              className="inline-flex items-center gap-2 border border-stone-900/30 hover:border-stone-900/60 text-stone-900 font-semibold px-8 py-4 rounded-full transition-colors text-sm hover:bg-stone-900/5"
            >
              Subscribe &amp; Save
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-10">
            {[
              { value: 10, suffix: "+", label: "Origins" },
              { value: 100, suffix: "%", label: "Roast to Order" },
              { n: "SD", label: "San Diego" },
            ].map((s) => (
              <div key={s.label}>
                {typeof s.value === "number" ? (
                  <CountUpStat
                    value={s.value}
                    suffix={s.suffix}
                    className="font-serif text-3xl text-amber-700"
                  />
                ) : (
                  <p className="font-serif text-3xl text-amber-700">{s.n}</p>
                )}
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Coffees ── */}
      <section className="bg-white py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">
                  {featuredEyebrow}
                </p>
                <h2 className="font-serif text-4xl text-stone-900">
                  {featuredHeading}
                </h2>
                <p className="text-stone-500 text-sm mt-2 max-w-md">
                  {featuredBody}
                </p>
              </div>
              <Link
                href="/shop/coffee"
                className="hidden sm:inline-flex text-sm font-medium text-amber-700 hover:text-amber-600 gap-1 items-center whitespace-nowrap"
              >
                View all
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coffees.map((coffee, i) => (
              <Reveal key={coffee.id} delay={i * 80}>
                <FeaturedCoffeeCard
                  slug={coffee.slug}
                  name={coffee.name}
                  subtitle={coffee.subtitle}
                  origin={coffee.origin}
                  notes={coffee.notes}
                  prices={coffee.prices}
                  gradient={coffee.gradient}
                  badge={coffee.badge}
                  hasImage={coffee.hasImage}
                />
              </Reveal>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/shop/coffee"
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              View all coffees →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Subscription CTA ── */}
      <section
        className="relative py-20 px-4 sm:px-6 overflow-hidden"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/images/sub-bg.png)" }}
        />
        <Reveal className="relative max-w-4xl mx-auto text-center">
          <CoffeeIcon
            size={48}
            weight="duotone"
            color="#CC9818"
            className="mb-4 mx-auto"
          />
          <h2 className="font-serif text-4xl md:text-5xl mb-4 text-stone-900">
            {subHeading}
          </h2>
          <p className="text-stone-600 max-w-lg mx-auto mb-8 leading-relaxed">
            {subBody}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/shop/subscriptions"
              className="bg-stone-900 text-white font-semibold px-8 py-4 rounded-full hover:bg-stone-700 transition-colors text-sm"
            >
              See Subscription Plans
            </Link>
            <Link
              href="/shop/coffee"
              className="border border-stone-900/30 text-stone-900 font-medium px-8 py-4 rounded-full hover:bg-stone-900/5 transition-colors text-sm"
            >
              One-Time Order
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Brand Story ── */}
      <section className="bg-stone-50 py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal className="rounded-3xl h-72 lg:h-96 overflow-hidden">
            <img
              src="/images/cg-logo-illustration.png"
              alt="Coastal Granny's Collective"
              className="w-full h-full object-cover"
            />
          </Reveal>
          <Reveal delay={150}>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
              {storyEyebrow}
            </p>
            <h2 className="font-serif text-4xl text-stone-900 mb-5">
              {storyHeading}
            </h2>
            <p className="text-stone-500 leading-relaxed mb-8">{storyBody}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-stone-900 text-white font-medium px-6 py-3 rounded-full hover:bg-stone-700 transition-colors text-sm"
              >
                Our Story
              </Link>
              <Link
                href="/wholesale"
                className="inline-flex items-center gap-2 border border-stone-300 text-stone-700 font-medium px-6 py-3 rounded-full hover:bg-stone-100 transition-colors text-sm"
              >
                Wholesale
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Values strip ── */}
      <section
        className="relative border-t border-stone-100 py-14 px-4 sm:px-6 overflow-hidden"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/values-bg.png)",
            backgroundPosition: "center 55%",
          }}
        />
        <div className="relative max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            {
              icon: "coffee",
              title: "Roasted Fresh",
              desc: "Pulled from the drum to your door — no warehouse stock ever",
            },
            {
              icon: "flask",
              title: "Experimental",
              desc: "Co-ferments, carbonic macerations, and rare varieties you've never tried",
            },
            {
              icon: "leaf",
              title: "Traceable",
              desc: "Every origin is known, named, and worth talking about",
            },
            {
              icon: "flower",
              title: "Community",
              desc: "Pop-ups and private tastings all around San Diego",
            },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <span className="block mb-3">
                {v.icon === "coffee" && (
                  <CoffeeIcon
                    size={40}
                    weight="duotone"
                    color="#C8921A"
                    className="mx-auto"
                  />
                )}
                {v.icon === "flask" && (
                  <FlaskIcon
                    size={40}
                    weight="duotone"
                    color="#C8921A"
                    className="mx-auto"
                  />
                )}
                {v.icon === "leaf" && (
                  <LeafIcon
                    size={40}
                    weight="duotone"
                    color="#C8921A"
                    className="mx-auto"
                  />
                )}
                {v.icon === "flower" && (
                  <FlowerIcon
                    size={40}
                    weight="duotone"
                    color="#C8921A"
                    className="mx-auto"
                  />
                )}
              </span>
              <p className="font-semibold text-stone-900 text-base mb-2">
                {v.title}
              </p>
              <p className="text-sm text-stone-400 leading-relaxed">{v.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
