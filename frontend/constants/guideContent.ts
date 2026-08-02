// constants/guideContent.ts
// Content for the staged "How CareLink works" guide.
//
// The guide is deliberately NOT one generic walkthrough. It unlocks in three
// chapters that follow where the user actually is, so each one is only ever
// about the thing they're about to do next:
//
//   setup   — account just created, nothing filled in yet → granular profile steps
//   started — PESO has verified them → browsing, the match score, posting/applying
//   next    — they've applied (helper) / posted (parent) → what happens from here
//   work    — a contract is signed and Work Mode is live → running the placement
//
// Stage progression is derived from real data (verification status, activity, an
// active placement), not from a counter, so it can't drift out of sync. Each
// chapter auto-opens exactly once, the first time its stage is reached — never
// again on later logins. See contexts/GuideContext.tsx.

import { Ionicons } from '@expo/vector-icons';

export type GuideStage = 'setup' | 'started' | 'next' | 'work';
export type GuideRole = 'helper' | 'parent';

export type GuidePage = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export type GuideChapter = {
  stage: GuideStage;
  /** Shown in the chapter list. */
  label: string;
  /** One line explaining when this chapter matters. */
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
  pages: GuidePage[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const HELPER_SETUP: GuideChapter = {
  stage: 'setup',
  label: 'Setting up your profile',
  blurb: 'The steps to get ready for PESO verification.',
  icon: 'person-circle-outline',
  pages: [
    {
      icon: 'hand-left',
      title: 'Welcome to CareLink!',
      body: 'Before you can apply for work, PESO needs to verify who you are. This guide walks you through it one step at a time. You can close this and come back to it anytime.',
    },
    {
      icon: 'navigate-outline',
      title: 'Where to do all this',
      body: 'Everything below is in your Profile. On your Home screen there’s also a “Let’s finish your profile” card that takes you straight to whatever step is still missing.',
    },
    {
      icon: 'call-outline',
      title: 'Step 1 — Your contact details',
      body: 'Add your mobile number, birthday, and gender. Your number is how an employer reaches you once you’re hired, so double-check it.',
    },
    {
      icon: 'location-outline',
      title: 'Step 2 — Where you live',
      body: 'Choose your province, then your city or municipality, then your barangay. This matters more than you’d think: jobs near you score higher and show up first.',
    },
    {
      icon: 'camera-outline',
      title: 'Step 3 — Add a photo',
      body: 'A clear photo of your face, no filter. Employers are inviting someone into their home — a real photo is the single biggest thing that makes them trust your profile.',
    },
    {
      icon: 'briefcase-outline',
      title: 'Step 4 — The work you do',
      body: 'Pick your category (household help, childcare, cooking, gardening, laundry), then the specific roles you can do, then your skills and the languages you speak.',
    },
    {
      icon: 'chatbox-ellipses-outline',
      title: 'Step 5 — Write a short “About me”',
      body: 'A few sentences: your experience, what you’re good at, what kind of household suits you. Even 2–3 honest lines is much better than leaving it blank.',
    },
    {
      icon: 'card-outline',
      title: 'Step 6 — Upload your Valid ID',
      body: 'PhilSys National ID, passport, driver’s licence, UMID, PRC, postal, voter’s, SSS or GSIS. Upload BOTH the front and the back — front only is not enough. Lay it flat, good light, no glare.',
    },
    {
      icon: 'document-text-outline',
      title: 'Step 7 — Upload your Barangay Clearance',
      body: 'Get this from your barangay hall. Both this AND your Valid ID are required — PESO can’t start reviewing you until both are uploaded.',
    },
    {
      icon: 'sparkles-outline',
      title: 'Step 8 — Run the AI scan',
      body: 'On each uploaded document you can tap “Start AI Scan”. It checks the photo is clear and readable and tells you right away if something’s wrong — better to find out now than after waiting for review.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'What happens next',
      body: 'Once both documents are in, you go into PESO’s review queue. A real PESO officer checks your documents by hand — not a computer. When they approve you, a new guide opens showing you how to find work.',
    },
  ],
};

const HELPER_STARTED: GuideChapter = {
  stage: 'started',
  label: 'Finding your first job',
  blurb: 'Browsing, what the match % means, and how to apply.',
  icon: 'search-outline',
  pages: [
    {
      icon: 'shield-checkmark',
      title: 'You’re PESO-verified!',
      body: 'Two things just changed: employers can now find you in their search, and you can apply to jobs. Your profile also carries a “PESO Verified” badge, which employers filter for.',
    },
    {
      icon: 'search',
      title: 'Where to look for work',
      body: 'Tap Find Jobs. Every post there has been approved by PESO — you’re not going to hit a scam listing. Tap the heart to save a job for later.',
    },
    {
      icon: 'speedometer-outline',
      title: 'What the match % means',
      body: 'Each job shows how well it fits YOU, out of 100. It’s not random and it’s not an ad — it’s added up from seven things about your profile versus that job.',
    },
    {
      icon: 'calculator-outline',
      title: 'How the match is calculated',
      body: 'Category 25 · Job roles 15 · Skills 15 · Salary vs your expected pay 15 · Distance 10 · Experience 10 · Employer’s rating 10. Tap any match badge to see your actual breakdown for that job.',
    },
    {
      icon: 'bulb-outline',
      title: 'How to raise your match score',
      body: 'The biggest wins are free: add every role and skill you genuinely have, and keep your expected salary realistic. Filling in your address properly also unlocks the distance points.',
    },
    {
      icon: 'reader-outline',
      title: 'Reading a job post',
      body: 'Check the salary and how often it’s paid, stay-in or stay-out, the hours and rest days, what’s provided (meals, room, SSS/PhilHealth/Pag-IBIG), and whether there’s an application deadline.',
    },
    {
      icon: 'paper-plane-outline',
      title: 'How to apply',
      body: 'Open the job and tap Apply. Write a short cover letter — or let CareBot draft one for you and edit it. Say why you fit THIS family; a copy-paste letter is obvious to employers.',
    },
    {
      icon: 'lock-closed-outline',
      title: 'What the employer sees',
      body: 'You choose which extra documents to share (Police Clearance, TESDA NC II, NBI). Your Valid ID and Barangay Clearance are NEVER shared with employers — they carry your home address and stay with PESO only.',
    },
  ],
};

const HELPER_NEXT: GuideChapter = {
  stage: 'next',
  label: 'After you apply',
  blurb: 'Tracking applications, interviews, and getting hired.',
  icon: 'time-outline',
  pages: [
    {
      icon: 'list-outline',
      title: 'Where to track your applications',
      body: 'My Applications shows every job you’ve applied to and where it stands. You don’t need to message the employer to ask — the status updates itself.',
    },
    {
      icon: 'information-circle-outline',
      title: 'What the statuses mean',
      body: 'Pending = not opened yet. Reviewed = they’ve read it. Shortlisted = you’re a serious candidate. Interview Scheduled = check your Messages. Not Selected = they went another way.',
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Messages and interviews',
      body: 'An interested employer messages you first, and can set up a video interview inside CareLink. Reply promptly — being fast to respond is often what decides it.',
    },
    {
      icon: 'document-lock-outline',
      title: 'If you’re hired: the contract',
      body: 'A DOLE-compliant contract is generated with the pay and terms you agreed. Read it before signing — especially salary, rest days, and benefits. Nothing starts until BOTH of you have signed.',
    },
    {
      icon: 'briefcase',
      title: 'Then Work Mode opens',
      body: 'Once the contract is signed your app changes: daily tasks, check-in and check-out, your schedule, leave requests, and your salary summary. Your old job-hunting tabs step aside.',
    },
    {
      icon: 'refresh-outline',
      title: 'If you’re not selected',
      body: 'It only applies to that one job post — you can’t re-apply to it, but every other job from that same employer is still open to you. Keep applying; most helpers aren’t hired from their first application.',
    },
  ],
};

const HELPER_WORK: GuideChapter = {
  stage: 'work',
  label: 'Working with Work Mode',
  blurb: 'Tasks, check-in, leave, and your salary.',
  icon: 'briefcase-outline',
  pages: [
    {
      icon: 'briefcase',
      title: 'Work Mode is on',
      body: 'Your contract is signed, so the app has switched to helping you WORK instead of helping you job-hunt. Your tabs are now Home, My Work, Schedule and Messages.',
    },
    {
      icon: 'checkbox-outline',
      title: 'Your daily tasks',
      body: 'My Work shows what your employer has asked for. Tick each one off as you finish it. If something isn’t clear, message them — it’s better to ask than to guess.',
    },
    {
      icon: 'camera-outline',
      title: 'Photo proof (only sometimes)',
      body: 'Some tasks ask for a photo when you finish. It’s only on tasks where your employer turned it on — it’s not spying, it just saves you having to explain what was done.',
    },
    {
      icon: 'time-outline',
      title: 'Check in and check out',
      body: 'Tap to check in when you start and out when you finish. Forgetting once is not a problem and won’t get you in trouble — it’s a record for both of you, not a punch clock.',
    },
    {
      icon: 'calendar-outline',
      title: 'Your schedule',
      body: 'Schedule shows your working days and your rest days as agreed in the contract. Your rest day is yours — you don’t need to check in on it.',
    },
    {
      icon: 'airplane-outline',
      title: 'Asking for leave',
      body: 'Need a day off? Send a leave request instead of just messaging, so there’s a clear record. Your employer sees it on their home screen and approves or declines it there.',
    },
    {
      icon: 'wallet-outline',
      title: 'Your salary summary',
      body: 'Home shows what you’ve earned based on your agreed salary. Important: this is a RECORD, not a wallet. CareLink never holds or sends money — your employer pays you directly, the same as always.',
    },
    {
      icon: 'exit-outline',
      title: 'If the job ends',
      body: 'Either side can end the placement. When it’s finished you go back to job-hunting mode with your history kept, and you can leave each other a review.',
    },
  ],
};

// ─── Parent / employer ────────────────────────────────────────────────────────

const PARENT_SETUP: GuideChapter = {
  stage: 'setup',
  label: 'Setting up your household',
  blurb: 'The steps to get ready for PESO verification.',
  icon: 'person-circle-outline',
  pages: [
    {
      icon: 'hand-left',
      title: 'Welcome to CareLink!',
      body: 'Before you can post a job, PESO verifies your household — the same way it verifies every helper. That’s what makes both sides safe to trust. Here’s what to fill in.',
    },
    {
      icon: 'navigate-outline',
      title: 'Where to do all this',
      body: 'Everything below is in your Profile. Your Home screen also shows a card pointing you at whichever step is still missing.',
    },
    {
      icon: 'call-outline',
      title: 'Step 1 — Your contact details',
      body: 'Add your mobile number. This is how a helper reaches you once you’ve hired them, so make sure it’s current.',
    },
    {
      icon: 'location-outline',
      title: 'Step 2 — Where you live',
      body: 'Province, then city or municipality, then barangay. Helpers nearby score higher for your jobs, so this directly affects who you’ll see.',
    },
    {
      icon: 'home-outline',
      title: 'Step 3 — About your household',
      body: 'How many people live there, and the type of household. Helpers use this to judge the workload — a family of six is a very different job from a couple, and being upfront avoids a bad match.',
    },
    {
      icon: 'chatbox-ellipses-outline',
      title: 'Step 4 — Introduce your family',
      body: 'A few sentences about your home and what kind of help you’re looking for. Helpers read this before applying, and a warm, honest intro gets better applicants.',
    },
    {
      icon: 'card-outline',
      title: 'Step 5 — Upload your Valid ID',
      body: 'Any government ID. Upload both the front and the back, laid flat with good light. This proves to helpers that you’re a real, accountable household.',
    },
    {
      icon: 'document-text-outline',
      title: 'Step 6 — Upload your Barangay Clearance',
      body: 'From your barangay hall. Both this AND your Valid ID are required — PESO can’t begin reviewing until both are uploaded.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'What happens next',
      body: 'You enter PESO’s review queue and an officer checks your documents by hand. Once approved, a new guide opens showing you how to find and hire a helper.',
    },
  ],
};

const PARENT_STARTED: GuideChapter = {
  stage: 'started',
  label: 'Finding the right helper',
  blurb: 'Posting a job, browsing helpers, and the match score.',
  icon: 'search-outline',
  pages: [
    {
      icon: 'shield-checkmark',
      title: 'You’re PESO-verified!',
      body: 'You can now post jobs and browse helpers. Every helper you see has had their ID and Barangay Clearance checked by a PESO officer.',
    },
    {
      icon: 'git-branch-outline',
      title: 'Two ways to find someone',
      body: 'Post a job and let verified helpers apply to you — or browse helpers yourself and invite the ones you like to apply. Most families do both.',
    },
    {
      icon: 'add-circle-outline',
      title: 'How to post a job',
      body: 'Pick the category and the specific roles, then salary, schedule and rest days, stay-in or stay-out, and what you provide. Leave the description blank and CareLink writes one from your details.',
    },
    {
      icon: 'cash-outline',
      title: 'About the salary',
      body: 'CareLink requires at least ₱7,000/month — set deliberately above the regional kasambahay minimum to keep pay fair. SSS, PhilHealth and Pag-IBIG are required by law (RA 10361) and are always on.',
    },
    {
      icon: 'hourglass-outline',
      title: 'Optional: an application deadline',
      body: 'You can set a “valid until” date. After it passes the post stops showing to helpers automatically — useful when you need someone by a certain week. Leave it blank to keep it open.',
    },
    {
      icon: 'shield-outline',
      title: 'PESO approves your post first',
      body: 'New and edited posts go to PESO before helpers see them. This is why there are no scam listings on CareLink — expect a short wait after posting.',
    },
    {
      icon: 'speedometer-outline',
      title: 'What the match % means',
      body: 'Every applicant shows how well they fit THAT job, out of 100 — added up from real profile data, never from who paid or who applied first.',
    },
    {
      icon: 'calculator-outline',
      title: 'How the match is calculated',
      body: 'For a specific job: Category 25 · Skills 15 · Roles 15 · Salary fit 15 · Experience 10 · Distance 10 · Rating 10. Browsing helpers generally instead scores overall quality: Verified 30 · Rating 25 · Experience 20 · Skills 15 · Versatility 10.',
    },
    {
      icon: 'eye-outline',
      title: 'Read past the number',
      body: 'A 70% who lives nearby and has done exactly your work may beat a 90% who’d travel an hour. Tap the match badge for the breakdown, and always read their About section.',
    },
  ],
};

const PARENT_NEXT: GuideChapter = {
  stage: 'next',
  label: 'After you post a job',
  blurb: 'Reviewing applicants, hiring, and how contracts work.',
  icon: 'time-outline',
  pages: [
    {
      icon: 'people-outline',
      title: 'Where your applicants appear',
      body: 'Applicants show up under your job post and on your Home screen. Each one shows their match %, whether they’re PESO-verified, and their experience.',
    },
    {
      icon: 'funnel-outline',
      title: 'Review and shortlist',
      body: 'Open an applicant to see their profile, cover letter, and the documents they chose to share. Shortlist the ones worth talking to — it tells them they’re being seriously considered.',
    },
    {
      icon: 'videocam-outline',
      title: 'Message and interview',
      body: 'Message a shortlisted helper and schedule a video interview inside CareLink. There’s a built-in question guide if you’re not sure what to ask.',
    },
    {
      icon: 'close-circle-outline',
      title: 'Turning someone down',
      body: 'You can reject with a reason, which the helper sees. It only affects that one application — it doesn’t block them from your other job posts.',
    },
    {
      icon: 'document-lock-outline',
      title: 'How the contract works',
      body: 'When you hire, CareLink generates a DOLE-compliant contract from your job terms — salary, schedule, rest days, benefits. No drafting from scratch.',
    },
    {
      icon: 'create-outline',
      title: 'Both of you must sign',
      body: 'You sign, then the helper signs. The hire is NOT final until both signatures are in — nothing starts, and Work Mode stays locked, until then. If they don’t sign, nothing has happened.',
    },
    {
      icon: 'people-circle-outline',
      title: 'What signing settles',
      body: 'The contract is the agreement on the main duties and pay. Day-to-day requests are handled as tasks in Work Mode instead — you don’t renegotiate the contract to ask for something extra this week.',
    },
    {
      icon: 'briefcase',
      title: 'Then Work Mode opens',
      body: 'Assign daily tasks, track attendance (off by default — you choose), approve leave requests, and see a payroll summary. Payroll is a clear read-only view of what’s owed; CareLink never moves money.',
    },
  ],
};

const PARENT_WORK: GuideChapter = {
  stage: 'work',
  label: 'Managing with Work Mode',
  blurb: 'Tasks, attendance, leave, and payroll.',
  icon: 'briefcase-outline',
  pages: [
    {
      icon: 'briefcase',
      title: 'Work Mode is on',
      body: 'The contract is signed, so the app has switched from hiring to managing. You can toggle back to Recruitment mode anytime from the top of your screen if you need to hire again.',
    },
    {
      icon: 'grid-outline',
      title: 'Your Work Home',
      body: 'One screen with what matters: your total monthly payroll, anything waiting on you (leave requests, helper requests), and a card per helper. If nothing needs you, nothing shouts.',
    },
    {
      icon: 'add-circle-outline',
      title: 'Asking for something: tasks',
      body: 'Use Tasks for day-to-day requests. Type it in plain words, or tap Suggest for ready-made ones. Don’t reopen the contract just to ask for something extra this week — that’s what tasks are for.',
    },
    {
      icon: 'document-lock-outline',
      title: 'Contract vs tasks',
      body: 'The contract holds the main duties and the pay — the things you both agreed to and shouldn’t change casually. Tasks are the everyday layer on top. Keeping them separate protects you both.',
    },
    {
      icon: 'toggle-outline',
      title: 'Attendance is your choice',
      body: 'Attendance tracking is OFF by default and you decide whether to switch it on per helper. Plenty of households never turn it on — a trusted long-term helper usually doesn’t need it.',
    },
    {
      icon: 'airplane-outline',
      title: 'Leave requests',
      body: 'When your helper asks for a day off it appears on your Work Home to approve or decline. Handling it here keeps a clear record instead of it being lost in chat.',
    },
    {
      icon: 'wallet-outline',
      title: 'Payroll is a summary, not a payment',
      body: 'Payroll shows what’s owed from the agreed salary, days worked and leave taken — so nobody has to argue from memory. CareLink NEVER moves money; you still pay your helper directly.',
    },
    {
      icon: 'star-outline',
      title: 'Ending a placement',
      body: 'Either side can end it. Give proper notice as agreed in the contract, and leave an honest review afterwards — reviews are what future households rely on, and what a good helper earns.',
    },
  ],
};

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const GUIDE_CHAPTERS: Record<GuideRole, GuideChapter[]> = {
  helper: [HELPER_SETUP, HELPER_STARTED, HELPER_NEXT, HELPER_WORK],
  parent: [PARENT_SETUP, PARENT_STARTED, PARENT_NEXT, PARENT_WORK],
};

export function getChapter(role: GuideRole, stage: GuideStage): GuideChapter {
  const list = GUIDE_CHAPTERS[role];
  return list.find((c) => c.stage === stage) ?? list[0];
}

/** Order chapters unlock in — also the order shown in the chapter list. */
export const STAGE_ORDER: GuideStage[] = ['setup', 'started', 'next', 'work'];

/**
 * Which chapter fits where the user is right now. Checked most-advanced first,
 * because a hired helper has necessarily also applied.
 *   working (contract signed)  → work
 *   verified + applied/posted  → next
 *   verified                   → started
 *   otherwise                  → setup
 */
export function stageFor(verified: boolean, hasActivity: boolean, working = false): GuideStage {
  if (working) return 'work';
  if (!verified) return 'setup';
  return hasActivity ? 'next' : 'started';
}

/** Chapters the user has reached — later ones stay locked until they get there. */
export function unlockedStages(stage: GuideStage): GuideStage[] {
  const upTo = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER.slice(0, upTo + 1);
}
