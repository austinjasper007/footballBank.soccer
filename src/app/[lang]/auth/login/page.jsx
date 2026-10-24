"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Lock,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { sendLoginOTP, verifyLoginOTP } from "@/actions/authActions";
import OtpInput from "@/components/auth/OtpInput";
import { getClientDictionary } from "@/lib/client-dictionaries";

import "aos/dist/aos.css";



function LoginPageContent() {
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] || "en";
  const [dict, setDict] = useState(null);
  const t = dict?.loginPage;

  useEffect(() => {
    getClientDictionary(lang).then(setDict);
  }, [lang]);

  const [step, setStep] = useState("email"); // "email", "otp", or "password"
  const [loginMethod, setLoginMethod] = useState("otp"); // "otp" or "password"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const searchParams = useSearchParams();
  const otpFormRef = useRef(null);

  useEffect(() => {
    // Get redirect URL from query parameters
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, [searchParams]);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            // User is already authenticated, redirect to appropriate dashboard
            const dashboardUrl = redirectUrl || "/";
            window.location.href = dashboardUrl;
          }
        }
      } catch (error) {
        // User is not authenticated, continue with login process
        // console.log('User not authenticated, showing login form');
      }
    };

    checkAuth();
  }, [redirectUrl]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await sendLoginOTP(email);
      
      if (result.success) {
        setMessage(result.message);
        setStep("otp");
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // console.log("🔐 Password login successful for user:", data.user.email);
        setMessage("Login successful! Redirecting...");
        
        setTimeout(() => {
          let dashboardUrl = redirectUrl;
          
          if (!dashboardUrl) dashboardUrl = '/';
          
          // console.log("🔐 Redirecting to:", dashboardUrl);
          window.location.href = dashboardUrl;
        }, 1000);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await verifyLoginOTP(email, otp);
      
      if (result.success) {
        // console.log("🔐 Login successful for user:", result.user.email);
        setMessage("Login successful! Redirecting...");
        // Redirect directly without page reload to avoid redirect loop
        setTimeout(() => {
          let dashboardUrl = redirectUrl;
          
          if (!dashboardUrl) dashboardUrl = '/';
          
          // console.log("🔐 Redirecting to:", dashboardUrl);
          window.location.href = dashboardUrl;
        }, 1000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError(`OAuth authentication is currently disabled. Please use email login instead.`);
    setLoading(false);
  };

  const resendOTP = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await sendLoginOTP(email);
      
      if (result.success) {
        setMessage("New code sent to your email");
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // No need for loading states - server-side layout handles authentication

  return (
    <div className="min-h-screen bg-primary-bg px-4 py-8 sm:px-6 lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_1fr] lg:gap-12 lg:px-12 lg:py-12">
      <div className="hidden min-h-full flex-col justify-between bg-primary-navy p-10 text-primary-text-inverse lg:flex">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-accent">{t?.sidePanelEyebrow || "FootballBank International"}</p><h2 className="mt-8 max-w-lg font-heading text-6xl font-semibold leading-[1.02]">{t?.sidePanelTitle || "The next football opportunity starts with access."}</h2><p className="mt-6 max-w-md text-sm leading-7 text-primary-text-inverse/70">{t?.sidePanelSubtitle || "Sign in to manage your profile, access football opportunities, request player information and communicate with FootballBank."}</p></div><p className="text-sm text-primary-text-inverse/50">{t?.sidePanelFooter || "Sports management · Talent · Club partnerships"}</p>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-muted hover:text-primary-text transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            {t?.backToHome || "Back to Home"}
          </Link>
         
          <h1 className="text-3xl font-bold text-primary-text mb-2">
            {t?.welcomeBack || "Welcome Back"}
          </h1>
          <p className="text-primary-muted">
            {step === "email" 
              ? (t?.emailStepSubtitle || "Enter your email to receive a login code")
              : (t?.otpStepSubtitle || "Enter the 6-digit code sent to your email")
            }
          </p>
        </div>

        <Card className="border border-divider bg-primary-card shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {step === "email" ? (t?.signIn || "Sign In") : (t?.verifyCode || "Verify Code")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Messages */}
            {message && (
              <Alert className="border-primary-action/30 bg-primary-action/5">
                <CheckCircle className="w-4 h-4 text-primary-action" />
                <AlertDescription className="text-primary-text">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="border-accent-red/30 bg-accent-red/5">
                <AlertCircle className="w-4 h-4 text-accent-red" />
                <AlertDescription className="text-primary-text">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Email Step */}
            {step === "email" && (
              <div className="space-y-4">
                {/* Login Method Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t?.chooseLoginMethod || "Choose Login Method"}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setLoginMethod("otp")}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        loginMethod === "otp"
                          ? "border-primary-action bg-primary-action/10 text-primary-action"
                          : "border-divider hover:border-primary-action"
                      }`}
                    >
                      <div className="text-center">
                        <Mail className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-xs font-medium">{t?.otp || "OTP"}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod("password")}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        loginMethod === "password"
                          ? "border-primary-action bg-primary-action/10 text-primary-action"
                          : "border-divider hover:border-primary-action"
                      }`}
                    >
                      <div className="text-center">
                        <Lock className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-xs font-medium">{t?.password || "Password"}</div>
                      </div>
                    </button>
                  </div>
                </div>

                <form onSubmit={loginMethod === "otp" ? handleSendOTP : handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium mb-4">
                      {t?.emailAddress || "Email Address"}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-muted" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t?.emailPlaceholder || "Enter your email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {loginMethod === "password" && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        {t?.password || "Password"}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-muted" />
                        <Input
                          id="password"
                          type="password"
                          placeholder={t?.passwordPlaceholder || "Enter your password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary-action hover:bg-primary-action-hover"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    {loginMethod === "otp" ? (t?.sendLoginCode || "Send Login Code") : (t?.loginWithPassword || "Login with Password")}
                  </Button>
                </form>
              </div>
            )}

            {/* OTP Step */}
            {step === "otp" && (
              <form ref={otpFormRef} onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium mb-2">
                    {t?.verificationCode || "Verification Code"}
                  </Label>
                  <OtpInput value={otp} onChange={setOtp} onComplete={() => otpFormRef.current?.requestSubmit()} disabled={loading} />
                  <p className="text-xs text-primary-muted">
                    {t?.codeSentTo || "Code sent to"} {email}
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary-action hover:bg-primary-action-hover"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {t?.verifyAndLogin || "Verify & Login"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={resendOTP}
                    disabled={loading}
                    className="text-sm text-primary-action hover:text-primary-action-hover disabled:opacity-50"
                  >
                    {t?.resendCode || "Didn't receive code? Resend"}
                  </button>
                </div>
              </form>
            )}

            {/* OAuth Section */}
            {/* {step === "email" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-divider" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-primary-card px-2 text-primary-muted">
                      {t?.orContinueWith || "Or continue with"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleOAuthLogin("google")}
                    disabled={loading}
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    onClick={() => handleOAuthLogin("github")}
                    disabled={loading}
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </Button>
                </div>
              </>
            )} */}

            {/* Back to Email */}
            {step === "otp" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-sm text-primary-muted hover:text-primary-text"
                >
                  {t?.backToEmail || "← Back to email"}
                </button>
              </div>
            )}

            {/* Forgot Password Link */}
            {step === "email" && (
              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-sm text-primary-muted hover:text-primary-text">
                  {t?.forgotPassword || "Forgot your password?"}
                </Link>
              </div>
            )}

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-divider">
              <p className="text-sm text-primary-muted">
                {t?.noAccount || "Don't have an account?"}{" "}
                <Link href="/auth/signup" className="text-primary-action hover:text-primary-action-hover font-medium">
                  {t?.signUp || "Sign up"}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-primary-bg via-primary-surface to-primary-bg flex items-center justify-center px-4 pt-4 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center bg-primary-navy">
              <Shield className="size-7 text-primary-accent" />
            </div>
            <h1 className="text-3xl font-bold text-primary-text mb-2">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}