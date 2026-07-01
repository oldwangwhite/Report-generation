import { requestJson } from './request';

export type HomeModule = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    color: string;
    gradient: string;
    features: string[];
    imageUrl: string;
};

const modules: HomeModule[] = [
    {
        id: 'qa',
        title: '知识问答',
        subtitle: 'Knowledge Q&A',
        description: '基于电力行业知识库的智能问答能力，支持规程检索、问题定位和多轮追问。',
        color: '#0f766e',
        gradient: 'linear-gradient(135deg, #0f766e 0%, #22c55e 100%)',
        features: ['自然语言理解', '规程精准匹配', '多轮对话支持'],
        imageUrl:
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDQ4MCAzMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNlY2ZkZjUiLz48cmVjdCB4PSI3MCIgeT0iNzAiIHdpZHRoPSIzNDAiIGhlaWdodD0iMTgwIiByeD0iMTYiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjI0IiBmaWxsPSIjMGY3NjZlIi8+PHJlY3QgeD0iMTYwIiB5PSIxMDAiIHdpZHRoPSIxOTAiIGhlaWdodD0iMTQiIHJ4PSI3IiBmaWxsPSIjOTRkM2E2Ii8+PHJlY3QgeD0iMTYwIiB5PSIxMzAiIHdpZHRoPSIyMzAiIGhlaWdodD0iMTQiIHJ4PSI3IiBmaWxsPSIjY2VmN2UwIi8+PHJlY3QgeD0iOTAiIHk9IjE3MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0OCIgcng9IjEwIiBmaWxsPSIjZjBmZGY0Ii8+PC9zdmc+',
    },
    {
        id: 'report',
        title: '报告生成',
        subtitle: 'Report Generation',
        description: '自动生成迎峰度夏检查、煤库存审计等专业报告，覆盖大纲、正文、表格和导出。',
        color: '#1769e0',
        gradient: 'linear-gradient(135deg, #1769e0 0%, #38bdf8 100%)',
        features: ['模板智能匹配', '数据自动填充', '多格式导出'],
        imageUrl:
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDQ4MCAzMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNlZmY2ZmYiLz48cmVjdCB4PSIxMzAiIHk9IjQwIiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjI0MCIgcng9IjE0IiBmaWxsPSIjZmZmIiBzdHJva2U9IiNiZGQ3ZmYiLz48cmVjdCB4PSIxNjAiIiB5PSI3NSIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyMCIgcng9IjEwIiBmaWxsPSIjMTc2OWUwIi8+PHJlY3QgeD0iMTYwIiB5PSIxMjAiIHdpZHRoPSIxNDAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjOTRjNWZkIi8+PHJlY3QgeD0iMTYwIiB5PSIxNTAiIHdpZHRoPSIxNjAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjYmRkN2ZmIi8+PHJlY3QgeD0iMTYwIiB5PSIxODAiIHdpZHRoPSIxMTUiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjYmRkN2ZmIi8+PHJlY3QgeD0iMTYwIiB5PSIyMTUiIHdpZHRoPSIxMjAiIGhlaWdodD0iMzQiIHJ4PSI4IiBmaWxsPSIjZGJlYWZmIi8+PC9zdmc+',
    },
    {
        id: 'knowledge',
        title: '知识库管理',
        subtitle: 'Knowledge Base',
        description: '上传、分类、检索企业内部技术文档，沉淀可复用的专业知识资产。',
        color: '#7c3aed',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        features: ['文档智能分类', '全文检索', '版本管理'],
        imageUrl:
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDQ4MCAzMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNmNWYzZmYiLz48cmVjdCB4PSI5MCIgeT0iNzAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxODAiIHJ4PSIxMCIgZmlsbD0iIzdjM2FlZCIvPjxyZWN0IHg9IjE4NSIgeT0iNTUiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxOTUiIHJ4PSIxMCIgZmlsbD0iI2E3OGJmYSIvPjxyZWN0IHg9IjI4MCIgeT0iODUiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxNjUiIHJ4PSIxMCIgZmlsbD0iI2RiMjc3NyIvPjxyZWN0IHg9IjExMCIgeT0iMTEwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTAiIHJ4PSI1IiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMjA1IiB5PSIxMDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIxMCIgcng9IjUiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIzMDAiIHk9IjEzMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjEwIiByeD0iNSIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==',
    },
];

export function fetchHomeModules() {
    return Promise.resolve({ data: modules });
}

export function fetchHomeModulesFromApi() {
    return requestJson<HomeModule[]>('/api/modules/home');
}
