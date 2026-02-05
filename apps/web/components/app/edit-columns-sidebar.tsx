'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Columns4 } from 'lucide-react';
import { SidePanel } from './side-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, ColumnDefinition } from './data-grid';

type ColumnDefinitionInput = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type EditColumnsSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridKey: string;
  columns: ColumnDefinitionInput[];
  visibleColumns: string[];
  columnOrder: string[];
  pinnedColumns?: string[];
  onColumnsChange: (visibleColumns: string[], columnOrder: string[]) => void;
};

type ColumnRow = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isVisible: boolean;
};

const SortableColumnCell = ({
  row,
  isVisible,
  onToggle,
}: {
  row: ColumnRow;
  isVisible: boolean;
  onToggle: (columnId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDragKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
    }
  };

  const handleToggle = () => {
    onToggle(row.id);
  };

  return (
    <div className="flex items-center w-full" style={style}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center justify-center w-[24px]"
        role="button"
        tabIndex={0}
        aria-label={`Drag to reorder ${row.label}`}
        onKeyDown={handleDragKeyDown}
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 pl-3">
        <Checkbox
          checked={isVisible}
          onCheckedChange={handleToggle}
          aria-label={`Toggle ${row.label} column`}
        />
        <div className="flex items-center gap-2">
          {row.icon && <span className="text-muted-foreground">{row.icon}</span>}
          <span className="text-sm">{row.label}</span>
        </div>
      </div>
    </div>
  );
};

