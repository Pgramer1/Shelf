package com.shelf.dto;

import com.shelf.model.MediaType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaResponse {
    private Long id;
    private String title;
    private MediaType type;
    private Integer totalUnits;
    private String imageUrl;
    private String description;
    private Integer releaseYear;
}
