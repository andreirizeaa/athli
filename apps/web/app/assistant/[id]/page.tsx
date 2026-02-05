import AIChatInterface from "../components/ai-chat-interface";

interface ChatPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
    const { id } = await params;

    return (
        <div className="flex h-full w-full">
            <AIChatInterface chatId={id} />
        </div>
    );
}
