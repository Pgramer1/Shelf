package com.shelf.service;

import com.shelf.model.User;
import com.shelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String googleId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        // Find existing user by Google ID, or by email, or create a new one
        userRepository.findByGoogleId(googleId).orElseGet(() -> userRepository.findByEmail(email).map(existingUser -> {
            existingUser.setGoogleId(googleId);
            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            User newUser = new User();
            newUser.setGoogleId(googleId);
            newUser.setEmail(email);
            newUser.setUsername(generateUsername(name, email));
            return userRepository.save(newUser);
        }));

        return oAuth2User;
    }

    private String generateUsername(String name, String email) {
        String base = (name != null && !name.isBlank())
                ? name.toLowerCase().replaceAll("\\s+", "_").replaceAll("[^a-z0-9_]", "")
                : email.split("@")[0];
        String username = base;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = base + counter++;
        }
        return username;
    }
}
