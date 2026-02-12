'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { SidePanel } from '@/components/app/side-panel';
import { parseCSV, type ClientData } from '@/lib/general/csv-parser';
import { cn } from '@/lib/general/utils';
import { Trash2, Check, Upload } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useQueryClient } from '@tanstack/react-query';

interface UploadClientsSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientsAdded?: () => void;
}

import { addClients } from '@/api/coach/coach-client-service';
import { toast } from 'sonner';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { useTerminology } from '@/hooks/use-terminology';

export const UploadClientsSidePanel = ({ open, onOpenChange, onClientsAdded }: UploadClientsSidePanelProps) => {
  const t = useTranslations();
  const terminology = useTerminology();
  const queryClient = useQueryClient();
  const { activeOnboardings } = useCoachOnboardings();
  const hasOnboardings = activeOnboardings.length > 0;
  const [uploadStep, setUploadStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidatingCSV, setIsValidatingCSV] = useState<boolean>(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [parsedClients, setParsedClients] = useState<ClientData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedOnboardingId, setSelectedOnboardingId] = useState<string>('');
  const dragCounterRef = useRef(0);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setUploadStep(1);
      setSelectedFile(null);
      setIsValidatingCSV(false);
      setCsvError(null);
      setParsedClients([]);
      setIsDragging(false);
      dragCounterRef.current = 0;
      setSelectedOnboardingId('');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
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
    dragCounterRef.current = 0;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setSelectedFile(droppedFile);
      setCsvError(null);
    }
  };

  const handleRemoveClient = (index: number) => {
    setParsedClients((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        handleOpenChange(false);
      }
      return updated;
    });
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={handleOpenChange}
      title={terminology.uploadPlural}
      contentClassName="sm:w-[600px] sm:max-w-[600px]"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            aria-label={t('athletes.uploadClients.cancelAria')}
          >
            {t('athletes.uploadClients.cancel')}
          </Button>
          {uploadStep === 1 && (
            <Button
              type="button"
              disabled={!selectedFile || isValidatingCSV}
              onClick={async () => {
                if (selectedFile) {
                  setIsValidatingCSV(true);
                  setCsvError(null);

                  try {
                    const result = await parseCSV(selectedFile);

                    if (!result.isValid) {
                      setCsvError(result.error || t('athletes.uploadClients.invalidCsv'));
                      setIsValidatingCSV(false);
                      return;
                    }

                    if (result.clients) {
                      setParsedClients(result.clients);
                    }
                    setUploadStep(2);
                    setIsValidatingCSV(false);
                  } catch (error) {
                    setCsvError(t('athletes.uploadClients.errorProcessing'));
                    setIsValidatingCSV(false);
                  }
                }
              }}
              aria-label={t('athletes.uploadClients.continueToReview')}
              className="gap-2"
            >
              {isValidatingCSV ? (
                <Spinner className="size-4" />
              ) : (
                t('athletes.uploadClients.continue')
              )}
            </Button>
          )}
          {uploadStep === 2 && hasOnboardings && (
            <Button
              type="button"
              onClick={() => setUploadStep(3)}
              aria-label={t('athletes.uploadClients.continueToFinal')}
              className="gap-2"
            >
              {t('athletes.uploadClients.continue')}
            </Button>
          )}
          {uploadStep === 2 && !hasOnboardings && (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await addClients({ clients: parsedClients });
                  await queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
                  toast.success(t('athletes.addClient.invitationSent'));
                  if (onClientsAdded) onClientsAdded();
                  handleOpenChange(false);
                } catch (error) {
                  toast.error(t('athletes.uploadClients.errorProcessing'));
                  console.error(error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              aria-label={t('athletes.uploadClients.save')}
              className="gap-2"
            >
              {isSubmitting ? <Spinner className="size-4" /> : <Check className="size-4" />}
              {t('athletes.uploadClients.save')}
            </Button>
          )}
          {uploadStep === 3 && (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await addClients({ clients: parsedClients });
                  await queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
                  toast.success(t('athletes.addClient.invitationSent'));
                  if (onClientsAdded) onClientsAdded();
                  handleOpenChange(false);
                } catch (error) {
                  toast.error(t('athletes.uploadClients.errorProcessing'));
                  console.error(error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              aria-label={t('athletes.uploadClients.send')}
              className="gap-2"
            >
              {isSubmitting ? <Spinner className="size-4" /> : <Check className="size-4" />}
              {t('athletes.uploadClients.send')}
            </Button>
          )}
        </div>
      }
    >
      <div
        className="flex-1 overflow-hidden flex flex-col relative"
        onDragEnter={uploadStep === 1 ? handleDragEnter : undefined}
        onDragLeave={uploadStep === 1 ? handleDragLeave : undefined}
        onDragOver={uploadStep === 1 ? handleDragOver : undefined}
        onDrop={uploadStep === 1 ? handleDrop : undefined}
      >
        {isDragging && uploadStep === 1 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
            <p className="text-lg font-semibold text-primary pointer-events-none">Drop CSV file here</p>
          </div>
        )}
        {/* Step 1: Upload CSV */}
        {uploadStep === 1 && (
          <div className={cn('flex flex-col items-center gap-6', isDragging && 'opacity-0 pointer-events-none')}>
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-lg font-semibold">{t('athletes.uploadClients.step1')}</h3>
              {csvError && <p className="text-sm text-destructive text-center">{csvError}</p>}
            </div>
            <div className="w-full max-w-md">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer">
                {selectedFile ? (
                  <>
                    <Check className="size-10 text-green-500" />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedFile(null);
                        setCsvError(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      {t('athletes.uploadClients.changeFile')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">{t('athletes.uploadClients.clickToUpload')}</p>
                      <p className="text-xs text-muted-foreground">{t('athletes.uploadClients.csvFileOnly')}</p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="csv-upload"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setCsvError(null);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t('athletes.uploadClients.selectFile')}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {t('athletes.uploadClients.downloadTemplate')}{' '}
              <a
                href="/clients.csv"
                download="clients.csv"
                className="underline text-foreground hover:text-primary transition-colors font-semibold text-base"
              >
                {t('athletes.uploadClients.csvTemplate')}
              </a>
              {t('athletes.uploadClients.addClientInfo')}
            </p>
          </div>
        )}

        {/* Step 2: Review & Confirm */}
        {uploadStep === 2 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-center">
              {t('athletes.uploadClients.reviewTitle', { count: parsedClients.length, term: terminology.countLabel(parsedClients.length) })}
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]" />
                    <TableHead>{t('athletes.uploadClients.fullName')}</TableHead>
                    <TableHead className="w-[200px]">{t('athletes.uploadClients.email')}</TableHead>
                    <TableHead>{t('athletes.uploadClients.category')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {terminology.noPluralFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    parsedClients.map((client, index) => (
                      <TableRow key={`${client.email}-${index}`}>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveClient(index)}
                            aria-label={t('athletes.uploadClients.removeClient', { name: client.fullName })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={client.fullName}
                            onChange={(e) => {
                              setParsedClients((prev) =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, fullName: e.target.value } : c
                                )
                              );
                            }}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <Input
                            type="email"
                            value={client.email}
                            onChange={(e) => {
                              setParsedClients((prev) =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, email: e.target.value } : c
                                )
                              );
                            }}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={client.category}
                            onValueChange={(value) => {
                              setParsedClients((prev) =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, category: value } : c
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 min-h-0 py-1 w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="In-Person">In-Person</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 3: Select Onboarding (optional) */}
        {uploadStep === 3 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <h3 className="text-lg font-semibold">
                {t('athletes.uploadClients.onboardingTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('athletes.uploadClients.onboardingDescription')}
              </p>
            </div>
            <Select
              value={selectedOnboardingId}
              onValueChange={setSelectedOnboardingId}
            >
              <SelectTrigger clearable className="w-full">
                <SelectValue placeholder={t('general.none')} />
              </SelectTrigger>
              <SelectContent>
                {activeOnboardings.map((onboarding) => (
                  <SelectItem key={onboarding.id} value={onboarding.id} description={onboarding.description}>
                    {onboarding.name || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </SidePanel>
  );
};
