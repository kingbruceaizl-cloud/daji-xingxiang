import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSafeServerErrorMessage,
  createSafeStorageErrorMessage,
} from "@/lib/server-error";
import type { AiJobType } from "./types";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4"]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_REDIRECTS = 3;

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

function normalizedContentType(contentType?: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() || "";
}

function isPrivateIpAddress(address: string) {
  if (address === "::1" || address === "0.0.0.0") {
    return true;
  }

  if (address.includes(":")) {
    const value = address.toLowerCase();
    return value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }

  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function assertSafeResultUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("生成结果地址无效");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("生成结果地址不安全");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("生成结果主机不安全");
  }

  if (isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error("生成结果指向私有网络");
    }
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateIpAddress(item.address))) {
    throw new Error("生成结果指向私有网络");
  }

  return url;
}

async function fetchSafeResult(value: string) {
  let url = await assertSafeResultUrl(value);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: url };
    }

    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) {
      throw new Error("生成结果重定向次数过多");
    }

    url = await assertSafeResultUrl(new URL(location, url).toString());
  }

  throw new Error("生成结果下载失败");
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
    const sourceKey = `${input.provider}:${input.providerJobId}:${index}`;
    try {
      const { data: existingAsset } = await input.supabase
        .from("asset_files")
        .select("id")
        .eq("source_key", sourceKey)
        .maybeSingle();
      if (existingAsset?.id) {
        assetIds.push(existingAsset.id);
        continue;
      }

      const { response, finalUrl } = await fetchSafeResult(resultUrl);

      if (!response.ok) {
        failures.push(`第 ${index + 1} 个生成结果下载失败。`);
        continue;
      }

      const contentType = normalizedContentType(response.headers.get("content-type"));
      const isVideo = isVideoJob(input.jobType);
      const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
      if (!allowedTypes.has(contentType)) {
        failures.push(`第 ${index + 1} 个生成结果格式不受支持。`);
        continue;
      }

      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      const declaredSize = Number(response.headers.get("content-length") || 0);
      if (declaredSize > maxBytes) {
        failures.push(`第 ${index + 1} 个生成结果超过保存大小限制。`);
        continue;
      }

      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > maxBytes) {
        failures.push(`第 ${index + 1} 个生成结果超过保存大小限制。`);
        continue;
      }

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
        failures.push(createSafeStorageErrorMessage("生成结果转存"));
        continue;
      }

      const { data: asset, error: assetError } = await input.supabase
        .from("asset_files")
        .insert({
          owner_id: input.ownerId,
          project_id: input.projectId,
          source_key: sourceKey,
          kind: assetKind(input.jobType, contentType),
          bucket: GENERATED_BUCKET,
          path,
          public_url: null,
          title: `生成结果 ${index + 1}`,
          metadata: {
            sourceHost: finalUrl.hostname,
            provider: input.provider,
            providerJobId: input.providerJobId,
            contentType,
            size: bytes.byteLength,
          },
        })
        .select("id")
        .single();

      if (assetError) {
        await input.supabase.storage.from(GENERATED_BUCKET).remove([path]);
        failures.push(createSafeServerErrorMessage("生成结果素材记录创建"));
        continue;
      }

      assetIds.push(asset.id);
    } catch {
      failures.push(createSafeStorageErrorMessage("生成结果转存"));
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
      failures.push(createSafeServerErrorMessage("生成任务素材关联"));
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
