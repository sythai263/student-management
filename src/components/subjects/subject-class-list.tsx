"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownAZ, ArrowDownZA, GraduationCap } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { PageHeader } from "../layout";
import { CreateClassForm } from "@components/classes";
import type { ClassSubjectWithClass, Subject } from "@types";

interface SubjectClassListProps {
  classSubjects: ClassSubjectWithClass[];
  subjectId: string;
  subject: Pick<Subject, "name" | "code">;
}

/** Class cards for a subject with an A-Z/Z-A toggle on classCode. */
export function SubjectClassList({
  classSubjects,
  subjectId,
  subject,
}: SubjectClassListProps) {
  const [sortAsc, setSortAsc] = useState(true);

  const sortedClassSubjects = [...classSubjects].sort((a, b) => {
    const cmp = (a.classes?.classCode ?? "").localeCompare(
      b.classes?.classCode ?? "",
      "vi",
      { numeric: true },
    );
    return sortAsc ? cmp : -cmp;
  });

  return (
    <>
      <PageHeader
        title={`${subject.name}${subject.code ? ` (${subject.code})` : ""}`}
        description="Danh sách lớp đang dạy môn này"
        actions={
          <>
            {sortedClassSubjects.length > 0 && (
              <Button
                type="button"
                variant="outline"
                aria-label={
                  sortAsc ? "Sắp xếp mã lớp Z-A" : "Sắp xếp mã lớp A-Z"
                }
                title={sortAsc ? "Sắp xếp mã lớp Z-A" : "Sắp xếp mã lớp A-Z"}
                onClick={() => setSortAsc((v) => !v)}
              >
                {sortAsc ? (
                  <ArrowDownAZ className="size-4" />
                ) : (
                  <ArrowDownZA className="size-4" />
                )}
                <span className="hidden sm:inline">Mã lớp</span>
              </Button>
            )}
            <CreateClassForm subjectId={subjectId} />
          </>
        }
      />

      {sortedClassSubjects.length === 0 ? (
        <p className="text-muted-foreground">
          Môn này chưa được gán vào lớp nào.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClassSubjects.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.classId}?subjectId=${subjectId}`}
              className="group"
            >
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {c.classes?.classCode ?? "—"}
                      </CardTitle>
                      <CardDescription className="space-y-0.5">
                        <div>{c.classes?.name ?? "—"}</div>
                        <div>Năm học {c.classes?.schoolYear ?? "—"}</div>
                      </CardDescription>
                    </div>
                    <GraduationCap className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
