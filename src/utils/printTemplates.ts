import { Fyo, t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { ModelNameEnum } from 'models/types';
import { FieldTypeEnum, Schema, TargetField } from 'schemas/types';
import { getValueMapFromList } from 'utils/index';
import { TemplateFile } from 'utils/types';
import { showToast } from './interactive';
import { PrintValues } from './types';
import {
  getDocFromNameIfExistsElseNew,
  getSavePath,
  showExportInFolder,
} from './ui';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { Payment } from 'models/baseModels/Payment/Payment';

export type PrintTemplateHint = {
  [key: string]: string | PrintTemplateHint | PrintTemplateHint[];
};

export type PartyStatementRow = {
  date: string;
  typeLabel: string;
  reference: string;
  debit: string;
  credit: string;
  displayAmount?: string;
  debitNum?: number;
  creditNum?: number;
  schemaName?: string;
  runningBalance?: string;
  runningBalanceNum?: number;
  isOpeningRow?: boolean;
  details?: { item: string; description?: string; quantity: string; rate: string; amount: string }[];
};

export type PartyStatementPrintParams = {
  /** Main report title (e.g. كشف حساب) shown in center */
  title: string;
  partyName: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  partyPhone?: string;
  role?: 'Customer' | 'Supplier' | 'Both';
  /** Data URL for logo image when displayLogo and logo exist in PrintSettings */
  logoImageUrl?: string;
  rows: PartyStatementRow[];
  openingBalance?: number;
  closingBalance?: number;
  totalDebit?: number;
  totalCredit?: number;
  currentBalance?: number;
  dateRange?: { from: string; to: string };
  labels: Record<string, string>;
};

export function buildPartyStatementPrintHtml(params: PartyStatementPrintParams): string {
  const {
    title,
    partyName,
    companyName,
    companyAddress = '',
    companyPhone = '',
    partyPhone = '',
    logoImageUrl,
    rows,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    currentBalance,
    dateRange,
    labels,
    role = 'Customer',
  } = params;

  const debitTotal = totalDebit ?? rows.reduce((s, r) => s + (r.debitNum ?? 0), 0);
  const creditTotal = totalCredit ?? rows.reduce((s, r) => s + (r.creditNum ?? 0), 0);
  const opening = openingBalance ?? 0;
  const closing = closingBalance ?? opening + debitTotal - creditTotal;
  const liveBalance = currentBalance ?? closing;
  const formatNum = (n: number) =>
    (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatSignedNum = (n: number) => (n < 0 ? `-${formatNum(Math.abs(n))}` : formatNum(n));

  const lType = labels.type ?? 'Type';
  const lDate = labels.date ?? 'Date';
  const lAmount = labels.amountCol ?? labels.amount ?? 'Amount';
  const lRef = labels.reference ?? 'Reference';
  const lBalance = labels.balance ?? 'Balance';
  const lOpening = labels.openingBalance ?? 'Opening';
  const lClosing = labels.closingBalance ?? 'Closing';
  const lCurrent = labels.currentBalance ?? 'Current';
  const lDebit = labels.debit ?? 'Debit';
  const lCredit = labels.credit ?? 'Credit';

  const safeAttr = (s: string) => String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const logoHtml = logoImageUrl
    ? `<img src="${safeAttr(logoImageUrl)}" alt="" style="max-width:100px;max-height:70px;object-fit:contain;display:block;" />`
    : `<div style="width:100px;height:70px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">${escapeHtml(labels.logo ?? 'Logo')}</div>`;

  const th = (text: string) => `<th style="text-align:right;padding:0.4rem 0.5rem;border:1px solid #ccc;background:#e8e8e8;">${escapeHtml(text)}</th>`;
  const td = (text: string) => `<td style="padding:0.35rem 0.5rem;border:1px solid #ddd;">${escapeHtml(text)}</td>`;
  const tdNum = (text: string) => `<td style="padding:0.35rem 0.5rem;border:1px solid #ddd;text-align:right;">${escapeHtml(text)}</td>`;

  const colHeaders = th(lType) + th(lDate) + th(lRef) + th(lAmount) + th(lBalance);

  let tableRows = '';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const amountCol = r.displayAmount ?? (r.debit ? r.debit : r.credit);
    const runningCol = r.runningBalance ?? '';
    const rowBg = i % 2 === 0 ? '#fff' : '#f5f5f5';
    tableRows += `<tr style="background:${rowBg}">${td(r.typeLabel)}${td(r.date)}${td(r.reference ?? '')}${tdNum(amountCol)}${tdNum(runningCol)}</tr>`;
    if (r.details?.length) {
      for (const d of r.details) {
        const detailBg = rowBg === '#fff' ? '#fafafa' : '#f0f0f0';
        tableRows += `<tr style="background:${detailBg}">${td('')}${td('')}${td(d.item)}${tdNum(d.amount)}${tdNum('')}</tr>`;
      }
    }
    if (i < rows.length - 1) {
      tableRows += `<tr><td colspan="5" style="padding:0;border:0;border-bottom:2px solid #333;height:0.35rem;"></td></tr>`;
    }
  }

  return `
<main class="party-statement" dir="rtl" style="padding:1rem;font-family:sans-serif;font-size:14px;max-width:21cm;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;gap:1rem;">
    <div style="width:100px;flex-shrink:0;">${logoHtml}</div>
    <div style="flex:1;text-align:center;">
      <h1 style="margin:0;font-size:1.35rem;font-weight:bold;">${escapeHtml(title)}</h1>
    </div>
    <div style="width:100px;flex-shrink:0;"></div>
  </div>
  <div style="margin-bottom:0.75rem;">
    <p style="margin:0 0 0.2rem 0;"><strong>${escapeHtml(labels.company ?? 'Company')}:</strong> ${escapeHtml(companyName)}</p>
    ${companyAddress ? `<p style="margin:0 0 0.2rem 0;"><strong>${escapeHtml(labels.address ?? 'Address')}:</strong> ${escapeHtml(companyAddress)}</p>` : ''}
    ${companyPhone ? `<p style="margin:0 0 0.2rem 0;"><strong>${escapeHtml(labels.phone ?? 'Phone')}:</strong> ${escapeHtml(companyPhone)}</p>` : ''}
  </div>
  <div style="margin-bottom:0.75rem;">
    <p style="margin:0 0 0.2rem 0;"><strong>${escapeHtml(labels.party ?? 'Party')}:</strong> ${escapeHtml(partyName)}</p>
    ${partyPhone ? `<p style="margin:0 0 0.2rem 0;"><strong>${escapeHtml(labels.partyPhone ?? 'Phone')}:</strong> ${escapeHtml(partyPhone)}</p>` : ''}
  </div>
  ${dateRange ? `<p style="margin:0 0 0.5rem 0;">${escapeHtml(lDate)}: ${escapeHtml(dateRange.from)} – ${escapeHtml(dateRange.to)}</p>` : ''}
  <div style="display:flex;gap:1rem;margin-bottom:1rem;">
    <div style="flex:1;background:#e8e8e8;padding:0.5rem 0.75rem;border-radius:6px;text-align:center;border:1px solid #ccc;">
      <div style="font-size:0.9em;font-weight:bold;color:#222;">${escapeHtml(lOpening)}</div>
      <div style="font-weight:bold;font-size:1.1em;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedNum(opening))}</div>
    </div>
    <div style="flex:1;background:#e8e8e8;padding:0.5rem 0.75rem;border-radius:6px;text-align:center;border:1px solid #ccc;">
      <div style="font-size:0.9em;font-weight:bold;color:#222;">${escapeHtml(lDebit)}</div>
      <div style="font-weight:bold;font-size:1.1em;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedNum(debitTotal))}</div>
    </div>
    <div style="flex:1;background:#e8e8e8;padding:0.5rem 0.75rem;border-radius:6px;text-align:center;border:1px solid #ccc;">
      <div style="font-size:0.9em;font-weight:bold;color:#222;">${escapeHtml(lCredit)}</div>
      <div style="font-weight:bold;font-size:1.1em;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedNum(creditTotal))}</div>
    </div>
    <div style="flex:1;background:#e8e8e8;padding:0.5rem 0.75rem;border-radius:6px;text-align:center;border:1px solid #ccc;">
      <div style="font-size:0.9em;font-weight:bold;color:#222;">${escapeHtml(lClosing)}</div>
      <div style="font-weight:bold;font-size:1.1em;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedNum(closing))}</div>
    </div>
    <div style="flex:1;background:#e8e8e8;padding:0.5rem 0.75rem;border-radius:6px;text-align:center;border:1px solid #ccc;">
      <div style="font-size:0.9em;font-weight:bold;color:#222;">${escapeHtml(lCurrent)}</div>
      <div style="font-weight:bold;font-size:1.1em;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedNum(liveBalance))}</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</main>`;
}

function escapeHtml(s: string): string {
  const m: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => m[c] ?? c);
}

