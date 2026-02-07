'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataGrid } from '@/components/app/data-grid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Info } from 'lucide-react';
import Link from 'next/link';
// Forms are now split into check-ins and questionnaires services
import { type Habit } from '@/api/coach/coach-habit-service';
import { getAllMetrics, type Metric } from '@/api/coach/coach-metric-service';
import { Search, X, ChevronRight, UserPlus, CalendarX, Activity, CheckCircle, MessageSquare, FileText, ClipboardCheck, FilePlus, Sprout, ArrowLeft, Clock, RotateCw, BarChart3, Loader2 } from 'lucide-react';

export type PanelType = 'trigger' | 'action' | null;

export type TriggerOption = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type ActionOption = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    id: 'new-client-signup',
    name: 'New client sign up',
    icon: UserPlus,
  },
  {
    id: 'missed-check-in',
    name: 'Missed check in',
    icon: CalendarX,
  },
  {
    id: 'missed-habit-log',
    name: 'Missed habit log',
    icon: CalendarX,
  },
  {
    id: 'missed-metric-log',
    name: 'Missed metric log',
    icon: CalendarX,
  },
  {
    id: 'check-in-completed',
    name: 'Check in completed',
    icon: CheckCircle,
  },
  {
    id: 'missed-workout',
    name: 'Missed workout',
    icon: Activity,
  },
  {
    id: 'workout-finished',
    name: 'Workout finished',
    icon: CheckCircle,
  },
];

export const GENERAL_ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'wait',
    name: 'Wait',
    icon: Clock,
  },
];

export const CHECK_IN_ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'check',
    name: 'Is check in completed',
    icon: RotateCw,
  },
];

export const CLIENT_ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'send-message',
    name: 'Send message',
    icon: MessageSquare,
  },
  {
    id: 'assign-questionnaire',
    name: 'Assign questionnaire',
    icon: FileText,
  },
  {
    id: 'assign-check-in',
    name: 'Assign check in',
    icon: ClipboardCheck,
  },
  {
    id: 'add-file',
    name: 'Add file',
    icon: FilePlus,
  },
  {
    id: 'add-habit',
    name: 'Add habit',
    icon: Sprout,
  },
  {
    id: 'add-metric',
    name: 'Add metric',
    icon: BarChart3,
  },
];

export const ACTION_OPTIONS: ActionOption[] = [
  ...GENERAL_ACTION_OPTIONS,
  ...CHECK_IN_ACTION_OPTIONS,
  ...CLIENT_ACTION_OPTIONS,
];

interface FlowEditorSidePanelProps {
  panelType: PanelType;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedTrigger: TriggerOption | null;
  actionStep: 'list' | 'config' | 'confirmation';
  selectedActionOption: ActionOption | null;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  selectedQuestionnaires: Set<string>;
  selectedCheckIns: Set<string>;
  selectedFiles: Set<string>;
  selectedHabits: Set<string>;
  selectedMetrics: Set<string>;
  onToggleQuestionnaire: (id: string) => void;
  onToggleCheckIn: (id: string) => void;
  onToggleFile: (id: string) => void;
  onToggleHabit: (id: string) => void;
  onToggleMetric: (id: string) => void;
  onSetQuestionnaires: (ids: Set<string>) => void;
  onSetCheckIns: (ids: Set<string>) => void;
  onSetFiles: (ids: Set<string>) => void;
  onSetHabits: (ids: Set<string>) => void;
  onSetMetrics: (ids: Set<string>) => void;
  questionnaires: Array<{ id: string; name: string }>;
  checkIns: Array<{ id: string; name: string }>;
  files: Array<{ id: string; name: string }>;
  habits: Array<{ id: string; name: string }>;
  metrics: Array<{ id: string; name: string }>;
  isLoadingData: boolean;
  onClose: () => void;
  onTriggerOptionClick: (option: TriggerOption) => void;
  onActionOptionClick: (option: ActionOption) => void;
  onBackToActionList: () => void;
  onActionContinue: () => void;
  onSaveAction: () => void;
  onDeleteAction?: () => void;
  isSavingAction?: boolean;
  editingActionNodeId: string | null;
  onAddMore: () => void;
  waitDuration: number;
  waitUnit: 'minutes' | 'hours' | 'days';
  onWaitDurationChange: (duration: number) => void;
  onWaitUnitChange: (unit: 'minutes' | 'hours' | 'days') => void;
  repeatLinkedActionId: string | null;
  onRepeatLinkedActionIdChange: (actionId: string | null) => void;
  initialRepeatLinkedActionId?: string | null;
  actionNodes: Array<{
    id: string;
    option: ActionOption;
    messageText?: string;
    waitDuration?: number;
    waitUnit?: 'minutes' | 'hours' | 'days';
    repeatLinkedActionId?: string | null;
    selectedQuestionnaires?: Set<string>;
    selectedCheckIns?: Set<string>;
    selectedFiles?: Set<string>;
    selectedHabits?: Set<string>;
    selectedMetrics?: Set<string>;
  }>;
  onTriggerKeyDown: (event: React.KeyboardEvent, option: TriggerOption) => void;
  onActionKeyDown: (event: React.KeyboardEvent, option: ActionOption) => void;
  isPreviousActionCheck?: boolean;
  excludeTriggers?: string[];
  hideWaitActions?: boolean;
}

