import { AssistantSidebar } from "./components/sidebar";

export default function AssistantLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full w-full">
            <div className="w-[20%] min-w-[250px] max-w-[300px]">
                <AssistantSidebar />
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
