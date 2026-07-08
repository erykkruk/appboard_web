# name: react-patterns

description: Modern React component patterns for building reusable, composable, and maintainable components. Covers composition, compound components, HOCs, render props, and custom hooks.

---

# React Component Patterns Guide

Based on modern React patterns for 2025 and beyond.

## Pattern Categories

| Pattern                 | Use Case                 | Complexity |
| ----------------------- | ------------------------ | ---------- |
| Composition             | Building flexible UIs    | Low        |
| Compound Components     | Related component groups | Medium     |
| Custom Hooks            | Reusable logic           | Medium     |
| Render Props            | Dynamic rendering        | Medium     |
| Higher-Order Components | Cross-cutting concerns   | High       |
| Provider Pattern        | Shared state             | Medium     |

---

## 1. Composition Pattern

The foundation of React - build complex UIs from simple pieces.

### Children as Slot

```typescript
// Flexible layout component
interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ children, header, footer }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// Usage - flexible composition
<Card
  header={<h2>Title</h2>}
  footer={<Button>Save</Button>}
>
  <p>Content goes here</p>
</Card>
```

### Specialization

```typescript
// Base component
function Dialog({ title, children, ...props }: DialogProps) {
  return (
    <Modal {...props}>
      <h2>{title}</h2>
      {children}
    </Modal>
  );
}

// Specialized component
function ConfirmDialog({ onConfirm, onCancel, message }: ConfirmProps) {
  return (
    <Dialog title="Confirm Action">
      <p>{message}</p>
      <div className="flex gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="primary">Confirm</Button>
      </div>
    </Dialog>
  );
}

// Even more specialized
function DeleteConfirmDialog({ itemName, onDelete, onCancel }: DeleteProps) {
  return (
    <ConfirmDialog
      message={`Are you sure you want to delete "${itemName}"?`}
      onConfirm={onDelete}
      onCancel={onCancel}
    />
  );
}
```

---

## 2. Compound Components Pattern

Like LEGO blocks - parent provides context, children are flexible pieces.

### Basic Compound Component

```typescript
// Context for shared state
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Must be used within Tabs');
  return context;
}

// Parent component
function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// Child components
function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ id, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={cn('tab', isActive && 'tab-active')}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabs();
  if (activeTab !== id) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Attach children to parent
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage - flexible composition
<Tabs defaultTab="overview">
  <Tabs.List>
    <Tabs.Tab id="overview">Overview</Tabs.Tab>
    <Tabs.Tab id="details">Details</Tabs.Tab>
    <Tabs.Tab id="settings">Settings</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel id="overview">Overview content</Tabs.Panel>
  <Tabs.Panel id="details">Details content</Tabs.Panel>
  <Tabs.Panel id="settings">Settings content</Tabs.Panel>
</Tabs>
```

### Data Table Compound Component

```typescript
// Flexible data table
const TableContext = createContext<{ data: any[] } | null>(null);

function Table({ data, children }: TableProps) {
  return (
    <TableContext.Provider value={{ data }}>
      <table className="data-table">{children}</table>
    </TableContext.Provider>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

function TableBody({ render }: { render: (item: any) => React.ReactNode }) {
  const { data } = useContext(TableContext)!;
  return <tbody>{data.map(render)}</tbody>;
}

Table.Head = TableHead;
Table.Body = TableBody;

// Usage
<Table data={apps}>
  <Table.Head>
    <tr>
      <th>Name</th>
      <th>Platform</th>
      <th>Actions</th>
    </tr>
  </Table.Head>
  <Table.Body
    render={(app) => (
      <tr key={app.id}>
        <td>{app.name}</td>
        <td>{app.platform}</td>
        <td><Button>Edit</Button></td>
      </tr>
    )}
  />
</Table>
```

---

## 3. Custom Hooks Pattern

Extract and reuse stateful logic.

### Data Fetching Hook

```typescript
function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    setState(prev => ({ ...prev, isLoading: true }));

    asyncFn()
      .then(data => {
        if (!cancelled) setState({ data, error: null, isLoading: false });
      })
      .catch(error => {
        if (!cancelled) setState({ data: null, error, isLoading: false });
      });

    return () => { cancelled = true; };
  }, deps);

  return state;
}

// Usage
function AppList() {
  const { data, error, isLoading } = useAsync(() => fetchApps(), []);

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  return <List items={data} />;
}
```

### Form Hook

```typescript
function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const handleBlur = (name: keyof T) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setErrors,
    reset,
  };
}
```

### Toggle Hook

```typescript
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}

// Usage
function Modal({ children }) {
  const { value: isOpen, toggle, setFalse: close } = useToggle();

  return (
    <>
      <Button onClick={toggle}>Open Modal</Button>
      {isOpen && <Dialog onClose={close}>{children}</Dialog>}
    </>
  );
}
```

### Debounced Value Hook

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage - search with debounce
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

---

## 4. Render Props Pattern

Pass rendering logic as a function.

```typescript
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return <>{render(position)}</>;
}

// Usage
<MouseTracker
  render={({ x, y }) => (
    <div>Mouse position: {x}, {y}</div>
  )}
/>
```

---

## 5. Provider Pattern

Share state across component tree.

```typescript
// Theme provider
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

---

## 6. Controlled vs Uncontrolled Pattern

```typescript
interface InputProps {
  // Controlled
  value?: string;
  onChange?: (value: string) => void;
  // Uncontrolled
  defaultValue?: string;
}

function Input({ value, onChange, defaultValue }: InputProps) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  // Determine if controlled
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
  };

  return <input value={currentValue} onChange={handleChange} />;
}

// Controlled usage
<Input value={name} onChange={setName} />

// Uncontrolled usage
<Input defaultValue="initial" onChange={console.log} />
```

---

## Pattern Selection Guide

| Need                                   | Pattern                   |
| -------------------------------------- | ------------------------- |
| Flexible layout                        | Composition with children |
| Related components (Tabs, Accordion)   | Compound Components       |
| Reusable stateful logic                | Custom Hooks              |
| Cross-cutting concerns (logging, auth) | HOC or Context            |
| Shared state across tree               | Provider Pattern          |
| Dynamic rendering                      | Render Props              |

---

## Anti-Patterns to Avoid

```typescript
// Prop drilling
<A user={user}>
  <B user={user}>
    <C user={user}>
      <D user={user} /> {/* 4 levels deep! */}
    </C>
  </B>
</A>

// Use Context
<UserProvider>
  <A><B><C><D /></C></B></A>
</UserProvider>

// God component
function Dashboard() {
  // 500 lines of mixed concerns
}

// Compose smaller components
function Dashboard() {
  return (
    <Layout>
      <Header />
      <Sidebar />
      <MainContent />
      <Footer />
    </Layout>
  );
}
```
