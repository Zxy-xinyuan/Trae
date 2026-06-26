package com.novel2script.util;

import java.util.regex.Pattern;

/**
 * 文本工具类 — 分段、引号统一、字数统计
 */
public final class TextUtils {

    private static final Pattern CHINESE_CHAR_PATTERN = Pattern.compile("[\\u4e00-\\u9fa5]");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

    private TextUtils() {
    }

    /**
     * 统计中文字符数
     */
    public static int countChineseChars(String text) {
        if (text == null || text.isEmpty()) return 0;
        int count = 0;
        for (char c : text.toCharArray()) {
            if (CHINESE_CHAR_PATTERN.matcher(String.valueOf(c)).matches()) {
                count++;
            }
        }
        return count;
    }

    /**
     * 统计总字数（中文字符 + 英文单词）
     */
    public static int countWords(String text) {
        if (text == null || text.isEmpty()) return 0;
        int chineseCount = countChineseChars(text);
        // 去掉中文后统计英文单词
        String withoutChinese = text.replaceAll("[\\u4e00-\\u9fa5]", " ");
        String[] englishWords = WHITESPACE_PATTERN.split(withoutChinese.trim());
        int englishCount = englishWords.length > 0 && !englishWords[0].isEmpty() ? englishWords.length : 0;
        return chineseCount + englishCount;
    }

    /**
     * 统一引号格式
     */
    public static String normalizeQuotes(String text) {
        if (text == null) return null;
        return text.replace('「', '"').replace('」', '"')
                .replace('『', '"').replace('』', '"')
                .replace('‘', '"').replace('’', '"')
                .replace('“', '"').replace('”', '"');
    }

    /**
     * 截断文本（带省略号）
     */
    public static String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    }

    /**
     * 将文本按段落分割
     */
    public static String[] splitParagraphs(String text) {
        if (text == null || text.isEmpty()) return new String[0];
        return text.split("\\n\\n+");
    }
}
