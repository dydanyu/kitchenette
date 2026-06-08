# 鱼鳞の厨房 · 家庭点菜小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用微信原生小程序 + 云开发实现一个家庭点菜应用：家人选菜下单、管理员管理菜品/订单、下单后评分，可微信转发。

**Architecture:** 前端微信原生小程序（WXML/WXSS/JS），后端微信云开发（云数据库 + 云函数 + 云存储）。读公开数据走数据库直读，所有写/权限敏感操作走云函数。云函数内核业务逻辑抽成纯函数模块，用 Jest 做单元测试。

**Tech Stack:** 微信小程序原生框架、微信云开发（wx-server-sdk）、Node.js（云函数）、Jest（云函数逻辑单测）。

**前置约定：**

- 本计划在 `kitchenette/` 目录下实施，作为微信小程序项目根。
- 需要在微信开发者工具中创建/打开本项目，并开通一个云开发环境（环境 ID 记为 `ENV_ID`，在 `app.js` 中配置）。
- 每个云函数目录是独立 npm 包；纯逻辑模块单独成文件以便 Jest 测试，云函数入口 `index.js` 只做 SDK 装配 + 调用纯逻辑。
- 提交粒度：每个 Task 末尾一次提交。

---

## 文件结构

```
kitchenette/
├── project.config.json          # 微信开发者工具项目配置
├── package.json                 # 根：仅放 Jest 测试依赖与脚本
├── jest.config.js
├── miniprogram/                 # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── utils/
│   │   ├── cloud.js             # callFunction 封装
│   │   ├── cart.js              # 购物车（globalData + 增删改查）
│   │   └── format.js            # 评分/时间格式化（纯函数，可测）
│   ├── pages/
│   │   ├── menu/                # ① 菜单首页（左分类+右菜品）
│   │   ├── detail/              # ② 菜品详情
│   │   ├── confirm/             # ③ 下单确认
│   │   ├── orders/              # ④ 我的订单
│   │   ├── rating/              # ⑤ 评分页
│   │   ├── admin/               # ⑥ 厨房管理（菜品/订单/标签三段）
│   │   ├── dish-edit/           # ⑦ 上传·编辑菜品
│   │   └── admin-orders/        # ⑧ 收到的订单（也可并入 admin 段）
│   └── components/
│       └── stars/               # 星级展示组件
├── cloudfunctions/
│   ├── getMyContext/{index.js,package.json}
│   ├── placeOrder/{index.js,logic.js,package.json}
│   ├── updateOrderStatus/{index.js,logic.js,package.json}
│   ├── submitRating/{index.js,logic.js,package.json}
│   ├── saveDish/{index.js,logic.js,package.json}
│   └── manageMeta/{index.js,logic.js,package.json}
└── tests/
    ├── format.test.js
    ├── cart.test.js
    ├── placeOrder.logic.test.js
    ├── submitRating.logic.test.js
    ├── updateOrderStatus.logic.test.js
    └── saveDish.logic.test.js
```

---

## Task 1: 项目脚手架与测试环境

**Files:**

- Create: `kitchenette/package.json`
- Create: `kitchenette/jest.config.js`
- Create: `kitchenette/project.config.json`
- Create: `kitchenette/.gitignore`

- [ ] **Step 1: 创建根 package.json（仅测试用）**

```json
{
  "name": "kitchenette",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: 创建 jest.config.js**

```js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
};
```

- [ ] **Step 3: 创建 project.config.json**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "projectname": "kitchenette",
  "appid": "touristappid",
  "setting": { "es6": true, "postcss": true, "minified": true },
  "compileType": "miniprogram"
}
```

