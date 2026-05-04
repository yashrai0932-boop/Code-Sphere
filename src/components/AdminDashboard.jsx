import React, { useState, useEffect } from 'react';
import { LogOut, Calendar, PlusCircle, Activity, Users, Settings, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Skeleton = ({ width, height, borderRadius = '12px', margin = '0' }) => (
  <div className="skeleton" style={{ width, height, borderRadius, margin }} />
);

function AdminDashboard({ session, profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Derived active tab from URL path (ignoring /admin prefix if present)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeTab = pathParts[pathParts[0] === 'admin' ? 1 : 0] || 'overview';

  const [stats, setStats] = useState({ students: 0, teams: 0, events: 0, requests: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const triggerHaptic = (pattern = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const tabs = ['overview', 'events', 'users', 'logs', 'discovery', 'create'];
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);

  const handleTabChange = (tab) => {
    navigate(`/admin/${tab}`);
    triggerHaptic(15);
    setViewingTeamsFor(null);
    setEditingHackathon(null);
  };

  // Form states for creating event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('event'); // event, poll, message
  const [isTeamJoiningEnabled, setIsTeamJoiningEnabled] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [pollOptions, setPollOptions] = useState(''); // comma separated
  const [minTeamSize, setMinTeamSize] = useState(4);
  const [maxTeamSize, setMaxTeamSize] = useState(6);

  // States for viewing teams
  const [viewingTeamsFor, setViewingTeamsFor] = useState(null);
  const [eventTeams, setEventTeams] = useState([]);

  // Discovery Management State
  const [externalHackathons, setExternalHackathons] = useState([]);
  const [editingHackathon, setEditingHackathon] = useState(null);
  const [hackTitle, setHackTitle] = useState('');
  const [hackDesc, setHackDesc] = useState('');
  const [hackDate, setHackDate] = useState('');
  const [hackLink, setHackLink] = useState('');
  const [hackImage, setHackImage] = useState('');
  const [hackSource, setHackSource] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name');
    if (data) setAllUsers(data);
    setLoading(false);
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !currentStatus })
      .eq('id', userId);
      
    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: !currentStatus } : u));
    } else {
      alert("Error: " + error.message);
    }
  };

  const fetchActiveTabData = async () => {
    if (activeTab === 'overview' || activeTab === 'events') {
       await Promise.all([fetchEvents(), fetchStats()]);
    } else if (activeTab === 'discovery') {
       await fetchExternalHackathons();
    } else if (activeTab === 'users') {
       await fetchUsers();
    } else if (activeTab === 'logs') {
       await fetchLogs();
    }
  };

  const prefetchRemainingData = () => {
    if (activeTab !== 'discovery') {
      fetchExternalHackathons().catch(console.error);
    }
    if (activeTab === 'discovery') {
      Promise.all([fetchEvents(), fetchStats()]).catch(console.error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchActiveTabData();
      prefetchRemainingData();
    };
    loadData();
  }, [activeTab]);

  // Re-fetch data when user returns from lock screen
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await fetchActiveTabData();
        prefetchRemainingData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab]);

  const fetchExternalHackathons = async () => {
    setLoading(true);
    const { data } = await supabase.from('external_hackathons').select('*').order('created_at', { ascending: false });
    if (data) setExternalHackathons(data);
    setLoading(false);
  };

  const fetchLogs = async (userId = null) => {
    setLoading(true);
    let query = supabase
      .from('activity_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.limit(100);
    }

    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  };

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setUserLogs(data);
  };

  const handleViewUserDetail = async (user) => {
    setViewingUser(user);
    await fetchUserLogs(user.id);
  };

  const humanizeLog = (log) => {
    const { action, details, profiles } = log;
    const name = profiles?.full_name || 'System';
    
    switch (action) {
      case 'sent_request':
        return `${name} requested to join team "${details.team_name || 'Unknown'}"`;
      case 'joined_team':
        return `${name} successfully joined team "${details.team_name || 'Unknown'}"`;
      case 'created_team':
        return `${name} created a new team named "${details.team_name || 'Unknown'}"`;
      case 'created_listing':
        return `${name} published a new recruitment post for "${details.team_name || 'Unknown'}"`;
      case 'updated_profile':
        return `${name} updated their professional profile`;
      case 'applied_to_listing':
        return `${name} applied to a recruitment post for "${details.team_name || 'Unknown'}"`;
      case 'status_update':
        return `${name}'s request for "${details.team_name || 'Unknown'}" was ${details.status || 'updated'}`;
      default:
        return `${name} performed ${action.replace(/_/g, ' ')}`;
    }
  };

  const ensureAbsoluteUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const handleCreateHackathon = async (e) => {
    e.preventDefault();
    const hackData = {
        title: hackTitle,
        description: hackDesc,
        date: hackDate,
        link: ensureAbsoluteUrl(hackLink),
        image_url: hackImage || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000',
        source: hackSource
    };

    let error;
    if (editingHackathon) {
        const { error: updateError } = await supabase.from('external_hackathons').update(hackData).eq('id', editingHackathon.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('external_hackathons').insert([hackData]);
        error = insertError;
    }

    if (!error) {
        alert("Discovery item updated!");
        setEditingHackathon(null);
        setHackTitle(''); setHackDesc(''); setHackDate(''); setHackLink(''); setHackImage(''); setHackSource('');
        fetchExternalHackathons();
    } else {
        alert(error.message);
    }
  };

  const handleDeleteHackathon = async (id) => {
      if (!window.confirm("Delete this discovery item?")) return;
      const { error } = await supabase.from('external_hackathons').delete().eq('id', id);
      if (!error) fetchExternalHackathons();
  };

  const fetchStats = async () => {
    const [{ count: students }, { count: teams }, { count: events }, { count: requests }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('join_requests').select('*', { count: 'exact', head: true })
    ]);
    
    setStats({ students, teams, events, requests });

    // Fetch recent requests with human-readable details
    const { data: recent } = await supabase
      .from('join_requests')
      .select(`
        *,
        applicant:profiles!join_requests_applicant_id_fkey(id, full_name, email),
        teams(
          team_name,
          creator:profiles!teams_creator_id_fkey(id, full_name)
        ),
        team_listings(
          team_name,
          creator:profiles!team_listings_creator_id_fkey(id, full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recent) setRecentRequests(recent);
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setEvents(data);
    setLoading(false);
  };

  const sendPushNotification = async (eventTitle) => {
    try {
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic os_v2_app_52d4ulf5rbf37ktrcwwgy36xvxlydgw76uyerkfj4o6ty5fcxcbgrydvgfrugsl5x6epu4viwzl4bgpwn3yubphdedmqvhl4pwmwfxy'
        },
        body: JSON.stringify({
          app_id: "ee87ca2c-bd88-4bbf-aa71-15ac6c6fd7ad",
          included_segments: ["All"],
          headings: { "en": "New NEXUS Activity! 🚀" },
          contents: { "en": `${eventTitle} has been posted. Open the app to join now!` },
          url: "https://nexus-hub.vercel.app/"
        })
      });
    } catch (error) {
      console.error("Push Error:", error);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title) return;
    
    const eventData = { 
      admin_id: profile.id, 
      title, 
      description, 
      know_more_url: url,
      type,
      is_team_joining_enabled: isTeamJoiningEnabled,
      expires_at: expiresAt || null,
      options: type === 'poll' ? pollOptions.split(',').map(o => o.trim()).filter(o => o) : null,
      min_team_size: minTeamSize,
      max_team_size: maxTeamSize
    };

    let error;
    if (editingEvent) {
      const { error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('events').insert([eventData]);
      error = insertError;
    }

    if (!error) {
      resetForm();
      handleTabChange('events');
      fetchEvents();
      if (!editingEvent) sendPushNotification(title);
      alert(editingEvent ? "Event updated successfully!" : "Event created successfully!");
    } else {
      alert("Error: " + error.message);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setType('event');
    setIsTeamJoiningEnabled(true);
    setExpiresAt('');
    setPollOptions('');
    setMinTeamSize(4);
    setMaxTeamSize(6);
    setEditingEvent(null);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setUrl(event.know_more_url || '');
    setType(event.type || 'event');
    setIsTeamJoiningEnabled(event.is_team_joining_enabled);
    setExpiresAt(event.expires_at ? new Date(event.expires_at).toISOString().slice(0, 16) : '');
    setPollOptions(event.options ? event.options.join(', ') : '');
    setMinTeamSize(event.min_team_size || 4);
    setMaxTeamSize(event.max_team_size || 6);
    handleTabChange('create'); // Go to form
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event? This will also delete all associated teams and requests.")) return;
    triggerHaptic([30, 50, 30]); // Distinct vibration for delete
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) alert("Error deleting event: " + error.message);
    else fetchEvents();
  };



  const handleViewTeams = async (event) => {
    setViewingTeamsFor(event);
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles:profiles!teams_creator_id_fkey(full_name),
        team_members(profiles:profiles!team_members_user_id_fkey(full_name))
      `)
      .eq('event_id', event.id);
    if (data) setEventTeams(data);
  };

  return (
    <div 
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2" style={{ background: 'radial-gradient(circle, rgba(255,59,48,0.2) 0%, rgba(255,59,48,0) 70%)' }}></div>
      </div>

      <header className="glass-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: '#34C759', color: 'white', padding: '0.5rem', borderRadius: '14px', boxShadow: '0 8px 16px rgba(52, 199, 89, 0.2)' }}>
              <Settings size={22} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Nexus Hub</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#34C759', letterSpacing: '0.1em' }}>Admin Console</span>
            </div>
          </div>
          
          <nav className="desktop-nav" style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <div 
                key={tab} 
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </nav>

          <button className="btn" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => supabase.auth.signOut()}>
            <LogOut size={20} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        <div className={`mobile-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
          <Activity size={20} />
          <span>Overview</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => handleTabChange('events')}>
          <Calendar size={20} />
          <span>Events</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'discovery' ? 'active' : ''}`} onClick={() => handleTabChange('discovery')}>
          <Globe size={20} />
          <span>Discovery</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
          <Users size={20} />
          <span>Users</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => handleTabChange('logs')}>
          <Activity size={20} />
          <span>Logs</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>
          <PlusCircle size={20} />
          <span>Create</span>
        </div>
        <div className="mobile-nav-item" style={{ color: '#FF3B30' }} onClick={() => supabase.auth.signOut()}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </div>
      </div>

      <main className="container fade-in-up" style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1000px' }}>
        
        {activeTab === 'overview' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Platform Analytics</h1>
            <p className="subtitle">Real-time overview of student engagement and team formation.</p>
            
            <div className="admin-stats-grid">
              <div className="glass-panel stat-card">
                <Users size={32} color="var(--accent)" />
                <h2>{stats.students}</h2>
                <p>Students</p>
              </div>
              <div className="glass-panel stat-card">
                <Activity size={32} color="#34C759" />
                <h2>{stats.teams}</h2>
                <p>Teams</p>
              </div>
              <div className="glass-panel stat-card">
                <Calendar size={32} color="#ff9500" />
                <h2>{stats.events}</h2>
                <p>Events</p>
              </div>
              <div className="glass-panel stat-card">
                <Activity size={32} color="#AF52DE" />
                <h2>{stats.requests}</h2>
                <p>Requests</p>
              </div>
            </div>

            <div className="glass-panel fade-in-up" style={{ marginTop: '2.5rem', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                 <div>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Recent Activity Feed</h3>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Human-friendly summary of latest join requests.</p>
                 </div>
                 <Activity size={24} color="var(--accent)" />
              </div>

              <div style={{ display: 'grid', gap: '1.2rem' }}>
                {recentRequests.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No recent requests found.</p>
                ) : recentRequests.map((req) => (
                  <div key={req.id} className="request-card-minimal" style={{ background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '18px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {req.applicant?.full_name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                        <strong style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => handleViewUserDetail(req.applicant)}>{req.applicant?.full_name || 'Someone'}</strong> 
                        <span> requested to join </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{req.teams?.team_name || req.team_listings?.team_name || 'a team'}</strong>
                        <span> created by </span>
                        <strong style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => handleViewUserDetail(req.teams?.creator || req.team_listings?.creator)}>{req.teams?.creator?.full_name || req.team_listings?.creator?.full_name || 'Unknown'}</strong>
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                        Applied for: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{req.role_applied || 'Not specified'}</span> • {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'discovery' && (
           <div className="fade-in-up">
              <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Global Discovery</h1>
              <p className="subtitle">Manage external hackathons displayed to all students.</p>

              <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>{editingHackathon ? 'Edit Item' : 'Add New Hackathon'}</h3>
                  <form onSubmit={handleCreateHackathon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <input className="glass-input" placeholder="Title" value={hackTitle} onChange={e=>setHackTitle(e.target.value)} required />
                      <input className="glass-input" placeholder="Source (e.g. Devfolio)" value={hackSource} onChange={e=>setHackSource(e.target.value)} />
                      <input className="glass-input" placeholder="Date" value={hackDate} onChange={e=>setHackDate(e.target.value)} />
                      <input className="glass-input" placeholder="External Link" value={hackLink} onChange={e=>setHackLink(e.target.value)} required />
                      <input className="glass-input" placeholder="Image URL" value={hackImage} onChange={e=>setHackImage(e.target.value)} />
                      <input className="glass-input" placeholder="Short Description" value={hackDesc} onChange={e=>setHackDesc(e.target.value)} />
                      <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>{editingHackathon ? 'Update' : 'Add to Discovery'}</button>
                  </form>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                  {externalHackathons.map(hack => (
                      <div key={hack.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                              <p style={{ fontWeight: 800 }}>{hack.title}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hack.source} • {hack.date}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-secondary" onClick={() => {
                                  setEditingHackathon(hack);
                                  setHackTitle(hack.title); setHackDesc(hack.description); setHackDate(hack.date); setHackLink(hack.link); setHackImage(hack.image_url); setHackSource(hack.source);
                              }}>Edit</button>
                              <button className="btn btn-secondary" style={{ color: '#FF3B30' }} onClick={() => handleDeleteHackathon(hack.id)}>Delete</button>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {activeTab === 'events' && !viewingTeamsFor && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p className="subtitle">Manage all active events and monitor student participation.</p>

            {loading ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <Skeleton width="100px" height="20px" margin="0 0 0.8rem 0" />
                        <Skeleton width="60%" height="32px" margin="0 0 0.5rem 0" />
                        <Skeleton width="40%" height="24px" />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Skeleton width="40px" height="40px" borderRadius="10px" />
                        <Skeleton width="40px" height="40px" borderRadius="10px" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                       <Skeleton width="120px" height="40px" borderRadius="12px" />
                       <Skeleton width="120px" height="40px" borderRadius="12px" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No events created</h3>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('create')}>
                  Create your first Event
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {events.map((event) => (
                  <div key={event.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{event.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{event.description}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleViewTeams(event)}>
                        <Users size={16} /> View Teams
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleEditEvent(event)}>
                        Edit Event
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#ff3b30' }} onClick={() => handleDeleteEvent(event.id)}>
                        Delete Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && viewingTeamsFor && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '1.5rem' }} onClick={() => setViewingTeamsFor(null)}>
              ← Back to Events
            </button>
            <h1 className="title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Teams: {viewingTeamsFor.title}</h1>
            
            {eventTeams.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No teams have been formed for this event yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {eventTeams.map((team) => (
                  <div key={team.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {team.icon_url} {team.team_name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.2rem' }}>Created by: {team.profiles?.full_name}</p>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.8rem', fontSize: '0.95rem' }}><strong>Requirements:</strong> {team.requirements}</p>
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Members ({team.team_members?.length || 0})</p>
                      <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                        {team.team_members?.map((member, idx) => (
                          <li key={idx} style={{ marginBottom: '0.3rem' }}>{member.profiles?.full_name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>User Management</h1>
            <p className="subtitle">View all registered students and manage their access status.</p>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Search by name, email or branch..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '3rem' }}
                />
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ background: 'var(--accent-light)', padding: '0.8rem 1.2rem', borderRadius: '15px', color: 'var(--accent)', fontWeight: 800 }}>
                {allUsers.length} Total Students
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                 {[1,2,3,4,5].map(i => <Skeleton key={i} width="100%" height="80px" borderRadius="18px" />)}
              </div>
            ) : (
              <div>
                {/* Desktop View Table */}
                <div className="glass-panel desktop-only" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                        <tr>
                          <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Student</th>
                          <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Branch</th>
                          <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
                          <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter(u => 
                            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.branch?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((user) => (
                          <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="user-row-hover">
                            <td style={{ padding: '1.2rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' }}>
                                  {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.charAt(0)}
                                </div>
                                <div>
                                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.full_name}</p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{user.branch || 'N/A'}</td>
                            <td style={{ padding: '1.2rem 1.5rem' }}>
                              <span className={`badge ${user.is_blocked ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.7rem' }}>
                                {user.is_blocked ? 'Blocked' : 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '1.2rem 1.5rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleViewUserDetail(user)}>Details</button>
                                <button 
                                  className="btn" 
                                  style={{ 
                                    background: user.is_blocked ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', 
                                    color: user.is_blocked ? '#34C759' : '#FF3B30',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '10px',
                                    fontWeight: 700
                                  }}
                                  onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                                >
                                  {user.is_blocked ? 'Unblock' : 'Block'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View Cards */}
                <div className="mobile-only" style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                   {allUsers
                    .filter(u => 
                      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      u.branch?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <div key={user.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                           <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                              {user.full_name?.charAt(0)}
                           </div>
                           <div>
                              <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user.full_name}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.branch || 'No Branch'}</p>
                           </div>
                           <span className={`badge ${user.is_blocked ? 'badge-red' : 'badge-green'}`} style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                              {user.is_blocked ? 'Blocked' : 'Active'}
                           </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                           <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleViewUserDetail(user)}>View Details</button>
                           <button 
                             className="btn" 
                             style={{ 
                               width: '100%',
                               background: user.is_blocked ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', 
                               color: user.is_blocked ? '#34C759' : '#FF3B30'
                             }} 
                             onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                           >
                              {user.is_blocked ? 'Unblock' : 'Block'}
                           </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {viewingUser && (
              <div className="glass-panel fade-in-up" style={{ marginTop: '2rem', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Student Profile: {viewingUser.full_name}</h2>
                  <button className="btn btn-secondary" onClick={() => setViewingUser(null)}>Close Profile</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent)' }}>Basic Info</h3>
                    <p><strong>Email:</strong> {viewingUser.email}</p>
                    <p><strong>Branch:</strong> {viewingUser.branch || 'N/A'}</p>
                    <p><strong>Contact:</strong> {viewingUser.whatsapp_no || 'N/A'}</p>
                    <p><strong>Skills:</strong> {viewingUser.skills?.join(', ') || 'None listed'}</p>
                    <p><strong>Dev Role:</strong> {viewingUser.dev_role || 'N/A'}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                       {viewingUser.github_url && <a href={viewingUser.github_url} target="_blank" className="btn btn-secondary">GitHub</a>}
                       {viewingUser.linkedin_url && <a href={viewingUser.linkedin_url} target="_blank" className="btn btn-secondary">LinkedIn</a>}
                       {viewingUser.resume_url && <a href={viewingUser.resume_url} target="_blank" className="btn btn-primary">Resume</a>}
                    </div>
                  </div>
                  
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent)' }}>Recent Activity Log</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gap: '0.5rem' }}>
                      {userLogs.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No activity recorded for this student.</p>
                      ) : userLogs.map(log => (
                        <div key={log.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                          <p style={{ fontWeight: 700 }}>{log.action.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</p>
                          {log.details && <p style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.2rem' }}>{JSON.stringify(log.details)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>System Audit Logs</h1>
            <p className="subtitle">Real-time activity stream across the entire platform.</p>

            {loading ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                 {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '18px' }} />)}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {logs.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No logs found.</div>
                ) : logs.map(log => (
                  <div key={log.id} className="glass-panel" style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Activity size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {humanizeLog(log)}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.created_at).toLocaleString()} • {log.profiles?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="fade-in-up glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>{editingEvent ? 'Edit Content' : 'Create Content'}</h2>
              {editingEvent && (
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleCreateEvent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label className="input-label">Content Type</label>
                  <select className="glass-input" value={type} onChange={(e)=>setType(e.target.value)}>
                    <option value="event">Team Event (Hackathons, etc)</option>
                    <option value="poll">Poll (Voting)</option>
                    <option value="message">Standard Message/Announcement</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Expiry Date (Optional)</label>
                  <input type="datetime-local" className="glass-input" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Title</label>
                <input type="text" className="glass-input" placeholder="e.g. Hackathon 2026" value={title} onChange={(e)=>setTitle(e.target.value)} required />
              </div>
              
              <div className="input-group">
                <label className="input-label">Description / Message Body</label>
                <textarea className="glass-input" rows="3" placeholder="Describe the content..." value={description} onChange={(e)=>setDescription(e.target.value)} required></textarea>
              </div>

              {type === 'poll' && (
                <div className="input-group fade-in-up">
                  <label className="input-label">Poll Options (Comma separated)</label>
                  <input type="text" className="glass-input" placeholder="Option A, Option B, Option C" value={pollOptions} onChange={(e)=>setPollOptions(e.target.value)} required />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                <input type="checkbox" id="joining" checked={isTeamJoiningEnabled} onChange={(e)=>setIsTeamJoiningEnabled(e.target.checked)} />
                <label htmlFor="joining" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Enable Team Joining for this post</label>
              </div>

              {isTeamJoiningEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label className="input-label">Min Team Size</label>
                    <input type="number" className="glass-input" value={minTeamSize} onChange={(e)=>setMinTeamSize(parseInt(e.target.value))} min="1" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Max Team Size</label>
                    <input type="number" className="glass-input" value={maxTeamSize} onChange={(e)=>setMaxTeamSize(parseInt(e.target.value))} min="1" />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">"Know More" Link (Optional)</label>
                <input type="url" className="glass-input" placeholder="https://..." value={url} onChange={(e)=>setUrl(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingEvent ? 'Update Content' : 'Publish to Platform'}
              </button>
            </form>
          </div>
        )}



      </main>
    </div>
  );
}

export default AdminDashboard;
