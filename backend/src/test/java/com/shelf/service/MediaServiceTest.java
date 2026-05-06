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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.web.server.ResponseStatusException;

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

    @Test
    void getMediaById_includesSourceIdentityFields() {
        Media media = buildMedia(99L, "Horimiya", MediaType.ANIME, 13, 2021);
        media.setSource("JIKAN");
        media.setSourceId("42897");
        when(mediaRepository.findById(99L)).thenReturn(Optional.of(media));

        MediaResponse response = mediaService.getMediaById(99L);

        assertEquals("JIKAN", response.getSource());
        assertEquals("42897", response.getSourceId());
    }

    @Test
    void getAllMedia_includesSourceIdentityFields() {
        Media media = buildMedia(11L, "Interstellar", MediaType.MOVIE, 1, 2014);
        media.setSource("TMDB_MOVIE");
        media.setSourceId("157336");
        when(mediaRepository.findAll()).thenReturn(List.of(media));

        List<MediaResponse> response = mediaService.getAllMedia();

        assertEquals(1, response.size());
        assertEquals("TMDB_MOVIE", response.get(0).getSource());
        assertEquals("157336", response.get(0).getSourceId());
    }

    @Test
    void searchMedia_includesSourceIdentityFields() {
        Media media = buildMedia(12L, "Arcane", MediaType.TV_SERIES, 9, 2021);
        media.setSource("TMDB_TV");
        media.setSourceId("94605");
        when(mediaRepository.findByTitleContainingIgnoreCase("arc")).thenReturn(List.of(media));

        List<MediaResponse> response = mediaService.searchMedia("arc");

        assertEquals(1, response.size());
        assertEquals("TMDB_TV", response.get(0).getSource());
        assertEquals("94605", response.get(0).getSourceId());
    }

    @Test
    void getMediaById_whenMissing_throwsNotFound() {
        when(mediaRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> mediaService.getMediaById(404L));
    }
}
