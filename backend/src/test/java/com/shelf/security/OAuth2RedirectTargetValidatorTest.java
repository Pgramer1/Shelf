package com.shelf.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OAuth2RedirectTargetValidatorTest {

    @Test
    void allowsConfiguredFrontendCallback() {
        OAuth2RedirectTargetValidator validator = new OAuth2RedirectTargetValidator(
                "http://localhost:3000/oauth/callback",
                "http://localhost:3000/oauth/callback");

        assertTrue(validator.isAllowed("http://localhost:3000/oauth/callback"));
    }

    @Test
    void allowsChromeExtensionPattern() {
        OAuth2RedirectTargetValidator validator = new OAuth2RedirectTargetValidator(
                "http://localhost:3000/oauth/callback",
                "http://localhost:3000/oauth/callback,chrome-extension://*/callback/index.html");

        assertTrue(validator.isAllowed("chrome-extension://abcdefghijklmnop/callback/index.html"));
    }

    @Test
    void rejectsDisallowedScheme() {
        OAuth2RedirectTargetValidator validator = new OAuth2RedirectTargetValidator(
                "http://localhost:3000/oauth/callback",
                "http://localhost:3000/oauth/callback");

        assertFalse(validator.isAllowed("javascript:alert(1)"));
    }

    @Test
    void rejectsUnknownDomainWhenPatternMissing() {
        OAuth2RedirectTargetValidator validator = new OAuth2RedirectTargetValidator(
                "http://localhost:3000/oauth/callback",
                "http://localhost:3000/oauth/callback");

        assertFalse(validator.isAllowed("https://evil.example.com/callback"));
    }

    @Test
    void resolveOrDefaultFallsBackToDefault() {
        OAuth2RedirectTargetValidator validator = new OAuth2RedirectTargetValidator(
                "http://localhost:3000/oauth/callback",
                "http://localhost:3000/oauth/callback");

        assertEquals(
                "http://localhost:3000/oauth/callback",
                validator.resolveOrDefault("https://evil.example.com/callback"));
    }
}
