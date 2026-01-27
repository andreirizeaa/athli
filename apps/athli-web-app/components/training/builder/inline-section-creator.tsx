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

type SectionConfig = {
    roundDurationSec?: number;
    targetRounds?: number;
};

type InlineSectionCreatorProps = {
    onCreate: (name: string, type: SectionType, config?: SectionConfig) => void;
    onCancel: () => void;
};

export const InlineSectionCreator = ({ onCreate, onCancel }: InlineSectionCreatorProps) => {
    const t = useTranslations();
    const [name, setName] = useState('');
    const [type, setType] = useState<SectionType | ''>('');
    const [configValue, setConfigValue] = useState('');

    const sectionTypeOptions = getSectionTypeOptions();
    const selectedOption = sectionTypeOptions.find(opt => opt.value === type);

    // Check if the selected type requires config
    const requiresConfig = type === 'amrap' || type === 'timed' || type === 'circuits';
    const configLabel = type === 'amrap' ? 'Duration (seconds)' : 'Rounds';
    const configPlaceholder = type === 'amrap' ? 'e.g. 300' : 'e.g. 3';

    // Form is valid when name and type are set, and config is set for types that require it
    const isFormValid = name.trim().length > 0 && type !== '' && (!requiresConfig || configValue.trim().length > 0);

    return (
        <Card className="border-primary bg-sidebar w-full">
            <CardContent className="pl-4 pr-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className={requiresConfig ? 'w-1/3' : 'w-1/2'} >
                        <div className="flex flex-col gap-1.5">
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
                    </div>
                    <div className={requiresConfig ? 'w-1/3' : 'w-1/2'}>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold">
                                <span>{t('library.sections.sectionType')}<RequiredAsterisk /></span>
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(val) => {
                                    setType(val as SectionType);
                                    // Reset config when type changes
                                    setConfigValue('');
                                }}
                            >
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
                    {requiresConfig && (
                        <div className="w-1/3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold">
                                    <span>{configLabel}<RequiredAsterisk /></span>
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={configValue}
                                    onChange={(e) => {
                                        // Only allow digits
                                        const value = e.target.value.replace(/\D/g, '');
                                        setConfigValue(value);
                                    }}
                                    placeholder={configPlaceholder}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    )}
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
                                const config: SectionConfig = {};
                                if (type === 'amrap' && configValue) {
                                    config.roundDurationSec = parseInt(configValue, 10);
                                } else if ((type === 'timed' || type === 'circuits') && configValue) {
                                    config.targetRounds = parseInt(configValue, 10);
                                }
                                onCreate(name, type as SectionType, Object.keys(config).length > 0 ? config : undefined);
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
