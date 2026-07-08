import React from 'react'
import path from 'path'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

/**
 * Font registration for @react-pdf/renderer.
 *
 * - Server-side (renderToStream in API routes): uses absolute file paths
 *   via path.join(process.cwd(), 'public/fonts/...') so Node can read
 *   the .ttf files directly from disk.
 * - Client-side (pdf().toBlob() in browser): uses /fonts/ URL paths
 *   which resolve through Next.js public/ directory.
 * - Hyphenation disabled to prevent layout breaks on short invoice text.
 */
const isServer = typeof window === 'undefined'

const fontPath = (file: string) =>
  isServer ? path.join(process.cwd(), 'public', 'fonts', file) : `/fonts/${file}`

Font.register({
  family: 'Inter',
  fonts: [
    { src: fontPath('Inter-Regular.ttf'), fontWeight: 400 },
    { src: fontPath('Inter-Medium.ttf'), fontWeight: 500 },
    { src: fontPath('Inter-Bold.ttf'), fontWeight: 700 },
  ],
})

// Disable hyphenation — invoices have short text, hyphens look broken
Font.registerHyphenationCallback((word) => [word])

// Design tokens
const COLORS = {
  accent: '#6366f1', // indigo-500
  accentSoft: '#eef2ff', // indigo-50
  ink: '#0f172a', // slate-900
  inkMuted: '#475569', // slate-600
  inkSubtle: '#94a3b8', // slate-400
  line: '#e2e8f0', // slate-200
  lineSoft: '#f1f5f9', // slate-100
  surface: '#f8fafc', // slate-50
  white: '#ffffff',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    fontFamily: 'Inter',
    fontSize: 9,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
  accentBar: {
    height: 4,
    backgroundColor: COLORS.accent,
  },
  body: {
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 48,
  },
  brandBlock: {},
  brandName: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 8,
    color: COLORS.inkSubtle,
    marginTop: 4,
    lineHeight: 1.5,
  },
  invoiceTitleBlock: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: COLORS.ink,
    letterSpacing: -1,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: COLORS.successBg,
  },
  statusBadgeDraft: {
    backgroundColor: COLORS.lineSoft,
  },
  statusBadgeSent: {
    backgroundColor: COLORS.accentSoft,
  },
  statusBadgeOverdue: {
    backgroundColor: COLORS.dangerBg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusDotDraft: {
    backgroundColor: COLORS.inkSubtle,
  },
  statusDotSent: {
    backgroundColor: COLORS.accent,
  },
  statusDotOverdue: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextDraft: {
    color: COLORS.inkMuted,
  },
  statusTextSent: {
    color: COLORS.accent,
  },
  statusTextOverdue: {
    color: COLORS.danger,
  },
  statusBadgePartial: {
    backgroundColor: COLORS.warningBg,
  },
  statusDotPartial: {
    backgroundColor: COLORS.warning,
  },
  statusTextPartial: {
    color: '#b45309',
  },

  // Meta section
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 24,
  },
  metaCard: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.inkSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  metaName: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 9,
    color: COLORS.inkMuted,
    lineHeight: 1.5,
  },
  metaDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaDetailsLabel: {
    fontSize: 9,
    color: COLORS.inkSubtle,
  },
  metaDetailsValue: {
    fontSize: 9,
    fontWeight: 500,
    color: COLORS.ink,
  },

  // Table
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineSoft,
  },
  colDesc: { width: '50%' },
  colQty: { width: '12%', textAlign: 'center' },
  colRate: { width: '19%', textAlign: 'right' },
  colAmount: { width: '19%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.inkSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 9,
    color: COLORS.ink,
  },
  cellTextMuted: {
    fontSize: 9,
    color: COLORS.inkMuted,
  },
  cellNumber: {
    fontSize: 9,
    color: COLORS.ink,
    fontVariant: ['tabular-nums'],
  },

  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  totalsArea: {
    width: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
  },
  totalLabel: {
    fontSize: 9,
    color: COLORS.inkMuted,
  },
  totalValue: {
    fontSize: 9,
    color: COLORS.ink,
    fontVariant: ['tabular-nums'],
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },

  // Notes
  notesArea: {
    marginTop: 40,
    padding: 16,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.accent,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notesText: {
    fontSize: 9,
    color: COLORS.inkMuted,
    lineHeight: 1.6,
  },

  // Payments
  paymentsSection: {
    marginTop: 24,
  },
  paymentsTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineSoft,
  },
  paymentText: {
    fontSize: 8,
    color: COLORS.inkMuted,
  },
  paymentAmount: {
    fontSize: 8,
    color: COLORS.inkMuted,
    // @ts-ignore - fontVariant is valid in @react-pdf but types sometimes miss it
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
  },
  footerLeft: {
    fontSize: 8,
    color: COLORS.inkSubtle,
  },
  footerRight: {
    fontSize: 8,
    color: COLORS.inkSubtle,
  },
})

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID'

export type InvoiceData = {
  invoiceNumber: string
  status: InvoiceStatus
  issuedAt: Date | null
  dueDate: Date | null
  currency: string
  subtotalCents: number
  taxRateBps: number
  taxAmountCents: number
  totalCents: number
  notes: string | null
  business: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  client: {
    displayName: string
    companyName: string | null
    email?: string
    address?: string
  }
  lineItems: Array<{
    description: string
    quantity: number
    amountCents: number
  }>
  amountPaidCents: number
  amountDueCents: number
  payments: Array<{
    date: Date
    amountCents: number
    method: string
    reference: string | null
  }>
}

