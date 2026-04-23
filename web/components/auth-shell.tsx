import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="page">
      <section className="card">
        <Link href="/" className="brand">
          GT CheckList
        </Link>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  );
}
