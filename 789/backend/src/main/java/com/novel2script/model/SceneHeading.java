package com.novel2script.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 场景标题（行业标准格式：INT/EXT. 地点 - 时间）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SceneHeading {

    /**
     * 场地类型：INT（室内）或 EXT（室外）
     */
    @JsonProperty("location_type")
    private String locationType;

    /**
     * 地点名称
     */
    private String location;

    /**
     * 时间段（如：DAY, NIGHT, MORNING, EVENING, DAWN, DUSK, CONTINUOUS 等）
     */
    @JsonProperty("time_of_day")
    private String timeOfDay;

    @Override
    public String toString() {
        return String.format("%s. %s - %s", locationType, location, timeOfDay);
    }
}
