'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { SidePanel } from '@/components/app/side-panel';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { CountrySelect } from '@/components/ui/country-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Camera, Loader2, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { useClientProfileContext } from '../client-profile-context';
import { useUpdateClientDetails } from '@/hooks/use-client-details';
import type { AthleteDetails } from '@/api/client/client-service';
import { parsePhoneNumber } from 'react-phone-number-input';
import type { Value as PhoneValue, Country } from 'react-phone-number-input';
import { toast } from 'sonner';
import { getCountryCode, getCountryName } from '@/lib/general/country-utils';

interface EditClientDetailsSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditClientDetailsSidePanel({ open, onOpenChange }: EditClientDetailsSidePanelProps) {
    const t = useTranslations();
    const { details, athlete, refreshSection } = useClientProfileContext();
    const updateDetailsMutation = useUpdateClientDetails();

    const [formData, setFormData] = useState<Omit<AthleteDetails, 'category'> & { category: 'online' | 'in-person' | 'hybrid' | null }>({
        name: '',
        email: '',
        birthDate: null,
        category: null,
        gender: null,
        phone: '',
        country: '',
        height: null,
        avatarUrl: null,
    });

    const [hasChanges, setHasChanges] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const firstNameInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    const clientName = details?.name || athlete?.name || '';
    const clientEmail = details?.email || athlete?.email || '';
    const clientCategory = (details?.category || athlete?.coachingType || null) as 'online' | 'in-person' | 'hybrid' | null;
    const clientGender = details?.gender || null;
    const clientPhone = details?.phone || athlete?.phone || '';
    const clientCountry = details?.country || athlete?.country || '';
    const clientHeight = details?.height || null;
    const clientAvatar = previewUrl || athlete?.avatarUrl || null;

    const convertPhoneToE164 = (phone: string): PhoneValue | undefined => {
        if (!phone) return undefined;
        try {
            const cleaned = phone.replace(/\s/g, '').replace(/[()-]/g, '');
            if (cleaned.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(cleaned)) {
                return cleaned as PhoneValue;
            }
            const parsed = parsePhoneNumber(phone);
            return parsed?.number as PhoneValue | undefined;
        } catch {
            return undefined;
        }
    };

