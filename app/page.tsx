'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Button from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

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

  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const idNumber = watch('idNumber')
  const barcodeValue = watch('barcode')

  const fullName = useMemo(() => {
    const f = firstName || ''
    const l = lastName || ''
    return `${l}, ${f}`
  }, [firstName, lastName])

  // Generate QR and barcode on changes
  useEffect(() => {
    const id = idNumber
    if (!id) return
    QRCode.toDataURL(id, { margin: 0, width: 256 }).then(setQrDataUrl)
  }, [idNumber])

  useEffect(() => {
    const code = barcodeValue
    if (!code) return
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, code, {
        format: 'EAN13',
        displayValue: false,
        height: 40,
      })
      setBarcodeUrl(canvas.toDataURL('image/png'))
    } catch {
      // ignore invalid
      setBarcodeUrl(null)
    }
  }, [barcodeValue])

  const onImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    set: (v: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = () => {
    // nothing special, preview already updates in real time
  }

  const downloadPdf = async () => {
    if (!previewRef.current) return
    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = 210
    const margin = 10
    const width = pageWidth - margin * 2
    const ratio = canvas.height / canvas.width
    const height = width * ratio
    pdf.addImage(imgData, 'PNG', margin, margin, width, height)
    pdf.save(`id-card-${watch('idNumber') || 'preview'}.pdf`)
  }

  return (
    <div className='min-h-dvh w-full bg-[radial-gradient(80%_60%_at_50%_-20%,oklch(0.98_0_0)_0%,transparent_60%),linear-gradient(180deg,oklch(0.99_0_0),oklch(0.96_0_0))]'>
      <div className='mx-auto max-w-6xl px-4 py-10'>
        <h1 className='text-2xl font-semibold mb-6'>ID Card Generator</h1>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-start'>
          <Card className='backdrop-blur-xl bg-white/70 border-border/40 shadow-xl'>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className='grid grid-cols-1 sm:grid-cols-2 gap-4'
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className='sm:col-span-1'>
                  <Label htmlFor='firstName'>First name</Label>
                  <Input
                    id='firstName'
                    placeholder='Jawid'
                    {...register('firstName')}
                  />
                </div>
                <div className='sm:col-span-1'>
                  <Label htmlFor='lastName'>Last name</Label>
                  <Input
                    id='lastName'
                    placeholder='Zadran'
                    {...register('lastName')}
                  />
                </div>
                <div>
                  <Label htmlFor='personalNumber'>Personalnummer</Label>
                  <Input id='personalNumber' {...register('personalNumber')} />
                </div>
                <div>
                  <Label htmlFor='idNumber'>Ausweisnummer</Label>
                  <Input id='idNumber' {...register('idNumber')} />
                </div>
                <div className='sm:col-span-2'>
                  <Label htmlFor='company'>Company</Label>
                  <Input id='company' {...register('company')} />
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
                <div>
                  <Label htmlFor='agNumber'>Bewacherregisternummer AG</Label>
                  <Input id='agNumber' {...register('agNumber')} />
                </div>
                <div>
                  <Label htmlFor='maNumber'>Bewacherregisternummer Ma</Label>
                  <Input id='maNumber' {...register('maNumber')} />
                </div>
                <div>
                  <Label htmlFor='barcode'>Barcode</Label>
                  <Input id='barcode' {...register('barcode')} />
                </div>
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
                <div className='sm:col-span-2 flex gap-3 mt-2'>
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
                    <div className='flex items-center justify-between'>
                      <div className='text-right'>
                        <div className='text-[28px] font-bold tracking-wide'>
                          UNITED
                        </div>
                        <div className='text-[22px] font-semibold -mt-1'>
                          SECURITY
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
                    <div
                      className='pt-2 text-center text-sm'
                      style={{ borderTop: '1px solid #e5e7eb' }}
                    >
                      Unterschrift AN
                      {signAnUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signAnUrl as string}
                          alt='sign an'
                          className='h-14 -mt-10 mx-auto'
                        />
                      )}
                    </div>
                    <div
                      className='pt-2 text-center text-sm'
                      style={{ borderTop: '1px solid #e5e7eb' }}
                    >
                      Unterschrift AG
                      {signAgUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signAgUrl as string}
                          alt='sign ag'
                          className='h-14 -mt-10 mx-auto'
                        />
                      )}
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
