import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "大吉形象",
    short_name: "大吉形象",
    description: "中文 AI 形象设计、商品搭配和变装视频工作台",
    start_url: "/projects/new",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#991b1b",
    lang: "zh-CN",
    categories: ["productivity", "business", "photo"],
  };
}
