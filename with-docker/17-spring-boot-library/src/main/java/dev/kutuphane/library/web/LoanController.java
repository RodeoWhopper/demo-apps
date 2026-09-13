package dev.kutuphane.library.web;

import dev.kutuphane.library.domain.Loan;
import dev.kutuphane.library.repo.LoanRepository;
import dev.kutuphane.library.service.LibraryException;
import dev.kutuphane.library.service.LibraryService;
import dev.kutuphane.library.service.MemberPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class LoanController {

    private final LibraryService library;
    private final LoanRepository loans;

    public LoanController(LibraryService library, LoanRepository loans) {
        this.library = library;
        this.loans = loans;
    }

    @GetMapping("/my/loans")
    public String myLoans(@AuthenticationPrincipal MemberPrincipal principal, Model model) {
        model.addAttribute("loans", loans.findByMemberOrderByBorrowedAtDesc(principal.getMember()));
        model.addAttribute("maxLoans", LibraryService.MAX_ACTIVE_LOANS);
        model.addAttribute("activeCount", loans.countByMemberAndReturnedAtIsNull(principal.getMember()));
        return "my-loans";
    }

    @PostMapping("/books/{id}/borrow")
    public String borrow(@PathVariable Long id, @AuthenticationPrincipal MemberPrincipal principal,
                         RedirectAttributes redirect) {
        try {
            Loan loan = library.borrow(id, principal.getMember().getId());
            redirect.addFlashAttribute("success",
                    "\"" + loan.getBook().getTitle() + "\" ödünç alındı. İade tarihi: " + loan.getDueAt());
            return "redirect:/my/loans";
        } catch (LibraryException e) {
            redirect.addFlashAttribute("error", e.getMessage());
            return "redirect:/books/" + id;
        }
    }

    @PostMapping("/loans/{id}/return")
    public String returnLoan(@PathVariable Long id, @AuthenticationPrincipal MemberPrincipal principal,
                             @RequestParam(name = "back", required = false) String back,
                             RedirectAttributes redirect) {
        try {
            Loan loan = library.returnLoan(id, principal.getMember());
            redirect.addFlashAttribute("success", "\"" + loan.getBook().getTitle() + "\" iade edildi.");
        } catch (LibraryException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:" + ("admin".equals(back) && principal.getMember().isAdmin() ? "/admin/loans" : "/my/loans");
    }
}
