# name: shadcn-ui

description: shadcn/ui component library guidelines. Use pre-built accessible components instead of creating from scratch. Includes installation commands and usage patterns.

---

# shadcn/ui Component Library

**CRITICAL:** Always use shadcn/ui components instead of building from scratch. They are accessible, customizable, and follow best practices.

## Installation

```bash
# Initialize shadcn/ui (if not done)
bunx shadcn@latest init

# Add components
bunx shadcn@latest add button
bunx shadcn@latest add input
bunx shadcn@latest add card
bunx shadcn@latest add dialog
bunx shadcn@latest add dropdown-menu
bunx shadcn@latest add table
bunx shadcn@latest add form
bunx shadcn@latest add select
bunx shadcn@latest add checkbox
bunx shadcn@latest add toast
bunx shadcn@latest add alert
bunx shadcn@latest add badge
bunx shadcn@latest add skeleton
bunx shadcn@latest add tabs
bunx shadcn@latest add sheet
bunx shadcn@latest add popover
bunx shadcn@latest add command
bunx shadcn@latest add calendar
bunx shadcn@latest add avatar
bunx shadcn@latest add separator
bunx shadcn@latest add switch
bunx shadcn@latest add textarea
bunx shadcn@latest add label
bunx shadcn@latest add scroll-area
bunx shadcn@latest add sonner  # Toast notifications
```

---

## Available Components

### Layout & Structure

| Component    | Usage               | Install                              |
| ------------ | ------------------- | ------------------------------------ |
| `Card`       | Content containers  | `bunx shadcn@latest add card`        |
| `Separator`  | Visual dividers     | `bunx shadcn@latest add separator`   |
| `ScrollArea` | Custom scrollbars   | `bunx shadcn@latest add scroll-area` |
| `Sheet`      | Side panels/drawers | `bunx shadcn@latest add sheet`       |
| `Tabs`       | Tabbed content      | `bunx shadcn@latest add tabs`        |

### Forms

| Component  | Usage                        | Install                           |
| ---------- | ---------------------------- | --------------------------------- |
| `Form`     | Form wrapper with validation | `bunx shadcn@latest add form`     |
| `Input`    | Text inputs                  | `bunx shadcn@latest add input`    |
| `Textarea` | Multi-line text              | `bunx shadcn@latest add textarea` |
| `Select`   | Dropdown selection           | `bunx shadcn@latest add select`   |
| `Checkbox` | Checkboxes                   | `bunx shadcn@latest add checkbox` |
| `Switch`   | Toggle switches              | `bunx shadcn@latest add switch`   |
| `Label`    | Form labels                  | `bunx shadcn@latest add label`    |
| `Calendar` | Date picker                  | `bunx shadcn@latest add calendar` |

### Actions

| Component      | Usage                | Install                                |
| -------------- | -------------------- | -------------------------------------- |
| `Button`       | Buttons              | `bunx shadcn@latest add button`        |
| `DropdownMenu` | Dropdown menus       | `bunx shadcn@latest add dropdown-menu` |
| `Dialog`       | Modals               | `bunx shadcn@latest add dialog`        |
| `AlertDialog`  | Confirmation dialogs | `bunx shadcn@latest add alert-dialog`  |
| `Popover`      | Popovers             | `bunx shadcn@latest add popover`       |
| `Command`      | Command palette      | `bunx shadcn@latest add command`       |

### Data Display

| Component  | Usage                | Install                           |
| ---------- | -------------------- | --------------------------------- |
| `Table`    | Data tables          | `bunx shadcn@latest add table`    |
| `Badge`    | Status badges        | `bunx shadcn@latest add badge`    |
| `Avatar`   | User avatars         | `bunx shadcn@latest add avatar`   |
| `Skeleton` | Loading placeholders | `bunx shadcn@latest add skeleton` |

### Feedback

| Component      | Usage               | Install                           |
| -------------- | ------------------- | --------------------------------- |
| `Toast/Sonner` | Toast notifications | `bunx shadcn@latest add sonner`   |
| `Alert`        | Alert messages      | `bunx shadcn@latest add alert`    |
| `Progress`     | Progress indicators | `bunx shadcn@latest add progress` |

---

## Usage Patterns

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Please wait
</Button>

// With icon
<Button>
  <Mail className="mr-2 h-4 w-4" /> Login with Email
</Button>
```

### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>App Details</CardTitle>
    <CardDescription>View and edit app information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Save changes</Button>
  </CardFooter>
</Card>;
```

### Dialog (Modal)

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Edit App</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit App</DialogTitle>
      <DialogDescription>
        Make changes to the app. Click save when you're done.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">{/* Form fields */}</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

