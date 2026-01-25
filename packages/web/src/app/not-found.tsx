import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="ascii-box p-8 max-w-lg text-center">
        <pre className="text-[hsl(var(--error))] text-xs mb-4">
{`
 ██╗  ██╗ ██████╗ ██╗  ██╗
 ██║  ██║██╔═████╗██║  ██║
 ███████║██║██╔██║███████║
 ╚════██║████╔╝██║╚════██║
      ██║╚██████╔╝     ██║
      ╚═╝ ╚═════╝      ╚═╝
`}
        </pre>
        <h2 className="text-lg font-bold mb-2 text-[hsl(var(--error))]">[PAGE NOT FOUND]</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          The requested resource could not be located.
        </p>
        <Link
          href="/"
          className="inline-block text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
        >
          RETURN HOME
        </Link>
      </div>
    </div>
  );
}
