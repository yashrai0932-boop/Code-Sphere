
export const initialData = {
  profiles: [
    {
      id: 'dummy-admin-id',
      full_name: 'Admin User',
      email: 'admin@gmail.com',
      role: 'admin',
      branch: 'Engineering',
      whatsapp_no: '+91 9999999999',
      is_blocked: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'dummy-student-id',
      full_name: 'Aayush Sharma',
      email: 'student@example.com',
      role: 'student',
      branch: 'Engineering',
      whatsapp_no: '+91 8888888888',
      skills: ['React', 'Node.js', 'UI/UX'],
      dev_role: 'Lead Developer',
      is_blocked: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'student-2',
      full_name: 'Priya Singh',
      email: 'priya@example.com',
      role: 'student',
      branch: 'Mechanical',
      skills: ['AutoCAD', 'SolidWorks'],
      dev_role: 'Mechanical Designer',
      created_at: new Date().toISOString()
    },
    {
      id: 'student-3',
      full_name: 'Rahul Verma',
      email: 'rahul@example.com',
      role: 'student',
      branch: 'Electronics',
      skills: ['Arduino', 'PCB Design', 'C++'],
      dev_role: 'Hardware Engineer',
      created_at: new Date().toISOString()
    }
  ],
  events: [
    {
      id: 'event-1',
      title: 'Innovation Sprint 2024',
      description: 'The annual flagship sprint for tech enthusiasts. Build innovative solutions for real-world problems.',
      type: 'hackathon',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString()
    },
    {
      id: 'event-2',
      title: 'Robotics Design Challenge',
      description: 'Showcase your CAD and mechanical design skills.',
      type: 'challenge',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 10).toISOString()
    },
    {
      id: 'event-3',
      title: 'Project Showcase Poll',
      description: 'Which project category are you most excited about?',
      type: 'poll',
      options: ['Robotics', 'Automation', 'IoT', 'AI'],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString()
    }
  ],
  team_listings: [
    {
      id: 'listing-1',
      creator_id: 'dummy-student-id',
      team_name: 'RoboSquad',
      hackathon_name: 'National Robotics Challenge',
      description: 'Looking for a mechanical designer and an electronics expert to build a disaster-relief robot.',
      roles_needed: ['Mechanical Designer', 'Electronics Expert'],
      required_skills: ['SolidWorks', 'Arduino'],
      mode: 'In-person',
      location: 'Main Lab',
      min_experience: 'Intermediate',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'listing-2',
      creator_id: 'student-2',
      team_name: 'EcoBuilders',
      hackathon_name: 'Green Tech Expo',
      description: 'Building a solar-powered irrigation system. Need a web developer for the dashboard.',
      roles_needed: ['Web Developer', 'IoT Specialist'],
      required_skills: ['React', 'ESP32'],
      mode: 'Remote',
      min_experience: 'Beginner',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ],
  teams: [
    {
      id: 'team-1',
      event_id: 'event-1',
      creator_id: 'dummy-student-id',
      team_name: 'Innovators',
      requirements: 'Need a presentation expert and a documentation lead.',
      icon_url: '🚀',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'team-2',
      event_id: 'event-1',
      creator_id: 'student-2',
      team_name: 'MechMasters',
      requirements: 'Looking for a coder who knows Python.',
      icon_url: '⚙️',
      created_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
    },
    {
      id: 'team-3',
      event_id: 'event-1',
      creator_id: 'dummy-admin-id',
      team_name: 'CyberSphere',
      requirements: 'Looking for Cybersecurity experts and UI/UX designers.',
      icon_url: '🛡️',
      created_at: new Date().toISOString()
    }
  ],
  team_members: [
    { id: 'tm-1', team_id: 'team-1', user_id: 'dummy-student-id', role: 'Lead', created_at: new Date().toISOString() },
    { id: 'tm-2', team_id: 'team-1', user_id: 'student-3', role: 'Member', created_at: new Date().toISOString() },
    { id: 'tm-3', team_id: 'team-2', user_id: 'student-2', role: 'Lead', created_at: new Date().toISOString() },
    { id: 'tm-4', team_id: 'team-3', user_id: 'dummy-admin-id', role: 'Lead', created_at: new Date().toISOString() }
  ],
  join_requests: [
    {
      id: 'jr-1',
      team_id: 'team-1',
      applicant_id: 'student-2',
      status: 'pending',
      source: 'application',
      role_applied: 'Designer',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'jr-2',
      listing_id: 'listing-1',
      applicant_id: 'student-3',
      status: 'accepted',
      source: 'application',
      role_applied: 'Electronics Expert',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'jr-3',
      team_id: 'team-2',
      applicant_id: 'dummy-student-id',
      status: 'rejected',
      source: 'invitation',
      created_at: new Date(Date.now() - 3600000 * 10).toISOString()
    }
  ],
  activity_logs: [
    { id: 'log-1', user_id: 'dummy-student-id', action: 'created_team', details: { team_name: 'Innovators' }, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'log-2', user_id: 'student-2', action: 'sent_request', details: { team_name: 'Innovators' }, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'log-3', user_id: 'dummy-student-id', action: 'accepted_member', details: { member_name: 'Rahul Verma' }, created_at: new Date(Date.now() - 3600000).toISOString() }
  ],
  external_hackathons: [
    {
      id: 'ext-1',
      title: 'Global Robotics Summit',
      description: 'Join the world largest robotics competition in Singapore.',
      link: 'https://example.com',
      date: 'June 2024',
      created_at: new Date().toISOString()
    },
    {
      id: 'ext-2',
      title: 'Smart India Hackathon',
      description: 'Nationwide competition for innovative software/hardware solutions.',
      link: 'https://sih.gov.in',
      date: 'August 2024',
      created_at: new Date().toISOString()
    }
  ],
  favorites: [],
  votes: [
    { id: 'v-1', event_id: 'event-3', user_id: 'student-2', option_text: 'Robotics', created_at: new Date().toISOString() },
    { id: 'v-2', event_id: 'event-3', user_id: 'student-3', option_text: 'IoT', created_at: new Date().toISOString() }
  ]
};
