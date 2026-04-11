package com.kloudinsights.jsontransformer.controller;

import com.kloudinsights.jsontransformer.model.TransformRequest;
import com.kloudinsights.jsontransformer.model.TransformResponse;
import com.kloudinsights.jsontransformer.service.TransformService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TransformController {

    private final TransformService transformService;

    public TransformController(TransformService transformService) {
        this.transformService = transformService;
    }

    @PostMapping("/transform")
    public ResponseEntity<TransformResponse> transform(@RequestBody TransformRequest request) {
        TransformResponse response = transformService.transform(request);
        if (response.getError() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/detect-fields")
    public ResponseEntity<Map<String, List<String>>> detectFields(@RequestBody Map<String, String> body) {
        String jsonInput = body.get("jsonInput");
        List<String> fields = transformService.detectEpochFields(jsonInput);
        return ResponseEntity.ok(Map.of("fields", fields));
    }

    @GetMapping("/timezones")
    public ResponseEntity<List<String>> getTimezones() {
        List<String> zones = java.time.ZoneId.getAvailableZoneIds()
                .stream()
                .sorted()
                .toList();
        return ResponseEntity.ok(zones);
    }
}
