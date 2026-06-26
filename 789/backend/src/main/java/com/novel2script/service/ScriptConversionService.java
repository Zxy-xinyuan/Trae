package com.novel2script.service;

import com.novel2script.dto.ConversionRequest;
import com.novel2script.dto.ConversionResponse;
import com.novel2script.model.ScriptCharacter;
import com.novel2script.model.Script;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 剧本转换编排服务 — 串联整个转换流水线
 * <p>
 * 流程：预处理 → 场景分割 → 元素提取 → YAML 组装
 */
@Slf4j
@Service
public class ScriptConversionService {

    private final PreprocessorService preprocessorService;
    private final SceneSplitterService sceneSplitterService;
    private final ElementExtractorService elementExtractorService;
    private final YamlAssemblerService yamlAssemblerService;
    private final LLMService llmService;

    public ScriptConversionService(PreprocessorService preprocessorService,
                                    SceneSplitterService sceneSplitterService,
                                    ElementExtractorService elementExtractorService,
                                    YamlAssemblerService yamlAssemblerService,
                                    LLMService llmService) {
        this.preprocessorService = preprocessorService;
        this.sceneSplitterService = sceneSplitterService;
        this.elementExtractorService = elementExtractorService;
        this.yamlAssemblerService = yamlAssemblerService;
        this.llmService = llmService;
    }

    /**
     * 执行完整的小说→剧本转换
     *
     * @param request 转换请求
     * @return 转换结果
     */
    public ConversionResponse convert(ConversionRequest request) {
        long startTime = System.currentTimeMillis();
        List<String> warnings = new ArrayList<>();

        try {
            log.info("开始转换任务，文本长度: {}", request.getNovelText().length());

            // 1. 文本预处理
            log.info("[1/4] 文本预处理...");
            PreprocessorService.PreprocessResult preprocessResult =
                    preprocessorService.preprocess(request.getNovelText());

            if (preprocessResult.getChapterCount() > 1) {
                warnings.add(String.format("检测到 %d 个章节", preprocessResult.getChapterCount()));
            }

            // 2. 场景分割
            log.info("[2/4] 场景分割...");
            // 对每个章节分别进行场景分割
            List<SceneSplitterService.SceneSegment> allScenes = new ArrayList<>();
            for (PreprocessorService.ChapterInfo chapter : preprocessResult.getChapters()) {
                List<SceneSplitterService.SceneSegment> chapterScenes =
                        sceneSplitterService.splitScenes(chapter.getContent());
                allScenes.addAll(chapterScenes);
            }

            if (allScenes.isEmpty()) {
                warnings.add("未能识别到场景边界，已将全文作为单个场景处理");
                SceneSplitterService.SceneSegment fallback = new SceneSplitterService.SceneSegment();
                fallback.setSceneNumber(1);
                fallback.setLocationType("INT");
                fallback.setLocation("未知地点");
                fallback.setTimeOfDay("DAY");
                fallback.setContent(preprocessResult.getCleanedText());
                allScenes.add(fallback);
            }

            log.info("场景分割完成，共 {} 个场景", allScenes.size());

            // 3. 元素提取
            log.info("[3/4] 元素提取...");
            List<ElementExtractorService.ExtractionResult> extractionResults = new ArrayList<>();
            for (SceneSplitterService.SceneSegment scene : allScenes) {
                ElementExtractorService.ExtractionResult result =
                        elementExtractorService.extractAll(scene.getContent(), scene.getSceneNumber());
                extractionResults.add(result);
            }

            // 4. YAML 组装
            log.info("[4/4] YAML 组装...");
            Script script = yamlAssemblerService.assemble(request, allScenes, extractionResults);
            String yamlContent = yamlAssemblerService.toYaml(script);

            // 收集所有角色
            List<ScriptCharacter> allCharacters = new ArrayList<>(script.getCharacters());

            long processingTime = System.currentTimeMillis() - startTime;
            log.info("转换完成，耗时: {}ms", processingTime);

            return ConversionResponse.builder()
                    .success(true)
                    .yamlContent(yamlContent)
                    .script(script)
                    .characters(allCharacters)
                    .warnings(warnings)
                    .processingTimeMs(processingTime)
                    .build();

        } catch (Exception e) {
            long processingTime = System.currentTimeMillis() - startTime;
            log.error("转换失败: {}", e.getMessage(), e);

            return ConversionResponse.builder()
                    .success(false)
                    .error("转换失败: " + e.getMessage())
                    .warnings(warnings)
                    .processingTimeMs(processingTime)
                    .build();
        }
    }

    /**
     * 使用 LLM 端到端一次性转换（适用于短文本）
     */
    public ConversionResponse convertWithLLM(ConversionRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            String prompt = "你是一位资深编剧，请将以下小说文本转换为结构化YAML格式剧本。"
                    + "严格按照YAML格式输出，不要包含其他说明文字。\n\n"
                    + request.getNovelText();

            String yamlContent = llmService.chat("你是专业的小说转剧本AI助手。", prompt);

            return ConversionResponse.builder()
                    .success(true)
                    .yamlContent(yamlContent)
                    .processingTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        } catch (Exception e) {
            return ConversionResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .processingTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }
}
