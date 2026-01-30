package com.shelf.controller;

import com.shelf.dto.MediaRequest;
import com.shelf.dto.MediaResponse;
import com.shelf.model.MediaType;
import com.shelf.service.MediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping
    public ResponseEntity<MediaResponse> createMedia(@Valid @RequestBody MediaRequest request) {
        return ResponseEntity.ok(mediaService.createMedia(request));
    }

    @GetMapping
    public ResponseEntity<List<MediaResponse>> getAllMedia() {
        return ResponseEntity.ok(mediaService.getAllMedia());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MediaResponse> getMediaById(@PathVariable Long id) {
        return ResponseEntity.ok(mediaService.getMediaById(id));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<MediaResponse>> getMediaByType(@PathVariable MediaType type) {
        return ResponseEntity.ok(mediaService.getMediaByType(type));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MediaResponse>> searchMedia(@RequestParam String query) {
        return ResponseEntity.ok(mediaService.searchMedia(query));
    }
}