export async function printHtmlDocument(
  html: string,
  opts: { width: number; height: number; dir?: string }
): Promise<void> {
  const wrapped = opts.dir ? `<div dir="${escapeHtml(opts.dir)}">${html}</div>` : html;
  await getPathAndMakePDF('Party Statement', wrapped, opts.width, opts.height, true);
}
type PrintTemplateData = Record<string, unknown>;
type TemplateUpdateItem = {
  name: string;
  template: string;
  type: string;
  width: number;
  height: number;
};

const printSettingsFields = [
  'logo',
  'displayLogo',
  'color',
  'font',
  'email',
  'phone',
  'address',
  'companyName',
  'amountInWords',
  'displayTime',
  'displaytermsandconditions',
  'termsAndConditions',
];
const accountingSettingsFields = ['gstin', 'taxId'];

export async function getPrintTemplatePropValues(
  doc: Doc
): Promise<PrintValues> {
  const fyo = doc.fyo;
  let paymentId;
  let sinvDoc;

  const values: PrintValues = { doc: {}, print: {} };
  values.doc = await getPrintTemplateDocValues(doc);

  if (
    values.doc.entryType === ModelNameEnum.SalesInvoice ||
    values.doc.entryType === ModelNameEnum.PurchaseInvoice
  ) {
    paymentId = await (doc as SalesInvoice).getPaymentIds();

    if (paymentId && paymentId.length) {
      const { paymentDetails: details, totalPaid: paidSum } = await getPaymentDetailsWithTotal(
        doc,
        paymentId
      );
      (values.doc as PrintTemplateData).paymentDetails = details;
      if (paidSum) {
        (values.doc as PrintTemplateData).totalPaid = doc.fyo.format(
          paidSum,
          ModelNameEnum.Currency
        );
      }
    }
  }

  if (doc.referenceType == ModelNameEnum.SalesInvoice) {
    const referenceName = (doc as Payment)?.for![0]?.referenceName;

    if (referenceName) {
      sinvDoc = await fyo.doc.getDoc(ModelNameEnum.SalesInvoice, referenceName);

      if (sinvDoc.taxes) {
        (values.doc as PrintTemplateData).taxes = sinvDoc.taxes;
      }
    }
  }

  let totalTax;

  if (values.doc.entryType !== ModelNameEnum.Shipment) {
    totalTax = await ((sinvDoc as Invoice) ?? (doc as Payment))?.getTotalTax();
  }

  if (doc.schema.name == ModelNameEnum.Payment) {
    (values.doc as PrintTemplateData).amountPaidInWords = getGrandTotalInWords(
      (doc.amountPaid as Money)?.float
    );
  }

  (values.doc as PrintTemplateData).subTotal = doc.fyo.format(
    ((doc.grandTotal as Money) ?? (doc.amount as Money)).sub(totalTax || 0),
    ModelNameEnum.Currency
  );

  const printSettings = await fyo.doc.getDoc(ModelNameEnum.PrintSettings);
  const printValues = await getPrintTemplateDocValues(
    printSettings,
    printSettingsFields
  );

  const accountingSettings = await fyo.doc.getDoc(
    ModelNameEnum.AccountingSettings
  );
  const accountingValues = await getPrintTemplateDocValues(
    accountingSettings,
    accountingSettingsFields
  );

  values.print = {
    ...printValues,
    ...accountingValues,
  };
  const discountSchema = ['Invoice', 'Quote'];
  if (discountSchema.some((value) => doc.schemaName?.endsWith(value))) {
    (values.doc as PrintTemplateData).totalDiscount =
      formattedTotalDiscount(doc);
  }
  (values.doc as PrintTemplateData).showHSN = showHSN(doc);

  (values.doc as PrintTemplateData).grandTotalInWords = getGrandTotalInWords(
    ((doc.grandTotal as Money) ?? (doc.amount as Money)).float
  );

  (values.doc as PrintTemplateData).date = getDate(doc.date as string);

  if (printSettings.displayTime) {
    (values.doc as PrintTemplateData).time = getTime(doc.date as string);
  }

  if (printSettings.displayDescription) {
    (values.doc as PrintTemplateData).description = showDescription(doc);
  }

  return values;
}
async function getPaymentDetailsWithTotal(
  doc: Doc,
  paymentId: string[]
): Promise<{
  paymentDetails: {
    amount: string;
    amountPaid: string;
    paymentMethod: string;
    outstandingAmount: string;
  }[];
  totalPaid: Money | null;
}> {
  const paymentIds = paymentId.sort();
  const paymentDetails = [];
  let outstandingAmount = doc.grandTotal as Money;
  let totalPaid = doc.fyo.pesa(0);

  for (const payment of paymentIds) {
    const paymentDoc = await doc.fyo.doc.getDoc(ModelNameEnum.Payment, payment);
    const amount = paymentDoc.amount as Money;
    outstandingAmount = outstandingAmount.sub(amount);
    totalPaid = totalPaid.add(amount);

    paymentDetails.push({
      amount: doc.fyo.format(paymentDoc.amount, ModelNameEnum.Currency),
      amountPaid: doc.fyo.format(paymentDoc.amountPaid, ModelNameEnum.Currency),
      paymentMethod: paymentDoc.paymentMethod as string,
      outstandingAmount: doc.fyo.format(
        outstandingAmount,
        ModelNameEnum.Currency
      ),
    });
  }

  return {
    paymentDetails,
    totalPaid: totalPaid.float ? totalPaid : null,
  };
}

