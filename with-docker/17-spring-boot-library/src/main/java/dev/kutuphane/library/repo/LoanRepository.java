package dev.kutuphane.library.repo;

import dev.kutuphane.library.domain.Book;
import dev.kutuphane.library.domain.Loan;
import dev.kutuphane.library.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByMemberOrderByBorrowedAtDesc(Member member);

    List<Loan> findAllByOrderByBorrowedAtDesc();

    boolean existsByBookAndMemberAndReturnedAtIsNull(Book book, Member member);

    boolean existsByBook(Book book);

    long countByReturnedAtIsNull();

    long countByReturnedAtIsNullAndDueAtBefore(LocalDate date);

    long countByMemberAndReturnedAtIsNull(Member member);
}
