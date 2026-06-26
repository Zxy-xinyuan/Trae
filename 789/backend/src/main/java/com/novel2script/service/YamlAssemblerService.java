package com.novel2script.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.novel2script.dto.ConversionRequest;
import com.novel2script.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * YAML 组装服务 — 将提取结果组装为结构化 YAML 剧本
 */
@Slf4j
@Service
public class YamlAssemblerService {

    private final ObjectMapper yamlMapper;

    public YamlAssemblerService() {
        YAMLFactory yamlFactory = YAMLFactory.builder()
                .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
                .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
                .enable(YAMLGenerator.Feature.INDENT_ARRAYS_WITH_INDICATOR)
                .build();
        this.yamlMapper = new ObjectMapper(yamlFactory);
        this.yamlMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        this.yamlMapper.findAndRegisterModules();
    }

    /**
     * 组装完整的剧本对象
     *
     * @param request        转换请求（含选项）
     * @param sceneSegments  场景片段列表
     * @param extractionResults 各场景的提取结果
     * @return 完整的 Script 对象
     */
    public Script assemble(ConversionRequest request,
                           List<SceneSplitterService.SceneSegment> sceneSegments,
                           List<ElementExtractorService.ExtractionResult> extractionResults) {

        ConversionRequest.ConversionOptions options = request.getOptions();

        // 1. 构建 Meta
        Meta meta = Meta.builder()
                .title(options.getTitle() != null ? options.getTitle() : "未命名剧本")
                .author(options.getAuthor() != null ? options.getAuthor() : "未知作者")
                .genre(options.getGenre() != null ? options.getGenre() : "drama")
                .sourceNovel(options.getTitle())
                .version("初稿")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // 2. 合并所有角色（去重）
        Map<String, ScriptCharacter> characterMap = new LinkedHashMap<>();
        for (ElementExtractorService.ExtractionResult result : extractionResults) {
            for (ScriptCharacter c : result.getCharacters()) {
                characterMap.putIfAbsent(c.getName(), c);
            }
        }

        // 标记主角（出现次数最多的为 protagonist）
        markProtagonists(characterMap, extractionResults);

        // 3. 构建场景列表
        List<Scene> scenes = new ArrayList<>();
        for (int i = 0; i < sceneSegments.size(); i++) {
            SceneSplitterService.SceneSegment segment = sceneSegments.get(i);
            ElementExtractorService.ExtractionResult extraction = i < extractionResults.size()
                    ? extractionResults.get(i)
                    : new ElementExtractorService.ExtractionResult();

            SceneHeading heading = SceneHeading.builder()
                    .locationType(segment.getLocationType())
                    .location(segment.getLocation())
                    .timeOfDay(segment.getTimeOfDay())
                    .build();

            Scene scene = Scene.builder()
                    .sceneNumber(segment.getSceneNumber())
                    .sceneHeading(heading)
                    .beats(extraction.getBeats())
                    .summary(segment.getSummary())
                    .charactersPresent(segment.getCharactersPresent())
                    .build();

            scenes.add(scene);
        }

        // 4. 组装 Script
        Script script = Script.builder()
                .version("1.0")
                .meta(meta)
                .characters(new ArrayList<>(characterMap.values()))
                .scenes(scenes)
                .build();

        log.info("剧本组装完成: {} 个角色, {} 个场景", characterMap.size(), scenes.size());
        return script;
    }

    /**
     * 将 Script 对象序列化为 YAML 字符串
     */
    public String toYaml(Script script) {
        try {
            return yamlMapper.writerWithDefaultPrettyPrinter().writeValueAsString(script);
        } catch (Exception e) {
            log.error("YAML 序列化失败", e);
            throw new RuntimeException("YAML 序列化失败: " + e.getMessage(), e);
        }
    }

    /**
     * 标记主角 — 出现场景最多的角色标记为 protagonist
     */
    private void markProtagonists(Map<String, ScriptCharacter> characterMap,
                                   List<ElementExtractorService.ExtractionResult> results) {
        // 统计角色出现次数
        Map<String, Integer> frequency = new HashMap<>();
        for (ElementExtractorService.ExtractionResult result : results) {
            for (ElementExtractorService.DialogueItem d : result.getDialogues()) {
                if (d.getSpeaker() != null) {
                    frequency.merge(d.getSpeaker().toUpperCase(), 1, Integer::sum);
                }
            }
        }

        if (frequency.isEmpty()) return;

        // 出现最多的标记为 protagonist
        String protagonist = frequency.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        if (protagonist != null && characterMap.containsKey(protagonist)) {
            characterMap.get(protagonist).setCharacterType("protagonist");
        }

        // 出现2次以上的标记为 supporting
        for (Map.Entry<String, Integer> entry : frequency.entrySet()) {
            ScriptCharacter c = characterMap.get(entry.getKey());
            if (c != null && c.getCharacterType() == null) {
                c.setCharacterType(entry.getValue() >= 3 ? "supporting" : "minor");
            }
        }
    }
}
