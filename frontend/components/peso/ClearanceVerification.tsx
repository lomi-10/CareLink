// components/peso/ClearanceVerification.tsx
//
// Manual portal check for an NBI or Police Clearance, inside the PESO document
// review card.
//
// WHAT THIS DOES AND DOES NOT DO
//
// CareLink never contacts the NBI or the PNP. This component surfaces the
// reference number, opens the agency's own public page in a new tab, and
// records what the officer reports seeing. Nothing is scraped, called or
// automated — those portals are not ours to drive, and a scraper would break
// the first time either site changed.
//
// It also does not approve or reject anything. Approve and Reject remain the
// only actions that move a document between states; a portal check is evidence
// the officer weighs when using them.
//
// It is not a PESO seal either. constants/credentials.ts keeps both clearances
// pesoVerifiable: false, and an employer's badge is unaffected by anything
// recorded here.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";

import API_URL from "@/constants/api";
import { usePesoTheme, font, radius, space, type PesoColors } from "@/components/peso/ui";

/** The two documents this applies to, and where each is actually verified. */
const PORTALS: Record<string, { label: string; url: string; agency: string }> = {
  "NBI Clearance": {
    label: "Verify on NBI Portal",
    url: "https://clearance.nbi.gov.ph/",
    agency: "NBI",
  },
  // A Police Clearance is a PNP document. Sending an officer to the NBI portal
  // to check one would waste their time and produce a "no matching record" that
  // means nothing — so this one points at the PNP's own system instead.
  "Police Clearance": {
    label: "Verify on PNP Portal",
    url: "https://pnpclearance.ph/",
    agency: "PNP",
  },
};

export function isClearanceDocument(documentType?: string | null): boolean {
  return !!documentType && documentType in PORTALS;
}

/** Labels used in the dropdown and when showing a recorded result. */
const OUTCOMES = [
  { value: "verified_valid",   label: "Verified valid",     icon: "checkmark-circle" as const, tone: "ok" as const },
  { value: "no_record",        label: "No matching record", icon: "close-circle" as const,     tone: "bad" as const },
  { value: "could_not_verify", label: "Could not verify",   icon: "help-circle" as const,      tone: "warn" as const },
];

type Check = {
  reference_number: string | null;
  reference_source: "extracted" | "manual";
  outcome: string;
  note: string | null;
  checked_by: number;
  checked_by_name: string | null;
  checked_at: string;
};

/**
 * The reference number the scanner read, if it read one.
 *
 * The extractor returns free-form {label, value} pairs, so the label wording
 * varies with what was printed on the document — "Clearance Number" on one,
 * "Reference No." on another. Matching on a keyword rather than an exact label
 * is what makes this work across both agencies' layouts.
 */
export function extractedReference(aiFields: any[] | undefined): string | null {
  if (!Array.isArray(aiFields)) return null;
  const hit = aiFields.find((f) => {
    const label = String(f?.label ?? "").toLowerCase();
    return (
      label.includes("clearance no") ||
      label.includes("clearance number") ||
      label.includes("reference") ||
      label.includes("ref no") ||
      label.includes("document number")
    );
  });
  const value = hit?.value ? String(hit.value).trim() : "";
  return value !== "" ? value : null;
}

