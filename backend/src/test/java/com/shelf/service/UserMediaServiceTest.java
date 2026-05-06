package com.shelf.service;

import com.shelf.dto.ActivityHeatmapDayResponse;
import com.shelf.dto.DayConsumptionItemResponse;
import com.shelf.dto.DayConsumptionResponse;
import com.shelf.dto.UserMediaRequest;
import com.shelf.model.ConsumptionEventType;
import com.shelf.model.ConsumptionLog;
import com.shelf.model.Media;
import com.shelf.model.MediaType;
import com.shelf.model.Status;
import com.shelf.model.User;
import com.shelf.model.UserMedia;
import com.shelf.repository.ConsumptionLogRepository;
import com.shelf.repository.MediaRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserMediaServiceTest {

    @Mock
    private UserMediaRepository userMediaRepository;

    @Mock
    private ConsumptionLogRepository consumptionLogRepository;

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserMediaService userMediaService;

    @Test
    void addToShelf_withZeroProgress_recordsAddActivityWithoutConsumedUnits() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(10L, "Aspirants", MediaType.TV_SERIES, 10);

        UserMediaRequest request = new UserMediaRequest();
        request.setMediaId(media.getId());
        request.setStatus(Status.PLAN_TO_WATCH);
        request.setProgress(0);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(mediaRepository.findById(media.getId())).thenReturn(Optional.of(media));
        when(userMediaRepository.findByUserIdAndMediaId(user.getId(), media.getId())).thenReturn(Optional.empty());
        when(userMediaRepository.save(any(UserMedia.class))).thenAnswer(invocation -> {
            UserMedia saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });
        when(consumptionLogRepository.save(any(ConsumptionLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        userMediaService.addToShelf("alice", request);

        ArgumentCaptor<ConsumptionLog> captor = ArgumentCaptor.forClass(ConsumptionLog.class);
        verify(consumptionLogRepository).save(captor.capture());

        ConsumptionLog log = captor.getValue();
        assertEquals(ConsumptionEventType.ADD, log.getEventType());
        assertEquals(0, log.getProgressFrom());
        assertEquals(0, log.getProgressTo());
        assertEquals(0, log.getUnitsConsumed());
    }

    @Test
    void addToShelf_withInitialProgress_recordsConsumedUnitsOnAdd() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(11L, "Rocky Aur Rani", MediaType.MOVIE, 1);

        UserMediaRequest request = new UserMediaRequest();
        request.setMediaId(media.getId());
        request.setStatus(Status.WATCHING);
        request.setProgress(1);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(mediaRepository.findById(media.getId())).thenReturn(Optional.of(media));
        when(userMediaRepository.findByUserIdAndMediaId(user.getId(), media.getId())).thenReturn(Optional.empty());
        when(userMediaRepository.save(any(UserMedia.class))).thenAnswer(invocation -> {
            UserMedia saved = invocation.getArgument(0);
            saved.setId(101L);
            return saved;
        });
        when(consumptionLogRepository.save(any(ConsumptionLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        userMediaService.addToShelf("alice", request);

        ArgumentCaptor<ConsumptionLog> captor = ArgumentCaptor.forClass(ConsumptionLog.class);
        verify(consumptionLogRepository).save(captor.capture());

        ConsumptionLog log = captor.getValue();
        assertEquals(ConsumptionEventType.ADD, log.getEventType());
        assertEquals(0, log.getProgressFrom());
        assertEquals(1, log.getProgressTo());
        assertEquals(1, log.getUnitsConsumed());
    }

    @Test
    void updateMedia_withProgressIncrease_recordsOnlyProgressDelta() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(12L, "Jujutsu Kaisen", MediaType.ANIME, 24);
        UserMedia existing = buildUserMedia(200L, user, media, Status.WATCHING, 1);

        UserMediaRequest request = new UserMediaRequest();
        request.setMediaId(media.getId());
        request.setStatus(Status.WATCHING);
        request.setProgress(2);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userMediaRepository.findById(200L)).thenReturn(Optional.of(existing));
        when(userMediaRepository.save(any(UserMedia.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(consumptionLogRepository.save(any(ConsumptionLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        userMediaService.updateMedia("alice", 200L, request);

        ArgumentCaptor<ConsumptionLog> captor = ArgumentCaptor.forClass(ConsumptionLog.class);
        verify(consumptionLogRepository).save(captor.capture());

        ConsumptionLog log = captor.getValue();
        assertEquals(ConsumptionEventType.PROGRESS, log.getEventType());
        assertEquals(1, log.getProgressFrom());
        assertEquals(2, log.getProgressTo());
        assertEquals(1, log.getUnitsConsumed());
    }

    @Test
    void updateMedia_afterKnownCompletion_recordsRewatchProgress() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(15L, "Dark", MediaType.TV_SERIES, 10);
        UserMedia existing = buildUserMedia(205L, user, media, Status.WATCHING, 1);

        UserMediaRequest request = new UserMediaRequest();
        request.setMediaId(media.getId());
        request.setStatus(Status.WATCHING);
        request.setProgress(3);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userMediaRepository.findById(205L)).thenReturn(Optional.of(existing));
        when(consumptionLogRepository.existsByUserMedia_IdAndProgressToGreaterThanEqualAndConsumedAtBefore(
                eq(205L), eq(10), any(LocalDateTime.class))).thenReturn(true);
        when(userMediaRepository.save(any(UserMedia.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(consumptionLogRepository.save(any(ConsumptionLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        userMediaService.updateMedia("alice", 205L, request);

        ArgumentCaptor<ConsumptionLog> captor = ArgumentCaptor.forClass(ConsumptionLog.class);
        verify(consumptionLogRepository).save(captor.capture());

        ConsumptionLog log = captor.getValue();
        assertEquals(ConsumptionEventType.REWATCH_PROGRESS, log.getEventType());
        assertEquals(1, log.getProgressFrom());
        assertEquals(3, log.getProgressTo());
        assertEquals(2, log.getUnitsConsumed());
    }

    @Test
    void updateMedia_withSameProgress_doesNotRecordConsumptionLog() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(13L, "Ok Jaanu", MediaType.MOVIE, 1);
        UserMedia existing = buildUserMedia(201L, user, media, Status.WATCHING, 1);

        UserMediaRequest request = new UserMediaRequest();
        request.setMediaId(media.getId());
        request.setStatus(Status.WATCHING);
        request.setProgress(1);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userMediaRepository.findById(201L)).thenReturn(Optional.of(existing));
        when(userMediaRepository.save(any(UserMedia.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userMediaService.updateMedia("alice", 201L, request);

        verify(consumptionLogRepository, never()).save(any(ConsumptionLog.class));
    }

    @Test
    void getConsumptionHeatmap_returnsTotalAndFirstWatchRewatchSplit() {
        User user = buildUser(1L, "alice");
        Media mediaA = buildMedia(31L, "Title A", MediaType.ANIME, 24);
        Media mediaB = buildMedia(32L, "Title B", MediaType.TV_SERIES, 10);
        UserMedia umA = buildUserMedia(301L, user, mediaA, Status.WATCHING, 0);
        UserMedia umB = buildUserMedia(302L, user, mediaB, Status.PLAN_TO_WATCH, 0);

        LocalDateTime now = LocalDateTime.now().minusHours(1);
        ConsumptionLog firstWatchProgress = buildLog(user, umA, 0, 1, 1, ConsumptionEventType.PROGRESS, now);
        ConsumptionLog addOnly = buildLog(user, umB, 0, 0, 0, ConsumptionEventType.ADD, now.plusMinutes(5));
        ConsumptionLog rewatchProgress = buildLog(user, umA, 1, 3, 2, ConsumptionEventType.REWATCH_PROGRESS,
                now.plusMinutes(10));

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(consumptionLogRepository.findByUser_IdAndConsumedAtBetweenOrderByConsumedAtAsc(eq(1L),
                any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(firstWatchProgress, addOnly, rewatchProgress));

        List<ActivityHeatmapDayResponse> response = userMediaService.getConsumptionHeatmap("alice", 30);

        assertEquals(1, response.size());
        ActivityHeatmapDayResponse day = response.get(0);
        assertEquals(2, day.getTitleCount());
        assertEquals(3, day.getUnitsConsumed());
        assertEquals(2, day.getFirstWatchTitleCount());
        assertEquals(1, day.getFirstWatchUnitsConsumed());
        assertEquals(1, day.getRewatchTitleCount());
        assertEquals(2, day.getRewatchUnitsConsumed());
    }

    @Test
    void getDayConsumption_returnsPerItemFirstWatchAndRewatchBreakdown() {
        User user = buildUser(1L, "alice");
        LocalDate day = LocalDate.now();
        LocalDateTime base = day.atStartOfDay().plusHours(9);

        UserMedia addOnly = buildUserMedia(401L, user, buildMedia(41L, "AddOnly", MediaType.BOOK, 100), Status.PLAN_TO_READ, 0);
        UserMedia firstOnly = buildUserMedia(402L, user, buildMedia(42L, "FirstOnly", MediaType.ANIME, 12), Status.WATCHING, 2);
        UserMedia rewatchOnly = buildUserMedia(403L, user, buildMedia(43L, "RewatchOnly", MediaType.TV_SERIES, 10), Status.WATCHING, 5);
        UserMedia mixed = buildUserMedia(404L, user, buildMedia(44L, "Mixed", MediaType.GAME, 50), Status.PLAYING, 3);

        List<ConsumptionLog> logs = List.of(
                buildLog(user, addOnly, 0, 0, 0, ConsumptionEventType.ADD, base),
                buildLog(user, firstOnly, 0, 2, 2, ConsumptionEventType.PROGRESS, base.plusMinutes(5)),
                buildLog(user, rewatchOnly, 3, 5, 2, ConsumptionEventType.REWATCH_PROGRESS, base.plusMinutes(10)),
                buildLog(user, mixed, 1, 2, 1, ConsumptionEventType.PROGRESS, base.plusMinutes(15)),
                buildLog(user, mixed, 2, 3, 1, ConsumptionEventType.REWATCH_PROGRESS, base.plusMinutes(20)));

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(consumptionLogRepository.findByUser_IdAndConsumedAtBetweenOrderByConsumedAtAsc(eq(1L),
                any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(logs);

        DayConsumptionResponse response = userMediaService.getDayConsumption("alice", day);
        Map<String, DayConsumptionItemResponse> byTitle = response.getItems().stream()
                .collect(Collectors.toMap(DayConsumptionItemResponse::getTitle, Function.identity()));

        DayConsumptionItemResponse addOnlyItem = byTitle.get("AddOnly");
        assertTrue(addOnlyItem.getAddOnlyActivity());
        assertEquals(0, addOnlyItem.getFirstWatchUnitsConsumed());
        assertEquals(0, addOnlyItem.getRewatchUnitsConsumed());
        assertFalse(addOnlyItem.getHasRewatchActivity());

        DayConsumptionItemResponse firstOnlyItem = byTitle.get("FirstOnly");
        assertFalse(firstOnlyItem.getAddOnlyActivity());
        assertEquals(2, firstOnlyItem.getFirstWatchUnitsConsumed());
        assertEquals(0, firstOnlyItem.getRewatchUnitsConsumed());
        assertFalse(firstOnlyItem.getHasRewatchActivity());

        DayConsumptionItemResponse rewatchOnlyItem = byTitle.get("RewatchOnly");
        assertFalse(rewatchOnlyItem.getAddOnlyActivity());
        assertEquals(0, rewatchOnlyItem.getFirstWatchUnitsConsumed());
        assertEquals(2, rewatchOnlyItem.getRewatchUnitsConsumed());
        assertTrue(rewatchOnlyItem.getHasRewatchActivity());

        DayConsumptionItemResponse mixedItem = byTitle.get("Mixed");
        assertFalse(mixedItem.getAddOnlyActivity());
        assertEquals(1, mixedItem.getFirstWatchUnitsConsumed());
        assertEquals(1, mixedItem.getRewatchUnitsConsumed());
        assertTrue(mixedItem.getHasRewatchActivity());
    }

    @Test
    void deleteFromShelf_deletesDependentConsumptionLogsFirst() {
        User user = buildUser(1L, "alice");
        Media media = buildMedia(14L, "Dark", MediaType.TV_SERIES, 26);
        UserMedia existing = buildUserMedia(202L, user, media, Status.WATCHING, 5);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userMediaRepository.findById(202L)).thenReturn(Optional.of(existing));

        userMediaService.deleteFromShelf("alice", 202L);

        var ordered = inOrder(consumptionLogRepository, userMediaRepository);
        ordered.verify(consumptionLogRepository).deleteByUserMedia_Id(202L);
        ordered.verify(userMediaRepository).delete(existing);
    }

    private static ConsumptionLog buildLog(User user, UserMedia userMedia, int progressFrom, int progressTo,
            int unitsConsumed, ConsumptionEventType eventType, LocalDateTime consumedAt) {
        ConsumptionLog log = new ConsumptionLog();
        log.setUser(user);
        log.setUserMedia(userMedia);
        log.setProgressFrom(progressFrom);
        log.setProgressTo(progressTo);
        log.setUnitsConsumed(unitsConsumed);
        log.setEventType(eventType);
        log.setConsumedAt(consumedAt);
        return log;
    }

    private static User buildUser(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    private static Media buildMedia(Long id, String title, MediaType type, Integer totalUnits) {
        Media media = new Media();
        media.setId(id);
        media.setTitle(title);
        media.setType(type);
        media.setTotalUnits(totalUnits);
        return media;
    }

    private static UserMedia buildUserMedia(Long id, User user, Media media, Status status, Integer progress) {
        UserMedia userMedia = new UserMedia();
        userMedia.setId(id);
        userMedia.setUser(user);
        userMedia.setMedia(media);
        userMedia.setStatus(status);
        userMedia.setProgress(progress);
        return userMedia;
    }
}
