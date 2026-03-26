package com.shelf.controller;

import com.shelf.dto.ActivityHeatmapDayResponse;
import com.shelf.dto.DayConsumptionResponse;
import com.shelf.dto.UserMediaRequest;
import com.shelf.dto.UserMediaResponse;
import com.shelf.model.Status;
import com.shelf.service.UserMediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/shelf")
@RequiredArgsConstructor
public class UserMediaController {

    private final UserMediaService userMediaService;

    @PostMapping
    public ResponseEntity<UserMediaResponse> addToShelf(
            Authentication authentication,
            @Valid @RequestBody UserMediaRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.addToShelf(username, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserMediaResponse> updateMedia(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UserMediaRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.updateMedia(username, id, request));
    }

    @GetMapping
    public ResponseEntity<List<UserMediaResponse>> getUserShelf(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.getUserShelf(username));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<UserMediaResponse>> getUserShelfByStatus(
            Authentication authentication,
            @PathVariable Status status) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.getUserShelfByStatus(username, status));
    }

    @GetMapping("/activity/heatmap")
    public ResponseEntity<List<ActivityHeatmapDayResponse>> getConsumptionHeatmap(
            Authentication authentication,
            @RequestParam(name = "days", defaultValue = "371") int days) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.getConsumptionHeatmap(username, days));
    }

    @GetMapping("/activity/{date}")
    public ResponseEntity<DayConsumptionResponse> getConsumptionByDate(
            Authentication authentication,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String username = authentication.getName();
        return ResponseEntity.ok(userMediaService.getDayConsumption(username, date));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFromShelf(
            Authentication authentication,
            @PathVariable Long id) {
        String username = authentication.getName();
        userMediaService.deleteFromShelf(username, id);
        return ResponseEntity.noContent().build();
    }
}
