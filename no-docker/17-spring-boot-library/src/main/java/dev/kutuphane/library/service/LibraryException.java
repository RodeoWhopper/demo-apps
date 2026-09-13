package dev.kutuphane.library.service;

/** Business-rule violation with a message that is safe to show to the user. */
public class LibraryException extends RuntimeException {

    public LibraryException(String message) {
        super(message);
    }
}
