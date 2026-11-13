import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  children,
  className,
  title,
  description,
  side,
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  side?: 'right';
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-forest-950/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <D.Content
        className={cn(
          'fixed z-50 flex flex-col border bg-surface shadow-pop outline-none',
          side === 'right'
            ? 'inset-y-0 right-0 w-full max-w-md data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right'
            : 'left-1/2 top-1/2 max-h-[90vh] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <D.Title className="font-display text-xl font-semibold text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-xs text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</D.Description>
            )}
          </div>
          <D.Close className="rounded-lg p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-auto overflow-y-auto scrollbar-thin">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
