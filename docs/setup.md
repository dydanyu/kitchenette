# 干饭叫一声 · 部署与数据初始化指南

本项目是微信原生小程序 + 云开发（CloudBase）。按以下步骤即可跑起来。

## 1. 注册小程序，配置 AppID
- 在[微信公众平台](https://mp.weixin.qq.com)注册一个小程序，拿到 **AppID**。
- 把 AppID 填入 `project.config.json` 的 `appid` 字段（替换默认的 `touristappid`）。

## 2. 开通云开发，配置环境 ID
- 用微信开发者工具打开本项目（`kitchenette/` 目录）。
- 点工具栏「云开发」→ 开通，记下 **环境 ID**。
- 把环境 ID 填入 `miniprogram/app.js` 的 `globalData.env`（替换 `ENV_ID`）。

## 3. 上传部署云函数
对 `cloudfunctions/` 下每个目录（`placeOrder / submitRating / updateOrderStatus / saveDish / manageMeta / getMyContext / listOrders`），右键 →「上传并部署：云端安装依赖」。

## 4. 创建数据库集合
在云开发控制台 → 数据库，新建集合：
`dishes` / `orders` / `ratings` / `chefTags` / `categories` / `config`

## 5. 设置集合权限
- `dishes` / `categories` / `chefTags`：**所有用户可读**（家人浏览菜单）。
- `orders` / `ratings`：默认「**仅创建者可读写**」即可（家人只看自己的）。
- 管理员读取全部订单走 `listOrders` 云函数（已用管理员校验，云函数内拥有全集合读权限），无需放开 orders 读权限。

## 6. 写入管理员白名单
在 `config` 集合新增一条文档：
```json
{ "_id": "admins", "adminOpenids": ["你的openid"] }
```
> openid 获取方式：先用任意微信号打开小程序，菜单页会调用 `getMyContext`，在云函数日志里能看到该次调用的 OPENID；或临时把 `getMyContext` 返回的 openid 打印到控制台。

## 7. 预置菜系分类 categories
按需插入（`sort` 控制顺序；「我全都要」是前端虚拟全部入口，**不需要**入库）：
```json
{ "name": "镇店之宝", "emoji": "🔥", "sort": 1 }
{ "name": "无肉不欢", "emoji": "🍖", "sort": 2 }
{ "name": "草本养生", "emoji": "🥬", "sort": 3 }
{ "name": "干饭时刻", "emoji": "🍚", "sort": 4 }
{ "name": "续命靓汤", "emoji": "🍲", "sort": 5 }
{ "name": "冰爽开胃", "emoji": "🥗", "sort": 6 }
```

## 8. 预置厨师标签与测试菜品
- `chefTags` 插入 1-2 条，如 `{ "name": "老王私房", "emoji": "👨‍🍳" }`。
- `dishes` 插入几条测试数据，字段参考：
```json
{
  "name": "红烧肉", "desc": "肥而不腻", "image": "",
  "categoryId": "<某分类_id>", "chefTagIds": ["<某厨师标签_id>"],
  "status": "on", "avgRating": 0, "ratingCount": 0, "orderCount": 0,
  "createdAt": 0, "updatedAt": 0
}
```
> 之后用管理员账号在小程序内「上传新菜品」即可，图片会自动传到云存储。

## 9. 本地单元测试
```bash
cd kitchenette
npm install
npx jest
```
覆盖 `format / cart / placeOrder / submitRating / updateOrderStatus / saveDish` 的纯逻辑。

## 10. 端到端回归（开发者工具内手动）
完整跑一遍闭环：
1. 家人浏览菜单 → 左分类筛选 → 加入购物车 → 去下单（留言/用餐时间）→ 提交。
2. 管理员菜单页出现红点 → 进「收到的订单」→ 标记出餐。
3. 家人「我的订单」出现「去评分」→ 评分提交。
4. 回菜单看该菜 `评分/已点数` 更新。
5. 菜单页/详情页右上角「···」转发，好友点开能进入。
