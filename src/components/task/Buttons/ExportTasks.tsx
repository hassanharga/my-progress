'use client';

import { useState, type FC } from 'react';
import { Download } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { exportTasks } from '@/actions/task';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExportPreset } from '@/schema/export';

const PRESET_LABELS: Record<ExportPreset, string> = {
  all_time: 'All time',
  this_week: 'This week',
  this_month: 'This month',
  last_month: 'Last month',
  custom: 'Custom range',
};

export const ExportTasks: FC = () => {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<ExportPreset>('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { execute, isPending } = useAction(exportTasks, {
    onSuccess: ({ data }) => {
      if (!data) return;
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
      toast.success('Export downloaded');
    },
    onError: () => {
      toast.error('Export failed. Please try again.');
    },
  });

  const handleDownload = () => {
    execute({
      preset,
      ...(preset === 'custom'
        ? {
            dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
            dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
          }
        : {}),
    });
  };

  const isDisabled = preset === 'custom' && (!dateFrom || !dateTo);

  return (
    <>
      <Button
        variant="subtle"
        size="sm"
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby="Export to Excel">
          <DialogHeader>
            <DialogTitle>Export to Excel</DialogTitle>
            <DialogDescription>
              Download tasks and time sessions as an Excel file with two sheets.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Date range</Label>
              <Select
                value={preset}
                onValueChange={(v) => setPreset(v as ExportPreset)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="date-from">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="subtle"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isPending || isDisabled}
            >
              {isPending ? 'Generating...' : 'Download .xlsx'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
