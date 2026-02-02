# Cognitive Space: Visualization & Dark Matter Proposal

> 让思考的结构可见，让孤岛浮出水面。

---

## 一、概述

本提案为 Cognitive Space 引入两个相关功能：

1. **思维可视化工具**（Constellation View）—— 以空间化的方式呈现问题与笔记之间的关系网络
2. **暗物质视图**（Dark Matter View）—— 专门展示尚未与任何问题建立联系的孤立笔记

这两个功能延续产品"延迟显现结构"的核心理念，不强迫用户整理，而是帮助用户**发现**已经存在的结构与遗漏。

---

## 二、设计理念

### 2.1 隐喻：认知宇宙

在这个隐喻中：

| 概念 | 对应物 |
|------|--------|
| **问题（Question）** | 恒星 / 引力中心 —— 吸引思绪围绕其运转 |
| **判断（Claim）** | 行星 —— 围绕问题形成轨道 |
| **证据（Evidence）** | 卫星 —— 支撑或挑战判断的附属物 |
| **触发物（Trigger）** | 彗星 —— 偶尔掠过，可能被捕获 |
| **暗物质（Dark Matter）** | 孤立的星体 —— 尚未被任何引力场捕获的思绪 |

这个隐喻服务于产品哲学：**问题是引力中心，思绪围绕问题自然聚合**。

### 2.2 核心原则

1. **只读不写** —— 可视化是观察工具，不是编辑工具
2. **不替代思考** —— 系统呈现关系，但不评判好坏
3. **渐进发现** —— 从简单入手，复杂功能按需解锁
4. **触发行动** —— 从可视化可以快速跳转到具体笔记

---

## 三、功能设计

### 3.1 思维星图（Constellation View）

#### 入口
- 主页顶部增加「探索」按钮（Explore / 探索）
- 路由：`/explore`

#### 视图模式

##### A. 星系概览（Galaxy Overview）
展示所有问题及其相关笔记的分布：

```
                    ☆ Question A
                   /|\
                  / | \
                 ●  ●  ○   (Claims, Evidence)
                
   ★ Question B                    ★ Question C
    /\                              |
   ●  ●                             ●
   
               · · · Dark Matter · · ·
               (scattered, dimmer dots)
```

**视觉元素**：
- 问题（Question）：大圆圈，颜色饱和
- 判断（Claim）：中等圆圈，蓝色系
- 证据（Evidence）：小圆圈，绿色系
- 触发物（Trigger）：小圆圈，紫色系/闪烁效果
- 暗物质：灰色小点，散布在边缘

**交互**：
- 悬停：显示笔记预览（前100字符）
- 点击问题：进入该问题的局部视图
- 点击笔记：弹出详情，可跳转编辑
- 拖拽平移，滚轮缩放
- 点击暗物质区域：进入暗物质视图

##### B. 问题聚焦（Question Focus）
聚焦于单个问题及其所有关联笔记：

```
              ┌─ Claim 1 ─── Evidence A
              │           └── Evidence B
  Question ───┼─ Claim 2
              │
              └─ Trigger 1
```

**布局算法**：
- 使用力导向图（Force-directed graph）或径向布局
- 问题在中心，相关笔记按类型和时间分布

#### 统计面板
在视图底部或侧边显示：

| 指标 | 说明 |
|------|------|
| 问题总数 | 当前活跃的问题数量 |
| 笔记总数 | 所有笔记的总量 |
| 平均密度 | 每个问题平均关联的笔记数 |
| 暗物质占比 | 孤立笔记占总笔记的百分比 |
| 最活跃问题 | 近期触达最多的问题 |

---

### 3.2 暗物质视图（Dark Matter View）

#### 定义
**暗物质**指满足以下条件的笔记：
- `parentId` 为 `null` 或 `undefined`
- 类型不是 `QUESTION`

这些是用户写下但尚未与任何问题建立联系的思绪碎片。

#### 入口
- 星图中的"暗物质区域"点击
- 主页增加「暗物质」入口（可选）
- 路由：`/dark-matter`

#### 视图设计

