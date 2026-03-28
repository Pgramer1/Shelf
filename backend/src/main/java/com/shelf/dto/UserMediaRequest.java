package com.shelf.dto;

import com.shelf.model.Status;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserMediaRequest {

    @NotNull(message = "Media ID is required")
    private Long mediaId;

    @NotNull(message = "Status is required")
    private Status status;

    @Min(value = 0, message = "Progress cannot be negative")
    private Integer progress = 0;

    @Min(value = 1, message = "Rating must be between 1 and 10")
    @Max(value = 10, message = "Rating must be between 1 and 10")
    private Integer rating;

    private String notes;
    private Boolean isFavorite = false;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime activityAt;
}
