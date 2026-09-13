package dev.kutuphane.library.web;

import dev.kutuphane.library.domain.Book;
import dev.kutuphane.library.repo.BookRepository;
import dev.kutuphane.library.service.LibraryException;
import dev.kutuphane.library.service.LibraryService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Controller
@RequestMapping("/admin/books")
public class AdminBookController {

    private final BookRepository books;
    private final LibraryService library;

    public AdminBookController(BookRepository books, LibraryService library) {
        this.books = books;
        this.library = library;
    }

    @GetMapping
    public String list(Model model) {
        model.addAttribute("books", books.findAllByOrderByTitleAsc());
        return "admin/books";
    }

    @GetMapping("/new")
    public String createForm(Model model) {
        model.addAttribute("book", new Book());
        model.addAttribute("mode", "create");
        return "admin/book-form";
    }

    @PostMapping
    public String create(@Valid @ModelAttribute("book") Book book, BindingResult binding, Model model,
                         RedirectAttributes redirect) {
        validateIsbnUnique(book, binding);
        if (binding.hasErrors()) {
            model.addAttribute("mode", "create");
            return "admin/book-form";
        }
        book.setCopiesAvailable(book.getCopiesTotal());
        books.save(book);
        redirect.addFlashAttribute("success", "\"" + book.getTitle() + "\" kataloğa eklendi.");
        return "redirect:/admin/books";
    }

    @GetMapping("/{id}/edit")
    public String editForm(@PathVariable Long id, Model model) {
        model.addAttribute("book", find(id));
        model.addAttribute("mode", "edit");
        return "admin/book-form";
    }

    @PostMapping("/{id}")
    public String update(@PathVariable Long id, @Valid @ModelAttribute("book") Book form, BindingResult binding,
                         Model model, RedirectAttributes redirect) {
        Book existing = find(id);
        form.setId(id);
        validateIsbnUnique(form, binding);
        if (binding.hasErrors()) {
            model.addAttribute("mode", "edit");
            return "admin/book-form";
        }
        int onLoan = existing.getCopiesTotal() - existing.getCopiesAvailable();
        if (form.getCopiesTotal() < onLoan) {
            binding.rejectValue("copiesTotal", "copies.tooFew", onLoan + " kopya şu anda ödünçte; toplam bundan az olamaz.");
            model.addAttribute("mode", "edit");
            return "admin/book-form";
        }
        existing.setTitle(form.getTitle());
        existing.setAuthor(form.getAuthor());
        existing.setIsbn(form.getIsbn());
        existing.setGenre(form.getGenre());
        existing.setPublishedYear(form.getPublishedYear());
        existing.setCopiesTotal(form.getCopiesTotal());
        existing.setCopiesAvailable(form.getCopiesTotal() - onLoan);
        books.save(existing);
        redirect.addFlashAttribute("success", "\"" + existing.getTitle() + "\" güncellendi.");
        return "redirect:/admin/books";
    }

    @PostMapping("/{id}/delete")
    public String delete(@PathVariable Long id, RedirectAttributes redirect) {
        try {
            library.deleteBook(id);
            redirect.addFlashAttribute("success", "Kitap silindi.");
        } catch (LibraryException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/books";
    }

    private Book find(Long id) {
        return books.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Kitap bulunamadı"));
    }

    private void validateIsbnUnique(Book book, BindingResult binding) {
        if (book.getIsbn() == null) {
            return;
        }
        books.findByIsbn(book.getIsbn())
                .filter(other -> !other.getId().equals(book.getId()))
                .ifPresent(other -> binding.rejectValue("isbn", "isbn.duplicate", "Bu ISBN zaten kayıtlı."));
    }
}