const formatMoney = (cents: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

const formatDate = (date: Date | null) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const getComputedStatus = (invoice: InvoiceData): string => {
  if (invoice.amountDueCents <= 0) return 'PAID'
  if (invoice.amountPaidCents > 0 && invoice.amountDueCents > 0) return 'PARTIALLY PAID'
  return invoice.status
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'PAID':
      return { badge: styles.statusBadge, dot: styles.statusDot, text: styles.statusText }
    case 'PARTIALLY PAID':
      return { badge: styles.statusBadgePartial, dot: styles.statusDotPartial, text: styles.statusTextPartial }
    case 'SENT':
      return { badge: styles.statusBadgeSent, dot: styles.statusDotSent, text: styles.statusTextSent }
    case 'OVERDUE':
      return { badge: styles.statusBadgeOverdue, dot: styles.statusDotOverdue, text: styles.statusTextOverdue }
    default:
      return { badge: styles.statusBadgeDraft, dot: styles.statusDotDraft, text: styles.statusTextDraft }
  }
}

export const InvoiceTemplate = ({ invoice }: { invoice: InvoiceData }) => {
  const computedStatus = getComputedStatus(invoice)
  const statusStyle = getStatusStyle(computedStatus)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.body}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>{invoice.business.name}</Text>
              {invoice.business.email && (
                <Text style={styles.brandSub}>
                  {invoice.business.email}
                  {invoice.business.phone ? ` · ${invoice.business.phone}` : ''}
                </Text>
              )}
            </View>
            <View style={styles.invoiceTitleBlock}>
              <Text style={styles.invoiceTitle}>Invoice</Text>
              <View style={statusStyle.badge}>
                <View style={statusStyle.dot} />
                <Text style={statusStyle.text}>{computedStatus.replace('_', ' ')}</Text>
              </View>
            </View>
          </View>

          {/* Meta Cards */}
          <View style={styles.meta}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Billed To</Text>
              <Text style={styles.metaName}>
                {invoice.client.companyName || invoice.client.displayName}
              </Text>
              {invoice.client.companyName && (
                <Text style={styles.metaText}>{invoice.client.displayName}</Text>
              )}
              {invoice.client.email && (
                <Text style={styles.metaText}>{invoice.client.email}</Text>
              )}
              {invoice.client.address && (
                <Text style={styles.metaText}>{invoice.client.address}</Text>
              )}
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Invoice Details</Text>
              <View style={styles.metaDetailsRow}>
                <Text style={styles.metaDetailsLabel}>Number</Text>
                <Text style={styles.metaDetailsValue}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.metaDetailsRow}>
                <Text style={styles.metaDetailsLabel}>Issued</Text>
                <Text style={styles.metaDetailsValue}>{formatDate(invoice.issuedAt)}</Text>
              </View>
              <View style={styles.metaDetailsRow}>
                <Text style={styles.metaDetailsLabel}>Due</Text>
                <Text style={styles.metaDetailsValue}>{formatDate(invoice.dueDate)}</Text>
              </View>
              <View style={styles.metaDetailsRow}>
                <Text style={styles.metaDetailsLabel}>Currency</Text>
                <Text style={styles.metaDetailsValue}>{invoice.currency}</Text>
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
              <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
              <Text style={[styles.colRate, styles.headerText]}>Rate</Text>
              <Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
            </View>

            {invoice.lineItems.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.colDesc, styles.cellText]}>{item.description}</Text>
                <Text style={[styles.colQty, styles.cellNumber]}>{item.quantity}</Text>
                <Text style={[styles.colRate, styles.cellNumber]}>
                  {formatMoney(item.amountCents, invoice.currency)}
                </Text>
                <Text style={[styles.colAmount, styles.cellNumber]}>
                  {formatMoney(item.amountCents * item.quantity, invoice.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalsArea}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(invoice.subtotalCents, invoice.currency)}
                </Text>
              </View>
              {invoice.taxAmountCents > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Tax ({(invoice.taxRateBps / 100).toFixed(2)}%)
                  </Text>
                  <Text style={styles.totalValue}>
                    {formatMoney(invoice.taxAmountCents, invoice.currency)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(invoice.totalCents, invoice.currency)}
                </Text>
              </View>
              {invoice.amountPaidCents > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Amount Paid</Text>
                  <Text style={styles.totalValue}>
                    -{formatMoney(invoice.amountPaidCents, invoice.currency)}
                  </Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Balance Due</Text>
                <Text style={styles.grandTotalValue}>
                  {formatMoney(Math.max(0, invoice.amountDueCents), invoice.currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payments Received */}
          {invoice.payments && invoice.payments.length > 0 && (
            <View style={styles.paymentsSection}>
              <Text style={styles.paymentsTitle}>Payments Received</Text>
              {invoice.payments.map((payment, i) => (
                <View key={i} style={styles.paymentRow}>
                  <Text style={styles.paymentText}>
                    {formatDate(payment.date)}
                    {payment.method ? ` · ${payment.method}` : ''}
                    {payment.reference ? ` (${payment.reference})` : ''}
                  </Text>
                  <Text style={styles.paymentAmount}>
                    {formatMoney(payment.amountCents, invoice.currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {invoice.notes && (
            <View style={styles.notesArea}>
              <Text style={styles.notesTitle}>Notes / Payment Instructions</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>Thank you for your business</Text>
          <Text style={styles.footerRight}>{invoice.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}