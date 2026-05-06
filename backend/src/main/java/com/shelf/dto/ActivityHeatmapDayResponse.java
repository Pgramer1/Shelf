package com.shelf.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActivityHeatmapDayResponse {
    private String date;
    private Integer titleCount;
    private Integer unitsConsumed;
    private List<String> titles;
    private Integer firstWatchTitleCount;
    private Integer firstWatchUnitsConsumed;
    private Integer rewatchTitleCount;
    private Integer rewatchUnitsConsumed;
}