> 注：`appid` 用真实小程序 AppID 替换；无 AppID 时用 `touristappid` 仅能本地预览，云开发需真实 AppID。

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
cloudfunctions/*/node_modules/
miniprogram_npm/
.DS_Store
```

- [ ] **Step 5: 安装依赖并验证 Jest 可运行**

Run: `cd kitchenette && npm install && npx jest --version`
Expected: 打印 Jest 版本号（如 `29.7.0`），无报错。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/package.json kitchenette/jest.config.js kitchenette/project.config.json kitchenette/.gitignore
git commit -m "chore: scaffold mini program project and jest test setup"
```

---

## Task 2: 纯函数工具 format（评分/时间格式化）

**Files:**

- Create: `kitchenette/miniprogram/utils/format.js`
- Test: `kitchenette/tests/format.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/format.test.js
const { formatRating, starString } = require("../miniprogram/utils/format");

test("formatRating: 无评分显示「暂无评分」", () => {
  expect(formatRating(0, 0)).toBe("暂无评分");
});

test("formatRating: 有评分保留一位小数", () => {
  expect(formatRating(4.567, 12)).toBe("★ 4.6");
});

test("starString: 四舍五入到整星，返回实心+空心共5个", () => {
  expect(starString(4)).toBe("★★★★☆");
  expect(starString(0)).toBe("☆☆☆☆☆");
  expect(starString(5)).toBe("★★★★★");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd kitchenette && npx jest tests/format.test.js`
Expected: FAIL，提示找不到模块 `../miniprogram/utils/format`。

- [ ] **Step 3: 实现 format.js**

```js
// miniprogram/utils/format.js
function formatRating(avg, count) {
  if (!count || count <= 0) return "暂无评分";
  return "★ " + (Math.round(avg * 10) / 10).toFixed(1);
}

function starString(score) {
  const full = Math.max(0, Math.min(5, Math.round(score)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

module.exports = { formatRating, starString };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd kitchenette && npx jest tests/format.test.js`
Expected: PASS，3 个用例全绿。

- [ ] **Step 5: Commit**

```bash
git add kitchenette/miniprogram/utils/format.js kitchenette/tests/format.test.js
git commit -m "feat: add rating/star format helpers with tests"
```

---

## Task 3: 购物车工具 cart（纯逻辑）

**Files:**

- Create: `kitchenette/miniprogram/utils/cart.js`
- Test: `kitchenette/tests/cart.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/cart.test.js
const {
  addItem,
  setQty,
  totalCount,
  toOrderItems,
} = require("../miniprogram/utils/cart");

const dish = { _id: "d1", name: "红烧肉" };

test("addItem: 新增菜品数量为1", () => {
  const cart = addItem({}, dish);
  expect(cart.d1).toEqual({ dishId: "d1", name: "红烧肉", qty: 1 });
});

test("addItem: 已有菜品数量+1", () => {
  let cart = addItem({}, dish);
  cart = addItem(cart, dish);
  expect(cart.d1.qty).toBe(2);
});

test("setQty: 设为0则移除该项", () => {
  let cart = addItem({}, dish);
  cart = setQty(cart, "d1", 0);
  expect(cart.d1).toBeUndefined();
});

test("totalCount: 累计所有数量", () => {
  let cart = addItem({}, dish);
  cart = setQty(cart, "d1", 3);
  cart = addItem(cart, { _id: "d2", name: "西兰花" });
  expect(totalCount(cart)).toBe(4);
});

test("toOrderItems: 转成订单 items 数组", () => {
  let cart = setQty(addItem({}, dish), "d1", 2);
  expect(toOrderItems(cart)).toEqual([
    { dishId: "d1", name: "红烧肉", qty: 2 },
  ]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd kitchenette && npx jest tests/cart.test.js`
Expected: FAIL，找不到模块 `cart`。

- [ ] **Step 3: 实现 cart.js**

```js
// miniprogram/utils/cart.js
function addItem(cart, dish) {
  const next = { ...cart };
  const cur = next[dish._id];
  next[dish._id] = {
    dishId: dish._id,
    name: dish.name,
    qty: cur ? cur.qty + 1 : 1,
  };
  return next;
}

function setQty(cart, dishId, qty) {
  const next = { ...cart };
  if (qty <= 0) {
    delete next[dishId];
  } else if (next[dishId]) {
    next[dishId] = { ...next[dishId], qty };
  }
  return next;
}

function totalCount(cart) {
  return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
}

function toOrderItems(cart) {
  return Object.values(cart).map((it) => ({
    dishId: it.dishId,
    name: it.name,
    qty: it.qty,
  }));
}

module.exports = { addItem, setQty, totalCount, toOrderItems };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd kitchenette && npx jest tests/cart.test.js`
Expected: PASS，5 个用例全绿。

- [ ] **Step 5: Commit**

```bash
git add kitchenette/miniprogram/utils/cart.js kitchenette/tests/cart.test.js
git commit -m "feat: add cart pure logic with tests"
```

---

## Task 4: 云函数 placeOrder（逻辑 + 测试）

**Files:**

- Create: `kitchenette/cloudfunctions/placeOrder/logic.js`
- Create: `kitchenette/cloudfunctions/placeOrder/index.js`
- Create: `kitchenette/cloudfunctions/placeOrder/package.json`
- Test: `kitchenette/tests/placeOrder.logic.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/placeOrder.logic.test.js
const { buildOrder } = require("../cloudfunctions/placeOrder/logic");

const onDish = { _id: "d1", name: "红烧肉", status: "on" };
const offDish = { _id: "d2", name: "鱼香茄子", status: "off" };

test("buildOrder: 过滤下架菜品，组装订单", () => {
  const res = buildOrder({
    openid: "u1",
    userName: "小妹",
    userAvatar: "a",
    items: [
      { dishId: "d1", qty: 2 },
      { dishId: "d2", qty: 1 },
    ],
    remark: "少糖",
    mealTime: "今晚19:00",
    dishMap: { d1: onDish, d2: offDish },
    now: 1000,
  });
  expect(res.order.items).toEqual([{ dishId: "d1", name: "红烧肉", qty: 2 }]);
  expect(res.order.userOpenid).toBe("u1");
  expect(res.order.status).toBe("pending");
  expect(res.order.rated).toBe(false);
  expect(res.order.createdAt).toBe(1000);
  expect(res.incDishIds).toEqual(["d1"]);
});

test("buildOrder: 全部无效时抛错", () => {
  expect(() =>
    buildOrder({
      openid: "u1",
      items: [{ dishId: "d2", qty: 1 }],
      dishMap: { d2: offDish },
      now: 1,
    }),
  ).toThrow("没有可下单的菜品");
});

test("buildOrder: 数量<=0被忽略", () => {
  const res = buildOrder({
    openid: "u1",
    items: [
      { dishId: "d1", qty: 0 },
      { dishId: "d1", qty: 2 },
    ],
    dishMap: { d1: onDish },
    now: 1,
  });
  expect(res.order.items).toEqual([{ dishId: "d1", name: "红烧肉", qty: 2 }]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd kitchenette && npx jest tests/placeOrder.logic.test.js`
Expected: FAIL，找不到 `placeOrder/logic`。

- [ ] **Step 3: 实现 logic.js**

```js
// cloudfunctions/placeOrder/logic.js
function buildOrder({
  openid,
  userName,
  userAvatar,
  items,
  remark,
  mealTime,
  dishMap,
  now,
}) {
  const valid = [];
  for (const it of items || []) {
    const dish = dishMap[it.dishId];
    if (!dish || dish.status !== "on") continue;
    if (!it.qty || it.qty <= 0) continue;
    valid.push({ dishId: dish._id, name: dish.name, qty: it.qty });
  }
  if (valid.length === 0) throw new Error("没有可下单的菜品");

  const order = {
    userOpenid: openid,
    userName: userName || "",
    userAvatar: userAvatar || "",
    items: valid,
    remark: remark || "",
    mealTime: mealTime || "",
    status: "pending",
    rated: false,
    createdAt: now,
  };
  return { order, incDishIds: valid.map((v) => v.dishId) };
}

module.exports = { buildOrder };
```

- [ ] **Step 4: 实现 index.js（SDK 装配）**

```js
// cloudfunctions/placeOrder/index.js
const cloud = require("wx-server-sdk");
const { buildOrder } = require("./logic");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const ids = (event.items || []).map((i) => i.dishId);
  const dishRes = await db
    .collection("dishes")
    .where({ _id: _.in(ids) })
    .get();
  const dishMap = {};
  dishRes.data.forEach((d) => {
    dishMap[d._id] = d;
  });

  let built;
  try {
    built = buildOrder({
      openid: OPENID,
      userName: event.userName,
      userAvatar: event.userAvatar,
      items: event.items,
      remark: event.remark,
      mealTime: event.mealTime,
      dishMap,
      now: Date.now(),
    });
  } catch (e) {
    return { ok: false, msg: e.message };
  }

  const add = await db.collection("orders").add({ data: built.order });
  for (const dishId of built.incDishIds) {
    await db
      .collection("dishes")
      .doc(dishId)
      .update({ data: { orderCount: _.inc(1) } });
  }
  return { ok: true, orderId: add._id };
};
```

- [ ] **Step 5: 创建 package.json**

```json
{
  "name": "placeOrder",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": { "wx-server-sdk": "~2.6.3" }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd kitchenette && npx jest tests/placeOrder.logic.test.js`
Expected: PASS，3 个用例全绿。

- [ ] **Step 7: Commit**

```bash
git add kitchenette/cloudfunctions/placeOrder kitchenette/tests/placeOrder.logic.test.js
git commit -m "feat: add placeOrder cloud function with order-building logic and tests"
```

---

## Task 5: 云函数 submitRating（逻辑 + 测试）

**Files:**

- Create: `kitchenette/cloudfunctions/submitRating/logic.js`
- Create: `kitchenette/cloudfunctions/submitRating/index.js`
- Create: `kitchenette/cloudfunctions/submitRating/package.json`
- Test: `kitchenette/tests/submitRating.logic.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/submitRating.logic.test.js
const {
  validateRating,
  recalcDish,
} = require("../cloudfunctions/submitRating/logic");

const order = {
  _id: "o1",
  userOpenid: "u1",
  status: "served",
  items: [{ dishId: "d1", qty: 1 }],
};

test("validateRating: 正常通过", () => {
  expect(
    validateRating({
      order,
      openid: "u1",
      dishId: "d1",
      score: 5,
      existing: null,
    }),
  ).toEqual({ ok: true });
});

test("validateRating: 非本人拒绝", () => {
  expect(
    validateRating({
      order,
      openid: "uX",
      dishId: "d1",
      score: 5,
      existing: null,
    }).ok,
  ).toBe(false);
});

test("validateRating: 订单未出餐拒绝", () => {
  const pending = { ...order, status: "pending" };
  expect(
    validateRating({
      order: pending,
      openid: "u1",
      dishId: "d1",
      score: 5,
      existing: null,
    }).ok,
  ).toBe(false);
});

test("validateRating: 菜品不在订单内拒绝", () => {
  expect(
    validateRating({
      order,
      openid: "u1",
      dishId: "dX",
      score: 5,
      existing: null,
    }).ok,
  ).toBe(false);
});

test("validateRating: 重复评分拒绝", () => {
  expect(
    validateRating({
      order,
      openid: "u1",
      dishId: "d1",
      score: 5,
      existing: { _id: "r1" },
    }).ok,
  ).toBe(false);
});

test("validateRating: 分数越界拒绝", () => {
  expect(
    validateRating({
      order,
      openid: "u1",
      dishId: "d1",
      score: 6,
      existing: null,
    }).ok,
  ).toBe(false);
});

test("recalcDish: 增量计算平均分", () => {
  expect(recalcDish({ avgRating: 4, ratingCount: 1 }, 5)).toEqual({
    avgRating: 4.5,
    ratingCount: 2,
  });
  expect(recalcDish({ avgRating: 0, ratingCount: 0 }, 3)).toEqual({
    avgRating: 3,
    ratingCount: 1,
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd kitchenette && npx jest tests/submitRating.logic.test.js`
Expected: FAIL，找不到 `submitRating/logic`。

- [ ] **Step 3: 实现 logic.js**

```js
// cloudfunctions/submitRating/logic.js
function validateRating({ order, openid, dishId, score, existing }) {
  if (!order) return { ok: false, msg: "订单不存在" };
  if (order.userOpenid !== openid)
    return { ok: false, msg: "只能评价自己的订单" };
  if (order.status !== "served")
    return { ok: false, msg: "订单出餐后才能评分" };
  if (!order.items.some((i) => i.dishId === dishId))
    return { ok: false, msg: "该菜不在订单内" };
  if (existing) return { ok: false, msg: "已经评过分啦" };
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return { ok: false, msg: "评分需为1-5" };
  return { ok: true };
}

function recalcDish(dish, score) {
  const count = (dish.ratingCount || 0) + 1;
  const total = (dish.avgRating || 0) * (dish.ratingCount || 0) + score;
  return {
    avgRating: Math.round((total / count) * 100) / 100,
    ratingCount: count,
  };
}

module.exports = { validateRating, recalcDish };
```

- [ ] **Step 4: 实现 index.js**

```js
// cloudfunctions/submitRating/index.js
const cloud = require("wx-server-sdk");
const { validateRating, recalcDish } = require("./logic");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { orderId, ratings } = event; // ratings: [{dishId, score, comment}]

  const orderRes = await db
    .collection("orders")
    .doc(orderId)
    .get()
    .catch(() => null);
  const order = orderRes && orderRes.data;

  for (const r of ratings || []) {
    const existRes = await db
      .collection("ratings")
      .where({ orderId, dishId: r.dishId, userOpenid: OPENID })
      .get();
    const v = validateRating({
      order,
      openid: OPENID,
      dishId: r.dishId,
      score: r.score,
      existing: existRes.data[0] || null,
    });
    if (!v.ok) return { ok: false, msg: v.msg };
  }

  for (const r of ratings) {
    await db.collection("ratings").add({
      data: {
        orderId,
        dishId: r.dishId,
        userOpenid: OPENID,
        score: r.score,
        comment: r.comment || "",
        createdAt: Date.now(),
      },
    });
    const dishRes = await db.collection("dishes").doc(r.dishId).get();
    const next = recalcDish(dishRes.data, r.score);
    await db.collection("dishes").doc(r.dishId).update({ data: next });
  }
  await db
    .collection("orders")
    .doc(orderId)
    .update({ data: { rated: true } });
  return { ok: true };
};
```

- [ ] **Step 5: 创建 package.json**

```json
{
  "name": "submitRating",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": { "wx-server-sdk": "~2.6.3" }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd kitchenette && npx jest tests/submitRating.logic.test.js`
Expected: PASS，7 个用例全绿。

- [ ] **Step 7: Commit**

```bash
git add kitchenette/cloudfunctions/submitRating kitchenette/tests/submitRating.logic.test.js
git commit -m "feat: add submitRating cloud function with validation and recalc logic"
```

---

## Task 6: 云函数 updateOrderStatus + saveDish + manageMeta + getMyContext

**Files:**

- Create: `kitchenette/cloudfunctions/updateOrderStatus/{logic.js,index.js,package.json}`
- Create: `kitchenette/cloudfunctions/saveDish/{logic.js,index.js,package.json}`
- Create: `kitchenette/cloudfunctions/manageMeta/{index.js,package.json}`
- Create: `kitchenette/cloudfunctions/getMyContext/{index.js,package.json}`
- Test: `kitchenette/tests/updateOrderStatus.logic.test.js`, `kitchenette/tests/saveDish.logic.test.js`

- [ ] **Step 1: 写失败测试（管理员校验 + 菜品净化）**

```js
// tests/updateOrderStatus.logic.test.js
const { isAdmin } = require("../cloudfunctions/updateOrderStatus/logic");
test("isAdmin: 命中白名单", () => {
  expect(isAdmin("u1", ["u1", "u2"])).toBe(true);
});
test("isAdmin: 不在白名单", () => {
  expect(isAdmin("uX", ["u1"])).toBe(false);
});
test("isAdmin: 空白名单返回false", () => {
  expect(isAdmin("u1", undefined)).toBe(false);
});
```

```js
// tests/saveDish.logic.test.js
const { sanitizeDish } = require("../cloudfunctions/saveDish/logic");
test("sanitizeDish: 补全默认字段", () => {
  const d = sanitizeDish({ name: "红烧肉", categoryId: "c1" }, 2000);
  expect(d).toMatchObject({
    name: "红烧肉",
    desc: "",
    image: "",
    categoryId: "c1",
    chefTagIds: [],
    status: "on",
    avgRating: 0,
    ratingCount: 0,
    orderCount: 0,
    createdAt: 2000,
    updatedAt: 2000,
  });
});
test("sanitizeDish: 去掉首尾空格的菜名为空时抛错", () => {
  expect(() => sanitizeDish({ name: "  " }, 1)).toThrow("菜名不能为空");
});
test("sanitizeDish: status 只接受 on/off", () => {
  expect(sanitizeDish({ name: "x", status: "weird" }, 1).status).toBe("on");
  expect(sanitizeDish({ name: "x", status: "off" }, 1).status).toBe("off");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd kitchenette && npx jest tests/updateOrderStatus.logic.test.js tests/saveDish.logic.test.js`
Expected: FAIL，找不到对应 logic 模块。

- [ ] **Step 3: 实现 updateOrderStatus/logic.js**

```js
// cloudfunctions/updateOrderStatus/logic.js
function isAdmin(openid, adminOpenids) {
  return Array.isArray(adminOpenids) && adminOpenids.includes(openid);
}
module.exports = { isAdmin };
```

- [ ] **Step 4: 实现 saveDish/logic.js**

```js
// cloudfunctions/saveDish/logic.js
function sanitizeDish(input, now) {
  const name = (input.name || "").trim();
  if (!name) throw new Error("菜名不能为空");
  return {
    name,
    desc: input.desc || "",
    image: input.image || "",
    categoryId: input.categoryId || "",
    chefTagIds: Array.isArray(input.chefTagIds) ? input.chefTagIds : [],
    status: input.status === "off" ? "off" : "on",
    avgRating: input.avgRating || 0,
    ratingCount: input.ratingCount || 0,
    orderCount: input.orderCount || 0,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}
module.exports = { sanitizeDish };
```

- [ ] **Step 5: 实现 updateOrderStatus/index.js**

```js
// cloudfunctions/updateOrderStatus/index.js
const cloud = require("wx-server-sdk");
const { isAdmin } = require("./logic");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getAdmins() {
  const r = await db
    .collection("config")
    .doc("admins")
    .get()
    .catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: "无权限" };
  const status = event.status === "served" ? "served" : "pending";
  await db.collection("orders").doc(event.orderId).update({ data: { status } });
  return { ok: true };
};
```

- [ ] **Step 6: 实现 saveDish/index.js**

```js
// cloudfunctions/saveDish/index.js
const cloud = require("wx-server-sdk");
const { sanitizeDish } = require("./logic");
const { isAdmin } = require("../updateOrderStatus/logic"); // 见注
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getAdmins() {
  const r = await db
    .collection("config")
    .doc("admins")
    .get()
    .catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: "无权限" };
  let data;
  try {
    data = sanitizeDish(event.dish || {}, Date.now());
  } catch (e) {
    return { ok: false, msg: e.message };
  }

  if (event.dishId) {
    const { createdAt, avgRating, ratingCount, orderCount, ...rest } = data;
    await db.collection("dishes").doc(event.dishId).update({ data: rest });
    return { ok: true, dishId: event.dishId };
  }
  const add = await db.collection("dishes").add({ data });
  return { ok: true, dishId: add._id };
};
```

> 注：云函数各自打包，不能跨目录 require。实现时把 `isAdmin` 复制进 `saveDish/logic.js` 一并导出（`module.exports = { sanitizeDish, isAdmin }`），index.js 改为 `const { sanitizeDish, isAdmin } = require('./logic')`。`manageMeta` 同理内联 `isAdmin`。测试 `saveDish.logic.test.js` 仅测 `sanitizeDish`，无需改动。

- [ ] **Step 7: 实现 manageMeta/index.js（增删改 categories / chefTags）**

```js
// cloudfunctions/manageMeta/index.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function isAdmin(openid, list) {
  return Array.isArray(list) && list.includes(openid);
}

async function getAdmins() {
  const r = await db
    .collection("config")
    .doc("admins")
    .get()
    .catch(() => null);
  return (r && r.data && r.data.adminOpenids) || [];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!isAdmin(OPENID, await getAdmins())) return { ok: false, msg: "无权限" };
  const { collection, action, id, data } = event; // collection: 'categories'|'chefTags'
  if (!["categories", "chefTags"].includes(collection))
    return { ok: false, msg: "非法集合" };

  if (action === "add") {
    const add = await db.collection(collection).add({ data });
    return { ok: true, id: add._id };
  }
  if (action === "update") {
    await db.collection(collection).doc(id).update({ data });
    return { ok: true };
  }
  if (action === "remove") {
    await db.collection(collection).doc(id).remove();
    return { ok: true };
  }
  return { ok: false, msg: "未知操作" };
};
```

- [ ] **Step 8: 实现 getMyContext/index.js**

```js
// cloudfunctions/getMyContext/index.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const r = await db
    .collection("config")
    .doc("admins")
    .get()
    .catch(() => null);
  const admins = (r && r.data && r.data.adminOpenids) || [];
  return { ok: true, openid: OPENID, isAdmin: admins.includes(OPENID) };
};
```

- [ ] **Step 9: 为四个云函数创建 package.json**

每个目录放（name 改为对应函数名）：

```json
{
  "name": "updateOrderStatus",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": { "wx-server-sdk": "~2.6.3" }
}
```

- [ ] **Step 10: 运行测试确认通过**

Run: `cd kitchenette && npx jest`
Expected: PASS，全部测试文件通过（format/cart/placeOrder/submitRating/updateOrderStatus/saveDish）。

- [ ] **Step 11: Commit**

```bash
git add kitchenette/cloudfunctions/updateOrderStatus kitchenette/cloudfunctions/saveDish kitchenette/cloudfunctions/manageMeta kitchenette/cloudfunctions/getMyContext kitchenette/tests/updateOrderStatus.logic.test.js kitchenette/tests/saveDish.logic.test.js
git commit -m "feat: add admin cloud functions (status/dish/meta/context) with logic tests"
```

---

## Task 7: 小程序入口与云能力初始化

**Files:**

- Create: `kitchenette/miniprogram/app.js`
- Create: `kitchenette/miniprogram/app.json`
- Create: `kitchenette/miniprogram/app.wxss`
- Create: `kitchenette/miniprogram/utils/cloud.js`

- [ ] **Step 1: app.js（初始化云开发 + globalData）**

```js
// miniprogram/app.js
App({
  globalData: {
    env: "ENV_ID", // 替换为真实云开发环境 ID
    cart: {}, // 购物车 { dishId: {dishId,name,qty} }
    isAdmin: false,
    openid: "",
    userInfo: null,
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 以上基础库");
      return;
    }
    wx.cloud.init({ env: this.globalData.env, traceUser: true });
  },
});
```

- [ ] **Step 2: app.json（页面注册 + TabBar，云开发标记）**

```json
{
  "cloud": true,
  "pages": [
    "pages/menu/menu",
    "pages/detail/detail",
    "pages/confirm/confirm",
    "pages/orders/orders",
    "pages/rating/rating",
    "pages/admin/admin",
    "pages/dish-edit/dish-edit",
    "pages/admin-orders/admin-orders"
  ],
  "window": {
    "navigationBarBackgroundColor": "#07c160",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "鱼鳞の厨房"
  },
  "tabBar": {
    "color": "#9aa3ad",
    "selectedColor": "#07c160",
    "list": [
      { "pagePath": "pages/menu/menu", "text": "菜单" },
      { "pagePath": "pages/orders/orders", "text": "我的订单" }
    ]
  },
  "sitemapLocation": "sitemap.json"
}
```

> 注：TabBar 图标可后续补 `iconPath`，本计划先用纯文字。`sitemap.json` 见 Step 4。

- [ ] **Step 3: app.wxss（全局主题变量与基础样式，对照 mockup）**

```css
/* miniprogram/app.wxss */
page {
  background: #f3f4f6;
  color: #1f2937;
  font-family: -apple-system, "PingFang SC", sans-serif;
}
.brand {
  color: #07c160;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(17, 24, 39, 0.04);
}
.dtag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  background: #eafaf0;
  color: #06ad56;
  margin-right: 8rpx;
}
.stars {
  color: #ffb400;
  font-size: 22rpx;
}
.btn-primary {
  background: #07c160;
  color: #fff;
  border-radius: 28rpx;
}
```

- [ ] **Step 4: utils/cloud.js（callFunction 封装）+ sitemap.json**

```js
// miniprogram/utils/cloud.js
function call(name, data = {}) {
  return wx.cloud
    .callFunction({ name, data })
    .then((res) => res.result)
    .catch((err) => {
      console.error(name, err);
      return { ok: false, msg: "网络错误" };
    });
}
module.exports = { call };
```

```json
// miniprogram/sitemap.json
{ "rules": [{ "action": "allow", "page": "*" }] }
```

- [ ] **Step 5: 在微信开发者工具中编译验证**

Run（手动）：打开微信开发者工具 → 导入 `kitchenette` → 编译。
Expected: 无报错，出现空的「菜单 / 我的订单」TabBar（页面尚未实现会提示缺页面，下个 Task 补齐 menu 后即正常）。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/app.js kitchenette/miniprogram/app.json kitchenette/miniprogram/app.wxss kitchenette/miniprogram/utils/cloud.js kitchenette/miniprogram/sitemap.json
git commit -m "feat: add mini program entry, cloud init and global theme"
```

