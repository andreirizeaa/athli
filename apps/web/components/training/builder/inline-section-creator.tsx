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
    workSec?: number;
    restSec?: number;
    rounds?: number;
    intervalSec?: number;
    durationMin?: number;
};

type InlineSectionCreatorProps = {
    onCreate: (name: string, type: SectionType, config?: SectionConfig) => void;
    onCancel: () => void;
    initialType?: SectionType;
};

// Helper to get initial config values based on section type
const getInitialConfig = (sectionType?: SectionType) => {
    if (!sectionType) {
        return { workSec: '', restSec: '', rounds: '', intervalSec: '', durationMin: '' };
    }
    switch (sectionType) {
        case 'tabata':
            return { workSec: '20', restSec: '10', rounds: '8', intervalSec: '', durationMin: '' };
        case 'hiit':
            return { workSec: '40', restSec: '20', rounds: '10', intervalSec: '', durationMin: '' };
        case 'emom':
            return { workSec: '', restSec: '', rounds: '', intervalSec: '60', durationMin: '10' };
        case 'circuits':
            return { workSec: '', restSec: '', rounds: '3', intervalSec: '', durationMin: '' };
        default:
            return { workSec: '', restSec: '', rounds: '', intervalSec: '', durationMin: '' };
    }
};

export const InlineSectionCreator = ({ onCreate, onCancel, initialType }: InlineSectionCreatorProps) => {
    const t = useTranslations();
    const initialConfig = getInitialConfig(initialType);
    const [name, setName] = useState('');
    const [type, setType] = useState<SectionType | ''>(initialType || '');
    const [configValue, setConfigValue] = useState('');
    // Tabata/HIIT config
    const [workSec, setWorkSec] = useState(initialConfig.workSec);
    const [restSec, setRestSec] = useState(initialConfig.restSec);
    const [rounds, setRounds] = useState(initialConfig.rounds);
    // EMOM config
    const [intervalSec, setIntervalSec] = useState(initialConfig.intervalSec);
    const [durationMin, setDurationMin] = useState(initialConfig.durationMin);

    const sectionTypeOptions = getSectionTypeOptions();
    const selectedOption = sectionTypeOptions.find(opt => opt.value === type);

    // Check if the selected type requires config
    const requiresAmrapConfig = type === 'amrap';
    const requiresTabataHiitConfig = type === 'tabata' || type === 'hiit';
    const requiresEmomConfig = type === 'emom';
    const requiresCircuitsConfig = type === 'circuits';

    // Form is valid when name and type are set, and all required config fields are filled
    const isFormValid = () => {
        if (name.trim().length === 0 || type === '') return false;
        if (requiresAmrapConfig && configValue.trim().length === 0) return false;
        if (requiresTabataHiitConfig && (workSec.trim() === '' || restSec.trim() === '' || rounds.trim() === '')) return false;
        if (requiresEmomConfig && (intervalSec.trim() === '' || durationMin.trim() === '')) return false;
        if (requiresCircuitsConfig && rounds.trim() === '') return false;
        return true;
    };

    return (
        <Card className="border-primary bg-sidebar w-full">
            <CardContent className="pl-4 pr-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className={(requiresAmrapConfig || requiresCircuitsConfig) ? 'w-1/3' : 'w-1/2'} >
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
                    <div className={(requiresAmrapConfig || requiresCircuitsConfig) ? 'w-1/3' : 'w-1/2'}>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold">
                                <span>{t('library.sections.sectionType')}<RequiredAsterisk /></span>
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(val) => {
                                    const newType = val as SectionType;
                                    setType(newType);
                                    // Set default values based on section type
                                    setConfigValue('');
                                    if (newType === 'tabata') {
                                        setWorkSec('20');
                                        setRestSec('10');
                                        setRounds('8');
                                        setIntervalSec('');
                                        setDurationMin('');
                                    } else if (newType === 'hiit') {
                                        setWorkSec('40');
                                        setRestSec('20');
                                        setRounds('10');
                                        setIntervalSec('');
                                        setDurationMin('');
                                    } else if (newType === 'emom') {
                                        setWorkSec('');
                                        setRestSec('');
                                        setRounds('');
                                        setIntervalSec('60');
                                        setDurationMin('10');
                                    } else if (newType === 'circuits') {
                                        setWorkSec('');
                                        setRestSec('');
                                        setRounds('3');
                                        setIntervalSec('');
                                        setDurationMin('');
                                    } else {
                                        setWorkSec('');
                                        setRestSec('');
                                        setRounds('');
                                        setIntervalSec('');
                                        setDurationMin('');
                                    }
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
                    {requiresAmrapConfig && (
                        <div className="w-1/3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold">
                                    <span>Duration (seconds)<RequiredAsterisk /></span>
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
                                    placeholder="e.g. 300"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    )}
                    {requiresCircuitsConfig && (
                        <div className="w-1/3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold">
                                    <span>Rounds<RequiredAsterisk /></span>
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={rounds}
                                    onChange={(e) => setRounds(e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g. 3"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    )}
                </div>
                {/* Tabata/HIIT Config Row */}
                {requiresTabataHiitConfig && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold"><span>Work (s)<RequiredAsterisk /></span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={workSec}
                                    onChange={(e) => setWorkSec(e.target.value.replace(/\D/g, ''))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold"><span>Rest (s)<RequiredAsterisk /></span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={restSec}
                                    onChange={(e) => setRestSec(e.target.value.replace(/\D/g, ''))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold"><span>Rounds<RequiredAsterisk /></span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={rounds}
                                    onChange={(e) => setRounds(e.target.value.replace(/\D/g, ''))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* EMOM Config Row */}
                {requiresEmomConfig && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold"><span>Interval (s)<RequiredAsterisk /></span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={intervalSec}
                                    onChange={(e) => setIntervalSec(e.target.value.replace(/\D/g, ''))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold"><span>Duration (min)<RequiredAsterisk /></span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={durationMin}
                                    onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>
                )}
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
                        disabled={!isFormValid()}
                        onClick={() => {
                            if (isFormValid()) {
                                const config: SectionConfig = {};
                                if (type === 'amrap' && configValue) {
                                    config.roundDurationSec = parseInt(configValue, 10);
                                } else if (type === 'tabata' || type === 'hiit') {
                                    if (workSec) config.workSec = parseInt(workSec, 10);
                                    if (restSec) config.restSec = parseInt(restSec, 10);
                                    if (rounds) config.rounds = parseInt(rounds, 10);
                                } else if (type === 'emom') {
                                    if (intervalSec) config.intervalSec = parseInt(intervalSec, 10);
                                    if (durationMin) config.durationMin = parseInt(durationMin, 10);
                                } else if (type === 'circuits') {
                                    if (rounds) config.rounds = parseInt(rounds, 10);
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
