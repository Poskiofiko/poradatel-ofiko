import Head from 'next/head'

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Neplatný odkaz | Ofiko</title>
      </Head>

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif',
          background:
            'radial-gradient(circle at top left, rgba(90,71,204,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(79,125,255,0.08), transparent 35%), #F6F8FC'
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '680px',
            background: '#FFFFFF',
            border: '1px solid #E5EAF2',
            borderRadius: '18px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            padding: '40px 32px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              marginBottom: '18px',
              padding: '10px 14px',
              borderRadius: '999px',
              background: 'rgba(90,71,204,0.08)',
              color: '#5A47CC',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            Ofiko
          </div>

          <h1
            style={{
              margin: '0 0 16px',
              fontSize: '36px',
              fontWeight: 800,
              color: '#0F172A'
            }}
          >
            Tohle není správně.
          </h1>

          <p
            style={{
              margin: '0 auto 28px',
              maxWidth: '560px',
              fontSize: '17px',
              lineHeight: 1.7,
              color: '#475569'
            }}
          >
            Zadejte správný speciální odkaz, zažádejte o nový nebo přejděte zpět na Ofiko.
          </p>

          <a
            href="https://ofiko.eu"
            style={{
              display: 'inline-block',
              padding: '14px 22px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #5A47CC 0%, #4F7DFF 100%)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 12px 24px rgba(90, 71, 204, 0.22)'
            }}
          >
            Přejít na Ofiko
          </a>

          <div
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: '#64748B'
            }}
          >
            Neplatný nebo expirovaný odkaz.
          </div>
        </section>
      </main>
    </>
  )
}