import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { normalizeSectionToken } from "@/lib/utils/class-section-match";
import { sortStudentsForIdCardExport } from "@/lib/utils/id-card-export";
import { ID_CARDS_PER_PAGE } from "@/lib/config/id-card";

export type IdCardKind = "student" | "staff";
export type IdCardPrintMode = "single" | "bulk";

export interface IdCardPrintFilterOptions {
  hasPhotoOnly?: boolean;
  excludeAlreadyPrinted?: boolean;
  excludeIds?: ReadonlySet<string>;
}

export interface IdCardPrintFilterStats {
  total: number;
  afterBase: number;
  afterPhoto: number;
  afterPrinted: number;
  afterManualExclude: number;
  withoutPhoto: number;
  alreadyPrinted: number;
  manuallyExcluded: number;
}

type PrintableRecord = {
  id: string;
  profilePicture?: string;
  idCardPrintedAt?: string;
};

export function hasIdCardProfilePhoto(entity: {
  profilePicture?: string;
}): boolean {
  return Boolean(entity.profilePicture?.trim());
}

export function isIdCardAlreadyPrinted(entity: {
  idCardPrintedAt?: string;
}): boolean {
  return Boolean(entity.idCardPrintedAt?.trim());
}

export function applyIdCardPrintFilters<T extends PrintableRecord>(
  items: T[],
  options: IdCardPrintFilterOptions = {},
): T[] {
  let filtered = items;

  if (options.hasPhotoOnly) {
    filtered = filtered.filter(hasIdCardProfilePhoto);
  }

  if (options.excludeAlreadyPrinted) {
    filtered = filtered.filter((item) => !isIdCardAlreadyPrinted(item));
  }

  if (options.excludeIds && options.excludeIds.size > 0) {
    filtered = filtered.filter((item) => !options.excludeIds!.has(item.id));
  }

  return filtered;
}

export function getIdCardPrintFilterStats<T extends PrintableRecord>(
  baseItems: T[],
  filteredItems: T[],
  options: IdCardPrintFilterOptions = {},
): IdCardPrintFilterStats {
  const afterPhoto = options.hasPhotoOnly
    ? baseItems.filter(hasIdCardProfilePhoto)
    : baseItems;
  const afterPrinted = options.excludeAlreadyPrinted
    ? afterPhoto.filter((item) => !isIdCardAlreadyPrinted(item))
    : afterPhoto;

  return {
    total: baseItems.length,
    afterBase: baseItems.length,
    afterPhoto: afterPhoto.length,
    afterPrinted: afterPrinted.length,
    afterManualExclude: filteredItems.length,
    withoutPhoto: baseItems.filter((item) => !hasIdCardProfilePhoto(item)).length,
    alreadyPrinted: baseItems.filter(isIdCardAlreadyPrinted).length,
    manuallyExcluded: options.excludeIds?.size ?? 0,
  };
}

export function chunkIdCardPages<T>(
  items: T[],
  pageSize = ID_CARDS_PER_PAGE,
): T[][] {
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }
  return pages;
}

function normalizeClassFilter(value: string): string {
  return value.trim().toLowerCase();
}

export function filterStudentsForIdCardPrint(
  students: Student[],
  classFilter: string,
  sectionFilter: string,
): Student[] {
  let filtered = students.filter(
    (student) =>
      student.status === "active" &&
      Boolean(student.scanId?.trim()) &&
      Boolean(student.fullName?.trim()),
  );

  if (classFilter && classFilter !== "all") {
    const target = normalizeClassFilter(classFilter);
    filtered = filtered.filter(
      (student) =>
        normalizeClassFilter(student.currentClass || "") === target,
    );
  }

  if (sectionFilter && sectionFilter !== "all") {
    const target = normalizeSectionToken(sectionFilter);
    filtered = filtered.filter(
      (student) =>
        normalizeSectionToken(student.currentSection) === target,
    );
  }

  return sortStudentsForIdCardExport(filtered);
}

export function filterStaffForIdCardPrint(staffMembers: User[]): User[] {
  return staffMembers
    .filter(
      (staff) =>
        staff.status === "active" &&
        Boolean(staff.scanId?.trim()) &&
        Boolean(staff.name?.trim()),
    )
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
}

export function getPrintableStudents(activeStudents: Student[]): Student[] {
  return filterStudentsForIdCardPrint(activeStudents, "all", "all");
}

export function getPrintableStaff(activeStaff: User[]): User[] {
  return filterStaffForIdCardPrint(activeStaff);
}

export function findPrintableStudentById(
  students: Student[],
  studentId: string,
): Student | undefined {
  return getPrintableStudents(students).find(
    (student) => student.id === studentId,
  );
}

export function findPrintableStaffById(
  staffMembers: User[],
  staffId: string,
): User | undefined {
  return getPrintableStaff(staffMembers).find((staff) => staff.id === staffId);
}

