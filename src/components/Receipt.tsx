'use client'

import { forwardRef } from 'react'

export interface ReceiptData {
  clientName: string
  membership: string
  price?: number
  timestamp: string | Date
  endTime?: string | Date | null
  receiptNumber?: string
}

interface ReceiptProps {
  data: ReceiptData
  spaceName?: string
}

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString('fr-FR', {
    timeZone: 'Africa/Tunis',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString('fr-FR', {
    timeZone: 'Africa/Tunis',
    hour: '2-digit', minute: '2-digit',
  })

/* ─── Zigzag path: 34 downward teeth across 272 units ─── */
const ZIGZAG =
  'M0,0 L4,14 L8,0 L12,14 L16,0 L20,14 L24,0 L28,14 L32,0 L36,14 ' +
  'L40,0 L44,14 L48,0 L52,14 L56,0 L60,14 L64,0 L68,14 L72,0 L76,14 ' +
  'L80,0 L84,14 L88,0 L92,14 L96,0 L100,14 L104,0 L108,14 L112,0 L116,14 ' +
  'L120,0 L124,14 L128,0 L132,14 L136,0 L140,14 L144,0 L148,14 L152,0 L156,14 ' +
  'L160,0 L164,14 L168,0 L172,14 L176,0 L180,14 L184,0 L188,14 L192,0 L196,14 ' +
  'L200,0 L204,14 L208,0 L212,14 L216,0 L220,14 L224,0 L228,14 L232,0 L236,14 ' +
  'L240,0 L244,14 L248,0 L252,14 L256,0 L260,14 L264,0 L268,14 L272,0 Z'

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { data, spaceName = 'CoSpace' },
  ref
) {
  return (
    <div ref={ref} style={{ width: '72mm', background: '#fff', color: '#000' }}>

      {/* Font only — @page lives in pageStyle (iframe <head>) so the browser honors it */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
      `}</style>

      {/* ── Paper ── */}
      <div style={{ padding: '8mm 6mm 5mm', fontFamily: "'Arial','Helvetica Neue',sans-serif" }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '5mm' }}>

          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '1.5mm' }}>
            {/* Left ticks */}
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(-30deg)', transformOrigin: 'right center' }} />
              <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(30deg)', transformOrigin: 'right center' }} />
            </span>
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: '30px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px', color: '#000' }}>
              {spaceName}
            </span>
            {/* Right ticks */}
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(30deg)', transformOrigin: 'left center' }} />
              <span style={{ display: 'block', width: '11px', height: '1.8px', background: '#000', transform: 'rotate(-30deg)', transformOrigin: 'left center' }} />
            </span>
          </div>

          {/* Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2mm' }}>
            <span style={{ display: 'inline-block', width: '16px', height: '1.5px', background: '#000' }} />
            <span style={{ fontSize: '6.5px', letterSpacing: '3.5px', fontWeight: 700, textTransform: 'uppercase' as const }}>Espace de Travail</span>
            <span style={{ display: 'inline-block', width: '16px', height: '1.5px', background: '#000' }} />
          </div>

          {/* Wave */}
          <div style={{ fontSize: '12px', letterSpacing: '3px' }}>〜〜〜</div>
        </div>

        {/* Sep */}
        <div style={{ borderTop: '1.5px dashed #000', margin: '2.5mm 0' }} />

        {/* Info rows */}
        {[
          {
            icon: (
              /* user */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
              </svg>
            ),
            label: 'Client',
            value: data.clientName,
          },
          {
            icon: (
              /* card */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>
              </svg>
            ),
            label: 'Abonnement',
            value: data.membership,
          },
          ...(typeof data.price === 'number' ? [{
            icon: (
              /* wallet */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h14v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><circle cx="16" cy="14" r="2"/>
              </svg>
            ),
            label: 'Montant',
            value: `${data.price} TND`,
          }] : []),
          ...(data.receiptNumber ? [{
            icon: (
              /* id */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h3"/>
              </svg>
            ),
            label: 'N°',
            value: data.receiptNumber,
          }] : []),
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '2mm 0' }}>
            <span style={{ width: '15px', height: '15px', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, minWidth: '21mm' }}>{label}</span>
            <span style={{ fontSize: '10.5px', margin: '0 1px' }}>:</span>
            <span style={{ fontSize: '10.5px' }}>{value}</span>
          </div>
        ))}

        {/* Sep */}
        <div style={{ borderTop: '1.5px dashed #000', margin: '2.5mm 0' }} />

        {/* Entry / Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '2mm 0' }}>
          <span style={{ width: '15px', height: '15px', flexShrink: 0 }}>
            {/* door */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V6a2 2 0 00-2-2H8a2 2 0 00-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/>
            </svg>
          </span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, minWidth: '21mm' }}>Entrée</span>
          <span style={{ fontSize: '10.5px', margin: '0 1px' }}>:</span>
          <span style={{ fontSize: '10.5px' }}>{fmt(data.timestamp)}</span>
        </div>
        {data.endTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '2mm 0' }}>
            <span style={{ width: '15px', height: '15px', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, minWidth: '21mm' }}>Fin</span>
            <span style={{ fontSize: '10.5px', margin: '0 1px' }}>:</span>
            <span style={{ fontSize: '10.5px' }}>{fmtTime(data.endTime)}</span>
          </div>
        )}

        {/* Sep */}
        <div style={{ borderTop: '1.5px dashed #000', margin: '2.5mm 0' }} />

        {/* Thank you */}
        <div style={{ textAlign: 'center', padding: '3.5mm 0 2mm' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '2mm' }}>
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'block', width: '13px', height: '1.5px', background: '#000', transform: 'rotate(-30deg)', transformOrigin: 'right center' }} />
              <span style={{ display: 'block', width: '13px', height: '1.5px', background: '#000', transform: 'rotate(30deg)', transformOrigin: 'right center' }} />
            </span>
            {/* heart */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'block', width: '13px', height: '1.5px', background: '#000', transform: 'rotate(30deg)', transformOrigin: 'left center' }} />
              <span style={{ display: 'block', width: '13px', height: '1.5px', background: '#000', transform: 'rotate(-30deg)', transformOrigin: 'left center' }} />
            </span>
          </div>
          <div style={{ fontSize: '19px', fontWeight: 900, fontFamily: "'Arial Black','Arial',sans-serif", letterSpacing: '1.5px', marginBottom: '1.5mm' }}>
            MERCI !
          </div>
          <div style={{ fontSize: '9.5px' }}>À bientôt chez {spaceName}</div>
        </div>

        {/* Sep */}
        <div style={{ borderTop: '1.5px dashed #000', margin: '2.5mm 0' }} />

        {/* Footer */}
        <div>
          {[
            {
              icon: (
                /* instagram */
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="#000" stroke="none"/>
                </svg>
              ),
              text: '@cospace.tsi',
            },
            {
              icon: (
                /* phone */
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .68h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.37a16 16 0 006.72 6.72l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              ),
              text: '93 400 409',
            },
            {
              icon: (
                /* pin */
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              ),
              text: '69, 2 boulevard de liberté\nSousse 4054',
            },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '1.5mm 0' }}>
              <span style={{ width: '13px', height: '13px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
              <span style={{ fontSize: '9.5px', whiteSpace: 'pre-line' as const, lineHeight: 1.45 }}>{text}</span>
            </div>
          ))}
        </div>

      </div>{/* /paper */}

      {/* Zigzag tear-off */}
      <svg width="100%" height="14" viewBox="0 0 272 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <path d={ZIGZAG} fill="white" />
      </svg>

    </div>
  )
})

export default Receipt
