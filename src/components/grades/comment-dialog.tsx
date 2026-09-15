"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  value: string;
  onSave: (value: string) => void;
}

/** Modal editor for one student's comment — each line becomes a bullet
 * on the report card. */
export function CommentDialog({
  open,
  onOpenChange,
  studentName,
  value,
  onSave,
}: CommentDialogProps) {
  const [text, setText] = useState(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nhận xét — {studentName}</DialogTitle>
          <DialogDescription>
            Mỗi dòng sẽ hiển thị thành một gạch đầu dòng trên phiếu điểm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="comment-text" className="sr-only">
            Nhận xét
          </Label>
          <Textarea
            id="comment-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"VD:\nChăm chỉ, tích cực phát biểu\nCần cố gắng thêm môn Văn"}
            className="min-h-32"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(text);
              onOpenChange(false);
            }}
          >
            <Save /> Lưu nhận xét
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
