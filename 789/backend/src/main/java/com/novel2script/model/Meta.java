package com.novel2script.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 剧本元数据
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Meta {

    /**
     * 剧本标题
     */
    private String title;

    /**
     * 原著作者
     */
    private String author;

    /**
     * 体裁类型（如：drama, comedy, thriller, romance, fantasy 等）
     */
    private String genre;

    /**
     * 原著小说名称
     */
    @JsonProperty("source_novel")
    private String sourceNovel;

    /**
     * 剧本版本号
     */
    private String version;

    /**
     * 创建时间
     */
    @JsonProperty("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    /**
     * 最后修改时间
     */
    @JsonProperty("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    /**
     * 备注说明
     */
    private String notes;
}
