import {
  CoffeeIcon,
  FlowerIcon,
  LeafIcon,
  TentIcon,
} from "@phosphor-icons/react/dist/ssr"
import { CartCarousel } from "./CartCarousel"
import { CoffeeCartClient } from "./CoffeeCartClient"
import { Reveal } from "@/components/ui/Reveal"

export const metadata = {
  title: "Coffee Cart — Coastal Granny's Collective",
  description:
    "Book Kelly's coffee and matcha cart for your next pop-up, private gathering, or event in San Diego.",
}

const OFFERING_ICONS = [
  <CoffeeIcon key="coffee" size={28} weight="duotone" color="#C8921A" />,
  <LeafIcon key="leaf" size={28} weight="duotone" color="#C8921A" />,
  <FlowerIcon key="flower" size={28} weight="duotone" color="#C8921A" />,
  <TentIcon key="tent" size={28} weight="duotone" color="#C8921A" />,
]

const OFFERINGS = [
  {
    title: "Specialty Coffee Bar",
    desc: "Fresh-pulled espresso, pour-overs, and cold brew — all from Ryan's micro-roasted single-origins. Every cup is made to order.",
  },
  {
    title: "Matcha & More",
    desc: "Ceremonial-grade matcha lattes, seasonal drinks, and desserts that round out the experience and give guests options.",
  },
  {
    title: "Private Experiences",
    desc: "Intimate coffee tastings, cupping sessions, and custom menus for smaller gatherings. Great for birthdays, showers, and team events.",
  },
  {
    title: "Pop-Up Events",
    desc: "Kelly sets up at markets, community events, and vendor fairs around San Diego. Follow @coastalgrannys to catch the next one.",
  },
]

export default function CoffeeCartPage() {
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
            backgroundImage: "url(/images/cart-hero-bg.png)",
            backgroundPosition: "center 50.5%",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-4">
              San Diego · Available for Events
            </p>
            <h1 className="font-serif text-5xl md:text-6xl mb-5 leading-tight text-stone-900">
              The Cart
              <br />
              <em className="not-italic" style={{ color: "#CC9818" }}>
                Comes to You
              </em>
            </h1>
            <p className="text-stone-600 max-w-md leading-relaxed mb-8">
              Kelly brings the Coastal Granny&apos;s coffee and matcha cart to
              pop-ups, private gatherings, birthdays, weddings, corporate
              events, and anywhere San Diego people want something genuinely
              special in their cup.
            </p>
            <a
              href="#inquiry"
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white font-semibold px-8 py-4 rounded-full transition-colors text-sm"
            >
              Book the Cart →
            </a>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
            <img
              src="/images/cart/coastal-drinks.png"
              alt="Coastal Granny's coffee and matcha drinks"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Carousel + What We Offer side by side */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch mb-20">
          {/* Left — carousel */}
          <Reveal>
            <CartCarousel />
          </Reveal>

          {/* Right — offerings stacked */}
          <Reveal delay={150} className="flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">
                What We Offer
              </p>
              <h2 className="font-serif text-4xl text-stone-900 mb-6">
                Built for Any Occasion
              </h2>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm flex-1 flex flex-col divide-y divide-stone-100">
              {OFFERINGS.map((o, i) => (
                <div
                  key={o.title}
                  className="p-6 flex gap-4 items-center flex-1"
                >
                  <span className="shrink-0">{OFFERING_ICONS[i]}</span>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-2 text-base">
                      {o.title}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      {o.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Inquiry form */}
      <div className="border-t border-stone-100">
        <CoffeeCartClient />
      </div>

    </>
  )
}
