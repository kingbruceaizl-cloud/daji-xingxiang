import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "staff";
  joinedAt: string;
  limits: {
    monthlyTextLimit: number;
    monthlyImageLimit: number;
    monthlyVideoLimit: number;
    maxConcurrentJobs: number;
    isGenerationEnabled: boolean;
  };
  usage: {
    text: number;
    image: number;
    video: number;
    active: number;
  };
};

const defaultLimits = {
  monthlyTextLimit: 500,
  monthlyImageLimit: 100,
  monthlyVideoLimit: 20,
  maxConcurrentJobs: 2,
  isGenerationEnabled: true,
};

function formatJoinedAt(value?: string | null) {
  if (!value) {
    return "刚刚";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function getAdminTeamData(): Promise<{
  source: "supabase" | "demo";
  members: TeamMember[];
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      source: "demo",
      members: [
        {
          id: "demo-owner",
          email: "owner@example.com",
          displayName: "项目负责人",
          role: "owner",
          joinedAt: "今天",
          limits: defaultLimits,
          usage: { text: 12, image: 8, video: 2, active: 1 },
        },
      ],
    };
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [profilesResult, limitsResult, jobsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name,role,created_at")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("usage_limits")
      .select("user_id,monthly_text_limit,monthly_image_limit,monthly_video_limit,max_concurrent_jobs,is_generation_enabled")
      .limit(100),
    supabase
      .from("ai_jobs")
      .select("owner_id,job_type,status,provider")
      .neq("provider", "mock")
      .gte("created_at", monthStart.toISOString())
      .limit(10000),
  ]);

  if (profilesResult.error || limitsResult.error || jobsResult.error) {
    return { source: "demo", members: [] };
  }

  const limitsByUser = new Map(
    (limitsResult.data || []).map((item) => [item.user_id, item]),
  );
  const usageByUser = new Map<
    string,
    { text: number; image: number; video: number; active: number }
  >();
  for (const job of jobsResult.data || []) {
    if (!job.owner_id) {
      continue;
    }
    const usage = usageByUser.get(job.owner_id) || {
      text: 0,
      image: 0,
      video: 0,
      active: 0,
    };
    if (["text_generation", "image_understanding", "copywriting"].includes(job.job_type)) {
      usage.text += 1;
    } else if (["text_to_image", "image_to_image"].includes(job.job_type)) {
      usage.image += 1;
    } else {
      usage.video += 1;
    }
    if (["pending", "queued", "submitting", "running", "persisting", "retrying"].includes(job.status)) {
      usage.active += 1;
    }
    usageByUser.set(job.owner_id, usage);
  }

  return {
    source: "supabase",
    members: (profilesResult.data || []).map((profile) => {
      const limits = limitsByUser.get(profile.id);
      return {
        id: profile.id,
        email: profile.email || "未设置邮箱",
        displayName: profile.display_name || profile.email || "未命名员工",
        role: profile.role as TeamMember["role"],
        joinedAt: formatJoinedAt(profile.created_at),
        limits: limits
          ? {
              monthlyTextLimit: limits.monthly_text_limit,
              monthlyImageLimit: limits.monthly_image_limit,
              monthlyVideoLimit: limits.monthly_video_limit,
              maxConcurrentJobs: limits.max_concurrent_jobs,
              isGenerationEnabled: limits.is_generation_enabled,
            }
          : defaultLimits,
        usage: usageByUser.get(profile.id) || {
          text: 0,
          image: 0,
          video: 0,
          active: 0,
        },
      };
    }),
  };
}