### Form with React Hook Form

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bundleId: z.string().min(1, 'Bundle ID is required'),
});

export function AppForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bundleId: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="App name" {...field} />
              </FormControl>
              <FormDescription>The display name of the app.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bundleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bundle ID</FormLabel>
              <FormControl>
                <Input placeholder="com.example.app" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Table

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableCaption>A list of apps.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">ID</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Platform</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {apps.map((app) => (
      <TableRow key={app.id}>
        <TableCell className="font-medium">{app.id}</TableCell>
        <TableCell>{app.name}</TableCell>
        <TableCell>{app.platform}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select a platform" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="app_store">App Store</SelectItem>
    <SelectItem value="google_play">Google Play</SelectItem>
  </SelectContent>
</Select>;
```

### DropdownMenu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Open menu</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Eye className="mr-2 h-4 w-4" />
      View
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

### Toast (Sonner)

```tsx
// In providers.tsx or layout.tsx
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

// Usage anywhere
import { toast } from 'sonner';

// Success
toast.success('App created successfully');

// Error
toast.error('Failed to create app');

// With description
toast('App Updated', {
  description: 'The app details have been saved.',
});

// With action
toast('App Deleted', {
  description: 'The app has been removed.',
  action: {
    label: 'Undo',
    onClick: () => undoDelete(),
  },
});

// Loading
const promise = createApp(data);
toast.promise(promise, {
  loading: 'Creating app...',
  success: 'App created!',
  error: 'Failed to create app',
});
```

### Skeleton (Loading States)

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-[200px]" />
    <Skeleton className="h-4 w-[150px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full mt-2" />
    <Skeleton className="h-4 w-2/3 mt-2" />
  </CardContent>
</Card>

// Table skeleton
<TableRow>
  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
</TableRow>
```

### Alert

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

// Default
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Note</AlertTitle>
  <AlertDescription>
    This app is currently under review.
  </AlertDescription>
</Alert>

// Destructive
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to save app. Please try again.
  </AlertDescription>
</Alert>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>

// Status badges
<Badge className="bg-green-500">Active</Badge>
<Badge className="bg-yellow-500">Pending</Badge>
<Badge className="bg-red-500">Inactive</Badge>
```

---

## Component Selection Guide

| Need         | Use                          | NOT                  |
| ------------ | ---------------------------- | -------------------- |
| Button       | `<Button>` from shadcn       | Custom `<button>`    |
| Input field  | `<Input>` from shadcn        | Custom `<input>`     |
| Modal/Dialog | `<Dialog>` from shadcn       | Custom modal         |
| Dropdown     | `<DropdownMenu>` from shadcn | Custom dropdown      |
| Table        | `<Table>` from shadcn        | Custom table         |
| Toast        | `toast()` from sonner        | Custom toast         |
| Loading      | `<Skeleton>` from shadcn     | Custom spinner       |
| Form         | `<Form>` from shadcn + RHF   | Manual form handling |
| Select       | `<Select>` from shadcn       | Custom `<select>`    |
| Checkbox     | `<Checkbox>` from shadcn     | Custom checkbox      |

---

## Customization

### Extending Variants

```tsx
// components/ui/button.tsx
const buttonVariants = cva('inline-flex items-center justify-center...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground...',
      destructive: 'bg-destructive...',
      outline: 'border border-input...',
      // Add custom variant
      appStore: 'bg-blue-500 text-white hover:bg-blue-600',
      googlePlay: 'bg-green-600 text-white hover:bg-green-700',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    },
  },
});
```

### Theme Colors

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```

---

## Anti-Patterns

### DO NOT

```tsx
// BAD: Custom button
<button className="bg-blue-500 px-4 py-2 rounded">Click</button>

// BAD: Custom input
<input className="border p-2 rounded" />

// BAD: Custom modal with useState
const [isOpen, setIsOpen] = useState(false);
{isOpen && <div className="fixed inset-0">...</div>}

// BAD: Custom dropdown
<div className="relative">
  <button onClick={() => setOpen(!open)}>Menu</button>
  {open && <div className="absolute">...</div>}
</div>
```

### DO

```tsx
// GOOD: shadcn Button
<Button variant="default">Click</Button>

// GOOD: shadcn Input
<Input placeholder="Enter text" />

// GOOD: shadcn Dialog
<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>

// GOOD: shadcn DropdownMenu
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button>Menu</Button></DropdownMenuTrigger>
  <DropdownMenuContent>...</DropdownMenuContent>
</DropdownMenu>
```

---

## Quick Reference

```bash
# Add all common components at once
bunx shadcn@latest add button input card dialog dropdown-menu table form select checkbox toast alert badge skeleton tabs sheet popover label textarea separator scroll-area avatar sonner
```
