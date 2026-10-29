export default function ContactEmail({ name, email, message, subject }) {
  return (
    <html>
      <head>
        <title>{`New contact message from ${name}`}</title>
      </head>
      <body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px' }}>
          <h1>📨 New Contact Message</h1>
          <p><strong>Name:</strong> {name}</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Subject:</strong> {subject}</p>
          <p><strong>Message:</strong></p>
          <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
        </div>
      </body>
    </html>
  );
}
