package dev.kutuphane.library.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class AuthController {

    /** Spring Security handles POST /login and POST /logout; we only render the pages. */
    @GetMapping("/login")
    public String login() {
        return "login";
    }

    /** Any method: access-denied forwards keep the original verb (e.g. a POST without CSRF). */
    @RequestMapping("/403")
    public String forbidden() {
        return "error/403";
    }
}
