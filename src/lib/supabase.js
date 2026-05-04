import { initialData } from './mockData';

// Mock implementation of Supabase client using localStorage
class MockSupabase {
  constructor() {
    this.data = JSON.parse(localStorage.getItem('mock_db_v4')) || initialData;
    this.currentUser = JSON.parse(localStorage.getItem('mock_user')) || null;
    this.authSubscribers = [];
    this.persistData();
  }

  persistData() {
    localStorage.setItem('mock_db_v4', JSON.stringify(this.data));
  }

  // Auth implementation
  auth = {
    getSession: async () => {
      return { data: { session: this.currentUser ? { user: this.currentUser } : null }, error: null };
    },
    onAuthStateChange: (callback) => {
      this.authSubscribers.push(callback);
      // Trigger immediately with current state
      const session = this.currentUser ? { user: this.currentUser } : null;
      callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);
      
      return { data: { subscription: { unsubscribe: () => {
        this.authSubscribers = this.authSubscribers.filter(s => s !== callback);
      } } } };
    },
    signInWithPassword: async ({ email, password }) => {
      const lowerEmail = email.toLowerCase();
      let user = this.data.profiles.find(p => p.email.toLowerCase() === lowerEmail);
      
      // Special Rule: If not found, create a dummy student profile for this email
      if (!user) {
        user = {
          id: 'user-' + Math.random().toString(36).substring(7),
          email: lowerEmail,
          full_name: email.split('@')[0], // Use first part of email as name
          role: lowerEmail === 'admin@gmail.com' ? 'admin' : 'student',
          branch: 'Engineering',
          whatsapp_no: '+91 0000000000',
          skills: ['Demo Mode'],
          is_blocked: false,
          created_at: new Date().toISOString()
        };
        this.data.profiles.push(user);
        this.persistData();
      }

      this.currentUser = user;
      const session = { user };
      localStorage.setItem('mock_user', JSON.stringify(user));
      this.authSubscribers.forEach(s => s('SIGNED_IN', session));
      return { data: { user, session }, error: null };
    },
    signUp: async ({ email, password, options }) => {
      const newUser = {
        id: Math.random().toString(36).substring(7),
        email,
        full_name: options?.data?.full_name || '',
        whatsapp_no: options?.data?.whatsapp_no || '',
        role: 'student',
        created_at: new Date().toISOString()
      };
      this.data.profiles.push(newUser);
      this.persistData();
      return { data: { user: newUser }, error: null };
    },
    verifyOtp: async ({ email, token, type }) => {
      const lowerEmail = email.toLowerCase();
      let user = this.data.profiles.find(p => p.email.toLowerCase() === lowerEmail);
      
      if (!user) {
        user = {
          id: 'user-' + Math.random().toString(36).substring(7),
          email: lowerEmail,
          full_name: email.split('@')[0],
          role: lowerEmail === 'admin@gmail.com' ? 'admin' : 'student',
          branch: 'Engineering',
          whatsapp_no: '+91 0000000000',
          is_blocked: false,
          created_at: new Date().toISOString()
        };
        this.data.profiles.push(user);
        this.persistData();
      }

      this.currentUser = user;
      localStorage.setItem('mock_user', JSON.stringify(user));
      this.authSubscribers.forEach(s => s('SIGNED_IN', { user }));
      return { data: { user }, error: null };
    },
    signOut: async () => {
      this.currentUser = null;
      localStorage.removeItem('mock_user');
      this.authSubscribers.forEach(s => s('SIGNED_OUT', null));
      return { error: null };
    },
    resetPasswordForEmail: async (email) => ({ data: {}, error: null }),
    updateUser: async ({ password }) => ({ data: {}, error: null }),
    resend: async () => ({ data: {}, error: null })
  };

  // Database implementation
  from(table) {
    const tableData = this.data[table] || [];
    
    return {
      select: (query = '*') => {
        const chain = {
          eq: (column, value) => {
            const filtered = tableData.filter(i => i[column] === value);
            return {
              single: async () => {
                const item = filtered[0];
                return { data: item ? this._enrich(item, table) : null, error: item ? null : { message: 'Not found' } };
              },
              maybeSingle: async () => {
                const item = filtered[0];
                return { data: item ? this._enrich(item, table) : null, error: null };
              },
              order: (col, { ascending } = { ascending: false }) => {
                const sorted = [...filtered].sort((a, b) => {
                  if (ascending) return a[col] > b[col] ? 1 : -1;
                  return a[col] < b[col] ? 1 : -1;
                });
                return { data: sorted.map(i => this._enrich(i, table)), error: null };
              },
              async then(resolve) {
                resolve({ data: filtered.map(i => this._enrich(i, table)), error: null });
              }
            };
          },
          in: (column, values) => ({
            eq: (col2, val2) => ({
              order: (sortCol, { ascending } = { ascending: false }) => {
                const results = tableData.filter(i => values.includes(i[column]) && i[col2] === val2);
                return { data: results.map(i => this._enrich(i, table)), error: null };
              },
              async then(resolve) {
                const results = tableData.filter(i => values.includes(i[column]) && i[col2] === val2);
                resolve({ data: results.map(i => this._enrich(i, table)), error: null });
              }
            }),
            async then(resolve) {
              const results = tableData.filter(i => values.includes(i[column]));
              resolve({ data: results.map(i => this._enrich(i, table)), error: null });
            }
          }),
          or: (condition) => ({
            order: (col, { ascending } = { ascending: false }) => {
              return { data: tableData.map(i => this._enrich(i, table)), error: null };
            }
          }),
          order: (col, { ascending } = { ascending: false }) => {
            const sorted = [...tableData].sort((a, b) => {
              if (ascending) return a[col] > b[col] ? 1 : -1;
              return a[col] < b[col] ? 1 : -1;
            });
            return { data: sorted.map(i => this._enrich(i, table)), error: null };
          },
          limit: (n) => ({
            async then(resolve) {
              resolve({ data: tableData.slice(0, n).map(i => this._enrich(i, table)), error: null });
            }
          }),
          async then(resolve) {
            resolve({ data: tableData.map(i => this._enrich(i, table)), error: null });
          }
        };
        return chain;
      },
      insert: async (items) => {
        const newItems = items.map(item => ({
          id: Math.random().toString(36).substring(7),
          created_at: new Date().toISOString(),
          ...item
        }));
        this.data[table].push(...newItems);
        this.persistData();
        return { data: newItems, error: null };
      },
      update: (updates) => ({
        eq: (column, value) => {
          this.data[table] = this.data[table].map(item => 
            item[column] === value ? { ...item, ...updates } : item
          );
          this.persistData();
          return { error: null };
        }
      }),
      delete: () => ({
        eq: (column, value) => {
           this.data[table] = this.data[table].filter(i => i[column] !== value);
           this.persistData();
           return { error: null };
        }
      })
    };
  }

  _enrich(item, table) {
    const enriched = { ...item };
    if (table === 'team_listings' || table === 'teams') {
      const creatorId = item.creator_id;
      enriched.profiles = this.data.profiles.find(p => p.id === creatorId) || {};
      enriched.join_requests = this.data.join_requests.filter(r => r.listing_id === item.id || r.team_id === item.id)
        .map(r => ({ ...r, profiles: this.data.profiles.find(p => p.id === r.applicant_id) || {} }));
    }
    if (table === 'teams') {
      enriched.events = this.data.events.find(e => e.id === item.event_id) || {};
      enriched.team_members = this.data.team_members.filter(m => m.team_id === item.id)
        .map(m => ({ ...m, profiles: this.data.profiles.find(p => p.id === m.user_id) || {} }));
    }
    if (table === 'join_requests') {
       enriched.profiles = this.data.profiles.find(p => p.id === item.applicant_id) || {};
       enriched.teams = this.data.teams.find(t => t.id === item.team_id) || {};
       if (enriched.teams && enriched.teams.id) {
          enriched.teams.events = this.data.events.find(e => e.id === enriched.teams.event_id) || {};
          enriched.teams.profiles = this.data.profiles.find(p => p.id === enriched.teams.creator_id) || {};
       }
       enriched.team_listings = this.data.team_listings.find(l => l.id === item.listing_id) || {};
       if (enriched.team_listings && enriched.team_listings.id) {
          enriched.team_listings.profiles = this.data.profiles.find(p => p.id === enriched.team_listings.creator_id) || {};
       }
    }
    if (table === 'events') {
       enriched.votes = this.data.votes.filter(v => v.event_id === item.id);
    }
    return enriched;
  }

  // Realtime implementation (simplified)
  channel() {
    return {
      on: () => this.channel(),
      subscribe: () => this.channel(),
      removeChannel: () => {}
    };
  }
  removeChannel() {}

  // Storage implementation (simplified)
  storage = {
    from: (bucket) => ({
      upload: async (path, blob) => {
        return { data: { path }, error: null };
      },
      getPublicUrl: (path) => ({
        data: { publicUrl: 'https://via.placeholder.com/150' }
      })
    })
  };
}

export const supabase = new MockSupabase();
