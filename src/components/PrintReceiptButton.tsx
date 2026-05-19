'use client'

import { useRef } from 'react'
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

/**
 * Self-contained thermal receipt printer.
 * Builds its own iframe, injects the receipt HTML + @page in <head>, prints,
 * then removes the iframe. Bypasses react-to-print so that @page { margin:0 }
 * is reliably applied — Chrome only honors @page from stylesheets in <head>.
 */
export function PrintReceiptButton({
  data,
  spaceName,
  className,
  label = 'Imprimer',
  iconOnly = false,
}: PrintReceiptButtonProps) {
  const sourceRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const source = sourceRef.current
    if (!source) return

    // Measure the rendered receipt height and convert to mm
    const heightMm = Math.ceil(source.scrollHeight * PX_TO_MM) + 2

    // Create a hidden iframe to host the print document
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      return
    }

    // Receipt's outerHTML carries all inline styles + SVGs + the font @import.
    const receiptHtml = source.outerHTML

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${`Recu-${data.clientName}-${new Date(data.timestamp).getTime()}`}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  @page {
    size: 80mm ${heightMm}mm;
    margin: 0;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    width: 72mm;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>${receiptHtml}</body>
</html>`

    doc.open()
    doc.write(html)
    doc.close()

    const triggerPrint = () => {
      try {
        win.focus()
        win.print()
      } catch (err) {
        console.error('[PrintReceipt] print failed:', err)
      }
      // Remove the iframe after the dialog closes (Chrome blocks until then)
      setTimeout(() => iframe.remove(), 500)
    }

    const waitForFontsThenPrint = () => {
      const docWithFonts = doc as Document & { fonts?: { ready: Promise<unknown> } }
      if (docWithFonts.fonts) {
        docWithFonts.fonts.ready.then(() => setTimeout(triggerPrint, 40))
      } else {
        setTimeout(triggerPrint, 200)
      }
    }

    if (doc.readyState === 'complete') {
      waitForFontsThenPrint()
    } else {
      win.addEventListener('load', waitForFontsThenPrint, { once: true })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className={
          className ||
          'flex items-center justify-center gap-1.5 bg-surface2 border border-teal/30 text-teal font-bold py-2 px-3 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/10 transition-all'
        }
        title="Imprimer le reçu"
      >
        <Printer size={14} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {/* Off-screen source at 72mm width — used to measure height + clone HTML */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '72mm',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Receipt ref={sourceRef} data={data} spaceName={spaceName} />
      </div>
    </>
  )
}

export default PrintReceiptButton