---

## Task 8: 菜单首页（左分类 + 右菜品 + 购物车 + 转发）

**Files:**

- Create: `kitchenette/miniprogram/pages/menu/{menu.js,menu.wxml,menu.wxss,menu.json}`

- [ ] **Step 1: menu.json**

```json
{ "navigationBarTitleText": "鱼鳞の厨房", "enablePullDownRefresh": true }
```

- [ ] **Step 2: menu.js（拉分类+菜品、分类筛选、加入购物车、转发）**

```js
// miniprogram/pages/menu/menu.js
const app = getApp();
const { addItem, totalCount } = require("../../utils/cart");
const { formatRating } = require("../../utils/format");
const { call } = require("../../utils/cloud");

Page({
  data: { categories: [], dishes: [], activeCat: "all", cartCount: 0 },

  onLoad() {
    this.loadData();
    this.refreshContext();
  },
  onShow() {
    this.setData({ cartCount: totalCount(app.globalData.cart) });
  },
  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async refreshContext() {
    const r = await call("getMyContext");
    if (r.ok) {
      app.globalData.isAdmin = r.isAdmin;
      app.globalData.openid = r.openid;
    }
  },

  async loadData() {
    const db = wx.cloud.database();
    const cats = await db.collection("categories").orderBy("sort", "asc").get();
    const dishesRes = await db
      .collection("dishes")
      .where({ status: "on" })
      .get();
    const dishes = dishesRes.data.map((d) => ({
      ...d,
      ratingText: formatRating(d.avgRating, d.ratingCount),
    }));
    this.setData({
      categories: [{ _id: "all", name: "我全都要", emoji: "🍽️" }, ...cats.data],
      dishes,
    });
  },

  pickCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.id });
  },

  get visibleDishes() {
    return this.data.dishes;
  },

  addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    app.globalData.cart = addItem(app.globalData.cart, dish);
    this.setData({ cartCount: totalCount(app.globalData.cart) });
    wx.showToast({ title: "已加入", icon: "none" });
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}`,
    });
  },
  goConfirm() {
    if (this.data.cartCount === 0)
      return wx.showToast({ title: "先选点菜吧", icon: "none" });
    wx.navigateTo({ url: "/pages/confirm/confirm" });
  },
  goAdmin() {
    wx.navigateTo({ url: "/pages/admin/admin" });
  },

  onShareAppMessage() {
    return { title: "快来家里点菜！鱼鳞の厨房 🍳", path: "/pages/menu/menu" };
  },
});
```

- [ ] **Step 3: menu.wxml（双栏布局，对照 mockup）**

```xml
<!-- miniprogram/pages/menu/menu.wxml -->
<view class="page">
  <view class="search">🔍 搜索想吃的菜…</view>
  <view wx:if="{{isAdmin}}" class="admin-entry" bindtap="goAdmin">👑 厨房管理</view>

  <view class="split">
    <scroll-view scroll-y class="cats">
      <view wx:for="{{categories}}" wx:key="_id"
            class="cat {{activeCat===item._id?'on':''}}"
            data-id="{{item._id}}" bindtap="pickCat">
        <view class="cat-emoji">{{item.emoji}}</view>{{item.name}}
      </view>
    </scroll-view>

    <scroll-view scroll-y class="dishlist">
      <block wx:for="{{dishes}}" wx:key="_id">
        <view wx:if="{{activeCat==='all' || item.categoryId===activeCat}}"
              class="drow" data-id="{{item._id}}" bindtap="goDetail">
          <image class="dthumb" src="{{item.image}}" mode="aspectFill"></image>
          <view class="dmain">
            <view class="dname">{{item.name}}</view>
            <view class="ddesc">{{item.desc}}</view>
            <view class="dtags">
              <text wx:for="{{item.chefTagNames}}" wx:for-item="t" wx:key="*this" class="dtag">{{t}}</text>
            </view>
            <view class="dbottom">
              <view class="dmeta"><text class="stars">{{item.ratingText}}</text> · 已点 {{item.orderCount||0}}</view>
              <view class="add" catchtap="addToCart" data-dish="{{item}}">＋</view>
            </view>
          </view>
        </view>
      </block>
    </scroll-view>
  </view>

  <view wx:if="{{cartCount>0}}" class="cartbar" bindtap="goConfirm">
    <view>🛒 已选 {{cartCount}} 样</view>
    <view class="go">去下单</view>
  </view>