##### 列表模式（默认）
```
┌─────────────────────────────────────────────────┐
│  🌑 暗物质 · 12 fragments                        │
│  思绪碎片，尚未与任何问题产生联系                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─ Claim ──────────────────────────────────┐  │
│  │ "也许远程工作的效率神话是被高估的..."      │  │
│  │ 3 days ago                               │  │
│  │ [关联到问题 ▾] [删除]                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Trigger ────────────────────────────────┐  │
│  │ "想起来小时候在田野里跑的感觉..."         │  │
│  │ 1 week ago                               │  │
│  │ [关联到问题 ▾] [删除]                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Evidence ───────────────────────────────┐  │
│  │ "根据2024年的研究，睡眠不足会..."        │  │
│  │ 2 weeks ago                              │  │
│  │ [关联到问题 ▾] [删除]                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

##### 散点模式（可选）
将暗物质以散点形式展示，按时间或语义聚类：
- X轴：创建时间
- Y轴：随机分布（或按类型）
- 悬停查看内容

#### 交互功能

1. **关联到问题**
   - 点击后显示现有问题列表
   - 选择后将 `parentId` 设为该问题的 ID
   - 笔记从暗物质中"消失"，进入问题引力场

2. **升级为问题**
   - 将当前笔记转换为问题（修改 `type` 为 `QUESTION`，清除 `parentId`）
   - 在主页出现为新的"鲜活问题"

3. **批量操作**
   - 多选暗物质
   - 批量关联到同一问题
   - 批量删除

4. **筛选与排序**
   - 按类型筛选（Claim / Evidence / Trigger / Uncategorized）
   - 按时间排序（最新 / 最旧）
   - 按内容长度排序

#### 暗物质健康指标

在视图顶部显示：

| 指标 | 健康状态 |
|------|----------|
| 暗物质占比 < 20% | 🟢 健康 —— 思绪都在围绕问题 |
| 暗物质占比 20-50% | 🟡 正常 —— 有些碎片等待整合 |
| 暗物质占比 > 50% | 🟠 关注 —— 大量思绪游离在外 |

> **设计说明**：这不是要制造焦虑，而是提供一个温和的提醒。产品哲学允许暗物质长期存在。

---

## 四、技术实现方案

### 4.1 数据查询

```typescript
// storageService.ts 新增

// 获取暗物质（孤立笔记）
export const getDarkMatter = async (): Promise<Note[]> => {
  const allNotes = await getNotes();
  return allNotes.filter(note => 
    note.type !== NoteType.QUESTION && 
    (note.parentId === null || note.parentId === undefined)
  );
};

// 获取可视化统计
export interface ConstellationStats {
  totalQuestions: number;
  totalNotes: number;
  darkMatterCount: number;
  darkMatterRatio: number;
  questionDensity: Map<string, number>; // questionId -> related note count
  mostActiveQuestion: Note | null;
}

export const getConstellationStats = async (): Promise<ConstellationStats> => {
  const questions = await getQuestions();
  const allNotes = await getNotes();
  const darkMatter = await getDarkMatter();
  
  const questionDensity = new Map<string, number>();
  questions.forEach(q => {
    const related = allNotes.filter(n => n.parentId === q.id);
    questionDensity.set(q.id, related.length);
  });
  
  const mostActive = questions.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  
  return {
    totalQuestions: questions.length,
    totalNotes: allNotes.length,
    darkMatterCount: darkMatter.length,
    darkMatterRatio: allNotes.length > 0 ? darkMatter.length / allNotes.length : 0,
    questionDensity,
    mostActiveQuestion: mostActive
  };
};
```

### 4.2 可视化库选型

| 库 | 优点 | 缺点 | 推荐 |
|----|------|------|------|
| **D3.js** | 灵活强大 | 学习曲线陡峭 | 复杂图形 |
| **react-force-graph** | React 友好，力导向 | 定制较复杂 | ⭐ 星图推荐 |
| **visx** | Airbnb出品，React原生 | 需要更多组装 | 统计图表 |
| **framer-motion** | 简单动画 | 不适合复杂图 | 过渡效果 |

**推荐方案**：
- 星图使用 `react-force-graph-2d`（轻量、性能好）
- 统计使用 `visx` 或纯 CSS/Tailwind

### 4.3 新增路由与组件

```
views/
├── Explore.tsx           # 星图主视图
├── DarkMatter.tsx        # 暗物质视图
components/
├── ConstellationGraph.tsx    # 星图可视化组件
├── DarkMatterList.tsx        # 暗物质列表组件
├── StatsPanel.tsx            # 统计面板
├── NotePreview.tsx           # 笔记预览卡片
```

### 4.4 路由更新

```tsx
// App.tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/write" element={<Write />} />
  <Route path="/question/:id" element={<QuestionDetail />} />
  <Route path="/explore" element={<Explore />} />
  <Route path="/dark-matter" element={<DarkMatter />} />
