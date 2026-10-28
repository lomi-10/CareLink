import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import fontkit from "@pdf-lib/fontkit";
import { Platform } from "react-native";
import {
  PDFCheckBox,
  PDFDocument,
  PDFForm,
  PDFHexString,
  PDFFont,
  PDFName,
  PDFPage,
  PDFTextField,
  rgb,
} from "pdf-lib";

export interface NsrpPrefill {
  profile: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
    contact_number: string | null;
    birth_date: string | null;
    gender: string | null;
    civil_status: string | null;
    address: string | null;
    landmark: string | null;
    barangay: string | null;
    municipality: string | null;
    province: string | null;
    education_level: string | null;
    availability_status: string | null;
    employment_type: string | null;
    work_schedule: string | null;
    expected_salary: string | number | null;
    salary_period: string | null;
    experience_years: string | number | null;
  };
  jobs: { job_title: string; category_name: string }[];
  skills: string[];
  languages: string[];
  history: {
    employer_name: string;
    employer_contact: string | null;
    position: string;
    start_date: string | null;
    end_date: string | null;
    duties: string | null;
    reason_for_leaving: string | null;
    can_contact: boolean | number | string;
  }[];
}

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

function toBase64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function loadBundledAssetBytes(moduleId: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(moduleId);
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error(`Unable to load bundled ${asset.type.toUpperCase()} asset.`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error(`Unable to load bundled ${asset.type.toUpperCase()} asset.`);
  }
  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return toBase64Bytes(base64);
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  if (!match) return "";
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year)
    || parsed.getUTCMonth() !== Number(month) - 1
    || parsed.getUTCDate() !== Number(day)
  ) {
    return "";
  }
  return `${month}/${day}/${year}`;
}

