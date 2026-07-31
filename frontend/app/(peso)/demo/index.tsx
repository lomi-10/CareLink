// app/(peso)/demo/index.tsx
// User-testing control panel. Lets the researcher drive the MOCK EMPLOYER side
// of a test session without leaving the PESO portal — one login, one role.
//
// Every button calls the real endpoint the real employer would call, so the
// tester experiences the actual system rather than a simulation. Backend:
// peso/demo_actions.php (invite / shortlist / interview) and the real
// parent/hire_helper.php for the contract step.
//
// The screen only lists helpers who have reached PESO verification, since
// that's the point in the journey where the mock employer becomes relevant.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import {
  ScreenHeader, Card, PButton, Pill, EmptyState, ListRow, SectionHeader,
  usePesoTheme, space, radius,
} from '@/components/peso/ui';

type DemoJob = { job_post_id: number; title: string; parent_id: number; parent_name: string; category_name?: string };
type DemoApp = {
  application_id: number; status: string; job_post_id: number; title: string;
  parent_id: number; parent_name: string; interview_count: number;
};
type Helper = { user_id: number; name: string; email: string; verification_status?: string };

/** The one action that makes sense next, given where the application is. */
function nextStep(status: string): { action: 'shortlist' | 'interview' | 'contract' | null; label: string; hint: string } {
  switch (status) {
    case 'Pending':
    case 'Reviewed':
      return { action: 'shortlist', label: 'Shortlist', hint: 'Tell the tester they made the shortlist.' };
    case 'Shortlisted':
      return { action: 'interview', label: 'Schedule interview', hint: 'Books tomorrow 10:00 AM with a video link.' };
    case 'Interview Scheduled':
      return { action: 'contract', label: 'Send contract', hint: 'Starts the real contract flow — the tester then signs or declines.' };
    case 'contract_pending':
      return { action: null, label: '', hint: 'Waiting for the tester to sign or decline the contract.' };
    case 'hired':
    case 'Accepted':
      return { action: null, label: '', hint: 'Hired. Work Mode unlocks on the contract start date.' };
    default:
      return { action: null, label: '', hint: '' };
  }
}

