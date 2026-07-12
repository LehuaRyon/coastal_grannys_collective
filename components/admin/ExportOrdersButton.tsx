'use client';

interface ExportOrder {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  status: string;
  createdAt: string;
  items: { name: string; qty: number }[];
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Client-side export (no extra API round-trip) — this is Stripe Dashboard's
// "Export payments" replicated in-app, so pulling numbers into a
// spreadsheet for accounting/reporting never requires leaving the site.
export function ExportOrdersButton({ orders }: { orders: ExportOrder[] }) {
  function exportCsv() {
    const header = ['Order ID', 'Customer Name', 'Email', 'Items', 'Amount', 'Status', 'Date'];
    const rows = orders.map((o) => [
      o.id,
      o.customerName ?? '',
      o.customerEmail ?? '',
      o.items.map((i) => `${i.qty}x ${i.name}`).join('; '),
      o.amount.toFixed(2),
      o.status,
      new Date(o.createdAt).toLocaleDateString('en-US'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
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