function getDate(dateString: string): string {
  const date = new Date(dateString);
  date.setMonth(date.getMonth());

  return `${date.toLocaleString('default', {
    month: 'short',
  })} ${date.getDate()}, ${date.getFullYear()}`;
}

function getTime(dateString: string): string {
  const date = new Date(dateString);

  return date.toTimeString().split(' ')[0];
}

export function getPrintTemplatePropHints(schemaName: string, fyo: Fyo) {
  const hints: PrintTemplateHint = {};
  const schema = fyo.schemaMap[schemaName]!;
  hints.doc = getPrintTemplateDocHints(schema, fyo);

  const printSettingsHints = getPrintTemplateDocHints(
    fyo.schemaMap[ModelNameEnum.PrintSettings]!,
    fyo,
    printSettingsFields
  );
  const accountingSettingsHints = getPrintTemplateDocHints(
    fyo.schemaMap[ModelNameEnum.AccountingSettings]!,
    fyo,
    accountingSettingsFields
  );

  hints.print = {
    ...printSettingsHints,
    ...accountingSettingsHints,
  };

  if (schemaName?.endsWith('Invoice')) {
    (hints.doc as PrintTemplateData).totalDiscount = fyo.t`Total Discount`;
    (hints.doc as PrintTemplateData).showHSN = fyo.t`Show HSN`;
  }

  return hints;
}

