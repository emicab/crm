import { useEffect, RefObject } from 'react';

interface ShortcutHandlers {
  onFocusProductSearch?: () => void;
  onFocusPayment?: () => void;
  onSubmit?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(
  inputRef: RefObject<HTMLInputElement | null>,
  handlers: ShortcutHandlers
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        handlers.onFocusProductSearch?.();
        return;
      }

      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        handlers.onFocusPayment?.();
        return;
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handlers.onSubmit?.();
        return;
      }

      if (e.key === 'F10') {
        e.preventDefault();
        handlers.onSubmit?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