    useEffect(() => {
        if (open && firstNameInputRef.current) {
            setTimeout(() => {
                firstNameInputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    useEffect(() => {
        if (open && (details || athlete)) {
            setFormData({
                name: clientName,
                email: clientEmail,
                birthDate: details?.birthDate || null,
                category: clientCategory,
                gender: clientGender,
                phone: clientPhone,
                country: clientCountry,
                height: clientHeight,
                avatarUrl: athlete?.avatarUrl || null,
            });
            setUploadedFile(null);
            setPreviewUrl(null);
        }
    }, [open, details, athlete, clientName, clientEmail, clientCategory, clientGender, clientPhone, clientCountry, clientHeight]);

    useEffect(() => {
        if (details || athlete) {
            const hasImageChange = !!uploadedFile;
            const hasFieldChanges =
                formData.name !== clientName ||
                formData.email !== clientEmail ||
                formData.birthDate !== (details?.birthDate || null) ||
                formData.category !== clientCategory ||
                formData.gender !== clientGender ||
                formData.phone !== clientPhone ||
                formData.country !== clientCountry ||
                formData.height !== clientHeight;

            const hasRequiredFields =
                formData.name.trim() !== '' &&
                formData.email.trim() !== '';

            setHasChanges((hasFieldChanges || hasImageChange) && hasRequiredFields);
        }
    }, [formData, details, athlete, uploadedFile, clientName, clientEmail, clientCategory, clientGender, clientPhone, clientCountry, clientHeight]);

    const handleSaveDetails = async () => {
        if (!athlete?.id) return;

        try {
            await updateDetailsMutation.mutateAsync({
                clientId: athlete.id,
                details: {
                    ...formData,
                    category: formData.category || 'online',
                    avatarFile: uploadedFile
                }
            });

            toast.success(t('athletes.profile.detailsUpdated'));
            setHasChanges(false);
            setUploadedFile(null);
            setPreviewUrl(null);
            onOpenChange(false);
            // Refresh details section in context
            await refreshSection('details');
        } catch (error) {
            console.error('Failed to save details:', error);
            toast.error(t('general.errorOccurred'));
        }
    };

    const handleCancelEdit = () => {
        onOpenChange(false);
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }
        setUploadedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
            setHasChanges(true);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragCounterRef.current++;
        if (dragCounterRef.current === 1) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title={t('athletes.profile.editDetails')}
            onOpenAutoFocus={(e) => e.preventDefault()}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={updateDetailsMutation.isPending}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        onClick={handleSaveDetails}
                        disabled={!hasChanges || updateDetailsMutation.isPending}
                        className="gap-2"
                    >
                        {updateDetailsMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {t('general.save')}
                    </Button>
                </div>
            }
        >
            <div
                className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1 relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background border-2 border-dashed border-primary rounded-lg pointer-events-none">
                        <p className="text-lg font-semibold text-primary">Drop image here</p>
                    </div>
                )}
                <div className="w-full flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={clientAvatar || undefined} alt={clientName} />
                                <AvatarFallback className="text-lg">
                                    {clientName ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Camera className="size-3" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">Profile picture</p>
                            <p className="text-xs text-muted-foreground">Drag and drop an image to change</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Change Picture</Button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="full-name"><span>{t('athletes.profile.athleteName')}<RequiredAsterisk /></span></Label>
                    <Input id="full-name" ref={firstNameInputRef} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email"><span>{t('athletes.profile.email')}<RequiredAsterisk /></span></Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="birth-date"><span>{t('athletes.profile.birthDate')}</span></Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                id="birth-date"
                                className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors"
                                aria-label={t('athletes.profile.selectBirthDate')}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm", !formData.birthDate && "text-muted-foreground")}>
                                        {formData.birthDate ? format(new Date(formData.birthDate), "d MMM, yyyy") : t('athletes.profile.selectBirthDate')}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <CalendarComponent 
                                mode="single" 
                                selected={formData.birthDate ? new Date(formData.birthDate) : undefined} 
                                onSelect={(date) => {
                                    setFormData({ ...formData, birthDate: date ? format(date, 'yyyy-MM-dd') : null });
                                    setIsCalendarOpen(false);
                                }} 
                                captionLayout="dropdown" 
                                fromYear={1900} 
                                toYear={new Date().getFullYear()} 
                                disabled={(date) => date > new Date()} 
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gender"><span>{t('athletes.profile.gender')}</span></Label>
                        <Select value={formData.gender || undefined} onValueChange={(value: any) => setFormData({ ...formData, gender: value })}>
                            <SelectTrigger className="w-full"><SelectValue placeholder={t('athletes.profile.selectGender')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">{t('athletes.profile.male')}</SelectItem>
                                <SelectItem value="female">{t('athletes.profile.female')}</SelectItem>
                                <SelectItem value="prefer-not-to-say">{t('athletes.profile.preferNotToSay')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category"><span>{t('athletes.profile.category')}</span></Label>
                        <Select value={formData.category || undefined} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                            <SelectTrigger className="w-full"><SelectValue placeholder={t('athletes.profile.selectCategory')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">{t('athletes.profile.online')}</SelectItem>
                                <SelectItem value="in-person">{t('athletes.profile.inPerson')}</SelectItem>
                                <SelectItem value="hybrid">{t('athletes.profile.hybrid')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone"><span>{t('athletes.profile.phone')}</span></Label>
                    <PhoneInput value={convertPhoneToE164(formData.phone || '')} onChange={(value) => setFormData({ ...formData, phone: value || '' })} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="country"><span>{t('athletes.profile.country')}</span></Label>
                    <CountrySelect 
                        value={getCountryCode(formData.country) as Country | undefined} 
                        onChange={(country) => setFormData({ ...formData, country: getCountryName(country) || country })} 
                    />
                </div>
            </div>
        </SidePanel>
    );
}
