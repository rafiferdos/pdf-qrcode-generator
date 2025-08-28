"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Textarea } from "@/components/ui/textarea";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import QRCode from "qrcode";
// JsBarcode removed: barcode will remain in the form but won't be rendered in preview or PDF
import { Button } from "@/components/ui/button";

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
});

type FormValues = z.infer<typeof FormSchema>;

export default function Home() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signAnUrl, setSignAnUrl] = useState<string | null>(null);
  const [signAgUrl, setSignAgUrl] = useState<string | null>(null);
  // Using static logo from public now; no state needed
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      personalNumber: "",
      idNumber: "",
      address: "",
      phone: "",
      agNumber: "",
      maNumber: "",
      barcode: "",
  createdAt: new Date().toLocaleDateString("de-DE"),
  validTill: "",
    },
  });

  // Derived values from the form
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const idNumberVal = watch("idNumber");
  // barcode value is still available in the form via watch('barcode'),
  // but we won't generate or render an image for it in preview or PDF.
  const fullName = `${(lastName || "").trim()}, ${(firstName || "").trim()}`;

  // Image upload helper
  const onImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Generate QR when id number changes
  useEffect(() => {
    if (!idNumberVal) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(idNumberVal, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [idNumberVal]);

  // Barcode generation intentionally disabled - barcode remains as a text field only.

  // No-op submit to keep the Update Preview button semantic; watch() already updates live
  const onSubmit = () => {};
  // New: Snapshot the preview DOM to an image and embed it into a single-page PDF
  const downloadPdfSnapshot = async () => {
    if (!previewRef.current) return;
    const pxToMm = (px: number) => (px * 25.4) / 96;
    const node = previewRef.current;
    const wPx = node.clientWidth || 680;
    const hPx = node.clientHeight || 940;
    // Use html-to-image for robust rendering, avoiding color parser issues
    const imgData = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f3f4f6",
    });
    const W = pxToMm(wPx);
    const H = pxToMm(hPx);
    const pdf = new jsPDF({
      orientation: W > H ? "landscape" : "portrait",
      unit: "mm",
      format: [W, H],
    });
    pdf.addImage(imgData, "PNG", 0, 0, W, H);
    pdf.save(`id-card-${watch("idNumber") || "preview"}.pdf`);
  };
  // Removed old manual PDF drawing function in favor of snapshot approach

  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          "radial-gradient(80% 60% at 50% -20%, #fafafa 0%, rgba(250,250,250,0) 60%), linear-gradient(180deg, #ffffff, #f3f4f6)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">ID Card Generator</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="backdrop-blur-xl bg-white/70 border-border/40 shadow-xl">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 gap-6"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Person
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jawid"
                      {...register("firstName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Zadran"
                      {...register("lastName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalNumber">Personalnummer</Label>
                    <Input
                      id="personalNumber"
                      {...register("personalNumber")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="idNumber">Ausweisnummer</Label>
                    <Input id="idNumber" {...register("idNumber")} />
                  </div>
                </div>

                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Company
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" rows={2} {...register("address")} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Tel</Label>
                    <Input id="phone" {...register("phone")} />
                  </div>
                  <div>
                    <Label htmlFor="fax">Fax</Label>
                    <Input id="fax" {...register("fax")} />
                  </div>
                </div>

                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Registry
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agNumber">Bewacherregisternummer AG</Label>
                    <Input id="agNumber" {...register("agNumber")} />
                  </div>
                  <div>
                    <Label htmlFor="maNumber">Bewacherregisternummer Ma</Label>
                    <Input id="maNumber" {...register("maNumber")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input id="barcode" {...register("barcode")} />
                  </div>
                </div>

                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Validity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="createdAt">Erstelldatum</Label>
                    <Input
                      id="createdAt"
                      placeholder="06.06.2025"
                      {...register("createdAt")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validTill">Gültig bis</Label>
                    <Input
                      id="validTill"
                      placeholder="06.06.2027"
                      {...register("validTill")}
                    />
                  </div>
                  {/* note field removed */}
                </div>

                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Uploads
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Upload Photo</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onImage(e, setPhotoUrl)}
                    />
                  </div>
                  <div>
                    <Label>Signature AN</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onImage(e, setSignAnUrl)}
                    />
                  </div>
                  <div>
                    <Label>Signature AG</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onImage(e, setSignAgUrl)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <Button type="submit">Update Preview</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadPdfSnapshot}
                  >
                    Download PDF
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/70 border-border/40 shadow-xl">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className="w-[680px] max-w-full rounded-xl overflow-hidden border mx-auto p-3 bg-gray-400"
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#000000",
                  borderColor: "#e5e7eb",
                  // Override Tailwind CSS vars with safe sRGB colors so html2canvas doesn't parse oklch/lab
                  ["--background" as string]: "#ffffff",
                  ["--foreground" as string]: "#000000",
                  ["--card" as string]: "#ffffff",
                  ["--card-foreground" as string]: "#000000",
                  ["--popover" as string]: "#ffffff",
                  ["--popover-foreground" as string]: "#000000",
                  ["--primary" as string]: "#1e40af",
                  ["--primary-foreground" as string]: "#ffffff",
                  ["--secondary" as string]: "#f3f4f6",
                  ["--secondary-foreground" as string]: "#111827",
                  ["--muted" as string]: "#f3f4f6",
                  ["--muted-foreground" as string]: "#6b7280",
                  ["--accent" as string]: "#f3f4f6",
                  ["--accent-foreground" as string]: "#111827",
                  ["--destructive" as string]: "#ef4444",
                  ["--border" as string]: "#e5e7eb",
                  ["--input" as string]: "#e5e7eb",
                  ["--ring" as string]: "#1e40af",
                }}
              >
                <div className="bg-white rounded-lg overflow-hidden">
                  {/* Header with photo and pseudo logo */}
                  <div className="p-4">
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <div
                        className="h-[140px] w-[120px] overflow-hidden rounded-md border"
                        style={{
                          backgroundColor: "#e5e7eb",
                          borderColor: "#e5e7eb",
                        }}
                      >
                        {photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt="photo"
                            src={photoUrl as string}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logo-united.png"
                            alt="company logo"
                            className="h-38 object-contain mb-1"
                          />
                          {/* Company name and city text removed; logo-only header */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name bar */}
                  <div
                    className="px-4 py-2 text-2xl font-semibold"
                    style={{ backgroundColor: "#1e40af", color: "#ffffff" }}
                  >
                    {fullName}
                  </div>

                  {/* Quick info band */}
                  <div
                    className="px-4 py-4 grid grid-cols-[1fr_auto] gap-4 items-center"
                    style={{ backgroundColor: "#bfdbfe" }}
                  >
                    <div className="grid gap-1 text-[15px]">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#374151" }}>
                          Personalnummer:
                        </span>
                        <strong>{watch("personalNumber")}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#374151" }}>Ausweisnummer:</span>
                        <strong>{watch("idNumber")}</strong>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {qrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="qr" className="h-20 w-20" />
                      )}
                    </div>
                  </div>

                  {/* Separator section with gray background */}
                  <div className="bg-gray-100 h-4"></div>

                  {/* Details section - separated from top section */}
                  <div className="p-4 text-[14px] border-t border-gray-200">
                    <p className="mb-1">
                      Der/Die Inhaber/in ist Mitarbeiter/in der Firma:
                    </p>
                    {/* Company name removed from details */}
                    <div className="grid grid-cols-[1fr_auto] gap-4">
                      <div className="whitespace-pre-line">
                        {watch("address")}
                      </div>
                      <div>
                        <div>Tel: {watch("phone")}</div>
                        {watch("fax") && <div>Fax: {watch("fax")}</div>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 mt-3">
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <span className="whitespace-nowrap">
                            Bewacherregisternummer AG:
                          </span>
                          <span className="font-semibold">
                            {watch("agNumber")}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="whitespace-nowrap">
                            Bewacherregisternummer Ma:
                          </span>
                          <span className="font-semibold">
                            {watch("maNumber")}
                          </span>
                        </div>
                        {/* Show barcode as plain text in preview (no barcode image) */}
                        <div className="flex gap-2">
                          <span className="whitespace-nowrap">Barcode:</span>
                          <span className="font-semibold">{watch("barcode")}</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-end">
                        {/* intentionally empty - textual barcode shown on left column */}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 items-end gap-6 mt-2">
                      {/* Signature AN */}
                      <div className="text-center text-sm">
                        <div className="h-16"></div>
                        <div className="h-20 flex items-center justify-center py-2">
                          {signAnUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signAnUrl as string}
                              alt="sign an"
                              className="max-h-full max-w-full object-contain"
                            />
                          )}
                        </div>
                        <div style={{ borderTop: "1px solid #e5e7eb" }} />
                        <div style={{ color: "#374151" }}>Unterschrift AN</div>
                      </div>
                      {/* Signature AG */}
                      <div className="text-center text-sm">
                        <div className="h-16"></div>
                        <div className="h-20 flex items-center justify-center py-2">
                          {signAgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signAgUrl as string}
                              alt="sign ag"
                              className="max-h-full max-w-full object-contain"
                            />
                          )}
                        </div>
                        <div style={{ borderTop: "1px solid #e5e7eb" }} />
                        <div style={{ color: "#374151" }}>Unterschrift AG</div>
                      </div>
                    </div>

                      {/* Bottom text under signatures, left-aligned */}
                      <div className="mt-4 text-left">
                        <p className="text-[13px]" style={{ color: '#374151' }}>
                          Sollten Sie diesen Ausweis finden, so bitten wir Sie ihn
                          uns unfrei an obige Adresse zu senden.
                        </p>
                      </div>

                      {/* note removed from preview */}

                    <div className="flex items-center justify-center gap-4 text-[13px] mt-3">
                      <div>Erstelldatum: {watch("createdAt")}</div>
                      <div>Gültig bis: {watch("validTill")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
