'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, RotateCw, ZoomIn, Loader2 } from 'lucide-react';
import AvatarEditor from 'react-avatar-editor';
import { toast } from 'sonner';

interface ImageCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (file: File) => Promise<void>;
    title: string;
    description: string;
}

export function ImageCropDialog({
    open,
    onOpenChange,
    onSave,
    title,
    description,
}: ImageCropDialogProps) {
    // We'll use the profile picture dialog translations for the internal UI elements
    // but title and description are passed as props
    const t = useTranslations('settings.profile.profilePictureDialog');
    const tGeneral = useTranslations('general');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<AvatarEditor>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type (exclude GIF)
        if (!file.type.startsWith('image/') || file.type === 'image/gif') {
            toast.error(t('imageFileError'));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('imageSizeError'));
            return;
        }

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setScale(1);
        setRotate(0);
    };

    const dataURLtoFile = (dataUrl: string, filename: string): File => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleSaveUploadedImage = useCallback(async () => {
        if (!editorRef.current) return;

        setIsSaving(true);
        try {
            const canvas = editorRef.current.getImageScaledToCanvas();
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const file = dataURLtoFile(dataUrl, `image-${Date.now()}.png`);

            await onSave(file);

            // Clean up
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setSelectedFile(null);
            setPreviewUrl(null);
            setScale(1);
            setRotate(0);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || t('saveFailed'));
        } finally {
            setIsSaving(false);
        }
    }, [onSave, onOpenChange, previewUrl, t]);

    const handleClose = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setScale(1);
        setRotate(0);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] min-w-[600px] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto flex-1 overflow-hidden w-full mt-4">
                    {!selectedFile ? (
                        <>
                            <div className="w-full flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                                >
                                    <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {t('clickToUpload')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('fileTypes')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 w-full flex-shrink-0 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                >
                                    {tGeneral('cancel')}
                                </Button>
                                <Button
                                    disabled
                                >
                                    {tGeneral('save')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-muted rounded-lg p-3 flex items-center justify-center flex-shrink-0">
                                <AvatarEditor
                                    ref={editorRef}
                                    image={previewUrl || ''}
                                    width={246}
                                    height={246}
                                    border={15}
                                    borderRadius={125}
                                    color={[0, 0, 0, 0.6]}
                                    scale={scale}
                                    rotate={rotate}
                                />
                            </div>

                            <div className="w-full space-y-3 flex-shrink-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <ZoomIn className="h-4 w-4" />
                                            {t('zoom')}
                                        </label>
                                        <span className="text-xs text-muted-foreground">{scale.toFixed(1)}x</span>
                                    </div>
                                    <Slider
                                        value={[scale]}
                                        onValueChange={(value) => setScale(value[0])}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <RotateCw className="h-4 w-4" />
                                            {t('rotate')}
                                        </label>
                                        <span className="text-xs text-muted-foreground">{rotate}°</span>
                                    </div>
                                    <Slider
                                        value={[rotate]}
                                        onValueChange={(value) => setRotate(value[0])}
                                        min={0}
                                        max={360}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 w-full flex-shrink-0 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (previewUrl) {
                                            URL.revokeObjectURL(previewUrl);
                                        }
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                        setScale(1);
                                        setRotate(0);
                                    }}
                                >
                                    {tGeneral('cancel')}
                                </Button>
                                <Button
                                    onClick={handleSaveUploadedImage}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {tGeneral('saving')}
                                        </>
                                    ) : (
                                        tGeneral('save')
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
