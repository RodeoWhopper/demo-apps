package dev.kutuphane.library.service;

import dev.kutuphane.library.domain.Book;
import dev.kutuphane.library.domain.Loan;
import dev.kutuphane.library.domain.Member;
import dev.kutuphane.library.repo.BookRepository;
import dev.kutuphane.library.repo.LoanRepository;
import dev.kutuphane.library.repo.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class LibraryService {

    public static final int LOAN_DAYS = 14;
    public static final int MAX_ACTIVE_LOANS = 3;

    private final BookRepository books;
    private final MemberRepository members;
    private final LoanRepository loans;

    public LibraryService(BookRepository books, MemberRepository members, LoanRepository loans) {
        this.books = books;
        this.members = members;
        this.loans = loans;
    }

    @Transactional
    public Loan borrow(Long bookId, Long memberId) {
        Book book = books.findById(bookId).orElseThrow(() -> new LibraryException("Kitap bulunamadı."));
        Member member = members.findById(memberId).orElseThrow(() -> new LibraryException("Üye bulunamadı."));
        if (!member.isActive()) {
            throw new LibraryException("Üyeliğiniz pasif durumda, ödünç alamazsınız.");
        }
        if (!book.isAvailable()) {
            throw new LibraryException("Bu kitabın tüm kopyaları şu anda ödünçte.");
        }
        if (loans.existsByBookAndMemberAndReturnedAtIsNull(book, member)) {
            throw new LibraryException("Bu kitap zaten sizde.");
        }
        if (loans.countByMemberAndReturnedAtIsNull(member) >= MAX_ACTIVE_LOANS) {
            throw new LibraryException("En fazla " + MAX_ACTIVE_LOANS + " kitap ödünç alabilirsiniz.");
        }
        book.setCopiesAvailable(book.getCopiesAvailable() - 1);
        LocalDate today = LocalDate.now();
        return loans.save(new Loan(book, member, today, today.plusDays(LOAN_DAYS)));
    }

    /** Members may only return their own loans; admins may return any loan. */
    @Transactional
    public Loan returnLoan(Long loanId, Member actor) {
        Loan loan = loans.findById(loanId).orElseThrow(() -> new LibraryException("Ödünç kaydı bulunamadı."));
        if (!actor.isAdmin() && !loan.getMember().getId().equals(actor.getId())) {
            throw new LibraryException("Bu ödünç kaydı size ait değil.");
        }
        if (!loan.isActive()) {
            throw new LibraryException("Bu kitap zaten iade edilmiş.");
        }
        loan.setReturnedAt(LocalDate.now());
        Book book = loan.getBook();
        book.setCopiesAvailable(Math.min(book.getCopiesTotal(), book.getCopiesAvailable() + 1));
        return loan;
    }

    @Transactional
    public void deleteBook(Long bookId) {
        Book book = books.findById(bookId).orElseThrow(() -> new LibraryException("Kitap bulunamadı."));
        if (loans.existsByBook(book)) {
            throw new LibraryException("Ödünç geçmişi olan bir kitap silinemez.");
        }
        books.delete(book);
    }
}
