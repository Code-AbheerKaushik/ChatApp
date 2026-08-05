import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User, Phone, CheckCircle2, ShieldCheck, RefreshCw, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";

import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const COUNTRY_CODES = [
  { code: "+1", label: "US/CA (+1)" },
  { code: "+91", label: "India (+91)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+65", label: "Singapore (+65)" },
];

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Phone & OTP state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpStep, setOtpStep] = useState("IDLE"); // "IDLE" | "SENT" | "VERIFIED"
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [verificationToken, setVerificationToken] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  const otpInputRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null)
  ];

  const { signup, isSigningUp, sendOtp, isSendingOtp, verifyOtp, isVerifyingOtp } = useAuthStore();

  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;

  // Countdown timer for OTP Resend
  useEffect(() => {
    let interval = null;
    if (otpStep === "SENT" && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep, resendTimer]);

  // Handle OTP digit change & auto-advance
  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, "").slice(0, 6).split("");
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs[nextIdx]?.current?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value.replace(/\D/g, "");
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  // Send OTP handler
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 7) {
      return toast.error("Please enter a valid phone number");
    }
    const ok = await sendOtp(fullPhone);
    if (ok) {
      setOtpStep("SENT");
      setResendTimer(60);
      setTimeout(() => otpInputRefs[0]?.current?.focus(), 100);
    }
  };

  // Verify OTP handler
  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      return toast.error("Please enter the complete 6-digit OTP");
    }
    const data = await verifyOtp(fullPhone, code);
    if (data?.verificationToken) {
      setVerificationToken(data.verificationToken);
      setOtpStep("VERIFIED");
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (otpStep !== "VERIFIED") return toast.error("Please verify your phone number with OTP first");

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) {
      signup({
        ...formData,
        phone: fullPhone,
        verificationToken,
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 pt-16 sm:pt-20 pb-8">
      {/* Left side form */}
      <div className="flex flex-col justify-center items-center p-4 xs:p-6 sm:p-12">
        <div className="w-full max-w-md space-y-7">
          {/* LOGO */}
          <div className="text-center mb-6">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Create Account</h1>
              <p className="text-base-content/60 text-sm">Join Chatty with verified phone security</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium text-xs">Full Name</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-4 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10 text-sm h-10 rounded-xl"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium text-xs">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-4 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10 text-sm h-10 rounded-xl"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Phone Number & OTP Verification Section */}
            <div className="form-control space-y-2">
              <label className="label py-1 flex items-center justify-between">
                <span className="label-text font-medium text-xs flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number Verification
                </span>
                {otpStep === "VERIFIED" && (
                  <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </label>

              {/* IDLE state: Phone Input + Send OTP Button */}
              {otpStep === "IDLE" && (
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="select select-bordered select-sm h-10 text-xs rounded-xl bg-base-100"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    className="input input-bordered input-sm h-10 flex-1 text-sm rounded-xl"
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !phoneNumber}
                    className="btn btn-primary btn-sm h-10 rounded-xl text-xs font-semibold px-4 gap-1.5"
                  >
                    {isSendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send OTP"}
                  </button>
                </div>
              )}

              {/* SENT state: 6-Digit OTP Inputs */}
              {otpStep === "SENT" && (
                <div className="p-3.5 rounded-2xl bg-base-200/60 border border-primary/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/70">
                      OTP sent to <strong className="text-primary font-mono">{fullPhone}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpStep("IDLE")}
                      className="text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-between gap-1.5">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={otpInputRefs[index]}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-11 text-center font-bold text-lg bg-base-100 border border-base-300 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={resendTimer > 0 || isSendingOtp}
                      className="text-xs text-primary font-semibold hover:underline disabled:text-base-content/40 disabled:no-underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpDigits.join("").length < 6}
                      className="btn btn-sm btn-primary rounded-xl text-xs px-4 gap-1.5"
                    >
                      {isVerifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify Code"}
                    </button>
                  </div>
                </div>
              )}

              {/* VERIFIED state Badge */}
              {otpStep === "VERIFIED" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Phone verified ({fullPhone})
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpStep("IDLE")}
                    className="text-emerald-600 hover:underline text-[11px]"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium text-xs">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-4 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10 text-sm h-10 rounded-xl"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4 text-base-content/40" />
                  ) : (
                    <Eye className="size-4 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full h-11 rounded-xl shadow-md font-semibold mt-2"
              disabled={isSigningUp || otpStep !== "VERIFIED"}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side pattern */}
      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};

export default SignUpPage;
