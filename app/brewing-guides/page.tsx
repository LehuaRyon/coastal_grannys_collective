import {
  DropIcon,
  TestTubeIcon,
  CoffeeIcon,
  SnowflakeIcon,
  FireIcon,
  TimerIcon,
  LightningIcon,
  CoffeeBeanIcon,
} from "@phosphor-icons/react/dist/ssr"

export const metadata = {
  title: "Brewing Guides — Coastal Granny's Collective",
  description:
    "How to brew specialty coffee at home — pour over, AeroPress, French press, cold brew, moka pot, and more. Includes specific guidance for co-fermented and experimental lots.",
}

function MethodIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = { size, weight: "duotone" as const, color: "#CC9818" }
  switch (name) {
    case "Pour Over":        return <DropIcon {...props} />
    case "AeroPress":        return <TestTubeIcon {...props} />
    case "French Press":     return <CoffeeIcon {...props} />
    case "Cold Brew":        return <SnowflakeIcon {...props} />
    case "Moka Pot":         return <FireIcon {...props} />
    case "Drip / Batch Brew": return <TimerIcon {...props} />
    case "Espresso":         return <LightningIcon {...props} />
    default:                 return null
  }
}

const METHODS = [
  {
    name: "Pour Over",
    tagline: "The gold standard for specialty coffee",
    grind: "Medium-fine (coarse table salt)",
    ratio: "1:15–1:17 · e.g. 25g coffee → 400g water",
    temp: "200–205°F (93–96°C)",
    time: "3–4 min",
    bloom: "30–45 sec with ~50g water",
    bestFor:
      "Light and light-medium roasts, co-fermented lots, single-origins where clarity matters most",
    equipment: [
      "Dripper (V60, Kalita Wave, Origami, Chemex)",
      "Gooseneck kettle",
      "Digital scale",
      "Paper filters",
      "Server or mug",
    ],
    steps: [
      "Rinse your paper filter with hot water — this removes papery taste and pre-heats the dripper.",
      "Add 25g medium-fine ground coffee. Set your scale to zero.",
      "Start the timer. Pour ~50g water (2× the coffee weight) evenly over the grounds for the bloom. Wait 30–45 seconds — you'll see the coffee puff and bubble as CO₂ releases.",
      "Pour in slow, steady circles, keeping the water level consistent. Aim to finish all 400g by 2:30–3:00.",
      "Let the drawdown complete. Total brew time should be 3–4 minutes. If it's slower, grind coarser; if faster, grind finer.",
    ],
    tips: [
      "For co-fermented and light roasts, drop temp to 195–200°F — lower heat preserves delicate aromatic compounds.",
      "A longer bloom (45 sec) helps with dense, freshly roasted beans that still have a lot of CO₂.",
      "Gooseneck control matters. Uneven pours create uneven extraction — one side overextracted, one underextracted.",
    ],
    cofermentNote:
      "Pour over is our top recommendation for CGC's co-fermented lots. The paper filter strips oils that would otherwise muddy the fermentation aromatics, and the pour-over process gives you full control over how those notes develop cup to cup.",
  },
  {
    name: "AeroPress",
    tagline: "Forgiving, versatile, consistently great",
    grind: "Medium to medium-fine (adjust by recipe)",
    ratio: "1:10–1:15 · e.g. 15g coffee → 200g water",
    temp: "175–205°F — lower for lighter roasts",
    time: "1–2 min",
    bloom: "Optional 30 sec bloom recommended",
    bestFor:
      "Co-fermented coffees, travel, single-serve, espresso-style concentrate",
    equipment: [
      "AeroPress or AeroPress Go",
      "Paper microfilters",
      "Gooseneck or standard kettle",
      "Digital scale",
      "Mug or server",
    ],
    steps: [
      "Place a paper filter in the cap. Rinse with hot water. Attach to the AeroPress over your mug.",
      "Add 15–18g medium-fine ground coffee.",
      "Start timer. Pour ~30g water for a 30-second bloom, stirring gently.",
      "Continue pouring to ~200g total. Stir once. Place the plunger on top.",
      "Press down slowly and steadily over 30–45 seconds. Stop when you hear a hiss.",
    ],
    tips: [
      "Try the inverted method: flip the AeroPress upside down while brewing, then flip to press. This gives a full immersion steep with more control.",
      "For co-fermented lots, try a lower brew temp (185–195°F) — it brings out floral and fruity fermentation notes more gently than near-boiling water.",
      "The AeroPress is incredibly recipe-flexible. Don't be afraid to experiment with dose, time, and temperature.",
    ],
    cofermentNote:
      "The AeroPress is one of the best tools for exploring co-fermented coffees. Lower-temperature brews (around 185°F) soften the more intense fermentation character into something elegant — stone fruit, lychee, florals — without losing intensity.",
  },
  {
    name: "French Press",
    tagline: "Full body, classic strength",
    grind: "Coarse (sea salt or peppercorn)",
    ratio: "1:12–1:15 · e.g. 30g coffee → 360–450g water",
    temp: "200°F (93°C)",
    time: "4 min steep",
    bloom: "Not required",
    bestFor:
      "Medium-dark to dark roasts, bold full-bodied coffees, group brewing",
    equipment: [
      "French press (350ml–1L)",
      "Gooseneck or standard kettle",
      "Timer",
      "Wooden spoon or stirrer",
    ],
    steps: [
      "Preheat your French press with hot water. Discard.",
      "Add 30g coarse ground coffee.",
      "Pour 360–450g of 200°F water. Start timer. Stir gently to ensure all grounds are saturated.",
      "Place the lid on with the plunger pulled all the way up. Wait 4 minutes.",
      "Press down slowly and steadily — don't force it. Pour immediately. Coffee left in the press continues to extract and will turn bitter.",
    ],
    tips: [
      "Grind consistency matters most here. Inconsistent grind = muddy cup. Use a burr grinder.",
      "Don't press too hard or too fast — you'll push fine particles through the mesh screen.",
      "If your press has cold spots near the bottom, give it a final stir at the 3:30 mark before plunging.",
    ],
    cofermentNote:
      "French press lets oils and fine particles through the mesh screen, which adds body but can muddy the clarity of delicate co-fermented notes. We recommend pour over or AeroPress for our more complex experimental lots. For heartier origins like our Bali Blue Moon or Indonesia Mysore, French press is a great choice.",
  },
  {
    name: "Cold Brew",
    tagline: "Smooth, low-acid, and co-ferment-friendly",
    grind: "Extra coarse (breadcrumb texture)",
    ratio: "1:5 for concentrate · 1:8 for ready-to-drink",
    temp: "Cold (fridge) or room temperature",
    time: "12–24 hrs in fridge · 8–12 hrs at room temp",
    bloom: "Not applicable",
    bestFor:
      "Co-fermented coffees, warm weather, low-acid drinking, iced coffee",
    equipment: [
      "Mason jar, Toddy system, or any large container",
      "Fine mesh strainer or cheesecloth",
      "Paper coffee filter (for final clarification)",
    ],
    steps: [
      "Combine 100g extra-coarse ground coffee with 800g cold or room-temp water (1:8 ratio). Stir well.",
      "Cover and refrigerate for 16–24 hours, or leave at room temperature for 8–12 hours.",
      "Strain first through a fine mesh strainer, then again through a paper filter for a cleaner result.",
      "Store in the fridge for up to 2 weeks. Serve over ice straight, or dilute 1:1 with water or milk.",
    ],
    tips: [
      "Room temperature cold brew extracts faster but can develop a slightly fermented edge of its own — great for some coffees, too much for others. Fridge is more controlled.",
      "The extra-coarse grind is critical. A finer grind over-extracts at long steep times and turns bitter.",
      "Don't rush the strain. Slow filtration through a paper filter produces a noticeably cleaner, brighter cup.",
    ],
    cofermentNote:
      "Cold brew is one of the most interesting ways to experience CGC's co-fermented lots. The cold extraction process softens the more intense fermentation notes into something smooth, mellow, and complex — tropical fruit and florals come through in a rounded, easy-drinking form. Modern Monk Coffee, whose processing methods inspired some of Ryan's early experiments, specifically recommends cold brew for bringing out co-ferment character without edge.",
  },
  {
    name: "Moka Pot",
    tagline: "Stovetop strength without an espresso machine",
    grind: "Fine (finer than drip, coarser than espresso)",
    ratio: "Fill the basket level · water to the valve",
    temp: "Start with hot or boiling water in the chamber",
    time: "5–7 min on medium heat",
    bloom: "Not applicable",
    bestFor:
      "Medium-dark to dark roasts, espresso-adjacent strength, no-equipment espresso drinks",
    equipment: ["Moka pot (Bialetti or similar)", "Stovetop", "Oven mitt"],
    steps: [
      "Fill the bottom chamber with hot water up to the safety valve — not above it.",
      "Fill the coffee basket level with fine ground coffee. Don't tamp; just sweep off any excess.",
      "Screw the top on firmly. Place on medium-low heat.",
      "Listen and watch: the coffee will begin to gurgle through. Remove from heat when you hear a sputtering sound — this means the water is nearly exhausted. Don't let it sputter too long or the coffee scorches.",
      "Pour immediately and enjoy.",
    ],
    tips: [
      "Pre-heat your water before filling the chamber — cold water in the lower chamber means longer time on heat, which can scorch the coffee before it brews.",
      "Medium-low heat is key. High heat produces steam too fast, pushing water through too quickly and creating bitterness.",
      "Clean thoroughly after each use. Coffee oils left in the basket and gaskets go rancid quickly and will ruin future brews.",
    ],
    cofermentNote:
      "Moka pot can work with co-fermented coffees but tends to flatten nuance. If you're curious, try one of our medium-roast co-ferments like Rodeo Queen — the melon and tropical notes can still come through. For the more delicate experimental lots, pour over is a better showcase.",
  },
  {
    name: "Drip / Batch Brew",
    tagline: "Consistent, convenient, best with a good machine",
    grind: "Medium (kosher salt texture)",
    ratio: "1:16–1:17 · ~60g per liter of water",
    temp: "195–205°F (auto machines vary widely)",
    time: "5–8 min",
    bloom: "Some machines have a pre-infusion cycle",
    bestFor:
      "Everyday medium roasts, group brewing, consistent results without manual effort",
    equipment: [
      "Auto drip machine (SCAA-certified recommended)",
      "Paper filters (pre-rinsed)",
      "Digital scale or measuring scoop",
    ],
    steps: [
      "Rinse your paper filter with hot water before brewing.",
      "Add ~60g medium ground coffee per liter of water (e.g., 30g for a 500ml / ~2 cup brew).",
      "Use filtered water. If your machine has a pre-infusion or bloom setting, enable it.",
      "Brew. Drink within 20–30 minutes of completion for best flavor — coffee held on a burner continues to cook and loses clarity fast.",
    ],
    tips: [
      "The single biggest upgrade for drip coffee isn't a new machine — it's fresher, better beans ground immediately before brewing.",
      "SCAA-certified machines (Breville Precision, OXO Brew, Technivorm Moccamaster) maintain proper temperature throughout the brew cycle. Budget machines often don't reach 195°F, producing flat, underextracted coffee.",
      "Grind fresh, every time. Pre-ground coffee stales within days of opening.",
    ],
    cofermentNote:
      "Drip brewing works fine for our more approachable single-origins and medium roasts. For co-fermented lots, we prefer pour over — it gives you more control and tends to produce better clarity. That said, a high-quality drip machine with pre-infusion can produce a very nice cup with our Colombia Peach or Bali Blue Moon.",
  },
  {
    name: "Espresso",
    tagline: "Intensity, precision, and the highest ceiling",
    grind: "Extra fine (finer than table salt)",
    ratio: "1:1.5–1:2.5 · e.g. 18g in → 27–45g out",
    temp: "197–202°F (91–94°C)",
    time: "25–35 sec extraction",
    bloom: "Pre-infusion if your machine supports it",
    bestFor:
      "Medium-dark to dark roasts, milk drinks, pulling the most intense version of a co-ferment",
    equipment: [
      "Espresso machine (9-bar pump, temperature stability)",
      "Espresso grinder (burr, with fine adjustment)",
      "Tamper",
      "Portafilter",
      "Scale",
    ],
    steps: [
      "Dial in your grind: if the shot pulls too fast (under 20 sec), grind finer. Too slow (over 40 sec), grind coarser.",
      "Dose 18–20g of ground coffee into the portafilter. Distribute evenly, then tamp with ~30 lbs of pressure, keeping the puck level.",
      "Lock the portafilter and start the shot. Aim for 27–45g of espresso out in 25–35 seconds.",
      "Taste. Adjust grind, dose, or ratio until balanced — not sour (underextracted) or bitter (overextracted).",
    ],
    tips: [
      "Espresso amplifies everything — good and bad. Stale, mediocre beans become more stale and mediocre under 9 bars of pressure. Use very fresh, high-quality coffee.",
      "Temperature has huge impact with lighter roasts. Higher temp (202°F) extracts more from light roasts; lower temp (197°F) suits darker beans.",
      "Espresso is a serious hobby. If you're getting started, a great drip or pour-over setup will bring you more joy per dollar than a budget espresso machine.",
    ],
    cofermentNote:
      "Several of our coffees pull beautifully as espresso — the pressure intensifies the fermentation character and concentrates it into something wild and complex. Disco Diva as espresso is an experience. That said, filter brewing is still the best way to taste the full flavor range. If you're curious about a specific CGC lot for espresso, email us and we'll tell you honestly.",
  },
]

