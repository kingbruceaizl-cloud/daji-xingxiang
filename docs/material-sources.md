# 线上素材来源记录

MVP 页面目前使用 Pexels 公开图片作为示例素材。后续正式上线前，建议替换为自有商品图、授权模特图或 AI 生成的品牌素材。

## 授权说明

- Pexels License: https://www.pexels.com/license/
- 已于 2026-07-09 核对：Pexels 官方说明允许免费用于商业和非商业用途，可修改，署名不是必需但建议保留来源记录。
- 需要注意：不能暗示图片中的人物或品牌为“大吉形象”背书，不能将未修改素材作为图库素材二次售卖，也不能把 Pexels 图片直接作为商标、商号或服务标识的一部分。

## 当前示例图片

- 人像参考：https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg
- 发型参考：https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg
- 平铺搭配参考：https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg
- 服装陈列参考：https://images.pexels.com/photos/1884584/pexels-photo-1884584.jpeg
- 妆造素材参考：https://images.pexels.com/photos/37356602/pexels-photo-37356602.jpeg
- 裤装素材参考：https://images.pexels.com/photos/3927390/pexels-photo-3927390.jpeg
- 鞋履素材参考：https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg
- 包袋素材参考：https://images.pexels.com/photos/28973056/pexels-photo-28973056.jpeg
- 视频道具参考：https://images.pexels.com/photos/18530979/pexels-photo-18530979.jpeg

## Pexels 页面来源

- 人像参考：https://www.pexels.com/photo/woman-wearing-black-spaghetti-strap-top-774909/
- 发型参考：https://www.pexels.com/photo/woman-in-white-top-2983464/
- 平铺搭配参考：https://www.pexels.com/photo/brown-leather-bag-beside-white-and-black-striped-textile-934063/
- 服装陈列参考：https://www.pexels.com/photo/clothes-on-rack-1884584/
- 妆造素材参考：https://www.pexels.com/photo/cosmetic-items-on-brown-wooden-tray-37356602/
- 裤装素材参考：https://www.pexels.com/photo/3927390/
- 鞋履素材参考：https://www.pexels.com/photo/flat-lay-photography-of-pair-of-white-and-black-vans-off-the-wall-shoes-beside-white-denim-jeans-336372/
- 包袋素材参考：https://www.pexels.com/photo/28973056/
- 视频道具参考：https://www.pexels.com/photo/camera-with-a-lens-18530979/

## 使用边界

- 这些素材只用于开发期占位和交互演示。
- 客户上传真人图片/视频后，生产环境应优先使用客户授权素材和自有商品素材。
- 商品详情页、营销海报、付费投放图不应长期依赖占位图库。

## 发布前检查

正式发布前运行：

```bash
pnpm run check:materials:urls
```

该命令会扫描代码、演示种子数据和本文件中的 Pexels 图片地址，确认素材地址使用 HTTPS、可访问，并返回图片类型，避免上线后示例图空白。
