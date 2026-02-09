import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer'

export default function MobileClientPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <HeroHeader />
            <main className="flex-1 pt-24">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <div className="min-h-[400px] rounded-2xl border bg-card p-8">
                        <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">Client App</h1>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
