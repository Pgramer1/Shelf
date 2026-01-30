package com.shelf.dto;

import com.shelf.model.Status;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserMediaResponse {
    private Long id;
    private MediaResponse media;
    private Status status;
    private Integer progress;
    private Integer rating;
    private String notes;
    private Boolean isFavorite;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime updatedAt;
}
