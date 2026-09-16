"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@components/layout";
import { useClass, useSchools, useUpdateClassSchool } from "@hooks";
import { friendlyErrorMessage } from "@lib/utils";

const NO_SCHOOL = "__none__";

interface ClassHeaderProps {
  classId: string;
}

export function ClassHeader({ classId }: ClassHeaderProps) {
  const { data: cls, isLoading, error } = useClass(classId);
  const { data: schools } = useSchools();
  const updateClassSchool = useUpdateClassSchool();
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return (
      <PageHeader
        title={<Skeleton className="h-8 w-56" />}
        description={<Skeleton className="mt-2 h-5 w-32" />}
      />
    );
  }
  if (error || !cls) {
    return <PageHeader title="Không tìm thấy lớp" />;
  }

  const onSchoolChange = (value: string | null) => {
    startTransition(async () => {
      try {
        await updateClassSchool.mutateAsync({
          classId,
          schoolId: !value || value === NO_SCHOOL ? null : value,
        });
        toast.success("Đã cập nhật trường");
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
      }
    });
  };

  return (
    <PageHeader
      title={`Lớp ${cls.name}`}
      description={
        <div className="flex flex-wrap items-center gap-2">
          <span>Năm học {cls.schoolYear}</span>
          <span aria-hidden>·</span>
          <Select
            value={cls.schoolId ?? NO_SCHOOL}
            onValueChange={onSchoolChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-auto gap-1 text-sm">
              <SelectValue>
                {(value: string) =>
                  value === NO_SCHOOL
                    ? "Chưa gắn trường"
                    : (schools?.find((s) => s.id === value)?.name ??
                      "Chưa gắn trường")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SCHOOL}>Chưa gắn trường</SelectItem>
              {(schools ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
