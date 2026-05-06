package com.shelf.service;

import com.shelf.dto.CommunityRatingBucketResponse;
import com.shelf.dto.CommunityRecentRatingResponse;
import com.shelf.dto.MediaRequest;
import com.shelf.dto.MediaDetailsResponse;
import com.shelf.dto.MediaResponse;
import com.shelf.dto.RatingScope;
import com.shelf.model.Media;
import com.shelf.model.MediaType;
import com.shelf.model.User;
import com.shelf.model.UserMedia;
import com.shelf.repository.MediaRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;
    private final UserMediaRepository userMediaRepository;
    private final UserRepository userRepository;

    public MediaResponse createMedia(MediaRequest request) {
        String normalizedSource = normalizeSource(request.getSource());
        String normalizedSourceId = normalizeSourceId(request.getSourceId());
        String normalizedKey = buildNormalizedKey(request.getType(), request.getTitle(), request.getReleaseYear(),
                request.getTotalUnits());

        Optional<Media> bySource = findBySource(normalizedSource, normalizedSourceId);
        if (bySource.isPresent()) {
            return mapToResponse(backfillIdentityFieldsIfNeeded(bySource.get(), normalizedSource, normalizedSourceId, normalizedKey));
        }

        Optional<Media> byKey = findByNormalizedKey(normalizedKey);
        if (byKey.isPresent()) {
            return mapToResponse(backfillIdentityFieldsIfNeeded(byKey.get(), normalizedSource, normalizedSourceId, normalizedKey));
        }

        Media media = new Media();
        media.setTitle(request.getTitle());
        media.setType(request.getType());
        media.setTotalUnits(request.getTotalUnits());
        media.setImageUrl(request.getImageUrl());
        media.setDescription(request.getDescription());
        media.setReleaseYear(request.getReleaseYear());
        media.setSource(normalizedSource);
        media.setSourceId(normalizedSourceId);
        media.setNormalizedKey(normalizedKey);

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Media not found"));
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

    public MediaDetailsResponse getMediaDetails(Long mediaId, String username, RatingScope requestedScope) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Media not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<UserMedia> userMedia = userMediaRepository.findByUserIdAndMediaId(user.getId(), mediaId);

        // FRIENDS scope requires friendship graph and is intentionally downgraded for
        // this
        // phase.
        RatingScope appliedScope = RatingScope.GLOBAL;
        String scopeNotice = requestedScope == RatingScope.FRIENDS
                ? "Friends scope is not available yet; showing global ratings for now."
                : null;

        Double averageRating = userMediaRepository.getAverageRatingByMediaId(mediaId);
        Long totalRatings = userMediaRepository.countByMedia_IdAndRatingIsNotNull(mediaId);

        List<CommunityRatingBucketResponse> ratingDistribution = userMediaRepository
                .getRatingDistributionByMediaId(mediaId)
                .stream()
                .map(row -> new CommunityRatingBucketResponse(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<CommunityRecentRatingResponse> recentRatings = userMediaRepository
                .findTop20ByMedia_IdAndRatingIsNotNullOrderByUpdatedAtDesc(mediaId)
                .stream()
                .map(entry -> new CommunityRecentRatingResponse(
                        entry.getUser().getUsername(),
                        entry.getRating(),
                        entry.getUpdatedAt()))
                .collect(Collectors.toList());

        Integer myRating = userMedia.map(UserMedia::getRating).orElse(null);

        return new MediaDetailsResponse(
                mapToResponse(media),
                requestedScope,
                appliedScope,
                scopeNotice,
                averageRating,
                totalRatings,
                ratingDistribution,
                recentRatings,
                myRating);
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

    private Optional<Media> findBySource(String source, String sourceId) {
        if (source == null || source.isBlank() || sourceId == null || sourceId.isBlank()) {
            return Optional.empty();
        }
        return mediaRepository.findFirstBySourceAndSourceId(source, sourceId);
    }

    private Optional<Media> findByNormalizedKey(String normalizedKey) {
        if (normalizedKey == null || normalizedKey.isBlank()) {
            return Optional.empty();
        }

        Optional<Media> existing = mediaRepository.findFirstByNormalizedKey(normalizedKey);
        if (existing.isPresent()) {
            return existing;
        }

        String[] parts = normalizedKey.split("\\|", -1);
        if (parts.length != 4) {
            return Optional.empty();
        }

        MediaType type = MediaType.valueOf(parts[0]);

        return mediaRepository.findByType(type).stream()
                .filter(media -> buildNormalizedKey(media.getType(), media.getTitle(), media.getReleaseYear(),
                        media.getTotalUnits()).equals(normalizedKey))
                .findFirst();
    }

    private Media backfillIdentityFieldsIfNeeded(Media media, String source, String sourceId, String normalizedKey) {
        boolean changed = false;

        if ((media.getSource() == null || media.getSource().isBlank()) && source != null && !source.isBlank()) {
            media.setSource(source);
            changed = true;
        }

        if ((media.getSourceId() == null || media.getSourceId().isBlank()) && sourceId != null && !sourceId.isBlank()) {
            media.setSourceId(sourceId);
            changed = true;
        }

        if (media.getNormalizedKey() == null || media.getNormalizedKey().isBlank()) {
            media.setNormalizedKey(normalizedKey);
            changed = true;
        }

        if (!changed) {
            return media;
        }

        return mediaRepository.save(media);
    }

    private static String normalizeSource(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }
        return source.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeSourceId(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return null;
        }
        return sourceId.trim();
    }

    private static String buildNormalizedKey(MediaType type, String title, Integer releaseYear, Integer totalUnits) {
        String normalizedTitle = normalizeTitle(title);
        String normalizedYear = releaseYear == null ? "" : String.valueOf(releaseYear);
        int normalizedUnits = totalUnits == null ? 0 : totalUnits;
        return type.name() + "|" + normalizedTitle + "|" + normalizedYear + "|" + normalizedUnits;
    }

    private static String normalizeTitle(String title) {
        if (title == null) {
            return "";
        }

        String lowered = title.toLowerCase(Locale.ROOT).trim();
        String collapsed = lowered.replaceAll("\\s+", " ");
        return collapsed.replaceAll("[^a-z0-9 ]", "");
    }
}
