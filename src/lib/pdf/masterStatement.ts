import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InterestRecord, Person, Transaction, Repayment } from '../../types';
import { formatINRforPDF, formatDate, formatMonth } from '../utils';
import { format, startOfMonth } from 'date-fns';

export interface MasterStatementOptions {
  fromDate: Date;
  toDate: Date;
  persons: Person[];
  transactions: Transaction[];
  repayments: Repayment[];
  interestRecords: InterestRecord[];
  userName: string;
  userEmail?: string;
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

function checkPageBreak(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionBanner(
  doc: jsPDF,
  title: string,
  subtitle: string,
  y: number,
  fillRgb: [number, number, number],
  textRgb: [number, number, number],
  marginL: number,
  pageWidth: number,
  marginR: number,
): number {
  doc.setFillColor(...fillRgb);
  doc.rect(0, y - 5, pageWidth, 14, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textRgb);
  doc.text(title, marginL, y + 3);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textRgb[0] + 30, textRgb[1] + 30, textRgb[2] + 30);
  doc.text(subtitle, marginL, y + 8);
  doc.setTextColor(0, 0, 0);
  return y + 16;
}

function personBand(
  doc: jsPDF,
  person: Person | undefined,
  color: [number, number, number],
  bgRgb: [number, number, number],
  y: number,
  marginL: number,
  pageWidth: number,
  marginR: number,
): number {
  doc.setFillColor(...bgRgb);
  doc.rect(marginL - 2, y - 4, pageWidth - marginL - marginR + 4, 11, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(person?.name ?? 'Unknown', marginL, y + 3);
  if (person?.phone) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Ph: ${person.phone}`, pageWidth - marginR, y + 3, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
  return y + 13;
}

function renderTxInterestBlock(
  doc: jsPDF,
  tx: Transaction,
  txInterest: InterestRecord[],
  txRepayments: Repayment[],
  y: number,
  marginL: number,
  marginR: number,
  accentColor: [number, number, number],
): number {
  const indentL = marginL + 4;
  const pageWidth = doc.internal.pageSize.width;

  y = checkPageBreak(doc, y, 30 + txInterest.length * 7 + txRepayments.length * 7);

  // Transaction header line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentColor);
  const txHeader = `Txn #${tx.id.slice(-6).toUpperCase()}  |  Original: ${formatINRforPDF(tx.originalAmount)}  |  Rate: ${tx.interestRate}%/mo  |  Started: ${formatDate(tx.startDate)}  |  Status: ${tx.status === 'active' ? 'Active' : 'Settled'}`;
  doc.text(txHeader, indentL, y);
  doc.setTextColor(0, 0, 0);
  y += 5;

  if (tx.status === 'settled' && tx.settledDate) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Settled on ${formatDate(tx.settledDate)} for ${formatINRforPDF(tx.settledAmount ?? 0)}`, indentL, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  // Interest records table
  if (txInterest.length > 0) {
    autoTable(doc as AutoTableDoc, {
      startY: y,
      head: [['Month', 'Opening Principal', 'Rate', 'Interest', 'Pro-rated', 'Status']],
      body: txInterest.map(r => [
        formatMonth(r.month),
        formatINRforPDF(r.principalAtMonth),
        `${tx.interestRate}%`,
        formatINRforPDF(r.interestAmount),
        r.isProRated ? 'Yes' : 'No',
        r.isPaid ? 'PAID' : 'UNPAID',
      ]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontSize: 7.5 },
      columnStyles: {
        1: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = data.cell.text[0] === 'PAID' ? [22, 163, 74] : [220, 38, 38];
        }
      },
      margin: { left: indentL, right: marginR },
    });
    y = (doc as AutoTableDoc).lastAutoTable.finalY + 3;
  }

  // Repayments table (in period)
  if (txRepayments.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text(`Repayments (${txRepayments.length}):`, indentL, y);
    y += 3;
    autoTable(doc as AutoTableDoc, {
      startY: y,
      head: [['Date', 'Amount', 'Notes']],
      body: txRepayments.map(r => [formatDate(r.date), formatINRforPDF(r.amount), r.notes ?? '—']),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 7.5 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: indentL + 6, right: marginR },
    });
    y = (doc as AutoTableDoc).lastAutoTable.finalY + 3;
  }

  // Tx subtotal
  const txInterestTotal = txInterest.reduce((s, r) => s + r.interestAmount, 0);
  const txRepTotal = txRepayments.reduce((s, r) => s + r.amount, 0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentColor);
  doc.text(
    `Interest total: ${formatINRforPDF(txInterestTotal)}   Repayments total: ${formatINRforPDF(txRepTotal)}`,
    indentL,
    y,
  );
  doc.setTextColor(0, 0, 0);

  // Separator line between transactions
  doc.setDrawColor(220, 220, 220);
  doc.line(indentL, y + 3, pageWidth - marginR, y + 3);
  return y + 7;
}

function buildDoc(opts: MasterStatementOptions): jsPDF {
  const { fromDate, toDate, persons, transactions, repayments, interestRecords, userName, userEmail } = opts;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const marginL = 14;
  const marginR = 14;

  const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const fromLabel = formatDate(fromDate);
  const toLabel = formatDate(toDate);
  const periodLabel = `${fromLabel} to ${toLabel}`;

  const fromMonth = format(startOfMonth(fromDate), 'yyyy-MM');
  const toMonth = format(startOfMonth(toDate), 'yyyy-MM');

  // Filter: transactions active at any point during the period
  const periodTxs = transactions.filter(tx => {
    const started = tx.startDate <= toDate;
    const liveInPeriod = tx.status === 'active' || (tx.settledDate != null && tx.settledDate >= fromDate);
    return started && liveInPeriod;
  });
  const periodTxIds = new Set(periodTxs.map(t => t.id));

  const periodRepayments = repayments.filter(r => r.date >= fromDate && r.date <= toDate && periodTxIds.has(r.transactionId));
  const periodInterest = interestRecords.filter(r => r.month >= fromMonth && r.month <= toMonth && periodTxIds.has(r.transactionId));

  const borrowTxs = periodTxs.filter(t => t.type === 'borrow');
  const lendTxs = periodTxs.filter(t => t.type === 'lend');
  const borrowInterest = periodInterest.filter(r => r.type === 'borrow');
  const lendInterest = periodInterest.filter(r => r.type === 'lend');
  const borrowRepayments = periodRepayments.filter(r => {
    const tx = transactions.find(t => t.id === r.transactionId);
    return tx?.type === 'borrow';
  });
  const lendRepayments = periodRepayments.filter(r => {
    const tx = transactions.find(t => t.id === r.transactionId);
    return tx?.type === 'lend';
  });

  // Aggregate numbers
  const totalBorrowPrincipal = borrowTxs.filter(t => t.status === 'active').reduce((s, t) => s + t.currentPrincipal, 0);
  const totalLendPrincipal = lendTxs.filter(t => t.status === 'active').reduce((s, t) => s + t.currentPrincipal, 0);
  const totalInterestPayable = borrowInterest.reduce((s, r) => s + r.interestAmount, 0);
  const totalInterestReceivable = lendInterest.reduce((s, r) => s + r.interestAmount, 0);
  const totalInterestPaidOut = borrowInterest.filter(r => r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const totalInterestPaidIn = lendInterest.filter(r => r.isPaid).reduce((s, r) => s + r.interestAmount, 0);
  const totalRepaymentsMade = borrowRepayments.reduce((s, r) => s + r.amount, 0);
  const totalRepaymentsReceived = lendRepayments.reduce((s, r) => s + r.amount, 0);

  // ── HEADER BAND ──────────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 6, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MoneyFlow', 14, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Master Statement', 14, 22);
  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 255);
  doc.text(`Period: ${periodLabel}`, 14, 30);
  doc.setTextColor(150, 170, 220);
  doc.text(`Generated: ${generatedAt}`, pageWidth - marginR, 30, { align: 'right' });

  // ── ACCOUNT HOLDER BAR ───────────────────────────────────────────────────────
  doc.setFillColor(239, 246, 255);
  doc.rect(0, 40, pageWidth, 14, 'F');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder: ${userName}`, marginL, 49);
  if (userEmail) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${userEmail}`, pageWidth - marginR, 49, { align: 'right' });
  }

  let y = 62;
  doc.setTextColor(0, 0, 0);

  // ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('EXECUTIVE SUMMARY', marginL, y);
  y += 4;
  doc.setTextColor(0, 0, 0);

  const netInterestPosition = totalInterestReceivable - totalInterestPayable;

  autoTable(doc as AutoTableDoc, {
    startY: y,
    head: [['Metric', 'Amount']],
    body: [
      ['Active Borrowings — Outstanding Principal', formatINRforPDF(totalBorrowPrincipal)],
      ['Active Lendings — Outstanding Principal', formatINRforPDF(totalLendPrincipal)],
      ['', ''],
      [`Total Interest Payable (${borrowTxs.length} transactions)`, formatINRforPDF(totalInterestPayable)],
      ['  — Already Paid', formatINRforPDF(totalInterestPaidOut)],
      ['  — Unpaid / Due', formatINRforPDF(totalInterestPayable - totalInterestPaidOut)],
      ['', ''],
      [`Total Interest Receivable (${lendTxs.length} transactions)`, formatINRforPDF(totalInterestReceivable)],
      ['  — Collected', formatINRforPDF(totalInterestPaidIn)],
      ['  — Uncollected / Due', formatINRforPDF(totalInterestReceivable - totalInterestPaidIn)],
      ['', ''],
      ['Total Repayments Made (Principal)', formatINRforPDF(totalRepaymentsMade)],
      ['Total Repayments Received (Principal)', formatINRforPDF(totalRepaymentsReceived)],
      ['', ''],
      ['NET INTEREST POSITION (Receivable − Payable)', formatINRforPDF(netInterestPosition)],
    ],
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 14) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = netInterestPosition >= 0 ? [22, 163, 74] : [220, 38, 38];
      }
    },
    margin: { left: marginL, right: marginR },
  });
  y = (doc as AutoTableDoc).lastAutoTable.finalY + 8;

  // ── ALL TRANSACTIONS OVERVIEW ─────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`ALL TRANSACTIONS IN PERIOD  (${periodTxs.length} total)`, marginL, y);
  y += 5;
  doc.setTextColor(0, 0, 0);

  if (periodTxs.length > 0) {
    autoTable(doc as AutoTableDoc, {
      startY: y,
      head: [['Person', 'Type', 'Original Amt', 'Rate', 'Start Date', 'Status', 'Current Principal']],
      body: periodTxs
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .map(tx => {
          const person = persons.find(p => p.id === tx.personId);
          return [
            person?.name ?? 'Unknown',
            tx.type === 'borrow' ? 'BORROW' : 'LEND',
            formatINRforPDF(tx.originalAmount),
            `${tx.interestRate}%/mo`,
            formatDate(tx.startDate),
            tx.status === 'active' ? 'Active' : 'Settled',
            formatINRforPDF(tx.currentPrincipal),
          ];
        }),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5 },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.textColor = data.cell.text[0] === 'BORROW' ? [220, 38, 38] : [22, 163, 74];
        }
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = data.cell.text[0] === 'Active' ? [37, 99, 235] : [100, 100, 100];
        }
      },
      margin: { left: marginL, right: marginR },
    });
    y = (doc as AutoTableDoc).lastAutoTable.finalY + 8;
  }

  // ── SECTION 1: BORROWINGS ─────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 6;

  y = sectionBanner(
    doc,
    'SECTION 1: BORROWINGS — Money I Borrowed',
    'Detailed breakdown by person and transaction for all borrowings in the period',
    y,
    [254, 242, 242],
    [153, 27, 27],
    marginL,
    pageWidth,
    marginR,
  );

  if (borrowTxs.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No borrowing transactions in this period.', marginL, y);
    y += 10;
    doc.setTextColor(0, 0, 0);
  } else {
    // Group borrowings by person
    const borrowByPerson = borrowTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
      acc[tx.personId] = acc[tx.personId] ?? [];
      acc[tx.personId].push(tx);
      return acc;
    }, {});

    for (const [personId, ptxs] of Object.entries(borrowByPerson)) {
      const person = persons.find(p => p.id === personId);
      y = checkPageBreak(doc, y, 25);
      y = personBand(doc, person, [153, 27, 27], [254, 242, 242], y, marginL, pageWidth, marginR);

      let personInterestTotal = 0;
      let personRepTotal = 0;

      for (const tx of ptxs) {
        const txInterest = borrowInterest.filter(r => r.transactionId === tx.id).sort((a, b) => a.month.localeCompare(b.month));
        const txRep = borrowRepayments.filter(r => r.transactionId === tx.id).sort((a, b) => a.date.getTime() - b.date.getTime());
        personInterestTotal += txInterest.reduce((s, r) => s + r.interestAmount, 0);
        personRepTotal += txRep.reduce((s, r) => s + r.amount, 0);
        y = renderTxInterestBlock(doc, tx, txInterest, txRep, y, marginL, marginR, [220, 38, 38]);
      }

      // Person total row
      y = checkPageBreak(doc, y, 12);
      doc.setFillColor(254, 226, 226);
      doc.rect(marginL - 2, y - 3, pageWidth - marginL - marginR + 4, 10, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(153, 27, 27);
      doc.text(
        `${person?.name ?? 'Unknown'} Total — Interest: ${formatINRforPDF(personInterestTotal)}   Repayments: ${formatINRforPDF(personRepTotal)}`,
        marginL,
        y + 3,
      );
      doc.setTextColor(0, 0, 0);
      y += 14;
    }

    // Grand total — borrowings
    y = checkPageBreak(doc, y, 14);
    doc.setFillColor(220, 38, 38);
    doc.rect(marginL - 2, y - 3, pageWidth - marginL - marginR + 4, 11, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `TOTAL INTEREST PAYABLE: ${formatINRforPDF(totalInterestPayable)}   (Paid: ${formatINRforPDF(totalInterestPaidOut)}   Unpaid: ${formatINRforPDF(totalInterestPayable - totalInterestPaidOut)})`,
      marginL,
      y + 4,
    );
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  // ── SECTION 2: LENDINGS ───────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 6;

  y = sectionBanner(
    doc,
    'SECTION 2: LENDINGS — Money I Lent',
    'Detailed breakdown by person and transaction for all lendings in the period',
    y,
    [240, 253, 244],
    [20, 83, 45],
    marginL,
    pageWidth,
    marginR,
  );

  if (lendTxs.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No lending transactions in this period.', marginL, y);
    y += 10;
    doc.setTextColor(0, 0, 0);
  } else {
    const lendByPerson = lendTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
      acc[tx.personId] = acc[tx.personId] ?? [];
      acc[tx.personId].push(tx);
      return acc;
    }, {});

    for (const [personId, ptxs] of Object.entries(lendByPerson)) {
      const person = persons.find(p => p.id === personId);
      y = checkPageBreak(doc, y, 25);
      y = personBand(doc, person, [20, 83, 45], [240, 253, 244], y, marginL, pageWidth, marginR);

      let personInterestTotal = 0;
      let personRepTotal = 0;

      for (const tx of ptxs) {
        const txInterest = lendInterest.filter(r => r.transactionId === tx.id).sort((a, b) => a.month.localeCompare(b.month));
        const txRep = lendRepayments.filter(r => r.transactionId === tx.id).sort((a, b) => a.date.getTime() - b.date.getTime());
        personInterestTotal += txInterest.reduce((s, r) => s + r.interestAmount, 0);
        personRepTotal += txRep.reduce((s, r) => s + r.amount, 0);
        y = renderTxInterestBlock(doc, tx, txInterest, txRep, y, marginL, marginR, [22, 163, 74]);
      }

      // Person total row
      y = checkPageBreak(doc, y, 12);
      doc.setFillColor(220, 252, 231);
      doc.rect(marginL - 2, y - 3, pageWidth - marginL - marginR + 4, 10, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 83, 45);
      doc.text(
        `${person?.name ?? 'Unknown'} Total — Interest: ${formatINRforPDF(personInterestTotal)}   Repayments: ${formatINRforPDF(personRepTotal)}`,
        marginL,
        y + 3,
      );
      doc.setTextColor(0, 0, 0);
      y += 14;
    }

    // Grand total — lendings
    y = checkPageBreak(doc, y, 14);
    doc.setFillColor(22, 163, 74);
    doc.rect(marginL - 2, y - 3, pageWidth - marginL - marginR + 4, 11, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `TOTAL INTEREST RECEIVABLE: ${formatINRforPDF(totalInterestReceivable)}   (Collected: ${formatINRforPDF(totalInterestPaidIn)}   Uncollected: ${formatINRforPDF(totalInterestReceivable - totalInterestPaidIn)})`,
      marginL,
      y + 4,
    );
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  // ── SECTION 3: CHRONOLOGICAL ACTIVITY LOG ────────────────────────────────────
  interface ActivityEvent {
    date: Date;
    dateKey: string;
    kind: 'repayment_out' | 'repayment_in' | 'txn_started' | 'txn_settled';
    description: string;
    amount: number;
  }

  const events: ActivityEvent[] = [];

  for (const r of periodRepayments) {
    const tx = transactions.find(t => t.id === r.transactionId);
    if (!tx) continue;
    const person = persons.find(p => p.id === r.personId);
    events.push({
      date: r.date,
      dateKey: format(r.date, 'yyyy-MM-dd'),
      kind: tx.type === 'borrow' ? 'repayment_out' : 'repayment_in',
      description: tx.type === 'borrow'
        ? `Paid to ${person?.name ?? 'Unknown'}${r.notes ? ` — ${r.notes}` : ''}`
        : `Received from ${person?.name ?? 'Unknown'}${r.notes ? ` — ${r.notes}` : ''}`,
      amount: r.amount,
    });
  }

  for (const tx of periodTxs) {
    const person = persons.find(p => p.id === tx.personId);
    if (tx.startDate >= fromDate && tx.startDate <= toDate) {
      events.push({
        date: tx.startDate,
        dateKey: format(tx.startDate, 'yyyy-MM-dd'),
        kind: 'txn_started',
        description: `${tx.type === 'borrow' ? 'Borrowed from' : 'Lent to'} ${person?.name ?? 'Unknown'} @ ${tx.interestRate}%/mo${tx.notes ? ` — ${tx.notes}` : ''}`,
        amount: tx.originalAmount,
      });
    }
    if (tx.settledDate && tx.settledDate >= fromDate && tx.settledDate <= toDate) {
      events.push({
        date: tx.settledDate,
        dateKey: format(tx.settledDate, 'yyyy-MM-dd'),
        kind: 'txn_settled',
        description: `${tx.type === 'borrow' ? 'Settled borrowing with' : 'Settled lending with'} ${person?.name ?? 'Unknown'}`,
        amount: tx.settledAmount ?? 0,
      });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (events.length > 0) {
    y = checkPageBreak(doc, y, 30);
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageWidth - marginR, y);
    y += 6;

    y = sectionBanner(
      doc,
      `CHRONOLOGICAL ACTIVITY LOG — ${periodLabel}`,
      'All financial events ordered by date',
      y,
      [239, 246, 255],
      [30, 64, 175],
      marginL,
      pageWidth,
      marginR,
    );

    const byDay = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
      acc[e.dateKey] = acc[e.dateKey] ?? [];
      acc[e.dateKey].push(e);
      return acc;
    }, {});

    for (const [dateKey, dayEvents] of Object.entries(byDay).sort()) {
      y = checkPageBreak(doc, y, 20 + dayEvents.length * 8);

      const dateLabel = format(new Date(dateKey + 'T12:00:00'), 'dd MMMM yyyy, EEEE');
      doc.setFontSize(8.5);
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
            : e.kind === 'txn_started' ? 'Transaction Started'
            : 'Transaction Settled',
          e.description,
          formatINRforPDF(e.amount),
        ]),
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontSize: 7.5 },
        columnStyles: { 0: { cellWidth: 38 }, 2: { halign: 'right', cellWidth: 32 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const kind = dayEvents[data.row.index]?.kind;
            if (kind === 'repayment_out') data.cell.styles.textColor = [220, 38, 38];
            else if (kind === 'repayment_in') data.cell.styles.textColor = [22, 163, 74];
            else if (kind === 'txn_started') data.cell.styles.textColor = [37, 99, 235];
            else data.cell.styles.textColor = [100, 100, 100];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: marginL, right: marginR },
      });
      y = (doc as AutoTableDoc).lastAutoTable.finalY + 6;
      doc.setTextColor(0, 0, 0);
    }
  }

  // ── PERIOD SUMMARY ────────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 70);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('PERIOD SUMMARY', marginL, y);
  y += 5;
  doc.setTextColor(0, 0, 0);

  autoTable(doc as AutoTableDoc, {
    startY: y,
    head: [['Summary Item', 'Amount']],
    body: [
      [`Active Borrowings — Current Outstanding`, formatINRforPDF(totalBorrowPrincipal)],
      [`Active Lendings — Current Outstanding`, formatINRforPDF(totalLendPrincipal)],
      ['', ''],
      [`Interest Payable (${borrowTxs.length} transactions across ${Object.keys(borrowTxs.reduce<Record<string,boolean>>((a,t)=>({...a,[t.personId]:true}),{})).length} persons)`, formatINRforPDF(totalInterestPayable)],
      [`  Paid`, formatINRforPDF(totalInterestPaidOut)],
      [`  Unpaid / Due`, formatINRforPDF(totalInterestPayable - totalInterestPaidOut)],
      [`Interest Receivable (${lendTxs.length} transactions across ${Object.keys(lendTxs.reduce<Record<string,boolean>>((a,t)=>({...a,[t.personId]:true}),{})).length} persons)`, formatINRforPDF(totalInterestReceivable)],
      [`  Collected`, formatINRforPDF(totalInterestPaidIn)],
      [`  Uncollected / Due`, formatINRforPDF(totalInterestReceivable - totalInterestPaidIn)],
      ['', ''],
      [`Principal Repaid by Me`, formatINRforPDF(totalRepaymentsMade)],
      [`Principal Collected by Me`, formatINRforPDF(totalRepaymentsReceived)],
      ['', ''],
      ['NET INTEREST POSITION (Receivable − Payable)', formatINRforPDF(netInterestPosition)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 13) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = netInterestPosition >= 0 ? [22, 163, 74] : [220, 38, 38];
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
      `MoneyFlow  •  Master Statement  •  ${periodLabel}  •  ${userName}  •  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' },
    );
  }

  return doc;
}

export async function generatePDFMasterStatement(opts: MasterStatementOptions): Promise<void> {
  const doc = buildDoc(opts);
  const from = format(opts.fromDate, 'yyyy-MM-dd');
  const to = format(opts.toDate, 'yyyy-MM-dd');
  doc.save(`MoneyFlow_MasterStatement_${from}_to_${to}.pdf`);
}