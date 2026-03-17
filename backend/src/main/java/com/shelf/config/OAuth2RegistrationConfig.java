package com.shelf.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

// Active when credentials are supplied via either:
//   - Environment variables  : GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
//   - application.yml properties: spring.security.oauth2.client.registration.google.client-id / .client-secret
@Configuration
@ConditionalOnExpression("!'${GOOGLE_CLIENT_ID:}'.isEmpty() or " +
        "!'${spring.security.oauth2.client.registration.google.client-id:}'.isEmpty()")
public class OAuth2RegistrationConfig {

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientIdEnv;

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientIdProp;

    @Value("${GOOGLE_CLIENT_SECRET:}")
    private String googleClientSecretEnv;

    @Value("${spring.security.oauth2.client.registration.google.client-secret:}")
    private String googleClientSecretProp;

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        String clientId = (googleClientIdEnv.isBlank() ? googleClientIdProp : googleClientIdEnv).trim();
        String clientSecret = (googleClientSecretEnv.isBlank() ? googleClientSecretProp : googleClientSecretEnv).trim();

        ClientRegistration googleRegistration = ClientRegistration
                .withRegistrationId("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName("sub")
                .clientName("Google")
                .build();

        return new InMemoryClientRegistrationRepository(googleRegistration);
    }
}
