import { kieProvider } from "./kie-provider";
import { mockProvider } from "./mock-provider";
import type {
  AiProvider,
  CreateJobInput,
  CreateJobResult,
  JobStatusResult,
} from "./types";

const providers: Record<string, AiProvider> = {
  mock: mockProvider,
  kie: kieProvider,
};

export async function createAiJob(input: CreateJobInput): Promise<CreateJobResult> {
  const requestedProvider = input.provider || "mock";
  const provider = providers[requestedProvider] || mockProvider;
  return provider.createJob(input);
}

export async function getProviderJobStatus(
  providerName: string,
  providerJobId: string,
): Promise<JobStatusResult | null> {
  const provider = providers[providerName];

  if (!provider?.getJobStatus) {
    return null;
  }

  return provider.getJobStatus(providerJobId);
}

export function buildImagePrompt(input: {
  styleName?: string;
  selectedProducts?: string[];
  extraPrompt?: string;
}) {
  const productText = input.selectedProducts?.length
    ? `搭配商品：${input.selectedProducts.join("、")}。`
    : "搭配商品：由系统根据商品库推荐。";

  return [
    "保留客户五官特征，生成一张高级商业棚拍形象图。",
    input.styleName ? `风格：${input.styleName}。` : "风格：新中式轻礼服。",
    productText,
    "妆面清透，画面干净，真实质感，不夸张变形。",
    input.extraPrompt,
  ]
    .filter(Boolean)
    .join("");
}