function getGrandTotalInWords(total: number) {
  const formattedTotal = total.toFixed(2);

  const [integerPart, decimalPart] = formattedTotal.split('.');

  const ones = [
    '',
    t`One`,
    t`Two`,
    t`Three`,
    t`Four`,
    t`Five`,
    t`Six`,
    t`Seven`,
    t`Eight`,
    t`Nine`,
  ];

  const teens = [
    t`Ten`,
    t`Eleven`,
    t`Twelve`,
    t`Thirteen`,
    t`Fourteen`,
    t`Fifteen`,
    t`Sixteen`,
    t`Seventeen`,
    t`Eighteen`,
    t`Nineteen`,
  ];

  const tens = [
    '',
    '',
    t`Twenty`,
    t`Thirty`,
    t`Forty`,
    t`Fifty`,
    t`Sixty`,
    t`Seventy`,
    t`Eighty`,
    t`Ninety`,
  ];

  const scales = ['', t`Thousand`, t`Million`, t`Billion`];

  function convertThreeDigitNumber(num: number) {
    let result = '';

    const hundredDigit = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundredDigit > 0) {
      result += ones[hundredDigit] + ` ${t`Hundred`}`;
    }

    if (remainder > 0) {
      if (hundredDigit > 0) {
        result += ` ${t`And`} `;
      }

      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const tensDigit = Math.floor(remainder / 10);
        const onesDigit = remainder % 10;
        result += tens[tensDigit];
        if (onesDigit > 0) {
          result += ' ' + ones[onesDigit];
        }
      }
    }

    return result;
  }

  let spelledOutInteger = '';
  const integerGroups = integerPart.match(/(\d{1,3})(?=(\d{3})*$)/g) || [];
  const groupCount = integerGroups.length;

  integerGroups.forEach((group, index) => {
    const groupValue = parseInt(group);

    if (groupValue > 0) {
      const groupText = convertThreeDigitNumber(groupValue);
      const groupSuffix = scales[groupCount - index - 1];
      spelledOutInteger +=
        groupText + (groupSuffix ? ' ' + groupSuffix : '') + ' ';
    }
  });

  spelledOutInteger = spelledOutInteger.trim() || t`Zero`;

  let spelledOutDecimal = '';
  const decimalCents = parseInt(decimalPart);

  if (decimalCents !== 0) {
    spelledOutDecimal =
      ` ${t`and`} ` + convertThreeDigitNumber(decimalCents) + ` ${t`Paisa`}`;
  }

  return `${spelledOutInteger}${spelledOutDecimal} ${t`only`}`;
}

