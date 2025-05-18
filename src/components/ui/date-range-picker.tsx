"use client";

import * as React from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export interface DateRange {
  from: Date;
  to: Date;
}

interface Props {
  value: DateRange | null;
  onChange(value: DateRange | null): void;
  className?: string;
}

export const DateRangePicker: React.FC<Props> = ({
  value,
  onChange,
  className,
}) => {
  const [range, setRange] = React.useState<DateRange | null>(
    value ?? { from: addDays(new Date(), -30), to: new Date() },
  );

  React.useEffect(() => onChange(range), [range, onChange]);

  const label =
    range && range.from && range.to
      ? `${format(range.from, "PPP", { locale: ptBR })} - ${format(
          range.to,
          "PPP",
          { locale: ptBR },
        )}`
      : "Selecione o período";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[320px] justify-start font-normal",
            className,
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          locale={ptBR}
          mode="range"
          numberOfMonths={2}
          selected={range as any}
          onSelect={(r: any) => r?.from && r?.to && setRange(r)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
