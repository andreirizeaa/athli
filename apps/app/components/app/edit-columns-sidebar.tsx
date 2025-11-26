"use client"

import React, { useState, useMemo } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Columns4, Search } from "lucide-react"
import { SidePanel } from "./side-panel"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ColumnDefinition = {
  id: string
  label: string
  icon?: React.ReactNode
}

type EditColumnsSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gridKey: string
  columns: ColumnDefinition[]
  visibleColumns: string[]
  columnOrder: string[]
  pinnedColumns?: string[]
  onColumnsChange: (visibleColumns: string[], columnOrder: string[]) => void
}

type SortableColumnRowProps = {
  column: ColumnDefinition
  isVisible: boolean
  onToggle: (columnId: string) => void
}

const SortableColumnRow = ({ column, isVisible, onToggle }: SortableColumnRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleToggle = () => {
    onToggle(column.id)
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-default",
        isDragging && "opacity-50"
      )}
    >
      <TableCell className="!px-4 !py-2 !h-[54px] align-middle border-b w-[40px]">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center"
          role="button"
          tabIndex={0}
          aria-label={`Drag to reorder ${column.label}`}
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="!px-4 !py-2 !h-[54px] align-middle border-b w-[40px]">
        <Checkbox
          checked={isVisible}
          onCheckedChange={handleToggle}
          aria-label={`Toggle ${column.label} column`}
        />
      </TableCell>
      <TableCell className="!px-4 !py-2 !h-[54px] align-middle border-b">
        <div className="flex items-center gap-2">
          {column.icon && <span className="text-muted-foreground">{column.icon}</span>}
          <span className="text-sm">{column.label}</span>
        </div>
      </TableCell>
    </TableRow>
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
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<string>>(new Set(visibleColumns))
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(columnOrder)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  React.useEffect(() => {
    if (open) {
      setLocalVisibleColumns(new Set(visibleColumns))
      setLocalColumnOrder([...columnOrder])
      setSearchQuery("")
    }
  }, [open, visibleColumns, columnOrder])

  const filteredColumns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return columns.filter((col) => !pinnedColumns.includes(col.id))
    }
    return columns.filter(
      (col) =>
        !pinnedColumns.includes(col.id) &&
        col.label.toLowerCase().includes(query)
    )
  }, [columns, pinnedColumns, searchQuery])

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

  const getDefaultOrder = (columnIds: string[]): string[] => {
    const defaultOrder = columns.map((col) => col.id)
    const ordered = defaultOrder.filter((id) => columnIds.includes(id))
    const unordered = columnIds.filter((id) => !defaultOrder.includes(id))
    return [...ordered, ...unordered]
  }

  const handleToggleColumn = (columnId: string) => {
    const isCurrentlyVisible = localVisibleColumns.has(columnId)
    const newVisibleColumns = isCurrentlyVisible
      ? Array.from(localVisibleColumns).filter((id) => id !== columnId)
      : [...Array.from(localVisibleColumns), columnId]

    let newOrder: string[]
    if (isCurrentlyVisible) {
      newOrder = localColumnOrder.filter((id) => id !== columnId)
    } else {
      const defaultOrder = getDefaultOrder(newVisibleColumns)
      newOrder = defaultOrder
    }

    setLocalVisibleColumns(new Set(newVisibleColumns))
    setLocalColumnOrder(newOrder)
    onColumnsChange(newVisibleColumns, newOrder)
    saveToLocalStorage(newVisibleColumns, newOrder)
  }

  const handleToggleAll = (checked: boolean) => {
    const allColumnIds = filteredColumns.map((col) => col.id)
    const newVisibleColumns = checked ? allColumnIds : []
    const newOrder = checked ? getDefaultOrder(allColumnIds) : []
    
    setLocalVisibleColumns(new Set(newVisibleColumns))
    setLocalColumnOrder(newOrder)
    onColumnsChange(newVisibleColumns, newOrder)
    saveToLocalStorage(newVisibleColumns, newOrder)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = sortedColumns.findIndex((col) => col.id === active.id)
    const newIndex = sortedColumns.findIndex((col) => col.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const newSortedColumns = arrayMove(sortedColumns, oldIndex, newIndex)
    const newOrder = newSortedColumns.map((col) => col.id)
    setLocalColumnOrder(newOrder)
    onColumnsChange(Array.from(localVisibleColumns), newOrder)
    saveToLocalStorage(Array.from(localVisibleColumns), newOrder)
  }

  const saveToLocalStorage = (visible: string[], order: string[]) => {
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
  }

  const allVisible = filteredColumns.length > 0 && filteredColumns.every((col) => localVisibleColumns.has(col.id))
  const someVisible = filteredColumns.some((col) => localVisibleColumns.has(col.id))

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Edit columns"
      side="right"
      contentClassName="w-full sm:w-[400px] sm:max-w-[400px]"
    >
      <div className="flex flex-col h-full">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-9"
            aria-label="Search columns"
          />
        </div>
        <div className="flex-1 overflow-auto -mx-4">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="hover:bg-transparent h-10">
                <TableHead className="!px-4 !py-0 h-10 border-t border-b w-[40px]"></TableHead>
                <TableHead className="!px-4 !py-0 h-10 border-t border-b w-[40px]">
                  <Checkbox
                    checked={allVisible ? true : someVisible ? "indeterminate" : false}
                    onCheckedChange={handleToggleAll}
                    aria-label="Toggle all columns"
                  />
                </TableHead>
                <TableHead className="!px-4 !py-0 h-10 border-t border-b">
                  <div className="flex items-center gap-2">
                    <Columns4 className="size-3 text-muted-foreground" />
                    <span className="text-xs uppercase text-muted-foreground">Column</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedColumns.map((col) => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedColumns.map((column) => (
                    <SortableColumnRow
                      key={column.id}
                      column={column}
                      isVisible={localVisibleColumns.has(column.id)}
                      onToggle={handleToggleColumn}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </TableBody>
          </Table>
        </div>
      </div>
    </SidePanel>
  )
}