function showHSN(doc: Doc): boolean {
  const items = doc.items;
  if (!Array.isArray(items)) {
    return false;
  }

  return items.map((i: Doc) => i.hsnCode).every(Boolean);
}

function showDescription(doc: Doc): boolean {
  const description = Array.isArray(doc.items)
    ? doc.items.map((item: Doc) => item.description).filter(Boolean)
    : [];
  return description.length > 0;
}

function formattedTotalDiscount(doc: Doc): string {
  if (!(doc instanceof Invoice)) {
    return '';
  }

  const totalDiscount = doc.getTotalDiscount();
  if (!totalDiscount?.float) {
    return '';
  }

  return doc.fyo.format(totalDiscount, ModelNameEnum.Currency);
}

function getPrintTemplateDocHints(
  schema: Schema,
  fyo: Fyo,
  fieldnames?: string[],
  linkLevel?: number,
  visited?: Set<string>
): PrintTemplateHint {
  linkLevel ??= 0;
  visited ??= new Set<string>();
  if (visited.has(schema.name)) {
    return {};
  }
  visited.add(schema.name);

  const hints: PrintTemplateHint = {};
  const links: PrintTemplateHint = {};

  let fields = schema.fields;
  if (fieldnames) {
    fields = fields.filter((f) => fieldnames.includes(f.fieldname));
  }

  for (const field of fields) {
    const { fieldname, fieldtype, label, meta } = field;
    if (fieldtype === FieldTypeEnum.Attachment || meta) {
      continue;
    }

    hints[fieldname] = label ?? fieldname;
    const { target } = field as TargetField;
    const targetSchema = target ? fyo.schemaMap[target] : undefined;
    if (fieldtype === FieldTypeEnum.Link && targetSchema && linkLevel < 2) {
      links[fieldname] = getPrintTemplateDocHints(
        targetSchema,
        fyo,
        undefined,
        linkLevel + 1,
        visited
      );
    }

    if (fieldtype === FieldTypeEnum.Table && targetSchema) {
      hints[fieldname] = [
        getPrintTemplateDocHints(targetSchema, fyo, undefined, linkLevel + 1, visited),
      ];
    }
  }

  hints.submitted = fyo.t`Submitted`;
  hints.entryType = fyo.t`Entry Type`;
  hints.entryLabel = fyo.t`Entry Label`;

  if (Object.keys(links).length) {
    hints.links = links;
  }
  return hints;
}

