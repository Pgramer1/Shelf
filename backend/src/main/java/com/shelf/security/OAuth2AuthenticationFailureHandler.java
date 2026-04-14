package com.shelf.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final OAuth2RedirectTargetValidator redirectTargetValidator;
    private final OAuth2RedirectTargetCookieRepository redirectTargetCookieRepository;

    private String frontendRoot(String redirectUri) {
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
        String message = exception.getMessage();
        if (message != null && message.contains("invalid_token_response")) {
            message = "Google OAuth is misconfigured on the server. Verify GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and Google authorized redirect URI.";
        }

        String redirectTarget = redirectTargetCookieRepository.loadRedirectTarget(request)
            .map(redirectTargetValidator::resolveOrDefault)
            .orElse(redirectTargetValidator.getDefaultRedirectUri());
        redirectTargetCookieRepository.clearRedirectTarget(response);

        String failureTarget = redirectTarget;
        if (redirectTarget.endsWith("/oauth/callback") || redirectTarget.endsWith("/oauth/callback/")) {
            failureTarget = frontendRoot(redirectTarget);
        }

        String targetUrl = UriComponentsBuilder
            .fromUriString(failureTarget)
                .queryParam("oauth_error", message)
                .build().toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
