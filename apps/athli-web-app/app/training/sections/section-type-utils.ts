import { SECTION_TYPES } from '@/lib/constants/training';

export type SectionType = 'regular' | 'amrap' | 'timed' | 'circuits';

export type SectionTypeOption = {
  value: SectionType;
  label: string;
  description: string;
};

export const getSectionTypeOptions = (): SectionTypeOption[] =>
  SECTION_TYPES as unknown as SectionTypeOption[];

export const getSectionTypeLabel = (type: SectionType): string => {
  const option = getSectionTypeOptions().find(opt => opt.value === type);
  return option?.label || type;
};

export const formatSectionType = getSectionTypeLabel;

export const getSectionTypeDescription = (type: SectionType): string => {
  const option = getSectionTypeOptions().find(opt => opt.value === type);
  return option?.description || '';
};
