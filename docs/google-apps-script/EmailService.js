/**
 * Megan POS - Google Apps Script Email Service
 * 
 * Cara deploy:
 * 1. Buka https://script.google.com
 * 2. Buat project baru
 * 3. Copy paste kode ini
 * 4. Klik Deploy > New Deployment > Web App
 * 5. Set access to "Anyone"
 * 6. Copy URL deployment untuk digunakan di .env.local
 */

// Configuration
const CONFIG = {
  APP_NAME: 'Megan POS',
  LOGO_URL: '', // Optional: URL logo restoran
  PRIMARY_COLOR: '#3B82F6',
  FROM_NAME: 'Megan POS Team'
};

/**
 * Handle CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * Main entry point for web requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { type, email, otp, name, restaurantName } = data;

    // Validate based on type
    if (type === 'new_order') {
      if (!email || !data.orderNumber) {
        return jsonResponse({ success: false, error: 'Email dan orderNumber diperlukan' });
      }
    } else {
      if (!email || !otp) {
        return jsonResponse({ success: false, error: 'Email dan OTP diperlukan' });
      }
    }

    let result;
    switch (type) {
      case 'signup':
        result = sendSignupOTP(email, otp, name);
        break;
      case 'forgot_password':
        result = sendForgotPasswordOTP(email, otp, name);
        break;
      case 'new_order':
        const { orderNumber, customerName, totalAmount, items } = data;
        result = sendNewOrderEmail(email, orderNumber, customerName, totalAmount, items);
        break;
      case 'general':
      default:
        result = sendGeneralOTP(email, otp);
        break;
    }

    return jsonResponse(result);

  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.toString() 
    });
  }
}

/**
 * Send Signup Verification OTP
 */
function sendSignupOTP(email, otp, name = '') {
  const subject = `Verifikasi Pendaftaran - ${CONFIG.APP_NAME}`;
  const greeting = name ? `Halo ${name},` : 'Halo,';
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${CONFIG.PRIMARY_COLOR}; margin: 0;">${CONFIG.APP_NAME}</h1>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px;">
        <h2 style="color: #111827; margin-top: 0;">Verifikasi Pendaftaran</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${greeting}</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Terima kasih telah mendaftar di ${CONFIG.APP_NAME}. Berikut adalah kode OTP Anda untuk verifikasi akun:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: ${CONFIG.PRIMARY_COLOR}; color: white; font-size: 32px; font-weight: bold; 
                      letter-spacing: 8px; padding: 20px; border-radius: 8px; display: inline-block;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Kode OTP berlaku selama 10 menit.<br>
          Jangan bagikan kode ini kepada siapapun.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
        <p>Email ini dikirim otomatis oleh ${CONFIG.APP_NAME}.<br>
        Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Send Forgot Password OTP
 */
function sendForgotPasswordOTP(email, otp, name = '') {
  const subject = `Ganti Password - ${CONFIG.APP_NAME}`;
  const greeting = name ? `Halo ${name},` : 'Halo,';
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${CONFIG.PRIMARY_COLOR}; margin: 0;">${CONFIG.APP_NAME}</h1>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px;">
        <h2 style="color: #111827; margin-top: 0;">Ganti Password</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${greeting}</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Kami menerima permintaan ganti password untuk akun Anda. Berikut adalah kode OTP Anda:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: #dc2626; color: white; font-size: 32px; font-weight: bold; 
                      letter-spacing: 8px; padding: 20px; border-radius: 8px; display: inline-block;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Kode OTP berlaku selama 10 menit.<br>
          Jika Anda tidak meminta ganti password, abaikan email ini.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
        <p>Email ini dikirim otomatis oleh ${CONFIG.APP_NAME}.<br>
        Untuk keamanan, jangan bagikan kode ini kepada siapapun.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Send New Order Notification
 */
function sendNewOrderEmail(email, orderNumber, customerName, totalAmount, items) {
  const subject = `Order Baru - ${orderNumber}`;
  const itemsList = items.map(item => `<li style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">${item}</li>`).join('');
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${CONFIG.PRIMARY_COLOR}; margin: 0;">${CONFIG.APP_NAME}</h1>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px;">
        <h2 style="color: #111827; margin-top: 0;">🛎️ Order Baru Diterima</h2>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>No. Order:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 5px 0; font-size: 18px; color: ${CONFIG.PRIMARY_COLOR};">
            <strong>Total: Rp ${totalAmount.toLocaleString('id-ID')}</strong>
          </p>
        </div>
        
        <h3 style="color: #374151; margin-bottom: 10px;">Pesanan:</h3>
        <ul style="list-style: none; padding: 0; margin: 0; background: white; border-radius: 8px; padding: 15px;">
          ${itemsList}
        </ul>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
          Silakan cek dashboard untuk detail lengkap dan proses order.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
        <p>Email ini dikirim otomatis oleh ${CONFIG.APP_NAME}.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Send General OTP
 */
function sendGeneralOTP(email, otp) {
  const subject = `Kode Verifikasi - ${CONFIG.APP_NAME}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${CONFIG.PRIMARY_COLOR}; margin: 0;">${CONFIG.APP_NAME}</h1>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 30px;">
        <h2 style="color: #111827; margin-top: 0;">Kode Verifikasi</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Berikut adalah kode OTP Anda:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: ${CONFIG.PRIMARY_COLOR}; color: white; font-size: 32px; font-weight: bold; 
                      letter-spacing: 8px; padding: 20px; border-radius: 8px; display: inline-block;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Kode OTP berlaku selama 10 menit.
        </p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Send Email Helper
 */
function sendEmail(to, subject, htmlBody) {
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody,
      name: CONFIG.FROM_NAME,
      replyTo: 'no-reply@meganpos.app'
    });
    
    return { 
      success: true, 
      message: 'Email berhasil dikirim' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * JSON Response Helper with CORS
 */
function jsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  return output;
}

/**
 * Test function (run this in Apps Script editor)
 */
function testEmail() {
  const result = sendSignupOTP('test@example.com', '123456', 'Test User');
  console.log(result);
}
