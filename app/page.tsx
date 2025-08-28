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
      createdAt: "",
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
      color: {
        dark: "#000000",
        light: "#00000000",
      },
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
    const wPx = node.offsetWidth || node.clientWidth || 680;
    const hPx = node.offsetHeight || node.clientHeight || 940;
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
    // Add a tiny inner margin to avoid any edge cropping due to rounding
    const m = 0.5; // mm
    pdf.addImage(
      imgData,
      "PNG",
      m,
      m,
      Math.max(0, W - 2 * m),
      Math.max(0, H - 2 * m)
    );
    pdf.save(`id-card-${watch("idNumber") || "preview"}.pdf`);
  };
  // Removed old manual PDF drawing function in favor of snapshot approach

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-spin duration-[20s]"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl mb-6 shadow-2xl">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-4">
            Professional ID Card Generator
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Create stunning professional identification cards with advanced
            customization and instant PDF export
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Enhanced Form Card */}
          <Card className="backdrop-blur-xl bg-slate-800/50 border-slate-700/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.02] group">
            <CardHeader className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border-b border-slate-700/50">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                Card Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
                {/* Personal Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-400 uppercase tracking-wider">
                      Personal Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="firstName"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        First Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="firstName"
                          placeholder=""
                          {...register("firstName")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="lastName"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Last Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="lastName"
                          placeholder=""
                          {...register("lastName")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="personalNumber"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Personal Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="personalNumber"
                          {...register("personalNumber")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="idNumber"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        ID Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="idNumber"
                          {...register("idNumber")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-400 uppercase tracking-wider">
                      Company Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2 space-y-3 group">
                      <Label
                        htmlFor="address"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Company Address
                      </Label>
                      <div className="relative">
                        <Textarea
                          id="address"
                          rows={3}
                          {...register("address")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500 resize-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="phone"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Phone
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          {...register("phone")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="fax"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Fax (Optional)
                      </Label>
                      <div className="relative">
                        <Input
                          id="fax"
                          {...register("fax")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registry Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-amber-400 uppercase tracking-wider">
                      Registry Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="agNumber"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Registry Number AG
                      </Label>
                      <div className="relative">
                        <Input
                          id="agNumber"
                          {...register("agNumber")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="maNumber"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Registry Number Ma
                      </Label>
                      <div className="relative">
                        <Input
                          id="maNumber"
                          {...register("maNumber")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-3 group">
                      <Label
                        htmlFor="barcode"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Barcode
                      </Label>
                      <div className="relative">
                        <Input
                          id="barcode"
                          {...register("barcode")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validity Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8l6-6m0 0l6 6M6 10l6 6"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-rose-400 uppercase tracking-wider">
                      Validity Period
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="createdAt"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Issue Date
                      </Label>
                      <div className="relative">
                        <Input
                          id="createdAt"
                          placeholder=""
                          {...register("createdAt")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label
                        htmlFor="validTill"
                        className="text-slate-300 font-medium group-hover:text-white transition-colors"
                      >
                        Expiry Date
                      </Label>
                      <div className="relative">
                        <Input
                          id="validTill"
                          placeholder=""
                          {...register("validTill")}
                          className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-violet-400 uppercase tracking-wider">
                      Upload Assets
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-3 group">
                      <Label className="text-slate-300 font-medium group-hover:text-white transition-colors">
                        Profile Photo
                      </Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onImage(e, setPhotoUrl)}
                          className="bg-slate-900/50 border-slate-600 text-white file:bg-purple-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4 file:font-medium hover:file:bg-purple-700 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label className="text-slate-300 font-medium group-hover:text-white transition-colors">
                        Signature AN
                      </Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onImage(e, setSignAnUrl)}
                          className="bg-slate-900/50 border-slate-600 text-white file:bg-cyan-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4 file:font-medium hover:file:bg-cyan-700 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                    <div className="space-y-3 group">
                      <Label className="text-slate-300 font-medium group-hover:text-white transition-colors">
                        Signature AG
                      </Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onImage(e, setSignAgUrl)}
                          className="bg-slate-900/50 border-slate-600 text-white file:bg-emerald-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4 file:font-medium hover:file:bg-emerald-700 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-300 hover:border-slate-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/5 group-hover:to-cyan-500/5 rounded-md transition-all duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Update Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadPdfSnapshot}
                    className="flex-1 border-2 border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download PDF
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-slate-900/90 border-slate-700/50 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 bg-gradient-to-br from-slate-900 to-slate-800">
              {/* Preview Area with Enhanced Styling */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-600/50 shadow-2xl">
                {/* Animated Border Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-purple-600/20 blur-sm animate-pulse"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-sm">
                  <div
                    ref={previewRef}
                    className="w-[680px] max-w-full rounded-xl overflow-hidden border mx-auto p-3 bg-gray-400 relative"
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
                      <div className="p-0.5">
                        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                          <div
                            className="h-[140px] w-[120px] overflow-hidden border ml-5"
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
                        className="px-4 grid grid-cols-[1fr_auto] gap-4 items-center"
                        style={{ backgroundColor: "#b6e6f2" }}
                      >
                        <div className="grid gap-1 text-[15px]">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "#374151" }}>
                              Personalnummer:
                            </span>
                            <strong>{watch("personalNumber")}</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: "#374151" }}>
                              Ausweisnummer:
                            </span>
                            <strong>{watch("idNumber")}</strong>
                          </div>
                        </div>
                        <div
                          className="flex flex-col items-center gap-2 p-2 rounded"
                          style={{ backgroundColor: "#b6e6f2" }}
                        >
                          {qrDataUrl && (
                            <div
                              className="h-20 w-20 flex items-center justify-center"
                              style={{ backgroundColor: "#b6e6f2" }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={qrDataUrl}
                                alt="qr"
                                className="h-20 w-20"
                                style={{
                                  mixBlendMode: "multiply",
                                  filter: "contrast(1.2)",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Separator section with gray background */}
                      <div className="bg-gray-100 h-2"></div>

                      {/* Details section - separated from top section */}
                      <div className="p-4 pt-2 text-[14px] border-t border-gray-200">
                        <p className="mb-1">
                          Der/Die Inhaber/in ist Mitarbeiter/in der Firma:
                        </p>
                        {/* Company name removed from details */}
                        <div className="grid grid-cols-[1fr_auto] gap-4">
                          <div className="whitespace-pre-line font-semibold">
                            {watch("address")}
                          </div>
                          <div>
                            <div>Tel: {watch("phone")}</div>
                            {watch("fax") && <div>Fax: {watch("fax")}</div>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <p className="whitespace-nowrap">
                                Bewacherregisternummer AG:
                              </p>
                              <span className="font-bold">
                                {watch("agNumber")}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <p className="whitespace-nowrap">
                                Bewacherregisternummer Ma:
                              </p>
                              <span className="font-bold">
                                {watch("maNumber")}
                              </span>
                            </div>
                            {/* Show barcode as plain text in preview (no barcode image) */}
                            <div className="flex gap-2">
                              <p className="whitespace-nowrap">Barcode:</p>
                              <span className="font-bold">
                                {watch("barcode")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-end justify-end">
                            {/* intentionally empty - textual barcode shown on left column */}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 items-end gap-6 mt-0">
                          {/* Signature AN */}
                          <div className="text-center text-sm">
                            <div className="h-10 flex items-center justify-center py-1">
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
                            <div style={{ color: "#374151" }}>
                              Unterschrift AN
                            </div>
                          </div>
                          {/* Signature AG */}
                          <div className="text-center text-sm">
                            <div className="h-10 flex items-center justify-center py-1">
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
                            <div style={{ color: "#374151" }}>
                              Unterschrift AG
                            </div>
                          </div>
                        </div>

                        {/* Bottom text under signatures, left-aligned */}
                        <div className="mt-2 text-left">
                          <p
                            className="text-[13px]"
                            style={{ color: "#374151" }}
                          >
                            Sollten Sie diesen Ausweis finden, so bitten wir Sie
                            ihn uns unfrei an obige Adresse zu senden.
                          </p>
                        </div>

                        {/* note removed from preview */}

                        <div className="flex items-center justify-center gap-4 text-[13px] mt-2">
                          <div>Erstelldatum: {watch("createdAt")}</div>
                          <div>Gültig bis: {watch("validTill")}</div>
                        </div>
                      </div>
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
