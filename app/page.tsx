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
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [animationState, setAnimationState] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");

  // Strong Password: UWYJ$vo^QGGM9D&0
  const MASTER_PASSWORD = "UWYJ$vo^QGGM9D&0";

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

  // Authentication Function with Animation
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAnimationState("checking");

    // Simulate secure authentication delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (password === MASTER_PASSWORD) {
      setAnimationState("success");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsAuthenticated(true);
      setLoginAttempts(0);
    } else {
      setAnimationState("error");
      setLoginAttempts((prev) => prev + 1);
      setPassword("");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setAnimationState("idle");
    }
    setIsLoading(false);
  };
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

      {!isAuthenticated ? (
        // PROFESSIONAL ANIMATED LOGIN INTERFACE
        <div className="min-h-screen flex items-center justify-center relative">
          <div className="w-full max-w-md mx-auto p-8">
            {/* Login Card */}
            <div className="relative">
              {/* Animated Border Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-purple-600 rounded-3xl blur-lg transition-all duration-1000 ${
                  animationState === "checking"
                    ? "animate-pulse scale-105"
                    : animationState === "success"
                    ? "bg-green-500 scale-110"
                    : animationState === "error"
                    ? "bg-red-500 animate-shake"
                    : ""
                }`}
              ></div>

              <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl mb-6 transition-all duration-500 ${
                      animationState === "checking"
                        ? "animate-spin"
                        : animationState === "success"
                        ? "scale-110 bg-green-500"
                        : animationState === "error"
                        ? "animate-bounce bg-red-500"
                        : ""
                    }`}
                  >
                    {animationState === "success" ? (
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : animationState === "error" ? (
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-2">
                    Secure Access
                  </h1>
                  <p className="text-slate-400 text-lg">
                    Professional ID Card Generator
                  </p>
                  {loginAttempts > 0 && (
                    <div className="mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded-lg">
                      <p className="text-red-300 text-sm">
                        Incorrect password. Attempts: {loginAttempts}/3
                      </p>
                    </div>
                  )}
                </div>

                {/* Login Form */}
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-slate-300 font-semibold"
                    >
                      Master Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your master password"
                        className={`bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 pr-12 py-4 text-lg rounded-xl transition-all duration-300 ${
                          animationState === "error"
                            ? "border-red-500 animate-shake"
                            : animationState === "success"
                            ? "border-green-500"
                            : "focus:border-purple-500 focus:ring-purple-500/20"
                        }`}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
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
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password.trim()}
                    className={`w-full py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform cursor-pointer ${
                      isLoading ? "scale-95" : "hover:scale-105"
                    } ${
                      animationState === "checking"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700"
                        : animationState === "success"
                        ? "bg-gradient-to-r from-green-600 to-green-700"
                        : animationState === "error"
                        ? "bg-gradient-to-r from-red-600 to-red-700"
                        : "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                    } shadow-lg disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>
                          {animationState === "checking"
                            ? "Authenticating..."
                            : "Processing..."}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Access System</span>
                      </div>
                    )}
                  </Button>
                </form>

                {/* Security Info */}
                <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">
                        Secure Authentication Required
                      </p>
                      <p className="text-slate-500 text-xs">
                        Enter your authorized master password to access the
                        system
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // MAIN APPLICATION (shown after authentication)
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          {/* Logout Button */}
          <div className="absolute top-4 right-4 z-50">
            <Button
              onClick={() => {
                setIsAuthenticated(false);
                setPassword("");
                setAnimationState("idle");
              }}
              variant="outline"
              className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all duration-300 cursor-pointer"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </Button>
          </div>

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

                  {/* MAXIMUM LEVEL UPLOAD ASSETS SECTION */}
                  <div className="space-y-8">
                    {/* Enhanced Section Header */}
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25 animate-pulse">
                            <svg
                              className="w-6 h-6 text-white"
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
                          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent uppercase tracking-wider">
                            Upload Assets
                          </h3>
                          <p className="text-slate-400 text-lg mt-1">
                            Drag & drop or click to upload professional assets
                          </p>
                        </div>
                      </div>

                      {/* Animated Background Decoration */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
                    </div>

                    {/* Professional Sequential Upload Cards */}
                    <div className="max-w-2xl mx-auto space-y-8">
                      {/* Profile Photo Upload Card */}
                      <div className="group relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group-hover:scale-[1.02]">
                          {/* Card Header */}
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                              <svg
                                className="w-6 h-6 text-white"
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
                            <div>
                              <h4 className="text-2xl font-bold text-purple-300">
                                Profile Photo
                              </h4>
                              <p className="text-slate-400">
                                Upload your professional profile image
                              </p>
                            </div>
                          </div>

                          {/* Upload Area */}
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => onImage(e, setPhotoUrl)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                              className={`border-2 border-dashed border-purple-500/50 rounded-2xl p-12 text-center transition-all duration-300 hover:border-purple-400 hover:bg-purple-500/5 ${
                                photoUrl
                                  ? "border-green-500/50 bg-green-500/10"
                                  : ""
                              }`}
                            >
                              {photoUrl ? (
                                <div className="space-y-4">
                                  <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border-4 border-green-500/50 shadow-2xl">
                                    <img
                                      src={photoUrl}
                                      alt="Profile Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-green-400 font-semibold text-lg">
                                      ✓ Profile Photo Uploaded Successfully
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setPhotoUrl(null);
                                      }}
                                      className="text-sm text-slate-400 hover:text-red-400 transition-colors mt-2 underline"
                                    >
                                      Remove and upload new photo
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center animate-bounce">
                                    <svg
                                      className="w-12 h-12 text-purple-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-purple-300 font-semibold text-xl">
                                      Upload Profile Photo
                                    </p>
                                    <p className="text-slate-500 mt-2">
                                      PNG, JPG up to 10MB • Recommended:
                                      400x400px
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Upload Button */}
                          <button
                            onClick={() =>
                              document
                                .querySelector('input[accept="image/*"]')
                                ?.click()
                            }
                            className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 cursor-pointer"
                          >
                            <svg
                              className="w-5 h-5 inline mr-3"
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
                            Choose Profile Photo
                          </button>
                        </div>
                      </div>

                      {/* Signature AN Upload Card */}
                      <div className="group relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 group-hover:scale-105">
                          {/* Card Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
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
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </div>
                            <h4 className="text-lg font-bold text-cyan-300">
                              Signature AN
                            </h4>
                          </div>

                          {/* Upload Area */}
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => onImage(e, setSignAnUrl)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                              className={`border-2 border-dashed border-cyan-500/50 rounded-xl p-8 text-center transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-500/5 ${
                                signAnUrl
                                  ? "border-green-500/50 bg-green-500/10"
                                  : ""
                              }`}
                            >
                              {signAnUrl ? (
                                <div className="space-y-3">
                                  <div className="w-20 h-12 mx-auto rounded-lg overflow-hidden border-2 border-green-500/50 shadow-lg">
                                    <img
                                      src={signAnUrl}
                                      alt="Signature AN Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <p className="text-green-400 font-medium">
                                    ✓ Signature Uploaded
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSignAnUrl(null);
                                    }}
                                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                                  >
                                    Remove & upload new
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center animate-bounce">
                                    <svg
                                      className="w-8 h-8 text-cyan-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-cyan-300 font-medium">
                                      Upload Signature AN
                                    </p>
                                    <p className="text-slate-500 text-xs mt-1">
                                      PNG, JPG up to 5MB
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Upload Button */}
                          <button
                            onClick={() =>
                              document
                                .querySelectorAll('input[accept="image/*"]')[1]
                                ?.click()
                            }
                            className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4 inline mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            Choose File
                          </button>
                        </div>
                      </div>

                      {/* Signature AG Upload Card */}
                      <div className="group relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group-hover:scale-105">
                          {/* Card Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
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
                                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                              </svg>
                            </div>
                            <h4 className="text-lg font-bold text-emerald-300">
                              Signature AG
                            </h4>
                          </div>

                          {/* Upload Area */}
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => onImage(e, setSignAgUrl)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                              className={`border-2 border-dashed border-emerald-500/50 rounded-xl p-8 text-center transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/5 ${
                                signAgUrl
                                  ? "border-green-500/50 bg-green-500/10"
                                  : ""
                              }`}
                            >
                              {signAgUrl ? (
                                <div className="space-y-3">
                                  <div className="w-20 h-12 mx-auto rounded-lg overflow-hidden border-2 border-green-500/50 shadow-lg">
                                    <img
                                      src={signAgUrl}
                                      alt="Signature AG Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <p className="text-green-400 font-medium">
                                    ✓ Signature Uploaded
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSignAgUrl(null);
                                    }}
                                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                                  >
                                    Remove & upload new
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center animate-bounce">
                                    <svg
                                      className="w-8 h-8 text-emerald-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-emerald-300 font-medium">
                                      Upload Signature AG
                                    </p>
                                    <p className="text-slate-500 text-xs mt-1">
                                      PNG, JPG up to 5MB
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Upload Button */}
                          <button
                            onClick={() =>
                              document
                                .querySelectorAll('input[accept="image/*"]')[2]
                                ?.click()
                            }
                            className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4 inline mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                              />
                            </svg>
                            Choose File
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Upload Progress & Status Bar */}
                    <div className="mt-8 p-6 bg-slate-800/30 border border-slate-700/30 rounded-2xl backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-300">
                          Upload Status
                        </h4>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              photoUrl ? "bg-green-500" : "bg-slate-600"
                            } animate-pulse`}
                          ></div>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              signAnUrl ? "bg-green-500" : "bg-slate-600"
                            } animate-pulse`}
                          ></div>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              signAgUrl ? "bg-green-500" : "bg-slate-600"
                            } animate-pulse`}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p
                            className={`font-medium ${
                              photoUrl ? "text-green-400" : "text-slate-500"
                            }`}
                          >
                            {photoUrl ? "✓ Profile Photo" : "○ Profile Photo"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className={`font-medium ${
                              signAnUrl ? "text-green-400" : "text-slate-500"
                            }`}
                          >
                            {signAnUrl ? "✓ Signature AN" : "○ Signature AN"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className={`font-medium ${
                              signAgUrl ? "text-green-400" : "text-slate-500"
                            }`}
                          >
                            {signAgUrl ? "✓ Signature AG" : "○ Signature AG"}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                          <span>Upload Progress</span>
                          <span>
                            {Math.round(
                              (((photoUrl ? 1 : 0) +
                                (signAnUrl ? 1 : 0) +
                                (signAgUrl ? 1 : 0)) /
                                3) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                (((photoUrl ? 1 : 0) +
                                  (signAnUrl ? 1 : 0) +
                                  (signAgUrl ? 1 : 0)) /
                                  3) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer"
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
                      className="flex-1 border-2 border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 cursor-pointer"
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
                          style={{
                            backgroundColor: "#1e40af",
                            color: "#ffffff",
                          }}
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
                              Sollten Sie diesen Ausweis finden, so bitten wir
                              Sie ihn uns unfrei an obige Adresse zu senden.
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
      )}
    </div>
  );
}
