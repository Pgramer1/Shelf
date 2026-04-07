package com.shelf.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaDetailsResponse {
    private MediaResponse media;
    private RatingScope requestedScope;
    private RatingScope appliedScope;
    private String scopeNotice;
    private Double averageRating;
    private Long totalRatings;
    private List<CommunityRatingBucketResponse> ratingDistribution;
    private List<CommunityRecentRatingResponse> recentRatings;
    private Integer myRating;
}
