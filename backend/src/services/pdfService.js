/**
 * PDF Generation Service
 * Creates appointment confirmation PDFs with QR code.
 * QR encodes the appointment URL for quick status lookup.
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateAppointmentPDF = async (appointment, organization, branch, appointmentType) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/appointments/${appointment.refCode}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 130, margin: 1 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      // -- Header (compact) --
      doc.rect(0, 0, doc.page.width, 72).fill('#2563eb');
      doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold').text('QueueLess', 50, 20);
      doc.fontSize(9).font('Helvetica').text('Public Service, Fast Forward', 50, 46);

      // -- Org & Branch --
      doc.fill('#1e293b').fontSize(15).font('Helvetica-Bold').text(organization.name, 50, 90);
      doc.fontSize(10).font('Helvetica').fill('#64748b').text(branch.name + '  •  ' + branch.address, 50, 110);
      if (branch.phone) doc.text('Phone: ' + branch.phone, 50, 124);

      doc.moveTo(50, 142).lineTo(545, 142).stroke('#e2e8f0');

      // -- Title --
      doc.fill('#1e293b').fontSize(14).font('Helvetica-Bold').text('Appointment Confirmation', 50, 155);

      // -- Ref & Token boxes --
      doc.roundedRect(50, 178, 230, 58, 6).fill('#f0f9ff').stroke('#bfdbfe');
      doc.fill('#1e40af').fontSize(9).font('Helvetica').text('REFERENCE CODE', 65, 186);
      doc.fill('#1e293b').fontSize(16).font('Helvetica-Bold').text(appointment.refCode, 65, 202);

      doc.roundedRect(300, 178, 245, 58, 6).fill('#fefce8').stroke('#fde68a');
      doc.fill('#92400e').fontSize(9).font('Helvetica').text('TOKEN NUMBER', 315, 186);
      doc.fill('#1e293b').fontSize(24).font('Helvetica-Bold').text(`#${appointment.tokenNumber}`, 315, 198);

      // -- Detail rows --
      const details = [
        ['Service', appointmentType.nameNp ? `${appointmentType.name} (${appointmentType.nameNp})` : appointmentType.name],
        ['Room/Section', appointment.roomNo ? (appointment.roomNoNp ? `${appointment.roomNo} (${appointment.roomNoNp})` : appointment.roomNo) : 'N/A'],
        ['Mode', appointment.mode === 'virtual' ? 'Virtual (Online)' : 'In-Person'],
        ['Date', new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
        ['Time', `${appointment.startTime} - ${appointment.endTime}`],
        ['Duration', `${appointment.duration} minutes`],
        ['Status', appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)],
        ['Name', appointment.guestName || 'Registered User'],
      ];
      if (appointment.price > 0) details.push(['Price', `NPR ${appointment.price}`]);

      let y = 252;
      details.forEach(([label, value], i) => {
        doc.rect(50, y, 495, 24).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');
        doc.fill('#64748b').fontSize(9).font('Helvetica').text(label, 65, y + 7);
        doc.fill('#1e293b').fontSize(9).font('Helvetica-Bold').text(value, 240, y + 7);
        y += 24;
      });

      // -- QR Code --
      const qrY = y + 20;
      doc.fill('#1e293b').fontSize(11).font('Helvetica-Bold').text('Scan to View / Check Status', 50, qrY);
      doc.image(qrBuffer, 50, qrY + 16, { width: 100, height: 100 });
      doc.fill('#64748b').fontSize(8).font('Helvetica').text(qrUrl, 160, qrY + 40, { width: 300 });

      // -- Footer (on same page) --
      doc.fill('#94a3b8').fontSize(7).font('Helvetica')
        .text(
          `Generated on ${new Date().toLocaleString()} | QueueLess - Dynamic Appointment Booking System`,
          50, 760, { align: 'center', width: 495 }
        );

      doc.end();
    } catch (error) { reject(error); }
  });
};

module.exports = { generateAppointmentPDF };
