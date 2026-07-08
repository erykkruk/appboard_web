# name: nextjs-component

description: Create a reusable component using shadcn/ui and Tailwind CSS. Prioritizes using existing shadcn/ui components over building from scratch.

arguments:

- name: componentName
  description: Name of the component (e.g., "AppCard", "StoreAvatar", "StatusBadge")
  required: true
- name: location
  description: Location to create component (ui, forms, tables, modals, layout, or feature path)
  required: false
  default: "ui"

---

# Next.js Component Generator (shadcn/ui Based)

**CRITICAL:** Always check if shadcn/ui has a component before building custom.

## Before Creating: Check shadcn/ui

```bash
# Check available components
bunx shadcn@latest add --help

# Common components to use instead of building:
# Button, Input, Card, Dialog, DropdownMenu, Table, Form, Select,
# Checkbox, Toast, Alert, Badge, Skeleton, Tabs, Sheet, Popover
```

## Component Categories

| Location | Description                              | Example                               |
| -------- | ---------------------------------------- | ------------------------------------- |
| `ui`     | Extended UI components (built on shadcn) | StatusBadge, LoadingButton            |
| `forms`  | Form-specific components                 | AppForm, SearchForm                   |
| `tables` | Table components                         | AppTable, DataTablePagination         |
| `modals` | Modal/Dialog components                  | ConfirmDeleteDialog, EditAppDialog    |
| `layout` | Layout components                        | DashboardHeader, Sidebar              |

---

## Template: Composed Component (Using shadcn/ui)

Most components should compose shadcn/ui components:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface {{PascalName}}Props {
  title: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  onEdit?: () => void;
  onDelete?: () => void;
}

export function {{PascalName}}({
  title,
  description,
  status,
  onEdit,
  onDelete,
}: {{PascalName}}Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Additional content */}
      </CardContent>
    </Card>
  );
}
```

---

## Template: Loading Button (Extended shadcn)

```tsx
import { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, isLoading, loadingText, disabled, className, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={disabled || isLoading} className={cn(className)} {...props}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
```

---

## Template: Status Badge (Extended shadcn)

```tsx
import { Badge, BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'pending' | 'error';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500 hover:bg-green-600' },
  inactive: { label: 'Inactive', className: 'bg-gray-500 hover:bg-gray-600' },
  pending: { label: 'Pending', className: 'bg-yellow-500 hover:bg-yellow-600' },
  error: { label: 'Error', className: 'bg-red-500 hover:bg-red-600' },
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, className)} {...props}>
      {config.label}
    </Badge>
  );
}
```

---

## Template: Dialog Component (Using shadcn Dialog)

```tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface {{PascalName}}DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  isLoading?: boolean;
}

export function {{PascalName}}Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  confirmText = "Confirm",
  isLoading,
}: {{PascalName}}DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {onConfirm && (
            <Button onClick={onConfirm} disabled={isLoading}>
              {isLoading ? "Loading..." : confirmText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Template: Confirm Delete Dialog

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  isLoading,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Template: Empty State

```tsx
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## Template: Loading Skeleton Card

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function {{PascalName}}Skeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-2" />
      </CardContent>
    </Card>
  );
}
```

---

## Instructions

1. **Check shadcn/ui first** - see if component exists
2. **Compose from shadcn** - build on existing components
3. **Use Tailwind utilities** - for custom styling
4. **Use `cn()` helper** - for conditional classes
5. **Place in correct location**: `src/components/{location}/{component-name}.tsx`
6. **Add loading skeleton** - for async content
7. **Export from index** - if exists

## DO NOT

- Build custom Button, Input, Dialog, etc. from scratch
- Use inline styles
- Create custom CSS files
- Build custom dropdown/menu without shadcn
- Use `alert()` for confirmations
