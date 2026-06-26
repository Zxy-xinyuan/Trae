package com.novel2script.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * YAML 格式校验与自动修复工具
 */
@Slf4j
public final class YamlValidator {

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    private YamlValidator() {
    }

    /**
     * 校验 YAML 是否合法
     *
     * @param yamlContent YAML 内容
     * @return 校验结果
     */
    public static ValidationResult validate(String yamlContent) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (yamlContent == null || yamlContent.trim().isEmpty()) {
            errors.add("YAML 内容为空");
            return new ValidationResult(false, errors, warnings);
        }

        // 1. 基本语法检查
        try {
            YAML_MAPPER.readTree(yamlContent);
        } catch (Exception e) {
            errors.add("YAML 语法错误: " + e.getMessage());
            return new ValidationResult(false, errors, warnings);
        }

        // 2. 结构检查
        try {
            Map<String, Object> root = YAML_MAPPER.readValue(yamlContent, Map.class);

            // 检查必要字段
            if (!root.containsKey("version")) {
                warnings.add("缺少 version 字段");
            }
            if (!root.containsKey("meta")) {
                warnings.add("缺少 meta 元数据字段");
            }
            if (!root.containsKey("scenes")) {
                errors.add("缺少 scenes 场景列表");
            }
            if (!root.containsKey("characters")) {
                warnings.add("缺少 characters 角色列表");
            }

            // 检查 scenes 非空
            Object scenes = root.get("scenes");
            if (scenes instanceof List<?> sceneList) {
                if (sceneList.isEmpty()) {
                    warnings.add("场景列表为空");
                }
            }

        } catch (Exception e) {
            warnings.add("结构解析警告: " + e.getMessage());
        }

        boolean valid = errors.isEmpty();
        return new ValidationResult(valid, errors, warnings);
    }

    /**
     * 尝试修复常见的 YAML 问题
     */
    public static String autoFix(String yamlContent) {
        if (yamlContent == null) return null;

        String fixed = yamlContent;

        // 去除 BOM 头
        if (fixed.startsWith("﻿")) {
            fixed = fixed.substring(1);
        }

        // 去除文档分隔符
        if (fixed.startsWith("---")) {
            fixed = fixed.substring(3).trim();
        }

        // 修复常见的缩进问题（Tab 转空格）
        fixed = fixed.replace("\t", "  ");

        return fixed;
    }

    /**
     * 校验结果
     */
    public record ValidationResult(boolean valid, List<String> errors, List<String> warnings) {
    }
}
