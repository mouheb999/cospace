'use client'

import { useRef, useState } from 'react'
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
  const sourceRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  const handlePrint = async () => {
    const source = sourceRef.current
    if (!source || printing) return
    setPrinting(true)

    try {
      // Wait for all fonts to be ready before rasterizing
      await document.fonts.ready

      const heightMm = Math.ceil(source.scrollHeight * PX_TO_MM) + 2

      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ])

      const canvas = await html2canvas(source, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: source.scrollWidth,
        height: source.scrollHeight,
        logging: false,
      })

      const pdf = new jsPDF({
        unit: 'mm',
        format: [80, heightMm],
        orientation: 'portrait',
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, 80, heightMm)

      const pdfBlob = pdf.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)

      const printWindow = window.open(pdfUrl, '_blank')
      if (!printWindow) {
        URL.revokeObjectURL(pdfUrl)
        return
      }

      // Poll until the PDF viewer has fully rendered, then wait an extra 1500ms
      // before triggering print — PDF rendering in Chromium is async after readyState
      const checkLoaded = setInterval(() => {
        try {
          if (printWindow.document.readyState === 'complete') {
            clearInterval(checkLoaded)
            setTimeout(() => {
              printWindow.onafterprint = () => {
                printWindow.close()
                URL.revokeObjectURL(pdfUrl)
              }
              printWindow.focus()
              printWindow.print()
            }, 1500)
          }
        } catch (_) {}
      }, 500)
    } catch (err) {
      console.error('[PrintReceipt] failed:', err)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        disabled={printing}
        className={
          className ||
          'flex items-center justify-center gap-1.5 bg-surface2 border border-teal/30 text-teal font-bold py-2 px-3 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/10 transition-all disabled:opacity-50'
        }
        title="Imprimer le reçu"
      >
        <Printer size={14} />
        {!iconOnly && <span>{printing ? '...' : label}</span>}
      </button>

      {/* Off-screen source — position:fixed left:-9999px keeps it invisible without
          visibility:hidden, which html2canvas inherits and renders as blank */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '272px',
          pointerEvents: 'none',
        }}
      >
        <Receipt ref={sourceRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
