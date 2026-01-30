package com.shelf.repository;

import com.shelf.model.Media;
import com.shelf.model.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByType(MediaType type);

    List<Media> findByTitleContainingIgnoreCase(String title);
}
