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
  company: z.string().min(1),
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)
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
      company: 'United Security Munich GmbH',
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
    const wPx = previewRef.current?.clientWidth || 680
    const hPx = previewRef.current?.clientHeight || 940
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
    const pad = 6
    const borderColor = rgb('#e5e7eb')
    pdf.setDrawColor(...borderColor)
    pdf.setFillColor(255, 255, 255)
    const anyPdf = pdf as unknown as {
      roundedRect?: (
        x: number,
        y: number,
        w: number,
        h: number,
        rx: number,
        ry?: number,
        style?: string
      ) => void
    }
    if (typeof anyPdf.roundedRect === 'function') {
      anyPdf.roundedRect(1.5, 1.5, W - 3, H - 3, 3, 3, 'DF')
    } else {
      pdf.rect(1.5, 1.5, W - 3, H - 3, 'DF')
    }

    // Header: photo (left) + company logo and name (right)
    const photoW = 34,
      photoH = 40
    const photoImg = await ensureSupported(photoUrl)
    if (photoImg) pdf.addImage(photoImg.url, photoImg.type, pad, pad, photoW, photoH)
    const headerX = pad + photoW + 8
    const headerWidth = W - headerX - pad
    let headerY = pad
    const companyNameHeader = (watch('company') || '').trim()
    const companyLogoHeader = await ensureSupported(companyLogoUrl)
    if (companyLogoHeader) {
      const logoWmm = Math.min(30, headerWidth)
      const logoHmm = 12
      const logoX = headerX + (headerWidth - logoWmm) / 2
      pdf.addImage(companyLogoHeader.url, companyLogoHeader.type, logoX, headerY, logoWmm, logoHmm)
      headerY += logoHmm + 2
    }
    if (companyNameHeader) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      const twCompany = pdf.getTextWidth(companyNameHeader)
      const tx = headerX + (headerWidth - twCompany) / 2
      pdf.text(companyNameHeader, tx, headerY + 10)
      headerY += 12
    }
    pdf.setTextColor(...rgb('#6b7280'))
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    const city = 'M U N I C H'
    const twCity = pdf.getTextWidth(city)
    const cityX = headerX + (headerWidth - twCity) / 2
    pdf.text(city, cityX, headerY + 6)
    pdf.setTextColor(0, 0, 0)

    // Name bar
    const nameBarY = pad + photoH + 6
    pdf.setFillColor(...rgb('#1e40af'))
    pdf.rect(1.5, nameBarY, W - 3, 9, 'F')
    pdf.setTextColor(255, 255, 255)
    drawText(
      `${(watch('lastName') || '').trim()}, ${(
        watch('firstName') || ''
      ).trim()}`,
      pad,
      nameBarY + 6.5,
      12,
      true
    )
    pdf.setTextColor(0, 0, 0)

    // Info band with QR
    const bandY = nameBarY + 9
    pdf.setFillColor(...rgb('#eff6ff'))
    pdf.rect(1.5, bandY, W - 3, 22, 'F')
    drawText('Personalnummer:', pad, bandY + 8, 9)
    drawText(watch('personalNumber') || '', pad + 30, bandY + 8, 9, true)
    drawText('Ausweisnummer:', pad, bandY + 16, 9)
    drawText(watch('idNumber') || '', pad + 30, bandY + 16, 9, true)
    if (qrDataUrl)
      pdf.addImage(qrDataUrl, 'PNG', W - pad - 20, bandY + 2, 20, 20)

    // Details block
    let y = bandY + 28
    drawText('Der/Die Inhaber/in ist Mitarbeiter/in der Firma:', pad, y, 9)
    y += 6
    drawText(watch('company') || '', pad, y, 10, true)
    y += 5
    const addressLines = (watch('address') || '').split('\n')
    addressLines.forEach((line) => {
      drawText(line, pad, y, 9)
      y += 5
    })
    drawText(`Tel: ${watch('phone') || ''}`, W - pad - 45, bandY + 35, 9)
    if (watch('fax'))
      drawText(`Fax: ${watch('fax')}`, W - pad - 45, bandY + 40, 9)

    // Registry and barcode
    y += 2
    drawText('Bewacherregisternummer AG:', pad, y, 9)
    drawText(watch('agNumber') || '', pad + 52, y, 9, true)
    y += 6
    drawText('Bewacherregisternummer Ma:', pad, y, 9)
    drawText(watch('maNumber') || '', pad + 52, y, 9, true)
    y += 6
    drawText('Barcode:', pad, y, 9)
    drawText(watch('barcode') || '', pad + 25, y, 9, true)
    if (barcodeUrl) pdf.addImage(barcodeUrl, 'PNG', W - pad - 40, y - 8, 40, 10)

    // Signatures
    const sigTop = H - 38
    pdf.setDrawColor(...borderColor)
    pdf.line(pad, sigTop, W / 2 - pad, sigTop)
    pdf.line(W / 2 + pad, sigTop, W - pad, sigTop)
    const signAnImg = await ensureSupported(signAnUrl)
    const signAgImg = await ensureSupported(signAgUrl)
    if (signAnImg)
      pdf.addImage(
        signAnImg.url,
        signAnImg.type,
        pad,
        sigTop - 16,
        W / 2 - 2 * pad,
        12
      )
    if (signAgImg)
      pdf.addImage(
        signAgImg.url,
        signAgImg.type,
        W / 2 + pad,
        sigTop - 16,
        W / 2 - 2 * pad,
        12
      )
    drawText('Unterschrift AN', pad + (W / 2 - 2 * pad) / 2 - 16, sigTop + 6, 8)
    drawText(
      'Unterschrift AG',
      W / 2 + pad + (W / 2 - 2 * pad) / 2 - 16,
      sigTop + 6,
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
    drawText(`Erstelldatum: ${watch('createdAt') || ''}`, pad, H - 6, 9)
    const rightText = `Gültig bis: ${watch('validTill') || ''}`
    const tw = pdf.getTextWidth(rightText)
    pdf.text(rightText, W - pad - tw, H - 6)

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
                    <Label htmlFor='company'>Company</Label>
                    <Input id='company' {...register('company')} />
                  </div>
                  <div className='sm:col-span-2'>
                    <Label htmlFor='companyLogo'>Company Logo</Label>
                    <Input
                      id='companyLogo'
                      type='file'
                      accept='image/*'
                      onChange={(e) => onImage(e, setCompanyLogoUrl)}
                    />
                  </div>
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
                className='w-[680px] max-w-full rounded-xl overflow-hidden border mx-auto'
                style={{
                  backgroundColor: '#ffffff',
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
                        {companyLogoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={companyLogoUrl}
                            alt='company logo'
                            className='h-12 object-contain mb-1'
                          />
                        )}
                        <div className='text-xl font-semibold'>
                          {watch('company')}
                        </div>
                        <div
                          className='text-xs tracking-[0.3em]'
                          style={{ color: '#6b7280' }}
                        >
                          M U N I C H
                        </div>
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
                  style={{ backgroundColor: '#eff6ff' }}
                >
                  <div className='grid gap-1 text-[15px]'>
                    <div className='flex items-center gap-2'>
                      <span style={{ color: '#374151' }}>Personalnummer:</span>
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

                {/* Details section */}
                <div className='p-4 text-[14px]'>
                  <p className='mb-1'>
                    Der/Die Inhaber/in ist Mitarbeiter/in der Firma:
                  </p>
                  <div className='font-semibold'>{watch('company')}</div>
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
                    <div className='grid grid-cols-[auto_1fr] gap-x-2'>
                      <div>Bewacherregisternummer AG:</div>
                      <div className='font-semibold'>{watch('agNumber')}</div>
                      <div>Bewacherregisternummer Ma:</div>
                      <div className='font-semibold'>{watch('maNumber')}</div>
                      <div>Barcode:</div>
                      <div className='font-semibold'>{watch('barcode')}</div>
                    </div>
                    <div className='flex items-end justify-end'>
                      {barcodeUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={barcodeUrl} alt='barcode' className='h-10' />
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 items-end gap-6 mt-6'>
                    {/* Signature AN */}
                    <div className='text-center text-sm'>
                      <div style={{ borderTop: '1px solid #e5e7eb' }} />
                      <div className='h-20 flex items-end justify-center py-2'>
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
                      <div style={{ borderTop: '1px solid #e5e7eb' }} />
                      <div className='h-20 flex items-end justify-center py-2'>
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

                  <div className='flex items-center justify-between text-[13px] mt-3'>
                    <div>Erstelldatum: {watch('createdAt')}</div>
                    <div>Gültig bis: {watch('validTill')}</div>
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
