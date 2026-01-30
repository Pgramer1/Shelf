package com.shelf.service;

import com.shelf.dto.MediaResponse;
import com.shelf.dto.UserMediaRequest;
import com.shelf.dto.UserMediaResponse;
import com.shelf.model.Media;
import com.shelf.model.Status;
import com.shelf.model.User;
import com.shelf.model.UserMedia;
import com.shelf.repository.MediaRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserMediaService {

    private final UserMediaRepository userMediaRepository;
    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;

    public UserMediaResponse addToShelf(String username, UserMediaRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Media media = mediaRepository.findById(request.getMediaId())
                .orElseThrow(() -> new RuntimeException("Media not found"));

        // Check if already exists
        userMediaRepository.findByUserIdAndMediaId(user.getId(), media.getId())
                .ifPresent(um -> {
                    throw new RuntimeException("Media already in shelf");
                });

        UserMedia userMedia = new UserMedia();
        userMedia.setUser(user);
        userMedia.setMedia(media);
        userMedia.setStatus(request.getStatus());
        userMedia.setProgress(request.getProgress());
        userMedia.setRating(request.getRating());
        userMedia.setNotes(request.getNotes());
        userMedia.setIsFavorite(request.getIsFavorite());

        if (request.getStatus() == Status.WATCHING ||
                request.getStatus() == Status.READING ||
                request.getStatus() == Status.PLAYING) {
            userMedia.setStartedAt(LocalDateTime.now());
        }

        if (request.getStatus() == Status.COMPLETED) {
            userMedia.setCompletedAt(LocalDateTime.now());
        }

        UserMedia saved = userMediaRepository.save(userMedia);
        return mapToResponse(saved);
    }

    public UserMediaResponse updateMedia(String username, Long userMediaId, UserMediaRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserMedia userMedia = userMediaRepository.findById(userMediaId)
                .orElseThrow(() -> new RuntimeException("UserMedia not found"));

        // Verify ownership
        if (!userMedia.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        userMedia.setStatus(request.getStatus());
        userMedia.setProgress(request.getProgress());
        userMedia.setRating(request.getRating());
        userMedia.setNotes(request.getNotes());
        userMedia.setIsFavorite(request.getIsFavorite());

        // Update timestamps
        if ((request.getStatus() == Status.WATCHING ||
                request.getStatus() == Status.READING ||
                request.getStatus() == Status.PLAYING) &&
                userMedia.getStartedAt() == null) {
            userMedia.setStartedAt(LocalDateTime.now());
        }

        if (request.getStatus() == Status.COMPLETED && userMedia.getCompletedAt() == null) {
            userMedia.setCompletedAt(LocalDateTime.now());
        }

        UserMedia updated = userMediaRepository.save(userMedia);
        return mapToResponse(updated);
    }

    public List<UserMediaResponse> getUserShelf(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return userMediaRepository.findByUserId(user.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<UserMediaResponse> getUserShelfByStatus(String username, Status status) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return userMediaRepository.findByUserIdAndStatus(user.getId(), status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteFromShelf(String username, Long userMediaId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserMedia userMedia = userMediaRepository.findById(userMediaId)
                .orElseThrow(() -> new RuntimeException("UserMedia not found"));

        // Verify ownership
        if (!userMedia.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        userMediaRepository.delete(userMedia);
    }

    private UserMediaResponse mapToResponse(UserMedia userMedia) {
        MediaResponse mediaResponse = new MediaResponse(
                userMedia.getMedia().getId(),
                userMedia.getMedia().getTitle(),
                userMedia.getMedia().getType(),
                userMedia.getMedia().getTotalUnits(),
                userMedia.getMedia().getImageUrl(),
                userMedia.getMedia().getDescription(),
                userMedia.getMedia().getReleaseYear());

        return new UserMediaResponse(
                userMedia.getId(),
                mediaResponse,
                userMedia.getStatus(),
                userMedia.getProgress(),
                userMedia.getRating(),
                userMedia.getNotes(),
                userMedia.getIsFavorite(),
                userMedia.getStartedAt(),
                userMedia.getCompletedAt(),
                userMedia.getUpdatedAt());
    }
}
