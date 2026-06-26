package com.novel2script.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 文本预处理服务 — 章节识别、文本清洗、格式统一
 */
@Slf4j
@Service
public class PreprocessorService {

    /**
     * 章节标题匹配模式
     * 支持：第X章、第X节、Chapter X、数字章节号等
     */
    private static final Pattern CHAPTER_PATTERN = Pattern.compile(
            "^\\s*(第[零一二三四五六七八九十百千万\\d]+[章节回卷集部篇]" +
                    "|Chapter\\s+\\d+" +
                    "|CHAPTER\\s+\\d+" +
                    "|\\d+[.、]\\s*\\S+" +
                    "|【.*?】" +
                    "|\\[.*?])\\s*$",
            Pattern.MULTILINE
    );

    /**
     * 对话引号标准化映射
     */
    private static final Pattern QUOTE_NORMALIZE = Pattern.compile("[「」『』]");

    /**
     * 多余空白行压缩
     */
    private static final Pattern MULTI_BLANK_LINES = Pattern.compile("\\n{3,}");

    /**
     * 预处理小说文本
     *
     * @param rawText 原始小说文本
     * @return 预处理结果
     */
    public PreprocessResult preprocess(String rawText) {
        log.info("开始预处理文本，原始长度: {}", rawText.length());

        // 1. 文本清洗
        String cleanedText = cleanText(rawText);

        // 2. 识别章节
        List<ChapterInfo> chapters = detectChapters(cleanedText);

        // 3. 如果没有识别到章节，作为单章处理
        if (chapters.isEmpty()) {
            chapters.add(new ChapterInfo(1, "全文", cleanedText));
            log.info("未检测到章节标题，将全文作为单章处理");
        }

        // 4. 规范化各章节文本
        for (ChapterInfo chapter : chapters) {
            chapter.setContent(normalizeText(chapter.getContent()));
        }

        PreprocessResult result = new PreprocessResult();
        result.setOriginalText(rawText);
        result.setCleanedText(cleanedText);
        result.setChapters(chapters);
        result.setChapterCount(chapters.size());

        log.info("预处理完成: 识别到 {} 个章节", chapters.size());
        return result;
    }

    /**
     * 文本清洗：去除多余空白、统一编码
     */
    private String cleanText(String text) {
        // 替换全角空格为半角
        text = text.replace('　', ' ');
        // 替换特殊空白字符
        text = text.replaceAll("[\\t\\r]", "");
        // 压缩多余空行
        text = MULTI_BLANK_LINES.matcher(text).replaceAll("\n\n");
        // 去除首尾空白
        return text.trim();
    }

    /**
     * 文本规范化：统一引号、标点
     */
    private String normalizeText(String text) {
        // 统一中文引号为标准双引号
        text = text.replace('「', '"').replace('」', '"');
        text = text.replace('『', '"').replace('』', '"');
        return text.trim();
    }

    /**
     * 检测章节标题
     */
    private List<ChapterInfo> detectChapters(String text) {
        List<ChapterInfo> chapters = new ArrayList<>();
        Matcher matcher = CHAPTER_PATTERN.matcher(text);

        List<Integer> chapterStarts = new ArrayList<>();
        List<String> chapterTitles = new ArrayList<>();

        while (matcher.find()) {
            chapterStarts.add(matcher.start());
            chapterTitles.add(matcher.group().trim());
        }

        if (chapterStarts.isEmpty()) {
            return chapters;
        }

        // 提取各章节内容
        for (int i = 0; i < chapterStarts.size(); i++) {
            int start = chapterStarts.get(i);
            int end = (i + 1 < chapterStarts.size()) ? chapterStarts.get(i + 1) : text.length();

            // 跳过章节标题行本身，从下一行开始
            int contentStart = text.indexOf('\n', start);
            if (contentStart == -1 || contentStart >= end) {
                contentStart = start;
            } else {
                contentStart += 1;
            }

            String content = text.substring(contentStart, end).trim();
            if (!content.isEmpty()) {
                chapters.add(new ChapterInfo(i + 1, chapterTitles.get(i), content));
            }
        }

        return chapters;
    }

    // ========== 数据类 ==========

    @Data
    public static class PreprocessResult {
        private String originalText;
        private String cleanedText;
        private List<ChapterInfo> chapters;
        private int chapterCount;
    }

    @Data
    public static class ChapterInfo {
        private int number;
        private String title;
        private String content;

        public ChapterInfo(int number, String title, String content) {
            this.number = number;
            this.title = title;
            this.content = content;
        }
    }
}
