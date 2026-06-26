package com.novel2script.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 场景节拍 — 剧本中的最小叙事单元
 * <p>
 * 类型说明：
 * - action:    动作/场景描写
 * - dialogue:  角色对话
 * - transition: 转场标记
 * - note:      批注/备注
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Beat {

    /**
     * 节拍类型：action / dialogue / transition / note
     */
    private String type;

    /**
     * 节拍正文内容
     * <p>
     * - action: 动作描写文本
     * - dialogue: 对话内容
     * - transition: 转场标记（如 "CUT TO:"、"FADE OUT"）
     * - note: 批注/备注内容
     */
    private String content;

    /**
     * 角色名称（仅 dialogue 类型需要）
     */
    private String character;

    /**
     * 对话附注（可选，语气、动作提示，如 "(低声地)"）
     */
    private String parenthetical;

    /**
     * 语气/情感基调（可选，如：angry, sad, happy, nervous 等）
     */
    private String tone;
}
