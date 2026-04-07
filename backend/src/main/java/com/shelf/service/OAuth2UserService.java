package com.shelf.service;

import com.shelf.model.User;
import com.shelf.repository.UserRepository;
import com.shelf.security.CustomOAuth2User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String googleId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        // Find or create our User entity, then wrap it in the principal so the
        // success handler can access it without a second DB query.
        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(existingUser -> {
                            existingUser.setGoogleId(googleId);
                            if (existingUser.getAvatarUrl() == null || existingUser.getAvatarUrl().isBlank()) {
                                existingUser.setAvatarUrl(defaultAvatarUrl(existingUser.getUsername()));
                            }
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> {
                            User newUser = new User();
                            newUser.setGoogleId(googleId);
                            newUser.setEmail(email);
                            String username = generateUsername(name, email);
                            newUser.setUsername(username);
                            newUser.setAvatarUrl(defaultAvatarUrl(username));
                            return userRepository.save(newUser);
                        }));

        return new CustomOAuth2User(oAuth2User, user);
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

    private String defaultAvatarUrl(String seed) {
        return "https://api.dicebear.com/9.x/croodles/svg?seed=" + seed;
    }
}
