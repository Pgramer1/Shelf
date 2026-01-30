package com.shelf.service;

import com.shelf.dto.MediaRequest;
import com.shelf.dto.MediaResponse;
import com.shelf.model.Media;
import com.shelf.model.MediaType;
import com.shelf.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;

    public MediaResponse createMedia(MediaRequest request) {
        Media media = new Media();
        media.setTitle(request.getTitle());
        media.setType(request.getType());
        media.setTotalUnits(request.getTotalUnits());
        media.setImageUrl(request.getImageUrl());
        media.setDescription(request.getDescription());
        media.setReleaseYear(request.getReleaseYear());

        Media savedMedia = mediaRepository.save(media);
        return mapToResponse(savedMedia);
    }

    public List<MediaResponse> getAllMedia() {
        return mediaRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MediaResponse getMediaById(Long id) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found"));
        return mapToResponse(media);
    }

    public List<MediaResponse> getMediaByType(MediaType type) {
        return mediaRepository.findByType(type).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<MediaResponse> searchMedia(String query) {
        return mediaRepository.findByTitleContainingIgnoreCase(query).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private MediaResponse mapToResponse(Media media) {
        return new MediaResponse(
                media.getId(),
                media.getTitle(),
                media.getType(),
                media.getTotalUnits(),
                media.getImageUrl(),
                media.getDescription(),
                media.getReleaseYear());
    }
}
