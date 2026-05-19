import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reçu — CoSpace' }

/* ─── Inline SVG icons (stroke-based, 1:1 with Lucide style) ─── */
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
)
const CardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" />
  </svg>
)
const WalletIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h14v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><circle cx="16" cy="14" r="2" />
  </svg>
)
const IdIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 10h4M14 14h3" />
  </svg>
)
const DoorIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V6a2 2 0 00-2-2H8a2 2 0 00-2 2v14" /><path d="M2 20h20" /><path d="M14 12v.01" />
  </svg>
)
const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)
const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .68h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.37a16 16 0 006.72 6.72l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)
const LocationIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
)

/* ─── Zigzag SVG (34 downward teeth, spans full width) ─── */
const Zigzag = () => (
  <svg
    width="100%" height="14"
    viewBox="0 0 272 14"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <path
      d="M0,0 L4,14 L8,0 L12,14 L16,0 L20,14 L24,0 L28,14 L32,0 L36,14 L40,0 L44,14 L48,0 L52,14 L56,0 L60,14 L64,0 L68,14 L72,0 L76,14 L80,0 L84,14 L88,0 L92,14 L96,0 L100,14 L104,0 L108,14 L112,0 L116,14 L120,0 L124,14 L128,0 L132,14 L136,0 L140,14 L144,0 L148,14 L152,0 L156,14 L160,0 L164,14 L168,0 L172,14 L176,0 L180,14 L184,0 L188,14 L192,0 L196,14 L200,0 L204,14 L208,0 L212,14 L216,0 L220,14 L224,0 L228,14 L232,0 L236,14 L240,0 L244,14 L248,0 L252,14 L256,0 L260,14 L264,0 L268,14 L272,0 Z"
      fill="white"
    />
  </svg>
)

/* ─── Decorative tick marks beside the logo ─── */
const LogoTicks = ({ side }: { side: 'left' | 'right' }) => (
  <span style={{
    display: 'inline-flex', flexDirection: 'column', gap: '3px',
    alignItems: 'center', transform: `scaleX(${side === 'right' ? -1 : 1})`,
    marginTop: '2px',
  }}>
    <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(-30deg)', transformOrigin: 'right center' }} />
    <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(30deg)', transformOrigin: 'right center' }} />
  </span>
)

