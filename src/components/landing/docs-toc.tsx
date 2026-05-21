"use client";

type TocItem = { id: string; label: string };

export function DocsToc({ items }: { items: TocItem[] }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Mundarija"
      className="mb-16 rounded-lg border border-dashed border-border bg-subtle/30 px-5 py-4"
    >
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
        Mundarija
      </p>
      <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13.5px] sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-6">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className="text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
