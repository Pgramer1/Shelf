package com.shelf.security;

import com.shelf.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final OAuth2RedirectTargetValidator redirectTargetValidator;
    private final OAuth2RedirectTargetCookieRepository redirectTargetCookieRepository;

    private String normalizeRedirectUri(String uri) {
        if (uri != null && uri.endsWith("/oauth/callback")) {
            return uri + "/";
        }
        return uri;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        // CustomOAuth2User carries the persisted User entity — no extra DB query
        // needed.
        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();
        User user = oAuth2User.getUser();

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtTokenProvider.generateToken(userDetails);

        String redirectTarget = redirectTargetCookieRepository.loadRedirectTarget(request)
            .map(redirectTargetValidator::resolveOrDefault)
            .orElse(redirectTargetValidator.getDefaultRedirectUri());
        redirectTargetCookieRepository.clearRedirectTarget(response);

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(normalizeRedirectUri(redirectTarget))
                .queryParam("token", token)
                .queryParam("username", user.getUsername())
                .queryParam("email", user.getEmail());

        if (user.getBio() != null) {
            builder.queryParam("bio", user.getBio());
        }
        if (user.getAvatarUrl() != null) {
            builder.queryParam("avatarUrl", user.getAvatarUrl());
        }

        String targetUrl = builder.build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
