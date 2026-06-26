package com.novel2script.prompt;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 提示词模板加载与变量替换工具
 */
@Slf4j
@Component
public class PromptTemplate {

    private static final String PROMPTS_PATH = "prompts/";
    private final Map<String, String> templateCache = new ConcurrentHashMap<>();

    /**
     * 加载提示词模板并替换变量
     *
     * @param templateName 模板文件名（不含路径和后缀）
     * @param variables    变量映射
     * @return 替换后的提示词
     */
    public String render(String templateName, Map<String, String> variables) {
        String template = loadTemplate(templateName);
        String rendered = template;

        for (Map.Entry<String, String> entry : variables.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}",
                    entry.getValue() != null ? entry.getValue() : "");
        }

        return rendered;
    }

    /**
     * 加载提示词模板（带缓存）
     */
    public String loadTemplate(String templateName) {
        return templateCache.computeIfAbsent(templateName, name -> {
            try {
                ClassPathResource resource = new ClassPathResource(PROMPTS_PATH + name + ".txt");
                try (InputStream is = resource.getInputStream()) {
                    return new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            } catch (IOException e) {
                log.error("加载提示词模板失败: {}", name, e);
                throw new RuntimeException("无法加载提示词模板: " + name, e);
            }
        });
    }

    /**
     * 清除模板缓存（用于热更新场景）
     */
    public void clearCache() {
        templateCache.clear();
    }
}