function calculateAge(dateValue: string | null): string {
  const formattedDate = formatDate(dateValue);
  if (!formattedDate || !dateValue) return "";
  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month
    || (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function setText(form: PDFForm, name: string, value: string): void {
  if (value) form.getTextField(name).setText(value);
}

function setChecked(form: PDFForm, name: string, checked: boolean): void {
  if (checked) form.getCheckBox(name).check();
}

function splitRepeatedWidgets(pdf: PDFDocument, form: PDFForm): void {
  for (const field of [...form.getFields()]) {
    const widgets = field.acroField.getWidgets();
    if (widgets.length < 2) continue;

    const baseName = field.acroField.getPartialName() ?? field.getName();
    const parent = field.acroField.getParent();
    for (let index = widgets.length - 1; index > 0; index -= 1) {
      const widget = widgets[index];
      const widgetRef = pdf.context.getObjectRef(widget.dict);
      if (!widgetRef) {
        throw new Error(`Unable to separate repeated NSRP field "${field.getName()}".`);
      }

      const splitField = field.acroField.dict.clone(pdf.context);
      splitField.set(PDFName.of("T"), PDFHexString.fromText(`${baseName}__${index + 1}`));
      splitField.set(PDFName.of("Kids"), pdf.context.obj([widgetRef]));
      const splitFieldRef = pdf.context.register(splitField);
      widget.dict.set(PDFName.of("Parent"), splitFieldRef);

      if (parent) {
        const parentKids = parent.Kids();
        if (!parentKids) {
          throw new Error(`Unable to separate nested NSRP field "${field.getName()}".`);
        }
        splitField.set(PDFName.of("Parent"), parent.ref);
        parentKids.push(splitFieldRef);
      } else {
        splitField.delete(PDFName.of("Parent"));
        form.acroForm.addField(splitFieldRef);
      }
      field.acroField.removeWidget(index);
    }
  }
}

function moveNameFieldsBelowLabels(form: PDFForm): void {
  ["txt_lastname", "txt_firstname", "txt_middlename", "txt_suffix"].forEach((name) => {
    form.getTextField(name).acroField.getWidgets().forEach((widget) => {
      const rect = widget.getRectangle();
      widget.setRectangle({ ...rect, y: rect.y - 14 });
    });
  });
}

function populateForm(form: PDFForm, data: NsrpPrefill): void {
  const { profile } = data;
  setText(form, "txt_lastname", clean(profile.last_name));
  setText(form, "txt_firstname", clean(profile.first_name));
  setText(form, "txt_middlename", clean(profile.middle_name));
  setText(form, "txt_suffix", "");
  setText(form, "txt_date_of_birth", formatDate(profile.birth_date));
  setText(form, "txt_age", calculateAge(profile.birth_date));

  const gender = normalize(profile.gender ?? "");
  setChecked(form, "cb_male", gender === "male");
  setChecked(form, "cb_female", gender === "female");
  setChecked(
    form,
    "cb_employed",
    normalize(profile.availability_status ?? "") === "currently employed",
  );

  const civilStatus = normalize(profile.civil_status ?? "");
  const civilStatusFields: Record<string, string> = {
    single: "cb_single",
    married: "cb_married",
    widowed: "cb_widowed",
    separated: "cb_separated",
  };
  const civilStatusField = civilStatusFields[civilStatus];
  if (civilStatusField) {
    setChecked(form, civilStatusField, true);
  } else if (civilStatus) {
    setChecked(form, "cb_others", true);
    setText(form, "txt_specify", profile.civil_status ?? "");
  }

  setText(form, "txt_barangay", clean(profile.barangay));
  setText(form, "txt_municipality", clean(profile.municipality));
  setText(form, "txt_province", clean(profile.province));
  setText(form, "txt_primary_number", clean(profile.contact_number));
  setText(form, "txt_email", clean(profile.email));

  data.jobs.slice(0, 3).forEach((job, index) => {
    const slot = index + 1;
    setText(form, `txt_occupation${slot}`, clean(job.job_title));
    setText(form, `txt_industry${slot}`, clean(job.category_name));
  });

  const salary = Number(profile.expected_salary);
  if (Number.isFinite(salary) && salary > 0) {
    const period = normalize(profile.salary_period ?? "");
    const periodLabel = period ? ` / ${period}` : "";
    setText(form, "txt_salary_expect", `PHP ${salary.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${periodLabel}`);
  }

  const education = normalize(profile.education_level ?? "");
  const educationFields: [RegExp, string][] = [
    [/no formal education/, "cb_noformaleduc"],
    [/^elementary$|elementary.*(undergrad|level)/, "cb_elemlevel"],
    [/elementary.*(graduate|grad)/, "cb_elemgrad"],
    [/high school.*(undergrad|level)/, "cb_hslevel"],
    [/high school.*(graduate|grad)/, "cb_hsgraduate"],
    [/vocational|tesda/, "cb_vocgrad"],
    [/college.*(undergrad|level)/, "cb_collegelevel"],
    [/college.*(graduate|grad)/, "cb_collegegrad"],
    [/post.?graduate/, "cb_postgrad"],
  ];
  const educationField = educationFields.find(([pattern]) => pattern.test(education))?.[1];
  if (educationField) setChecked(form, educationField, true);

  const languageFields: [string, string[]][] = [
    ["cb_tagalog", ["tagalog", "filipino"]],
    ["cb_ilocano", ["ilocano", "ilokano"]],
    ["cb_bisaya", ["bisaya", "cebuano", "visayan"]],
    ["cb_ilonggo", ["hiligaynon", "ilonggo"]],
    ["cb_bikol", ["bicol", "bikol"]],
  ];
  const otherLanguages: string[] = [];
  data.languages.forEach((language) => {
    const normalizedLanguage = normalize(language);
    const mapping = languageFields.find(([, stems]) =>
      stems.some((stem) => normalizedLanguage.includes(stem)),
    );
    if (mapping) setChecked(form, mapping[0], true);
    else if (clean(language)) otherLanguages.push(clean(language));
  });
  setText(form, "txt_others", otherLanguages.join(", "));

  const skillFields: [string, string[]][] = [
    ["cb_carpentry", ["carpent"]],
    ["cb_masonry", ["mason"]],
    ["cb_welding", ["weld"]],
    ["cb_automechanic", ["mechanic"]],
    ["cb_plumbing", ["plumb"]],
    ["cb_driving", ["driv"]],
    ["cb_gardening", ["garden"]],
    ["cb_tailoring", ["tailor"]],
    ["cb_photography", ["photograph"]],
    ["cb_hairdressing", ["hairdress"]],
    ["cb_cooking", ["cook"]],
    ["cb_baking", ["bak"]],
  ];
  const normalizedSkills = data.skills.map(normalize).filter(Boolean);
  const matchedSkills = new Set<string>();
  skillFields.forEach(([fieldName, stems]) => {
    const matchingSkills = normalizedSkills.filter((skill) =>
      stems.some((stem) => skill.includes(stem)),
    );
    if (matchingSkills.length) {
      setChecked(form, fieldName, true);
      matchingSkills.forEach((skill) => matchedSkills.add(skill));
    }
  });
  if (normalizedSkills.some((skill) => !matchedSkills.has(skill))) {
    setChecked(form, "cb_Others", true);
  }

  data.history.slice(0, 4).forEach((item, index) => {
    const suffix = index === 0 ? "" : `__${index + 1}`;
    setText(form, `txt_office${suffix}`, clean(item.employer_name));
    setText(form, `txt_positionheld${suffix}`, clean(item.position));
    const start = formatDate(item.start_date);
    const end = item.end_date ? formatDate(item.end_date) : "Present";
    setText(form, `txt_inclusive${suffix}`, [start, end].filter(Boolean).join(" - "));
  });
}

function getCheckedBoxPlacements(form: PDFForm, pages: PDFPage[]) {
  return form.getFields().flatMap((field) => {
    if (!(field instanceof PDFCheckBox) || !field.isChecked()) return [];
    return field.acroField.getWidgets().map((widget) => {
      const page = pages.find((candidate) => candidate.ref === widget.P());
      if (!page) {
        throw new Error(`Unable to locate the page for checked NSRP field "${field.getName()}".`);
      }
      return { page, rect: widget.getRectangle() };
    });
  });
}

function drawCheckboxMarks(placements: ReturnType<typeof getCheckedBoxPlacements>): void {
  const markColor = rgb(0.08, 0.12, 0.18);
  placements.forEach(({ page, rect }) => {
    const inset = Math.min(rect.width, rect.height) * 0.23;
    const left = rect.x + inset;
    const right = rect.x + rect.width - inset;
    const bottom = rect.y + inset;
    const top = rect.y + rect.height - inset;
    page.drawLine({
      start: { x: left, y: bottom },
      end: { x: right, y: top },
      thickness: 1.1,
      color: markColor,
    });
    page.drawLine({
      start: { x: left, y: top },
      end: { x: right, y: bottom },
      thickness: 1.1,
      color: markColor,
    });
  });
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let remaining = word;
    while (font.widthOfTextAtSize(remaining, size) > width) {
      const characters = Array.from(remaining);
      let splitAt = 1;
      while (
        splitAt < characters.length
        && font.widthOfTextAtSize(characters.slice(0, splitAt + 1).join(""), size) <= width
      ) {
        splitAt += 1;
      }
      const piece = characters.slice(0, splitAt).join("");
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(piece);
      remaining = characters.slice(splitAt).join("");
    }
    const candidate = line ? `${line} ${remaining}` : remaining;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = remaining;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function appendNotes(
  pdf: PDFDocument,
  data: NsrpPrefill,
  regularFont: PDFFont,
  boldFont: PDFFont,
): void {
  const existingPages = pdf.getPages();
  const trailingPage = existingPages[existingPages.length - 1];
  const trailingAnnotations = trailingPage.node.Annots();
  const reuseTrailingPage = existingPages.length === 3
    && (!trailingAnnotations || trailingAnnotations.size() === 0);
  const notesStartIndex = reuseTrailingPage ? existingPages.length - 1 : existingPages.length;
  let trailingPageReused = false;
  const pageSize = existingPages[0];
  const pageWidth = pageSize.getWidth();
  const pageHeight = pageSize.getHeight();
  const margin = 42;
  const labelWidth = 126;
  const bodyX = margin + labelWidth + 12;
  const bodyWidth = pageWidth - bodyX - margin;
  const lineHeight = 12;
  const ink = rgb(0.12, 0.18, 0.28);
  const muted = rgb(0.31, 0.37, 0.46);
  const navy = rgb(0.1, 0.2, 0.35);
  let page: PDFPage | undefined;
  let y = 0;

  const addPage = () => {
    if (reuseTrailingPage && !trailingPageReused) {
      page = trailingPage;
      trailingPageReused = true;
    } else {
      page = pdf.addPage([pageWidth, pageHeight]);
    }
    page.drawRectangle({
      x: 0,
      y: pageHeight - 74,
      width: pageWidth,
      height: 74,
      color: navy,
    });
    page.drawText("NSRP Form 1 Rev. 3 - Supplemental Draft Notes", {
      x: margin,
      y: pageHeight - 34,
      size: 15,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("Review all entries and complete missing details before PESO submission.", {
      x: margin,
      y: pageHeight - 54,
      size: 9,
      font: regularFont,
      color: rgb(0.9, 0.93, 0.97),
    });
    y = pageHeight - 98;
  };

  const ensureSpace = (height: number): boolean => {
    if (!page || y - height < 42) {
      addPage();
      return true;
    }
    return false;
  };

  const section = (title: string) => {
    ensureSpace(30);
    if (!page) throw new Error("Unable to create NSRP supplemental notes page.");
    page.drawRectangle({
      x: margin,
      y: y - 17,
      width: pageWidth - margin * 2,
      height: 20,
      color: rgb(0.89, 0.92, 0.96),
    });
    page.drawText(title, {
      x: margin + 8,
      y: y - 12,
      size: 9.5,
      font: boldFont,
      color: navy,
    });
    y -= 29;
  };

  const row = (label: string, value: string) => {
    const labelLines = wrapText(label, boldFont, 8.5, labelWidth - 8);
    const valueLines = wrapText(value || "Not recorded in CareLink.", regularFont, 8.5, bodyWidth);
    const lineCount = Math.max(labelLines.length, valueLines.length);
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const continuedPage = ensureSpace(lineHeight + 4);
      if (!page) throw new Error("Unable to create NSRP supplemental notes page.");
      const labelLine = continuedPage && lineIndex > 0
        ? `${label} (cont.)`
        : labelLines[lineIndex];
      if (labelLine) {
        page.drawText(labelLine, {
          x: margin,
          y: y - 9,
          size: 8.5,
          font: boldFont,
          color: muted,
        });
      }
      page.drawText(valueLines[lineIndex] ?? "", {
        x: bodyX,
        y: y - 9,
        size: 8.5,
        font: regularFont,
        color: ink,
      });
      y -= lineHeight;
    }
    y -= 4;
  };

  addPage();
  section("CareLink information included in this draft");
  row(
    "Profile and contact",
    `${[data.profile.first_name, data.profile.middle_name, data.profile.last_name].map(clean).filter(Boolean).join(" ")}; ${clean(data.profile.email)}; ${clean(data.profile.contact_number)}`,
  );
  row(
    "Address on file",
    [
      clean(data.profile.address) ? `${clean(data.profile.address)} (verify; CareLink composes this from locality fields)` : "",
      clean(data.profile.landmark) ? `Landmark: ${clean(data.profile.landmark)}` : "",
    ].filter(Boolean).join("; "),
  );
  row("Years of experience", data.profile.experience_years === null ? "" : String(data.profile.experience_years));
  row(
    "Job preferences",
    data.jobs.map((job) => job.category_name ? `${job.job_title} (${job.category_name})` : job.job_title).join("; "),
  );
  row("Declared skills", data.skills.join(", "));
  row("Languages", data.languages.join(", "));
  row(
    "Work preferences",
    [data.profile.employment_type, data.profile.work_schedule, data.profile.availability_status]
      .map(clean)
      .filter(Boolean)
      .join(" / "),
  );

  section("Work history recorded in CareLink");
  if (!data.history.length) {
    row("Work history", "No work history is recorded in CareLink.");
  } else {
    data.history.forEach((item, index) => {
      const dates = [formatDate(item.start_date), item.end_date ? formatDate(item.end_date) : "Present"]
        .filter(Boolean)
        .join(" - ");
      const details = [
        clean(item.employer_name),
        clean(item.position),
        dates,
        clean(item.duties) ? `Duties: ${clean(item.duties)}` : "",
        clean(item.reason_for_leaving) ? `Reason for leaving: ${clean(item.reason_for_leaving)}` : "",
      ].filter(Boolean);
      const authorizedContact = item.can_contact === true || item.can_contact === 1 || item.can_contact === "1";
      if (authorizedContact && clean(item.employer_contact)) {
        details.push(`Employer contact (helper permits contact): ${clean(item.employer_contact)}`);
      } else if (!authorizedContact) {
        details.push("Employer contact not included because permission was not given.");
      }
      row(`Experience ${index + 1}`, details.join(" | "));
    });
  }

  section("Complete or confirm with the helper/PESO");
  row(
    "Personal details",
    "Street/house number and permanent-address details are not stored separately in CareLink. Confirm place of birth, citizenship, height and weight, landline/secondary number, disability status, and any missing civil-status information.",
  );
  row(
    "Employment details",
    "Current employment status, reason for leaving, job-search timeline, immediate availability, preferred work location, 4Ps status, and employer addresses/appointment status.",
  );
  row(
    "Education and credentials",
    "School, course/year, graduation date and honors; training dates/institutions/certificates; licenses/eligibility and expiry; language proficiency/certificates; and self-assessed skills.",
  );
  row(
    "Certification",
    "The helper must personally review and correct the official form, complete every required blank, and sign/date it. This draft does not create consent or a signature.",
  );
  row("PESO-only section", "Leave the official PESO-use-only section on the form blank for authorized PESO staff.");

  pdf.getPages().slice(notesStartIndex).forEach((notesPage, index) => {
    notesPage.drawText(`CareLink-generated supplemental draft - verify before submission`, {
      x: margin,
      y: 24,
      size: 7.5,
      font: regularFont,
      color: muted,
    });
    notesPage.drawText(`Notes page ${index + 1}`, {
      x: pageWidth - margin - 70,
      y: 24,
      size: 7.5,
      font: regularFont,
      color: muted,
    });
  });
}

export async function generateNsrpPdfFromBytes(
  data: NsrpPrefill,
  templateBytes: Uint8Array,
  regularFontBytes: Uint8Array,
  boldFontBytes: Uint8Array,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(fontkit);
  const regularFont = await pdf.embedFont(regularFontBytes, { subset: true });
  const boldFont = await pdf.embedFont(boldFontBytes, { subset: true });
  const form = pdf.getForm();
  splitRepeatedWidgets(pdf, form);
  populateForm(form, data);
  moveNameFieldsBelowLabels(form);
  const pages = pdf.getPages();
  const checkedBoxes = getCheckedBoxPlacements(form, pages);
  form.getFields().forEach((field) => {
    if (field instanceof PDFTextField && field.getText()?.trim()) {
      field.setFontSize(8.5);
      field.updateAppearances(regularFont);
    }
  });
  form.flatten({ updateFieldAppearances: false });
  drawCheckboxMarks(checkedBoxes);
  appendNotes(pdf, data, regularFont, boldFont);
  return pdf.save();
}

export async function generateNsrpPdf(data: NsrpPrefill): Promise<Uint8Array> {
  const [templateBytes, regularFontBytes, boldFontBytes] = await Promise.all([
    loadBundledAssetBytes(require("@/assets/nsrp-form-1-rev-3-fillable.pdf")),
    loadBundledAssetBytes(require("@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf")),
    loadBundledAssetBytes(require("@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf")),
  ]);
  return generateNsrpPdfFromBytes(data, templateBytes, regularFontBytes, boldFontBytes);
}
