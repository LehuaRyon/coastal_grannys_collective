import Link from "next/link"
import { prisma } from "@/lib/db"
import { Reveal } from "@/components/ui/Reveal"
import { AboutGallery } from "./AboutGallery"
import {
  CoffeeBeanIcon,
  FlaskIcon,
  FlowerIcon,
  InstagramLogoIcon,
  LeafIcon,
} from "@phosphor-icons/react/dist/ssr"

interface Value {
  icon: string
  title: string
  text: string
}

const DEFAULT_VALUES: Value[] = [
  {
    icon: "bean",
    title: "Roasted to Order",
    text: "Every batch is pulled from Ryan's Aillio Bullet drum roaster fresh — no warehouse stock, no stale beans.",
  },
  {
    icon: "flask",
    title: "Experimental Processing",
    text: "We specialize in co-ferments, carbonic macerations, and rare processing techniques that push flavor to its limit.",
  },
  {
    icon: "leaf",
    title: "Traceable Origins",
    text: "We source from producers we know by name. When Ryan loves a lot, he tells you exactly who grew it and why.",
  },
  {
    icon: "flower",
    title: "Community First",
    text: "Pop-ups, private tastings, and local events across San Diego. Coffee this good is meant to be shared.",
  },
]

function getVal(map: Map<string, string>, key: string, fallback: string) {
  return map.get(key) ?? fallback
}

