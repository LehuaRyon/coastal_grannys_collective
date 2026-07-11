import Link from 'next/link';
import { prisma } from '@/lib/db';
import { SubmissionRow } from '@/components/admin/SubmissionRow';

const TABS = [
  { type: 'CONTACT', label: 'Contact' },
  { type: 'WHOLESALE', label: 'Wholesale' },
  { type: 'CART', label: 'Coffee Cart' },
];

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const activeType = TABS.some((t) => t.type === typeParam) ? typeParam! : 'CONTACT';

  const [submissions, counts] = await Promise.all([
    prisma.submission.findMany({
      where: { type: activeType },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.submission.groupBy({ by: ['type'], where: { read: false }, _count: { _all: true } }),
  ]);

  const unreadByType = Object.fromEntries(counts.map((c) => [c.type, c._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Submissions</h1>
        <p className="text-sm text-stone-500 mt-1">Contact, wholesale, and coffee cart inquiries</p>
      </div>

      <div className="flex items-center gap-1 border-b border-stone-200">
        {TABS.map((tab) => {
          const unread = unreadByType[tab.type] ?? 0;
          const active = tab.type === activeType;
          return (
            <Link
              key={tab.type}
              href={`/admin/submissions?type=${tab.type}`}
              className={`relative px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-amber-500 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {unread > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">No submissions yet.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {submissions.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={{
                  id: s.id,
                  data: s.data as Record<string, string>,
                  senderName: s.senderName,
                  senderEmail: s.senderEmail,
                  read: s.read,
                  messages: s.messages.map((m) => ({
                    id: m.id,
                    direction: m.direction,
                    body: m.body,
                    createdAt: m.createdAt.toISOString(),
                  })),
                  createdAt: s.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
