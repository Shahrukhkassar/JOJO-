import ChatInterface from '@/components/ChatInterface';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div id="jojo-app-root" className="min-h-screen w-full bg-[#FAF7F5]">
      <ChatInterface />
    </div>
  );
}
