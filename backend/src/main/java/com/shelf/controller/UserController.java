package com.shelf.controller;

import com.shelf.dto.FriendRequestResponse;
import com.shelf.dto.SendFriendRequest;
import com.shelf.dto.UpdateProfileRequest;
import com.shelf.dto.UpdateProfileResponse;
import com.shelf.dto.UserProfileResponse;
import com.shelf.dto.UserSearchResultResponse;
import com.shelf.dto.UserSummaryResponse;
import com.shelf.service.SocialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final SocialService socialService;

    @GetMapping("/profile/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(socialService.getMyProfile(authentication.getName()));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<UpdateProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(socialService.updateMyProfile(authentication.getName(), request));
    }

    @GetMapping("/profile/{username}")
    public ResponseEntity<UserProfileResponse> getProfileByUsername(
            Authentication authentication,
            @PathVariable String username) {
        return ResponseEntity.ok(socialService.getPublicProfile(authentication.getName(), username));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResultResponse>> searchUsers(
            Authentication authentication,
            @RequestParam String query) {
        return ResponseEntity.ok(socialService.searchUsers(authentication.getName(), query));
    }

    @PostMapping("/friends/requests")
    public ResponseEntity<Void> sendFriendRequest(
            Authentication authentication,
            @Valid @RequestBody SendFriendRequest request) {
        socialService.sendFriendRequest(authentication.getName(), request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/friends")
    public ResponseEntity<List<UserSummaryResponse>> getFriends(Authentication authentication) {
        return ResponseEntity.ok(socialService.getFriends(authentication.getName()));
    }

    @GetMapping("/friends/requests/incoming")
    public ResponseEntity<List<FriendRequestResponse>> getIncomingRequests(Authentication authentication) {
        return ResponseEntity.ok(socialService.getIncomingRequests(authentication.getName()));
    }

    @GetMapping("/friends/requests/outgoing")
    public ResponseEntity<List<FriendRequestResponse>> getOutgoingRequests(Authentication authentication) {
        return ResponseEntity.ok(socialService.getOutgoingRequests(authentication.getName()));
    }

    @PostMapping("/friends/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(Authentication authentication, @PathVariable Long requestId) {
        socialService.acceptRequest(authentication.getName(), requestId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/friends/requests/{requestId}")
    public ResponseEntity<Void> rejectOrCancelRequest(Authentication authentication, @PathVariable Long requestId) {
        socialService.rejectRequest(authentication.getName(), requestId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/friends/{friendUserId}")
    public ResponseEntity<Void> removeFriend(Authentication authentication, @PathVariable Long friendUserId) {
        socialService.removeFriend(authentication.getName(), friendUserId);
        return ResponseEntity.noContent().build();
    }
}
