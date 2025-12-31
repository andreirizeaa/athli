'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getSectionTypeOptions, type SectionType } from '@/app/training/sections/section-type-utils';

import { useTranslations } from 'next-intl';

type InlineSectionCreatorProps = {
    onCreate: (name: string, type: SectionType) => void;
    onCancel: () => void;
};

export const InlineSectionCreator = ({ onCreate, onCancel }: InlineSectionCreatorProps) => {
    const t = useTranslations();
    const [name, setName] = useState('');
    const [type, setType] = useState<SectionType | ''>('');

    const sectionTypeOptions = getSectionTypeOptions();
    const selectedOption = sectionTypeOptions.find(opt => opt.value === type);

    const isFormValid = name.trim().length > 0 && type !== '';

    return (
        <Card className="border-primary bg-sidebar w-full">
            <CardContent className="pl-4 pr-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="w-1/2 flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold">
                            <span>{t('library.sections.sectionName')}<RequiredAsterisk /></span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('library.sections.sectionNamePlaceholder')}
                            className="h-9"
                            autoFocus
                        />
                    </div>
                    <div className="w-1/2 flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold">
                            <span>{t('library.sections.sectionType')}<RequiredAsterisk /></span>
                        </Label>
                        <Select value={type} onValueChange={(val) => setType(val as SectionType)}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder={t('library.sections.selectTypePlaceholder')}>
                                    {type && <span>{selectedOption?.label}</span>}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {sectionTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col gap-0.5">
                                            <span>{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        size="sm"
                        disabled={!isFormValid}
                        onClick={() => {
                            if (isFormValid) {
                                onCreate(name, type as SectionType);
                            }
                        }}
                    >
                        {t('library.sections.emptyState.action')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
