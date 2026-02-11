'use client';

import { useState } from 'react';
import { Upload, Building2, Loader2 } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/app/image-crop-dialog';
import { useGlobalData } from '@/providers/global-data-provider';
import { toast } from 'sonner';

interface LogoStepProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function LogoStep({ value, onChange }: LogoStepProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { uploadAndSetCompanyLogo, isUploadingLogo } = useGlobalData();

  const handleImageSave = async (file: File) => {
    try {
      const publicUrl = await uploadAndSetCompanyLogo(file);
      onChange(publicUrl);
      toast.success('Logo uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload logo');
    }
  };

  return (
    <div>
      <ImageCropDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleImageSave}
        title="Upload your logo"
        description="This will be shown to your clients"
      />

      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        Add your logo
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-8"
      >
        Make your brand stand out
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Avatar className="h-20 w-20">
          {value ? (
            <AvatarImage src={value} alt="Company logo" />
          ) : (
            <AvatarFallback className="bg-muted">
              <Building2 className="size-8 text-muted-foreground" />
            </AvatarFallback>
          )}
        </Avatar>

        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={isUploadingLogo}
          className="rounded-xl"
        >
          {isUploadingLogo ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {value ? 'Change logo' : 'Upload logo'}
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
