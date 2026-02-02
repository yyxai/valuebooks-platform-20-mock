import { SellForm } from '@/components/sell-form';

export default function SellPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">ValueBooks</h1>
        <p className="text-gray-600">送料無料・スピード入金</p>
      </div>
      <SellForm />
    </main>
  );
}
