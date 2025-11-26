import { Separator } from '@/components/ui/separator';

const DashboardPage = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">Dashboard</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 flex items-center justify-center">
        <h2 className="text-2xl font-semibold text-muted-foreground">Coming Soon</h2>
      </div>
    </div>
  );
};

export default DashboardPage;