export default async function AboutPage() {
  const rows = await prisma.siteContent.findMany({ where: { page: "about" } })
  const c = new Map(rows.map((r) => [r.key, r.value]))

  const heroTitle = getVal(c, "hero_title", "About Coastal Granny's")
  const heroSubtitle = getVal(
    c,
    "hero_subtitle",
    "A husband-and-wife micro-roasting project born from curiosity, community, and a love of the wildest coffees in the world.",
  )

  let values: Value[] = DEFAULT_VALUES
  try {
    if (c.has("values")) values = JSON.parse(c.get("values")!)
  } catch {
    /* use defaults */
  }

  return (
    <>
      <section
        className="relative overflow-hidden py-20 px-4 text-center"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/about-hero-bg.png)",
            backgroundPosition: "center 75.5%",
          }}
        />
        <div className="relative">
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-widest mb-3">
            Our Story
          </p>
          <h1 className="font-serif text-4xl md:text-5xl mb-4 text-stone-900">
            {heroTitle}
          </h1>
          <p className="text-stone-600 max-w-lg mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center mb-20">
          <Reveal>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
              How It Started
            </p>
            <h2 className="font-serif text-3xl text-stone-900 mb-5">
              From a Barbecue to an Aillio Bullet
            </h2>
            <p className="text-stone-500 leading-relaxed mb-4">
              Ryan started roasting on a barbecue in the backyard — just him, a
              bag of green beans, and a stubborn curiosity about what makes
              great coffee tick. It wasn&apos;t a business plan. It was a way to
              access the interesting lots — the rare, experimental ones that
              always come in 22 lb minimum shipments and are impossible to buy
              by the bag.
            </p>
            <p className="text-stone-500 leading-relaxed mb-4">
              One roaster led to another. He worked his way up to an Aillio
              Bullet drum roaster, studied under Scott Rao, and started building
              direct relationships with producers doing groundbreaking work —
              including Edwin Noreña, a legend in experimental processing who
              consistently puts out lots that redefine what coffee can taste
              like.
            </p>
            <p className="text-stone-500 leading-relaxed">
              By day Ryan is an environmental engineer for an aerospace company.
              Roasting is a passion project — one that grew because he genuinely
              loves nerding out on coffee and sharing it with people who might
              never otherwise get to try these lots at a fair price.
            </p>
            <a
              href="https://www.instagram.com/coastalgrannys/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 bg-stone-900 text-white font-medium px-6 py-3 rounded-full hover:bg-stone-700 transition-colors text-sm"
            >
              <InstagramLogoIcon size={16} weight="duotone" /> Follow on
              Instagram
            </a>
          </Reveal>
          <Reveal delay={150} className="rounded-3xl overflow-hidden shadow-xl">
            <img
              src="/images/about/kelly-brand.png"
              alt="Coastal Granny's Collective"
              className="w-full h-full object-cover"
            />
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center mb-20">
          <Reveal className="order-2 lg:order-1 rounded-3xl overflow-hidden shadow-xl">
            <img
              src="/images/about/kelly-with-drink.png"
              alt="Kelly McLaughlin — Coastal Granny's Collective"
              className="w-full h-full object-cover"
            />
          </Reveal>
          <Reveal delay={150} className="order-1 lg:order-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
              Meet Kelly
            </p>
            <h2 className="font-serif text-3xl text-stone-900 mb-5">
              The Cart, the Brand, and the Community
            </h2>
            <p className="text-stone-500 leading-relaxed mb-4">
              Kelly spent years in program management and health coaching —
              running diabetes prevention, prenatal, and smoking cessation
              programs. When her company changed their remote policy, she took
              it as a sign. She started cooking at home, launched a coffee and
              matcha cart, and Coastal Granny&apos;s took on a life of its own.
            </p>
            <p className="text-stone-500 leading-relaxed mb-4">
              Now she runs the cart full time — doing pop-ups, private
              experiences, and events all around San Diego. Ryan roasts for her.
              She brings the coffee to the people. Every drink she serves starts
              with a bag Ryan pulled fresh from the drum.
            </p>
            <p className="text-stone-500 leading-relaxed">
              The brand is hers. The roasting is his. The whole thing is theirs
              — and it&apos;s built on the idea that exceptional coffee should
              feel accessible, fun, and genuinely worth talking about.
            </p>
          </Reveal>
        </div>

        <h2 className="font-serif text-3xl text-stone-900 mb-6">
          What We Stand For
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-20">
          {values.map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 80}
              className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm"
            >
              <span className="block mb-3">
                {(v.icon === "bean" || v.icon === "🫘") && (
                  <CoffeeBeanIcon size={36} weight="duotone" color="#C8921A" />
                )}
                {(v.icon === "flask" || v.icon === "🔬") && (
                  <FlaskIcon size={36} weight="duotone" color="#C8921A" />
                )}
                {(v.icon === "leaf" || v.icon === "🌱") && (
                  <LeafIcon size={36} weight="duotone" color="#C8921A" />
                )}
                {(v.icon === "flower" || v.icon === "🌼") && (
                  <FlowerIcon size={36} weight="duotone" color="#C8921A" />
                )}
              </span>
              <h3 className="font-semibold text-stone-900 mb-1 text-sm">
                {v.title}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">{v.text}</p>
            </Reveal>
          ))}
        </div>

        <div className="mb-20">
          {/* Mobile: carousel (one image at a time). Desktop: 3-across grid. */}
          <div className="sm:hidden mb-5">
            <AboutGallery />
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-5 mb-5">
            <Reveal className="rounded-3xl overflow-hidden shadow-xl aspect-[3/4]">
              <img
                src="/images/about/cart-popup.png"
                alt="Coastal Granny's pop-up cart"
                className="w-full h-full object-cover"
              />
            </Reveal>
            <Reveal delay={80} className="rounded-3xl overflow-hidden shadow-xl aspect-[3/4]">
              <img
                src="/images/about/rodeo-queen-bag.png"
                alt="Rodeo Queen — Coastal Granny's Collective"
                className="w-full h-full object-cover object-top"
              />
            </Reveal>
            <Reveal delay={160} className="rounded-3xl overflow-hidden shadow-xl aspect-[3/4]">
              <img
                src="/images/about/cg-drink.png"
                alt="Coastal Granny's signature drink"
                className="w-full h-full object-cover"
              />
            </Reveal>
          </div>
          <Reveal
            className="relative rounded-3xl px-10 py-9 text-center overflow-hidden"
            style={{ backgroundColor: "#F5EFE6" }}
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: "url(/images/about-hero-bg.png)",
                backgroundPosition: "center 96%",
              }}
            />
            <div className="relative">
              <p className="font-serif text-2xl md:text-3xl text-stone-900 leading-snug italic mb-3">
                &ldquo;I really just like roasting so that I can try fun new
                coffees and nerd out — and share them with people.&rdquo;
              </p>
              <p className="text-sm font-semibold text-stone-900">
                — Ryan McLaughlin, Roaster
              </p>
            </div>
          </Reveal>
        </div>

        <h2 className="font-serif text-3xl text-stone-900 mb-2">
          Meet the Duo
        </h2>
        <p className="text-stone-500 text-sm mb-8">
          A husband-and-wife team obsessed with exceptional coffee and real
          community.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          <Reveal className="bg-white rounded-2xl border border-stone-100 p-8 shadow-sm">
            <CoffeeBeanIcon
              size={48}
              weight="duotone"
              color="#C8921A"
              className="block mb-4"
            />
            <p className="font-serif text-xl text-stone-900 mb-1">
              Ryan McLaughlin
            </p>
            <p className="text-base text-amber-700 font-medium mb-3">
              Micro-Roaster & Green Buyer
            </p>
            <p className="text-sm text-stone-500 leading-relaxed">
              Environmental engineer by day, obsessive coffee nerd by everything
              else. Ryan sources green beans from producers he knows by name,
              roasts every batch to order on his Aillio Bullet, and genuinely
              believes coffee can be a vehicle for storytelling. His current
              obsession: experimental co-ferments and rare natural process lots.
            </p>
          </Reveal>
          <Reveal delay={100} className="rounded-2xl overflow-hidden shadow-sm">
            <img
              src="/images/about/ryan-and-kelly.png"
              alt="Ryan and Kelly McLaughlin"
              className="w-full h-full object-cover"
            />
          </Reveal>
          <Reveal delay={200} className="bg-white rounded-2xl border border-stone-100 p-8 shadow-sm">
            <FlowerIcon
              size={48}
              weight="duotone"
              color="#C8921A"
              className="block mb-4"
            />
            <p className="font-serif text-xl text-stone-900 mb-1">
              Kelly McLaughlin
            </p>
            <p className="text-base text-amber-700 font-medium mb-3">
              Brand, Events & Pop-Ups
            </p>
            <p className="text-sm text-stone-500 leading-relaxed">
              Kelly is the face of Coastal Granny&apos;s in San Diego. She runs
              the coffee and matcha cart, books private experiences, coordinates
              pop-ups, and makes every guest feel like they&apos;re getting
              something special — because they are. The brand vision is hers,
              and it shows in every cup she serves.
            </p>
          </Reveal>
        </div>

        <Reveal
          className="relative rounded-3xl p-10 text-center overflow-hidden"
          style={{ backgroundColor: "#F5EFE6" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: "url(/images/about-cta-bg.png)",
              backgroundPosition: "center 0%",
              transform: "scaleY(-1)",
            }}
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-amber-700">
              Find Us in San Diego
            </p>
            <h2 className="font-serif text-3xl mb-3 text-stone-900">
              Catch the Cart
            </h2>
            <p className="text-stone-600 max-w-md mx-auto mb-6 text-sm leading-relaxed">
              Kelly runs pop-ups and private experiences all around SD. Follow
              along to catch the next one, or book a private event for your next
              gathering.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://www.instagram.com/coastalgrannys/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-stone-900 text-white font-semibold px-8 py-3 rounded-full hover:bg-stone-700 transition-colors text-sm"
              >
                <InstagramLogoIcon size={16} weight="duotone" /> @coastalgrannys
              </a>
              <Link
                href="/coffee-cart"
                className="inline-flex items-center gap-2 border border-stone-900/30 text-stone-900 font-semibold px-8 py-3 rounded-full hover:bg-stone-900/5 transition-colors text-sm"
              >
                Book the Cart →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
