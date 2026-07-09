import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import {
  isUploadBucket,
  validateUploadFileInput,
  type UploadBucket,
} from "@/lib/upload-rules";
import { NextResponse } from "next/server";

const adminOnlyBuckets = new Set([
  "generated-assets",
  "product-assets",
  "music-assets",
]);

function inferAssetKind(bucket: string, mimeType: string) {
  if (bucket === "music-assets") {
    return "music";
  }
  if (bucket === "product-assets") {
    return "product_image";
  }
  if (bucket === "generated-assets") {
    return mimeType.startsWith("video/") ? "generated_video" : "generated_image";
  }
  return mimeType.startsWith("video/") ? "customer_video" : "customer_image";
}

function validateUploadFile(file: File, bucket: UploadBucket) {
  const validation = validateUploadFileInput(file, bucket);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: validation.message,
      },
      { status: validation.status },
    );
  }

  return null;
}

async function validateBucketAccess(
  supabase: NonNullable<ReturnType<typeof createAdminClient>> | null,
  ownerId: string | null,
  bucket: string,
) {
  if (!adminOnlyBuckets.has(bucket)) {
    return null;
  }

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: "请先配置 Supabase Service Role Key 后再上传后台素材。",
      },
      { status: 400 },
    );
  }

  if (!ownerId) {
    return NextResponse.json(
      { ok: false, message: "请先登录后再上传后台素材。" },
      { status: 401 },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", ownerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: `素材权限校验失败：${error.message}` },
      { status: 403 },
    );
  }

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json(
      { ok: false, message: "当前账号没有后台素材上传权限。" },
      { status: 403 },
    );
  }

  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const bucket = String(formData.get("bucket") || "customer-assets");
  const projectId = formData.get("projectId")?.toString() || null;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "没有收到文件。" },
      { status: 400 },
    );
  }

  if (!isUploadBucket(bucket)) {
    return NextResponse.json(
      { ok: false, message: "不支持的素材目录。" },
      { status: 400 },
    );
  }

  const fileValidationResponse = validateUploadFile(file, bucket);
  if (fileValidationResponse) {
    return fileValidationResponse;
  }

  const supabase = createAdminClient();
  const ownerId = await getCurrentUserId();
  const accessResponse = await validateBucketAccess(supabase, ownerId, bucket);
  if (accessResponse) {
    return accessResponse;
  }

  const bytes = await file.arrayBuffer();

  if (!supabase || !ownerId) {
    const isImage = file.type.startsWith("image/");
    const localPreviewUrl =
      isImage && file.size <= 8 * 1024 * 1024
        ? `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`
        : null;

    return NextResponse.json({
      ok: true,
      source: "local",
      asset: {
        id: `local_asset_${crypto.randomUUID()}`,
        bucket,
        path: null,
        public_url: localPreviewUrl,
        title: file.name,
        kind: inferAssetKind(bucket, file.type),
        created_at: new Date().toISOString(),
        metadata: {
          projectId,
          size: file.size,
          type: file.type,
        },
      },
      message: localPreviewUrl
        ? "素材已载入本地项目。"
        : "素材已记录到本地项目；视频预览会在接入存储后启用。",
    });
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : "bin";
  const path = `${ownerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, message: `上传失败：${uploadError.message}` },
      { status: 400 },
    );
  }

  const publicUrl =
    bucket === "product-assets"
      ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : null;

  const { data: asset, error: assetError } = await supabase
    .from("asset_files")
    .insert({
      owner_id: ownerId,
      project_id: projectId,
      kind: inferAssetKind(bucket, file.type),
      bucket,
      path,
      public_url: publicUrl,
      title: file.name,
      metadata: {
        size: file.size,
        type: file.type,
      },
    })
    .select("id,bucket,path,public_url,title,kind,created_at")
    .single();

  if (assetError) {
    return NextResponse.json(
      {
        ok: false,
        message: `文件已上传，但素材记录创建失败：${assetError.message}`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    asset,
    message: "素材已上传。",
  });
}
