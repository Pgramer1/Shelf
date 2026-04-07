package com.shelf.service;

import com.shelf.dto.AuthResponse;
import com.shelf.dto.ForgotPasswordRequest;
import com.shelf.dto.LoginRequest;
import com.shelf.dto.SignupRequest;
import com.shelf.model.User;
import com.shelf.repository.UserRepository;
import com.shelf.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthResponse signup(SignupRequest request) {
        // Check if username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalStateException("Username already exists");
        }

        // Check if email exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already exists");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setAvatarUrl(defaultAvatarUrl(request.getUsername()));

        userRepository.save(user);

        // Generate JWT token
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtTokenProvider.generateToken(userDetails);

        return new AuthResponse(token, user.getUsername(), user.getEmail(), user.getBio(), user.getAvatarUrl());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtTokenProvider.generateToken(userDetails);

        return new AuthResponse(token, user.getUsername(), user.getEmail(), user.getBio(), user.getAvatarUrl());
    }

    public String forgotPassword(ForgotPasswordRequest request) {
        // For now, keep this response generic to avoid leaking whether an email exists.
        // Hook actual reset-token email delivery here when email infrastructure is
        // added.
        return "If an account exists for this email, reset instructions have been sent.(yet to be implemented)";
    }

    private String defaultAvatarUrl(String seed) {
        return "https://api.dicebear.com/9.x/croodles/svg?seed=" + seed;
    }
}
