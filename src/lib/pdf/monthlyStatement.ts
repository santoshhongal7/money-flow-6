import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InterestRecord, Person, Transaction, Repayment } from '../../types';
import { formatINRforPDF, formatMonth, formatDate } from '../utils';
import { format } from 'date-fns';

interface GenerateOptions {
  month: string; // 'YYYY-MM'
  records: InterestRecord[];
  persons: Person[];
  transactions: Transaction[];
  repayments: Repayment[];
  userName: string;
  userEmail?: string;
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

function isInMonth(date: Date, month: string): boolean {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0, 23, 59, 59);
  return date >= start && date <= end;
}

function sectionHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  y: number,
  color: [number, number, number],
  marginL: number,
): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(title, marginL, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(subtitle, marginL, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function checkPageBreak(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function renderTransactionBlock(
  doc: jsPDF,
  record: InterestRecord,
  tx: Transaction,
  person: Person | undefined,
  monthRepayments: Repayment[],
  y: number,
  marginL: number,
  marginR: number,
  accentHead: [number, number, number],
): number {
  const pageWidth = doc.internal.pageSize.width;
  const txRepayments = monthRepayments.filter(r => r.transactionId === tx.id);

  y = checkPageBreak(doc, y, 35 + txRepayments.length * 8);

  // Transaction info line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const txLine = `Txn: Original ${formatINRforPDF(tx.originalAmount)}  |  Started: ${formatDate(tx.startDate)}  |  Rate: ${tx.interestRate}%/mo  |  Status: ${tx.status === 'active' ? 'Active' : 'Settled'}`;
  doc.text(txLine, marginL + 4, y);
  y += 5;

  const headFill = accentHead.slice(0, 3) as [number, number, number];

  autoTable(doc as AutoTableDoc, {
    startY: y,
    head: [['Opening Principal', 'Rate', 'Interest Due', 'Pro-rated', 'Payment Status']],
    body: [[
      formatINRforPDF(record.principalAtMonth),
      `${tx.interestRate}%/mo`,
      formatINRforPDF(record.interestAmount),
      record.isProRated ? 'Yes (partial month)' : 'No',
      record.isPaid ? 'PAID' : 'UNPAID',
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: headFill, textColor: [255, 255, 255] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = data.cell.text[0] === 'PAID' ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginL + 4, right: marginR },
  });
  y = (doc as AutoTableDoc).lastAutoTable.finalY + 3;

  if (txRepayments.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text(`  Repayments this month (${txRepayments.length}):`, marginL + 4, y);
    y += 3;

    autoTable(doc as AutoTableDoc, {
      startY: y,
      head: [['Date', 'Amount Paid', 'Notes']],
      body: txRepayments.map(r => [
        formatDate(r.date),
        formatINRforPDF(r.amount),
        r.notes ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: marginL + 10, right: marginR },
    });
    y = (doc as AutoTableDoc).lastAutoTable.finalY + 3;
  }

  doc.setTextColor(0, 0, 0);
  return y + 2;
}

function buildDoc(opts: GenerateOptions): jsPDF {
  const { month, records, persons, transactions, repayments, userName, userEmail } = opts;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthLabel = formatMonth(month);
  const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const pageWidth = doc.internal.pageSize.width;
  const marginL = 14;
  const marginR = 14;

  const monthRepayments = repayments.filter(r => isInMonth(r.date, month));

  const borrowRecords = records.filter(r => r.type === 'borrow');
  const lendRecords = records.filter(r => r.type === 'lend');

  const activeBorrowTxs = transactions.filter(t => t.type === 'borrow' && t.status === 'active');
  const activeLendTxs = transactions.filter(t => t.type === 'lend' && t.status === 'active');
  const totalBorrowed = activeBorrowTxs.reduce((s, t) => s + t.currentPrincipal, 0);
  const totalLent = activeLendTxs.reduce((s, t) => s + t.currentPrincipal, 0);
  const interestPayable = borrowRecords.reduce((s, r) => s + r.interestAmount, 0);
  const interestReceivable = lendRecords.reduce((s, r) => s + r.interestAmount, 0);

  const repMadeAmt = monthRepayments
    .filter(r => transactions.find(t => t.id === r.transactionId)?.type === 'borrow')
    .reduce((s, r) => s + r.amount, 0);
  const repReceivedAmt = monthRepayments
    .filter(r => transactions.find(t => t.id === r.transactionId)?.type === 'lend')
    .reduce((s, r) => s + r.amount, 0);

  // ── HEADER BAND ──────────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MoneyFlow', marginL, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Account Statement', marginL, 22);
  doc.text(`Period: ${monthLabel}`, marginL, 29);
  doc.setFontSize(8);
  doc.text(`Generated: ${generatedAt}`, pageWidth - marginR, 29, { align: 'right' });

  // ── ACCOUNT HOLDER BAR ───────────────────────────────────────────────────────
  doc.setFillColor(239, 246, 255);
  doc.rect(0, 36, pageWidth, 14, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder: ${userName}`, marginL, 44);
  if (userEmail) {
    doc.text(`Email: ${userEmail}`, pageWidth - marginR, 44, { align: 'right' });
  }

  let y = 58;
  doc.setTextColor(0, 0, 0);

  // ── ACCOUNT OVERVIEW ─────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('ACCOUNT OVERVIEW', marginL, y);
  y += 4;
  doc.setTextColor(0, 0, 0);

  autoTable(doc as AutoTableDoc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: [
      ['Total Active Borrowings (Current Principal)', formatINRforPDF(totalBorrowed)],
      ['Total Active Lendings (Current Principal)', formatINRforPDF(totalLent)],
      [`Interest Payable — ${monthLabel}`, formatINRforPDF(interestPayable)],
      [`Interest Receivable — ${monthLabel}`, formatINRforPDF(interestReceivable)],
      [`Repayments Made — ${monthLabel}`, formatINRforPDF(repMadeAmt)],
      [`Repayments Received — ${monthLabel}`, formatINRforPDF(repReceivedAmt)],
      ['Net Interest Position (Receivable − Payable)', formatINRforPDF(interestReceivable - interestPayable)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 6) {
        data.cell.styles.fontStyle = 'bold';
        const net = interestReceivable - interestPayable;
        data.cell.styles.textColor = net >= 0 ? [22, 163, 74] : [220, 38, 38];
      }
    },
    margin: { left: marginL, right: marginR },
  });

  y = (doc as AutoTableDoc).lastAutoTable.finalY + 8;

  // ── DIVIDER ───────────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 8;

  // ── SECTION 1: BORROWINGS ────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  y = sectionHeader(doc, 'SECTION 1: BORROWINGS — Money I Borrowed', 'Transactions where you borrowed money from others and owe interest', y, [185, 28, 28], marginL);

  if (borrowRecords.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No active borrowings with interest records for this month.', marginL, y);
    y += 10;
    doc.setTextColor(0, 0, 0);
  } else {
    const byPerson = borrowRecords.reduce<Record<string, InterestRecord[]>>((acc, r) => {
      acc[r.personId] = acc[r.personId] ?? [];
      acc[r.personId].push(r);
      return acc;
    }, {});

    for (const [personId, personRecords] of Object.entries(byPerson)) {
      const person = persons.find(p => p.id === personId);
      const personName = person?.name ?? 'Unknown';
      const personTotal = personRecords.reduce((s, r) => s + r.interestAmount, 0);

      y = checkPageBreak(doc, y, 20);

      // Person header band
      doc.setFillColor(254, 242, 242);
      doc.rect(marginL - 2, y - 4, pageWidth - marginL - marginR + 4, 10, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(personName, marginL, y + 2);
      if (person?.phone) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Ph: ${person.phone}`, pageWidth - marginR, y + 2, { align: 'right' });
      }
      y += 10;
      doc.setTextColor(0, 0, 0);

      for (const record of personRecords) {
        const tx = transactions.find(t => t.id === record.transactionId);
        if (!tx) continue;
        y = renderTransactionBlock(doc, record, tx, person, monthRepayments, y, marginL, marginR, [220, 38, 38]);
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(`  Total Interest Payable to ${personName} this month: ${formatINRforPDF(personTotal)}`, marginL, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    }

    y = checkPageBreak(doc, y, 14);
    doc.setFillColor(254, 226, 226);
    doc.rect(marginL - 2, y - 4, pageWidth - marginL - marginR + 4, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`TOTAL INTEREST PAYABLE THIS MONTH: ${formatINRforPDF(interestPayable)}`, marginL, y + 2);
    y += 14;
    doc.setTextColor(0, 0, 0);
  }

  // ── DIVIDER ───────────────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 14);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 8;

  // ── SECTION 2: LENDINGS ──────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  y = sectionHeader(doc, 'SECTION 2: LENDINGS — Money I Lent', 'Transactions where you lent money to others and are owed interest', y, [21, 128, 61], marginL);

  if (lendRecords.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No active lendings with interest records for this month.', marginL, y);
    y += 10;
    doc.setTextColor(0, 0, 0);
  } else {
    const byPerson = lendRecords.reduce<Record<string, InterestRecord[]>>((acc, r) => {
      acc[r.personId] = acc[r.personId] ?? [];
      acc[r.personId].push(r);
      return acc;
    }, {});

    for (const [personId, personRecords] of Object.entries(byPerson)) {
      const person = persons.find(p => p.id === personId);
      const personName = person?.name ?? 'Unknown';
      const personTotal = personRecords.reduce((s, r) => s + r.interestAmount, 0);

      y = checkPageBreak(doc, y, 20);

      doc.setFillColor(240, 253, 244);
      doc.rect(marginL - 2, y - 4, pageWidth - marginL - marginR + 4, 10, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61);
      doc.text(personName, marginL, y + 2);
      if (person?.phone) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Ph: ${person.phone}`, pageWidth - marginR, y + 2, { align: 'right' });
      }
      y += 10;
      doc.setTextColor(0, 0, 0);

      for (const record of personRecords) {
        const tx = transactions.find(t => t.id === record.transactionId);
        if (!tx) continue;
        y = renderTransactionBlock(doc, record, tx, person, monthRepayments, y, marginL, marginR, [22, 163, 74]);
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61);
      doc.text(`  Total Interest Receivable from ${personName} this month: ${formatINRforPDF(personTotal)}`, marginL, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    }

    y = checkPageBreak(doc, y, 14);
    doc.setFillColor(220, 252, 231);
    doc.rect(marginL - 2, y - 4, pageWidth - marginL - marginR + 4, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`TOTAL INTEREST RECEIVABLE THIS MONTH: ${formatINRforPDF(interestReceivable)}`, marginL, y + 2);
    y += 14;
    doc.setTextColor(0, 0, 0);
  }

  // ── SECTION 3: DAILY ACTIVITY LOG ────────────────────────────────────────────
  interface ActivityEvent {
    date: Date;
    dateKey: string;
    kind: 'repayment_out' | 'repayment_in' | 'txn_started';
    description: string;
    amount: number;
  }

  const events: ActivityEvent[] = [];

  for (const r of monthRepayments) {
    const tx = transactions.find(t => t.id === r.transactionId);
    if (!tx) continue;
    const person = persons.find(p => p.id === r.personId);
    const pName = person?.name ?? 'Unknown';
    const isBorrow = tx.type === 'borrow';
    events.push({
      date: r.date,
      dateKey: format(r.date, 'yyyy-MM-dd'),
      kind: isBorrow ? 'repayment_out' : 'repayment_in',
      description: isBorrow
        ? `Paid to ${pName}${r.notes ? ` — ${r.notes}` : ''}`
        : `Received from ${pName}${r.notes ? ` — ${r.notes}` : ''}`,
      amount: r.amount,
    });
  }

  for (const tx of transactions) {
    if (isInMonth(tx.startDate, month)) {
      const person = persons.find(p => p.id === tx.personId);
      const pName = person?.name ?? 'Unknown';
      events.push({
        date: tx.startDate,
        dateKey: format(tx.startDate, 'yyyy-MM-dd'),
        kind: 'txn_started',
        description: `${tx.type === 'borrow' ? 'Borrowed from' : 'Lent to'} ${pName} @ ${tx.interestRate}%/mo${tx.notes ? ` — ${tx.notes}` : ''}`,
        amount: tx.originalAmount,
      });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (events.length > 0) {
    y = checkPageBreak(doc, y, 20);
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageWidth - marginR, y);
    y += 8;

    y = sectionHeader(doc, `DAILY ACTIVITY LOG — ${monthLabel}`, 'Chronological record of all financial events during the month', y, [30, 64, 175], marginL);

    const byDay = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
      acc[e.dateKey] = acc[e.dateKey] ?? [];
      acc[e.dateKey].push(e);
      return acc;
    }, {});

    for (const [dateKey, dayEvents] of Object.entries(byDay).sort()) {
      y = checkPageBreak(doc, y, 20 + dayEvents.length * 8);

      const dateLabel = format(new Date(dateKey + 'T12:00:00'), 'dd MMMM yyyy, EEEE');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(dateLabel, marginL, y);
      y += 3;

      autoTable(doc as AutoTableDoc, {
        startY: y,
        head: [['Type', 'Description', 'Amount']],
        body: dayEvents.map(e => [
          e.kind === 'repayment_out' ? 'Repayment Made'
            : e.kind === 'repayment_in' ? 'Repayment Received'
            : 'Transaction Started',
          e.description,
          formatINRforPDF(e.amount),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
        columnStyles: { 0: { cellWidth: 38 }, 2: { halign: 'right', cellWidth: 32 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const kind = dayEvents[data.row.index]?.kind;
            if (kind === 'repayment_out') data.cell.styles.textColor = [220, 38, 38];
            else if (kind === 'repayment_in') data.cell.styles.textColor = [22, 163, 74];
            else data.cell.styles.textColor = [37, 99, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: marginL, right: marginR },
      });
      y = (doc as AutoTableDoc).lastAutoTable.finalY + 6;
      doc.setTextColor(0, 0, 0);
    }
  }

  // ── MONTH-END SUMMARY ────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 60);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('MONTH-END SUMMARY', marginL, y);
  y += 5;
  doc.setTextColor(0, 0, 0);

  const unpaidPayable = borrowRecords.filter(r => !r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const paidPayable = borrowRecords.filter(r => r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const uncollectedReceivable = lendRecords.filter(r => !r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const collectedReceivable = lendRecords.filter(r => r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const netPosition = interestReceivable - interestPayable;

  autoTable(doc as AutoTableDoc, {
    startY: y,
    head: [['Summary Item', 'Amount']],
    body: [
      ['Active Borrowings (Current Principal)', formatINRforPDF(totalBorrowed)],
      ['Active Lendings (Current Principal)', formatINRforPDF(totalLent)],
      ['', ''],
      [`Interest Payable — ${monthLabel} (Unpaid)`, formatINRforPDF(unpaidPayable)],
      [`Interest Payable — ${monthLabel} (Paid)`, formatINRforPDF(paidPayable)],
      [`Interest Receivable — ${monthLabel} (Uncollected)`, formatINRforPDF(uncollectedReceivable)],
      [`Interest Receivable — ${monthLabel} (Collected)`, formatINRforPDF(collectedReceivable)],
      ['', ''],
      ['Repayments Made This Month', formatINRforPDF(repMadeAmt)],
      ['Repayments Received This Month', formatINRforPDF(repReceivedAmt)],
      ['', ''],
      ['NET INTEREST POSITION (Receivable − Payable)', formatINRforPDF(netPosition)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 11) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = netPosition >= 0 ? [22, 163, 74] : [220, 38, 38];
      }
    },
    margin: { left: marginL, right: marginR },
  });

  // ── PER-PAGE FOOTER ────────────────────────────────────────────────────────
  const pageCount = (doc.internal as unknown as { pages: unknown[] }).pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
      `MoneyFlow  •  ${monthLabel} Statement  •  ${userName}  •  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' },
    );
  }

  return doc;
}

export async function generatePDFMonthlyStatement(opts: GenerateOptions): Promise<void> {
  const doc = buildDoc(opts);
  doc.save(`MoneyFlow_Statement_${opts.month}.pdf`);
}
