import type { ReactElement, ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type OnChangeFn,
  type Row,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  EyeOff,
  PlusCircle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SORTING,
  normalizeTablePreferenceState,
  sortingStatesEqual,
  useTablePreferencesStore,
} from './table-preferences';
import { ClearableSearchInput } from './clearable-search-input';

declare module '@tanstack/react-table' {
  interface ColumnMeta<_TData, _TValue> {
    cellClassName?: string;
    colClassName?: string;
    headerClassName?: string;
    label?: string;
  }
}

export type DataTableFacetedFilterOption = {
  count?: number;
  icon?: LucideIcon;
  label: string;
  value: string;
};

export type DataTableFacetedFilter = {
  columnId: string;
  options: DataTableFacetedFilterOption[];
  title: string;
};

type DataTableSearchConfig = {
  ariaLabel: string;
  clearLabel: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  useTableGlobalFilter?: boolean;
  value: string;
};

export type DataTableProps<TData> = {
  className?: string;
  columns: Array<ColumnDef<TData, unknown>>;
  data: TData[];
  emptyMessage: ReactNode;
  facetedFilters?: DataTableFacetedFilter[];
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getRowId?: (originalRow: TData, index: number) => string;
  initialSorting?: SortingState;
  loading?: boolean;
  loadingMessage?: ReactNode;
  onRowClick?: (row: TData) => void;
  search?: DataTableSearchConfig;
  tableClassName?: string;
  tableContainerClassName?: string;
  tableId?: string;
  toolbarClassName?: string;
  toolbarSummary?: (table: TanStackTable<TData>) => ReactNode;
};

export const arrayIncludesSomeFilter: FilterFn<unknown> = (
  row,
  columnId,
  filterValue,
) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;

  const rowValue = row.getValue(columnId);
  return filterValue.includes(String(rowValue));
};

const EMPTY_FACETED_FILTERS: DataTableFacetedFilter[] = [];

