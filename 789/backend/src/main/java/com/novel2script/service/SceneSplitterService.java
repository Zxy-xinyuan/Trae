package com.novel2script.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel2script.model.SceneHeading;
import com.novel2script.prompt.PromptTemplate;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 场景分割服务 — 混合策略：规则预判 + LLM 精调
 */
@Slf4j
@Service
public class SceneSplitterService {

    /**
     * 场景转换信号词
     */
    private static final List<String> TRANSITION_SIGNALS = List.of(
            "来到", "走进", "走出", "回到", "离开", "到达",
            "第二天", "次日", "清晨", "傍晚", "入夜", "深夜",
            "几天后", "数日后", "许久之后", "片刻后",
            "与此同时", "另一边", "此时此刻"
    );

    /**
     * 时间词模式
     */
    private static final Pattern TIME_PATTERN = Pattern.compile(
            "(清晨|早晨|早上|上午|中午|下午|傍晚|黄昏|晚上|夜晚|深夜|凌晨" +
                    "|第二天|次日|几天后|数日后|一周后|一个月后" +
                    "|白天|黑夜|日出|日落)"
    );

    private final LLMService llmService;
    private final PromptTemplate promptTemplate;
    private final ObjectMapper objectMapper;

    public SceneSplitterService(LLMService llmService, PromptTemplate promptTemplate, ObjectMapper objectMapper) {
        this.llmService = llmService;
        this.promptTemplate = promptTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 分割场景
     *
     * @param text 小说文本（已预处理）
     * @return 场景列表
     */
    public List<SceneSegment> splitScenes(String text) {
        log.info("开始场景分割，文本长度: {}", text.length());

        // 策略1：规则预判 — 基于信号词初步划分
        List<SceneSegment> ruleBasedScenes = ruleBasedSplit(text);
        log.info("规则预判识别到 {} 个场景", ruleBasedScenes.size());

        // 策略2：LLM 精调 — 发送给 AI 确认和细化
        List<SceneSegment> llmScenes = llmRefineSplit(text);

        // 合并策略：优先使用 LLM 结果，回退到规则结果
        List<SceneSegment> finalScenes = llmScenes != null && !llmScenes.isEmpty()
                ? llmScenes
                : ruleBasedScenes;

        // 编号
        for (int i = 0; i < finalScenes.size(); i++) {
            finalScenes.get(i).setSceneNumber(i + 1);
        }

        log.info("场景分割完成，共 {} 个场景", finalScenes.size());
        return finalScenes;
    }

    /**
     * 基于规则的场景分割
     */
    private List<SceneSegment> ruleBasedSplit(String text) {
        List<SceneSegment> scenes = new ArrayList<>();
        String[] paragraphs = text.split("\n\n+");

        StringBuilder currentContent = new StringBuilder();
        String currentLocation = "未知地点";
        String currentTime = "DAY";
        String currentLocationType = "INT";

        for (String paragraph : paragraphs) {
            String trimmed = paragraph.trim();
            if (trimmed.isEmpty()) continue;

            // 检测是否有场景转换信号
            boolean isTransition = false;
            for (String signal : TRANSITION_SIGNALS) {
                if (trimmed.contains(signal)) {
                    // 检测到转换信号，保存当前场景，开始新场景
                    if (currentContent.length() > 50) { // 避免过短的场景
                        isTransition = true;
                        break;
                    }
                }
            }

            // 检测时间词
            Matcher timeMatcher = TIME_PATTERN.matcher(trimmed);
            String detectedTime = null;
            if (timeMatcher.find()) {
                detectedTime = mapTimeWord(timeMatcher.group());
            }

            if (isTransition && currentContent.length() > 50) {
                // 保存当前场景
                scenes.add(buildSceneSegment(currentContent.toString(), currentLocationType, currentLocation, currentTime));
                currentContent = new StringBuilder();
                if (detectedTime != null) {
                    currentTime = detectedTime;
                }
            } else {
                if (detectedTime != null) {
                    currentTime = detectedTime;
                }
            }

            currentContent.append(trimmed).append("\n\n");
        }

        // 保存最后一个场景
        if (currentContent.length() > 0) {
            scenes.add(buildSceneSegment(currentContent.toString(), currentLocationType, currentLocation, currentTime));
        }

        return scenes;
    }

    /**
     * LLM 精调场景分割
     */
    private List<SceneSegment> llmRefineSplit(String text) {
        try {
            String prompt = promptTemplate.render("scene-detection", Map.of());
            String response = llmService.chat(prompt, text);

            // 提取 JSON 部分
            String json = extractJson(response);
            if (json == null) {
                log.warn("LLM 场景分割响应中未找到有效JSON");
                return null;
            }

            List<Map<String, Object>> sceneData = objectMapper.readValue(json, new TypeReference<>() {});
            List<SceneSegment> scenes = new ArrayList<>();

            for (Map<String, Object> data : sceneData) {
                SceneSegment segment = new SceneSegment();
                segment.setSceneNumber(toInt(data.get("scene_number")));
                segment.setLocationType(getStringOrDefault(data.get("location_type"), "INT"));
                segment.setLocation(getStringOrDefault(data.get("location"), "未知地点"));
                segment.setTimeOfDay(getStringOrDefault(data.get("time_of_day"), "DAY"));
                segment.setSummary(getStringOrDefault(data.get("summary"), ""));

                Object charactersObj = data.get("characters");
                if (charactersObj instanceof List<?> chars) {
                    segment.setCharactersPresent(chars.stream()
                            .map(Object::toString)
                            .toList());
                }

                // 从原文中提取对应片段
                String startText = getStringOrDefault(data.get("start_text"), "");
                String endText = getStringOrDefault(data.get("end_text"), "");
                segment.setContent(extractContentBetween(text, startText, endText));

                scenes.add(segment);
            }

            return scenes;
        } catch (Exception e) {
            log.warn("LLM 场景分割失败，回退到规则模式: {}", e.getMessage());
            return null;
        }
    }

    // ========== 辅助方法 ==========

    private SceneSegment buildSceneSegment(String content, String locationType, String location, String timeOfDay) {
        SceneSegment segment = new SceneSegment();
        segment.setLocationType(locationType);
        segment.setLocation(location);
        segment.setTimeOfDay(timeOfDay);
        segment.setContent(content.trim());
        return segment;
    }

    private String mapTimeWord(String timeWord) {
        if (timeWord.contains("清晨") || timeWord.contains("早晨") || timeWord.contains("早上") || timeWord.contains("上午")) {
            return "MORNING";
        } else if (timeWord.contains("中午") || timeWord.contains("下午")) {
            return "DAY";
        } else if (timeWord.contains("傍晚") || timeWord.contains("黄昏")) {
            return "EVENING";
        } else if (timeWord.contains("晚上") || timeWord.contains("夜晚") || timeWord.contains("深夜") || timeWord.contains("凌晨")) {
            return "NIGHT";
        } else if (timeWord.contains("第二天") || timeWord.contains("次日") || timeWord.contains("几天后")) {
            return "DAY";
        }
        return "DAY";
    }

    private String extractJson(String text) {
        // 尝试提取 ```json ... ``` 代码块
        int start = text.indexOf("```json");
        if (start != -1) {
            start = text.indexOf('\n', start) + 1;
            int end = text.indexOf("```", start);
            if (end != -1) return text.substring(start, end).trim();
        }
        // 尝试提取 [...] 数组
        start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    private String extractContentBetween(String fullText, String startText, String endText) {
        if (startText.isEmpty()) return fullText;
        int start = fullText.indexOf(startText);
        if (start == -1) start = 0;
        int end = endText.isEmpty() ? fullText.length() : fullText.indexOf(endText);
        if (end == -1 || end <= start) end = Math.min(start + 2000, fullText.length());
        else end += endText.length();
        return fullText.substring(start, end).trim();
    }

    private String getStringOrDefault(Object obj, String defaultValue) {
        return obj != null ? obj.toString() : defaultValue;
    }

    private int toInt(Object obj) {
        if (obj instanceof Number n) return n.intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return 0; }
    }

    // ========== 内部数据类 ==========

    @Data
    public static class SceneSegment {
        private int sceneNumber;
        private String locationType;
        private String location;
        private String timeOfDay;
        private String content;
        private String summary;
        private List<String> charactersPresent = new ArrayList<>();
    }
}