/* ─── Page ─── */
export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; subscription?: string; amount?: string; receipt_id?: string; entry_time?: string }>
}) {
  const params = await searchParams
  const client      = params.client       ?? 'User 1'
  const subscription = params.subscription ?? 'Journalière'
  const amount      = params.amount       ?? '10 TND'
  const receiptId   = params.receipt_id   ?? '00180125'
  const entryTime   = params.entry_time   ?? new Date().toLocaleString('fr-FR', {
    timeZone: 'Africa/Tunis', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      {/* ── Scoped styles ── */}
      <style>{`
        /* Override app dark theme for this page */
        body {
          background: #e5e5e5 !important;
          font-family: 'Arial', 'Helvetica Neue', sans-serif !important;
        }
        body::before { display: none !important; }

        /* Screen wrapper */
        .rcp-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 28px 0 40px;
          background: #e5e5e5;
        }

        /* Outer card (screen shadow + rounded top) */
        .rcp-card {
          width: 72mm;
          background: transparent;
          filter: drop-shadow(0 4px 18px rgba(0,0,0,0.22)) drop-shadow(0 1px 4px rgba(0,0,0,0.12));
        }

        /* Main paper area */
        .rcp-paper {
          background: #fff;
          width: 72mm;
          padding: 8mm 6mm 5mm;
          color: #000;
        }

        /* ── Header ── */
        .rcp-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-bottom: 1.5mm;
        }
        .rcp-logo-text {
          font-family: 'Caveat', cursive;
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.5px;
          color: #000;
        }
        .rcp-subtitle-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 2mm;
        }
        .rcp-subtitle-dash {
          display: inline-block;
          width: 16px;
          height: 1.5px;
          background: #000;
          vertical-align: middle;
        }
        .rcp-subtitle-text {
          font-size: 6.5px;
          letter-spacing: 3.5px;
          font-weight: 700;
          color: #000;
          text-transform: uppercase;
        }
        .rcp-wave {
          text-align: center;
          font-size: 12px;
          letter-spacing: 3px;
          color: #000;
          margin-bottom: 0.5mm;
        }

        /* ── Separator ── */
        .rcp-sep {
          border: none;
          border-top: 1.5px dashed #000;
          margin: 2.5mm 0;
        }

        /* ── Info rows ── */
        .rcp-row {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 2mm 0;
          color: #000;
        }
        .rcp-row-icon {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }
        .rcp-row-label {
          font-size: 10.5px;
          font-weight: 700;
          font-family: 'Arial', sans-serif;
          min-width: 21mm;
          color: #000;
        }
        .rcp-row-colon {
          font-size: 10.5px;
          color: #000;
          margin: 0 1px;
        }
        .rcp-row-value {
          font-size: 10.5px;
          color: #000;
          font-family: 'Arial', sans-serif;
          word-break: break-all;
        }

        /* ── Thank-you block ── */
        .rcp-thanks {
          text-align: center;
          padding: 3.5mm 0 2mm;
        }
        .rcp-thanks-deco {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-bottom: 2mm;
          color: #000;
        }
        .rcp-thanks-deco-tick {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rcp-thanks-deco-tick span {
          display: block;
          width: 14px;
          height: 1.5px;
          background: #000;
        }
        .rcp-thanks-title {
          font-size: 19px;
          font-weight: 900;
          font-family: 'Arial Black', 'Arial', sans-serif;
          letter-spacing: 1.5px;
          color: #000;
          margin-bottom: 1.5mm;
        }
        .rcp-thanks-sub {
          font-size: 9.5px;
          color: #000;
          font-family: 'Arial', sans-serif;
        }

        /* ── Footer ── */
        .rcp-footer {
          padding: 1mm 0 0;
        }
        .rcp-footer-row {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          padding: 1.5mm 0;
          color: #000;
        }
        .rcp-footer-icon {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .rcp-footer-text {
          font-size: 9.5px;
          color: #000;
          font-family: 'Arial', sans-serif;
          line-height: 1.45;
        }

        /* ── Zigzag ── */
        .rcp-zigzag {
          width: 72mm;
          display: block;
        }

        /* ── Print rules ── */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            width: 72mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rcp-page {
            padding: 0;
            background: white;
            min-height: unset;
          }
          .rcp-card {
            filter: none;
          }
        }
      `}</style>

      <div className="rcp-page">
        <div className="rcp-card">

          {/* ── Paper ── */}
          <div className="rcp-paper">

            {/* Header */}
            <div style={{ textAlign: 'center', paddingBottom: '3mm' }}>
              <div className="rcp-logo-row">
                <LogoTicks side="left" />
                <span className="rcp-logo-text">CoSpace</span>
                <LogoTicks side="right" />
              </div>
              <div className="rcp-subtitle-row">
                <span className="rcp-subtitle-dash" />
                <span className="rcp-subtitle-text">Espace de Travail</span>
                <span className="rcp-subtitle-dash" />
              </div>
              <div className="rcp-wave">〜〜〜</div>
            </div>

            <hr className="rcp-sep" />

            {/* Info rows */}
            <div>
              <div className="rcp-row">
                <span className="rcp-row-icon"><UserIcon /></span>
                <span className="rcp-row-label">Client</span>
                <span className="rcp-row-colon">:</span>
                <span className="rcp-row-value">{client}</span>
              </div>
              <div className="rcp-row">
                <span className="rcp-row-icon"><CardIcon /></span>
                <span className="rcp-row-label">Abonnement</span>
                <span className="rcp-row-colon">:</span>
                <span className="rcp-row-value">{subscription}</span>
              </div>
              <div className="rcp-row">
                <span className="rcp-row-icon"><WalletIcon /></span>
                <span className="rcp-row-label">Montant</span>
                <span className="rcp-row-colon">:</span>
                <span className="rcp-row-value">{amount}</span>
              </div>
              <div className="rcp-row">
                <span className="rcp-row-icon"><IdIcon /></span>
                <span className="rcp-row-label">N°</span>
                <span className="rcp-row-colon">:</span>
                <span className="rcp-row-value">{receiptId}</span>
              </div>
            </div>

            <hr className="rcp-sep" />

            {/* Entry */}
            <div className="rcp-row">
              <span className="rcp-row-icon"><DoorIcon /></span>
              <span className="rcp-row-label">Entrée</span>
              <span className="rcp-row-colon">:</span>
              <span className="rcp-row-value">{entryTime}</span>
            </div>

            <hr className="rcp-sep" />

            {/* Thank you */}
            <div className="rcp-thanks">
              <div className="rcp-thanks-deco">
                <div className="rcp-thanks-deco-tick">
                  <span style={{ transform: 'rotate(-30deg)', transformOrigin: 'right center' }} />
                  <span style={{ transform: 'rotate(30deg)', transformOrigin: 'right center' }} />
                </div>
                <HeartIcon />
                <div className="rcp-thanks-deco-tick">
                  <span style={{ transform: 'rotate(30deg)', transformOrigin: 'left center' }} />
                  <span style={{ transform: 'rotate(-30deg)', transformOrigin: 'left center' }} />
                </div>
              </div>
              <div className="rcp-thanks-title">MERCI !</div>
              <div className="rcp-thanks-sub">À bientôt chez CoSpace</div>
            </div>

            <hr className="rcp-sep" />

            {/* Footer */}
            <div className="rcp-footer">
              <div className="rcp-footer-row">
                <span className="rcp-footer-icon"><InstagramIcon /></span>
                <span className="rcp-footer-text">@cospace.tsi</span>
              </div>
              <div className="rcp-footer-row">
                <span className="rcp-footer-icon"><PhoneIcon /></span>
                <span className="rcp-footer-text">93 400 409</span>
              </div>
              <div className="rcp-footer-row">
                <span className="rcp-footer-icon"><LocationIcon /></span>
                <span className="rcp-footer-text">69, 2 boulevard de liberté{'\n'}Sousse 4054</span>
              </div>
            </div>

          </div>{/* /rcp-paper */}

          {/* Zigzag tear-off */}
          <Zigzag />

        </div>{/* /rcp-card */}
      </div>
    </>
  )
}
