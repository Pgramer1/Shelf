package com.shelf.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class OAuth2RedirectTargetValidator {

    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https", "chrome-extension", "edge-extension");

    private final String defaultRedirectUri;
    private final List<String> allowedPatterns;

    public OAuth2RedirectTargetValidator(
            @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth/callback}") String defaultRedirectUri,
            @Value("${app.oauth2.allowed-redirect-uri-patterns:}") String allowedPatternsCsv) {
        this.defaultRedirectUri = normalize(defaultRedirectUri);

        if (allowedPatternsCsv == null || allowedPatternsCsv.isBlank()) {
            this.allowedPatterns = List.of(this.defaultRedirectUri);
        } else {
            this.allowedPatterns = Arrays.stream(allowedPatternsCsv.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .map(this::normalize)
                    .toList();
        }
    }

    public String getDefaultRedirectUri() {
        return defaultRedirectUri;
    }

    public boolean isAllowed(String candidateUri) {
        if (candidateUri == null || candidateUri.isBlank()) {
            return false;
        }

        String normalizedCandidate = normalize(candidateUri);
        if (!isValidScheme(normalizedCandidate)) {
            return false;
        }

        return allowedPatterns.stream().anyMatch(pattern -> wildcardMatch(pattern, normalizedCandidate));
    }

    public String resolveOrDefault(String candidateUri) {
        return isAllowed(candidateUri) ? normalize(candidateUri) : defaultRedirectUri;
    }

    private boolean isValidScheme(String uri) {
        try {
            URI parsed = URI.create(uri);
            if (parsed.getFragment() != null) {
                return false;
            }

            String scheme = parsed.getScheme();
            if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT))) {
                return false;
            }

            if (("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) && parsed.getHost() == null) {
                return false;
            }

            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean wildcardMatch(String pattern, String value) {
        StringBuilder regex = new StringBuilder("^");
        for (char ch : pattern.toCharArray()) {
            if (ch == '*') {
                regex.append(".*");
                continue;
            }

            if ("\\.^$|?+()[]{}".indexOf(ch) >= 0) {
                regex.append('\\');
            }
            regex.append(ch);
        }
        regex.append('$');

        return value.matches(regex.toString());
    }

    private String normalize(String uri) {
        if (uri == null) {
            return "";
        }

        String value = uri.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }
}
