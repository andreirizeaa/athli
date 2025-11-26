"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Columns4 } from "lucide-react"
import { SidePanel } from "./side-panel"
import { Checkbox } from "@/components/ui/checkbox"
import { DataGrid, ColumnDefinition } from "./data-grid"

type ColumnDefinitionInput = {
  id: string
  label: string
  icon?: React.ReactNode
}

type EditColumnsSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gridKey: string
  columns: ColumnDefinitionInput[]
  visibleColumns: string[]
  columnOrder: string[]
  pinnedColumns?: string[]
  onColumnsChange: (visibleColumns: string[], columnOrder: string[]) => void
}

type ColumnRow = {
  id: string
  label: string
  icon?: React.ReactNode
  isVisible: boolean
}

const SortableColumnCell = ({ 
  row,
  isVisible,
  onToggle,
}: {
  row: ColumnRow
  isVisible: boolean
  onToggle: (columnId: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDragKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
    }
  }

  const handleToggle = () => {
    onToggle(row.id)
  }

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
  )
}

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
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<string>>(new Set(visibleColumns))
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(columnOrder)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      setLocalVisibleColumns(new Set(visibleColumns))
      setLocalColumnOrder([...columnOrder])
    }
  }, [open, visibleColumns, columnOrder])

  const filteredColumns = useMemo(() => {
    return columns.filter((col) => !pinnedColumns.includes(col.id))
  }, [columns, pinnedColumns])

  const sortedColumns = useMemo(() => {
    const visible = filteredColumns.filter((col) => localVisibleColumns.has(col.id))
    const hidden = filteredColumns.filter((col) => !localVisibleColumns.has(col.id))

    const visibleSorted = visible.sort((a, b) => {
      const aIndex = localColumnOrder.indexOf(a.id)
      const bIndex = localColumnOrder.indexOf(b.id)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return [...visibleSorted, ...hidden]
  }, [filteredColumns, localVisibleColumns, localColumnOrder])

  const dataRows: ColumnRow[] = useMemo(() => {
    return sortedColumns.map((col) => ({
      id: col.id,
      label: col.label,
      icon: col.icon,
      isVisible: localVisibleColumns.has(col.id),
    }))
  }, [sortedColumns, localVisibleColumns])

  const getDefaultOrder = useCallback((columnIds: string[]): string[] => {
    const defaultOrder = columns.map((col) => col.id)
    const ordered = defaultOrder.filter((id) => columnIds.includes(id))
    const unordered = columnIds.filter((id) => !defaultOrder.includes(id))
    return [...ordered, ...unordered]
  }, [columns])

  const saveToLocalStorage = useCallback((visible: string[], order: string[]) => {
    try {
      const preferences = JSON.parse(localStorage.getItem("column_preferences") || "{}")
      preferences[gridKey] = {
        visibleColumns: visible,
        columnOrder: order,
      }
      localStorage.setItem("column_preferences", JSON.stringify(preferences))
    } catch (error) {
      console.error("Failed to save column preferences:", error)
    }
  }, [gridKey])

  const handleToggleColumn = useCallback((columnId: string) => {
    setLocalVisibleColumns((prev) => {
      const isCurrentlyVisible = prev.has(columnId)
      const newVisibleColumns = isCurrentlyVisible
        ? Array.from(prev).filter((id) => id !== columnId)
        : [...Array.from(prev), columnId]

      setLocalColumnOrder((prevOrder) => {
        let newOrder: string[]
        if (isCurrentlyVisible) {
          newOrder = prevOrder.filter((id) => id !== columnId)
        } else {
          const defaultOrder = getDefaultOrder(newVisibleColumns)
          newOrder = defaultOrder
        }

        onColumnsChange(newVisibleColumns, newOrder)
        saveToLocalStorage(newVisibleColumns, newOrder)

        return newOrder
      })

      return new Set(newVisibleColumns)
    })
  }, [getDefaultOrder, onColumnsChange, saveToLocalStorage])

  const handleToggleAll = useCallback(() => {
    const allColumnIds = filteredColumns.map((col) => col.id)
    const allVisible = filteredColumns.length > 0 && filteredColumns.every((col) => localVisibleColumns.has(col.id))
    const newVisibleColumns = allVisible ? [] : allColumnIds
    const newOrder = allVisible ? [] : getDefaultOrder(allColumnIds)
    
    setLocalVisibleColumns(new Set(newVisibleColumns))
    setLocalColumnOrder(newOrder)
    onColumnsChange(newVisibleColumns, newOrder)
    saveToLocalStorage(newVisibleColumns, newOrder)
  }, [filteredColumns, localVisibleColumns, getDefaultOrder, onColumnsChange, saveToLocalStorage])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = dataRows.findIndex((row) => row.id === active.id)
    const newIndex = dataRows.findIndex((row) => row.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newSortedRows = arrayMove(dataRows, oldIndex, newIndex)
    const newOrder = newSortedRows.map((row) => row.id)
    setLocalColumnOrder(newOrder)
    onColumnsChange(Array.from(localVisibleColumns), newOrder)
    saveToLocalStorage(Array.from(localVisibleColumns), newOrder)
  }, [dataRows, localVisibleColumns, onColumnsChange, saveToLocalStorage])

  const allVisible = filteredColumns.length > 0 && filteredColumns.every((col) => localVisibleColumns.has(col.id))
  const someVisible = filteredColumns.some((col) => localVisibleColumns.has(col.id))

  const gridColumns: ColumnDefinition<ColumnRow>[] = useMemo(() => [
    {
      id: "column",
      label: "Column",
      icon: <Columns4 className="size-3" />,
      width: { class: "w-full", pixel: "100%" },
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
        <SortableColumnCell
          row={row}
          isVisible={row.isVisible}
          onToggle={handleToggleColumn}
        />
      ),
      getSearchValue: (row: ColumnRow) => row.label,
    },
  ], [handleToggleColumn, allVisible, someVisible, handleToggleAll])

  const gridData = useMemo(() => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
          />
        </SortableContext>
      </DndContext>
    )
  }, [dataRows, gridColumns, sensors, allVisible, someVisible, handleToggleAll, handleDragEnd, gridKey])

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Edit columns"
      side="right"
      contentClassName="w-full sm:w-[400px] sm:max-w-[400px]"
    >
      <div className="flex flex-col h-full edit-columns-grid-wrapper">
        <style dangerouslySetInnerHTML={{ __html: `
          .edit-columns-grid-wrapper table th,
          .edit-columns-grid-wrapper table td {
            padding-left: 0 !important;
            padding-right: 1rem !important;
          }
          .edit-columns-grid-wrapper [class*="overflow-auto"] {
            margin-left: -1rem !important;
            margin-right: -1rem !important;
          }
        ` }} />
        {gridData}
      </div>
    </SidePanel>
  )
}

