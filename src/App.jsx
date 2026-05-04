import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sparkles, Users, Calendar, ArrowRight, Loader, Eye, EyeOff, Activity } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';
import Logo from './components/Logo';

const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const AuthLayout = ({ children }) => (
  <>
    <div className="background-blobs">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
    </div>
    <header className="glass-header">
      <div className="container">
        <nav>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Logo size={32} color="var(--text-primary)" />
            <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.2rem' }}>TechLink</span>
          </div>
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}>Home</Link>
        </nav>
      </div>
    </header>
    <main className="container h-screen-center" style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel fade-in-up auth-box" style={{ padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', margin: 'auto' }}>
        <div className="fade-in-up delay-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo size={64} />
        </div>
        {children}
      </div>
    </main>
  </>
);

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA Install logic
    const installHandler = (e) => {
      // e.preventDefault(); // ALLOW native banner
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', installHandler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', installHandler);
    };
  }, []);
  const [authFlow, setAuthFlow] = useState('landing'); // 'landing', 'login', 'signup', 'verify_otp', 'forgot_password', 'verify_forgot', 'reset_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        fetchProfile(currentSession.user.id);
      } else {
        setSession(null);
        setProfile(null);
        // Only force 'login' if we are explicitly signing out
        if (event === 'SIGNED_OUT') {
          setAuthFlow('login');
          localStorage.removeItem('student_active_tab');
          localStorage.removeItem('admin_active_tab');
          localStorage.removeItem('fresh_login');
          if (window.OneSignal) window.OneSignal.logout();
        }
      }
    });

    // Realtime Notifications for new events/listings
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          showNotification('New Admin Event!', payload.new.title);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_requests' },
        (payload) => {
          showNotification('New Team Request!', 'Someone wants to join a team.');
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_listings' },
        (payload) => {
          showNotification('New Recruitment Post!', payload.new.team_name);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Dedicated Timer Effect
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  const showNotification = (title, body) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/logo.png' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  };



  const fetchProfile = async (userId) => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      if (data.is_blocked) {
        await supabase.auth.signOut();
        setProfile(null);
        setErrorMsg('Your account has been suspended by an administrator. Please contact support.');
        setAuthFlow('login');
        setLoadingProfile(false);
        return;
      }
      setProfile(data);

      // OneSignal Identity & Tagging
      try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignal) {
          OneSignal.login(data.id);
          OneSignal.User.addTags({
            full_name: data.full_name,
            role: data.role,
            branch: data.branch || 'Unknown'
          });
        });
      } catch (e) {
        console.error("OneSignal Tagging Error:", e);
      }
    }
    setLoadingProfile(false);
  };





  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authFlow === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('fresh_login', 'true');
        navigate('/');
      }
      else if (authFlow === 'signup') {
        // Redirect signup to login flow as well
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('fresh_login', 'true');
        navigate('/');
      }
      else if (authFlow === 'verify_otp') {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
        if (error) throw error;
      }
      else if (authFlow === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;

        setAuthFlow('verify_forgot');
        setErrorMsg('Password reset OTP sent to your email.');
      }
      else if (authFlow === 'verify_forgot') {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
        if (error) throw error;
        setAuthFlow('reset_password');
        setErrorMsg('OTP verified! Please enter your new password.');
      }
      else if (authFlow === 'reset_password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthFlow('login');
        setErrorMsg('Password successfully updated! You can now log in.');
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (!error) {
      const nextAttempt = resendAttempts + 1;
      setResendAttempts(nextAttempt);
      // Exponential backoff: 120s * 2^(attempts-1)
      setResendTimer(120 * Math.pow(2, resendAttempts));
      setErrorMsg('A new code has been dispatched.');
    } else {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  if (loadingProfile && session) {
    return (
      <div className="container h-screen-center fade-in-up">
        <Loader size={32} style={{ animation: 'spin 2s linear infinite', color: 'var(--text-secondary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleInstallClick = async () => {
    setShowInstallBanner(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('To install on iOS:\n1. Tap the Share button in Safari\n2. Scroll down and tap "Add to Home Screen"');
    } else {
      alert('Installation prompt not available. Try adding to home screen via your browser menu.');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      <ErrorBoundary>
        <Suspense fallback={
          <div className="h-screen-center" style={{
            background: 'var(--bg-primary)',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'fixed',
            inset: 0,
            zIndex: 10000
          }}>
            <div className="premium-loader-container">
              <div className="premium-loader-core">
                <Activity size={48} color="var(--accent)" />
              </div>
              <div className="premium-loader-ring"></div>
              <div className="premium-loader-ring-outer"></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 className="shimmer-text" style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, var(--text-primary), var(--accent), var(--text-primary))',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite'
              }}>
                Loading your dashboard
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginTop: '0.6rem',
                opacity: 0.7,
                fontWeight: 500
              }}>
                Preparing your exclusive experience...
              </p>
            </div>
          </div>
        }>
          {initializing ? (
            <div className="h-screen-center" style={{ background: 'var(--bg-primary)' }}>
              <div className="premium-loader-container">
                <div className="premium-loader-core">
                  <Activity size={48} color="var(--accent)" />
                </div>
                <div className="premium-loader-ring"></div>
              </div>
            </div>
          ) : (
            <Routes>
              {/* LANDING PAGE */}
              <Route path="/" element={
                session ? (
                  profile ? (
                    profile.role === 'admin' ? <Navigate to="/admin/overview" replace /> : <Navigate to="/dashboard/events" replace />
                  ) : (
                    <div className="h-screen-center" style={{ background: 'var(--bg-primary)' }}>
                      <div className="premium-loader-container">
                        <div className="premium-loader-core">
                          <Activity size={48} color="var(--accent)" />
                        </div>
                        <div className="premium-loader-ring"></div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="background-blobs">
                      <div className="blob blob-1"></div>
                      <div className="blob blob-2"></div>
                      <div className="blob blob-3"></div>
                    </div>
                    <header className="glass-header">
                      <div className="container">
                        <nav>
                          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Logo size={36} color="var(--text-primary)" />
                            <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.5rem' }}>TechLink</span>
                          </div>
                          <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', textDecoration: 'none' }}>Sign In</Link>
                        </nav>
                      </div>
                    </header>
                    <main className="container h-screen-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
                      <div className="fade-in-up" style={{ paddingBottom: '5rem' }}>
                        <div className="hero-section">
                          <div className="hero-content">
                            <div className="badge fade-in-up delay-1"><Sparkles size={14} /> Official TechLink Platform</div>
                            <h1 className="hero-title fade-in-up delay-1">The Future of <span className="text-gradient">Student Innovation.</span></h1>
                            <p className="hero-subtitle fade-in-up delay-2">Find teams, discover events, and build your projects with the unified collaboration engine.</p>
                            <div className="hero-actions fade-in-up delay-3">
                              <Link to="/signup" className="btn btn-primary btn-large">Start Your Project <ArrowRight size={20} /></Link>
                              <Link to="/login" className="btn btn-secondary btn-large">Sign In</Link>
                            </div>
                            
                          </div>
                          <div className="hero-image-container fade-in-up delay-2">
                            <div className="hero-image-glass"><img src="/hero.png" alt="Collaboration Hub" className="hero-image" /></div>
                            <div className="floating-card card-1"><Users size={18} /> 4 Team Requests</div>
                            <div className="floating-card card-2"><Calendar size={18} /> New Hackathon</div>
                          </div>
                        </div>

                        {/* NEW SHOWCASE SECTION */}
                        <div className="showcase-section fade-in-up delay-4" style={{ marginTop: '8rem', textAlign: 'center' }}>
                          <div className="badge" style={{ margin: '0 auto 1.5rem auto' }}><Activity size={14} /> Featured Project</div>
                          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Made by Team <span className="text-gradient">CyberSphere</span></h2>
                          <p className="hero-subtitle" style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
                            Discover high-impact projects built using the TechLink. Team CyberSphere is revolutionizing digital security with their latest platform.
                          </p>
                          
                          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '40px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '16/9' }}>
                              <img 
                                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1600" 
                                alt="CyberSphere Showcase" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                                className="showcase-img"
                              />
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'flex-end', padding: '3rem', textAlign: 'left' }}>
                                <div>
                                  <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Project Sentinel</h3>
                                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Advanced real-time threat detection and network monitoring.</p>
                                  <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Explore Project <ArrowRight size={18} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </main>
                  </>
                )
              } />

              {/* AUTH ROUTES */}
              <Route path="/login" element={
                session ? <Navigate to="/" replace /> : (
                  <AuthLayout>
                    <h1 className="title fade-in-up delay-1" style={{ fontSize: '2.5rem' }}>Welcome Back.</h1>
                    <p className="subtitle fade-in-up delay-2">Log in to manage teams, vote on polls, and connect with peers.</p>
                    <form className="fade-in-up delay-3" onSubmit={(e) => { setAuthFlow('login'); handleAuth(e); }}>
                      {errorMsg && <div className="error-alert">{errorMsg}</div>}
                      <div className="input-group">
                        <label className="input-label">College Email</label>
                        <input type="email" className="glass-input" placeholder="student@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword ? "text" : "password"} className="glass-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                          <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>{loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} /></button>
                    </form>
                    <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign up here</Link></p>
                  </AuthLayout>
                )
              } />

              <Route path="/signup" element={
                session ? <Navigate to="/" replace /> : (
                  <AuthLayout>
                    {!isOtpSent ? (
                      <>
                        <h1 className="title fade-in-up delay-1" style={{ fontSize: '2.5rem' }}>Join the Hub.</h1>
                        <p className="subtitle fade-in-up delay-2">Connect with the community and start building.</p>
                        <form className="fade-in-up delay-3" onSubmit={(e) => { setAuthFlow('login'); handleAuth(e); }}>
                          {errorMsg && <div className="error-alert">{errorMsg}</div>}
                          <div className="input-group">
                            <label className="input-label">Full Name (Optional for Demo)</label>
                            <input type="text" className="glass-input" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Any Email</label>
                            <input type="email" className="glass-input" placeholder="student@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Password (Any)</label>
                            <div style={{ position: 'relative' }}>
                              <input type={showPassword ? "text" : "password"} className="glass-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                          </div>
                          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                            {loading ? 'Entering...' : 'Enter App Directly'} <ArrowRight size={18} />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="fade-in-up">
                        <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                          <Activity size={32} />
                        </div>
                        <h1 className="title" style={{ fontSize: '2rem' }}>Verify Email</h1>
                        <p className="subtitle">We've sent an 8-digit code to <strong>{email}</strong>. Please enter it below.</p>

                        <form onSubmit={(e) => { setAuthFlow('signup'); handleAuth(e); }}>
                          {errorMsg && <div className="error-alert" style={{ marginBottom: '1.5rem' }}>{errorMsg}</div>}
                          <div className="input-group">
                            <input
                              type="text"
                              className="glass-input"
                              placeholder="00000000"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              required
                              style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.5rem', fontWeight: 800, padding: '1.2rem' }}
                            />
                          </div>
                          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading || otp.length < 8}>
                            {loading ? 'Verifying...' : 'Complete Registration'} <ArrowRight size={18} />
                          </button>
                        </form>

                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Didn't receive code? {resendTimer > 0 ? (
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                Wait {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}s
                              </span>
                            ) : (
                              <span onClick={handleResend} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                                Resend Email
                              </span>
                            )}
                          </p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Entered wrong email? <span onClick={() => { setIsOtpSent(false); setResendTimer(0); setResendAttempts(0); }} style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>Go back</span>
                          </p>
                        </div>
                      </div>
                    )}
                    <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Log in here</Link></p>
                  </AuthLayout>
                )
              } />

              {/* DASHBOARD ROUTES */}
              <Route path="/admin/*" element={
                !session ? <Navigate to="/login" replace /> : (profile?.role === 'admin' ? <AdminDashboard session={session} profile={profile} /> : <Navigate to="/dashboard" replace />)
              } />

              <Route path="/dashboard" element={<Navigate to="/dashboard/events" replace />} />
              <Route path="/dashboard/:tab" element={
                !session ? <Navigate to="/login" replace /> : (profile?.role !== 'admin' ? <StudentDashboard session={session} profile={profile} deferredPrompt={deferredPrompt} isInstalled={isInstalled} /> : <Navigate to="/admin" replace />)
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;


