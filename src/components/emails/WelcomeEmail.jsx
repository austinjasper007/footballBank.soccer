export default function WelcomeEmail({ firstName }) {
  return (
    <html>
      <head>
        <title>{`Welcome to Footballbank, ${firstName}!`}</title>
      </head>
      <body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial' }}>
        <div style={{ padding: '20px', backgroundColor: '#fff' }}>
          <h1 style={{ color: '#1a202c' }}>
            👋 Hey {firstName},
          </h1>
          <p>
            Welcome to <strong>Footballbank.soccer</strong> — your all-in-one platform for football finance and game intelligence.
          </p>
          <p>You're officially on the team ⚽</p>
        </div>
      </body>
    </html>
  );
}
