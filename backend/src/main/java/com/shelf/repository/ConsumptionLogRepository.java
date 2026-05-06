package com.shelf.repository;

import com.shelf.model.ConsumptionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConsumptionLogRepository extends JpaRepository<ConsumptionLog, Long> {
    List<ConsumptionLog> findByUser_IdAndConsumedAtBetweenOrderByConsumedAtAsc(Long userId, LocalDateTime start,
            LocalDateTime end);

    boolean existsByUserMedia_IdAndProgressToGreaterThanEqualAndConsumedAtBefore(Long userMediaId, Integer progressTo,
            LocalDateTime consumedAt);

    long deleteByUserMedia_Id(Long userMediaId);
}
