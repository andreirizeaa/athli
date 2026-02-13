'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { cn } from '@/lib/general/utils';
import { exportToCSV } from '@/lib/general/csv-export';
import { EditColumnsSidebar } from '@/components/app/edit-columns-sidebar';
import {
  Search,
  X,
  Check,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';

export type PinnedColumnDefinition<T = any> = {
  /** Unique id for sorting + selection semantics (optional) */
  id: string;

  /** Sticky-left width (CSS length). Default: 350px */
  width?: string;

  /** Show divider between pinned and the rest. Default: true */
  showDivider?: boolean;

  /** Header renderer (optional). If omitted and selection enabled, we show the select-all checkbox. */
  renderHeader?: (props: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;

    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
  }) => React.ReactNode;

  /** Cell renderer (required if pinnedColumn is set) */
  renderCell: (row: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;

  /** Optional override className for pinned header/cell */
  headerClassName?: string;
  cellClassName?: string;
};

export type ColumnDefinition<T = any> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  width?: { class: string; pixel: string };
  tooltip?: string;
  sortable?: boolean;
  renderHeader?: (props: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
    onMoveColumn: (direction: 'left' | 'right') => void;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
  }) => React.ReactNode;
  renderCell?: (row: T, isSelected: boolean) => React.ReactNode;
  getSortValue?: (row: T) => string | number | boolean;
  getSearchValue?: (row: T) => string;
};

export type FilterDefinition<T = any> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  options: Array<{ value: string; label: string }>;
  getFilterValue?: (row: T) => string | null;
  defaultValue?: string | null;
  searchable?: boolean;
  searchPlaceholder?: string;
  multiSelect?: boolean;
};

export type DataGridProps<T = any> = {
  data: T[];
  columns: ColumnDefinition<T>[];
  getRowId: (row: T) => string;
  gridKey: string;
  itemsPerPage?: number;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T | ((row: T) => string))[];
  filters?: FilterDefinition<T>[];
  enableEditColumns?: boolean;
  enableExport?: boolean;
  exportFileName?: string;
  exportDataTransform?: (row: T) => Record<string, any>;
  enableRowSelection?: boolean;
  selectOnRowClick?: boolean;
  onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowKeyDown?: (row: T, event: React.KeyboardEvent<HTMLTableRowElement>) => void;
  selectedRowIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Optional function to determine if a row can be selected. If not provided, all rows are selectable. */
  isRowSelectable?: (row: T) => boolean;
  pinnedColumns?: string[];

  /** Configuration for the pinned column (sticky left) */
  pinnedColumn?: PinnedColumnDefinition<T>;

  defaultColumnOrder?: string[];
  defaultVisibleColumns?: string[];
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  rowHeight?: string;

  /** @deprecated use pinnedColumn */
  stickyFirstColumn?: boolean;
  /** @deprecated use pinnedColumn */
  firstColumnWidth?: string;
  /** @deprecated use pinnedColumn */
  firstColumnId?: string;
  /** @deprecated use pinnedColumn */
  hideFirstColumnBorder?: boolean;
  /** @deprecated use pinnedColumn */
  renderFirstColumn?: (row: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  /** @deprecated use pinnedColumn */
  renderFirstColumnHeader?: (props: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
  }) => React.ReactNode;
  compactMode?: boolean;
  showPagination?: boolean;
  tableWrapperClassName?: string;
  disableLoadingOverlay?: boolean;
  onFilteredDataChange?: (filteredCount: number) => void;
  selectionActions?: React.ReactNode;
  gridPadding?: boolean;
  compactPagination?: boolean;
  filterBarActions?: React.ReactNode;
  /** Content rendered before the filters (right side of toolbar, left of filters) */
  filterBarPrefix?: React.ReactNode;
  /** Content rendered right next to the search bar (left side of toolbar) */
  searchBarExtra?: React.ReactNode;
  showLastColumnDivider?: boolean;
  enableRowReordering?: boolean;
  isReorderMode?: boolean;
  onReorder?: (newData: T[]) => void;
  fixedBottomRowFilter?: (row: T) => boolean;
  getRowClassName?: (row: T) => string;
  getRowHeight?: (row: T) => string;
  alwaysShowHeaders?: boolean;
  /** Show a loading spinner in the grid body */
  isLoading?: boolean;
};

const isFuzzyMatch = (text: string, query: string): boolean => {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return true;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
    if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
      queryIndex += 1;
    }
    textIndex += 1;
  }

  return queryIndex === normalizedQuery.length;
};

export const CellTextWithTooltip = ({ text }: { text: string }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };

    checkTruncation();
    const timeoutId = setTimeout(checkTruncation, 0);
    window.addEventListener('resize', checkTruncation);
    return () => {
      window.removeEventListener('resize', checkTruncation);
      clearTimeout(timeoutId);
    };
  }, [text]);

  const textSpan = (
    <span ref={textRef} className="text-sm truncate block w-full">
      {text}
    </span>
  );

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{textSpan}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return textSpan;
};

