# name: nextjs-modal

description: Create a modal component with proper accessibility, focus management, and animations. Generates reusable modal component.

arguments:

- name: modalName
  description: Name of the modal (e.g., "Confirm", "CreateApp", "Delete")
  required: true
- name: type
  description: Type of modal (dialog, confirm, form)
  required: false
  default: "dialog"

---

# Next.js Modal Generator

This skill creates accessible modal components with proper focus management.

## Modal Types

| Type      | Purpose                 | Features                  |
| --------- | ----------------------- | ------------------------- |
| `dialog`  | General content display | Close button, backdrop    |
| `confirm` | Confirmation actions    | Confirm/Cancel buttons    |
| `form`    | Form submission         | Form handling, validation |

## Template: Base Modal Component

```typescript
// src/components/modals/modal.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative bg-background rounded-lg shadow-2xl z-10',
          'animate-in zoom-in-95 fade-in duration-200',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-md': size === 'md',
            'w-full max-w-lg': size === 'lg',
            'w-full max-w-2xl': size === 'xl',
          }
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1 hover:bg-muted rounded-md transition-colors -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
```

## Template: Confirm Modal

```typescript
// src/components/modals/confirm-modal.tsx
'use client';

import { Modal } from './modal';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={cn(
            'px-4 py-2 rounded-md font-medium transition-colors',
            {
              'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'danger',
              'bg-yellow-500 text-white hover:bg-yellow-600': variant === 'warning',
              'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            }
          )}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
```

## Template: Form Modal

```typescript
// src/components/modals/form-modal.tsx
'use client';

import { Modal } from './modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: FormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      {children}
    </Modal>
  );
}

// Usage example:
// <FormModal isOpen={isOpen} onClose={onClose} title="Create App">
//   <AppForm onSubmit={handleSubmit} onCancel={onClose} />
// </FormModal>
```

## Template: Delete Confirmation Modal

```typescript
// src/components/modals/delete-modal.tsx
'use client';

import { ConfirmModal } from './confirm-modal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  isLoading?: boolean;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  isLoading = false,
}: DeleteModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemType}?`}
      message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
    />
  );
}
```

## Usage Examples

```typescript
// Using ConfirmModal
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const deleteMutation = useDeleteApp();

<DeleteModal
  isOpen={isDeleteOpen}
  onClose={() => setIsDeleteOpen(false)}
  onConfirm={() => deleteMutation.mutate(appId)}
  itemName={app.name}
  itemType="app"
  isLoading={deleteMutation.isPending}
/>

// Using FormModal
const [isCreateOpen, setIsCreateOpen] = useState(false);

<FormModal
  isOpen={isCreateOpen}
  onClose={() => setIsCreateOpen(false)}
  title="Create New App"
  description="Fill in the details to add a new app."
>
  <AppForm
    onSubmit={async (data) => {
      await createMutation.mutateAsync(data);
      setIsCreateOpen(false);
    }}
    isSubmitting={createMutation.isPending}
  />
</FormModal>
```

## Instructions

1. Create the base modal component first

2. Choose appropriate modal type for your use case

3. Ensure accessibility:
   - Proper ARIA attributes
   - Focus management
   - Escape key handling
   - Focus trap

4. Add animations for better UX
