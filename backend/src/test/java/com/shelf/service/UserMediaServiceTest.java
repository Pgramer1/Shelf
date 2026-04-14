package com.shelf.service;

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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
