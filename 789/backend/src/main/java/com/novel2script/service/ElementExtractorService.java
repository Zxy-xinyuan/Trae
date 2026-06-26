package com.novel2script.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel2script.model.Beat;
import com.novel2script.model.ScriptCharacter;
import com.novel2script.prompt.PromptTemplate;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 元素提取服务 — 角色识别、对话提取、动作描写提取
 */
@Slf4j
@Service
public class ElementExtractorService {

    /**
     * 中文引号对
     */
    private static final Pattern DIALOGUE_PATTERN = Pattern.compile(
            "([\"“「『])(.*?)([\"”」』])"
    );

    /**
     * 对话引导词模式：XX说/道/喊/问/答 等
     */
    private static final Pattern SPEAKER_PATTERN = Pattern.compile(
            "([\\u4e00-\\u9fa5]{1,6}?)(?:说|道|喊|叫|问|答|嚷|吼|低声道|轻声道|笑着说|冷冷地说|淡淡地说|大声说|小声说|自言自语地说|惊呼|叹息|嘟囔|呢喃|反驳|质问|附和|补充|解释|提醒|打断|追问)"
    );

    private final LLMService llmService;
    private final PromptTemplate promptTemplate;
    private final ObjectMapper objectMapper;

    public ElementExtractorService(LLMService llmService, PromptTemplate promptTemplate, ObjectMapper objectMapper) {
        this.llmService = llmService;
        this.promptTemplate = promptTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 从场景文本中提取所有元素
     *
     * @param sceneText  场景文本
     * @param sceneIndex 场景索引
     * @return 提取结果
     */
    public ExtractionResult extractAll(String sceneText, int sceneIndex) {
        log.info("开始提取场景 {} 的元素", sceneIndex);

        ExtractionResult result = new ExtractionResult();

        // 1. 提取对话（规则方式）
        List<DialogueItem> dialogues = extractDialogues(sceneText);
        result.setDialogues(dialogues);

        // 2. 提取角色
        Set<String> characterNames = new LinkedHashSet<>();
        for (DialogueItem d : dialogues) {
            if (d.getSpeaker() != null && !d.getSpeaker().isEmpty()) {
                characterNames.add(d.getSpeaker());
            }
        }

        // 3. 构建角色对象
        List<ScriptCharacter> characters = characterNames.stream()
                .map(name -> ScriptCharacter.builder()
                        .name(name.toUpperCase())
                        .aliases(List.of(name))
                        .characterType("supporting")
                        .build())
                .collect(Collectors.toList());
        result.setCharacters(characters);

        // 4. 生成节拍列表
        List<Beat> beats = buildBeats(sceneText, dialogues);
        result.setBeats(beats);

        log.info("场景 {} 提取完成: {} 个角色, {} 段对话, {} 个节拍",
                sceneIndex, characters.size(), dialogues.size(), beats.size());

        return result;
    }

    /**
     * 使用 LLM 增强提取（可选，用于更精确的角色识别）
     */
    public List<ScriptCharacter> extractCharactersWithLLM(String text) {
        try {
            String prompt = promptTemplate.render("dialogue-extraction", Map.of());
            String response = llmService.chat(prompt, text);

            String json = extractJson(response);
            if (json == null) return new ArrayList<>();

            List<Map<String, Object>> dialogueData = objectMapper.readValue(json, new TypeReference<>() {});
            Set<String> names = new LinkedHashSet<>();

            for (Map<String, Object> item : dialogueData) {
                String character = (String) item.get("character");
                if (character != null && !character.isEmpty()) {
                    names.add(character);
                }
            }

            List<ScriptCharacter> result = new ArrayList<>();
            for (String name : names) {
                result.add(ScriptCharacter.builder()
                        .name(name.toUpperCase())
                        .aliases(List.of(name))
                        .characterType("supporting")
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.warn("LLM 角色提取失败: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 规则方式提取对话
     */
    private List<DialogueItem> extractDialogues(String text) {
        List<DialogueItem> dialogues = new ArrayList<>();
        Matcher matcher = DIALOGUE_PATTERN.matcher(text);

        while (matcher.find()) {
            String content = matcher.group(2);
            if (content.trim().isEmpty()) continue;

            // 尝试在引号前找到说话人
            int beforeQuote = matcher.start();
            String beforeText = text.substring(Math.max(0, beforeQuote - 20), beforeQuote);
            String speaker = findSpeaker(beforeText);

            DialogueItem item = new DialogueItem();
            item.setContent(content.trim());
            item.setSpeaker(speaker);
            item.setPosition(matcher.start());

            dialogues.add(item);
        }

        return dialogues;
    }

    /**
     * 从引号前的文本中寻找说话人
     */
    private String findSpeaker(String beforeText) {
        Matcher m = SPEAKER_PATTERN.matcher(beforeText);
        String lastSpeaker = null;
        while (m.find()) {
            lastSpeaker = m.group(1);
        }
        return lastSpeaker;
    }

    /**
     * 构建节拍列表（将原文拆分为 action + dialogue 节拍）
     */
    private List<Beat> buildBeats(String sceneText, List<DialogueItem> dialogues) {
        List<Beat> beats = new ArrayList<>();
        int lastEnd = 0;

        // 按位置排序对话
        dialogues.sort(Comparator.comparingInt(DialogueItem::getPosition));

        for (DialogueItem dialogue : dialogues) {
            int pos = dialogue.getPosition();

            // 对话前的文本作为 action
            if (pos > lastEnd) {
                String actionText = sceneText.substring(lastEnd, pos).trim();
                if (!actionText.isEmpty()) {
                    beats.add(Beat.builder()
                            .type("action")
                            .content(actionText)
                            .build());
                }
            }

            // 找到引号结束位置
            Matcher matcher = DIALOGUE_PATTERN.matcher(sceneText);
            int quoteEnd = pos;
            matcher.find(pos);
            quoteEnd = matcher.end();

            // 添加对话节拍
            beats.add(Beat.builder()
                    .type("dialogue")
                    .character(dialogue.getSpeaker() != null ? dialogue.getSpeaker().toUpperCase() : "UNKNOWN")
                    .content(dialogue.getContent())
                    .build());

            lastEnd = quoteEnd;
        }

        // 最后一段 action
        if (lastEnd < sceneText.length()) {
            String remaining = sceneText.substring(lastEnd).trim();
            if (!remaining.isEmpty()) {
                beats.add(Beat.builder()
                        .type("action")
                        .content(remaining)
                        .build());
            }
        }

        // 如果没有任何对话，整段作为 action
        if (dialogues.isEmpty() && !sceneText.trim().isEmpty()) {
            beats.clear();
            beats.add(Beat.builder()
                    .type("action")
                    .content(sceneText.trim())
                    .build());
        }

        return beats;
    }

    private String extractJson(String text) {
        int start = text.indexOf("```json");
        if (start != -1) {
            start = text.indexOf('\n', start) + 1;
            int end = text.indexOf("```", start);
            if (end != -1) return text.substring(start, end).trim();
        }
        start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
    }

    // ========== 数据类 ==========

    @Data
    public static class ExtractionResult {
        private List<ScriptCharacter> characters = new ArrayList<>();
        private List<DialogueItem> dialogues = new ArrayList<>();
        private List<Beat> beats = new ArrayList<>();
    }

    @Data
    public static class DialogueItem {
        private String speaker;
        private String content;
        private int position;
        private String tone;
    }
}