</view>
```

> 注：`item.chefTagNames` 需在 `loadData` 里按 `chefTagIds` 映射成名字数组（拉 `chefTags` 集合建 id→「emoji name」映射后 map 到每个 dish）。在 Step 2 的 `loadData` 中补充该映射逻辑：先 `db.collection('chefTags').get()`，构建 `tagMap`，dish 增加 `chefTagNames: (d.chefTagIds||[]).map(id=>tagMap[id]).filter(Boolean)`。

- [ ] **Step 4: menu.wxss（对照 mockup 的双栏紧凑样式）**

```css
/* miniprogram/pages/menu/menu.wxss */
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.search {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 40rpx;
  padding: 18rpx 28rpx;
  color: #9aa3ad;
  font-size: 26rpx;
}
.admin-entry {
  margin: 0 24rpx 12rpx;
  color: #06ad56;
  font-size: 26rpx;
  font-weight: bold;
}
.split {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fff;
}
.cats {
  width: 172rpx;
  background: #f3f4f6;
}
.cat {
  padding: 30rpx 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #6b7280;
  position: relative;
}
.cat.on {
  background: #fff;
  color: #1f2937;
  font-weight: bold;
}
.cat.on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 28rpx;
  bottom: 28rpx;
  width: 6rpx;
  background: #07c160;
  border-radius: 4rpx;
}
.cat-emoji {
  font-size: 32rpx;
}
.dishlist {
  flex: 1;
  padding: 8rpx 24rpx 140rpx;
}
.drow {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eef0f3;
}
.dthumb {
  width: 124rpx;
  height: 124rpx;
  border-radius: 16rpx;
  background: #f0f2f5;
  flex: 0 0 auto;
}
.dmain {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dname {
  font-size: 28rpx;
  font-weight: bold;
}
.ddesc {
  font-size: 22rpx;
  color: #6b7280;
  margin: 6rpx 0;
}
.dbottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
}
.dmeta {
  font-size: 22rpx;
  color: #6b7280;
}
.add {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  font-size: 40rpx;
  text-align: center;
  line-height: 48rpx;
}
.cartbar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  background: #2b2f36;
  color: #fff;
  border-radius: 48rpx;
  padding: 20rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
}
.cartbar .go {
  background: #07c160;
  padding: 14rpx 36rpx;
  border-radius: 36rpx;
  font-weight: bold;
}
```

- [ ] **Step 5: 手动验证**

在开发者工具编译，确认：左分类可点切换、右菜品按分类过滤、＋ 加入购物车后底部出现购物车条、点菜品进详情、右上角管理员入口仅管理员可见、右上角「···」转发卡片标题正确。
（首次需在云控制台手动建好 categories/chefTags/dishes 几条测试数据，并在 `config/admins` 写入自己的 openid。）

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/menu
git commit -m "feat: add menu page with category/dish two-column layout and share"
```

