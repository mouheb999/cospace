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

    const receiptHtml = source.outerHTML

    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Recu-${data.clientName}-${new Date(data.timestamp).getTime()}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  @page {
    size: 80mm auto;
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
</html>`)

    win.document.close()

    setTimeout(() => {
      win.focus()
      win.print()
      win.onafterprint = () => win.close()
    }, 1500)
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
