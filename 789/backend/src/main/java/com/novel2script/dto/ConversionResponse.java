package com.novel2script.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.novel2script.model.ScriptCharacter;
import com.novel2script.model.Script;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 剧本转换响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversionResponse {

    /**
     * 转换是否成功
     */
    @Builder.Default
    private boolean success = true;

    /**
     * YAML 格式的剧本内容
     */
    @JsonProperty("yaml_content")
    private String yamlContent;

    /**
     * 结构化的剧本对象
     */
    private Script script;

    /**
     * 提取的角色列表
     */
    @Builder.Default
    private List<ScriptCharacter> characters = new ArrayList<>();

    /**
     * 转换过程中的警告信息
     */
    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    /**
     * 处理耗时（毫秒）
     */
    @JsonProperty("processing_time_ms")
    private Long processingTimeMs;

    /**
     * 错误信息（仅在 success=false 时有值）
     */
    private String error;
}