---

## Task 9: 菜品详情页（描述 + 评分 + 评价列表 + 加入清单 + 转发）

**Files:**

- Create: `kitchenette/miniprogram/pages/detail/{detail.js,detail.wxml,detail.wxss,detail.json}`

- [ ] **Step 1: detail.json**

```json
{ "navigationBarTitleText": "菜品详情" }
```

- [ ] **Step 2: detail.js**

```js
// miniprogram/pages/detail/detail.js
const app = getApp();
const { addItem, totalCount } = require("../../utils/cart");
const { formatRating, starString } = require("../../utils/format");

Page({
  data: { dish: null, reviews: [] },
  onLoad(q) {
    this.dishId = q.id;
    this.load();
  },
  async load() {
    const db = wx.cloud.database();
    const dish = (await db.collection("dishes").doc(this.dishId).get()).data;
    dish.ratingText = formatRating(dish.avgRating, dish.ratingCount);
    const reviews = (
      await db
        .collection("ratings")
        .where({ dishId: this.dishId })
        .orderBy("createdAt", "desc")
        .limit(20)
        .get()
    ).data.map((r) => ({ ...r, starText: starString(r.score) }));
    this.setData({ dish, reviews });
  },
  add() {
    app.globalData.cart = addItem(app.globalData.cart, this.data.dish);
    wx.showToast({
      title: `已加入(${totalCount(app.globalData.cart)})`,
      icon: "none",
    });
  },
  onShareAppMessage() {
    return {
      title: `家里有「${this.data.dish.name}」，来点！`,
      path: `/pages/detail/detail?id=${this.dishId}`,
    };
  },
});
```

- [ ] **Step 3: detail.wxml**

```xml
<!-- miniprogram/pages/detail/detail.wxml -->
<view wx:if="{{dish}}">
  <image class="hero" src="{{dish.image}}" mode="aspectFill"></image>
  <view class="sheet">
    <view class="h2">{{dish.name}}</view>
    <view class="row"><text class="stars">{{dish.ratingText}}</text> · 已点 {{dish.orderCount||0}} 次</view>
    <view class="dtags">
      <text wx:for="{{dish.chefTagNames}}" wx:key="*this" class="dtag">{{item}}</text>
    </view>
    <view class="desc">{{dish.desc}}</view>
    <view class="divider"></view>
    <view class="sec-t">大家的评价 ({{reviews.length}})</view>
    <view wx:for="{{reviews}}" wx:key="_id" class="review">
      <view class="rn">{{item.userOpenid}} <text class="stars">{{item.starText}}</text></view>
      <view class="rt">{{item.comment}}</view>
    </view>
  </view>
  <view class="footbar"><view class="btn-primary add" bindtap="add">＋ 加入清单</view></view>
</view>
```

> 注：`dish.chefTagNames` 同 menu，需在 `load` 里据 chefTagIds 映射。评价里 `userOpenid` 可后续替换为下单快照昵称；MVP 先展示占位（如「家人」），实现时把 `item.userOpenid` 显示替换为固定文案「家人」。

- [ ] **Step 4: detail.wxss**

```css
/* miniprogram/pages/detail/detail.wxss */
.hero {
  width: 100%;
  height: 380rpx;
  background: #a0e7c0;
}
.sheet {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  margin-top: -32rpx;
  padding: 32rpx;
  position: relative;
}
.h2 {
  font-size: 40rpx;
  font-weight: 800;
}
.row {
  color: #6b7280;
  font-size: 26rpx;
  margin: 16rpx 0;
}
.desc {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  margin-top: 16rpx;
}
.divider {
  height: 1rpx;
  background: #eef0f3;
  margin: 28rpx 0;
}
.sec-t {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}
.review {
  margin-bottom: 24rpx;
}
.rn {
  font-size: 26rpx;
  font-weight: bold;
}
.rt {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 6rpx;
}
.footbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.add {
  text-align: center;
  padding: 24rpx;
  font-size: 30rpx;
  font-weight: bold;
}
```

- [ ] **Step 5: 手动验证**

进入详情：图片/描述/评分/评价列表展示正常，「加入清单」toast 正确，转发卡片带 dish id。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/detail
git commit -m "feat: add dish detail page with reviews and share"
```

---

## Task 10: 下单确认页（清单 + 留言 + 用餐时间 + 提交）

**Files:**

- Create: `kitchenette/miniprogram/pages/confirm/{confirm.js,confirm.wxml,confirm.wxss,confirm.json}`

- [ ] **Step 1: confirm.json**

```json
{ "navigationBarTitleText": "确认下单" }
```

- [ ] **Step 2: confirm.js**

```js
// miniprogram/pages/confirm/confirm.js
const app = getApp();
const { setQty, toOrderItems, totalCount } = require("../../utils/cart");
const { call } = require("../../utils/cloud");

Page({
  data: { items: [], remark: "", mealTime: "今晚 19:00", total: 0 },
  onShow() {
    this.refresh();
  },
  refresh() {
    const cart = app.globalData.cart;
    this.setData({ items: Object.values(cart), total: totalCount(cart) });
  },
  changeQty(e) {
    const { id, delta } = e.currentTarget.dataset;
    const cur = app.globalData.cart[id];
    if (!cur) return;
    app.globalData.cart = setQty(
      app.globalData.cart,
      id,
      cur.qty + Number(delta),
    );
    this.refresh();
  },
  onRemark(e) {
    this.setData({ remark: e.detail.value });
  },
  onMealTime(e) {
    this.setData({ mealTime: e.detail.value });
  },
  async submit() {
    if (this.data.total === 0)
      return wx.showToast({ title: "清单空空", icon: "none" });
    wx.showLoading({ title: "提交中" });
    const r = await call("placeOrder", {
      items: toOrderItems(app.globalData.cart),
      remark: this.data.remark,
      mealTime: this.data.mealTime,
      userName:
        (app.globalData.userInfo && app.globalData.userInfo.nickName) || "家人",
      userAvatar:
        (app.globalData.userInfo && app.globalData.userInfo.avatarUrl) || "",
    });
    wx.hideLoading();
    if (!r.ok)
      return wx.showToast({ title: r.msg || "下单失败", icon: "none" });
    app.globalData.cart = {};
    wx.showToast({ title: "已通知厨师！" });
    setTimeout(() => wx.switchTab({ url: "/pages/orders/orders" }), 800);
  },
});
```

- [ ] **Step 3: confirm.wxml**

```xml
<!-- miniprogram/pages/confirm/confirm.wxml -->
<view class="wrap">
  <view class="card list">
    <view wx:for="{{items}}" wx:key="dishId" class="oitem">
      <text>{{item.name}}</text>
      <view class="stepper">
        <text class="sbtn" data-id="{{item.dishId}}" data-delta="-1" bindtap="changeQty">−</text>
        <text class="q">{{item.qty}}</text>
        <text class="sbtn" data-id="{{item.dishId}}" data-delta="1" bindtap="changeQty">＋</text>
      </view>
    </view>
  </view>
  <view class="field"><view class="label">给厨师的留言</view>
    <textarea class="ta" placeholder="例如：红烧肉少放糖～" bindinput="onRemark"></textarea></view>
  <view class="field"><view class="label">用餐时间</view>
    <input class="input" value="{{mealTime}}" bindinput="onMealTime"></input></view>
  <view class="tip">🔔 提交后会通知到厨师的「收到的订单」</view>
  <view class="footbar"><view class="btn-primary sub" bindtap="submit">提交订单 · 共 {{total}} 样</view></view>
</view>
```

- [ ] **Step 4: confirm.wxss**

```css
/* miniprogram/pages/confirm/confirm.wxss */
.wrap {
  padding: 24rpx;
  padding-bottom: 160rpx;
}
.list {
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
}
.oitem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  font-size: 28rpx;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.sbtn {
  width: 52rpx;
  height: 52rpx;
  border: 1rpx solid #07c160;
  color: #07c160;
  border-radius: 50%;
  text-align: center;
  line-height: 50rpx;
}
.q {
  font-size: 28rpx;
  font-weight: bold;
}
.field {
  margin-bottom: 24rpx;
}
.label {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}
.ta,
.input {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
}
.ta {
  min-height: 120rpx;
}
.tip {
  background: #fff8ee;
  color: #9a6a1a;
  font-size: 24rpx;
  padding: 20rpx;
  border-radius: 16rpx;
}
.footbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx;
  background: #fff;
}
.sub {
  text-align: center;
  padding: 24rpx;
  font-size: 30rpx;
  font-weight: bold;
}
```

- [ ] **Step 5: 手动验证**

清单增减数量、减到 0 移除、提交后 toast「已通知厨师」、购物车清空、跳转「我的订单」。下架/无效菜品由云函数过滤（可临时把某菜下架验证）。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/confirm
git commit -m "feat: add order confirm page wired to placeOrder"
```

