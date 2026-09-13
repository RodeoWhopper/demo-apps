package dev.kutuphane.library.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "loans")
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "book_id")
    private Book book;

    @ManyToOne(optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false)
    private LocalDate borrowedAt;

    @Column(nullable = false)
    private LocalDate dueAt;

    private LocalDate returnedAt;

    public Loan() {
    }

    public Loan(Book book, Member member, LocalDate borrowedAt, LocalDate dueAt) {
        this.book = book;
        this.member = member;
        this.borrowedAt = borrowedAt;
        this.dueAt = dueAt;
    }

    public boolean isActive() {
        return returnedAt == null;
    }

    public boolean isOverdue() {
        return isActive() && LocalDate.now().isAfter(dueAt);
    }

    /** ACTIVE, OVERDUE or RETURNED – used for badges in the templates. */
    public String getStatus() {
        if (!isActive()) return "RETURNED";
        return isOverdue() ? "OVERDUE" : "ACTIVE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Book getBook() { return book; }
    public void setBook(Book book) { this.book = book; }
    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }
    public LocalDate getBorrowedAt() { return borrowedAt; }
    public void setBorrowedAt(LocalDate borrowedAt) { this.borrowedAt = borrowedAt; }
    public LocalDate getDueAt() { return dueAt; }
    public void setDueAt(LocalDate dueAt) { this.dueAt = dueAt; }
    public LocalDate getReturnedAt() { return returnedAt; }
    public void setReturnedAt(LocalDate returnedAt) { this.returnedAt = returnedAt; }
}
