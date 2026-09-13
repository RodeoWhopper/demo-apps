package dev.kutuphane.library.web;

import dev.kutuphane.library.domain.Member;
import dev.kutuphane.library.repo.LoanRepository;
import dev.kutuphane.library.repo.MemberRepository;
import dev.kutuphane.library.service.MemberPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

@Controller
public class AdminMemberController {

    private final MemberRepository members;
    private final LoanRepository loans;

    public AdminMemberController(MemberRepository members, LoanRepository loans) {
        this.members = members;
        this.loans = loans;
    }

    @GetMapping("/admin/members")
    public String members(Model model) {
        Map<Member, Long> activeLoans = new LinkedHashMap<>();
        for (Member m : members.findAllByOrderByFullNameAsc()) {
            activeLoans.put(m, loans.countByMemberAndReturnedAtIsNull(m));
        }
        model.addAttribute("members", activeLoans);
        return "admin/members";
    }

    /** Toggle a member's active flag (deactivated members cannot log in or borrow). */
    @PostMapping("/admin/members/{id}/toggle")
    public String toggle(@PathVariable Long id, @AuthenticationPrincipal MemberPrincipal principal,
                         RedirectAttributes redirect) {
        Member member = members.findById(id).orElse(null);
        if (member == null) {
            redirect.addFlashAttribute("error", "Üye bulunamadı.");
        } else if (member.getId().equals(principal.getMember().getId())) {
            redirect.addFlashAttribute("error", "Kendi hesabınızı pasifleştiremezsiniz.");
        } else {
            member.setActive(!member.isActive());
            members.save(member);
            redirect.addFlashAttribute("success", member.getFullName() + (member.isActive() ? " aktifleştirildi." : " pasifleştirildi."));
        }
        return "redirect:/admin/members";
    }
}
