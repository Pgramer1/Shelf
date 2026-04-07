package com.shelf.service;

import com.shelf.dto.FriendRequestResponse;
import com.shelf.dto.SendFriendRequest;
import com.shelf.dto.UpdateProfileRequest;
import com.shelf.dto.UpdateProfileResponse;
import com.shelf.dto.UserProfileResponse;
import com.shelf.dto.UserSearchResultResponse;
import com.shelf.dto.UserSummaryResponse;
import com.shelf.model.Friendship;
import com.shelf.model.FriendshipStatus;
import com.shelf.model.Status;
import com.shelf.model.User;
import com.shelf.repository.FriendshipRepository;
import com.shelf.repository.UserMediaRepository;
import com.shelf.repository.UserRepository;
import com.shelf.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SocialService {

    private final UserRepository userRepository;
    private final UserMediaRepository userMediaRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserDetailsService userDetailsService;
    private final JwtTokenProvider jwtTokenProvider;

    public UserProfileResponse getMyProfile(String username) {
        User me = getUserByUsername(username);
        return toProfileResponse(me, true, true);
    }

    public UserProfileResponse getPublicProfile(String viewerUsername, String targetUsername) {
        User viewer = getUserByUsername(viewerUsername);
        User target = userRepository.findByUsernameIgnoreCase(targetUsername)
                .orElseThrow(() -> new IllegalStateException("User not found"));
        boolean me = viewer.getId().equals(target.getId());
        return toProfileResponse(target, me, me);
    }

    @Transactional
    public UpdateProfileResponse updateMyProfile(String username, UpdateProfileRequest request) {
        User me = getUserByUsername(username);

        String nextUsername = trimToNull(request.getUsername());
        if (nextUsername != null && !nextUsername.equalsIgnoreCase(me.getUsername())
                && userRepository.existsByUsername(nextUsername)) {
            throw new IllegalStateException("Username already exists");
        }

        if (nextUsername != null) {
            me.setUsername(nextUsername);
        }

        me.setBio(trimToNull(request.getBio()));
        me.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        User saved = userRepository.save(me);

        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getUsername());
        String token = jwtTokenProvider.generateToken(userDetails);

        return new UpdateProfileResponse(token, toProfileResponse(saved, true, true));
    }

    public List<UserSearchResultResponse> searchUsers(String username, String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isBlank()) {
            return List.of();
        }

        User me = getUserByUsername(username);

        return userRepository
                .findTop20ByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByUsernameAsc(trimmed, trimmed)
                .stream()
                .map(candidate -> new UserSearchResultResponse(
                        toSummary(candidate),
                        relationshipFor(me, candidate)))
                .sorted(Comparator.comparing(result -> result.getUser().getUsername(), String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendFriendRequest(String username, SendFriendRequest request) {
        User me = getUserByUsername(username);
        String identifier = request.getIdentifier() == null ? "" : request.getIdentifier().trim();
        if (identifier.isBlank()) {
            throw new IllegalStateException("Please provide a username or email");
        }

        User target = findByIdentifier(identifier)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        if (me.getId().equals(target.getId())) {
            throw new IllegalStateException("You cannot send a friend request to yourself");
        }

        Optional<Friendship> existing = friendshipRepository.findBetweenUsers(me.getId(), target.getId());
        if (existing.isPresent()) {
            Friendship friendship = existing.get();
            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new IllegalStateException("You are already friends");
            }
            if (friendship.getStatus() == FriendshipStatus.BLOCKED) {
                throw new IllegalStateException("Unable to send request");
            }
            if (friendship.getRequester().getId().equals(me.getId())) {
                throw new IllegalStateException("Friend request already sent");
            }
            throw new IllegalStateException("This user has already sent you a request");
        }

        Friendship friendship = new Friendship();
        friendship.setRequester(me);
        friendship.setAddressee(target);
        friendship.setStatus(FriendshipStatus.PENDING);
        friendshipRepository.save(friendship);
    }

    public List<UserSummaryResponse> getFriends(String username) {
        User me = getUserByUsername(username);
        return friendshipRepository.findAcceptedByUserId(me.getId()).stream()
                .map(friendship -> friendship.getRequester().getId().equals(me.getId())
                        ? friendship.getAddressee()
                        : friendship.getRequester())
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    public List<FriendRequestResponse> getIncomingRequests(String username) {
        User me = getUserByUsername(username);
        return friendshipRepository.findIncomingPendingByUserId(me.getId()).stream()
                .map(request -> new FriendRequestResponse(
                        request.getId(),
                        toSummary(request.getRequester()),
                        request.getCreatedAt()))
                .collect(Collectors.toList());
    }

    public List<FriendRequestResponse> getOutgoingRequests(String username) {
        User me = getUserByUsername(username);
        return friendshipRepository.findOutgoingPendingByUserId(me.getId()).stream()
                .map(request -> new FriendRequestResponse(
                        request.getId(),
                        toSummary(request.getAddressee()),
                        request.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void acceptRequest(String username, Long requestId) {
        User me = getUserByUsername(username);
        Friendship request = friendshipRepository.findById(requestId)
                .orElseThrow(() -> new IllegalStateException("Request not found"));

        if (!request.getAddressee().getId().equals(me.getId())) {
            throw new IllegalStateException("Unauthorized");
        }
        if (request.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Request is no longer pending");
        }

        request.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(request);
    }

    @Transactional
    public void rejectRequest(String username, Long requestId) {
        User me = getUserByUsername(username);
        Friendship request = friendshipRepository.findById(requestId)
                .orElseThrow(() -> new IllegalStateException("Request not found"));

        if (!request.getAddressee().getId().equals(me.getId()) && !request.getRequester().getId().equals(me.getId())) {
            throw new IllegalStateException("Unauthorized");
        }
        if (request.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Request is no longer pending");
        }

        friendshipRepository.delete(request);
    }

    @Transactional
    public void removeFriend(String username, Long friendUserId) {
        User me = getUserByUsername(username);
        Friendship friendship = friendshipRepository.findBetweenUsers(me.getId(), friendUserId)
                .orElseThrow(() -> new IllegalStateException("Friendship not found"));

        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("Not in friends list");
        }

        friendshipRepository.delete(friendship);
    }

    private User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    private Optional<User> findByIdentifier(String identifier) {
        if (identifier.contains("@")) {
            return userRepository.findByEmailIgnoreCase(identifier);
        }
        return userRepository.findByUsernameIgnoreCase(identifier);
    }

    private UserProfileResponse toProfileResponse(User user, boolean includeEmail, boolean me) {
        Long totalItems = userMediaRepository.countByUserId(user.getId());
        Long completedItems = userMediaRepository.countByUserIdAndStatus(user.getId(), Status.COMPLETED);
        Long favoriteItems = userMediaRepository.countByUserIdAndIsFavoriteTrue(user.getId());
        Long friendsCount = friendshipRepository.countByStatusAndRequester_IdOrStatusAndAddressee_Id(
                FriendshipStatus.ACCEPTED,
                user.getId(),
                FriendshipStatus.ACCEPTED,
                user.getId());

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                includeEmail ? user.getEmail() : null,
                user.getBio(),
                user.getAvatarUrl(),
                user.getCreatedAt(),
                totalItems,
                completedItems,
                favoriteItems,
                friendsCount,
                me);
    }

    private UserSummaryResponse toSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getBio(),
                user.getAvatarUrl());
    }

    private String relationshipFor(User me, User candidate) {
        if (me.getId().equals(candidate.getId())) {
            return "SELF";
        }

        Optional<Friendship> existing = friendshipRepository.findBetweenUsers(me.getId(), candidate.getId());
        if (existing.isEmpty()) {
            return "NONE";
        }

        Friendship friendship = existing.get();
        if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
            return "FRIEND";
        }
        if (friendship.getStatus() == FriendshipStatus.BLOCKED) {
            return "BLOCKED";
        }
        if (friendship.getRequester().getId().equals(me.getId())) {
            return "PENDING_OUTGOING";
        }
        return "PENDING_INCOMING";
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
