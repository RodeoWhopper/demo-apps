package dev.kutuphane.library.service;

import dev.kutuphane.library.domain.Member;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** Adapts a Member entity to Spring Security's UserDetails. */
public class MemberPrincipal implements UserDetails {

    private final Member member;

    public MemberPrincipal(Member member) {
        this.member = member;
    }

    public Member getMember() {
        return member;
    }

    public String getFullName() {
        return member.getFullName();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name()));
    }

    @Override
    public String getPassword() {
        return member.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return member.getEmail();
    }

    @Override
    public boolean isEnabled() {
        return member.isActive();
    }
}
