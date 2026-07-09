import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft, Music2 } from "lucide-react";
import Link from "next/link";

const sampleMusic = `{
  "name": "松弛低能量节拍",
  "publicUrl": "",
  "bucket": "music-assets",
  "path": "",
  "moodTags": "松弛,低能量,幽默",
  "usage": "适合低能量穿搭、白底变装和生活方式短片。"
}`;

const musicFieldHints = [
  "音乐名称：展示在工作台短视频配置里的曲目名称。",
  "音乐地址：已有公开音频地址时填写；使用存储桶时填写存储路径。",
  "情绪标签：多个标签用中文逗号分隔。",
  "使用场景：说明适合哪类变装视频、客户气质或商品展示。",
];

export default async function AdminMusicPage() {
  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const catalog = await getCatalogData();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回后台
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <p className="text-sm font-medium text-red-700">音乐库</p>
          <h1 className="mt-2 text-3xl font-semibold">管理短视频音乐和情绪标签。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            第一阶段先记录曲目、情绪标签和使用场景；正式上线后再上传到 Supabase 音乐存储桶。
          </p>
          <div className="mt-6 space-y-3">
            {catalog.musicTracks.map((track) => (
              <div key={track.name} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <Music2 className="h-5 w-5 text-red-700" />
                  <h2 className="text-sm font-semibold">{track.name}</h2>
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  {track.usage || "来自 Supabase 音乐库。"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.moodTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">
                      {tag}
                    </span>
                  ))}
                </div>
                {track.publicUrl && (
                  <p className="mt-3 truncate text-xs text-stone-400">
                    音乐地址：{track.publicUrl}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <JsonCreateForm
          endpoint="/api/admin/music"
          initialValue={sampleMusic}
          fieldHints={musicFieldHints}
          submitText="保存音乐"
        />
      </div>
    </main>
  );
}
