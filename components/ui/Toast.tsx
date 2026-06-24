'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
}

let listeners: ((msg: string) => void)[] = [];

export function showToast(msg: string) {
  listeners.forEach((fn) => fn(msg));
}

export function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (text: string) => {
      const id = Date.now();
      setMessages((prev) => [...prev, { id, text }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 2800);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {messages.map((m) => (
        <div
          key={m.id}
          className="bg-stone-900 text-white text-sm px-5 py-3 rounded-full shadow-lg animate-toast"
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}
