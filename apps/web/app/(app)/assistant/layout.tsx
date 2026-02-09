import { AssistantSidebar } from "./components/sidebar";

export default function AssistantLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full w-full flex">
            <div className="w-[400px] border-r bg-background flex flex-col">
                <AssistantSidebar />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                {children}
            </div>
        </div>
    );
}