async function getPrintTemplateDocValues(
  doc: Doc,
  fieldnames?: string[],
  options?: {
    linkLevel?: number;
    maxLinkLevel?: number;
    includeLinks?: boolean;
    visited?: Set<string>;
  }
) {
  const linkLevel = options?.linkLevel ?? 0;
  const maxLinkLevel = options?.maxLinkLevel ?? 2;
  const includeLinks = options?.includeLinks ?? true;
  const visited = options?.visited ?? new Set<string>();
  const values: PrintTemplateData = {};
  if (!(doc instanceof Doc)) {
    return values;
  }

  let fields = doc.schema.fields;
  if (fieldnames) {
    fields = fields.filter((f) => fieldnames.includes(f.fieldname));
  }

  // Set Formatted Doc Data
  for (const field of fields) {
    const { fieldname, fieldtype, meta } = field;
    if (fieldtype === FieldTypeEnum.Attachment || meta) {
      continue;
    }

    const value = doc.get(fieldname);

    if (!value) {
      values[fieldname] = '';
      continue;
    }

    if (!Array.isArray(value)) {
      values[fieldname] = doc.fyo.format(value, field, doc);
      continue;
    }

    const table: PrintTemplateData[] = [];
    for (const row of value) {
      const rowProps = await getPrintTemplateDocValues(row, undefined, {
        linkLevel,
        maxLinkLevel,
        includeLinks: false,
        visited,
      });
      table.push(rowProps);
    }

    values[fieldname] = table;
  }

  values.submitted = doc.submitted;
  values.entryType = doc.schema.name;
  values.entryLabel = doc.schema.label;

  // Set Formatted Doc Link Data
  if (!includeLinks || linkLevel >= maxLinkLevel) {
    return values;
  }

  const docId = `${doc.schemaName}::${doc.name ?? ''}`;
  if (visited.has(docId)) {
    return values;
  }
  visited.add(docId);

  await doc.loadLinks();
  const links: PrintTemplateData = {};
  for (const [linkName, linkDoc] of Object.entries(doc.links ?? {})) {
    if (fieldnames && !fieldnames.includes(linkName)) {
      continue;
    }

    links[linkName] = await getPrintTemplateDocValues(linkDoc, undefined, {
      linkLevel: linkLevel + 1,
      maxLinkLevel,
      includeLinks: true,
      visited,
    });
  }

  if (Object.keys(links).length) {
    values.links = links;
  }
  return values;
}

export async function getPathAndMakePDF(
  name: string,
  innerHTML: string,
  width: number,
  height: number,
  shouldPrint?: boolean
) {
  if (!shouldPrint) {
    const { filePath: savePath } = await getSavePath(name, 'pdf');
    if (!savePath) {
      return;
    }

    const html = constructPrintDocument(innerHTML);
    const success = await ipc.makePDF(html, savePath, width, height);
    if (success) {
      showExportInFolder(t`Save as PDF Successful`, savePath);
    } else {
      showToast({ message: t`Export Failed`, type: 'error' });
    }
  } else {
    const html = constructPrintDocument(innerHTML);
    const success = await ipc.printDocument(html, width, height);
    if (success) {
      showToast({ message: t`Print Successful`, type: 'success' });
    } else {
      showToast({ message: t`Print Failed`, type: 'error' });
    }
  }
}

