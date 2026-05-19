'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer } from 'lucide-react'
import Receipt, { ReceiptData } from './Receipt'

interface PrintReceiptButtonProps {
  data: ReceiptData
  spaceName?: string
  className?: string
  label?: string
  iconOnly?: boolean
}

/**
 * Self-contained print button: renders hidden Receipt and triggers print dialog.
 * Completely additive — does not modify any approval/database logic.
 */
export function PrintReceiptButton({
  data,
  spaceName,
  className,
  label = 'Imprimer',
  iconOnly = false,
}: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recu-${data.clientName}-${new Date(data.timestamp).getTime()}`,
    pageStyle: `
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
      @page { size: 80mm auto; margin: 0; }
      html, body { width: 72mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => handlePrint()}
        className={
          className ||
          'flex items-center justify-center gap-1.5 bg-surface2 border border-teal/30 text-teal font-bold py-2 px-3 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/10 transition-all'
        }
        title="Imprimer le reçu"
      >
        <Printer size={14} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {/* Hidden receipt — only visible in print dialog */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, visibility: 'hidden' }}>
        <Receipt ref={receiptRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
