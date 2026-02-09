import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Download',
};

export default function DownloadPage() {
  return (
    <div className="fixed inset-0 bg-[#272727] flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <Image
          src="/icons/athli.png"
          alt="Athli"
          width={120}
          height={120}
          className="object-contain mx-auto"
        />
        <h1 className="text-2xl font-semibold text-foreground">
          Download the app to begin your experience
        </h1>
      </div>
    </div>
  );
}
