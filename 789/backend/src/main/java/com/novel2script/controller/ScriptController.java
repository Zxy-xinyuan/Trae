package com.novel2script.controller;

import com.novel2script.dto.ConversionRequest;
import com.novel2script.dto.ConversionResponse;
import com.novel2script.service.ScriptConversionService;
import com.novel2script.util.TextUtils;
import com.novel2script.util.YamlValidator;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 剧本转换 REST 控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
public class ScriptController {

    private final ScriptConversionService conversionService;

    public ScriptController(ScriptConversionService conversionService) {
        this.conversionService = conversionService;
    }

    /**
     * 小说文本转剧本
     * <p>
     * POST /api/v1/convert
     */
    @PostMapping("/convert")
    public ResponseEntity<ConversionResponse> convert(@Valid @RequestBody ConversionRequest request) {
        log.info("收到转换请求，文本长度: {} 字", TextUtils.countWords(request.getNovelText()));

        ConversionResponse response = conversionService.convert(request);

        if (response.isSuccess()) {
            // 自动修复并校验 YAML
            String fixedYaml = YamlValidator.autoFix(response.getYamlContent());
            response.setYamlContent(fixedYaml);

            YamlValidator.ValidationResult validation = YamlValidator.validate(fixedYaml);
            if (!validation.valid()) {
                response.getWarnings().addAll(validation.errors());
            }
            response.getWarnings().addAll(validation.warnings());

            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 校验 YAML 内容
     * <p>
     * POST /api/v1/validate
     */
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateYaml(@RequestBody Map<String, String> request) {
        String yamlContent = request.get("yaml_content");
        YamlValidator.ValidationResult result = YamlValidator.validate(yamlContent);

        Map<String, Object> response = new HashMap<>();
        response.put("valid", result.valid());
        response.put("errors", result.errors());
        response.put("warnings", result.warnings());

        return ResponseEntity.ok(response);
    }
}
