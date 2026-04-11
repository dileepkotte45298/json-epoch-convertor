package com.kloudinsights.jsontransformer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kloudinsights.jsontransformer.model.TransformRequest;
import com.kloudinsights.jsontransformer.model.TransformResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class TransformService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public TransformResponse transform(TransformRequest request) {
        try {
            JsonNode root = objectMapper.readTree(request.getJsonInput());
            ZoneId zoneId = ZoneId.of(request.getTimezone());
            String format = request.getDateFormat() != null && !request.getDateFormat().isBlank()
                    ? request.getDateFormat()
                    : "yyyy-MM-dd HH:mm:ss z";
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format).withZone(zoneId);

            AtomicInteger count = new AtomicInteger(0);
            JsonNode transformed = transformNode(root, request.getFields(), formatter, count);
            String result = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(transformed);
            return new TransformResponse(result, count.get());
        } catch (Exception e) {
            return new TransformResponse("Error: " + e.getMessage());
        }
    }

    private JsonNode transformNode(JsonNode node, List<String> fields, DateTimeFormatter formatter, AtomicInteger count) {
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node.deepCopy();
            node.fields().forEachRemaining(entry -> {
                String key = entry.getKey();
                JsonNode value = entry.getValue();
                if (fields.contains(key)) {
                    Long epoch = extractEpoch(value);
                    if (epoch != null) {
                        obj.put(key, convertEpoch(epoch, formatter));
                        count.incrementAndGet();
                        return;
                    }
                }
                obj.set(key, transformNode(value, fields, formatter, count));
            });
            return obj;
        } else if (node.isArray()) {
            ArrayNode arr = objectMapper.createArrayNode();
            node.forEach(item -> arr.add(transformNode(item, fields, formatter, count)));
            return arr;
        }
        return node;
    }

    /** Extracts a long epoch from either a numeric node or a string node containing only digits. */
    private Long extractEpoch(JsonNode value) {
        if (value.isNumber()) {
            return value.longValue();
        }
        if (value.isTextual()) {
            String text = value.asText().trim();
            if (text.matches("\\d{10,13}")) {
                try {
                    return Long.parseLong(text);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private String convertEpoch(long epoch, DateTimeFormatter formatter) {
        // Auto-detect millis vs seconds: if > 1e10, treat as milliseconds
        Instant instant = (epoch > 9_999_999_999L)
                ? Instant.ofEpochMilli(epoch)
                : Instant.ofEpochSecond(epoch);
        ZonedDateTime zdt = ZonedDateTime.ofInstant(instant, formatter.getZone());
        return zdt.format(formatter);
    }

    public List<String> detectEpochFields(String jsonInput) {
        try {
            JsonNode root = objectMapper.readTree(jsonInput);
            List<String> detected = new java.util.ArrayList<>();
            detectInNode(root, detected);
            return detected;
        } catch (Exception e) {
            return List.of();
        }
    }

    private void detectInNode(JsonNode node, List<String> detected) {
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                boolean isEpoch = false;
                if (value.isNumber()) {
                    isEpoch = looksLikeEpoch(value.longValue());
                } else if (value.isTextual()) {
                    String text = value.asText().trim();
                    if (text.matches("\\d{10,13}")) {
                        try {
                            isEpoch = looksLikeEpoch(Long.parseLong(text));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
                if (isEpoch) {
                    if (!detected.contains(entry.getKey())) {
                        detected.add(entry.getKey());
                    }
                } else {
                    detectInNode(value, detected);
                }
            });
        } else if (node.isArray()) {
            node.forEach(item -> detectInNode(item, detected));
        }
    }

    private boolean looksLikeEpoch(long value) {
        // Seconds: ~1e9 to ~2e10 (year 2001–2286)
        // Millis:  ~1e12 to ~2e13
        return (value >= 1_000_000_000L && value <= 20_000_000_000L)
                || (value >= 1_000_000_000_000L && value <= 20_000_000_000_000L);
    }
}