export function FlowEditorSidePanel({
  panelType,
  searchQuery,
  onSearchQueryChange,
  selectedTrigger,
  actionStep,
  selectedActionOption,
  messageText,
  onMessageTextChange,
  selectedQuestionnaires,
  selectedCheckIns,
  selectedFiles,
  selectedHabits,
  selectedMetrics,
  onToggleQuestionnaire,
  onToggleCheckIn,
  onToggleFile,
  onToggleHabit,
  onToggleMetric,
  onSetQuestionnaires,
  onSetCheckIns,
  onSetFiles,
  onSetHabits,
  onSetMetrics,
  questionnaires,
  checkIns,
  files,
  habits,
  metrics,
  isLoadingData,
  onClose,
  onTriggerOptionClick,
  onActionOptionClick,
  onBackToActionList,
  onActionContinue,
  onSaveAction,
  onDeleteAction,
  isSavingAction = false,
  editingActionNodeId,
  onAddMore,
  waitDuration,
  waitUnit,
  onWaitDurationChange,
  onWaitUnitChange,
  repeatLinkedActionId,
  onRepeatLinkedActionIdChange,
  initialRepeatLinkedActionId,
  actionNodes,
  onTriggerKeyDown,
  onActionKeyDown,
  isPreviousActionCheck = false,
  excludeTriggers = [],
  hideWaitActions = false,
}: FlowEditorSidePanelProps) {
  const isSidePanelOpen = panelType !== null;
  const isEditing = editingActionNodeId !== null;
  const sidePanelTitle = panelType === 'trigger'
    ? (selectedTrigger ? 'Edit Trigger' : 'Add Trigger')
    : isEditing
      ? `Edit ${selectedActionOption?.name || 'Action'}`
      : actionStep === 'list'
        ? 'Add Action'
        : selectedActionOption?.name || 'Add Action';
  const sidePanelSearchPlaceholder = panelType === 'trigger' ? 'Search triggers...' : 'Search actions...';
  const showBackButton = panelType === 'action' && actionStep !== 'list' && !isEditing;

  const filteredTriggerOptions = TRIGGER_OPTIONS.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((option) => !excludeTriggers.includes(option.id));

  const filteredGeneralActions = hideWaitActions
    ? []
    : GENERAL_ACTION_OPTIONS.filter((option) =>
      option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredCheckInActions = CHECK_IN_ACTION_OPTIONS.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((option) => {
    // Show "Is check in completed" only if trigger is "missed check in" AND previous action is not a check
    if (option.id === 'check') {
      return selectedTrigger?.id === 'missed-check-in' && !isPreviousActionCheck;
    }
    return true;
  });

  const filteredClientActions = CLIENT_ACTION_OPTIONS.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`absolute right-0 top-0 h-full flex flex-col border-l bg-background shadow-lg transition-all duration-300 ${isSidePanelOpen ? 'w-[400px]' : 'w-0 border-l-0 overflow-hidden'
        }`}
    >
      {isSidePanelOpen && (
        <>
          {/* Sidebar Header */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBackToActionList}
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Back to action list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold truncate">{sidePanelTitle}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar - only show on list step */}
          {panelType === 'action' && actionStep === 'list' && (
            <div className="flex-shrink-0 px-4 pb-4">
              <div className="relative flex items-center">
                <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  type="search"
                  placeholder={sidePanelSearchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Sidebar Content */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {panelType === 'trigger' ? (
              <div className="px-4 pb-4 space-y-4">
                {filteredTriggerOptions.length > 0 ? (
                  <Card className="bg-background pb-0">
                    <CardHeader className="px-4">
                      <CardTitle className="text-sm">Client triggers</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-12px]" />
                    <div className="w-full">
                      <div className="space-y-0">
                        {filteredTriggerOptions.map((option, index) => {
                          const IconComponent = option.icon;
                          const isLast = index === filteredTriggerOptions.length - 1;
                          return (
                            <div key={option.id}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Select ${option.name}`}
                                onClick={() => onTriggerOptionClick(option)}
                                onKeyDown={(e) => onTriggerKeyDown(e, option)}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                              >
                                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-border bg-background">
                                  <IconComponent className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="flex-1 text-sm font-medium">{option.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                              {!isLast && <div className="border-b border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="px-4 py-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No triggers found matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            ) : actionStep === 'list' ? (
              <div className="px-4 pb-4 space-y-4">
                {/* General Actions Card */}
                {filteredGeneralActions.length > 0 && (
                  <Card className="bg-background pb-0">
                    <CardHeader className="px-4">
                      <CardTitle className="text-sm">General</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-12px]" />
                    <div className="w-full">
                      <div className="space-y-0">
                        {filteredGeneralActions.map((option, index) => {
                          const IconComponent = option.icon;
                          const isLast = index === filteredGeneralActions.length - 1;
                          return (
                            <div key={option.id}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Select ${option.name}`}
                                onClick={() => onActionOptionClick(option)}
                                onKeyDown={(e) => onActionKeyDown(e, option)}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                              >
                                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-border bg-background">
                                  <IconComponent className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="flex-1 text-sm font-medium">{option.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                              {!isLast && <div className="border-b border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Check in Actions Card - Hidden when on branch with insertionIndex 1 */}
                {filteredCheckInActions.length > 0 && !isPreviousActionCheck && (
                  <Card className="bg-background pb-0">
                    <CardHeader className="px-4">
                      <CardTitle className="text-sm">Checks</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-12px]" />
                    <div className="w-full">
                      <div className="space-y-0">
                        {filteredCheckInActions.map((option, index) => {
                          const IconComponent = option.icon;
                          const isLast = index === filteredCheckInActions.length - 1;
                          return (
                            <div key={option.id}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Select ${option.name}`}
                                onClick={() => onActionOptionClick(option)}
                                onKeyDown={(e) => onActionKeyDown(e, option)}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                              >
                                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-border bg-background">
                                  <IconComponent className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="flex-1 text-sm font-medium">{option.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                              {!isLast && <div className="border-b border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Client Actions Card */}
                {filteredClientActions.length > 0 && (
                  <Card className="bg-background pb-0">
                    <CardHeader className="px-4">
                      <CardTitle className="text-sm">Client actions</CardTitle>
                    </CardHeader>
                    <Separator className="w-full mt-[-8px] mb-[-12px]" />
                    <div className="w-full">
                      <div className="space-y-0">
                        {filteredClientActions.map((option, index) => {
                          const IconComponent = option.icon;
                          const isLast = index === filteredClientActions.length - 1;
                          return (
                            <div key={option.id}>
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Select ${option.name}`}
                                onClick={() => onActionOptionClick(option)}
                                onKeyDown={(e) => onActionKeyDown(e, option)}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                              >
                                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-border bg-background">
                                  <IconComponent className="h-4 w-4 text-foreground" />
                                </div>
                                <span className="flex-1 text-sm font-medium">{option.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                              {!isLast && <div className="border-b border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* No results message */}
                {filteredGeneralActions.length === 0 && filteredCheckInActions.length === 0 && filteredClientActions.length === 0 && searchQuery && (
                  <div className="px-4 py-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No actions found matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            ) : actionStep === 'config' ? (
              <div className={`flex flex-col ${selectedActionOption?.id === 'send-message' || selectedActionOption?.id === 'wait' ? 'px-4 pb-4 flex-1 min-h-0' : 'flex-1 min-h-0'}`}>
                {selectedActionOption?.id === 'send-message' ? (
                  <div className="flex flex-col gap-2 flex-1 min-h-0">
                    <Label htmlFor="message-text">
                      <span>Enter message<RequiredAsterisk /></span>
                    </Label>
                    <Textarea
                      id="message-text"
                      value={messageText}
                      onChange={(e) => onMessageTextChange(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 min-h-0 resize-none"
                    />
                  </div>
                ) : selectedActionOption?.id === 'wait' ? (
                  <div className="space-y-4">
                    <Label>
                      <span>Schedule<RequiredAsterisk /></span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <div className="w-[30%]">
                        <Input
                          type="number"
                          min="1"
                          value={waitDuration}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value > 0) {
                              onWaitDurationChange(value);
                            } else if (e.target.value === '') {
                              onWaitDurationChange(1);
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="w-[70%]">
                        <Select value={waitUnit} onValueChange={(value) => onWaitUnitChange(value as 'minutes' | 'hours' | 'days')}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 flex-1 min-h-0 px-4">
                    <Label>
                      {selectedActionOption?.id === 'assign-questionnaire' && 'Select questionnaires'}
                      {selectedActionOption?.id === 'assign-check-in' && 'Select check-ins'}
                      {selectedActionOption?.id === 'add-file' && 'Select files'}
                      {selectedActionOption?.id === 'add-habit' && 'Select habits'}
                    </Label>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      </div>
                    ) : (() => {
                      // Determine configuration based on action option
                      const config = selectedActionOption?.id === 'assign-questionnaire' ? {
                        data: questionnaires,
                        selectedIds: selectedQuestionnaires,
                        onToggle: onToggleQuestionnaire,
                        onSetSelection: onSetQuestionnaires,
                        label: 'Questionnaire',
                        gridKey: 'select-questionnaires',
                        searchPlaceholder: 'Search questionnaires...',
                        emptyMessage: 'Please create a questionnaire in the',
                        emptyLink: '/forms',
                        emptyLinkText: 'Forms',
                      } : selectedActionOption?.id === 'assign-check-in' ? {
                        data: checkIns,
                        selectedIds: selectedCheckIns,
                        onToggle: onToggleCheckIn,
                        onSetSelection: onSetCheckIns,
                        label: 'Check-in',
                        gridKey: 'select-check-ins',
                        searchPlaceholder: 'Search check-ins...',
                        emptyMessage: 'Please create a check-in in the',
                        emptyLink: '/forms',
                        emptyLinkText: 'Forms',
                      } : selectedActionOption?.id === 'add-file' ? {
                        data: files,
                        selectedIds: selectedFiles,
                        onToggle: onToggleFile,
                        onSetSelection: onSetFiles,
                        label: 'File',
                        gridKey: 'select-files',
                        searchPlaceholder: 'Search files...',
                        emptyMessage: 'Please add a file in the',
                        emptyLink: '/files',
                        emptyLinkText: 'Files',
                      } : selectedActionOption?.id === 'add-habit' ? {
                        data: habits,
                        selectedIds: selectedHabits,
                        onToggle: onToggleHabit,
                        onSetSelection: onSetHabits,
                        label: 'Habit',
                        gridKey: 'select-habits',
                        searchPlaceholder: 'Search habits...',
                        emptyMessage: 'Please add a habit in the',
                        emptyLink: '/habits',
                        emptyLinkText: 'Habits',
                      } : selectedActionOption?.id === 'add-metric' ? {
                        data: metrics,
                        selectedIds: selectedMetrics,
                        onToggle: onToggleMetric,
                        onSetSelection: onSetMetrics,
                        label: 'Metric',
                        gridKey: 'select-metrics',
                        searchPlaceholder: 'Search metrics...',
                        emptyMessage: 'Please add a metric in the',
                        emptyLink: '/metrics',
                        emptyLinkText: 'Metrics',
                      } : null;

                      if (!config) return null;

                      return config.data.length === 0 ? (
                        <Alert className="bg-primary/5 border-primary/20 text-primary">
                          <Info className="size-4" />
                          <AlertDescription className="min-w-0 line-clamp-4">
                            {config.emptyMessage}{' '}
                            <Link href={config.emptyLink} className="underline hover:no-underline">
                              <strong>{config.emptyLinkText}</strong>
                            </Link>{' '}
                            page.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="flex-1 min-h-0 flex flex-col [&>div]:flex-1 [&>div]:min-h-0 [&_.relative.mb-4]:!px-0 [&>div]:!-mx-0 [&>div]:!w-full">
                          <DataGrid
                            data={config.data}
                            columns={[
                              {
                                id: 'name',
                                label: config.label,
                                width: { class: 'w-full', pixel: '100%' },
                                getSortValue: (row) => row.name.toLowerCase(),
                                getSearchValue: (row) => row.name,
                              },
                            ]}
                            getRowId={(row) => row.id}
                            gridKey={config.gridKey}
                            searchPlaceholder={config.searchPlaceholder}
                            enableSearch={true}
                            enableEditColumns={false}
                            enableExport={false}
                            enableRowSelection={true}
                            selectedRowIds={config.selectedIds}
                            onSelectionChange={(ids) => {
                              config.onSetSelection(new Set(ids));
                            }}
                            onRowClick={(row, event) => {
                              const targetElement = event.target as HTMLElement;
                              if (targetElement.closest('[data-no-row-link="true"]')) {
                                return;
                              }
                              config.onToggle(row.id);
                            }}
                            onRowKeyDown={(row, event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                const targetElement = event.target as HTMLElement;
                                if (targetElement.closest('[data-no-row-link="true"]')) {
                                  return;
                                }
                                event.preventDefault();
                                config.onToggle(row.id);
                              }
                            }}
                            firstColumnId="name"
                            stickyFirstColumn={true}
                            firstColumnWidth="100%"
                            hideFirstColumnBorder={true}
                            compactPagination={true}
                            compactMode={true}
                            gridPadding={false}
                            renderFirstColumn={(row, isSelected) => (
                              <div className="flex items-center gap-3 h-full w-full">
                                <div
                                  className="flex items-center justify-center h-full flex-shrink-0"
                                  data-no-row-link="true"
                                >
                                  <Checkbox checked={isSelected} onCheckedChange={() => config.onToggle(row.id)} />
                                </div>
                                <span className="text-sm truncate flex-1 min-w-0">{row.name}</span>
                              </div>
                            )}
                            renderFirstColumnHeader={({ isAllSelected, onToggleAll }) => (
                              <div className="flex items-center gap-3 h-full w-full">
                                <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                                <span className="text-xs uppercase text-muted-foreground">{config.label}</span>
                              </div>
                            )}
                          />
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : actionStep === 'confirmation' ? (
              <div className="px-4 pb-4">
                <div className="space-y-4">
                  <Label>Selected items</Label>
                  <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                    {selectedActionOption?.id === 'assign-questionnaire' &&
                      Array.from(selectedQuestionnaires).map((id) => {
                        const item = questionnaires.find((q) => q.id === id);
                        return item ? (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-1">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => onToggleQuestionnaire(item.id)}
                              className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    {selectedActionOption?.id === 'assign-check-in' &&
                      Array.from(selectedCheckIns).map((id) => {
                        const item = checkIns.find((c) => c.id === id);
                        return item ? (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-1">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => onToggleCheckIn(item.id)}
                              className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    {selectedActionOption?.id === 'add-file' &&
                      Array.from(selectedFiles).map((id) => {
                        const item = files.find((f) => f.id === id);
                        return item ? (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-1">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => onToggleFile(item.id)}
                              className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    {selectedActionOption?.id === 'add-habit' &&
                      Array.from(selectedHabits).map((id) => {
                        const item = habits.find((h) => h.id === id);
                        return item ? (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-1">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => onToggleHabit(item.id)}
                              className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    {selectedActionOption?.id === 'add-metric' &&
                      Array.from(selectedMetrics).map((id) => {
                        const item = metrics.find((m) => m.id === id);
                        return item ? (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-1">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => onToggleMetric(item.id)}
                              className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    {/* Add more button row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={onAddMore}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onAddMore();
                        }
                      }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      aria-label="Add more items"
                    >
                      <span className="text-sm flex-1 text-muted-foreground">Add more</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Buttons */}
          {(panelType === 'action' && actionStep !== 'list') && (
            <div className="flex-shrink-0 p-4">
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    {actionStep === 'config' && selectedActionOption?.id !== 'send-message' && selectedActionOption?.id !== 'wait' ? (
                      <Button
                        onClick={onActionContinue}
                        disabled={
                          isSavingAction ||
                          (selectedActionOption?.id === 'assign-questionnaire' && selectedQuestionnaires.size === 0) ||
                          (selectedActionOption?.id === 'assign-check-in' && selectedCheckIns.size === 0) ||
                          (selectedActionOption?.id === 'add-file' && selectedFiles.size === 0) ||
                          (selectedActionOption?.id === 'add-habit' && selectedHabits.size === 0) ||
                          (selectedActionOption?.id === 'add-metric' && selectedMetrics.size === 0)
                        }
                        className="flex-1"
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        onClick={onSaveAction}
                        className="flex-1"
                        disabled={
                          isSavingAction ||
                          (selectedActionOption?.id === 'send-message' && !messageText.trim())
                        }
                      >
                        {isSavingAction && <Loader2 className="size-4 animate-spin" />}
                        Save
                      </Button>
                    )}
                    {onDeleteAction && (
                      <Button
                        variant="outline"
                        onClick={onDeleteAction}
                        className="flex-1"
                        disabled={isSavingAction}
                      >
                        Delete
                      </Button>
                    )}
                    <Button variant="outline" onClick={onBackToActionList} className="flex-1" disabled={isSavingAction}>
                      Cancel
                    </Button>
                  </>
                ) : actionStep === 'confirmation' || (selectedActionOption?.id === 'send-message' && actionStep === 'config') || (selectedActionOption?.id === 'wait' && actionStep === 'config') ? (
                  <>
                    <Button
                      onClick={onSaveAction}
                      className="flex-1"
                      disabled={
                        isSavingAction ||
                        (selectedActionOption?.id === 'send-message' && !messageText.trim())
                      }
                    >
                      {isSavingAction && <Loader2 className="size-4 animate-spin" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={onBackToActionList} className="flex-1" disabled={isSavingAction}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={onActionContinue}
                      disabled={
                        isSavingAction ||
                        (selectedActionOption?.id === 'assign-questionnaire' && selectedQuestionnaires.size === 0) ||
                        (selectedActionOption?.id === 'assign-check-in' && selectedCheckIns.size === 0) ||
                        (selectedActionOption?.id === 'add-file' && selectedFiles.size === 0) ||
                        (selectedActionOption?.id === 'add-habit' && selectedHabits.size === 0)
                      }
                      className="flex-1"
                    >
                      Continue
                    </Button>
                    <Button variant="outline" onClick={onBackToActionList} className="flex-1" disabled={isSavingAction}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
