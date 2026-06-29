import http from 'node:http';
import { URL } from 'node:url';

const PORT = 8000;

const templates = [
    {
        templateId: 'tpl_summer_001',
        templateName: '迎峰度夏检查报告模板',
        reportType: 'summerCheck',
        fileName: 'summer-check-template.docx',
        status: 'enabled',
    },
    {
        templateId: 'tpl_summer_002',
        templateName: '迎峰度夏安全监督简版模板',
        reportType: 'summerCheck',
        fileName: 'summer-check-simple.docx',
        status: 'enabled',
    },
    {
        templateId: 'tpl_coal_001',
        templateName: '煤库存审计报告模板',
        reportType: 'coalInventoryAudit',
        fileName: 'coal-inventory-audit.docx',
        status: 'enabled',
    },
    {
        templateId: 'tpl_coal_002',
        templateName: '煤库存盘点分析简版模板',
        reportType: 'coalInventoryAudit',
        fileName: 'coal-inventory-simple.docx',
        status: 'enabled',
    },
];

const materials = [
    {
        materialId: 'mat_standard_001',
        materialName: '迎峰度夏检查标准.pdf',
        major: '电气',
        fileName: 'summer-standard.pdf',
        fileSize: 1024000,
        status: 'enabled',
    },
    {
        materialId: 'mat_run_001',
        materialName: '设备运行月报.docx',
        major: '汽机',
        fileName: 'run-monthly.docx',
        fileSize: 845600,
        status: 'enabled',
    },
    {
        materialId: 'mat_coal_001',
        materialName: '煤库存盘点数据.xlsx',
        major: '燃料',
        fileName: 'coal-inventory.xlsx',
        fileSize: 562000,
        status: 'enabled',
    },
];

const outline = [
    { chapterId: 'chap_001', parentId: null, chapterNo: '1', title: '检查概况', level: 1, sortOrder: 1, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_002', parentId: 'chap_001', chapterNo: '1.1', title: '检查背景', level: 2, sortOrder: 1, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_003', parentId: 'chap_001', chapterNo: '1.2', title: '检查范围', level: 2, sortOrder: 2, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_004', parentId: null, chapterNo: '2', title: '重点检查内容', level: 1, sortOrder: 2, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_005', parentId: 'chap_004', chapterNo: '2.1', title: '设备运行情况', level: 2, sortOrder: 1, status: 'pending', contentType: 'table' },
    { chapterId: 'chap_006', parentId: 'chap_004', chapterNo: '2.2', title: '安全隐患排查', level: 2, sortOrder: 2, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_007', parentId: null, chapterNo: '3', title: '问题分析与整改建议', level: 1, sortOrder: 3, status: 'pending', contentType: 'text' },
    { chapterId: 'chap_008', parentId: null, chapterNo: '4', title: '结论', level: 1, sortOrder: 4, status: 'pending', contentType: 'text' },
];

const reports = new Map();
const exportsMap = new Map();

function sendJson(response, data, statusCode = 200) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    });
    response.end(JSON.stringify({ code: 200, data, message: 'success' }));
}

function sendOptions(response) {
    response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    });
    response.end();
}

function sendDownloadFile(response, fileName, content) {
    const buffer = Buffer.from(content, 'utf-8');
    response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    });
    response.end(buffer);
}

