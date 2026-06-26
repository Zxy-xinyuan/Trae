package com.novel2script.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 剧本转换请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRequest {

    /**
     * 小说文本内容
     */
    @NotBlank(message = "小说文本不能为空")
    @Size(min = 100, max = 200000, message = "小说文本长度应在100-200000字符之间")
    @JsonProperty("novel_text")
    private String novelText;

    /**
     * 转换选项
     */
    @Builder.Default
    private ConversionOptions options = new ConversionOptions();

    /**
     * 转换选项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversionOptions {

        /**
         * 剧本标题（可选，不提供则由 AI 自动推断）
         */
        private String title;

        /**
         * 原著作者（可选）
         */
        private String author;

        /**
         * 目标体裁（可选，如：drama, comedy, thriller）
         */
        private String genre;

        /**
         * 是否保留原始章节结构
         */
        @Builder.Default
        @JsonProperty("preserve_chapters")
        private boolean preserveChapters = false;

        /**
         * 对话提取精度模式：strict（严格）或 lenient（宽松）
         */
        @Builder.Default
        @JsonProperty("dialogue_mode")
        private String dialogueMode = "lenient";

        /**
         * 是否生成场景摘要
         */
        @Builder.Default
        @JsonProperty("generate_summaries")
        private boolean generateSummaries = true;
    }
}
