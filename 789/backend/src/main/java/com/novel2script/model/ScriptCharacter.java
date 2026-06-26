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
 * 角色定义
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScriptCharacter {

    /**
     * 角色名称（剧本中显示的名称，通常为大写）
     */
    private String name;

    /**
     * 角色别名列表（小说中可能出现的其他称呼）
     */
    @Builder.Default
    private List<String> aliases = new ArrayList<>();

    /**
     * 角色描述（外貌、性格、身份等）
     */
    private String description;

    /**
     * 角色类型（如：protagonist, antagonist, supporting, minor）
     */
    @JsonProperty("character_type")
    private String characterType;

    /**
     * 角色关系列表
     */
    @Builder.Default
    private List<String> relationships = new ArrayList<>();
}
