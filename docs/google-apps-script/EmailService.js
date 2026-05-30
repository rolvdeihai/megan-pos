/**
 * JetNote Pos - Google Apps Script Email Service
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
  APP_NAME: 'JetNote Pos',
  LOGO_URL: '', // Optional: URL logo restoran
  PRIMARY_COLOR: '#3B82F6',
  FROM_NAME: 'JetNote POS Team'
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
    } else if (type !== 'invoice' && type !== 'invoice_owner') {
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
      case 'new_order': {
        const { orderNumber, customerName, totalAmount, items } = data;
        result = sendNewOrderEmail(email, orderNumber, customerName, totalAmount, items);
        break;
      }
      case 'invoice': {
        const { orderNumber, customerName, totalAmount, items, invoiceHtml } = data;
        result = sendInvoiceEmail(email, orderNumber, customerName, totalAmount, items, invoiceHtml);
        break;
      }
      case 'invoice_owner': {
        const { orderNumber, customerName, totalAmount, items, invoiceHtml } = data;
        result = sendInvoiceCopyToOwner(email, orderNumber, customerName, totalAmount, items, invoiceHtml);
        break;
      }
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
 * Send Invoice Email to Customer
 * Can accept pre‑rendered HTML or build it from data
 */
function sendInvoiceEmail(email, orderNumber, customerName, totalAmount, items, invoiceHtml) {
  const subject = `Invoice ${orderNumber} - ${CONFIG.APP_NAME}`;
  
  // If the client sent ready‑made HTML, use it (recommended)
  let htmlBody = invoiceHtml;
  
  if (!htmlBody) {
    // Fallback: build simple invoice HTML from data
    const itemsList = items.map(item => `<li>${item}</li>`).join('');
    htmlBody = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Invoice ${orderNumber}</h2>
        <p>Halo ${customerName},</p>
        <p>Terima kasih atas pesanan Anda. Berikut detailnya:</p>
        <ul>${itemsList}</ul>
        <p><strong>Total: Rp ${totalAmount.toLocaleString('id-ID')}</strong></p>
        <p>Invoice lengkap terlampir di dashboard Anda.</p>
      </div>
    `;
  }

  return sendEmail(email, subject, htmlBody);
}

/**
 * Send Invoice Copy to Owner - Clean Table Version
 */
function sendInvoiceCopyToOwner(ownerEmail, orderNumber, customerName, totalAmount, items, invoiceHtml) {
  const subject = `Salinan Invoice - ${orderNumber}`;
  
  // Build items table rows
  let itemsRows = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    itemsRows += `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 8px; text-align: left;">${escapeHtml(item.name)}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">Rp ${formatCurrency(item.price)}</td>
        <td style="padding: 12px 8px; text-align: right;">Rp ${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `;
  }
  
  // Build total rows (subtotal, tax, service, grand total)
  // Note: we need subtotal, tax, service from order totals – but the frontend only sent totalAmount and items.
  // For a complete invoice we also need subtotal, tax, service charge. Since frontend sends totalAmount only,
  // we'll assume items total = subtotal, and tax/service were added. Better to calculate from items.
  // But to keep it simple, we'll use the frontend's totalAmount and derive a plausible subtotal.
  // A complete fix would have the frontend send subtotal, tax_amount, service_charge_amount.
  // For now, we'll just show the grand total.
  
  const grandTotal = totalAmount;
  // We'll display only grand total to avoid missing data.
  // If you want full breakdown, modify frontend to send those fields.
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${orderNumber}</title>
      <style>
        @media only screen and (max-width: 600px) {
          table, tbody, tr, td { display: block; width: 100%; }
          td { text-align: left !important; padding: 8px !important; }
          .header { text-align: center; }
        }
      </style>
    </head>
    <body style="margin:0; padding:20px; font-family: Arial, Helvetica, sans-serif; background:#f4f4f4;">
      <div style="max-width:700px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: #1e3a8a; padding: 24px 20px; text-align: center;">
          <h1 style="margin:0; color:#ffffff; font-size:24px;">${CONFIG.APP_NAME}</h1>
          <p style="margin:8px 0 0; color:#bfdbfe;">Invoice Pesanan</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 24px 20px;">
          <!-- Order info -->
          <div style="margin-bottom: 24px;">
            <h2 style="margin:0 0 8px; font-size:20px; color:#111827;">Invoice ${orderNumber}</h2>
            <p style="margin:4px 0; color:#4b5563;">${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
          
          <!-- Customer info -->
          <div style="background:#f9fafb; padding:16px; border-radius:8px; margin-bottom:24px;">
            <p style="margin:0 0 8px; font-weight:bold; color:#1f2937;">Informasi Pelanggan</p>
            <p style="margin:4px 0;">Nama: ${escapeHtml(customerName) || '-'}</p>
            <p style="margin:4px 0;">Email: ${escapeHtml(ownerEmail)} (owner)</p>
          </div>
          
          <!-- Items table -->
          <table style="width:100%; border-collapse: collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
            <thead style="background:#f3f4f6;">
              <tr>
                <th style="padding:12px 8px; text-align:left; font-size:14px; font-weight:600; color:#374151;">Item</th>
                <th style="padding:12px 8px; text-align:center; font-size:14px; font-weight:600; color:#374151;">Qty</th>
                <th style="padding:12px 8px; text-align:right; font-size:14px; font-weight:600; color:#374151;">Harga</th>
                <th style="padding:12px 8px; text-align:right; font-size:14px; font-weight:600; color:#374151;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <!-- Total -->
          <div style="margin-top: 24px; text-align: right;">
            <div style="background:#f8fafc; padding:16px; border-radius:8px; display:inline-block; min-width:250px;">
              <table style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding:6px; text-align:left; font-weight:bold;">Total</td>
                  <td style="padding:6px; text-align:right; font-size:20px; font-weight:bold; color:#1e3a8a;">Rp ${formatCurrency(grandTotal)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Notes if any -->
          ${invoiceHtml && invoiceHtml.includes('Catatan') ? '<p style="margin-top:24px; padding:12px; background:#fef9c3; border-radius:8px; font-size:14px;"><strong>Catatan:</strong> Lihat lampiran untuk detail lengkap.</p>' : ''}
        </div>
        
        <!-- Footer -->
        <div style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
          <p>Email ini dikirim otomatis oleh ${CONFIG.APP_NAME}. Terima kasih.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(ownerEmail, subject, htmlBody);
}

// Helper: escape HTML to prevent injection
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper: format currency
function formatCurrency(amount) {
  return amount.toLocaleString('id-ID');
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
