const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { batchId, fileType } = req.body; // fileType: 'bank' or 'tally'

    if (!batchId || !fileType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get batch details
    const batchResult = await pool.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const batch = batchResult.rows[0];

    // Get payments for this batch
    const paymentsResult = await pool.query(
      'SELECT * FROM payments WHERE batch_id = $1 ORDER BY id',
      [batchId]
    );

    const payments = paymentsResult.rows;

    let fileContent = '';
    let fileName = '';

    if (fileType === 'bank') {
      // Generate Kotak Mahindra Bank format (24 columns)
      fileContent = generateBankFile(batch, payments);
      fileName = `BANK_${batch.month}_${batch.year}.txt`;
    } else if (fileType === 'tally') {
      // Generate Tally journal format
      fileContent = generateTallyFile(batch, payments);
      fileName = `TALLY_${batch.month}_${batch.year}.txt`;
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Update batch status
    await pool.query(
      'UPDATE batches SET last_processed = NOW(), status = $1 WHERE id = $2',
      ['processed', batchId]
    );

    return res.status(200).json({
      success: true,
      fileName: fileName,
      content: fileContent,
      message: `${fileType.toUpperCase()} file generated successfully`,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
    });
  } catch (error) {
    console.error('File generation error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}

function generateBankFile(batch, payments) {
  let content = `PAYROLL BATCH: ${batch.name}\n`;
  content += `PERIOD: ${batch.month}/${batch.year}\n`;
  content += `GENERATED: ${new Date().toISOString()}\n`;
  content += `${'='.repeat(200)}\n\n`;

  // Header row with 24 columns
  const headers = [
    'Sr.No', 'Employee ID', 'Name', 'Bank Name', 'Account Number', 'IFSC Code',
    'Amount', 'Currency', 'Transaction Type', 'Beneficiary Name', 'Beneficiary Address',
    'City', 'State', 'PIN Code', 'Email', 'Mobile', 'Reference Number', 'Narration',
    'Remarks', 'Department', 'Cost Center', 'Payment Date', 'Status', 'Timestamp'
  ];

  content += headers.join('\t') + '\n';
  content += `${'-'.repeat(200)}\n`;

  // Payment rows
  payments.forEach((payment, index) => {
    const row = [
      (index + 1).toString(),
      payment.employee_id || '',
      payment.employee_name || 'Employee',
      'KOTAK MAHINDRA',
      payment.account_number || '',
      payment.ifsc_code || 'KKBK0000001',
      payment.amount.toString(),
      'INR',
      'NEFT',
      payment.employee_name || 'Employee',
      'Address',
      'City',
      'State',
      'PIN',
      payment.email || '',
      payment.mobile || '',
      `REF-${batch.id}-${index + 1}`,
      `Salary ${batch.month}/${batch.year}`,
      'Payroll Processing',
      'HR',
      'PAYROLL',
      new Date().toISOString().split('T')[0],
      'PENDING',
      new Date().toISOString()
    ];

    content += row.join('\t') + '\n';
  });

  content += `\n${'='.repeat(200)}\n`;
  content += `TOTAL RECORDS: ${payments.length}\n`;
  content += `TOTAL AMOUNT: ₹${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}\n`;

  return content;
}

function generateTallyFile(batch, payments) {
  let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  content += `<TALLY>\n`;
  content += `  <ENVELOPE>\n`;
  content += `    <HEADER>\n`;
  content += `      <TALLYREQUEST>ImportData</TALLYREQUEST>\n`;
  content += `    </HEADER>\n`;
  content += `    <BODY>\n`;
  content += `      <IMPORTDATA>\n`;

  // Create journal for salary payments
  content += `        <REQUESTDESC>\n`;
  content += `          <REPORTNAME>Journal</REPORTNAME>\n`;
  content += `          <STATICVARIABLES>\n`;
  content += `            <SVCURRENTCOMPANY>Company Name</SVCURRENTCOMPANY>\n`;
  content += `          </STATICVARIABLES>\n`;
  content += `        </REQUESTDESC>\n`;

  content += `        <RESPONSE>\n`;
  content += `          <VOUCHER>\n`;
  content += `            <DATE>${new Date().toISOString().split('T')[0]}</DATE>\n`;
  content += `            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>\n`;
  content += `            <REFERENCE>PAYROLL-${batch.month}-${batch.year}</REFERENCE>\n`;
  content += `            <NARRATION>Salary Payment for ${batch.month}/${batch.year}</NARRATION>\n`;

  content += `            <ALLLEDGERENTRIES>\n`;

  // Debit entry (Salary Expense)
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  content += `              <LEDGERENTRYTOTAL>\n`;
  content += `                <LEDGERNAME>Salary Expense</LEDGERNAME>\n`;
  content += `                <AMOUNT>${totalAmount.toFixed(2)}</AMOUNT>\n`;
  content += `                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
  content += `              </LEDGERENTRYTOTAL>\n`;

  // Credit entry (Bank)
  content += `              <LEDGERENTRYTOTAL>\n`;
  content += `                <LEDGERNAME>Bank Account</LEDGERNAME>\n`;
  content += `                <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>\n`;
  content += `                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
  content += `              </LEDGERENTRYTOTAL>\n`;

  content += `            </ALLLEDGERENTRIES>\n`;
  content += `          </VOUCHER>\n`;
  content += `        </RESPONSE>\n`;

  content += `      </IMPORTDATA>\n`;
  content += `    </BODY>\n`;
  content += `  </ENVELOPE>\n`;
  content += `</TALLY>\n`;

  return content;
}
