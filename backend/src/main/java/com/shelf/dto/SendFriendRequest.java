package com.shelf.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendFriendRequest {

    @NotBlank
    private String identifier;
}
