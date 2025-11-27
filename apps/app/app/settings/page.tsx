import { Separator } from '@/components/ui/separator';

const SettingsPage = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">Settings</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4">{/* Settings content */}</div>
    </div>
  );
};

export default SettingsPage;
