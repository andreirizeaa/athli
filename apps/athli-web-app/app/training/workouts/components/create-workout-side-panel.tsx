'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { Spinner } from '@/components/ui/spinner';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';
import { generateWorkoutFromPrompt } from '@/api/exercise/generate-exercise';
import { createWorkout } from '@/api/coach/coach-workout-service';
import { toast } from 'sonner';
import { useTrainingData } from '../../training-data-context';
import { BasicInformation } from '../new/basic-information';
import { DIFFICULTY_LEVELS } from '@/lib/constants/training';
import {
    X,
    Check,
    FileText,
    Sparkles,
    BrainCog,
} from 'lucide-react';

interface CreateWorkoutSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateWorkoutSidePanel = ({ open, onOpenChange }: CreateWorkoutSidePanelProps) => {
    const t = useTranslations();
    const router = useRouter();
    const { refreshWorkouts } = useTrainingData();

    const [newWorkoutName, setNewWorkoutName] = useState<string>('');
    const [newWorkoutType, setNewWorkoutType] = useState<string>('');
    const [newDifficulty, setNewDifficulty] = useState<string>('all levels');
    const [newDescription, setNewDescription] = useState<string>('');
    const [newNameError, setNewNameError] = useState<string | null>(null);
    const [newTypeError, setNewTypeError] = useState<string | null>(null);
    const [newDifficultyError, setNewDifficultyError] = useState<string | null>(null);
    const [newSelectedBuilder, setNewSelectedBuilder] = useState<'standard' | 'ai' | null>('ai');
    const [isCreateWorkoutStep2, setIsCreateWorkoutStep2] = useState<boolean>(false);
    const [aiPrompt, setAiPrompt] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isGeneratingStandard, setIsGeneratingStandard] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetCreateWorkoutState = () => {
        setNewWorkoutName('');
        setNewWorkoutType('');
        setNewDifficulty(DIFFICULTY_LEVELS[0].value);
        setNewDescription('');
        setNewNameError(null);
        setNewTypeError(null);
        setNewDifficultyError(null);
        setNewSelectedBuilder('ai');
        setIsCreateWorkoutStep2(false);
        setAiPrompt('');
        setSelectedFile(null);
        setIsDragging(false);
        setIsGenerating(false);
        setIsGeneratingStandard(false);
    };

    const handleCreateWorkoutContinue = async () => {
        if (!isCreateWorkoutStep2) {
            // Step 1: Validate and move to step 2 if AI builder selected
            if (!newWorkoutName.trim()) {
                setNewNameError(t('library.workoutNameRequired'));
                return;
            }
            if (!newWorkoutType) {
                setNewTypeError(t('library.workoutTypeRequired'));
                return;
            }
            if (!newDifficulty) {
                setNewDifficultyError(t('library.difficultyRequired'));
                return;
            }
            if (!newSelectedBuilder) {
                return;
            }

            // If AI builder, go to step 2
            if (newSelectedBuilder === 'ai') {
                setIsCreateWorkoutStep2(true);
                return;
            }

            // If standard builder, create workout directly and close panel
            const meta = {
                title: newWorkoutName.trim(),
                description: newDescription.trim(),
                type: newWorkoutType.toLowerCase().replace(/\s+/g, '_'),
                difficulty: newDifficulty.toLowerCase().replace(/\s+/g, '_'),
                equipment: [],
                totalExercises: 0,
                sections: [
                    {
                        id: `sec_regular_${Date.now()}`,
                        type: 'regular' as const,
                        exercises: [],
                    },
                ]
            };

            setIsGeneratingStandard(true);
            try {
                await createWorkout(meta as any);
                toast.success(t('workouts.new.toast.savedSuccessfully', {
                    name: meta.title,
                    type: meta.type.charAt(0).toUpperCase() + meta.type.slice(1)
                }), {
                    style: {
                        background: 'rgb(220 252 231)',
                        color: 'rgb(20 83 45)',
                        border: '1px solid rgb(187 247 208)',
                    },
                });
                await refreshWorkouts();
                onOpenChange(false);
                resetCreateWorkoutState();
            } catch (error) {
                console.error('Failed to create workout:', error);
                toast.error(t('general.error'));
            } finally {
                setIsGeneratingStandard(false);
            }
        } else {
            // Step 2: Generate AI workout and navigate to builder
            setIsGenerating(true);
            const prompt = aiPrompt.trim();

            const meta = {
                title: newWorkoutName.trim(),
                description: newDescription.trim(),
                type: newWorkoutType.toLowerCase().replace(/\s+/g, '_'),
                difficulty: newDifficulty.toLowerCase().replace(/\s+/g, '_'),
                builder: newSelectedBuilder,
            };

            try {
                window.localStorage.setItem('athli_new_workout_meta', JSON.stringify(meta));
            } catch {
                // Ignore storage errors
            }

            // Store prompt and attachments for chat
            let pdfContent: string | null = null;
            if (selectedFile) {
                pdfContent = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        // Convert ArrayBuffer to base64 string
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = btoa(binary);
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(selectedFile);
                });
            }

            const chatData = {
                prompt,
                pdfAttachment: pdfContent && selectedFile
                    ? {
                        name: selectedFile.name,
                        data: pdfContent,
                        type: selectedFile.type,
                        size: selectedFile.size,
                    }
                    : null,
            };

            try {
                window.localStorage.setItem('athli_ai_workout_chat', JSON.stringify(chatData));
            } catch {
                // Ignore storage errors
            }

            let generated: any = null;
            try {
                generated = await generateWorkoutFromPrompt(prompt, pdfContent);
                // eslint-disable-next-line no-console
                console.log('AI generated workout', generated);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to generate workout from AI', error);
                setIsGenerating(false);
                return;
            }

            if (generated) {
                try {
                    window.localStorage.setItem('athli_ai_generated_workout', JSON.stringify(generated));
                } catch {
                    // Ignore storage errors
                }
            } else {
                try {
                    window.localStorage.removeItem('athli_ai_generated_workout');
                } catch {
                    // Ignore storage errors
                }
            }

            try {
                // Set access flag for standard builder - ensure it's set before navigation
                window.localStorage.setItem('athli_workout_builder_access', 'standard');
                // Force a small delay to ensure localStorage is written
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch {
                // Ignore storage errors
            }

            // Wait a bit longer before navigation to ensure everything is ready
            setTimeout(() => {
                const targetPath = '/training/workouts/new';
                router.push(targetPath);

                // Keep sidebar open during navigation, close after a brief delay
                setTimeout(() => {
                    onOpenChange(false);
                    setIsGenerating(false);
                }, 300);
            }, 600);
        }
    };

    const handleCreateWorkoutBack = () => {
        setIsCreateWorkoutStep2(false);
    };

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set isDragging to false if we're leaving the drop zone entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const validFile = files.find((file) => file.type === 'application/pdf');

        if (validFile) {
            setSelectedFile(validFile);
        }
    };

    const handleUseExample = () => {
        const examplePrompt = `Create a full-body strength and conditioning workout for intermediate level. Include:

- 3-4 compound exercises (squats, deadlifts, bench press variations)
- 2-3 accessory movements for arms and core
- 3-4 sets per exercise
- Progressive rep ranges (8-12 reps for strength, 12-15 for hypertrophy)
- 60-90 seconds rest between sets
- Total workout duration: 45-60 minutes

Focus on proper form and progressive overload.`;
        setAiPrompt(examplePrompt);
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen && !isGenerating && !isGeneratingStandard) {
                    onOpenChange(isOpen);
                    resetCreateWorkoutState();
                }
            }}
            title={t('library.newWorkout')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isGenerating || isGeneratingStandard}
                        aria-label={t('library.cancelCreatingWorkout')}
                    >
                        {t('general.cancel')}
                    </Button>
                    {isCreateWorkoutStep2 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCreateWorkoutBack}
                            disabled={isGenerating || isGeneratingStandard}
                            aria-label={t('library.backToWorkoutDetails')}
                        >
                            {t('general.back')}
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={handleCreateWorkoutContinue}
                        disabled={
                            isGenerating ||
                            isGeneratingStandard ||
                            (isCreateWorkoutStep2
                                ? !aiPrompt.trim()
                                : !newWorkoutName.trim() ||
                                !newWorkoutType ||
                                !newDifficulty ||
                                !newSelectedBuilder)
                        }
                        aria-label={isCreateWorkoutStep2 ? t('library.generateWorkout') : t('library.continue')}
                        className="gap-2"
                    >
                        {isCreateWorkoutStep2 ? (
                            isGenerating ? (
                                <>
                                    <Spinner className="size-4" />
                                    {t('library.generate')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="size-4" />
                                    {t('library.generate')}
                                </>
                            )
                        ) : isGeneratingStandard ? (
                            <>
                                <Spinner className="size-4" />
                                {t('library.continue')}
                            </>
                        ) : (
                            <>
                                <Check className="size-4" />
                                {t('library.continue')}
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            {!isCreateWorkoutStep2 ? (
                <BasicInformation
                    workoutName={newWorkoutName}
                    setWorkoutName={setNewWorkoutName}
                    workoutType={newWorkoutType}
                    setWorkoutType={setNewWorkoutType}
                    difficulty={newDifficulty}
                    setDifficulty={setNewDifficulty}
                    description={newDescription}
                    setDescription={setNewDescription}
                    nameError={newNameError}
                    setNameError={setNewNameError}
                    typeError={newTypeError}
                    setTypeError={setNewTypeError}
                    difficultyError={newDifficultyError}
                    setDifficultyError={setNewDifficultyError}
                    selectedBuilder={newSelectedBuilder}
                    setSelectedBuilder={setNewSelectedBuilder}
                />
            ) : (
                <div
                    className="flex flex-col h-full relative"
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div
                            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary flex items-center justify-center pointer-events-auto"
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                                    <FileText className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">{t('library.dropPdfHere')}</p>
                                    <p className="text-sm text-muted-foreground">{t('library.pdfFilesOnly')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-center gap-4 flex-shrink-0 pb-4">
                        <div className="relative flex items-center justify-center py-8 px-8">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 blur-sm opacity-30 -z-10"></div>
                            <div className="relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg">
                                <BrainCog className="h-10 w-10" />
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold text-center">{t('library.athliAiBuilder')}</h2>
                        <p className="text-sm text-foreground text-center max-w-md">
                            {t('library.dragDropPdf')}
                        </p>
                    </div>
                    <div className="-mx-4 mb-2">
                        <Separator className="w-full" />
                    </div>
                    <div className="flex-1 overflow-auto">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-semibold">
                                    {t('library.letsBuildWorkout')}<RequiredAsterisk />
                                </h3>
                            </div>
                            <div className="relative">
                                <Textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    rows={8}
                                    className="resize-none text-sm min-h-[200px] pb-12"
                                    placeholder={t('library.workoutPromptPlaceholder')}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    aria-label={t('library.selectPdfFile')}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleUseExample}
                                        className="h-7 px-3 text-xs"
                                        aria-label={t('library.useExample')}
                                    >
                                        {t('library.useExample')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleFileButtonClick}
                                        className="h-7 px-3 text-xs gap-1.5"
                                        aria-label={t('library.selectPdfFile')}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        {t('messages.pdf')}
                                    </Button>
                                </div>
                            </div>
                            {selectedFile && (
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-100">
                                        <FileText className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{t('messages.pdf')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={t('library.removePdfFile')}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </SidePanel>
    );
};
