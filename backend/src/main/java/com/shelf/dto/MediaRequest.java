package com.shelf.dto;

import com.shelf.model.MediaType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MediaRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Media type is required")
    private MediaType type;

    @NotNull(message = "Total units is required")
    @Min(value = 1, message = "Total units must be at least 1")
    private Integer totalUnits;

    private String imageUrl;
    private String description;
    private Integer releaseYear;
    private String source;
    private String sourceId;
}
