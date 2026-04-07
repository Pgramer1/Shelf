package com.shelf.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String bio;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private Long totalItems;
    private Long completedItems;
    private Long favoriteItems;
    private Long friendsCount;
    private Boolean me;
}
