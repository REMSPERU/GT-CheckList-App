import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-[420px] rounded-[14px] border border-slate-300 bg-white p-7 shadow-[0_12px_36px_rgba(15,35,57,0.08)] max-[480px]:p-[22px]">
        <Link
          href="/"
          className="mb-3 inline-block font-bold tracking-[0.4px] no-underline">
          GT CheckList
        </Link>
        <h1 className="m-0 text-[1.6rem] font-bold">{title}</h1>
        <p className="mt-2.5 text-slate-500">{description}</p>
        {children}
      </section>
    </main>
  );
}
