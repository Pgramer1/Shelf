package com.shelf.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Stores the OAuth2AuthorizationRequest fully in the browser cookie as compact JSON
 * (Base64URL-encoded). This is completely stateless — no in-memory map — so it
 * survives backend restarts and works on multi-instance deployments.
 *
 * JSON is used instead of Java serialization because Java-serialized objects easily
 * exceed the 4 KB browser cookie limit, causing the cookie to be silently dropped
 * and resulting in "authorization_request_not_found" on the callback.
 */
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE_NAME = "oauth2_auth_req";
    private static final int COOKIE_MAX_AGE = 180; // seconds

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return getCookieValue(request)
                .map(this::deserialize)
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            deleteCookie(response);
            return;
        }
        String cookieValue = serialize(authorizationRequest);
        // SameSite=None;Secure is required for cross-origin redirects when the
        // frontend and backend are on different subdomains (e.g. Render deployment).
        response.addHeader("Set-Cookie",
                COOKIE_NAME + "=" + cookieValue
                        + "; Path=/; HttpOnly; Secure; Max-Age=" + COOKIE_MAX_AGE + "; SameSite=None");
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
            HttpServletResponse response) {
        OAuth2AuthorizationRequest authRequest = loadAuthorizationRequest(request);
        deleteCookie(response);
        return authRequest;
    }

    // ── serialization ──────────────────────────────────────────────────────

    private String serialize(OAuth2AuthorizationRequest req) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("au",  req.getAuthorizationUri());
            data.put("ci",  req.getClientId());
            data.put("ru",  req.getRedirectUri());
            data.put("st",  req.getState());
            data.put("sc",  new ArrayList<>(req.getScopes()));
            data.put("ap",  req.getAdditionalParameters());
            // Only keep string-valued attributes to stay JSON-safe
            Map<String, String> attrs = new LinkedHashMap<>();
            req.getAttributes().forEach((k, v) -> { if (v instanceof String s) attrs.put(k, s); });
            data.put("at", attrs);
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(objectMapper.writeValueAsBytes(data));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize OAuth2AuthorizationRequest", e);
        }
    }

    private OAuth2AuthorizationRequest deserialize(String encoded) {
        try {
            byte[] json = Base64.getUrlDecoder().decode(encoded);
            Map<String, Object> data = objectMapper.readValue(json, new TypeReference<>() {});

            @SuppressWarnings("unchecked")
            List<String> scopes = (List<String>) data.getOrDefault("sc", Collections.emptyList());
            @SuppressWarnings("unchecked")
            Map<String, Object> ap = (Map<String, Object>) data.getOrDefault("ap", Collections.emptyMap());
            @SuppressWarnings("unchecked")
            Map<String, Object> at = (Map<String, Object>) data.getOrDefault("at", Collections.emptyMap());

            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri((String) data.get("au"))
                    .clientId((String)          data.get("ci"))
                    .redirectUri((String)        data.get("ru"))
                    .state((String)              data.get("st"))
                    .scopes(new LinkedHashSet<>(scopes))
                    .additionalParameters(ap)
                    .attributes(at)
                    .build();
        } catch (Exception e) {
            return null; // treat corrupted / expired cookie as absent
        }
    }

    // ── cookie helpers ─────────────────────────────────────────────────────

    private Optional<String> getCookieValue(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private void deleteCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                COOKIE_NAME + "=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=None");
    }
}
