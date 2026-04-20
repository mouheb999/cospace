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

const formatTime = (d: string | Date) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatTimeOnly = (d: string | Date) =>
  new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/**
 * Thermal POS receipt component (80mm / ~300px wide).
 * Designed to be rendered hidden and printed via react-to-print.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { data, spaceName = 'CoSpace' },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: '80mm',
        padding: '8mm 6mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '12px',
        color: '#000',
        background: '#fff',
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>
          {spaceName}
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>Reçu de paiement</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      {/* Body */}
      <div style={{ marginBottom: '4px' }}>
        <div>
          <strong>Client :</strong> {data.clientName}
        </div>
        <div>
          <strong>Abonnement :</strong> {data.membership}
        </div>
        {typeof data.price === 'number' && (
          <div>
            <strong>Montant :</strong> {data.price} TND
          </div>
        )}
        {data.receiptNumber && (
          <div>
            <strong>N° :</strong> {data.receiptNumber}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      {/* Times */}
      <div style={{ marginBottom: '4px' }}>
        <div>
          <strong>Entrée :</strong> {formatTime(data.timestamp)}
        </div>
        {data.endTime && (
          <div>
            <strong>Fin :</strong> {formatTimeOnly(data.endTime)}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <div style={{ fontWeight: 'bold' }}>Merci ! 🙏</div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          À bientôt chez {spaceName}
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  )
})

export default Receipt
