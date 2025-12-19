'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ArrowUpNarrowWide, ArrowDownWideNarrow, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { AddFormSidePanel } from '@/components/forms/add-form-side-panel';
import { addForm, type Form } from '@/lib/forms/form-service';
import { cn } from '@/lib/utils';

// Mock forms data
const mockForms: Form[] = [
  {
    id: 'form-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'form-2',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const FormsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>(mockForms);
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);

  const handleOpenAddForm = () => {
    setIsAddFormOpen(true);
  };

  const handleCloseAddForm = () => {
    setIsAddFormOpen(false);
  };

  const handleSaveForm = async (newForm: Form, questions?: Array<{
    question: string;
    required: boolean;
    format: string;
    options?: string[];
    scaleFrom?: string;
    scaleTo?: string;
    mediaCount?: number;
  }>) => {
    setForms((prev) => [...prev, newForm]);
    
    // If questions are provided (from template), store them for the form detail page
    if (questions && questions.length > 0) {
      sessionStorage.setItem(`form-questions-${newForm.id}`, JSON.stringify(questions));
      // Navigate to the form detail page to add the questions
      router.push(`/forms/${newForm.id}`);
    }
  };

  const columns: ColumnDefinition<Form>[] = [
    {
      id: 'name',
      label: t('forms.columns.name'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[350px]', pixel: '350px' },
      getSortValue: (row) => row.name.toLowerCase(),
      getSearchValue: (row) => row.name,
    },
    {
      id: 'description',
      label: t('forms.columns.description'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[400px]', pixel: '400px' },
      getSortValue: (row) => row.description || '',
      getSearchValue: (row) => row.description || '',
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground truncate block">
          {row.description || '-'}
        </span>
      ),
    },
    {
      id: 'questionCount',
      label: t('forms.columns.questionCount'),
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.questionCount,
      getSearchValue: (row) => row.questionCount.toString(),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{row.questionCount}</span>
      ),
    },
  ];

  const renderFirstColumnHeader = ({
    isSorted,
    isAscending,
    isDescending,
    onSort,
  }: {
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
  }) => {
    return (
      <div className="flex items-center gap-2 h-full w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <span className="text-xs uppercase text-muted-foreground">
                {t('forms.columns.name')}
              </span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onSort('asc')}
              className={cn(isAscending && 'bg-accent')}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">Sort ascending</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">Sort descending</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderFirstColumn = (row: Form) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <span className="text-sm font-medium truncate">{row.name}</span>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
          <h1 className="text-[22px] font-semibold">{t('forms.title')}</h1>
          <Button onClick={handleOpenAddForm} className="gap-2">
            <Plus className="size-4" />
            <span>{t('forms.addForm')}</span>
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <DataGrid
        data={forms}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="forms"
        searchPlaceholder={t('forms.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name', 'description']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={false}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('forms.emptyMessage')}
        onRowClick={(row) => {
          router.push(`/forms/${row.id}`);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            router.push(`/forms/${row.id}`);
          }
        }}
      />

      <AddFormSidePanel
        open={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        onSave={handleSaveForm}
      />
    </div>
  );
};

export default FormsPage;

