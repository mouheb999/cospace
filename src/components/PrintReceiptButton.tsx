'use client'

import { useRef, useState, useLayoutEffect } from 'react'
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

const PX_TO_MM = 0.2646 // 1 CSS px = 0.2646mm at 96dpi

export function PrintReceiptButton({
  data,
  spaceName,
  className,
  label = 'Imprimer',
  iconOnly = false,
}: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [pageHeightMm, setPageHeightMm] = useState<number>(160)

  // Measure the rendered receipt after mount + fonts load, then lock the
  // print page size to that exact height. By the time the user clicks the
  // button, pageStyle has been recomputed with the correct value.
  useLayoutEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const el = receiptRef.current
      if (!el) return
      const mm = Math.ceil(el.scrollHeight * PX_TO_MM) + 2 // 2mm safety
      setPageHeightMm((prev) => (prev === mm ? prev : mm))
    }

    const docWithFonts = document as Document & { fonts?: { ready: Promise<unknown> } }
    if (docWithFonts.fonts) {
      docWithFonts.fonts.ready.then(measure)
    } else {
      measure()
    }

    return () => { cancelled = true }
  }, [data, spaceName])

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recu-${data.clientName}-${new Date(data.timestamp).getTime()}`,
    // @page must live here (iframe <head>) for the browser to honor it.
    // margin:0 also suppresses Chrome's default headers/footers (date/URL/page#).
    pageStyle: `
      @page {
        size: 80mm ${pageHeightMm}mm;
        margin: 0;
      }
      html, body {
        width: 72mm !important;
        height: ${pageHeightMm}mm !important;
        min-height: 0 !important;
        max-height: ${pageHeightMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
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

      {/* Off-screen at 72mm width so scrollHeight matches the real print height */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '72mm', visibility: 'hidden', pointerEvents: 'none' }}>
        <Receipt ref={receiptRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