export function DataTable<TData>({
  className,
  columns,
  data,
  emptyMessage,
  facetedFilters = EMPTY_FACETED_FILTERS,
  getRowClassName,
  getRowId,
  initialSorting = DEFAULT_SORTING,
  loading = false,
  loadingMessage = 'Loading...',
  onRowClick,
  search,
  tableClassName,
  tableContainerClassName,
  tableId,
  toolbarClassName,
  toolbarSummary,
}: DataTableProps<TData>): ReactElement {
  'use no memo';

  const reactTableInstanceId = useId();
  const resolvedTableId = tableId
    ?? createAutomaticTableId(columns, reactTableInstanceId);
  const storedTableState = useTablePreferencesStore((state) => state.tables[resolvedTableId]);
  const setTablePreferenceState = useTablePreferencesStore((state) => state.setTableState);
  const stableInitialSorting = useStableSortingState(initialSorting);
  const tablePreferenceState = useMemo(
    () => normalizeTablePreferenceState(storedTableState, stableInitialSorting),
    [stableInitialSorting, storedTableState],
  );
  const { columnFilters, columnVisibility, sorting } = tablePreferenceState;
  const [globalFilter, setGlobalFilter] = useState(search?.value ?? '');

  useEffect(() => {
    setGlobalFilter(search?.value ?? '');
  }, [search?.value]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setTablePreferenceState(resolvedTableId, {
      ...tablePreferenceState,
      sorting: resolveUpdater(updater, sorting),
    });
  };
  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setTablePreferenceState(resolvedTableId, {
      ...tablePreferenceState,
      columnVisibility: resolveUpdater(updater, columnVisibility),
    });
  };
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    setTablePreferenceState(resolvedTableId, {
      ...tablePreferenceState,
      columnFilters: resolveUpdater(updater, columnFilters),
    });
  };
  const handleGlobalFilterChange: OnChangeFn<string> = (updater) => {
    const nextValue = resolveUpdater(updater, globalFilter);
    setGlobalFilter(nextValue);
    search?.onValueChange(nextValue);
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns non-memoizable instance functions; the table instance stays local to this component.
  const table = useReactTable({
    autoResetExpanded: false,
    autoResetPageIndex: false,
    columns,
    data,
    enableGlobalFilter: search?.useTableGlobalFilter ?? false,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onSortingChange: handleSortingChange,
    state: {
      columnFilters,
      columnVisibility,
      globalFilter,
      sorting,
    },
  });
  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1);
  const hasActiveColumnFilters = table.getState().columnFilters.length > 0;

  return (
    <div
      data-slot="data-table-shell"
      className={cn('inline-grid w-fit max-w-full gap-3 self-start', className)}
    >
      <div
        data-slot="data-table-toolbar"
        className={cn('flex w-full min-w-0 flex-col gap-2', toolbarClassName)}
      >
        <div
          data-slot="data-table-toolbar-controls"
          className="flex w-full flex-wrap items-center justify-between gap-2"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {search ? (
              <ClearableSearchInput
                value={search.value}
                onValueChange={search.onValueChange}
                placeholder={search.placeholder}
                aria-label={search.ariaLabel}
                clearLabel={search.clearLabel}
                className="w-64 max-w-full shrink-0"
              />
            ) : null}
            {facetedFilters.map((filter) => (
              <DataTableFacetedFilterControl
                key={filter.columnId}
                column={table.getColumn(filter.columnId)}
                options={filter.options}
                title={filter.title}
              />
            ))}
            {hasActiveColumnFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => table.resetColumnFilters()}
              >
                Reset
                <X aria-hidden="true" data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
          <DataTableViewOptions table={table} />
        </div>
        {toolbarSummary ? (
          <div
            data-slot="data-table-toolbar-summary"
            className="min-w-0 text-sm text-muted-foreground"
          >
            {toolbarSummary(table)}
          </div>
        ) : null}
      </div>

      <div
        data-slot="data-table-container"
        className={cn('w-fit max-w-full self-start overflow-x-auto rounded-lg border bg-card', tableContainerClassName)}
      >
        <Table className={cn('w-max table-auto', tableClassName)}>
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col key={column.id} className={column.columnDef.meta?.colClassName} />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={cn('px-4', header.column.columnDef.meta?.headerClassName)}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    onRowClick
                      ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                      : undefined,
                    getRowClassName?.(row),
                  )}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={(event) => {
                    if (!onRowClick || event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('px-4', cell.column.columnDef.meta?.cellClassName)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-24 text-center text-muted-foreground">
                  {loading ? loadingMessage : emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function createAutomaticTableId<TData>(
  columns: Array<ColumnDef<TData, unknown>>,
  reactTableInstanceId: string,
): string {
  const routePath = typeof window === 'undefined'
    ? 'server'
    : window.location.pathname || 'root';
  const columnSignature = columns
    .map((column, index) => getColumnDefinitionKey(column, index))
    .join('|');

  return [
    'data-table',
    'auto',
    sanitizeTableStateKey(routePath),
    sanitizeTableStateKey(reactTableInstanceId),
    hashTableStateKey(columnSignature),
  ].join(':');
}

function getColumnDefinitionKey<TData>(
  column: ColumnDef<TData, unknown>,
  index: number,
): string {
  const explicitId = (column as { id?: unknown }).id;
  if (typeof explicitId === 'string' && explicitId.length > 0) return explicitId;

  const accessorKey = (column as { accessorKey?: unknown }).accessorKey;
  if (typeof accessorKey === 'string' || typeof accessorKey === 'number') {
    return String(accessorKey);
  }

  if (typeof column.header === 'string' && column.header.length > 0) {
    return column.header;
  }

  return `column-${index}`;
}

function sanitizeTableStateKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'unknown';
}

function hashTableStateKey(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function DataTableColumnHeader<TData, TValue>({
  className,
  column,
  title,
}: {
  className?: string;
  column: Column<TData, TValue>;
  title: string;
}): ReactElement {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {sorted === 'desc' ? (
              <ArrowDown aria-hidden="true" data-icon="inline-end" />
            ) : sorted === 'asc' ? (
              <ArrowUp aria-hidden="true" data-icon="inline-end" />
            ) : (
              <ChevronsUpDown aria-hidden="true" data-icon="inline-end" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() ? (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUp aria-hidden="true" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDown aria-hidden="true" />
                Desc
              </DropdownMenuItem>
            </>
          ) : null}
          {column.getCanSort() && column.getCanHide() ? <DropdownMenuSeparator /> : null}
          {column.getCanHide() ? (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff aria-hidden="true" />
              Hide
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DataTableViewOptions<TData>({
  table,
}: {
  table: TanStackTable<TData>;
}): ReactElement {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

  if (hideableColumns.length === 0) {
    return <></>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="ml-auto h-8">
          <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
          >
            {getColumnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTableFacetedFilterControl<TData>({
  column,
  options,
  title,
}: {
  column: Column<TData, unknown> | undefined;
  options: DataTableFacetedFilterOption[];
  title: string;
}): ReactElement | null {
  if (!column || options.length === 0) return null;

  const selectedValues = new Set((column.getFilterValue() as string[] | undefined) ?? []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle aria-hidden="true" data-icon="inline-start" />
          {title}
          {selectedValues.size > 0 ? (
            <>
              <span aria-hidden="true" className="h-4 w-px bg-border" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge key={option.value} variant="secondary" className="rounded-sm px-1 font-normal">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                const Icon = option.icon;

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }

                      const nextFilterValue = Array.from(selectedValues);
                      column.setFilterValue(nextFilterValue.length > 0 ? nextFilterValue : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check aria-hidden="true" className="size-3" />
                    </div>
                    {Icon ? <Icon aria-hidden="true" className="text-muted-foreground" /> : null}
                    <span>{option.label}</span>
                    {typeof option.count === 'number' ? (
                      <span className="ml-auto flex size-4 items-center justify-center font-mono text-xs">
                        {option.count}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function resolveUpdater<TValue>(
  updater: TValue | ((current: TValue) => TValue),
  current: TValue,
): TValue {
  return typeof updater === 'function'
    ? (updater as (current: TValue) => TValue)(current)
    : updater;
}

function useStableSortingState(value: SortingState): SortingState {
  const valueRef = useRef<SortingState>(value);
  if (!sortingStatesEqual(valueRef.current, value)) {
    valueRef.current = value;
  }
  return valueRef.current;
}

function getColumnLabel<TData>(column: Column<TData, unknown>): string {
  const label = column.columnDef.meta?.label;
  if (label) return label;

  return column.id
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
