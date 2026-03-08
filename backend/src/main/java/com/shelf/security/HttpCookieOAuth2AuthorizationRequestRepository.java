package com.shelf.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores the OAuth2 authorization request in an in-memory map (keyed by state)
 * and puts only the small state string into a cookie.
 *
 * The previous approach (Java-serializing the full request into the cookie value)
 * produced blobs well over the 4 KB browser cookie limit, which caused browsers to
 * silently drop the cookie → "authorization_request_not_found" on the callback.
 */
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE_NAME = "oauth2_auth_state";
    private static final int COOKIE_MAX_AGE = 180; // seconds

    private record Entry(OAuth2AuthorizationRequest request, Instant expiresAt) {}

    // Thread-safe in-memory store: state → request + expiry
    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return getCookieValue(request, COOKIE_NAME)
                .map(state -> {
                    Entry entry = store.get(state);
                    if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
                        store.remove(state);
                        return null;
                    }
                    return entry.request();
                })
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            getCookieValue(request, COOKIE_NAME).ifPresent(store::remove);
            deleteCookie(request, response, COOKIE_NAME);
            return;
        }

        String state = authorizationRequest.getState();
        store.put(state, new Entry(authorizationRequest, Instant.now().plusSeconds(COOKIE_MAX_AGE)));

        // Only the tiny state string goes in the cookie — stays well under 4 KB.
        // SameSite=None;Secure is required for cross-origin redirects (frontend and
        // backend on different Render subdomains).
        String cookieHeader = COOKIE_NAME + "=" + state
                + "; Path=/; HttpOnly; Secure; Max-Age=" + COOKIE_MAX_AGE + "; SameSite=None";
        response.addHeader("Set-Cookie", cookieHeader);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
            HttpServletResponse response) {
        OAuth2AuthorizationRequest authRequest = loadAuthorizationRequest(request);
        if (authRequest != null) {
            store.remove(authRequest.getState());
        }
        deleteCookie(request, response, COOKIE_NAME);
        return authRequest;
    }

    private Optional<String> getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
