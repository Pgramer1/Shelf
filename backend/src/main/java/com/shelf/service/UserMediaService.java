package com.shelf.service;

import com.shelf.dto.MediaResponse;
import com.shelf.dto.ActivityHeatmapDayResponse;
import com.shelf.dto.DayConsumptionItemResponse;
import com.shelf.dto.DayConsumptionResponse;
import com.shelf.model.ConsumptionEventType;
import com.shelf.dto.UserMediaRequest;
import com.shelf.dto.UserMediaResponse;
import com.shelf.model.ConsumptionLog;
import com.shelf.model.Media;
import com.shelf.model.Status;
import com.shelf.model.User;
import com.shelf.model.UserMedia;
import com.shelf.repository.ConsumptionLogRepository;
import com.shelf.repository.MediaRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserMediaService {

    private final UserMediaRepository userMediaRepository;
    private final ConsumptionLogRepository consumptionLogRepository;
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
        int requestedProgress = request.getProgress() == null ? 0 : request.getProgress();
        int initialProgress = requestedProgress;
        if (request.getStatus() == Status.COMPLETED && requestedProgress == 0 && media.getTotalUnits() != null
                && media.getTotalUnits() > 0) {
            // If user adds an item as completed without setting progress, infer full
            // consumption.
            initialProgress = media.getTotalUnits();
        }
        userMedia.setProgress(initialProgress);
        userMedia.setRating(request.getRating());
        userMedia.setNotes(request.getNotes());
        userMedia.setIsFavorite(request.getIsFavorite());

        // startedAt: use provided value, otherwise auto-set when actively consuming
        if (request.getStartedAt() != null) {
            userMedia.setStartedAt(request.getStartedAt());
        } else if (request.getStatus() == Status.WATCHING ||
                request.getStatus() == Status.READING ||
                request.getStatus() == Status.PLAYING) {
            userMedia.setStartedAt(LocalDateTime.now());
        }

        // completedAt: use provided value, otherwise auto-set
        if (request.getCompletedAt() != null) {
            userMedia.setCompletedAt(request.getCompletedAt());
        } else if (request.getStatus() == Status.COMPLETED) {
            userMedia.setCompletedAt(LocalDateTime.now());
        }

        UserMedia saved = userMediaRepository.save(userMedia);
        LocalDateTime consumedAt = request.getActivityAt() != null ? request.getActivityAt()
                : (saved.getCompletedAt() != null ? saved.getCompletedAt()
                        : (saved.getStartedAt() != null ? saved.getStartedAt() : LocalDateTime.now()));
        int addActivityProgress = Math.max(0, saved.getProgress() == null ? 0 : saved.getProgress());
        recordAddActivity(user, saved, addActivityProgress, consumedAt);
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

        Integer previousProgress = userMedia.getProgress() == null ? 0 : userMedia.getProgress();
        Integer nextProgress = request.getProgress() == null ? 0 : request.getProgress();

        userMedia.setStatus(request.getStatus());
        userMedia.setProgress(nextProgress);
        userMedia.setRating(request.getRating());
        userMedia.setNotes(request.getNotes());
        userMedia.setIsFavorite(request.getIsFavorite());

        // Update timestamps: prefer explicitly provided values
        if (request.getStartedAt() != null) {
            userMedia.setStartedAt(request.getStartedAt());
        } else if ((request.getStatus() == Status.WATCHING ||
                request.getStatus() == Status.READING ||
                request.getStatus() == Status.PLAYING) &&
                userMedia.getStartedAt() == null) {
            userMedia.setStartedAt(LocalDateTime.now());
        }

        if (request.getCompletedAt() != null) {
            userMedia.setCompletedAt(request.getCompletedAt());
        } else if (request.getStatus() == Status.COMPLETED && userMedia.getCompletedAt() == null) {
            userMedia.setCompletedAt(LocalDateTime.now());
        } else if (request.getStatus() != Status.COMPLETED && nextProgress < previousProgress) {
            // Reset completion marker when progress is intentionally rolled back for a
            // rewatch/reread replay cycle.
            userMedia.setCompletedAt(null);
        }

        LocalDateTime consumedAt = request.getActivityAt() != null ? request.getActivityAt() : LocalDateTime.now();
        ConsumptionEventType progressEventType = determineProgressEventType(userMedia, previousProgress, nextProgress,
                consumedAt);
        recordConsumptionIfProgressed(user, userMedia, previousProgress, nextProgress, consumedAt, progressEventType);

        UserMedia updated = userMediaRepository.save(userMedia);
        return mapToResponse(updated);
    }

    public List<ActivityHeatmapDayResponse> getConsumptionHeatmap(String username, int days) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        int safeDays = Math.max(1, Math.min(days, 730));
        LocalDate startDate = LocalDate.now().minusDays(safeDays - 1L);
        LocalDateTime start = startDate.atStartOfDay();
        // Include a small forward window so activity logged from clients ahead of the
        // server clock's timezone is still included in the latest day bucket.
        LocalDateTime end = LocalDateTime.now().plusDays(1);

        List<ConsumptionLog> logs = consumptionLogRepository
                .findByUser_IdAndConsumedAtBetweenOrderByConsumedAtAsc(user.getId(), start, end);

        Map<LocalDate, List<ConsumptionLog>> grouped = logs.stream()
                .collect(Collectors.groupingBy(log -> log.getConsumedAt().toLocalDate()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Set<String> titles = new HashSet<>();
                    Set<String> firstWatchTitles = new HashSet<>();
                    Set<String> rewatchTitles = new HashSet<>();
                    int unitsConsumed = 0;
                    int firstWatchUnitsConsumed = 0;
                    int rewatchUnitsConsumed = 0;
                    for (ConsumptionLog log : entry.getValue()) {
                        String title = log.getUserMedia().getMedia().getTitle();
                        titles.add(title);
                        unitsConsumed += log.getUnitsConsumed();

                        if (log.getEventType() == ConsumptionEventType.REWATCH_PROGRESS) {
                            rewatchTitles.add(title);
                            rewatchUnitsConsumed += log.getUnitsConsumed();
                            continue;
                        }

                        firstWatchTitles.add(title);
                        firstWatchUnitsConsumed += log.getUnitsConsumed();
                    }
                    return new ActivityHeatmapDayResponse(
                            entry.getKey().toString(),
                            titles.size(),
                            unitsConsumed,
                            titles.stream().sorted().collect(Collectors.toList()),
                            firstWatchTitles.size(),
                            firstWatchUnitsConsumed,
                            rewatchTitles.size(),
                            rewatchUnitsConsumed);
                })
                .collect(Collectors.toList());
    }

    public DayConsumptionResponse getDayConsumption(String username, LocalDate day) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end = day.atTime(LocalTime.MAX);

        List<ConsumptionLog> logs = consumptionLogRepository
                .findByUser_IdAndConsumedAtBetweenOrderByConsumedAtAsc(user.getId(), start, end);

        Map<Long, List<ConsumptionLog>> byUserMedia = logs.stream()
                .collect(Collectors.groupingBy(log -> log.getUserMedia().getId()));

        List<DayConsumptionItemResponse> items = byUserMedia.values().stream()
                .map(mediaLogs -> {
                    mediaLogs.sort(Comparator.comparing(ConsumptionLog::getConsumedAt));
                    ConsumptionLog first = mediaLogs.get(0);
                    int unitsConsumed = mediaLogs.stream().mapToInt(ConsumptionLog::getUnitsConsumed).sum();
                    boolean addOnlyActivity = unitsConsumed == 0 && mediaLogs.stream()
                            .allMatch(log -> log.getEventType() == ConsumptionEventType.ADD);
                    int firstWatchUnitsConsumed = mediaLogs.stream()
                            .filter(log -> log.getEventType() != ConsumptionEventType.REWATCH_PROGRESS)
                            .mapToInt(ConsumptionLog::getUnitsConsumed)
                            .sum();
                    int rewatchUnitsConsumed = mediaLogs.stream()
                            .filter(log -> log.getEventType() == ConsumptionEventType.REWATCH_PROGRESS)
                            .mapToInt(ConsumptionLog::getUnitsConsumed)
                            .sum();
                    int fromUnit = mediaLogs.stream().mapToInt(ConsumptionLog::getProgressFrom).min().orElse(0) + 1;
                    int toUnit = mediaLogs.stream().mapToInt(ConsumptionLog::getProgressTo).max().orElse(0);

                    return new DayConsumptionItemResponse(
                            first.getUserMedia().getId(),
                            first.getUserMedia().getMedia().getId(),
                            first.getUserMedia().getMedia().getTitle(),
                            first.getUserMedia().getMedia().getType(),
                            addOnlyActivity,
                            unitsConsumed,
                            firstWatchUnitsConsumed,
                            rewatchUnitsConsumed,
                            rewatchUnitsConsumed > 0,
                            Math.max(fromUnit, 1),
                            toUnit);
                })
                .sorted(Comparator.comparing(DayConsumptionItemResponse::getTitle))
                .collect(Collectors.toList());

        int totalUnits = items.stream().mapToInt(DayConsumptionItemResponse::getUnitsConsumed).sum();

        return new DayConsumptionResponse(day.toString(), items.size(), totalUnits, items);
    }

    public List<UserMediaResponse> getUserShelf(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return dedupeUserMediaEntries(userMediaRepository.findByUserId(user.getId())).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<UserMediaResponse> getUserShelfByStatus(String username, Status status) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return dedupeUserMediaEntries(userMediaRepository.findByUserIdAndStatus(user.getId(), status)).stream()
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

        consumptionLogRepository.deleteByUserMedia_Id(userMediaId);
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

    private void recordAddActivity(User user, UserMedia userMedia, Integer initialProgress, LocalDateTime consumedAt) {
        int progress = initialProgress == null ? 0 : Math.max(0, initialProgress);
        if (progress > 0) {
            recordConsumptionIfProgressed(user, userMedia, 0, progress, consumedAt, ConsumptionEventType.ADD);
            return;
        }

        ConsumptionLog log = new ConsumptionLog();
        log.setUser(user);
        log.setUserMedia(userMedia);
        log.setProgressFrom(0);
        log.setProgressTo(0);
        log.setUnitsConsumed(0);
        log.setEventType(ConsumptionEventType.ADD);
        log.setConsumedAt(consumedAt == null ? LocalDateTime.now() : consumedAt);
        consumptionLogRepository.save(log);
    }

    private void recordConsumptionIfProgressed(User user, UserMedia userMedia, Integer previousProgress,
            Integer nextProgress, LocalDateTime consumedAt, ConsumptionEventType eventType) {
        int from = previousProgress == null ? 0 : previousProgress;
        int to = nextProgress == null ? 0 : nextProgress;
        if (to <= from) {
            return;
        }

        ConsumptionLog log = new ConsumptionLog();
        log.setUser(user);
        log.setUserMedia(userMedia);
        log.setProgressFrom(from);
        log.setProgressTo(to);
        log.setUnitsConsumed(to - from);
        log.setEventType(eventType == null ? ConsumptionEventType.PROGRESS : eventType);
        log.setConsumedAt(consumedAt == null ? LocalDateTime.now() : consumedAt);
        consumptionLogRepository.save(log);
    }

    private ConsumptionEventType determineProgressEventType(UserMedia userMedia, Integer previousProgress,
            Integer nextProgress, LocalDateTime consumedAt) {
        int from = previousProgress == null ? 0 : previousProgress;
        int to = nextProgress == null ? 0 : nextProgress;
        if (to <= from) {
            return ConsumptionEventType.PROGRESS;
        }

        if (!isRewatchProgressEvent(userMedia, consumedAt)) {
            return ConsumptionEventType.PROGRESS;
        }

        return ConsumptionEventType.REWATCH_PROGRESS;
    }

    private boolean isRewatchProgressEvent(UserMedia userMedia, LocalDateTime consumedAt) {
        Integer totalUnits = userMedia.getMedia().getTotalUnits();
        if (totalUnits == null || totalUnits <= 0 || userMedia.getId() == null) {
            return false;
        }

        LocalDateTime effectiveConsumedAt = consumedAt == null ? LocalDateTime.now() : consumedAt;
        return consumptionLogRepository.existsByUserMedia_IdAndProgressToGreaterThanEqualAndConsumedAtBefore(
                userMedia.getId(),
                totalUnits,
                effectiveConsumedAt);
    }

    private List<UserMedia> dedupeUserMediaEntries(List<UserMedia> entries) {
        Map<String, UserMedia> unique = new LinkedHashMap<>();
        for (UserMedia entry : entries) {
            String key = buildUserMediaIdentityKey(entry);
            UserMedia existing = unique.get(key);
            if (existing == null || isMoreRecent(entry, existing)) {
                unique.put(key, entry);
            }
        }

        return unique.values().stream()
                .sorted(Comparator.comparing(UserMedia::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .collect(Collectors.toList());
    }

    private boolean isMoreRecent(UserMedia candidate, UserMedia existing) {
        LocalDateTime candidateUpdatedAt = candidate.getUpdatedAt();
        LocalDateTime existingUpdatedAt = existing.getUpdatedAt();
        if (candidateUpdatedAt == null && existingUpdatedAt == null) {
            return candidate.getId() != null && existing.getId() != null && candidate.getId() > existing.getId();
        }
        if (candidateUpdatedAt == null) {
            return false;
        }
        if (existingUpdatedAt == null) {
            return true;
        }

        return candidateUpdatedAt.isAfter(existingUpdatedAt);
    }

    private String buildUserMediaIdentityKey(UserMedia userMedia) {
        if (userMedia.getMedia() == null) {
            return "missing-media:" + userMedia.getId();
        }

        String source = normalizeMediaIdentityPart(userMedia.getMedia().getSource());
        String sourceId = normalizeMediaIdentityPart(userMedia.getMedia().getSourceId());
        if (!source.isBlank() && !sourceId.isBlank()) {
            return "src|" + source + "|" + sourceId;
        }

        String normalizedKey = normalizeMediaIdentityPart(userMedia.getMedia().getNormalizedKey());
        if (!normalizedKey.isBlank()) {
            return "norm|" + normalizedKey;
        }

        String type = userMedia.getMedia().getType() == null ? "" : userMedia.getMedia().getType().name();
        String title = normalizeMediaIdentityPart(userMedia.getMedia().getTitle());
        String year = userMedia.getMedia().getReleaseYear() == null ? "" : String.valueOf(userMedia.getMedia().getReleaseYear());
        String totalUnits = userMedia.getMedia().getTotalUnits() == null ? "" : String.valueOf(userMedia.getMedia().getTotalUnits());
        String imageUrl = normalizeMediaIdentityPart(userMedia.getMedia().getImageUrl());
        return "fallback|" + type + "|" + title + "|" + year + "|" + totalUnits + "|" + imageUrl;
    }

    private String normalizeMediaIdentityPart(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