</Routes>
```

---

## 五、UI/UX 细节

### 5.1 配色方案（延续现有）

| 元素 | Light Mode | Dark Mode |
|------|------------|-----------|
| Question | `#d97706` (amber) | `#fbbf24` |
| Claim | `#2563eb` (blue) | `#60a5fa` |
| Evidence | `#059669` (emerald) | `#34d399` |
| Trigger | `#7c3aed` (violet) | `#a78bfa` |
| Dark Matter | `#9ca3af` (gray) | `#6b7280` |
| 连接线 | `#e5e7eb` | `#374151` |

### 5.2 动画与过渡

- 进入星图时：节点从中心扩散
- 点击问题时：其他节点淡出，焦点节点居中
- 暗物质被关联时：节点移动到目标问题附近后消失
- 切换视图：平滑过渡（300ms）

### 5.3 响应式设计

- **桌面**：完整星图，侧边统计面板
- **平板**：星图为主，统计面板可折叠
- **手机**：简化视图（可能降级为列表 + 统计卡片）

---

## 六、国际化

### 新增翻译键

```typescript
// contexts/AppContext.tsx translations

// English
explore: "Explore",
dark_matter: "Dark Matter",
dark_matter_desc: "Fragments not yet connected to any question.",
dark_matter_count: "{count} fragments",
link_to_question: "Link to question",
promote_to_question: "Promote to question",
dark_matter_healthy: "Your thoughts are well-connected.",
dark_matter_moderate: "Some fragments await integration.",
dark_matter_attention: "Many thoughts are floating freely.",
constellation_view: "Constellation",
stats_total_questions: "Questions",
stats_total_notes: "Notes",
stats_dark_matter_ratio: "Dark Matter",
stats_most_active: "Most Active",
no_dark_matter: "No dark matter. All thoughts are connected.",

// Chinese
explore: "探索",
dark_matter: "暗物质",
dark_matter_desc: "尚未与任何问题产生联系的思绪碎片。",
dark_matter_count: "{count} 个碎片",
link_to_question: "关联到问题",
promote_to_question: "升级为问题",
dark_matter_healthy: "你的思绪已经很好地聚合了。",
dark_matter_moderate: "有些碎片等待整合。",
dark_matter_attention: "许多思绪正在自由漂浮。",
constellation_view: "星图",
stats_total_questions: "问题",
stats_total_notes: "笔记",
stats_dark_matter_ratio: "暗物质占比",
stats_most_active: "最活跃",
no_dark_matter: "没有暗物质。所有思绪都已连接。",
```

---

## 七、实现优先级

### Phase 1：暗物质视图（MVP）
1. ✅ 实现 `getDarkMatter()` 查询
2. ✅ 创建 `/dark-matter` 路由和视图
3. ✅ 列表展示孤立笔记
4. ✅ "关联到问题"功能
5. ✅ 主页增加入口

**预计工时**：2-3 天

### Phase 2：基础星图
1. 集成 `react-force-graph-2d`
2. 创建 `/explore` 路由
3. 展示问题和关联笔记的力导向图
4. 基本交互（悬停、点击）

**预计工时**：3-4 天

### Phase 3：增强功能
1. 统计面板
2. 问题聚焦视图
3. 暗物质在星图中的可视化
4. 动画效果

**预计工时**：3-4 天

### Phase 4：优化与打磨
1. 响应式适配
2. 性能优化（大量笔记时）
3. 更丰富的过渡动画
4. 暗物质批量操作

**预计工时**：2-3 天

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大量笔记时性能问题 | 星图卡顿 | 分页加载、WebGL渲染、虚拟化 |
| 移动端体验差 | 用户流失 | 提供简化的列表视图替代 |
| 可视化过于复杂 | 违背产品理念 | 保持简约，只展示必要信息 |
| 暗物质过多让用户焦虑 | 负面情绪 | 强调"允许存在"的产品哲学 |

---

## 九、未来扩展可能

1. **语义聚类**：AI 分析暗物质，建议潜在的问题归属
2. **时间线视图**：按时间维度观察思考演化
3. **问题合并建议**：识别语义相近的问题
4. **导出功能**：将星图导出为图片
5. **思考回顾**：定期回顾暗物质，轻推整理

---

## 十、总结

这个提案为 Cognitive Space 增加了两个互补的功能：

- **星图（Constellation View）**让用户从宏观视角观察自己的认知结构
- **暗物质（Dark Matter）**帮助用户发现被遗忘的思绪碎片

两者都遵循产品的核心理念：**不强迫整理，只帮助发现**。

> "暗物质不是问题，它是思考的自然状态。
> 可视化不是为了修复什么，而是为了看见。"

---

*提案日期：2026-02-02*
