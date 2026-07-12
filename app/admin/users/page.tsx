'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/ui/Toast';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function toggleRole(user: User) {
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    setUpdating(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      showToast(`${user.email} is now ${newRole}`);
    } catch {
      showToast('Failed to update role');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900">Users</h1>
        <p className="text-sm text-stone-500 mt-1">{users.length} registered accounts</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center text-stone-400 text-sm">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Name', 'Email', 'Role', 'Joined', 'Action', ''].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-900">
                      {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
                    </td>
                    <td className="px-6 py-4 text-stone-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-500">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={updating === user.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        {updating === user.id ? '…' : user.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/users/${user.id}`} className="text-xs text-amber-700 hover:underline whitespace-nowrap">
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
