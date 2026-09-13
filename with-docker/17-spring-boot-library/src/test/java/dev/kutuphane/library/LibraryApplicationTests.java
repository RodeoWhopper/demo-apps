package dev.kutuphane.library;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithUserDetails;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.unauthenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:librarytest;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class LibraryApplicationTests {

    @Autowired
    MockMvc mvc;

    @Test
    void catalogueAndHealthArePublic() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk());
        mvc.perform(get("/books/1")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void protectedPagesRedirectAnonymousUsersToLogin() throws Exception {
        mvc.perform(get("/my/loans")).andExpect(status().is3xxRedirection()).andExpect(redirectedUrlPattern("**/login"));
        mvc.perform(get("/admin/books")).andExpect(status().is3xxRedirection()).andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    @WithUserDetails("uye@kutuphane.dev")
    void membersCannotOpenAdminPages() throws Exception {
        mvc.perform(get("/admin/books")).andExpect(status().isForbidden());
        mvc.perform(get("/admin/loans")).andExpect(status().isForbidden());
    }

    @Test
    @WithUserDetails("librarian@kutuphane.dev")
    void adminsCanOpenAdminPages() throws Exception {
        mvc.perform(get("/admin/books")).andExpect(status().isOk());
        mvc.perform(get("/admin/members")).andExpect(status().isOk());
    }

    @Test
    void seededMemberCanLogInWithFormLogin() throws Exception {
        mvc.perform(formLogin("/login").user("uye@kutuphane.dev").password("Uye123!"))
                .andExpect(authenticated().withRoles("MEMBER"))
                .andExpect(redirectedUrl("/my/loans"));
        mvc.perform(formLogin("/login").user("uye@kutuphane.dev").password("wrong"))
                .andExpect(unauthenticated())
                .andExpect(redirectedUrl("/login?error"));
    }
}
