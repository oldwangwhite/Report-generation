import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { message } from 'antd';
import { streamGenerateContent } from '../services/reportService';
import type { Chapter, ChapterContent, ChapterTable, Report, StreamEvent } from '../types/report';

/** 管理报告正文流式生成过程中的章节状态、内容增量和进度展示。 */
export function useReportSSE(params: {
  report: Report | null;
  outline: Chapter[];
  contents: ChapterContent[];
  setOutline: Dispatch<SetStateAction<Chapter[]>>;
  setContents: Dispatch<SetStateAction<ChapterContent[]>>;
}) {
  const [generating, setGenerating] = useState(false);
  const [percent, setPercent] = useState(0);
    const [progressText, setProgressText] = useState('待生成');
    const abortControllerRef = useRef<AbortController | null>(null);

  /** 根据 SSE 事件更新页面状态。 */
  const handleEvent = (event: StreamEvent) => {
    if (event.event === 'chapterStart' && event.chapterId) {
      params.setOutline((prev) =>
        prev.map((item) => (item.chapterId === event.chapterId ? { ...item, status: 'running' } : item)),
      );
      setProgressText(`正在生成：${event.chapterNo} ${event.title}`);
    }

    if (event.event === 'chunk' && event.chapterId && event.contentDelta) {
      params.setContents((prev) => {
        const existing = prev.find((item) => item.chapterId === event.chapterId);
        const next: ChapterContent = existing
          ? { ...existing, content: `${existing.content}${event.contentDelta}` }
          : { chapterId: event.chapterId!, content: event.contentDelta!, tables: [] };
        return [...prev.filter((item) => item.chapterId !== event.chapterId), next];
      });
    }

    if (event.event === 'table' && event.chapterId && event.table) {
      params.setContents((prev) => {
        const existing = prev.find((item) => item.chapterId === event.chapterId);
        const tables: ChapterTable[] = [...(existing?.tables || []), event.table!];
        const next: ChapterContent = existing
          ? { ...existing, tables }
          : { chapterId: event.chapterId!, content: '', tables };
        return [...prev.filter((item) => item.chapterId !== event.chapterId), next];
      });
    }

    if (event.event === 'chapterDone' && event.chapterId) {
      params.setOutline((prev) =>
        prev.map((item) => (item.chapterId === event.chapterId ? { ...item, status: 'done' } : item)),
      );
    }

    if (event.event === 'progress') {
      setPercent(event.percent || 0);
      setProgressText(`已完成 ${event.completedChapters || 0} / ${event.totalChapters || 0} 章`);
    }

    if (event.event === 'done') {
      setPercent(100);
      setProgressText('生成完成');
      setGenerating(false);
      message.success('报告内容生成完成');
    }

    if (event.event === 'error') {
      setGenerating(false);
      message.error(event.message || '生成失败');
    }
  };

  /** 发起全文或指定章节的内容生成。 */
    const generate = async (options?: { chapterIds?: string[]; regenerate?: boolean; forceOverwrite?: boolean }) => {
    if (!params.report) {
      message.warning('请先创建报告');
      return;
    }
    setGenerating(true);
    setPercent(0);
    setProgressText('准备生成');
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamGenerateContent(params.report.reportId, params.outline, handleEvent, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setProgressText('已取消生成');
        message.info('已取消生成');
      } else {
        message.error(error instanceof Error ? error.message : '生成失败');
      }
      setGenerating(false);
    }
  };

    const cancelGenerate = () => {
        abortControllerRef.current?.abort();
    };

    return { generating, percent, progressText, generate, cancelGenerate };
}


