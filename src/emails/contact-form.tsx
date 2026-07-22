import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ContactEmailProps {
  name: string;
  email: string;
  message: string;
}

export const ContactFormEmail = ({
  name = 'John Doe',
  email = 'john@example.com',
  message = 'I would like to know more about Cutline OS.'
}: ContactEmailProps) => {
  const previewText = `New Message from ${name}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Contact Request</Heading>
          
          <Text style={text}>
            You have received a new message from the contact form on your website.
          </Text>
          
          <Section style={detailsSection}>
            <Text style={detailItem}>
              <strong>Name:</strong> {name}
            </Text>
            <Text style={detailItem}>
              <strong>Email:</strong> {email}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={messageLabel}><strong>Message:</strong></Text>
          <Section style={messageSection}>
            <Text style={messageContent}>
              {message}
            </Text>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            Reply directly to this email to respond to {name}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ContactFormEmail;

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  marginTop: '40px',
  marginBottom: '40px',
  maxWidth: '600px',
  border: '1px solid #e4e4e7',
};

const h1 = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '0 0 24px 0',
};

const text = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '24px',
};

const detailsSection = {
  backgroundColor: '#fafafa',
  padding: '16px',
  borderRadius: '6px',
  marginBottom: '24px',
  border: '1px solid #e4e4e7',
};

const detailItem = {
  margin: '0 0 8px 0',
  color: '#18181b',
  fontSize: '15px',
};

const messageLabel = {
  color: '#18181b',
  fontSize: '16px',
  margin: '0 0 12px 0',
};

const messageSection = {
  backgroundColor: '#fafafa',
  padding: '20px',
  borderRadius: '6px',
  border: '1px solid #e4e4e7',
  marginBottom: '24px',
};

const messageContent = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const hr = {
  borderColor: '#e4e4e7',
  margin: '32px 0 24px 0',
};

const footer = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
};