function getPrintTemplateStyles(): string {
  return `
    .invoice-print { font-family: Cairo, Tahoma, Arial, sans-serif; }
    .invoice-print .invoice-header { padding: 0.5rem 0 0.75rem; }
    .invoice-print .invoice-header .logo-img,
    .invoice-print .logo-img { max-height: 56px; max-width: 140px; object-fit: contain; }
    .invoice-print .invoice-meta-grid { display: grid; gap: 0.25rem 0.5rem; }
    .invoice-print .invoice-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .invoice-print .invoice-table th,
    .invoice-print .invoice-table td { border: 1px solid #e2e8f0; padding: 0.4rem 0.5rem; }
    .invoice-print .invoice-table th { background: #f1f5f9; font-weight: 600; }
    .invoice-print .invoice-table .col-item { width: 28%; }
    .invoice-print .invoice-table .col-qty { width: 10%; text-align: center; }
    .invoice-print .invoice-table .col-rate { width: 14%; text-align: right; }
    .invoice-print .invoice-table .col-amount { width: 14%; text-align: right; }
    .invoice-print .invoice-table .num { font-variant-numeric: tabular-nums; }
    .invoice-print .totals-table { width: 100%; max-width: 320px; margin-right: auto; margin-left: 0; border-collapse: collapse; }
    .invoice-print .totals-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #e2e8f0; }
    .invoice-print .totals-table .grand-row td { font-size: 1.1rem; font-weight: 700; border-bottom: none; padding-top: 0.5rem; }
    .invoice-print .totals-box { border: 1px solid #e2e8f0; background: #f8fafc; padding: 0.75rem 1rem; max-width: 300px; margin-right: auto; }
    .invoice-print .meta-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.75rem; }
    .invoice-print .totals-table .grand-row td { font-weight: 700; font-size: 1.05rem; }
    .thermal-receipt { font-family: Cairo, Tahoma, Arial, sans-serif; font-size: 11px; line-height: 1.3; }
    .thermal-receipt .logo-img { max-height: 36px; max-width: 100%; object-fit: contain; }
    .thermal-receipt .receipt-table { border-collapse: collapse; width: 100%; font-size: 10px; }
    .thermal-receipt .receipt-table th,
    .thermal-receipt .receipt-table td { border: none; border-bottom: 1px dotted #ccc; padding: 2px 3px; vertical-align: top; }
    .thermal-receipt .receipt-table th { background: #f0f0f0; font-weight: 600; }
    .thermal-receipt .receipt-table .col-item { width: 38%; max-width: 38%; word-wrap: break-word; }
    .thermal-receipt .receipt-table .col-num { text-align: right; width: 18%; font-variant-numeric: tabular-nums; }
    .thermal-receipt .receipt-table .item-name { word-break: break-word; line-height: 1.25; }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page { margin: 8mm; size: auto; }
      * { box-sizing: border-box; }
      .invoice-print .invoice-table tr,
      .invoice-print .item-row { break-inside: avoid; }
      .thermal-receipt { width: 72mm !important; max-width: 80mm !important; margin: 0; padding: 2mm; }
      .thermal-receipt .receipt-table tr { break-inside: avoid; }
    }
  `;
}

function constructPrintDocument(innerHTML: string) {
  const html = document.createElement('html');
  const head = document.createElement('head');
  const body = document.createElement('body');
  const style = getAllCSSAsStyleElem();

  const printCSS = document.createElement('style');
  printCSS.innerHTML = getPrintTemplateStyles();

  head.innerHTML = [
    '<meta charset="UTF-8">',
    '<title>Print Window</title>',
  ].join('\n');

  head.append(style, printCSS);

  body.innerHTML = innerHTML;
  html.append(head, body);
  return html.outerHTML;
}

