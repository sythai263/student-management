"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useClass,
  useClassSubjects,
  useGrades,
  useReportCardTemplates,
  useStudents,
  useTeacherSignature,
} from "@hooks";
import { calculateAverage } from "@lib/grade-utils";
import { defaultReportCardBlocks, type ReportCardData } from "@lib/report-card";
import { GRADE_SLOTS } from "@constants";
import {
  CARDS_PER_PAGE_OPTIONS,
  ReportCardSheet,
  type CardsPerPage,
} from "./report-card-sheet";

const BUILTIN_TEMPLATE_ID = "__builtin__";

interface ReportCardDashboardProps {
  classId: string;
  subjectId?: string;
  subjectName?: string;
  teacherName: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSignDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ReportCardDashboard({
  classId,
  subjectId: subjectIdProp,
  subjectName: subjectNameProp,
  teacherName,
}: ReportCardDashboardProps) {
  const { data: classInfo, isLoading: classLoading } = useClass(classId);
  const { data: classSubjects, isLoading: subjectsLoading } =
    useClassSubjects(classId);
  const [subjectId, setSubjectId] = useState(subjectIdProp ?? "");
  const [semester, setSemester] = useState(1);
  const [signDateIso, setSignDateIso] = useState(todayIso());
  const [cardsPerPage, setCardsPerPage] = useState<CardsPerPage>(6);

  const subjectOptions = (classSubjects ?? []).map((cs) => ({
    id: cs.subjectId,
    name: cs.subjects?.name ?? "",
    code: cs.subjects?.code,
  }));

  const isLocked = !!subjectIdProp;
  const selectedSubject = isLocked
    ? { id: subjectIdProp, name: subjectNameProp ?? "" }
    : (subjectOptions.find((s) => s.id === subjectId) ?? subjectOptions[0]);

  const activeSubjectId = selectedSubject?.id ?? "";
  const activeSubjectName = selectedSubject?.name ?? "";

  const { data: students, isLoading: studentsLoading } = useStudents(classId);
  const { data: grades, isLoading: gradesLoading } = useGrades(
    classId,
    activeSubjectId,
    semester,
  );
  const { data: signature, isLoading: signatureLoading } =
    useTeacherSignature();
  const { data: templates, isLoading: templatesLoading } =
    useReportCardTemplates();
  const [templateId, setTemplateId] = useState(BUILTIN_TEMPLATE_ID);
  const [templateTouched, setTemplateTouched] = useState(false);

  // Preselect the teacher's default template once loaded, unless they
  // already picked one themselves.
  const defaultTemplateId = templates?.find((t) => t.isDefault)?.id;
  const activeTemplateId =
    !templateTouched && defaultTemplateId ? defaultTemplateId : templateId;

  const isLoading =
    classLoading ||
    subjectsLoading ||
    studentsLoading ||
    gradesLoading ||
    signatureLoading ||
    templatesLoading;

  const selectedTemplate = templates?.find((t) => t.id === activeTemplateId);
  const blocks = selectedTemplate?.blocks ?? defaultReportCardBlocks();

  const cards = useMemo<ReportCardData[]>(() => {
    if (!students || !classInfo) return [];
    const gradeMap = new Map(grades?.map((g) => [g.studentId, g]) ?? []);
    const semesterLabel = `Học kỳ ${semester}`;

    return students.map((s) => {
      const grade = gradeMap.get(s.id);
      const scores = Object.fromEntries(
        GRADE_SLOTS.map((slot) => [slot, grade?.[slot] ?? null]),
      ) as ReportCardData["scores"];

      return {
        studentCode: s.studentCode ?? "",
        studentName: `${s.lastName} ${s.firstName}`,
        classCode: classInfo.classCode,
        className: classInfo.name,
        schoolName: classInfo.school?.name ?? "",
        subjectName: activeSubjectName,
        semesterLabel,
        scores,
        average: calculateAverage(scores),
        comment: grade?.comment ?? null,
      };
    });
  }, [students, classInfo, grades, activeSubjectName, semester]);

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Phiếu điểm học sinh</CardTitle>
          <Link
            href="/report-card-templates"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <LayoutTemplate /> Quản lý mẫu phiếu điểm
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="template">Mẫu phiếu điểm</Label>
              {templatesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={activeTemplateId}
                  onValueChange={(v) => {
                    setTemplateTouched(true);
                    setTemplateId(v ?? BUILTIN_TEMPLATE_ID);
                  }}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Chọn mẫu">
                      {(value: string) => {
                        if (value === BUILTIN_TEMPLATE_ID) return "Mẫu mặc định";
                        const t = templates?.find((tpl) => tpl.id === value);
                        return t
                          ? `${t.name}${t.isDefault ? " (mặc định)" : ""}`
                          : "Chọn mẫu";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BUILTIN_TEMPLATE_ID}>Mẫu mặc định</SelectItem>
                    {(templates ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.isDefault ? " (mặc định)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Môn học</Label>
              {subjectsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : isLocked ? (
                <p id="subject" className="rounded-md border p-2 text-sm font-medium">
                  {activeSubjectName}
                </p>
              ) : !subjectOptions.length ? (
                <p className="text-sm text-destructive">
                  Lớp chưa được gán môn học nào.
                </p>
              ) : (
                <Select
                  value={activeSubjectId}
                  onValueChange={(v) => setSubjectId(v ?? "")}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Chọn môn học">
                      {(value: string) => {
                        const s = subjectOptions.find((o) => o.id === value);
                        return s
                          ? `${s.name}${s.code ? ` (${s.code})` : ""}`
                          : "Chọn môn học";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Học kỳ</Label>
              <Select
                value={String(semester)}
                onValueChange={(v) => setSemester(Number(v ?? 1))}
              >
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Học kỳ">
                    {(value: string) => `Học kỳ ${value}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Học kỳ 1</SelectItem>
                  <SelectItem value="2">Học kỳ 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signDate">Ngày ký</Label>
              <Input
                id="signDate"
                type="date"
                value={signDateIso}
                onChange={(e) => setSignDateIso(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardsPerPage">Bố cục</Label>
              <Select
                value={String(cardsPerPage)}
                onValueChange={(v) =>
                  setCardsPerPage(Number(v ?? 6) as CardsPerPage)
                }
              >
                <SelectTrigger id="cardsPerPage">
                  <SelectValue>
                    {(value: string) => `${value} phiếu / trang`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CARDS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} phiếu / trang
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!signature && !signatureLoading && (
            <p className="text-sm text-muted-foreground">
              Bạn chưa lưu chữ ký — vào menu tài khoản để tải lên trước khi in.
            </p>
          )}

          <Button
            type="button"
            disabled={isLoading || !activeSubjectId || !cards.length}
            onClick={() => window.print()}
          >
            <Printer /> In / Xuất PDF
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="mx-auto h-[297mm] w-full max-w-[210mm]" />
      ) : !activeSubjectId ? (
        <p className="text-sm text-muted-foreground">
          Chọn môn học để xem trước phiếu điểm.
        </p>
      ) : (
        <ReportCardSheet
          blocks={blocks}
          cards={cards}
          signDate={formatSignDate(signDateIso)}
          signatureImageKey={signature?.imageKey ?? null}
          teacherName={teacherName}
          schoolName={classInfo?.school?.name}
          cardsPerPage={cardsPerPage}
        />
      )}
    </div>
  );
}
