import type { Metadata } from 'next';
import AIChatInterface from "./components/ai-chat-interface";

export const metadata: Metadata = {
  title: 'Assistant',
};

export default function AssistantPage() {
    return (
        <div className="flex h-full w-full">
            <AIChatInterface />
        </div>
    );
}