---

## Task 11: 我的订单页（状态 + 评分入口）

**Files:**

- Create: `kitchenette/miniprogram/pages/orders/{orders.js,orders.wxml,orders.wxss,orders.json}`

- [ ] **Step 1: orders.json**

```json
{ "navigationBarTitleText": "我的订单", "enablePullDownRefresh": true }
```

- [ ] **Step 2: orders.js**

```js
// miniprogram/pages/orders/orders.js
const STATUS_TEXT = { pending: "待出餐", served: "已出餐" };
Page({
  data: { orders: [] },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    const db = wx.cloud.database();
    const res = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();
    const orders = res.data.map((o) => ({
      ...o,
      statusText: o.rated ? "已评价" : STATUS_TEXT[o.status] || "",
      canRate: o.status === "served" && !o.rated,
    }));
    this.setData({ orders });
  },
  goRate(e) {
    wx.navigateTo({
      url: `/pages/rating/rating?orderId=${e.currentTarget.dataset.id}`,
    });
  },
});
```

> 注：云数据库默认权限「仅创建者可读写」时，家人只能读到自己创建的订单，正好符合「我的订单」。无需手动按 openid 过滤。

- [ ] **Step 3: orders.wxml**

```xml
<!-- miniprogram/pages/orders/orders.wxml -->
<view class="wrap">
  <view wx:for="{{orders}}" wx:key="_id" class="card order">
    <view class="oh">
      <text class="who">{{item.mealTime}}</text>
      <text class="pill {{item.status}}">{{item.statusText}}</text>
    </view>
    <view wx:for="{{item.items}}" wx:for-item="d" wx:key="dishId" class="oitem">{{d.name}} ×{{d.qty}}</view>
    <view class="ofoot">
      <text wx:if="{{item.remark}}">留言：{{item.remark}}</text>
      <view wx:if="{{item.canRate}}" class="btn-primary rate" data-id="{{item._id}}" bindtap="goRate">去评分</view>
    </view>
  </view>
  <view wx:if="{{orders.length===0}}" class="empty">还没点过菜，去菜单看看吧～</view>
</view>
```

- [ ] **Step 4: orders.wxss**

```css
/* miniprogram/pages/orders/orders.wxss */
.wrap {
  padding: 24rpx;
}
.order {
  padding: 28rpx;
  margin-bottom: 24rpx;
}
.oh {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.who {
  font-size: 28rpx;
  font-weight: bold;
}
.pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}
.pill.pending {
  background: #fff1e6;
  color: #d97706;
}
.pill.served {
  background: #eafaf0;
  color: #06ad56;
}
.oitem {
  font-size: 26rpx;
  color: #374151;
  padding: 6rpx 0;
}
.ofoot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eef0f3;
  font-size: 24rpx;
  color: #6b7280;
}
.rate {
  padding: 12rpx 28rpx;
  font-size: 24rpx;
}
.empty {
  text-align: center;
  color: #9aa3ad;
  font-size: 26rpx;
  margin-top: 120rpx;
}
```

- [ ] **Step 5: 手动验证**

