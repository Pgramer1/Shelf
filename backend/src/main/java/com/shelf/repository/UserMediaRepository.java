package com.shelf.repository;

import com.shelf.model.Status;
import com.shelf.model.UserMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMediaRepository extends JpaRepository<UserMedia, Long> {
    List<UserMedia> findByUserId(Long userId);

    List<UserMedia> findByUserIdAndStatus(Long userId, Status status);

    Optional<UserMedia> findByUserIdAndMediaId(Long userId, Long mediaId);

    void deleteByUserIdAndMediaId(Long userId, Long mediaId);
}