export const EditColumnsSidebar = ({
  open,
  onOpenChange,
  gridKey,
  columns,
  visibleColumns,
  columnOrder,
  pinnedColumns = [],
  onColumnsChange,
}: EditColumnsSidebarProps) => {
  // Helper to merge columnOrder with all available columns
  const mergeColumnOrder = useCallback(
    (order: string[]): string[] => {
      // If no columns available, return empty array
      if (!columns || columns.length === 0) {
        return [];
      }
      const allColumnIds = columns.map((col) => col.id);
      const orderSet = new Set(order);
      // Start with columns in order, then add any missing columns
      const merged = [...order.filter((id) => allColumnIds.includes(id))];
      allColumnIds.forEach((id) => {
        if (!orderSet.has(id)) {
          merged.push(id);
        }
      });
      return merged;
    },
    [columns]
  );

  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<string>>(
    new Set(visibleColumns)
  );
  // Always initialize with all columns from the columns prop, merging with columnOrder for ordering
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(() => {
    if (columns.length === 0) return [];
    return mergeColumnOrder(columnOrder);
  });

  // Track if we're initializing to avoid calling onColumnsChange during initialization
  const isInitializingRef = useRef(true);

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

  useEffect(() => {
    if (open) {
      isInitializingRef.current = true;
      setLocalVisibleColumns(new Set(visibleColumns));
      // Always ensure we have all columns in the order
      const mergedOrder = mergeColumnOrder(columnOrder);
      setLocalColumnOrder(mergedOrder);
      // Mark initialization as complete after a brief delay to allow state updates to settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isInitializingRef.current = false;
        });
      });
    } else {
      isInitializingRef.current = true;
    }
  }, [open, visibleColumns, columnOrder, mergeColumnOrder]);

  // Also update order when columns prop changes to ensure all columns are included
  useEffect(() => {
    if (open && columns.length > 0) {
      setLocalColumnOrder((prevOrder) => mergeColumnOrder(prevOrder));
    }
  }, [open, columns, mergeColumnOrder]);

  // Always use all columns from the hardcoded columns prop (column definitions)
  // Exclude pinned columns as they can't be edited
  const filteredColumns = useMemo(() => {
    return columns.filter((col) => !pinnedColumns.includes(col.id));
  }, [columns, pinnedColumns]);

  const sortedColumns = useMemo(() => {
    // Always show ALL columns from the columns prop (hardcoded definitions)
    // Ensure we have a valid order that includes all columns
    const completeOrder = mergeColumnOrder(localColumnOrder);

    // Sort all columns by their order in completeOrder
    const sorted = [...filteredColumns].sort((a, b) => {
      const aIndex = completeOrder.indexOf(a.id);
      const bIndex = completeOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Separate visible and hidden, but maintain order
    // Visible columns first (in saved order), then hidden columns (in saved order)
    const visible = sorted.filter((col) => localVisibleColumns.has(col.id));
    const hidden = sorted.filter((col) => !localVisibleColumns.has(col.id));

    // Return visible first, then hidden (both already sorted by saved order)
    // This ensures ALL columns from the prop are always shown
    return [...visible, ...hidden];
  }, [filteredColumns, localVisibleColumns, localColumnOrder, mergeColumnOrder]);

  const dataRows: ColumnRow[] = useMemo(() => {
    // sortedColumns always contains all columns from the columns prop
    // Map them to rows with their visibility state
    return sortedColumns.map((col) => ({
      id: col.id,
      label: col.label,
      icon: col.icon,
      isVisible: localVisibleColumns.has(col.id),
    }));
  }, [sortedColumns, localVisibleColumns]);

  const saveToLocalStorage = useCallback(
    (visible: string[], order: string[]) => {
      try {
        const preferences = JSON.parse(localStorage.getItem('column_preferences') || '{}');
        // Save only the ordered visible columns
        const orderedVisibleColumns = order.filter((id) => visible.includes(id));
        preferences[gridKey] = orderedVisibleColumns;
        localStorage.setItem('column_preferences', JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      }
    },
    [gridKey]
  );

  // Track previous values to detect actual changes (not initialization)
  const prevVisibleColumnsRef = useRef<Set<string>>(new Set());
  const prevColumnOrderRef = useRef<string[]>([]);

  // Sync changes to parent component and localStorage (but not during initialization)
  useEffect(() => {
    if (!open || isInitializingRef.current) {
      // Update refs even during initialization so we can detect changes later
      prevVisibleColumnsRef.current = new Set(localVisibleColumns);
      prevColumnOrderRef.current = [...localColumnOrder];
      return;
    }

    // Check if values actually changed
    const visibleChanged =
      prevVisibleColumnsRef.current.size !== localVisibleColumns.size ||
      Array.from(prevVisibleColumnsRef.current).some(id => !localVisibleColumns.has(id)) ||
      Array.from(localVisibleColumns).some(id => !prevVisibleColumnsRef.current.has(id));

    const orderChanged =
      prevColumnOrderRef.current.length !== localColumnOrder.length ||
      prevColumnOrderRef.current.some((id, index) => id !== localColumnOrder[index]);

    if (visibleChanged || orderChanged) {
      const newVisibleColumns = Array.from(localVisibleColumns);
      const newOrder = localColumnOrder;

      onColumnsChange(newVisibleColumns, newOrder);
      saveToLocalStorage(newVisibleColumns, newOrder);

      // Update refs
      prevVisibleColumnsRef.current = new Set(localVisibleColumns);
      prevColumnOrderRef.current = [...localColumnOrder];
    }
  }, [localVisibleColumns, localColumnOrder, open, onColumnsChange, saveToLocalStorage]);

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      setLocalVisibleColumns((prev) => {
        const isCurrentlyVisible = prev.has(columnId);
        const newVisibleColumns = isCurrentlyVisible
          ? Array.from(prev).filter((id) => id !== columnId)
          : [...Array.from(prev), columnId];

        setLocalColumnOrder((prevOrder) => {
          // Always keep all columns in the order, just update visibility
          // If column was just made visible and not in order, add it at the end
          let newOrder = [...prevOrder];
          if (!isCurrentlyVisible && !newOrder.includes(columnId)) {
            newOrder.push(columnId);
          }
          // Ensure all columns are in the order
          newOrder = mergeColumnOrder(newOrder);

          return newOrder;
        });

        return new Set(newVisibleColumns);
      });
    },
    [mergeColumnOrder]
  );

  const handleToggleAll = useCallback(() => {
    const allColumnIds = filteredColumns.map((col) => col.id);
    const allVisible =
      filteredColumns.length > 0 && filteredColumns.every((col) => localVisibleColumns.has(col.id));
    const newVisibleColumns = allVisible ? [] : allColumnIds;
    // Reset to default start order (order from columns prop)
    const defaultOrder = filteredColumns.map((col) => col.id);

    setLocalVisibleColumns(new Set(newVisibleColumns));
    setLocalColumnOrder(defaultOrder);
  }, [filteredColumns, localVisibleColumns]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = dataRows.findIndex((row) => row.id === active.id);
      const newIndex = dataRows.findIndex((row) => row.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const newSortedRows = arrayMove(dataRows, oldIndex, newIndex);
      const newOrder = newSortedRows.map((row) => row.id);
      // Ensure all columns are in the order (in case any are missing)
      const mergedOrder = mergeColumnOrder(newOrder);
      setLocalColumnOrder(mergedOrder);
    },
    [dataRows, mergeColumnOrder]
  );

  const allVisible =
    filteredColumns.length > 0 && filteredColumns.every((col) => localVisibleColumns.has(col.id));
  const someVisible = filteredColumns.some((col) => localVisibleColumns.has(col.id));

  const gridColumns: ColumnDefinition<ColumnRow>[] = useMemo(
    () => [
      {
        id: 'column',
        label: 'Column',
        icon: <Columns4 className="size-3" />,
        width: { class: 'w-full', pixel: '100%' },
        renderHeader: () => (
          <div className="flex items-center h-full w-full">
            <div className="w-[24px]" />
            <div className="flex items-center gap-3 pl-3">
              <Checkbox
                checked={allVisible}
                onCheckedChange={handleToggleAll}
                aria-label="Toggle all columns"
              />
              <div className="flex items-center gap-2">
                <Columns4 className="size-3 text-muted-foreground" />
                <span className="text-xs uppercase text-muted-foreground">Column</span>
              </div>
            </div>
          </div>
        ),
        renderCell: (row: ColumnRow) => (
          <SortableColumnCell row={row} isVisible={row.isVisible} onToggle={handleToggleColumn} />
        ),
        getSearchValue: (row: ColumnRow) => row.label,
      },
    ],
    [handleToggleColumn, allVisible, someVisible, handleToggleAll]
  );

  const gridData = useMemo(() => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      >
        <SortableContext
          items={dataRows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <DataGrid
            data={dataRows}
            columns={gridColumns}
            getRowId={(row) => row.id}
            gridKey={`${gridKey}_edit_columns`}
            enableSearch={true}
            searchPlaceholder="Search columns..."
            enableEditColumns={false}
            enableExport={false}
            showPagination={false}
            compactMode={true}
            emptyMessage="No columns found."
            rowHeight="54px"
            stickyFirstColumn={false}
            disableLoadingOverlay={true}
            gridPadding={false}
          />
        </SortableContext>
      </DndContext>
    );
  }, [
    dataRows,
    gridColumns,
    sensors,
    allVisible,
    someVisible,
    handleToggleAll,
    handleDragEnd,
    gridKey,
  ]);

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Edit columns"
      side="right"
      contentClassName="w-full sm:w-[400px] sm:max-w-[400px] !p-0"
    >
      <div className="flex flex-col h-full edit-columns-grid-wrapper">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .edit-columns-grid-wrapper table th,
          .edit-columns-grid-wrapper table td {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .edit-columns-grid-wrapper table th {
            border-top: none !important;
          }
        `,
          }}
        />
        {gridData}
      </div>
    </SidePanel>
  );
};