下单后此页出现「待出餐」；管理员标记出餐后变「已出餐」并出现「去评分」；评分后变「已评价」入口消失。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/orders
git commit -m "feat: add my-orders page with status and rating entry"
```

---

## Task 12: 评分页（逐菜 1-5 星 + 留言 + 提交）

**Files:**

- Create: `kitchenette/miniprogram/pages/rating/{rating.js,rating.wxml,rating.wxss,rating.json}`

- [ ] **Step 1: rating.json**

```json
{ "navigationBarTitleText": "给菜品评分" }
```

- [ ] **Step 2: rating.js**

```js
// miniprogram/pages/rating/rating.js
const { call } = require("../../utils/cloud");
Page({
  data: { orderId: "", rows: [] },
  async onLoad(q) {
    this.setData({ orderId: q.orderId });
    const db = wx.cloud.database();
    const order = (await db.collection("orders").doc(q.orderId).get()).data;
    this.setData({
      rows: order.items.map((it) => ({
        dishId: it.dishId,
        name: it.name,
        score: 5,
        comment: "",
      })),
    });
  },
  setScore(e) {
    const { idx, score } = e.currentTarget.dataset;
    const rows = this.data.rows;
    rows[idx].score = Number(score);
    this.setData({ rows });
  },
  onComment(e) {
    const idx = e.currentTarget.dataset.idx;
    const rows = this.data.rows;
    rows[idx].comment = e.detail.value;
    this.setData({ rows });
  },
  async submit() {
    wx.showLoading({ title: "提交中" });
    const r = await call("submitRating", {
      orderId: this.data.orderId,
      ratings: this.data.rows.map((x) => ({
        dishId: x.dishId,
        score: x.score,
        comment: x.comment,
      })),
    });
    wx.hideLoading();
    if (!r.ok)
      return wx.showToast({ title: r.msg || "提交失败", icon: "none" });
    wx.showToast({ title: "感谢评分！" });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
```

- [ ] **Step 3: rating.wxml（5 颗可点星）**

```xml
<!-- miniprogram/pages/rating/rating.wxml -->
<view class="wrap">
  <view wx:for="{{rows}}" wx:key="dishId" wx:for-index="idx" class="card ratecard">
    <view class="rname">{{item.name}}</view>
    <view class="bigstars">
      <text wx:for="{{[1,2,3,4,5]}}" wx:for-item="s" wx:key="*this"
            class="star {{s<=item.score?'on':''}}"
            data-idx="{{idx}}" data-score="{{s}}" bindtap="setScore">★</text>
    </view>
    <textarea class="ta" placeholder="说说这道菜怎么样…（可选）"
              data-idx="{{idx}}" bindinput="onComment" value="{{item.comment}}"></textarea>
  </view>
  <view class="btn-primary sub" bindtap="submit">提交评分</view>
</view>
```

- [ ] **Step 4: rating.wxss**

```css
/* miniprogram/pages/rating/rating.wxss */
.wrap {
  padding: 24rpx;
}
.ratecard {
  padding: 32rpx;
  margin-bottom: 28rpx;
  text-align: center;
}
.rname {
  font-size: 30rpx;
  font-weight: bold;
}
.bigstars {
  margin: 20rpx 0;
}
.star {
  font-size: 60rpx;
  color: #e5e7eb;
  margin: 0 8rpx;
}
.star.on {
  color: #ffb400;
}
.ta {
  width: 100%;
  box-sizing: border-box;
  background: #fafbfc;
  border: 1rpx solid #eef0f3;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  min-height: 100rpx;
}
.sub {
  text-align: center;
  padding: 26rpx;
  font-size: 32rpx;
  font-weight: bold;
}
```

- [ ] **Step 5: 手动验证**

点击星星改变高亮、提交后菜品 avgRating/ratingCount 更新（回菜单看分数变化）、重复进入已评订单被云函数拒绝。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/rating
git commit -m "feat: add rating page wired to submitRating"
```

---

## Task 13: 管理员 — 厨房管理首页（菜品 / 订单 / 标签三段）

**Files:**

- Create: `kitchenette/miniprogram/pages/admin/{admin.js,admin.wxml,admin.wxss,admin.json}`

- [ ] **Step 1: admin.json**

```json
{ "navigationBarTitleText": "厨房管理" }
```

- [ ] **Step 2: admin.js（三段切换：菜品管理 / 收到的订单跳转 / 标签管理）**

```js
// miniprogram/pages/admin/admin.js
const app = getApp();
const { call } = require("../../utils/cloud");
Page({
  data: { tab: "dishes", dishes: [], cats: [], tags: [] },
  onShow() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: "无权限", icon: "none" });
      wx.navigateBack();
      return;
    }
    this.load();
  },
  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },
  async load() {
    const db = wx.cloud.database();
    const dishes = (
      await db.collection("dishes").orderBy("updatedAt", "desc").get()
    ).data;
    const cats = (
      await db.collection("categories").orderBy("sort", "asc").get()
    ).data;
    const tags = (await db.collection("chefTags").get()).data;
    this.setData({ dishes, cats, tags });
  },
  addDish() {
    wx.navigateTo({ url: "/pages/dish-edit/dish-edit" });
  },
  editDish(e) {
    wx.navigateTo({
      url: `/pages/dish-edit/dish-edit?id=${e.currentTarget.dataset.id}`,
    });
  },
  goOrders() {
    wx.navigateTo({ url: "/pages/admin-orders/admin-orders" });
  },
  async addTag() {
    const that = this;
    wx.showModal({
      title: "新建厨师",
      editable: true,
      placeholderText: "如：老王私房",
      success: async (res) => {
        if (res.confirm && res.content) {
          await call("manageMeta", {
            collection: "chefTags",
            action: "add",
            data: { name: res.content, emoji: "👨‍🍳" },
          });
          that.load();
        }
      },
    });
  },
});
```

- [ ] **Step 3: admin.wxml**

```xml
<!-- miniprogram/pages/admin/admin.wxml -->
<view class="wrap">
  <view class="seg">
    <view class="seg-i {{tab==='dishes'?'on':''}}" data-tab="dishes" bindtap="switchTab">菜品管理</view>
    <view class="seg-i" bindtap="goOrders">收到的订单</view>
    <view class="seg-i {{tab==='tags'?'on':''}}" data-tab="tags" bindtap="switchTab">厨师标签</view>
  </view>

  <block wx:if="{{tab==='dishes'}}">
    <view class="btn-primary newbtn" bindtap="addDish">＋ 上传新菜品</view>
    <view wx:for="{{dishes}}" wx:key="_id" class="card alist" data-id="{{item._id}}" bindtap="editDish">
      <image class="athumb" src="{{item.image}}" mode="aspectFill"></image>
      <view class="ainfo">
        <view class="anm">{{item.name}}</view>
        <view class="ade">★{{item.avgRating||0}} · 已点{{item.orderCount||0}} · {{item.status==='on'?'已上架':'已下架'}}</view>
      </view>
      <view class="aedit">编辑</view>
    </view>
  </block>

  <block wx:if="{{tab==='tags'}}">
    <view class="btn-primary newbtn" bindtap="addTag">＋ 新建厨师标签</view>
    <view wx:for="{{tags}}" wx:key="_id" class="card alist">
      <view class="anm">{{item.emoji}} {{item.name}}</view>
    </view>
  </block>
</view>
```

- [ ] **Step 4: admin.wxss**

```css
/* miniprogram/pages/admin/admin.wxss */
.wrap {
  padding: 24rpx;
}
.seg {
  display: flex;
  background: #e9edf1;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-bottom: 24rpx;
}
.seg-i {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  color: #6b7280;
}
.seg-i.on {
  background: #fff;
  color: #1f2937;
  font-weight: bold;
}
.newbtn {
  text-align: center;
  padding: 22rpx;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}
.alist {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.athumb {
  width: 108rpx;
  height: 108rpx;
  border-radius: 16rpx;
  background: #f0f2f5;
}
.ainfo {
  flex: 1;
}
.anm {
  font-size: 28rpx;
  font-weight: bold;
}
.ade {
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 6rpx;
}
.aedit {
  font-size: 24rpx;
  color: #06ad56;
  font-weight: bold;
}
```

- [ ] **Step 5: 手动验证**

仅管理员可进入；三段切换；菜品列表展示；新建厨师标签后列表刷新；点击菜品进编辑页；「收到的订单」跳转。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/admin
git commit -m "feat: add admin home with dish/tag management segments"
```

---

## Task 14: 管理员 — 上传/编辑菜品页（图片上传 + 分类 + 多标签）

**Files:**

- Create: `kitchenette/miniprogram/pages/dish-edit/{dish-edit.js,dish-edit.wxml,dish-edit.wxss,dish-edit.json}`

- [ ] **Step 1: dish-edit.json**

```json
{ "navigationBarTitleText": "编辑菜品" }
```

- [ ] **Step 2: dish-edit.js（含云存储上传）**

```js
// miniprogram/pages/dish-edit/dish-edit.js
const { call } = require("../../utils/cloud");
Page({
  data: {
    dishId: "",
    image: "",
    name: "",
    desc: "",
    categoryId: "",
    categories: [],
    catIndex: 0,
    tags: [],
    selectedTagIds: [],
    status: "on",
  },
  async onLoad(q) {
    const db = wx.cloud.database();
    const categories = (
      await db.collection("categories").orderBy("sort", "asc").get()
    ).data;
    const tags = (await db.collection("chefTags").get()).data;
    let patch = { categories, tags };
    if (q.id) {
      const d = (await db.collection("dishes").doc(q.id).get()).data;
      const catIndex = Math.max(
        0,
        categories.findIndex((c) => c._id === d.categoryId),
      );
      patch = {
        ...patch,
        dishId: q.id,
        image: d.image,
        name: d.name,
        desc: d.desc,
        categoryId: d.categoryId,
        catIndex,
        selectedTagIds: d.chefTagIds || [],
        status: d.status,
      };
    } else if (categories.length) {
      patch.categoryId = categories[0]._id;
    }
    this.setData(patch);
  },
  onName(e) {
    this.setData({ name: e.detail.value });
  },
  onDesc(e) {
    this.setData({ desc: e.detail.value });
  },
  pickCat(e) {
    const i = Number(e.detail.value);
    this.setData({ catIndex: i, categoryId: this.data.categories[i]._id });
  },
  toggleTag(e) {
    const id = e.currentTarget.dataset.id;
    const sel = this.data.selectedTagIds.slice();
    const at = sel.indexOf(id);
    at >= 0 ? sel.splice(at, 1) : sel.push(id);
    this.setData({ selectedTagIds: sel });
  },
  toggleStatus() {
    this.setData({ status: this.data.status === "on" ? "off" : "on" });
  },
  async chooseImage() {
    const res = await wx.chooseMedia({ count: 1, mediaType: ["image"] });
    const filePath = res.tempFiles[0].tempFilePath;
    wx.showLoading({ title: "上传中" });
    const up = await wx.cloud.uploadFile({
      cloudPath: `dishes/${Date.now()}.jpg`,
      filePath,
    });
    wx.hideLoading();
    this.setData({ image: up.fileID });
  },
  async save() {
    if (!this.data.name.trim())
      return wx.showToast({ title: "请填菜名", icon: "none" });
    wx.showLoading({ title: "保存中" });
    const r = await call("saveDish", {
      dishId: this.data.dishId || undefined,
      dish: {
        name: this.data.name,
        desc: this.data.desc,
        image: this.data.image,
        categoryId: this.data.categoryId,
        chefTagIds: this.data.selectedTagIds,
        status: this.data.status,
      },
    });
    wx.hideLoading();
    if (!r.ok)
      return wx.showToast({ title: r.msg || "保存失败", icon: "none" });
    wx.showToast({ title: "已保存" });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
```

- [ ] **Step 3: dish-edit.wxml**

```xml
<!-- miniprogram/pages/dish-edit/dish-edit.wxml -->
<view class="wrap">
  <view class="field"><view class="label">菜品图片</view>
    <view class="uploader" bindtap="chooseImage">
      <image wx:if="{{image}}" class="preview" src="{{image}}" mode="aspectFill"></image>
      <view wx:else class="ph">📷 点击上传 / 拍照</view>
    </view>
  </view>
  <view class="field"><view class="label">菜名</view>
    <input class="input" value="{{name}}" bindinput="onName" placeholder="如：红烧肉"></input></view>
  <view class="field"><view class="label">描述</view>
    <textarea class="ta" value="{{desc}}" bindinput="onDesc" placeholder="做法、口味…"></textarea></view>
  <view class="field"><view class="label">菜系分类（单选）</view>
    <picker mode="selector" range="{{categories}}" range-key="name" value="{{catIndex}}" bindchange="pickCat">
      <view class="input">{{categories[catIndex].emoji}} {{categories[catIndex].name}} ▾</view>
    </picker>
  </view>
  <view class="field"><view class="label">厨师标签（可多选）</view>
    <view class="tagpick">
      <view wx:for="{{tags}}" wx:key="_id"
            class="chip {{selectedTagIds.indexOf(item._id)>=0?'on':''}}"
            data-id="{{item._id}}" bindtap="toggleTag">{{item.emoji}} {{item.name}}</view>
    </view>
  </view>
  <view class="field"><view class="label">上架状态</view>
    <view class="input" bindtap="toggleStatus">{{status==='on'?'已上架 · 家人可见':'已下架'}} ▾</view></view>
  <view class="btn-primary save" bindtap="save">保存</view>
</view>
```

- [ ] **Step 4: dish-edit.wxss**

```css
/* miniprogram/pages/dish-edit/dish-edit.wxss */
.wrap {
  padding: 24rpx;
  padding-bottom: 60rpx;
}
.field {
  margin-bottom: 28rpx;
}
.label {
  font-size: 26rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}
.uploader {
  height: 200rpx;
  border: 2rpx dashed #cfd6dd;
  border-radius: 20rpx;
  background: #fafbfc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.preview {
  width: 100%;
  height: 100%;
}
.ph {
  color: #9aa3ad;
  font-size: 26rpx;
}
.input {
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx;
  font-size: 26rpx;
}
.ta {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  min-height: 140rpx;
}
.tagpick {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  padding: 14rpx 24rpx;
  border-radius: 24rpx;
  background: #fff;
  color: #6b7280;
  font-size: 24rpx;
  border: 1rpx solid #eef0f3;
}
.chip.on {
  background: #07c160;
  color: #fff;
  border-color: #07c160;
}
.save {
  text-align: center;
  padding: 26rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 20rpx;
}
```

- [ ] **Step 5: 手动验证**

新建：上传图片成功显示预览、选分类、多选标签高亮、保存后菜单出现新菜。编辑：回填正确、改后保存生效、下架后菜单首页不再显示。

- [ ] **Step 6: Commit**

```bash
git add kitchenette/miniprogram/pages/dish-edit
git commit -m "feat: add dish create/edit page with image upload, category and chef tags"
```

---

## Task 15: 管理员 — 收到的订单（红点提醒 + 标记出餐）

**Files:**

- Create: `kitchenette/miniprogram/pages/admin-orders/{admin-orders.js,admin-orders.wxml,admin-orders.wxss,admin-orders.json}`
- Modify: `kitchenette/miniprogram/pages/menu/menu.js`（管理员入口加待处理红点数）

- [ ] **Step 1: admin-orders.json**

```json
{ "navigationBarTitleText": "收到的订单", "enablePullDownRefresh": true }
```

- [ ] **Step 2: admin-orders.js**

```js
// miniprogram/pages/admin-orders/admin-orders.js
const { call } = require("../../utils/cloud");
Page({
  data: { orders: [] },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    const db = wx.cloud.database();
    // 管理员需读全部订单：要求该集合权限设为「所有用户可读，仅创建者可写」或用云函数读取。
    const res = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();
    const orders = res.data.map((o) => ({
      ...o,
      isNew: o.status === "pending",
    }));
    this.setData({ orders });
  },
  async markServed(e) {
    const id = e.currentTarget.dataset.id;
    const r = await call("updateOrderStatus", {
      orderId: id,
      status: "served",
    });
    if (!r.ok) return wx.showToast({ title: r.msg || "失败", icon: "none" });
    this.load();
  },
});
```

> 注：默认数据库权限是「仅创建者可读」，管理员读不到家人的订单。两种解法（实现时二选一，推荐 A）：
> A. 新增云函数 `listOrders`（管理员校验后用 admin 权限读全部 orders）—— 安全。
> B. 把 orders 集合权限设为「所有人可读、仅创建者可写」—— 简单但家人能读到彼此订单。
> 若选 A，本页 `load` 改为 `const res = await call('listOrders'); this.setData({orders: res.data...})`，并补 `cloudfunctions/listOrders`（管理员校验 + `db.collection('orders').orderBy('createdAt','desc').get()`，云函数内 db 拥有全集合读权限）。

- [ ] **Step 3: admin-orders.wxml**

```xml
<!-- miniprogram/pages/admin-orders/admin-orders.wxml -->
<view class="wrap">
  <view wx:for="{{orders}}" wx:key="_id" class="card order">
    <view class="oh">
      <text class="who">{{item.userName}} · {{item.mealTime}}</text>
      <text wx:if="{{item.isNew}}" class="pill new">新订单</text>
      <text wx:else class="pill done">已出餐</text>
    </view>
    <view wx:for="{{item.items}}" wx:for-item="d" wx:key="dishId" class="oitem">{{d.name}} ×{{d.qty}}</view>
    <view class="ofoot">
      <text wx:if="{{item.remark}}">留言：{{item.remark}}</text>
      <view wx:if="{{item.isNew}}" class="btn-primary mark" data-id="{{item._id}}" bindtap="markServed">标记出餐</view>
    </view>
  </view>
  <view wx:if="{{orders.length===0}}" class="empty">还没有订单～</view>
</view>
```

- [ ] **Step 4: admin-orders.wxss**

```css
/* miniprogram/pages/admin-orders/admin-orders.wxss */
.wrap {
  padding: 24rpx;
}
.order {
  padding: 28rpx;
  margin-bottom: 24rpx;
}
.oh {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.who {
  font-size: 28rpx;
  font-weight: bold;
}
.pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}
.pill.new {
  background: #fff1e6;
  color: #d97706;
}
.pill.done {
  background: #eafaf0;
  color: #06ad56;
}
.oitem {
  font-size: 26rpx;
  color: #374151;
  padding: 6rpx 0;
}
.ofoot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx dashed #eef0f3;
  font-size: 24rpx;
  color: #6b7280;
}
.mark {
  padding: 12rpx 28rpx;
  font-size: 24rpx;
}
.empty {
  text-align: center;
  color: #9aa3ad;
  font-size: 26rpx;
  margin-top: 120rpx;
}
```

- [ ] **Step 5: 菜单管理员入口加红点（修改 menu.js）**

在 `menu.js` 的 `refreshContext` 之后，若是管理员则查询待处理订单数并 setData。新增方法并在 `onShow` 调用：

```js
// 在 menu.js Page({}) 中新增
async loadPending() {
  if (!getApp().globalData.isAdmin) return;
  const r = await require('../../utils/cloud').call('listOrders'); // 若用方案A
  const pending = (r.data || []).filter((o) => o.status === 'pending').length;
  this.setData({ pendingCount: pending });
},
```

并在 `menu.wxml` 的管理员入口加红点：

```xml
<view wx:if="{{isAdmin}}" class="admin-entry" bindtap="goAdmin">
  👑 厨房管理 <text wx:if="{{pendingCount>0}}" class="reddot">{{pendingCount}}</text>
</view>
```

`menu.wxss` 追加：

```css
.reddot {
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  border-radius: 20rpx;
  padding: 0 10rpx;
  margin-left: 8rpx;
}
```

> 注：`isAdmin` 需在 menu.js `refreshContext` 后 `this.setData({ isAdmin: r.isAdmin })` 才能驱动 wxml；实现时补这一行。

- [ ] **Step 6: 手动验证**

家人下单后，管理员菜单入口显示红点数；进入「收到的订单」看到新订单；点「标记出餐」后该单变「已出餐」、红点减少；家人「我的订单」出现评分入口。

- [ ] **Step 7: Commit**

```bash
git add kitchenette/miniprogram/pages/admin-orders kitchenette/miniprogram/pages/menu
git commit -m "feat: add received-orders page with serve action and admin pending badge"
```

---

## Task 16: 初始化数据与联调脚本（文档）

**Files:**

- Create: `kitchenette/docs/setup.md`

- [ ] **Step 1: 写 setup.md（环境与数据初始化说明）**

内容包含：

1. 在微信公众平台注册小程序，拿到 AppID，填入 `project.config.json`。
2. 微信开发者工具开通云开发，记下环境 ID，填入 `app.js` 的 `globalData.env`。
3. 上传部署全部 `cloudfunctions/*`（右键 → 上传并部署：云端安装依赖）。
4. 在云数据库手动建集合：`dishes / orders / ratings / chefTags / categories / config`。
5. 权限设置：`dishes/categories/chefTags` 设「所有用户可读」；`orders/ratings` 默认「仅创建者可读写」；若用方案 A 则管理员读取走 `listOrders` 云函数。
6. 写入管理员白名单：`config` 集合添加文档 `_id="admins"`，`adminOpenids:["你的openid"]`（openid 可在 `getMyContext` 返回或云函数日志里拿到）。
7. 预置 `categories`：我全都要(前端虚拟)/镇店之宝/无肉不欢/草本养生/干饭时刻/续命靓汤/冰爽开胃（带 sort）。
8. 预置 1-2 个 `chefTags` 和几条 `dishes` 测试数据。

- [ ] **Step 2: 全量回归**

Run: `cd kitchenette && npx jest`
Expected: 全部单测通过。
手动：完整跑一遍「选菜→下单→管理员出餐→评分→分数更新」闭环，以及转发打开。

- [ ] **Step 3: Commit**

```bash
git add kitchenette/docs/setup.md
git commit -m "docs: add cloud env and data initialization guide"
```

---

## Self-Review（计划自查记录）

**Spec 覆盖：**

- 管理员上传/改菜品/图片描述 → Task 6(saveDish) + Task 14(dish-edit) ✅
- 普通家人下单通知管理员 → Task 4(placeOrder) + Task 15(收到的订单+红点) ✅
- 评分 + 菜单展示下单数/评分 → Task 5(submitRating) + Task 8/9(展示) + Task 12(评分页) ✅
- 多厨师标签 → Task 6(chefTagIds) + Task 13/14(管理/多选) ✅
- 转发 → Task 8/9(onShareAppMessage) ✅
- 设计方案 + UI 稿 → 已在 spec/mockup 阶段产出 ✅

**Placeholder 扫描：** 计划内 `ENV_ID`、AppID 为部署期必填的真实值（已在 setup.md 说明），非逻辑占位。无 TBD/TODO 残留。

**类型一致性：** `dishes` 字段（status='on'/'off'、avgRating、ratingCount、orderCount、chefTagIds、categoryId）、`orders`（status='pending'/'served'、rated、items[{dishId,name,qty}]）、`ratings`（orderId,dishId,userOpenid,score,comment）在各 Task 间一致。云函数返回统一 `{ ok, msg }` 约定。

**已知决策点（实现时确认）：** 管理员读全部订单采用方案 A（`listOrders` 云函数），Task 15 已说明；若选方案 B 需改集合权限。
