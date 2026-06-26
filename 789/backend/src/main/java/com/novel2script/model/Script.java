package com.novel2script.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 剧本顶层对象
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Script {

    /**
     * 剧本格式版本
     */
    @Builder.Default
    private String version = "1.0";

    /**
     * 元数据信息
     */
    private Meta meta;

    /**
     * 角色列表
     */
    @Builder.Default
    private List<ScriptCharacter> characters = new ArrayList<>();

    /**
     * 场景列表
     */
    @Builder.Default
    private List<Scene> scenes = new ArrayList<>();
}
