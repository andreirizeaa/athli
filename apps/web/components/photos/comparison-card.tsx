import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/general/utils';
import { ClientPhoto } from '@/api/client/client-photo-service';

export interface ComparisonCardProps {
    date: Date | null;
    photos: {
        front?: ClientPhoto;
        side?: ClientPhoto;
        back?: ClientPhoto;
    };
    availableDates: Date[];
    onDateChange: (direction: 'prev' | 'next') => void;
    onDateSelect: (date: Date) => void;
    onUpload: (angle: 'front' | 'side' | 'back', file: File) => Promise<void>;
    onDelete: (photoId: string, angle: 'front' | 'side' | 'back', date: Date) => Promise<void>;
    className?: string;
    hasPrev?: boolean;
    hasNext?: boolean;
    isEmpty?: boolean;
    angleFilter?: 'all' | 'front' | 'back' | 'side';
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
    date,
    photos,
    availableDates,
    onDateChange,
    onDateSelect,
    onUpload,
    onDelete,
    className,
    hasPrev = false,
    hasNext = false,
    isEmpty = false,
    angleFilter = 'all',
}) => {
    const [uploadingAngle, setUploadingAngle] = useState<'front' | 'side' | 'back' | null>(null);
    const [dragOverAngle, setDragOverAngle] = useState<'front' | 'side' | 'back' | null>(null);

    const formatDate = (date: Date): string => {
        return format(date, 'MMM d, yyyy');
    };

    const handleFileDrop = async (
        angle: 'front' | 'side' | 'back',
        file: File
    ) => {
        setUploadingAngle(angle);
        try {
            await onUpload(angle, file);
        } catch (error) {
            console.error('Failed to upload photo:', error);
        } finally {
            setUploadingAngle(null);
        }
    };

    const renderPhotoSlot = (angle: 'front' | 'side' | 'back', label: string) => {
        const photo = photos[angle];

        return (
            <Card className="flex flex-col h-full overflow-hidden shadow-sm group/slot py-0 gap-0">
                <div className="w-full pb-2 pt-2 px-4 border-b flex justify-between items-center bg-muted/20 flex-shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label} View</span>
                    {photo && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (date) {
                                    onDelete(photo.id, angle, date);
                                }
                            }}
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            aria-label={`Delete ${angle} photo`}
                        >
                            <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                    )}
                </div>

                <div className="flex-1 p-4 bg-background flex items-center justify-center relative min-h-0">
                    {photo ? (
                        <img
                            src={photo.url}
                            className="max-w-full max-h-full object-contain bg-black/5 rounded-sm"
                            alt={`${label} view`}
                        />
                    ) : (
                        <div
                            className={cn(
                                "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                                uploadingAngle === angle
                                    ? "border-primary bg-primary/5"
                                    : dragOverAngle === angle
                                        ? "border-primary bg-primary/10"
                                        : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50",
                                !date && "cursor-not-allowed opacity-50"
                            )}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (date) setDragOverAngle(angle);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverAngle(null);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverAngle(null);
                                if (!date) return;

                                const file = e.dataTransfer.files[0];
                                if (file && file.type.startsWith('image/')) {
                                    handleFileDrop(angle, file);
                                }
                            }}
                            onClick={() => {
                                if (!date) return;
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                        handleFileDrop(angle, file);
                                    }
                                };
                                input.click();
                            }}
                        >
                            {uploadingAngle === angle ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground font-medium">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <Upload className="size-8 text-muted-foreground/40" />
                                    <span className="text-xs text-muted-foreground/60">{date ? "Drop or click to upload" : "Select date"}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    if (isEmpty) {
        return (
            <Card className={cn("flex flex-col h-full overflow-hidden shadow-sm py-0 gap-0", className)}>
                <div className="flex-1 flex items-center justify-center">
                    <h2 className="text-lg font-medium text-muted-foreground">No data to compare with</h2>
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn("flex flex-col h-full overflow-hidden shadow-sm py-0 gap-0", className)}>
            <div className="w-full border-b p-2 flex justify-between items-center gap-2 bg-muted/20 flex-shrink-0 min-h-[50px]">
                <Button
                    variant="outline"
                    className="h-8 w-8 rounded-full p-0 flex-shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={!hasPrev}
                    onClick={() => onDateChange('prev')}
                >
                    <ChevronLeft className="size-4" />
                </Button>

                <Select
                    value={date ? format(date, 'yyyy-MM-dd') : undefined}
                    onValueChange={(value) => {
                        const selectedDate = availableDates.find(d => format(d, 'yyyy-MM-dd') === value);
                        if (selectedDate) {
                            onDateSelect(selectedDate);
                        }
                    }}
                >
                    <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue placeholder="Select date">
                            {date ? formatDate(date) : 'Select date'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {availableDates.map((d) => (
                            <SelectItem key={format(d, 'yyyy-MM-dd')} value={format(d, 'yyyy-MM-dd')}>
                                {formatDate(d)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    className="h-8 w-8 rounded-full p-0 flex-shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={!hasNext}
                    onClick={() => onDateChange('next')}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>

            <div className={`flex-1 px-4 pb-2 pt-2 overflow-auto ${angleFilter === 'all' ? 'grid grid-cols-3 gap-4' : 'flex items-center justify-center'}`}>
                <div className={angleFilter === 'all' ? 'contents' : 'w-full max-w-sm h-full flex flex-col'}>
                    {(angleFilter === 'all' || angleFilter === 'front') && renderPhotoSlot('front', 'Front')}
                    {(angleFilter === 'all' || angleFilter === 'side') && renderPhotoSlot('side', 'Side')}
                    {(angleFilter === 'all' || angleFilter === 'back') && renderPhotoSlot('back', 'Back')}
                </div>
            </div>
        </Card>
    );
};
