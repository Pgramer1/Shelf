package com.shelf.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth/callback}")
    private String redirectUri;

    private String frontendRoot() {
        if (redirectUri == null || redirectUri.isBlank()) {
            return "http://localhost:3000";
        }
        if (redirectUri.endsWith("/oauth/callback")) {
            return redirectUri.substring(0, redirectUri.length() - "/oauth/callback".length());
        }
        if (redirectUri.endsWith("/oauth/callback/")) {
            return redirectUri.substring(0, redirectUri.length() - "/oauth/callback/".length());
        }
        return redirectUri;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        String targetUrl = UriComponentsBuilder
                .fromUriString(frontendRoot())
                .queryParam("oauth_error", exception.getMessage())
                .build().toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
