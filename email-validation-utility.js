class EmailValidator {
  validate(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  isValid(email) {
    return this.validate(email);
  }
}

export { EmailValidator };