export function getStudentClassOptions(students: Student[]): string[] {
  const classes = new Set<string>();
  for (const student of students) {
    const cls = student.currentClass?.trim();
    if (cls) classes.add(cls);
  }
  return Array.from(classes).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export function getStudentSectionOptions(
  students: Student[],
  classFilter: string,
): string[] {
  const sections = new Set<string>();
  for (const student of students) {
    const cls = student.currentClass?.trim();
    const sec = student.currentSection?.trim();
    if (!sec) continue;
    if (
      classFilter !== "all" &&
      normalizeClassFilter(classFilter) !== normalizeClassFilter(cls || "")
    ) {
      continue;
    }
    sections.add(sec);
  }
  return Array.from(sections).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export function sanitizePdfFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function buildIdCardPdfFilename(options: {
  kind: IdCardKind;
  mode: IdCardPrintMode;
  personName?: string;
  classFilter?: string;
  sectionFilter?: string;
}): string {
  const { kind, mode, personName, classFilter, sectionFilter } = options;

  if (mode === "single" && personName?.trim()) {
    return `${sanitizePdfFilename(`ID Card - ${personName.trim()}`)}.pdf`;
  }

  if (kind === "staff") {
    return "ID Card - Staffs.pdf";
  }

  if (classFilter && classFilter !== "all") {
    const sectionPart =
      sectionFilter && sectionFilter !== "all" ? ` - ${sectionFilter}` : "";
    return `${sanitizePdfFilename(`ID Card - Students - ${classFilter}${sectionPart}`)}.pdf`;
  }

  return "ID Card - Students.pdf";
}

async function waitForScanCodes(root: HTMLElement): Promise<void> {
  const qrImages = Array.from(
    root.querySelectorAll<SVGSVGElement>(".id-card-qr svg"),
  );
  if (qrImages.length === 0) return;

  await new Promise((resolve) => setTimeout(resolve, 200));
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

function getFallbackPageSizePx(source: HTMLElement): {
  width: number;
  height: number;
} {
  const width = source.offsetWidth || Math.round((210 / 25.4) * 96);
  const height = source.offsetHeight || Math.round((297 / 25.4) * 96);
  return { width, height };
}

function copyCanvasContents(source: HTMLElement, clone: HTMLElement): void {
  const sourceCanvases = source.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");

  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases.item(index);
    if (!(cloneCanvas instanceof HTMLCanvasElement)) return;
    if (!(sourceCanvas instanceof HTMLCanvasElement)) return;
    if (sourceCanvas.width === 0 || sourceCanvas.height === 0) return;

    cloneCanvas.width = sourceCanvas.width;
    cloneCanvas.height = sourceCanvas.height;
    const context = cloneCanvas.getContext("2d");
    context?.drawImage(sourceCanvas, 0, 0);
  });
}

async function capturePageElement(source: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  const { width, height } = getFallbackPageSizePx(source);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:99999",
    "pointer-events:none",
    "background:#ffffff",
    `width:${width}px`,
    `height:${height}px`,
    "overflow:hidden",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  copyCanvasContents(source, clone);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await document.fonts.ready;
    await waitForImages(clone);
    await waitForScanCodes(clone);
    await new Promise((resolve) => setTimeout(resolve, 400));

    return await html2canvas(clone, {
      scale: 3,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      allowTaint: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function downloadIdCardPagesPdf(
  pageElements: HTMLElement[],
  filename: string,
): Promise<void> {
  if (pageElements.length === 0) {
    throw new Error("No pages to export");
  }

  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidthMm = 210;
  const pageHeightMm = 297;

  for (let index = 0; index < pageElements.length; index += 1) {
    const pageElement = pageElements[index];
    let canvas: HTMLCanvasElement;

    try {
      canvas = await capturePageElement(pageElement);
    } catch (cloneError) {
      console.warn("Clone capture failed, trying direct capture:", cloneError);
      await waitForImages(pageElement);
      await waitForScanCodes(pageElement);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const parent = pageElement.parentElement;
      const savedParentStyle = parent?.getAttribute("style") ?? null;

      if (parent) {
        parent.style.position = "fixed";
        parent.style.left = "0";
        parent.style.top = "0";
        parent.style.zIndex = "99999";
        parent.style.opacity = "0";
        parent.style.pointerEvents = "none";
        parent.style.background = "#ffffff";
      }

      try {
        const { width, height } = getFallbackPageSizePx(pageElement);
        canvas = await html2canvas(pageElement, {
          scale: 3,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          allowTaint: false,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 15000,
        });
      } finally {
        if (parent) {
          if (savedParentStyle === null || savedParentStyle === "") {
            parent.removeAttribute("style");
          } else {
            parent.setAttribute("style", savedParentStyle);
          }
        }
      }
    }

    let imgData: string;
    try {
      imgData = canvas.toDataURL("image/png");
    } catch {
      imgData = canvas.toDataURL("image/jpeg", 0.98);
    }

    const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

    if (index > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      imgData.startsWith("data:image/png") ? "PNG" : "JPEG",
      0,
      0,
      pageWidthMm,
      Math.min(imgHeightMm, pageHeightMm),
    );
  }

  pdf.save(filename);
}