// Sortable Row Component for drag and drop
const SortableTableRow = <T extends Record<string, any>>({
  row,
  rowId,
  isSelected,
  rowHeight,
  onRowClick,
  onRowKeyDown,
  hasPinnedColumn,
  filteredColumnOrder,
  columns,
  showLastColumnDivider,
  customClassName,
  enableRowSelection,
  selectOnRowClick,
  onToggle,
  children,
}: {
  row: T;
  rowId: string;
  isSelected: boolean;
  rowHeight: string;
  onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowKeyDown?: (row: T, event: React.KeyboardEvent<HTMLTableRowElement>) => void;
  hasPinnedColumn?: boolean;
  filteredColumnOrder: string[];
  columns: ColumnDefinition<T>[];
  showLastColumnDivider: boolean;
  customClassName?: string;
  enableRowSelection?: boolean;
  selectOnRowClick?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      key={rowId}
      data-row-id={rowId}
      role={onRowClick || selectOnRowClick ? 'button' : undefined}
      tabIndex={onRowClick || selectOnRowClick ? 0 : undefined}
      aria-label={onRowClick ? `Open ${rowId}` : selectOnRowClick ? `Select ${rowId}` : undefined}
      onClick={(e) => {
        if (onRowClick) {
          onRowClick(row, e);
        } else if (selectOnRowClick && enableRowSelection) {
          onToggle();
        }
      }}
      onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(row, e) : undefined}
      className={cn(
        isSelected && '!bg-muted',
        'group',
        (onRowClick || selectOnRowClick || hasPinnedColumn) && 'cursor-pointer',
        '[&:hover_td]:bg-muted',
        '!transition-none',
        customClassName
      )}
    >
      {children}
    </TableRow>
  );
};

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  getRowId,
  gridKey,
  itemsPerPage = 25,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  searchFields = [],
  filters = [],
  enableEditColumns = false,
  enableExport = false,
  exportFileName = 'export.csv',
  exportDataTransform,
  enableRowSelection = false,
  selectOnRowClick = false,
  onRowClick,
  onRowKeyDown,
  selectedRowIds: controlledSelectedRowIds,
  onSelectionChange,
  isRowSelectable,
  pinnedColumns = [],
  pinnedColumn,
  defaultColumnOrder,
  defaultVisibleColumns,
  emptyMessage = 'No items found.',
  emptyState,
  rowHeight = '54px',
  stickyFirstColumn = false,
  firstColumnWidth = '350px',
  firstColumnId,
  hideFirstColumnBorder = false,
  renderFirstColumn,
  renderFirstColumnHeader,
  compactMode = false,
  showPagination = true,
  tableWrapperClassName,
  disableLoadingOverlay = false,
  onFilteredDataChange,
  selectionActions,
  gridPadding = false,
  compactPagination = false,
  filterBarActions,
  filterBarPrefix,
  searchBarExtra,
  showLastColumnDivider = false,
  enableRowReordering = false,
  isReorderMode = false,
  onReorder,
  fixedBottomRowFilter,
  getRowClassName,
  getRowHeight,
  alwaysShowHeaders = false,
  isLoading = false,
}: DataGridProps<T>) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState<boolean>(false);
  const [filterValues, setFilterValues] = useState<Record<string, string | string[] | null>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(
    defaultColumnOrder || columns.map((col) => col.id)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(defaultVisibleColumns || columns.map((col) => col.id))
  );

  const resolvedPinnedColumn: PinnedColumnDefinition<T> | null = useMemo(() => {
    if (pinnedColumn) return pinnedColumn;

    // Backwards compat shim
    if (stickyFirstColumn && renderFirstColumn) {
      return {
        id: firstColumnId || '__pinned__',
        width: firstColumnWidth || '350px',
        showDivider: !hideFirstColumnBorder,
        renderHeader: renderFirstColumnHeader
          ? (p) =>
            renderFirstColumnHeader({
              isSorted: p.isSorted,
              isAscending: p.isAscending,
              isDescending: p.isDescending,
              onSort: p.onSort,
              isAllSelected: p.isAllSelected,
              onToggleAll: p.onToggleAll,
              enableRowSelection: p.enableRowSelection,
            })
          : undefined,
        renderCell: renderFirstColumn,
      };
    }

    return null;
  }, [
    pinnedColumn,
    stickyFirstColumn,
    renderFirstColumn,
    renderFirstColumnHeader,
    firstColumnId,
    firstColumnWidth,
    hideFirstColumnBorder,
  ]);

  const hasPinned = !!resolvedPinnedColumn;
  const pinnedWidth = resolvedPinnedColumn?.width ?? '350px';
  const pinnedHasDivider = resolvedPinnedColumn?.showDivider ?? true;

  const [isInitializing, setIsInitializing] = useState<boolean>(enableEditColumns);
  const [pagesFullySelected, setPagesFullySelected] = useState<Set<number>>(new Set());
  const [filterSearchQueries, setFilterSearchQueries] = useState<Record<string, string>>({});
  const filtersInitializedRef = useRef(false);

  // Setup DnD sensors for row reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const previousFiltersRef = useRef<string>('');
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const pageDropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [pageDropdownWidth, setPageDropdownWidth] = useState<number | undefined>(undefined);

  const [activeId, setActiveId] = useState<string | null>(null);

  const handlePageDropdownTriggerRef = React.useCallback((node: HTMLButtonElement | null) => {
    pageDropdownTriggerRef.current = node;
  }, []);

  // DataGrid is fully controlled when enableRowSelection is true
  // When row selection is enabled, selectedRowIds and onSelectionChange must be provided
  const selectedRowIds = controlledSelectedRowIds ?? new Set<string>();
  const setSelectedRowIds = (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (!onSelectionChange) {
      if (enableRowSelection) {
        console.warn('DataGrid: onSelectionChange is required when enableRowSelection is true');
      }
      return;
    }
    if (ids instanceof Set) {
      onSelectionChange(ids);
    } else {
      onSelectionChange(ids(selectedRowIds));
    }
  };

  // Initialize filter values
  useEffect(() => {
    // Create a stable string representation of filters for comparison
    const filtersKey = JSON.stringify(
      filters.map((f) => ({ id: f.id, defaultValue: f.defaultValue }))
    );

    // Only initialize if filters haven't been initialized or if filters actually changed
    if (!filtersInitializedRef.current || previousFiltersRef.current !== filtersKey) {
      const initialFilters: Record<string, string | null> = {};
      filters.forEach((filter) => {
        initialFilters[filter.id] = filter.defaultValue ?? null;
      });
      setFilterValues(initialFilters);
      filtersInitializedRef.current = true;
      previousFiltersRef.current = filtersKey;
    }
  }, [filters]);

  // Clear selection when Escape key is pressed
  useEffect(() => {
    if (!enableRowSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRowIds.size > 0) {
        setSelectedRowIds(new Set());
        setPagesFullySelected(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableRowSelection, selectedRowIds.size]);

  // Load column preferences from localStorage
  useEffect(() => {
    if (!enableEditColumns) {
      setIsInitializing(false);
      return;
    }

    try {
      const preferences = JSON.parse(localStorage.getItem('column_preferences') || '{}');
      const orderedVisibleColumns = preferences[gridKey];

      if (orderedVisibleColumns && Array.isArray(orderedVisibleColumns)) {
        const allColumnIds = columns.map((col) => col.id);
        const savedVisibleIds = new Set(orderedVisibleColumns);

        // Set visible columns from the saved list
        setVisibleColumns(new Set(orderedVisibleColumns.filter((id) => allColumnIds.includes(id))));

        // Build full column order: saved visible columns first (in order), then hidden columns
        const savedOrder = orderedVisibleColumns.filter((id) => allColumnIds.includes(id));
        const allColumnsOrder = [...savedOrder];

        // Add any missing columns at the end (these are hidden)
        allColumnIds.forEach((id) => {
          if (!savedVisibleIds.has(id)) {
            allColumnsOrder.push(id);
          }
        });

        setColumnOrder(allColumnsOrder);
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [gridKey, enableEditColumns, columns]);

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (enableSearch && searchQuery.trim()) {
      const query = searchQuery.trim();
      result = result.filter((row) => {
        if (searchFields.length > 0) {
          return searchFields.some((field) => {
            const value = typeof field === 'function' ? field(row) : String(row[field] ?? '');
            return isFuzzyMatch(value, query);
          });
        }

        // Default: search all string values
        return Object.values(row).some((value) => {
          if (typeof value === 'string') {
            return isFuzzyMatch(value, query);
          }
          return false;
        });
      });
    }

    // Apply filters
    filters.forEach((filter) => {
      const filterValue = filterValues[filter.id];
      if (filterValue) {
        result = result.filter((row) => {
          const rowValue = filter.getFilterValue
            ? filter.getFilterValue(row)
            : (row[filter.id] as string);
          // Support comma-separated values (for arrays like muscle groups)
          if (typeof rowValue === 'string' && rowValue.includes(',')) {
            if (typeof filterValue === 'string') {
              return rowValue.split(',').includes(filterValue);
            }
            return false;
          }
          if (typeof filterValue === 'string') {
            return rowValue === filterValue;
          }
          return false;
        });
      }
    });

    return result;
  }, [data, searchQuery, filterValues, filters, enableSearch, searchFields]);

  // Notify parent of filtered data count change
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData.length);
    }
  }, [filteredData.length, onFilteredDataChange]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return filteredData;
    }

    const column = columns.find((col) => col.id === sortColumn);
    if (!column || !column.getSortValue) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = column.getSortValue!(a);
      const bValue = column.getSortValue!(b);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        const aNum = aValue ? 1 : 0;
        const bNum = bValue ? 1 : 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      return 0;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Separate draggable rows from fixed bottom rows
  const draggableRows = fixedBottomRowFilter
    ? paginatedData.filter((row) => !fixedBottomRowFilter(row))
    : paginatedData;
  const fixedBottomRows = fixedBottomRowFilter
    ? paginatedData.filter((row) => fixedBottomRowFilter(row))
    : [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterValues, sortColumn, sortDirection]);

  // Cleanup: Sync "full page" state with actual selection state
  // - Remove pages that are no longer fully selected
  // - Add pages where all items are selected (even if manually selected)
  useEffect(() => {
    if (!enableRowSelection) return;

    setPagesFullySelected((prev) => {
      const next = new Set(prev);
      let changed = false;
      const totalPages = Math.ceil(sortedData.length / itemsPerPage);

      // Check all pages
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageStart = (pageNum - 1) * itemsPerPage;
        const pageEnd = pageStart + itemsPerPage;
        const pageData = sortedData.slice(pageStart, pageEnd);

        if (pageData.length === 0) {
          // Empty page - remove marker if present
          if (next.has(pageNum)) {
            next.delete(pageNum);
            changed = true;
          }
        } else {
          const allSelected = pageData.every((row) => selectedRowIds.has(getRowId(row)));
          const isMarked = next.has(pageNum);

          if (allSelected && !isMarked) {
            // All items selected but not marked - add marker
            next.add(pageNum);
            changed = true;
          } else if (!allSelected && isMarked) {
            // Marked but not all items selected - remove marker
            next.delete(pageNum);
            changed = true;
          }
        }
      }

      // Remove markers for pages that no longer exist
      next.forEach((pageNum) => {
        const totalPages = Math.ceil(sortedData.length / itemsPerPage);
        if (pageNum > totalPages) {
          next.delete(pageNum);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [
    sortedData,
    selectedRowIds,
    itemsPerPage,
    enableRowSelection,
    getRowId,
  ]);



  // Calculate overlay height when loading starts


  // Measure page dropdown button width when page changes or component mounts
  useEffect(() => {
    const measureWidth = () => {
      if (pageDropdownTriggerRef.current) {
        setPageDropdownWidth(pageDropdownTriggerRef.current.offsetWidth);
      }
    };

    // Measure immediately
    measureWidth();

    // Also measure after a short delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(measureWidth, 0);

    return () => clearTimeout(timeoutId);
  }, [currentPage, totalPages]);

  // Also measure on window resize
  useEffect(() => {
    const handleResize = () => {
      if (pageDropdownTriggerRef.current) {
        setPageDropdownWidth(pageDropdownTriggerRef.current.offsetWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll selected row into view when selectedRowIds changes
  useEffect(() => {
    if (selectedRowIds.size > 0 && tableBodyRef.current) {
      const selectedId = Array.from(selectedRowIds)[0];
      const selectedRow = tableBodyRef.current.querySelector(
        `[data-row-id="${selectedId}"]`
      ) as HTMLTableRowElement;
      if (selectedRow) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [selectedRowIds, paginatedData]);

  const filteredColumnOrder = columnOrder.filter((colId) => {
    // Exclude resolved pinned column id from regular sorting rendering
    if (hasPinned && resolvedPinnedColumn?.id && colId === resolvedPinnedColumn.id) {
      return false;
    }
    return visibleColumns.has(colId);
  });

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSortColumn(columnId);
    setSortDirection(direction);
  };

  const handleMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    setColumnOrder((prev) => {
      const newOrder = [...prev];
      const currentIndex = newOrder.indexOf(columnId);
      const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= newOrder.length) {
        return prev;
      }

      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

      if (enableEditColumns) {
        try {
          const preferences = JSON.parse(localStorage.getItem('column_preferences') || '{}');
          // Save only the ordered visible columns
          const orderedVisibleColumns = newOrder.filter((id) => visibleColumns.has(id));
          preferences[gridKey] = orderedVisibleColumns;
          localStorage.setItem('column_preferences', JSON.stringify(preferences));
        } catch (error) {
          console.error('Failed to save column preferences:', error);
        }
      }

      return newOrder;
    });
  };

  const handleColumnsChange = (newVisibleColumns: string[], newColumnOrder: string[]) => {
    setVisibleColumns(new Set(newVisibleColumns));
    setColumnOrder(newColumnOrder);

    // Save to localStorage
    if (enableEditColumns) {
      try {
        const preferences = JSON.parse(localStorage.getItem('column_preferences') || '{}');
        // Save only the ordered visible columns
        const orderedVisibleColumns = newColumnOrder.filter((id) => newVisibleColumns.includes(id));
        preferences[gridKey] = orderedVisibleColumns;
        localStorage.setItem('column_preferences', JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      }
    }
  };

  const handleToggleRow = (rowId: string) => {
    setSelectedRowIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });

    // When a single row is toggled, the page is no longer fully selected
    if (pagesFullySelected.has(currentPage)) {
      setPagesFullySelected((prev) => {
        const next = new Set(prev);
        next.delete(currentPage);
        return next;
      });
    }
  };

  // Industry-standard approach: Check if current page is marked as fully selected
  // This is separate from actual row selection state
  const isAllSelected = useMemo(() => {
    if (!enableRowSelection || paginatedData.length === 0) {
      return false;
    }
    // If isRowSelectable is provided, check if all selectable rows are selected
    if (isRowSelectable) {
      const selectableRows = paginatedData.filter((row) => isRowSelectable(row));
      if (selectableRows.length === 0) return false;
      return selectableRows.every((row) => selectedRowIds.has(getRowId(row)));
    }
    return pagesFullySelected.has(currentPage);
  }, [enableRowSelection, paginatedData, pagesFullySelected, currentPage, isRowSelectable, selectedRowIds, getRowId]);

  const isIndeterminate = useMemo(() => {
    if (!enableRowSelection || paginatedData.length === 0) {
      return false;
    }
    // If isRowSelectable is provided, only consider selectable rows
    const rowsToCheck = isRowSelectable
      ? paginatedData.filter((row) => isRowSelectable(row))
      : paginatedData;
    if (rowsToCheck.length === 0) return false;
    const hasSomeSelected = rowsToCheck.some((row) => selectedRowIds.has(getRowId(row)));
    return hasSomeSelected && !isAllSelected;
  }, [enableRowSelection, paginatedData, selectedRowIds, isAllSelected, getRowId, isRowSelectable]);

  const handleToggleAll = () => {
    if (!enableRowSelection) return;

    // Filter to only selectable rows
    const selectableRows = isRowSelectable
      ? paginatedData.filter((row) => isRowSelectable(row))
      : paginatedData;
    const pageIds = selectableRows.map((row) => getRowId(row));

    if (isAllSelected) {
      // Deselect current page items
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
      // Remove current page from fully selected pages
      setPagesFullySelected((prev) => {
        const next = new Set(prev);
        next.delete(currentPage);
        return next;
      });
    } else {
      // Select all selectable items on current page
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
      // Mark current page as fully selected
      setPagesFullySelected((prev) => {
        const next = new Set(prev);
        next.add(currentPage);
        return next;
      });
    }
  };

  const handleExport = () => {
    if (!exportDataTransform) {
      console.error('exportDataTransform is required for export');
      return;
    }

    const csvData = sortedData.map(exportDataTransform);
    exportToCSV(csvData, exportFileName);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = draggableRows.findIndex((item) => getRowId(item) === active.id);
      const newIndex = draggableRows.findIndex((item) => getRowId(item) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedDraggable = arrayMove(draggableRows, oldIndex, newIndex);

        // Combine reordered draggable rows with fixed bottom rows
        const newData = [...reorderedDraggable, ...fixedBottomRows];

        onReorder(newData);
      }
    }

    setActiveId(null);
  };

  const renderColumnHeader = (column: ColumnDefinition<T>) => {
    const currentIndex = columnOrder.indexOf(column.id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === columnOrder.length - 1;
    const isSorted = sortColumn === column.id;
    const isAscending = isSorted && sortDirection === 'asc';
    const isDescending = isSorted && sortDirection === 'desc';

    if (column.renderHeader) {
      return (
        <TableHead
          key={column.id}
          className={cn(
            '!px-6 !py-0 h-10 !bg-background',
            gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
            column.width?.class || 'min-w-[130px]'
          )}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: 'hsl(var(--background))',
            boxShadow: '0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          }}
        >
          {column.renderHeader({
            isSorted,
            isAscending,
            isDescending,
            onSort: (direction) => handleSort(column.id, direction),
            onMoveColumn: (direction) => handleMoveColumn(column.id, direction),
            canMoveLeft: !isFirst,
            canMoveRight: !isLast,
            isAllSelected,
            onToggleAll: handleToggleAll,
            enableRowSelection: enableRowSelection || false,
          })}
        </TableHead>
      );
    }

    const headerWidth = column.width?.pixel || '130px';

    return (
      <TableHead
        key={column.id}
        className={cn(
          '!px-6 !py-0 h-10 !bg-background',
          gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
          column.width?.class || 'min-w-[130px]'
        )}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: 'hsl(var(--background))',
          boxShadow: '0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-full w-full justify-start rounded-none px-0 hover:bg-transparent"
            >
              <span className="flex items-center gap-2 text-xs uppercase text-muted-foreground py-1">
                {column.icon && <div className="text-muted-foreground">{column.icon}</div>}
                {column.label}
              </span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </Button>
          </DropdownMenuTrigger>
          {column.tooltip && (
            <Tooltip>
              <TooltipContent
                className="whitespace-normal break-words text-left"
                style={{ maxWidth: headerWidth }}
              >
                {column.tooltip}
              </TooltipContent>
            </Tooltip>
          )}
          <DropdownMenuContent align="start">
            {column.sortable !== false && (
              <>
                <DropdownMenuItem
                  onClick={() => handleSort(column.id, 'asc')}
                  className={cn(isAscending && 'bg-accent')}
                >
                  <ArrowUpNarrowWide className="size-4 mr-2" />
                  <span className="flex-1">Sort ascending</span>
                  {isAscending && <Check className="ml-2 size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSort(column.id, 'desc')}
                  className={cn(isDescending && 'bg-accent')}
                >
                  <ArrowDownWideNarrow className="size-4 mr-2" />
                  <span className="flex-1">Sort descending</span>
                  {isDescending && <Check className="ml-2 size-4" />}
                </DropdownMenuItem>
                {enableEditColumns && <DropdownMenuSeparator />}
              </>
            )}
            {enableEditColumns && (
              <>
                <DropdownMenuItem
                  onClick={() => handleMoveColumn(column.id, 'left')}
                  disabled={isFirst}
                >
                  <ChevronLeft className="size-4 mr-2" />
                  <span>Move left</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleMoveColumn(column.id, 'right')}
                  disabled={isLast}
                >
                  <ChevronRight className="size-4 mr-2" />
                  <span>Move right</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableHead>
    );
  };

  // Check if toolbar has any content to show
  const hasToolbarContent = enableSearch || filters.length > 0 || filterBarActions || enableEditColumns || enableExport;

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col min-h-0'
      )}
    >
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {!compactMode && hasToolbarContent && (
          <div className="w-full px-3 py-3 flex items-center justify-between gap-4 flex-shrink-0 relative">
            {selectionActions && selectedRowIds.size > 0 && (
              <Card className="absolute left-2 top-2 z-40 bg-background border-border py-0 px-0 rounded-md">
                <div className="px-2 py-[5px]">
                  {selectionActions}
                </div>
              </Card>
            )}
            <div className="flex items-center gap-4 shrink-0">
              {enableSearch && (
                <div className="relative w-[250px] px-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn('pl-9 w-full', searchQuery && 'pr-9')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}
              {searchBarExtra}
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {filterBarPrefix}
              {filters.map((filter) => {
                const filterValue = filterValues[filter.id];
                const filterValueStr = Array.isArray(filterValue)
                  ? filterValue[0] || null
                  : filterValue || null;
                const selectedOption = filterValueStr
                  ? filter.options.find((opt) => opt.value === filterValueStr)
                  : null;
                const displayValue = selectedOption ? selectedOption.label : 'All';
                const filterSearchQuery = filterSearchQueries[filter.id] || '';
                const filteredOptions = filter.searchable
                  ? filter.options.filter((opt) =>
                    opt.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
                  )
                  : filter.options;

                if (filter.multiSelect) {
                  const selectedValues = Array.isArray(filterValues[filter.id])
                    ? (filterValues[filter.id] as string[])
                    : filterValues[filter.id]
                      ? [filterValues[filter.id] as string]
                      : [];

                  return (
                    <MultiAsyncSelect
                      key={filter.id}
                      options={filter.options}
                      value={selectedValues}
                      onValueChange={(values) => {
                        setFilterValues((prev) => ({
                          ...prev,
                          [filter.id]: values.length > 0 ? values : null,
                        }));
                      }}
                      placeholder={`${filter.label}...`}
                      searchPlaceholder={filter.searchPlaceholder || 'Search...'}
                      maxCount={3}
                      clearText="Clear"
                      closeText="Close"
                      className="min-w-[200px]"
                    />
                  );
                }

                if (filter.searchable) {
                  return (
                    <Popover key={filter.id}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          {filter.icon}
                          <span>
                            {filter.label}: {displayValue}
                          </span>
                          <ChevronDown className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-0" align="end">
                        <Command>
                          <CommandInput
                            placeholder={filter.searchPlaceholder || 'Search...'}
                            value={filterSearchQuery}
                            onValueChange={(value) =>
                              setFilterSearchQueries((prev) => ({
                                ...prev,
                                [filter.id]: value,
                              }))
                            }
                          />
                          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setFilterValues((prev) => ({
                                    ...prev,
                                    [filter.id]: null,
                                  }));
                                  setFilterSearchQueries((prev) => ({
                                    ...prev,
                                    [filter.id]: '',
                                  }));
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 size-4',
                                    filterValues[filter.id] === null ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                All
                              </CommandItem>
                              {filteredOptions.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  onSelect={() => {
                                    setFilterValues((prev) => ({
                                      ...prev,
                                      [filter.id]: option.value,
                                    }));
                                    setFilterSearchQueries((prev) => ({
                                      ...prev,
                                      [filter.id]: '',
                                    }));
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 size-4',
                                      filterValues[filter.id] === option.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }

                return (
                  <DropdownMenu key={filter.id}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        {filter.icon}
                        <span>
                          {filter.label}: {displayValue}
                        </span>
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                      <DropdownMenuRadioGroup
                        value={typeof filterValue === 'string' ? filterValue : 'all'}
                        onValueChange={(value) =>
                          setFilterValues((prev) => ({
                            ...prev,
                            [filter.id]: value === 'all' ? null : value,
                          }))
                        }
                      >
                        <DropdownMenuRadioItem
                          value="all"
                          className={cn(filterValues[filter.id] === null && 'bg-accent')}
                        >
                          <span className="flex-1">All</span>
                          {filterValues[filter.id] === null && <Check className="ml-2 size-4" />}
                        </DropdownMenuRadioItem>
                        {filter.options.map((option) => (
                          <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                            className={cn(filterValues[filter.id] === option.value && 'bg-accent')}
                          >
                            <span className="flex-1">{option.label}</span>
                            {filterValues[filter.id] === option.value && (
                              <Check className="ml-2 size-4" />
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
              {filterBarActions}
              {enableEditColumns && (
                <Button
                  variant="ghost"
                  onClick={() => setIsEditColumnsOpen(true)}
                  className="gap-2"
                  aria-label="Edit columns"
                >
                  <SlidersHorizontal className="size-4" />
                  <span>Edit columns</span>
                </Button>
              )}
              {enableExport && (
                <Button
                  variant="ghost"
                  onClick={handleExport}
                  className="gap-2"
                  aria-label="Export to CSV"
                >
                  <Download className="size-4" />
                  <span>Export</span>
                </Button>
              )}
            </div>
          </div>
        )}
        {compactMode && enableSearch && (
          <div className={cn('relative mb-4 pt-2 -mt-1', gridPadding && 'px-4')}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={cn('w-full pl-9', searchQuery && 'pr-9')}
                aria-label="Search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}
        {compactMode && filters.length > 0 && (
          <div className={cn('flex items-center gap-2 mb-4', gridPadding && 'px-4')}>
            {filters.map((filter) => {
              if (filter.multiSelect) {
                const selectedValues = Array.isArray(filterValues[filter.id])
                  ? (filterValues[filter.id] as string[])
                  : filterValues[filter.id]
                    ? [filterValues[filter.id] as string]
                    : [];

                return (
                  <MultiAsyncSelect
                    key={filter.id}
                    options={filter.options}
                    value={selectedValues}
                    onValueChange={(values) => {
                      setFilterValues((prev) => ({
                        ...prev,
                        [filter.id]: values.length > 0 ? values : null,
                      }));
                    }}
                    placeholder={`${filter.label}...`}
                    searchPlaceholder={filter.searchPlaceholder || 'Search...'}
                    maxCount={3}
                    clearText="Clear"
                    closeText="Close"
                    className="min-w-[200px]"
                  />
                );
              }

              const filterValue = filterValues[filter.id];
              const filterValueStr = Array.isArray(filterValue)
                ? filterValue[0] || null
                : filterValue || null;
              const selectedOption = filterValueStr
                ? filter.options.find((opt) => opt.value === filterValueStr)
                : null;
              const displayValue = selectedOption ? selectedOption.label : 'All';
              return (
                <DropdownMenu key={filter.id}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {filter.icon}
                      <span>
                        {filter.label}: {displayValue}
                      </span>
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                    <DropdownMenuRadioGroup
                      value={typeof filterValue === 'string' ? filterValue : 'all'}
                      onValueChange={(value) =>
                        setFilterValues((prev) => ({
                          ...prev,
                          [filter.id]: value === 'all' ? null : value,
                        }))
                      }
                    >
                      <DropdownMenuRadioItem
                        value="all"
                        className={cn(filterValues[filter.id] === null && 'bg-accent')}
                      >
                        <span className="flex-1">All</span>
                        {filterValues[filter.id] === null && <Check className="ml-2 size-4" />}
                      </DropdownMenuRadioItem>
                      {filter.options.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                          className={cn(filterValues[filter.id] === option.value && 'bg-accent')}
                        >
                          <span className="flex-1">{option.label}</span>
                          {filterValues[filter.id] === option.value && (
                            <Check className="ml-2 size-4" />
                          )}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        )}
        <div
          className={cn(
            'flex-1 relative flex flex-col min-h-0',
            gridPadding && 'pl-4 pr-4 pb-4',
            compactMode ? 'w-full' : ''
          )}
        >
          <div
            ref={scrollableContainerRef}
            className={cn(
              'flex-1 relative border rounded-lg flex flex-col overflow-hidden min-h-0'
            )}

          >
            <div
              className={cn(
                'flex-1 relative overflow-auto',
                paginatedData.length === 0 ? 'overflow-y-auto overflow-x-hidden' : ''
              )}
            >
              {isLoading && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 pointer-events-none"
                  style={{ top: alwaysShowHeaders ? '40px' : '0' }}
                >
                  <Spinner className="size-6" />
                </div>
              )}
              {!isLoading && paginatedData.length === 0 && (emptyState || emptyMessage) && (() => {
                // Check if any filters or search are active
                const hasActiveFilters = searchQuery.trim() !== '' ||
                  Object.values(filterValues).some(value =>
                    value !== null && value !== '' &&
                    (Array.isArray(value) ? value.length > 0 : true)
                  );

                // Show overlay if empty. If headers are shown (due to filters or alwaysShowHeaders),
                // we position it below the headers.
                const showHeaders = alwaysShowHeaders || hasActiveFilters;

                return (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-background pointer-events-none"
                    style={{
                      top: showHeaders ? '40px' : '0',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center text-center p-8 pointer-events-auto">
                      {hasActiveFilters ? (
                        <div className="text-sm text-muted-foreground font-medium">No results found</div>
                      ) : (
                        emptyState || (
                          <div className="text-sm text-muted-foreground font-medium">
                            {emptyMessage}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

              <style
                dangerouslySetInnerHTML={{
                  __html: `
            tbody tr:hover td:first-child,
            tbody tr.group:hover td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
            tbody tr[style*="background-color"] td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
            tbody tr:hover td.sticky.left-0,
            tbody tr.group:hover td.sticky.left-0 {
              background-color: hsl(var(--muted)) !important;
            }
          `,
                }}
              />
              {(() => {
                // Check if any filters or search are active
                const hasActiveFilters = searchQuery.trim() !== '' ||
                  Object.values(filterValues).some(value =>
                    value !== null && value !== '' &&
                    (Array.isArray(value) ? value.length > 0 : true)
                  );

                // Show table if: has data, alwaysShowHeaders is true, or filters are active
                return (paginatedData.length > 0 || alwaysShowHeaders || hasActiveFilters) && (
                  enableRowReordering && isReorderMode ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
                    >
                      <SortableContext
                        items={draggableRows.map((row) => getRowId(row))}
                        strategy={verticalListSortingStrategy}
                      >
                        <table
                          className="table-fixed border-separate border-spacing-0 w-full"
                          style={{ tableLayout: 'fixed', width: '100%' }}
                        >
                          <colgroup>
                            {hasPinned && (
                              <col
                                style={{
                                  width: pinnedWidth,
                                  minWidth: pinnedWidth,
                                  maxWidth: pinnedWidth,
                                }}
                              />
                            )}
                            {filteredColumnOrder.map((columnId) => {
                              const column = columns.find((col) => col.id === columnId);
                              return (
                                <col
                                  key={columnId}
                                  style={{
                                    width: column?.width?.pixel || '130px',
                                    minWidth: column?.width?.pixel || '130px',
                                    maxWidth: column?.width?.pixel || '130px',
                                  }}
                                />
                              );
                            })}
                          </colgroup>
                          <TableHeader className={cn('!bg-background')}>
                            <TableRow className="hover:bg-transparent h-10">
                              {hasPinned && (
                                <TableHead
                                  className={cn(
                                    '!px-6 !py-0 h-10 !bg-background',
                                    pinnedHasDivider && 'border-r',
                                    'border-b',
                                    gridPadding && 'border-t-0',
                                    resolvedPinnedColumn?.headerClassName
                                  )}
                                  style={{
                                    position: 'sticky',
                                    left: 0,
                                    top: 0,
                                    zIndex: 30,
                                    backgroundColor: 'hsl(var(--background))',
                                    boxShadow: !compactMode
                                      ? '2px 0 4px -2px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
                                      : '2px 0 4px -2px rgba(0,0,0,0.1)',
                                    width: pinnedWidth,
                                    minWidth: pinnedWidth,
                                    maxWidth: pinnedWidth,
                                  }}
                                >
                                  {resolvedPinnedColumn?.renderHeader ? (
                                    resolvedPinnedColumn.renderHeader({
                                      isSorted: sortColumn === resolvedPinnedColumn.id,
                                      isAscending:
                                        sortColumn === resolvedPinnedColumn.id && sortDirection === 'asc',
                                      isDescending:
                                        sortColumn === resolvedPinnedColumn.id && sortDirection === 'desc',
                                      onSort: (dir) => handleSort(resolvedPinnedColumn.id, dir),
                                      isAllSelected,
                                      onToggleAll: handleToggleAll,
                                      enableRowSelection: enableRowSelection || false,
                                    })
                                  ) : enableRowSelection ? (
                                    <div className="flex items-center gap-3 h-full w-full">
                                      <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleToggleAll}
                                        aria-label="Select all"
                                      />
                                    </div>
                                  ) : null}
                                </TableHead>
                              )}
                              {filteredColumnOrder.map((columnId, index) => {
                                const column = columns.find((col) => col.id === columnId);
                                if (!column) return null;
                                const isLastColumn = index === filteredColumnOrder.length - 1;
                                if (isLastColumn && showLastColumnDivider === true) {
                                  // Render last column with sticky positioning only when showLastColumnDivider is true
                                  const currentIndex = columnOrder.indexOf(column.id);
                                  const isFirst = currentIndex === 0;
                                  const isLast = currentIndex === columnOrder.length - 1;
                                  const isSorted = sortColumn === column.id;
                                  const isAscending = isSorted && sortDirection === 'asc';
                                  const isDescending = isSorted && sortDirection === 'desc';

                                  if (column.renderHeader) {
                                    return (
                                      <TableHead
                                        key={column.id}
                                        className={cn(
                                          '!px-6 !py-0 h-10 !bg-background sticky right-0 z-20',
                                          gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
                                          'border-l',
                                          column.width?.class || 'min-w-[130px]'
                                        )}
                                        style={{
                                          top: 0,
                                          backgroundColor: 'hsl(var(--background))',
                                          boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                                        }}
                                      >
                                        {column.renderHeader({
                                          isSorted,
                                          isAscending,
                                          isDescending,
                                          onSort: (direction) => handleSort(column.id, direction),
                                          onMoveColumn: (direction) => handleMoveColumn(column.id, direction),
                                          canMoveLeft: !isFirst,
                                          canMoveRight: !isLast,
                                          isAllSelected,
                                          onToggleAll: handleToggleAll,
                                          enableRowSelection: enableRowSelection || false,
                                        })}
                                      </TableHead>
                                    );
                                  }

                                  const headerWidth = column.width?.pixel || '130px';
                                  const headerButton = (
                                    <Button
                                      variant="ghost"
                                      className="flex items-center gap-2 h-full w-full justify-start rounded-none px-0 hover:bg-transparent"
                                    >
                                      <span className="flex items-center gap-2 text-xs uppercase text-muted-foreground px-2 py-1">
                                        {column.icon && <div className="text-muted-foreground">{column.icon}</div>}
                                        {column.label}
                                      </span>
                                      {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
                                      {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
                                    </Button>
                                  );

                                  return (
                                    <TableHead
                                      key={column.id}
                                      className={cn(
                                        '!px-6 !py-0 h-10 !bg-background sticky right-0 z-20',
                                        gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
                                        'border-l',
                                        column.width?.class || 'min-w-[130px]'
                                      )}
                                      style={{
                                        top: 0,
                                        backgroundColor: 'hsl(var(--background))',
                                        boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                                      }}
                                    >
                                      <DropdownMenu>
                                        {column.tooltip ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <DropdownMenuTrigger asChild>
                                                {headerButton}
                                              </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent
                                              className="whitespace-normal break-words text-left"
                                              style={{ maxWidth: headerWidth }}
                                            >
                                              {column.tooltip}
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <DropdownMenuTrigger asChild>
                                            {headerButton}
                                          </DropdownMenuTrigger>
                                        )}
                                        <DropdownMenuContent align="start">
                                          {column.sortable !== false && (
                                            <>
                                              <DropdownMenuItem
                                                onClick={() => handleSort(column.id, 'asc')}
                                                className={cn(isAscending && 'bg-accent')}
                                              >
                                                <ArrowUpNarrowWide className="size-4 mr-2" />
                                                <span className="flex-1">Sort ascending</span>
                                                {isAscending && <Check className="ml-2 size-4" />}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => handleSort(column.id, 'desc')}
                                                className={cn(isDescending && 'bg-accent')}
                                              >
                                                <ArrowDownWideNarrow className="size-4 mr-2" />
                                                <span className="flex-1">Sort descending</span>
                                                {isDescending && <Check className="ml-2 size-4" />}
                                              </DropdownMenuItem>
                                              {isSorted && (
                                                <>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => {
                                                    setSortColumn(null);
                                                    setSortDirection(null);
                                                  }}>
                                                    <X className="size-4 mr-2" />
                                                    <span>Clear sort</span>
                                                  </DropdownMenuItem>
                                                </>
                                              )}
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableHead>
                                  );
                                }
                                return renderColumnHeader(column);
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody ref={tableBodyRef}>
                            {paginatedData.length > 0 && (
                              enableRowReordering && isReorderMode ? (
                                <>
                                  {draggableRows.map((row) => {
                                    const rowId = getRowId(row);
                                    const isSelected = selectedRowIds.has(rowId);

                                    return (
                                      <SortableTableRow
                                        key={rowId}
                                        row={row}
                                        rowId={rowId}
                                        isSelected={isSelected}
                                        rowHeight={rowHeight}
                                        onRowClick={isReorderMode ? undefined : onRowClick}
                                        onRowKeyDown={isReorderMode ? undefined : onRowKeyDown}
                                        hasPinnedColumn={hasPinned}
                                        // Deprecated props removed from new interface, passing logic handled above in resolvedPinnedColumn
                                        filteredColumnOrder={filteredColumnOrder}
                                        columns={columns}
                                        showLastColumnDivider={showLastColumnDivider}
                                        customClassName={getRowClassName?.(row)}
                                        enableRowSelection={enableRowSelection}
                                        selectOnRowClick={selectOnRowClick}
                                        onToggle={() => handleToggleRow(rowId)}
                                      >
                                        {hasPinned && resolvedPinnedColumn && (
                                          <TableCell
                                            className={cn(
                                              '!px-6 align-middle sticky left-0 z-10 border-b',
                                              pinnedHasDivider && 'border-r',
                                              isSelected
                                                ? '!bg-muted'
                                                : (onRowClick || selectOnRowClick || hasPinned)
                                                  ? 'group-hover:!bg-muted !bg-background'
                                                  : '!bg-background',
                                              resolvedPinnedColumn?.cellClassName
                                            )}
                                            style={{
                                              boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
                                              width: pinnedWidth,
                                              minWidth: pinnedWidth,
                                              maxWidth: pinnedWidth,
                                              height: rowHeight,
                                            }}
                                          >
                                            {resolvedPinnedColumn.renderCell(row, isSelected, () =>
                                              handleToggleRow(rowId)
                                            )}
                                          </TableCell>
                                        )}
                                        {filteredColumnOrder.map((columnId) => {
                                          const column = columns.find((col) => col.id === columnId);
                                          if (!column) return null;

                                          const isLastColumn = columnId === filteredColumnOrder[filteredColumnOrder.length - 1];
                                          return (
                                            <TableCell
                                              key={columnId}
                                              className={cn(
                                                '!px-6 align-middle border-b',
                                                isSelected ? '!bg-muted' : 'group-hover:!bg-muted',
                                                column.width?.class || 'min-w-[130px]',
                                                isLastColumn && showLastColumnDivider === true && 'sticky right-0 z-10 bg-background border-l'
                                              )}
                                              style={{
                                                height: rowHeight,
                                                ...(isLastColumn && showLastColumnDivider === true && {
                                                  boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                                                }),
                                              }}
                                            >
                                              {column.renderCell ? (
                                                column.renderCell(row, isSelected)
                                              ) : (
                                                <div className="flex items-center w-full min-w-0">
                                                  <CellTextWithTooltip text={String(row[column.id] ?? '')} />
                                                </div>
                                              )}
                                            </TableCell>
                                          );
                                        })}
                                      </SortableTableRow>
                                    );
                                  })}
                                  {fixedBottomRows.map((row) => {
                                    const rowId = getRowId(row);
                                    const isSelected = selectedRowIds.has(rowId);

                                    return (
                                      <TableRow
                                        key={rowId}
                                        data-row-id={rowId}
                                        role={onRowClick || selectOnRowClick ? 'button' : undefined}
                                        tabIndex={onRowClick || selectOnRowClick ? 0 : undefined}
                                        aria-label={onRowClick ? `Open ${rowId}` : selectOnRowClick ? `Select ${rowId}` : undefined}
                                        onClick={(e) => {
                                          if (selectOnRowClick && enableRowSelection) {
                                            handleToggleRow(rowId);
                                          }
                                          if (onRowClick) {
                                            onRowClick(row, e);
                                          }
                                        }}
                                        className={cn(
                                          isSelected && '!bg-muted',
                                          'group',
                                          (onRowClick || selectOnRowClick || hasPinned) && 'cursor-pointer',
                                          '[&:hover_td]:bg-muted',
                                          '!transition-none'
                                        )}
                                        style={{
                                          height: rowHeight,
                                          ...(isSelected ? { backgroundColor: 'hsl(var(--muted))' } : {}),
                                        }}
                                      >
                                        {hasPinned && resolvedPinnedColumn && (
                                          <TableCell
                                            className={cn(
                                              '!px-6 align-middle sticky left-0 z-10 border-b',
                                              pinnedHasDivider && 'border-r',
                                              isSelected
                                                ? '!bg-muted'
                                                : (onRowClick || selectOnRowClick || hasPinned)
                                                  ? 'group-hover:!bg-muted !bg-background'
                                                  : '!bg-background',
                                              resolvedPinnedColumn?.cellClassName
                                            )}
                                            style={{
                                              boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
                                              width: pinnedWidth,
                                              minWidth: pinnedWidth,
                                              maxWidth: pinnedWidth,
                                              height: rowHeight,
                                            }}
                                          >
                                            {resolvedPinnedColumn.renderCell(row, isSelected, () =>
                                              handleToggleRow(rowId)
                                            )}
                                          </TableCell>
                                        )}
                                        {filteredColumnOrder.map((columnId) => {
                                          const column = columns.find((col) => col.id === columnId);
                                          if (!column) return null;

                                          const isLastColumn = columnId === filteredColumnOrder[filteredColumnOrder.length - 1];
                                          return (
                                            <TableCell
                                              key={columnId}
                                              className={cn(
                                                '!px-6 align-middle border-b',
                                                isSelected ? '!bg-muted' : 'group-hover:!bg-muted',
                                                column.width?.class || 'min-w-[130px]',
                                                isLastColumn && showLastColumnDivider === true && 'sticky right-0 z-10 bg-background border-l'
                                              )}
                                              style={{
                                                height: rowHeight,
                                                ...(isLastColumn && showLastColumnDivider === true && {
                                                  boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                                                }),
                                              }}
                                            >
                                              {column.renderCell ? (
                                                column.renderCell(row, isSelected)
                                              ) : (
                                                <div className="flex items-center w-full min-w-0">
                                                  <CellTextWithTooltip text={String(row[column.id] ?? '')} />
                                                </div>
                                              )}
                                            </TableCell>
                                          );
                                        })}
                                      </TableRow>
                                    );
                                  })}
                                </>
                              ) : (
                                paginatedData.map((row) => {
                                  const rowId = getRowId(row);
                                  const isSelected = selectedRowIds.has(rowId);

                                  return (
                                    <TableRow
                                      key={rowId}
                                      data-row-id={rowId}
                                      role={onRowClick || selectOnRowClick ? 'button' : undefined}
                                      tabIndex={onRowClick || selectOnRowClick ? 0 : undefined}
                                      aria-label={onRowClick ? `Open ${rowId}` : selectOnRowClick ? `Select ${rowId}` : undefined}
                                      onClick={(e) => {
                                        if (selectOnRowClick && enableRowSelection) {
                                          handleToggleRow(rowId);
                                        }
                                        if (onRowClick) {
                                          onRowClick(row, e);
                                        }
                                      }}
                                      onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(row, e) : undefined}
                                      className={cn(
                                        isSelected && '!bg-muted',
                                        'group',
                                        (onRowClick || hasPinned || selectOnRowClick) && 'cursor-pointer',
                                        '[&:hover_td]:bg-muted',
                                        '!transition-none',
                                        getRowClassName?.(row)
                                      )}
                                      style={{
                                        height: getRowHeight ? getRowHeight(row) : rowHeight,
                                        ...(isSelected ? { backgroundColor: 'hsl(var(--muted))' } : {}),
                                      }}
                                    >
                                      {hasPinned && resolvedPinnedColumn && (
                                        <TableCell
                                          className={cn(
                                            '!px-6 align-middle sticky left-0 z-10 border-b',
                                            pinnedHasDivider && 'border-r',
                                            isSelected
                                              ? '!bg-muted'
                                              : (onRowClick || selectOnRowClick || hasPinned)
                                                ? 'group-hover:!bg-muted !bg-background'
                                                : '!bg-background',
                                            resolvedPinnedColumn?.cellClassName
                                          )}
                                          style={{
                                            boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
                                            width: pinnedWidth,
                                            minWidth: pinnedWidth,
                                            maxWidth: pinnedWidth,
                                            height: rowHeight,
                                          }}
                                        >
                                          {resolvedPinnedColumn.renderCell(row, isSelected, () =>
                                            handleToggleRow(rowId)
                                          )}
                                        </TableCell>
                                      )}
                                      {filteredColumnOrder.map((columnId) => {
                                        const column = columns.find((col) => col.id === columnId);
                                        if (!column) return null;

                                        const isLastColumn = columnId === filteredColumnOrder[filteredColumnOrder.length - 1];
                                        return (
                                          <TableCell
                                            key={columnId}
                                            className={cn(
                                              '!px-6 align-middle border-b',
                                              isSelected ? '!bg-muted' : 'group-hover:!bg-muted',
                                              column.width?.class || 'min-w-[130px]',
                                              isLastColumn && showLastColumnDivider === true && 'sticky right-0 z-10 bg-background border-l'
                                            )}
                                            style={{
                                              height: rowHeight,
                                              ...(isLastColumn && showLastColumnDivider === true && {
                                                boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                                              }),
                                            }}
                                          >
                                            {column.renderCell ? (
                                              column.renderCell(row, isSelected)
                                            ) : (
                                              <div className="flex items-center w-full min-w-0">
                                                <CellTextWithTooltip text={String(row[column.id] ?? '')} />
                                              </div>
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                    </TableRow>
                                  );
                                })
                              )
                            )}
                          </TableBody>
                        </table>
                      </SortableContext>
                      <DragOverlay dropAnimation={null}>
                        {activeId ? (
                          <table className="table-fixed border-separate border-spacing-0 w-full" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <TableBody>
                              {(() => {
                                const row = draggableRows.find((item) => getRowId(item) === activeId);
                                if (!row) return null;

                                return (
                                  <TableRow
                                    className="border rounded-lg shadow-lg !bg-muted"
                                    style={{ height: rowHeight }}
                                  >
                                    {hasPinned && resolvedPinnedColumn && (
                                      <TableCell
                                        className={cn(
                                          '!px-6 !py-0 !bg-muted',
                                          pinnedHasDivider && 'border-r',
                                          compactMode && '!text-xs',
                                          resolvedPinnedColumn?.cellClassName
                                        )}
                                        style={{
                                          height: rowHeight,
                                          width: pinnedWidth,
                                          minWidth: pinnedWidth,
                                          maxWidth: pinnedWidth,
                                        }}
                                      >
                                        {resolvedPinnedColumn.renderCell(row, true, () =>
                                          handleToggleRow(getRowId(row))
                                        )}
                                      </TableCell>
                                    )}
                                    {filteredColumnOrder.map((columnId) => {
                                      const column = columns.find((col) => col.id === columnId);
                                      if (!column) return null;

                                      return (
                                        <TableCell
                                          key={columnId}
                                          className={cn(
                                            '!px-6 !py-0 !bg-muted',
                                            column.width?.class || 'w-[130px]',
                                            compactMode && '!text-xs'
                                          )}
                                          style={{
                                            height: rowHeight,
                                            width: column.width?.pixel || '130px',
                                            minWidth: column.width?.pixel || '130px',
                                            maxWidth: column.width?.pixel || '130px',
                                          }}
                                        >
                                          {column.renderCell ? (
                                            column.renderCell(row, true)
                                          ) : (
                                            <div className="flex items-center w-full min-w-0">
                                              <CellTextWithTooltip text={String(row[column.id] ?? '')} />
                                            </div>
                                          )}
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                );
                              })()}
                            </TableBody>
                          </table>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <table
                      className="table-fixed border-separate border-spacing-0 w-full"
                      style={{ tableLayout: 'fixed', width: '100%' }}
                    >
                      <colgroup>
                        {hasPinned && (
                          <col
                            style={{
                              width: pinnedWidth,
                              minWidth: pinnedWidth,
                              maxWidth: pinnedWidth,
                            }}
                          />
                        )}
                        {filteredColumnOrder.map((columnId) => {
                          const column = columns.find((col) => col.id === columnId);
                          return (
                            <col
                              key={columnId}
                              style={{
                                width: column?.width?.pixel || '130px',
                                minWidth: column?.width?.pixel || '130px',
                                maxWidth: column?.width?.pixel || '130px',
                              }}
                            />
                          );
                        })}
                      </colgroup>
                      <TableHeader className={cn('!bg-background')}>
                        <TableRow className="hover:bg-transparent h-10">
                          {hasPinned && (
                            <TableHead
                              className={cn(
                                '!px-6 !py-0 h-10 !bg-background',
                                pinnedHasDivider && 'border-r',
                                'border-b',
                                gridPadding && 'border-t-0',
                                resolvedPinnedColumn?.headerClassName
                              )}
                              style={{
                                position: 'sticky',
                                left: 0,
                                top: 0,
                                zIndex: 30,
                                backgroundColor: 'hsl(var(--background))',
                                boxShadow: !compactMode
                                  ? '2px 0 4px -2px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
                                  : '2px 0 4px -2px rgba(0,0,0,0.1)',
                                width: pinnedWidth,
                                minWidth: pinnedWidth,
                                maxWidth: pinnedWidth,
                              }}
                            >
                              {resolvedPinnedColumn?.renderHeader ? (
                                resolvedPinnedColumn.renderHeader({
                                  isSorted: sortColumn === resolvedPinnedColumn.id,
                                  isAscending:
                                    sortColumn === resolvedPinnedColumn.id && sortDirection === 'asc',
                                  isDescending:
                                    sortColumn === resolvedPinnedColumn.id && sortDirection === 'desc',
                                  onSort: (dir) => handleSort(resolvedPinnedColumn.id, dir),
                                  isAllSelected,
                                  onToggleAll: handleToggleAll,
                                  enableRowSelection: enableRowSelection || false,
                                })
                              ) : enableRowSelection ? (
                                <div className="flex items-center gap-3 h-full w-full">
                                  <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleToggleAll}
                                    aria-label="Select all"
                                  />
                                </div>
                              ) : null}
                            </TableHead>
                          )}
                          {filteredColumnOrder.map((columnId, index) => {
                            const column = columns.find((col) => col.id === columnId);
                            if (!column) return null;
                            const isLastColumn = index === filteredColumnOrder.length - 1;
                            if (isLastColumn && showLastColumnDivider === true) {
                              const currentIndex = columnOrder.indexOf(column.id);
                              const isFirst = currentIndex === 0;
                              const isLast = currentIndex === columnOrder.length - 1;
                              const isSorted = sortColumn === column.id;
                              const isAscending = isSorted && sortDirection === 'asc';
                              const isDescending = isSorted && sortDirection === 'desc';

                              if (column.renderHeader) {
                                return (
                                  <TableHead
                                    key={column.id}
                                    className={cn(
                                      '!px-6 !py-0 h-10 !bg-background sticky right-0 z-20',
                                      gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
                                      'border-l',
                                      column.width?.class || 'min-w-[130px]'
                                    )}
                                    style={{
                                      top: 0,
                                      backgroundColor: 'hsl(var(--background))',
                                      boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                                    }}
                                  >
                                    {column.renderHeader({
                                      isSorted,
                                      isAscending,
                                      isDescending,
                                      onSort: (direction) => handleSort(column.id, direction),
                                      onMoveColumn: (direction) => handleMoveColumn(column.id, direction),
                                      canMoveLeft: !isFirst,
                                      canMoveRight: !isLast,
                                      isAllSelected,
                                      onToggleAll: handleToggleAll,
                                      enableRowSelection: enableRowSelection || false,
                                    })}
                                  </TableHead>
                                );
                              }

                              const headerWidth = column.width?.pixel || '130px';
                              const headerButton = (
                                <Button
                                  variant="ghost"
                                  className="flex items-center gap-2 h-full w-full justify-start rounded-none px-0 hover:bg-transparent"
                                >
                                  <span className="flex items-center gap-2 text-xs uppercase text-muted-foreground px-2 py-1">
                                    {column.icon && <div className="text-muted-foreground">{column.icon}</div>}
                                    {column.label}
                                  </span>
                                  {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
                                  {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
                                </Button>
                              );

                              return (
                                <TableHead
                                  key={column.id}
                                  className={cn(
                                    '!px-6 !py-0 h-10 !bg-background sticky right-0 z-20',
                                    gridPadding ? 'border-b' : compactMode ? 'border-t border-b' : 'border-b',
                                    'border-l',
                                    column.width?.class || 'min-w-[130px]'
                                  )}
                                  style={{
                                    top: 0,
                                    backgroundColor: 'hsl(var(--background))',
                                    boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                                  }}
                                >
                                  <DropdownMenu>
                                    {column.tooltip ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <DropdownMenuTrigger asChild>
                                            {headerButton}
                                          </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          className="whitespace-normal break-words text-left"
                                          style={{ maxWidth: headerWidth }}
                                        >
                                          {column.tooltip}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <DropdownMenuTrigger asChild>
                                        {headerButton}
                                      </DropdownMenuTrigger>
                                    )}
                                    <DropdownMenuContent align="start">
                                      {column.sortable !== false && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => handleSort(column.id, 'asc')}
                                            className={cn(isAscending && 'bg-accent')}
                                          >
                                            <ArrowUpNarrowWide className="size-4 mr-2" />
                                            <span className="flex-1">Sort ascending</span>
                                            {isAscending && <Check className="ml-2 size-4" />}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleSort(column.id, 'desc')}
                                            className={cn(isDescending && 'bg-accent')}
                                          >
                                            <ArrowDownWideNarrow className="size-4 mr-2" />
                                            <span className="flex-1">Sort descending</span>
                                            {isDescending && <Check className="ml-2 size-4" />}
                                          </DropdownMenuItem>
                                          {isSorted && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem onClick={() => {
                                                setSortColumn(null);
                                                setSortDirection(null);
                                              }}>
                                                <X className="size-4 mr-2" />
                                                <span>Clear sort</span>
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableHead>
                              );
                            }
                            return renderColumnHeader(column);
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody ref={tableBodyRef}>
                        {paginatedData.map((row) => {
                          const rowId = getRowId(row);
                          const isSelected = selectedRowIds.has(rowId);

                          return (
                            <TableRow
                              key={rowId}
                              data-row-id={rowId}
                              role={onRowClick || selectOnRowClick ? 'button' : undefined}
                              tabIndex={onRowClick || selectOnRowClick ? 0 : undefined}
                              aria-label={onRowClick ? `Open ${rowId}` : selectOnRowClick ? `Select ${rowId}` : undefined}
                              onClick={(e) => {
                                if (selectOnRowClick && enableRowSelection) {
                                  handleToggleRow(rowId);
                                }
                                if (onRowClick) {
                                  onRowClick(row, e);
                                }
                              }}
                              onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(row, e) : undefined}
                              className={cn(
                                isSelected && '!bg-muted',
                                'group',
                                (onRowClick || selectOnRowClick || hasPinned) && 'cursor-pointer',
                                '[&:hover_td]:bg-muted',
                                '!transition-none',
                                getRowClassName?.(row)
                              )}
                              style={{
                                height: getRowHeight ? getRowHeight(row) : rowHeight,
                                ...(isSelected ? { backgroundColor: 'hsl(var(--muted))' } : {}),
                              }}
                            >
                              {hasPinned && resolvedPinnedColumn && (
                                <TableCell
                                  className={cn(
                                    '!px-6 align-middle sticky left-0 z-10 border-b',
                                    pinnedHasDivider && 'border-r',
                                    isSelected
                                      ? '!bg-muted'
                                      : (onRowClick || selectOnRowClick || hasPinned)
                                        ? 'group-hover:!bg-muted !bg-background'
                                        : '!bg-background',
                                    resolvedPinnedColumn?.cellClassName
                                  )}
                                  style={{
                                    boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
                                    width: pinnedWidth,
                                    minWidth: pinnedWidth,
                                    maxWidth: pinnedWidth,
                                    height: rowHeight,
                                  }}
                                >
                                  {resolvedPinnedColumn.renderCell(row, isSelected, () =>
                                    handleToggleRow(rowId)
                                  )}
                                </TableCell>
                              )}
                              {filteredColumnOrder.map((columnId) => {
                                const column = columns.find((col) => col.id === columnId);
                                if (!column) return null;

                                const isLastColumn = columnId === filteredColumnOrder[filteredColumnOrder.length - 1];
                                return (
                                  <TableCell
                                    key={columnId}
                                    className={cn(
                                      '!px-6 align-middle border-b',
                                      isSelected ? '!bg-muted' : 'group-hover:!bg-muted',
                                      column.width?.class || 'min-w-[130px]',
                                      isLastColumn && showLastColumnDivider === true && 'sticky right-0 z-10 bg-background border-l'
                                    )}
                                    style={{
                                      height: rowHeight,
                                      ...(isLastColumn && showLastColumnDivider === true && {
                                        boxShadow: '-2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                                      }),
                                    }}
                                  >
                                    {column.renderCell ? (
                                      column.renderCell(row, isSelected)
                                    ) : (
                                      <div className="flex items-center w-full min-w-0">
                                        <CellTextWithTooltip text={String(row[column.id] ?? '')} />
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </table>
                  )
                );
              })()}
            </div>
            {showPagination && (
              <div
                className={cn(
                  'w-full border-t bg-background flex items-center justify-start flex-shrink-0 rounded-b-lg',
                  (compactMode || compactPagination) ? 'px-4 gap-2' : 'px-4 gap-4'
                )}
                style={{ height: (compactMode || compactPagination) ? '36px' : rowHeight }}
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className={cn((compactMode || compactPagination) && 'h-7 w-7')}
                  >
                    <ChevronLeft className={cn('text-foreground', (compactMode || compactPagination) ? 'size-3' : 'size-4')} />
                  </Button>
                  <DropdownMenu
                    onOpenChange={(open) => {
                      // Measure width when dropdown opens
                      if (open && pageDropdownTriggerRef.current) {
                        requestAnimationFrame(() => {
                          if (pageDropdownTriggerRef.current) {
                            setPageDropdownWidth(pageDropdownTriggerRef.current.offsetWidth);
                          }
                        });
                      }
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        ref={handlePageDropdownTriggerRef}
                        variant="outline"
                        className={cn('px-2 gap-1.5', (compactMode || compactPagination) ? 'h-7 text-xs' : 'h-9')}
                      >
                        <span className={cn((compactMode || compactPagination) && 'text-xs')}>{currentPage}</span>
                        <ChevronDown
                          className={cn('text-foreground', (compactMode || compactPagination) ? 'size-3' : 'size-4')}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className={cn(
                        'overflow-y-auto',
                        (compactMode || compactPagination) ? 'max-h-[200px] text-xs' : 'max-h-[300px]'
                      )}
                      style={
                        pageDropdownWidth
                          ? { width: `${pageDropdownWidth}px`, minWidth: `${pageDropdownWidth}px` }
                          : undefined
                      }
                    >
                      <DropdownMenuRadioGroup
                        value={currentPage.toString()}
                        onValueChange={(value) => setCurrentPage(Number(value))}
                      >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <DropdownMenuRadioItem
                            key={page}
                            value={page.toString()}
                            className={cn(
                              currentPage === page && 'bg-accent',
                              (compactMode || compactPagination) && 'text-xs py-1.5'
                            )}
                          >
                            <span className="flex-1">{page}</span>
                            {currentPage === page && (
                              <Check className={cn('size-4', (compactMode || compactPagination) && 'size-3')} />
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    aria-label="Next page"
                    className={cn((compactMode || compactPagination) && 'h-7 w-7')}
                  >
                    <ChevronRight
                      className={cn('text-foreground', (compactMode || compactPagination) ? 'size-3' : 'size-4')}
                    />
                  </Button>
                </div>
                <div className={cn('text-foreground', (compactMode || compactPagination) ? 'text-xs' : 'text-sm')}>
                  {sortedData.length > 0
                    ? `${startIndex + 1}-${Math.min(endIndex, sortedData.length)} of ${sortedData.length}`
                    : '0 of 0'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {enableEditColumns && (
        <EditColumnsSidebar
          open={isEditColumnsOpen}
          onOpenChange={setIsEditColumnsOpen}
          gridKey={gridKey}
          columns={columns
            .filter((col) => {
              // Exclude the first column (pinned column) from edit columns
              if (firstColumnId && col.id === firstColumnId) {
                return false;
              }
              // Also exclude any pinned columns
              if (pinnedColumns && pinnedColumns.includes(col.id)) {
                return false;
              }
              return true;
            })
            .map((col) => ({
              id: col.id,
              label: col.label,
              icon: col.icon,
            }))}
          visibleColumns={Array.from(visibleColumns)}
          columnOrder={columnOrder}
          pinnedColumns={pinnedColumns}
          onColumnsChange={handleColumnsChange}
        />
      )}
    </div>
  );
}
