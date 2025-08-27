'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { Textarea } from '@/components/ui/textarea'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { Button } from '@/components/ui/button'

const FormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  personalNumber: z.string().min(1),
  idNumber: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  fax: z.string().optional(),
  agNumber: z.string().min(1),
  maNumber: z.string().min(1),
  barcode: z.string().min(1),
  createdAt: z.string().min(1),
  validTill: z.string().min(1),
  note: z.string().optional(),
  signatureAn: z.any().optional(),
  signatureAg: z.any().optional(),
  photo: z.any().optional(),
})

type FormValues = z.infer<typeof FormSchema>

export default function Home() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [signAnUrl, setSignAnUrl] = useState<string | null>(null)
  const [signAgUrl, setSignAgUrl] = useState<string | null>(null)
  // Using static logo from public now; no state needed
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      firstName: 'Jawid',
      lastName: 'Zadran',
      personalNumber: '34',
      idNumber: '000150',
      address: 'Landsberger Str. 482\n81241 München',
      phone: '089-54319843',
      agNumber: '16495',
      maNumber: '3782664',
      barcode: '1199801000023',
      createdAt: new Date().toLocaleDateString('de-DE'),
      validTill: '06.06.2027',
      note: 'Sollten Sie diesen Ausweis finden, so bitten wir Sie ihn uns unfrei an obige Adresse zu senden.',
    },
  })

  // Derived values from the form
  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const idNumberVal = watch('idNumber')
  const barcodeVal = watch('barcode')
  const fullName = `${(lastName || '').trim()}, ${(firstName || '').trim()}`

  // Image upload helper
  const onImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Generate QR when id number changes
  useEffect(() => {
    if (!idNumberVal) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(idNumberVal, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [idNumberVal])

  // Generate barcode when barcode value changes
  useEffect(() => {
    if (!barcodeVal) {
      setBarcodeUrl(null)
      return
    }
    try {
      const canvas = document.createElement('canvas')
      const format: 'EAN13' | 'CODE128' =
        barcodeVal.length === 13 ? 'EAN13' : 'CODE128'
      JsBarcode(canvas, barcodeVal, {
        format,
        displayValue: false,
        margin: 0,
        height: 40,
        background: '#ffffff',
      })
      setBarcodeUrl(canvas.toDataURL('image/png'))
    } catch {
      setBarcodeUrl(null)
    }
  }, [barcodeVal])

  // No-op submit to keep the Update Preview button semantic; watch() already updates live
  const onSubmit = () => {}
  const downloadPdf = async () => {
    // Programmatic jsPDF drawing (no html2canvas) to avoid color parsing errors
    type ImgType = 'PNG' | 'JPEG' | 'WEBP'
    const getMimeFromDataUrl = (url: string | null): string | null => {
      if (!url) return null
      const m = url.match(/^data:([^;]+);base64,/i)
      return m?.[1] || null
    }
    const getJsPdfType = (mime: string | null): ImgType | null => {
      if (!mime) return null
      const m = mime.toLowerCase()
      if (m === 'image/png') return 'PNG'
      if (m === 'image/jpeg' || m === 'image/jpg') return 'JPEG'
      if (m === 'image/webp') return 'WEBP'
      return null
    }
    const rasterizeToPng = (url: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas 2D context not available'))
          ctx.drawImage(img, 0, 0)
          try {
            resolve(canvas.toDataURL('image/png'))
          } catch (e) {
            reject(e)
          }
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = url
      })
    const ensureSupported = async (
      url: string | null
    ): Promise<{ url: string; type: ImgType } | null> => {
      if (!url) return null
      const mime = getMimeFromDataUrl(url)
      const t = getJsPdfType(mime)
      if (t === 'PNG' || t === 'JPEG') return { url, type: t }
      // Convert WEBP or unknown to PNG
      try {
        const png = await rasterizeToPng(url)
        return { url: png, type: 'PNG' }
      } catch {
        return null
      }
    }
    const pxToMm = (px: number) => (px * 25.4) / 96
    // Get the inner white card dimensions (excluding p-3 padding)
    const outerContainer = previewRef.current
    const innerCard = outerContainer?.querySelector('.bg-white') as HTMLElement
    const wPx = innerCard?.clientWidth || 680 - 24 // 680px - 12px padding on each side
    const hPx = innerCard?.clientHeight || 940 - 24 // estimated height - padding
    const W = pxToMm(wPx)
    const H = pxToMm(hPx)
    const pdf = new jsPDF({
      orientation: W > H ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [W, H],
    })

    const rgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '')
      const full =
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h
      const n = parseInt(full, 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const drawText = (
      text: string,
      x: number,
      y: number,
      size = 10,
      bold = false
    ) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      pdf.setFontSize(size)
      pdf.text(text, x, y)
    }

    // Background card with border
    const pad = pxToMm(16) // Exact conversion of p-4 (16px) to mm
    const borderColor = rgb('#e5e7eb')
    pdf.setDrawColor(...borderColor)
    pdf.setFillColor(255, 255, 255)
    // No border rectangle - the preview doesn't show one
    pdf.rect(0, 0, W, H, 'F') // Just fill with white

    // Header: photo (left) + company logo and name (right)
    const photoW = pxToMm(120), // Exact match to w-[120px]
      photoH = pxToMm(140) // Exact match to h-[140px]
    const photoImg = await ensureSupported(photoUrl)
    if (photoImg)
      pdf.addImage(photoImg.url, photoImg.type, pad, pad, photoW, photoH)
    const headerX = pad + photoW + pxToMm(16) // gap-4 = 16px
    const headerWidth = W - headerX - pad
    let headerY = pad
    try {
      const logoPng = await rasterizeToPng('/logo-united.png')
      const logoWmm = Math.min(119, headerWidth)
      const logoHmm = 48
      const logoX = headerX + (headerWidth - logoWmm) / 2
      pdf.addImage(logoPng, 'PNG', logoX, headerY, logoWmm, logoHmm)
      headerY += logoHmm + 2
    } catch {}
    // company name and city text removed from header

    // Name bar
    const nameBarY = pad + photoH // Directly after the header section
    const nameBarHeight = pxToMm(48) // py-2 + text-2xl ≈ 48px total height
    pdf.setFillColor(...rgb('#1e40af'))
    pdf.rect(0, nameBarY, W, nameBarHeight, 'F')
    pdf.setTextColor(255, 255, 255)
    drawText(
      `${(watch('lastName') || '').trim()}, ${(
        watch('firstName') || ''
      ).trim()}`,
      pad,
      nameBarY + nameBarHeight * 0.7, // Vertically center the text
      12,
      true
    )
    pdf.setTextColor(0, 0, 0)

    // Info band with QR
    const bandY = nameBarY + nameBarHeight
    const bandHeight = pxToMm(80) // py-4 = 32px + content ≈ 80px total
    pdf.setFillColor(...rgb('#bfdbfe')) // Matching the preview color
    pdf.rect(0, bandY, W, bandHeight, 'F')
    const textY1 = bandY + pxToMm(20)
    const textY2 = bandY + pxToMm(40)
    drawText('Personalnummer:', pad, textY1, 9)
    drawText(watch('personalNumber') || '', pad + pxToMm(100), textY1, 9, true)
    drawText('Ausweisnummer:', pad, textY2, 9)
    drawText(watch('idNumber') || '', pad + pxToMm(100), textY2, 9, true)
    const qrSize = pxToMm(80) // h-20 w-20 = 80px
    if (qrDataUrl)
      pdf.addImage(
        qrDataUrl,
        'PNG',
        W - pad - qrSize,
        bandY + pxToMm(8),
        qrSize,
        qrSize
      )

    // Gray separator section (matching preview)
    const separatorY = bandY + bandHeight
    const separatorHeight = pxToMm(16) // h-4 = 16px
    pdf.setFillColor(...rgb('#f3f4f6')) // bg-gray-100
    pdf.rect(0, separatorY, W, separatorHeight, 'F')

    // Details block - with separator line
    let y = separatorY + separatorHeight + pxToMm(16) // p-4 top padding
    // Add separator line (border-t)
    pdf.setDrawColor(...rgb('#e5e7eb'))
    pdf.line(0, separatorY + separatorHeight, W, separatorY + separatorHeight)

    drawText('Der/Die Inhaber/in ist Mitarbeiter/in der Firma:', pad, y, 9)
    y += pxToMm(24) // mb-1 + spacing
    const addressLines = (watch('address') || '').split('\n')
    addressLines.forEach((line) => {
      drawText(line, pad, y, 9)
      y += pxToMm(20) // line height
    })
    // Tel/Fax on the right side
    const rightColX = W - pad - pxToMm(120)
    let rightY = y - pxToMm(20 * addressLines.length) + pxToMm(20)
    drawText(`Tel: ${watch('phone') || ''}`, rightColX, rightY, 9)
    if (watch('fax')) {
      rightY += pxToMm(20)
      drawText(`Fax: ${watch('fax')}`, rightColX, rightY, 9)
    }

    // Registry and barcode - matching preview spacing
    y += pxToMm(12) // mt-3
    const registryStartY = y
    drawText('Bewacherregisternummer AG:', pad, y, 9)
    drawText(watch('agNumber') || '', pad + pxToMm(160), y, 9, true)
    y += pxToMm(24) // space-y-1
    drawText('Bewacherregisternummer Ma:', pad, y, 9)
    drawText(watch('maNumber') || '', pad + pxToMm(160), y, 9, true)
    y += pxToMm(24) // space-y-1
    drawText('Barcode:', pad, y, 9)
    drawText(watch('barcode') || '', pad + pxToMm(60), y, 9, true)

    // Barcode image on the right
    const barcodeWidth = pxToMm(160) // Estimated barcode width
    const barcodeHeight = pxToMm(40) // h-10 = 40px
    if (barcodeUrl)
      pdf.addImage(
        barcodeUrl,
        'PNG',
        W - pad - barcodeWidth,
        registryStartY + pxToMm(32),
        barcodeWidth,
        barcodeHeight
      )

    // Signatures - matching preview layout exactly
    y += pxToMm(24) // mt-6
    const sigSectionY = y + pxToMm(80) // h-20 spacing above lines
    const sigAreaHeight = pxToMm(32) // h-8
    const sigTop = sigSectionY + sigAreaHeight

    pdf.setDrawColor(...rgb('#e5e7eb'))
    pdf.line(pad, sigSectionY, W / 2 - pxToMm(12), sigSectionY) // gap-6/2
    pdf.line(W / 2 + pxToMm(12), sigSectionY, W - pad, sigSectionY)

    const signAnImg = await ensureSupported(signAnUrl)
    const signAgImg = await ensureSupported(signAgUrl)

    if (signAnImg)
      pdf.addImage(
        signAnImg.url,
        signAnImg.type,
        pad,
        sigSectionY + pxToMm(4), // py-1
        W / 2 - pxToMm(24), // account for gap
        sigAreaHeight - pxToMm(8) // minus py-1 top/bottom
      )
    if (signAgImg)
      pdf.addImage(
        signAgImg.url,
        signAgImg.type,
        W / 2 + pxToMm(12),
        sigSectionY + pxToMm(4),
        W / 2 - pxToMm(24),
        sigAreaHeight - pxToMm(8)
      )

    // Signature labels
    const labelY = sigTop + pxToMm(8)
    drawText(
      'Unterschrift AN',
      pad + (W / 2 - pxToMm(24)) / 2 - pxToMm(30),
      labelY,
      8
    )
    drawText(
      'Unterschrift AG',
      W / 2 + pxToMm(12) + (W / 2 - pxToMm(24)) / 2 - pxToMm(30),
      labelY,
      8
    )

    // Note
    const note = (watch('note') || '').trim()
    if (note) {
      pdf.setTextColor(...rgb('#374151'))
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      const split = pdf.splitTextToSize(note, W - 2 * pad)
      pdf.text(split, pad, sigTop + 14)
      pdf.setTextColor(0, 0, 0)
    }

    // Dates footer
    pdf.setFontSize(9)
    const leftText = `Erstelldatum: ${watch('createdAt') || ''}`
    const rightText = `Gültig bis: ${watch('validTill') || ''}`
    const leftWidth = pdf.getTextWidth(leftText)
    const rightWidth = pdf.getTextWidth(rightText)
    const totalWidth = leftWidth + rightWidth + 10 // 10mm gap between dates
    const startX = (W - totalWidth) / 2
    drawText(leftText, startX, H - 6, 9)
    drawText(rightText, startX + leftWidth + 10, H - 6, 9)

    pdf.save(`id-card-${watch('idNumber') || 'preview'}.pdf`)
  }

  return (
    <div
      className='min-h-dvh'
      style={{
        background:
          'radial-gradient(80% 60% at 50% -20%, #fafafa 0%, rgba(250,250,250,0) 60%), linear-gradient(180deg, #ffffff, #f3f4f6)',
      }}
    >
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <h1 className='text-2xl font-semibold mb-6'>ID Card Generator</h1>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
          <Card className='backdrop-blur-xl bg-white/70 border-border/40 shadow-xl'>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className='grid grid-cols-1 gap-6'
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Person
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='firstName'>First name</Label>
                    <Input
                      id='firstName'
                      placeholder='Jawid'
                      {...register('firstName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor='lastName'>Last name</Label>
                    <Input
                      id='lastName'
                      placeholder='Zadran'
                      {...register('lastName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor='personalNumber'>Personalnummer</Label>
                    <Input
                      id='personalNumber'
                      {...register('personalNumber')}
                    />
                  </div>
                  <div>
                    <Label htmlFor='idNumber'>Ausweisnummer</Label>
                    <Input id='idNumber' {...register('idNumber')} />
                  </div>
                </div>

                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Company
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='sm:col-span-2'>
                    <Label htmlFor='address'>Address</Label>
                    <Textarea id='address' rows={2} {...register('address')} />
                  </div>
                  <div>
                    <Label htmlFor='phone'>Tel</Label>
                    <Input id='phone' {...register('phone')} />
                  </div>
                  <div>
                    <Label htmlFor='fax'>Fax</Label>
                    <Input id='fax' {...register('fax')} />
                  </div>
                </div>

                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Registry
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='agNumber'>Bewacherregisternummer AG</Label>
                    <Input id='agNumber' {...register('agNumber')} />
                  </div>
                  <div>
                    <Label htmlFor='maNumber'>Bewacherregisternummer Ma</Label>
                    <Input id='maNumber' {...register('maNumber')} />
                  </div>
                  <div className='sm:col-span-2'>
                    <Label htmlFor='barcode'>Barcode</Label>
                    <Input id='barcode' {...register('barcode')} />
                  </div>
                </div>

                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Validity
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='createdAt'>Erstelldatum</Label>
                    <Input
                      id='createdAt'
                      placeholder='06.06.2025'
                      {...register('createdAt')}
                    />
                  </div>
                  <div>
                    <Label htmlFor='validTill'>Gültig bis</Label>
                    <Input
                      id='validTill'
                      placeholder='06.06.2027'
                      {...register('validTill')}
                    />
                  </div>
                  <div className='sm:col-span-2'>
                    <Label htmlFor='note'>Note</Label>
                    <Textarea id='note' rows={2} {...register('note')} />
                  </div>
                </div>

                <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Uploads
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div>
                    <Label>Upload Photo</Label>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) => onImage(e, setPhotoUrl)}
                    />
                  </div>
                  <div>
                    <Label>Signature AN</Label>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) => onImage(e, setSignAnUrl)}
                    />
                  </div>
                  <div>
                    <Label>Signature AG</Label>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) => onImage(e, setSignAgUrl)}
                    />
                  </div>
                </div>

                <div className='flex gap-3 mt-2'>
                  <Button type='submit'>Update Preview</Button>
                  <Button type='button' variant='outline' onClick={downloadPdf}>
                    Download PDF
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className='backdrop-blur-xl bg-white/70 border-border/40 shadow-xl'>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className='w-[680px] max-w-full rounded-xl overflow-hidden border mx-auto p-3 bg-gray-400'
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#000000',
                  borderColor: '#e5e7eb',
                  // Override Tailwind CSS vars with safe sRGB colors so html2canvas doesn't parse oklch/lab
                  ['--background' as string]: '#ffffff',
                  ['--foreground' as string]: '#000000',
                  ['--card' as string]: '#ffffff',
                  ['--card-foreground' as string]: '#000000',
                  ['--popover' as string]: '#ffffff',
                  ['--popover-foreground' as string]: '#000000',
                  ['--primary' as string]: '#1e40af',
                  ['--primary-foreground' as string]: '#ffffff',
                  ['--secondary' as string]: '#f3f4f6',
                  ['--secondary-foreground' as string]: '#111827',
                  ['--muted' as string]: '#f3f4f6',
                  ['--muted-foreground' as string]: '#6b7280',
                  ['--accent' as string]: '#f3f4f6',
                  ['--accent-foreground' as string]: '#111827',
                  ['--destructive' as string]: '#ef4444',
                  ['--border' as string]: '#e5e7eb',
                  ['--input' as string]: '#e5e7eb',
                  ['--ring' as string]: '#1e40af',
                }}
              >
                <div className='bg-white rounded-lg overflow-hidden'>
                  {/* Header with photo and pseudo logo */}
                  <div className='p-4'>
                    <div className='grid grid-cols-[120px_1fr] gap-4 items-center'>
                      <div
                        className='h-[140px] w-[120px] overflow-hidden rounded-md border'
                        style={{
                          backgroundColor: '#e5e7eb',
                          borderColor: '#e5e7eb',
                        }}
                      >
                        {photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt='photo'
                            src={photoUrl as string}
                            className='h-full w-full object-cover'
                          />
                        )}
                      </div>
                      <div className='flex items-center justify-center'>
                        <div className='flex flex-col items-center text-center'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src='/logo-united.png'
                            alt='company logo'
                            className='h-38 object-contain mb-1'
                          />
                          {/* Company name and city text removed; logo-only header */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name bar */}
                  <div
                    className='px-4 py-2 text-2xl font-semibold'
                    style={{ backgroundColor: '#1e40af', color: '#ffffff' }}
                  >
                    {fullName}
                  </div>

                  {/* Quick info band */}
                  <div
                    className='px-4 py-4 grid grid-cols-[1fr_auto] gap-4 items-center'
                    style={{ backgroundColor: '#bfdbfe' }}
                  >
                    <div className='grid gap-1 text-[15px]'>
                      <div className='flex items-center gap-2'>
                        <span style={{ color: '#374151' }}>
                          Personalnummer:
                        </span>
                        <strong>{watch('personalNumber')}</strong>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span style={{ color: '#374151' }}>Ausweisnummer:</span>
                        <strong>{watch('idNumber')}</strong>
                      </div>
                    </div>
                    <div className='flex flex-col items-center gap-2'>
                      {qrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt='qr' className='h-20 w-20' />
                      )}
                    </div>
                  </div>

                  {/* Separator section with gray background */}
                  <div className='bg-gray-100 h-4'></div>

                  {/* Details section - separated from top section */}
                  <div className='p-4 text-[14px] border-t border-gray-200'>
                    <p className='mb-1'>
                      Der/Die Inhaber/in ist Mitarbeiter/in der Firma:
                    </p>
                    {/* Company name removed from details */}
                    <div className='grid grid-cols-[1fr_auto] gap-4'>
                      <div className='whitespace-pre-line'>
                        {watch('address')}
                      </div>
                      <div>
                        <div>Tel: {watch('phone')}</div>
                        {watch('fax') && <div>Fax: {watch('fax')}</div>}
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-x-6 mt-3'>
                      <div className='space-y-1'>
                        <div className='flex gap-2'>
                          <span className='whitespace-nowrap'>
                            Bewacherregisternummer AG:
                          </span>
                          <span className='font-semibold'>
                            {watch('agNumber')}
                          </span>
                        </div>
                        <div className='flex gap-2'>
                          <span className='whitespace-nowrap'>
                            Bewacherregisternummer Ma:
                          </span>
                          <span className='font-semibold'>
                            {watch('maNumber')}
                          </span>
                        </div>
                        <div className='flex gap-2'>
                          <span className='whitespace-nowrap'>Barcode:</span>
                          <span className='font-semibold'>
                            {watch('barcode')}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-end justify-end'>
                        {barcodeUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={barcodeUrl}
                            alt='barcode'
                            className='h-10'
                          />
                        )}
                      </div>
                    </div>

                    <div className='grid grid-cols-2 items-end gap-6 mt-6'>
                      {/* Signature AN */}
                      <div className='text-center text-sm'>
                        <div className='h-20'></div>
                        <div style={{ borderTop: '1px solid #e5e7eb' }} />
                        <div className='h-8 flex items-end justify-center py-1'>
                          {signAnUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signAnUrl as string}
                              alt='sign an'
                              className='max-h-full object-contain'
                            />
                          )}
                        </div>
                        <div style={{ color: '#374151' }}>Unterschrift AN</div>
                      </div>
                      {/* Signature AG */}
                      <div className='text-center text-sm'>
                        <div className='h-20'></div>
                        <div style={{ borderTop: '1px solid #e5e7eb' }} />
                        <div className='h-8 flex items-end justify-center py-1'>
                          {signAgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signAgUrl as string}
                              alt='sign ag'
                              className='max-h-full object-contain'
                            />
                          )}
                        </div>
                        <div style={{ color: '#374151' }}>Unterschrift AG</div>
                      </div>
                    </div>

                    {watch('note') && (
                      <p
                        className='text-[13px] mt-4'
                        style={{ color: '#374151' }}
                      >
                        {watch('note')}
                      </p>
                    )}

                    <div className='flex items-center justify-center gap-4 text-[13px] mt-3'>
                      <div>Erstelldatum: {watch('createdAt')}</div>
                      <div>Gültig bis: {watch('validTill')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