const GENERAL_TIPS = [
  {
    title: "Buy fresh, grind fresh",
    body: "Coffee degrades rapidly once roasted. Aim to brew within 2–4 weeks of the roast date, and grind whole beans immediately before brewing. Pre-ground coffee loses most of its aromatic complexity within days of opening the bag.",
  },
  {
    title: "Water quality matters more than most people think",
    body: "Coffee is over 98% water. Heavily chlorinated tap water dulls flavors — especially in delicate co-fermented and light-roasted lots. Filtered water (even a basic Brita) makes a noticeable difference. Avoid fully distilled or softened water — you need some mineral content for proper extraction, just not chlorine or off-flavors.",
  },
  {
    title: "Use a scale",
    body: "Volume measurements (scoops, tablespoons) are inconsistent — different grind sizes produce wildly different results for the same volume. A digital scale that measures to 0.1g costs under $15 and is the single highest-impact upgrade you can make to your brewing. Weigh your coffee and your water.",
  },
  {
    title: "Dial in your grind, not just your recipe",
    body: "Most brewing problems — sour, flat, bitter, thin — trace back to grind size. Brew time too fast and flavor is thin? Grind finer. Too slow and it's bitter? Grind coarser. Recipes are starting points. Your specific grinder, water, and coffee density all affect the right setting.",
  },
  {
    title: "Bloom every time",
    body: "Freshly roasted coffee releases CO₂ — a process called degassing. If you pour all your water at once without a bloom step, the CO₂ escapes mid-brew and causes uneven extraction. A 30–45 second bloom (using ~2× the coffee weight in water) lets the gas escape first, setting up a cleaner, more even extraction for everything that follows.",
  },
  {
    title: "Rest your coffee",
    body: "Right after roasting, beans still off-gas aggressively. Most specialty coffees are at their best between 5 and 21 days post-roast. Our experimental lots often have a wider peak window — some are better at 12–15 days as the more volatile fermentation aromatics settle into something more nuanced and integrated.",
  },
]

