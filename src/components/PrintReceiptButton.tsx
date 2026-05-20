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
  const [ready, setReady] = useState(false)

  const handlePrint = async () => {
    const source = sourceRef.current
    if (!source || printing) return
    setPrinting(true)
    setReady(false)

    try {
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

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 80, heightMm)

      const filename = `Recu-${data.clientName.replace(/\s+/g, '_')}-${new Date(data.timestamp).getTime()}.pdf`
      const pdfBlob = pdf.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)

      // Download directly — Chrome's PDF viewer auto-print is incompatible with
      // ESC/POS drivers on Windows 10. Downloading opens the file in the system
      // PDF viewer (Adobe/Foxit/Windows) which sends a complete job and cuts correctly.
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000)
      setReady(true)
      setTimeout(() => setReady(false), 4000)
    } catch (err) {
      console.error('[PrintReceipt] failed:', err)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handlePrint}
        disabled={printing}
        className={
          className ||
          'flex items-center justify-center gap-1.5 bg-surface2 border border-teal/30 text-teal font-bold py-2 px-3 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/10 transition-all disabled:opacity-50'
        }
        title="Télécharger le reçu PDF"
      >
        <Printer size={14} />
        {!iconOnly && <span>{printing ? 'Génération...' : label}</span>}
      </button>

      {ready && (
        <span className="text-[0.7rem] text-teal/70 text-center">
          PDF prêt — ouvrez depuis les téléchargements
        </span>
      )}

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
    </div>
  )
}

export default PrintReceiptButton
