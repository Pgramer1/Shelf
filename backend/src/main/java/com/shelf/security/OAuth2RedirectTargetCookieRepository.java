package com.shelf.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

@Component
public class OAuth2RedirectTargetCookieRepository {

    private static final String COOKIE_NAME = "oauth2_redirect_target";
    private static final int COOKIE_MAX_AGE = 180;

    public void saveRedirectTarget(HttpServletResponse response, String redirectTarget) {
        if (redirectTarget == null || redirectTarget.isBlank()) {
            clearRedirectTarget(response);
            return;
        }

        String encoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(redirectTarget.getBytes(StandardCharsets.UTF_8));

        response.addHeader("Set-Cookie",
                COOKIE_NAME + "=" + encoded
                        + "; Path=/; HttpOnly; Secure; Max-Age=" + COOKIE_MAX_AGE + "; SameSite=None");
    }

    public Optional<String> loadRedirectTarget(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }

        for (Cookie cookie : cookies) {
            if (!COOKIE_NAME.equals(cookie.getName())) {
                continue;
            }

            try {
                byte[] decoded = Base64.getUrlDecoder().decode(cookie.getValue());
                String value = new String(decoded, StandardCharsets.UTF_8).trim();
                if (!value.isBlank()) {
                    return Optional.of(value);
                }
            } catch (IllegalArgumentException ignored) {
                return Optional.empty();
            }
        }

        return Optional.empty();
    }

    public void clearRedirectTarget(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                COOKIE_NAME + "=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=None");
    }
}
