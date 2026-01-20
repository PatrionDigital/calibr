export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <pre className="text-green-500 text-sm mb-8">
          {`
 ██████╗ █████╗ ██╗     ██╗██████╗ ██████╗    ██╗  ██╗   ██╗
██╔════╝██╔══██╗██║     ██║██╔══██╗██╔══██╗   ██║  ╚██╗ ██╔╝
██║     ███████║██║     ██║██████╔╝██████╔╝   ██║   ╚████╔╝
██║     ██╔══██║██║     ██║██╔══██╗██╔══██╗   ██║    ╚██╔╝
╚██████╗██║  ██║███████╗██║██████╔╝██║  ██║██╗███████╗██║
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝
          `}
        </pre>
        <h1 className="text-2xl mb-4">Prediction Market Portfolio Manager</h1>
        <p className="text-green-400 mb-8">
          Aggregate, analyze, and optimize your forecasting performance.
        </p>
        <div className="border border-green-500 p-4">
          <p className="text-sm">{">"} System initializing...</p>
          <p className="text-sm">{">"} Phase 1.1 complete: Monorepo structure created</p>
        </div>
      </div>
    </main>
  );
}
