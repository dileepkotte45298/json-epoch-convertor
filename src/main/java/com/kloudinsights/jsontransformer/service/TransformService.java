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
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

@Service
public class TransformService {

    private static final Pattern EPOCH_STRING_PATTERN = Pattern.compile("\\d{10,13}");

    private final ObjectMapper objectMapper = new ObjectMapper();

    public TransformResponse transform(TransformRequest request) {
        try {
            JsonNode root = objectMapper.readTree(request.getJsonInput());
            ZoneId zoneId = ZoneId.of(request.getTimezone());
            String format = request.getDateFormat() != null && !request.getDateFormat().isBlank()
                    ? request.getDateFormat()
                    : "yyyy-MM-dd HH:mm:ss z";
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format).withZone(zoneId);

            // Use a Set for O(1) field lookup instead of List.contains() O(n)
            Set<String> fieldSet = new HashSet<>(request.getFields());

            AtomicInteger count = new AtomicInteger(0);
            JsonNode transformed = transformNode(root, fieldSet, formatter, count);
            String result = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(transformed);
            return new TransformResponse(result, count.get());
        } catch (Exception e) {
            return new TransformResponse("Error: " + e.getMessage());
        }
    }

    private JsonNode transformNode(JsonNode node, Set<String> fields, DateTimeFormatter formatter, AtomicInteger count) {
        if (node.isObject()) {
            // Build a fresh ObjectNode instead of deepCopy() — avoids O(n²) for large arrays
            ObjectNode obj = objectMapper.createObjectNode();
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

    private Long extractEpoch(JsonNode value) {
        if (value.isNumber()) {
            return value.longValue();
        }
        if (value.isTextual()) {
            String text = value.asText().trim();
            if (EPOCH_STRING_PATTERN.matcher(text).matches()) {
                try {
                    return Long.parseLong(text);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private String convertEpoch(long epoch, DateTimeFormatter formatter) {
        Instant instant = (epoch > 9_999_999_999L)
                ? Instant.ofEpochMilli(epoch)
                : Instant.ofEpochSecond(epoch);
        ZonedDateTime zdt = ZonedDateTime.ofInstant(instant, formatter.getZone());
        return zdt.format(formatter);
    }

    public List<String> detectEpochFields(String jsonInput) {
        try {
            JsonNode root = objectMapper.readTree(jsonInput);
            // LinkedHashSet: O(1) contains check + preserves insertion order + no duplicates
            Set<String> detected = new LinkedHashSet<>();
            detectInNode(root, detected);
            return new ArrayList<>(detected);
        } catch (Exception e) {
            return List.of();
        }
    }

    private void detectInNode(JsonNode node, Set<String> detected) {
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                boolean isEpoch = false;
                if (value.isNumber()) {
                    isEpoch = looksLikeEpoch(value.longValue());
                } else if (value.isTextual()) {
                    String text = value.asText().trim();
                    if (EPOCH_STRING_PATTERN.matcher(text).matches()) {
                        try {
                            isEpoch = looksLikeEpoch(Long.parseLong(text));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
                if (isEpoch) {
                    detected.add(entry.getKey());
                } else {
                    detectInNode(value, detected);
                }
            });
        } else if (node.isArray()) {
            node.forEach(item -> detectInNode(item, detected));
        }
    }

    private boolean looksLikeEpoch(long value) {
        return (value >= 1_000_000_000L && value <= 20_000_000_000L)
                || (value >= 1_000_000_000_000L && value <= 20_000_000_000_000L);
    }
}
