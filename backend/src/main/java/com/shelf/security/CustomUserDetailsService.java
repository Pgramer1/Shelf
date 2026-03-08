package com.shelf.security;

import com.shelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // OAuth-only users have no password hash; Spring Security's User constructor
        // rejects null passwords, so fall back to "" (which never matches any BCrypt hash).
        String password = user.getPasswordHash() != null ? user.getPasswordHash() : "";
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                password,
                new ArrayList<>());
    }
}
