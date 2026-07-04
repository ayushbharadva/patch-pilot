export default function SignInLoading() {
  return (
    <div className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-svh max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.88fr)] lg:items-center">
        <div className="space-y-6">
          <div className="h-9 w-40 rounded-full bg-surface-elevated/80" />
          <div className="h-12 w-[min(28rem,90%)] rounded-2xl bg-surface-elevated/80" />
          <div className="h-20 w-[min(38rem,95%)] rounded-3xl bg-surface-elevated/60" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-surface-elevated/70" />
            <div className="h-24 rounded-2xl bg-surface-elevated/70" />
            <div className="h-24 rounded-2xl bg-surface-elevated/70" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-border/60 bg-surface-elevated/70 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="h-6 w-28 rounded-full bg-background/80" />
          <div className="mt-5 space-y-4">
            <div className="h-11 rounded-xl bg-background/80" />
            <div className="h-11 rounded-xl bg-background/80" />
            <div className="h-11 rounded-xl bg-background/80" />
            <div className="h-11 rounded-xl bg-primary/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
