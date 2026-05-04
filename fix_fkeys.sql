-- ==========================================
-- DEVMATCHUPS: COMPLETE DATABASE FIX
-- Run this ONCE in Supabase SQL Editor
-- ==========================================

-- 1. Fix Foreign Keys (enables name/profile lookups)
ALTER TABLE public.team_listings DROP CONSTRAINT IF EXISTS team_listings_creator_id_fkey;
ALTER TABLE public.team_listings
ADD CONSTRAINT team_listings_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_creator_id_fkey;
ALTER TABLE public.teams
ADD CONSTRAINT teams_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_applicant_id_fkey;
ALTER TABLE public.join_requests
ADD CONSTRAINT join_requests_applicant_id_fkey
FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. CRITICAL: Allow invitees to accept/reject their own invitations
-- Without this, Stu2 cannot accept an invite from Stu1 because
-- the old policy only allowed team creators to update requests.
DROP POLICY IF EXISTS "Invitees can respond to invitations" ON public.join_requests;
CREATE POLICY "Invitees can respond to invitations"
ON public.join_requests FOR UPDATE USING (
    auth.uid() = applicant_id AND source = 'invitation'
);

-- 3. Allow listing creators to approve/reject applications to their listings
DROP POLICY IF EXISTS "Listing creators can update request status" ON public.join_requests;
CREATE POLICY "Listing creators can update request status"
ON public.join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.team_listings WHERE id = listing_id AND creator_id = auth.uid())
);

-- 4. Admin can manage external_hackathons
DROP POLICY IF EXISTS "Admins can manage external hackathons" ON public.external_hackathons;
CREATE POLICY "Admins can manage external hackathons"
ON public.external_hackathons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
