package com.shelf.controller;

import com.shelf.dto.AuthResponse;
import com.shelf.dto.ForgotPasswordRequest;
import com.shelf.dto.LoginRequest;
import com.shelf.dto.SignupRequest;
import com.shelf.security.OAuth2RedirectTargetCookieRepository;
import com.shelf.security.OAuth2RedirectTargetValidator;
import com.shelf.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuth2RedirectTargetValidator redirectTargetValidator;
    private final OAuth2RedirectTargetCookieRepository redirectTargetCookieRepository;

    @Autowired(required = false)
    private ClientRegistrationRepository clientRegistrationRepository;

    @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth/callback}")
    private String oauth2RedirectUri;

    private String frontendRoot() {
        if (oauth2RedirectUri == null || oauth2RedirectUri.isBlank()) {
            return "http://localhost:3000";
        }
        if (oauth2RedirectUri.endsWith("/oauth/callback")) {
            return oauth2RedirectUri.substring(0, oauth2RedirectUri.length() - "/oauth/callback".length());
        }
        if (oauth2RedirectUri.endsWith("/oauth/callback/")) {
            return oauth2RedirectUri.substring(0, oauth2RedirectUri.length() - "/oauth/callback/".length());
        }
        return oauth2RedirectUri;
    }

    private boolean isFrontendCallback(String uri) {
        return uri != null && (uri.endsWith("/oauth/callback") || uri.endsWith("/oauth/callback/"));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String message = authService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @GetMapping("/oauth2/google")
    public void startGoogleOAuth(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestParam(name = "redirect_uri", required = false) String requestedRedirectUri) throws IOException {
        String redirectTarget = oauth2RedirectUri;
        if (requestedRedirectUri != null && !requestedRedirectUri.isBlank()) {
            if (!redirectTargetValidator.isAllowed(requestedRedirectUri)) {
                String loginUrl = UriComponentsBuilder
                        .fromUriString(frontendRoot() + "/login")
                        .queryParam("oauth_error", "Invalid redirect_uri")
                        .build()
                        .toUriString();
                response.sendRedirect(loginUrl);
                return;
            }
            redirectTarget = requestedRedirectUri;
        }

        if (clientRegistrationRepository != null) {
            redirectTargetCookieRepository.saveRedirectTarget(response,
                    redirectTargetValidator.resolveOrDefault(redirectTarget));
            String oauthStart = request.getContextPath() + "/oauth2/authorization/google";
            response.sendRedirect(oauthStart);
            return;
        }

        String failureTarget = isFrontendCallback(redirectTarget)
                ? frontendRoot() + "/login"
                : redirectTargetValidator.resolveOrDefault(redirectTarget);

        String loginUrl = UriComponentsBuilder
                .fromUriString(failureTarget)
                .queryParam("oauth_error", "Google login is not configured on the server")
                .build()
                .toUriString();
        response.sendRedirect(loginUrl);
    }
}
