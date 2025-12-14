function validatePhone(phone) {
  return /^\+?[\d\s\-\(\)]{10,15}$/.test(phone.replace(/\s/g, ''));
}
