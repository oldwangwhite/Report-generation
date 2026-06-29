# 技术监督辅助平台用户端前端

技术栈按需求锁定：

- React / React DOM: `18.3.1`
- Ant Design: `5.29.3`
- React Router: `6.30.4`
- @ant-design/icons: `5.6.1`
- Vite / @vitejs/plugin-react: `6.4.3` / `4.7.0`
- TypeScript: `5.9.3`

## 功能范围

本项目按“技术监督辅助平台”整体系统布局设计，当前小组只实现用户端报告生成流程，其他模块先预留导航入口：

- 平台首页
- 报告生成
- 知识库管理
- 智能对话
- 标准规范库
- 系统配置

## 已实现页面

### 角色入口

当前使用 mock 登录页区分普通用户和管理员：

```text
/login
```

后续接后端登录接口时，只需要根据接口返回的 `role` 跳转：

```text
role=user  -> /user/report/generate
role=admin -> /admin/reports
```

### 前端成员 1：用户端报告生成流程

- 报告创建页面
- 大纲生成与编辑页面
- 大纲章节上移/下移、新增、删除、保存
- 章节内容流式展示
- 生成进度展示
- 单章节生成/重新生成
- 全文生成/重新生成
- 章节内容编辑与保存
- 报告预览
- 多格式导出：`docx`、`pdf`、`md`、`txt`

访问路径：

```text
/user/report/generate
```

普通用户还包含：

```text
/user/reports
```

### 前端成员 2：报告记录与管理后台页面

- 报告记录列表
- 报告详情抽屉
- 下载最新文件交互
- 重新导出 PDF、DOCX、MD、TXT
- 模板管理页面
- 素材管理页面
- 模型配置页面
- 管理员角色才允许上传模板

访问路径：

```text
/admin/reports
/admin/templates
/admin/materials
/admin/model
```

## 目录说明

```text
src/components/PlatformLayout.tsx       平台公共布局与左侧导航
src/pages/SystemPlaceholder/index.tsx   平台首页与非本组模块预留页
src/pages/ReportGeneration/index.tsx   主页面
src/pages/ReportGeneration/style.css   页面样式
src/pages/ReportManagement/index.tsx   报告记录与管理后台页面
src/pages/ReportManagement/style.css   管理后台样式
src/router/index.tsx                   前端路由配置
src/api/request.ts                     统一请求封装、鉴权头、响应码处理
src/api/report.ts                      报告相关接口封装，含 mock/真实接口切换
src/hooks/useReportSSE.ts              SSE/流式生成处理
src/types/report.ts                    TypeScript 类型定义
```

## 代码规约对应

- 组件使用大驼峰命名，例如 `ReportGenerationPage`、`PreviewPanel`
- 方法使用动词开头，例如 `handleCreate`、`generateOutline`、`saveOutline`
- 常量使用全大写下划线，例如 `REPORT_TYPE_OPTIONS`、`MOCK_OUTLINE`
- 接口请求统一经过 `src/api/request.ts`
- 成功响应按规约识别 `code: 200`，并临时兼容旧接口文档中的 `code: 0`

## 运行方式

```bash
pnpm install
pnpm dev
```

访问：

```text
http://localhost:5173/report/generate
```

## Mock 与真实接口切换

默认使用 mock：

```text
VITE_USE_MOCK=true
```

切换真实接口：

```text
VITE_USE_MOCK=false
VITE_API_BASE=http://127.0.0.1:8000
```

真实接口路径按《前后端接口统一规范文档》调用，例如：

```text
POST /api/reports
POST /api/reports/{reportId}/outline/generate
PUT  /api/reports/{reportId}/outline
POST /api/reports/{reportId}/content/generate
PUT  /api/reports/{reportId}/chapters/{chapterId}/content
POST /api/reports/{reportId}/exports
GET  /api/reports/{reportId}/exports/{exportId}
```

## 注意

当前代码中大纲编辑先用“上移/下移”实现顺序调整，并按接口所需的 `parentId`、`level`、`sortOrder`、`chapterNo` 保存。正式需要鼠标拖拽时，可接入 `dnd-kit` 或团队已有拖拽库；接口数据结构不需要重做。
