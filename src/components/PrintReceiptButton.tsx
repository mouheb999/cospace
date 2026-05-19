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
    // Measure the actual rendered receipt height and set the page size exactly —
    // "auto" height is unreliable across Chrome versions and POS printer drivers.
    pageStyle: () => {
      const el = receiptRef.current
      // scrollHeight captures full content height even if element is off-screen
      const px = el ? el.scrollHeight + 4 : 400
      // 1px = 0.2646mm at 96 dpi
      const mm = Math.ceil(px * 0.2646)
      return `
        @page {
          size: 80mm ${mm}mm;
          margin: 0mm;
        }
        html, body {
          width: 72mm !important;
          height: ${mm}mm !important;
          min-height: 0 !important;
          max-height: ${mm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `
    },
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

      {/* Rendered off-screen so scrollHeight is measurable */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '72mm', visibility: 'hidden', pointerEvents: 'none' }}>
        <Receipt ref={receiptRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
