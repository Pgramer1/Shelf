package com.shelf.repository;

import com.shelf.model.Status;
import com.shelf.model.UserMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMediaRepository extends JpaRepository<UserMedia, Long> {
    List<UserMedia> findByUserId(Long userId);

    List<UserMedia> findByUserIdAndStatus(Long userId, Status status);

    Optional<UserMedia> findByUserIdAndMediaId(Long userId, Long mediaId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, Status status);

    long countByUserIdAndIsFavoriteTrue(Long userId);

        List<UserMedia> findTop20ByMedia_IdAndRatingIsNotNullOrderByUpdatedAtDesc(Long mediaId);

        @Query("""
                select avg(um.rating)
            from UserMedia um
            where um.media.id = :mediaId and um.rating is not null
            """)
            Double getAverageRatingByMediaId(@Param("mediaId") Long mediaId);

            long countByMedia_IdAndRatingIsNotNull(Long mediaId);

        @Query("""
            select um.rating, count(um)
            from UserMedia um
            where um.media.id = :mediaId and um.rating is not null
            group by um.rating
            order by um.rating asc
            """)
        List<Object[]> getRatingDistributionByMediaId(@Param("mediaId") Long mediaId);

    void deleteByUserIdAndMediaId(Long userId, Long mediaId);
}
