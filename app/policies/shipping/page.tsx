export const metadata = {
  title: "Shipping Info — Coastal Granny's Collective",
};

export default function ShippingPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-serif text-4xl text-stone-900 mb-2">Shipping Info</h1>
      <p className="text-sm text-stone-400 mb-10">Last updated: June 25, 2026</p>

      <div className="prose prose-stone prose-sm max-w-none space-y-8 text-stone-700 leading-relaxed">

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Processing Time</h2>
          <p>
            All orders are processed within 2–3 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification once your order has shipped.
          </p>
          <p className="mt-3">
            Because every bag is roasted to order, we don&apos;t ship from a warehouse — your coffee is pulled from the drum and packaged fresh before it goes out the door.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Shipping Rates</h2>
          <p>
            Shipping charges are calculated based on your order weight and destination, and will be displayed at checkout before you complete your purchase. We offer free shipping on all orders over $60.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Tracking Your Order</h2>
          <p>
            When your order ships, you&apos;ll receive an email with a tracking number. Please allow up to 48 hours for tracking information to become available after you receive that notification.
          </p>
          <p className="mt-3">
            If you have an account, you can also view your order status anytime from your{' '}
            <a href="/account/dashboard" className="text-amber-700 hover:underline">
              account dashboard
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Questions?</h2>
          <p>
            If you haven&apos;t received tracking information within 72 hours of your shipment confirmation, or if your package seems delayed, reach out to us at{' '}
            <a href="mailto:coastalgrannys@gmail.com" className="text-amber-700 hover:underline">
              coastalgrannys@gmail.com
            </a>{' '}
            and we&apos;ll look into it right away.
          </p>
        </section>

      </div>
    </main>
  );
}