export default function DemoPanelScreen() {
  const { c } = usePesoTheme();

  const [staffId, setStaffId] = useState<string>('');
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [selected, setSelected] = useState<Helper | null>(null);
  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [apps, setApps] = useState<DemoApp[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then((raw) => {
      const u = raw ? JSON.parse(raw) : {};
      setStaffId(String(u.user_id ?? ''));
    });
  }, []);

  const loadHelpers = useCallback(async () => {
    if (!staffId) return;
    try {
      const res = await fetch(`${API_URL}/peso/get_pending_users.php`);
      const data = await res.json();
      const list: Helper[] = (data?.data ?? [])
        .filter((u: any) => u.user_type === 'helper')
        .map((u: any) => ({
          user_id: Number(u.user_id),
          name: String(u.name ?? '').replace(/\s+/g, ' ').trim(),
          email: u.email,
          verification_status: u.verification_status,
        }));
      setHelpers(list);
    } catch { /* the empty state covers this */ }
  }, [staffId]);

  const loadState = useCallback(async (helperId: number) => {
    if (!staffId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/peso/demo_actions.php?staff_user_id=${staffId}&helper_id=${helperId}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs ?? []);
        setApps(data.applications ?? []);
        setInvites(data.invites ?? []);
      } else {
        setNote({ msg: data.message || 'Could not load demo state.', ok: false });
      }
    } catch {
      setNote({ msg: 'Could not reach the server.', ok: false });
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { void loadHelpers(); }, [loadHelpers]);
  useEffect(() => { if (selected) void loadState(selected.user_id); }, [selected, loadState]);

  const post = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setNote(null);
    try {
      const res = await fetch(`${API_URL}/peso/demo_actions.php?staff_user_id=${staffId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setNote({ msg: data.message, ok: !!data.success });
      if (selected) await loadState(selected.user_id);
    } catch {
      setNote({ msg: 'Could not reach the server.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  // The contract step is the REAL employer endpoint — same payload the parent app
  // sends — so the tester gets a genuine generated contract to sign or decline.
  const sendContract = async (app: DemoApp) => {
    setBusy(`contract-${app.application_id}`);
    setNote(null);
    try {
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const res = await fetch(`${API_URL}/parent/hire_helper.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: app.application_id,
          job_post_id: app.job_post_id,
          parent_id: app.parent_id,
          helper_id: selected?.user_id,
          requester_id: app.parent_id, // acting as the mock employer
          // Start today so Work Mode unlocks immediately for the tester.
          contract_start_date: ymd,
          contract_duration: '1 year',
          work_hours: '8:00 AM - 5:00 PM',
          rest_days: ['Sunday'],
          vacation_leave_days: 5,
          sick_leave_days: 5,
          payment_schedule: 'Monthly',
        }),
      });
      const data = await res.json();
      setNote({ msg: data.message || (data.success ? 'Contract sent.' : 'Could not send the contract.'), ok: !!data.success });
      if (selected) await loadState(selected.user_id);
    } catch {
      setNote({ msg: 'Could not reach the server.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpers;
    return helpers.filter((h) => h.name.toLowerCase().includes(q) || (h.email ?? '').toLowerCase().includes(q));
  }, [helpers, query]);

  const invitedJobIds = useMemo(() => new Set(invites.map((i) => Number(i.job_post_id))), [invites]);
  const appliedJobIds = useMemo(() => new Set(apps.map((a) => a.job_post_id)), [apps]);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScreenHeader
        eyebrow="USER TESTING"
        title="Demo Control Panel"
        subtitle="Act as the mock employer without leaving the PESO portal"
      />

      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        {jobs.length === 0 && !loading && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '800', color: c.ink, marginBottom: 6 }}>
              No demo employers found
            </Text>
            <Text style={{ fontSize: 13.5, color: c.muted, lineHeight: 19 }}>
              Run <Text style={{ fontWeight: '800' }}>backend/database/demo_seed.sql</Text> on this database first.
              It creates the six mock households and their job posts.
            </Text>
          </Card>
        )}

        {!!note && (
          <Card style={{ borderColor: note.ok ? c.ok : c.bad, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={note.ok ? c.ok : c.bad} />
              <Text style={{ flex: 1, fontSize: 13.5, color: c.ink }}>{note.msg}</Text>
            </View>
          </Card>
        )}

        {/* ── 1. Pick the tester ── */}
        <Card>
          <SectionHeader eyebrow="STEP 1" title="Choose the tester" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search helpers by name or email…"
            placeholderTextColor={c.subtle}
            style={{
              backgroundColor: c.surface, borderWidth: 1, borderColor: c.line,
              borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
              color: c.ink, fontSize: 13.5, marginBottom: space.md,
            }}
          />
          {filtered.length === 0 ? (
            <EmptyState icon="people-outline" title="No helpers yet" sub="A tester appears here once they sign up." />
          ) : (
            filtered.slice(0, 12).map((h) => (
              <ListRow key={h.user_id} onPress={() => setSelected(h)} selected={selected?.user_id === h.user_id}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: c.ink }}>{h.name || h.email}</Text>
                  <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{h.email}</Text>
                </View>
                <Pill
                  label={h.verification_status ?? 'Unverified'}
                  tone={h.verification_status === 'Verified' ? 'ok' : h.verification_status === 'Rejected' ? 'bad' : 'warn'}
                />
              </ListRow>
            ))
          )}
        </Card>

        {selected && (
          <>
            {/* ── 2. Invite ── */}
            <Card>
              <SectionHeader
                eyebrow="STEP 2"
                title={`Invite ${selected.name.split(' ')[0]} to a job`}
                right={loading ? <ActivityIndicator size="small" color={c.accent} /> : undefined}
              />
              <Text style={{ fontSize: 12, color: c.muted, marginBottom: space.md, lineHeight: 18 }}>
                Sends a real invitation from a mock household. Optional — the tester can also just browse and apply.
              </Text>
              {jobs.map((j) => {
                const invited = invitedJobIds.has(j.job_post_id);
                const applied = appliedJobIds.has(j.job_post_id);
                return (
                  <ListRow key={j.job_post_id}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.ink }}>{j.title}</Text>
                      <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                        {j.parent_name}{j.category_name ? ` · ${j.category_name}` : ''}
                      </Text>
                    </View>
                    {applied ? (
                      <Pill label="Applied" tone="ok" />
                    ) : invited ? (
                      <Pill label="Invited" tone="accent" />
                    ) : (
                      <PButton
                        label="Invite"
                        size="sm"
                        loading={busy === `invite-${j.job_post_id}`}
                        onPress={() => post({ action: 'invite', helper_id: selected.user_id, job_post_id: j.job_post_id }, `invite-${j.job_post_id}`)}
                      />
                    )}
                  </ListRow>
                );
              })}
            </Card>

            {/* ── 3. Drive the application ── */}
            <Card>
              <SectionHeader eyebrow="STEP 3" title="Move the application forward" />
              {apps.length === 0 ? (
                <EmptyState
                  icon="hourglass-outline"
                  title="No application yet"
                  sub="Once the tester applies to a demo job, the next step appears here."
                />
              ) : (
                apps.map((a) => {
                  const step = nextStep(a.status);
                  const key = `${step.action}-${a.application_id}`;
                  return (
                    <View
                      key={a.application_id}
                      style={{
                        borderWidth: 1, borderColor: c.line, borderRadius: radius.md,
                        padding: space.md, marginBottom: space.sm, gap: space.sm,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: c.ink }}>{a.title}</Text>
                          <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{a.parent_name}</Text>
                        </View>
                        <Pill label={a.status} tone={a.status === 'hired' ? 'ok' : 'accent'} />
                      </View>

                      {!!step.hint && (
                        <Text style={{ fontSize: 12, color: c.muted, lineHeight: 18 }}>{step.hint}</Text>
                      )}

                      {step.action === 'contract' ? (
                        <PButton
                          label="Send contract"
                          loading={busy === `contract-${a.application_id}`}
                          onPress={() => sendContract(a)}
                        />
                      ) : step.action ? (
                        <PButton
                          label={step.label}
                          loading={busy === key}
                          onPress={() => post({ action: step.action, application_id: a.application_id }, key)}
                        />
                      ) : null}
                    </View>
                  );
                })
              )}
            </Card>

            <Card>
              <SectionHeader eyebrow="STEP 4" title="Ending the session" />
              <Text style={{ fontSize: 12, color: c.muted, lineHeight: 19 }}>
                Ask the tester to open their menu and tap{' '}
                <Text style={{ fontWeight: '800', color: c.ink }}>Finish demo session</Text>. That collects their
                feedback, clears everything they did with these mock households, and signs them out — their profile
                and documents stay.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
