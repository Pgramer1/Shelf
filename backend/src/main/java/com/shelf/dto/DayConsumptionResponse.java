package com.shelf.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DayConsumptionResponse {
    private String date;
    private Integer totalTitles;
    private Integer totalUnits;
    private List<DayConsumptionItemResponse> items;
}
