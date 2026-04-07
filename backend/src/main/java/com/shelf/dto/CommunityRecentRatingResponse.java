package com.shelf.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommunityRecentRatingResponse {
    private String username;
    private Integer rating;
    private LocalDateTime updatedAt;
}
