package dev.kutuphane.library.config;

import dev.kutuphane.library.domain.Book;
import dev.kutuphane.library.domain.Loan;
import dev.kutuphane.library.domain.Member;
import dev.kutuphane.library.domain.Role;
import dev.kutuphane.library.repo.BookRepository;
import dev.kutuphane.library.repo.LoanRepository;
import dev.kutuphane.library.repo.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** Seeds demo data on first start (only when the members table is empty). */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final BookRepository books;
    private final MemberRepository members;
    private final LoanRepository loans;
    private final PasswordEncoder encoder;

    public DataSeeder(BookRepository books, MemberRepository members, LoanRepository loans, PasswordEncoder encoder) {
        this.books = books;
        this.members = members;
        this.loans = loans;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (members.count() > 0) {
            return;
        }
        Member librarian = members.save(new Member("librarian@kutuphane.dev", "Ayşe Kütüphaneci",
                encoder.encode("Admin123!"), Role.ADMIN));
        Member uye = members.save(new Member("uye@kutuphane.dev", "Mehmet Okur",
                encoder.encode("Uye123!"), Role.MEMBER));

        List<Book> seeded = books.saveAll(List.of(
                new Book("Tutunamayanlar", "Oğuz Atay", "978-975-470-011-6", "Roman", 1972, 3),
                new Book("Kürk Mantolu Madonna", "Sabahattin Ali", "978-975-363-802-7", "Roman", 1943, 4),
                new Book("İnce Memed", "Yaşar Kemal", "978-975-08-0123-4", "Roman", 1955, 2),
                new Book("Saatleri Ayarlama Enstitüsü", "Ahmet Hamdi Tanpınar", "978-975-995-127-0", "Roman", 1961, 2),
                new Book("Benim Adım Kırmızı", "Orhan Pamuk", "978-975-470-950-8", "Roman", 1998, 3),
                new Book("Clean Code", "Robert C. Martin", "978-0-13-235088-4", "Yazılım", 2008, 2),
                new Book("Designing Data-Intensive Applications", "Martin Kleppmann", "978-1-4493-7332-0", "Yazılım", 2017, 1),
                new Book("Sapiens", "Yuval Noah Harari", "978-0-06-231609-7", "Tarih", 2011, 2),
                new Book("Nutuk", "Mustafa Kemal Atatürk", "978-975-16-0018-0", "Tarih", 1927, 5),
                new Book("Küçük Prens", "Antoine de Saint-Exupéry", "978-975-14-0006-3", "Çocuk", 1943, 4)));

        LocalDate today = LocalDate.now();
        // active loan, due in 10 days
        borrow(seeded.get(0), uye, today.minusDays(4), today.plusDays(10), null);
        // overdue loan
        borrow(seeded.get(5), uye, today.minusDays(20), today.minusDays(6), null);
        // returned loan
        borrow(seeded.get(2), librarian, today.minusDays(30), today.minusDays(16), today.minusDays(18));

        log.info("Seeded {} books, {} members and {} loans", seeded.size(), members.count(), loans.count());
    }

    private void borrow(Book book, Member member, LocalDate borrowed, LocalDate due, LocalDate returned) {
        Loan loan = new Loan(book, member, borrowed, due);
        loan.setReturnedAt(returned);
        if (returned == null) {
            book.setCopiesAvailable(book.getCopiesAvailable() - 1);
            books.save(book);
        }
        loans.save(loan);
    }
}
