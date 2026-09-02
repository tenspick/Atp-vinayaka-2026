/**
 * WhatsApp Helper Utility for Vinayaka Chavithi Receipts
 */

/**
 * Formats a 10-digit Indian mobile number with country code 91
 * @param {string} mobile 
 * @param {string} countryCode 
 * @returns {string} Formatted mobile number without leading + or spaces
 */
function formatMobileNumber(mobile, countryCode = '91') {
    if (!mobile) return '';
    // Strip all non-numeric characters
    let cleaned = String(mobile).replace(/\D/g, '');
    
    // If 10 digits, prepends country code
    if (cleaned.length === 10) {
        cleaned = countryCode + cleaned;
    }
    // If starts with 0 and length is 11
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = countryCode + cleaned.substring(1);
    }
    return cleaned;
}

/**
 * Generates WhatsApp pre-filled link for Chandaa donation receipt
 */
function generateWhatsAppReceiptUrl(donation, settings = {}) {
    const mobile = formatMobileNumber(donation.mobile, settings.whatsapp_country_code || '91');
    if (!mobile) return '';

    const festivalName = settings.festival_name || 'ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026';
    const currency = settings.currency_symbol || '₹';

    const message = `🙏 Namaste ${donation.donor_name} Garu,\n\n` +
        `Thank you for your generous contribution towards\n` +
        `*${festivalName}* 🕉️\n\n` +
        `*Donation Details:*\n` +
        `• *Receipt No:* ${donation.receipt_number}\n` +
        `• *Donor Name:* ${donation.donor_name}\n` +
        `• *Date:* ${donation.date}\n` +
        `• *Amount:* ${currency}${Number(donation.amount).toLocaleString('en-IN')}\n` +
        `• *Payment Method:* ${donation.payment_method}\n` +
        (donation.collected_by ? `• *Collected By:* ${donation.collected_by}\n` : '') +
        `\nYour contribution is greatly appreciated for the village festival celebrations.\n\n` +
        `*Ganapathi Bappa Morya!* 🙏\n\n` +
        `---\n` +
        `*${festivalName}*\n` +
        `Designed & Developed in Ananthampalli by KLIVOO NEXT GEN CRMS (A Tenspick Initiative)`;

    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${mobile}?text=${encodedText}`;
}

module.exports = {
    formatMobileNumber,
    generateWhatsAppReceiptUrl
};
