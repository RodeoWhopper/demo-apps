package dev.kutuphane.library.web;

import dev.kutuphane.library.repo.LoanRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;

@Controller
public class AdminLoanController {

    private final LoanRepository loans;

    public AdminLoanController(LoanRepository loans) {
        this.loans = loans;
    }

    @GetMapping("/admin/loans")
    public String loans(Model model) {
        model.addAttribute("loans", loans.findAllByOrderByBorrowedAtDesc());
        model.addAttribute("activeCount", loans.countByReturnedAtIsNull());
        model.addAttribute("overdueCount", loans.countByReturnedAtIsNullAndDueAtBefore(LocalDate.now()));
        return "admin/loans";
    }
}
