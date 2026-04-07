package com.shelf.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 3, max = 50)
    private String username;

    @Size(max = 1000)
    private String bio;

    @Size(max = 512)
    private String avatarUrl;
}
