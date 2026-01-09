export const isValidMobileNumber = (mobile:string): boolean => {
    const mobileRegex = /^(\+91)?[6-9]\d{9}$/;
    return mobileRegex.test(mobile)
}

export const isValidEmail = (email:string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    return emailRegex.test(email)
}
