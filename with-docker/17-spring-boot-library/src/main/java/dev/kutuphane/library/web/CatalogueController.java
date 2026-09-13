package dev.kutuphane.library.web;

import dev.kutuphane.library.domain.Book;
import dev.kutuphane.library.repo.BookRepository;
import dev.kutuphane.library.repo.LoanRepository;
import dev.kutuphane.library.service.MemberPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Controller
public class CatalogueController {

    private final BookRepository books;
    private final LoanRepository loans;

    public CatalogueController(BookRepository books, LoanRepository loans) {
        this.books = books;
        this.loans = loans;
    }

    @GetMapping("/")
    public String catalogue(@RequestParam(name = "q", required = false) String q, Model model) {
        String query = q == null ? "" : q.trim();
        List<Book> result = query.isEmpty() ? books.findAllByOrderByTitleAsc() : books.search(query);
        model.addAttribute("books", result);
        model.addAttribute("q", query);
        model.addAttribute("totalBooks", books.count());
        model.addAttribute("activeLoans", loans.countByReturnedAtIsNull());
        model.addAttribute("overdueLoans", loans.countByReturnedAtIsNullAndDueAtBefore(LocalDate.now()));
        return "index";
    }

    @GetMapping("/books/{id}")
    public String book(@PathVariable Long id, @AuthenticationPrincipal MemberPrincipal principal, Model model) {
        Book book = books.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Kitap bulunamadı"));
        boolean alreadyBorrowed = principal != null
                && loans.existsByBookAndMemberAndReturnedAtIsNull(book, principal.getMember());
        model.addAttribute("book", book);
        model.addAttribute("alreadyBorrowed", alreadyBorrowed);
        return "book";
    }
}
