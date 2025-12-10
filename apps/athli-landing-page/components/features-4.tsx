import { Bot, Dumbbell, MessageSquare, Pencil, Settings2, Sparkles } from 'lucide-react';

export default function Features() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
          <h2 className="text-balance text-4xl font-medium lg:text-5xl">
            Simplifiy your coaching business and improve your retention
          </h2>
          <p>
            OneNinety is more than just a coachin platform. It bridges the gap bewteen your business and your athletes providing an improved client experience.
          </p>
        </div>

        <div className="relative mx-auto grid max-w-4xl divide-x divide-y border *:p-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              <h3 className="text-sm font-medium">Messaging</h3>
            </div>
            <p className="text-xs">Fully private messaging with your athletes straight to their app!</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="size-4" />
              <h3 className="text-sm font-medium">Workout management</h3>
            </div>
            <p className="text-xs">Manage all your custom workouts and programs in one place, then directy assign them to your athletes!</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="size-4" />

              <h3 className="text-sm font-medium">AI Workout builder</h3>
            </div>
            <p className="text-xs">Build your dream workout through a chat interface saving you time and effort.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pencil className="size-4" />

              <h3 className="text-sm font-medium">Metrics</h3>
            </div>
            <p className="text-xs">View detailed metrics for your athletes, including progress, performance, and more. Athletes can view their own metrics in the app!</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4" />

              <h3 className="text-sm font-medium">Control</h3>
            </div>
            <p className="text-xs">You set what the app can and cannot do for users allowing your to customise the app to your business.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />

              <h3 className="text-sm font-medium">Branding</h3>
            </div>
            <p className="text-xs">Use our mobile app as a whitelabel solution to make your business stand out!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
