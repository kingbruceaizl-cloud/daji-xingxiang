export type DeploymentInfo = {
  platform: string;
  appEnv: string;
  vercelEnv: string | null;
  publicUrl: string | null;
  deploymentUrl: string | null;
  gitProvider: string | null;
  gitRepository: string | null;
  gitBranch: string | null;
  gitCommit: string | null;
  gitCommitShort: string | null;
};

function valueOrNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUrl(value: string | undefined) {
  const trimmed = valueOrNull(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export function getDeploymentInfo(): DeploymentInfo {
  const gitCommit = valueOrNull(
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_RELEASE_COMMIT,
  );
  const gitRepoOwner = valueOrNull(process.env.VERCEL_GIT_REPO_OWNER);
  const gitRepoSlug = valueOrNull(process.env.VERCEL_GIT_REPO_SLUG);
  const gitRepository =
    gitRepoOwner && gitRepoSlug ? `${gitRepoOwner}/${gitRepoSlug}` : null;

  return {
    platform: process.env.VERCEL ? "Vercel" : "本地或自托管",
    appEnv: valueOrNull(process.env.NEXT_PUBLIC_APP_ENV) || "development",
    vercelEnv: valueOrNull(process.env.VERCEL_ENV),
    publicUrl: normalizeUrl(process.env.NEXT_PUBLIC_APP_URL),
    deploymentUrl: normalizeUrl(process.env.VERCEL_URL),
    gitProvider: valueOrNull(process.env.VERCEL_GIT_PROVIDER),
    gitRepository,
    gitBranch: valueOrNull(
      process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_RELEASE_BRANCH,
    ),
    gitCommit,
    gitCommitShort: gitCommit ? gitCommit.slice(0, 7) : null,
  };
}
