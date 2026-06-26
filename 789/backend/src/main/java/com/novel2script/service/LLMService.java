package com.novel2script.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * LLM 服务 — 封装 OpenAI 兼容格式的 API 调用
 */
@Slf4j
@Service
public class LLMService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${llm.model}")
    private String model;

    @Value("${llm.max-tokens:8192}")
    private int maxTokens;

    @Value("${llm.temperature:0.3}")
    private double temperature;

    @Value("${llm.timeout:120}")
    private int timeout;

    public LLMService(@Qualifier("llmWebClient") WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    /**
     * 发送对话请求并获取完整响应
     *
     * @param systemPrompt 系统提示词
     * @param userMessage  用户消息
     * @return AI 回复内容
     */
    public String chat(String systemPrompt, String userMessage) {
        ChatRequest request = ChatRequest.builder()
                .model(model)
                .messages(List.of(
                        new ChatMessage("system", systemPrompt),
                        new ChatMessage("user", userMessage)
                ))
                .maxTokens(maxTokens)
                .temperature(temperature)
                .build();

        return executeRequest(request);
    }

    /**
     * 使用多轮消息发送对话请求
     *
     * @param messages 消息列表
     * @return AI 回复内容
     */
    public String chat(List<ChatMessage> messages) {
        ChatRequest request = ChatRequest.builder()
                .model(model)
                .messages(messages)
                .maxTokens(maxTokens)
                .temperature(temperature)
                .build();

        return executeRequest(request);
    }

    /**
     * 使用自定义参数发送对话请求
     */
    public String chat(List<ChatMessage> messages, int customMaxTokens, double customTemperature) {
        ChatRequest request = ChatRequest.builder()
                .model(model)
                .messages(messages)
                .maxTokens(customMaxTokens)
                .temperature(customTemperature)
                .build();

        return executeRequest(request);
    }

    private String executeRequest(ChatRequest request) {
        try {
            log.info("Sending LLM request: model={}, maxTokens={}, messages={}",
                    request.getModel(), request.getMaxTokens(), request.getMessages().size());

            String responseJson = webClient.post()
                    .uri("/v1/chat/completions")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeout))
                    .block();

            // 解析响应
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                String content = choices.get(0).path("message").path("content").asText();
                log.info("LLM response received, length={}", content.length());
                return content;
            }

            throw new RuntimeException("LLM 响应中没有找到有效内容: " + responseJson);

        } catch (Exception e) {
            log.error("LLM 调用失败: {}", e.getMessage(), e);
            throw new RuntimeException("LLM 调用失败: " + e.getMessage(), e);
        }
    }

    // ========== 内部数据类 ==========

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {
        private String model;
        private List<ChatMessage> messages;
        @JsonProperty("max_tokens")
        private Integer maxTokens;
        private Double temperature;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String content;
    }
}
