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
 * 场景
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Scene {

    /**
     * 场景序号
     */
    @JsonProperty("scene_number")
    private Integer sceneNumber;

    /**
     * 场景标题（INT/EXT. 地点 - 时间）
     */
    @JsonProperty("scene_heading")
    private SceneHeading sceneHeading;

    /**
     * 场景节拍列表（动作、对话、转场等）
     */
    @Builder.Default
    private List<Beat> beats = new ArrayList<>();

    /**
     * 场景摘要/备注
     */
    private String summary;

    /**
     * 本场景涉及的角色
     */
    @Builder.Default
    @JsonProperty("characters_present")
    private List<String> charactersPresent = new ArrayList<>();
}