function readBody(request) {
    return new Promise((resolve) => {
        let raw = '';
        request.on('data', (chunk) => {
            raw += chunk;
        });
        request.on('end', () => {
            resolve(raw ? JSON.parse(raw) : {});
        });
    });
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function sendSse(request, response, reportId) {
    const body = await readBody(request);
    const chapterIds = body.chapterIds?.length ? body.chapterIds : outline.map((item) => item.chapterId);
    const chapters = outline.filter((item) => chapterIds.includes(item.chapterId));

    response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    });

    const writeEvent = (event, data) => {
        response.write(`event: ${event}\n`);
        response.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        writeEvent('chapterStart', {
            reportId,
            chapterId: chapter.chapterId,
            chapterNo: chapter.chapterNo,
            title: chapter.title,
        });

        const content = `${chapter.chapterNo} ${chapter.title}：本章节根据测试模板、关联素材和报告主题生成模拟内容，可用于验证前端流式展示、进度更新和重新生成逻辑。`;
        for (let cursor = 0; cursor < content.length; cursor += 12) {
            await wait(100);
            writeEvent('chunk', {
                reportId,
                chapterId: chapter.chapterId,
                contentDelta: content.slice(cursor, cursor + 12),
            });
        }

        writeEvent('chapterDone', {
            reportId,
            chapterId: chapter.chapterId,
            status: 'done',
        });
        writeEvent('progress', {
            reportId,
            completedChapters: index + 1,
            totalChapters: chapters.length,
            percent: Math.round(((index + 1) / chapters.length) * 100),
        });
    }

    writeEvent('done', { reportId, status: 'generated' });
    response.end();
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
        sendOptions(response);
        return;
    }

    if (request.method === 'GET' && pathname === '/api/templates') {
        const reportType = url.searchParams.get('reportType');
        const items = reportType ? templates.filter((item) => item.reportType === reportType) : templates;
        sendJson(response, { items });
        return;
    }

    if (request.method === 'GET' && pathname === '/api/materials') {
        sendJson(response, { items: materials });
        return;
    }

    if (request.method === 'POST' && pathname === '/api/reports') {
        const body = await readBody(request);
        const report = {
            reportId: `rpt_${Date.now()}`,
            ...body,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        reports.set(report.reportId, { report, outline: [], contents: [], latestExport: null });
        sendJson(response, report);
        return;
    }

    const outlineGenerateMatch = pathname.match(/^\/api\/reports\/([^/]+)\/outline\/generate$/);
    if (request.method === 'POST' && outlineGenerateMatch) {
        const reportId = outlineGenerateMatch[1];
        const nextOutline = outline.map((item) => ({ ...item, reportId }));
        const detail = reports.get(reportId);
        if (detail) detail.outline = nextOutline;
        sendJson(response, { reportId, outline: nextOutline });
        return;
    }

    const outlineSaveMatch = pathname.match(/^\/api\/reports\/([^/]+)\/outline$/);
    if (request.method === 'PUT' && outlineSaveMatch) {
        const reportId = outlineSaveMatch[1];
        const body = await readBody(request);
        const detail = reports.get(reportId);
        if (detail) detail.outline = body.outline;
        sendJson(response, { reportId, outline: body.outline });
        return;
    }

    const contentGenerateMatch = pathname.match(/^\/api\/reports\/([^/]+)\/content\/generate$/);
    if (request.method === 'POST' && contentGenerateMatch) {
        await sendSse(request, response, contentGenerateMatch[1]);
        return;
    }

    const reportDetailMatch = pathname.match(/^\/api\/reports\/([^/]+)$/);
    if (request.method === 'GET' && reportDetailMatch) {
        const reportId = reportDetailMatch[1];
        const detail = reports.get(reportId);
        sendJson(response, detail || { report: null, outline: [], contents: [], latestExport: null });
        return;
    }

    const contentSaveMatch = pathname.match(/^\/api\/reports\/([^/]+)\/chapters\/([^/]+)\/content$/);
    if (request.method === 'PUT' && contentSaveMatch) {
        const [, reportId, chapterId] = contentSaveMatch;
        await readBody(request);
        sendJson(response, { reportId, chapterId, status: 'done', updatedAt: new Date().toISOString() });
        return;
    }

    const exportCreateMatch = pathname.match(/^\/api\/reports\/([^/]+)\/exports$/);
    if (request.method === 'POST' && exportCreateMatch) {
        const reportId = exportCreateMatch[1];
        const body = await readBody(request);
        const exportId = `exp_${Date.now()}`;
        const exportFile = {
            exportId,
            reportId,
            fileName: `测试报告.${body.fileFormat}`,
            fileFormat: body.fileFormat,
            fileSize: 245760,
            downloadUrl: `/api/reports/${reportId}/exports/${exportId}/download`,
            status: 'exported',
            createdAt: new Date().toISOString(),
        };
        exportsMap.set(exportFile.exportId, exportFile);
        sendJson(response, exportFile);
        return;
    }

    const exportStatusMatch = pathname.match(/^\/api\/reports\/([^/]+)\/exports\/([^/]+)$/);
    if (request.method === 'GET' && exportStatusMatch) {
        const exportFile = exportsMap.get(exportStatusMatch[2]);
        sendJson(response, exportFile);
        return;
    }

    const exportDownloadMatch = pathname.match(/^\/api\/reports\/([^/]+)\/exports\/([^/]+)\/download$/);
    if (request.method === 'GET' && exportDownloadMatch) {
        const [, reportId, exportId] = exportDownloadMatch;
        const exportFile = exportsMap.get(exportId) || {
            fileName: '测试报告.docx',
            fileFormat: 'docx',
        };
        sendDownloadFile(
            response,
            exportFile.fileName,
            [
                `报告编号：${reportId}`,
                `导出编号：${exportId}`,
                `文件名：${exportFile.fileName}`,
                `格式：${exportFile.fileFormat}`,
                '这是 mock 后端返回的测试下载文件，后续替换为真实后端文件流即可。',
            ].join('\n'),
        );
        return;
    }

    sendJson(response, null, 404);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Mock backend is running at http://127.0.0.1:${PORT}`);
    console.log('Templates: GET /api/templates');
    console.log('Generate content: POST /api/reports/{reportId}/content/generate');
});
