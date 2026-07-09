import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

interface InvoiceEmailProps {
  businessName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  amountDue: string;
  subtotal: string;
  tax: string;
  lineItems: { description: string; quantity: number; amount: string }[];
  bodyMessage: string;
  paymentLink: string;
  currency: string;
}

export const InvoiceEmail = ({
  businessName = "Acme Corp",
  invoiceNumber = "INV-0001",
  issueDate = "Jul 9, 2026",
  dueDate = "Jul 16, 2026",
  clientName = "John Doe",
  amountDue = "$1,200.00",
  subtotal = "$1,000.00",
  tax = "$200.00",
  lineItems = [
    { description: "Video Editing", quantity: 1, amount: "$1,000.00" },
  ],
  bodyMessage = "Here is your invoice. Thank you for your business!",
  paymentLink = "https://example.com/pay",
}: InvoiceEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from {businessName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Top Accent Line */}
          <div style={topAccent} />

          <Section style={headerSection}>
            <Row>
              <Column>
                <Text style={businessLogoText}>{businessName}</Text>
                <Text style={invoiceLabel}>Invoice {invoiceNumber}</Text>
              </Column>
              <Column align="right" style={{ verticalAlign: 'top' }}>
                <Text style={amountDueLabel}>Amount Due</Text>
                <Text style={amountDueValue}>{amountDue}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section style={bodySection}>
            <Text style={paragraph}>{bodyMessage}</Text>
            
            <Section style={infoGrid}>
              <Row>
                <Column style={infoColumn}>
                  <Text style={label}>Billed To</Text>
                  <Text style={value}>{clientName}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={label}>Date Issued</Text>
                  <Text style={value}>{issueDate}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={label}>Due Date</Text>
                  <Text style={value}>{dueDate}</Text>
                </Column>
              </Row>
            </Section>

            <Section style={tableSection}>
              <Row style={tableHeaderRow}>
                <Column style={{ width: '55%', paddingBottom: '12px' }}>
                  <Text style={tableHeader}>Description</Text>
                </Column>
                <Column style={{ width: '20%', paddingBottom: '12px' }} align="right">
                  <Text style={tableHeader}>Qty</Text>
                </Column>
                <Column style={{ width: '25%', paddingBottom: '12px' }} align="right">
                  <Text style={tableHeader}>Amount</Text>
                </Column>
              </Row>

              {lineItems.map((item, index) => (
                <Row key={index} style={itemRow}>
                  <Column style={{ width: '55%', padding: '12px 0' }}>
                    <Text style={itemDescription}>{item.description}</Text>
                  </Column>
                  <Column style={{ width: '20%', padding: '12px 0' }} align="right">
                    <Text style={itemText}>{item.quantity}</Text>
                  </Column>
                  <Column style={{ width: '25%', padding: '12px 0' }} align="right">
                    <Text style={itemText}>{item.amount}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
            
            <Hr style={hrLight} />

            <Section style={totalsSection}>
              <Row>
                <Column style={{ width: '55%' }}></Column>
                <Column style={{ width: '45%' }}>
                  <Row style={totalRow}>
                    <Column><Text style={totalLabel}>Subtotal</Text></Column>
                    <Column align="right"><Text style={totalValue}>{subtotal}</Text></Column>
                  </Row>
                  <Row style={totalRow}>
                    <Column><Text style={totalLabel}>Tax</Text></Column>
                    <Column align="right"><Text style={totalValue}>{tax}</Text></Column>
                  </Row>
                  <Hr style={hrLight} />
                  <Row style={{ ...totalRow, paddingTop: '4px' }}>
                    <Column><Text style={grandTotalLabel}>Total Due</Text></Column>
                    <Column align="right"><Text style={grandTotalValue}>{amountDue}</Text></Column>
                  </Row>
                </Column>
              </Row>
            </Section>

            <Section style={buttonSection}>
              <Button href={paymentLink} style={button}>
                Pay Invoice
              </Button>
            </Section>

          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Sent securely via <Link href="https://cutlin.tech" style={footerLink}>Cutline OS</Link>.
            </Text>
            <Text style={footerSubtext}>
              If you have any questions about this invoice, simply reply to this email to contact {businessName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvoiceEmail;

// --- Styles --- //

const main = {
  backgroundColor: "#f4f4f5", // zinc-100
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
  maxWidth: "600px",
  border: "1px solid #e4e4e7", // zinc-200
};

const topAccent = {
  width: "100%",
  height: "6px",
  backgroundColor: "#09090b", // zinc-950
};

const headerSection = {
  padding: "40px 48px 32px 48px",
};

const businessLogoText = {
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "-0.5px",
  color: "#09090b",
  margin: "0 0 4px 0",
};

const invoiceLabel = {
  fontSize: "14px",
  color: "#71717a", // zinc-500
  margin: "0",
};

const amountDueLabel = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  fontWeight: "600",
  letterSpacing: "0.5px",
  color: "#71717a",
  margin: "0 0 4px 0",
};

const amountDueValue = {
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "-1px",
  color: "#09090b",
  margin: "0",
};

const bodySection = {
  padding: "32px 48px 48px 48px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#3f3f46", // zinc-700
  whiteSpace: "pre-wrap" as const,
  margin: "0 0 40px 0",
};

const infoGrid = {
  marginBottom: "48px",
  backgroundColor: "#fafafa", // zinc-50
  padding: "24px",
  borderRadius: "8px",
  border: "1px solid #f4f4f5", // zinc-100
};

const infoColumn = {
  width: "33.33%",
  verticalAlign: "top" as const,
};

const label = {
  fontSize: "11px",
  color: "#a1a1aa", // zinc-400
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const value = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#09090b",
  margin: "0",
};

const tableSection = {
  width: "100%",
  marginBottom: "32px",
};

const tableHeaderRow = {
  borderBottom: "2px solid #e4e4e7",
};

const tableHeader = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0",
};

const itemRow = {
  borderBottom: "1px solid #f4f4f5",
};

const itemDescription = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#18181b", // zinc-900
  margin: "0",
};

const itemText = {
  fontSize: "14px",
  color: "#52525b", // zinc-600
  margin: "0",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "0",
};

const hrLight = {
  borderColor: "#f4f4f5",
  margin: "0",
};

const totalsSection = {
  width: "100%",
  marginBottom: "48px",
};

const totalRow = {
  margin: "8px 0",
};

const totalLabel = {
  fontSize: "14px",
  color: "#71717a",
  margin: "8px 0",
};

const totalValue = {
  fontSize: "14px",
  color: "#18181b",
  fontWeight: "500",
  margin: "8px 0",
};

const grandTotalLabel = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#09090b",
  margin: "8px 0",
};

const grandTotalValue = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#09090b",
  margin: "8px 0",
};

const buttonSection = {
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#09090b",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "16px 32px",
  display: "inline-block",
  width: "100%",
  boxSizing: "border-box" as const,
};

const footer = {
  padding: "32px 48px",
  backgroundColor: "#fafafa",
  borderTop: "1px solid #e4e4e7",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 8px 0",
};

const footerLink = {
  color: "#18181b",
  fontWeight: "500",
  textDecoration: "underline",
};

const footerSubtext = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0",
};
