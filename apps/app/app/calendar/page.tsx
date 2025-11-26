import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const CalendarPage = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">Calendar</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-semibold">Connect your Calendar</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            You will be able to book sessions directly here and it will sync with your connected
            calendar.
          </p>
          <Button className="mt-2">Connect</Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
