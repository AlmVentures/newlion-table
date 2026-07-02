import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

export const TABLE_PREFERENCE_VERSION = 1;
export const DEFAULT_SORTING: SortingState = [];

export type TablePreferenceState = {
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  sorting: SortingState;
  version: number;
};

type TablePreferencesStore = {
  setTableState: (tableId: string, tableState: TablePreferenceState) => void;
  tables: Record<string, TablePreferenceState>;
};

const memoryTablePreferenceStorage = createMemoryTablePreferenceStorage();

function getTablePreferenceStorage(): StateStorage {
  if (typeof window === 'undefined') return memoryTablePreferenceStorage;

  try {
    const storage = window.localStorage;
    return isStateStorage(storage) ? storage : memoryTablePreferenceStorage;
  } catch {
    return memoryTablePreferenceStorage;
  }
}

function isStateStorage(value: unknown): value is StateStorage {
  return Boolean(value)
    && typeof value === 'object'
    && typeof (value as StateStorage).getItem === 'function'
    && typeof (value as StateStorage).setItem === 'function'
    && typeof (value as StateStorage).removeItem === 'function';
}

function createMemoryTablePreferenceStorage(): StateStorage {
  const values = new Map<string, string>();

  return {
    getItem: (name) => values.get(name) ?? null,
    removeItem: (name) => {
      values.delete(name);
    },
    setItem: (name, value) => {
      values.set(name, value);
    },
  };
}

export const useTablePreferencesStore = create<TablePreferencesStore>()(
  persist(
    (set) => ({
      tables: {},
      setTableState: (tableId, tableState) => {
        set((state) => {
          const nextTableState = normalizeTablePreferenceState(tableState, DEFAULT_SORTING);
          const currentTableState = state.tables[tableId];
          if (currentTableState && tablePreferenceStatesEqual(currentTableState, nextTableState)) {
            return state;
          }

          return {
            tables: {
              ...state.tables,
              [tableId]: nextTableState,
            },
          };
        });
      },
    }),
    {
      name: 'table-preferences',
      partialize: (state) => ({ tables: state.tables }),
      storage: createJSONStorage(getTablePreferenceStorage),
      version: TABLE_PREFERENCE_VERSION,
    },
  ),
);

export function normalizeTablePreferenceState(
  value: unknown,
  initialSorting: SortingState,
): TablePreferenceState {
  const fallback: TablePreferenceState = {
    columnFilters: [],
    columnVisibility: {},
    sorting: initialSorting,
    version: TABLE_PREFERENCE_VERSION,
  };

  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<TablePreferenceState>;
  if (candidate.version !== TABLE_PREFERENCE_VERSION) return fallback;

  return {
    columnFilters: normalizeColumnFilters(candidate.columnFilters),
    columnVisibility: normalizeColumnVisibility(candidate.columnVisibility),
    sorting: normalizeSorting(candidate.sorting, initialSorting),
    version: TABLE_PREFERENCE_VERSION,
  };
}

function normalizeSorting(
  value: unknown,
  fallback: SortingState,
): SortingState {
  if (!Array.isArray(value)) return fallback;

  return value
    .filter((item): item is { desc: boolean; id: string } => (
      Boolean(item)
      && typeof item === 'object'
      && typeof (item as { id?: unknown }).id === 'string'
      && typeof (item as { desc?: unknown }).desc === 'boolean'
    ))
    .map((item) => ({ id: item.id, desc: item.desc }));
}

function normalizeColumnVisibility(value: unknown): VisibilityState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
}

function normalizeColumnFilters(value: unknown): ColumnFiltersState {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is { id: string; value: string[] } => (
      Boolean(item)
      && typeof item === 'object'
      && typeof (item as { id?: unknown }).id === 'string'
      && Array.isArray((item as { value?: unknown }).value)
    ))
    .map((item) => ({
      id: item.id,
      value: item.value.filter((filterValue) => typeof filterValue === 'string'),
    }))
    .filter((item) => item.value.length > 0);
}

function tablePreferenceStatesEqual(
  left: TablePreferenceState,
  right: TablePreferenceState,
): boolean {
  return left.version === right.version
    && sortingStatesEqual(left.sorting, right.sorting)
    && columnVisibilityStatesEqual(left.columnVisibility, right.columnVisibility)
    && columnFilterStatesEqual(left.columnFilters, right.columnFilters);
}

export function sortingStatesEqual(left: SortingState, right: SortingState): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem || leftItem.id !== rightItem.id || leftItem.desc !== rightItem.desc) return false;
  }
  return true;
}

function columnVisibilityStatesEqual(left: VisibilityState, right: VisibilityState): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) return false;
  for (const [key, value] of leftEntries) {
    if (right[key] !== value) return false;
  }
  return true;
}

function columnFilterStatesEqual(left: ColumnFiltersState, right: ColumnFiltersState): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem || leftItem.id !== rightItem.id) return false;
    if (!Array.isArray(leftItem.value) || !Array.isArray(rightItem.value)) return false;
    if (leftItem.value.length !== rightItem.value.length) return false;
    for (let valueIndex = 0; valueIndex < leftItem.value.length; valueIndex += 1) {
      if (leftItem.value[valueIndex] !== rightItem.value[valueIndex]) return false;
    }
  }
  return true;
}
