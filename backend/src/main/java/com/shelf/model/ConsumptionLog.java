package com.shelf.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "consumption_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsumptionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_media_id", nullable = false)
    private UserMedia userMedia;

    @Column(nullable = false)
    private Integer progressFrom;

    @Column(nullable = false)
    private Integer progressTo;

    @Column(nullable = false)
    private Integer unitsConsumed;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private ConsumptionEventType eventType;

    @Column(nullable = false)
    private LocalDateTime consumedAt;
}
