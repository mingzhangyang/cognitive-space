# 认知空间 (Cognitive Space)

认知空间是一款旨在帮助用户组织和探索自己的想法、问题和创意的Web应用。你可以随意记录未结构化的想法，将它们整理成结构化的问题，并通过引入论点、证据和触发器来构建背景。探索问题之间的联系，发现潜在的模式。

使用React搭建的前端，后端API部署为Cloudflare Worker。

## 功能

- **想法捕捉**: 快速记录没有结构的想法。
- **问题整理**: 将想法提升为问题，并添加支持元素。
- **可视化**: 图形化地探索问题之间的关系。
- **暗物质恢复**: 拯救孤立的想法并将它们重新链接起来。
- **PWA支持**: 可安装为渐进式Web应用。

## 使用指南

1. 打开应用，使用“Just write”功能随意记录未结构化的想法。
2. 当主题明确时，通过标记或提升想法，创建一个新的问题。
3. 随着时间的推移，添加论点、证据或触发器等支持内容来构建背景。
4. 使用“Visualize”功能探索相关问题，找到新出现的聚集点。
5. 访问“Dark Matter”版块，拯救孤立的碎片并将它们链接到一个问题。

更多详情，请参考[产品设计](docs/product_design.md)和[可视化提案](docs/visualization_proposal.md)。

## 先决条件

- Node.js（版本16或更高）
- Cloudflare Wrangler CLI（`npm install -g wrangler`）

## 安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/mingzhangyang/cognitive-space
   cd cognitive-space
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

## 本地开发

1. 使用Wrangler设置`BIGMODEL_API_KEY`密钥：
   ```bash
   wrangler secret put BIGMODEL_API_KEY
   ```

2. 本地运行Worker服务（先构建资源）：
   ```bash
   npm run dev
   ```

3. 可选：仅运行UI开发服务器（不包括Worker API）：
   ```bash
   npm run dev:ui
   ```

## 部署

1. 构建静态资源：
   ```bash
   npm run build
   ```

2. 部署Worker：
   ```bash
   npm run deploy
   ```

## 配置

- `BIGMODEL_API_KEY`: 必需，AI模型的API密钥。
- `BIGMODEL_MODEL`: 可选，默认为`glm-4.5-flash`。如需使用其它模型，请指定。

## 脚本

- `npm run build`: 构建静态资源。
- `npm run dev`: 本地运行Worker服务。
- `npm run dev:ui`: 运行UI开发服务器。
- `npm run deploy`: 部署到Cloudflare。

## 贡献

欢迎贡献！请阅读贡献指南（如有）后再提交Pull Request。

## 许可证

此项目基于MIT许可证授权。