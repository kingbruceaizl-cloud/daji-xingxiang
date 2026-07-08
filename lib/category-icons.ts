import {
  Brush,
  Camera,
  Footprints,
  LucideIcon,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  发型: Scissors,
  妆造: Brush,
  服装: Shirt,
  裤子: Shirt,
  鞋子: Footprints,
  包袋: ShoppingBag,
  饰品: Sparkles,
  视频道具: Camera,
};

export function getCategoryIcon(name: string) {
  return categoryIconMap[name] || Sparkles;
}
