# name: nextjs-form

description: Create a form component using shadcn/ui Form, React Hook Form, and Zod validation. Generates complete form with proper error handling and accessibility.

arguments:

- name: formName
  description: Name of the form (e.g., "CreateApp", "EditListing", "Login")
  required: true
- name: fields
  description: Comma-separated list of fields (e.g., "name,email,description")
  required: true

---

# Next.js Form Generator (shadcn/ui)

**Uses shadcn/ui Form components with React Hook Form and Zod.**

## Required shadcn/ui Components

```bash
bunx shadcn@latest add form input textarea select checkbox button label
```

## Generated Files

```
src/lib/validations/{form-name}.ts         # Zod schema
src/components/forms/{form-name}-form.tsx  # Form component
```

---

## Template: Validation Schema

```typescript
// src/lib/validations/{kebab-name}.ts
import { z } from 'zod';

export const {{camelName}}Schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  description: z.string().max(1000, 'Description is too long').optional(),
  // Add more fields as needed
});

export type {{PascalName}}FormData = z.infer<typeof {{camelName}}Schema>;
```

---

## Template: Form Component (shadcn/ui)

```tsx
// src/components/forms/{kebab-name}-form.tsx
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { {{camelName}}Schema, type {{PascalName}}FormData } from "@/lib/validations/{{kebabName}}";

interface {{PascalName}}FormProps {
  defaultValues?: Partial<{{PascalName}}FormData>;
  onSubmit: (data: {{PascalName}}FormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function {{PascalName}}Form({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: {{PascalName}}FormProps) {
  const form = useForm<{{PascalName}}FormData>({
    resolver: zodResolver({{camelName}}Schema),
    defaultValues: {
      name: "",
      email: "",
      description: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field (Optional) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter description..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional description (max 1000 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## Template: Form with Select (shadcn/ui)

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum(['app_store', 'google_play'], {
    required_error: 'Please select a platform',
  }),
  bundleId: z.string().min(1, 'Bundle ID is required'),
});

type FormData = z.infer<typeof formSchema>;

interface FormProps {
  onSubmit: (data: FormData) => void;
  isSubmitting?: boolean;
}

export function PlatformForm({ onSubmit, isSubmitting }: FormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      platform: undefined,
      bundleId: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="app_store">App Store</SelectItem>
                  <SelectItem value="google_play">Google Play</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Template: Form with Checkbox (shadcn/ui)

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';

// Inside your form
<FormField
  control={form.control}
  name="terms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Accept terms and conditions</FormLabel>
        <FormDescription>You agree to our Terms of Service and Privacy Policy.</FormDescription>
      </div>
    </FormItem>
  )}
/>;
```

---

## Template: Form in Dialog (shadcn/ui)

```tsx
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { {{PascalName}}Form } from "./{{kebab-name}}-form";
import { useCreate{{PascalName}} } from "@/hooks/use-{{kebab-name}}";
import { toast } from "sonner";

export function Create{{PascalName}}Dialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreate{{PascalName}}();

  const handleSubmit = async (data: {{PascalName}}FormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Created successfully');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to create');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create {{PascalName}}</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new item.
          </DialogDescription>
        </DialogHeader>
        <{{PascalName}}Form
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## Usage Example

```tsx
// In a page
import { AppForm } from '@/components/forms/app-form';
import { useCreateApp } from '@/hooks/use-apps';
import { toast } from 'sonner';

function CreateAppPage() {
  const createMutation = useCreateApp();

  const handleSubmit = async (data: AppFormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('App created');
    } catch (error) {
      toast.error('Failed to create app');
    }
  };

  return <AppForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />;
}
```

---

## Instructions

1. Replace placeholders:
   - `{{PascalName}}` -> PascalCase (e.g., "CreateApp")
   - `{{camelName}}` -> camelCase (e.g., "createApp")
   - `{{kebabName}}` -> kebab-case (e.g., "create-app")

2. Install required shadcn components:

   ```bash
   bunx shadcn@latest add form input textarea select checkbox button
   ```

3. Customize fields based on requirements

4. Use `toast()` from sonner for feedback

## DO NOT

- Build custom input/textarea components
- Use `alert()` for feedback
- Skip FormMessage for error display
- Use inline validation display
