import React, { useState, useEffect } from 'react';
import { 
  LogOut, User, Calendar, PlusCircle, ArrowRight, Activity, 
  Users, Shield, CheckCircle, XCircle, Star, Search, 
  MapPin, Link as LinkIcon, Briefcase, Globe, GitBranch, FileText, MessageCircle, Download, Smartphone, Trash2, Info
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

const Skeleton = ({ width, height, borderRadius = '12px', margin = '0' }) => (
  <div className="skeleton" style={{ width, height, borderRadius, margin }} />
);

const HelpTooltip = ({ text }) => {
  const showHelp = () => {
    alert(text);
  };

  return (
    <button 
      onClick={showHelp}
      style={{
        background: 'rgba(0,122,255,0.1)',
        color: 'var(--accent)',
        border: 'none',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        marginLeft: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        verticalAlign: 'middle',
        transition: 'all 0.2s'
      }}
      title="Click for help"
      type="button"
    >
      <Info size={12} />
    </button>
  );
};

function StudentDashboard({ session, profile, deferredPrompt, isInstalled }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Derived active tab from URL path (handles /dashboard/events)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeTab = pathParts[pathParts[0] === 'dashboard' ? 1 : 0] || 'events';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-views for events
  const [selectedEvent, setSelectedEvent] = useState(null); // When an event is clicked for "Join Team"
  const [teamAction, setTeamAction] = useState(null); // 'create' or 'join'
  
  // Create Team state
  const [teamName, setTeamName] = useState('');
  const [teamRequirements, setTeamRequirements] = useState('');
  
  // Join Team state
  const [existingTeams, setExistingTeams] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [expandedListingId, setExpandedListingId] = useState(null);
  
  // Recruitment state
  const [myTeamForEvent, setMyTeamForEvent] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [invitingId, setInvitingId] = useState(null);
  
  const [activityTab, setActivityTab] = useState('requested'); // 'requested', 'approve', 'invitations', 'global'
  const [myRequests, setMyRequests] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState({});
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  
  // My Teams State
  const [myJoinedTeams, setMyJoinedTeams] = useState([]);

  // Public Profile Modal State
  const [viewProfileId, setViewProfileId] = useState(null);
  const [viewProfileData, setViewProfileData] = useState(null);

  // Profile Form State
  const [formName, setFormName] = useState(profile?.full_name || '');
  const [formSkills, setFormSkills] = useState(profile?.skills?.join(', ') || '');
  const [formWhatsapp, setFormWhatsapp] = useState(profile?.whatsapp_no || '');
  const [formLinkedin, setFormLinkedin] = useState(profile?.linkedin_url || '');
  const [formGithub, setFormGithub] = useState(profile?.github_url || '');
  const [saving, setSaving] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');

  // Find Member Form State
  const [listingTeamName, setListingTeamName] = useState('');
  const [hackathonName, setHackathonName] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [mode, setMode] = useState('Online');
  const [formLocation, setFormLocation] = useState('');
  const [rolesNeeded, setRolesNeeded] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  // Listings State
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Discovery State
  const [externalHackathons, setExternalHackathons] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);

  // Profile Form State additions
  const [formDevRole, setFormDevRole] = useState(profile?.dev_role || '');
  const [formResume, setFormResume] = useState(profile?.resume_url || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);


  const triggerHaptic = (pattern = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const logActivity = async (action, details = {}) => {
    if (!profile?.id) return;
    await supabase.from('activity_logs').insert([{
      user_id: profile.id,
      action,
      details
    }]);
  };

  const tabs = ['events', 'discovery', 'find_member', 'activity', 'teams', 'profile'];


  const handleTabChange = (tab) => {
    navigate(`/dashboard/${tab}`);
    triggerHaptic(15);
  };

  // Prioritized loading: Active tab first, then background prefetch for others
  const fetchActiveTabData = async () => {
    if (!profile?.id) return;
    
    if (activeTab === 'events') await fetchEvents();
    else if (activeTab === 'discovery') await fetchDiscovery();
    else if (activeTab === 'find_member') await fetchListings();
    else if (activeTab === 'activity') await fetchActivity();
    else if (activeTab === 'teams') await fetchMyTeams();
  };

  const prefetchRemainingData = () => {
    if (!profile?.id) return;
    
    // List of all fetchers
    const allFetchers = {
      events: fetchEvents,
      discovery: fetchDiscovery,
      find_member: fetchListings,
      activity: fetchActivity,
      teams: fetchMyTeams
    };

    // Filter out the one we already loaded
    const remaining = Object.entries(allFetchers)
      .filter(([key]) => key !== activeTab)
      .map(([_, fetcher]) => fetcher());

    Promise.all(remaining).catch(console.error);
  };

  useEffect(() => {
    if (!profile?.id) return;
    
    const loadData = async () => {
      await fetchActiveTabData();
      prefetchRemainingData();
    };
    
    loadData();
  }, [profile?.id]);

  // Re-fetch data when user returns from lock screen or switches back to the app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && profile?.id) {
        await fetchActiveTabData();
        prefetchRemainingData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile?.id, activeTab]);

  // Tab-specific refresh (only re-fetches on tab switch, data is already cached from above)
  useEffect(() => {
    if (!profile?.id) return;
    if (activeTab === 'events') {
      setSelectedEvent(null);
      setTeamAction(null);
    }
  }, [activeTab]);

  const fetchDiscovery = async () => {
    if (!profile?.id) return;
    setLoadingDiscovery(true);
    const { data: hackathons } = await supabase.from('external_hackathons').select('*').order('created_at', { ascending: false });
    const { data: favs } = await supabase.from('favorites').select('hackathon_id').eq('user_id', profile.id);
    
    if (hackathons) setExternalHackathons(hackathons);
    if (favs) setFavorites(favs.map(f => f.hackathon_id));
    setLoadingDiscovery(false);
  };

  const fetchListings = async () => {
    setLoadingListings(true);
    const { data, error } = await supabase
      .from('team_listings')
      .select('*, profiles!team_listings_creator_id_fkey(full_name, dev_role, skills), join_requests(applicant_id, status, profiles:profiles!join_requests_applicant_id_fkey(full_name))')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      setListings(data || []);
    }
    setLoadingListings(false);
  };

  const toggleFavorite = async (hackathonId) => {
    if (favorites.includes(hackathonId)) {
      await supabase.from('favorites').delete().eq('user_id', profile.id).eq('hackathon_id', hackathonId);
      setFavorites(favorites.filter(id => id !== hackathonId));
    } else {
      await supabase.from('favorites').insert([{ user_id: profile.id, hackathon_id: hackathonId }]);
      setFavorites([...favorites, hackathonId]);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!profile?.id) {
      alert("Profile not loaded. Please refresh.");
      return;
    }
    
    setIsCreatingListing(true);
    try {
      const { error } = await supabase.from('team_listings').insert([{
        creator_id: profile.id,
        team_name: listingTeamName,
        hackathon_name: hackathonName,
        registration_link: registrationLink,
        mode,
        location: formLocation,
        roles_needed: rolesNeeded.split(',').map(r => r.trim()).filter(r => r),
        required_skills: requiredSkills.split(',').map(s => s.trim()).filter(s => s),
        min_experience: minExperience,
        description: listingDescription
      }]);

      if (!error) {
        alert("Post created successfully!");
        setListingTeamName('');
        setHackathonName('');
        setRegistrationLink('');
        setFormLocation('');
        setRolesNeeded('');
        setRequiredSkills('');
        setMinExperience('');
        setListingDescription('');
        fetchListings();
        setTeamAction(null);
      } else {
        alert(error.message);
      }
    } catch (err) {
      console.error("LISTING ERROR:", err);
      alert("System Error: " + err.message);
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this recruitment post? This action cannot be undone.")) return;
    
    const { error } = await supabase.from('team_listings').delete().eq('id', listingId).eq('creator_id', profile.id);
    
    if (error) {
      alert("Error deleting post: " + error.message);
    } else {
      alert("Post deleted successfully.");
      fetchListings();
      fetchEvents();
    }
  };

  const handleApplyToListing = async (listingId) => {
    const role = window.prompt("Which role are you applying for? (e.g. Frontend, Designer, etc.)");
    if (!role) {
      alert("Role is required to apply.");
      return;
    }

    const { error } = await supabase.from('join_requests').insert([
      { listing_id: listingId, applicant_id: profile.id, source: 'application', role_applied: role }
    ]);
    if (error) {
      if (error.code === '23505') alert("You have already applied to this team.");
      else alert(error.message);
    } else {
      await logActivity('sent_request_listing', { listing_id: listingId, role });
      alert("Application sent! The team lead will be notified.");
      fetchEvents();
      if (activeTab === 'discovery') fetchListings();
    }
  };


  const fetchEvents = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    
    // Fetch Admin Events
    const { data: adminEvents } = await supabase
      .from('events')
      .select('*, votes(*)')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    
    // Fetch Student Listings
    const { data: studentListings, error: listError } = await supabase
      .from('team_listings')
      .select('*, profiles!team_listings_creator_id_fkey(full_name, dev_role, skills), join_requests(applicant_id, status, profiles:profiles!join_requests_applicant_id_fkey(full_name))')
      .order('created_at', { ascending: false });
    
    if (listError) console.error("Error fetching student listings for feed:", listError);

    // Combine and Sort
    const combined = [
      ...(adminEvents || []).map(e => ({ ...e, source_type: 'admin' })),
      ...(studentListings || []).map(l => ({ ...l, source_type: 'student', title: l.team_name, description: l.description, type: 'recruitment' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setEvents(combined);
    setLoading(false);
  };

  const handleVote = async (eventId, option) => {
    const { error } = await supabase
      .from('votes')
      .insert([{ event_id: eventId, user_id: profile.id, option_text: option }]);
    
    if (error) {
      if (error.code === '23505') alert("You have already voted in this poll!");
      else alert(error.message);
    } else {
      alert("Vote cast successfully!");
      fetchEvents();
    }
  };

  // fetchMyTeams (defined below) handles both created and joined teams

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formName,
          skills: formSkills.split(',').map(s => s.trim()).filter(s => s),
          whatsapp_no: formWhatsapp,
          linkedin_url: formLinkedin,
          github_url: formGithub,
          dev_role: formDevRole,
          resume_url: formResume
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      alert('Profile synced with cloud successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file, maxWidth = 500, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        };
      };
    });
  };

  const handleAvatarUpload = async (event) => {
    try {
      setUploadingAvatar(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const compressedBlob = await compressImage(file);
      const fileName = `${session.user.id}/${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      alert('Profile picture updated!');
    } catch (error) {
      alert(error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const ensureAbsoluteUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
    } else if (isIOS) {
      alert('To install on iOS:\n1. Tap the Share button in Safari\n2. Scroll down and tap "Add to Home Screen"');
    } else if (isInstalled) {
      alert('App is already installed! If there is an update, it will apply automatically on the next launch.');
    } else {
      alert('Installation prompt not available. Try adding to home screen via your browser menu.');
    }
  };

  const fetchActivity = async () => {
    if (!profile?.id) return;

    // 1. Fetch MY applications (requests I sent to join other teams)
    const { data: myReqs } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams:teams!team_id(
          team_name,
          events:events!event_id(title),
          profiles:profiles!teams_creator_id_fkey(whatsapp_no)
        ),
        team_listings:team_listings!listing_id(
          team_name,
          hackathon_name,
          profiles:profiles!team_listings_creator_id_fkey(whatsapp_no)
        )
      `)
      .eq('applicant_id', profile.id)
      .eq('source', 'application')
      .order('created_at', { ascending: false });
    if (myReqs) setMyRequests(myReqs);

    // 2. Fetch invitations I RECEIVED (other team leads invited me)
    const { data: myInvs } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams:teams!team_id(
          team_name,
          profiles:profiles!teams_creator_id_fkey(full_name)
        )
      `)
      .eq('applicant_id', profile.id)
      .eq('source', 'invitation')
      .order('created_at', { ascending: false });
    if (myInvs) setMyInvitations(myInvs);

    // 3. Fetch INCOMING requests to my teams/listings (for Approvals tab)
    const { data: myTeams } = await supabase.from('teams').select('id').eq('creator_id', profile.id);
    const { data: myListings } = await supabase.from('team_listings').select('id').eq('creator_id', profile.id);
    const teamIds = (myTeams || []).map(t => t.id);
    const listingIds = (myListings || []).map(l => l.id);

    let allIncoming = [];

    // 3a. Pending applications to my teams
    if (teamIds.length > 0) {
      const { data: teamApps } = await supabase
        .from('join_requests')
        .select(`
          *,
          teams:teams!team_id(team_name, events:events!event_id(title)),
          profiles:profiles!join_requests_applicant_id_fkey(full_name, skills, branch, email, github_url, linkedin_url, resume_url)
        `)
        .in('team_id', teamIds)
        .eq('source', 'application')
        .order('created_at', { ascending: false });
      if (teamApps) allIncoming.push(...teamApps);
    }

    // 3b. Pending applications to my listings
    if (listingIds.length > 0) {
      const { data: listApps } = await supabase
        .from('join_requests')
        .select(`
          *,
          team_listings:team_listings!listing_id(team_name, hackathon_name),
          profiles:profiles!join_requests_applicant_id_fkey(full_name, skills, branch, email, github_url, linkedin_url, resume_url)
        `)
        .in('listing_id', listingIds)
        .eq('source', 'application')
        .order('created_at', { ascending: false });
      if (listApps) allIncoming.push(...listApps);
    }

    // 3c. Invitations I sent + their responses (so I can see accepted/rejected)
    if (teamIds.length > 0) {
      const { data: sentInviteResults } = await supabase
        .from('join_requests')
        .select(`
          *,
          teams:teams!team_id(team_name, events:events!event_id(title)),
          profiles:profiles!join_requests_applicant_id_fkey(full_name, skills)
        `)
        .in('team_id', teamIds)
        .eq('source', 'invitation')
        .neq('status', 'pending')
        .order('created_at', { ascending: false });
      if (sentInviteResults) allIncoming.push(...sentInviteResults);
    }

    setIncomingRequests(allIncoming);

    // 4. Track which students I've already invited (for the invite button)
    if (teamIds.length > 0) {
      const { data: sentInvites } = await supabase
        .from('join_requests')
        .select('applicant_id, status')
        .in('team_id', teamIds)
        .eq('source', 'invitation');
      if (sentInvites) {
        const inviteMap = {};
        sentInvites.forEach(i => inviteMap[i.applicant_id] = i.status);
        setSentInvitations(inviteMap);
      }
    }

    // 5. Fetch global system log
    const { data: allReqs } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams:teams!team_id(team_name),
        team_listings:team_listings!listing_id(team_name),
        profiles:profiles!join_requests_applicant_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    if (allReqs) setAllRequests(allReqs);
  };

  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    setLoading(true);
    // Check if I already have a team for this event
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', event.id)
      .eq('creator_id', profile.id)
      .maybeSingle();
    
    if (data) {
      setMyTeamForEvent(data);
      setTeamAction('create'); // Use create view for management
      setTeamName(data.team_name);
      setTeamRequirements(data.requirements);
      fetchAvailableStudents(event.id, data.id);
    } else {
      setMyTeamForEvent(null);
    }
    setLoading(false);
  };

  // Clear fresh login flag after first load
  useEffect(() => {
    if (localStorage.getItem('fresh_login') === 'true') {
      navigate('/', { replace: true });
      localStorage.removeItem('fresh_login');
    }
  }, []);

  const fetchAvailableStudents = async (eventId, teamId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .neq('id', profile.id)
      .limit(20); // Limit to 20 for performance
    if (data) setAvailableStudents(data);

    if (teamId) {
      const { data: invites } = await supabase
        .from('join_requests')
        .select('applicant_id, status')
        .eq('team_id', teamId)
        .eq('source', 'invitation');
      
      if (invites) {
        const inviteMap = {};
        invites.forEach(i => inviteMap[i.applicant_id] = i.status);
        setSentInvitations(inviteMap);
      }
    }
  };

  const handleInviteStudent = async (studentId) => {
    if (!myTeamForEvent) return;
    setInvitingId(studentId);
    const { error } = await supabase.from('join_requests').insert([
      { 
        team_id: myTeamForEvent.id, 
        applicant_id: studentId, 
        source: 'invitation',
        status: 'pending' 
      }
    ]);

    if (!error) {
      alert("Invitation sent!");
      setSentInvitations(prev => ({ ...prev, [studentId]: 'pending' }));
    } else {
      if (error.code === '23505') alert("Invitation already sent to this student.");
      else alert(error.message);
    }
    setInvitingId(null);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (myTeamForEvent) {
      // Update existing team
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName, requirements: teamRequirements })
        .eq('id', myTeamForEvent.id);
      if (!error) alert("Team details updated!");
      else alert(error.message);
      return;
    }

    const { data, error } = await supabase.from('teams').insert([
      { 
        event_id: selectedEvent.id, 
        creator_id: profile.id, 
        team_name: teamName, 
        requirements: teamRequirements,
        icon_url: '🚀'
      }
    ]);

    if (error) {
      if (error.code === '23505') alert("You can only create one team per event!");
      else alert(error.message);
    } else {
      alert("Team created successfully! Now you can invite students.");
      // Refresh to show management view
      handleSelectEvent(selectedEvent);
    }
  };

  const loadExistingTeams = async () => {
    setTeamAction('join');
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles:profiles!teams_creator_id_fkey(full_name, dev_role),
        team_members(
          user_id,
          role,
          profiles:profiles!team_members_user_id_fkey(full_name)
        ),
        join_requests(
          id,
          status,
          source,
          applicant_id,
          profiles:profiles!join_requests_applicant_id_fkey(full_name)
        )
      `)
      .eq('event_id', selectedEvent.id);
    
    if (error) {
      console.error("Error loading existing teams:", error);
      alert("Failed to load teams. Check console for details.");
    } else {
      setExistingTeams(data || []);
    }
  };

  const handleRequestJoin = async (teamId) => {
    const role = window.prompt("Which role are you applying for? (e.g. Frontend, Backend, Presenter, etc.)");
    if (!role) {
      alert("Role is required to join a team.");
      return;
    }

    const { error } = await supabase.from('join_requests').insert([
      { team_id: teamId, applicant_id: profile.id, source: 'application', role_applied: role }
    ]);
    if (error) {
      if (error.code === '23505') alert("You have already requested to join this team.");
      else alert(error.message);
    } else {
      await logActivity('sent_request_team', { team_id: teamId, role });
      alert("Request sent successfully!");
      loadExistingTeams();
    }
  };

  const fetchMyTeams = async () => {
    setLoading(true);
    try {
      const { data: created } = await supabase
        .from('teams')
        .select(`
          *, 
          events(*),
          team_members(
            user_id,
            role,
            profiles:profiles!team_members_user_id_fkey(full_name, dev_role, skills, branch, whatsapp_no)
          )
        `)
        .eq('creator_id', profile.id);

      const { data: joined } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams(
            *, 
            events(*),
            team_members(
              user_id,
              role,
              profiles:profiles!team_members_user_id_fkey(full_name, dev_role, skills, branch, whatsapp_no)
            )
          )
        `)
        .eq('user_id', profile.id);

      const combined = [
        ...(created || []).map(t => ({ ...t, isLead: true })), 
        ...(joined || []).map(j => ({ ...j.teams, isLead: false }))
      ];
      
      const unique = Array.from(new Map((combined || []).filter(t=>t).map(t => [t.id, t])).values());
      setMyJoinedTeams(unique);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleViewProfile = async (userId) => {
    setViewProfileId(userId);
    setViewProfileData(null);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: createdTeams } = await supabase
        .from('teams')
        .select('*, events(title)')
        .eq('creator_id', userId);
        
      const { data: joinedTeams } = await supabase
        .from('team_members')
        .select('*, teams(team_name, events(title))')
        .eq('user_id', userId);

      setViewProfileData({
        ...profileData,
        createdTeams: createdTeams || [],
        joinedTeams: joinedTeams || []
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', profile.id);
    if (!error) fetchMyTeams();
  };

  const handleRequestResponse = async (requestId, status, applicantId, teamId) => {
    // Update the request status in DB
    const { data: updated, error } = await supabase
      .from('join_requests')
      .update({ status })
      .eq('id', requestId)
      .select();
    
    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    // Check if the update actually changed a row (RLS might block it)
    if (!updated || updated.length === 0) {
      alert('Update failed — you may not have permission to change this request. Please contact the team lead.');
      return;
    }

    // If approved, add the user to the team
    if (status === 'approved' && teamId) {
      const { error: memberError } = await supabase.from('team_members').insert([
        { team_id: teamId, user_id: applicantId, role: 'member' }
      ]);
      if (memberError && memberError.code !== '23505') {
        console.error('Error adding team member:', memberError);
      }
    }

    // Immediately update local state so UI reflects the change
    setMyInvitations(prev => (prev || []).map(inv =>
      inv.id === requestId ? { ...inv, status } : inv
    ));
    setIncomingRequests(prev => (prev || []).filter(req => req.id !== requestId));

    alert(`Request ${status} successfully!`);
  };

  return (
    <div 
      className="dashboard-root"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <header className="glass-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 2rem' }}>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Logo size={40} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 400, fontFamily: '"Righteous", cursive', color: 'var(--text-primary)', letterSpacing: '0.02em', lineHeight: 1 }}>TechLink</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.15em', marginTop: '2px' }}>Hub Platform</span>
            </div>
          </div>
          
          <nav className="desktop-nav" style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <div 
                key={tab} 
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
              </div>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button className="btn desktop-only" style={{ padding: '0.5rem', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', borderRadius: '12px' }} onClick={() => supabase.auth.signOut()}>
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        <div className={`mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => handleTabChange('events')}>
          <Calendar size={20} />
          <span>Events</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'discovery' ? 'active' : ''}`} onClick={() => handleTabChange('discovery')}>
          <Globe size={20} />
          <span>Discover</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'find_member' ? 'active' : ''}`} onClick={() => handleTabChange('find_member')}>
          <PlusCircle size={20} />
          <span>Recruit</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => handleTabChange('activity')}>
          <Activity size={20} />
          <span>Activity</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => handleTabChange('teams')}>
          <Shield size={20} />
          <span>Teams</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
          <User size={20} />
          <span>Profile</span>
        </div>
      </div>

      <main className="container" style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1000px' }}>
        
        {/* HOME / EVENTS TAB */}
        {activeTab === 'events' && !selectedEvent && (
          <div className="fade-in-up">
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="badge badge-blue subtitle-stylish" style={{ padding: '0.4rem 1.2rem' }}>WELCOME BACK</span>
              </div>
              <h1 className="dashboard-title" style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>
                Hi, <span className="stylish-name">{profile?.full_name?.split(' ')[0] || 'Builder'}</span>
              </h1>
              <p className="subtitle" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>Ready to join your next dream team? Here's what's happening on campus.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Events</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{events.length}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>My Teams</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#AF52DE' }}>{myJoinedTeams.length}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Requests</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#FF9500' }}>{incomingRequests.length}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>On-Campus Events</h2>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={fetchEvents}>Refresh</button>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="glass-panel" style={{ padding: '2rem' }}>
                    <Skeleton width="100px" height="20px" margin="0 0 1rem 0" />
                    <Skeleton width="70%" height="32px" margin="0 0 0.5rem 0" />
                    <Skeleton width="40%" height="20px" margin="0 0 1.5rem 0" />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                       <Skeleton width="120px" height="45px" borderRadius="15px" />
                       <Skeleton width="120px" height="45px" borderRadius="15px" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No active events found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Check back later for new hackathons and workshops.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {events.map((event) => {
                  const myTeamForEvent = (myJoinedTeams || []).find(t => t.event_id === event.id && t.creator_id === profile.id);
                  return (
                  <div key={event.id} className="glass-panel fade-in-up" style={{ 
                    padding: '1.8rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem', 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '28px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                  }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ 
                          width: '8px', height: '8px', borderRadius: '50%', 
                          background: event.source_type === 'admin' ? '#007AFF' : '#AF52DE',
                          boxShadow: `0 0 10px ${event.source_type === 'admin' ? 'rgba(0,122,255,0.5)' : 'rgba(175,82,222,0.5)'}`
                        }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          {event.source_type === 'admin' ? 'Official Update' : <>Recruitment • <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(event.creator_id)}>{event.profiles?.full_name}</span></>}
                        </span>
                      </div>
                      {event.expires_at && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#FF3B30', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Activity size={12} /> {new Date(event.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '0.6rem' }}>{event.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5', opacity: 0.9 }}>{event.description}</p>
                    </div>

                    {event.source_type === 'student' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Expertise</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {event.required_skills?.slice(0, 3).map((s, i) => <span key={i} style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>)}
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Vacancies</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {event.roles_needed?.slice(0, 3).map((r, i) => <span key={i} style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r}</span>)}
                            </div>
                          </div>
                        </div>

                        {/* Team Activity Toggle for Student Recruitment */}
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '12px', marginTop: '0.5rem' }}
                          onClick={() => setExpandedListingId(expandedListingId === event.id ? null : event.id)}
                        >
                          {expandedListingId === event.id ? '▲ Hide Team Activity' : '▼ View Team Activity'}
                        </button>

                        {/* Expanded Team Activity Panel */}
                        {expandedListingId === event.id && (
                          <div className="fade-in-up" style={{ background: 'rgba(175, 82, 222, 0.05)', padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(175, 82, 222, 0.1)', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#AF52DE', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Recent Interest ({event.join_requests?.length || 0})</p>
                            {(!event.join_requests || event.join_requests.length === 0) ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No join requests yet.</p>
                            ) : (
                              <div style={{ display: 'grid', gap: '0.6rem' }}>
                                {event.join_requests.slice(0, 5).map((req, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }} onClick={() => handleViewProfile(req.applicant_id)}>{req.profiles?.full_name}</span>
                                    <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem' }}>
                                      {req.status}
                                    </span>
                                  </div>
                                ))}
                                {event.join_requests.length > 5 && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>+ {event.join_requests.length - 5} more applicants</p>}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {event.type === 'poll' && event.options && (
                      <div style={{ display: 'grid', gap: '0.8rem', background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '20px' }}>
                        {event.options.map((opt, i) => {
                          const voteCount = (event.votes || []).filter(v => v.option_text === opt).length;
                          const totalVotes = (event.votes || []).length;
                          const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                          const hasVoted = (event.votes || []).some(v => v.user_id === profile.id);
                          
                          return (
                            <button 
                              key={i} 
                              className="poll-option" 
                              style={{ 
                                padding: '1.2rem', textAlign: 'left', border: '1px solid var(--glass-border)', 
                                position: 'relative', overflow: 'hidden', cursor: hasVoted ? 'default' : 'pointer',
                                background: 'white', color: 'var(--text-primary)',
                                width: '100%', borderRadius: '16px', transition: 'all 0.3s ease',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onClick={() => !hasVoted && handleVote(event.id, opt)}
                            >
                              <div style={{ 
                                position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, 
                                background: 'var(--accent-light)', transition: 'width 1s cubic-bezier(0.2, 0, 0, 1)' 
                              }}></div>
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', zIndex: 1 }}>
                                <span>{opt}</span>
                                <span style={{ color: 'var(--accent)' }}>{voteCount} ({Math.round(percent)}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {event.source_type === 'admin' ? (
                        <>
                          {event.know_more_url && (
                            <button className="btn btn-secondary" style={{ borderRadius: '15px' }} onClick={() => window.open(event.know_more_url, '_blank')}>
                              Details <ArrowRight size={18} />
                            </button>
                          )}
                          {event.is_team_joining_enabled && (
                            <button className="btn btn-primary" style={{ borderRadius: '15px' }} onClick={() => handleSelectEvent(event)}>
                              {myTeamForEvent ? 'Manage Team' : 'Build a Team'}
                            </button>
                          )}
                        </>
                      ) : (() => {
                        const hasRequested = event.join_requests?.find(r => r.applicant_id === profile.id);
                        if (hasRequested) {
                          return (
                            <span className={`badge ${hasRequested.status === 'approved' ? 'badge-green' : hasRequested.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ padding: '0.8rem 1rem', width: '100%', display: 'flex', justifyContent: 'center', fontSize: '0.9rem', borderRadius: '15px' }}>
                               {hasRequested.status === 'approved' ? 'Accepted ✓' : hasRequested.status === 'rejected' ? 'Declined' : 'Request Pending...'}
                            </span>
                          );
                        }
                        return (
                          <button className="btn btn-primary" style={{ flex: 1, borderRadius: '15px' }} onClick={() => handleApplyToListing(event.id)}>
                            Request to Join Team <Users size={18} />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {/* DISCOVERY TAB */}
        {activeTab === 'discovery' && (
          <div className="fade-in-up">
            <h1 className="dashboard-title">Team Discovery</h1>
            <p className="subtitle">Top hackathons and opportunities from the web. <HelpTooltip text="Browse global hackathons from around the world. You can 'Star' them to save for later." /></p>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Search size={20} color="var(--text-secondary)" />
              <input type="text" className="glass-input" style={{ border: 'none', background: 'transparent', backdropFilter: 'none', padding: '0.5rem' }} placeholder="Search global hackathons..." />
            </div>

            {loadingDiscovery ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[1,2,3,4].map(i => <div key={i} className="glass-panel skeleton" style={{ height: '350px' }}></div>)}
              </div>
            ) : externalHackathons.length === 0 ? (
               <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                 <Globe size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                 <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No Hackathons Found</h3>
                 <p style={{ color: 'var(--text-secondary)' }}>We couldn't find any external events. Make sure you've run the SQL setup script.</p>
               </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {externalHackathons.map((hack) => (
                  <div key={hack.id} className="glass-panel fade-in-up" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={hack.image_url || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000'} alt={hack.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <button 
                          className="btn" 
                          onClick={() => toggleFavorite(hack.id)}
                          style={{ 
                            width: '40px', height: '40px', padding: '0', borderRadius: '50%',
                            background: favorites.includes(hack.id) ? '#FF2D55' : 'rgba(255,255,255,0.8)',
                            color: favorites.includes(hack.id) ? 'white' : '#FF2D55',
                            backdropFilter: 'blur(10px)', border: 'none'
                          }}
                        >
                          <Star size={18} fill={favorites.includes(hack.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                        <span className="badge badge-blue" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>{hack.source || 'Hackathon'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{hack.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, lineHeight: '1.6' }}>{hack.description?.slice(0, 100)}...</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Calendar size={14} /> {hack.date}
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => window.open(ensureAbsoluteUrl(hack.link), '_blank')}>
                        Visit Official Site <Globe size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIND MEMBER TAB */}
        {activeTab === 'find_member' && (
          <div className="fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1 className="dashboard-title">My Recruitment Posts</h1>
                <p className="subtitle">Manage project listings and find talent. <HelpTooltip text="Create a post to find teammates for your project. Other students can see these posts and request to join you." /></p>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={fetchListings}>
                  <Activity size={16} /> Refresh
                </button>
                <button className="btn btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => setTeamAction(teamAction === 'create_listing' ? null : 'create_listing')}>
                  {teamAction === 'create_listing' ? <><XCircle size={16} /> Close</> : <><PlusCircle size={16} /> New Listing</>}
                </button>
              </div>
            </div>

            {teamAction === 'create_listing' && (
              <div className="glass-panel fade-in-up" style={{ padding: '2.5rem', marginBottom: '4rem', border: '2px solid var(--accent)' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>Create a Recruitment Post</h2>
                <form onSubmit={handleCreateListing} style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label className="input-label">Project / Team Name</label>
                      <input type="text" className="glass-input" placeholder="e.g. Nexus Core" value={listingTeamName} onChange={(e)=>setListingTeamName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Hackathon Target</label>
                      <input type="text" className="glass-input" placeholder="e.g. ETHIndia 2026" value={hackathonName} onChange={(e)=>setHackathonName(e.target.value)} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label className="input-label">Mode</label>
                      <select className="glass-input" value={mode} onChange={(e)=>setMode(e.target.value)}>
                        <option value="Online">🌐 Remote / Online</option>
                        <option value="Offline">📍 In-Person / Offline</option>
                      </select>
                    </div>
                    {mode === 'Offline' && (
                      <div className="input-group">
                        <label className="input-label">Location / City</label>
                        <input type="text" className="glass-input" placeholder="e.g. Indore, MP" value={formLocation} onChange={(e)=>setFormLocation(e.target.value)} required={mode === 'Offline'} />
                      </div>
                    )}
                    <div className="input-group">
                      <label className="input-label">Required Expertise (Skills)</label>
                      <input type="text" className="glass-input" placeholder="React, Node.js, Python, etc." value={requiredSkills} onChange={(e)=>setRequiredSkills(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Roles Needed</label>
                      <input type="text" className="glass-input" placeholder="Frontend, UI Designer, etc." value={rolesNeeded} onChange={(e)=>setRolesNeeded(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Exp. Level</label>
                        <input type="text" className="glass-input" placeholder="Beginner, Pro, etc." value={minExperience} onChange={(e)=>setMinExperience(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Registration Link (Optional)</label>
                      <input type="url" className="glass-input" placeholder="https://..." value={registrationLink} onChange={(e)=>setRegistrationLink(e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mission Statement</label>
                    <textarea className="glass-input" rows="4" placeholder="What are you building and why should people join you?" value={listingDescription} onChange={(e)=>setListingDescription(e.target.value)} required></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '1.2rem' }} disabled={isCreatingListing}>
                    {isCreatingListing ? 'Publishing...' : 'Publish to Feed'}
                  </button>
                </form>
              </div>
            )}

            {loadingListings ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[1,2].map(i => (
                  <div key={i} className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <Skeleton width="80px" height="20px" margin="0 0 0.8rem 0" />
                        <Skeleton width="60%" height="32px" margin="0 0 0.5rem 0" />
                        <Skeleton width="40%" height="24px" />
                      </div>
                      <Skeleton width="140px" height="50px" borderRadius="15px" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <Skeleton width="100%" height="80px" borderRadius="18px" />
                       <Skeleton width="100%" height="80px" borderRadius="18px" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No listings yet</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Be the first to start a movement.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '2rem' }}>
                {listings.map((listing) => (
                  <div key={listing.id} className="glass-panel fade-in-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <span className={`badge ${listing.mode === 'Online' ? 'badge-blue' : 'badge-green'}`}>{listing.mode}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{listing.team_name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>
                           <Star size={18} fill="currentColor" /> {listing.hackathon_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {listing.creator_id === profile.id && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '0.8rem', 
                              color: '#FF3B30', 
                              background: 'rgba(255, 59, 48, 0.08)',
                              border: '1px solid rgba(255, 59, 48, 0.1)'
                            }} 
                            onClick={() => handleDeleteListing(listing.id)}
                            title="Delete Post"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                        {(() => {
                          const hasRequested = listing.join_requests?.find(r => r.applicant_id === profile.id);
                          if (hasRequested) {
                            return (
                              <span className={`badge ${hasRequested.status === 'approved' ? 'badge-green' : hasRequested.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
                                 {hasRequested.status === 'approved' ? 'Accepted ✓' : hasRequested.status === 'rejected' ? 'Declined' : 'Request Pending...'}
                              </span>
                            );
                          }
                          return (
                            <button className="btn btn-primary" style={{ padding: '1rem 2rem' }} onClick={() => handleApplyToListing(listing.id)}>Apply Now</button>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'var(--accent-light)', padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(0,122,255,0.1)' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Required Expertise</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {listing.required_skills?.length > 0 ? (
                            listing.required_skills.map((s, i) => <span key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s}</span>)
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Any / Not specified</span>
                          )}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(175, 82, 222, 0.08)', padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(175, 82, 222, 0.1)' }}>
                        <p style={{ fontSize: '0.7rem', color: '#AF52DE', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Open Roles</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {listing.roles_needed?.length > 0 ? (
                            listing.roles_needed.map((r, i) => <span key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r}</span>)
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>None specified</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7' }}>{listing.description}</p>

                    {/* Know More Toggle */}
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '15px' }}
                      onClick={() => setExpandedListingId(expandedListingId === listing.id ? null : listing.id)}
                    >
                      {expandedListingId === listing.id ? '▲ Hide Team Interest' : '▼ View Team Interest'}
                    </button>

                    {/* Expanded Team Interest Panel */}
                    {expandedListingId === listing.id && (
                      <div className="fade-in-up" style={{ background: 'rgba(0, 113, 227, 0.05)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(0, 113, 227, 0.1)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Applicants & Interest ({listing.join_requests?.length || 0})</p>
                        {(!listing.join_requests || listing.join_requests.length === 0) ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No one has requested to join yet. Be the first!</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.8rem' }}>
                            {listing.join_requests.map((req, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                    {req.profiles?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }} onClick={() => handleViewProfile(req.applicant_id)}>{req.profiles?.full_name}</span>
                                </div>
                                <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                                  {req.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '0.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', boxShadow: 'var(--shadow-sm)' }}>
                          {listing.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(listing.creator_id)}>{listing.profiles?.full_name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{listing.profiles?.dev_role || 'Team Lead'}</p>
                        </div>
                      </div>
                      {listing.registration_link && (
                        <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }} onClick={() => window.open(listing.registration_link, '_blank')}>
                           Official Registration <LinkIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAM SELECTION VIEW (Within Events) */}
        {activeTab === 'events' && selectedEvent && !teamAction && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => { setSelectedEvent(null); setTeamAction(null); }}>
              ← All Events
            </button>
            <h1 className="dashboard-title" style={{ fontSize: '2.5rem' }}>{selectedEvent.title}</h1>
            <p className="subtitle">Choose how you want to participate in this event.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => setTeamAction('create')}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                   <Shield size={36} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>I'm a Team Lead</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6' }}>Create a team, define your project, and recruit specific roles from our student database. <HelpTooltip text="Choose this if you have a project idea and want to build your own team from scratch." /></p>
                <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Create My Team</button>
              </div>
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer' }} onClick={loadExistingTeams}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                   <Users size={36} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>I'm looking for a Team</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6' }}>Browse existing teams looking for members and request to join the one that fits your skills. <HelpTooltip text="Choose this if you don't have a team yet and want to join someone else's project." /></p>
                <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }}>Browse Teams</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / MANAGE TEAM FORM */}
        {activeTab === 'events' && selectedEvent && teamAction === 'create' && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => setTeamAction(null)}>
              ← Change Role
            </button>
            <h1 className="dashboard-title">{myTeamForEvent ? 'Manage Your Team' : 'Establish Your Team'}</h1>
            <p className="subtitle">Set your mission and find the best peers to win.</p>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
              <form onSubmit={handleCreateTeam}>
                <div className="input-group">
                  <label className="input-label">Team Name</label>
                  <input type="text" className="glass-input" value={teamName} onChange={(e)=>setTeamName(e.target.value)} placeholder="e.g. Cyber Knights" required />
                </div>
                <div className="input-group">
                  <label className="input-label">What roles do you need?</label>
                  <textarea className="glass-input" rows="3" value={teamRequirements} onChange={(e)=>setTeamRequirements(e.target.value)} placeholder="e.g. Looking for 1 Backend Dev and 1 Designer..." required></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1.2rem' }}>
                  {myTeamForEvent ? 'Update Team Details' : 'Initialize Team & Start Recruiting'}
                </button>
              </form>

              {myTeamForEvent && (
                <div style={{ marginTop: '4rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Invite Talent</h3>
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <Search size={20} color="var(--text-secondary)" />
                    <input type="text" className="glass-input" style={{ border: 'none', background: 'transparent' }} placeholder="Search students by skill or name..." value={studentSearch} onChange={(e)=>setStudentSearch(e.target.value)} />
                  </div>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {availableStudents.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.skills?.some(sk => sk.toLowerCase().includes(studentSearch.toLowerCase()))).map(student => (
                      <div key={student.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(student.id)}>{student.full_name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.dev_role} • {student.skills?.slice(0, 3).join(', ')}</p>
                          </div>
                        </div>
                        {sentInvitations[student.id] ? (
                          <span className={`badge ${sentInvitations[student.id] === 'approved' ? 'badge-green' : sentInvitations[student.id] === 'rejected' ? 'badge-red' : 'badge-purple'}`}>
                            {sentInvitations[student.id] === 'approved' ? 'Accepted' : sentInvitations[student.id] === 'rejected' ? 'Declined' : 'Pending'}
                          </span>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => handleInviteStudent(student.id)}
                            disabled={invitingId === student.id}
                          >
                            {invitingId === student.id ? 'Sending...' : 'Invite'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROWSE / JOIN TEAMS LIST */}
        {activeTab === 'events' && selectedEvent && teamAction === 'join' && (
          <div className="fade-in-up">
             <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => setTeamAction(null)}>
              ← Change Role
            </button>
            <h1 className="dashboard-title">Official Events</h1>
            <p className="subtitle">Join teams and participate in upcoming campus events. <HelpTooltip text="These are official events organized by the institute. You can either create your own team or join an existing one here." /></p>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {existingTeams.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No teams have been formed yet. Why not lead one?</p>
                </div>
              ) : existingTeams.map(team => {
                const isCreator = team.creator_id === profile.id;
                const isMember = team.team_members?.some(m => m.user_id === profile.id);
                const hasRequested = team.join_requests?.find(r => r.applicant_id === profile.id);
                const isExpanded = expandedTeamId === team.id;
                const pendingApps = (team.join_requests || []).filter(r => r.source === 'application' && r.status === 'pending');
                const allApps = (team.join_requests || []).filter(r => r.source === 'application');
                const invitations = (team.join_requests || []).filter(r => r.source === 'invitation');
                const members = team.team_members || [];

                return (
                <div key={team.id} className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{team.icon_url} {team.team_name}</h3>
                      <p style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleViewProfile(team.creator_id)}>Lead: <span style={{ textDecoration: 'underline' }}>{team.profiles?.full_name}</span></p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                        {pendingApps.length > 0 && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{pendingApps.length} pending</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {isCreator ? (
                        <span className="badge badge-green" style={{ padding: '0.5rem 1rem' }}>Your Team</span>
                      ) : isMember ? (
                        <span className="badge badge-green" style={{ padding: '0.5rem 1rem' }}>Joined ✓</span>
                      ) : hasRequested ? (
                        <span className={`badge ${hasRequested.status === 'approved' ? 'badge-green' : hasRequested.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ padding: '0.5rem 1rem' }}>
                           {hasRequested.status === 'approved' ? 'Accepted' : hasRequested.status === 'rejected' ? 'Declined' : 'Request Pending'}
                        </span>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleRequestJoin(team.id)}
                        >
                          Request to Join
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '18px', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Team Requirements</p>
                    <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>{team.requirements}</p>
                  </div>

                  {/* Know More Toggle */}
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  >
                    {isExpanded ? '▲ Hide Details' : '▼ Know More'}
                  </button>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1.5rem' }}>
                      
                      {/* Current Members */}
                      <div style={{ background: 'rgba(52, 199, 89, 0.06)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(52, 199, 89, 0.15)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#34C759', marginBottom: '1rem' }}>Current Members ({members.length})</p>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                          {members.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: m.role === 'creator' ? 'var(--gradient-purple)' : 'var(--gradient-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                {m.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(m.user_id)}>{m.profiles?.full_name || 'Unknown'}</span>
                                <span className={`badge ${m.role === 'creator' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: '0.6rem', marginLeft: '0.5rem' }}>{m.role === 'creator' ? 'Lead' : 'Member'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Join Applications */}
                      <div style={{ background: 'rgba(0, 113, 227, 0.06)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(0, 113, 227, 0.15)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Join Applications ({allApps.length})</p>
                        {allApps.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No applications yet.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {allApps.map(req => (
                              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(req.applicant_id)}>{req.profiles?.full_name || 'Unknown'}</span>
                                <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                                  {req.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Invitations Sent by Lead */}
                      <div style={{ background: 'rgba(175, 82, 222, 0.06)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(175, 82, 222, 0.15)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#AF52DE', marginBottom: '1rem' }}>Invitations from Lead ({invitations.length})</p>
                        {invitations.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No invitations sent yet.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {invitations.map(inv => (
                              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(inv.applicant_id)}>{inv.profiles?.full_name || 'Unknown'}</span>
                                <span className={`badge ${inv.status === 'approved' ? 'badge-green' : inv.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                                  {inv.status === 'approved' ? 'Accepted' : inv.status === 'rejected' ? 'Declined' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1 className="dashboard-title">Student Activity</h1>
                <p className="subtitle">Track your requests, team invites, and overall platform engagement. <HelpTooltip text="Check your pending requests to join teams, or see if someone has invited you to their project here." /></p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={fetchActivity}>
                 Sync Data <Activity size={16} />
              </button>
            </div>
            
            <div className="tab-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex' }}>
              <button className={`tab-btn ${activityTab === 'requested' ? 'active' : ''}`} onClick={() => setActivityTab('requested')}>
                Sent ({myRequests.length})
              </button>
              <button className={`tab-btn ${activityTab === 'invitations' ? 'active' : ''}`} onClick={() => setActivityTab('invitations')}>
                Invites ({(myInvitations || []).filter(i=>i.status==='pending').length})
              </button>
              <button className={`tab-btn ${activityTab === 'approve' ? 'active' : ''}`} onClick={() => setActivityTab('approve')}>
                Approvals ({incomingRequests.length})
              </button>
              <button className={`tab-btn ${activityTab === 'global' ? 'active' : ''}`} onClick={() => setActivityTab('global')}>
                System Log
              </button>
            </div>

            <div style={{ marginTop: '2rem' }}>
                {loading ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {[1,2,3].map(i => (
                      <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <Skeleton width="150px" height="24px" margin="0 0 0.5rem 0" />
                          <Skeleton width="100px" height="18px" />
                        </div>
                        <Skeleton width="80px" height="30px" borderRadius="10px" />
                      </div>
                    ))}
                  </div>
                ) : activityTab === 'requested' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {myRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No sent requests yet.</div>
                    ) : myRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{req.teams?.team_name || req.team_listings?.team_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{req.teams?.events?.title || req.team_listings?.hackathon_name}</p>
                          {req.role_applied && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, marginTop: '0.2rem' }}>Role: {req.role_applied}</p>
                          )}
                          {req.status === 'approved' && (
                             <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Contact Lead: {req.teams?.profiles?.whatsapp_no || req.team_listings?.profiles?.whatsapp_no || 'Check Profile'}</span>
                             </div>
                          )}
                        </div>
                        <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'invitations' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {(myInvitations || []).filter(inv => inv.status === 'pending').length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No pending invitations.</div>
                    ) : myInvitations.filter(inv => inv.status === 'pending').map(inv => (
                      <div key={inv.id} className="glass-panel fade-in-up" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{inv.teams?.team_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Invited by <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(inv.teams?.creator_id)}>{inv.teams?.profiles?.full_name}</span></p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleRequestResponse(inv.id, 'approved', profile.id, inv.team_id)}>Accept</button>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', color: '#FF3B30' }} onClick={() => handleRequestResponse(inv.id, 'rejected', profile.id, inv.team_id)}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'approve' && (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {incomingRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No approvals or updates.</div>
                    ) : incomingRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '200px', flex: 1 }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: req.source === 'invitation' ? 'var(--gradient-purple)' : 'var(--gradient-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', flexShrink: 0 }}>
                                    {req.profiles?.full_name?.charAt(0)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => handleViewProfile(req.applicant_id)}>{req.profiles?.full_name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {req.source === 'invitation'
                                        ? `Responded to invite for: ${req.teams?.team_name || req.team_listings?.team_name}`
                                        : `Applying for: ${req.teams?.team_name || req.team_listings?.team_name}`
                                      }
                                    </p>
                                    {req.role_applied && (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>Requested Role: {req.role_applied}</p>
                                    )}
                                </div>
                            </div>
                            {/* Show action buttons only for pending applications */}
                            {req.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button className="btn btn-primary" style={{ background: '#34C759', boxShadow: '0 8px 16px rgba(52, 199, 89, 0.3)', padding: '0.6rem 1rem', fontSize: '0.8rem' }} onClick={() => handleRequestResponse(req.id, 'approved', req.applicant_id, req.team_id)}>Approve</button>
                                  <button className="btn btn-secondary" style={{ color: '#FF3B30', padding: '0.6rem 1rem', fontSize: '0.8rem' }} onClick={() => handleRequestResponse(req.id, 'rejected', req.applicant_id, req.team_id)}>Reject</button>
                              </div>
                            ) : (
                              <span className={`badge ${req.status === 'approved' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                                {req.status === 'approved' ? '✓ ACCEPTED' : '✗ DECLINED'}
                              </span>
                            )}
                        </div>
                        
                        {req.status === 'pending' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
                            <div style={{ background: 'var(--accent-light)', padding: '1.2rem', borderRadius: '20px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>Tech Stack</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {req.profiles?.skills?.map((s, i) => <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '20px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>Professional Links</p>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {req.profiles?.github_url && <a href={req.profiles.github_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><GitBranch size={18} /></a>}
                                    {req.profiles?.linkedin_url && <a href={req.profiles.linkedin_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><Globe size={18} /></a>}
                                    {req.profiles?.resume_url && <a href={req.profiles.resume_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><FileText size={18} /></a>}
                                </div>
                            </div>
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'global' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {allRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No platform activity yet.</div>
                    ) : allRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Users size={16} />
                           </div>
                           <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.9rem', fontWeight: 700 }}><span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewProfile(req.applicant_id)}>{req.profiles?.full_name}</span> requested to join <span style={{ color: 'var(--text-primary)' }}>{req.teams?.team_name || req.team_listings?.team_name || 'a team'}</span></p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(req.created_at).toLocaleString()}</p>
                           </div>
                        </div>
                        <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="fade-in-up">
            <h1 className="dashboard-title">My Collaborative Missions</h1>
            <p className="subtitle">View and manage teams you've built or joined.</p>

            <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
              {loading ? (
                <div style={{ display: 'grid', gap: '2rem' }}>
                  {[1].map(i => (
                    <div key={i} className="glass-panel" style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                            <Skeleton width="100px" height="24px" />
                            <Skeleton width="120px" height="24px" />
                          </div>
                          <Skeleton width="60%" height="40px" margin="0 0 0.5rem 0" />
                          <Skeleton width="40%" height="20px" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                           <Skeleton width="150px" height="50px" borderRadius="15px" />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                        <Skeleton width="100%" height="200px" borderRadius="24px" />
                        <Skeleton width="100%" height="200px" borderRadius="24px" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myJoinedTeams.length === 0 ? (
                <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                   <Users size={64} color="var(--text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No Active Teams</h3>
                   <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>You haven't joined any teams yet. Explore events or recruitment posts to find your mission.</p>
                   <button className="btn btn-primary" onClick={() => handleTabChange('events')}>Explore Events</button>
                </div>
              ) : myJoinedTeams.map(team => (
                <div key={team.id} className="glass-panel fade-in-up" style={{ padding: '2rem', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${team.isLead ? 'badge-purple' : 'badge-blue'}`} style={{ padding: '0.4rem 1rem' }}>
                          {team.isLead ? <Shield size={12} style={{ marginRight: '4px' }} /> : <User size={12} style={{ marginRight: '4px' }} />}
                          {team.isLead ? 'Team Lead' : 'Collaborator'}
                        </span>
                        <span className="badge badge-green" style={{ padding: '0.4rem 1rem' }}>{team.events?.title || 'General Mission'}</span>
                      </div>
                      <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{team.team_name}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Mission established on {new Date(team.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                       <button className="btn btn-secondary" style={{ padding: '0.8rem 1.2rem', borderRadius: '15px' }} onClick={() => handleTabChange('activity')}>
                         Recruitment Activity
                       </button>
                       {!team.isLead && (
                         <button className="btn" style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', padding: '0.8rem 1.2rem', borderRadius: '15px', fontWeight: 700 }} onClick={() => handleLeaveTeam(team.id)}>
                           Leave Team
                         </button>
                       )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                    {/* LEFT COLUMN: MISSION & DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--accent)' }}>
                          <Briefcase size={18} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mission & Strategy</span>
                        </div>
                        <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--text-primary)', opacity: 0.9 }}>{team.requirements || "No specific mission strategy defined yet."}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(52, 199, 89, 0.05)', padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(52, 199, 89, 0.1)' }}>
                           <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34C759', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Team Size</p>
                           <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{team.team_members?.length || 1} Members</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(0, 122, 255, 0.05)', padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(0, 122, 255, 0.1)' }}>
                           <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Project Status</p>
                           <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>Active Phase</p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: TEAM ROSTER */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', color: '#AF52DE' }}>
                        <Users size={18} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member Directory</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {team.team_members?.map((member, idx) => (
                          <div key={idx} className="member-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                {member.profiles?.full_name?.charAt(0)}
                              </div>
                              <div>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }} onClick={() => handleViewProfile(member.user_id)}>{member.profiles?.full_name}</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.profiles?.dev_role || 'Specialist'}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {member.profiles?.whatsapp_no && (
                                <button className="btn-icon" onClick={() => window.open(`https://wa.me/${member.profiles.whatsapp_no.replace(/\D/g, '')}`, '_blank')} title="WhatsApp">
                                  <MessageCircle size={16} />
                                </button>
                              )}
                              <button className="btn-icon" onClick={() => handleViewProfile(member.user_id)} title="View Profile">
                                <ArrowRight size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!team.team_members || team.team_members.length === 0) && (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            No members found. Use the recruitment tab to find talent.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="fade-in-up">
            <h1 className="dashboard-title">Professional Profile</h1>
            <p className="subtitle">Showcase your skills and experience to find the perfect team. <HelpTooltip text="Fill out your skills and contact info so team leads can find you and invite you to their projects." /></p>
            
            <div className="glass-panel" style={{ padding: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '35px', background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '3rem', boxShadow: '0 20px 40px rgba(0, 113, 227, 0.3)', overflow: 'hidden' }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.full_name?.charAt(0)}
                  </div>
                  <label className="avatar-upload-btn" style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <PlusCircle size={20} />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} style={{ display: 'none' }} />
                  </label>
                </div>
                <div>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.2rem' }}>{profile?.full_name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>{profile?.dev_role || 'Lead Innovator'}</p>
                    <div className="badge badge-green" style={{ marginTop: '0.8rem' }}>Verified Account</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="glass-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">WhatsApp Number</label>
                  <input type="tel" className="glass-input" value={formWhatsapp} onChange={(e)=>setFormWhatsapp(e.target.value)} placeholder="+91..." />
                </div>
                <div className="input-group">
                  <label className="input-label">Dev Role (e.g. Fullstack Developer)</label>
                  <input type="text" className="glass-input" value={formDevRole} onChange={(e)=>setFormDevRole(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Technical Skills (comma separated)</label>
                  <input type="text" className="glass-input" value={formSkills} onChange={(e)=>setFormSkills(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">LinkedIn Profile</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formLinkedin} onChange={(e)=>setFormLinkedin(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">GitHub Profile</label>
                  <div style={{ position: 'relative' }}>
                    <GitBranch size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formGithub} onChange={(e)=>setFormGithub(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Resume Link (PDF / G-Drive)</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formResume} onChange={(e)=>setFormResume(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, minWidth: '250px', padding: '1.2rem' }} onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Syncing Profile...' : 'Save Professional Profile'}
                </button>
                <button className="btn btn-secondary" style={{ padding: '1.2rem 1.5rem', background: isInstalled ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 113, 227, 0.1)', color: isInstalled ? '#34C759' : 'var(--accent)', flex: 1, minWidth: '200px' }} onClick={handleInstallClick}>
                   {isInstalled ? <><CheckCircle size={20} style={{ marginRight: '0.5rem' }}/> App Installed</> : <><Download size={20} style={{ marginRight: '0.5rem' }}/> Install App</>}
                </button>
                <button className="btn btn-secondary" style={{ padding: '1.2rem 1.5rem', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', flexShrink: 0 }} onClick={() => supabase.auth.signOut()}>
                  <LogOut size={20} style={{ marginRight: '0.5rem' }}/> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {viewProfileId && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) setViewProfileId(null); }}>
            <div className="glass-panel slide-up" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button className="btn btn-secondary" style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem' }} onClick={() => setViewProfileId(null)}>✕</button>
              
              {!viewProfileData ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Fetching profile...</div>
              ) : (
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '2rem', boxShadow: 'var(--shadow-sm)', flexShrink: 0, overflow: 'hidden' }}>
                      {viewProfileData.avatar_url ? <img src={viewProfileData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (viewProfileData.full_name?.charAt(0) || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.2rem' }}>{viewProfileData.full_name}</h2>
                      <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>{viewProfileData.dev_role || 'Developer'}</p>
                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                        {viewProfileData.github_url && <a href={viewProfileData.github_url} target="_blank" rel="noreferrer" className="badge badge-purple" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><GitBranch size={12} style={{marginRight: '4px', display: 'inline-block', verticalAlign: 'middle'}}/> GitHub</a>}
                        {viewProfileData.linkedin_url && <a href={viewProfileData.linkedin_url} target="_blank" rel="noreferrer" className="badge badge-blue" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><Globe size={12} style={{marginRight: '4px', display: 'inline-block', verticalAlign: 'middle'}}/> LinkedIn</a>}
                        {viewProfileData.resume_url && <a href={viewProfileData.resume_url} target="_blank" rel="noreferrer" className="badge badge-green" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><FileText size={12} style={{marginRight: '4px', display: 'inline-block', verticalAlign: 'middle'}}/> Resume</a>}
                        {viewProfileData.whatsapp_no && <a href={`https://wa.me/${viewProfileData.whatsapp_no.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="badge badge-green" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><MessageCircle size={12} style={{marginRight: '4px', display: 'inline-block', verticalAlign: 'middle'}}/> WhatsApp</a>}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2.5rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Technical Skills</p>
                    {viewProfileData.skills?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {viewProfileData.skills.map((skill, i) => (
                          <span key={i} className="badge badge-blue" style={{ fontSize: '0.85rem' }}>{skill}</span>
                        ))}
                      </div>
                    ) : <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No skills listed.</p>}
                  </div>

                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Platform Activity</p>
                    
                    {viewProfileData.createdTeams?.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Teams Led</p>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                          {viewProfileData.createdTeams.map(t => (
                            <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{t.icon_url} {t.team_name}</span>
                              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{t.events?.title || 'Global Feed'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewProfileData.joinedTeams?.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34C759', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Teams Joined</p>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                          {viewProfileData.joinedTeams.map(j => (
                            <div key={j.team_id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{j.teams?.team_name}</span>
                              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{j.teams?.events?.title || 'Global Feed'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!viewProfileData.createdTeams?.length && !viewProfileData.joinedTeams?.length) && (
                      <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No public activity yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="container" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', fontWeight: 600 }}>
        &copy; 2026 TechLink Platform. Built for Excellence.
      </footer>
    </div>
  );
}

export default StudentDashboard;
