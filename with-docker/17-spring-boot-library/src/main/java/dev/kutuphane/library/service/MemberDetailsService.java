package dev.kutuphane.library.service;

import dev.kutuphane.library.repo.MemberRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class MemberDetailsService implements UserDetailsService {

    private final MemberRepository members;

    public MemberDetailsService(MemberRepository members) {
        this.members = members;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return members.findByEmailIgnoreCase(email)
                .map(MemberPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("No member with email " + email));
    }
}
