package dev.kutuphane.library.repo;

import dev.kutuphane.library.domain.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    List<Book> findAllByOrderByTitleAsc();

    Optional<Book> findByIsbn(String isbn);

    @Query("""
            select b from Book b
            where lower(b.title) like lower(concat('%', :q, '%'))
               or lower(b.author) like lower(concat('%', :q, '%'))
               or b.isbn like concat('%', :q, '%')
            order by b.title asc
            """)
    List<Book> search(@Param("q") String q);
}