function getAllCSSAsStyleElem() {
  const cssTexts: string[] = [];
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            cssTexts.push(rule.cssText);
          }
        }
        if (sheet.ownerRule) {
          cssTexts.push(sheet.ownerRule.cssText);
        }
      } catch {
        // Cross-origin or restricted stylesheet (e.g. in production build);
        // skip this sheet so print still works with inline/print CSS.
      }
    }
  } catch {
    // Fallback if styleSheets iteration fails
  }

  const styleElem = document.createElement('style');
  styleElem.innerHTML = cssTexts.join('\n');
  return styleElem;
}

export async function updatePrintTemplates(fyo: Fyo) {
  const templateFiles = await ipc.getTemplates(
    fyo.singles.PrintSettings?.posPrintWidth as number
  );
  const existingTemplates = (await fyo.db.getAll(ModelNameEnum.PrintTemplate, {
    fields: ['name', 'modified'],
    filters: { isCustom: false },
  })) as { name: string; modified: Date }[];

  const nameModifiedMap = getValueMapFromList(
    existingTemplates,
    'name',
    'modified'
  );

  const updateList: TemplateUpdateItem[] = [];
  for (const templateFile of templateFiles) {
    const updates = getPrintTemplateUpdateList(
      templateFile,
      nameModifiedMap,
      fyo
    );

    updateList.push(...updates);
  }

  const isLogging = fyo.store.skipTelemetryLogging;
  fyo.store.skipTelemetryLogging = true;
  for (const { name, type, template, width, height } of updateList) {
    const doc = await getDocFromNameIfExistsElseNew(
      ModelNameEnum.PrintTemplate,
      name
    );

    const updateData = {
      name,
      type,
      template,
      isCustom: false,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };

    await doc.set(updateData);
    await doc.sync();
  }
  fyo.store.skipTelemetryLogging = isLogging;
}

function getPrintTemplateUpdateList(
  { file, template, modified: modifiedString, width, height }: TemplateFile,
  nameModifiedMap: Record<string, Date>,
  fyo: Fyo
): TemplateUpdateItem[] {
  const templateList: TemplateUpdateItem[] = [];
  const dbModified = new Date(modifiedString);

  for (const { name, type } of getNameAndTypeFromTemplateFile(file, fyo)) {
    const fileModified = nameModifiedMap[name];
    if (fileModified && dbModified.valueOf() <= fileModified.valueOf()) {
      continue;
    }

    templateList.push({
      height,
      width,
      name,
      type,
      template,
    });
  }
  return templateList;
}

function getNameAndTypeFromTemplateFile(
  file: string,
  fyo: Fyo
): { name: string; type: string }[] {
  /**
   * Template File Name Format:
   * TemplateName[.SchemaName].template.html
   *
   * If the SchemaName is absent then it is assumed
   * that the SchemaName is:
   * - SalesInvoice
   * - SalesQuote
   * - PurchaseInvoice
   */

  const fileName = file.split('.template.html')[0];
  const name = fileName.split('.')[0];
  const schemaName = fileName.split('.')[1];

  if (schemaName) {
    const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
    return [{ name: `${name} - ${label}`, type: schemaName }];
  }

  return [
    ModelNameEnum.SalesInvoice,
    ModelNameEnum.SalesQuote,
    ModelNameEnum.PurchaseInvoice,
  ].map((schemaName) => {
    const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
    return { name: `${name} - ${label}`, type: schemaName };
  });
}

export const baseTemplate = `<main class="h-full w-full bg-white">

  <!-- Edit This Code -->
  <header class="p-4 flex justify-between border-b">
    <h2 
      class="font-semibold text-2xl" 
      :style="{ color: print.color }"
    >
      {{ print.companyName }}
    </h2>
    <h2 class="font-semibold text-2xl" >
      {{ doc.name }}
    </h2>
  </header>

  <div class="p-4 text-gray-600">
    Edit the code in the Template Editor on the right
    to create your own personalized custom template.
  </div>

</main>
`;