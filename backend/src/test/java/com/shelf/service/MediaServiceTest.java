package com.shelf.service;

import com.shelf.dto.MediaRequest;
import com.shelf.dto.MediaResponse;
import com.shelf.model.Media;
import com.shelf.model.MediaType;
import com.shelf.repository.MediaRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private UserMediaRepository userMediaRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MediaService mediaService;

    @Test
    void createMedia_whenSourceIdentityMatches_returnsExistingMedia() {
        MediaRequest request = new MediaRequest();
        request.setTitle("Jujutsu Kaisen");
        request.setType(MediaType.ANIME);
        request.setTotalUnits(24);
        request.setReleaseYear(2020);
        request.setSource("JIKAN");
        request.setSourceId("40748");

        Media existing = buildMedia(10L, "Jujutsu Kaisen", MediaType.ANIME, 24, 2020);
        existing.setSource("JIKAN");
        existing.setSourceId("40748");
        existing.setNormalizedKey("ANIME|jujutsu kaisen|2020|24");

        when(mediaRepository.findFirstBySourceAndSourceId("JIKAN", "40748")).thenReturn(Optional.of(existing));
        MediaResponse response = mediaService.createMedia(request);

        assertEquals(10L, response.getId());
        verify(mediaRepository, never()).save(any(Media.class));
    }

    @Test
    void createMedia_whenNormalizedSignatureMatchesExisting_returnsExistingMedia() {
        MediaRequest request = new MediaRequest();
        request.setTitle("Jujutsu Kaisen");
        request.setType(MediaType.ANIME);
        request.setTotalUnits(24);
        request.setReleaseYear(2020);

        Media existing = buildMedia(20L, "Jujutsu Kaisen", MediaType.ANIME, 24, 2020);

        when(mediaRepository.findFirstByNormalizedKey("ANIME|jujutsu kaisen|2020|24")).thenReturn(Optional.empty());
        when(mediaRepository.findByType(MediaType.ANIME)).thenReturn(List.of(existing));
        when(mediaRepository.save(any(Media.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MediaResponse response = mediaService.createMedia(request);

        assertEquals(20L, response.getId());
        verify(mediaRepository).save(existing);
    }

    private static Media buildMedia(Long id, String title, MediaType type, Integer totalUnits, Integer releaseYear) {
        Media media = new Media();
        media.setId(id);
        media.setTitle(title);
        media.setType(type);
        media.setTotalUnits(totalUnits);
        media.setReleaseYear(releaseYear);
        return media;
    }
}
