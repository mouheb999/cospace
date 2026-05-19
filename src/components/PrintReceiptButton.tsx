'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

const buildPageStyle = (heightMm: number) => `
  @page {
    size: 80mm ${heightMm}mm;
    margin: 0mm;
  }
  html, body {
    width: 72mm !important;
    height: ${heightMm}mm !important;
    min-height: 0 !important;
    max-height: ${heightMm}mm !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`

export function PrintReceiptButton({
  data,
  spaceName,
  className,
  label = 'Imprimer',
  iconOnly = false,
}: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  // Start with a safe fallback height; updated to exact content height before each print
  const [pageStyle, setPageStyle] = useState(() => buildPageStyle(160))

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recu-${data.clientName}-${new Date(data.timestamp).getTime()}`,
    pageStyle,
  })

  const onPrintClick = () => {
    const el = receiptRef.current
    // Measure exact rendered height, convert px→mm (1px = 0.2646mm at 96dpi), add 4mm buffer
    const mm = el ? Math.ceil(el.scrollHeight * 0.2646) + 4 : 160
    // flushSync commits the state update synchronously so react-to-print's
    // internal options ref is updated before handlePrint() reads it
    flushSync(() => setPageStyle(buildPageStyle(mm)))
    handlePrint()
  }

  return (
    <>
      <button
        type="button"
        onClick={onPrintClick}
        className={
          className ||
          'flex items-center justify-center gap-1.5 bg-surface2 border border-teal/30 text-teal font-bold py-2 px-3 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/10 transition-all'
        }
        title="Imprimer le reçu"
      >
        <Printer size={14} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {/* Rendered off-screen with explicit width so scrollHeight is accurate */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '72mm', visibility: 'hidden', pointerEvents: 'none' }}>
        <Receipt ref={receiptRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