export function ClearanceVerification({
  documentId,
  documentType,
  aiFields,
  existing,
  staffUserId,
  onRecorded,
}: {
  documentId: number;
  documentType: string;
  aiFields?: any[];
  /** The latest recorded check, or null if never checked. */
  existing?: Check | null;
  staffUserId: number | null;
  onRecorded: (check: Check) => void;
}) {
  const { c, dark } = usePesoTheme();
  const st = useMemo(() => makeStyles(c), [c]);

  const portal = PORTALS[documentType];
  const scanned = useMemo(() => extractedReference(aiFields), [aiFields]);

  const [reference, setReference] = useState<string>(existing?.reference_number ?? scanned ?? "");
  const [outcome, setOutcome] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!portal) return null;

  const recorded = existing ?? null;
  const recordedMeta = recorded ? OUTCOMES.find((o) => o.value === recorded.outcome) : null;
  const toneColor = (tone: "ok" | "bad" | "warn") =>
    tone === "ok" ? c.ok : tone === "bad" ? c.bad : c.warn;

  const submit = async (value: string) => {
    if (!staffUserId) { setError("Your staff account could not be identified. Reload and try again."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/peso/record_clearance_check.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          staff_user_id: staffUserId,
          outcome: value,
          reference_number: reference.trim(),
          // Says whether this number was read off the document or typed in,
          // which is a different level of confidence in the record.
          reference_source: scanned && reference.trim() === scanned ? "extracted" : "manual",
        }),
      });
      const data = await res.json();
      if (!data?.success) { setError(data?.message || "Could not record the verification."); return; }
      if (data.clearance_check) onRecorded(data.clearance_check as Check);
      setOutcome("");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={st.wrap}>
      <View style={st.head}>
        <Ionicons name="shield-half-outline" size={14} color={c.info} />
        <Text style={st.headTxt}>{portal.agency} portal check</Text>
      </View>

      {/* Reference number: shown as text when the scan read one, typed in when
          it did not. Editable either way — a misread digit is the single most
          likely reason a valid clearance comes back as "no record". */}
      <Text style={st.label}>
        Clearance reference number
        {scanned ? <Text style={st.labelHint}>  ·  read from the document</Text> : null}
      </Text>
      <TextInput
        value={reference}
        onChangeText={setReference}
        placeholder={scanned ? scanned : "Type the number printed on the clearance"}
        placeholderTextColor={c.subtle}
        style={st.input}
        autoCapitalize="characters"
        editable={!busy}
      />

      <View style={st.row}>
        <TouchableOpacity
          style={st.portalBtn}
          onPress={() => Linking.openURL(portal.url)}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
          <Text style={st.portalTxt}>{portal.label}</Text>
        </TouchableOpacity>

        {/* Opened rather than embedded on purpose: the agency's page is theirs,
            it may require a captcha, and framing someone else's verification
            service inside ours would misrepresent whose result it is. */}
        <Text style={st.portalHint}>Opens in a new tab</Text>
      </View>

      <Text style={[st.label, { marginTop: space.md }]}>What did the portal show?</Text>
      <TouchableOpacity
        style={st.select}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
        disabled={busy}
      >
        <Text style={[st.selectTxt, !outcome && { color: c.subtle }]}>
          {OUTCOMES.find((o) => o.value === outcome)?.label ?? "Select an outcome…"}
        </Text>
        {busy ? <ActivityIndicator size="small" color={c.accent} /> : (
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={c.muted} />
        )}
      </TouchableOpacity>

      {open && !busy && (
        <View style={st.menu}>
          {OUTCOMES.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={st.menuItem}
              activeOpacity={0.75}
              onPress={() => { setOpen(false); setOutcome(o.value); void submit(o.value); }}
            >
              <Ionicons name={o.icon} size={15} color={toneColor(o.tone)} />
              <Text style={st.menuTxt}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!!error && (
        <View style={st.err}>
          <Ionicons name="alert-circle-outline" size={13} color={c.bad} />
          <Text style={st.errTxt}>{error}</Text>
        </View>
      )}

      {recorded && recordedMeta && (
        <View style={[st.result, { backgroundColor: dark ? c.surface : toneColor(recordedMeta.tone) + "12", borderColor: toneColor(recordedMeta.tone) + "44" }]}>
          <Ionicons name={recordedMeta.icon} size={15} color={toneColor(recordedMeta.tone)} />
          <View style={{ flex: 1 }}>
            <Text style={[st.resultTitle, { color: toneColor(recordedMeta.tone) }]}>{recordedMeta.label}</Text>
            <Text style={st.resultMeta}>
              {recorded.reference_number ? `Ref ${recorded.reference_number} · ` : ""}
              checked by {recorded.checked_by_name || `officer #${recorded.checked_by}`}
              {" · "}
              {new Date(recorded.checked_at.replace(" ", "T")).toLocaleString("en-PH", {
                dateStyle: "medium", timeStyle: "short",
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: PesoColors) => ({
  wrap: {
    marginTop: space.md, padding: space.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.raise,
    gap: 6 as number,
  },
  head: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 2 },
  headTxt: { fontFamily: font.semibold, fontSize: 12.5, color: c.info, letterSpacing: 0.3 },

  label: { fontFamily: font.semibold, fontSize: 11.5, color: c.muted },
  labelHint: { fontFamily: font.regular, fontSize: 11, color: c.subtle },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 9,
    fontFamily: font.regular, fontSize: 13.5, color: c.ink, backgroundColor: c.sunken,
  },

  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginTop: 8 },
  portalBtn: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 7,
    backgroundColor: c.info, borderRadius: radius.sm,
    paddingHorizontal: 13, paddingVertical: 9,
  },
  portalTxt: { fontFamily: font.semibold, fontSize: 12.5, color: "#fff" },
  portalHint: { fontFamily: font.regular, fontSize: 11, color: c.subtle },

  select: {
    flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
    borderWidth: 1, borderColor: c.line, borderRadius: radius.sm,
    paddingHorizontal: 11, paddingVertical: 10, backgroundColor: c.sunken,
  },
  selectTxt: { fontFamily: font.regular, fontSize: 13.5, color: c.ink },
  menu: {
    borderWidth: 1, borderColor: c.line, borderRadius: radius.sm,
    backgroundColor: c.surface, overflow: "hidden" as const, marginTop: 4,
  },
  menuItem: { flexDirection: "row" as const, alignItems: "center" as const, gap: 9, paddingHorizontal: 12, paddingVertical: 11 },
  menuTxt: { fontFamily: font.regular, fontSize: 13.5, color: c.ink },

  err: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 6 },
  errTxt: { fontFamily: font.regular, fontSize: 12, color: c.bad, flex: 1 },

  result: {
    flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 9,
    borderWidth: 1, borderRadius: radius.sm, padding: 11, marginTop: 10,
  },
  resultTitle: { fontFamily: font.semibold, fontSize: 13 },
  resultMeta: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 17 },
});
