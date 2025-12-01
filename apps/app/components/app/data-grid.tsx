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
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/csv-export';
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
  Settings,
} from 'lucide-react';

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
};

export type DataGridProps<T = any> = {
  data: T[];
  columns: ColumnDefinition<T>[];
  getRowId: (row: T) => string;
  gridKey: string;
  title?: string;
  subtitle?: string | ((filteredCount: number) => string);
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
  onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowKeyDown?: (row: T, event: React.KeyboardEvent<HTMLTableRowElement>) => void;
  selectedRowIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  pinnedColumns?: string[];
  defaultColumnOrder?: string[];
  defaultVisibleColumns?: string[];
  customActions?: React.ReactNode;
  selectionActions?: React.ReactNode;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  rowHeight?: string;
  stickyFirstColumn?: boolean;
  firstColumnWidth?: string;
  firstColumnId?: string;
  renderFirstColumn?: (row: T, isSelected: boolean) => React.ReactNode;
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

const CellTextWithTooltip = ({ text }: { text: string }) => {
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

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  getRowId,
  gridKey,
  title,
  subtitle,
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
  onRowClick,
  onRowKeyDown,
  selectedRowIds: controlledSelectedRowIds,
  onSelectionChange,
  pinnedColumns = [],
  defaultColumnOrder,
  defaultVisibleColumns,
  customActions,
  selectionActions,
  emptyMessage = 'No items found.',
  emptyState,
  rowHeight = '54px',
  stickyFirstColumn = false,
  firstColumnWidth = '350px',
  firstColumnId,
  renderFirstColumn,
  renderFirstColumnHeader,
  compactMode = false,
  showPagination = true,
  tableWrapperClassName,
  disableLoadingOverlay = false,
}: DataGridProps<T>) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState<boolean>(false);
  const [filterValues, setFilterValues] = useState<Record<string, string | null>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(
    defaultColumnOrder || columns.map((col) => col.id)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(defaultVisibleColumns || columns.map((col) => col.id))
  );
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(enableEditColumns);
  const [pagesFullySelected, setPagesFullySelected] = useState<Set<number>>(new Set());
  const filtersInitializedRef = useRef(false);
  const previousFiltersRef = useRef<string>('');
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const pageDropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [pageDropdownWidth, setPageDropdownWidth] = useState<number | undefined>(undefined);
  const [overlayHeight, setOverlayHeight] = useState<number | undefined>(undefined);

  const handlePageDropdownTriggerRef = (node: HTMLButtonElement | null) => {
    pageDropdownTriggerRef.current = node;
    if (node) {
      setPageDropdownWidth(node.offsetWidth);
    }
  };

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
            return rowValue.split(',').includes(filterValue);
          }
          return rowValue === filterValue;
        });
      }
    });

    return result;
  }, [data, searchQuery, filterValues, filters, enableSearch, searchFields]);

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

  // Show loading overlay when page changes
  useEffect(() => {
    if (disableLoadingOverlay) {
      return;
    }
    setIsPageLoading(true);
    const timeoutId = setTimeout(() => {
      setIsPageLoading(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [currentPage, disableLoadingOverlay]);

  // Calculate overlay height when loading starts
  useEffect(() => {
    if (isPageLoading && scrollableContainerRef.current) {
      setOverlayHeight(scrollableContainerRef.current.clientHeight);
    }
  }, [isPageLoading]);

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
      if (scrollableContainerRef.current && isPageLoading) {
        setOverlayHeight(scrollableContainerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPageLoading]);

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

  const filteredColumnOrder = columnOrder.filter((colId) => visibleColumns.has(colId));

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
    return pagesFullySelected.has(currentPage);
  }, [enableRowSelection, paginatedData.length, pagesFullySelected, currentPage]);

  const isIndeterminate = useMemo(() => {
    if (!enableRowSelection || paginatedData.length === 0) {
      return false;
    }
    const hasSomeSelected = paginatedData.some((row) => selectedRowIds.has(getRowId(row)));
    return hasSomeSelected && !isAllSelected;
  }, [enableRowSelection, paginatedData, selectedRowIds, isAllSelected, getRowId]);

  const handleToggleAll = () => {
    if (!enableRowSelection) return;

    const pageIds = paginatedData.map((row) => getRowId(row));

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
      // Select all items on current page
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
            compactMode ? 'border-t border-b' : 'border-b',
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
          })}
        </TableHead>
      );
    }

    const headerContent = (
      <div className="flex items-center gap-2 cursor-pointer h-full w-full">
        {column.icon && <div className="text-muted-foreground">{column.icon}</div>}
        <span className="text-xs uppercase text-muted-foreground">{column.label}</span>
        {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
        {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
      </div>
    );

    const headerWidth = column.width?.pixel || '130px';

    return (
      <TableHead
        key={column.id}
        className={cn(
          '!px-6 !py-0 h-10 !bg-background',
          compactMode ? 'border-t border-b' : 'border-b',
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
          {column.tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>{headerContent}</DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                className="whitespace-normal break-words text-left"
                style={{ maxWidth: headerWidth }}
              >
                {column.tooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>{headerContent}</DropdownMenuTrigger>
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

  if (isInitializing && enableEditColumns) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8 text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col min-h-0',
        compactMode && '-mx-4 w-[calc(100%+2rem)]'
      )}
    >
      {!compactMode && (title || subtitle || customActions) && (
        <div className="w-full relative">
          <div className="px-4 flex items-center justify-between mb-2 mt-2">
            <div className="flex flex-col">
              {title && <h1 className="text-[22px] font-semibold">{title}</h1>}
              {subtitle && (
                <p className="text-sm text-foreground">
                  {typeof subtitle === 'function' ? subtitle(sortedData.length) : subtitle}
                </p>
              )}
            </div>
            {customActions && <div>{customActions}</div>}
          </div>
        </div>
      )}
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {!compactMode && (
          <div className="w-full px-4 py-3 border-b flex items-center justify-between gap-4 flex-shrink-0 relative">
            <div className="flex items-center gap-4 flex-1">
              {enableSearch && (
                <div className="relative w-[250px]">
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
            </div>
            {selectionActions && selectedRowIds.size > 0 && (
              <Card className="absolute left-2 top-2 z-40 bg-background border-border py-0 px-0 rounded-md">
                <div className="px-2 py-[5px]">
                  {selectionActions}
                </div>
              </Card>
            )}
            <div className="flex items-center gap-2">
              {filters.map((filter) => {
                const filterValue = filterValues[filter.id] || 'all';
                const selectedOption = filter.options.find((opt) => opt.value === filterValues[filter.id]);
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
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuRadioGroup
                        value={filterValue}
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
              {enableEditColumns && (
                <Button
                  variant="ghost"
                  onClick={() => setIsEditColumnsOpen(true)}
                  className="gap-2"
                  aria-label="Edit columns"
                >
                  <Settings className="size-4" />
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
          <div className="relative mb-4 px-4 pt-2 -mt-1">
            <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-9"
              aria-label="Search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        {compactMode && filters.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {filters.map((filter) => {
              const filterValue = filterValues[filter.id] || 'all';
              const selectedOption = filter.options.find((opt) => opt.value === filterValues[filter.id]);
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
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuRadioGroup
                      value={filterValue}
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
          ref={scrollableContainerRef}
          className={cn(
            'flex-1 relative',
            compactMode ? 'w-full' : '',
            paginatedData.length === 0 ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'
          )}
          style={{ paddingBottom: showPagination ? (compactMode ? '36px' : rowHeight) : '0px' }}
          onScroll={() => {
            if (scrollableContainerRef.current && isPageLoading) {
              setOverlayHeight(scrollableContainerRef.current.clientHeight);
            }
          }}
        >
          {paginatedData.length === 0 && (emptyState || emptyMessage) && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background">
              {emptyState || (
                <div className="text-sm text-muted-foreground text-center">
                  {emptyMessage}
                </div>
              )}
            </div>
          )}
          {!disableLoadingOverlay && isPageLoading && paginatedData.length > 0 && (
            <div
              className="sticky top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
              style={{
                height: overlayHeight ? `${overlayHeight}px` : '100%',
                minHeight: overlayHeight ? `${overlayHeight}px` : '100%',
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-8 text-primary" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </div>
          )}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            tbody tr:hover td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
            tbody tr[style*="background-color"] td:first-child {
              background-color: hsl(var(--muted)) !important;
            }
          `,
            }}
          />
          {paginatedData.length > 0 && (
            <table
              className="table-fixed border-separate border-spacing-0 w-full"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
            <colgroup>
              {stickyFirstColumn && (
                <col
                  style={{
                    width: firstColumnWidth,
                    minWidth: firstColumnWidth,
                    maxWidth: firstColumnWidth,
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
                {stickyFirstColumn && renderFirstColumn && (
                  <TableHead
                    className={cn('!px-6 !py-0 h-10 !bg-background', 'border-r border-b')}
                    style={{
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 30,
                      backgroundColor: 'hsl(var(--background))',
                      ...(!compactMode && {
                        boxShadow:
                          '2px 0 4px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                      }),
                      ...(compactMode && {
                        boxShadow: '2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                      }),
                      ...(stickyFirstColumn && {
                        width: firstColumnWidth,
                        minWidth: firstColumnWidth,
                        maxWidth: firstColumnWidth,
                      }),
                    }}
                  >
                    {renderFirstColumnHeader ? (
                      renderFirstColumnHeader({
                        isSorted:
                          sortColumn ===
                          (firstColumnId ||
                            columns.find((col) => col.id === filteredColumnOrder[0])?.id ||
                            null),
                        isAscending:
                          sortColumn ===
                            (firstColumnId ||
                              columns.find((col) => col.id === filteredColumnOrder[0])?.id ||
                              null) && sortDirection === 'asc',
                        isDescending:
                          sortColumn ===
                            (firstColumnId ||
                              columns.find((col) => col.id === filteredColumnOrder[0])?.id ||
                              null) && sortDirection === 'desc',
                        onSort: (direction) => {
                          const columnIdToSort =
                            firstColumnId ||
                            columns.find((col) => col.id === filteredColumnOrder[0])?.id;
                          if (columnIdToSort) {
                            handleSort(columnIdToSort, direction);
                          }
                        },
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
                {filteredColumnOrder.map((columnId) => {
                  const column = columns.find((col) => col.id === columnId);
                  if (!column) return null;
                  return renderColumnHeader(column);
                })}
              </TableRow>
            </TableHeader>
            <TableBody ref={tableBodyRef}>
              {paginatedData.length > 0 && (
                paginatedData.map((row) => {
                  const rowId = getRowId(row);
                  const isSelected = selectedRowIds.has(rowId);

                  return (
                    <TableRow
                      key={rowId}
                      data-row-id={rowId}
                      role={onRowClick ? 'button' : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      aria-label={onRowClick ? `Open ${rowId}` : undefined}
                      onClick={onRowClick ? (e) => onRowClick(row, e) : undefined}
                      onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(row, e) : undefined}
                      className={cn(
                        isSelected && '!bg-muted',
                        onRowClick && 'cursor-pointer group',
                        '[&:hover_td]:bg-muted',
                        '!transition-none'
                      )}
                      style={{
                        height: rowHeight,
                        ...(isSelected ? { backgroundColor: 'hsl(var(--muted))' } : {}),
                      }}
                    >
                      {stickyFirstColumn && renderFirstColumn && (
                        <TableCell
                          className={cn(
                            '!px-6 align-middle sticky left-0 z-10 border-r border-b',
                            isSelected ? '!bg-muted' : 'group-hover:!bg-muted !bg-background'
                          )}
                          style={{
                            boxShadow: '2px 0 4px -2px rgba(0, 0, 0, 0.1)',
                            width: firstColumnWidth,
                            minWidth: firstColumnWidth,
                            maxWidth: firstColumnWidth,
                            height: rowHeight,
                          }}
                        >
                          {renderFirstColumn(row, isSelected)}
                        </TableCell>
                      )}
                      {filteredColumnOrder.map((columnId) => {
                        const column = columns.find((col) => col.id === columnId);
                        if (!column) return null;

                        return (
                          <TableCell
                            key={columnId}
                            className={cn(
                              '!px-6 align-middle border-b',
                              isSelected ? '!bg-muted' : 'group-hover:!bg-muted',
                              column.width?.class || 'min-w-[130px]'
                            )}
                            style={{ height: rowHeight }}
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
              )}
            </TableBody>
          </table>
          )}
        </div>
        {showPagination && (
          <div
            className={cn(
              'w-full border-t bg-background flex items-center justify-start flex-shrink-0',
              compactMode ? 'px-4 gap-2' : 'px-4 gap-4'
            )}
            style={{ height: compactMode ? '36px' : rowHeight }}
          >
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className={cn(compactMode && 'h-7 w-7')}
              >
                <ChevronLeft className={cn('text-foreground', compactMode ? 'size-3' : 'size-4')} />
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
                    className={cn('px-2 gap-1.5', compactMode ? 'h-7 text-xs' : 'h-9')}
                  >
                    <span className={cn(compactMode && 'text-xs')}>{currentPage}</span>
                    <ChevronDown
                      className={cn('text-foreground', compactMode ? 'size-3' : 'size-4')}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className={cn(
                    'overflow-y-auto',
                    compactMode ? 'max-h-[200px] text-xs' : 'max-h-[300px]'
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
                          compactMode && 'text-xs py-1.5'
                        )}
                      >
                        <span className="flex-1">{page}</span>
                        {currentPage === page && (
                          <Check className={cn('size-4', compactMode && 'size-3')} />
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
                className={cn(compactMode && 'h-7 w-7')}
              >
                <ChevronRight
                  className={cn('text-foreground', compactMode ? 'size-3' : 'size-4')}
                />
              </Button>
            </div>
            <div className={cn('text-foreground', compactMode ? 'text-xs' : 'text-sm')}>
              {sortedData.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, sortedData.length)} of ${sortedData.length}`
                : '0 of 0'}
            </div>
          </div>
        )}
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
