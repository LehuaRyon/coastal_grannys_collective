'use client';

interface ExportSubscription {
  id: string;
  customerEmail: string;
  productName: string;
  price: number;
  freq: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Same rationale as ExportOrdersButton — pulling subscription/MRR numbers
// into a spreadsheet for accounting shouldn't require the Stripe Dashboard.
export function ExportSubscriptionsButton({ subscriptions }: { subscriptions: ExportSubscription[] }) {
  function exportCsv() {
    const header = ['Subscription ID', 'Customer Email', 'Plan', 'Price', 'Frequency', 'Status', 'Next Billing', 'Since'];
    const rows = subscriptions.map((s) => [
      s.id,
      s.customerEmail,
      s.productName,
      s.price.toFixed(2),
      s.freq,
      s.status,
      // A terminated subscription's currentPeriodEnd is just the last snapshot
      // before it ended, not a real future billing date — blank is more
      // honest than a date that implies billing continues.
      s.currentPeriodEnd && s.status !== 'canceled' && s.status !== 'incomplete_expired'
        ? new Date(s.currentPeriodEnd).toLocaleDateString('en-US')
        : '',
      new Date(s.createdAt).toLocaleDateString('en-US'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={exportCsv}
      className="text-xs font-medium border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
    >
      Export CSV
    </button>
  );
}
