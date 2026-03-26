package com.shelf.dto;

import com.shelf.model.MediaType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DayConsumptionItemResponse {
    private Long userMediaId;
    private Long mediaId;
    private String title;
    private MediaType mediaType;
    private Integer unitsConsumed;
    private Integer fromUnit;
    private Integer toUnit;
}
