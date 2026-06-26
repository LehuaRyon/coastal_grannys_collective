export const metadata = {
  title: "Returns & Refunds — Coastal Granny's Collective",
};

export default function ReturnsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-serif text-4xl text-stone-900 mb-2">Returns & Refunds</h1>
      <p className="text-sm text-stone-400 mb-10">Last updated: June 25, 2026</p>

      <div className="prose prose-stone prose-sm max-w-none space-y-8 text-stone-700 leading-relaxed">

        <p>
          Because coffee is a perishable good, we&apos;re unable to accept returns — but we never want you to be left holding a bad experience. If something goes wrong, we&apos;ll make it right.
        </p>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Damaged on Arrival</h2>
          <p>
            We take great care at every step of the process — from fermentation to roasting to the moment your order leaves our hands. But occasionally, a package takes a rough journey. If yours arrives damaged, please reach out to us at{' '}
            <a href="mailto:coastalgrannys@gmail.com" className="text-amber-700 hover:underline">
              coastalgrannys@gmail.com
            </a>{' '}
            with your order details and a photo of the affected item(s). We&apos;ll take care of you with a replacement or store credit.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Lost in Transit</h2>
          <p>
            If you haven&apos;t received tracking information within 72 hours of your shipment confirmation, don&apos;t hesitate to get in touch — we&apos;ll look into it right away. In the rare event that your package doesn&apos;t arrive within 10 days of the expected delivery date, it may be lost. Let us know and we&apos;ll file a missing package report and work towards sending a replacement. We appreciate your patience as we resolve any shipping issues.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Refunds</h2>
          <p>
            If your order qualifies for a refund under the situations above, we&apos;ll process it to your original payment method. Please allow a few business days for the credit to appear — your bank may have its own processing time after we initiate the refund. If you&apos;ve waited and still haven&apos;t seen it, check with your bank before reaching out and we&apos;ll help from there.
          </p>
          <p className="mt-3">
            Only regular-priced items are eligible for refunds. Sale items are final sale.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Subscriptions</h2>
          <p>
            We cannot accept returns on subscription orders, except under the damaged or lost situations described above. You can pause or cancel your subscription anytime through your account portal. If you need help, email us at{' '}
            <a href="mailto:coastalgrannys@gmail.com" className="text-amber-700 hover:underline">
              coastalgrannys@gmail.com
            </a>{' '}
            and we&apos;ll be happy to assist.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Merch & Non-Perishable Items</h2>
          <p>
            For non-coffee items (mugs, totes, apparel, etc.), we accept exchanges within 30 days of delivery if the item is unused and in its original condition. If you received a defective or damaged item, email us with a photo and your order number and we&apos;ll sort it out.
          </p>
          <p className="mt-3">
            Return shipping for eligible non-perishable items is the responsibility of the customer. We recommend using a trackable shipping method for any items valued over $75.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Contact Us</h2>
          <p>
            Have a question about your order? We&apos;re a small team and we genuinely care — reach out anytime at{' '}
            <a href="mailto:coastalgrannys@gmail.com" className="text-amber-700 hover:underline">
              coastalgrannys@gmail.com
            </a>{' '}
            and we&apos;ll get back to you as soon as we can.
          </p>
        </section>

      </div>
    </main>
  );
}
