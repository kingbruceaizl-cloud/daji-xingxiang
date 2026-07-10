import { AiServiceError } from "@/lib/ai/errors";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_INPUT_KINDS = new Set([
  "customer_image",
  "generated_image",
  "product_image",
]);

export async function resolveAiInputAssets(input: {
  assetIds: string[];
  ownerId: string | null;
  projectId?: string;
}) {
  const assetIds = [...new Set(input.assetIds.filter(Boolean))];
  if (!assetIds.length) {
    return [];
  }

  if (!input.ownerId) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      "请先登录后再使用客户素材生成。",
      401,
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "真实生成需要先连接素材库。",
      503,
    );
  }

  const { data, error } = await supabase
    .from("asset_files")
    .select("id,owner_id,project_id,kind,bucket,path,public_url")
    .in("id", assetIds);

  if (error || !data || data.length !== assetIds.length) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      "部分生成素材不存在或当前账号无权使用。",
      403,
    );
  }

  const byId = new Map(data.map((asset) => [asset.id, asset]));
  const ordered = assetIds.map((id) => byId.get(id));

  for (const asset of ordered) {
    if (
      !asset ||
      !ALLOWED_INPUT_KINDS.has(asset.kind) ||
      (asset.owner_id && asset.owner_id !== input.ownerId) ||
      (input.projectId && asset.project_id && asset.project_id !== input.projectId)
    ) {
      throw new AiServiceError(
        "AI_ACCESS_DENIED",
        "当前账号不能在这个项目中使用所选素材。",
        403,
      );
    }
  }

  return Promise.all(
    ordered.map(async (asset) => {
      if (!asset) {
        throw new AiServiceError(
          "AI_ACCESS_DENIED",
          "生成素材不存在。",
          403,
        );
      }

      if (asset.public_url) {
        return asset.public_url;
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from(asset.bucket)
        .createSignedUrl(asset.path, 15 * 60);

      if (signedError || !signed?.signedUrl) {
        throw new AiServiceError(
          "AI_PROVIDER_REQUEST_FAILED",
          "暂时无法读取客户素材，请稍后重试。",
          503,
        );
      }

      return signed.signedUrl;
    }),
  );
}
