import Link from "next/link";

type AdminGuardMessageProps = {
  message: string;
};

export function AdminGuardMessage({ message }: AdminGuardMessageProps) {
  return (
    <main className="min-h-screen bg-[#fbfaf7] px-5 py-10 text-stone-950">
      <section className="mx-auto max-w-xl rounded-md border border-stone-200 bg-white p-6">
        <p className="text-sm font-medium text-red-700">后台权限</p>
        <h1 className="mt-2 text-2xl font-semibold">暂时无法进入后台</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">{message}</p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
        >
          返回首页
        </Link>
      </section>
    </main>
  );
}
