package dev.kutuphane.library.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String author;

    @NotBlank
    @Pattern(regexp = "[0-9Xx-]{10,17}", message = "ISBN must be 10-17 digits/dashes")
    @Column(nullable = false, unique = true, length = 20)
    private String isbn;

    @Size(max = 60)
    @Column(length = 60)
    private String genre;

    @Min(1450)
    @Max(2100)
    private Integer publishedYear;

    @Min(1)
    @Column(nullable = false)
    private int copiesTotal = 1;

    @Min(0)
    @Column(nullable = false)
    private int copiesAvailable = 1;

    public Book() {
    }

    public Book(String title, String author, String isbn, String genre, Integer publishedYear, int copiesTotal) {
        this.title = title;
        this.author = author;
        this.isbn = isbn;
        this.genre = genre;
        this.publishedYear = publishedYear;
        this.copiesTotal = copiesTotal;
        this.copiesAvailable = copiesTotal;
    }

    public boolean isAvailable() {
        return copiesAvailable > 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getIsbn() { return isbn; }
    public void setIsbn(String isbn) { this.isbn = isbn; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public Integer getPublishedYear() { return publishedYear; }
    public void setPublishedYear(Integer publishedYear) { this.publishedYear = publishedYear; }
    public int getCopiesTotal() { return copiesTotal; }
    public void setCopiesTotal(int copiesTotal) { this.copiesTotal = copiesTotal; }
    public int getCopiesAvailable() { return copiesAvailable; }
    public void setCopiesAvailable(int copiesAvailable) { this.copiesAvailable = copiesAvailable; }
}