export default function BrewingGuidesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-serif text-4xl text-stone-900 mb-2">
        Brewing Guides
      </h1>
      <p className="text-sm text-stone-400 mb-10 max-w-2xl">
        How to get the most from every bag — pour over, AeroPress, French press,
        cold brew, moka pot, drip, and espresso. Includes specific guidance for
        brewing our co-fermented and experimental lots.
      </p>

      <div className="mb-14 p-6 rounded-2xl border border-stone-100 bg-stone-50">
        <h2 className="font-semibold text-stone-900 mb-4 text-sm uppercase tracking-wide">
          Not sure where to start?
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-stone-700 mb-1">
              For complex, experimental coffees
            </p>
            <p className="text-stone-500">
              Pour over or AeroPress — both give you clarity and control. Start
              here with co-fermented and light-roasted lots.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-700 mb-1">
              For everyday drinking
            </p>
            <p className="text-stone-500">
              A good drip machine or French press. Easy, consistent, and works
              well with medium and medium-dark roasts.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-700 mb-1">
              For something different
            </p>
            <p className="text-stone-500">
              Try cold brew with a co-fermented lot. Cold extraction transforms
              fermentation notes into something smooth and surprising.
            </p>
          </div>
        </div>
      </div>

      <section className="mb-14">
        <h2 className="font-serif text-2xl text-stone-900 mb-6 pb-3 border-b border-stone-100">
          At a Glance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="pb-3 pr-4 font-semibold text-stone-500 uppercase tracking-wide">
                  Method
                </th>
                <th className="pb-3 pr-4 font-semibold text-stone-500 uppercase tracking-wide">
                  Grind
                </th>
                <th className="pb-3 pr-4 font-semibold text-stone-500 uppercase tracking-wide">
                  Ratio
                </th>
                <th className="pb-3 pr-4 font-semibold text-stone-500 uppercase tracking-wide">
                  Temp
                </th>
                <th className="pb-3 font-semibold text-stone-500 uppercase tracking-wide">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m, i) => (
                <tr key={m.name} className={i % 2 === 0 ? "bg-stone-50" : ""}>
                  <td className="py-2.5 pr-4 font-medium text-stone-800 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <MethodIcon name={m.name} size={14} />
                      {m.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-stone-500">{m.grind}</td>
                  <td className="py-2.5 pr-4 text-stone-500 whitespace-nowrap">
                    {m.ratio.split("·")[0].trim()}
                  </td>
                  <td className="py-2.5 pr-4 text-stone-500 whitespace-nowrap">
                    {m.temp}
                  </td>
                  <td className="py-2.5 text-stone-500">{m.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-16">
        {METHODS.map((m) => (
          <section key={m.name}>
            <div className="flex items-center gap-3 mb-1">
              <MethodIcon name={m.name} size={24} />
              <h2 className="font-serif text-2xl text-stone-900">{m.name}</h2>
            </div>
            <p className="text-stone-400 text-sm italic mb-6">{m.tagline}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Grind", val: m.grind },
                { label: "Ratio", val: m.ratio },
                { label: "Temperature", val: m.temp },
                { label: "Brew Time", val: m.time },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-stone-50 rounded-xl p-3 border border-stone-100"
                >
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="text-xs text-stone-700 font-medium leading-snug">
                    {val}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Equipment
                </h3>
                <ul className="space-y-1.5">
                  {m.equipment.map((e) => (
                    <li key={e} className="text-sm text-stone-600 flex gap-2">
                      <span className="text-amber-600 mt-0.5 flex-shrink-0">
                        ·
                      </span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  Tips
                </h3>
                <ul className="space-y-2">
                  {m.tips.map((t) => (
                    <li key={t} className="text-sm text-stone-600 flex gap-2">
                      <span className="text-amber-600 mt-0.5 flex-shrink-0">
                        →
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                How to Brew
              </h3>
              <ol className="space-y-2">
                {m.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-600">
                    <span className="font-semibold text-amber-700 flex-shrink-0 w-4">
                      {i + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* CGC note */}
            <div
              className="rounded-xl p-4 text-sm text-stone-700 leading-relaxed border-l-2"
              style={{ backgroundColor: "#F5EFE6", borderColor: "#CC9818" }}
            >
              <span className="font-semibold text-stone-900">
                For CGC coffees:{" "}
              </span>
              {m.cofermentNote}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-20">
        <h2 className="font-serif text-2xl text-stone-900 mb-6 pb-3 border-b border-stone-100">
          Universal Principles
        </h2>
        <div className="space-y-6">
          {GENERAL_TIPS.map((tip) => (
            <div key={tip.title}>
              <h3 className="font-semibold text-stone-900 mb-1.5">
                {tip.title}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                {tip.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div
        className="mt-16 text-center relative rounded-2xl shadow-sm overflow-hidden p-10"
        style={{ backgroundColor: "#F5EFE6" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url(/images/brewing-cta-bg.png)",
            backgroundPosition: "center 90.5%",
          }}
        />
        <div className="relative">
          <CoffeeBeanIcon size={40} weight="duotone" color="#CC9818" className="mx-auto mb-3 block" />
          <h3 className="font-serif text-xl text-stone-900 mb-2">
            Still figuring it out?
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Every coffee we carry is a little different. If you&apos;re not sure
            which method suits a specific lot, just ask — we know each one well.
          </p>
          <a
            href="mailto:coastalgrannys@gmail.com"
            className="inline-flex items-center gap-2 border border-stone-900/40 text-stone-900 font-medium px-6 py-2.5 rounded-full hover:bg-stone-900/5 transition-colors text-sm"
          >
            Email Us
          </a>
        </div>
      </div>
    </main>
  )
}
