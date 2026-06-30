# New Lion Table

A reusable, data-agnostic data-table shell for React, built on
[TanStack Table](https://tanstack.com/table) and [shadcn/ui](https://ui.shadcn.com).

Drop it into any shadcn/ui project and get a polished, interactive table —
sortable column headers, column visibility, faceted filters, search, and
persisted view state. You supply the data and column definitions; the package
owns the mechanics and styling.

## Features

- shadcn-style sortable column headers with an `Asc` / `Desc` / `Hide` menu
- `View` column-visibility menu
- Faceted multi-select filters with active-filter badges and a reset action
- Clearable search input
- Sorting, visibility, and filter state persisted to `localStorage` (Zustand)
- Automatic per-instance state keys, with an optional explicit `tableId`
- Dynamic content-width shell with a toolbar that aligns to the table
- Empty and loading states
- Fully typed — bring your own row type

## Requirements

The table renders with **your project's own shadcn/ui components**. It imports
them from the standard shadcn aliases (`@/components/ui/*` and `@/lib/utils`), so
you need a shadcn/ui project with these components installed:

```bash
npx shadcn@latest add badge button command dropdown-menu input popover table
```

Peer dependencies: `react`, `react-dom`, `@tanstack/react-table`,
`lucide-react`, and `zustand`.

## Installation

```bash
npm install @newlion/table
# pnpm add @newlion/table
# bun add @newlion/table
```

The package is distributed as TypeScript source and resolves your project's `@/`
alias, so make sure your `tsconfig.json` maps `@/*` to your source directory
(the shadcn/ui default).

## Usage

```tsx
import { DataTable, DataTableColumnHeader } from '@newlion/table';
import type { ColumnDef } from '@tanstack/react-table';

type Person = { id: string; name: string; role: string };

const columns: ColumnDef<Person, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    meta: { label: 'Name' },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    meta: { label: 'Role' },
  },
];

export function PeopleTable({ data }: { data: Person[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No people found."
    />
  );
}
```

### Search and faceted filters

```tsx
import { DataTable, arrayIncludesSomeFilter } from '@newlion/table';

// Add `filterFn: arrayIncludesSomeFilter` to any column you expose as a facet.

<DataTable
  data={data}
  columns={columns}
  facetedFilters={[
    {
      columnId: 'role',
      title: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
    },
  ]}
  search={{
    value: query,
    onValueChange: setQuery,
    placeholder: 'Search people…',
    ariaLabel: 'Search people',
    clearLabel: 'Clear search',
  }}
  toolbarSummary={(table) => `${table.getFilteredRowModel().rows.length} people`}
/>;
```

## Persisted view state and `tableId`

Sorting, column visibility, and filters are saved to `localStorage` so each table
keeps its view across reloads. When you don't pass `tableId`, the package derives
a stable key from the route path, table instance, and column signature, so
separate tables stay independent automatically. Pass an explicit `tableId` when
you want a deliberate, stable key (for example, a table that should keep its view
as it moves between routes).

## API

| Export | Description |
| --- | --- |
| `DataTable` | The table component. |
| `DataTableColumnHeader` | Sortable/hideable column header for use in `header`. |
| `ClearableSearchInput` | The standalone search input with a clear button. |
| `arrayIncludesSomeFilter` | A `filterFn` for faceted multi-select columns. |
| `useTablePreferencesStore` | The Zustand store backing persisted view state. |
| `normalizeTablePreferenceState`, `TABLE_PREFERENCE_VERSION` | Helpers for reading/migrating stored state. |

Types: `DataTableProps`, `DataTableFacetedFilter`,
`DataTableFacetedFilterOption`, `TablePreferenceState`.

Column `meta` supports `label` (used by the `View` menu and as a fallback header)
plus `cellClassName`, `colClassName`, and `headerClassName` for styling.

## License

[MIT](./LICENSE)
