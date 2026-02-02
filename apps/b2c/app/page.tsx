import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">ValueBooks</h1>
      <p className="text-xl text-text-secondary mb-8">Turn your used books into cash</p>
      <Link
        href="/sell"
        className="bg-brand text-text-inverse px-8 py-4 rounded-lg text-lg font-semibold hover:bg-brand-teal-600"
      >
        Sell Your Books
      </Link>
    </main>
  );
}
