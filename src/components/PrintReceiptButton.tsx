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

  // Measure the rendered receipt height and lock the page size to it.
  // Runs once after mount (and on data changes). We wait for fonts so the
  // Caveat logo's actual baseline-corrected height is included.
  useLayoutEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const el = receiptRef.current
      if (!el) return
      const mm = Math.ceil(el.scrollHeight * PX_TO_MM) + 2 // 2mm safety margin
      setPageHeightMm((prev) => (prev === mm ? prev : mm))
    }

    if (typeof document !== 'undefined' && (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts) {
      (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready.then(measure)
    } else {
      measure()
    }

    return () => { cancelled = true }
  }, [data, spaceName])

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Recu-${data.clientName}-${new Date(data.timestamp).getTime()}`,
    // Minimal pageStyle — actual @page rule is inside Receipt's own <style>
    // so it travels with the printed content into the iframe.
    pageStyle: `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
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
        <Receipt ref={receiptRef} data={data} spaceName={spaceName} pageHeightMm={pageHeightMm} />
      </div>
    </>
  )
}

export default PrintReceiptButton
