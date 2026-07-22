'use client';

import { useEffect, useRef } from 'react';
import { XIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  // Optional prev/next navigation — pass all four to show arrow buttons for
  // shuffling between items (e.g. products) without closing the modal.
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Set false for modals with a lot of typed state (e.g. multi-step checkout)
  // where an accidental backdrop click shouldn't wipe out what the user entered.
  closeOnBackdropClick?: boolean;
  // On mobile (< md), render as a full-bleed sheet that fills the phone's dynamic
  // viewport height (100dvh) instead of a centered, max-h-[90vh] floating card. The
  // modal's own content is then responsible for scrolling internally. Desktop (md+)
  // is unaffected. Opt in for modals whose content should own the whole screen.
  mobileFullHeight?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  closeOnBackdropClick = true,
  mobileFullHeight = false,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-sm ${
        mobileFullHeight ? 'items-stretch p-0 md:items-center md:p-4' : 'items-center p-4'
      }`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === backdropRef.current) onClose();
      }}
    >
      {/* Sizing wrapper — carries the same max-width as the card so the arrow
          buttons below can be anchored to the card's actual edges instead of
          the viewport's, regardless of how narrow the card ends up being. */}
      <div className={`relative w-full ${className}`}>
        {onPrev && (
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-white/90 hover:bg-white text-stone-700 shadow-lg transition-all disabled:opacity-0 disabled:pointer-events-none"
            style={{ left: '-56px' }}
            aria-label="Previous product"
          >
            <CaretLeftIcon size={20} weight="bold" />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-white/90 hover:bg-white text-stone-700 shadow-lg transition-all disabled:opacity-0 disabled:pointer-events-none"
            style={{ right: '-56px' }}
            aria-label="Next product"
          >
            <CaretRightIcon size={20} weight="bold" />
          </button>
        )}
        <div
          className={`relative bg-white shadow-2xl w-full ${
            mobileFullHeight
              ? 'h-[100dvh] overflow-hidden rounded-none md:h-auto md:max-h-[90vh] md:overflow-y-auto md:rounded-2xl'
              : 'max-h-[90vh] overflow-y-auto rounded-2xl'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors text-sm"
            aria-label="Close"
          >
            <XIcon size={16} weight="bold" />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
