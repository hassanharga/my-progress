export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-4xl font-bold text-primary">
        My Progress
      </h1>
      <p className="text-muted-foreground">
        Landing page coming soon.{' '}
        <a href="/dashboard" className="text-primary underline">
          Go to dashboard →
        </a>
      </p>
    </main>
  );
}
