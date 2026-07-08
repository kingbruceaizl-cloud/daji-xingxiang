import { createAdminClient } from "@/lib/supabase/admin";
import type { AiJobType } from "./types";

const GENERATED_BUCKET = "generated-assets";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type SaveGeneratedResultInput = {
  supabase: SupabaseAdminClient;
  jobId: string;
  ownerId: string | null;
  projectId: string | null;
  jobType: AiJobType;
  resultUrls?: string[];
  provider: string;
  providerJobId: string;
};

type SaveGeneratedResultOutput = {
  assetIds: string[];
  failures: string[];
};

export type GeneratedResultAsset = {
  id: string;
  kind: string;
  title: string | null;
  bucket: string;
  path: string;
  url: string | null;
  accessError?: string;
  createdAt: string;
};

function isVideoJob(jobType: AiJobType) {
  return jobType === "image_to_video" || jobType === "video_render";
}

function extensionFromContentType(contentType: string | null, sourceUrl: string) {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();

  if (normalized === "image/jpeg") {
    return "jpg";
  }
  if (normalized === "image/png") {
    return "png";
  }
  if (normalized === "image/webp") {
    return "webp";
  }
  if (normalized === "video/mp4") {
    return "mp4";
  }

  try {
    const pathname = new URL(sourceUrl).pathname;
    const extension = pathname.split(".").pop();
    if (extension && extension.length <= 8) {
      return extension;
    }
  } catch {
    // Keep a safe default below.
  }

  return isVideoContentType(normalized) ? "mp4" : "jpg";
}

function isVideoContentType(contentType?: string | null) {
  return Boolean(contentType?.startsWith("video/"));
}

function assetKind(jobType: AiJobType, contentType: string | null) {
  if (isVideoJob(jobType) || isVideoContentType(contentType)) {
    return "generated_video";
  }

  return "generated_image";
}

function buildStoragePath(input: {
  ownerId: string | null;
  projectId: string | null;
  jobId: string;
  index: number;
  extension: string;
}) {
  const ownerSegment = input.ownerId || "system";
  const projectSegment = input.projectId || "unassigned";

  return [
    ownerSegment,
    projectSegment,
    input.jobId,
    `${String(input.index + 1).padStart(2, "0")}-${crypto.randomUUID()}.${input.extension}`,
  ].join("/");
}

export async function saveGeneratedResultAssets(
  input: SaveGeneratedResultInput,
): Promise<SaveGeneratedResultOutput> {
  const resultUrls = input.resultUrls?.filter(Boolean) || [];

  if (!resultUrls.length) {
    return { assetIds: [], failures: [] };
  }

  const assetIds: string[] = [];
  const failures: string[] = [];

  for (const [index, resultUrl] of resultUrls.entries()) {
    try {
      const response = await fetch(resultUrl);

      if (!response.ok) {
        failures.push(`${resultUrl} 下载失败：${response.status}`);
        continue;
      }

      const contentType =
        response.headers.get("content-type") ||
        (isVideoJob(input.jobType) ? "video/mp4" : "image/jpeg");
      const bytes = await response.arrayBuffer();
      const extension = extensionFromContentType(contentType, resultUrl);
      const path = buildStoragePath({
        ownerId: input.ownerId,
        projectId: input.projectId,
        jobId: input.jobId,
        index,
        extension,
      });

      const { error: uploadError } = await input.supabase.storage
        .from(GENERATED_BUCKET)
        .upload(path, bytes, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        failures.push(`${resultUrl} 转存失败：${uploadError.message}`);
        continue;
      }

      const { data: asset, error: assetError } = await input.supabase
        .from("asset_files")
        .insert({
          owner_id: input.ownerId,
          project_id: input.projectId,
          kind: assetKind(input.jobType, contentType),
          bucket: GENERATED_BUCKET,
          path,
          public_url: null,
          title: `生成结果 ${index + 1}`,
          metadata: {
            sourceUrl: resultUrl,
            provider: input.provider,
            providerJobId: input.providerJobId,
            contentType,
            size: bytes.byteLength,
          },
        })
        .select("id")
        .single();

      if (assetError) {
        failures.push(`${resultUrl} 素材记录创建失败：${assetError.message}`);
        continue;
      }

      assetIds.push(asset.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      failures.push(`${resultUrl} 转存异常：${message}`);
    }
  }

  if (assetIds.length) {
    const { data: job } = await input.supabase
      .from("ai_jobs")
      .select("output_asset_ids")
      .eq("id", input.jobId)
      .maybeSingle();
    const existingAssetIds = Array.isArray(job?.output_asset_ids)
      ? job.output_asset_ids
      : [];
    const outputAssetIds = [...new Set([...existingAssetIds, ...assetIds])];

    const { error: updateError } = await input.supabase
      .from("ai_jobs")
      .update({ output_asset_ids: outputAssetIds })
      .eq("id", input.jobId);

    if (updateError) {
      failures.push(`生成任务素材关联失败：${updateError.message}`);
    }
  }

  return { assetIds, failures };
}

export async function getGeneratedResultAssets(
  supabase: SupabaseAdminClient,
  assetIds?: string[] | null,
): Promise<GeneratedResultAsset[]> {
  const ids = assetIds?.filter(Boolean) || [];

  if (!ids.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("asset_files")
    .select("id,kind,bucket,path,public_url,title,created_at")
    .in("id", ids);

  if (error || !data?.length) {
    return [];
  }

  const sortOrder = new Map(ids.map((id, index) => [id, index]));
  const rows = [...data].sort(
    (a, b) => (sortOrder.get(a.id) ?? 0) - (sortOrder.get(b.id) ?? 0),
  );

  return Promise.all(
    rows.map(async (asset) => {
      if (asset.public_url) {
        return {
          id: asset.id,
          kind: asset.kind,
          title: asset.title,
          bucket: asset.bucket,
          path: asset.path,
          url: asset.public_url,
          createdAt: asset.created_at,
        };
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from(asset.bucket)
        .createSignedUrl(asset.path, 60 * 60);

      return {
        id: asset.id,
        kind: asset.kind,
        title: asset.title,
        bucket: asset.bucket,
        path: asset.path,
        url: signed?.signedUrl || null,
        accessError: signedError?.message,
        createdAt: asset.created_at,
      };
    }),
  );
}
